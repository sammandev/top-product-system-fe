<template>
  <v-dialog v-model="dialogOpen" max-width="900px" scrollable>
    <v-card v-if="item && item.score_breakdown" class="app-dialog">
      <div class="app-dialog-header"><v-card-title class="d-flex align-center">
        <v-icon start>mdi-calculator</v-icon>
        Score Breakdown
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" @click="dialogOpen = false" />
      </v-card-title></div>

      <div class="app-dialog-body"><v-card-text class="pa-4">
        <!-- Test Item Info -->
        <v-card variant="tonal" class="mb-4">
          <v-card-text>
            <div class="text-h6 mb-2">{{ item.test_item }}</div>
            <v-row dense>
              <v-col cols="4">
                <div class="text-caption text-medium-emphasis">Actual Value</div>
                <div class="text-h6 font-weight-bold">{{ item.value }}</div>
              </v-col>
              <v-col cols="4">
                <div class="text-caption text-medium-emphasis">Score</div>
                <div class="text-h6 font-weight-bold" :class="getScoreColorClass(item.score)">
                  {{ item.score?.toFixed(2) }}
                </div>
              </v-col>
              <v-col cols="4">
                <div class="text-caption text-medium-emphasis">Scoring Method</div>
                <v-chip :color="getCategoryColor(item.score_breakdown.category || '')" size="small">
                  {{ item.score_breakdown.method }}
                </v-chip>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- LaTeX Formula Display -->
        <v-card variant="outlined" class="mb-4">
          <v-card-title class="text-subtitle-1 bg-surface-variant">
            <v-icon start size="small">mdi-function-variant</v-icon>
            Scoring Formula
            <v-chip v-if="hasCustomFormula" size="x-small" color="success" class="ml-2">
              Custom Active
            </v-chip>
          </v-card-title>
          <v-card-text class="pa-4">
            <!-- System Formula (Always show) -->
            <div class="mb-4">
              <div class="text-caption text-medium-emphasis mb-2">
                <v-icon size="small" class="mr-1">mdi-cog</v-icon>
                System Formula:
              </div>
              <div class="formula-container text-center">
                <div ref="formulaEl" class="katex-formula"></div>
              </div>
            </div>

            <!-- Selected Custom Formula (Show when active) -->
            <div v-if="hasCustomFormula" class="mt-4 pt-4 border-t">
              <div class="text-caption text-medium-emphasis mb-2">
                <v-icon size="small" class="mr-1" color="success">mdi-check-circle</v-icon>
                Selected Formula (Applied):
              </div>
              <v-chip size="small" :color="selectedFormulaColor" class="mb-3">
                {{ selectedFormulaName }}
              </v-chip>
              <div class="formula-container text-center bg-success-lighten-5 pa-3 rounded">
                <div ref="customFormulaEl" class="katex-formula"></div>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Breakdown Fields Table -->
        <v-card variant="outlined">
          <v-card-title class="text-subtitle-1 bg-surface-variant">
            <v-icon start size="small">mdi-table</v-icon>
            Calculation Details
          </v-card-title>
          <v-table density="compact">
            <tbody>
              <tr>
                <td class="font-weight-medium">Category</td>
                <td>{{ item.score_breakdown.category }}</td>
              </tr>
              <tr>
                <td class="font-weight-medium">Method</td>
                <td>{{ item.score_breakdown.method }}</td>
              </tr>
              <!-- PA Trend specific fields -->
              <tr v-if="item.score_breakdown.comparison">
                <td class="font-weight-medium">Comparison</td>
                <td>{{ item.score_breakdown.comparison }}</td>
              </tr>
              <tr v-if="item.score_breakdown.threshold !== undefined">
                <td class="font-weight-medium">Threshold</td>
                <td>{{ item.score_breakdown.threshold.toFixed(2) }}</td>
              </tr>
              <!-- Standard fields (may be null for PA trends) -->
              <tr v-if="item.score_breakdown.usl !== undefined">
                <td class="font-weight-medium">USL (Upper Spec Limit)</td>
                <td>{{ formatNumber(item.score_breakdown.usl) }}</td>
              </tr>
              <tr v-if="item.score_breakdown.lsl !== undefined">
                <td class="font-weight-medium">LSL (Lower Spec Limit)</td>
                <td>{{ formatNumber(item.score_breakdown.lsl) }}</td>
              </tr>
              <tr v-if="item.score_breakdown.target_used !== undefined">
                <td class="font-weight-medium">Target Used</td>
                <td class="font-weight-bold text-primary">{{ formatNumberSafe(item.score_breakdown.target_used) }}</td>
              </tr>
              <!-- PA Trend: current_value instead of actual -->
              <tr v-if="item.score_breakdown.current_value !== undefined">
                <td class="font-weight-medium">Current Value</td>
                <td class="font-weight-bold">{{ item.score_breakdown.current_value.toFixed(2) }}</td>
              </tr>
              <tr v-if="item.score_breakdown.trend_mean !== undefined">
                <td class="font-weight-medium">Trend Mean</td>
                <td class="font-weight-bold text-info">{{ item.score_breakdown.trend_mean.toFixed(2) }}</td>
              </tr>
              <!-- Standard: actual value -->
              <tr v-if="item.score_breakdown.actual !== undefined && item.score_breakdown.current_value === undefined">
                <td class="font-weight-medium">Actual Value</td>
                <td class="font-weight-bold">{{ item.score_breakdown.actual?.toFixed(2) }}</td>
              </tr>
              <!-- PA Trend: deviation_from_mean -->
              <tr v-if="item.score_breakdown.deviation_from_mean !== undefined">
                <td class="font-weight-medium">Deviation from Mean</td>
                <td :class="getDeviationColorClass(item.score_breakdown.deviation_from_mean)">
                  {{ Math.abs(item.score_breakdown.deviation_from_mean).toFixed(2) }}
                  <v-icon v-if="item.score_breakdown.deviation_from_mean > 0" size="small"
                    color="error">mdi-arrow-up</v-icon>
                  <v-icon v-else-if="item.score_breakdown.deviation_from_mean < 0" size="small"
                    color="success">mdi-arrow-down</v-icon>
                </td>
              </tr>
              <tr v-if="item.score_breakdown.abs_deviation !== undefined">
                <td class="font-weight-medium">Absolute Deviation</td>
                <td>{{ item.score_breakdown.abs_deviation.toFixed(2) }}</td>
              </tr>
              <!-- Standard: deviation -->
              <tr
                v-if="item.score_breakdown.deviation !== undefined && item.score_breakdown.deviation_from_mean === undefined">
                <td class="font-weight-medium">Deviation</td>
                <td :class="getDeviationColorClass(item.score_breakdown.deviation || 0)">
                  {{ Math.abs(item.score_breakdown.deviation || 0).toFixed(2) }}
                  <v-icon v-if="(item.score_breakdown.deviation || 0) > 0" size="small"
                    color="error">mdi-arrow-up</v-icon>
                  <v-icon v-else-if="(item.score_breakdown.deviation || 0) < 0" size="small"
                    color="success">mdi-arrow-down</v-icon>
                </td>
              </tr>
              <tr v-if="item.score_breakdown.raw_score !== undefined">
                <td class="font-weight-medium">Raw Score</td>
                <td>{{ item.score_breakdown.raw_score.toFixed(2) }}</td>
              </tr>
              <tr v-if="item.score_breakdown.final_score !== undefined" class="bg-surface-variant">
                <td class="font-weight-bold">Final Score</td>
                <td class="font-weight-bold" :class="getScoreColorClass(item.score_breakdown.final_score)">
                  {{ item.score_breakdown.final_score.toFixed(2) }}
                </td>
              </tr>
              <!-- PA Trend: interpretation -->
              <tr v-if="item.score_breakdown.interpretation">
                <td class="font-weight-medium">Interpretation</td>
                <td class="text-success font-weight-medium">
                  <v-icon size="small" class="mr-1">mdi-information</v-icon>
                  {{ item.score_breakdown.interpretation }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-card-text></div>

      <div class="app-dialog-footer"><v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="text" @click="dialogOpen = false">
          Close
        </v-btn>
      </v-card-actions></div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import katex from 'katex'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type {
  CategoryFormulaSelections,
  FormulaSelection,
} from '@/features/dut/composables/useFormulaSelector'
import type { ParsedTestItemEnhanced } from '@/features/dut-logs/composables/useTestLogUpload'
import 'katex/dist/katex.min.css'

const props = defineProps<{
  modelValue: boolean
  item: ParsedTestItemEnhanced | null
  customScoringEnabled?: boolean
  universalFormula?: FormulaSelection
  categoryFormulas?: CategoryFormulaSelections
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const formulaEl = ref<HTMLElement | null>(null)
const customFormulaEl = ref<HTMLElement | null>(null)

// Check if custom formula is active
const hasCustomFormula = computed(() => {
  if (!props.customScoringEnabled) return false

  // Check if universal formula is enabled
  if (props.universalFormula?.enabled && props.universalFormula?.formulaType !== 'SYSTEM') {
    return true
  }

  // Check if category-specific formula is enabled for this item's category
  if (props.item?.score_breakdown?.category && props.categoryFormulas) {
    const category = props.item.score_breakdown.category
    const categoryFormula = props.categoryFormulas[category]
    if (categoryFormula?.enabled && categoryFormula?.formulaType !== 'SYSTEM') {
      return true
    }
  }

  return false
})

// Get selected formula name and color
const selectedFormulaName = computed(() => {
  if (!hasCustomFormula.value) return ''

  // Check category-specific first
  if (props.item?.score_breakdown?.category && props.categoryFormulas) {
    const category = props.item.score_breakdown.category
    const categoryFormula = props.categoryFormulas[category]
    if (categoryFormula?.enabled && categoryFormula?.formulaType !== 'SYSTEM') {
      return `${category} - ${categoryFormula.formulaType}`
    }
  }

  // Use universal formula
  if (props.universalFormula?.enabled && props.universalFormula?.formulaType !== 'SYSTEM') {
    return `Universal - ${props.universalFormula.formulaType}`
  }

  return 'Custom Formula'
})

const selectedFormulaColor = computed(() => {
  if (!hasCustomFormula.value) return 'grey'

  // Check if it's a category-specific formula
  if (props.item?.score_breakdown?.category && props.categoryFormulas) {
    const category = props.item.score_breakdown.category
    const categoryFormula = props.categoryFormulas[category]
    if (categoryFormula?.enabled && categoryFormula?.formulaType !== 'SYSTEM') {
      return 'deep-purple'
    }
  }

  return 'success'
})

// Get the selected formula LaTeX
const getSelectedFormulaLatex = (): string => {
  if (!hasCustomFormula.value) return ''

  // Import FORMULA_DEFINITIONS dynamically (we'll need to handle this)
  // For now, return a placeholder
  const formulaType = props.universalFormula?.formulaType || 'CUSTOM'

  // Check category-specific first
  if (props.item?.score_breakdown?.category && props.categoryFormulas) {
    const category = props.item.score_breakdown.category
    const categoryFormula = props.categoryFormulas[category]
    if (categoryFormula?.enabled && categoryFormula?.formulaType !== 'SYSTEM') {
      // Return the formula latex for this type
      if (categoryFormula.customParams?.latex) {
        return categoryFormula.customParams.latex
      }
      return getFormulaLatexByType(categoryFormula.formulaType)
    }
  }

  // Use universal formula
  if (props.universalFormula?.customParams?.latex) {
    return props.universalFormula.customParams.latex
  }

  return getFormulaLatexByType(formulaType)
}

// Helper to get formula LaTeX by type (simplified version)
const getFormulaLatexByType = (type: string): string => {
  const formulas: Record<string, string> = {
    LINEAR: '\\text{Score} = a \\times x + b',
    EXPONENTIAL: '\\text{Score} = a \\times e^{b \\times x}',
    LOGARITHMIC: '\\text{Score} = a \\times \\ln(b \\times x + c)',
    POLYNOMIAL: '\\text{Score} = a \\times x^2 + b \\times x + c',
    INVERSE: '\\text{Score} = \\frac{a}{b \\times x + c}',
    SIGMOID: '\\text{Score} = \\frac{L}{1 + e^{-k \\times (x - x_0)}}',
    CUSTOM: '\\text{Custom Formula}',
  }
  return formulas[type] || '\\text{Unknown Formula}'
}

// Render KaTeX formula when dialog opens or item changes
watch([() => props.modelValue, () => props.item, () => hasCustomFormula.value], async () => {
  if (props.modelValue && props.item?.score_breakdown) {
    await nextTick()
    renderFormula()
    if (hasCustomFormula.value) {
      renderCustomFormula()
    }
  }
})

onMounted(() => {
  if (props.modelValue && props.item?.score_breakdown) {
    renderFormula()
    if (hasCustomFormula.value) {
      renderCustomFormula()
    }
  }
})

const renderFormula = () => {
  if (!formulaEl.value || !props.item?.score_breakdown) return

  const stripMathDelimiters = (latex: string): string => {
    // Remove common inline/display delimiters so KaTeX gets the pure formula body
    let cleaned = latex.trim()
    cleaned = cleaned.replace(/^(\$\$?|\\\[|\\\()/, '')
    cleaned = cleaned.replace(/(\$\$?|\\\]|\\\))$/, '')
    return cleaned.trim()
  }

  try {
    const rawLatex = props.item.score_breakdown.formula_latex || ''
    const latexBody = stripMathDelimiters(rawLatex)
    const formula = latexBody || '\\text{No formula available}'

    katex.render(formula, formulaEl.value, {
      displayMode: true,
      throwOnError: false,
      output: 'html',
    })
  } catch (error) {
    console.error('KaTeX rendering error:', error)
    if (formulaEl.value) {
      formulaEl.value.textContent =
        props.item.score_breakdown.formula_latex || 'Error rendering formula'
    }
  }
}

const renderCustomFormula = () => {
  if (!customFormulaEl.value || !hasCustomFormula.value) return

  const stripMathDelimiters = (latex: string): string => {
    let cleaned = latex.trim()
    cleaned = cleaned.replace(/^(\$\$?|\\\[|\\\()/, '')
    cleaned = cleaned.replace(/(\$\$?|\\\]|\\\))$/, '')
    return cleaned.trim()
  }

  try {
    const rawLatex = getSelectedFormulaLatex()
    const latexBody = stripMathDelimiters(rawLatex)
    const formula = latexBody || '\\text{No custom formula available}'

    katex.render(formula, customFormulaEl.value, {
      displayMode: true,
      throwOnError: false,
      output: 'html',
    })
  } catch (error) {
    console.error('KaTeX custom formula rendering error:', error)
    if (customFormulaEl.value) {
      customFormulaEl.value.textContent = 'Error rendering custom formula'
    }
  }
}

// Helper functions
const formatNumber = (value: number | null | undefined): string => {
  return value !== null && value !== undefined ? value.toString() : 'N/A'
}

const formatNumberSafe = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A'
  return typeof value === 'number' ? value.toFixed(2) : 'N/A'
}

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    EVM: 'purple',
    Frequency: 'blue',
    PER: 'orange',
    'PA Power': 'green',
    General: 'grey',
  }
  return colors[category] || 'grey'
}

const getScoreColorClass = (score: number | null): string => {
  if (score === null) return 'text-grey'
  if (score >= 9) return 'text-success'
  if (score >= 7) return 'text-warning'
  return 'text-error'
}

const getDeviationColorClass = (deviation: number): string => {
  if (Math.abs(deviation) < 0.01) return 'text-success'
  if (Math.abs(deviation) < 1.0) return 'text-warning'
  return 'text-error font-weight-bold'
}
</script>

<style scoped>
.formula-container {
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.katex-formula {
  font-size: 1.2em;
}

:deep(.katex-display) {
  margin: 0;
}
</style>
