<template>
  <section class="upload-log-shell">
    <AppPanel
      eyebrow="Upload Workspace"
      title="Upload And Configure"
      description="Stage raw DUT logs, apply optional JSON criteria, then run the existing upload-log analysis and ranking workflow."
      tone="cool"
    >
      <div class="upload-log-shell__grid">
        <AppPanel
          eyebrow="Input Logs"
          title="Upload Test Logs"
          description="Accepts .txt, .zip, .rar, and .7z files. Archive inputs continue through the existing compare pipeline."
        >
          <AppFilePicker
            v-model="logFiles"
            label="Test log files"
            accept=".txt,.zip,.rar,.7z"
            multiple
            :disabled="loading"
            helperText="Drop one or more test logs here, or browse from disk."
            placeholder="Drop test logs here or browse from disk."
          />

          <p v-if="logFiles && logFiles.length > 0" class="upload-log-shell__helper-text">
            {{ logFiles.length }} {{ logFiles.length === 1 ? 'file' : 'files' }} selected
          </p>
        </AppPanel>

        <AppPanel
          eyebrow="Optional Criteria"
          title="Custom Criteria"
          description="Upload a JSON criteria file, or generate one with the builder before analysis."
          tone="warm"
          splitHeader
        >
          <template #header-aside>
            <button type="button" class="upload-log-shell__link" @click="downloadCriteriaTemplate">
              Download template
            </button>
          </template>

          <AppFilePicker
            v-model="criteriaFile"
            label="Criteria file"
            accept=".json,application/json"
            :disabled="loading"
            helperText="Leave empty to use the default criteria rules."
            placeholder="Drop a criteria file here or browse from disk."
          />

          <label class="upload-log-shell__checkbox">
            <input v-model="showOnlyCriteria" type="checkbox" :disabled="!criteriaFile || loading">
            <span>Show only criteria items</span>
          </label>

          <button
            type="button"
            class="upload-log-shell__ghost-button"
            :disabled="loading"
            @click="openCriteriaBuilder"
          >
            Build Criteria
          </button>
        </AppPanel>
      </div>

      <div class="upload-log-shell__actions">
        <button
          type="button"
          class="upload-log-shell__ghost-button"
          :disabled="!hasFiles || loading"
          @click="handleConfigureScoring"
        >
          <span>{{ extractingItems ? 'Preparing...' : 'Configure Scoring' }}</span>
          <span v-if="appliedScoringConfigs.length > 0" class="upload-log-shell__pill">
            {{ appliedScoringConfigs.length }}
          </span>
        </button>

        <button
          type="button"
          class="upload-log-shell__primary-button"
          :disabled="!canAnalyze || loading"
          @click="handleAnalyze"
        >
          {{ loading ? 'Analyzing...' : 'Analyze Logs' }}
        </button>

        <button
          v-if="hasResults"
          type="button"
          class="upload-log-shell__ghost-button"
          :disabled="loading"
          @click="handleReset"
        >
          Reset
        </button>
      </div>

      <div v-if="appliedScoringConfigs.length > 0" class="upload-log-shell__notice upload-log-shell__notice--success">
        <div>
          <strong>Scoring configured</strong>
          <p>{{ appliedScoringConfigs.length }} item{{ appliedScoringConfigs.length === 1 ? '' : 's' }} currently use custom scoring rules.</p>
        </div>

        <button type="button" class="upload-log-shell__link" @click="clearScoringConfigs">
          Clear
        </button>
      </div>
    </AppPanel>

    <section v-if="hasResults" class="upload-log-shell__summary">
      <TopProductRankingUploadLog
        :parse-result="parsingResult"
        :compare-result="compareResult"
        :scoring-configs="appliedScoringConfigs"
      />
    </section>
  </section>

  <section v-if="hasResults && isMultipleFiles" class="upload-log-comparison-section">
    <AppPanel
      eyebrow="Cross-Log Comparison"
      title="Test Item Comparison"
      description="Compare uploaded values and rescored iPLAS values across the current log batch."
      splitHeader
      tone="cool"
    >
      <template #header-aside>
        <div class="upload-log-comparison__header-actions">
          <span class="upload-log-comparison__pill upload-log-comparison__pill--info">{{ totalFiles }} files</span>
          <span v-if="iplasDataByIsn.size > 0" class="upload-log-comparison__pill upload-log-comparison__pill--success">
            iPLAS: {{ iplasDataByIsn.size }} ISN(s)
          </span>
          <button
            type="button"
            class="upload-log-comparison__ghost-button"
            :disabled="exportingComparison"
            @click="exportComparisonToExcel"
          >
            {{ exportingComparison ? 'Exporting...' : 'Export' }}
          </button>
          <button type="button" class="upload-log-comparison__ghost-button" @click="comparisonFullscreen = true">
            Fullscreen
          </button>
        </div>
      </template>

      <div class="upload-log-comparison__filters">
        <label class="upload-log-comparison__field">
          <span>Station (Uploaded)</span>
          <select v-model="selectedUploadedStation">
            <option :value="null">All uploaded stations</option>
            <option v-for="station in uploadedStationOptions" :key="station" :value="station">
              {{ station }}
            </option>
          </select>
        </label>

        <label class="upload-log-comparison__field">
          <span>Station (iPLAS)</span>
          <select v-model="selectedIplasStation" :disabled="iplasDataByIsn.size === 0">
            <option :value="null">Auto</option>
            <option v-for="station in iplasStationOptions" :key="station" :value="station">
              {{ station }}
            </option>
          </select>
        </label>

        <label class="upload-log-comparison__field upload-log-comparison__field--wide">
          <span>ISNs To Compare</span>
          <select v-model="selectedCompareIsns" multiple size="4">
            <option v-for="isn in allCompareIsns" :key="isn" :value="isn">
              {{ isn }}
            </option>
          </select>
          <small>Leave empty to compare all detected ISNs.</small>
        </label>

        <label class="upload-log-comparison__field">
          <span>Filter Items</span>
          <select v-model="itemFilterType">
            <option v-for="option in itemFilterOptions" :key="option.value" :value="option.value">
              {{ option.title }}
            </option>
          </select>
        </label>

        <label class="upload-log-comparison__field upload-log-comparison__field--wide">
          <span>Search Test Items</span>
          <input v-model="searchQuery" type="text" placeholder="Search by test item name">
        </label>
      </div>

      <div v-if="iplasLoading" class="upload-log-comparison__notice">
        Fetching iPLAS data for {{ allCompareIsns.length }} ISN(s)...
      </div>
      <div v-else-if="iplasDataByIsn.size > 0" class="upload-log-comparison__notice upload-log-comparison__notice--success">
        iPLAS data loaded for {{ iplasDataByIsn.size }} ISN(s)
        <span v-if="selectedIplasStation"> - Station: {{ selectedIplasStation }}</span>
      </div>

      <DataTable
        :value="comparisonTableItems"
        paginator
        :rows="25"
        dataKey="test_item"
        scrollable
        scrollHeight="840px"
        removableSort
        showGridlines
        stripedRows
        class="upload-log-comparison__table"
      >
        <ColumnGroup type="header">
          <Row>
            <Column header="Test Item" :rowspan="2" />
            <Column header="UCL" :rowspan="2" />
            <Column header="LCL" :rowspan="2" />
            <Column
              v-for="isn in displayedIsns"
              :key="`group-${isn}`"
              :header="isn"
              :colspan="2"
            />
            <Column v-if="displayedIsns.length > 0" header="Score" :colspan="displayedIsns.length * 2" />
          </Row>
          <Row>
            <template v-for="(isn, idx) in displayedIsns" :key="`value-row-${isn}`">
              <Column header="Uploaded" />
              <Column header="iPLAS" />
            </template>
            <template v-for="(isn, idx) in displayedIsns" :key="`score-row-${isn}`">
              <Column :header="`${shortIsnLabel(isn)} (Upl)`" />
              <Column :header="`${shortIsnLabel(isn)} (iPLAS)`" />
            </template>
          </Row>
        </ColumnGroup>

        <Column field="test_item" sortable>
          <template #body="slotProps">
            <span class="upload-log-comparison__strong">{{ slotProps.data.test_item }}</span>
          </template>
        </Column>

        <Column field="usl" sortable>
          <template #body="slotProps">
            <span class="upload-log-comparison__muted">{{ slotProps.data.usl ?? '-' }}</span>
          </template>
        </Column>

        <Column field="lsl" sortable>
          <template #body="slotProps">
            <span class="upload-log-comparison__muted">{{ slotProps.data.lsl ?? '-' }}</span>
          </template>
        </Column>

        <template v-for="(isn, idx) in displayedIsns" :key="`uploaded-${isn}`">
          <Column :field="`uploaded_val_${idx}`" sortable>
            <template #body="slotProps">
              {{ slotProps.data[`uploaded_val_${idx}`] ?? '-' }}
            </template>
          </Column>
          <Column :field="`iplas_val_${idx}`" sortable>
            <template #body="slotProps">
              {{ slotProps.data[`iplas_val_${idx}`] ?? '-' }}
            </template>
          </Column>
        </template>

        <template v-for="(isn, idx) in displayedIsns" :key="`score-${isn}`">
          <Column :field="`uploaded_score_${idx}`" sortable>
            <template #body="slotProps">
              <span
                v-if="slotProps.data[`uploaded_score_${idx}`] != null"
                :class="scoreChipClass(Number(slotProps.data[`uploaded_score_${idx}`]))"
              >
                {{ Number(slotProps.data[`uploaded_score_${idx}`]).toFixed(2) }}
              </span>
              <span v-else class="upload-log-comparison__muted">-</span>
            </template>
          </Column>
          <Column :field="`iplas_score_${idx}`" sortable>
            <template #body="slotProps">
              <span
                v-if="slotProps.data[`iplas_score_${idx}`] != null"
                :class="scoreChipClass(Number(slotProps.data[`iplas_score_${idx}`]))"
              >
                {{ Number(slotProps.data[`iplas_score_${idx}`]).toFixed(2) }}
              </span>
              <span v-else class="upload-log-comparison__muted">-</span>
            </template>
          </Column>
        </template>
      </DataTable>
    </AppPanel>
  </section>

  <div v-if="comparisonFullscreen" class="upload-log-comparison-overlay" role="dialog" aria-modal="true">
    <div class="upload-log-comparison-overlay__backdrop" @click="comparisonFullscreen = false" />
    <section class="upload-log-comparison-overlay__panel">
      <header class="upload-log-comparison-overlay__header">
        <div>
          <p class="upload-log-comparison-overlay__eyebrow">Fullscreen Comparison</p>
          <h2>Test Item Comparison</h2>
        </div>
        <div class="upload-log-comparison__header-actions">
          <span class="upload-log-comparison__pill upload-log-comparison__pill--info">{{ totalFiles }} files</span>
          <button
            type="button"
            class="upload-log-comparison__ghost-button"
            :disabled="exportingComparison"
            @click="exportComparisonToExcel"
          >
            {{ exportingComparison ? 'Exporting...' : 'Export' }}
          </button>
          <button type="button" class="upload-log-comparison__ghost-button" @click="comparisonFullscreen = false">
            Close
          </button>
        </div>
      </header>

      <div class="upload-log-comparison__filters upload-log-comparison__filters--fullscreen">
        <label class="upload-log-comparison__field">
          <span>Station (Uploaded)</span>
          <select v-model="selectedUploadedStation">
            <option :value="null">All uploaded stations</option>
            <option v-for="station in uploadedStationOptions" :key="`fullscreen-uploaded-${station}`" :value="station">
              {{ station }}
            </option>
          </select>
        </label>

        <label class="upload-log-comparison__field">
          <span>Station (iPLAS)</span>
          <select v-model="selectedIplasStation" :disabled="iplasDataByIsn.size === 0">
            <option :value="null">Auto</option>
            <option v-for="station in iplasStationOptions" :key="`fullscreen-iplas-${station}`" :value="station">
              {{ station }}
            </option>
          </select>
        </label>

        <label class="upload-log-comparison__field upload-log-comparison__field--wide">
          <span>ISNs To Compare</span>
          <select v-model="selectedCompareIsns" multiple size="6">
            <option v-for="isn in allCompareIsns" :key="`fullscreen-isn-${isn}`" :value="isn">
              {{ isn }}
            </option>
          </select>
        </label>

        <label class="upload-log-comparison__field">
          <span>Filter Items</span>
          <select v-model="itemFilterType">
            <option v-for="option in itemFilterOptions" :key="`fullscreen-${option.value}`" :value="option.value">
              {{ option.title }}
            </option>
          </select>
        </label>

        <label class="upload-log-comparison__field upload-log-comparison__field--wide">
          <span>Search Test Items</span>
          <input v-model="searchQuery" type="text" placeholder="Search by test item name">
        </label>
      </div>

      <div class="upload-log-comparison-overlay__table-wrap">
        <DataTable
          :value="comparisonTableItems"
          paginator
          :rows="comparisonItemsPerPage"
          dataKey="test_item"
          scrollable
          scrollHeight="calc(100vh - 18rem)"
          removableSort
          showGridlines
          stripedRows
          class="upload-log-comparison__table"
        >
          <ColumnGroup type="header">
            <Row>
              <Column header="Test Item" :rowspan="2" />
              <Column header="UCL" :rowspan="2" />
              <Column header="LCL" :rowspan="2" />
              <Column
                v-for="isn in displayedIsns"
                :key="`overlay-group-${isn}`"
                :header="isn"
                :colspan="2"
              />
              <Column v-if="displayedIsns.length > 0" header="Score" :colspan="displayedIsns.length * 2" />
            </Row>
            <Row>
              <template v-for="(isn, idx) in displayedIsns" :key="`overlay-value-${isn}`">
                <Column header="Uploaded" />
                <Column header="iPLAS" />
              </template>
              <template v-for="(isn, idx) in displayedIsns" :key="`overlay-score-${isn}`">
                <Column :header="`${shortIsnLabel(isn)} (Upl)`" />
                <Column :header="`${shortIsnLabel(isn)} (iPLAS)`" />
              </template>
            </Row>
          </ColumnGroup>

          <Column field="test_item" sortable>
            <template #body="slotProps">
              <span class="upload-log-comparison__strong">{{ slotProps.data.test_item }}</span>
            </template>
          </Column>

          <Column field="usl" sortable>
            <template #body="slotProps">
              <span class="upload-log-comparison__muted">{{ slotProps.data.usl ?? '-' }}</span>
            </template>
          </Column>

          <Column field="lsl" sortable>
            <template #body="slotProps">
              <span class="upload-log-comparison__muted">{{ slotProps.data.lsl ?? '-' }}</span>
            </template>
          </Column>

          <template v-for="(isn, idx) in displayedIsns" :key="`overlay-uploaded-${isn}`">
            <Column :field="`uploaded_val_${idx}`" sortable>
              <template #body="slotProps">
                {{ slotProps.data[`uploaded_val_${idx}`] ?? '-' }}
              </template>
            </Column>
            <Column :field="`iplas_val_${idx}`" sortable>
              <template #body="slotProps">
                {{ slotProps.data[`iplas_val_${idx}`] ?? '-' }}
              </template>
            </Column>
          </template>

          <template v-for="(isn, idx) in displayedIsns" :key="`overlay-score-col-${isn}`">
            <Column :field="`uploaded_score_${idx}`" sortable>
              <template #body="slotProps">
                <span
                  v-if="slotProps.data[`uploaded_score_${idx}`] != null"
                  :class="scoreChipClass(Number(slotProps.data[`uploaded_score_${idx}`]))"
                >
                  {{ Number(slotProps.data[`uploaded_score_${idx}`]).toFixed(2) }}
                </span>
                <span v-else class="upload-log-comparison__muted">-</span>
              </template>
            </Column>
            <Column :field="`iplas_score_${idx}`" sortable>
              <template #body="slotProps">
                <span
                  v-if="slotProps.data[`iplas_score_${idx}`] != null"
                  :class="scoreChipClass(Number(slotProps.data[`iplas_score_${idx}`]))"
                >
                  {{ Number(slotProps.data[`iplas_score_${idx}`]).toFixed(2) }}
                </span>
                <span v-else class="upload-log-comparison__muted">-</span>
              </template>
            </Column>
          </template>
        </DataTable>
      </div>
    </section>
  </div>

  <AppDialog
    v-model="showBreakdownDialog"
    v-model:fullscreen="breakdownFullscreen"
    width="min(92vw, 40rem)"
    fullscreen-width="96vw"
    fullscreenable
    title="Score Breakdown"
    description="Universal Scoring"
    class="upload-log-breakdown-dialog"
  >

    <div v-if="breakdownItem" class="upload-log-breakdown">
      <section class="upload-log-breakdown__summary-card">
        <div>
          <p class="upload-log-breakdown__eyebrow">Test Item</p>
          <h3>{{ breakdownItem.test_item }}</h3>
        </div>

        <div class="upload-log-breakdown__summary-grid">
          <article>
            <span>Actual Value</span>
            <strong>{{ breakdownItem.value }}</strong>
          </article>
          <article>
            <span>Score</span>
            <strong>
              <span :class="scoreChipClass(breakdownItem.score ?? 0)">
                {{ breakdownItem.score?.toFixed(2) ?? 'N/A' }}
              </span>
            </strong>
          </article>
          <article>
            <span>Scoring Type</span>
            <strong>
              <span :class="scoringTypeChipClass(breakdownItem.score_breakdown?.scoring_type ?? '')">
                {{ breakdownItem.score_breakdown?.scoring_type ?? 'N/A' }}
              </span>
            </strong>
          </article>
        </div>
      </section>

      <div class="upload-log-breakdown__table-wrap">
        <table class="upload-log-breakdown__table">
          <tbody>
            <tr>
              <td>Scoring Type</td>
              <td>
                <span :class="scoringTypeChipClass(breakdownItem.score_breakdown?.scoring_type ?? '')">
                  {{ breakdownItem.score_breakdown?.scoring_type ?? 'N/A' }}
                </span>
              </td>
            </tr>
            <tr v-if="breakdownItem.score_breakdown?.ucl !== null && breakdownItem.score_breakdown?.ucl !== undefined">
              <td>UCL (Upper Limit)</td>
              <td>{{ breakdownItem.score_breakdown.ucl }}</td>
            </tr>
            <tr v-if="breakdownItem.score_breakdown?.lcl !== null && breakdownItem.score_breakdown?.lcl !== undefined">
              <td>LCL (Lower Limit)</td>
              <td>{{ breakdownItem.score_breakdown.lcl }}</td>
            </tr>
            <tr v-if="breakdownItem.score_breakdown?.target !== null && breakdownItem.score_breakdown?.target !== undefined">
              <td>Target</td>
              <td class="upload-log-breakdown__emphasis">{{ breakdownItem.score_breakdown.target?.toFixed(2) }}</td>
            </tr>
            <tr v-if="breakdownItem.score_breakdown?.actual !== null && breakdownItem.score_breakdown?.actual !== undefined">
              <td>Actual Value</td>
              <td class="upload-log-breakdown__emphasis">{{ breakdownItem.score_breakdown.actual }}</td>
            </tr>
            <tr v-if="breakdownItem.score_breakdown?.deviation !== null && breakdownItem.score_breakdown?.deviation !== undefined">
              <td>Deviation</td>
              <td :class="{ 'upload-log-breakdown__deviation-warning': Math.abs(breakdownItem.score_breakdown.deviation ?? 0) > 1 }">
                {{ breakdownItem.score_breakdown.deviation?.toFixed(2) }}
              </td>
            </tr>
            <tr v-if="breakdownItem.score_breakdown?.policy">
              <td>Policy</td>
              <td>
                <span class="upload-log-comparison__pill">{{ breakdownItem.score_breakdown.policy }}</span>
              </td>
            </tr>
            <tr>
              <td>Weight</td>
              <td>{{ breakdownItem.score_breakdown?.weight ?? 1.0 }}</td>
            </tr>
            <tr>
              <td>Score (0-10)</td>
              <td>
                <span :class="scoreChipClass(breakdownItem.score_breakdown?.score ?? 0)">
                  {{ breakdownItem.score_breakdown?.score?.toFixed(2) ?? 'N/A' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <template #footer>
      <button type="button" class="upload-log-comparison__ghost-button" @click="showBreakdownDialog = false">
        Close
      </button>
    </template>
  </AppDialog>

  <!-- Criteria Builder Dialog -->
  <CriteriaBuilderDialog v-model="criteriaBuilderOpen" @criteria-created="handleCriteriaCreated" />

  <!-- UPDATED: Upload Scoring Config Dialog -->
  <UploadScoringConfigDialog v-model="showScoringConfigDialog" :test-items="extractedTestItems"
    :existing-configs="appliedScoringConfigs" :stations="extractedStations" :test-item-stations="testItemStationsMap"
    :default-station="selectedUploadedStation" @apply="handleScoringConfigApply" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Column from 'primevue/column'
import ColumnGroup from 'primevue/columngroup'
import DataTable from 'primevue/datatable'
import Row from 'primevue/row'
import type { IplasIsnSearchRecord } from '@/features/dut-logs/api/iplasProxyApi'
import { useIplasApi } from '@/features/dut-logs/composables/useIplasApi'
import AppDialog from '@/shared/ui/dialog/AppDialog.vue'
import AppFilePicker from '@/shared/ui/forms/AppFilePicker.vue'
import AppPanel from '@/shared/ui/panel/AppPanel.vue'
import {
  type CompareItemEnhanced,
  type CompareResponseEnhanced,
  type FileSummaryEnhanced,
  type ParsedTestItemEnhanced,
  type PerIsnData,
  type RescoreItemResult,
  type RescoreScoringConfig,
  type TestLogParseResponseEnhanced,
  useTestLogUpload,
} from '@/features/dut-logs/composables/useTestLogUpload'
import { useNotification } from '@/shared/composables/useNotification'
import { getErrorMessage } from '@/shared/utils'
import CriteriaBuilderDialog from './CriteriaBuilderDialog.vue'
import TopProductRankingUploadLog from './TopProductRankingUploadLog.vue'
import UploadScoringConfigDialog from './UploadScoringConfigDialog.vue'
import { downloadUploadLogCriteriaTemplate } from '../utils/criteriaTemplate'

// File inputs
const logFiles = ref<File[] | null>(null)
const criteriaFile = ref<File | null>(null)
const showOnlyCriteria = ref(false)

// Results
const parsingResult = ref<TestLogParseResponseEnhanced | null>(null)
const compareResult = ref<CompareResponseEnhanced | null>(null)

// UI state
const loading = ref(false)
const extractingItems = ref(false)
const criteriaBuilderOpen = ref(false)

// Comparison section state
const itemFilterType = ref<string>('all')
const searchQuery = ref('')
const exportingComparison = ref(false)
const comparisonItemsPerPage = ref(100)

// UPDATED: iPLAS comparison state
const iplasDataByIsn = ref<Map<string, IplasIsnSearchRecord[]>>(new Map())
const iplasLoading = ref(false)
const selectedIplasStation = ref<string | null>(null)
const selectedCompareIsns = ref<string[]>([])
const iplasScoredByIsn = ref<Map<string, Map<string, { score: number }>>>(new Map())

// Uploaded files station filter
const selectedUploadedStation = ref<string | null>(null)

// Scoring config state
const showScoringConfigDialog = ref(false)
const extractedTestItems = ref<ParsedTestItemEnhanced[]>([])
const extractedStations = ref<string[]>([])
const testItemStationsMap = ref<Map<string, Set<string>>>(new Map()) // Maps test item -> stations
const appliedScoringConfigs = ref<RescoreScoringConfig[]>([])

// Score breakdown dialog (new universal scoring)
const showBreakdownDialog = ref(false)
const breakdownFullscreen = ref(false)
const breakdownItem = ref<ParsedTestItemEnhanced | null>(null)

// Comparison section fullscreen
const comparisonFullscreen = ref(false)

// Composables
const { parseLog, compareLogs, rescoreItems } = useTestLogUpload()
const { searchByIsnBatch } = useIplasApi()
const { showError: showErrorNotification } = useNotification()

// Filter options for comparison section
const itemFilterOptions = [
  { title: 'Show All', value: 'all' },
  { title: 'Criteria Items', value: 'criteria' },
  { title: 'Non-Criteria Items', value: 'non-criteria' },
]

// Computed
const hasFiles = computed(() => {
  return logFiles.value && logFiles.value.length > 0
})

const canAnalyze = computed(() => {
  if (!logFiles.value) return false
  return logFiles.value.length >= 1
})

const hasResults = computed(() => {
  return parsingResult.value !== null || compareResult.value !== null
})

const isMultipleFiles = computed(() => {
  return (compareResult.value?.total_files ?? 0) > 1
})

const totalFiles = computed(() => {
  return compareResult.value?.total_files || 0
})

// UPDATED: All ISNs from comparison results
const allCompareIsns = computed<string[]>(() => {
  if (!compareResult.value?.file_summaries) return []
  return compareResult.value.file_summaries
    .map((s: FileSummaryEnhanced) => s.isn)
    .filter((isn: string | null): isn is string => isn !== null)
})

// Available stations from uploaded files
const uploadedStationOptions = computed(() => {
  if (!compareResult.value?.file_summaries) return []
  const stations = new Set<string>()
  compareResult.value.file_summaries.forEach((s: FileSummaryEnhanced) => {
    if (s.metadata?.station) {
      stations.add(s.metadata.station)
    }
  })
  return Array.from(stations).sort()
})

// ISNs currently displayed in the table columns (with station filter support)
const displayedIsns = computed(() => {
  // Start with manually selected ISNs, or all ISNs
  let isns = selectedCompareIsns.value.length > 0 ? selectedCompareIsns.value : allCompareIsns.value

  // Filter by uploaded station if selected
  if (selectedUploadedStation.value && compareResult.value?.file_summaries) {
    const isnsFromStation = new Set(
      compareResult.value.file_summaries
        .filter((s: FileSummaryEnhanced) => s.metadata?.station === selectedUploadedStation.value)
        .map((s: FileSummaryEnhanced) => s.isn)
        .filter((isn: string | null): isn is string => isn !== null),
    )
    isns = isns.filter((isn) => isnsFromStation.has(isn))
  }

  return isns
})

// Available iPLAS stations across all fetched ISN data
const iplasStationOptions = computed(() => {
  const stations = new Set<string>()
  for (const [, records] of iplasDataByIsn.value) {
    records.forEach((r) => {
      const name = r.display_station_name || r.station_name
      if (name) stations.add(name)
    })
  }
  return Array.from(stations)
})

// UPDATED: Comparison table items with per-ISN uploaded + iPLAS data
const comparisonTableItems = computed(() => {
  if (!compareResult.value) return []

  let items: CompareItemEnhanced[] = [
    ...(compareResult.value.comparison_value_items || []),
    ...(compareResult.value.comparison_non_value_items || []),
  ]

  const isns = displayedIsns.value

  // Filter to only items that have data for at least one of the displayed ISNs
  // This ensures station filter applies to test items as well
  if (isns.length > 0) {
    items = items.filter((item) =>
      item.per_isn_data.some((d) => d.isn !== null && isns.includes(d.isn)),
    )
  }

  // Apply criteria filters
  if (itemFilterType.value === 'criteria') {
    items = items.filter((item) => item.usl !== null || item.lsl !== null)
  } else if (itemFilterType.value === 'non-criteria') {
    items = items.filter((item) => item.usl === null && item.lsl === null)
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter((item) => item.test_item.toLowerCase().includes(query))
  }

  return items.map((item) => {
    const row: Record<string, unknown> = {
      test_item: item.test_item,
      usl: item.usl,
      lsl: item.lsl,
    }

    isns.forEach((isn, idx) => {
      // Uploaded data from comparison result
      const perIsn = item.per_isn_data.find((d) => d.isn === isn)
      row[`uploaded_val_${idx}`] = perIsn?.value ?? null
      row[`uploaded_score_${idx}`] = perIsn?.score ?? null

      // iPLAS data from fetched records
      const iplasRecords = iplasDataByIsn.value.get(isn)
      if (iplasRecords && iplasRecords.length > 0) {
        const stationRecord = selectedIplasStation.value
          ? iplasRecords.find(
              (r) =>
                r.display_station_name === selectedIplasStation.value ||
                r.station_name === selectedIplasStation.value,
            )
          : iplasRecords[0]
        if (stationRecord) {
          const iplasItem = stationRecord.test_item.find(
            (t) => t.NAME.toLowerCase() === item.test_item.toLowerCase(),
          )
          row[`iplas_val_${idx}`] = iplasItem?.VALUE ?? null
        }
      }

      // iPLAS score from rescored data
      const iplasScoredMap = iplasScoredByIsn.value.get(isn)
      if (iplasScoredMap) {
        const scored = iplasScoredMap.get(item.test_item.toLowerCase())
        row[`iplas_score_${idx}`] = scored?.score ?? null
      }
    })

    return row
  })
})

// Methods

/**
 * Quick-parse files to extract test item names and stations for scoring config dialog
 */
const extractTestItems = async (): Promise<void> => {
  if (!logFiles.value || logFiles.value.length === 0) return

  extractingItems.value = true
  try {
    const stations = new Set<string>()
    const itemsMap = new Map<string, ParsedTestItemEnhanced>()
    const itemStationsMap = new Map<string, Set<string>>() // Track which items appear in which stations

    // Helper to check if file is archive
    const isArchiveFile = (file: File) => {
      const ext = file.name.toLowerCase()
      return ext.endsWith('.zip') || ext.endsWith('.rar') || ext.endsWith('.7z')
    }

    const hasArchive = logFiles.value.some(isArchiveFile)

    if (hasArchive || logFiles.value.length > 1) {
      // Use compareLogs for archives or multiple files
      try {
        const result = await compareLogs(logFiles.value, criteriaFile.value, showOnlyCriteria.value)

        // Extract stations from file_summaries
        result.file_summaries?.forEach((summary: FileSummaryEnhanced) => {
          const station = summary.metadata?.station || 'Unknown'
          stations.add(station)
        })

        // Extract items from comparison_value_items and comparison_non_value_items
        const allItems = [
          ...(result.comparison_value_items || []),
          ...(result.comparison_non_value_items || []),
        ]

        // Build itemsMap and itemStationsMap from per_isn_data
        allItems.forEach((item: CompareItemEnhanced) => {
          if (!itemsMap.has(item.test_item)) {
            const firstData = item.per_isn_data?.[0]
            itemsMap.set(item.test_item, {
              test_item: item.test_item,
              value: firstData?.value || '',
              usl: item.usl,
              lsl: item.lsl,
              is_value_type: firstData?.is_value_type ?? false,
              numeric_value: firstData?.numeric_value ?? null,
              is_hex: firstData?.is_hex ?? false,
              hex_decimal: firstData?.hex_decimal ?? null,
              matched_criteria: item.matched_criteria || false,
              target: item.baseline,
              score: item.avg_score,
              score_breakdown: firstData?.score_breakdown ?? null,
            } as ParsedTestItemEnhanced)
          }

          // Track stations per item from file_summaries + per_isn_data
          if (!itemStationsMap.has(item.test_item)) {
            itemStationsMap.set(item.test_item, new Set())
          }
          item.per_isn_data?.forEach((data: PerIsnData) => {
            // Find the station for this ISN from file_summaries
            const summary = result.file_summaries?.find(
              (s: FileSummaryEnhanced) => s.isn === data.isn,
            )
            if (summary?.metadata?.station) {
              itemStationsMap.get(item.test_item)?.add(summary.metadata.station)
            }
          })
        })
      } catch (err: unknown) {
        console.warn(`Failed to compare files:`, getErrorMessage(err))
      }
    } else {
      // Single .txt file - use parseLog
      for (const file of logFiles.value) {
        try {
          const result = await parseLog(file, criteriaFile.value, showOnlyCriteria.value)
          const station = result.station || 'Unknown'
          stations.add(station)

          // Track items and their stations
          for (const item of result.parsed_items_enhanced || []) {
            // Keep first occurrence of each item
            if (!itemsMap.has(item.test_item)) {
              itemsMap.set(item.test_item, item)
            }
            // Track which stations have this item
            if (!itemStationsMap.has(item.test_item)) {
              itemStationsMap.set(item.test_item, new Set())
            }
            itemStationsMap.get(item.test_item)?.add(station)
          }
        } catch (err: unknown) {
          console.warn(`Failed to parse file ${file.name}:`, getErrorMessage(err))
        }
      }
    }

    extractedTestItems.value = Array.from(itemsMap.values())
    extractedStations.value = Array.from(stations).sort()
    testItemStationsMap.value = itemStationsMap
  } catch (err: unknown) {
    // If quick-parse fails, we can still open config dialog with empty items
    console.warn('Failed to extract test items for scoring config:', getErrorMessage(err))
    extractedTestItems.value = []
    extractedStations.value = []
    testItemStationsMap.value = new Map()
  } finally {
    extractingItems.value = false
  }
}

/**
 * Open scoring config dialog - extracts test items first if needed
 */
const handleConfigureScoring = async () => {
  if (extractedTestItems.value.length === 0) {
    await extractTestItems()
  }
  showScoringConfigDialog.value = true
}

/**
 * Handle scoring config applied from dialog
 */
const handleScoringConfigApply = (configs: RescoreScoringConfig[]) => {
  appliedScoringConfigs.value = configs
}

/**
 * Clear scoring configs
 */
const clearScoringConfigs = () => {
  appliedScoringConfigs.value = []
}

// ============================================
// iPLAS Comparison Data
// ============================================

/**
 * Fetch iPLAS data for all ISNs in the comparison using batch search
 */
const fetchIplasForComparison = async () => {
  const isns = allCompareIsns.value
  if (isns.length === 0) return

  iplasLoading.value = true
  try {
    const results = await searchByIsnBatch(isns)
    iplasDataByIsn.value = results

    // Auto-select first available station
    const stations = iplasStationOptions.value
    if (stations.length > 0 && !selectedIplasStation.value) {
      selectedIplasStation.value = stations[0] ?? null
    }

    // Rescore iPLAS data with current scoring configs
    await rescoreIplasData()
  } catch (err: unknown) {
    console.error('Failed to fetch iPLAS comparison data:', err)
  } finally {
    iplasLoading.value = false
  }
}

/**
 * Rescore iPLAS data for all ISNs using the applied scoring configs
 */
/**
 * Rescore iPLAS data for all ISNs using the applied scoring configs
 * UPDATED: Only score criteria items (with UCL or LCL) by default
 */
const rescoreIplasData = async () => {
  const isns = allCompareIsns.value
  iplasScoredByIsn.value = new Map()

  // Build set of explicitly configured item names
  const explicitlyConfigured = new Set(appliedScoringConfigs.value.map((c) => c.test_item_name))

  for (const isn of isns) {
    const records = iplasDataByIsn.value.get(isn) || []
    const stationRecord = selectedIplasStation.value
      ? records.find(
          (r) =>
            r.display_station_name === selectedIplasStation.value ||
            r.station_name === selectedIplasStation.value,
        )
      : records[0]

    if (!stationRecord || !stationRecord.test_item.length) continue

    // UPDATED: Filter to only criteria items (with limits) or explicitly configured items
    const testItems = stationRecord.test_item
      .filter((t) => {
        const hasLimits = (t.UCL && t.UCL !== '') || (t.LCL && t.LCL !== '')
        return hasLimits || explicitlyConfigured.has(t.NAME)
      })
      .map((t) => ({
        test_item: t.NAME,
        value: t.VALUE,
        usl: t.UCL ? parseFloat(t.UCL) : null,
        lsl: t.LCL ? parseFloat(t.LCL) : null,
        status: t.STATUS || 'PASS',
      }))

    if (testItems.length === 0) continue

    try {
      const result = await rescoreItems(testItems, appliedScoringConfigs.value)
      const scoreMap = new Map<string, { score: number }>()
      result.test_item_scores.forEach((score: RescoreItemResult) => {
        // Only add to map if score is not null
        if (score.score !== null) {
          scoreMap.set(score.test_item.toLowerCase(), { score: score.score })
        }
      })
      iplasScoredByIsn.value.set(isn, scoreMap)
    } catch (err: unknown) {
      console.error(`Failed to rescore iPLAS data for ${isn}:`, err)
    }
  }
}

/**
 * Check if a column key represents a score column (for chip rendering)
 */
function isScoreColumn(key: string | undefined): boolean {
  if (!key) return false
  return key.startsWith('uploaded_score_') || key.startsWith('iplas_score_')
}

function shortIsnLabel(isn: string): string {
  return isn.length > 10 ? `...${isn.slice(-8)}` : isn
}

function scoreChipClass(score: number): string[] {
  return ['upload-log-score-chip', `is-${getScoreColor(score)}`]
}

function scoringTypeChipClass(type: string): string[] {
  return ['upload-log-score-chip', `is-${getScoringTypeColor(type)}`]
}

const handleAnalyze = async () => {
  loading.value = true

  try {
    const files = logFiles.value || []

    // Helper to check if file is archive
    const isArchiveFile = (file: File) => {
      const ext = file.name.toLowerCase()
      return ext.endsWith('.zip') || ext.endsWith('.rar') || ext.endsWith('.7z')
    }

    // Use compareLogs if multiple files OR single archive file
    const hasArchive = files.some(isArchiveFile)

    if (files.length === 1 && !hasArchive) {
      // Single .txt file - use parseLog
      const file = files[0]
      if (!file) {
        throw new Error('No file selected')
      }
      const result = await parseLog(
        file,
        criteriaFile.value,
        showOnlyCriteria.value,
        appliedScoringConfigs.value,
      )
      parsingResult.value = result
      compareResult.value = null

      // Also update extracted test items from latest parse
      extractedTestItems.value = result.parsed_items_enhanced || []
    } else {
      // Multiple files OR archive file - use compareLogs
      const result = await compareLogs(
        files,
        criteriaFile.value,
        showOnlyCriteria.value,
        appliedScoringConfigs.value,
      )
      compareResult.value = result
      parsingResult.value = null
    }
  } catch (error: unknown) {
    showErrorNotification(getErrorMessage(error) || 'Analysis failed. Please try again.')
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  logFiles.value = null
  criteriaFile.value = null
  showOnlyCriteria.value = false
  parsingResult.value = null
  compareResult.value = null
  searchQuery.value = ''
  itemFilterType.value = 'all'
  extractedTestItems.value = []
  extractedStations.value = []
  appliedScoringConfigs.value = []
  // UPDATED: Clear iPLAS comparison state
  iplasDataByIsn.value = new Map()
  iplasScoredByIsn.value = new Map()
  selectedIplasStation.value = null
  selectedCompareIsns.value = []
}

const openCriteriaBuilder = () => {
  criteriaBuilderOpen.value = true
}

const handleCriteriaCreated = (file: File) => {
  criteriaFile.value = file
}

const downloadCriteriaTemplate = () => {
  downloadUploadLogCriteriaTemplate()
}

const getScoreColor = (score: number): string => {
  if (score >= 9) return 'success' // 9-10: green
  if (score >= 7) return 'info' // 7-8.99: blue
  if (score >= 6) return 'warning' // 6-6.99: yellow/orange
  return 'error' // <6: red
}

/**
 * Export comparison table data to Excel
 */
async function exportComparisonToExcel() {
  exportingComparison.value = true
  try {
    const items = comparisonTableItems.value
    const isns = displayedIsns.value

    // Build export data with dynamic columns
    const exportData = items.map((item: Record<string, unknown>) => {
      const row: Record<string, unknown> = {
        'Test Item': item.test_item,
        UCL: item.usl ?? '',
        LCL: item.lsl ?? '',
      }

      isns.forEach((isn, idx) => {
        row[`${isn} Uploaded Value`] = item[`uploaded_val_${idx}`] ?? ''
        row[`${isn} iPLAS Value`] = item[`iplas_val_${idx}`] ?? ''
        row[`${isn} Uploaded Score`] = item[`uploaded_score_${idx}`] ?? ''
        row[`${isn} iPLAS Score`] = item[`iplas_score_${idx}`] ?? ''
      })

      return row
    })

    const ExcelJS = await import('exceljs')
    const workbook = new (ExcelJS.default || ExcelJS).Workbook()
    const worksheet = workbook.addWorksheet('Comparison')

    if (exportData.length > 0) {
      const rows = exportData as Array<Record<string, unknown>>
      const headers = Object.keys(rows[0] ?? {})
      worksheet.addRow(headers)
      rows.forEach((item) => {
        worksheet.addRow(headers.map((header) => item[header] ?? ''))
      })
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `Test_Item_Comparison_${timestamp}.xlsx`

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err: unknown) {
    console.error('Export failed:', err)
    showErrorNotification(`Export failed: ${getErrorMessage(err) || 'Unknown error'}`)
  } finally {
    exportingComparison.value = false
  }
}

const getScoringTypeColor = (type: string): string => {
  switch (type) {
    case 'symmetrical':
      return 'blue'
    case 'asymmetrical':
      return 'purple'
    case 'per_mask':
      return 'orange'
    case 'evm':
      return 'teal'
    case 'throughput':
      return 'green'
    case 'binary':
      return 'grey'
    default:
      return 'blue'
  }
}

/**
 * Show score breakdown for a comparison item (uses first ISN's data)
 */
// const showTestItemBreakdown = (item: CompareItemEnhanced) => {
//   const firstIsnData = item.per_isn_data?.[0]
//   if (firstIsnData) {
//     breakdownItem.value = {
//       test_item: item.test_item,
//       usl: item.usl,
//       lsl: item.lsl,
//       value: firstIsnData.value,
//       is_value_type: firstIsnData.is_value_type,
//       numeric_value: firstIsnData.numeric_value,
//       is_hex: firstIsnData.is_hex,
//       hex_decimal: firstIsnData.hex_decimal,
//       matched_criteria: item.matched_criteria,
//       target: null,
//       score: firstIsnData.score,
//       score_breakdown: firstIsnData.score_breakdown,
//     }
//     showBreakdownDialog.value = true
//   }
// }

// Watch for showOnlyCriteria changes and re-analyze if results exist
watch(showOnlyCriteria, async () => {
  if (hasResults.value && criteriaFile.value) {
    await handleAnalyze()
  }
})

// When files change, clear extracted items so they get re-extracted
watch(logFiles, () => {
  extractedTestItems.value = []
})

// UPDATED: Auto-fetch iPLAS data when comparison results are available
watch(compareResult, async (newVal) => {
  if (newVal) {
    await fetchIplasForComparison()
  }
})

// When iPLAS station changes, rescore iPLAS data
watch(selectedIplasStation, async () => {
  if (iplasDataByIsn.value.size > 0) {
    await rescoreIplasData()
  }
})
</script>

<style scoped>
.upload-log-shell {
  display: grid;
  gap: 1rem;
}

.upload-log-shell__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.upload-log-shell__actions,
.upload-log-shell__notice,
.upload-log-shell__checkbox {
  display: flex;
  align-items: center;
}

.upload-log-shell__actions {
  flex-wrap: wrap;
  gap: 0.75rem;
}

.upload-log-shell__helper-text {
  margin: 0;
  color: var(--app-muted);
  font-size: 0.88rem;
}

.upload-log-shell__checkbox {
  gap: 0.65rem;
  color: var(--app-ink);
  font-weight: 600;
}

.upload-log-shell__checkbox input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--app-accent);
}

.upload-log-shell__ghost-button,
.upload-log-shell__primary-button,
.upload-log-shell__link {
  font: inherit;
}

.upload-log-shell__ghost-button,
.upload-log-shell__primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.85rem;
  padding: 0.78rem 1rem;
  border-radius: 0.95rem;
  border: 1px solid transparent;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.upload-log-shell__ghost-button:hover:not(:disabled),
.upload-log-shell__primary-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.upload-log-shell__ghost-button:disabled,
.upload-log-shell__primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.upload-log-shell__ghost-button {
  border-color: var(--app-border);
  background: rgba(255, 255, 255, 0.85);
  color: var(--app-ink);
}

.upload-log-shell__primary-button {
  flex: 1 1 15rem;
  background: linear-gradient(135deg, #0f766e, #2860a3);
  color: white;
  box-shadow: 0 16px 30px rgba(15, 118, 110, 0.18);
}

.upload-log-shell__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.65rem;
  height: 1.65rem;
  padding: 0 0.4rem;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
  font-size: 0.8rem;
  font-weight: 700;
}

.upload-log-shell__notice,
.upload-log-shell__summary {
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
}

.upload-log-shell__notice {
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1rem;
}

.upload-log-shell__notice strong {
  color: var(--app-ink);
}

.upload-log-shell__notice p {
  margin: 0.25rem 0 0;
  color: var(--app-muted);
}

.upload-log-shell__notice--success {
  background: rgba(15, 118, 110, 0.08);
}

.upload-log-shell__summary {
  padding: 1rem;
  background: var(--app-panel);
}

.upload-log-shell__link {
  border: 0;
  background: transparent;
  color: var(--app-accent);
  cursor: pointer;
  font-weight: 700;
}

.upload-log-comparison-section {
  margin-top: 1rem;
}

.upload-log-comparison__header-actions,
.upload-log-comparison__filters,
.upload-log-breakdown__summary-grid,
.upload-log-comparison-overlay__header {
  display: flex;
  gap: 0.75rem;
}

.upload-log-comparison__header-actions {
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
}

.upload-log-comparison__pill,
.upload-log-score-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.upload-log-comparison__pill {
  border: 1px solid var(--app-border);
  background: rgba(255, 255, 255, 0.85);
  color: var(--app-ink);
}

.upload-log-comparison__pill--info {
  background: rgba(40, 96, 163, 0.08);
  color: #214d86;
}

.upload-log-comparison__pill--success {
  background: rgba(15, 118, 110, 0.08);
  color: var(--app-accent);
}

.upload-log-comparison__filters {
  flex-wrap: wrap;
}

.upload-log-comparison__field {
  display: grid;
  gap: 0.4rem;
  min-width: 12rem;
  flex: 1 1 12rem;
}

.upload-log-comparison__field--wide {
  flex-basis: 16rem;
}

.upload-log-comparison__field span,
.upload-log-breakdown__summary-grid span,
.upload-log-breakdown__table td:first-child,
.upload-log-comparison-overlay__eyebrow,
.upload-log-breakdown__eyebrow {
  color: var(--app-muted);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.upload-log-comparison__field select,
.upload-log-comparison__field input {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.95rem;
  padding: 0.76rem 0.9rem;
  font: inherit;
  color: var(--app-ink);
  background: rgba(255, 255, 255, 0.92);
}

.upload-log-comparison__field select[multiple] {
  min-height: 8rem;
}

.upload-log-comparison__field small,
.upload-log-comparison__muted {
  color: var(--app-muted);
}

.upload-log-comparison__notice {
  padding: 0.85rem 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(40, 96, 163, 0.12);
  background: rgba(40, 96, 163, 0.08);
  color: #214d86;
}

.upload-log-comparison__notice--success {
  border-color: rgba(15, 118, 110, 0.12);
  background: rgba(15, 118, 110, 0.08);
  color: var(--app-accent);
}

.upload-log-comparison__strong,
.upload-log-breakdown__summary-card h3 {
  font-weight: 700;
  color: var(--app-ink);
}

.upload-log-comparison__table :deep(.p-datatable) {
  border-radius: 1.25rem;
  overflow: hidden;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  box-shadow: var(--app-shadow-soft);
}

.upload-log-comparison__table :deep(.p-datatable-header),
.upload-log-comparison__table :deep(.p-datatable-footer) {
  border: 0;
  background: rgba(15, 118, 110, 0.05);
}

.upload-log-comparison__table :deep(.p-datatable-thead > tr > th) {
  border-color: var(--app-border);
  background: var(--app-surface);
  color: var(--app-ink);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  text-align: center;
}

.upload-log-comparison__table :deep(.p-datatable-tbody > tr > td) {
  border-color: var(--app-border);
  text-align: center;
}

.upload-log-comparison__table :deep(.p-datatable-tbody > tr > td:first-child) {
  text-align: left;
}

.upload-log-comparison-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
}

.upload-log-comparison-overlay__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.48);
  backdrop-filter: blur(6px);
}

