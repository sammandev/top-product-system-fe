<template>
  <DefaultLayout>
    <div class="deep-dive-view">
      <header class="deep-dive-view__header">
        <div class="deep-dive-view__header-copy">
          <span class="deep-dive-view__header-icon">
            <Icon icon="mdi:chart-tree" />
          </span>
          <div>
            <p class="deep-dive-view__eyebrow">Top Product Analysis</p>
            <h1>Hierarchical Score Deep Dive</h1>
            <p>
              Explore the scoring path from group to subgroup, antenna, and category for each DUT under analysis.
            </p>
          </div>
        </div>

        <button
          v-if="hasResults"
          type="button"
          class="deep-dive-view__button deep-dive-view__button--ghost"
          :disabled="loading"
          @click="showExportDialog = true"
        >
          <Icon icon="mdi:download" />
          <span>Export</span>
        </button>
      </header>

      <AppPanel
        eyebrow="Hierarchical Pipeline"
        title="1. DUT Selection & Filters"
        description="Load up to ten DUT ISNs, narrow the surface, and then run the hierarchical scoring analysis."
        tone="warm"
      >
        <DUTISNInput v-model="dutISNs" :max-i-s-ns="10" @change="onISNChange" />

        <div class="deep-dive-view__divider" />

        <AdvancedFiltersPanel v-model="filters" @apply="onFiltersApply" />

        <div class="deep-dive-view__divider" />

        <div class="deep-dive-view__actions">
          <button
            type="button"
            class="deep-dive-view__button deep-dive-view__button--ghost"
            :disabled="loading"
            @click="clearAll"
          >
            <Icon icon="mdi:close-circle-outline" />
            <span>Clear All</span>
          </button>
          <button
            type="button"
            class="deep-dive-view__button deep-dive-view__button--primary"
            :disabled="!canAnalyze"
            @click="performAnalysis"
          >
            <Icon :icon="loading ? 'mdi:loading' : 'mdi:chart-timeline-variant'" :class="{ 'deep-dive-view__spin': loading }" />
            <span>{{ loading ? 'Analyzing...' : 'Analyze Hierarchical Scores' }}</span>
          </button>
        </div>
      </AppPanel>

      <section v-if="error" class="deep-dive-view__notice deep-dive-view__notice--danger">
        <div>
          <strong>Analysis Error</strong>
          <p>{{ error }}</p>
        </div>
        <button
          type="button"
          class="deep-dive-view__button deep-dive-view__button--ghost"
          @click="clearError"
        >
          <Icon icon="mdi:close" />
          <span>Dismiss</span>
        </button>
      </section>

      <AppPanel
        v-if="hasResults"
        eyebrow="Hierarchical Results"
        title="2. Analysis Results"
        description="Review each DUT by station, then inspect overall subgroup scores, the hierarchical tree, and the category heatmap."
        tone="success"
      >
        <AppTabs v-model="selectedTab" :items="resultTabItems" scrollable>
          <template v-for="result in results" :key="result.dut_isn" #[`panel-${result.dut_isn}`]>
            <section v-if="getDUTError(result.dut_isn)" class="deep-dive-view__notice deep-dive-view__notice--danger">
              <div>
                <strong>DUT {{ result.dut_isn }} Error</strong>
                <p>{{ getDUTError(result.dut_isn)?.detail }}</p>
              </div>
            </section>

            <div
              v-else-if="result.test_result && result.test_result.length > 0"
              class="deep-dive-view__station-stack"
            >
              <article
                v-for="(station, idx) in result.test_result"
                :key="`${result.dut_isn}-${station.station_name}-${idx}`"
                class="deep-dive-view__station"
              >
                <button
                  type="button"
                  class="deep-dive-view__station-toggle"
                  @click="toggleStation(idx)"
                >
                  <div class="deep-dive-view__station-copy">
                    <span class="deep-dive-view__station-icon">
                      <Icon icon="mdi:factory" />
                    </span>
                    <div>
                      <p class="deep-dive-view__station-eyebrow">Station</p>
                      <strong>{{ station.station_name }}</strong>
                    </div>
                  </div>

                  <div class="deep-dive-view__station-meta">
                    <span v-if="station.overall_group_scores" class="deep-dive-view__pill deep-dive-view__pill--cool">
                      {{ Object.keys(station.overall_group_scores).length }} subgroup{{ Object.keys(station.overall_group_scores).length === 1 ? '' : 's' }}
                    </span>
                    <Icon
                      class="deep-dive-view__station-chevron"
                      :class="{ 'deep-dive-view__station-chevron--open': expandedStations.includes(idx) }"
                      icon="mdi:chevron-down"
                    />
                  </div>
                </button>

                <div v-if="expandedStations.includes(idx)" class="deep-dive-view__station-body">
                  <section v-if="station.overall_group_scores" class="deep-dive-view__result-block">
                    <header class="deep-dive-view__result-block-header">
                      <div>
                        <p class="deep-dive-view__station-eyebrow">Summary</p>
                        <h3>Overall Subgroup Scores</h3>
                      </div>
                    </header>
                    <SubgroupComparisonChart
                      :overall-group-scores="station.overall_group_scores"
                      :title="`Overall Subgroup Scores - ${station.station_name}`"
                    />
                  </section>

                  <section v-if="station.group_scores" class="deep-dive-view__result-block">
                    <header class="deep-dive-view__result-block-header">
                      <div>
                        <p class="deep-dive-view__station-eyebrow">Tree</p>
                        <h3>Hierarchical Score Tree</h3>
                      </div>
                      <span class="deep-dive-view__pill deep-dive-view__pill--neutral">
                        Group → Subgroup → Antenna → Category
                      </span>
                    </header>
                    <HierarchicalScoreTree
                      :group-scores="station.group_scores"
                      :overall-group-scores="station.overall_group_scores"
                    />
                  </section>

                  <section v-if="station.group_scores" class="deep-dive-view__result-block">
                    <header class="deep-dive-view__result-block-header">
                      <div>
                        <p class="deep-dive-view__station-eyebrow">Heatmap</p>
                        <h3>Category Performance Heatmap</h3>
                      </div>
                    </header>
                    <CategoryHeatmap :group-scores="station.group_scores" />
                  </section>
                </div>
              </article>
            </div>

            <section v-else class="deep-dive-view__notice deep-dive-view__notice--info">
              <div>
                <strong>No station data available</strong>
                <p>DUT {{ result.dut_isn }} returned no hierarchical station details.</p>
              </div>
            </section>
          </template>
        </AppTabs>
      </AppPanel>

      <AppPanel
        v-else-if="!loading"
        eyebrow="Ready To Analyze"
        title="No Analysis Results Yet"
        description="Enter DUT ISNs above and run the analysis to inspect the hierarchical score path across all four levels."
        tone="cool"
      >
        <div class="deep-dive-view__empty-state">
          <span class="deep-dive-view__empty-icon">
            <Icon icon="mdi:information-outline" />
          </span>
          <p>
            This view breaks performance down across <strong>Group → Subgroup → Antenna → Category</strong> once results are available.
          </p>
        </div>
      </AppPanel>

      <AppDialog
        v-model="showExportDialog"
        title="Export Hierarchical Results"
        description="Choose the format that best matches the downstream workflow."
        width="min(92vw, 32rem)"
      >
        <div class="deep-dive-view__export-options">
          <label class="deep-dive-view__export-option" :class="{ 'deep-dive-view__export-option--active': exportFormat === 'json' }">
            <input v-model="exportFormat" type="radio" value="json" />
            <div>
              <strong>JSON</strong>
              <p>Full hierarchical structure with filters, DUTs, station results, and errors.</p>
            </div>
          </label>

          <label class="deep-dive-view__export-option" :class="{ 'deep-dive-view__export-option--active': exportFormat === 'csv' }">
            <input v-model="exportFormat" type="radio" value="csv" />
            <div>
              <strong>CSV</strong>
              <p>Flattened scoring rows for spreadsheet review and downstream aggregation.</p>
            </div>
          </label>
        </div>

        <template #footer>
          <div class="deep-dive-view__dialog-footer">
            <button
              type="button"
              class="deep-dive-view__button deep-dive-view__button--ghost"
              @click="showExportDialog = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="deep-dive-view__button deep-dive-view__button--primary"
              @click="performExport"
            >
              <Icon icon="mdi:download" />
              <span>Export</span>
            </button>
          </div>
        </template>
      </AppDialog>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import type { GroupScores, HierarchicalError, HierarchicalRequest } from '@/core/types/dut.types'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { AppDialog, AppPanel, AppTabs } from '@/shared'
