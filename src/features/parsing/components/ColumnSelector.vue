<template>
  <v-card>
    <v-card-title class="d-flex justify-space-between align-center">
      <div>
        <v-icon start>mdi-table-column</v-icon>
        Column Selection
      </div>
      <v-chip :color="selectedCount > 0 ? 'primary' : 'default'" size="small">
        {{ selectedCount }} / {{ columns.length }} selected
      </v-chip>
    </v-card-title>

    <v-card-subtitle v-if="modelValue && modelValue.length > 0">
      {{ modelValue.length }} column{{ modelValue.length !== 1 ? 's' : '' }} selected
    </v-card-subtitle>

    <v-card-text>
      <!-- Search Box -->
      <v-text-field v-model="searchQuery" label="Search columns" variant="outlined" density="compact"
        prepend-inner-icon="mdi-magnify" clearable hide-details class="mb-4" />

      <!-- Quick Selection Input -->
      <v-text-field v-model="quickSelectInput" label="Quick Select (e.g., 'A-Z' or 'A,C,E,J')" variant="outlined"
        density="compact" prepend-inner-icon="mdi-lightning-bolt" clearable
        hint="Press Enter to apply. Use ranges (A-Z) or individual columns (A,E,J). Also supports numbers (1-10)."
        persistent-hint class="mb-4" @keydown.enter.prevent="applyQuickSelect">
        <template #append-inner>
          <v-btn size="small" variant="text" color="primary" @click="applyQuickSelect">
            Apply
          </v-btn>
        </template>
      </v-text-field>

      <!-- Quick Actions -->
      <div class="d-flex gap-2 mb-4">
        <v-btn size="small" variant="tonal" prepend-icon="mdi-checkbox-multiple-marked" @click="selectAll">
          Select All
        </v-btn>
        <v-btn size="small" variant="tonal" prepend-icon="mdi-checkbox-multiple-blank-outline" @click="deselectAll">
          Deselect All
        </v-btn>
        <v-btn v-if="modelValue && modelValue.length > 0" size="small" variant="tonal"
          prepend-icon="mdi-swap-horizontal" @click="invertSelection">
          Invert
        </v-btn>
      </div>

      <!-- Column List -->
      <v-list v-if="filteredColumns.length > 0" density="compact" class="column-list">
        <v-list-item v-for="column in filteredColumns" :key="column" class="column-item">
          <template #prepend>
            <v-checkbox :model-value="isSelected(column)" hide-details density="compact"
              @update:model-value="toggleColumn(column)" />
          </template>

          <v-list-item-title>
            <span class="text-primary font-weight-bold">[{{ getColumnLetter(props.columns.indexOf(column)) }}]</span>
            {{ formatColumnName(column) }}
          </v-list-item-title>

          <template #append>
            <v-chip size="x-small" variant="tonal" color="primary">
              {{ getColumnType(column) }}
            </v-chip>
          </template>
        </v-list-item>
      </v-list>

      <!-- No Results -->
      <v-alert v-else type="info" variant="tonal" density="compact" class="mt-4">
        No columns match your search
      </v-alert>

      <!-- Summary -->
      <v-divider class="my-4" />
      <div class="text-caption text-medium-emphasis">
        <div v-if="selectedCount > 0">
          Selected: <strong>{{ getSelectedColumnsSummary() }}</strong>
        </div>
        <div v-else>
          No columns selected
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

