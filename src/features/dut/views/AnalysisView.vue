<template>
  <DefaultLayout>
    <div class="analysis-view-shell">
      <header class="analysis-view-header">
        <div class="analysis-view-header__copy">
          <div class="analysis-view-header__icon">
            <Icon icon="mdi:chart-line-variant" />
          </div>
          <div>
            <p class="analysis-view-header__eyebrow">DUT Workspace</p>
            <h1>Multi-DUT Analysis</h1>
            <p>
              Start the multi-device workflow with a hierarchical score request panel, then review
              per-DUT station summaries before the deeper comparison surfaces land.
            </p>
          </div>
        </div>
        <div v-if="hasResults" class="analysis-view-header__actions">
          <button type="button" class="analysis-view-button analysis-view-button--ghost" :disabled="loading" @click="showExportDialog = true">
            <Icon icon="mdi:download" />
            <span>Export Results</span>
          </button>
        </div>
      </header>

      <AppPanel eyebrow="Filter Parameters" title="Hierarchical Analysis Scope"
        description="Seed the first real multi-DUT workflow with DUT identifiers, optional station scoping, and lightweight include or exclude filters."
        tone="cool">
        <form class="analysis-view-form" @submit.prevent="handleAnalyze">
          <div class="analysis-view-grid analysis-view-grid--two">
            <label class="analysis-view-field">
              <span>DUT ISNs</span>
              <div class="analysis-view-token-entry">
                <input v-model="pendingDutInput" type="text" autocomplete="off"
                  placeholder="Type DUT ISNs, then press Enter or comma" @keydown="handleTokenKeydown($event, 'dut')"
                  @blur="commitPendingTokens('dut')">
                <button type="button" @click="commitPendingTokens('dut')">Add</button>
              </div>
              <small>Paste or type one or more DUT ISNs. Delimiters: Enter, comma, spaces, or new lines.</small>
              <div class="analysis-view-token-list">
                <button v-for="dutIsn in selectedDutIsns" :key="dutIsn" type="button" class="analysis-view-token"
                  @click="removeToken('dut', dutIsn)">
                  <span>{{ dutIsn }}</span>
                  <Icon icon="mdi:close" />
                </button>
              </div>
            </label>

            <label class="analysis-view-field">
              <span>Station Filters</span>
              <div class="analysis-view-token-entry">
                <input v-model="pendingStationInput" type="text" autocomplete="off"
                  placeholder="Optional stations to include" @keydown="handleTokenKeydown($event, 'station')"
                  @blur="commitPendingTokens('station')">
                <button type="button" @click="commitPendingTokens('station')">Add</button>
              </div>
              <small>Leave blank to let the API analyze all available stations for each DUT.</small>
              <div class="analysis-view-token-list">
                <button v-for="station in selectedStations" :key="station" type="button"
                  class="analysis-view-token analysis-view-token--cool" @click="removeToken('station', station)">
                  <span>{{ station }}</span>
                  <Icon icon="mdi:close" />
                </button>
              </div>
            </label>
          </div>

          <div class="analysis-view-grid analysis-view-grid--two">
            <label class="analysis-view-field">
              <span>Site Identifier</span>
              <input v-model="siteIdentifier" type="text" autocomplete="off" placeholder="Optional site filter">
            </label>

            <label class="analysis-view-field">
              <span>Model Identifier</span>
              <input v-model="modelIdentifier" type="text" autocomplete="off" placeholder="Optional model filter">
            </label>
          </div>

          <div class="analysis-view-grid analysis-view-grid--two">
            <label class="analysis-view-field">
              <span>Include Test Item Filters</span>
              <textarea v-model="includeFiltersInput" rows="4"
                placeholder="One include filter per line or comma-separated" />
            </label>

            <label class="analysis-view-field">
              <span>Exclude Test Item Filters</span>
              <textarea v-model="excludeFiltersInput" rows="4"
                placeholder="One exclude filter per line or comma-separated" />
            </label>
          </div>

          <div class="analysis-view-inline-summary">
            <span>{{ selectedDutIsns.length }} DUT{{ selectedDutIsns.length === 1 ? '' : 's' }}</span>
            <span>{{ selectedStations.length }} station filter{{ selectedStations.length === 1 ? '' : 's' }}</span>
            <span>{{ includeFilters.length }} include pattern{{ includeFilters.length === 1 ? '' : 's' }}</span>
            <span>{{ excludeFilters.length }} exclude pattern{{ excludeFilters.length === 1 ? '' : 's' }}</span>
          </div>

          <div class="analysis-view-action-row">
            <button type="submit" class="analysis-view-button analysis-view-button--primary"
              :disabled="!canAnalyze || loading">
              <Icon :icon="loading ? 'mdi:loading' : 'mdi:chart-box-outline'"
                :class="{ 'analysis-view-spin': loading }" />
              <span>{{ loading ? 'Analyzing...' : 'Analyze Hierarchical Scores' }}</span>
            </button>
            <button type="button" class="analysis-view-button analysis-view-button--ghost" :disabled="loading"
              @click="handleReset">
              <Icon icon="mdi:refresh" />
              <span>Reset</span>
            </button>
          </div>
        </form>
      </AppPanel>

      <div v-if="errorMessage" class="analysis-view-notice analysis-view-notice--error">
        <div>
          <strong>Hierarchical analysis failed</strong>
          <p>{{ errorMessage }}</p>
        </div>
        <button type="button" @click="clearError">Dismiss</button>
      </div>

      <section v-if="loading" class="analysis-view-loading-panel">
        <div class="analysis-view-loading-panel__spinner" />
        <strong>Running hierarchical analysis...</strong>
        <p>Fetching grouped station scores for the selected DUTs and optional filters.</p>
      </section>

      <section v-else-if="hasResults" class="analysis-view-results">
        <div class="analysis-view-stat-grid">
          <article class="analysis-view-stat-card">
            <span>Successful DUTs</span>
            <strong>{{ successfulDutCount }}</strong>
          </article>
          <article class="analysis-view-stat-card analysis-view-stat-card--cool">
            <span>Failed DUTs</span>
            <strong>{{ failedDutCount }}</strong>
          </article>
          <article class="analysis-view-stat-card analysis-view-stat-card--warm">
            <span>Stations Returned</span>
            <strong>{{ totalStationCount }}</strong>
          </article>
          <article class="analysis-view-stat-card analysis-view-stat-card--success">
            <span>Average Score</span>
            <strong>{{ averageScore }}</strong>
          </article>
        </div>

        <div v-if="failedDutCount > 0" class="analysis-view-notice analysis-view-notice--warning">
          <div>
            <strong>Some DUTs failed analysis</strong>
            <p>{{ failedDutSummary }}</p>
          </div>
        </div>

        <AppTabs v-model="activeResultTab" :items="resultTabItems" scrollable>
          <template v-for="result in results" :key="result.dut_isn" #[`panel-${result.dut_isn}`]>
            <section class="analysis-view-result-pane">
              <AppPanel eyebrow="DUT Result" :title="`DUT ${result.dut_isn}`"
                :description="`Site ${result.site_name || 'N/A'} · Model ${result.model_name || 'N/A'} · ${result.test_result.length} station result${result.test_result.length === 1 ? '' : 's'}`">
                <div class="analysis-view-result-meta">
                  <span class="analysis-view-pill analysis-view-pill--neutral">Criteria: {{ result.criteria_path ||
                    'Default' }}</span>
                  <span class="analysis-view-pill analysis-view-pill--cool">{{ result.test_result.length }}
                    stations</span>
                </div>

                <div v-if="result.test_result.length > 0" class="analysis-view-station-grid">
                  <button
                    v-for="station in result.test_result"
                    :key="`${result.dut_isn}-${station.station_name}`"
                    type="button"
                    class="analysis-view-station-card"
                    :class="{
                      'analysis-view-station-card--active': getSelectedStation(result.dut_isn)?.station_name === station.station_name,
                    }"
                    @click="setSelectedStation(result.dut_isn, station.station_name)"
                  >
                    <div class="analysis-view-station-card__header">
                      <div>
                        <h3>{{ station.station_name }}</h3>
                        <p>{{ station.device || 'Unknown device' }}</p>
                      </div>
                      <span class="analysis-view-pill" :class="scoreToneClass(station.overall_data_score)">
                        <Icon :icon="getScoreIcon(station.overall_data_score)" />
                        {{ formatScore(station.overall_data_score) }}
                      </span>
                    </div>

                    <dl class="analysis-view-station-card__metrics">
                      <div>
                        <dt>Pass</dt>
                        <dd>{{ station.pass_count }}</dd>
                      </div>
                      <div>
                        <dt>Fail</dt>
                        <dd>{{ station.fail_count }}</dd>
                      </div>
                      <div>
                        <dt>Tests</dt>
                        <dd>{{ station.test_count }}</dd>
                      </div>
                      <div>
                        <dt>Subgroups</dt>
                        <dd>{{ station.overall_group_scores ? Object.keys(station.overall_group_scores).length : 0 }}
                        </dd>
                      </div>
                    </dl>
                  </button>
                </div>

                <section v-if="getSelectedStation(result.dut_isn)" class="analysis-view-station-focus">
                  <div class="analysis-view-station-focus__header">
                    <div>
                      <p class="analysis-view-station-focus__eyebrow">Per-Station Drilldown</p>
                      <h3>{{ getSelectedStation(result.dut_isn)?.station_name }}</h3>
                      <p>
                        Compare subgroup and hierarchical scoring for the selected station without leaving the multi-DUT route.
                      </p>
                    </div>
                    <div class="analysis-view-station-focus__summary">
                      <span class="analysis-view-pill analysis-view-pill--cool">
                        <Icon icon="mdi:chip" />
                        {{ getSelectedStation(result.dut_isn)?.device || 'Unknown device' }}
                      </span>
                      <span class="analysis-view-pill" :class="scoreToneClass(getSelectedStation(result.dut_isn)?.overall_data_score)">
                        <Icon :icon="getScoreIcon(getSelectedStation(result.dut_isn)?.overall_data_score)" />
                        {{ formatScore(getSelectedStation(result.dut_isn)?.overall_data_score) }}
                      </span>
                    </div>
                  </div>

                  <div v-if="getSelectedStation(result.dut_isn)?.overall_group_scores" class="analysis-view-station-focus__panel">
                    <SubgroupComparisonChart
                      :overall-group-scores="getSelectedStation(result.dut_isn)?.overall_group_scores || null"
                      :title="`Overall Subgroup Scores - ${getSelectedStation(result.dut_isn)?.station_name}`"
                    />
                  </div>

                  <div v-if="getSelectedStation(result.dut_isn)?.group_scores" class="analysis-view-station-focus__panel">
                    <HierarchicalScoreTree
                        :group-scores="getSelectedStation(result.dut_isn)!.group_scores"
                      :overall-group-scores="getSelectedStation(result.dut_isn)?.overall_group_scores || null"
                    />
                  </div>
                </section>

                <div v-else class="analysis-view-empty-state analysis-view-empty-state--compact">
                  <Icon icon="mdi:information-outline" />
                  <strong>No station data returned</strong>
                  <p>This DUT completed the request but no station summaries were available.</p>
                </div>
              </AppPanel>
            </section>
          </template>
        </AppTabs>
      </section>

      <section v-else class="analysis-view-empty-state">
        <Icon icon="mdi:chart-line-stacked" />
        <strong>No analysis results yet</strong>
        <p>Seed the workflow with one or more DUT ISNs, then run hierarchical analysis to populate the first result
          surface.
        </p>
      </section>

      <AppDialog
        v-model="showExportDialog"
        title="Export Hierarchical Results"
        description="Choose whether to export the full hierarchical payload or a flattened score comparison file."
        width="min(92vw, 34rem)"
      >
        <div class="analysis-view-export-options">
          <button
            type="button"
            class="analysis-view-export-option"
            :class="{ 'analysis-view-export-option--active': exportFormat === 'json' }"
            @click="exportFormat = 'json'"
          >
            <strong>JSON</strong>
            <span>Full hierarchical structure, filters, and failed DUT entries.</span>
          </button>
          <button
            type="button"
            class="analysis-view-export-option"
            :class="{ 'analysis-view-export-option--active': exportFormat === 'csv' }"
            @click="exportFormat = 'csv'"
          >
            <strong>CSV</strong>
            <span>Flattened group, subgroup, antenna, and category scores for spreadsheet comparison.</span>
          </button>
        </div>

        <template #footer>
          <div class="analysis-view-dialog-actions">
            <button type="button" class="analysis-view-button analysis-view-button--ghost" @click="showExportDialog = false">
              Cancel
            </button>
            <button type="button" class="analysis-view-button analysis-view-button--primary" @click="performExport">
              <Icon icon="mdi:download" />
              <span>Export {{ exportFormat.toUpperCase() }}</span>
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
import { useAuthStore } from '@/features/auth/stores/auth.store'
import type { GroupScores, HierarchicalDUTResult, HierarchicalRequest, HierarchicalStationResult } from '@/core/types/dut.types'
import AppDialog from '@/shared/ui/dialog/AppDialog.vue'
import AppPanel from '@/shared/ui/panel/AppPanel.vue'
import AppTabs from '@/shared/ui/tabs/AppTabs.vue'
import HierarchicalScoreTree from '../components/HierarchicalScoreTree.vue'
import SubgroupComparisonChart from '../components/SubgroupComparisonChart.vue'
import { useHierarchicalStore } from '../stores'

