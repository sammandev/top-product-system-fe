<template>
  <AppPanel eyebrow="Columns" title="Column Selection" :description="panelDescription">
    <template #header-aside>
      <span class="column-selector-pill" :class="{ 'column-selector-pill--active': selectedCount > 0 }">
        {{ selectedCount }} / {{ columns.length }} selected
      </span>
    </template>

    <div v-if="modelValue && modelValue.length > 0" class="column-selector-subtitle">
      {{ modelValue.length }} column{{ modelValue.length !== 1 ? 's' : '' }} selected
    </div>

    <div>
      <div class="column-selector-tools">
        <label class="column-selector-field">
          <span>Search columns</span>
          <input v-model="searchQuery" placeholder="Filter by column name" type="text">
        </label>

        <label class="column-selector-field">
          <span>Quick Select</span>
          <div class="column-selector-field__action">
            <input v-model="quickSelectInput" placeholder="A-Z or A,C,E,J" type="text" @keydown.enter.prevent="applyQuickSelect">
            <button type="button" @click="applyQuickSelect">Apply</button>
          </div>
          <small>Use ranges like A-Z or 1-10, or individual columns such as A,E,J.</small>
        </label>
      </div>

      <div class="column-selector-toolbar">
        <button type="button" class="column-selector-action" @click="selectAll">
          <Icon icon="mdi:checkbox-multiple-marked" />
          <span>Select All</span>
        </button>
        <button type="button" class="column-selector-action" @click="deselectAll">
          <Icon icon="mdi:checkbox-multiple-blank-outline" />
          <span>Deselect All</span>
        </button>
        <button v-if="modelValue && modelValue.length > 0" type="button" class="column-selector-action" @click="invertSelection">
          <Icon icon="mdi:swap-horizontal" />
          <span>Invert</span>
        </button>
      </div>

      <div v-if="filteredColumns.length > 0" class="column-list">
        <label v-for="column in filteredColumns" :key="column" class="column-item">
          <div class="column-item__copy">
            <input :checked="isSelected(column)" type="checkbox" @change="toggleColumn(column)">
            <div>
              <strong>[{{ getColumnLetter(props.columns.indexOf(column)) }}]</strong>
              <span>{{ formatColumnName(column) }}</span>
            </div>
          </div>
          <span class="column-selector-type-pill">{{ getColumnType(column) }}</span>
        </label>
      </div>

      <div v-else class="column-selector-notice mt-4">No columns match your search.</div>

      <div class="column-selector-divider" />
      <div class="column-selector-summary">
        <div v-if="selectedCount > 0">Selected: <strong>{{ getSelectedColumnsSummary() }}</strong></div>
        <div v-else>No columns selected</div>
      </div>
    </div>
  </AppPanel>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { AppPanel } from '@/shared'

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

const panelDescription = computed(() => {
  return selectedCount.value > 0
    ? 'Trim the schema before parsing or download.'
    : 'Search, quick-select, and toggle source columns before parsing.'
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
.column-selector-toolbar,
.column-selector-action {
  display: inline-flex;
  align-items: center;
}

.column-selector-toolbar {
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.column-selector-pill,
.column-selector-type-pill,
.column-selector-action {
  border: 1px solid var(--app-border);
  border-radius: 999px;
}

.column-selector-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.8rem;
  background: var(--app-panel);
  color: var(--app-muted);
  font-size: 0.78rem;
  font-weight: 700;
}

.column-selector-pill--active {
  background: rgba(15, 118, 110, 0.1);
  border-color: rgba(15, 118, 110, 0.24);
  color: var(--app-accent);
}

.column-selector-subtitle,
.column-selector-summary {
  color: var(--app-muted);
  line-height: 1.55;
}

.column-selector-subtitle {
  margin-bottom: 1rem;
}

.column-selector-action {
  gap: 0.45rem;
  justify-content: center;
  padding: 0.62rem 0.85rem;
  background: var(--app-panel);
  color: var(--app-ink);
  cursor: pointer;
  font-weight: 700;
}

.column-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
}

.column-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  border-bottom: 1px solid rgba(15, 118, 110, 0.08);
  padding: 0.85rem 1rem;
}

.column-item:last-child {
  border-bottom: none;
}

.column-item:hover {
  background-color: rgba(15, 118, 110, 0.04);
}

.column-selector-tools {
  display: grid;
  gap: 0.9rem;
  margin-bottom: 1rem;
}

.column-selector-field {
  display: grid;
  gap: 0.45rem;
}

.column-selector-field > span {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  color: var(--app-muted);
}

.column-selector-field input,
.column-selector-field__action {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
  color: var(--app-ink);
  box-shadow: var(--app-shadow-soft);
}

.column-selector-field input {
  padding: 0.85rem 0.95rem;
}

.column-selector-field input:focus,
.column-selector-field__action:focus-within {
  outline: none;
  border-color: var(--app-accent);
  box-shadow: 0 0 0 4px var(--app-ring);
}

.column-selector-field__action {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.2rem 0.2rem 0.2rem 0.85rem;
}

.column-selector-field__action input {
  border: 0;
  box-shadow: none;
  background: transparent;
  padding: 0.65rem 0;
}

.column-selector-field__action button {
  border: 0;
  border-radius: 0.85rem;
  background: rgba(15, 118, 110, 0.1);
  color: var(--app-accent);
  cursor: pointer;
  font-weight: 700;
  padding: 0.7rem 0.9rem;
}

.column-selector-field small {
  color: var(--app-muted);
  line-height: 1.5;
}

.column-item__copy {
  display: flex;
  gap: 0.85rem;
  align-items: center;
}

.column-item__copy input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--app-accent);
}

.column-item__copy strong {
  color: var(--app-accent);
  margin-right: 0.35rem;
}

.column-selector-notice {
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
  padding: 0.9rem 1rem;
  color: var(--app-muted);
}

.column-selector-type-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.22rem 0.6rem;
  background: rgba(31, 78, 134, 0.1);
  border-color: rgba(31, 78, 134, 0.18);
  color: #1f4e86;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: none;
}

.column-selector-divider {
  height: 1px;
  margin: 1rem 0;
  background: rgba(15, 118, 110, 0.1);
}

.column-selector-summary strong {
  color: var(--app-ink);
}
</style>
