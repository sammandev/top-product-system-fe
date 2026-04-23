<template>
  <AppDialog
    v-model="dialogOpen"
    width="min(94vw, 56rem)"
    :breakpoints="dialogBreakpoints"
    :closable="false"
    class="score-breakdown-dialog"
  >
    <template #header>
      <div class="score-breakdown-dialog__header">
        <div class="score-breakdown-dialog__header-copy">
          <span class="score-breakdown-dialog__header-icon">
            <Icon icon="mdi:calculator" />
          </span>
          <div>
            <p class="score-breakdown-dialog__eyebrow">Scoring Detail</p>
            <h2>Score Breakdown</h2>
            <p v-if="item && item.score_breakdown">Inspect the active formula, thresholds, and calculation inputs for this test item.</p>
          </div>
        </div>

        <button
          type="button"
          class="score-breakdown-dialog__button score-breakdown-dialog__button--ghost"
          @click="dialogOpen = false"
        >
          <Icon icon="mdi:close" />
          <span>Close</span>
        </button>
      </div>
    </template>

    <div v-if="item && item.score_breakdown" class="score-breakdown-dialog__body">
      <section class="score-breakdown-dialog__summary-grid">
        <article class="score-breakdown-dialog__summary-card score-breakdown-dialog__summary-card--highlight">
          <small>Test Item</small>
          <strong>{{ item.test_item }}</strong>
        </article>
        <article class="score-breakdown-dialog__summary-card">
          <small>Actual Value</small>
          <strong>{{ item.value }}</strong>
        </article>
        <article class="score-breakdown-dialog__summary-card">
          <small>Score</small>
          <strong :class="getScoreColorClass(item.score)">{{ item.score?.toFixed(2) }}</strong>
        </article>
        <article class="score-breakdown-dialog__summary-card">
          <small>Scoring Method</small>
          <span class="score-breakdown-dialog__pill" :class="getCategoryToneClass(item.score_breakdown.category || '')">
            {{ item.score_breakdown.method }}
          </span>
        </article>
      </section>

      <section class="score-breakdown-dialog__panel">
        <div class="score-breakdown-dialog__panel-header">
          <div class="score-breakdown-dialog__panel-title">
            <Icon icon="mdi:function-variant" />
            <span>Scoring Formula</span>
          </div>
          <span v-if="hasCustomFormula" class="score-breakdown-dialog__pill score-breakdown-dialog__pill--success">
            Custom Active
          </span>
        </div>

        <div class="score-breakdown-dialog__formula-block">
          <div class="score-breakdown-dialog__formula-label">
            <Icon icon="mdi:cog" />
            <span>System Formula</span>
          </div>
          <div class="formula-container score-breakdown-dialog__formula-surface">
            <div ref="formulaEl" class="katex-formula"></div>
          </div>
        </div>

        <div v-if="hasCustomFormula" class="score-breakdown-dialog__formula-block score-breakdown-dialog__formula-block--custom">
          <div class="score-breakdown-dialog__formula-label">
            <Icon icon="mdi:check-circle" />
            <span>Selected Formula (Applied)</span>
          </div>
          <span class="score-breakdown-dialog__pill" :class="selectedFormulaColorClass">
            {{ selectedFormulaName }}
          </span>
          <div class="formula-container score-breakdown-dialog__formula-surface score-breakdown-dialog__formula-surface--custom">
            <div ref="customFormulaEl" class="katex-formula"></div>
          </div>
        </div>
      </section>

      <section class="score-breakdown-dialog__panel">
        <div class="score-breakdown-dialog__panel-header">
          <div class="score-breakdown-dialog__panel-title">
            <Icon icon="mdi:table" />
            <span>Calculation Details</span>
          </div>
        </div>

        <div class="score-breakdown-dialog__detail-table">
          <div class="score-breakdown-dialog__detail-row">
            <span>Category</span>
            <strong>{{ item.score_breakdown.category }}</strong>
          </div>
          <div class="score-breakdown-dialog__detail-row">
            <span>Method</span>
            <strong>{{ item.score_breakdown.method }}</strong>
          </div>
          <div v-if="item.score_breakdown.comparison" class="score-breakdown-dialog__detail-row">
            <span>Comparison</span>
            <strong>{{ item.score_breakdown.comparison }}</strong>
          </div>
          <div v-if="item.score_breakdown.threshold !== undefined" class="score-breakdown-dialog__detail-row">
            <span>Threshold</span>
            <strong>{{ item.score_breakdown.threshold.toFixed(2) }}</strong>
          </div>
          <div v-if="item.score_breakdown.usl !== undefined" class="score-breakdown-dialog__detail-row">
            <span>USL (Upper Spec Limit)</span>
            <strong>{{ formatNumber(item.score_breakdown.usl) }}</strong>
          </div>
          <div v-if="item.score_breakdown.lsl !== undefined" class="score-breakdown-dialog__detail-row">
            <span>LSL (Lower Spec Limit)</span>
            <strong>{{ formatNumber(item.score_breakdown.lsl) }}</strong>
          </div>
          <div v-if="item.score_breakdown.target_used !== undefined" class="score-breakdown-dialog__detail-row">
            <span>Target Used</span>
            <strong class="score-breakdown-dialog__value--accent">{{ formatNumberSafe(item.score_breakdown.target_used) }}</strong>
          </div>
          <div v-if="item.score_breakdown.current_value !== undefined" class="score-breakdown-dialog__detail-row">
            <span>Current Value</span>
            <strong>{{ item.score_breakdown.current_value.toFixed(2) }}</strong>
          </div>
          <div v-if="item.score_breakdown.trend_mean !== undefined" class="score-breakdown-dialog__detail-row">
            <span>Trend Mean</span>
            <strong class="score-breakdown-dialog__value--info">{{ item.score_breakdown.trend_mean.toFixed(2) }}</strong>
          </div>
          <div v-if="item.score_breakdown.actual !== undefined && item.score_breakdown.current_value === undefined" class="score-breakdown-dialog__detail-row">
            <span>Actual Value</span>
            <strong>{{ item.score_breakdown.actual?.toFixed(2) }}</strong>
          </div>
          <div v-if="item.score_breakdown.deviation_from_mean !== undefined" class="score-breakdown-dialog__detail-row">
            <span>Deviation from Mean</span>
            <strong :class="getDeviationColorClass(item.score_breakdown.deviation_from_mean)">
              {{ Math.abs(item.score_breakdown.deviation_from_mean).toFixed(2) }}
              <Icon v-if="item.score_breakdown.deviation_from_mean > 0" icon="mdi:arrow-up" />
              <Icon v-else-if="item.score_breakdown.deviation_from_mean < 0" icon="mdi:arrow-down" />
            </strong>
          </div>
          <div v-if="item.score_breakdown.abs_deviation !== undefined" class="score-breakdown-dialog__detail-row">
            <span>Absolute Deviation</span>
            <strong>{{ item.score_breakdown.abs_deviation.toFixed(2) }}</strong>
          </div>
          <div v-if="item.score_breakdown.deviation !== undefined && item.score_breakdown.deviation_from_mean === undefined" class="score-breakdown-dialog__detail-row">
            <span>Deviation</span>
            <strong :class="getDeviationColorClass(item.score_breakdown.deviation || 0)">
              {{ Math.abs(item.score_breakdown.deviation || 0).toFixed(2) }}
              <Icon v-if="(item.score_breakdown.deviation || 0) > 0" icon="mdi:arrow-up" />
              <Icon v-else-if="(item.score_breakdown.deviation || 0) < 0" icon="mdi:arrow-down" />
            </strong>
          </div>
          <div v-if="item.score_breakdown.raw_score !== undefined" class="score-breakdown-dialog__detail-row">
            <span>Raw Score</span>
            <strong>{{ item.score_breakdown.raw_score.toFixed(2) }}</strong>
          </div>
          <div v-if="item.score_breakdown.final_score !== undefined" class="score-breakdown-dialog__detail-row score-breakdown-dialog__detail-row--highlight">
            <span>Final Score</span>
            <strong :class="getScoreColorClass(item.score_breakdown.final_score)">{{ item.score_breakdown.final_score.toFixed(2) }}</strong>
          </div>
          <div v-if="item.score_breakdown.interpretation" class="score-breakdown-dialog__detail-row">
            <span>Interpretation</span>
            <strong class="score-breakdown-dialog__value--success">
              <Icon icon="mdi:information" />
              {{ item.score_breakdown.interpretation }}
            </strong>
          </div>
        </div>
      </section>

      <div class="score-breakdown-dialog__footer">
        <button
          type="button"
          class="score-breakdown-dialog__button score-breakdown-dialog__button--ghost"
          @click="dialogOpen = false"
        >
          Close
        </button>
      </div>
    </div>
  </AppDialog>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import katex from 'katex'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type {
  CategoryFormulaSelections,
  FormulaSelection,
} from '@/features/dut/composables/useFormulaSelector'
import type { ParsedTestItemEnhanced } from '@/features/dut-logs/composables/useTestLogUpload'
import { AppDialog } from '@/shared'
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

