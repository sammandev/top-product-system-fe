<template>
  <v-card>
    <v-card-title class="d-flex justify-space-between align-center">
      <div>
        <v-icon start>mdi-connection</v-icon>
        Column Mapping
      </div>
      <v-chip :color="mappedCount > 0 ? 'primary' : 'default'" size="small">
        {{ mappedCount }} / {{ Math.min(columnsA.length, columnsB.length) }} mapped
      </v-chip>
    </v-card-title>

    <v-card-subtitle v-if="mappedCount > 0">
      {{ mappedCount }} column{{ mappedCount !== 1 ? 's' : '' }} mapped
    </v-card-subtitle>

    <v-card-text>
      <!-- Auto-mapping Options -->
      <div class="d-flex gap-2 mb-4">
        <v-btn size="small" variant="tonal" prepend-icon="mdi-auto-fix" @click="autoMapByName">
          Auto-map by Name
        </v-btn>
        <v-btn size="small" variant="tonal" prepend-icon="mdi-refresh" @click="clearMappings">
          Clear All
        </v-btn>
      </div>

      <!-- Mapping List -->
      <div v-if="columnsA.length > 0 && columnsB.length > 0" class="mapping-container">
        <div class="mapping-row" v-for="(colA, index) in columnsA" :key="`mapping-${index}`">
          <!-- Column A -->
          <div class="column-item column-a">
            <v-chip size="small" color="blue" variant="tonal">
              A
            </v-chip>
            <span class="column-name">{{ colA }}</span>
          </div>

          <!-- Mapping Arrow/Controls -->
          <div class="mapping-controls">
            <v-icon v-if="getMappingForColumnA(colA)" color="success" size="large">
              mdi-arrow-right-bold
            </v-icon>
            <v-icon v-else color="grey" size="large">
              mdi-arrow-right
            </v-icon>
          </div>

          <!-- Column B Selector -->
          <div class="column-item column-b">
            <v-select :model-value="getMappingForColumnA(colA)" :items="availableColumnsBForA(colA)"
              label="Select column from File B" variant="outlined" density="compact" hide-details clearable
              @update:model-value="(value) => updateMapping(colA, value)">
              <template #prepend-inner>
                <v-chip size="small" color="orange" variant="tonal">
                  B
                </v-chip>
              </template>
            </v-select>
          </div>
        </div>
      </div>

      <!-- No Columns -->
      <v-alert v-else type="info" variant="tonal" density="compact">
        Upload both files to start mapping columns
      </v-alert>

      <!-- Unmapped Columns Warning -->
      <v-alert v-if="unmappedColumnsA.length > 0" type="warning" variant="tonal" density="compact" class="mt-4">
        <template #prepend>
          <v-icon>mdi-alert</v-icon>
        </template>
        <div>
          <strong>{{ unmappedColumnsA.length }} unmapped column(s) from File A:</strong>
          <div class="text-caption">{{ unmappedColumnsA.join(', ') }}</div>
        </div>
      </v-alert>

      <v-alert v-if="unmappedColumnsB.length > 0" type="info" variant="tonal" density="compact" class="mt-2">
        <div>
          <strong>{{ unmappedColumnsB.length }} unused column(s) from File B:</strong>
          <div class="text-caption">{{ unmappedColumnsB.join(', ') }}</div>
        </div>
      </v-alert>

      <!-- Summary -->
      <v-divider class="my-4" />
      <div class="text-caption text-medium-emphasis">
        <div v-if="mappedCount > 0">
          <strong>Mapped Columns:</strong>
          <div v-for="(mapping, idx) in mappedPairs" :key="`summary-${idx}`" class="mt-1">
            <v-chip size="x-small" color="blue" variant="tonal" class="mr-1">{{ mapping.a }}</v-chip>
            <v-icon size="x-small">mdi-arrow-right</v-icon>
            <v-chip size="x-small" color="orange" variant="tonal" class="ml-1">{{ mapping.b }}</v-chip>
          </div>
        </div>
        <div v-else>
          No columns mapped yet
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

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
  modelValue: () => []
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
  return props.columnsA.filter(col => !mappings.value.has(col))
})

const unmappedColumnsB = computed(() => {
  const mappedBColumns = new Set(mappings.value.values())
  return props.columnsB.filter(col => !mappedBColumns.has(col))
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

  return props.columnsB.filter(colB => {
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
  props.columnsA.forEach(colA => {
    const matchingColB = props.columnsB.find(
      colB => colB.toLowerCase() === colA.toLowerCase()
    )
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
.gap-2 {
  gap: 0.5rem;
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
  background-color: rgba(var(--v-theme-surface-variant), 0.1);
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
</style>