type TokenField = 'dut' | 'station'

const authStore = useAuthStore()
const hierarchicalStore = useHierarchicalStore()

const pendingDutInput = ref('')
const pendingStationInput = ref('')
const selectedDutIsns = ref<string[]>([])
const selectedStations = ref<string[]>([])
const siteIdentifier = ref('')
const modelIdentifier = ref('')
const includeFiltersInput = ref('')
const excludeFiltersInput = ref('')
const activeResultTab = ref('')
const selectedStationByDut = ref<Record<string, string>>({})
const showExportDialog = ref(false)
const exportFormat = ref<'json' | 'csv'>('json')

const hasDUTAccess = computed(() => authStore.hasDUTAccess)
const loading = computed(() => hierarchicalStore.loading)
const errorMessage = computed(() => hierarchicalStore.error)
const results = computed(() => hierarchicalStore.results)
const errors = computed(() => hierarchicalStore.errors)
const hasResults = computed(() => results.value.length > 0)

const includeFilters = computed(() => parseDelimitedTokens(includeFiltersInput.value))
const excludeFilters = computed(() => parseDelimitedTokens(excludeFiltersInput.value))

const canAnalyze = computed(() => hasDUTAccess.value && selectedDutIsns.value.length > 0)

const successfulDutCount = computed(() => results.value.length)
const failedDutCount = computed(() => errors.value.length)
const totalStationCount = computed(() => {
  return results.value.reduce((count, result) => count + result.test_result.length, 0)
})
const averageScore = computed(() => {
  const stationScores = results.value.flatMap((result) =>
    result.test_result.map((station) => station.overall_data_score).filter((score) => Number.isFinite(score)),
  )

  if (stationScores.length === 0) {
    return 'N/A'
  }

  const total = stationScores.reduce((sum, score) => sum + score, 0)
  return (total / stationScores.length).toFixed(2)
})

