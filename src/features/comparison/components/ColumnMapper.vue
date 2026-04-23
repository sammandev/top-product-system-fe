<template>
  <AppPanel
    eyebrow="Structure Setup"
    title="Column Mapping"
    description="Pair columns across both files before running the compare flow. Auto-map helps when headers already align."
    tone="cool"
    split-header
  >
    <template #header-aside>
      <span class="mapping-pill" :class="mappedCount > 0 ? 'mapping-pill--primary' : 'mapping-pill--muted'">
        {{ mappedCount }} / {{ Math.min(columnsA.length, columnsB.length) }} mapped
      </span>
    </template>

    <p v-if="mappedCount > 0" class="mapping-subtitle">
      {{ mappedCount }} column{{ mappedCount !== 1 ? 's' : '' }} mapped
    </p>

    <div class="mapping-actions">
      <button type="button" class="mapping-button" @click="autoMapByName">
        <Icon icon="mdi:auto-fix" />
        <span>Auto-map by Name</span>
      </button>
      <button type="button" class="mapping-button" @click="clearMappings">
        <Icon icon="mdi:refresh" />
        <span>Clear All</span>
      </button>
    </div>

    <div v-if="columnsA.length > 0 && columnsB.length > 0" class="mapping-container">
      <div v-for="(colA, index) in columnsA" :key="`mapping-${index}`" class="mapping-row">
        <div class="column-item column-a">
          <span class="mapping-pill mapping-pill--a">A</span>
          <span class="column-name">{{ colA }}</span>
        </div>

        <div class="mapping-controls">
          <Icon
            :icon="getMappingForColumnA(colA) ? 'mdi:arrow-right-bold' : 'mdi:arrow-right'"
            :class="getMappingForColumnA(colA) ? 'mapping-arrow mapping-arrow--active' : 'mapping-arrow'"
          />
        </div>

        <label class="mapping-select">
          <span>Select column from File B</span>
          <div class="mapping-select__field">
            <span class="mapping-pill mapping-pill--b">B</span>
            <select :value="getMappingForColumnA(colA) ?? ''" @change="updateMapping(colA, (($event.target as HTMLSelectElement).value || null))">
              <option value="">No mapping</option>
              <option v-for="colB in availableColumnsBForA(colA)" :key="`${colA}-${colB}`" :value="colB">{{ colB }}</option>
            </select>
          </div>
        </label>
      </div>
    </div>

    <div v-else class="mapping-notice mapping-notice--info">Upload both files to start mapping columns.</div>

    <div v-if="unmappedColumnsA.length > 0" class="mapping-notice mapping-notice--warning mt-4">
      <strong>{{ unmappedColumnsA.length }} unmapped column(s) from File A</strong>
      <p>{{ unmappedColumnsA.join(', ') }}</p>
    </div>

    <div v-if="unmappedColumnsB.length > 0" class="mapping-notice mapping-notice--info mt-2">
      <strong>{{ unmappedColumnsB.length }} unused column(s) from File B</strong>
      <p>{{ unmappedColumnsB.join(', ') }}</p>
    </div>

    <div class="mapping-divider"></div>

    <div class="mapping-summary">
      <div v-if="mappedCount > 0">
        <strong>Mapped Columns:</strong>
        <div v-for="(mapping, idx) in mappedPairs" :key="`summary-${idx}`" class="mapping-summary__row">
          <span class="mapping-pill mapping-pill--a">{{ mapping.a }}</span>
          <Icon icon="mdi:arrow-right" class="mapping-summary__arrow" />
          <span class="mapping-pill mapping-pill--b">{{ mapping.b }}</span>
        </div>
      </div>
      <div v-else>No columns mapped yet</div>
    </div>
  </AppPanel>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { AppPanel } from '@/shared'

// Types
export interface ColumnMapping {
  a: string
  b: string
}

// Props
interface Props {
  columnsA: string[]
  columnsB: string[]
  modelValue: ColumnMapping[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: ColumnMapping[]]
}>()

// State
const mappings = ref<Map<string, string>>(new Map())

// Initialize mappings from modelValue
if (props.modelValue && props.modelValue.length > 0) {
  props.modelValue.forEach(({ a, b }) => {
    mappings.value.set(a, b)
  })
}

// Computed
const mappedCount = computed(() => mappings.value.size)

const mappedPairs = computed((): ColumnMapping[] => {
  const pairs: ColumnMapping[] = []
  mappings.value.forEach((b, a) => {
    pairs.push({ a, b })
  })
  return pairs
})

const unmappedColumnsA = computed(() => {
  return props.columnsA.filter((col) => !mappings.value.has(col))
})