.upload-log-comparison-overlay__panel {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 1rem;
  height: calc(100vh - 2rem);
  margin: 1rem;
  padding: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel);
  box-shadow: var(--app-shadow);
}

.upload-log-comparison-overlay__header {
  align-items: flex-start;
  justify-content: space-between;
}

.upload-log-comparison-overlay__header h2,
.upload-log-breakdown__header h2 {
  margin: 0.2rem 0 0;
  color: var(--app-ink);
}

.upload-log-comparison__filters--fullscreen {
  padding: 0 0.1rem;
}

.upload-log-comparison-overlay__table-wrap {
  min-height: 0;
}

.upload-log-breakdown__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.upload-log-breakdown {
  display: grid;
  gap: 1rem;
}

.upload-log-breakdown__summary-card,
.upload-log-breakdown__table-wrap {
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel);
}

.upload-log-breakdown__summary-card {
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

.upload-log-breakdown__summary-grid {
  flex-wrap: wrap;
}

.upload-log-breakdown__summary-grid article {
  flex: 1 1 10rem;
  padding: 0.85rem 0.9rem;
  border-radius: 1rem;
  background: rgba(15, 118, 110, 0.06);
}

.upload-log-breakdown__summary-grid strong,
.upload-log-breakdown__emphasis {
  color: var(--app-ink);
  font-weight: 700;
}

.upload-log-breakdown__table {
  width: 100%;
  border-collapse: collapse;
}

.upload-log-breakdown__table td {
  padding: 0.85rem 0.95rem;
  border-bottom: 1px solid var(--app-border);
  vertical-align: top;
}

.upload-log-breakdown__table td:last-child {
  color: var(--app-ink);
}

.upload-log-breakdown__deviation-warning {
  color: #991b1b;
  font-weight: 700;
}

.upload-log-score-chip.is-success {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
}

.upload-log-score-chip.is-info,
.upload-log-score-chip.is-blue,
.upload-log-score-chip.is-teal {
  background: rgba(40, 96, 163, 0.12);
  color: #214d86;
}

.upload-log-score-chip.is-warning,
.upload-log-score-chip.is-orange {
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
}

.upload-log-score-chip.is-error,
.upload-log-score-chip.is-purple {
  background: rgba(139, 92, 246, 0.12);
  color: #6d28d9;
}

.upload-log-score-chip.is-green {
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.upload-log-score-chip.is-grey {
  background: rgba(148, 163, 184, 0.16);
  color: #475569;
}

@media (max-width: 900px) {
  .upload-log-shell__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .upload-log-shell__actions,
  .upload-log-shell__notice,
  .upload-log-comparison__header-actions,
  .upload-log-comparison-overlay__header,
  .upload-log-breakdown__header {
    flex-direction: column;
    align-items: stretch;
  }

  .upload-log-shell__ghost-button,
  .upload-log-shell__primary-button,
  .upload-log-comparison__ghost-button {
    width: 100%;
  }

  .upload-log-comparison-overlay__panel {
    height: calc(100vh - 1rem);
    margin: 0.5rem;
  }
}
</style>
