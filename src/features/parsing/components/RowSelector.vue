<template>
    <v-card>
        <v-card-title>
            <v-icon start>mdi-table-row</v-icon>
            Row Selection
        </v-card-title>

        <v-card-subtitle v-if="totalRows > 0">
            Total rows available: {{ totalRows }}
        </v-card-subtitle>

        <v-card-text>
            <!-- Selection Mode -->
            <v-radio-group v-model="selectionMode" inline hide-details class="mb-4">
                <v-radio label="All Rows" value="all" color="primary" />
                <v-radio label="Row Range" value="range" color="primary" />
            </v-radio-group>

            <!-- All Rows Mode -->
            <v-alert v-if="selectionMode === 'all'" type="info" variant="tonal" density="compact" class="mt-4">
                All {{ totalRows }} rows will be included in the output
            </v-alert>

            <!-- Range Mode -->
            <div v-if="selectionMode === 'range'" class="mt-4">
                <v-row>
                    <v-col cols="12" md="6">
                        <v-text-field v-model.number="rangeStart" label="Start Row" type="number" variant="outlined"
                            density="compact" :min="1" :max="totalRows" :rules="[validateRangeStart]"
                            hint="Row number (1-based)" persistent-hint>
                            <template #prepend-inner>
                                <v-icon>mdi-arrow-right-top</v-icon>
                            </template>
                        </v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-text-field v-model.number="rangeEnd" label="End Row" type="number" variant="outlined"
                            density="compact" :min="rangeStart" :max="totalRows" :rules="[validateRangeEnd]"
                            hint="Row number (1-based, inclusive)" persistent-hint>
                            <template #prepend-inner>
                                <v-icon>mdi-arrow-right-bottom</v-icon>
                            </template>
                        </v-text-field>
                    </v-col>
                </v-row>

                <!-- Excluded Rows (inside Range mode) -->
                <v-text-field v-model="excludeInput" label="Excluded Rows (optional)" variant="outlined"
                    density="compact" class="mt-4"
                    hint="Enter row numbers or ranges: e.g., '5,10,15' or '5-10,20-25' (1-based)" persistent-hint
                    clearable @keydown.enter.prevent="applyExcludedRows">
                    <template #prepend-inner>
                        <v-icon>mdi-minus-circle</v-icon>
                    </template>
                    <template #append-inner>
                        <v-btn size="small" variant="text" color="primary" @click="applyExcludedRows">
                            Apply
                        </v-btn>
                    </template>
                </v-text-field>

                <!-- Excluded Rows Chips Display -->
                <div v-if="excludeIndices.length > 0" class="mt-2">
                    <v-chip v-for="(idx, i) in excludeIndices" :key="i" size="small" closable class="mr-1 mb-1"
                        @click:close="removeExcludedRow(i)">
                        Row {{ idx + 1 }}
                    </v-chip>
                </div>

                <!-- Range Preview -->
                <v-alert v-if="isRangeValid" type="success" variant="tonal" density="compact" class="mt-4">
                    <template #prepend>
                        <v-icon>mdi-check-circle</v-icon>
                    </template>
                    <div>
                        Will include {{ selectedRowCount }} rows ({{ selectedRowPercentage }}%)
                        <span v-if="excludeIndices.length > 0"> - Excluding {{ excludeIndices.length }} rows</span>
                    </div>
                </v-alert>

                <!-- Range Error -->
                <v-alert v-else-if="rangeStart !== null && rangeEnd !== null" type="error" variant="tonal"
                    density="compact" class="mt-4">
                    <template #prepend>
                        <v-icon>mdi-alert-circle</v-icon>
                    </template>
                    {{ rangeErrorMessage }}
                </v-alert>
            </div>

            <!-- Summary -->
            <v-divider class="my-4" />
            <div class="text-caption text-medium-emphasis">
                <div><strong>Selection Summary:</strong></div>
                <div v-if="selectionMode === 'all'">
                    Mode: All rows ({{ totalRows }} rows)
                </div>
                <div v-else-if="selectionMode === 'range' && isRangeValid">
                    Mode: Range [{{ rangeStart }} - {{ rangeEnd }}] ({{ selectedRowCount }} rows)
                    <span v-if="excludeIndices.length > 0"> - Excluding {{ excludeIndices.length }} rows</span>
                </div>
                <div v-else class="text-warning">
                    Please configure row selection
                </div>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { RowSelection, RowSelectionMode } from '../types'

