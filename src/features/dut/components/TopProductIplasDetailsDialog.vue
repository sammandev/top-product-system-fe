<template>
  <AppDialog v-model="isOpen" v-model:fullscreen="isFullscreen" width="min(96vw, 78rem)" fullscreen-width="98vw"
    :breakpoints="{ '1200px': '94vw', '768px': '98vw' }" fullscreenable :show-footer="false" sticky-header
    class="iplas-details-dialog">
    <template #header>
      <div class="iplas-details-dialog__dialog-title">
        <Icon icon="mdi:table-eye" />
        <h2>Test Items Details</h2>
      </div>
    </template>
    <template #header-actions>
      <button type="button" class="iplas-details-dialog__download-button" :disabled="downloading"
        :title="downloading ? 'Downloading...' : 'Download'" @click="handleDownload">
        <Icon :icon="downloading ? 'mdi:loading' : 'solar:download-minimalistic-bold-duotone'"
          :class="{ 'iplas-details-dialog__spin': downloading }" />
        <span>{{ downloading ? 'DOWNLOADING...' : 'DOWNLOAD' }}</span>
      </button>
    </template>

    <div v-if="record" class="iplas-details-dialog__body"
      :class="{ 'iplas-details-dialog__body--fullscreen': isFullscreen }">
      <section class="iplas-details-dialog__summary-grid">
        <article class="iplas-details-dialog__summary-card iplas-details-dialog__summary-card--highlight">
          <button type="button" class="iplas-details-dialog__info-button" @click="copyToClipboard(record.isn)">
            <span class="iplas-details-dialog__info-icon">
              <Icon icon="mdi:barcode" />
            </span>
            <span>
              <small>DUT ISN</small>
              <strong>{{ record.isn || '-' }}</strong>
            </span>
          </button>
        </article>

        <article class="iplas-details-dialog__summary-card">
          <div class="iplas-details-dialog__info-button iplas-details-dialog__info-button--static">
            <span class="iplas-details-dialog__info-icon">
              <Icon icon="mdi:factory" />
            </span>
            <span>
              <small>Station</small>
              <strong>{{ record.displayStationName || record.stationName }}</strong>
            </span>
          </div>
        </article>

        <article v-if="scoreSummaryPrimary"
          class="iplas-details-dialog__summary-card iplas-details-dialog__summary-card--score">
          <button type="button" class="summary-stat-button" @click="openOverallScoreDialog">
            <div class="iplas-details-dialog__score-button-layout">
              <span class="iplas-details-dialog__info-icon"
                :class="`iplas-details-dialog__info-icon--${scoreSummaryIconColor}`">
                <Icon :icon="scoreSummaryIcon" />
              </span>
              <div class="summary-stat-button__content">
                <div class="iplas-details-dialog__metric-label">{{ scoreSummaryLabel }}</div>
                <div class="iplas-details-dialog__metric-value" :class="getScoreColorClass(scoreSummaryPrimary.score)">
                  {{ formatScoreOutOfTen(scoreSummaryPrimary.score) }}
                </div>
                <div class="iplas-details-dialog__metric-caption">{{ scoreSummaryCaption }}</div>
                <div v-if="scoreSummarySecondaryText" class="iplas-details-dialog__metric-secondary">
                  {{ scoreSummarySecondaryText }}
                </div>
              </div>
            </div>
          </button>
        </article>
      </section>

      <section class="iplas-details-dialog__metadata-grid">
        <article class="iplas-details-dialog__metadata-card">
          <button type="button" class="iplas-details-dialog__copy-row" @click="copyToClipboard(record.deviceId)">
            <Icon icon="mdi:chip" />
            <span><strong>Device ID:</strong> {{ record.deviceId }}</span>
          </button>
        </article>
        <article class="iplas-details-dialog__metadata-card">
          <div class="iplas-details-dialog__copy-row iplas-details-dialog__copy-row--static">
            <Icon icon="mdi:map-marker" />
            <span><strong>Site:</strong> {{ record.site }}</span>
          </div>
        </article>
        <article class="iplas-details-dialog__metadata-card">
          <div class="iplas-details-dialog__copy-row iplas-details-dialog__copy-row--static">
            <Icon icon="mdi:folder" />
            <span><strong>Project:</strong> {{ record.project }}</span>
          </div>
        </article>
      </section>

      <section class="iplas-details-dialog__meta-pills">
        <span class="iplas-details-dialog__pill iplas-details-dialog__pill--cool">
          <Icon icon="mdi:calendar-clock" />
          <strong>Start:</strong>
          <span>{{ formatTime(record.testStartTime) }}</span>
        </span>
        <span class="iplas-details-dialog__pill iplas-details-dialog__pill--cool">
          <Icon icon="mdi:calendar-check" />
          <strong>End:</strong>
          <span>{{ formatTime(record.testEndTime) }}</span>
        </span>
        <span class="iplas-details-dialog__pill iplas-details-dialog__pill--neutral">
          <Icon icon="mdi:timer" />
          <strong>Duration:</strong>
          <span>{{ calculateDuration(record.testStartTime, record.testEndTime) }}</span>
        </span>
        <span class="iplas-details-dialog__pill iplas-details-dialog__pill--neutral">
          <Icon icon="mdi:list-box" />
          <strong>Test Items:</strong>
          <span>{{ record.testItems?.length || 0 }}</span>
        </span>
        <button type="button" class="iplas-details-dialog__pill" :class="statusPillClass(record.errorCode)"
          @click="copyToClipboard(record.errorCode)">
          <Icon :icon="isStatusPass(record.errorCode) ? 'mdi:check-circle' : 'mdi:alert-circle'" />
          <strong>Status:</strong>
          <span>{{ record.errorCode }}</span>
        </button>
        <button v-if="forcedFailSummary" type="button"
          class="iplas-details-dialog__pill iplas-details-dialog__pill--danger"
          :class="{ 'iplas-details-dialog__pill--interactive': forcedFailSummary.clickable }"
          @click="openForcedFailDialog">
          <Icon icon="mdi:alert-octagon" />
          <strong>Forced Fail:</strong>
          <span>{{ forcedFailSummary.detailText }}</span>
        </button>
        <button v-if="record.errorName && record.errorName !== 'N/A' && !isStatusPass(record.errorCode)" type="button"
          class="iplas-details-dialog__pill iplas-details-dialog__pill--danger"
          @click="copyToClipboard(record.errorName)">
          <Icon icon="mdi:alert-octagon" />
          <strong>Error:</strong>
          <span>{{ record.errorName }}</span>
        </button>
      </section>

      <section class="iplas-details-dialog__filters" :class="{ 'iplas-details-dialog__filters--has-scores': hasScores }">
        <label class="iplas-details-dialog__field">
          <span>Search Test Items (Regex)</span>
          <div class="iplas-details-dialog__token-shell">
            <div v-if="searchTerms.length > 0" class="iplas-details-dialog__token-list">
              <button v-for="term in searchTerms" :key="term" type="button" class="iplas-details-dialog__token"
                @click="removeSearchTerm(term)">
                <span>{{ term }}</span>
                <Icon icon="mdi:close" />
              </button>
            </div>
            <div class="iplas-details-dialog__search-shell">
              <Icon icon="mdi:magnify" />
              <input v-model="pendingSearchTerm" type="text" placeholder="Type and press Enter (AND logic)..."
                @keydown="handleSearchTermKeydown" @blur="commitSearchTerms()" />
              <button v-if="searchTerms.length > 0 || pendingSearchTerm" type="button"
                class="iplas-details-dialog__ghost-action" @click="clearSearchTerms">
                Clear
              </button>
            </div>
          </div>
        </label>

        <label class="iplas-details-dialog__field">
          <span>Data Type</span>
          <AppSelect v-model="testItemFilter" :options="testItemFilterSelectOptions" placeholder="Show All"
            :searchable="false" />
        </label>

        <label v-if="hasScores" class="iplas-details-dialog__field">
          <span>Score Filter</span>
          <AppSelect v-model="scoreFilterType" :options="scoreFilterSelectOptions" placeholder="No filter"
            :searchable="false" />
        </label>
        <label v-if="hasScores" class="iplas-details-dialog__field">
          <span>Value (0-10)</span>
          <input v-model.number="scoreFilterValue" type="number" min="0" max="10" step="0.1"
            :disabled="!scoreFilterType" placeholder="0.00" />
        </label>
      </section>

      <section class="iplas-details-dialog__table-shell">
        <div v-if="loadingTestItems" class="iplas-details-dialog__loading-state">
          <Icon icon="mdi:loading" class="iplas-details-dialog__spin" />
          <div>
            <strong>Loading test items...</strong>
            <p>Fetching detailed rows for fullscreen inspection.</p>
          </div>
        </div>

        <AppDataGrid :columns="testItemColumns" :rows="tableTestItems" data-key="NAME" :paginator="true"
          :rows-per-page="25" :loading="loadingTestItems" scroll-height="flex" :table-style="{ minWidth: '56rem' }"
          sticky-header :row-class="hasScores ? scoreTableRowClass : undefined" @row-click="handleRowClick">
          <template #cell-statusSort="{ data }">
            <span class="status-text" :class="getStatusTextClass(String(data.statusDisplay || ''))">
              {{ data.statusDisplay }}
            </span>
          </template>
          <template #cell-VALUE="{ data }">
            <span class="table-value" :class="getValueClass(data as NormalizedTestItem)">{{ formatTableValue(data as
              NormalizedTestItem) }}</span>
          </template>
          <template #cell-UCL="{ value }">
            <span class="table-limit">{{ value || '-' }}</span>
          </template>
          <template #cell-LCL="{ value }">
            <span class="table-limit">{{ value || '-' }}</span>
          </template>
          <template #cell-scoreSort="{ data }">
            <button v-if="data.score !== undefined && data.score !== null" type="button"
              class="iplas-details-dialog__score-chip"
              :class="`iplas-details-dialog__score-chip--${scoreTone(data.score)}`"
              @click.stop="showScoreBreakdown(data as NormalizedTestItem)">
              {{ formatScoreValue(data.score) }}
            </button>
            <span v-else class="iplas-details-dialog__muted">-</span>
          </template>
        </AppDataGrid>
      </section>
    </div>
  </AppDialog>

  <AppDialog v-model="showForcedFailDialog" title="Forced Fail Items"
    description="Review items that fell below the minimum threshold." width="min(92vw, 56rem)">
    <div v-if="record" class="iplas-details-subdialog">
      <section class="iplas-details-dialog__notice iplas-details-dialog__notice--warning">
        <strong>
          {{ record.forcedFailureDetails?.length || 0 }} scored item(s) fell below the minimum score of
          {{ record.forcedFailureMinimumScore?.toFixed(1) ?? '6.5' }} / 10
        </strong>
      </section>

      <label class="iplas-details-dialog__field">
        <span>Search Failed Items</span>
        <div class="iplas-details-dialog__search-shell">
          <Icon icon="mdi:magnify" />
          <input v-model="forcedFailSearch" type="search" placeholder="Search by test item name..." />
        </div>
      </label>

      <section v-if="forcedFailRows.length > 0" class="iplas-details-dialog__data-grid-shell">
        <AppDataGrid :columns="forcedFailColumns" :rows="forcedFailRows" data-key="rowKey" :paginator="false"
          :rows-per-page="25" scroll-height="22rem" :table-style="{ minWidth: '38rem' }">
          <template #cell-name="{ data }">
            <button type="button" class="iplas-details-dialog__row-copy" @click="copyToClipboard(String(data.name))">
              <span class="forced-fail-item__icon">
                <Icon icon="mdi:alert-circle" />
              </span>
              <span class="forced-fail-item-title" :title="String(data.name)">{{ data.name }}</span>
            </button>
          </template>

          <template #cell-score="{ data }">
            <span class="iplas-details-dialog__score-chip"
              :class="`iplas-details-dialog__score-chip--${scoreTone(data.score)}`">
              {{ (data.score * 10).toFixed(2) }} / 10
            </span>
          </template>

          <template #cell-actions="{ data }">
            <button type="button" class="iplas-details-dialog__icon-action" title="Copy test item"
              @click="copyToClipboard(String(data.name))">
              <Icon icon="mdi:content-copy" />
            </button>
          </template>
        </AppDataGrid>
      </section>

      <div v-else class="iplas-details-dialog__empty-state">
        <Icon icon="mdi:database-search-outline" />
        <p>No failed items match the current search.</p>
      </div>
    </div>

    <template #footer>
      <div class="iplas-details-dialog__footer-actions">
        <button type="button" class="iplas-details-dialog__button iplas-details-dialog__button--ghost"
          @click="showForcedFailDialog = false">
          Close
        </button>
      </div>
    </template>
  </AppDialog>

  <AppDialog v-model="showBreakdownDialog" width="min(92vw, 34rem)" persistent :show-footer="false"
    class="iplas-details-dialog iplas-breakdown-dialog">
    <template #header>
      <div class="iplas-details-dialog__dialog-title">
        <Icon icon="mdi:table-search" />
        <h2>Score Breakdown</h2>
      </div>
    </template>

    <div v-if="selectedTestItem" class="iplas-details-subdialog">
      <section class="iplas-breakdown__name-card">
        <span class="iplas-breakdown__name-text">{{ selectedTestItem.NAME }}</span>
      </section>

      <section class="iplas-breakdown__rows-container">
        <div v-for="row in breakdownRows" :key="row.key" class="iplas-breakdown__row">
          <div class="iplas-breakdown__row-left">
            <span class="iplas-breakdown__row-icon" :class="getBreakdownIconClass(row)">
              <Icon :icon="getBreakdownRowIcon(row)" />
            </span>
            <span class="iplas-breakdown__row-label">{{ row.label }}</span>
          </div>
          <div class="iplas-breakdown__row-right">
            <span v-if="row.valueTone === 'score'" class="iplas-details-dialog__score-chip"
              :class="`iplas-details-dialog__score-chip--${scoreTone(selectedTestItem.score ?? 0)}`">
              {{ row.value }}
            </span>
            <span v-else-if="row.valueTone === 'algorithm'"
              class="iplas-breakdown__value-pill iplas-breakdown__value-pill--cool">
              {{ row.value }}
            </span>
            <span v-else-if="row.valueTone === 'policy'"
              class="iplas-breakdown__value-pill iplas-breakdown__value-pill--neutral">
              {{ row.value }}
            </span>
            <span v-else
              :class="[row.valueTone === 'warning' ? 'iplas-breakdown__value--warning' : '', 'iplas-breakdown__value-text']">
              {{ row.value }}
            </span>
          </div>
        </div>
      </section>

      <details class="iplas-details-dialog__explanation-card">
        <summary>
          <span>
            <Icon icon="mdi:help-circle-outline" /> How is this score calculated?
          </span>
        </summary>
        <div class="iplas-details-dialog__explanation-body">
          <p>{{ getScoringExplanation(selectedTestItem.scoringType) }}</p>
        </div>
      </details>
    </div>
  </AppDialog>

  <AppDialog v-model="showOverallScoreDialog" width="min(92vw, 40rem)" :show-footer="false"
    class="iplas-details-dialog">
    <template #header>
      <div class="iplas-details-dialog__dialog-title">
        <Icon icon="mdi:chart-line" />
        <h2>How This Score Is Calculated</h2>
      </div>
    </template>

    <div v-if="record && scoreSummaryPrimary && overallScoreExplanation" class="iplas-details-subdialog">
      <div class="score-explanation-primary">
        <div>
          <div class="iplas-details-dialog__metric-label">{{ scoreSummaryLabel }}</div>
          <div class="score-explanation-primary__score" :class="getScoreColorClass(scoreSummaryPrimary.score)">
            {{ formatScoreOutOfTen(scoreSummaryPrimary.score) }}
          </div>
          <div class="iplas-details-dialog__metric-caption">Weighted average of all scored test items.</div>
        </div>
      </div>

      <div class="score-formula-panel">
        <div class="iplas-details-dialog__metric-label">Formula</div>
        <div class="score-formula-equation">Aggregate = sum(item score × effective weight) / sum(effective weight)</div>
        <div class="score-formula-steps">
          <div class="score-formula-step">
            <div class="score-formula-step__index">1</div>
            <div>
              <div>Convert each configured weight into an effective weight.</div>
              <div class="iplas-details-dialog__muted">Effective weight = configured weight × configured weight.</div>
            </div>
          </div>
          <div class="score-formula-step">
            <div class="score-formula-step__index">2</div>
            <div>
              <div>Use only test items that actually have a score.</div>
              <div class="iplas-details-dialog__muted">Each scored item contributes score × effective weight to the
                numerator.</div>
            </div>
          </div>
          <div class="score-formula-step">
            <div class="score-formula-step__index">3</div>
            <div>
              <div>Divide by the total effective weight, then display the result on a /10 scale.</div>
              <div class="iplas-details-dialog__muted">The backend stores and averages scores on a 0-1 scale before the
                UI
                formats them as /10.</div>
            </div>
          </div>
        </div>
      </div>

      <div class="iplas-details-dialog__stats-row">
        <div class="score-explanation-stat">
          <div class="iplas-details-dialog__metric-label">Scored Test Items</div>
          <div class="iplas-details-dialog__stat-value">{{ overallScoreExplanation.scoredItemCount }}</div>
          <div class="iplas-details-dialog__muted">{{ overallScoreExplanation.valueItemCount }} value, {{
            overallScoreExplanation.binaryItemCount }} binary</div>
        </div>
        <div class="score-explanation-stat">
          <div class="iplas-details-dialog__metric-label">Total Effective Weight</div>
          <div class="iplas-details-dialog__stat-value">{{
            formatCompactNumber(overallScoreExplanation.totalEffectiveWeight) }}</div>
          <div class="iplas-details-dialog__muted">Based on squared per-item weights.</div>
        </div>
      </div>

      <section v-if="record.isForcedFailure" class="iplas-details-dialog__notice iplas-details-dialog__notice--warning">
        <strong>Forced Fail Override</strong>
        <p>
          This record is marked as forced fail because {{ overallScoreExplanation.failingItemCount }}
          {{ overallScoreExplanation.failingItemCount === 1 ? 'item fell' : 'items fell' }} below the minimum score of
          {{ overallScoreExplanation.forcedFailureThreshold }} / 10.
        </p>
        <p>That threshold rule is separate from the aggregate weighted-average score shown above.</p>
      </section>
    </div>

  </AppDialog>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import { useNotification } from '@/shared/composables/useNotification'
