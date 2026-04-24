<template>
  <div class="compare-result-view">
    <AppPanel
      eyebrow="Comparison Workspace"
      title="Comparison Results"
      :description="`${result.total_files} file${result.total_files === 1 ? '' : 's'} aligned across value and non-value result sets.`"
      splitHeader
      tone="cool"
    >
      <template #header-aside>
        <div class="compare-result-view__header-actions">
          <button type="button" class="compare-result-view__action-button compare-result-view__action-button--success" @click="emit('export-excel')">
            <Icon icon="mdi:microsoft-excel" />
            <span>Excel</span>
          </button>
          <button type="button" class="compare-result-view__action-button compare-result-view__action-button--danger" @click="emit('export-pdf')">
            <Icon icon="mdi:file-pdf-box" />
            <span>PDF</span>
          </button>
          <button type="button" class="compare-result-view__action-button" @click="emit('copy-clipboard')">
            <Icon icon="mdi:content-copy" />
            <span>Copy</span>
          </button>
        </div>
      </template>

      <section class="compare-result-view__stat-grid">
        <article class="compare-result-view__stat-card compare-result-view__stat-card--primary">
          <small>Value Items</small>
          <strong>{{ result.total_value_items }}</strong>
        </article>
        <article class="compare-result-view__stat-card compare-result-view__stat-card--secondary">
          <small>Non-Value Items</small>
          <strong>{{ result.total_non_value_items }}</strong>
        </article>
        <article class="compare-result-view__stat-card compare-result-view__stat-card--info">
          <small>ISNs Compared</small>
          <strong>{{ result.total_files }}</strong>
        </article>
      </section>

      <section class="compare-result-view__section">
        <div class="compare-result-view__section-header compare-result-view__section-header--primary">
          <div>
            <p class="compare-result-view__section-eyebrow">Numeric Surface</p>
            <h3>Value Items (Numeric Data)</h3>
          </div>
          <div class="compare-result-view__section-actions">
            <span class="compare-result-view__count-pill">{{ filteredValueItems.length }}</span>
            <button type="button" class="compare-result-view__icon-button" @click="valueFullscreen = true">
              <Icon icon="mdi:fullscreen" />
            </button>
          </div>
        </div>

        <div class="result-surface-filter-grid">
          <label class="result-surface-search result-surface-search--wide">
            <span>Search test items</span>
            <input v-model="valueSearch" placeholder="Filter numeric items by name" type="text">
          </label>
          <label class="result-surface-search">
            <span>Score Filter</span>
            <select v-model="valueScoreFilter">
              <option value="all">All Scores</option>
              <option value="high">Score >= 9</option>
              <option value="medium">Score 7-9</option>
              <option value="low">Score < 7</option>
            </select>
          </label>
          <label class="result-surface-search">
            <span>Limit Status</span>
            <select v-model="valueLimitFilter">
              <option value="all">All</option>
              <option value="within">Within Limits</option>
              <option value="out">Out of Limits</option>
            </select>
          </label>
        </div>

        <AppDataGrid
          :columns="valueGridColumns"
          :rows="filteredValueItems"
          paginator
          :rowsPerPage="10"
          :rowsPerPageOptions="gridRowsPerPageOptions"
          scrollHeight="500px"
        >
          <template #cell-test_item="{ data }"><div class="compare-result-view__strong text-no-wrap">{{ data.test_item }}</div></template>
          <template #cell-usl="{ data }"><span class="compare-result-view__muted">{{ formatRawNumber(data.usl as number | null) }}</span></template>
          <template #cell-lsl="{ data }"><span class="compare-result-view__muted">{{ formatRawNumber(data.lsl as number | null) }}</span></template>
          <template #cell-target="{ data }"><span class="compare-result-view__score-pill compare-result-view__score-pill--info">{{ formatRawNumber((data.per_isn_data?.[0]?.score_breakdown?.target_used ?? data.baseline) as number | null) }}</span></template>
          <template v-for="(_, index) in Array(getIsnCount())" :key="`value-grid-isn-${index}`" #[`cell-isn_${index}`]="{ data }">
            <div v-if="data.per_isn_data && data.per_isn_data[index]" class="compare-result-view__measurement-stack">
              <div class="compare-result-view__detail-line"><strong>V:</strong> {{ data.per_isn_data[index].value }}</div>
              <div class="compare-result-view__detail-line" :class="getDeviationClass(data.per_isn_data[index].score_breakdown?.deviation)"><strong>D:</strong> {{ formatDeviation(data.per_isn_data[index].score_breakdown?.deviation) }}</div>
              <button v-if="data.per_isn_data[index].score !== null" type="button" class="compare-result-view__score-pill" :class="scorePillClass(data.per_isn_data[index].score)" @click="openScoreBreakdown(String(data.test_item), index)">{{ data.per_isn_data[index].score.toFixed(2) }}</button>
            </div>
            <div v-else class="compare-result-view__muted">N/A</div>
          </template>
          <template #cell-max_meas="{ data }"><span class="compare-result-view__muted">{{ getMaxMeasurement(data as CompareItemEnhanced) }}</span></template>
          <template #cell-min_meas="{ data }"><span class="compare-result-view__muted">{{ getMinMeasurement(data as CompareItemEnhanced) }}</span></template>
          <template #cell-avg_deviation="{ data }"><span :class="getDeviationClass(data.avg_deviation as number | null | undefined)">{{ formatDeviation(data.avg_deviation as number | null | undefined) }}</span></template>
          <template #cell-avg_score="{ data }"><span v-if="data.avg_score !== null" class="compare-result-view__score-pill" :class="scorePillClass(Number(data.avg_score))">{{ Number(data.avg_score).toFixed(2) }}</span><span v-else class="compare-result-view__muted">N/A</span></template>
        </AppDataGrid>
      </section>

      <section class="compare-result-view__section">
        <div class="compare-result-view__section-header compare-result-view__section-header--secondary">
          <div>
            <p class="compare-result-view__section-eyebrow">Textual Surface</p>
            <h3>Non-Value Items (Status/Text Data)</h3>
          </div>
          <div class="compare-result-view__section-actions">
            <span class="compare-result-view__count-pill">{{ filteredNonValueItems.length }}</span>
            <button type="button" class="compare-result-view__icon-button" @click="nonValueFullscreen = true">
              <Icon icon="mdi:fullscreen" />
            </button>
          </div>
        </div>

        <label class="result-surface-search">
          <span>Search test items</span>
          <input v-model="nonValueSearch" placeholder="Filter non-value items by name" type="text">
        </label>

        <AppDataGrid
          :columns="nonValueGridColumns"
          :rows="filteredNonValueItems"
          paginator
          :rowsPerPage="10"
          :rowsPerPageOptions="gridRowsPerPageOptions"
          scrollHeight="400px"
        >
          <template #cell-test_item="{ data }"><div class="compare-result-view__strong" :class="{ 'compare-result-view__strong--accent': data.per_isn_data?.[0]?.is_calculated }">{{ data.test_item }}</div></template>
          <template v-for="(_, index) in Array(getNonValueIsnCount())" :key="`non-value-grid-isn-${index}`" #[`cell-isn_${index}`]="{ data }">
            <span v-if="data.per_isn_data && data.per_isn_data[index]" class="compare-result-view__status-pill" :class="statusPillClass(data.per_isn_data[index].value, data.per_isn_data[index].is_calculated)">{{ data.per_isn_data[index].value }}</span>
            <span v-else class="compare-result-view__muted">N/A</span>
          </template>
        </AppDataGrid>
      </section>
    </AppPanel>

    <AppDialog v-model="valueFullscreen" title="Value Items (Numeric Data)" description="Expanded comparison workspace for numeric measurements across ISNs." width="min(98vw, 120rem)" :breakpoints="dialogBreakpoints" :closable="false" maximizable>
      <template #header>
        <div class="result-surface-dialog-header">
          <div>
            <h2 class="result-surface-dialog-title">Value Items (Numeric Data)</h2>
            <p class="result-surface-dialog-description">Review per-ISN values, deviations, and scores without the legacy fullscreen table shell.</p>
          </div>
          <button type="button" class="compare-result-view__icon-button" @click="valueFullscreen = false">
            <Icon icon="mdi:close" />
          </button>
        </div>
      </template>

      <div class="result-surface-filter-grid">
        <label class="result-surface-search result-surface-search--wide">
          <span>Search test items</span>
          <input v-model="valueSearch" placeholder="Filter numeric items by name" type="text">
        </label>
        <label class="result-surface-search">
          <span>Score Filter</span>
          <select v-model="valueScoreFilter">
            <option value="all">All Scores</option>
            <option value="high">Score >= 9</option>
            <option value="medium">Score 7-9</option>
            <option value="low">Score < 7</option>
          </select>
        </label>
        <label class="result-surface-search">
          <span>Limit Status</span>
          <select v-model="valueLimitFilter">
            <option value="all">All</option>
            <option value="within">Within Limits</option>
            <option value="out">Out of Limits</option>
          </select>
        </label>
      </div>

      <AppDataGrid
        :columns="valueGridColumns"
        :rows="filteredValueItems"
        paginator
        :rowsPerPage="25"
        :rowsPerPageOptions="gridRowsPerPageOptions"
        scrollHeight="calc(100vh - 22rem)"
      >
        <template #cell-test_item="{ data }"><div class="compare-result-view__strong text-no-wrap">{{ data.test_item }}</div></template>
        <template #cell-usl="{ data }"><span class="compare-result-view__muted">{{ formatRawNumber(data.usl as number | null) }}</span></template>
        <template #cell-lsl="{ data }"><span class="compare-result-view__muted">{{ formatRawNumber(data.lsl as number | null) }}</span></template>
        <template #cell-target="{ data }"><span class="compare-result-view__score-pill compare-result-view__score-pill--info">{{ formatRawNumber((data.per_isn_data?.[0]?.score_breakdown?.target_used ?? data.baseline) as number | null) }}</span></template>
        <template v-for="(_, index) in Array(getIsnCount())" :key="`value-dialog-isn-${index}`" #[`cell-isn_${index}`]="{ data }">
          <div v-if="data.per_isn_data && data.per_isn_data[index]" class="compare-result-view__measurement-stack">
            <div class="compare-result-view__detail-line"><strong>V:</strong> {{ data.per_isn_data[index].value }}</div>
            <div class="compare-result-view__detail-line" :class="getDeviationClass(data.per_isn_data[index].score_breakdown?.deviation)"><strong>D:</strong> {{ formatDeviation(data.per_isn_data[index].score_breakdown?.deviation) }}</div>
            <button v-if="data.per_isn_data[index].score !== null" type="button" class="compare-result-view__score-pill" :class="scorePillClass(data.per_isn_data[index].score)" @click="openScoreBreakdown(String(data.test_item), index)">{{ data.per_isn_data[index].score.toFixed(2) }}</button>
          </div>
          <div v-else class="compare-result-view__muted">N/A</div>
        </template>
        <template #cell-max_meas="{ data }"><span class="compare-result-view__muted">{{ getMaxMeasurement(data as CompareItemEnhanced) }}</span></template>
        <template #cell-min_meas="{ data }"><span class="compare-result-view__muted">{{ getMinMeasurement(data as CompareItemEnhanced) }}</span></template>
        <template #cell-avg_deviation="{ data }"><span :class="getDeviationClass(data.avg_deviation as number | null | undefined)">{{ formatDeviation(data.avg_deviation as number | null | undefined) }}</span></template>
        <template #cell-avg_score="{ data }"><span v-if="data.avg_score !== null" class="compare-result-view__score-pill" :class="scorePillClass(Number(data.avg_score))">{{ Number(data.avg_score).toFixed(2) }}</span><span v-else class="compare-result-view__muted">N/A</span></template>
      </AppDataGrid>
    </AppDialog>

    <AppDialog v-model="nonValueFullscreen" title="Non-Value Items (Status/Text Data)" description="Expanded comparison workspace for textual and status outputs." width="min(98vw, 120rem)" :breakpoints="dialogBreakpoints" :closable="false" maximizable>
      <template #header>
        <div class="result-surface-dialog-header">
          <div>
            <h2 class="result-surface-dialog-title">Non-Value Items (Status/Text Data)</h2>
            <p class="result-surface-dialog-description">Inspect per-ISN statuses in the shared dialog surface.</p>
          </div>
          <button type="button" class="compare-result-view__icon-button" @click="nonValueFullscreen = false">
            <Icon icon="mdi:close" />
          </button>
        </div>
      </template>

      <label class="result-surface-search">
        <span>Search test items</span>
        <input v-model="nonValueSearch" placeholder="Filter non-value items by name" type="text">
      </label>

      <AppDataGrid
        :columns="nonValueGridColumns"
        :rows="filteredNonValueItems"
        paginator
        :rowsPerPage="25"
        :rowsPerPageOptions="gridRowsPerPageOptions"
        scrollHeight="calc(100vh - 22rem)"
      >
        <template #cell-test_item="{ data }"><div class="compare-result-view__strong" :class="{ 'compare-result-view__strong--accent': data.per_isn_data?.[0]?.is_calculated }">{{ data.test_item }}</div></template>
        <template v-for="(_, index) in Array(getNonValueIsnCount())" :key="`non-value-dialog-isn-${index}`" #[`cell-isn_${index}`]="{ data }">
          <span v-if="data.per_isn_data && data.per_isn_data[index]" class="compare-result-view__status-pill" :class="statusPillClass(data.per_isn_data[index].value, data.per_isn_data[index].is_calculated)">{{ data.per_isn_data[index].value }}</span>
          <span v-else class="compare-result-view__muted">N/A</span>
        </template>
      </AppDataGrid>
    </AppDialog>

    <ScoreBreakdownDialog v-model="scoreDialogOpen" :item="selectedItemForScore" />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { AppDataGrid, AppDialog, AppPanel } from '@/shared'
