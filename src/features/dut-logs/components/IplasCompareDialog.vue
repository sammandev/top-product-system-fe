<template>
  <AppDialog
    v-model="dialogOpen"
    v-model:fullscreen="isFullscreen"
    width="min(96vw, 88rem)"
    fullscreen-width="98vw"
    :breakpoints="dialogBreakpoints"
    fullscreenable
    :showFooter="false"
    :title="`Compare With iPLAS${isn ? ` - ${isn}` : ''}`"
    description="Review uploaded measurements against iPLAS values and export the aligned result set."
    class="iplas-compare-dialog"
  >

    <div class="iplas-compare-dialog__body" :class="{ 'iplas-compare-dialog__body--fullscreen': isFullscreen }">
      <div v-if="loading" class="iplas-compare-dialog__empty-state">
        <Icon icon="mdi:loading" class="iplas-compare-dialog__spin" />
        <strong>Fetching iPLAS data{{ isn ? ` for ${isn}` : '' }}...</strong>
        <p>The comparison view will populate once the proxy search returns.</p>
      </div>

      <section v-else-if="errorMessage" class="iplas-compare-dialog__notice iplas-compare-dialog__notice--error">
        <strong>Comparison Error</strong>
        <p>{{ errorMessage }}</p>
      </section>

      <section v-else-if="!iplasTestItems.length" class="iplas-compare-dialog__notice iplas-compare-dialog__notice--warning">
        <strong>No iPLAS Data</strong>
        <p>No iPLAS records were found for {{ isn || 'the selected ISN' }}.</p>
      </section>

      <template v-else>
        <section class="iplas-compare-dialog__controls">
          <label class="iplas-compare-dialog__field iplas-compare-dialog__field--wide">
            <span>Search Test Items (Regex)</span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Example: ^RF.*|Power"
            >
          </label>

          <label class="iplas-compare-dialog__field">
            <span>Data Type</span>
            <AppSelect v-model="typeFilter" :options="typeFilterSelectOptions" :searchable="false" />
          </label>

          <label class="iplas-compare-dialog__field">
            <span>Score Filter</span>
            <AppSelect v-model="scoreFilter" :options="scoreFilterSelectOptions" :searchable="false" />
          </label>

          <div class="iplas-compare-dialog__field iplas-compare-dialog__field--actions">
            <span>Actions</span>
            <div class="iplas-compare-dialog__action-row">
              <button
                type="button"
                class="iplas-compare-dialog__button iplas-compare-dialog__button--ghost"
                @click="showScoringConfig = true"
              >
                <Icon icon="mdi:tune-variant" />
                <span>Scoring{{ customScoringCount > 0 ? ` (${customScoringCount})` : '' }}</span>
              </button>
              <button
                type="button"
                class="iplas-compare-dialog__button iplas-compare-dialog__button--primary"
                :disabled="exporting"
                @click="exportToExcel"
              >
                <Icon :icon="exporting ? 'mdi:loading' : 'mdi:microsoft-excel'" :class="{ 'iplas-compare-dialog__spin': exporting }" />
                <span>{{ exporting ? 'Exporting...' : 'Export' }}</span>
              </button>
            </div>
          </div>
        </section>

        <section class="iplas-compare-dialog__chip-row">
          <button
            v-for="option in comparisonFilterOptions"
            :key="option.value"
            type="button"
            class="iplas-compare-dialog__chip"
            :class="{ 'iplas-compare-dialog__chip--active': comparisonFilter === option.value }"
            @click="comparisonFilter = option.value"
          >
            <span>{{ option.title }}</span>
            <strong>{{ option.count }}</strong>
          </button>
        </section>

        <section class="iplas-compare-dialog__summary-grid">
          <button
            type="button"
            class="iplas-compare-dialog__summary-card iplas-compare-dialog__summary-card--primary iplas-compare-dialog__summary-card--clickable"
            title="Click to view Uploaded Overall Score explanation"
            @click="openOverallScoreBreakdown('upload')"
          >
            <div class="iplas-compare-dialog__summary-card-header">
              <small>Uploaded Overall Score</small>
              <Icon icon="mdi:information-outline" class="iplas-compare-dialog__info-icon" />
            </div>
            <strong>{{ formatOverallScore(uploadOverallScore) }}</strong>
            <span class="iplas-compare-dialog__summary-hint">Click for calculation details</span>
          </button>
          <button
            type="button"
            class="iplas-compare-dialog__summary-card iplas-compare-dialog__summary-card--secondary iplas-compare-dialog__summary-card--clickable"
            title="Click to view iPLAS Overall Score explanation"
            @click="openOverallScoreBreakdown('iplas')"
          >
            <div class="iplas-compare-dialog__summary-card-header">
              <small>iPLAS Overall Score</small>
              <Icon icon="mdi:information-outline" class="iplas-compare-dialog__info-icon" />
            </div>
            <strong>{{ formatOverallScore(iplasOverallScore) }}</strong>
            <span class="iplas-compare-dialog__summary-hint">Click for calculation details</span>
          </button>
        </section>

        <AppDataGrid
          :columns="comparisonGridColumns"
          :rows="filteredComparisonItems"
          dataKey="test_item"
          paginator
          :rowsPerPage="25"
          :rowsPerPageOptions="[10, 25, 50, 100]"
          :scrollHeight="isFullscreen ? 'calc(100vh - 24rem)' : '34rem'"
          :rowClass="comparisonRowClass"
          emptyMessage="No comparison rows match the current filters."
        >
          <template #cell-test_item="{ data }">
            <div class="iplas-compare-dialog__item-cell">
              <strong>{{ data.test_item }}</strong>
              <small>{{ data.status }}</small>
            </div>
          </template>

          <template #cell-usl="{ data }">
            <span class="iplas-compare-dialog__muted">{{ data.usl ?? '-' }}</span>
          </template>

          <template #cell-lsl="{ data }">
            <span class="iplas-compare-dialog__muted">{{ data.lsl ?? '-' }}</span>
          </template>

          <template #cell-upload_value="{ data }">
            <span :class="data.upload_value === null ? 'iplas-compare-dialog__muted' : ''">
              {{ data.upload_value ?? '-' }}
            </span>
          </template>

          <template #cell-iplas_value="{ data }">
            <span :class="data.iplas_value === null ? 'iplas-compare-dialog__muted' : ''">
              {{ data.iplas_value ?? '-' }}
            </span>
          </template>

          <template #cell-upload_score="{ data }">
            <button
              v-if="data.upload_score !== null"
              type="button"
              class="iplas-compare-dialog__score-pill"
              :class="scorePillClass(getScoreColor(data.upload_score))"
              @click="showScoreBreakdown(data, 'upload')"
            >
              {{ data.upload_score.toFixed(2) }}
            </button>
            <span v-else class="iplas-compare-dialog__muted">-</span>
          </template>

          <template #cell-iplas_score="{ data }">
            <button
              v-if="data.iplas_score !== null"
              type="button"
              class="iplas-compare-dialog__score-pill"
              :class="scorePillClass(getScoreColor(data.iplas_score))"
              @click="showScoreBreakdown(data, 'iplas')"
            >
              {{ data.iplas_score.toFixed(2) }}
            </button>
            <span v-else class="iplas-compare-dialog__muted">-</span>
          </template>
        </AppDataGrid>
      </template>
    </div>
  </AppDialog>

  <AppDialog
    v-model="showOverallScoreDialog"
    width="min(94vw, 56rem)"
    :breakpoints="dialogBreakpoints"
    :showFooter="false"
    :title="`${overallScoreSource === 'upload' ? 'Uploaded' : 'iPLAS'} Overall Score Breakdown`"
    description="Detailed explanation of how the overall score is aggregated across all scored test items."
    class="iplas-compare-dialog__overall-dialog"
  >
    <div class="iplas-details-subdialog">
      <section class="overall-score-explanation-card">
        <div class="overall-formula-header">
          <small>Source</small>
          <strong>{{ overallScoreSource === 'upload' ? 'Uploaded Log Measurements' : 'iPLAS Database Records' }}</strong>
        </div>
        <div class="top-product-ranking-upload-log__formula-panel">
          <div class="top-product-ranking-upload-log__metric-label">Weighted Average Formula</div>
          <div class="top-product-ranking-upload-log__formula-equation">
            Overall Score = &Sigma;(Score_i &times; Weight_i&sup2;) / &Sigma;(Weight_i&sup2;)
          </div>
          <p class="overall-formula-note">
            Each scored test item receives a score from 0.0 to 10.0. Items with custom weights contribute proportionally.
            Items without limits or disabled items are excluded from the aggregate.
          </p>
        </div>
      </section>

      <dl class="top-product-ranking-upload-log__overall-metrics">
        <div>
          <dt>Total Scored Items</dt>
          <dd>{{ overallScoreContributingItems.length }}</dd>
        </div>
        <div>
          <dt>Total Score Sum</dt>
          <dd>{{ overallScoreStats.scoreSum.toFixed(2) }}</dd>
        </div>
        <div>
          <dt>Weighted Sum</dt>
          <dd>{{ overallScoreStats.weightedSum.toFixed(2) }}</dd>
        </div>
        <div>
          <dt>Total Weight</dt>
          <dd>{{ overallScoreStats.weightSum.toFixed(2) }}</dd>
        </div>
        <div class="metric-highlight">
          <dt>Overall Score</dt>
          <dd>{{ formatOverallScore(overallScoreSource === 'upload' ? uploadOverallScore : iplasOverallScore) }}</dd>
        </div>
      </dl>

      <div class="top-product-ranking-upload-log__calculation-line">
        {{ overallScoreStats.weightedSum.toFixed(2) }} / {{ overallScoreStats.weightSum.toFixed(2) }} =
        <strong>{{ formatOverallScore(overallScoreSource === 'upload' ? uploadOverallScore : iplasOverallScore) }}</strong>
      </div>

      <div class="forced-fail-search-shell">
        <input
          v-model="overallScoreSearch"
          type="search"
          class="app-themed-input forced-fail-search-input"
          placeholder="Search scored test items..."
        />
      </div>

      <AppDataGrid
        :columns="overallScoreGridColumns"
        :rows="filteredOverallScoreItems"
        dataKey="test_item"
        paginator
        :rowsPerPage="10"
        :rowsPerPageOptions="[10, 25, 50]"
        scrollHeight="20rem"
        emptyMessage="No test items found."
      >
        <template #cell-test_item="{ data }">
          <span class="font-mono font-medium">{{ data.test_item }}</span>
        </template>
        <template #cell-value="{ data }">
          <span class="font-mono">{{ data.value ?? '-' }}</span>
        </template>
        <template #cell-usl="{ data }">
          <span class="font-mono text-muted">{{ data.usl ?? '-' }}</span>
        </template>
        <template #cell-lsl="{ data }">
          <span class="font-mono text-muted">{{ data.lsl ?? '-' }}</span>
        </template>
        <template #cell-weight="{ data }">
          <span class="font-mono">{{ data.weight?.toFixed(2) ?? '1.00' }}</span>
        </template>
        <template #cell-score="{ data }">
          <button
            v-if="data.score !== null && data.score !== undefined"
            type="button"
            class="iplas-compare-dialog__score-pill cursor-pointer border-0"
            :class="scorePillClass(getScoreColor(data.score))"
            title="Click to view score breakdown"
            @click="showScoreBreakdown(data.rawItem, overallScoreSource)"
          >
            {{ Number(data.score).toFixed(2) }}
          </button>
          <span v-else class="text-muted">-</span>
        </template>
      </AppDataGrid>

      <div class="iplas-details-dialog__footer-actions">
        <button
          type="button"
          class="iplas-compare-dialog__button iplas-compare-dialog__button--ghost"
          @click="showOverallScoreDialog = false"
        >
          Close
        </button>
      </div>
    </div>
  </AppDialog>

  <AppDialog
    v-model="showBreakdownDialog"
    v-model:fullscreen="breakdownFullscreen"
    width="min(94vw, 42rem)"
    fullscreen-width="96vw"
    :breakpoints="{ '960px': '98vw', '640px': '100vw' }"
    fullscreenable
    :showFooter="false"
    :title="`${breakdownSource === 'upload' ? 'Uploaded' : 'iPLAS'} Score Breakdown`"
    :description="breakdownItem?.test_item ?? 'Score Breakdown'"
    class="iplas-details-dialog iplas-breakdown-dialog"
  >
    <template #header>
      <div class="iplas-details-dialog__dialog-title">
        <Icon icon="mdi:table-search" />
        <h2>{{ breakdownSource === 'upload' ? 'Uploaded' : 'iPLAS' }} Score Breakdown</h2>
      </div>
    </template>

    <div v-if="breakdownItem" class="iplas-details-subdialog">
      <section class="iplas-breakdown__name-card">
        <span class="iplas-breakdown__name-text">{{ breakdownItem.test_item }}</span>
      </section>

      <section class="iplas-breakdown__rows-container">
        <div v-for="row in singleItemBreakdownRows" :key="row.key" class="iplas-breakdown__row">
          <div class="iplas-breakdown__row-left">
            <span class="iplas-breakdown__row-icon" :class="getBreakdownIconClass(row)">
              <Icon :icon="getBreakdownRowIcon(row)" />
            </span>
            <span class="iplas-breakdown__row-label">{{ row.label }}</span>
          </div>
          <div class="iplas-breakdown__row-right">
            <span
              v-if="row.valueTone === 'score'"
              class="iplas-compare-dialog__score-pill"
              :class="scorePillClass(getScoreColor(Number(row.value) || 0))"
            >
              {{ row.value }}
            </span>
            <span
              v-else-if="row.valueTone === 'algorithm'"
              class="iplas-breakdown__value-pill iplas-breakdown__value-pill--cool"
            >
              {{ row.value }}
            </span>
            <span
              v-else-if="row.valueTone === 'policy'"
              class="iplas-breakdown__value-pill iplas-breakdown__value-pill--neutral"
            >
              {{ row.value }}
            </span>
            <span
              v-else
              :class="[row.valueTone === 'warning' ? 'iplas-breakdown__value--warning' : '', 'iplas-breakdown__value-text']"
            >
              {{ row.value }}
            </span>
          </div>
        </div>
      </section>

      <details class="iplas-details-dialog__explanation-card" open>
        <summary>
          <span>
            <Icon icon="mdi:help-circle-outline" /> Detailed Score Calculation
          </span>
        </summary>
        <div class="iplas-details-dialog__explanation-body">
          <div class="score-formula-panel score-formula-panel--compact">
            <div class="iplas-details-dialog__metric-label">Algorithm: {{ breakdownScoringTypeLabel }}</div>
            <div class="score-formula-equation">{{ getScoringFormula(breakdownScoringType) }}</div>
            
            <div v-if="calculationSteps.length > 0" class="score-calculation-steps">
              <div class="score-calculation-step-title">Step-by-Step Calculation:</div>
              <ul class="score-calculation-step-list">
                <li v-for="(step, idx) in calculationSteps" :key="idx">
                  <code>{{ step }}</code>
                </li>
              </ul>
            </div>

            <dl class="score-formula-variable-list">
              <template v-for="variable in getScoringFormulaVariables(breakdownScoringType)" :key="variable.key">
                <dt>{{ variable.key }}</dt>
                <dd>{{ variable.value }}</dd>
              </template>
            </dl>
          </div>
          <p class="score-algorithm-desc">{{ getScoringTypeDescription(breakdownScoringType) }}</p>
        </div>
      </details>
    </div>

    <template #footer>
      <div class="iplas-details-dialog__footer-actions">
        <button
          type="button"
          class="iplas-details-dialog__button iplas-details-dialog__button--ghost"
          @click="showBreakdownDialog = false"
        >
          Close
        </button>
      </div>
    </template>
  </AppDialog>

  <UploadScoringConfigDialog
    v-model="showScoringConfig"
    :test-items="scoringDialogTestItems"
    :existing-configs="localScoringConfigs"
    @apply="handleScoringConfigApply"
  />
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import { SCORING_TYPE_INFO, type ScoringType } from '@/features/dut/types/scoring.types'
import type { IplasIsnTestItem } from '@/features/dut-logs/api/iplasProxyApi'
import { useIplasApi } from '@/features/dut-logs/composables/useIplasApi'
import type {
  ParsedTestItemEnhanced,
  RescoreItemResult,
  RescoreScoringConfig,
  UploadLogScopeMode,
  UploadScoringConfigApplyPayload,
} from '@/features/dut-logs/composables/useTestLogUpload'
import { useTestLogUpload } from '@/features/dut-logs/composables/useTestLogUpload'
import { AppDataGrid, AppDialog, AppSelect } from '@/shared'
import { buildTopProductWorkbook, downloadTopProductWorkbook } from '../utils/topProductExcelExport'
import UploadScoringConfigDialog from './UploadScoringConfigDialog.vue'

