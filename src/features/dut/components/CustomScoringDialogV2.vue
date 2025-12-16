<template>
    <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="900px"
        scrollable>
        <template v-if="$slots.activator" #activator="slotProps">
            <slot name="activator" v-bind="slotProps" />
        </template>

        <v-card>
            <v-card-title class="d-flex align-center justify-space-between bg-primary">
                <span>Custom Scoring Configuration</span>
                <v-btn icon="mdi-close" variant="text" @click="$emit('update:modelValue', false)" />
            </v-card-title>

            <v-card-text class="pa-4" style="max-height: 70vh">
                <!-- Active Formulas Summary -->
                <v-alert v-if="enabledCount > 0" type="info" variant="tonal" class="mb-4" density="compact">
                    <div class="d-flex align-center justify-space-between">
                        <span>
                            <strong>{{ enabledCount }}</strong> custom formula{{ enabledCount > 1 ? 's' : '' }}
                            active
                        </span>
                        <v-chip size="small" color="primary">
                            {{ universalFormula.enabled ? 'Universal' : '' }}
                            {{ universalFormula.enabled && enabledCategoryCount > 0 ? ' + ' : '' }}
                            {{ enabledCategoryCount > 0 ? `${enabledCategoryCount} Categories` : '' }}
                        </v-chip>
                    </div>
                </v-alert>

                <v-expansion-panels multiple>
                    <!-- Universal Formula -->
                    <v-expansion-panel>
                        <v-expansion-panel-title>
                            <div class="d-flex align-center justify-space-between w-100">
                                <div class="d-flex align-center gap-2">
                                    <v-icon>mdi-earth</v-icon>
                                    <span class="font-weight-medium">Universal Formula</span>
                                    <v-chip v-if="universalFormula.enabled" size="x-small" color="success">
                                        Enabled
                                    </v-chip>
                                </div>
                                <div class="text-caption text-medium-emphasis" @click.stop>
                                    {{ universalFormula.formulaType }} scoring
                                </div>
                            </div>
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                            <FormulaEditor :formula="universalFormula" @update:enabled="updateUniversalEnabled"
                                @update:formula-type="updateUniversalType"
                                @update:parameters="updateUniversalParameters"
                                @update:custom-expression="updateUniversalExpression" />
                        </v-expansion-panel-text>
                    </v-expansion-panel>

                    <!-- Test with Real Data -->
                    <v-expansion-panel v-if="availableMeasurements.length > 0">
                        <v-expansion-panel-title>
                            <div class="d-flex align-center justify-space-between w-100">
                                <div class="d-flex align-center gap-2">
                                    <v-icon>mdi-test-tube</v-icon>
                                    <span class="font-weight-medium">Test Formula with Real Data</span>
                                    <v-chip v-if="testMeasurement" size="x-small" color="primary">
                                        Testing {{ testMeasurement.test_item }}
                                    </v-chip>
                                </div>
                            </div>
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                            <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                                Test your formulas with actual measurements from the current results to see how they perform.
                            </v-alert>

                            <!-- Measurement Selector -->
                            <v-select
                                v-model="testMeasurement"
                                :items="availableMeasurements"
                                item-title="test_item"
                                return-object
                                label="Select Measurement to Test"
                                variant="outlined"
                                density="compact"
                                class="mb-4"
                            >
                                <template #item="{ props: itemProps, item }">
                                    <v-list-item v-bind="itemProps">
                                        <template #prepend>
                                            <v-chip size="x-small" color="primary" variant="tonal">
                                                {{ item.raw.category || 'General' }}
                                            </v-chip>
                                        </template>
                                    </v-list-item>
                                </template>
                            </v-select>

                            <!-- Test Results -->
                            <v-card v-if="testMeasurement" variant="outlined" class="mb-4">
                                <v-card-title class="text-subtitle-1">Test Results</v-card-title>
                                <v-card-text>
                                    <v-table density="compact">
                                        <tbody>
                                            <tr>
                                                <td class="font-weight-medium">Test Item</td>
                                                <td>{{ testMeasurement.test_item }}</td>
                                            </tr>
                                            <tr>
                                                <td class="font-weight-medium">Category</td>
                                                <td>
                                                    <v-chip size="small" color="primary" variant="tonal">
                                                        {{ testMeasurement.category || 'General' }}
                                                    </v-chip>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td class="font-weight-medium">Measured Value</td>
                                                <td>{{ testMeasurement.actual.toFixed(4) }}</td>
                                            </tr>
                                            <tr>
                                                <td class="font-weight-medium">Target Value</td>
                                                <td>{{ testMeasurement.target !== null ? testMeasurement.target.toFixed(4) : 'N/A' }}</td>
                                            </tr>
                                            <tr>
                                                <td class="font-weight-medium">USL / LSL</td>
                                                <td>
                                                    {{ testMeasurement.usl !== null ? testMeasurement.usl.toFixed(4) : 'N/A' }} / 
                                                    {{ testMeasurement.lsl !== null ? testMeasurement.lsl.toFixed(4) : 'N/A' }}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td class="font-weight-medium">System Score</td>
                                                <td>
                                                    <v-chip size="small" :color="getScoreColor(testMeasurement.systemScore)">
                                                        {{ testMeasurement.systemScore.toFixed(2) }}
                                                    </v-chip>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td class="font-weight-medium">Custom Score</td>
                                                <td>
                                                    <v-chip size="small" :color="getScoreColor(testResult.customScore)" variant="elevated">
                                                        {{ testResult.customScore.toFixed(2) }}
                                                    </v-chip>
                                                    <v-chip size="small" class="ml-2" color="info" variant="outlined">
                                                        {{ testResult.formulaName }}
                                                    </v-chip>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td class="font-weight-medium">Difference</td>
                                                <td>
                                                    <v-chip 
                                                        size="small" 
                                                        :color="testResult.difference > 0 ? 'success' : testResult.difference < 0 ? 'error' : 'default'"
                                                    >
                                                        {{ testResult.difference > 0 ? '+' : '' }}{{ testResult.difference.toFixed(2) }}
                                                    </v-chip>
                                                    <span class="ml-2 text-caption text-medium-emphasis">
                                                        ({{ testResult.difference > 0 ? 'Higher' : testResult.difference < 0 ? 'Lower' : 'Same' }} than system)
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </v-table>
                                </v-card-text>
                            </v-card>

                            <v-alert v-if="!testMeasurement" type="info" variant="tonal" density="compact">
                                Select a measurement above to test your custom formulas
                            </v-alert>
                        </v-expansion-panel-text>
                    </v-expansion-panel>

                    <!-- Category Formulas -->
                    <v-expansion-panel>
                        <v-expansion-panel-title>
                            <div class="d-flex align-center justify-space-between w-100">
                                <div class="d-flex align-center gap-2">
                                    <v-icon>mdi-format-list-bulleted</v-icon>
                                    <span class="font-weight-medium">Category Formulas</span>
                                    <v-chip size="x-small" :color="enabledCategoryCount > 0 ? 'success' : 'default'">
                                        {{ enabledCategoryCount }} / {{ Object.keys(categoryFormulas).length }} Enabled
                                    </v-chip>
                                </div>
                            </div>
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                            <!-- Bulk Actions -->
                            <div class="d-flex gap-2 mb-4">
                                <v-btn variant="outlined" size="small" prepend-icon="mdi-check-all"
                                    @click="handleToggleAll(true)">
                                    Enable All
                                </v-btn>
                                <v-btn variant="outlined" size="small" prepend-icon="mdi-close-box-multiple"
                                    @click="handleToggleAll(false)">
                                    Disable All
                                </v-btn>
                            </div>

                            <!-- Category Formula List -->
                            <v-expansion-panels>
                                <v-expansion-panel v-for="(formula, category) in categoryFormulas" :key="category"
                                    class="mb-2">
                                    <v-expansion-panel-title>
                                        <div class="d-flex align-center justify-space-between w-100">
                                            <div class="d-flex align-center gap-2">
                                                <v-chip size="small" variant="tonal" color="primary">
                                                    {{ category }}
                                                </v-chip>
                                                <span class="text-body-2">{{ formula.name }}</span>
                                                <v-chip v-if="formula.enabled" size="x-small" color="success">
                                                    Enabled
                                                </v-chip>
                                            </div>
                                            <div class="text-caption text-medium-emphasis" @click.stop>
                                                {{ formula.formulaType }}
                                            </div>
                                        </div>
                                    </v-expansion-panel-title>
                                    <v-expansion-panel-text>
                                        <FormulaEditor :formula="formula"
                                            @update:enabled="updateCategoryEnabled(String(category), $event)"
                                            @update:formula-type="updateCategoryType(String(category), $event)"
                                            @update:parameters="updateCategoryParameters(String(category), $event)"
                                            @update:custom-expression="updateCategoryExpression(String(category), $event)" />
                                    </v-expansion-panel-text>
                                </v-expansion-panel>
                            </v-expansion-panels>
                        </v-expansion-panel-text>
                    </v-expansion-panel>
                </v-expansion-panels>
            </v-card-text>

            <v-divider />

            <v-card-actions class="pa-4">
                <v-btn variant="outlined" prepend-icon="mdi-restore" @click="handleReset">
                    Reset to Defaults
                </v-btn>
                <v-spacer />
                <v-btn variant="text" @click="$emit('update:modelValue', false)">
                    Cancel
                </v-btn>
                <v-btn color="primary" variant="elevated" prepend-icon="mdi-check" @click="handleApply">
                    Apply
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, inject } from 'vue'
import FormulaEditor from './FormulaEditor.vue'
import type { CustomFormulaV2, CategoryFormulasV2, FormulaType, FormulaParameters } from '../composables/useCustomScoringV2'
import { extractCategory } from '../composables/useCustomScoringV2'
import type { TopProductBatchResponse } from '../types/dutTopProduct.types'

