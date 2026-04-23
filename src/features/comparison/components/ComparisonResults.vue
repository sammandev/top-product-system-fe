<template>
  <AppPanel
    eyebrow="Comparison Output"
    title="Comparison Results"
    description="Review summary metrics, structural differences, and row-level comparisons from the current compare run."
    tone="warm"
    split-header
  >
    <template #header-aside>
      <span class="comparison-results__pill" :class="hasResults ? 'comparison-results__pill--success' : 'comparison-results__pill--neutral'">
        {{ mode.toUpperCase() }} Mode
      </span>
    </template>

    <section v-if="hasResults && summary" class="comparison-results__stat-grid">
      <article class="comparison-results__stat-card comparison-results__stat-card--info">
        <small>Total Rows</small>
        <strong>{{ summary.total_rows || 0 }}</strong>
      </article>
      <article class="comparison-results__stat-card comparison-results__stat-card--success">
        <small>Matching Rows</small>
        <strong>{{ summary.matching_rows || 0 }}</strong>
      </article>
      <article class="comparison-results__stat-card comparison-results__stat-card--warning">
        <small>Different Rows</small>
        <strong>{{ summary.different_rows || 0 }}</strong>
      </article>
      <article class="comparison-results__stat-card comparison-results__stat-card--primary">
        <small>Columns Compared</small>
        <strong>{{ summary.columns_compared?.length || 0 }}</strong>
      </article>
    </section>

    <section v-if="showColumnComparison && columnResults" class="comparison-results__section">
      <div class="comparison-results__divider"></div>
      <div class="comparison-results__section-heading">
        <Icon icon="mdi:table-column" />
        <span>Column Structure Comparison</span>
      </div>

      <div class="comparison-results__column-grid">
        <article class="comparison-results__bucket comparison-results__bucket--success">
          <header>
            <h3>Both Files</h3>
            <span class="comparison-results__pill comparison-results__pill--success">{{ columnResults.both?.length || 0 }}</span>
          </header>
          <div v-if="columnResults.both && columnResults.both.length > 0" class="comparison-results__chip-row">
            <span v-for="col in columnResults.both" :key="`both-${col}`" class="comparison-results__chip comparison-results__chip--success">{{ col }}</span>
          </div>
          <p v-else class="comparison-results__muted">No common columns</p>
        </article>

        <article class="comparison-results__bucket comparison-results__bucket--danger">
          <header>
            <h3>Only in A</h3>
            <span class="comparison-results__pill comparison-results__pill--danger">{{ columnResults.onlyInA?.length || 0 }}</span>
          </header>
          <div v-if="columnResults.onlyInA && columnResults.onlyInA.length > 0" class="comparison-results__chip-row">
            <span v-for="col in columnResults.onlyInA" :key="`a-${col}`" class="comparison-results__chip comparison-results__chip--danger">{{ col }}</span>
          </div>
          <p v-else class="comparison-results__muted">No unique columns in File A</p>
        </article>

        <article class="comparison-results__bucket comparison-results__bucket--info">
          <header>
            <h3>Only in B</h3>
            <span class="comparison-results__pill comparison-results__pill--info">{{ columnResults.onlyInB?.length || 0 }}</span>
          </header>
          <div v-if="columnResults.onlyInB && columnResults.onlyInB.length > 0" class="comparison-results__chip-row">
            <span v-for="col in columnResults.onlyInB" :key="`b-${col}`" class="comparison-results__chip comparison-results__chip--info">{{ col }}</span>
          </div>
          <p v-else class="comparison-results__muted">No unique columns in File B</p>
        </article>
      </div>
    </section>

    <section v-if="showRowComparison && rowResults && rowResults.length > 0" class="comparison-results__section">
      <div class="comparison-results__divider"></div>
      <div class="comparison-results__section-heading">
        <Icon icon="mdi:table-row" />
        <span>Row Data Comparison</span>
      </div>

      <AppDataGrid
        :columns="rowGridColumns"
        :rows="displayedRowResults"
        paginator
        :rowsPerPage="10"
        scrollHeight="24rem"
      >
        <template #cell-status="{ data }">
          <span class="comparison-results__pill" :class="statusPillClass(String(data.status))">
            <Icon :icon="getStatusIcon(String(data.status))" />
            {{ getStatusText(String(data.status)) }}
          </span>
        </template>

        <template #cell-valueA="{ data }">
          <span :class="getValueClass(String(data.status), 'A')">
            {{ formatValue(data.valueA) }}
          </span>
        </template>

        <template #cell-valueB="{ data }">
          <span :class="getValueClass(String(data.status), 'B')">
            {{ formatValue(data.valueB) }}
          </span>
        </template>

        <template #cell-difference="{ data }">
          <span v-if="data.difference !== undefined">
            {{ formatValue(data.difference) }}
          </span>
          <span v-else class="comparison-results__muted">—</span>
        </template>
      </AppDataGrid>
    </section>

    <div v-if="!hasResults" class="comparison-results__notice comparison-results__notice--info">
      No comparison results yet. Configure comparison settings and click "Compare Files" to start.
    </div>

    <div v-else-if="isEmpty" class="comparison-results__notice comparison-results__notice--warning">
      <Icon icon="mdi:alert" />
      <span>No differences found. The files are identical based on the selected comparison mode.</span>
    </div>
  </AppPanel>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { AppDataGrid, AppPanel } from '@/shared'