import type {
  CompareItemEnhanced,
  CompareResponseEnhanced,
  ParsedTestItemEnhanced,
} from '@/features/dut-logs/composables/useTestLogUpload'
import { sortTestItems } from '@/features/dut-logs/utils/sorting'
import ScoreBreakdownDialog from './ScoreBreakdownDialog.vue'

const props = defineProps<{
  result: CompareResponseEnhanced
}>()

const emit = defineEmits<{
  'export-excel': []
  'export-pdf': []
  'copy-clipboard': []
}>()

const valueSearch = ref('')
const valueScoreFilter = ref<'all' | 'high' | 'medium' | 'low'>('all')
const valueLimitFilter = ref<'all' | 'within' | 'out'>('all')
const valueFullscreen = ref(false)
const nonValueSearch = ref('')
const nonValueFullscreen = ref(false)
const scoreDialogOpen = ref(false)
const selectedItemForScore = ref<ParsedTestItemEnhanced | null>(null)

const gridRowsPerPageOptions = [10, 25, 50, 100, 200]
const dialogBreakpoints = { '1400px': '96vw', '960px': '98vw' }

const reclassifiedValueItems = computed(() =>
  props.result.comparison_value_items.filter((item) => !item.test_item.includes('ADJUSTED_POW')),
)

