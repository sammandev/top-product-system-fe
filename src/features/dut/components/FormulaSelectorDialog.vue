<template>
    <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="900px"
        scrollable>
        <template #activator="activatorProps">
            <slot name="activator" v-bind="activatorProps" />
        </template>

        <v-card>
            <v-card-title class="d-flex align-center">
                <v-icon class="mr-2">mdi-function-variant</v-icon>
                Formula Selection
                <v-spacer />
                <v-btn icon="mdi-close" variant="text" @click="$emit('update:modelValue', false)" />
            </v-card-title>

            <v-card-text class="pa-4">
                <v-alert type="info" variant="tonal" class="mb-4">
                    <div class="text-subtitle-2 mb-2">Select Scoring Formulas</div>
                    <div class="text-body-2">
                        Choose which backend-validated formulas to use for scoring measurements.
                        Category-specific formulas override the universal formula.
                    </div>
                </v-alert>

                <v-expansion-panels variant="accordion" multiple>
                    <!-- Universal Formula Selection -->
                    <v-expansion-panel>
                        <v-expansion-panel-title>
                            <div class="d-flex align-center">
                                <v-icon class="mr-2">mdi-earth</v-icon>
                                <span class="font-weight-medium">Universal Formula</span>
                                <v-spacer />
                                <v-chip v-if="universalFormula.enabled && universalFormula.formulaType !== 'SYSTEM'"
                                    size="small" color="success" class="mr-2">
                                    Active
                                </v-chip>
                            </div>
                        </v-expansion-panel-title>

                        <v-expansion-panel-text>
                            <v-row>
                                <!-- Enable Toggle -->
                                <v-col cols="12">
                                    <v-switch :model-value="universalFormula.enabled"
                                        @update:model-value="updateUniversalEnabled"
                                        label="Enable Universal Formula Override" color="primary" hide-details />
                                </v-col>

                                <!-- Formula Type Selector -->
                                <v-col cols="12">
                                    <v-select :model-value="universalFormula.formulaType"
                                        @update:model-value="updateUniversalType" :items="formulaTypes"
                                        item-title="name" item-value="type" label="Formula Type"
                                        :disabled="!universalFormula.enabled" variant="outlined" density="comfortable">
                                        <template #item="{ props: itemProps, item }">
                                            <v-list-item v-bind="itemProps">
                                                <template #prepend>
                                                    <v-icon>mdi-function</v-icon>
                                                </template>
                                                <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                                                <v-list-item-subtitle class="text-wrap">
                                                    {{ item.raw.description }}
                                                </v-list-item-subtitle>
                                            </v-list-item>
                                        </template>
                                    </v-select>
                                </v-col>

                                <!-- Formula Preview -->
                                <v-col v-if="universalFormula.enabled && universalFormula.formulaType !== 'SYSTEM'"
                                    cols="12">
                                    <v-card variant="tonal" color="blue-grey">
                                        <v-card-text>
                                            <div class="text-subtitle-2 mb-2">Formula Preview:</div>
                                            <div class="text-body-2 mb-2">
                                                {{ FORMULA_DEFINITIONS[universalFormula.formulaType].description }}
                                            </div>
                                            <div class="text-caption text-medium-emphasis mb-2">
                                                Typically used for: {{
                                                    FORMULA_DEFINITIONS[universalFormula.formulaType].usedFor.join(', ') }}
                                            </div>
                                            <v-sheet color="white" class="pa-3 rounded text-center">
                                                <v-icon size="small" class="mr-2">mdi-math-integral</v-icon>
                                                <code class="text-body-2">{{
                                                    FORMULA_DEFINITIONS[universalFormula.formulaType].formula_latex }}</code>
                                            </v-sheet>
                                        </v-card-text>
                                    </v-card>
                                </v-col>

                                <!-- Parameter Customization for Mathematical Formulas -->
                                <v-col v-if="showUniversalParameters" cols="12">
                                    <v-card variant="outlined" color="primary">
                                        <v-card-title class="text-subtitle-2 bg-primary-lighten-5">
                                            <v-icon size="small" class="mr-2">mdi-tune</v-icon>
                                            Formula Parameters
                                        </v-card-title>
                                        <v-card-text class="pt-3">
                                            <v-row dense>
                                                <v-col v-for="param in universalFormulaParameters" :key="param.name"
                                                    cols="12" sm="6" md="4">
                                                    <v-text-field v-model.number="universalParameterValues[param.name]"
                                                        :label="param.label" :hint="param.hint" type="number"
                                                        :step="param.step || 0.1" :min="param.min" :max="param.max"
                                                        variant="outlined" density="compact" persistent-hint
                                                        hide-details="auto">
                                                        <template #append-inner>
                                                            <v-tooltip location="top">
                                                                <template #activator="{ props }">
                                                                    <v-icon v-bind="props"
                                                                        size="small">mdi-information</v-icon>
                                                                </template>
                                                                {{ param.description }}
                                                            </v-tooltip>
                                                        </template>
                                                    </v-text-field>
                                                </v-col>
                                            </v-row>
                                            <v-alert type="info" variant="tonal" density="compact" class="mt-3">
                                                <v-icon size="small" class="mr-2">mdi-lightbulb</v-icon>
                                                Adjust parameters to fine-tune the formula behavior. Default values are
                                                provided.
                                            </v-alert>
                                        </v-card-text>
                                    </v-card>
                                </v-col>
                            </v-row>
                        </v-expansion-panel-text>
                    </v-expansion-panel>

                    <!-- Category-Specific Formulas -->
                    <v-expansion-panel>
                        <v-expansion-panel-title>
                            <div class="d-flex align-center">
                                <v-icon class="mr-2">mdi-tag-multiple</v-icon>
                                <span class="font-weight-medium">Category-Specific Formulas</span>
                                <v-spacer />
                                <v-chip v-if="activeCategoryCount > 0" size="small" color="success" class="mr-2">
                                    {{ activeCategoryCount }} Active
                                </v-chip>
                            </div>
                        </v-expansion-panel-title>

                        <v-expansion-panel-text>
                            <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                                Override formulas for specific measurement categories. These take priority over the
                                universal
                                formula.
                            </v-alert>

                            <v-expansion-panels variant="accordion">
                                <v-expansion-panel v-for="category in availableCategories" :key="category">
                                    <v-expansion-panel-title>
                                        <div class="d-flex align-center">
                                            <v-chip size="small" :color="getCategoryColor(category)" class="mr-2">
                                                {{ category }}
                                            </v-chip>
                                            <span>{{ getCategoryName(category) }}</span>
                                            <v-spacer />
                                            <v-chip
                                                v-if="categoryFormulas[category]?.enabled && categoryFormulas[category]?.formulaType !== 'SYSTEM'"
                                                size="x-small" color="success" class="mr-2">
                                                {{ FORMULA_DEFINITIONS[categoryFormulas[category]!.formulaType].name }}
                                            </v-chip>
                                        </div>
                                    </v-expansion-panel-title>

                                    <v-expansion-panel-text>
                                        <v-row>
                                            <!-- Enable Toggle -->
                                            <v-col cols="12">
                                                <v-switch :model-value="categoryFormulas[category]?.enabled ?? false"
                                                    @update:model-value="updateCategoryEnabled(category, $event)"
                                                    :label="`Enable ${category} Formula Override`" color="primary"
                                                    hide-details />
                                            </v-col>

                                            <!-- Formula Type Selector -->
                                            <v-col cols="12">
                                                <v-select
                                                    :model-value="categoryFormulas[category]?.formulaType ?? 'SYSTEM'"
                                                    @update:model-value="updateCategoryType(category, $event)"
                                                    :items="getRecommendedFormulas(category)" item-title="name"
                                                    item-value="type" label="Formula Type"
                                                    :disabled="!categoryFormulas[category]?.enabled" variant="outlined"
                                                    density="comfortable">
                                                    <template #item="{ props: itemProps, item }">
                                                        <v-list-item v-bind="itemProps">
                                                            <template #prepend>
                                                                <v-icon>{{ item.raw.recommended ? 'mdi-star' :
                                                                    'mdi-function' }}</v-icon>
                                                            </template>
                                                            <v-list-item-title>
                                                                {{ item.raw.name }}
                                                                <v-chip v-if="item.raw.recommended" size="x-small"
                                                                    color="primary" class="ml-2">Recommended</v-chip>
                                                            </v-list-item-title>
                                                            <v-list-item-subtitle class="text-wrap">
                                                                {{ item.raw.description }}
                                                            </v-list-item-subtitle>
                                                        </v-list-item>
                                                    </template>
                                                </v-select>
                                            </v-col>

                                            <!-- Formula Preview -->
                                            <v-col
                                                v-if="categoryFormulas[category]?.enabled && categoryFormulas[category]?.formulaType !== 'SYSTEM'"
                                                cols="12">
                                                <v-card variant="tonal" :color="getCategoryColor(category)">
                                                    <v-card-text>
                                                        <div class="text-subtitle-2 mb-2">Formula Preview:</div>
                                                        <div class="text-body-2 mb-2">
                                                            {{
                                                                FORMULA_DEFINITIONS[categoryFormulas[category]!.formulaType].description
                                                            }}
                                                        </div>
                                                        <v-sheet color="white" class="pa-3 rounded text-center">
                                                            <v-icon size="small" class="mr-2">mdi-math-integral</v-icon>
                                                            <code class="text-body-2">
                                                        {{
                                                            FORMULA_DEFINITIONS[categoryFormulas[category]!.formulaType].formula_latex
                                                        }}
                                                    </code>
                                                        </v-sheet>
                                                    </v-card-text>
                                                </v-card>
                                            </v-col>
                                        </v-row>
                                    </v-expansion-panel-text>
                                </v-expansion-panel>
                            </v-expansion-panels>
                        </v-expansion-panel-text>
                    </v-expansion-panel>

                    <!-- Advanced: Custom LaTeX Formula -->
                    <v-expansion-panel>
                        <v-expansion-panel-title>
                            <div class="d-flex align-center">
                                <v-icon class="mr-2" color="deep-purple">mdi-code-braces</v-icon>
                                <span class="font-weight-medium">Custom LaTeX Formula</span>
                                <v-chip size="x-small" color="deep-purple" variant="outlined" class="ml-2">
                                    Advanced
                                </v-chip>
                            </div>
                        </v-expansion-panel-title>

                        <v-expansion-panel-text>
                            <v-alert variant="tonal" class="mb-4">
                                <strong>Advanced Feature:</strong> Define your own scoring formula using LaTeX syntax.
                                Requires knowledge of LaTeX mathematical notation.
                            </v-alert>

                            <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                                <div class="text-subtitle-2 mb-1">Available Variables:</div>
                                <ul class="text-body-2 ml-4">
                                    <li><code>x</code> or <code>actual</code> - The measured value</li>
                                    <li><code>usl</code> - Upper specification limit</li>
                                    <li><code>lsl</code> - Lower specification limit</li>
                                    <li><code>target</code> - Target value</li>
                                </ul>
                                <div class="text-subtitle-2 mb-1 mt-2">Example Formulas:</div>
                                <ul class="text-body-2 ml-4">
                                    <li><code>10 \times (1 - |x - target| / (usl - lsl))</code></li>
                                    <li><code>10 \times e^{-(x - target)^2 / \sigma^2}</code></li>
                                    <li><code>\frac{10}{1 + |x - target|}</code></li>
                                </ul>
                            </v-alert>

                            <v-row>
                                <v-col cols="12">
                                    <v-textarea v-model="customLatexFormula" label="LaTeX Formula"
                                        placeholder="10 \times \frac{x - lsl}{usl - lsl}" rows="3" variant="outlined"
                                        hint="Enter your custom LaTeX formula using the available variables"
                                        persistent-hint />
                                </v-col>

                                <v-col cols="12">
                                    <v-card variant="outlined" class="pa-4">
                                        <div class="text-subtitle-2 mb-2">
                                            <v-icon size="small" class="mr-2">mdi-eye</v-icon>
                                            Preview:
                                        </div>
                                        <v-sheet v-if="customLatexFormula" color="blue-grey-lighten-5"
                                            class="pa-3 rounded text-center">
                                            <div ref="customFormulaPreviewEl" class="katex-formula"></div>
                                        </v-sheet>
                                        <div v-else class="text-body-2 text-medium-emphasis text-center py-3">
                                            Enter a formula to see preview
                                        </div>
                                    </v-card>
                                </v-col>

                                <v-col cols="12">
                                    <v-btn color="deep-purple" variant="outlined" prepend-icon="mdi-check-circle"
                                        :disabled="!customLatexFormula" @click="applyCustomFormula" block>
                                        Apply Custom Formula as Universal
                                    </v-btn>
                                </v-col>

                                <v-col cols="12">
                                    <v-alert type="info" density="compact" variant="tonal">
                                        Custom formulas will be applied as the universal formula and will override
                                        default scoring for all categories.
                                    </v-alert>
                                </v-col>
                            </v-row>
                        </v-expansion-panel-text>
                    </v-expansion-panel>
                </v-expansion-panels>

                <!-- Summary -->
                <v-card v-if="formulaSelectionEnabled" variant="tonal" color="success" class="mt-4">
                    <v-card-text>
                        <div class="text-subtitle-2 mb-2">
                            <v-icon size="small" class="mr-2">mdi-check-circle</v-icon>
                            Active Formula Overrides
                        </div>
                        <v-chip-group column>
                            <v-chip v-if="universalFormula.enabled && universalFormula.formulaType !== 'SYSTEM'"
                                size="small" color="primary">
                                Universal: {{ FORMULA_DEFINITIONS[universalFormula.formulaType].name }}
                            </v-chip>
                            <v-chip v-for="[category, selection] in activeCategoryFormulas" :key="category" size="small"
                                :color="getCategoryColor(category)">
                                {{ category }}: {{ FORMULA_DEFINITIONS[selection.formulaType].name }}
                            </v-chip>
                        </v-chip-group>
                    </v-card-text>
                </v-card>
            </v-card-text>

            <v-card-actions class="px-4 pb-4">
                <v-btn color="warning" variant="outlined" prepend-icon="mdi-refresh" @click="handleReset">
                    Reset All
                </v-btn>
                <v-spacer />
                <v-btn color="grey" variant="text" @click="$emit('update:modelValue', false)">
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
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
    FORMULA_DEFINITIONS,
    type FormulaType,
    type FormulaSelection,
    type CategoryFormulaSelections
} from '../composables/useFormulaSelector'

