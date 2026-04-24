<template>
  <AppDialog
    v-model="isOpen"
    :width="isFullscreen ? '98vw' : 'min(96vw, 78rem)'"
    :breakpoints="isFullscreen ? { '960px': '98vw', '640px': '100vw' } : { '1200px': '94vw', '768px': '98vw' }"
    maximizable
    :closable="false"
    class="iplas-details-dialog"
  >
    <template #header>
      <div class="iplas-details-dialog__header">
        <div class="iplas-details-dialog__header-copy">
          <span class="iplas-details-dialog__header-icon">
            <Icon icon="mdi:table-eye" />
          </span>
          <div>
            <p class="iplas-details-dialog__eyebrow">Record Detail</p>
            <h2>Test Items Details</h2>
            <p v-if="record">Inspect test items, copy identifiers, and review score reasoning for this DUT record.</p>
          </div>
        </div>

        <div class="iplas-details-dialog__header-actions">
          <button
            type="button"
            class="iplas-details-dialog__button iplas-details-dialog__button--ghost"
            :disabled="downloading"
            @click="handleDownload"
          >
            <Icon :icon="downloading ? 'mdi:loading' : 'mdi:download'" :class="{ 'iplas-details-dialog__spin': downloading }" />
            <span>{{ downloading ? 'Downloading...' : 'Download' }}</span>
          </button>
          <button
            type="button"
            class="iplas-details-dialog__button iplas-details-dialog__button--ghost"
            @click="isFullscreen = !isFullscreen"
          >
            <Icon :icon="isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" />
            <span>{{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}</span>
          </button>
          <button type="button" class="iplas-details-dialog__button iplas-details-dialog__button--ghost" @click="close">
            <Icon icon="mdi:close" />
            <span>Close</span>
          </button>
        </div>
      </div>
    </template>

    <div v-if="record" class="iplas-details-dialog__body" :class="{ 'iplas-details-dialog__body--fullscreen': isFullscreen }">
      <section class="iplas-details-dialog__summary-grid">
        <article class="iplas-details-dialog__summary-card iplas-details-dialog__summary-card--highlight">
          <button type="button" class="iplas-details-dialog__info-button" @click="copyToClipboard(record.isn)">
            <span class="iplas-details-dialog__info-icon"><Icon icon="mdi:barcode" /></span>
            <span>
              <small>DUT ISN</small>
              <strong>{{ record.isn || '-' }}</strong>
            </span>
          </button>
        </article>

        <article class="iplas-details-dialog__summary-card">
          <div class="iplas-details-dialog__info-button iplas-details-dialog__info-button--static">
            <span class="iplas-details-dialog__info-icon"><Icon icon="mdi:factory" /></span>
            <span>
              <small>Station</small>
              <strong>{{ record.displayStationName || record.stationName }}</strong>
            </span>
          </div>
        </article>

        <article v-if="scoreSummaryPrimary" class="iplas-details-dialog__summary-card iplas-details-dialog__summary-card--score">
          <button type="button" class="summary-stat-button" @click="openOverallScoreDialog">
            <div class="iplas-details-dialog__score-button-layout">
              <span class="iplas-details-dialog__info-icon" :class="`iplas-details-dialog__info-icon--${scoreSummaryIconColor}`">
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
        <button type="button" class="iplas-details-dialog__pill" :class="statusPillClass(record.errorCode)" @click="copyToClipboard(record.errorCode)">
          <Icon :icon="isStatusPass(record.errorCode) ? 'mdi:check-circle' : 'mdi:alert-circle'" />
          <strong>Status:</strong>
          <span>{{ record.errorCode }}</span>
        </button>
        <button
          v-if="forcedFailSummary"
          type="button"
          class="iplas-details-dialog__pill iplas-details-dialog__pill--warning"
          :class="{ 'iplas-details-dialog__pill--interactive': forcedFailSummary.clickable }"
          @click="openForcedFailDialog"
        >
          <Icon icon="mdi:alert-octagon" />
          <strong>Forced Fail:</strong>
          <span>{{ forcedFailSummary.detailText }}</span>
        </button>
        <button
          v-if="record.errorName && record.errorName !== 'N/A' && !isStatusPass(record.errorCode)"
          type="button"
          class="iplas-details-dialog__pill iplas-details-dialog__pill--danger"
          @click="copyToClipboard(record.errorName)"
        >
          <Icon icon="mdi:alert-octagon" />
          <strong>Error:</strong>
          <span>{{ record.errorName }}</span>
        </button>
      </section>

      <section class="iplas-details-dialog__filters">
        <label class="iplas-details-dialog__field">
          <span>Search Test Items (Regex)</span>
          <div class="iplas-details-dialog__token-shell">
            <div v-if="searchTerms.length > 0" class="iplas-details-dialog__token-list">
              <button
                v-for="term in searchTerms"
                :key="term"
                type="button"
                class="iplas-details-dialog__token"
                @click="removeSearchTerm(term)"
              >
                <span>{{ term }}</span>
                <Icon icon="mdi:close" />
              </button>
            </div>
            <div class="iplas-details-dialog__search-shell">
              <Icon icon="mdi:magnify" />
              <input
                v-model="pendingSearchTerm"
                type="text"
                placeholder="Type and press Enter (AND logic)..."
                @keydown="handleSearchTermKeydown"
                @blur="commitSearchTerms()"
              />
              <button v-if="searchTerms.length > 0 || pendingSearchTerm" type="button" class="iplas-details-dialog__ghost-action" @click="clearSearchTerms">
                Clear
              </button>
            </div>
          </div>
        </label>

        <label class="iplas-details-dialog__field">
          <span>Data Type</span>
          <div class="iplas-details-dialog__chip-select">
            <button
              v-for="option in testItemFilterOptions"
              :key="option.value"
              type="button"
              class="iplas-details-dialog__chip-option"
              :class="{ 'iplas-details-dialog__chip-option--active': testItemFilter.includes(option.value) }"
              @click="toggleTestItemFilter(option.value)"
            >
              {{ option.title }}
            </button>
          </div>
        </label>

        <div v-if="hasScores" class="iplas-details-dialog__score-filter-grid">
          <label class="iplas-details-dialog__field">
            <span>Score Filter</span>
            <select v-model="scoreFilterType">
              <option :value="null">No filter</option>
              <option v-for="option in scoreFilterOptions" :key="option.value" :value="option.value">{{ option.title }}</option>
            </select>
          </label>
          <label class="iplas-details-dialog__field">
            <span>Value (0-10)</span>
            <input v-model.number="scoreFilterValue" type="number" min="0" max="10" step="0.1" :disabled="!scoreFilterType" placeholder="0.00" />
          </label>
        </div>
      </section>

      <section class="iplas-details-dialog__table-shell">
        <div v-if="loadingTestItems" class="iplas-details-dialog__loading-state">
          <Icon icon="mdi:loading" class="iplas-details-dialog__spin" />
          <div>
            <strong>Loading test items...</strong>
            <p>Fetching detailed rows for fullscreen inspection.</p>
          </div>
        </div>

        <AppDataGrid
          :columns="testItemColumns"
          :rows="tableTestItems"
          data-key="NAME"
          :paginator="false"
          :rows-per-page="50"
          :loading="loadingTestItems"
          scroll-height="flex"
          :table-style="{ minWidth: '56rem' }"
          :row-class="hasScores ? scoreTableRowClass : undefined"
          @row-click="handleRowClick"
        >
          <template #cell-statusSort="{ data }">
            <span class="status-text" :class="getStatusTextClass(String(data.statusDisplay || ''))">
              {{ data.statusDisplay }}
            </span>
          </template>
          <template #cell-VALUE="{ data }">
            <span class="table-value" :class="getValueClass(data as NormalizedTestItem)">{{ formatTableValue(data as NormalizedTestItem) }}</span>
          </template>
          <template #cell-UCL="{ value }">
            <span class="table-limit">{{ value || '-' }}</span>
          </template>
          <template #cell-LCL="{ value }">
            <span class="table-limit">{{ value || '-' }}</span>
          </template>
          <template #cell-scoreSort="{ data }">
            <button
              v-if="data.score !== undefined && data.score !== null"
              type="button"
              class="iplas-details-dialog__score-chip"
              :class="`iplas-details-dialog__score-chip--${scoreTone(data.score)}`"
              @click.stop="showScoreBreakdown(data as NormalizedTestItem)"
            >
              {{ formatScoreValue(data.score) }}
            </button>
            <span v-else class="iplas-details-dialog__muted">-</span>
          </template>
        </AppDataGrid>
      </section>
    </div>
  </AppDialog>

  <AppDialog
    v-model="showForcedFailDialog"
    title="Forced Fail Items"
    description="Review the scored items that fell below the minimum threshold."
    width="min(92vw, 56rem)"
  >
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

      <div class="iplas-details-dialog__simple-list">
        <button
          v-for="item in filteredForcedFailureDetails"
          :key="item.name"
          type="button"
          class="forced-fail-item"
          @click="copyToClipboard(item.name)"
        >
          <div class="forced-fail-item__copy">
            <span class="forced-fail-item__icon"><Icon icon="mdi:alert-circle" /></span>
            <span class="forced-fail-item-title" :title="item.name">{{ item.name }}</span>
          </div>
          <div class="forced-fail-item-append">
            <span class="iplas-details-dialog__score-chip" :class="`iplas-details-dialog__score-chip--${scoreTone(item.score)}`">
              {{ (item.score * 10).toFixed(2) }} / 10
            </span>
            <Icon icon="mdi:content-copy" />
          </div>
        </button>
        <div v-if="filteredForcedFailureDetails.length === 0" class="iplas-details-dialog__empty-state">
          <Icon icon="mdi:database-search-outline" />
          <p>No failed items match the current search.</p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="iplas-details-dialog__footer-actions">
        <button type="button" class="iplas-details-dialog__button iplas-details-dialog__button--ghost" @click="showForcedFailDialog = false">
          Close
        </button>
      </div>
    </template>
  </AppDialog>

  <AppDialog
    v-model="showBreakdownDialog"
    title="Score Breakdown"
    description="Trace the selected test item's thresholds, target, and scoring method."
    width="min(92vw, 34rem)"
    persistent
  >
    <div v-if="selectedTestItem" class="iplas-details-subdialog">
      <section class="iplas-details-dialog__notice iplas-details-dialog__notice--info">
        <strong>{{ selectedTestItem.NAME }}</strong>
      </section>

      <div class="iplas-details-dialog__metric-list">
        <article class="iplas-details-dialog__metric-row">
          <div>
            <small>Upper Criteria Limit (UCL)</small>
            <strong>{{ selectedTestItem.UCL || '-' }}</strong>
          </div>
          <Icon icon="mdi:arrow-up-bold" />
        </article>
        <article class="iplas-details-dialog__metric-row">
          <div>
            <small>Lower Criteria Limit (LCL)</small>
            <strong>{{ selectedTestItem.LCL || '-' }}</strong>
          </div>
          <Icon icon="mdi:arrow-down-bold" />
        </article>
        <article class="iplas-details-dialog__metric-row">
          <div>
            <small>Measured Value</small>
            <strong>{{ selectedTestItem.VALUE }}</strong>
          </div>
          <Icon icon="mdi:speedometer" />
        </article>
        <article class="iplas-details-dialog__metric-row">
          <div>
            <small>Target ({{ getTargetLabel(selectedTestItem) }})</small>
            <strong>{{ computeTarget(selectedTestItem) }}</strong>
          </div>
          <Icon icon="mdi:target" />
        </article>
        <article class="iplas-details-dialog__metric-row">
          <div>
            <small>Scoring Algorithm</small>
            <strong>{{ formatScoringType(selectedTestItem.scoringType) }}</strong>
          </div>
          <Icon icon="mdi:function-variant" />
        </article>
        <article class="iplas-details-dialog__metric-row">
          <div>
            <small>Score Weight</small>
            <strong>{{ formatWeight(selectedTestItem.weight) }}</strong>
          </div>
          <Icon icon="mdi:weight" />
        </article>
        <article v-if="selectedTestItem.deviation !== undefined" class="iplas-details-dialog__metric-row">
          <div>
            <small>Deviation from Target</small>
            <strong>{{ selectedTestItem.deviation?.toFixed(2) }}</strong>
          </div>
          <Icon icon="mdi:delta" />
        </article>
        <article class="iplas-details-dialog__metric-row iplas-details-dialog__metric-row--score">
          <div>
            <small>Final Score</small>
            <strong>{{ selectedTestItem.score !== undefined ? ((selectedTestItem.score ?? 0) * 10).toFixed(2) : '-' }} / 10</strong>
          </div>
          <span class="iplas-details-dialog__score-chip" :class="`iplas-details-dialog__score-chip--${scoreTone(selectedTestItem.score ?? 0)}`">
            {{ selectedTestItem.score !== undefined ? ((selectedTestItem.score ?? 0) * 10).toFixed(2) : '-' }}
          </span>
        </article>
      </div>

      <details class="iplas-details-dialog__explanation-card">
        <summary>
          <span><Icon icon="mdi:help-circle-outline" /> How is this score calculated?</span>
        </summary>
        <div class="iplas-details-dialog__explanation-body">
          <p>{{ getScoringExplanation(selectedTestItem.scoringType) }}</p>
          <div class="iplas-details-dialog__notice iplas-details-dialog__notice--info">
            <strong>Formula</strong>
            <code>{{ getScoringFormula(selectedTestItem.scoringType) }}</code>
          </div>
          <div class="iplas-details-dialog__range-copy">
            <strong>Score Range:</strong> 0.00 - 10.00
            <ul>
              <li><strong>10.00</strong> = At target (best possible)</li>
              <li><strong>1.00</strong> = At UCL/LCL boundary (limit score)</li>
              <li><strong>0.00</strong> = Outside limits (failed)</li>
            </ul>
          </div>
        </div>
      </details>
    </div>

    <template #footer>
      <div class="iplas-details-dialog__footer-actions">
        <button type="button" class="iplas-details-dialog__button iplas-details-dialog__button--ghost" @click="showBreakdownDialog = false">
          Close
        </button>
      </div>
    </template>
  </AppDialog>

  <AppDialog
    v-model="showOverallScoreDialog"
    title="How This Score Is Calculated"
    description="Review the aggregate weighting logic behind the displayed top-level score."
    width="min(92vw, 40rem)"
  >
    <div v-if="record && scoreSummaryPrimary && overallScoreExplanation" class="iplas-details-subdialog">
      <div class="score-explanation-primary">
        <div class="iplas-details-dialog__score-overview">
          <div>
            <div class="iplas-details-dialog__metric-label">{{ scoreSummaryLabel }}</div>
            <div class="score-explanation-primary__score" :class="getScoreColorClass(scoreSummaryPrimary.score)">
              {{ formatScoreOutOfTen(scoreSummaryPrimary.score) }}
            </div>
            <div class="iplas-details-dialog__metric-caption">Weighted average of all scored test items.</div>
          </div>
          <span v-if="record.isForcedFailure" class="iplas-details-dialog__pill iplas-details-dialog__pill--warning">Min. Score Fail</span>
        </div>
        <div v-if="scoreSummarySecondaryText" class="iplas-details-dialog__metric-secondary">
          {{ scoreSummarySecondaryText }}
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
              <div class="iplas-details-dialog__muted">Each scored item contributes score × effective weight to the numerator.</div>
            </div>
          </div>
          <div class="score-formula-step">
            <div class="score-formula-step__index">3</div>
            <div>
              <div>Divide by the total effective weight, then display the result on a /10 scale.</div>
              <div class="iplas-details-dialog__muted">The backend stores and averages scores on a 0-1 scale before the UI formats them as /10.</div>
            </div>
          </div>
        </div>
      </div>

      <div class="iplas-details-dialog__stats-grid">
        <div class="score-explanation-stat">
          <div class="iplas-details-dialog__metric-label">Scored Test Items</div>
          <div class="iplas-details-dialog__stat-value">{{ overallScoreExplanation.scoredItemCount }}</div>
          <div class="iplas-details-dialog__muted">{{ overallScoreExplanation.valueItemCount }} value, {{ overallScoreExplanation.binaryItemCount }} binary</div>
        </div>
        <div class="score-explanation-stat">
          <div class="iplas-details-dialog__metric-label">Total Effective Weight</div>
          <div class="iplas-details-dialog__stat-value">{{ formatCompactNumber(overallScoreExplanation.totalEffectiveWeight) }}</div>
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

    <template #footer>
      <div class="iplas-details-dialog__footer-actions">
        <button type="button" class="iplas-details-dialog__button iplas-details-dialog__button--ghost" @click="showOverallScoreDialog = false">
          Close
        </button>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import { useNotification } from '@/shared/composables/useNotification'
import AppDataGrid from '@/shared/ui/data-grid/AppDataGrid.vue'
import AppDialog from '@/shared/ui/dialog/AppDialog.vue'
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
const testItemFilter = ref<TestItemFilter[]>(['all'])
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
  { title: 'Criteria Data ★', value: 'value' },
  { title: 'Show All', value: 'all' },
  { title: 'Non-Criteria', value: 'non-value' },
  { title: 'Bin Data', value: 'bin' },
]