import AppDataGrid from '@/shared/ui/data-grid/AppDataGrid.vue'
import AppDialog from '@/shared/ui/dialog/AppDialog.vue'
import AppSelect from '@/shared/ui/forms/AppSelect.vue'
import {
  adjustIplasDisplayTime,
  getStatusColor,
  isStatusFail,
  isStatusPass,
  normalizeStatus,
} from '@/shared/utils/helpers'
import type { ScoringType } from '../types/scoring.types'
import { getScoreColor, SCORING_TYPE_INFO } from '../types/scoring.types'
import type { NormalizedRecord, NormalizedTestItem } from './IplasTestItemsFullscreenDialog.vue'

type TestItemFilter = 'all' | 'value' | 'non-value' | 'bin'
type ScoreFilterType = 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
type ScoreSummaryMetricKey = 'overall' | 'value' | 'binary'

interface ScoreSummaryMetric {
  key: ScoreSummaryMetricKey
  label: string
  score: number
}

interface ForcedFailSummary {
  detailText: string
  clickable: boolean
}

interface OverallScoreExplanation {
  scoredItemCount: number
  valueItemCount: number
  binaryItemCount: number
  totalEffectiveWeight: number
  failingItemCount: number
  forcedFailureThreshold: string
}

interface ForcedFailGridRow {
  rowKey: string
  name: string
  score: number
}