const props = defineProps<{
  modelValue: boolean
  isn: string | null
  uploadTestItems: ParsedTestItemEnhanced[]
  scoringConfigs?: RescoreScoringConfig[]
  scopeMode?: UploadLogScopeMode
  includedTestItemNames?: string[]
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
  upload_scoring_type?: string
  iplas_scoring_type?: string
  upload_target?: number | null
  iplas_target?: number | null
  upload_deviation?: number | null
  iplas_deviation?: number | null
  upload_weight?: number
  iplas_weight?: number
  status: 'match' | 'upload-only' | 'iplas-only'
}

const { searchByIsn } = useIplasApi()
const { rescoreItems } = useTestLogUpload()

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const dialogBreakpoints = {
  '1400px': '96vw',
  '960px': '98vw',
  '640px': '100vw',
}

const loading = ref(false)
const exporting = ref(false)
const isFullscreen = ref(false)
const errorMessage = ref<string | null>(null)
const iplasTestItems = ref<IplasIsnTestItem[]>([])
const comparisonFilter = ref<'match' | 'mismatch' | 'upload-only' | 'iplas-only' | 'all'>('match')
const searchQuery = ref('')
const typeFilter = ref('all')
const scoreFilter = ref('all')

const showBreakdownDialog = ref(false)
const breakdownFullscreen = ref(false)
const breakdownItem = ref<ComparisonItem | null>(null)
const breakdownSource = ref<'upload' | 'iplas'>('upload')

