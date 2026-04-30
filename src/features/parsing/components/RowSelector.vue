<template>
  <AppPanel eyebrow="Rows" title="Row Selection" :description="panelDescription">
    <div v-if="totalRows > 0" class="row-selector-subtitle">
      Total rows available: {{ totalRows }}
    </div>

    <div>
      <div class="row-selector-mode-grid mb-4">
        <label v-for="option in modeOptions" :key="option.value" class="row-selector-mode-card" :class="{ 'row-selector-mode-card--active': selectionMode === option.value }">
          <input v-model="selectionMode" :value="option.value" type="radio">
          <span>{{ option.label }}</span>
          <small>{{ option.description }}</small>
        </label>
      </div>

      <div v-if="selectionMode === 'all'" class="row-selector-notice row-selector-notice--info mt-4">
        All {{ totalRows }} rows will be included in the output.
      </div>

      <div v-if="selectionMode === 'range'" class="mt-4 row-selector-range-grid">
        <label class="row-selector-field">
          <span>Start Row</span>
          <input v-model.number="rangeStart" :max="totalRows" min="1" type="number">
          <small>Row number (1-based).</small>
        </label>

        <label class="row-selector-field">
          <span>End Row</span>
          <input v-model.number="rangeEnd" :max="totalRows" :min="rangeStart || 1" type="number">
          <small>Row number (1-based, inclusive).</small>
        </label>

        <label class="row-selector-field row-selector-field--wide">
          <span>Excluded Rows</span>
          <div class="row-selector-field__action">
            <input v-model="excludeInput" placeholder="5,10,15 or 5-10,20-25" type="text" @keydown.enter.prevent="applyExcludedRows">
            <button type="button" @click="applyExcludedRows">Apply</button>
          </div>
          <small>Optional exclusions applied within the selected range.</small>
        </label>

        <div v-if="excludeIndices.length > 0" class="row-selector-chip-list">
          <button v-for="(idx, i) in excludeIndices" :key="i" type="button" class="row-selector-chip" @click="removeExcludedRow(i)">
            <span>Row {{ idx + 1 }}</span>
            <Icon icon="mdi:close-circle" />
          </button>
        </div>

        <div v-if="isRangeValid" class="row-selector-notice row-selector-notice--success">
          Will include {{ effectiveRowCount }} rows ({{ selectedRowPercentage }}%)
          <span v-if="excludeIndices.length > 0"> after excluding {{ excludeIndices.length }} row(s)</span>.
        </div>

        <div v-else-if="rangeStart !== null && rangeEnd !== null" class="row-selector-notice row-selector-notice--error">
          {{ rangeErrorMessage }}
        </div>
      </div>

      <div class="row-selector-divider" />
      <div class="row-selector-summary">
        <div><strong>Selection Summary:</strong></div>
        <div v-if="selectionMode === 'all'">
          Mode: All rows ({{ totalRows }} rows)
        </div>
        <div v-else-if="selectionMode === 'range' && isRangeValid">
          Mode: Range [{{ rangeStart }} - {{ rangeEnd }}] ({{ effectiveRowCount }} rows)
          <span v-if="excludeIndices.length > 0"> - Excluding {{ excludeIndices.length }} rows</span>
        </div>
        <div v-else class="text-warning">
          Please configure row selection
        </div>
      </div>
    </div>
  </AppPanel>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import { AppPanel } from '@/shared'
import type { RowSelection, RowSelectionMode } from '../types'

// Props
interface Props {
  totalRows: number
  modelValue?: RowSelection
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({ mode: 'all' }),
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: RowSelection]
}>()

// State (using 1-based display values)
const selectionMode = ref<RowSelectionMode>(props.modelValue?.mode || 'all')
const rangeStart = ref<number | null>(1) // 1-based for UI
const rangeEnd = ref<number | null>(props.totalRows) // 1-based for UI
const excludeIndices = ref<number[]>(props.modelValue?.excluded || [])
const excludeInput = ref<string>('')
const modeOptions: Array<{ value: RowSelectionMode; label: string; description: string }> = [
  { value: 'all', label: 'All Rows', description: 'Use every row in the preview.' },
  {
    value: 'range',
    label: 'Row Range',
    description: 'Choose a start and end row, then optionally exclude rows inside the range.',
  },
]