const reclassifiedNonValueItems = computed(() => {
  const adjustedPowItems = props.result.comparison_value_items.filter((item) =>
    item.test_item.includes('ADJUSTED_POW'),
  )
  return [...props.result.comparison_non_value_items, ...adjustedPowItems]
})

const valueHeaders = computed(() => {
  const firstItem = reclassifiedValueItems.value[0]
  if (!firstItem) return []

  const baseHeaders = [
    { title: 'Test Item', key: 'test_item', sortable: true, width: '250px' },
    { title: 'USL', key: 'usl', sortable: true, width: '80px' },
    { title: 'LSL', key: 'lsl', sortable: true, width: '80px' },
    { title: 'Target', key: 'target', sortable: true, width: '100px' },
  ]

  const isnHeaders = firstItem.per_isn_data.map((isnData, index) => ({
    title: `Meas.\n${isnData.isn || 'N/A'}`,
    key: `isn_${index}`,
    sortable: false,
    width: '120px',
  }))

  const aggregateHeaders = [
    { title: 'Max. Meas.', key: 'max_meas', sortable: false, width: '100px' },
    { title: 'Min. Meas.', key: 'min_meas', sortable: false, width: '100px' },
    { title: 'Avg. Dev', key: 'avg_deviation', sortable: true, width: '100px' },
    { title: 'Avg. Score', key: 'avg_score', sortable: true, width: '100px' },
  ]

  return [...baseHeaders, ...isnHeaders, ...aggregateHeaders]
})