import { useHierarchicalStore } from '../stores'

// Store
const hierarchicalStore = useHierarchicalStore()

// State
const dutISNs = ref<string[]>([])
const filters = ref({
  stations: [] as string[],
  devices: [] as string[],
  site: '',
  model: '',
  include_patterns: [] as string[],
  exclude_patterns: [] as string[],
  criteria_file: null as File | null,
})
const selectedTab = ref('')
const expandedStations = ref<number[]>([])
const showExportDialog = ref(false)
const exportFormat = ref<'json' | 'csv'>('json')
const isValidISNInput = ref(true)

// Computed
const loading = computed(() => hierarchicalStore.loading)
const error = computed(() => hierarchicalStore.error)
const results = computed(() => hierarchicalStore.results)
const errors = computed(() => hierarchicalStore.errors)

const hasResults = computed(() => results.value.length > 0)

const resultTabItems = computed(() =>
  results.value.map((result) => ({
    value: result.dut_isn,
    label: getDUTError(result.dut_isn) ? `DUT ${result.dut_isn} • Error` : `DUT ${result.dut_isn}`,
    icon: 'mdi:chip',
  })),
)

const canAnalyze = computed(() => {
  return dutISNs.value.length > 0 && isValidISNInput.value && !loading.value
})

// Methods
function onISNChange(validation: { valid: boolean }) {
  isValidISNInput.value = validation.valid
}