const uploadScoredMap = ref<Map<string, RescoreItemResult>>(new Map())
const iplasScoredMap = ref<Map<string, RescoreItemResult>>(new Map())
const uploadOverallScore = ref<number | null>(null)
const iplasOverallScore = ref<number | null>(null)

const showOverallScoreDialog = ref(false)
const overallScoreSource = ref<'upload' | 'iplas'>('upload')
const overallScoreSearch = ref('')

function openOverallScoreBreakdown(source: 'upload' | 'iplas') {
  overallScoreSource.value = source
  overallScoreSearch.value = ''
  showOverallScoreDialog.value = true
}

const showScoringConfig = ref(false)
const localScoringConfigs = ref<RescoreScoringConfig[]>([])
const localScopeMode = ref<UploadLogScopeMode>('default')
const localIncludedTestItemNames = ref<string[]>([])

const customScoringCount = computed(
  () =>
    localScoringConfigs.value.filter(
      (config) => config.enabled && config.scoring_type !== 'symmetrical',
    ).length,
)

const scoringDialogTestItems = computed<ParsedTestItemEnhanced[]>(() => {
  const items: ParsedTestItemEnhanced[] = []
  const seenKeys = new Set<string>()

  props.uploadTestItems.forEach((item) => {
    const key = item.test_item.toLowerCase()
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      items.push({ ...item })
    }
  })

  iplasTestItems.value.forEach((iplasItem) => {
    const key = iplasItem.NAME.toLowerCase()
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      items.push({
        test_item: iplasItem.NAME,
        value: iplasItem.VALUE,
        usl: iplasItem.UCL ? parseFloat(iplasItem.UCL) : null,
        lsl: iplasItem.LCL ? parseFloat(iplasItem.LCL) : null,
        is_value_type: true,
        numeric_value: parseFloat(iplasItem.VALUE) || null,
        is_hex: false,
        hex_decimal: null,
        matched_criteria: false,
        target: null,
        score: null,
        score_breakdown: null,
      })
    }
  })

  return items
})

function handleScoringConfigApply(payload: UploadScoringConfigApplyPayload) {
  localScoringConfigs.value = payload.configs
  localScopeMode.value = payload.scopeMode
  localIncludedTestItemNames.value = payload.includedTestItems
  rescoreAllItems()
}

function initializeScoringConfigs() {
  const allTestItems = new Set<string>()
  props.uploadTestItems.forEach((item) => allTestItems.add(item.test_item))
  iplasTestItems.value.forEach((item) => allTestItems.add(item.NAME))

  const existingMap = new Map<string, RescoreScoringConfig>()
  if (props.scoringConfigs && props.scoringConfigs.length > 0) {
    props.scoringConfigs.forEach((config) => existingMap.set(config.test_item_name, config))
  }

  localScoringConfigs.value = Array.from(allTestItems).map((name) => {
    const existing = existingMap.get(name)
    if (existing) {
      return { ...existing }
    }

    return {
      test_item_name: name,
      scoring_type: 'symmetrical' as const,
      enabled: true,
      weight: 1.0,
      policy: 'symmetrical' as const,
    }
  })
}

const typeFilterOptions = [
  { title: 'Show All', value: 'all' },
  { title: 'Criteria', value: 'criteria' },
  { title: 'Non-Criteria', value: 'non-criteria' },
]

const scoreFilterOptions = [
  { title: 'All Scores', value: 'all' },
  { title: 'Score >= 9', value: 'gte9' },
  { title: 'Score 7-9', value: '7to9' },
  { title: 'Score < 7', value: 'lt7' },
  { title: 'Has Score', value: 'hasScore' },
  { title: 'No Score', value: 'noScore' },
]

const typeFilterSelectOptions = typeFilterOptions.map((option) => ({
  label: option.title,
  value: option.value,
}))

const scoreFilterSelectOptions = scoreFilterOptions.map((option) => ({
  label: option.title,
  value: option.value,
}))

const comparisonGridColumns = [
  {
    key: 'test_item',
    field: 'test_item',
    header: 'Test Item',
    sortable: true,
    style: { width: '18rem' },
  },
  { key: 'usl', field: 'usl', header: 'UCL', sortable: true, style: { width: '7rem' } },
  { key: 'lsl', field: 'lsl', header: 'LCL', sortable: true, style: { width: '7rem' } },
  {
    key: 'upload_value',
    field: 'upload_value',
    header: 'Uploaded Value',
    sortable: true,
    style: { width: '10rem' },
  },
  {
    key: 'iplas_value',
    field: 'iplas_value',
    header: 'iPLAS Value',
    sortable: true,
    style: { width: '10rem' },
  },
  {
    key: 'upload_score',
    field: 'upload_score',
    header: 'Uploaded Score',
    sortable: true,
    style: { width: '9rem' },
  },
  {
    key: 'iplas_score',
    field: 'iplas_score',
    header: 'iPLAS Score',
    sortable: true,
    style: { width: '9rem' },
  },
]