const unmappedColumnsB = computed(() => {
  const mappedBColumns = new Set(mappings.value.values())
  return props.columnsB.filter((col) => !mappedBColumns.has(col))
})

// Methods
function getMappingForColumnA(colA: string): string | null {
  return mappings.value.get(colA) || null
}

function availableColumnsBForA(colA: string): string[] {
  // Show all columns from B, including currently mapped one
  const currentMapping = mappings.value.get(colA)
  const mappedBColumns = new Set<string>()

  mappings.value.forEach((b, a) => {
    if (a !== colA) {
      mappedBColumns.add(b)
    }
  })

  return props.columnsB.filter((colB) => {
    return colB === currentMapping || !mappedBColumns.has(colB)
  })
}

function updateMapping(colA: string, colB: string | null) {
  if (colB) {
    mappings.value.set(colA, colB)
  } else {
    mappings.value.delete(colA)
  }
  emitMappings()
}

function autoMapByName() {
  // Clear existing mappings
  mappings.value.clear()

  // Map columns with exact name matches (case-insensitive)
  props.columnsA.forEach((colA) => {
    const matchingColB = props.columnsB.find((colB) => colB.toLowerCase() === colA.toLowerCase())
    if (matchingColB) {
      mappings.value.set(colA, matchingColB)
    }
  })

  emitMappings()
}

function clearMappings() {
  mappings.value.clear()
  emitMappings()
}

function emitMappings() {
  const pairs: ColumnMapping[] = []
  mappings.value.forEach((b, a) => {
    pairs.push({ a, b })
  })
  emit('update:modelValue', pairs)
}
</script>

<style scoped>
.mapping-actions,
.column-item,
.mapping-controls,
.mapping-select__field,
.mapping-button,
.mapping-pill {
  display: flex;
}

.mapping-subtitle,
.mapping-summary {
  color: var(--app-muted);
}

.mapping-subtitle {
  margin: 0 0 1rem;
  font-size: 0.84rem;
}

.mapping-actions {
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-bottom: 1rem;
}

.mapping-button {
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: rgba(255, 251, 247, 0.92);
  color: var(--app-ink);
  cursor: pointer;
  padding: 0.72rem 0.95rem;
  font-weight: 700;
}

.mapping-button:hover {
  transform: translateY(-1px);
}

.mapping-pill {
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 700;
}

.mapping-pill--primary {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.mapping-pill--muted {
  background: rgba(120, 129, 143, 0.12);
  color: #4f5d6d;
}

.mapping-pill--a {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.mapping-pill--b {
  background: rgba(198, 110, 39, 0.14);
  color: #8d4b12;
}

.mapping-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mapping-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1rem;
  align-items: center;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.mapping-row:hover {
  background-color: rgba(40, 96, 163, 0.06);
}

.column-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.column-item.column-a {
  justify-content: flex-start;
}

.column-item.column-b {
  justify-content: flex-start;
}

.column-name {
  font-weight: 500;
  font-size: 0.875rem;
}

.mapping-controls {
  display: flex;
  justify-content: center;
  align-items: center;
}

.mapping-arrow {
  color: #8a94a6;
  font-size: 1.5rem;
}

.mapping-arrow--active {
  color: #145847;
}

.mapping-select {
  display: grid;
  gap: 0.45rem;
}

.mapping-select > span {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--app-muted);
}

.mapping-select__field {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: rgba(255, 251, 247, 0.9);
  box-shadow: var(--app-shadow-soft);
  padding: 0.7rem 0.8rem;
}

.mapping-select__field select {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--app-ink);
}

.mapping-select__field select:focus {
  outline: none;
}

.mapping-notice {
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  padding: 0.9rem 1rem;
  box-shadow: var(--app-shadow-soft);
}

.mapping-notice strong {
  display: block;
  color: var(--app-ink);
}

.mapping-notice p {
  margin: 0.25rem 0 0;
  color: var(--app-muted);
}

.mapping-notice--info {
  background: rgba(255, 251, 247, 0.92);
}

.mapping-notice--warning {
  background: rgba(245, 168, 71, 0.1);
}

.mapping-divider {
  height: 1px;
  background: var(--app-border);
  margin: 1rem 0;
}

.mapping-summary {
  font-size: 0.82rem;
}

.mapping-summary strong {
  color: var(--app-ink);
}

.mapping-summary__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.45rem;
}

.mapping-summary__arrow {
  color: #8a94a6;
}

@media (max-width: 900px) {
  .mapping-row {
    grid-template-columns: 1fr;
  }

  .mapping-controls {
    justify-content: flex-start;
  }
}
</style>
