<template>
  <v-card>
    <v-card-title class="d-flex justify-space-between align-center">
      <div>
        <v-icon start>mdi-file-compare</v-icon>
        Comparison Results
      </div>
      <v-chip :color="hasResults ? 'success' : 'default'" size="small">
        {{ mode.toUpperCase() }} Mode
      </v-chip>
    </v-card-title>

    <v-card-text>
      <!-- Summary Stats -->
      <v-row v-if="hasResults && summary" class="mb-4">
        <v-col cols="12" sm="6" md="3">
          <v-card color="info" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h4">{{ summary.total_rows || 0 }}</div>
              <div class="text-caption">Total Rows</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card color="success" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h4">{{ summary.matching_rows || 0 }}</div>
              <div class="text-caption">Matching Rows</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card color="warning" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h4">{{ summary.different_rows || 0 }}</div>
              <div class="text-caption">Different Rows</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card color="primary" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h4">{{ summary.columns_compared?.length || 0 }}</div>
              <div class="text-caption">Columns Compared</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Column Comparison Results -->
      <div v-if="showColumnComparison && columnResults" class="mb-6">
        <v-divider class="mb-4" />
        <div class="text-h6 mb-3">
          <v-icon start>mdi-table-column</v-icon>
          Column Structure Comparison
        </div>

        <v-row>
          <!-- Columns in Both -->
          <v-col cols="12" md="4">
            <v-card color="success" variant="tonal">
              <v-card-title class="text-subtitle-1">
                <v-icon start>mdi-check-circle</v-icon>
                Both Files ({{ columnResults.both?.length || 0 }})
              </v-card-title>
              <v-card-text>
                <v-chip v-for="col in columnResults.both" :key="`both-${col}`" size="small" color="success"
                  class="ma-1">
                  {{ col }}
                </v-chip>
                <div v-if="!columnResults.both || columnResults.both.length === 0"
                  class="text-caption text-medium-emphasis">
                  No common columns
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Only in File A -->
          <v-col cols="12" md="4">
            <v-card color="error" variant="tonal">
              <v-card-title class="text-subtitle-1">
                <v-icon start>mdi-minus-circle</v-icon>
                Only in A ({{ columnResults.onlyInA?.length || 0 }})
              </v-card-title>
              <v-card-text>
                <v-chip v-for="col in columnResults.onlyInA" :key="`a-${col}`" size="small" color="error" class="ma-1">
                  {{ col }}
                </v-chip>
                <div v-if="!columnResults.onlyInA || columnResults.onlyInA.length === 0"
                  class="text-caption text-medium-emphasis">
                  No unique columns in File A
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Only in File B -->
          <v-col cols="12" md="4">
            <v-card color="info" variant="tonal">
              <v-card-title class="text-subtitle-1">
                <v-icon start>mdi-plus-circle</v-icon>
                Only in B ({{ columnResults.onlyInB?.length || 0 }})
              </v-card-title>
              <v-card-text>
                <v-chip v-for="col in columnResults.onlyInB" :key="`b-${col}`" size="small" color="info" class="ma-1">
                  {{ col }}
                </v-chip>
                <div v-if="!columnResults.onlyInB || columnResults.onlyInB.length === 0"
                  class="text-caption text-medium-emphasis">
                  No unique columns in File B
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Row Comparison Results -->
      <div v-if="showRowComparison && rowResults && rowResults.length > 0" class="mb-4">
        <v-divider class="mb-4" />
        <div class="text-h6 mb-3">
          <v-icon start>mdi-table-row</v-icon>
          Row Data Comparison
        </div>

        <!-- Row Comparison Table -->
        <v-data-table :headers="rowHeaders" :items="displayedRowResults" :items-per-page="10" class="elevation-1"
          density="comfortable" :loading="false">
          <!-- Status Column -->
          <template #item.status="{ item }">
            <v-chip :color="getStatusColor(item.status)" size="small" variant="tonal">
              <v-icon start size="small">
                {{ getStatusIcon(item.status) }}
              </v-icon>
              {{ getStatusText(item.status) }}
            </v-chip>
          </template>

          <!-- Value A Column -->
          <template #item.valueA="{ item }">
            <span :class="getValueClass(item.status, 'A')">
              {{ formatValue(item.valueA) }}
            </span>
          </template>

          <!-- Value B Column -->
          <template #item.valueB="{ item }">
            <span :class="getValueClass(item.status, 'B')">
              {{ formatValue(item.valueB) }}
            </span>
          </template>

          <!-- Difference Column (if applicable) -->
          <template #item.difference="{ item }">
            <span v-if="item.difference !== undefined">
              {{ formatValue(item.difference) }}
            </span>
            <span v-else class="text-medium-emphasis">—</span>
          </template>
        </v-data-table>
      </div>

      <!-- No Results -->
      <v-alert v-if="!hasResults" type="info" variant="tonal" density="compact">
        No comparison results yet. Configure comparison settings and click "Compare Files" to start.
      </v-alert>

      <!-- Empty Results -->
      <v-alert v-else-if="isEmpty" type="warning" variant="tonal" density="compact">
        <template #prepend>
          <v-icon>mdi-alert</v-icon>
        </template>
        No differences found. The files are identical based on the selected comparison mode.
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
  valueA?: any
  valueB?: any
  difference?: any
  [key: string]: any
}

// Use the actual backend response type
export interface CompareDataResponse {
  rows: Record<string, any>[]
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

const rowResults = computed(() => {
  // If there's a dedicated rowComparison field, use it
  if (props.results?.rowComparison) {
    return props.results.rowComparison
  }
  // Otherwise use the general rows field
  return props.results?.rows || []
})

const summary = computed(() => {
  return props.results?.summary || null
})

const isEmpty = computed(() => {
  if (!hasResults.value) return false

  const hasColumnDiff = columnResults.value &&
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
    { title: 'Value in B', key: 'valueB', sortable: false }
  ]

  // Add difference column if there are any numeric comparisons
  const hasDifferences = rowResults.value.some(r => r.difference !== undefined)
  if (hasDifferences) {
    headers.push({ title: 'Difference', key: 'difference', sortable: false })
  }

  return headers
})

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

function formatValue(value: any): string {
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
.text-success {
  color: rgb(var(--v-theme-success));
}

.text-warning {
  color: rgb(var(--v-theme-warning));
}

.text-error {
  color: rgb(var(--v-theme-error));
}

.text-info {
  color: rgb(var(--v-theme-info));
}

:deep(.v-data-table) {
  border-radius: 4px;
}
</style>