const breakdownScoringType = computed(() => {
  if (!breakdownItem.value) return 'symmetrical'
  return breakdownSource.value === 'upload'
    ? breakdownItem.value.upload_scoring_type || 'symmetrical'
    : breakdownItem.value.iplas_scoring_type || 'symmetrical'
})

const breakdownTarget = computed<number | null>(() => {
  if (!breakdownItem.value) return null
  return (
    (breakdownSource.value === 'upload'
      ? breakdownItem.value.upload_target
      : breakdownItem.value.iplas_target) ?? null
  )
})

const breakdownDeviation = computed<number | null>(() => {
  if (!breakdownItem.value) return null
  return (
    (breakdownSource.value === 'upload'
      ? breakdownItem.value.upload_deviation
      : breakdownItem.value.iplas_deviation) ?? null
  )
})

function formatScoringTypeLabel(type: string): string {
  switch (type) {
    case 'symmetrical':
      return 'Target Centered (Symmetrical)'
    case 'asymmetrical':
      return 'Custom Target (Asymmetrical)'
    case 'per_mask':
      return 'Near Zero (PER/MASK)'
    case 'evm':
      return 'EVM (Decay)'
    case 'throughput':
      return 'Throughput (Higher is Better)'
    case 'binary':
      return 'Binary (PASS/FAIL)'
    default:
      return type
  }
}

const breakdownScoringTypeLabel = computed(() => {
  return formatScoringTypeLabel(breakdownScoringType.value)
})

const singleItemBreakdownRows = computed(() => {
  if (!breakdownItem.value) return []
  const item = breakdownItem.value
  const isUpload = breakdownSource.value === 'upload'

  const score = isUpload ? item.upload_score : item.iplas_score
  const value = isUpload ? item.upload_value : item.iplas_value
  const scoringType = isUpload
    ? item.upload_scoring_type || 'symmetrical'
    : item.iplas_scoring_type || 'symmetrical'
  const target = isUpload ? item.upload_target : item.iplas_target
  const deviation = isUpload ? item.upload_deviation : item.iplas_deviation
  const weight = isUpload ? item.upload_weight : item.iplas_weight

  const rows: Array<{
    key: string
    label: string
    value: string
    valueTone?: 'score' | 'algorithm' | 'policy' | 'warning'
  }> = [
    {
      key: 'scoring_type',
      label: 'Scoring Algorithm',
      value: formatScoringTypeLabel(scoringType),
      valueTone: 'algorithm',
    },
  ]

  if (item.usl !== null && item.usl !== undefined) {
    rows.push({ key: 'ucl', label: 'UCL (Upper Limit)', value: String(item.usl) })
  }
  if (item.lsl !== null && item.lsl !== undefined) {
    rows.push({ key: 'lcl', label: 'LCL (Lower Limit)', value: String(item.lsl) })
  }
  if (target !== null && target !== undefined) {
    rows.push({ key: 'target', label: 'Target', value: target.toFixed(4) })
  }
  if (value !== null && value !== undefined) {
    rows.push({ key: 'actual', label: 'Measured Value', value: String(value) })
  }
  if (deviation !== null && deviation !== undefined) {
    rows.push({
      key: 'deviation',
      label: 'Deviation',
      value: deviation.toFixed(4),
      valueTone: Math.abs(deviation) > 1 ? 'warning' : undefined,
    })
  }

  rows.push({ key: 'weight', label: 'Weight', value: String(weight ?? 1.0) })
  rows.push({
    key: 'score',
    label: 'Score (0-10)',
    value: score !== null && score !== undefined ? score.toFixed(2) : 'N/A',
    valueTone: 'score',
  })

  return rows
})

function getBreakdownRowIcon(row: { key: string }): string {
  const iconMap: Record<string, string> = {
    scoring_type: 'mdi:function-variant',
    ucl: 'mdi:arrow-collapse-up',
    lcl: 'mdi:arrow-collapse-down',
    target: 'mdi:crosshairs-gps',
    actual: 'mdi:numeric',
    deviation: 'mdi:delta',
    policy: 'mdi:compass-outline',
    weight: 'mdi:weight',
    score: 'mdi:star',
  }
  return iconMap[row.key] || 'mdi:information-outline'
}

function getBreakdownIconClass(row: { key: string }): string {
  const classMap: Record<string, string> = {
    scoring_type: 'iplas-breakdown__row-icon--purple',
    ucl: 'iplas-breakdown__row-icon--red',
    lcl: 'iplas-breakdown__row-icon--orange',
    target: 'iplas-breakdown__row-icon--green',
    actual: 'iplas-breakdown__row-icon--blue',
    deviation: 'iplas-breakdown__row-icon--amber',
    policy: 'iplas-breakdown__row-icon--muted',
    weight: 'iplas-breakdown__row-icon--muted',
    score: 'iplas-breakdown__row-icon--star',
  }
  return classMap[row.key] || 'iplas-breakdown__row-icon--muted'
}

function getScoringFormula(scoringType?: string): string {
  const type = (scoringType as ScoringType) || 'binary'
  const latex = SCORING_TYPE_INFO[type]?.formulaLatex
  if (latex) {
    return latex
      .replace(/\\cdot/g, 'x')
      .replace(/\\frac\{L - \|x - T\|\}\{L\}/g, '(L - |x - T|) / L')
      .replace(/\\frac\{L - d\}\{L\}/g, '(L - d) / L')
      .replace(/\\frac\{UCL - x\}\{UCL\}/g, '(UCL - x) / UCL')
      .replace(
        /\\left\(1 - \\frac\{x - ref\}\{UCL - ref\}\\right\)\^\{0\.25\}/g,
        '(1 - (x - ref) / (UCL - ref))^0.25',
      )
      .replace(
        /\\begin\{cases\} 10\.0 & \\text\{STATUS\} = \\text\{PASS\} \\\\ 0\.0 & \\text\{STATUS\} = \\text\{FAIL\} \\end\{cases\}/g,
        '10.0 if STATUS = PASS, 0.0 if STATUS = FAIL',
      )
  }
  const formulas: Record<string, string> = {
    symmetrical: 'Score = 1 + 9 x (L - |x - T|) / L',
    asymmetrical: 'Score = 1 + 9 x (L - d) / L',
    per_mask: 'Score = 1 + 9 x (UCL - x) / UCL',
    evm: 'Score = 1 + 9 x (1 - (x - ref) / (UCL - ref))^0.25',
    throughput: 'Score = 1 + 9 x (x - LCL) / (UCL - LCL)',
    binary: '10.0 if PASS, 0.0 if FAIL',
  }
  return formulas[type] || 'Score calculation based on criteria limits'
}

function getScoringFormulaVariables(scoringType?: string): Array<{ key: string; value: string }> {
  const type = (scoringType as ScoringType) || 'binary'
  const variables = SCORING_TYPE_INFO[type]?.variables
  if (!variables) {
    return []
  }
  return Object.entries(variables).map(([key, value]) => ({
    key,
    value: value.replace(/\\frac\{UCL \+ LCL\}\{2\}/g, '(UCL + LCL) / 2'),
  }))
}

function getScoringTypeDescription(type: string): string {
  switch (type) {
    case 'symmetrical':
      return 'Target is centered midpoint between UCL and LCL. Score is 10 at target and scales down to 1 at limits.'
    case 'asymmetrical':
      return 'Custom user target with policy (higher/lower/symmetrical). Deviation is measured from target toward limit.'
    case 'per_mask':
      return 'Near-zero scoring for PER/MASK test items where 0 is ideal and higher values toward UCL decrease the score.'
    case 'evm':
      return 'EVM scoring with exponential decay curve from reference best (-35 dB) toward UCL limit.'
    case 'throughput':
      return 'Throughput scoring where higher values above LCL yield higher scores.'
    case 'binary':
      return 'Simple status check: PASS gives 10.0, FAIL gives 0.0.'
    default:
      return 'Standard criteria-based scoring algorithm.'
  }
}