// Computed
const isRangeValid = computed(() => {
  if (rangeStart.value === null || rangeEnd.value === null) return false
  if (rangeStart.value < 1 || rangeEnd.value < 1) return false
  if (rangeStart.value > props.totalRows || rangeEnd.value > props.totalRows) return false
  return rangeStart.value <= rangeEnd.value
})

const selectedRowCount = computed(() => {
  if (!isRangeValid.value || rangeStart.value === null || rangeEnd.value === null) return 0
  return rangeEnd.value - rangeStart.value + 1
})

const effectiveRowCount = computed(() => {
  if (!isRangeValid.value) return 0
  return Math.max(selectedRowCount.value - excludeIndices.value.length, 0)
})

const selectedRowPercentage = computed(() => {
  if (props.totalRows === 0) return 0
  return Math.round((effectiveRowCount.value / props.totalRows) * 100)
})

const panelDescription = computed(() => {
  return selectionMode.value === 'all'
    ? 'Keep every previewed row or switch to a targeted range.'
    : 'Choose a row window and optionally exclude specific rows inside it.'
})

const rangeErrorMessage = computed(() => {
  if (rangeStart.value === null || rangeEnd.value === null) {
    return 'Please enter both start and end row numbers'
  }
  if (rangeStart.value < 1 || rangeEnd.value < 1) {
    return 'Row numbers must be 1 or greater'
  }
  if (rangeStart.value > props.totalRows || rangeEnd.value > props.totalRows) {
    return `Row numbers must not exceed ${props.totalRows}`
  }
  if (rangeStart.value > rangeEnd.value) {
    return 'Start row must be less than or equal to end row'
  }
  return ''
})

// Excluded Rows Functions (handles 1-based input, converts to 0-based for backend)
function parseExcludeInput(input: string): number[] {
  const indices: number[] = []
  const parts = input
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p)

  for (const part of parts) {
    if (part.includes('-')) {
      // Range like "5-10" (1-based input)
      const rangeParts = part.split('-')
      const start = parseInt(rangeParts[0]?.trim() || '', 10)
      const end = parseInt(rangeParts[1]?.trim() || '', 10)

      if (!Number.isNaN(start) && !Number.isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          const zeroBasedIndex = i - 1 // Convert to 0-based
          if (
            zeroBasedIndex >= 0 &&
            zeroBasedIndex < props.totalRows &&
            !indices.includes(zeroBasedIndex)
          ) {
            indices.push(zeroBasedIndex)
          }
        }
      }
    } else {
      // Single number like "5" (1-based input)
      const num = parseInt(part, 10)
      if (!Number.isNaN(num)) {
        const zeroBasedIndex = num - 1 // Convert to 0-based
        if (
          zeroBasedIndex >= 0 &&
          zeroBasedIndex < props.totalRows &&
          !indices.includes(zeroBasedIndex)
        ) {
          indices.push(zeroBasedIndex)
        }
      }
    }
  }

  return indices.sort((a, b) => a - b)
}

function applyExcludedRows() {
  if (!excludeInput.value) return

  const newIndices = parseExcludeInput(excludeInput.value)
  excludeIndices.value = [...new Set([...excludeIndices.value, ...newIndices])].sort(
    (a, b) => a - b,
  )
  excludeInput.value = ''
}

function removeExcludedRow(index: number) {
  excludeIndices.value.splice(index, 1)
}

// Watchers (Convert 1-based UI to 0-based backend)
watch(
  [selectionMode, rangeStart, rangeEnd, excludeIndices],
  () => {
    const selection: RowSelection = {
      mode: selectionMode.value,
    }

    if (selectionMode.value === 'range' && isRangeValid.value) {
      selection.range = {
        // biome-ignore lint/style/noNonNullAssertion: isRangeValid guarantees rangeStart is not null
        start: rangeStart.value! - 1, // Convert 1-based to 0-based
        // biome-ignore lint/style/noNonNullAssertion: isRangeValid guarantees rangeEnd is not null
        end: rangeEnd.value! - 1, // Convert 1-based to 0-based
      }
      if (excludeIndices.value.length > 0) {
        selection.excluded = excludeIndices.value
      }
    }

    emit('update:modelValue', selection)
  },
  { deep: true },
)

