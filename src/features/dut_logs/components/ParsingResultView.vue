<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon start>mdi-file-document-check</v-icon>
      Parsing Results
      <v-chip class="ml-2" color="primary" size="small">
        {{ result.parsed_count }} items
      </v-chip>
    </v-card-title>

    <v-card-text>
      <!-- Metadata Card -->
      <v-card variant="tonal" class="mb-4">
        <v-card-title class="text-subtitle-1">
          <v-icon start size="small">mdi-information</v-icon>
          Log Metadata
        </v-card-title>
        <v-card-text>
          <v-row dense>
            <!-- Station/ISN/Filename Info -->
            <v-col cols="12" md="4">
              <div class="text-caption text-medium-emphasis">Station</div>
              <div class="text-body-2 font-weight-medium">{{ result.station }}</div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-caption text-medium-emphasis">ISN</div>
              <div class="text-body-2 font-weight-medium">{{ result.isn || 'N/A' }}</div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-caption text-medium-emphasis">Filename</div>
              <div class="text-body-2 font-weight-medium">{{ result.filename }}</div>
            </v-col>

            <!-- 8 Metadata Fields -->
            <v-col cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Test Date</div>
              <div class="text-body-2">{{ result.metadata?.test_date || 'N/A' }}</div>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Device</div>
              <div class="text-body-2">{{ result.metadata?.device || 'N/A' }}</div>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Script Version</div>
              <div class="text-body-2">{{ result.metadata?.script_version || 'N/A' }}</div>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Duration</div>
              <div class="text-body-2">{{ formatDuration(result.metadata?.duration_seconds) }}</div>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-caption text-medium-emphasis">SFIS Status</div>
              <div class="text-body-2">{{ result.metadata?.sfis_status || 'N/A' }}</div>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Result</div>
              <v-chip :color="getResultColor(result.metadata?.result)" size="x-small">
                {{ result.metadata?.result || 'N/A' }}
              </v-chip>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Counter</div>
              <div class="text-body-2">{{ result.metadata?.counter || 'N/A' }}</div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Summary Statistics -->
      <v-row dense class="mb-4">
        <v-col cols="12" md="3">
          <v-card variant="tonal" color="primary">
            <v-card-text class="text-center py-3">
              <div class="text-h5 font-weight-bold">{{ result.value_type_count }}</div>
              <div class="text-caption">Value Items</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card variant="tonal" color="secondary">
            <v-card-text class="text-center py-3">
              <div class="text-h5 font-weight-bold">{{ result.non_value_type_count }}</div>
              <div class="text-caption">Non-Value Items</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card variant="tonal" color="info">
            <v-card-text class="text-center py-3">
              <div class="text-h5 font-weight-bold">{{ result.hex_value_count }}</div>
              <div class="text-caption">Hex Values</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card variant="tonal" color="success">
            <v-card-text class="text-center py-3">
              <div class="text-h5 font-weight-bold">
                {{ formatScore(result.avg_score) }}
              </div>
              <div class="text-caption">Avg Score (Median: {{ formatScore(result.median_score) }})</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Data Table with Virtual Scrolling -->
      <v-card variant="outlined">
        <v-card-title class="bg-info-lighten-5 d-flex align-center">
          <v-icon start>mdi-table</v-icon>
          Test Items
          <v-chip class="ml-2" size="small">{{ filteredItems.length }}</v-chip>
          <v-spacer />
          <v-btn icon size="small" @click="fullscreen = true" class="ml-2">
            <v-icon>mdi-fullscreen</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-2">
          <!-- Search Field -->
          <v-text-field v-model="search" prepend-inner-icon="mdi-magnify" label="Search test items..."
            variant="outlined" density="compact" clearable class="mb-2" hide-details />
        </v-card-text>
        <v-card-text class="pa-0">
          <v-data-table :headers="headers" :items="paginatedItems" :items-per-page="itemsPerPage"
            density="compact" fixed-header height="500" hide-default-footer striped="even">
        <!-- Test Item Column -->
        <template #item.test_item="{ item }">
          <div 
            class="text-body-2 font-weight-medium"
            :class="{ 'text-primary font-weight-bold': item.is_calculated }"
          >
            {{ item.test_item }}
            <v-chip 
              v-if="item.is_calculated" 
              size="x-small" 
              color="primary" 
              variant="tonal"
              class="ml-1"
            >
              Calculated
            </v-chip>
          </div>
        </template>

        <!-- USL Column -->
        <template #item.usl="{ item }">
          <span class="text-body-2">{{ formatNumber(item.usl) }}</span>
        </template>

        <!-- LSL Column -->
        <template #item.lsl="{ item }">
          <span class="text-body-2">{{ formatNumber(item.lsl) }}</span>
        </template>

        <!-- Value Column -->
        <template #item.value="{ item }">
          <div class="d-flex align-center gap-1">
            <span class="text-body-2">{{ item.value }}</span>
            <v-chip v-if="item.is_hex" size="x-small" color="info" variant="tonal">
              {{ item.hex_decimal }}
            </v-chip>
          </div>
        </template>

        <!-- Type Column -->
        <template #item.type="{ item }">
          <v-chip :color="getTypeColor(item)" size="small" variant="tonal">
            {{ getTypeLabel(item) }}
          </v-chip>
        </template>

        <!-- Score Column (Clickable) -->
        <template #item.score="{ item }">
          <v-chip
            v-if="item.score !== null"
            :color="getScoreColor(item.score)"
            size="small"
            class="cursor-pointer"
            @click="openScoreBreakdown(item)"
          >
            {{ item.score.toFixed(2) }}
          </v-chip>
          <span v-else class="text-caption text-medium-emphasis">N/A</span>
        </template>

        <!-- Criteria Match Column -->
        <template #item.matches_criteria="{ item }">
          <v-icon v-if="item.matches_criteria" color="success" size="small">
            mdi-check-circle
          </v-icon>
          <v-icon v-else color="grey" size="small">
            mdi-minus-circle
          </v-icon>
        </template>
      </v-data-table>
      <div class="d-flex align-center justify-space-between pa-2">
        <div class="d-flex align-center gap-2">
          <span class="text-caption text-medium-emphasis">Show</span>
          <v-select v-model="itemsPerPage" :items="itemsPerPageOptions" variant="outlined" density="compact"
            hide-details style="width: 100px;" />
          <span class="text-caption text-medium-emphasis">items</span>
        </div>
        <v-pagination v-if="itemsPerPage !== -1 && itemsPerPage !== 0 && filteredItems.length > itemsPerPage" v-model="currentPage" :length="totalPages" :total-visible="7" size="small"
          density="compact" />
        <div style="width: 150px;"></div>
      </div>
        </v-card-text>
      </v-card>
    </v-card-text>
  </v-card>

  <!-- Fullscreen Dialog -->
  <v-dialog v-model="fullscreen" fullscreen transition="dialog-bottom-transition">
    <v-card class="d-flex flex-column" style="height: 100vh; overflow: hidden;">
      <v-card-title class="d-flex justify-space-between align-center flex-shrink-0">
        <div>
          <v-icon class="mr-2">mdi-table</v-icon>
          Test Items
        </div>
        <v-btn icon="mdi-close" variant="text" @click="fullscreen = false" />
      </v-card-title>
      <v-card-text class="pb-2 pt-3 flex-shrink-0">
        <v-text-field v-model="search" prepend-inner-icon="mdi-magnify" label="Search test items..."
          variant="outlined" density="compact" clearable hide-details />
      </v-card-text>
      <v-card-text class="pa-0 flex-grow-1 d-flex flex-column" style="overflow: hidden;">
        <div class="flex-grow-1" style="overflow: auto;">
          <v-data-table :headers="headers" :items="paginatedItems" :items-per-page="itemsPerPage"
            :height="'calc(100vh - 200px)'" fixed-header density="compact" hide-default-footer>
          <template #item.test_item="{ item }">
            <div 
              class="text-body-2 font-weight-medium"
              :class="{ 'text-primary font-weight-bold': item.is_calculated }"
            >
              {{ item.test_item }}
              <v-chip 
                v-if="item.is_calculated" 
                size="x-small" 
                color="primary" 
                variant="tonal"
                class="ml-1"
              >
                Calculated
              </v-chip>
            </div>
          </template>
          <template #item.usl="{ item }">
            <span class="text-body-2">{{ formatNumber(item.usl) }}</span>
          </template>
          <template #item.lsl="{ item }">
            <span class="text-body-2">{{ formatNumber(item.lsl) }}</span>
          </template>
          <template #item.value="{ item }">
            <div class="d-flex align-center gap-1">
              <span class="text-body-2">{{ item.value }}</span>
              <v-chip v-if="item.is_hex" size="x-small" color="info" variant="tonal">
                {{ item.hex_decimal }}
              </v-chip>
            </div>
          </template>
          <template #item.type="{ item }">
            <v-chip :color="getTypeColor(item)" size="small" variant="tonal">
              {{ getTypeLabel(item) }}
            </v-chip>
          </template>
          <template #item.score="{ item }">
            <v-chip v-if="item.score !== null" :color="getScoreColor(item.score)" size="small"
              class="cursor-pointer" @click="openScoreBreakdown(item)">
              {{ item.score.toFixed(2) }}
            </v-chip>
            <span v-else class="text-caption text-medium-emphasis">N/A</span>
          </template>
          <template #item.matches_criteria="{ item }">
            <v-icon v-if="item.matches_criteria" color="success" size="small">
              mdi-check-circle
            </v-icon>
            <v-icon v-else color="grey" size="small">
              mdi-minus-circle
            </v-icon>
          </template>
        </v-data-table>
        </div>
        <div class="flex-shrink-0 pa-2" style="border-top: 1px solid rgba(0,0,0,0.12);">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center gap-2">
              <span class="text-caption text-medium-emphasis">Show</span>
              <v-select v-model="itemsPerPage" :items="itemsPerPageOptions" variant="outlined" density="compact"
                hide-details style="width: 100px;" />
              <span class="text-caption text-medium-emphasis">items</span>
            </div>
            <v-pagination v-if="itemsPerPage !== -1 && itemsPerPage !== 0 && filteredItems.length > itemsPerPage" v-model="currentPage"
              :length="totalPages" :total-visible="5" size="small" density="compact" />
            <div style="width: 150px;"></div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Custom Items Per Page Dialog -->
  <v-dialog v-model="showCustomInput" max-width="400">
    <v-card>
      <v-card-title>Custom Items Per Page</v-card-title>
      <v-card-text>
        <v-text-field v-model.number="customItemsPerPage" type="number" label="Enter number of items" 
          variant="outlined" density="comfortable" min="1" autofocus @keyup.enter="applyCustomItemsPerPage" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="cancelCustomInput">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" @click="applyCustomItemsPerPage">Apply</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Score Breakdown Dialog -->
  <ScoreBreakdownDialog
    v-model="scoreDialogOpen"
    :item="selectedItem"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TestLogParseResponseEnhanced, ParsedTestItemEnhanced } from '@/features/dut_logs/composables/useTestLogUpload'