const nonValueHeaders = computed(() => {
  const firstItem = reclassifiedNonValueItems.value[0]
  if (!firstItem) return []

  const baseHeaders = [{ title: 'Test Item', key: 'test_item', sortable: true, width: '300px' }]
  const isnHeaders = firstItem.per_isn_data.map((isnData, index) => ({
    title: isnData.isn || 'N/A',
    key: `isn_${index}`,
    sortable: false,
    width: '150px',
  }))

  return [...baseHeaders, ...isnHeaders]
})

const valueGridColumns = computed(() =>
  valueHeaders.value.map((header) => ({
    key: String(header.key),
    field: String(header.key),
    header: String(header.title),
    sortable: Boolean(header.sortable),
    style: 'width' in header && header.width ? { width: String(header.width) } : undefined,
  })),
)

const nonValueGridColumns = computed(() =>
  nonValueHeaders.value.map((header) => ({
    key: String(header.key),
    field: String(header.key),
    header: String(header.title),
    sortable: Boolean(header.sortable),
    style: 'width' in header && header.width ? { width: String(header.width) } : undefined,
  })),
)

const filteredValueItems = computed(() => {
  let items = sortTestItems(reclassifiedValueItems.value)

  if (valueSearch.value) {
    const searchLower = valueSearch.value.toLowerCase()
    items = items.filter((item) => item.test_item.toLowerCase().includes(searchLower))
  }

  if (valueScoreFilter.value !== 'all') {
    items = items.filter((item) => {
      const avgScore = item.avg_score
      if (avgScore === null) return false
      if (valueScoreFilter.value === 'high') return avgScore >= 9
      if (valueScoreFilter.value === 'medium') return avgScore >= 7 && avgScore < 9
      return avgScore < 7
    })
  }

  if (valueLimitFilter.value !== 'all') {
    items = items.filter((item) => {
      const hasData = item.per_isn_data.some((isn) => isn.numeric_value !== null)
      if (!hasData) return false

      const measurements = item.per_isn_data.map((isn) => isn.numeric_value ?? 0)
      const maxVal = Math.max(...measurements)
      const minVal = Math.min(...measurements)
      const withinLimits =
        (item.usl === null || maxVal <= item.usl) && (item.lsl === null || minVal >= item.lsl)

      return valueLimitFilter.value === 'within' ? withinLimits : !withinLimits
    })
  }

  return items
})

