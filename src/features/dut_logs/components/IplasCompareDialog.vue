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
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            <strong>{{ comparisonItems.length }}</strong> test items compared. 
            <strong>{{ matchCount }}</strong> matching, 
            <strong>{{ mismatchCount }}</strong> mismatched,
            <strong>{{ uploadOnlyCount }}</strong> upload-only,
            <strong>{{ iplasOnlyCount }}</strong> iPLAS-only.
          </v-alert>

          <!-- Filter toggle -->
          <v-chip-group v-model="comparisonFilter" mandatory class="mb-4">
            <v-chip value="all" color="primary" variant="flat">All ({{ comparisonItems.length }})</v-chip>
            <v-chip value="mismatch" color="error" variant="flat">Mismatch ({{ mismatchCount }})</v-chip>
            <v-chip value="match" color="success" variant="flat">Match ({{ matchCount }})</v-chip>
            <v-chip value="upload-only" color="warning" variant="flat">Upload Only ({{ uploadOnlyCount }})</v-chip>
            <v-chip value="iplas-only" color="info" variant="flat">iPLAS Only ({{ iplasOnlyCount }})</v-chip>
          </v-chip-group>

          <v-data-table :headers="comparisonHeaders" :items="filteredComparisonItems" 
            :items-per-page="50" density="comfortable" class="elevation-1">
            <template #item.test_item="{ item }">
              <span class="font-weight-medium">{{ item.test_item }}</span>
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
            <template #item.status="{ item }">
              <v-chip :color="getStatusColor(item.status)" size="small" variant="tonal">
                {{ item.status }}
              </v-chip>
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
  upload_value: string | null
  iplas_value: string | null
  upload_score: number | null
  iplas_score: number | null
  status: 'match' | 'mismatch' | 'upload-only' | 'iplas-only'
}

const { searchByIsn } = useIplasApi()

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const iplasTestItems = ref<IplasIsnTestItem[]>([])
const comparisonFilter = ref('all')

const comparisonHeaders = [
  { title: 'Test Item', key: 'test_item', sortable: true },
  { title: 'Uploaded Value', key: 'upload_value', sortable: true, width: '150px' },
  { title: 'iPLAS Value', key: 'iplas_value', sortable: true, width: '150px' },
  { title: 'Uploaded Score', key: 'upload_score', sortable: true, width: '130px', align: 'center' as const },
  { title: 'iPLAS Score', key: 'iplas_score', sortable: true, width: '130px', align: 'center' as const },
  { title: 'Status', key: 'status', sortable: true, width: '120px', align: 'center' as const }
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
  if (comparisonFilter.value === 'all') {
    return comparisonItems.value
  }
  return comparisonItems.value.filter(item => item.status === comparisonFilter.value)
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

function getStatusColor(status: ComparisonItem['status']): string {
  switch (status) {
    case 'match': return 'success'
    case 'mismatch': return 'error'
    case 'upload-only': return 'warning'
    case 'iplas-only': return 'info'
    default: return 'grey'
  }
}
</script>