interface BreakdownGridRow {
  key: string
  label: string
  value: string
  valueTone?: 'score' | 'algorithm' | 'policy' | 'warning'
}

interface Props {
  modelValue: boolean
  record: NormalizedRecord | null
  downloading?: boolean
  loadingTestItems?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'download'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Dialog state
const isOpen = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const isFullscreen = ref(false)

// Filter controls
// UPDATED: Default to 'all' (Show All) instead of 'value'
const testItemFilter = ref<TestItemFilter>('all')
const searchTerms = ref<string[]>([])
const pendingSearchTerm = ref('')
const { showInfo: showInfoNotification } = useNotification()

// UPDATED: Score filter state
const scoreFilterType = ref<ScoreFilterType | null>(null)
const scoreFilterValue = ref<number | null>(null)

// Score breakdown dialog
const showBreakdownDialog = ref(false)
const selectedTestItem = ref<NormalizedTestItem | null>(null)
const showOverallScoreDialog = ref(false)

// Forced fail items dialog
const showForcedFailDialog = ref(false)
const forcedFailSearch = ref('')

// Filter options for dropdown
const testItemFilterOptions: { title: string; value: TestItemFilter }[] = [
  { title: 'Show All', value: 'all' },
  { title: 'Criteria Data ★', value: 'value' },
  { title: 'Non-Criteria', value: 'non-value' },
  { title: 'Bin Data', value: 'bin' },
]

const testItemFilterSelectOptions = testItemFilterOptions.map((option) => ({
  label: option.title,
  value: option.value,
}))

// UPDATED: Score filter options
const scoreFilterOptions: { title: string; value: ScoreFilterType }[] = [
  { title: '> Greater than', value: 'gt' },
  { title: '≥ Greater or equal', value: 'gte' },
  { title: '< Less than', value: 'lt' },
  { title: '≤ Less or equal', value: 'lte' },
  { title: '= Equals', value: 'eq' },
]

const scoreFilterSelectOptions = [
  { label: 'No filter', value: null },
  ...scoreFilterOptions.map((option) => ({
    label: option.title,
    value: option.value,
  })),
]

const forcedFailColumns = [
  { key: 'name', field: 'name', header: 'Failed Test Item', sortable: true, style: { width: '34rem' } },
  { key: 'score', field: 'score', header: 'Score', sortable: true, style: { width: '10rem' } },
  { key: 'actions', header: 'Actions', sortable: false, style: { width: '6rem' } },
]

const breakdownColumns = [
  { key: 'label', field: 'label', header: 'Metric', sortable: false, style: { width: '15rem' } },
  { key: 'value', field: 'value', header: 'Value', sortable: false },
]

// Computed: check if scores are available
const hasScores = computed(() => {
  return props.record?.testItems?.some((item: NormalizedTestItem) => item.score !== undefined) ?? false
})

function hasScore(score: number | null | undefined): score is number {
  return score !== null && score !== undefined
}

function areDisplayedScoresEqual(left: number | null | undefined, right: number | null | undefined): boolean {
  if (!hasScore(left) || !hasScore(right)) {
    return false
  }

  return formatScoreValue(left) === formatScoreValue(right)
}

const scoreSummaryPrimary = computed<ScoreSummaryMetric | null>(() => {
  const record = props.record

  if (!record) {
    return null
  }

  if (hasScore(record.overallScore)) {
    return { key: 'overall', label: 'Overall Score', score: record.overallScore }
  }

  if (hasScore(record.valueItemsScore)) {
    return { key: 'value', label: 'Value', score: record.valueItemsScore }
  }

  if (hasScore(record.binItemsScore)) {
    return { key: 'binary', label: 'Binary', score: record.binItemsScore }
  }

  return null
})

const scoreSummarySecondaryMetrics = computed<ScoreSummaryMetric[]>(() => {
  const record = props.record
  const primaryMetric = scoreSummaryPrimary.value

  if (!record || !primaryMetric) {
    return []
  }

  const candidates: ScoreSummaryMetric[] = []

  if (hasScore(record.valueItemsScore)) {
    candidates.push({ key: 'value', label: 'Value', score: record.valueItemsScore })
  }

  if (hasScore(record.binItemsScore)) {
    candidates.push({ key: 'binary', label: 'Binary', score: record.binItemsScore })
  }

  return candidates.reduce<ScoreSummaryMetric[]>((visibleMetrics, metric) => {
    if (metric.key === primaryMetric.key || areDisplayedScoresEqual(metric.score, primaryMetric.score)) {
      return visibleMetrics
    }

    if (
      visibleMetrics.some((visibleMetric: ScoreSummaryMetric) =>
        areDisplayedScoresEqual(visibleMetric.score, metric.score),
      )
    ) {
      return visibleMetrics
    }

    visibleMetrics.push(metric)
    return visibleMetrics
  }, [])
})

const forcedFailSummary = computed<ForcedFailSummary | null>(() => {
  const record = props.record

  if (!record?.isForcedFailure) {
    return null
  }

  const threshold = record.forcedFailureMinimumScore?.toFixed(1) ?? '6.5'
  const failingItemCount = record.forcedFailureDetails?.length ?? 0
  const itemLabel = failingItemCount === 1 ? 'item' : 'items'

  return {
    detailText:
      failingItemCount > 0
        ? `${failingItemCount} ${itemLabel} below ${threshold} / 10`
        : `Below ${threshold} / 10`,
    clickable: failingItemCount > 0,
  }
})

const scoreSummaryLabel = computed(() => {
  if (props.record?.isForcedFailure) {
    return 'Forced Fail Score'
  }

  return scoreSummaryPrimary.value?.label ?? 'Score'
})

const scoreSummaryCaption = computed(() => 'Click for details.')

const scoreSummaryIcon = computed(() => {
  if (props.record?.isForcedFailure) {
    return 'mdi-alert-octagon'
  }

  if ((scoreSummaryPrimary.value?.score ?? 0) >= 0.9) {
    return 'mdi-check-decagram'
  }

  return 'mdi-chart-line'
})

const scoreSummaryIconColor = computed(() => {
  if (props.record?.isForcedFailure) {
    return 'danger'
  }

  if ((scoreSummaryPrimary.value?.score ?? 0) >= 0.9) {
    return 'success'
  }

  return 'primary'
})

const scoreSummarySecondaryText = computed(() => {
  if (scoreSummarySecondaryMetrics.value.length === 0) {
    return ''
  }

  return scoreSummarySecondaryMetrics.value
    .map((metric: ScoreSummaryMetric) => `${metric.label}: ${formatScoreOutOfTen(metric.score)}`)
    .join(' | ')
})

const loadingTestItems = computed(() => Boolean(props.loadingTestItems))

const overallScoreExplanation = computed<OverallScoreExplanation | null>(() => {
  const record = props.record

  if (!record || !scoreSummaryPrimary.value) {
    return null
  }

  const scoredItems = record.testItems.filter((item: NormalizedTestItem) => hasScore(item.score))
  const binaryItemCount = scoredItems.filter((item: NormalizedTestItem) => isBinData(item)).length
  const valueItemCount = scoredItems.length - binaryItemCount
  const totalEffectiveWeight = scoredItems.reduce((total: number, item: NormalizedTestItem) => {
    const weight = item.weight ?? 1.0
    return total + (weight * weight)
  }, 0)

  return {
    scoredItemCount: scoredItems.length,
    valueItemCount,
    binaryItemCount,
    totalEffectiveWeight,
    failingItemCount: record.forcedFailureDetails?.length ?? 0,
    forcedFailureThreshold: record.forcedFailureMinimumScore?.toFixed(1) ?? '6.5',
  }
})

// Dynamic headers - add Score column if scores are available
const testItemHeaders = computed(() => {
  const baseHeaders = [
    { title: 'Test Item', key: 'NAME', sortable: true },
    { title: 'Status', key: 'statusSort', sortable: true },
    { title: 'Value', key: 'VALUE', sortable: true },
    { title: 'UCL', key: 'UCL', sortable: true },
    { title: 'LCL', key: 'LCL', sortable: true },
  ]

  if (hasScores.value) {
    baseHeaders.push({ title: 'Score', key: 'scoreSort', sortable: true })
  }

  return baseHeaders
})

const testItemColumns = computed(() =>
  testItemHeaders.value.map((header) => ({
    header: header.title,
    key: header.key,
    field: header.key,
    sortable: header.sortable,
  })),
)

const tableTestItems = computed(() => {
  return filteredTestItems.value.map((item: NormalizedTestItem) => ({
    ...item,
    statusDisplay: getItemStatusLabel(item),
    statusSort: getItemStatusSortValue(item),
    scoreSort: item.score ?? Number.NEGATIVE_INFINITY,
  }))
})

const filteredForcedFailureDetails = computed(() => {
  const details = [...(props.record?.forcedFailureDetails || [])]
    .sort((left, right) => left.score - right.score)

  const query = forcedFailSearch.value.trim().toLowerCase()
  if (!query) {
    return details
  }

  return details.filter((item) => item.name.toLowerCase().includes(query))
})

const forcedFailRows = computed<ForcedFailGridRow[]>(() => {
  return filteredForcedFailureDetails.value.map((item, index) => ({
    rowKey: `${item.name}-${index}`,
    name: item.name,
    score: item.score,
  }))
})

const breakdownRows = computed<BreakdownGridRow[]>(() => {
  const item = selectedTestItem.value

  if (!item) {
    return []
  }

  const rows: BreakdownGridRow[] = [
    {
      key: 'ucl',
      label: 'Upper Criteria Limit (UCL)',
      value: item.UCL || '-',
    },
    {
      key: 'lcl',
      label: 'Lower Criteria Limit (LCL)',
      value: item.LCL || '-',
    },
    {
      key: 'actual',
      label: 'Measured Value',
      value: item.VALUE || '-',
    },
    {
      key: 'target',
      label: `Target (${getTargetLabel(item)})`,
      value: computeTarget(item),
    },
    {
      key: 'scoringType',
      label: 'Scoring Algorithm',
      value: formatScoringType(item.scoringType),
      valueTone: 'algorithm',
    },
    {
      key: 'weight',
      label: 'Score Weight',
      value: formatWeight(item.weight),
    },
  ]

  if (item.deviation !== undefined) {
    rows.push({
      key: 'deviation',
      label: 'Deviation from Target',
      value: item.deviation.toFixed(2),
      valueTone: Math.abs(item.deviation) > 1 ? 'warning' : undefined,
    })
  }

  rows.push({
    key: 'score',
    label: 'Final Score',
    value: item.score !== undefined ? formatScoreValue(item.score) : '-',
    valueTone: 'score',
  })

  if (item.policy) {
    rows.splice(rows.length - 1, 0, {
      key: 'policy',
      label: 'Policy',
      value: formatPolicyLabel(item.policy),
      valueTone: 'policy',
    })
  }

  return rows
})

// Helper functions
function isValueData(item: NormalizedTestItem): boolean {
  const value = item.VALUE?.toUpperCase() || ''
  // Value data: not PASS, FAIL, 1, 0, or -999
  if (value === 'PASS' || value === 'FAIL' || value === '1' || value === '0' || value === '-999') {
    return false
  }
  const hasNumericValue = !Number.isNaN(parseFloat(item.VALUE)) && item.VALUE !== ''
  const hasNumericUcl = !Number.isNaN(parseFloat(item.UCL)) && item.UCL !== ''
  const hasNumericLcl = !Number.isNaN(parseFloat(item.LCL)) && item.LCL !== ''
  const numericCount = [hasNumericValue, hasNumericUcl, hasNumericLcl].filter(Boolean).length
  return numericCount >= 2
}

function isPassFailData(item: NormalizedTestItem): boolean {
  const value = item.VALUE?.toUpperCase() || ''
  // STATUS must be PASS, FAIL, 1, 0, or -1 AND VALUE must be PASS, FAIL, 1, 0, or -999
  const isStatusPF = isStatusPass(item.STATUS) || isStatusFail(item.STATUS) || item.STATUS === '-1'
  const isValuePF =
    value === 'PASS' || value === 'FAIL' || value === '1' || value === '0' || value === '-999'
  return isStatusPF && isValuePF
}

function isBinData(item: NormalizedTestItem): boolean {
  return isPassFailData(item)
}

function isNonValueData(item: NormalizedTestItem): boolean {
  return !isValueData(item) && !isBinData(item)
}

function getValueClass(item: NormalizedTestItem): string {
  const value = item.VALUE?.toUpperCase() || ''
  if (value === 'PASS' || value === '1') return 'text-success font-weight-medium'
  if (value === 'FAIL' || value === '0') return 'text-error font-weight-medium'
  if (value === '-999') return 'text-medium-emphasis'
  return 'text-high-emphasis'
}

function statusPillClass(status: string): string {
  if (isStatusPass(status)) {
    return 'iplas-details-dialog__pill--success'
  }

  return 'iplas-details-dialog__pill--danger'
}

function scoreTone(score: number): 'success' | 'primary' | 'warning' | 'danger' {
  if (score >= 0.9) return 'success'
  if (score >= 0.7) return 'primary'
  if (score >= 0.5) return 'warning'
  return 'danger'
}

function getBreakdownRowIcon(row: BreakdownGridRow): string {
  const iconMap: Record<string, string> = {
    ucl: 'mdi:arrow-up-bold',
    lcl: 'mdi:arrow-down-bold',
    actual: 'mdi:speedometer',
    target: 'mdi:crosshairs-gps',
    scoringType: 'mdi:function-variant',
    weight: 'mdi:weight',
    deviation: 'mdi:delta',
    score: 'mdi:star',
    policy: 'mdi:shield-check-outline',
  }
  return iconMap[row.key] ?? 'mdi:information-outline'
}

function getBreakdownIconClass(row: BreakdownGridRow): string {
  const classMap: Record<string, string> = {
    ucl: 'iplas-breakdown__row-icon--red',
    lcl: 'iplas-breakdown__row-icon--orange',
    actual: 'iplas-breakdown__row-icon--blue',
    target: 'iplas-breakdown__row-icon--green',
    scoringType: 'iplas-breakdown__row-icon--purple',
    weight: 'iplas-breakdown__row-icon--muted',
    deviation: 'iplas-breakdown__row-icon--amber',
    score: 'iplas-breakdown__row-icon--star',
    policy: 'iplas-breakdown__row-icon--muted',
  }
  return classMap[row.key] ?? ''
}

function scoreTableRowClass(): string {
  return hasScores.value ? 'iplas-details-dialog__table-row--clickable' : ''
}

function commitSearchTerms(rawInput: string = pendingSearchTerm.value): void {
  const values = rawInput
    .split(/[,\n]+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  if (values.length === 0) {
    pendingSearchTerm.value = ''
    return
  }

  searchTerms.value = Array.from(new Set([...searchTerms.value, ...values]))
  pendingSearchTerm.value = ''
}

function handleSearchTermKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
    event.preventDefault()
    commitSearchTerms()
  }
}