const filteredNonValueItems = computed(() => {
  const sorted = sortTestItems(reclassifiedNonValueItems.value)
  if (!nonValueSearch.value) return sorted
  const searchLower = nonValueSearch.value.toLowerCase()
  return sorted.filter((item) => item.test_item.toLowerCase().includes(searchLower))
})

function formatRawNumber(value: number | null): string {
  return value !== null ? value.toString() : 'N/A'
}

function formatDeviation(deviation: number | null | undefined): string {
  if (deviation === null || deviation === undefined) return 'N/A'
  return Math.abs(deviation).toFixed(2)
}

function getDeviationClass(deviation: number | null | undefined): string {
  if (deviation === null || deviation === undefined) return ''
  const abs = Math.abs(deviation)
  if (abs < 0.5) return 'text-success'
  if (abs < 2.0) return 'text-warning'
  return 'text-error font-weight-bold'
}

function getScoreColor(score: number): string {
  if (score >= 9) return 'success'
  if (score >= 7) return 'warning'
  return 'error'
}

function getStatusColor(value: string): string {
  const upper = value.toUpperCase()
  if (upper === 'PASS' || upper === 'OK') return 'success'
  if (upper === 'FAIL' || upper === 'ERROR') return 'error'
  return 'grey'
}

function getIsnCount(): number {
  const firstItem = reclassifiedValueItems.value[0]
  return firstItem?.per_isn_data?.length || 0
}