import ScoreBreakdownDialog from './ScoreBreakdownDialog.vue'

const props = defineProps<{
  result: TestLogParseResponseEnhanced
}>()

// Search and fullscreen
const search = ref('')
const fullscreen = ref(false)

// Pagination
const itemsPerPage = ref(10)
const currentPage = ref(1)
const itemsPerPageOptions = [
  { title: '5', value: 5 },
  { title: '10', value: 10 },
  { title: '25', value: 25 },
  { title: '50', value: 50 },
  { title: '100', value: 100 },
  { title: 'All', value: -1 },
  { title: 'Custom', value: 0 }
]
const showCustomInput = ref(false)
const customItemsPerPage = ref(10)

// Filtered items
const filteredItems = computed(() => {
  if (!search.value) return props.result.parsed_items_enhanced
  const searchLower = search.value.toLowerCase()
  return props.result.parsed_items_enhanced.filter(item =>
    item.test_item.toLowerCase().includes(searchLower)
  )
})

// Pagination computed
const totalPages = computed(() => {
  const perPage = itemsPerPage.value === -1 ? filteredItems.value.length : 
                  itemsPerPage.value === 0 ? 10 : itemsPerPage.value
  return Math.ceil(filteredItems.value.length / perPage)
})

const paginatedItems = computed(() => {
  const perPage = itemsPerPage.value === -1 ? filteredItems.value.length : 
                  itemsPerPage.value === 0 ? 10 : itemsPerPage.value
  const start = (currentPage.value - 1) * perPage
  const end = start + perPage
  return filteredItems.value.slice(start, end)
})