function removeSearchTerm(term: string): void {
  searchTerms.value = searchTerms.value.filter((value) => value !== term)
}

function clearSearchTerms(): void {
  searchTerms.value = []
  pendingSearchTerm.value = ''
}

function getItemScoreThreshold(item: NormalizedTestItem): number | null {
  return item.forcedFailureThreshold ?? props.record?.forcedFailureMinimumScore ?? null
}

function isItemBelowScoreThreshold(item: NormalizedTestItem): boolean {
  const threshold = getItemScoreThreshold(item)

  if (!hasScore(item.score) || threshold === null) {
    return false
  }

  return item.score * 10 < threshold
}

function getItemStatusLabel(item: NormalizedTestItem): string {
  if (isItemBelowScoreThreshold(item)) {
    return 'SCORE FAIL'
  }

  return normalizeStatus(item.STATUS)
}

function getItemStatusSortValue(item: NormalizedTestItem): string {
  const statusLabel = getItemStatusLabel(item)

  if (statusLabel === 'PASS') {
    return '0_PASS'
  }

  if (statusLabel === 'SCORE FAIL') {
    return '1_SCORE FAIL'
  }

  if (statusLabel === 'FAIL') {
    return '2_FAIL'
  }

  return `3_${statusLabel}`
}

function getStatusTextClass(status: string | undefined): string {
  if ((status ?? '').toUpperCase() === 'SCORE FAIL') return 'text-warning'
  if (isStatusPass(status ?? '')) return 'text-success'
  if (isStatusFail(status ?? '')) return 'text-error'
  return 'text-medium-emphasis'
}