const calculationSteps = computed<string[]>(() => {
  if (!breakdownItem.value) return []
  const item = breakdownItem.value
  const isUpload = breakdownSource.value === 'upload'
  const type = (breakdownScoringType.value as ScoringType) || 'symmetrical'
  const valStr = isUpload ? item.upload_value : item.iplas_value
  const x = valStr !== null ? parseFloat(valStr) : null
  const usl = item.usl
  const lsl = item.lsl
  const target = breakdownTarget.value
  const dev = breakdownDeviation.value
  const score = isUpload ? item.upload_score : item.iplas_score

  if (x === null || Number.isNaN(x)) {
    return ['Non-numeric value: Binary PASS/FAIL rules apply']
  }

  const steps: string[] = []

  if (type === 'symmetrical') {
    if (usl !== null && lsl !== null) {
      const T = target ?? (usl + lsl) / 2
      const L = (usl - lsl) / 2
      const d = dev !== null ? Math.abs(dev) : Math.abs(x - T)
      const raw = L > 0 ? 1 + 9 * ((L - d) / L) : 10
      steps.push(`Target T = (${usl} + ${lsl}) / 2 = ${T.toFixed(4)}`)
      steps.push(`Distance to limit L = (${usl} - ${lsl}) / 2 = ${L.toFixed(4)}`)
      steps.push(`Distance to target d = |${x} - ${T.toFixed(4)}| = ${d.toFixed(4)}`)
      steps.push(
        `Raw Score = 1 + 9 x (${L.toFixed(4)} - ${d.toFixed(4)}) / ${L.toFixed(4)} = ${raw.toFixed(4)}`,
      )
      steps.push(
        `Final Score (clamped 0-10) = ${score !== null && score !== undefined ? score.toFixed(2) : Math.max(0, Math.min(10, raw)).toFixed(2)}`,
      )
    }
  } else if (type === 'per_mask') {
    if (usl !== null && usl > 0) {
      const raw = 1 + 9 * ((usl - x) / usl)
      steps.push(`UCL = ${usl}, Measured value x = ${x}`)
      steps.push(`Raw Score = 1 + 9 x (${usl} - ${x}) / ${usl} = ${raw.toFixed(4)}`)
      steps.push(
        `Final Score (clamped 0-10) = ${score !== null && score !== undefined ? score.toFixed(2) : Math.max(0, Math.min(10, raw)).toFixed(2)}`,
      )
    }
  } else if (type === 'evm') {
    if (usl !== null) {
      const ref = -35
      const ratio = (x - ref) / (usl - ref)
      steps.push(`Reference best = ${ref} dB, UCL = ${usl} dB, Measured x = ${x} dB`)
      if (ratio >= 0 && ratio <= 1) {
        const decay = (1 - ratio) ** 0.25
        const raw = 1 + 9 * decay
        steps.push(
          `Normalized ratio = (${x} - (${ref})) / (${usl} - (${ref})) = ${ratio.toFixed(4)}`,
        )
        steps.push(`Decay = (1 - ${ratio.toFixed(4)})^0.25 = ${decay.toFixed(4)}`)
        steps.push(`Score = 1 + 9 x ${decay.toFixed(4)} = ${raw.toFixed(4)}`)
      }
      steps.push(
        `Final Score = ${score !== null && score !== undefined ? score.toFixed(2) : '10.00'}`,
      )
    }
  } else if (type === 'asymmetrical') {
    if (target !== null && (usl !== null || lsl !== null)) {
      const T = target
      const d = dev !== null ? Math.abs(dev) : Math.abs(x - T)
      steps.push(`User Target T = ${T.toFixed(4)}, Measured value x = ${x}`)
      steps.push(`Deviation d = |${x} - ${T.toFixed(4)}| = ${d.toFixed(4)}`)
      steps.push(
        `Final Score = ${score !== null && score !== undefined ? score.toFixed(2) : '10.00'}`,
      )
    }
  } else if (type === 'throughput') {
    if (usl !== null && lsl !== null && usl > lsl) {
      const raw = 1 + 9 * ((x - lsl) / (usl - lsl))
      steps.push(`LCL = ${lsl}, UCL = ${usl}, Measured x = ${x}`)
      steps.push(`Score = 1 + 9 x (${x} - ${lsl}) / (${usl} - ${lsl}) = ${raw.toFixed(4)}`)
      steps.push(
        `Final Score = ${score !== null && score !== undefined ? score.toFixed(2) : Math.max(0, Math.min(10, raw)).toFixed(2)}`,
      )
    }
  } else {
    steps.push('Binary check: Status = PASS gives 10.0, FAIL gives 0.0')
    steps.push(`Final Score = ${score !== null && score !== undefined ? score.toFixed(2) : '0.00'}`)
  }

  return steps
})

const comparisonItems = computed<ComparisonItem[]>(() => {
  const items: ComparisonItem[] = []
  const uploadItemMap = new Map<string, ParsedTestItemEnhanced>()
  const iplasItemMap = new Map<string, IplasIsnTestItem>()
  const processedKeys = new Set<string>()
  const includedNames = new Set(localIncludedTestItemNames.value.map((name) => name.toLowerCase()))
  const configMap = new Map(
    localScoringConfigs.value.map((config) => [config.test_item_name.toLowerCase(), config]),
  )

  const isIncludedTestItem = (name: string): boolean => {
    if (localScopeMode.value === 'include') {
      return includedNames.has(name.toLowerCase())
    }

    if (localScopeMode.value === 'exclude') {
      return configMap.get(name.toLowerCase())?.enabled !== false
    }

    return true
  }

  props.uploadTestItems.forEach((item) => {
    if (!isIncludedTestItem(item.test_item)) return
    uploadItemMap.set(item.test_item.toLowerCase(), item)
  })

  iplasTestItems.value.forEach((item) => {
    if (!isIncludedTestItem(item.NAME)) return
    iplasItemMap.set(item.NAME.toLowerCase(), item)
  })

  const buildComparisonItem = (testItemKey: string): ComparisonItem => {
    const uploadItem = uploadItemMap.get(testItemKey)
    const iplasItem = iplasItemMap.get(testItemKey)

    let status: ComparisonItem['status']
    if (uploadItem && iplasItem) {
      status = 'match'
    } else if (uploadItem) {
      status = 'upload-only'
    } else {
      status = 'iplas-only'
    }

    const uploadScored = uploadScoredMap.value.get(testItemKey)
    const iplasScored = iplasScoredMap.value.get(testItemKey)

    return {
      test_item: uploadItem?.test_item || iplasItem?.NAME || testItemKey,
      usl: uploadItem?.usl ?? (iplasItem?.UCL ? parseFloat(iplasItem.UCL) : null),
      lsl: uploadItem?.lsl ?? (iplasItem?.LCL ? parseFloat(iplasItem.LCL) : null),
      upload_value: uploadItem?.value ?? null,
      iplas_value: iplasItem?.VALUE ?? null,
      upload_score: uploadScored?.score ?? uploadItem?.score ?? null,
      iplas_score: iplasScored?.score ?? null,
      upload_scoring_type: uploadScored?.scoring_type ?? 'symmetrical',
      iplas_scoring_type: iplasScored?.scoring_type ?? 'symmetrical',
      upload_target: uploadScored?.target ?? null,
      iplas_target: iplasScored?.target ?? null,
      upload_deviation: uploadScored?.deviation ?? null,
      iplas_deviation: iplasScored?.deviation ?? null,
      upload_weight: uploadScored?.weight ?? 1,
      iplas_weight: iplasScored?.weight ?? 1,
      status,
    }
  }

  props.uploadTestItems.forEach((item) => {
    const key = item.test_item.toLowerCase()
    if (!processedKeys.has(key)) {
      processedKeys.add(key)
      items.push(buildComparisonItem(key))
    }
  })

  iplasTestItems.value.forEach((item) => {
    const key = item.NAME.toLowerCase()
    if (!processedKeys.has(key)) {
      processedKeys.add(key)
      items.push(buildComparisonItem(key))
    }
  })

  return items
})