function onFiltersApply() {
  // Optional: Auto-trigger analysis on filter apply
  // performAnalysis()
}

async function performAnalysis() {
  if (!canAnalyze.value) return

  // Build request
  const request: HierarchicalRequest = {
    dut_isns: dutISNs.value,
  }

  // Add optional filters
  if (filters.value.stations.length > 0) {
    request.stations = filters.value.stations
  }
  if (filters.value.devices.length > 0) {
    request.device_identifiers = filters.value.devices
  }
  if (filters.value.site) {
    request.site_identifier = filters.value.site
  }
  if (filters.value.model) {
    request.model_identifier = filters.value.model
  }
  if (filters.value.include_patterns.length > 0) {
    request.test_item_filters = filters.value.include_patterns
  }
  if (filters.value.exclude_patterns.length > 0) {
    request.exclude_test_item_filters = filters.value.exclude_patterns
  }
  if (filters.value.criteria_file) {
    request.criteria_file = filters.value.criteria_file
  }

  // Perform analysis
  await hierarchicalStore.fetchHierarchicalAnalysis(request)

  // Auto-select first tab if results available
  if (results.value.length > 0 && (!selectedTab.value || !results.value.some((result) => result.dut_isn === selectedTab.value)) && results.value[0]) {
    selectedTab.value = results.value[0].dut_isn
  }

  // Auto-expand first station
  if (expandedStations.value.length === 0) {
    expandedStations.value = [0]
  }
}

function clearAll() {
  dutISNs.value = []
  filters.value = {
    stations: [],
    devices: [],
    site: '',
    model: '',
    include_patterns: [],
    exclude_patterns: [],
    criteria_file: null,
  }
  hierarchicalStore.clearData()
  selectedTab.value = ''
  expandedStations.value = []
}

function clearError() {
  hierarchicalStore.error = null
}

function getDUTError(dutISN: string): HierarchicalError | undefined {
  return errors.value.find((e) => e.dut_isn === dutISN)
}

function toggleStation(index: number) {
  expandedStations.value = expandedStations.value.includes(index)
    ? expandedStations.value.filter((value) => value !== index)
    : [...expandedStations.value, index]
}

function performExport() {
  if (!hasResults.value) return

  if (exportFormat.value === 'json') {
    exportJSON()
  } else {
    exportCSV()
  }

  showExportDialog.value = false
}