function formatScoreValue(score: number | null | undefined): string {
  if (score === null || score === undefined) return '-'
  return (score * 10).toFixed(2)
}

function formatScoreOutOfTen(score: number | null | undefined): string {
  const formattedScore = formatScoreValue(score)
  return formattedScore === '-' ? formattedScore : `${formattedScore} / 10`
}

function formatTableValue(item: NormalizedTestItem): string {
  const rawValue = item.VALUE?.trim() || ''
  if (!rawValue || rawValue === '-999') return '-'
  if (rawValue.toUpperCase() === 'PASS' || rawValue === '1') return 'PASS'
  if (rawValue.toUpperCase() === 'FAIL' || rawValue === '0') return 'FAIL'
  return rawValue
}

function formatTime(timeStr: string): string {
  // Use the centralized helper to adjust time by -1 hour for display
  // Returns format: YYYY-MM-DD HH:MM:SS (e.g., 2026-02-06 22:34:42)
  return adjustIplasDisplayTime(timeStr, 1)
}

function parseDurationDate(value: string): Date | null {
  if (!value) {
    return null
  }

  const trimmedValue = value.trim()

  if (trimmedValue.includes('/') && trimmedValue.includes(',')) {
    const normalizedValue = trimmedValue.replace(',', '').replace(/\//g, '-').replace(/\s+/g, 'T')
    const parsedDate = new Date(normalizedValue)
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
  }

  const sanitizedValue = trimmedValue.replace('%:z', '').replace(/\.\d+$/, '')
  const isoCandidate = sanitizedValue.includes('T') ? sanitizedValue : sanitizedValue.replace(' ', 'T')

  const utcParsedDate = new Date(`${isoCandidate}Z`)
  if (!Number.isNaN(utcParsedDate.getTime())) {
    return utcParsedDate
  }

  const localParsedDate = new Date(isoCandidate)
  return Number.isNaN(localParsedDate.getTime()) ? null : localParsedDate
}

function calculateDuration(startStr: string, endStr: string): string {
  if (!startStr || !endStr) return '-'
  const start = parseDurationDate(startStr)
  const end = parseDurationDate(endStr)

  if (!start || !end) {
    return '-'
  }

  const diffMs = end.getTime() - start.getTime()
  if (Number.isNaN(diffMs) || diffMs < 0) {
    return '-'
  }

  const diffSeconds = Math.floor(diffMs / 1000)
  const hours = Math.floor(diffSeconds / 3600)
  const minutes = Math.floor((diffSeconds % 3600) / 60)
  const seconds = diffSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }

  return `${minutes}m ${seconds}s`
}

function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '-'
  }

  return value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d*[1-9])0$/, '$1')
}