// Initialize from modelValue (Convert 0-based backend to 1-based UI)
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      selectionMode.value = newValue.mode
      if (newValue.range) {
        rangeStart.value = newValue.range.start + 1 // Convert 0-based to 1-based
        rangeEnd.value = newValue.range.end + 1 // Convert 0-based to 1-based
      }
      if (newValue.excluded) {
        excludeIndices.value = newValue.excluded // Already 0-based
      }
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.row-selector-subtitle,
.row-selector-summary {
  color: var(--app-muted);
  line-height: 1.55;
}

.row-selector-subtitle {
  margin-bottom: 1rem;
}

    .row-selector-mode-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
      gap: 0.9rem;
    }

    .row-selector-mode-card {
      display: grid;
      gap: 0.3rem;
      border: 1px solid var(--app-border);
      border-radius: 1.15rem;
      background: var(--app-panel);
      padding: 1rem;
      cursor: pointer;
      box-shadow: var(--app-shadow-soft);
    }

    .row-selector-mode-card input {
      position: absolute;
      opacity: 0;
    }

    .row-selector-mode-card span {
      color: var(--app-ink);
      font-weight: 700;
    }

    .row-selector-mode-card small {
      color: var(--app-muted);
      line-height: 1.55;
    }

    .row-selector-mode-card--active {
      border-color: var(--app-accent);
      background: linear-gradient(180deg, rgba(15, 118, 110, 0.1), var(--app-panel));
      box-shadow: 0 0 0 4px var(--app-ring);
    }

    .row-selector-range-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.9rem;
    }

    .row-selector-field {
      display: grid;
      gap: 0.45rem;
    }

    .row-selector-field--wide,
    .row-selector-chip-list,
    .row-selector-notice {
      grid-column: 1 / -1;
    }

    .row-selector-field > span {
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: none;
      color: var(--app-muted);
    }

    .row-selector-field input,
    .row-selector-field__action {
      width: 100%;
      border: 1px solid var(--app-border);
      border-radius: 1rem;
      background: var(--app-panel);
      color: var(--app-ink);
      box-shadow: var(--app-shadow-soft);
    }

    .row-selector-field input {
      padding: 0.85rem 0.95rem;
    }

    .row-selector-field input:focus,
    .row-selector-field__action:focus-within {
      outline: none;
      border-color: var(--app-accent);
      box-shadow: 0 0 0 4px var(--app-ring);
    }

    .row-selector-field__action {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.2rem 0.2rem 0.2rem 0.85rem;
    }

    .row-selector-field__action input {
      border: 0;
      box-shadow: none;
      background: transparent;
      padding: 0.65rem 0;
    }

    .row-selector-field__action button {
      border: 0;
      border-radius: 0.85rem;
      background: rgba(15, 118, 110, 0.1);
      color: var(--app-accent);
      cursor: pointer;
      font-weight: 700;
      padding: 0.7rem 0.9rem;
    }

    .row-selector-field small {
      color: var(--app-muted);
      line-height: 1.5;
    }

    .row-selector-chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .row-selector-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      border: 1px solid rgba(15, 118, 110, 0.24);
      border-radius: 999px;
      background: rgba(15, 118, 110, 0.08);
      color: var(--app-accent);
      cursor: pointer;
      font-weight: 700;
      padding: 0.45rem 0.7rem;
    }

    .row-selector-notice {
      border: 1px solid var(--app-border);
      border-radius: 1rem;
      padding: 0.9rem 1rem;
      box-shadow: var(--app-shadow-soft);
    }

    .row-selector-notice--info {
      background: var(--app-panel);
    }

    .row-selector-notice--success {
      background: rgba(15, 118, 110, 0.08);
    }

    .row-selector-notice--error {
      background: rgba(163, 61, 45, 0.08);
      border-color: rgba(163, 61, 45, 0.24);
    }

.text-warning {
    color: var(--app-danger);
}

    .row-selector-divider {
      height: 1px;
      margin: 1rem 0;
      background: rgba(15, 118, 110, 0.1);
    }

    .row-selector-summary strong {
      color: var(--app-ink);
    }

    @media (max-width: 720px) {
      .row-selector-range-grid,
      .row-selector-mode-grid {
        grid-template-columns: 1fr;
      }
    }
</style>