const failedDutSummary = computed(() => {
  if (errors.value.length === 0) {
    return ''
  }

  return errors.value.map((entry) => `${entry.dut_isn}: ${entry.detail}`).join(' | ')
})

const resultTabItems = computed(() => {
  return results.value.map((result) => ({
    value: result.dut_isn,
    label: result.dut_isn,
    icon: 'mdi:chip',
  }))
})

watch(results, (nextResults) => {
  if (nextResults.length === 0) {
    activeResultTab.value = ''
    selectedStationByDut.value = {}
    return
  }

  if (!nextResults.some((result) => result.dut_isn === activeResultTab.value)) {
    activeResultTab.value = nextResults[0]?.dut_isn || ''
  }

  const nextSelectedStations: Record<string, string> = {}
  for (const result of nextResults) {
    const currentStation = selectedStationByDut.value[result.dut_isn]
      const hasCurrentStation = result.test_result.some((station) => station.station_name === currentStation)
    nextSelectedStations[result.dut_isn] = hasCurrentStation
        ? currentStation || result.test_result[0]?.station_name || ''
      : result.test_result[0]?.station_name || ''
  }

  selectedStationByDut.value = nextSelectedStations
})

function parseDelimitedTokens(input: string) {
  return input
    .split(/[\n,]+/)
    .flatMap((chunk) => chunk.split(/\s+/))
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function uniqueTokens(values: string[]) {
  return [...new Set(values)]
}

function commitPendingTokens(field: TokenField) {
  const source = field === 'dut' ? pendingDutInput : pendingStationInput
  const nextTokens = parseDelimitedTokens(source.value)

  if (nextTokens.length === 0) {
    source.value = ''
    return
  }

  if (field === 'dut') {
    selectedDutIsns.value = uniqueTokens([...selectedDutIsns.value, ...nextTokens])
  } else {
    selectedStations.value = uniqueTokens([...selectedStations.value, ...nextTokens])
  }

  source.value = ''
}

function handleTokenKeydown(event: KeyboardEvent, field: TokenField) {
  if (!['Enter', ',', 'Tab'].includes(event.key)) {
    return
  }

  event.preventDefault()
  commitPendingTokens(field)
}

function removeToken(field: TokenField, value: string) {
  if (field === 'dut') {
    selectedDutIsns.value = selectedDutIsns.value.filter((entry) => entry !== value)
    return
  }

  selectedStations.value = selectedStations.value.filter((entry) => entry !== value)
}

async function handleAnalyze() {
  commitPendingTokens('dut')
  commitPendingTokens('station')

  if (!canAnalyze.value) {
    return
  }

  const request: HierarchicalRequest = {
    dut_isns: [...selectedDutIsns.value],
  }

  if (selectedStations.value.length > 0) {
    request.stations = [...selectedStations.value]
  }
  if (siteIdentifier.value.trim()) {
    request.site_identifier = siteIdentifier.value.trim()
  }
  if (modelIdentifier.value.trim()) {
    request.model_identifier = modelIdentifier.value.trim()
  }
  if (includeFilters.value.length > 0) {
    request.test_item_filters = [...includeFilters.value]
  }
  if (excludeFilters.value.length > 0) {
    request.exclude_test_item_filters = [...excludeFilters.value]
  }

  await hierarchicalStore.fetchHierarchicalAnalysis(request)
}

function clearError() {
  hierarchicalStore.error = null
}

function setSelectedStation(dutIsn: string, stationName: string) {
  selectedStationByDut.value = {
    ...selectedStationByDut.value,
    [dutIsn]: stationName,
  }
}

function getSelectedStation(dutIsn: string): HierarchicalStationResult | undefined {
  const result = results.value.find((entry) => entry.dut_isn === dutIsn)
  if (!result) {
    return undefined
  }

  const selectedStationName = selectedStationByDut.value[dutIsn]
  return result.test_result.find((station) => station.station_name === selectedStationName) || result.test_result[0]
}

function handleReset() {
  pendingDutInput.value = ''
  pendingStationInput.value = ''
  selectedDutIsns.value = []
  selectedStations.value = []
  siteIdentifier.value = ''
  modelIdentifier.value = ''
  includeFiltersInput.value = ''
  excludeFiltersInput.value = ''
  activeResultTab.value = ''
  hierarchicalStore.clearData()
}

function performExport() {
  if (!hasResults.value) {
    return
  }

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
    filters: {
      dut_isns: [...selectedDutIsns.value],
      stations: [...selectedStations.value],
      site_identifier: siteIdentifier.value.trim(),
      model_identifier: modelIdentifier.value.trim(),
      include_filters: [...includeFilters.value],
      exclude_filters: [...excludeFilters.value],
    },
    results: results.value,
    errors: errors.value,
  }

  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    `hierarchical_analysis_${Date.now()}.json`,
  )
}