async function copyToClipboard(text: string): Promise<void> {
  if (!text) return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    showInfoNotification('Copied to clipboard!')
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

watch(showForcedFailDialog, (isOpen: boolean) => {
  if (!isOpen) {
    forcedFailSearch.value = ''
  }
})

// Computed filtered test items
const filteredTestItems = computed(() => {
  if (!props.record?.testItems) return []

  let items = [...props.record.testItems]

  if (testItemFilter.value !== 'all') {
    items = items.filter((item: NormalizedTestItem) => {
      switch (testItemFilter.value) {
        case 'value':
          return isValueData(item)
        case 'non-value':
          return isNonValueData(item)
        case 'bin':
          return isBinData(item)
        default:
          return true
      }
    })
  }

  // UPDATED: Apply multi-term regex search (AND logic - all terms must match)
  if (searchTerms.value.length > 0) {
    items = items.filter((item: NormalizedTestItem) => {
      const searchableText =
        `${item.NAME || ''} ${item.STATUS || ''} ${item.VALUE || ''}`.toLowerCase()
      // AND logic: every term must match
      return searchTerms.value.every((term: string) => {
        const trimmedTerm = term.trim().toLowerCase()
        if (!trimmedTerm) return true // Empty terms don't affect filtering
        try {
          const regex = new RegExp(trimmedTerm, 'i')
          return regex.test(searchableText)
        } catch {
          return searchableText.includes(trimmedTerm)
        }
      })
    })
  }

  // UPDATED: Apply score filter if active
  if (scoreFilterType.value && scoreFilterValue.value !== null && hasScores.value) {
    items = items.filter((item: NormalizedTestItem) => {
      if (item.score === undefined || item.score === null) return true // Keep items without scores
      const score = item.score * 10 // Convert to 0-10 scale for comparison
      // biome-ignore lint/style/noNonNullAssertion: scoreFilterValue !== null is checked in outer condition
      const filterValue = scoreFilterValue.value!
      switch (scoreFilterType.value) {
        case 'gt':
          return score > filterValue
        case 'gte':
          return score >= filterValue
        case 'lt':
          return score < filterValue
        case 'lte':
          return score <= filterValue
        case 'eq':
          return Math.abs(score - filterValue) < 0.01
        default:
          return true
      }
    })
  }

  return items
})

// Methods
function close(): void {
  isOpen.value = false
  searchTerms.value = []
  pendingSearchTerm.value = ''
}

function handleDownload(): void {
  emit('download')
}

function openOverallScoreDialog(): void {
  if (scoreSummaryPrimary.value) {
    showOverallScoreDialog.value = true
  }
}

function openForcedFailDialog(): void {
  if (forcedFailSummary.value?.clickable) {
    showForcedFailDialog.value = true
  }
}

// Score-related helpers
function getScoreColorClass(score: number): string {
  if (score >= 0.9) return 'text-success font-weight-bold'
  if (score >= 0.7) return 'text-primary font-weight-bold'
  if (score >= 0.5) return 'text-warning font-weight-bold'
  return 'text-error font-weight-bold'
}

function getScoringTypeColor(scoringType?: ScoringType): string {
  if (!scoringType) return 'grey'
  const info = SCORING_TYPE_INFO[scoringType]
  return info?.color ?? 'grey'
}

function formatScoringType(scoringType?: ScoringType): string {
  if (!scoringType) return 'Unknown'
  const info = SCORING_TYPE_INFO[scoringType]
  return info?.label ?? scoringType
}

function getScoringExplanation(scoringType?: ScoringType): string {
  const explanations: Record<ScoringType, string> = {
    symmetrical:
      'Linear scoring where the target is the midpoint between UCL and LCL. Score decreases linearly as the measured value moves away from the target toward either limit. At the target, score is 10.0. At UCL or LCL boundary, score is 1.0.',
    symmetrical_nl:
      'Non-linear (Gaussian) scoring centered on the midpoint. Score follows a bell curve, with faster degradation near the limits.',
    evm: 'EVM-style scoring optimized for Error Vector Magnitude measurements. Lower (more negative) values in dB are better. Uses a gentle decay exponent (0.25) from reference point of -35 dB.',
    throughput:
      'Throughput scoring where higher values are better. Score is 10.0 at or above UCL, and decreases toward LCL.',
    asymmetrical:
      'Scoring with a user-defined target that may not be centered between limits. Score degrades based on deviation from the specified target according to the selected policy.',
    per_mask:
      'Lower-is-better scoring ideal for PER/MASK measurements. Zero is the ideal value with score 10.0, score decreases linearly as the value approaches UCL (failure threshold).',
    binary:
      'Simple PASS/FAIL scoring. PASS status = 10.0, FAIL status = 0.0. No intermediate values.',
  }
  return explanations[scoringType ?? 'binary'] ?? 'Unknown scoring algorithm.'
}

// UPDATED: Get target label based on scoring type and policy
function getTargetLabel(item: NormalizedTestItem): string {
  const scoringType = item.scoringType

  // For asymmetrical scoring, use policy
  if (scoringType === 'asymmetrical' && item.policy) {
    switch (item.policy) {
      case 'higher':
        return 'Higher is Better'
      case 'lower':
        return 'Lower is Better'
      default:
        return 'Centered'
    }
  }

  // For other scoring types
  switch (scoringType) {
    case 'per_mask':
      return 'Lower is Better'
    case 'evm':
      return 'Lower is Better'
    case 'throughput':
      return 'Higher is Better'
    case 'symmetrical':
    case 'symmetrical_nl':
      return 'Centered'
    case 'binary':
      return 'Pass/Fail'
    default:
      return 'Centered'
  }
}

// UPDATED: Compute target using backend target value if available, otherwise compute locally
function computeTarget(item: NormalizedTestItem): string {
  // If target is provided from backend, use it
  if (item.target !== undefined && item.target !== null) {
    return item.target.toFixed(2)
  }

  // Fallback: compute target locally based on scoring type
  const ucl = parseFloat(item.UCL)
  const lcl = parseFloat(item.LCL)

  // For asymmetrical scoring with policy, compute target based on policy
  if (item.scoringType === 'asymmetrical' && item.policy) {
    switch (item.policy) {
      case 'higher':
        // Target is UCL for "higher is better"
        return Number.isNaN(ucl) ? '-' : ucl.toFixed(2)
      case 'lower':
        // Target is LCL for "lower is better"
        return Number.isNaN(lcl) ? '-' : lcl.toFixed(2)
      default:
        // For 'symmetrical' policy or unknown, use centered target
        break
    }
  }

  // For per_mask, target is 0
  if (item.scoringType === 'per_mask') {
    return '0.00'
  }

  // For evm, target is -35 dB
  if (item.scoringType === 'evm') {
    return '-35.00'
  }

  // For throughput, target is UCL
  if (item.scoringType === 'throughput') {
    return Number.isNaN(ucl) ? '-' : ucl.toFixed(2)
  }

  // For symmetrical scoring, target = (UCL + LCL) / 2
  if (!Number.isNaN(ucl) && !Number.isNaN(lcl)) {
    const target = (ucl + lcl) / 2
    return target.toFixed(2)
  }

  // For UCL only, target is 0 (assumed lower is better)
  if (!Number.isNaN(ucl) && Number.isNaN(lcl)) {
    return '0.00'
  }

  return '-'
}

// UPDATED: Format weight for display (e.g., "1.0x", "3.0x")
function formatWeight(weight?: number): string {
  const w = weight ?? 1.0
  return `${w.toFixed(1)}x`
}

function formatPolicyLabel(policy?: string): string {
  const policyLabels: Record<string, string> = {
    higher: 'Higher is Better',
    lower: 'Lower is Better',
    symmetrical: 'Centered',
  }

  return policyLabels[policy ?? ''] ?? policy ?? 'Unknown'
}

// UPDATED: Added helper to format policy for display
// function formatPolicy(policy?: string): string {
//   const policyLabels: Record<string, string> = {
//     higher: 'Higher is Better',
//     lower: 'Lower is Better',
//     symmetrical: 'Centered',
//   }
//   return policyLabels[policy ?? ''] ?? policy ?? 'Unknown'
// }

// UPDATED: Added helper to get formula for score breakdown display
function getScoringFormula(scoringType?: ScoringType): string {
  const formulas: Record<ScoringType, string> = {
    symmetrical: 'Score = 1 + 9 × (L - |x - T|) / L, where T = (UCL + LCL) / 2',
    symmetrical_nl: 'Score = exp(-((x - T) / σ)²), Gaussian decay',
    evm: 'Score = 1 + 9 × (1 - (x - ref) / (UCL - ref))^0.25, ref = -35 dB',
    throughput: 'Score = 1 + 9 × (x - LCL) / (UCL - LCL)',
    asymmetrical: 'Score = 1 + 9 × (L - d) / L, with policy-based limit selection',
    per_mask: 'Score = 1 + 9 × (UCL - x) / UCL, where 0 is ideal',
    binary: 'Score = 10.0 if PASS, 0.0 if FAIL',
  }
  return formulas[scoringType ?? 'binary'] ?? 'Unknown formula'
}

// Handle row click to show score breakdown
function handleRowClick(event: unknown): void {
  const row = event as { data?: NormalizedTestItem; item?: NormalizedTestItem }
  const item = row.data ?? row.item

  if (hasScores.value && item?.score !== undefined) {
    showScoreBreakdown(item)
  }
}

// Show score breakdown dialog
function showScoreBreakdown(item: NormalizedTestItem): void {
  selectedTestItem.value = item
  showBreakdownDialog.value = true
}

// Reset filters when record changes - always default to Show All
watch(
  () => props.record,
  () => {
    // UPDATED: Always default to Show All
    testItemFilter.value = 'all'
    searchTerms.value = []
    pendingSearchTerm.value = ''
    // Clear score filter
    scoreFilterType.value = null
    scoreFilterValue.value = null
  },
)
</script>

<style scoped>
.iplas-details-dialog {
  --iplas-border: var(--app-border);
  --iplas-border-strong: rgba(15, 23, 42, 0.18);
  --iplas-border-accent: rgba(14, 165, 233, 0.24);
  --iplas-panel: var(--app-panel);
  --iplas-panel-strong: var(--app-panel-strong);
  --iplas-muted: var(--app-muted);
  --iplas-ink: var(--app-ink);
  --iplas-accent: var(--app-accent);
}

:global(.app-dark) .iplas-details-dialog {
  --iplas-border-strong: rgba(241, 245, 249, 0.2);
  --iplas-border-accent: rgba(56, 189, 248, 0.32);
}

.iplas-details-dialog__header,
.iplas-details-dialog__header-copy,
.iplas-details-dialog__header-actions,
.iplas-details-dialog__body,
.iplas-details-dialog__filters,
.iplas-details-dialog__score-filter-grid,
.iplas-details-dialog__stats-grid,
.iplas-details-dialog__metric-list,
.iplas-details-dialog__footer-actions,
.iplas-details-subdialog,
.iplas-details-dialog__score-overview,
.iplas-details-dialog__summary-grid,
.iplas-details-dialog__metadata-grid,
.iplas-details-dialog__meta-pills,
.iplas-details-dialog__chip-select,
.iplas-details-dialog__token-list {
  display: grid;
  gap: 1rem;
}

.iplas-details-dialog__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.iplas-details-dialog__header-copy {
  grid-template-columns: auto 1fr;
  align-items: flex-start;
}

.iplas-details-dialog__header-copy h2,
.iplas-details-dialog__score-overview h2 {
  margin: 0;
  color: var(--iplas-ink);
}

.iplas-details-dialog__dialog-title {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
}

.iplas-details-dialog__dialog-title h2 {
  margin: 0;
  color: inherit;
  font-size: 1.34rem;
  font-weight: 700;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.iplas-details-dialog__dialog-title :deep(svg) {
  font-size: 1.08rem;
  color: currentColor;
  flex-shrink: 0;
}

.iplas-details-dialog__header-copy p,
.iplas-details-dialog__metric-caption,
.iplas-details-dialog__metric-secondary,
.iplas-details-dialog__muted,
.iplas-details-dialog__empty-state p,
.iplas-details-dialog__loading-state p,
.iplas-details-dialog__range-copy,
.iplas-details-dialog__notice p,
.forced-fail-item-title,
.forced-fail-item-append,
.score-formula-step .iplas-details-dialog__muted {
  margin: 0;
  color: var(--iplas-muted);
  line-height: 1.55;
}

.iplas-details-dialog__eyebrow,
.iplas-details-dialog__metric-label,
.iplas-details-dialog__field>span,
.iplas-details-dialog__range-copy strong,
.iplas-details-dialog__metric-row small {
  margin: 0;
  color: var(--iplas-muted);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.iplas-details-dialog__header-icon,
.iplas-details-dialog__info-icon,
.forced-fail-item__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 0.75rem;
  background: var(--app-panel-strong);
  color: var(--app-info);
  font-size: 1.05rem;
  flex-shrink: 0;
}

.iplas-details-dialog__info-icon--warning,
.iplas-details-dialog__info-icon--danger {
  background: var(--app-danger-soft);
  color: var(--app-danger);
}

.iplas-details-dialog__info-icon--success {
  background: var(--app-success-soft);
  color: var(--app-success);
}

.iplas-details-dialog__summary-grid {
  grid-template-columns: minmax(0, 1.2fr) repeat(2, minmax(0, 1fr));
  align-items: stretch;
}

.iplas-details-dialog__metadata-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.iplas-details-dialog__stats-grid,
.iplas-details-dialog__score-filter-grid {
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
}

.iplas-details-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  height: 100%;
}

.iplas-details-dialog__body--fullscreen {
  flex: 1;
  overflow: hidden;
}

.iplas-details-dialog__summary-card,
.iplas-details-dialog__metadata-card,
.score-explanation-stat,
.score-explanation-primary,
.score-formula-panel,
.iplas-details-dialog__table-shell,
.iplas-details-dialog__notice,
.iplas-details-dialog__metric-list,
.iplas-details-dialog__simple-list,
.iplas-details-dialog__explanation-card {
  border: 1px solid var(--iplas-border-strong);
  border-radius: 1rem;
  background: var(--iplas-panel);
}

.iplas-details-dialog__summary-card,
.iplas-details-dialog__metadata-card,
.iplas-details-dialog__filters,
.iplas-breakdown__name-card,
.iplas-breakdown__rows-container,
.iplas-details-dialog__explanation-card {
  border-color: var(--iplas-border-strong);
}

.iplas-details-dialog__summary-card,
.iplas-details-dialog__metadata-card,
.iplas-details-dialog__notice,
.score-explanation-stat,
.score-explanation-primary,
.score-formula-panel,
.iplas-details-dialog__metric-list,
.iplas-details-dialog__simple-list,
.iplas-details-dialog__table-shell {
  padding: 1rem 1.1rem;
}

.iplas-details-dialog__table-shell {
  padding: 0.55rem 0.55rem 0;
  overflow: hidden;
}

.iplas-details-dialog__summary-card--highlight,
.iplas-details-dialog__summary-card--score {
  border-color: var(--iplas-border-accent);
  background: var(--app-panel);
}

.iplas-details-dialog__summary-card {
  box-shadow: none;
}

.iplas-details-dialog__metadata-card {
  border-color: var(--iplas-border-strong);
  background: var(--iplas-panel-strong);
  box-shadow: none;
}

.iplas-details-dialog__download-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.2rem;
  padding: 0.4rem 0.9rem;
  border: 1px solid color-mix(in srgb, rgba(255, 255, 255, 0.58) 60%, var(--app-border));
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--app-panel-strong) 90%, rgba(255, 255, 255, 0.14));
  color: var(--app-ink);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  box-shadow: none;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.iplas-details-dialog__download-button:hover {
  background: color-mix(in srgb, var(--app-panel-strong) 82%, rgba(255, 255, 255, 0.18));
  border-color: color-mix(in srgb, rgba(255, 255, 255, 0.82) 50%, var(--app-border));
  transform: translateY(-1px);
}