const filteredComparisonItems = computed(() => {
  let items = comparisonItems.value

  if (comparisonFilter.value === 'match') {
    items = items.filter((item) => item.status === 'match')
  } else if (comparisonFilter.value === 'mismatch') {
    items = items.filter((item) => item.status === 'upload-only' || item.status === 'iplas-only')
  } else if (comparisonFilter.value === 'upload-only') {
    items = items.filter((item) => item.status === 'match' || item.status === 'upload-only')
  } else if (comparisonFilter.value === 'iplas-only') {
    items = items.filter((item) => item.status === 'match' || item.status === 'iplas-only')
  }

  if (typeFilter.value === 'criteria') {
    items = items.filter((item) => item.usl !== null || item.lsl !== null)
  } else if (typeFilter.value === 'non-criteria') {
    items = items.filter((item) => item.usl === null && item.lsl === null)
  }

  if (scoreFilter.value === 'gte9') {
    items = items.filter((item) => item.upload_score !== null && item.upload_score >= 9)
  } else if (scoreFilter.value === '7to9') {
    items = items.filter(
      (item) => item.upload_score !== null && item.upload_score >= 7 && item.upload_score < 9,
    )
  } else if (scoreFilter.value === 'lt7') {
    items = items.filter((item) => item.upload_score !== null && item.upload_score < 7)
  } else if (scoreFilter.value === 'hasScore') {
    items = items.filter((item) => item.upload_score !== null)
  } else if (scoreFilter.value === 'noScore') {
    items = items.filter((item) => item.upload_score === null)
  }

  if (searchQuery.value) {
    try {
      const regex = new RegExp(searchQuery.value, 'i')
      items = items.filter((item) => regex.test(item.test_item))
    } catch {
      const query = searchQuery.value.toLowerCase()
      items = items.filter((item) => item.test_item.toLowerCase().includes(query))
    }
  }

  return items
})

const matchCount = computed(
  () => comparisonItems.value.filter((item) => item.status === 'match').length,
)
const mismatchCount = computed(
  () =>
    comparisonItems.value.filter(
      (item) => item.status === 'upload-only' || item.status === 'iplas-only',
    ).length,
)
const uploadOnlyCount = computed(
  () =>
    comparisonItems.value.filter((item) => item.status === 'match' || item.status === 'upload-only')
      .length,
)
const iplasOnlyCount = computed(
  () =>
    comparisonItems.value.filter((item) => item.status === 'match' || item.status === 'iplas-only')
      .length,
)

const comparisonFilterOptions = computed(() => [
  { title: 'Match Items', value: 'match' as const, count: matchCount.value },
  { title: 'Mismatch Items', value: 'mismatch' as const, count: mismatchCount.value },
  { title: 'Uploaded Items', value: 'upload-only' as const, count: uploadOnlyCount.value },
  { title: 'iPLAS Items', value: 'iplas-only' as const, count: iplasOnlyCount.value },
  { title: 'All Items', value: 'all' as const, count: comparisonItems.value.length },
])

const overallScoreContributingItems = computed(() => {
  const isUpload = overallScoreSource.value === 'upload'
  return filteredComparisonItems.value
    .filter((item) => {
      const score = isUpload ? item.upload_score : item.iplas_score
      return score !== null && score !== undefined
    })
    .map((item) => ({
      test_item: item.test_item,
      value: isUpload ? item.upload_value : item.iplas_value,
      usl: item.usl,
      lsl: item.lsl,
      weight: isUpload ? (item.upload_weight ?? 1.0) : (item.iplas_weight ?? 1.0),
      score: isUpload ? item.upload_score : item.iplas_score,
      rawItem: item,
    }))
})

const filteredOverallScoreItems = computed(() => {
  const query = overallScoreSearch.value.trim().toLowerCase()
  if (!query) {
    return overallScoreContributingItems.value
  }
  return overallScoreContributingItems.value.filter((item) =>
    item.test_item.toLowerCase().includes(query),
  )
})

const overallScoreStats = computed(() => {
  const items = overallScoreContributingItems.value
  if (items.length === 0) {
    return { scoreSum: 0, weightedSum: 0, weightSum: 0 }
  }

  let scoreSum = 0
  let weightedSum = 0
  let weightSum = 0

  items.forEach((item) => {
    const score = item.score ?? 0
    const w = item.weight ?? 1.0
    const effWeight = w * w
    scoreSum += score
    weightedSum += score * effWeight
    weightSum += effWeight
  })

  return {
    scoreSum,
    weightedSum,
    weightSum: weightSum > 0 ? weightSum : 1,
  }
})

const overallScoreGridColumns = [
  {
    key: 'test_item',
    field: 'test_item',
    header: 'Test Item',
    sortable: true,
    style: { width: '18rem' },
  },
  { key: 'value', field: 'value', header: 'Value', sortable: true, style: { width: '8rem' } },
  { key: 'usl', field: 'usl', header: 'UCL', sortable: true, style: { width: '7rem' } },
  { key: 'lsl', field: 'lsl', header: 'LCL', sortable: true, style: { width: '7rem' } },
  { key: 'weight', field: 'weight', header: 'Weight', sortable: true, style: { width: '6rem' } },
  { key: 'score', field: 'score', header: 'Score', sortable: true, style: { width: '8rem' } },
]

function showScoreBreakdown(item: ComparisonItem, source: 'upload' | 'iplas') {
  breakdownItem.value = item
  breakdownSource.value = source
  showBreakdownDialog.value = true
}

function formatOverallScore(score: number | null): string {
  return score === null ? 'N/A' : score.toFixed(2)
}

async function rescoreAllItems() {
  if (localScoringConfigs.value.length === 0) return

  const explicitlyConfigured = new Set(
    localScoringConfigs.value.map((config) => config.test_item_name),
  )

  try {
    const uploadItems = props.uploadTestItems
      .filter((item) => {
        const hasCriteria = item.usl !== null || item.lsl !== null
        return hasCriteria || explicitlyConfigured.has(item.test_item)
      })
      .map((item) => ({
        test_item: item.test_item,
        value: item.value,
        usl: item.usl,
        lsl: item.lsl,
        status: 'PASS',
      }))

    if (uploadItems.length > 0) {
      const uploadResult = await rescoreItems(uploadItems, localScoringConfigs.value)
      uploadScoredMap.value.clear()
      uploadResult.test_item_scores.forEach((score) => {
        uploadScoredMap.value.set(score.test_item.toLowerCase(), score)
      })
      uploadOverallScore.value = uploadResult.overall_score
    } else {
      uploadScoredMap.value.clear()
      uploadOverallScore.value = null
    }

    const iplasItems = iplasTestItems.value
      .filter((item) => {
        const hasCriteria = (item.UCL && item.UCL !== '') || (item.LCL && item.LCL !== '')
        return hasCriteria || explicitlyConfigured.has(item.NAME)
      })
      .map((item) => ({
        test_item: item.NAME,
        value: item.VALUE,
        usl: item.UCL ? parseFloat(item.UCL) : null,
        lsl: item.LCL ? parseFloat(item.LCL) : null,
        status: item.STATUS || 'PASS',
      }))

    if (iplasItems.length > 0) {
      const iplasResult = await rescoreItems(iplasItems, localScoringConfigs.value)
      iplasScoredMap.value.clear()
      iplasResult.test_item_scores.forEach((score) => {
        iplasScoredMap.value.set(score.test_item.toLowerCase(), score)
      })
      iplasOverallScore.value = iplasResult.overall_score
    } else {
      iplasScoredMap.value.clear()
      iplasOverallScore.value = null
    }
  } catch (error) {
    console.error('Failed to rescore items:', error)
    uploadOverallScore.value = null
    iplasOverallScore.value = null
  }
}

