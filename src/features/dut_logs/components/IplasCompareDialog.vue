<template>
  <v-dialog :model-value="modelValue" max-width="1400" scrollable @update:model-value="emit('update:modelValue', $event)">
    <v-card v-if="isn">
      <v-card-title class="d-flex align-center bg-primary">
        <v-icon start color="white">mdi-compare-horizontal</v-icon>
        <span class="text-white">Compare with iPLAS - {{ isn }}</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" color="white" @click="emit('update:modelValue', false)" />
      </v-card-title>

      <v-card-text class="pa-4">
        <!-- Loading State -->
        <div v-if="loading" class="d-flex flex-column align-center justify-center py-8">
          <v-progress-circular indeterminate color="primary" size="64" />
          <div class="mt-4 text-medium-emphasis">Fetching iPLAS data for {{ isn }}...</div>
        </div>

        <!-- Error State -->
        <v-alert v-else-if="errorMessage" type="error" variant="tonal" class="mb-4">
          {{ errorMessage }}
        </v-alert>

        <!-- No iPLAS Data -->
        <v-alert v-else-if="!iplasTestItems.length" type="warning" variant="tonal" class="mb-4">
          No iPLAS data found for ISN: {{ isn }}
        </v-alert>

        <!-- Comparison Table -->
        <template v-else>
          <!-- Controls Row: Search, Filter, Score Filter -->
          <v-row dense class="mb-3">
            <v-col cols="12" md="4">
              <v-text-field
                v-model="searchQuery"
                label="Search (Regex)"
                placeholder="e.g. ^RF.*|Power"
                prepend-inner-icon="mdi-regex"
                variant="outlined"
                density="compact"
                hide-details
                clearable
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-select
                v-model="typeFilter"
                :items="typeFilterOptions"
                label="Filter"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-select
                v-model="scoreFilter"
                :items="scoreFilterOptions"
                label="Score Filter"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="2" class="d-flex align-center">
              <v-btn
                color="success"
                variant="tonal"
                prepend-icon="mdi-microsoft-excel"
                block
                @click="exportToExcel"
                :loading="exporting"
              >
                Export
              </v-btn>
            </v-col>
          </v-row>

          <!-- Filter Chips -->
          <v-chip-group v-model="comparisonFilter" mandatory class="mb-4">
            <v-chip value="match" color="success" variant="flat">Match ({{ matchCount }})</v-chip>
            <v-chip value="mismatch" color="error" variant="flat">Mismatch ({{ mismatchCount }})</v-chip>
            <v-chip value="upload-only" color="warning" variant="flat">Upload Only ({{ uploadOnlyCount }})</v-chip>
            <v-chip value="iplas-only" color="info" variant="flat">iPLAS Only ({{ iplasOnlyCount }})</v-chip>
            <v-chip value="all" color="primary" variant="outlined">All ({{ comparisonItems.length }})</v-chip>
          </v-chip-group>

          <v-data-table :headers="comparisonHeaders" :items="filteredComparisonItems" 
            :items-per-page="50" density="comfortable" class="elevation-1">
            <template #item.test_item="{ item }">
              <span class="font-weight-medium">{{ item.test_item }}</span>
            </template>
            <template #item.usl="{ item }">
              <span v-if="item.usl !== null">{{ item.usl }}</span>
              <span v-else class="text-medium-emphasis">-</span>
            </template>
            <template #item.lsl="{ item }">
              <span v-if="item.lsl !== null">{{ item.lsl }}</span>
              <span v-else class="text-medium-emphasis">-</span>
            </template>
            <template #item.upload_value="{ item }">
              <span v-if="item.upload_value !== null">{{ item.upload_value }}</span>
              <span v-else class="text-medium-emphasis">-</span>
            </template>
            <template #item.iplas_value="{ item }">
              <span v-if="item.iplas_value !== null">{{ item.iplas_value }}</span>
              <span v-else class="text-medium-emphasis">-</span>
            </template>
            <template #item.upload_score="{ item }">
              <v-chip v-if="item.upload_score !== null" :color="getScoreColor(item.upload_score)" size="small">
                {{ item.upload_score?.toFixed(2) }}
              </v-chip>
              <span v-else class="text-medium-emphasis">-</span>
            </template>
            <template #item.iplas_score="{ item }">
              <v-chip v-if="item.iplas_score !== null" :color="getScoreColor(item.iplas_score)" size="small">
                {{ item.iplas_score?.toFixed(2) }}
              </v-chip>
              <span v-else class="text-medium-emphasis">-</span>
            </template>
          </v-data-table>
        </template>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="text" @click="emit('update:modelValue', false)">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ParsedTestItemEnhanced } from '@/features/dut_logs/composables/useTestLogUpload'
