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

      <!-- Value Items Table (Numeric Data) -->
      <v-card variant="outlined" class="mb-4">
        <v-card-title class="bg-info-lighten-5 d-flex align-center">
          <v-icon start>mdi-table</v-icon>
          Value Items (Numeric Data)
          <v-chip class="ml-2" size="small">{{ filteredValueItems.length }}</v-chip>
          <v-spacer />
          <!-- <v-btn icon size="small" @click="fullscreenValue = true" class="ml-2">
            <v-icon>mdi-fullscreen</v-icon>
          </v-btn> -->
          <v-icon color="primary" size="large" @click="fullscreenValue = true">mdi-fullscreen</v-icon>
        </v-card-title>
        <v-card-text class="pa-2">
          <!-- Search Field -->
          <v-text-field v-model="searchValue" prepend-inner-icon="mdi-magnify" label="Search value items..."
            variant="outlined" density="compact" clearable class="mb-2" hide-details />
        </v-card-text>
        <v-card-text class="pa-0">
          <v-data-table :headers="valueHeaders" :items="paginatedValueItems" :items-per-page="itemsPerPageValue"
            density="compact" fixed-header height="500" hide-default-footer striped="even">
            <!-- Test Item Column -->
            <template #item.test_item="{ item }">
              <div class="text-body-2 font-weight-medium"
                :class="{ 'text-primary font-weight-bold': item.is_calculated }">
                {{ item.test_item }}
                <v-chip v-if="item.is_calculated" size="x-small" color="primary" variant="tonal" class="ml-1">
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
              <v-chip v-if="item.score !== null" :color="getScoreColor(item.score)" size="small" class="cursor-pointer"
                @click="openScoreBreakdown(item)">
                {{ item.score.toFixed(2) }}
              </v-chip>
              <span v-else class="text-caption text-medium-emphasis">N/A</span>
            </template>

            <!-- Criteria Match Column -->
            <template #item.matched_criteria="{ item }">
              <v-icon v-if="item.matched_criteria" color="success" size="small">
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
              <v-select v-model="itemsPerPageValue" :items="itemsPerPageOptions" variant="outlined" density="compact"
                hide-details style="width: 100px;" />
              <span class="text-caption text-medium-emphasis">items</span>
            </div>
            <v-pagination
              v-if="itemsPerPageValue !== -1 && itemsPerPageValue !== 0 && filteredValueItems.length > itemsPerPageValue"
              v-model="currentPageValue" :length="totalPagesValue" :total-visible="7" size="small" density="compact" />
            <div style="width: 150px;"></div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Non-Value Items Table (Status/Text Data) -->
      <v-card variant="outlined">
        <v-card-title class="bg-secondary-lighten-5 d-flex align-center">
          <v-icon start>mdi-table</v-icon>
          Non-Value Items (Status/Text Data)
          <v-chip class="ml-2" size="small">{{ filteredNonValueItems.length }}</v-chip>
          <v-spacer />
          <!-- <v-btn icon size="small" @click="fullscreenNonValue = true" class="ml-2">
            <v-icon>mdi-fullscreen</v-icon>
          </v-btn> -->
          <v-icon color="primary" size="large" @click="fullscreenNonValue = true">mdi-fullscreen</v-icon>
        </v-card-title>
        <v-card-text class="pa-2">
          <!-- Search Field -->
          <v-text-field v-model="searchNonValue" prepend-inner-icon="mdi-magnify" label="Search non-value items..."
            variant="outlined" density="compact" clearable class="mb-2" hide-details />
        </v-card-text>
        <v-card-text class="pa-0">
          <v-data-table :headers="nonValueHeaders" :items="paginatedNonValueItems"
            :items-per-page="itemsPerPageNonValue" density="compact" fixed-header height="500" hide-default-footer
            striped="even">
            <!-- Test Item Column -->
            <template #item.test_item="{ item }">
              <div class="text-body-2 font-weight-medium"
                :class="{ 'text-primary font-weight-bold': item.is_calculated }">
                {{ item.test_item }}
              </div>
            </template>

            <!-- Value Column -->
            <template #item.value="{ item }">
              <v-chip size="small" :color="item.is_calculated ? 'primary' : getStatusColor(item.value)"
                :class="{ 'font-weight-bold': item.is_calculated }">
                {{ item.value }}
              </v-chip>
            </template>

            <!-- Decimal Value Column (for ADJUSTED_POW items) -->
            <template #item.decimal_value="{ item }">
              <span
                v-if="item.test_item.includes('ADJUSTED_POW') && (item.hex_decimal !== null && item.hex_decimal !== undefined)"
                class="text-body-2 font-weight-medium text-primary">
                {{ item.hex_decimal }}
              </span>
              <span v-else class="text-caption text-medium-emphasis">—</span>
            </template>

            <!-- Type Column -->
            <template #item.type="{ item }">
              <v-chip :color="getTypeColor(item)" size="small" variant="tonal">
                {{ getTypeLabel(item) }}
              </v-chip>
            </template>

            <!-- Criteria Match Column -->
            <template #item.matched_criteria="{ item }">
              <v-icon v-if="item.matched_criteria" color="success" size="small">
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
              <v-select v-model="itemsPerPageNonValue" :items="itemsPerPageOptions" variant="outlined" density="compact"
                hide-details style="width: 100px;" />
              <span class="text-caption text-medium-emphasis">items</span>
            </div>
            <v-pagination
              v-if="itemsPerPageNonValue !== -1 && itemsPerPageNonValue !== 0 && filteredNonValueItems.length > itemsPerPageNonValue"
              v-model="currentPageNonValue" :length="totalPagesNonValue" :total-visible="7" size="small"
              density="compact" />
            <div style="width: 150px;"></div>
          </div>
        </v-card-text>
      </v-card>
    </v-card-text>
  </v-card>

  <!-- Fullscreen Dialog for Value Items -->
  <v-dialog v-model="fullscreenValue" fullscreen transition="dialog-bottom-transition">
    <v-card class="d-flex flex-column" style="height: 100vh; overflow: hidden;">
      <v-card-title class="d-flex justify-space-between align-center flex-shrink-0">
        <div>
          <v-icon class="mr-2">mdi-table</v-icon>
          Value Items (Numeric Data)
        </div>
        <v-btn icon="mdi-close" variant="text" @click="fullscreenValue = false" />
      </v-card-title>
      <v-card-text class="pb-2 pt-3 flex-shrink-0">
        <v-text-field v-model="searchValue" prepend-inner-icon="mdi-magnify" label="Search value items..."
          variant="outlined" density="compact" clearable hide-details />
      </v-card-text>
      <v-card-text class="pa-0 flex-grow-1 d-flex flex-column" style="overflow: hidden;">
        <div class="flex-grow-1" style="overflow: auto;">
          <v-data-table :headers="valueHeaders" :items="paginatedValueItems" :items-per-page="itemsPerPageValue"
            :height="'calc(100vh - 200px)'" fixed-header density="compact" hide-default-footer>
            <template #item.test_item="{ item }">
              <div class="text-body-2 font-weight-medium"
                :class="{ 'text-primary font-weight-bold': item.is_calculated }">
                {{ item.test_item }}
                <v-chip v-if="item.is_calculated" size="x-small" color="primary" variant="tonal" class="ml-1">
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
              <v-chip v-if="item.score !== null" :color="getScoreColor(item.score)" size="small" class="cursor-pointer"
                @click="openScoreBreakdown(item)">
                {{ item.score.toFixed(2) }}
              </v-chip>
              <span v-else class="text-caption text-medium-emphasis">N/A</span>
            </template>
            <template #item.matched_criteria="{ item }">
              <v-icon v-if="item.matched_criteria" color="success" size="small">
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
              <v-select v-model="itemsPerPageValue" :items="itemsPerPageOptions" variant="outlined" density="compact"
                hide-details style="width: 100px;" />
              <span class="text-caption text-medium-emphasis">items</span>
            </div>
            <v-pagination
              v-if="itemsPerPageValue !== -1 && itemsPerPageValue !== 0 && filteredValueItems.length > itemsPerPageValue"
              v-model="currentPageValue" :length="totalPagesValue" :total-visible="5" size="small" density="compact" />
            <div style="width: 150px;"></div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Fullscreen Dialog for Non-Value Items -->
  <v-dialog v-model="fullscreenNonValue" fullscreen transition="dialog-bottom-transition">
    <v-card class="d-flex flex-column" style="height: 100vh; overflow: hidden;">
      <v-card-title class="d-flex justify-space-between align-center flex-shrink-0">
        <div>
          <v-icon class="mr-2">mdi-table</v-icon>
          Non-Value Items (Status/Text Data)
        </div>
        <v-btn icon="mdi-close" variant="text" @click="fullscreenNonValue = false" />
      </v-card-title>
      <v-card-text class="pb-2 pt-3 flex-shrink-0">
        <v-text-field v-model="searchNonValue" prepend-inner-icon="mdi-magnify" label="Search non-value items..."
          variant="outlined" density="compact" clearable hide-details />
      </v-card-text>
      <v-card-text class="pa-0 flex-grow-1 d-flex flex-column" style="overflow: hidden;">
        <div class="flex-grow-1" style="overflow: auto;">
          <v-data-table :headers="nonValueHeaders" :items="paginatedNonValueItems"
            :items-per-page="itemsPerPageNonValue" :height="'calc(100vh - 200px)'" fixed-header density="compact"
            hide-default-footer>
            <template #item.test_item="{ item }">
              <div class="text-body-2 font-weight-medium"
                :class="{ 'text-primary font-weight-bold': item.is_calculated }">
                {{ item.test_item }}
              </div>
            </template>
            <template #item.value="{ item }">
              <v-chip size="small" :color="item.is_calculated ? 'primary' : getStatusColor(item.value)"
                :class="{ 'font-weight-bold': item.is_calculated }">
                {{ item.value }}
              </v-chip>
            </template>
            <template #item.decimal_value="{ item }">
              <span
                v-if="item.test_item.includes('ADJUSTED_POW') && (item.hex_decimal !== null && item.hex_decimal !== undefined)"
                class="text-body-2 font-weight-medium text-primary">
                {{ item.hex_decimal }}
              </span>
              <span v-else class="text-caption text-medium-emphasis">—</span>
            </template>
            <template #item.type="{ item }">
              <v-chip :color="getTypeColor(item)" size="small" variant="tonal">
                {{ getTypeLabel(item) }}
              </v-chip>
            </template>
            <template #item.matched_criteria="{ item }">
              <v-icon v-if="item.matched_criteria" color="success" size="small">
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
              <v-select v-model="itemsPerPageNonValue" :items="itemsPerPageOptions" variant="outlined" density="compact"
                hide-details style="width: 100px;" />
              <span class="text-caption text-medium-emphasis">items</span>
            </div>
            <v-pagination
              v-if="itemsPerPageNonValue !== -1 && itemsPerPageNonValue !== 0 && filteredNonValueItems.length > itemsPerPageNonValue"
              v-model="currentPageNonValue" :length="totalPagesNonValue" :total-visible="5" size="small"
              density="compact" />
            <div style="width: 150px;"></div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Custom Items Per Page Dialog for Value Items -->
  <v-dialog v-model="showCustomInputValue" max-width="400">
    <v-card>
      <v-card-title>Custom Items Per Page (Value Items)</v-card-title>
      <v-card-text>
        <v-text-field v-model.number="customItemsPerPageValue" type="number" label="Enter number of items"
          variant="outlined" density="comfortable" min="1" autofocus @keyup.enter="applyCustomItemsPerPageValue" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="cancelCustomInputValue">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" @click="applyCustomItemsPerPageValue">Apply</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Custom Items Per Page Dialog for Non-Value Items -->
  <v-dialog v-model="showCustomInputNonValue" max-width="400">
    <v-card>
      <v-card-title>Custom Items Per Page (Non-Value Items)</v-card-title>
      <v-card-text>
        <v-text-field v-model.number="customItemsPerPageNonValue" type="number" label="Enter number of items"
          variant="outlined" density="comfortable" min="1" autofocus @keyup.enter="applyCustomItemsPerPageNonValue" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="cancelCustomInputNonValue">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" @click="applyCustomItemsPerPageNonValue">Apply</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Score Breakdown Dialog -->
  <ScoreBreakdownDialog v-model="scoreDialogOpen" :item="selectedItem" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  ParsedTestItemEnhanced,
  TestLogParseResponseEnhanced,
} from '@/features/dut_logs/composables/useTestLogUpload'