.iplas-details-dialog__download-button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.iplas-details-dialog__info-button,
.iplas-details-dialog__copy-row,
.forced-fail-item,
.iplas-details-dialog__chip-option,
.iplas-details-dialog__button,
.iplas-details-dialog__score-chip,
.iplas-details-dialog__ghost-action {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.iplas-details-dialog__info-button,
.iplas-details-dialog__copy-row {
  width: 100%;
  display: flex;
  gap: 0.72rem;
  align-items: center;
  text-align: left;
  cursor: pointer;
}

.iplas-details-dialog__info-button--static,
.iplas-details-dialog__copy-row--static {
  cursor: default;
}

.iplas-details-dialog__info-button small,
.iplas-details-dialog__info-button strong,
.iplas-details-dialog__copy-row strong,
.iplas-details-dialog__copy-row span,
.iplas-details-dialog__metric-row strong,
.iplas-details-dialog__stat-value {
  display: block;
}

.iplas-details-dialog__info-button strong,
.iplas-details-dialog__metric-row strong,
.iplas-details-dialog__stat-value,
.iplas-details-dialog__metric-value {
  color: var(--iplas-ink);
  font-weight: 700;
  overflow-wrap: anywhere;
}

.iplas-details-dialog__summary-card .iplas-details-dialog__info-button small {
  font-size: 0.92rem;
}

.iplas-details-dialog__summary-card .iplas-details-dialog__info-button strong {
  font-size: clamp(1.4rem, 1.15rem + 0.75vw, 1.85rem);
  line-height: 1.15;
}

.iplas-details-dialog__metric-value,
.score-explanation-primary__score {
  font-size: clamp(1.3rem, 2vw, 2rem);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.iplas-details-dialog__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.42rem 0.72rem;
  border-radius: 999px;
  border: 1px solid var(--iplas-border);
  background: var(--iplas-panel-strong);
  color: var(--iplas-ink);
  width: fit-content;
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: 0.78rem;
}

.iplas-details-dialog__meta-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.iplas-details-dialog__filters {
  grid-template-columns: minmax(0, 1.9fr) minmax(0, 0.95fr);
  align-items: end;
  padding: 0.82rem 0.9rem;
  border: 1px solid var(--iplas-border-strong);
  border-radius: 1rem;
  background: var(--iplas-panel);
}

.iplas-details-dialog__filters--has-scores {
  grid-template-columns: minmax(0, 1.9fr) minmax(0, 0.95fr) minmax(0, 0.95fr) minmax(0, 0.8fr);
}

.iplas-details-dialog__pill--cool {
  background: var(--app-info-soft);
  border-color: var(--app-info-line);
  color: var(--app-info);
}

.iplas-details-dialog__pill--neutral {
  background: rgba(95, 103, 122, 0.1);
  border-color: rgba(95, 103, 122, 0.16);
  color: var(--app-muted);
}

.iplas-details-dialog__pill--success {
  background: var(--app-success-soft);
  border-color: var(--app-success-line);
  color: var(--app-success);
}

.iplas-details-dialog__pill--warning {
  background: color-mix(in srgb, var(--app-danger) 8%, transparent);
  border-color: color-mix(in srgb, var(--app-danger) 18%, transparent);
  color: var(--app-danger);
}

.iplas-details-dialog__pill--danger {
  background: var(--app-danger-soft);
  border-color: var(--app-danger-line);
  color: var(--app-danger);
}

.iplas-details-dialog__pill--interactive {
  cursor: pointer;
}

.iplas-details-dialog__field {
  display: grid;
  gap: 0.45rem;
}

.iplas-details-dialog__field>span {
  color: var(--iplas-ink);
  font-size: 0.74rem;
}

.iplas-details-dialog__field input,
.iplas-details-dialog__field select,
.iplas-details-dialog__search-shell,
.iplas-details-dialog__token-shell {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.7rem;
  background: var(--iplas-panel-strong);
  color: var(--iplas-ink);
}

.iplas-details-dialog__field input:focus,
.iplas-details-dialog__field select:focus,
.iplas-details-dialog__search-shell:focus-within,
.iplas-details-dialog__token-shell:focus-within {
  border-color: rgba(15, 118, 110, 0.4);
}

.iplas-details-dialog__field input,
.iplas-details-dialog__field select {
  padding: 0.68rem 0.8rem;
}

.iplas-details-dialog__search-shell,
.iplas-details-dialog__token-shell {
  display: grid;
  gap: 0.6rem;
  padding: 0.68rem 0.8rem;
}

.iplas-details-dialog__search-shell {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.iplas-details-dialog__search-shell input,
.iplas-details-dialog__token-shell input {
  border: 0;
  box-shadow: none;
  background: transparent;
  padding: 0;
  min-width: 0;
}

.iplas-details-dialog__search-shell input:focus,
.iplas-details-dialog__field input:focus,
.iplas-details-dialog__field select:focus {
  outline: none;
}

.iplas-details-dialog__token-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.iplas-details-dialog__token,
.iplas-details-dialog__chip-option,
.iplas-details-dialog__score-chip,
.iplas-details-dialog__button,
.iplas-details-dialog__ghost-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.55rem 0.8rem;
  border-radius: 999px;
  cursor: pointer;
}

.iplas-details-dialog__token,
.iplas-details-dialog__chip-option,
.iplas-details-dialog__ghost-action,
.iplas-details-dialog__button--ghost {
  background: var(--app-info-soft);
  color: var(--app-info);
}

.iplas-details-dialog__chip-select {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.iplas-details-dialog__score-button-layout {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
}

.iplas-details-dialog__chip-option--active {
  background: var(--iplas-accent);
  color: var(--app-canvas);
}

.iplas-details-dialog__button {
  border: 1px solid transparent;
  font-weight: 700;
}

.iplas-details-dialog__header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.iplas-details-dialog__table-shell,
.iplas-details-dialog__loading-state,
.iplas-details-dialog__empty-state,
.iplas-details-dialog__footer-actions {
  display: grid;
  gap: 0.8rem;
}

.iplas-details-dialog__table-shell {
  flex: 1;
  min-height: 23rem;
  max-height: min(58vh, 36rem);
}

.iplas-details-dialog__body--fullscreen .iplas-details-dialog__table-shell {
  min-height: 0;
  max-height: none;
}

.iplas-details-dialog__notice--warning {
  border-color: var(--app-warning-line);
  background: var(--app-warning-soft);
}

.iplas-details-dialog__loading-state,
.iplas-details-dialog__empty-state,
.iplas-details-dialog__footer-actions {
  justify-items: center;
  text-align: center;
}

.iplas-details-dialog__metric-list {
  gap: 0.65rem;
}

.iplas-details-dialog__metric-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.85rem;
  border-radius: 0.8rem;
  background: var(--iplas-panel-strong);
}

.iplas-details-dialog__metric-row--score {
  border: 1px solid var(--app-success-line);
  background: var(--iplas-panel);
}

.iplas-details-dialog__simple-list {
  max-height: 24rem;
  overflow-y: auto;
}

.forced-fail-item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 0;
  border-bottom: 1px solid var(--iplas-border);
  cursor: pointer;
}

.forced-fail-item:last-child {
  border-bottom: 0;
}

.forced-fail-item__copy,
.forced-fail-item-append,
.iplas-details-dialog__score-overview {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.forced-fail-item-title {
  color: var(--iplas-ink);
  text-align: left;
}

.iplas-details-dialog__score-chip {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  min-width: 5.25rem;
}

.iplas-details-dialog__score-chip--success {
  background: var(--app-success-soft);
  color: var(--app-success);
}

.iplas-details-dialog__score-chip--primary {
  background: var(--app-info-soft);
  color: var(--app-info);
}

.iplas-details-dialog__score-chip--warning {
  background: color-mix(in srgb, var(--app-info) 10%, transparent);
  color: var(--app-info);
}

/* ── Score Breakdown bordered-list ── */
.iplas-breakdown__name-card {
  padding: 0.9rem 1rem;
  border: 1px solid var(--iplas-border-strong);
  border-radius: 0.9rem;
  background: var(--iplas-panel);
}

.iplas-breakdown__name-text {
  color: var(--app-info);
  font-weight: 700;
  font-size: 0.95rem;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.iplas-breakdown__rows-container {
  border: 1px solid var(--iplas-border-strong);
  border-radius: 0.9rem;
  background: var(--iplas-panel);
  overflow: hidden;
}

.iplas-breakdown__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--iplas-border-strong);
}