function getNonValueIsnCount(): number {
  const firstItem = reclassifiedNonValueItems.value[0]
  return firstItem?.per_isn_data?.length || 0
}

function getMaxMeasurement(item: CompareItemEnhanced): string {
  const measurements = item.per_isn_data.map((isn) => isn.numeric_value ?? 0)
  if (measurements.length === 0) return 'N/A'
  return Math.max(...measurements).toFixed(2)
}

function getMinMeasurement(item: CompareItemEnhanced): string {
  const measurements = item.per_isn_data.map((isn) => isn.numeric_value ?? 0)
  if (measurements.length === 0) return 'N/A'
  return Math.min(...measurements).toFixed(2)
}

function openScoreBreakdown(testItem: string, isnIndex: number) {
  const compareItem = props.result.comparison_value_items.find((item) => item.test_item === testItem)
  if (!compareItem || !compareItem.per_isn_data[isnIndex]) return

  const isnData = compareItem.per_isn_data[isnIndex]
  if (!isnData.score_breakdown) return

  selectedItemForScore.value = {
    test_item: testItem,
    usl: compareItem.usl,
    lsl: compareItem.lsl,
    value: isnData.value,
    is_value_type: isnData.is_value_type,
    numeric_value: isnData.numeric_value,
    is_hex: isnData.is_hex,
    hex_decimal: isnData.hex_decimal,
    matched_criteria: compareItem.matched_criteria,
    target: null,
    score: isnData.score,
    score_breakdown: isnData.score_breakdown,
  }

  scoreDialogOpen.value = true
}

function scorePillClass(score: number): string {
  const tone = getScoreColor(score)
  if (tone === 'success') return 'compare-result-view__score-pill--success'
  if (tone === 'warning') return 'compare-result-view__score-pill--warning'
  return 'compare-result-view__score-pill--error'
}

function statusPillClass(value: string, isCalculated?: boolean): string {
  if (isCalculated) return 'compare-result-view__status-pill--calculated'
  const tone = getStatusColor(value)
  if (tone === 'success') return 'compare-result-view__status-pill--success'
  if (tone === 'error') return 'compare-result-view__status-pill--error'
  return 'compare-result-view__status-pill--neutral'
}
</script>

<style scoped>
.compare-result-view {
  display: grid;
  gap: 1rem;
}

.compare-result-view__header-actions,
.compare-result-view__section-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.compare-result-view__action-button,
.compare-result-view__icon-button,
.compare-result-view__score-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 999px;
  font-weight: 700;
}

.compare-result-view__action-button,
.compare-result-view__icon-button {
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-ink);
  padding: 0.65rem 0.95rem;
  cursor: pointer;
}

.compare-result-view__action-button--success {
  border-color: rgba(15, 118, 110, 0.18);
  color: var(--app-accent);
}