import type { ComparisonMode } from './ComparisonModeSelector.vue'

// Types
interface ColumnComparisonResult {
  both?: string[]
  onlyInA?: string[]
  onlyInB?: string[]
}

interface RowComparisonResult {
  joinKey: string | number
  status: 'match' | 'different' | 'only-in-a' | 'only-in-b'
  valueA?: unknown
  valueB?: unknown
  difference?: unknown
  [key: string]: unknown
}

// Use the actual backend response type
export interface CompareDataResponse {
  rows: Record<string, unknown>[]
  summary?: {
    total_rows: number
    matching_rows?: number
    different_rows?: number
    columns_compared?: string[]
  }
  columnComparison?: ColumnComparisonResult
  rowComparison?: RowComparisonResult[]
  metadata?: {
    comparisonMode: ComparisonMode
    joinKeyA?: string
    joinKeyB?: string
    timestamp?: string
  }
}

// Props
interface Props {
  results: CompareDataResponse | null
  mode: ComparisonMode
}

const props = defineProps<Props>()

// Computed
const hasResults = computed(() => props.results !== null)

const showColumnComparison = computed(() => {
  return props.mode === 'columns' || props.mode === 'both'
})

const showRowComparison = computed(() => {
  return props.mode === 'rows' || props.mode === 'both'
})

const columnResults = computed(() => {
  return props.results?.columnComparison || null
})

const rowResults = computed((): RowComparisonResult[] => {
  // If there's a dedicated rowComparison field, use it
  if (props.results?.rowComparison) {
    return props.results.rowComparison
  }
  // Otherwise use the general rows field
  return (props.results?.rows || []) as RowComparisonResult[]
})

const summary = computed(() => {
  return props.results?.summary || null
})

const isEmpty = computed(() => {
  if (!hasResults.value) return false

  const hasColumnDiff =
    columnResults.value &&
    ((columnResults.value.onlyInA?.length || 0) > 0 ||
      (columnResults.value.onlyInB?.length || 0) > 0)

  const hasRowDiff = rowResults.value && rowResults.value.length > 0

  return !hasColumnDiff && !hasRowDiff
})

const displayedRowResults = computed(() => {
  return rowResults.value || []
})

const rowHeaders = computed(() => {
  const headers = [
    { title: 'Join Key', key: 'joinKey', sortable: true },
    { title: 'Status', key: 'status', sortable: true },
    { title: 'Value in A', key: 'valueA', sortable: false },
    { title: 'Value in B', key: 'valueB', sortable: false },
  ]

  // Add difference column if there are any numeric comparisons
  const hasDifferences = rowResults.value.some((r) => r.difference !== undefined)
  if (hasDifferences) {
    headers.push({ title: 'Difference', key: 'difference', sortable: false })
  }

  return headers
})

const rowGridColumns = computed(() =>
  rowHeaders.value.map((header) => ({
    key: String(header.key),
    field: String(header.key),
    header: String(header.title),
    sortable: Boolean(header.sortable),
  })),
)

// Methods
function getStatusColor(status: string): string {
  switch (status) {
    case 'match':
      return 'success'
    case 'different':
      return 'warning'
    case 'only-in-a':
      return 'error'
    case 'only-in-b':
      return 'info'
    default:
      return 'default'
  }
}

function statusPillClass(status: string): string {
  switch (getStatusColor(status)) {
    case 'success':
      return 'comparison-results__pill--success'
    case 'warning':
      return 'comparison-results__pill--warning'
    case 'error':
      return 'comparison-results__pill--danger'
    case 'info':
      return 'comparison-results__pill--info'
    default:
      return 'comparison-results__pill--neutral'
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'match':
      return 'mdi-check-circle'
    case 'different':
      return 'mdi-alert-circle'
    case 'only-in-a':
      return 'mdi-minus-circle'
    case 'only-in-b':
      return 'mdi-plus-circle'
    default:
      return 'mdi-help-circle'
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'match':
      return 'Match'
    case 'different':
      return 'Different'
    case 'only-in-a':
      return 'A Only'
    case 'only-in-b':
      return 'B Only'
    default:
      return 'Unknown'
  }
}