watch(dialogOpen, (isOpen) => {
  if (!isOpen) {
    isFullscreen.value = false
    breakdownFullscreen.value = false
    showBreakdownDialog.value = false
  }
})

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen && props.isn) {
      loading.value = true
      errorMessage.value = null
      iplasTestItems.value = []
      uploadScoredMap.value.clear()
      iplasScoredMap.value.clear()
      uploadOverallScore.value = null
      iplasOverallScore.value = null
      searchQuery.value = ''
      typeFilter.value = 'all'
      scoreFilter.value = 'all'
      comparisonFilter.value = 'match'

      try {
        const results = await searchByIsn(props.isn)
        if (results && results.length > 0) {
          const allItems: IplasIsnTestItem[] = []
          results.forEach((record) => {
            if (record.test_item) {
              allItems.push(...record.test_item)
            }
          })
          iplasTestItems.value = allItems
        }

        initializeScoringConfigs()
        localScopeMode.value = props.scopeMode ?? 'default'
        localIncludedTestItemNames.value = [...(props.includedTestItemNames || [])]
        await rescoreAllItems()
      } catch (error: unknown) {
        errorMessage.value = error instanceof Error ? error.message : 'Failed to fetch iPLAS data'
      } finally {
        loading.value = false
      }
    }
  },
)

function getScoreColor(score: number): string {
  if (score >= 9) return 'success'
  if (score >= 7) return 'info'
  if (score >= 6) return 'warning'
  return 'error'
}