// Props
interface Props {
  columns: string[]
  modelValue?: string[]
  columnTypes?: Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  columnTypes: () => ({}),
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

// State
const searchQuery = ref('')
const quickSelectInput = ref('')

// Computed
const selectedCount = computed(() => props.modelValue?.length || 0)

const filteredColumns = computed(() => {
  if (!searchQuery.value) {
    return props.columns
  }

  const query = searchQuery.value.toLowerCase()
  return props.columns.filter((col) => col.toLowerCase().includes(query))
})

// Methods
function isSelected(column: string): boolean {
  return props.modelValue?.includes(column) || false
}

function toggleColumn(column: string) {
  const currentSelection = props.modelValue || []
  if (currentSelection.includes(column)) {
    // Remove column
    emit(
      'update:modelValue',
      currentSelection.filter((c) => c !== column),
    )
  } else {
    // Add column
    emit('update:modelValue', [...currentSelection, column])
  }
}

function selectAll() {
  emit('update:modelValue', [...props.columns])
}

function deselectAll() {
  emit('update:modelValue', [])
}

function invertSelection() {
  const currentSelection = props.modelValue || []
  const inverted = props.columns.filter((col) => !currentSelection.includes(col))
  emit('update:modelValue', inverted)
}

function getColumnType(column: string): string {
  return props.columnTypes?.[column] || 'text'
}

// Utility: Convert 0-based column index to Excel-style letter (A, B, C, ..., Z, AA, AB, ...)
function getColumnLetter(index: number): string {
  let letter = ''
  let num = index + 1 // Convert to 1-based

  while (num > 0) {
    const remainder = (num - 1) % 26
    letter = String.fromCharCode(65 + remainder) + letter
    num = Math.floor((num - 1) / 26)
  }

  return letter
}

// Utility: Convert Excel-style letter to 0-based index (A->0, B->1, ..., Z->25, AA->26, ...)
function letterToIndex(letter: string): number {
  let index = 0
  const upperLetter = letter.toUpperCase()

  for (let i = 0; i < upperLetter.length; i++) {
    index = index * 26 + (upperLetter.charCodeAt(i) - 64)
  }

  return index - 1 // Convert to 0-based
}

// Utility: Format column name (replace "Unnamed: X" with column letter)
function formatColumnName(column: string): string {
  if (column.match(/^Unnamed:\s*\d+$/i)) {
    const index = props.columns.indexOf(column)
    return getColumnLetter(index)
  }
  return column
}

// Utility: Get selected columns summary with letters
function getSelectedColumnsSummary(): string {
  if (!props.modelValue || props.modelValue.length === 0) return ''

  return props.modelValue
    .map((col) => {
      const index = props.columns.indexOf(col)
      const letter = getColumnLetter(index)
      const name = formatColumnName(col)
      return `[${letter}] ${name}`
    })
    .join(', ')
}

function parseQuickSelectInput(input: string): number[] {
  const indices: number[] = []
  const parts = input
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p)

  for (const part of parts) {
    if (part.includes('-')) {
      // Range like "A-Z" or "1-30"
      const rangeParts = part.split('-').map((p) => p.trim())
      const startStr = rangeParts[0] || ''
      const endStr = rangeParts[1] || ''

      // Check if it's letter-based (A-Z) or number-based (1-30)
      if (/^[A-Za-z]+$/.test(startStr) && /^[A-Za-z]+$/.test(endStr)) {
        // Letter-based range
        const startIdx = letterToIndex(startStr)
        const endIdx = letterToIndex(endStr)

        if (startIdx >= 0 && endIdx >= 0 && startIdx <= endIdx) {
          for (let i = startIdx; i <= endIdx; i++) {
            if (i >= 0 && i < props.columns.length && !indices.includes(i + 1)) {
              indices.push(i + 1) // Store as 1-based
            }
          }
        }
      } else {
        // Number-based range
        const start = parseInt(startStr, 10)
        const end = parseInt(endStr, 10)

        if (!Number.isNaN(start) && !Number.isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            if (i > 0 && i <= props.columns.length && !indices.includes(i)) {
              indices.push(i)
            }
          }
        }
      }
    } else {
      // Single column like "E" or "5"
      if (/^[A-Za-z]+$/.test(part)) {
        // Letter-based
        const idx = letterToIndex(part)
        if (idx >= 0 && idx < props.columns.length && !indices.includes(idx + 1)) {
          indices.push(idx + 1) // Store as 1-based
        }
      } else {
        // Number-based
        const num = parseInt(part, 10)
        if (
          !Number.isNaN(num) &&
          num > 0 &&
          num <= props.columns.length &&
          !indices.includes(num)
        ) {
          indices.push(num)
        }
      }
    }
  }

  return indices.sort((a, b) => a - b)
}

function applyQuickSelect() {
  if (!quickSelectInput.value) return

  const indices = parseQuickSelectInput(quickSelectInput.value)
  const selectedColumns = indices
    .map((idx) => props.columns[idx - 1]) // Convert 1-based to 0-based
    .filter((col): col is string => col !== undefined)

  emit('update:modelValue', selectedColumns)
  quickSelectInput.value = ''
}
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}

.column-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 4px;
}

.column-item {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.06);
}

.column-item:last-child {
  border-bottom: none;
}

.column-item:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.04);
}
</style>