// Props
interface Props {
    totalRows: number
    modelValue?: RowSelection
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: () => ({ mode: 'all' })
})

// Emits
const emit = defineEmits<{
    'update:modelValue': [value: RowSelection]
}>()

// State (using 1-based display values)
const selectionMode = ref<RowSelectionMode>(props.modelValue?.mode || 'all')
const rangeStart = ref<number | null>(1) // 1-based for UI
const rangeEnd = ref<number | null>(props.totalRows) // 1-based for UI
const excludeIndices = ref<number[]>(props.modelValue?.exclude || [])
const excludeInput = ref<string>('')

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

const selectedRowPercentage = computed(() => {
    if (props.totalRows === 0) return 0
    return Math.round((selectedRowCount.value / props.totalRows) * 100)
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

// Validation
function validateRangeStart(value: number | null): boolean | string {
    if (value === null) return 'Start row is required'
    if (value < 1) return 'Row number must be 1 or greater'
    if (value > props.totalRows) return `Row number must not exceed ${props.totalRows}`
    return true
}

function validateRangeEnd(value: number | null): boolean | string {
    if (value === null) return 'End row is required'
    if (value < 1) return 'Row number must be 1 or greater'
    if (value > props.totalRows) return `Row number must not exceed ${props.totalRows}`
    if (rangeStart.value !== null && value < rangeStart.value) {
        return 'End row must be greater than or equal to start row'
    }
    return true
}

// Excluded Rows Functions (handles 1-based input, converts to 0-based for backend)
function parseExcludeInput(input: string): number[] {
    const indices: number[] = []
    const parts = input.split(',').map(p => p.trim()).filter(p => p)

    for (const part of parts) {
        if (part.includes('-')) {
            // Range like "5-10" (1-based input)
            const rangeParts = part.split('-')
            const start = parseInt(rangeParts[0]?.trim() || '')
            const end = parseInt(rangeParts[1]?.trim() || '')

            if (!isNaN(start) && !isNaN(end) && start <= end) {
                for (let i = start; i <= end; i++) {
                    const zeroBasedIndex = i - 1 // Convert to 0-based
                    if (zeroBasedIndex >= 0 && zeroBasedIndex < props.totalRows && !indices.includes(zeroBasedIndex)) {
                        indices.push(zeroBasedIndex)
                    }
                }
            }
        } else {
            // Single number like "5" (1-based input)
            const num = parseInt(part)
            if (!isNaN(num)) {
                const zeroBasedIndex = num - 1 // Convert to 0-based
                if (zeroBasedIndex >= 0 && zeroBasedIndex < props.totalRows && !indices.includes(zeroBasedIndex)) {
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
    excludeIndices.value = [...new Set([...excludeIndices.value, ...newIndices])].sort((a, b) => a - b)
    excludeInput.value = ''
}

function removeExcludedRow(index: number) {
    excludeIndices.value.splice(index, 1)
}

// Watchers (Convert 1-based UI to 0-based backend)
watch([selectionMode, rangeStart, rangeEnd, excludeIndices], () => {
    const selection: RowSelection = {
        mode: selectionMode.value
    }

    if (selectionMode.value === 'range' && isRangeValid.value) {
        selection.range = {
            start: rangeStart.value! - 1, // Convert 1-based to 0-based
            end: rangeEnd.value! - 1       // Convert 1-based to 0-based
        }
    }

    if (selectionMode.value === 'exclude') {
        selection.exclude = excludeIndices.value // Already 0-based internally
    }

    emit('update:modelValue', selection)
}, { deep: true })

// Initialize from modelValue (Convert 0-based backend to 1-based UI)
watch(() => props.modelValue, (newValue) => {
    if (newValue) {
        selectionMode.value = newValue.mode
        if (newValue.range) {
            rangeStart.value = newValue.range.start + 1 // Convert 0-based to 1-based
            rangeEnd.value = newValue.range.end + 1     // Convert 0-based to 1-based
        }
        if (newValue.exclude) {
            excludeIndices.value = newValue.exclude // Already 0-based
        }
    }
}, { immediate: true })
</script>

<style scoped>
.text-warning {
    color: rgb(var(--v-theme-warning));
}
</style>