interface Props {
    modelValue: boolean
    universalFormula: FormulaSelection
    categoryFormulas: CategoryFormulaSelections
}

interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'update:universalFormula', value: FormulaSelection): void
    (e: 'update:categoryFormulas', value: CategoryFormulaSelections): void
    (e: 'reset'): void
    (e: 'apply'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Custom LaTeX formula
const customLatexFormula = ref('')
const customFormulaPreviewEl = ref<HTMLElement | null>(null)

// Available formula types for dropdown - grouped by category
const formulaTypes = Object.values(FORMULA_DEFINITIONS)

// Group formulas by category for better organization (future enhancement)
// const groupedFormulas = computed(() => {
//   const backend = formulaTypes.filter(f => f.category === 'backend')
//   const mathematical = formulaTypes.filter(f => f.category === 'mathematical')
//   const custom = formulaTypes.filter(f => f.category === 'custom')
//   
//   return { backend, mathematical, custom }
// })

// Available categories
const availableCategories = ['EVM', 'FREQ', 'PER', 'PA']

// Parameter customization for mathematical formulas
const universalParameterValues = ref<Record<string, number>>({})

// Define parameters for each mathematical formula type
const formulaParameterDefinitions: Record<string, Array<{
    name: string
    label: string
    description: string
    hint: string
    default: number
    min?: number
    max?: number
    step?: number
}>> = {
    LINEAR: [
        { name: 'a', label: 'Slope (a)', description: 'Linear coefficient', hint: 'Default: 1.0', default: 1.0, min: -10, max: 10, step: 0.1 },
        { name: 'b', label: 'Offset (b)', description: 'Y-intercept', hint: 'Default: 0', default: 0, min: -10, max: 10, step: 0.1 }
    ],
    EXPONENTIAL: [
        { name: 'a', label: 'Amplitude (a)', description: 'Scale factor', hint: 'Default: 10', default: 10, min: 0, max: 20, step: 0.5 },
        { name: 'b', label: 'Rate (b)', description: 'Growth/decay rate', hint: 'Default: 1', default: 1, min: -5, max: 5, step: 0.1 }
    ],
    LOGARITHMIC: [
        { name: 'a', label: 'Scale (a)', description: 'Logarithm scale factor', hint: 'Default: 1', default: 1, min: 0.1, max: 10, step: 0.1 },
        { name: 'b', label: 'Inner Scale (b)', description: 'Inner multiplication factor', hint: 'Default: 1', default: 1, min: 0.1, max: 10, step: 0.1 },
        { name: 'c', label: 'Shift (c)', description: 'Horizontal shift', hint: 'Default: 0', default: 0, min: -100, max: 100, step: 1 }
    ],
    POLYNOMIAL: [
        { name: 'a', label: 'Quadratic (a)', description: 'x² coefficient', hint: 'Default: 0', default: 0, min: -5, max: 5, step: 0.1 },
        { name: 'b', label: 'Linear (b)', description: 'x coefficient', hint: 'Default: 1', default: 1, min: -10, max: 10, step: 0.1 },
        { name: 'c', label: 'Constant (c)', description: 'Constant term', hint: 'Default: 0', default: 0, min: -10, max: 10, step: 0.1 }
    ],
    INVERSE: [
        { name: 'a', label: 'Numerator (a)', description: 'Top value', hint: 'Default: 10', default: 10, min: 0, max: 20, step: 0.5 },
        { name: 'b', label: 'Scale (b)', description: 'Denominator scale', hint: 'Default: 1', default: 1, min: 0.1, max: 10, step: 0.1 },
        { name: 'c', label: 'Shift (c)', description: 'Denominator shift', hint: 'Default: 0', default: 0, min: -100, max: 100, step: 1 }
    ],
    SIGMOID: [
        { name: 'L', label: 'Maximum (L)', description: 'Upper asymptote', hint: 'Default: 10', default: 10, min: 1, max: 20, step: 0.5 },
        { name: 'k', label: 'Steepness (k)', description: 'Curve steepness', hint: 'Default: 1', default: 1, min: 0.1, max: 10, step: 0.1 },
        { name: 'x0', label: 'Midpoint (x₀)', description: 'Inflection point', hint: 'Default: 0', default: 0, min: -100, max: 100, step: 1 }
    ]
}

// Check if current universal formula has parameters
const showUniversalParameters = computed(() => {
    if (!props.universalFormula.enabled) return false
    const formulaType = props.universalFormula.formulaType
    return formulaType in formulaParameterDefinitions
})

// Get parameters for current universal formula
const universalFormulaParameters = computed(() => {
    const formulaType = props.universalFormula.formulaType
    if (formulaType in formulaParameterDefinitions) {
        const params = formulaParameterDefinitions[formulaType]
        // Initialize default values if not set
        if (params) {
            params.forEach(param => {
                if (!(param.name in universalParameterValues.value)) {
                    universalParameterValues.value[param.name] = param.default
                }
            })
        }
        return params || []
    }
    return []
})

// Check if any formula selection is enabled
const formulaSelectionEnabled = computed(() => {
    if (props.universalFormula.enabled && props.universalFormula.formulaType !== 'SYSTEM') {
        return true
    }

    return Object.values(props.categoryFormulas).some(
        selection => selection?.enabled && selection.formulaType !== 'SYSTEM'
    )
})

// Count active category formulas
const activeCategoryCount = computed(() => {
    return Object.values(props.categoryFormulas).filter(
        selection => selection?.enabled && selection.formulaType !== 'SYSTEM'
    ).length
})

// Get active category formulas for summary
const activeCategoryFormulas = computed(() => {
    return Object.entries(props.categoryFormulas).filter(
        ([_, selection]) => selection?.enabled && selection.formulaType !== 'SYSTEM'
    ) as [string, FormulaSelection][]
})

// Update handlers
function updateUniversalEnabled(enabled: boolean | null) {
    emit('update:universalFormula', { ...props.universalFormula, enabled: enabled ?? false })
}

function updateUniversalType(formulaType: FormulaType) {
    // Include parameters if it's a mathematical formula
    const updatedFormula: FormulaSelection = {
        ...props.universalFormula,
        formulaType
    }

    // If the formula type has parameters, include them
    if (formulaType in formulaParameterDefinitions) {
        const params = formulaParameterDefinitions[formulaType]
        if (params) {
            const paramValues: Record<string, number> = {}
            params.forEach(param => {
                paramValues[param.name] = universalParameterValues.value[param.name] ?? param.default
            })
            updatedFormula.customParams = {
                latex: FORMULA_DEFINITIONS[formulaType].formula_latex,
                parameters: paramValues
            }
        }
    }

    emit('update:universalFormula', updatedFormula)
}

function updateCategoryEnabled(category: string, enabled: boolean | null) {
    const updated = { ...props.categoryFormulas }
    const enabledValue = enabled ?? false
    if (!updated[category]) {
        updated[category] = { enabled: enabledValue, formulaType: 'SYSTEM' }
    } else {
        updated[category] = { ...updated[category]!, enabled: enabledValue }
    }
    emit('update:categoryFormulas', updated)
}

function updateCategoryType(category: string, formulaType: FormulaType) {
    const updated = { ...props.categoryFormulas }
    if (!updated[category]) {
        updated[category] = { enabled: false, formulaType }
    } else {
        updated[category] = { ...updated[category]!, formulaType }
    }
    emit('update:categoryFormulas', updated)
}

// Get recommended formulas for a category
function getRecommendedFormulas(category: string) {
    return formulaTypes.map(formula => ({
        ...formula,
        recommended: formula.usedFor.includes(category)
    }))
}

// Get category color
function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
        EVM: 'purple',
        FREQ: 'blue',
        PER: 'orange',
        PA: 'green'
    }
    return colors[category] || 'grey'
}