const props = defineProps<{
  result: TestLogParseResponseEnhanced
}>()

// Search and fullscreen for Value Items
const searchValue = ref('')
const fullscreenValue = ref(false)

// Search and fullscreen for Non-Value Items
const searchNonValue = ref('')
const fullscreenNonValue = ref(false)

// Pagination for Value Items
const itemsPerPageValue = ref(10)
const currentPageValue = ref(1)

// Pagination for Non-Value Items
const itemsPerPageNonValue = ref(10)
const currentPageNonValue = ref(1)

const itemsPerPageOptions = [
  { title: '5', value: 5 },
  { title: '10', value: 10 },
  { title: '25', value: 25 },
  { title: '50', value: 50 },
  { title: '100', value: 100 },
  { title: 'All', value: -1 },
  { title: 'Custom', value: 0 },
]
const showCustomInputValue = ref(false)
const customItemsPerPageValue = ref(10)
const showCustomInputNonValue = ref(false)
const customItemsPerPageNonValue = ref(10)

// Separate value and non-value items
// Note: ADJUSTED_POW items are moved to non-value items
const valueItems = computed(() => {
  return props.result.parsed_items_enhanced.filter(
    (item) => item.is_value_type && !item.test_item.includes('ADJUSTED_POW'),
  )
})