function exportCSV() {
  const rows: string[] = []
  rows.push('DUT_ISN,Station,Group,Subgroup,Antenna,Category,Bayesian_Score,Average_Score')

  results.value.forEach((result: HierarchicalDUTResult) => {
    result.test_result.forEach((station: HierarchicalStationResult) => {
      if (!station.group_scores) {
        return
      }

      const groupData = station.group_scores as GroupScores
      Object.entries(groupData).forEach(([groupKey, subgroupData]) => {
        if (typeof subgroupData !== 'object' || !subgroupData) {
          return
        }

        Object.entries(subgroupData).forEach(([subgroupKey, antennaData]) => {
          if (subgroupKey === 'final_group_score' || subgroupKey === 'group_avg_score') {
            return
          }
          if (typeof antennaData !== 'object' || !antennaData) {
            return
          }

          Object.entries(antennaData).forEach(([antennaKey, categoryData]) => {
            if (antennaKey.endsWith('_group_score') || antennaKey.endsWith('_avg_score')) {
              return
            }
            if (typeof categoryData !== 'object' || !categoryData) {
              return
            }

            Object.entries(categoryData).forEach(([categoryKey, scoreData]) => {
              if (
                categoryKey.endsWith('_score') ||
                categoryKey.endsWith('_group_score') ||
                categoryKey.endsWith('_avg_score')
              ) {
                return
              }

              let bayesScore = ''
              let avgScore = ''

              if (typeof scoreData === 'number') {
                bayesScore = scoreData.toString()
              } else if (typeof scoreData === 'object' && scoreData) {
                const typedScoreData = scoreData as { category_bayes_score?: number; category_avg_score?: number }
                bayesScore = typedScoreData.category_bayes_score?.toString() || ''
                avgScore = typedScoreData.category_avg_score?.toString() || ''
              }

              if (bayesScore) {
                rows.push(
                  [
                    result.dut_isn,
                    station.station_name,
                    groupKey,
                    subgroupKey,
                    antennaKey,
                    categoryKey,
                    bayesScore,
                    avgScore,
                  ]
                    .map(escapeCsvValue)
                    .join(','),
                )
              }
            })
          })
        })
      })
    })
  })

  downloadBlob(new Blob([rows.join('\n')], { type: 'text/csv' }), `hierarchical_analysis_${Date.now()}.csv`)
}