// Get category display name
function getCategoryName(category: string): string {
    const names: Record<string, string> = {
        EVM: 'Error Vector Magnitude',
        FREQ: 'Frequency Measurements',
        PER: 'Packet Error Rate',
        PA: 'Power Amplifier'
    }
    return names[category] || category
}

// Apply custom formula
function applyCustomFormula() {
    if (!customLatexFormula.value.trim()) return

    // Apply the custom formula as universal formula with CUSTOM type
    emit('update:universalFormula', {
        enabled: true,
        formulaType: 'CUSTOM',
        customParams: {
            latex: customLatexFormula.value,
            parameters: {}, // Can be extended to support parameters
            description: 'Custom user-defined formula'
        }
    })

    // Show success notification (can be added later)
    console.log('Custom formula applied:', customLatexFormula.value)
}

// Render KaTeX for custom formula preview
const renderCustomFormulaPreview = () => {
    if (!customFormulaPreviewEl.value || !customLatexFormula.value) return

    const stripMathDelimiters = (latex: string): string => {
        let cleaned = latex.trim()
        cleaned = cleaned.replace(/^(\$\$?|\\\[|\\\()/, '')
        cleaned = cleaned.replace(/(\$\$?|\\\]|\\\))$/, '')
        return cleaned.trim()
    }

    try {
        const latexBody = stripMathDelimiters(customLatexFormula.value)
        katex.render(latexBody, customFormulaPreviewEl.value, {
            displayMode: true,
            throwOnError: false,
            output: 'html'
        })
    } catch (error) {
        console.error('KaTeX rendering error:', error)
        if (customFormulaPreviewEl.value) {
            customFormulaPreviewEl.value.textContent = 'Error rendering formula'
        }
    }
}

// Watch for changes to custom formula and re-render
watch(customLatexFormula, async () => {
    await nextTick()
    renderCustomFormulaPreview()
})

// Render on mount if formula exists
onMounted(() => {
    if (customLatexFormula.value) {
        renderCustomFormulaPreview()
    }
})

// Action handlers
function handleReset() {
    emit('reset')
    customLatexFormula.value = '' // Clear custom formula on reset
}

function handleApply() {
    emit('apply')
    emit('update:modelValue', false)
}
</script>