// Reset pagination when search changes
watch(search, () => {
  currentPage.value = 1
})

// Watch for custom items per page selection
watch(itemsPerPage, (newVal) => {
  if (newVal === 0) {
    showCustomInput.value = true
  } else {
    showCustomInput.value = false
    currentPage.value = 1
  }
})

// Apply custom value
const applyCustomItemsPerPage = () => {
  if (customItemsPerPage.value > 0) {
    itemsPerPage.value = customItemsPerPage.value
  }
  showCustomInput.value = false
}

const cancelCustomInput = () => {
  itemsPerPage.value = 10
  showCustomInput.value = false
}

// Table headers
const headers = [
  { title: 'Test Item', key: 'test_item', sortable: true, width: '300px' },
  { title: 'USL', key: 'usl', sortable: true, align: 'end' as const },
  { title: 'LSL', key: 'lsl', sortable: true, align: 'end' as const },
  { title: 'Value', key: 'value', sortable: true },
  { title: 'Type', key: 'type', sortable: true },
  { title: 'Score', key: 'score', sortable: true, align: 'end' as const },
  { title: 'Criteria', key: 'matches_criteria', sortable: true, align: 'center' as const }
]

// Score breakdown dialog
const scoreDialogOpen = ref(false)
const selectedItem = ref<ParsedTestItemEnhanced | null>(null)

// Helper functions
const formatDuration = (seconds: number | null): string => {
  if (!seconds) return 'N/A'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

const getResultColor = (result: string | null): string => {
  if (!result) return 'grey'
  const upper = result.toUpperCase()
  if (upper === 'PASS') return 'success'
  if (upper === 'FAIL') return 'error'
  return 'warning'
}

const formatScore = (score: number | null): string => {
  return score !== null ? score.toFixed(2) : 'N/A'
}

const formatNumber = (value: number | null): string => {
  return value !== null ? value.toString() : 'N/A'
}

const getTypeLabel = (item: ParsedTestItemEnhanced): string => {
  if (item.is_hex) return 'Hex'
  if (item.is_value_type) return 'Value'
  return 'Non-Value'
}

const getTypeColor = (item: ParsedTestItemEnhanced): string => {
  if (item.is_hex) return 'info'
  if (item.is_value_type) return 'primary'
  return 'secondary'
}

const getScoreColor = (score: number): string => {
  if (score >= 90) return 'success'
  if (score >= 70) return 'warning'
  return 'error'
}

const openScoreBreakdown = (item: ParsedTestItemEnhanced) => {
  selectedItem.value = item
  scoreDialogOpen.value = true
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