const nonValueItems = computed(() => {
  return props.result.parsed_items_enhanced.filter(
    (item) => !item.is_value_type || item.test_item.includes('ADJUSTED_POW'),
  )
})

// Filtered value items
const filteredValueItems = computed(() => {
  if (!searchValue.value) return valueItems.value
  const searchLower = searchValue.value.toLowerCase()
  return valueItems.value.filter((item) => item.test_item.toLowerCase().includes(searchLower))
})

// Filtered non-value items
const filteredNonValueItems = computed(() => {
  if (!searchNonValue.value) return nonValueItems.value
  const searchLower = searchNonValue.value.toLowerCase()
  return nonValueItems.value.filter((item) => item.test_item.toLowerCase().includes(searchLower))
})

// Pagination computed for Value Items
const totalPagesValue = computed(() => {
  const perPage =
    itemsPerPageValue.value === -1
      ? filteredValueItems.value.length
      : itemsPerPageValue.value === 0
        ? 10
        : itemsPerPageValue.value
  return Math.ceil(filteredValueItems.value.length / perPage)
})

const paginatedValueItems = computed(() => {
  const perPage =
    itemsPerPageValue.value === -1
      ? filteredValueItems.value.length
      : itemsPerPageValue.value === 0
        ? 10
        : itemsPerPageValue.value
  const start = (currentPageValue.value - 1) * perPage
  const end = start + perPage
  return filteredValueItems.value.slice(start, end)
})