function escapeCsvValue(value: string) {
  const normalizedValue = value ?? ''
  if (/[",\n]/.test(normalizedValue)) {
    return `"${normalizedValue.replace(/"/g, '""')}"`
  }
  return normalizedValue
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function getScoreIcon(score: number | null | undefined) {
  if (!score) return 'mdi:alert-circle'
  if (score >= 8) return 'mdi:check-circle'
  if (score >= 6) return 'mdi:alert'
  return 'mdi:close-circle'
}

function scoreToneClass(score: number | null | undefined) {
  if (!score) return 'analysis-view-pill--danger'
  if (score >= 8) return 'analysis-view-pill--success'
  if (score >= 6) return 'analysis-view-pill--warning'
  return 'analysis-view-pill--danger'
}

function formatScore(score: number | null | undefined) {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return 'N/A'
  }

  return score.toFixed(2)
}
</script>

<style scoped>
.analysis-view-shell {
  display: grid;
  gap: 1.5rem;
}

.analysis-view-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.analysis-view-header__copy {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.analysis-view-header__actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.analysis-view-header__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, rgba(20, 88, 71, 0.16), rgba(36, 116, 184, 0.16));
  color: #145847;
  font-size: 1.5rem;
}

.analysis-view-header__eyebrow {
  margin: 0 0 0.35rem;
  color: var(--app-accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.analysis-view-header h1 {
  margin: 0;
  color: var(--app-ink);
}

.analysis-view-header p,
.analysis-view-notice p,
.analysis-view-empty-state p,
.analysis-view-loading-panel p,
.analysis-view-station-card p {
  margin: 0.35rem 0 0;
  color: var(--app-muted);
  line-height: 1.6;
}

.analysis-view-form,
.analysis-view-results {
  display: grid;
  gap: 1rem;
}

.analysis-view-grid {
  display: grid;
  gap: 1rem;
}

.analysis-view-grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.analysis-view-field {
  display: grid;
  gap: 0.45rem;
}

.analysis-view-field span {
  color: var(--app-ink);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.analysis-view-field input,
.analysis-view-field textarea {
  width: 100%;
  border: 1px solid rgba(20, 88, 71, 0.18);
  border-radius: 1rem;
  padding: 0.82rem 0.95rem;
  background: rgba(255, 255, 255, 0.92);
  color: var(--app-ink);
}

.analysis-view-field textarea {
  resize: vertical;
  min-height: 7rem;
}

.analysis-view-field input:focus,
.analysis-view-field textarea:focus {
  outline: none;
  border-color: rgba(20, 88, 71, 0.4);
  box-shadow: 0 0 0 3px rgba(20, 88, 71, 0.12);
}

.analysis-view-field small {
  color: var(--app-muted);
}

.analysis-view-token-entry {
  display: flex;
  gap: 0.65rem;
  align-items: center;
}

.analysis-view-token-entry button,
.analysis-view-button,
.analysis-view-notice button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0.8rem 1.05rem;
  font-weight: 700;
  cursor: pointer;
}

.analysis-view-token-entry button {
  background: rgba(20, 88, 71, 0.12);
  color: #145847;
  white-space: nowrap;
}

.analysis-view-token-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.analysis-view-token {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid rgba(20, 88, 71, 0.12);
  border-radius: 999px;
  padding: 0.4rem 0.7rem;
  background: rgba(20, 88, 71, 0.12);
  color: #145847;
  cursor: pointer;
}

.analysis-view-token--cool {
  background: rgba(36, 116, 184, 0.12);
  color: #1d4f91;
}

.analysis-view-inline-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  color: var(--app-muted);
}

.analysis-view-inline-summary span,
.analysis-view-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  font-size: 0.82rem;
  font-weight: 700;
}