// UPDATED: Score filter options
const scoreFilterOptions: { title: string; value: ScoreFilterType }[] = [
  { title: '> Greater than', value: 'gt' },
  { title: '≥ Greater or equal', value: 'gte' },
  { title: '< Less than', value: 'lt' },
  { title: '≤ Less or equal', value: 'lte' },
  { title: '= Equals', value: 'eq' },
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
    return 'warning'
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

function scoreTableRowClass(): string {
  return hasScores.value ? 'iplas-details-dialog__table-row--clickable' : ''
}

function toggleTestItemFilter(filterType: TestItemFilter): void {
  if (filterType === 'all') {
    testItemFilter.value = ['all']
    return
  }

  const currentFilters = testItemFilter.value.filter((value) => value !== 'all')
  if (currentFilters.includes(filterType)) {
    const nextFilters = currentFilters.filter((value) => value !== filterType)
    testItemFilter.value = nextFilters.length > 0 ? nextFilters : ['all']
    return
  }

  testItemFilter.value = [...currentFilters, filterType]
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

  // Apply test item type filter (supports multiple selections)
  if (testItemFilter.value.length > 0 && !testItemFilter.value.includes('all')) {
    items = items.filter((item: NormalizedTestItem) => {
      return testItemFilter.value.some((filterType: TestItemFilter) => {
        switch (filterType) {
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
    testItemFilter.value = ['all']
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
  --iplas-panel: var(--app-panel);
  --iplas-panel-strong: var(--app-surface);
  --iplas-muted: var(--app-muted);
  --iplas-ink: var(--app-ink);
  --iplas-accent: var(--app-accent);
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
.iplas-details-dialog__field > span,
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
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.95rem;
  background: rgba(15, 118, 110, 0.12);
  color: var(--iplas-accent);
  font-size: 1.25rem;
  flex-shrink: 0;
}

.iplas-details-dialog__info-icon--warning {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.iplas-details-dialog__info-icon--success {
  background: rgba(34, 197, 94, 0.14);
  color: #15803d;
}

.iplas-details-dialog__summary-grid,
.iplas-details-dialog__metadata-grid,
.iplas-details-dialog__stats-grid,
.iplas-details-dialog__score-filter-grid {
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
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
  border: 1px solid var(--iplas-border);
  border-radius: 1.25rem;
  background: var(--iplas-panel);
  box-shadow: var(--app-shadow-soft);
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
  padding: 1rem;
}

.iplas-details-dialog__summary-card--highlight,
.iplas-details-dialog__summary-card--score {
  background: linear-gradient(180deg, rgba(15, 118, 110, 0.08), var(--app-panel));
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
  gap: 0.9rem;
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
  padding: 0.55rem 0.8rem;
  border-radius: 999px;
  border: 1px solid var(--iplas-border);
  background: var(--app-surface);
  color: var(--iplas-ink);
  width: fit-content;
}

.iplas-details-dialog__pill--cool {
  background: rgba(6, 182, 212, 0.08);
}

.iplas-details-dialog__pill--neutral {
  background: rgba(15, 23, 42, 0.04);
}

.iplas-details-dialog__pill--success {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.26);
  color: #166534;
}

.iplas-details-dialog__pill--warning {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.24);
  color: #92400e;
}

.iplas-details-dialog__pill--danger {
  background: rgba(163, 61, 45, 0.12);
  border-color: rgba(163, 61, 45, 0.24);
  color: #a33d2d;
}

.iplas-details-dialog__pill--interactive {
  cursor: pointer;
}

.iplas-details-dialog__field {
  display: grid;
  gap: 0.45rem;
}

.iplas-details-dialog__field input,
.iplas-details-dialog__field select,
.iplas-details-dialog__search-shell,
.iplas-details-dialog__token-shell {
  width: 100%;
  border: 1px solid var(--iplas-border);
  border-radius: 1rem;
  background: var(--iplas-panel-strong);
  color: var(--iplas-ink);
  box-shadow: var(--app-shadow-soft);
}

.iplas-details-dialog__field input,
.iplas-details-dialog__field select {
  padding: 0.85rem 0.95rem;
}

.iplas-details-dialog__search-shell,
.iplas-details-dialog__token-shell {
  display: grid;
  gap: 0.6rem;
  padding: 0.75rem 0.85rem;
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
  background: rgba(15, 118, 110, 0.08);
  color: var(--iplas-accent);
}

.iplas-details-dialog__chip-select {
  display: flex;
  flex-wrap: wrap;
}

.iplas-details-dialog__chip-option--active {
  background: var(--iplas-accent);
  color: white;
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
  padding: 0.85rem 0.95rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.55);
}

.iplas-details-dialog__metric-row--score {
  background: linear-gradient(180deg, rgba(15, 118, 110, 0.08), rgba(255, 255, 255, 0.76));
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
  background: rgba(34, 197, 94, 0.16);
  color: #166534;
}

.iplas-details-dialog__score-chip--primary {
  background: rgba(15, 118, 110, 0.14);
  color: var(--iplas-accent);
}

.iplas-details-dialog__score-chip--warning {
  background: rgba(245, 158, 11, 0.16);
  color: #92400e;
}

.iplas-details-dialog__score-chip--danger {
  background: rgba(163, 61, 45, 0.16);
  color: #a33d2d;
}

.iplas-details-dialog__explanation-card {
  padding: 1rem;
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
  color: rgba(var(--v-theme-on-surface), 0.88) !important;
}

.summary-stat-button:focus-visible {
  outline: 2px solid rgba(var(--v-theme-primary), 0.4);
  outline-offset: 4px;
  border-radius: 10px;
}

.score-explanation-stat {
  height: 100%;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.score-explanation-primary {
  padding: 1rem;
  border-radius: 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.03);
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
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: linear-gradient(180deg, rgba(var(--v-theme-primary), 0.05), rgba(var(--v-theme-on-surface), 0.02));
}

.score-formula-equation {
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.88);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  font-family: Consolas, 'Courier New', monospace;
  overflow-wrap: anywhere;
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
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
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
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-variant-numeric: tabular-nums;
}

.score-cell-chip {
  min-width: 70px;
  justify-content: center;
  font-variant-numeric: tabular-nums;
}

:deep(.v-table--striped tbody tr:nth-of-type(even)) {
  background-color: rgba(0, 0, 0, 0.02);
}

:deep(.v-theme--dark .v-table--striped tbody tr:nth-of-type(even)) {
  background-color: rgba(255, 255, 255, 0.02);
}

/* Clickable rows styling when scores are available */
.clickable-rows :deep(tbody tr) {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.clickable-rows :deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.08) !important;
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

@media (max-width: 840px) {
  .iplas-details-dialog__header,
  .iplas-details-dialog__score-overview,
  .forced-fail-item {
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
  .iplas-details-dialog__score-filter-grid {
    grid-template-columns: 1fr;
  }

  .summary-stat-button {
    width: 100%;
  }
}
</style>