.compare-result-view__action-button--danger {
  border-color: rgba(189, 64, 64, 0.18);
  color: #8f2020;
}

.compare-result-view__stat-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
}

.compare-result-view__stat-card,
.compare-result-view__section {
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel);
}

.compare-result-view__stat-card {
  display: grid;
  gap: 0.3rem;
  padding: 1rem;
}

.compare-result-view__stat-card small,
.compare-result-view__muted,
.compare-result-view__section-eyebrow {
  color: var(--app-muted);
}

.compare-result-view__stat-card strong,
.compare-result-view__strong {
  color: var(--app-ink);
  font-weight: 700;
}

.compare-result-view__strong--accent {
  color: #1f4e86;
}

.compare-result-view__stat-card--primary {
  background: linear-gradient(145deg, rgba(15, 118, 110, 0.1), var(--app-panel));
}

.compare-result-view__stat-card--secondary {
  background: linear-gradient(145deg, rgba(95, 64, 176, 0.1), var(--app-panel));
}

.compare-result-view__stat-card--info {
  background: linear-gradient(145deg, rgba(40, 96, 163, 0.1), var(--app-panel));
}

.compare-result-view__section {
  padding: 1rem;
  display: grid;
  gap: 1rem;
}

.compare-result-view__section-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.compare-result-view__section-header h3 {
  margin: 0.15rem 0 0;
}

.compare-result-view__section-eyebrow {
  margin: 0;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.compare-result-view__section-header--primary {
  color: #1f4e86;
}

.compare-result-view__section-header--secondary {
  color: #5f40b0;
}

.compare-result-view__count-pill,
.compare-result-view__status-pill,
.compare-result-view__score-pill {
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 700;
}

.compare-result-view__count-pill {
  background: rgba(120, 129, 143, 0.12);
  color: #4f5d6d;
}

.compare-result-view__measurement-stack {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.2rem 0;
}

.compare-result-view__detail-line {
  font-size: 0.78rem;
}

.compare-result-view__score-pill {
  border: 0;
  cursor: pointer;
  width: fit-content;
}

.compare-result-view__score-pill--info {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.compare-result-view__score-pill--success,
.compare-result-view__status-pill--success {
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.compare-result-view__score-pill--warning {
  background: rgba(184, 118, 38, 0.16);
  color: #8f5314;
}

.compare-result-view__score-pill--error,
.compare-result-view__status-pill--error {
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

.compare-result-view__status-pill--calculated {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.compare-result-view__status-pill--neutral {
  background: rgba(120, 129, 143, 0.12);
  color: #4f5d6d;
}

.cursor-pointer {
  cursor: pointer;
}

.text-no-wrap {
  white-space: nowrap;
}

.result-surface-filter-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) repeat(2, minmax(12rem, 1fr));
  gap: 0.9rem;
}

.result-surface-search {
  display: grid;
  gap: 0.45rem;
}

.result-surface-search span {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  color: var(--app-muted);
}

.result-surface-search input,
.result-surface-search select {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
  color: var(--app-ink);
  box-shadow: var(--app-shadow-soft);
  padding: 0.85rem 0.95rem;
}

.result-surface-search input:focus,
.result-surface-search select:focus {
  outline: none;
  border-color: var(--app-accent);
  box-shadow: 0 0 0 4px var(--app-ring);
}

.result-surface-dialog-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  align-items: flex-start;
}

.result-surface-dialog-title {
  margin: 0;
  font-family: var(--app-display);
  font-size: 1.4rem;
}

.result-surface-dialog-description {
  margin: 0.35rem 0 0;
  color: var(--app-muted);
  line-height: 1.55;
}

@media (max-width: 960px) {
  .result-surface-filter-grid {
    grid-template-columns: 1fr;
  }

  .compare-result-view__section-header {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 720px) {
  .result-surface-dialog-header {
    flex-direction: column;
  }
}
</style>