.iplas-breakdown__row:last-child {
  border-bottom: 0;
}

.iplas-breakdown__row-left {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.iplas-breakdown__row-right {
  flex-shrink: 0;
}

.iplas-breakdown__row-label {
  color: var(--iplas-ink);
  font-weight: 500;
  overflow-wrap: anywhere;
}

.iplas-breakdown__row-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  font-size: 1.05rem;
  color: var(--app-muted);
}

.iplas-breakdown__row-icon--red {
  color: #ef4444;
}

.iplas-breakdown__row-icon--orange {
  color: #f97316;
}

.iplas-breakdown__row-icon--blue {
  color: #2196f3;
}

.iplas-breakdown__row-icon--green {
  color: #22c55e;
}

.iplas-breakdown__row-icon--purple {
  color: #8b5cf6;
}

.iplas-breakdown__row-icon--amber {
  color: #eab308;
}

.iplas-breakdown__row-icon--muted {
  color: var(--app-muted);
}

.iplas-breakdown__row-icon--star {
  color: #2196f3;
}

.iplas-breakdown__value-text {
  color: var(--iplas-ink);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.iplas-breakdown__value--warning {
  color: var(--app-danger);
}

.iplas-breakdown__value-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 600;
}

.iplas-breakdown__value-pill--cool {
  background: var(--app-info-soft);
  color: var(--app-info);
}

.iplas-breakdown__value-pill--neutral {
  background: rgba(95, 103, 122, 0.1);
  color: var(--app-muted);
}

.iplas-details-dialog__score-chip--danger {
  background: var(--app-danger-soft);
  color: var(--app-danger);
}

.iplas-details-dialog__explanation-card {
  padding: 0.9rem;
  border: 1px solid var(--iplas-border-strong);
}

.iplas-details-dialog__table-shell :deep(.p-datatable-wrapper),
.iplas-details-dialog__table-shell :deep(.p-datatable-table-container) {
  max-width: 100%;
  overflow-x: auto;
  touch-action: pan-x pan-y;
}

:deep(.iplas-details-dialog.app-dialog--fullscreen .p-dialog-content) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

:deep(.iplas-details-dialog.app-dialog--fullscreen .app-dialog__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.iplas-details-dialog__table-shell>.app-data-grid {
  display: flex;
  flex: 1;
  min-height: 0;
  height: 100%;
}

.iplas-details-dialog__table-shell :deep(.p-datatable) {
  display: flex;
  flex: 1;
  min-height: 0;
  height: 100%;
  flex-direction: column;
}

.iplas-details-dialog__table-shell :deep(.p-datatable-wrapper),
.iplas-details-dialog__table-shell :deep(.p-datatable-table-container) {
  flex: 1 1 auto;
  min-height: 0;
}

.iplas-details-dialog__table-shell :deep(.p-datatable-table-container) {
  overflow-y: auto;
}

.iplas-details-dialog__table-shell :deep(.app-data-grid__table--sticky-header .p-datatable-thead > tr > th) {
  z-index: 4;
}

.iplas-details-dialog__explanation-card summary {
  cursor: pointer;
  font-weight: 700;
  color: var(--iplas-ink);
}

.iplas-details-dialog__explanation-body {
  display: grid;
  gap: 0.9rem;
  margin-top: 1rem;
}

.iplas-details-dialog__range-copy ul {
  margin: 0.5rem 0 0;
  padding-left: 1.2rem;
}

.iplas-details-dialog__stat-value {
  font-size: 1.35rem;
}

.iplas-details-dialog__spin {
  animation: iplas-details-dialog-spin 1s linear infinite;
}

.iplas-details-dialog__muted {
  color: var(--iplas-muted);
}

@keyframes iplas-details-dialog-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.gap-2 {
  gap: 0.5rem;
}

.gap-3 {
  gap: 0.75rem;
}

.cursor-pointer {
  cursor: pointer;
}

.timing-status-row {
  align-items: center;
}

.timing-meta-chip {
  font-size: 0.92rem;
  font-weight: 600;
}

.summary-stat-button {
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.summary-stat-button__content {
  min-width: 0;
}

.summary-stat-button:hover .text-body-2,
.summary-stat-button:focus-visible .text-body-2 {
  color: var(--iplas-ink) !important;
}

.summary-stat-button:focus-visible {
  outline: 2px solid rgba(15, 118, 110, 0.32);
  outline-offset: 4px;
  border-radius: 10px;
}

.score-explanation-stat {
  height: 100%;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  border: 1px solid var(--app-border);
  background: var(--iplas-panel);
}

.score-explanation-primary {
  padding: 1rem;
  border-radius: 14px;
  border: 1px solid var(--app-success-line);
  background: var(--iplas-panel);
}

.score-explanation-primary__score {
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.score-formula-code {
  display: inline-block;
  white-space: normal;
  overflow-wrap: anywhere;
}

.score-formula-panel {
  padding: 1rem;
  border-radius: 14px;
  border: 1px solid var(--app-border);
  background: var(--iplas-panel);
}

.score-formula-equation {
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: var(--iplas-panel-strong);
  border: 1px solid var(--app-border);
  font-family: Consolas, 'Courier New', monospace;
  overflow-wrap: anywhere;
}

.score-formula-step {
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  background: var(--iplas-panel-strong);
}

.score-formula-steps {
  display: grid;
  gap: 0.75rem;
}

.score-formula-step {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 0.75rem;
  align-items: start;
}

.score-formula-step__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--app-info-soft);
  color: var(--app-info);
  font-size: 0.8rem;
  font-weight: 700;
}

.status-text {
  display: inline-block;
  min-width: 84px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.table-value {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
}

.table-limit {
  color: var(--iplas-muted);
  font-variant-numeric: tabular-nums;
}

.score-cell-chip {
  min-width: 70px;
  justify-content: center;
  font-variant-numeric: tabular-nums;
}

:deep(.v-table--striped tbody tr:nth-of-type(even)) {
  background-color: var(--iplas-panel-strong);
}

:deep(.v-theme--dark .v-table--striped tbody tr:nth-of-type(even)) {
  background-color: var(--iplas-panel-strong);
}

/* Clickable rows styling when scores are available */
.clickable-rows :deep(tbody tr) {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.clickable-rows :deep(tbody tr:hover) {
  background-color: var(--iplas-panel-strong) !important;
}

.forced-fail-item :deep(.v-list-item__content) {
  overflow: visible;
}

.forced-fail-item-title {
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.35;
}

.forced-fail-item-append {
  flex-wrap: nowrap;
}

.iplas-details-dialog__eyebrow {
  margin: 0 0 0.3rem;
  color: var(--iplas-muted);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.iplas-details-dialog__data-grid-shell {
  min-width: 0;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--iplas-panel);
  overflow: hidden;
}

.iplas-details-dialog__row-copy {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.iplas-details-dialog__icon-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--iplas-panel-strong);
  color: var(--iplas-ink);
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
}

.iplas-details-dialog__icon-action:hover {
  border-color: var(--iplas-accent);
  background: var(--iplas-panel);
  transform: translateY(-1px);
}

.iplas-details-dialog__breakdown-hero {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: linear-gradient(180deg, var(--iplas-panel-strong), var(--iplas-panel));
}

.iplas-details-dialog__breakdown-hero h3 {
  margin: 0;
  color: var(--iplas-ink);
  font-size: 1rem;
}

.iplas-details-dialog__breakdown-hero-score {
  display: grid;
  justify-items: end;
  align-content: start;
  gap: 0.45rem;
}

.iplas-details-dialog__breakdown-label {
  font-weight: 700;
  color: var(--iplas-ink);
  overflow-wrap: anywhere;
}

.iplas-details-dialog__stats-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

@media (max-width: 840px) {

  .iplas-details-dialog__header,
  .iplas-details-dialog__score-overview,
  .forced-fail-item,
  .iplas-details-dialog__breakdown-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .iplas-details-dialog__header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .iplas-details-dialog__summary-grid,
  .iplas-details-dialog__metadata-grid,
  .iplas-details-dialog__stats-grid,
  .iplas-details-dialog__filters,
  .iplas-details-dialog__filters--has-scores,
  .iplas-details-dialog__score-filter-grid,
  .iplas-details-dialog__stats-row {
    grid-template-columns: 1fr;
  }

  .summary-stat-button {
    width: 100%;
  }

  .iplas-details-dialog__breakdown-hero-score {
    justify-items: start;
  }
}
</style>