// Pagination computed for Non-Value Items
const totalPagesNonValue = computed(() => {
  const perPage =
    itemsPerPageNonValue.value === -1
      ? filteredNonValueItems.value.length
      : itemsPerPageNonValue.value === 0
        ? 10
        : itemsPerPageNonValue.value
  return Math.ceil(filteredNonValueItems.value.length / perPage)
})

const paginatedNonValueItems = computed(() => {
  const perPage =
    itemsPerPageNonValue.value === -1
      ? filteredNonValueItems.value.length
      : itemsPerPageNonValue.value === 0
        ? 10
        : itemsPerPageNonValue.value
  const start = (currentPageNonValue.value - 1) * perPage
  const end = start + perPage
  return filteredNonValueItems.value.slice(start, end)
})

// Reset pagination when search changes
watch(searchValue, () => {
  currentPageValue.value = 1
})

watch(searchNonValue, () => {
  currentPageNonValue.value = 1
})

// Watch for custom items per page selection
watch(itemsPerPageValue, (newVal) => {
  if (newVal === 0) {
    showCustomInputValue.value = true
  } else {
    showCustomInputValue.value = false
    currentPageValue.value = 1
  }
})

watch(itemsPerPageNonValue, (newVal) => {
  if (newVal === 0) {
    showCustomInputNonValue.value = true
  } else {
    showCustomInputNonValue.value = false
    currentPageNonValue.value = 1
  }
})

// Apply custom value
const applyCustomItemsPerPageValue = () => {
  if (customItemsPerPageValue.value > 0) {
    itemsPerPageValue.value = customItemsPerPageValue.value
  }
  showCustomInputValue.value = false
}

const cancelCustomInputValue = () => {
  itemsPerPageValue.value = 10
  showCustomInputValue.value = false
}

const applyCustomItemsPerPageNonValue = () => {
  if (customItemsPerPageNonValue.value > 0) {
    itemsPerPageNonValue.value = customItemsPerPageNonValue.value
  }
  showCustomInputNonValue.value = false
}

const cancelCustomInputNonValue = () => {
  itemsPerPageNonValue.value = 10
  showCustomInputNonValue.value = false
}

// Table headers for Value Items (with scoring)
const valueHeaders = [
  { title: 'Test Item', key: 'test_item', sortable: true, width: '300px' },
  { title: 'USL', key: 'usl', sortable: true, align: 'center' as const },
  { title: 'LSL', key: 'lsl', sortable: true, align: 'center' as const },
  { title: 'Value', key: 'value', sortable: true },
  { title: 'Type', key: 'type', sortable: true },
  { title: 'Score', key: 'score', sortable: true, align: 'end' as const },
  { title: 'Criteria', key: 'matched_criteria', sortable: true, align: 'center' as const },
]

// Table headers for Non-Value Items (no scoring)
const nonValueHeaders = [
  { title: 'Test Item', key: 'test_item', sortable: true, width: '300px' },
  { title: 'Value', key: 'value', sortable: true },
  { title: 'Decimal Value', key: 'decimal_value', sortable: true },
  { title: 'Type', key: 'type', sortable: true },
  { title: 'Criteria', key: 'matched_criteria', sortable: true, align: 'center' as const },
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

const formatScore = (score: number | null | undefined): string => {
  return score !== null && score !== undefined ? score.toFixed(2) : 'N/A'
}

const formatNumber = (value: number | null | undefined): string => {
  return value !== null && value !== undefined ? value.toString() : 'N/A'
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
  if (score >= 9) return 'success'
  if (score >= 7) return 'warning'
  return 'error'
}

const getStatusColor = (value: string): string => {
  const upper = value.toUpperCase()
  if (upper === 'PASS' || upper === 'OK') return 'success'
  if (upper === 'FAIL' || upper === 'ERROR') return 'error'
  return 'grey'
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