async function exportToExcel() {
  exporting.value = true
  try {
    const createRecord = (source: 'upload' | 'iplas') => ({
      isn: `${props.isn || 'UNKNOWN'} (${source === 'upload' ? 'UPLOAD' : 'ONLINE'})`,
      project: '',
      tsp: props.isn || 'Comparison',
      deviceId: '',
      errorCode: '',
      errorName: 'N/A',
      type: source === 'upload' ? 'OFFLINE' : 'ONLINE',
      testStartTime: '',
      testEndTime: '',
      station: props.isn || 'Comparison',
      overallScore: source === 'upload' ? uploadOverallScore.value : iplasOverallScore.value,
      sourceOrder: source === 'upload' ? 0 : 1,
      items: filteredComparisonItems.value
        .filter((item) =>
          source === 'upload' ? item.status !== 'iplas-only' : item.status !== 'upload-only',
        )
        .map((item) => ({
          testItem: item.test_item,
          ucl: item.usl,
          lcl: item.lsl,
          target: source === 'upload' ? (item.upload_target ?? null) : (item.iplas_target ?? null),
          weight: source === 'upload' ? (item.upload_weight ?? 1) : (item.iplas_weight ?? 1),
          value: source === 'upload' ? item.upload_value : item.iplas_value,
          deviation:
            source === 'upload' ? (item.upload_deviation ?? null) : (item.iplas_deviation ?? null),
          score: source === 'upload' ? (item.upload_score ?? null) : (item.iplas_score ?? null),
        })),
    })

    const workbook = await buildTopProductWorkbook([createRecord('upload'), createRecord('iplas')])

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `iPLAS_Compare_${props.isn}_${timestamp}.xlsx`
    await downloadTopProductWorkbook(workbook, filename)
  } catch (error: unknown) {
    console.error('Export failed:', error)
    errorMessage.value = `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
  } finally {
    exporting.value = false
  }
}

function scorePillClass(color: string) {
  switch (color) {
    case 'success':
      return 'iplas-compare-dialog__score-pill--success'
    case 'info':
      return 'iplas-compare-dialog__score-pill--info'
    case 'warning':
      return 'iplas-compare-dialog__score-pill--warning'
    default:
      return 'iplas-compare-dialog__score-pill--error'
  }
}

function comparisonRowClass(row: Record<string, unknown>) {
  const status = String(row.status || '')
  if (status === 'upload-only' || status === 'iplas-only') {
    return 'iplas-compare-dialog__row--mismatch'
  }
  return undefined
}
</script>

<style scoped>
.iplas-compare-dialog__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.iplas-compare-dialog__header-copy {
  display: flex;
  gap: 0.85rem;
}

.iplas-compare-dialog__header-icon {
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.iplas-compare-dialog__eyebrow {
  margin: 0 0 0.3rem;
  color: var(--app-accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.iplas-compare-dialog__header h2 {
  margin: 0;
  font-size: 1.35rem;
}

.iplas-compare-dialog__header p:last-child {
  margin: 0.35rem 0 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.iplas-compare-dialog__header-actions,
.iplas-compare-dialog__action-row,
.iplas-compare-dialog__chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.iplas-compare-dialog__body {
  display: grid;
  gap: 1rem;
}

.iplas-compare-dialog__body--fullscreen {
  min-height: calc(100vh - 12rem);
}

.iplas-compare-dialog__controls,
.iplas-compare-dialog__summary-grid,
.iplas-compare-dialog__breakdown-grid {
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
}

.iplas-compare-dialog__field {
  display: grid;
  gap: 0.45rem;
}

.iplas-compare-dialog__field--wide {
  grid-column: span 2;
}

.iplas-compare-dialog__field--actions {
  justify-content: end;
}

.iplas-compare-dialog__field span {
  color: var(--app-ink);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.iplas-compare-dialog__field input,
.iplas-compare-dialog__field select {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  padding: 0.72rem 0.82rem;
  background: var(--app-panel);
  color: var(--app-ink);
}

.iplas-compare-dialog__button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 999px;
  padding: 0.62rem 0.9rem;
  font-weight: 700;
  cursor: pointer;
}

.iplas-compare-dialog__button--ghost {
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-ink);
}

.iplas-compare-dialog__button--primary {
  border: 1px solid rgba(15, 118, 110, 0.1);
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.95), rgba(40, 96, 163, 0.92));
  color: #fff;
}

.iplas-compare-dialog__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  padding: 0.48rem 0.82rem;
  background: var(--app-panel);
  color: var(--app-ink);
  cursor: pointer;
}

.iplas-compare-dialog__chip--active {
  border-color: rgba(15, 118, 110, 0.35);
  background: rgba(15, 118, 110, 0.1);
}

.iplas-compare-dialog__summary-card {
  display: grid;
  gap: 0.35rem;
  border: 1px solid var(--app-border);
  border-radius: 0.85rem;
  padding: 0.9rem;
  background: var(--app-panel);
}

.iplas-compare-dialog__summary-card--primary {
  background: rgba(40, 96, 163, 0.08);
}

.iplas-compare-dialog__summary-card--secondary {
  background: rgba(15, 118, 110, 0.08);
}

.iplas-compare-dialog__summary-card small,
.iplas-compare-dialog__muted,
.iplas-compare-dialog__item-cell small,
.iplas-compare-dialog__empty-state p,
.iplas-compare-dialog__notice p {
  color: var(--app-muted);
}

.iplas-compare-dialog__summary-card strong,
.iplas-compare-dialog__detail-row strong,
.iplas-compare-dialog__item-cell strong {
  color: var(--app-ink);
}

.iplas-compare-dialog__item-cell {
  display: grid;
  gap: 0.2rem;
}

.iplas-compare-dialog__score-pill {
  border: 0;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-weight: 700;
  cursor: pointer;
}

.iplas-compare-dialog__score-pill--success {
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.iplas-compare-dialog__score-pill--info {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.iplas-compare-dialog__score-pill--warning {
  background: rgba(184, 118, 38, 0.16);
  color: #8f5314;
}

.iplas-compare-dialog__score-pill--error {
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

.iplas-compare-dialog__empty-state,
.iplas-compare-dialog__notice {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  text-align: center;
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
}

.iplas-compare-dialog__notice--error {
  background: rgba(189, 64, 64, 0.08);
}

.iplas-compare-dialog__notice--warning {
  background: rgba(184, 118, 38, 0.1);
}

.iplas-compare-dialog__detail-table {
  display: grid;
  grid-column: 1 / -1;
  border: 1px solid var(--app-border);
  border-radius: 0.8rem;
  overflow: hidden;
}

.iplas-compare-dialog__detail-row {
  display: grid;
  grid-template-columns: minmax(10rem, 14rem) 1fr;
  gap: 1rem;
  padding: 0.75rem 0.9rem;
  border-top: 1px solid var(--app-border);
  background: var(--app-panel);
}

.iplas-compare-dialog__detail-row:first-child {
  border-top: 0;
}

.iplas-compare-dialog__detail-row span {
  color: var(--app-muted);
  font-weight: 600;
}

.iplas-compare-dialog__row--mismatch :deep(td) {
  background: rgba(184, 118, 38, 0.06);
}

.iplas-compare-dialog__spin {
  animation: iplas-compare-dialog-spin 1s linear infinite;
}

@keyframes iplas-compare-dialog-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 960px) {
  .iplas-compare-dialog__header,
  .iplas-compare-dialog__header-copy {
    flex-direction: column;
    align-items: stretch;
  }

  .iplas-compare-dialog__field--wide {
    grid-column: span 1;
  }

  .iplas-compare-dialog__detail-row {
    grid-template-columns: 1fr;
  }
}

.iplas-compare-dialog__summary-card--clickable {
  cursor: pointer;
  text-align: left;
  border-width: 1px;
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
}

.iplas-compare-dialog__summary-card--clickable:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  border-color: var(--app-accent);
}

.iplas-compare-dialog__summary-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.iplas-compare-dialog__info-icon {
  font-size: 1.1rem;
  color: var(--app-muted);
}

.iplas-compare-dialog__summary-hint {
  font-size: 0.72rem;
  color: var(--app-accent);
  margin-top: 0.2rem;
}

.overall-score-explanation-card {
  display: grid;
  gap: 0.5rem;
}

.overall-formula-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.overall-formula-header small {
  color: var(--app-muted);
  font-size: 0.8rem;
}

.overall-formula-header strong {
  color: var(--app-ink);
}

.overall-formula-note {
  margin: 0.4rem 0 0;
  font-size: 0.8rem;
  color: var(--app-muted);
  line-height: 1.4;
}

.top-product-ranking-upload-log__overall-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.75rem;
  margin: 0;
  padding: 0.85rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: 0.5rem;
  background: var(--app-surface);
}

.top-product-ranking-upload-log__overall-metrics dt {
  font-size: 0.72rem;
  color: var(--app-muted);
  text-transform: uppercase;
}

.top-product-ranking-upload-log__overall-metrics dd {
  margin: 0.25rem 0 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--app-ink);
}

.top-product-ranking-upload-log__overall-metrics .metric-highlight dd {
  color: var(--app-accent);
}

.top-product-ranking-upload-log__calculation-line {
  padding: 0.6rem 0.8rem;
  border-radius: 0.35rem;
  background: var(--app-surface);
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--app-ink);
  text-align: center;
  border: 1px solid var(--app-border);
}

.forced-fail-search-shell {
  margin-top: 0.5rem;
}

.forced-fail-search-input {
  width: 100%;
}

.score-calculation-steps {
  margin: 0.6rem 0;
  padding: 0.6rem;
  background: var(--app-panel);
  border-radius: 0.35rem;
  border: 1px solid var(--app-border);
}

.score-calculation-step-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--app-ink);
  margin-bottom: 0.35rem;
}

.score-calculation-step-list {
  margin: 0;
  padding-left: 1.25rem;
  display: grid;
  gap: 0.25rem;
}

.score-calculation-step-list li {
  font-size: 0.82rem;
}

.score-calculation-step-list code {
  color: var(--app-accent);
  font-family: monospace;
}

.score-algorithm-desc {
  margin: 0.5rem 0 0;
  font-size: 0.82rem;
  color: var(--app-muted);
  line-height: 1.4;
}

/* ── Score Breakdown shared styles ── */
.iplas-details-subdialog {
  display: grid;
  gap: 1rem;
}

.iplas-details-dialog__dialog-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.iplas-details-dialog__dialog-title h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--app-ink);
}

.iplas-breakdown__name-card {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: var(--app-panel);
  border: 1px solid var(--app-border);
}

.iplas-breakdown__name-text {
  font-family: monospace;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--app-ink);
}

.iplas-breakdown__rows-container {
  display: grid;
  border: 1px solid var(--app-border);
  border-radius: 0.5rem;
  background: var(--app-panel);
  overflow: hidden;
}

.iplas-breakdown__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--app-border);
  gap: 1rem;
}

.iplas-breakdown__row:last-child {
  border-bottom: 0;
}

.iplas-breakdown__row-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.iplas-breakdown__row-right {
  display: flex;
  align-items: center;
}

.iplas-breakdown__row-label {
  font-size: 0.85rem;
  color: var(--app-muted);
}

.iplas-breakdown__row-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  font-size: 0.95rem;
}

.iplas-breakdown__row-icon--red { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
.iplas-breakdown__row-icon--orange { color: #f97316; background: rgba(249, 115, 22, 0.1); }
.iplas-breakdown__row-icon--blue { color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
.iplas-breakdown__row-icon--green { color: #10b981; background: rgba(16, 185, 129, 0.1); }
.iplas-breakdown__row-icon--purple { color: #8b5cf6; background: rgba(139, 92, 246, 0.1); }
.iplas-breakdown__row-icon--amber { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
.iplas-breakdown__row-icon--muted { color: var(--app-muted); background: var(--app-surface); }
.iplas-breakdown__row-icon--star { color: #eab308; background: rgba(234, 179, 8, 0.1); }

.iplas-breakdown__value-text {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--app-ink);
}

.iplas-breakdown__value--warning {
  color: #ef4444;
}

.iplas-breakdown__value-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
}

.iplas-breakdown__value-pill--cool {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.iplas-breakdown__value-pill--neutral {
  background: var(--app-surface);
  color: var(--app-muted);
}

.iplas-details-dialog__explanation-card {
  padding: 0.75rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: 0.5rem;
  background: var(--app-panel);
}

.iplas-details-dialog__explanation-card summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--app-accent);
  font-size: 0.85rem;
}

.iplas-details-dialog__explanation-body {
  margin-top: 0.75rem;
}

.score-formula-panel--compact {
  padding: 0.75rem;
  border-radius: 0.35rem;
  background: var(--app-surface);
}

.top-product-ranking-upload-log__formula-panel {
  display: grid;
  gap: 0.35rem;
  padding: 0.8rem;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 0.5rem;
}

.top-product-ranking-upload-log__metric-label,
.iplas-details-dialog__metric-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--app-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.top-product-ranking-upload-log__formula-equation,
.score-formula-equation {
  font-family: monospace;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--app-ink);
  margin-bottom: 0.5rem;
}

.score-formula-variable-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 0.75rem;
  font-size: 0.8rem;
  margin: 0;
}

.score-formula-variable-list dt {
  font-family: monospace;
  font-weight: 700;
  color: var(--app-accent);
}

.score-formula-variable-list dd {
  margin: 0;
  color: var(--app-muted);
}

.iplas-details-dialog__footer-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>