function getValueClass(status: string, file: 'A' | 'B'): string {
  if (status === 'match') return 'text-success'
  if (status === 'different') return 'text-warning font-weight-bold'
  if (status === 'only-in-a' && file === 'A') return 'text-error font-weight-bold'
  if (status === 'only-in-b' && file === 'B') return 'text-info font-weight-bold'
  return 'text-medium-emphasis'
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }
  if (typeof value === 'number') {
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 })
  }
  return String(value)
}
</script>

<style scoped>
.comparison-results__stat-grid,
.comparison-results__column-grid,
.comparison-results__chip-row,
.comparison-results__section-heading,
.comparison-results__notice,
.comparison-results__pill,
.comparison-results__bucket header {
  display: flex;
}

.comparison-results__stat-grid,
.comparison-results__column-grid {
  display: grid;
  gap: 1rem;
}

.comparison-results__stat-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 1rem;
}

.comparison-results__stat-card,
.comparison-results__bucket,
.comparison-results__notice {
  border: 1px solid var(--app-border);
  border-radius: 1.1rem;
  padding: 1rem;
  box-shadow: var(--app-shadow-soft);
}

.comparison-results__stat-card {
  display: grid;
  gap: 0.35rem;
}

.comparison-results__stat-card small,
.comparison-results__muted {
  color: var(--app-muted);
}

.comparison-results__stat-card strong,
.comparison-results__bucket h3 {
  color: var(--app-ink);
}

.comparison-results__stat-card strong {
  font-size: 1.6rem;
}

.comparison-results__stat-card--info {
  background: rgba(20, 113, 153, 0.1);
}

.comparison-results__stat-card--success {
  background: rgba(20, 88, 71, 0.1);
}

.comparison-results__stat-card--warning {
  background: rgba(184, 118, 38, 0.12);
}

.comparison-results__stat-card--primary {
  background: rgba(40, 96, 163, 0.1);
}

.comparison-results__section {
  margin-bottom: 1rem;
}

.comparison-results__divider {
  height: 1px;
  background: var(--app-border);
  margin: 0 0 1rem;
}

.comparison-results__section-heading {
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.85rem;
  color: var(--app-ink);
  font-weight: 700;
}

.comparison-results__column-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.comparison-results__bucket {
  display: grid;
  gap: 0.85rem;
  background: rgba(255, 251, 247, 0.92);
}

.comparison-results__bucket header {
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.comparison-results__bucket h3 {
  margin: 0;
  font-size: 1rem;
}

.comparison-results__bucket--success {
  background: linear-gradient(180deg, rgba(20, 88, 71, 0.08), rgba(255, 251, 247, 0.96));
}

.comparison-results__bucket--danger {
  background: linear-gradient(180deg, rgba(163, 61, 45, 0.08), rgba(255, 251, 247, 0.96));
}

.comparison-results__bucket--info {
  background: linear-gradient(180deg, rgba(20, 113, 153, 0.08), rgba(255, 251, 247, 0.96));
}

.comparison-results__chip-row {
  flex-wrap: wrap;
  gap: 0.5rem;
}

.comparison-results__chip,
.comparison-results__pill {
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: 999px;
  padding: 0.32rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 700;
}

.comparison-results__chip--success,
.comparison-results__pill--success,
.text-success {
  background: rgba(20, 88, 71, 0.12);
  color: #145847;
}

.comparison-results__chip--danger,
.comparison-results__pill--danger,
.text-error {
  background: rgba(163, 61, 45, 0.12);
  color: #8b2f20;
}

.comparison-results__chip--info,
.comparison-results__pill--info,
.text-info {
  background: rgba(20, 113, 153, 0.12);
  color: #0f6c92;
}

.comparison-results__pill--warning,
.text-warning {
  background: rgba(184, 118, 38, 0.14);
  color: #8f5314;
}

.comparison-results__pill--neutral {
  background: rgba(120, 129, 143, 0.12);
  color: #4f5d6d;
}

.comparison-results__notice {
  align-items: center;
  gap: 0.65rem;
  margin-top: 1rem;
}

.comparison-results__notice--info {
  background: rgba(20, 113, 153, 0.08);
  color: #0f6c92;
}

.comparison-results__notice--warning {
  background: rgba(245, 168, 71, 0.1);
  color: #8f5314;
}

@media (max-width: 960px) {
  .comparison-results__stat-grid,
  .comparison-results__column-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .comparison-results__stat-grid,
  .comparison-results__column-grid {
    grid-template-columns: 1fr;
  }
}
</style>