.analysis-view-inline-summary span,
.analysis-view-pill--neutral {
  border: 1px solid rgba(20, 88, 71, 0.14);
  background: rgba(255, 248, 240, 0.8);
  color: var(--app-ink);
}

.analysis-view-pill--cool {
  background: rgba(36, 116, 184, 0.12);
  color: #1d4f91;
}

.analysis-view-pill--success {
  background: rgba(20, 88, 71, 0.12);
  color: #145847;
}

.analysis-view-pill--warning {
  background: rgba(184, 122, 40, 0.14);
  color: #9a5a12;
}

.analysis-view-pill--danger {
  background: rgba(180, 54, 45, 0.14);
  color: #a61b1b;
}

.analysis-view-action-row,
.analysis-view-result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
}

.analysis-view-button:disabled,
.analysis-view-notice button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.analysis-view-button--primary {
  background: linear-gradient(135deg, #145847, #1c7c62);
  color: #fff;
}

.analysis-view-button--ghost,
.analysis-view-notice button {
  background: rgba(255, 248, 240, 0.84);
  border-color: rgba(20, 88, 71, 0.16);
  color: var(--app-ink);
}

.analysis-view-spin {
  animation: analysis-view-spin 1s linear infinite;
}

.analysis-view-notice,
.analysis-view-loading-panel,
.analysis-view-empty-state {
  display: flex;
  gap: 1rem;
  border-radius: 1.2rem;
  padding: 1rem 1.1rem;
}

.analysis-view-notice--warning {
  border: 1px solid rgba(184, 122, 40, 0.18);
  background: rgba(255, 247, 237, 0.92);
}

.analysis-view-notice--warning strong {
  color: #9a5a12;
}

.analysis-view-notice--error {
  justify-content: space-between;
  border: 1px solid rgba(180, 54, 45, 0.18);
  background: rgba(254, 242, 242, 0.92);
}

.analysis-view-notice--error strong {
  color: #a61b1b;
}

.analysis-view-loading-panel,
.analysis-view-empty-state {
  flex-direction: column;
  align-items: center;
  text-align: center;
  border: 1px solid var(--app-border);
  background: rgba(255, 251, 247, 0.94);
}

.analysis-view-empty-state--compact {
  min-height: auto;
}

.analysis-view-loading-panel__spinner {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 3px solid rgba(20, 88, 71, 0.14);
  border-top-color: #145847;
  animation: analysis-view-spin 0.9s linear infinite;
}

.analysis-view-empty-state svg {
  font-size: 2.6rem;
  color: rgba(20, 88, 71, 0.45);
}

.analysis-view-stat-grid,
.analysis-view-station-grid {
  display: grid;
  gap: 1rem;
}

.analysis-view-stat-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.analysis-view-stat-card,
.analysis-view-station-card {
  border: 1px solid var(--app-border);
  border-radius: 1.25rem;
  padding: 1rem 1.1rem;
  background: rgba(255, 251, 247, 0.94);
  box-shadow: var(--app-shadow-soft);
}

.analysis-view-stat-card--cool {
  background: linear-gradient(180deg, rgba(36, 116, 184, 0.12), rgba(255, 251, 247, 0.96));
}

.analysis-view-stat-card--warm {
  background: linear-gradient(180deg, rgba(184, 122, 40, 0.12), rgba(255, 251, 247, 0.96));
}

.analysis-view-stat-card--success {
  background: linear-gradient(180deg, rgba(20, 88, 71, 0.12), rgba(249, 255, 251, 0.97));
}

.analysis-view-stat-card span {
  display: block;
  color: var(--app-muted);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.analysis-view-stat-card strong {
  display: block;
  margin-top: 0.2rem;
  color: var(--app-ink);
  font-size: 1.6rem;
}

.analysis-view-station-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.analysis-view-station-card {
  display: grid;
  gap: 0.85rem;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.analysis-view-station-card:hover {
  transform: translateY(-2px);
  border-color: rgba(20, 88, 71, 0.28);
}

.analysis-view-station-card--active {
  border-color: rgba(20, 88, 71, 0.42);
  box-shadow: 0 18px 40px rgba(20, 88, 71, 0.12);
  background: linear-gradient(180deg, rgba(20, 88, 71, 0.09), rgba(255, 251, 247, 0.98));
}

.analysis-view-station-card__header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
}

.analysis-view-station-card h3 {
  margin: 0;
  color: var(--app-ink);
}

.analysis-view-station-card__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
  margin: 0;
}

.analysis-view-station-card__metrics dt {
  color: var(--app-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.analysis-view-station-card__metrics dd {
  margin: 0.2rem 0 0;
  color: var(--app-ink);
  font-weight: 700;
}

.analysis-view-station-focus,
.analysis-view-station-focus__panel,
.analysis-view-export-options {
  display: grid;
  gap: 1rem;
}

.analysis-view-station-focus {
  margin-top: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 1.35rem;
  padding: 1rem 1.1rem;
  background: linear-gradient(180deg, rgba(255, 248, 240, 0.86), rgba(255, 255, 255, 0.96));
}

.analysis-view-station-focus__header,
.analysis-view-station-focus__summary,
.analysis-view-dialog-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
}

.analysis-view-station-focus__eyebrow {
  margin: 0 0 0.35rem;
  color: var(--app-accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.analysis-view-station-focus h3 {
  margin: 0;
  color: var(--app-ink);
}

.analysis-view-export-option {
  display: grid;
  gap: 0.35rem;
  border: 1px solid var(--app-border);
  border-radius: 1.15rem;
  padding: 1rem 1.05rem;
  background: rgba(255, 248, 240, 0.7);
  color: var(--app-ink);
  text-align: left;
  cursor: pointer;
}

.analysis-view-export-option strong {
  font-size: 1rem;
}

.analysis-view-export-option span {
  color: var(--app-muted);
  line-height: 1.55;
}

.analysis-view-export-option--active {
  border-color: rgba(20, 88, 71, 0.42);
  background: rgba(20, 88, 71, 0.08);
  box-shadow: 0 14px 28px rgba(20, 88, 71, 0.1);
}

@media (max-width: 960px) {

  .analysis-view-grid--two,
  .analysis-view-stat-grid,
  .analysis-view-station-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {

  .analysis-view-header,
  .analysis-view-header__copy {
    flex-direction: column;
  }

  .analysis-view-grid--two,
  .analysis-view-stat-grid,
  .analysis-view-station-grid,
  .analysis-view-station-card__metrics {
    grid-template-columns: 1fr;
  }

  .analysis-view-token-entry,
  .analysis-view-action-row,
  .analysis-view-result-meta,
  .analysis-view-header__actions,
  .analysis-view-station-card__header,
  .analysis-view-station-focus__header,
  .analysis-view-station-focus__summary,
  .analysis-view-dialog-actions,
  .analysis-view-notice--error {
    flex-direction: column;
    align-items: stretch;
  }
}

@keyframes analysis-view-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
