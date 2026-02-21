<template>
  <!-- Configuration Section -->
  <v-row class="mb-4">
    <v-col cols="12">
      <!-- Site / Model / Station Selector -->
      <SiteModelStationSelector v-model="selection" :show-validation="attemptedAnalysis" class="mb-4"
        @change="handleSelectionChange" />
    </v-col>

    <v-col cols="12" md="6">
      <!-- Date Range Picker -->
      <DateRangePicker v-model="dateRange" :max-days="30" :show-validation="attemptedAnalysis"
        @change="handleDateChange" />
    </v-col>

    <v-col cols="12" md="6">
      <!-- Criteria Configuration -->
      <CriteriaConfig v-model="criteriaConfig" :show-validation="attemptedAnalysis" @change="handleCriteriaChange" />
    </v-col>
  </v-row>

  <!-- Action Button -->
  <v-row class="mb-6">
    <v-col cols="12">
      <v-card>
        <v-card-text>
          <div class="d-flex gap-2 align-center">
            <v-btn color="primary" size="large" :loading="loading" :disabled="!canAnalyze || loading"
              prepend-icon="mdi-play" @click="handleAnalyze">
              Run Analysis
            </v-btn>

            <v-btn v-if="hasResults" color="secondary" size="large" variant="outlined" prepend-icon="mdi-refresh"
              @click="handleReset">
              Reset
            </v-btn>

            <!-- Status Indicator -->
            <v-spacer />
            <v-chip v-if="hasResults" color="success" prepend-icon="mdi-check-circle">
              {{ topProducts.length }} products found
            </v-chip>
            <v-chip v-else-if="attemptedAnalysis && !canAnalyze" color="warning" prepend-icon="mdi-alert">
              Please complete all required fields
            </v-chip>
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>

  <!-- Results Section -->
  <v-row v-if="hasResults">
    <v-col cols="12">
      <!-- Results Summary -->
      <v-card class="mb-4">
        <v-card-title>
          <v-icon class="mr-2">mdi-information-outline</v-icon>
          Analysis Summary
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" sm="6" md="3">
              <div class="text-caption text-medium-emphasis">Selection</div>
              <div class="font-weight-bold">
                {{ resultsMetadata.site_name }} → {{ resultsMetadata.model_name }} → {{ resultsMetadata.station_name }}
              </div>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <div class="text-caption text-medium-emphasis">Criteria Score</div>
              <div class="font-weight-bold">{{ resultsMetadata.criteria_score }}</div>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <div class="text-caption text-medium-emphasis">Products Found</div>
              <div class="font-weight-bold">{{ topProducts.length }}</div>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <div class="text-caption text-medium-emphasis">Processing Time</div>
              <div class="font-weight-bold">{{ resultsMetadata.processing_time.toFixed(2) }}s</div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Score Visualization -->
    <v-col cols="12">
      <ScoreVisualization :items="topProducts" class="mb-4" />
    </v-col>

    <!-- Results Table -->
    <v-col cols="12">
      <TopProductsTable :items="topProducts" :loading="loading" @export="$emit('export')" />
    </v-col>
  </v-row>

  <!-- Empty State (no results yet) -->
  <v-row v-else-if="!loading">
    <v-col cols="12">
      <v-card class="text-center py-12">
        <v-card-text>
          <v-icon size="80" color="grey-lighten-2">mdi-chart-box-outline</v-icon>
          <div class="text-h6 text-medium-emphasis mt-4 mb-2">
            No Analysis Results Yet
          </div>
          <div class="text-caption text-medium-emphasis">
            Configure the parameters above and click "Run Analysis" to start
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DUTModel, DUTSite, DUTStation, TopProduct, TopProductsRequest } from '@/core/types'
import { useDUTStore } from '../stores'

defineEmits<(e: 'export') => void>()

// Stores
// Store
const dutStore = useDUTStore()

// State
const selection = ref({
  siteId: null as number | null,
  modelId: null as number | null,
  stationId: null as number | null,
})

const dateRange = ref({
  startDate: '',
  endDate: '',
})

const criteriaConfig = ref({
  criteriaScore: 80,
  limit: 100,
  criteriaFile: null as File | null,
})

const selectedSite = ref<DUTSite | null>(null)
const selectedModel = ref<DUTModel | null>(null)
const selectedStation = ref<DUTStation | null>(null)

const topProducts = ref<TopProduct[]>([])
const resultsMetadata = ref({
  site_name: '',
  model_name: '',
  station_name: '',
  criteria_score: '',
  total_count: 0,
  processing_time: 0,
})

const loading = ref(false)
const attemptedAnalysis = ref(false)
const dateValid = ref(false)
const criteriaValid = ref(false)

// Computed
const hasResults = computed(() => topProducts.value.length > 0)

const canAnalyze = computed(() => {
  return (
    selection.value.siteId !== null &&
    selection.value.modelId !== null &&
    selection.value.stationId !== null &&
    dateValid.value &&
    criteriaValid.value
  )
})

// Methods
function handleSelectionChange(data: {
  site: DUTSite | null
  model: DUTModel | null
  station: DUTStation | null
}) {
  selectedSite.value = data.site
  selectedModel.value = data.model
  selectedStation.value = data.station
}

function handleDateChange(data: { valid: boolean }) {
  dateValid.value = data.valid
}

function handleCriteriaChange(data: { valid: boolean }) {
  criteriaValid.value = data.valid
}

async function handleAnalyze() {
  attemptedAnalysis.value = true

  if (!canAnalyze.value) {
    return
  }

  loading.value = true

  try {
    const formData = new FormData()

    // Add required parameters
    formData.append('site_id', String(selection.value.siteId))
    formData.append('model_id', String(selection.value.modelId))
    formData.append('station_id', String(selection.value.stationId))
    formData.append('start_time', dateRange.value.startDate)
    formData.append('end_time', dateRange.value.endDate)
    formData.append('criteria_score', String(criteriaConfig.value.criteriaScore))
    formData.append('limit', String(criteriaConfig.value.limit))

    // Add optional criteria file
    if (criteriaConfig.value.criteriaFile) {
      formData.append('criteria_file', criteriaConfig.value.criteriaFile)
    }

    const startTime = performance.now()

    // Call API (this should be moved to the API service)
    const response = await dutStore.fetchTopProducts(
      String(selection.value.stationId),
      formData as unknown as TopProductsRequest,
    )

    const endTime = performance.now()

    // Update results
    topProducts.value = response.requested_data || []
    resultsMetadata.value = {
      site_name: response.site_name || '',
      model_name: response.model_name || '',
      station_name: response.station_name || '',
      criteria_score: response.criteria_score || '',
      total_count: topProducts.value.length,
      processing_time: (endTime - startTime) / 1000,
    }
  } catch (err: unknown) {
    console.error('Analysis failed:', err)
    // Error handling should be done in parent component
  } finally {
    loading.value = false
  }
}

function handleReset() {
  selection.value = {
    siteId: null,
    modelId: null,
    stationId: null,
  }
  dateRange.value = {
    startDate: '',
    endDate: '',
  }
  criteriaConfig.value = {
    criteriaScore: 80,
    limit: 100,
    criteriaFile: null,
  }
  topProducts.value = []
  resultsMetadata.value = {
    site_name: '',
    model_name: '',
    station_name: '',
    criteria_score: '',
    total_count: 0,
    processing_time: 0,
  }
  attemptedAnalysis.value = false
}
</script>