const dialogBreakpoints = {
  '1200px': '94vw',
  '768px': '98vw',
  '640px': '100vw',
}

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

const selectedFormulaColorClass = computed(() => {
  if (selectedFormulaColor.value === 'deep-purple') {
    return 'score-breakdown-dialog__pill--formula'
  }

  if (selectedFormulaColor.value === 'success') {
    return 'score-breakdown-dialog__pill--success'
  }

  return 'score-breakdown-dialog__pill--neutral'
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

const getCategoryToneClass = (category: string): string => {
  const tone = getCategoryColor(category)
  if (tone === 'purple') return 'score-breakdown-dialog__pill--formula'
  if (tone === 'blue') return 'score-breakdown-dialog__pill--info'
  if (tone === 'orange') return 'score-breakdown-dialog__pill--warning'
  if (tone === 'green') return 'score-breakdown-dialog__pill--success'
  return 'score-breakdown-dialog__pill--neutral'
}

const getScoreColorClass = (score: number | null): string => {
  if (score === null) return 'score-breakdown-dialog__value--muted'
  if (score >= 9) return 'score-breakdown-dialog__value--success'
  if (score >= 7) return 'score-breakdown-dialog__value--warning'
  return 'score-breakdown-dialog__value--error'
}

const getDeviationColorClass = (deviation: number): string => {
  if (Math.abs(deviation) < 0.01) return 'score-breakdown-dialog__value--success'
  if (Math.abs(deviation) < 1.0) return 'score-breakdown-dialog__value--warning'
  return 'score-breakdown-dialog__value--error score-breakdown-dialog__value--strong'
}
</script>

<style scoped>
.score-breakdown-dialog__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.score-breakdown-dialog__header-copy {
  display: flex;
  gap: 0.85rem;
}

.score-breakdown-dialog__header-icon {
  display: inline-flex;
  width: 2.6rem;
  height: 2.6rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.score-breakdown-dialog__eyebrow {
  margin: 0 0 0.3rem;
  color: var(--app-accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.score-breakdown-dialog__header h2 {
  margin: 0;
  font-size: 1.35rem;
}

.score-breakdown-dialog__header p:last-child {
  margin: 0.35rem 0 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.score-breakdown-dialog__button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 999px;
  padding: 0.7rem 1rem;
  font-weight: 700;
  cursor: pointer;
}

.score-breakdown-dialog__button--ghost {
  border: 1px solid var(--app-border);
  background: rgba(255, 251, 247, 0.92);
  color: var(--app-ink);
}

.score-breakdown-dialog__body {
  display: grid;
  gap: 1rem;
}

.score-breakdown-dialog__summary-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
}

.score-breakdown-dialog__summary-card,
.score-breakdown-dialog__panel {
  border: 1px solid var(--app-border);
  border-radius: 1.15rem;
  background: rgba(255, 251, 247, 0.92);
}

.score-breakdown-dialog__summary-card {
  display: grid;
  gap: 0.35rem;
  padding: 1rem;
}

.score-breakdown-dialog__summary-card--highlight {
  background: linear-gradient(145deg, rgba(20, 88, 71, 0.12), rgba(255, 251, 247, 0.96));
}

.score-breakdown-dialog__summary-card small,
.score-breakdown-dialog__detail-row span {
  color: var(--app-muted);
}

.score-breakdown-dialog__summary-card strong,
.score-breakdown-dialog__detail-row strong {
  color: var(--app-ink);
}

.score-breakdown-dialog__panel {
  padding: 1rem;
}

.score-breakdown-dialog__panel-header,
.score-breakdown-dialog__panel-title,
.score-breakdown-dialog__formula-label,
.score-breakdown-dialog__footer {
  display: flex;
  align-items: center;
}

.score-breakdown-dialog__panel-header {
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.score-breakdown-dialog__panel-title,
.score-breakdown-dialog__formula-label {
  gap: 0.5rem;
  color: var(--app-ink);
  font-weight: 700;
}

.score-breakdown-dialog__formula-block {
  display: grid;
  gap: 0.75rem;
}

.score-breakdown-dialog__formula-block--custom {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--app-border);
}

.score-breakdown-dialog__formula-surface {
  background: rgba(255, 248, 240, 0.88);
  border: 1px solid var(--app-border);
}

.score-breakdown-dialog__formula-surface--custom {
  background: rgba(20, 88, 71, 0.06);
}

.score-breakdown-dialog__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 700;
}

.score-breakdown-dialog__pill--success {
  background: rgba(20, 88, 71, 0.12);
  color: #145847;
}

.score-breakdown-dialog__pill--warning {
  background: rgba(184, 118, 38, 0.16);
  color: #8f5314;
}

.score-breakdown-dialog__pill--info {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.score-breakdown-dialog__pill--formula {
  background: rgba(95, 64, 176, 0.14);
  color: #5f40b0;
}

.score-breakdown-dialog__pill--neutral {
  background: rgba(120, 129, 143, 0.12);
  color: #4f5d6d;
}

.score-breakdown-dialog__detail-table {
  display: grid;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  overflow: hidden;
}

.score-breakdown-dialog__detail-row {
  display: grid;
  grid-template-columns: minmax(11rem, 15rem) 1fr;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-top: 1px solid var(--app-border);
  background: rgba(255, 251, 247, 0.92);
}

.score-breakdown-dialog__detail-row:first-child {
  border-top: 0;
}

.score-breakdown-dialog__detail-row--highlight {
  background: rgba(40, 96, 163, 0.08);
}

.score-breakdown-dialog__footer {
  justify-content: flex-end;
}

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

.score-breakdown-dialog__value--muted {
  color: var(--app-muted);
}

.score-breakdown-dialog__value--success {
  color: #145847;
}

.score-breakdown-dialog__value--warning {
  color: #8f5314;
}

.score-breakdown-dialog__value--error {
  color: #8f2020;
}

.score-breakdown-dialog__value--accent {
  color: #1f4e86;
}

.score-breakdown-dialog__value--info {
  color: #1f4e86;
}

.score-breakdown-dialog__value--strong {
  font-weight: 700;
}

:deep(.katex-display) {
  margin: 0;
}

@media (max-width: 768px) {
  .score-breakdown-dialog__header,
  .score-breakdown-dialog__header-copy,
  .score-breakdown-dialog__panel-header {
    flex-direction: column;
    align-items: stretch;
  }

  .score-breakdown-dialog__detail-row {
    grid-template-columns: 1fr;
  }
}
</style>