import type { IplasIsnTestItem } from '@/features/dut_logs/api/iplasProxyApi'
import { useIplasApi } from '@/features/dut_logs/composables/useIplasApi'

const props = defineProps<{
  modelValue: boolean
  isn: string | null
  uploadTestItems: ParsedTestItemEnhanced[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

interface ComparisonItem {
  test_item: string
  usl: number | null
  lsl: number | null
  upload_value: string | null
  iplas_value: string | null
  upload_score: number | null
  iplas_score: number | null
  status: 'match' | 'mismatch' | 'upload-only' | 'iplas-only'
}

const { searchByIsn } = useIplasApi()

const loading = ref(false)
const exporting = ref(false)
const errorMessage = ref<string | null>(null)
const iplasTestItems = ref<IplasIsnTestItem[]>([])
const comparisonFilter = ref('match')
const searchQuery = ref('')
const typeFilter = ref('all')
const scoreFilter = ref('all')

const typeFilterOptions = [
  { title: 'Show All', value: 'all' },
  { title: 'Criteria', value: 'criteria' },
  { title: 'Non-Criteria', value: 'non-criteria' }
]

const scoreFilterOptions = [
  { title: 'All Scores', value: 'all' },
  { title: 'Score ≥ 9', value: 'gte9' },
  { title: 'Score 7-9', value: '7to9' },
  { title: 'Score < 7', value: 'lt7' },
  { title: 'Has Score', value: 'hasScore' },
  { title: 'No Score', value: 'noScore' }
]

const comparisonHeaders = [
  { title: 'Test Item', key: 'test_item', sortable: true },
  { title: 'UCL', key: 'usl', sortable: true, width: '100px', align: 'center' as const },
  { title: 'LCL', key: 'lsl', sortable: true, width: '100px', align: 'center' as const },
  { title: 'Uploaded Value', key: 'upload_value', sortable: true, width: '130px' },
  { title: 'iPLAS Value', key: 'iplas_value', sortable: true, width: '130px' },
  { title: 'Uploaded Score', key: 'upload_score', sortable: true, width: '120px', align: 'center' as const },
  { title: 'iPLAS Score', key: 'iplas_score', sortable: true, width: '120px', align: 'center' as const }
]

// Build comparison items
const comparisonItems = computed<ComparisonItem[]>(() => {
  const items: ComparisonItem[] = []
  const uploadItemMap = new Map<string, ParsedTestItemEnhanced>()
  const iplasItemMap = new Map<string, IplasIsnTestItem>()

  // Build upload map
  props.uploadTestItems.forEach(item => {
    uploadItemMap.set(item.test_item.toLowerCase(), item)
  })

  // Build iPLAS map
  iplasTestItems.value.forEach(item => {
    iplasItemMap.set(item.NAME.toLowerCase(), item)
  })

  // Get all unique test item names
  const allTestItems = new Set([
    ...Array.from(uploadItemMap.keys()),
    ...Array.from(iplasItemMap.keys())
  ])

  allTestItems.forEach(testItemKey => {
    const uploadItem = uploadItemMap.get(testItemKey)
    const iplasItem = iplasItemMap.get(testItemKey)

    let status: ComparisonItem['status']
    if (uploadItem && iplasItem) {
      // Compare values
      const uploadVal = uploadItem.value?.toString().trim()
      const iplasVal = iplasItem.VALUE?.toString().trim()
      status = uploadVal === iplasVal ? 'match' : 'mismatch'
    } else if (uploadItem) {
      status = 'upload-only'
    } else {
      status = 'iplas-only'
    }

    items.push({
      test_item: uploadItem?.test_item || iplasItem?.NAME || testItemKey,
      usl: uploadItem?.usl ?? null,
      lsl: uploadItem?.lsl ?? null,
      upload_value: uploadItem?.value ?? null,
      iplas_value: iplasItem?.VALUE ?? null,
      upload_score: uploadItem?.score ?? null,
      iplas_score: null, // iPLAS doesn't have scores in basic search
      status
    })
  })

  // Sort by test item name
  return items.sort((a, b) => a.test_item.localeCompare(b.test_item))
})

const filteredComparisonItems = computed(() => {
  let items = comparisonItems.value

  // Filter by comparison status (chips)
  if (comparisonFilter.value !== 'all') {
    items = items.filter(item => item.status === comparisonFilter.value)
  }

  // Filter by type (Criteria / Non-Criteria)
  if (typeFilter.value === 'criteria') {
    items = items.filter(item => item.usl !== null || item.lsl !== null)
  } else if (typeFilter.value === 'non-criteria') {
    items = items.filter(item => item.usl === null && item.lsl === null)
  }

  // Filter by score
  if (scoreFilter.value === 'gte9') {
    items = items.filter(item => item.upload_score !== null && item.upload_score >= 9)
  } else if (scoreFilter.value === '7to9') {
    items = items.filter(item => item.upload_score !== null && item.upload_score >= 7 && item.upload_score < 9)
  } else if (scoreFilter.value === 'lt7') {
    items = items.filter(item => item.upload_score !== null && item.upload_score < 7)
  } else if (scoreFilter.value === 'hasScore') {
    items = items.filter(item => item.upload_score !== null)
  } else if (scoreFilter.value === 'noScore') {
    items = items.filter(item => item.upload_score === null)
  }

  // Filter by search (regex)
  if (searchQuery.value) {
    try {
      const regex = new RegExp(searchQuery.value, 'i')
      items = items.filter(item => regex.test(item.test_item))
    } catch {
      // Invalid regex, fall back to simple includes
      const query = searchQuery.value.toLowerCase()
      items = items.filter(item => item.test_item.toLowerCase().includes(query))
    }
  }

  return items
})

const matchCount = computed(() => comparisonItems.value.filter(i => i.status === 'match').length)
const mismatchCount = computed(() => comparisonItems.value.filter(i => i.status === 'mismatch').length)
const uploadOnlyCount = computed(() => comparisonItems.value.filter(i => i.status === 'upload-only').length)
const iplasOnlyCount = computed(() => comparisonItems.value.filter(i => i.status === 'iplas-only').length)

// Fetch iPLAS data when dialog opens
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen && props.isn) {
    loading.value = true
    errorMessage.value = null
    iplasTestItems.value = []
    // Reset filters
    searchQuery.value = ''
    typeFilter.value = 'all'
    scoreFilter.value = 'all'
    comparisonFilter.value = 'match'

    try {
      const results = await searchByIsn(props.isn)
      // Combine all test items from all stations
      if (results && results.length > 0) {
        const allItems: IplasIsnTestItem[] = []
        results.forEach(record => {
          if (record.test_item) {
            allItems.push(...record.test_item)
          }
        })
        iplasTestItems.value = allItems
      }
    } catch (err: any) {
      errorMessage.value = err.message || 'Failed to fetch iPLAS data'
    } finally {
      loading.value = false
    }
  }
})

function getScoreColor(score: number): string {
  if (score >= 9) return 'success'
  if (score >= 7) return 'warning'
  return 'error'
}

async function exportToExcel() {
  exporting.value = true
  try {
    // Prepare data for export
    const exportData = filteredComparisonItems.value.map(item => ({
      'Test Item': item.test_item,
      'UCL': item.usl ?? '',
      'LCL': item.lsl ?? '',
      'Uploaded Value': item.upload_value ?? '',
      'iPLAS Value': item.iplas_value ?? '',
      'Uploaded Score': item.upload_score ?? '',
      'iPLAS Score': item.iplas_score ?? '',
      'Status': item.status
    }))

    // Dynamic import for xlsx
    const XLSX = await import('xlsx')
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, props.isn || 'Comparison')
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `iPLAS_Compare_${props.isn}_${timestamp}.xlsx`
    
    XLSX.writeFile(workbook, filename)
  } catch (err: any) {
    console.error('Export failed:', err)
    errorMessage.value = 'Export failed: ' + (err.message || 'Unknown error')
  } finally {
    exporting.value = false
  }
}
</script>