function exportJSON() {
  const data = {
    timestamp: new Date().toISOString(),
    dut_isns: dutISNs.value,
    filters: filters.value,
    results: results.value,
    errors: errors.value,
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `hierarchical_analysis_${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function exportCSV() {
  const rows: string[] = []

  // Header with both Bayesian and Average scores
  rows.push('DUT_ISN,Station,Group,Subgroup,Antenna,Category,Bayesian_Score,Average_Score')

  // Data rows
  results.value.forEach((result) => {
    // biome-ignore lint/suspicious/noExplicitAny: station object has dynamic nested group_scores structure
    result.test_result?.forEach((station: any) => {
      if (!station.group_scores) return

      const groupData = station.group_scores as GroupScores
      Object.entries(groupData).forEach(([groupKey, subgroupsData]) => {
        if (typeof subgroupsData !== 'object' || !subgroupsData) return

        Object.entries(subgroupsData).forEach(([subgroupKey, antennasData]) => {
          // Skip score fields at subgroup level
          if (subgroupKey === 'final_group_score' || subgroupKey === 'group_avg_score') return
          if (typeof antennasData !== 'object' || !antennasData) return

          Object.entries(antennasData).forEach(([antennaKey, categoriesData]) => {
            // Skip score fields at antenna level
            if (antennaKey.endsWith('_group_score') || antennaKey.endsWith('_avg_score')) return
            if (typeof categoriesData !== 'object' || !categoriesData) return

            Object.entries(categoriesData).forEach(([categoryKey, scoreData]) => {
              // Skip score fields at category level
              if (
                categoryKey.endsWith('_score') ||
                categoryKey.endsWith('_group_score') ||
                categoryKey.endsWith('_avg_score')
              )
                return

              // Handle both old format (number) and new format (object)
              let bayesScore = ''
              let avgScore = ''

              if (typeof scoreData === 'number') {
                bayesScore = scoreData.toString()
              } else if (typeof scoreData === 'object') {
                bayesScore = scoreData.category_bayes_score?.toString() || ''
                avgScore = scoreData.category_avg_score?.toString() || ''
              }

              if (bayesScore) {
                rows.push(
                  `${result.dut_isn},${station.station_name},${groupKey},${subgroupKey},${antennaKey},${categoryKey},${bayesScore},${avgScore}`,
                )
              }
            })
          })
        })
      })
    })
  })

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `hierarchical_analysis_${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// Watch for tab changes to reset expanded stations
watch(selectedTab, () => {
  expandedStations.value = [0]
})

watch(results, (nextResults) => {
  if (nextResults.length === 0) {
    selectedTab.value = ''
    return
  }

  if (!nextResults.some((result) => result.dut_isn === selectedTab.value) && nextResults[0]) {
    selectedTab.value = nextResults[0].dut_isn
  }
})
</script>

<style scoped>
.deep-dive-view {
  display: grid;
  gap: 1.5rem;
  padding: 1.5rem;
}

.deep-dive-view__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.deep-dive-view__header-copy {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.deep-dive-view__header-icon,
.deep-dive-view__empty-icon,
.deep-dive-view__station-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 1rem;
}

.deep-dive-view__header-icon {
  width: 3.5rem;
  height: 3.5rem;
  background: linear-gradient(135deg, rgba(20, 88, 71, 0.14), rgba(161, 104, 57, 0.18));
  color: var(--app-accent);
  font-size: 1.55rem;
  box-shadow: var(--app-shadow-soft);
}

.deep-dive-view__eyebrow,
.deep-dive-view__station-eyebrow {
  margin: 0 0 0.35rem;
  color: var(--app-accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.deep-dive-view__header h1 {
  margin: 0;
  color: var(--app-ink);
  font-size: clamp(1.9rem, 3vw, 2.5rem);
}

.deep-dive-view__header p:last-child {
  max-width: 46rem;
  margin: 0.45rem 0 0;
  color: var(--app-muted);
  line-height: 1.6;
}

.deep-dive-view__divider {
  height: 1px;
  background: linear-gradient(90deg, rgba(20, 88, 71, 0.14), rgba(20, 88, 71, 0));
}

.deep-dive-view__actions,
.deep-dive-view__dialog-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
}

.deep-dive-view__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 2.9rem;
  padding: 0.75rem 1.1rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: rgba(255, 251, 247, 0.95);
  color: var(--app-ink);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.deep-dive-view__button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(20, 88, 71, 0.28);
  box-shadow: var(--app-shadow-soft);
}

.deep-dive-view__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.deep-dive-view__button--primary {
  border-color: rgba(20, 88, 71, 0.28);
  background: linear-gradient(135deg, rgba(20, 88, 71, 0.98), rgba(161, 104, 57, 0.92));
  color: #fff;
}

.deep-dive-view__button--ghost {
  background: rgba(255, 251, 247, 0.85);
}

.deep-dive-view__notice {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  border: 1px solid transparent;
  border-radius: 1.25rem;
  padding: 1rem 1.1rem;
}

.deep-dive-view__notice strong {
  display: block;
  margin-bottom: 0.2rem;
}

.deep-dive-view__notice p {
  margin: 0;
  line-height: 1.55;
}

.deep-dive-view__notice--danger {
  border-color: rgba(188, 55, 55, 0.24);
  background: rgba(255, 240, 240, 0.96);
  color: #7f1d1d;
}

.deep-dive-view__notice--info {
  border-color: rgba(40, 96, 163, 0.2);
  background: rgba(240, 247, 255, 0.96);
  color: #17406a;
}

.deep-dive-view__station-stack {
  display: grid;
  gap: 1rem;
}

.deep-dive-view__station {
  border: 1px solid var(--app-border);
  border-radius: 1.25rem;
  background: rgba(255, 252, 249, 0.96);
  overflow: hidden;
}

.deep-dive-view__station-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 1rem;
  padding: 1rem 1.1rem;
  border: 0;
  background: rgba(255, 248, 240, 0.92);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.deep-dive-view__station-copy,
.deep-dive-view__station-meta,
.deep-dive-view__result-block-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.deep-dive-view__station-icon,
.deep-dive-view__empty-icon {
  width: 2.4rem;
  height: 2.4rem;
  background: rgba(20, 88, 71, 0.12);
  color: var(--app-accent);
}

.deep-dive-view__station-copy strong,
.deep-dive-view__result-block-header h3 {
  margin: 0;
}

.deep-dive-view__station-body {
  display: grid;
  gap: 1rem;
  padding: 1rem 1.1rem 1.1rem;
  background: rgba(255, 255, 255, 0.7);
}

.deep-dive-view__result-block {
  display: grid;
  gap: 0.9rem;
  border: 1px solid rgba(20, 88, 71, 0.12);
  border-radius: 1rem;
  padding: 1rem;
  background: rgba(255, 251, 247, 0.92);
}

.deep-dive-view__result-block-header {
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
}

.deep-dive-view__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.38rem 0.7rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
}

.deep-dive-view__pill--cool {
  background: rgba(40, 96, 163, 0.14);
  color: #17406a;
}

.deep-dive-view__pill--neutral {
  background: rgba(93, 74, 53, 0.12);
  color: var(--app-ink);
}

.deep-dive-view__station-chevron {
  color: var(--app-muted);
  transition: transform 0.2s ease;
}

.deep-dive-view__station-chevron--open {
  transform: rotate(180deg);
}

.deep-dive-view__empty-state {
  display: grid;
  justify-items: center;
  gap: 0.8rem;
  padding: 1rem 0.25rem;
  text-align: center;
  color: var(--app-muted);
}

.deep-dive-view__empty-state p {
  margin: 0;
  max-width: 36rem;
  line-height: 1.6;
}

.deep-dive-view__export-options {
  display: grid;
  gap: 0.9rem;
}

.deep-dive-view__export-option {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.85rem;
  align-items: flex-start;
  padding: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: rgba(255, 252, 249, 0.92);
  cursor: pointer;
}

.deep-dive-view__export-option input {
  margin-top: 0.2rem;
}

.deep-dive-view__export-option strong,
.deep-dive-view__export-option p {
  margin: 0;
}

.deep-dive-view__export-option p {
  margin-top: 0.25rem;
  color: var(--app-muted);
  line-height: 1.55;
}

.deep-dive-view__export-option--active {
  border-color: rgba(20, 88, 71, 0.3);
  background: rgba(240, 250, 245, 0.95);
}

.deep-dive-view__spin {
  animation: deep-dive-view-spin 0.9s linear infinite;
}

@keyframes deep-dive-view-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .deep-dive-view {
    padding: 1rem;
  }

  .deep-dive-view__header,
  .deep-dive-view__notice,
  .deep-dive-view__station-toggle,
  .deep-dive-view__result-block-header {
    flex-direction: column;
    align-items: stretch;
  }

  .deep-dive-view__actions,
  .deep-dive-view__dialog-footer {
    justify-content: stretch;
  }

  .deep-dive-view__button {
    width: 100%;
  }

  .deep-dive-view__station-meta {
    justify-content: space-between;
  }
}
</style>