interface Props {
    modelValue: boolean
    universalFormula: CustomFormulaV2
    categoryFormulas: CategoryFormulasV2
}

interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'update:universalFormula', value: CustomFormulaV2): void
    (e: 'update:categoryFormulas', value: CategoryFormulasV2): void
    (e: 'reset'): void
    (e: 'apply'): void
}

interface TestMeasurement {
    test_item: string
    category: string | null
    actual: number
    target: number | null
    usl: number | null
    lsl: number | null
    systemScore: number
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Try to inject results from parent (TopProductsByISNTab provides this)
const injectedResults = inject<{ value: TopProductBatchResponse | null }>('topProductResults', { value: null })

// State for testing
const testMeasurement = ref<TestMeasurement | null>(null)

// Extract measurements from current results for testing
const availableMeasurements = computed<TestMeasurement[]>(() => {
    if (!injectedResults.value) return []
    
    const measurements: TestMeasurement[] = []
    
    injectedResults.value.results?.forEach(result => {
        result.test_result?.forEach(station => {
            station.data?.forEach((item: any) => {
                // Handle both object and array formats
                let test_item: string
                let actual: number
                let target: number | null
                let usl: number | null
                let lsl: number | null
                let systemScore: number
                
                if (typeof item === 'object' && !Array.isArray(item) && 'test_item' in item) {
                    // Object format
                    test_item = item.test_item
                    actual = item.actual
                    usl = item.usl
                    lsl = item.lsl
                    const breakdown = item.score_breakdown
                    target = breakdown?.target_used ?? null
                    systemScore = breakdown?.final_score ?? 0
                } else if (Array.isArray(item) && item.length >= 7) {
                    // Array format: [test_item, usl, lsl, actual, target, score, breakdown]
                    test_item = String(item[0])
                    usl = item[1]
                    lsl = item[2]
                    actual = Number(item[3])
                    target = item[4]
                    systemScore = Number(item[5])
                } else {
                    return
                }
                
                const category = extractCategory(test_item)
                
                measurements.push({
                    test_item,
                    category,
                    actual,
                    target,
                    usl,
                    lsl,
                    systemScore
                })
            })
        })
    })
    
    // Return unique measurements (by test_item)
    const unique = measurements.filter((m, index, self) => 
        index === self.findIndex(t => t.test_item === m.test_item)
    )
    
    return unique.slice(0, 50) // Limit to first 50 for performance
})

// Calculate custom score for test measurement
const testResult = computed(() => {
    if (!testMeasurement.value) {
        return {
            customScore: 0,
            difference: 0,
            formulaName: 'N/A'
        }
    }
    
    const m = testMeasurement.value
    const category = m.category
    
    // Determine which formula to use
    let formula: CustomFormulaV2 | null = null
    let formulaName = 'System Formula'
    
    if (category && props.categoryFormulas[category]?.enabled) {
        formula = props.categoryFormulas[category]
        formulaName = `${category} Formula`
    } else if (props.universalFormula.enabled) {
        formula = props.universalFormula
        formulaName = 'Universal Formula'
    }
    
    // Calculate custom score
    let customScore = m.systemScore
    
    if (formula) {
        try {
            customScore = formula.calculate(
                m.actual,
                m.usl,
                m.lsl,
                m.target ?? 0
            )
        } catch (error) {
            console.error('Formula calculation error:', error)
            customScore = 0
        }
    }
    
    return {
        customScore,
        difference: customScore - m.systemScore,
        formulaName
    }
})

// Score color helper (matching parent component)
const getScoreColor = (score: number): string => {
    if (score >= 9) return 'success'
    if (score >= 7) return 'info'
    if (score >= 5) return 'warning'
    return 'error'
}

const enabledCategoryCount = computed(() => {
    return Object.values(props.categoryFormulas).filter((f) => f.enabled).length
})

const enabledCount = computed(() => {
    let count = 0
    if (props.universalFormula.enabled) count++
    count += enabledCategoryCount.value
    return count
})

// Universal formula updates
const updateUniversalEnabled = (enabled: boolean) => {
    emit('update:universalFormula', {
        ...props.universalFormula,
        enabled,
    })
}

const updateUniversalType = (formulaType: FormulaType) => {
    emit('update:universalFormula', {
        ...props.universalFormula,
        formulaType,
    })
}

const updateUniversalParameters = (parameters: FormulaParameters) => {
    emit('update:universalFormula', {
        ...props.universalFormula,
        parameters,
    })
}

const updateUniversalExpression = (customExpression: string) => {
    emit('update:universalFormula', {
        ...props.universalFormula,
        customExpression,
    })
}

// Category formula updates
const updateCategoryEnabled = (category: string, enabled: boolean) => {
    const updated = { ...props.categoryFormulas }
    if (updated[category]) {
        updated[category] = {
            ...updated[category],
            enabled,
        }
        emit('update:categoryFormulas', updated)
    }
}

const updateCategoryType = (category: string, formulaType: FormulaType) => {
    const updated = { ...props.categoryFormulas }
    if (updated[category]) {
        updated[category] = {
            ...updated[category],
            formulaType,
        }
        emit('update:categoryFormulas', updated)
    }
}

const updateCategoryParameters = (category: string, parameters: FormulaParameters) => {
    const updated = { ...props.categoryFormulas }
    if (updated[category]) {
        updated[category] = {
            ...updated[category],
            parameters,
        }
        emit('update:categoryFormulas', updated)
    }
}

const updateCategoryExpression = (category: string, customExpression: string) => {
    const updated = { ...props.categoryFormulas }
    if (updated[category]) {
        updated[category] = {
            ...updated[category],
            customExpression,
        }
        emit('update:categoryFormulas', updated)
    }
}

const handleToggleAll = (enabled: boolean) => {
    const updated = { ...props.categoryFormulas }
    Object.keys(updated).forEach((category) => {
        const formula = updated[category]
        if (formula) {
            formula.enabled = enabled
        }
    })
    emit('update:categoryFormulas', updated)
}

const handleReset = () => {
    emit('reset')
}

const handleApply = () => {
    emit('apply')
    emit('update:modelValue', false)
}
</script>

<style scoped>
.w-100 {
    width: 100%;
}
</style>
