<template>
  <AppDialog
    :model-value="modelValue"
    title="Custom Scoring Configuration"
    description="Tune universal and category-specific scoring formulas without leaving the Top Products workflow."
    width="min(96vw, 68rem)"
    :breakpoints="{ '1100px': '92vw', '700px': '96vw' }"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <div class="custom-scoring-dialog">
      <div v-if="enabledCount > 0" class="custom-scoring-dialog__summary-banner">
        <div>
          <strong>{{ enabledCount }}</strong> custom formula{{ enabledCount > 1 ? 's' : '' }} active
        </div>
        <span class="custom-scoring-dialog__tag custom-scoring-dialog__tag--primary">
          {{ universalFormula.enabled ? 'Universal' : '' }}
          {{ universalFormula.enabled && enabledCategoryCount > 0 ? ' + ' : '' }}
          {{ enabledCategoryCount > 0 ? `${enabledCategoryCount} Categories` : '' }}
        </span>
      </div>

      <details class="custom-scoring-dialog__section" open>
        <summary class="custom-scoring-dialog__section-header">
          <div class="custom-scoring-dialog__section-copy">
            <strong>Universal Formula</strong>
            <span>{{ universalFormula.formulaType }} scoring</span>
          </div>
          <span v-if="universalFormula.enabled" class="custom-scoring-dialog__tag custom-scoring-dialog__tag--success">
            Enabled
          </span>
        </summary>
        <div class="custom-scoring-dialog__section-body">
          <FormulaEditor
            :formula="universalFormula"
            @update:enabled="updateUniversalEnabled"
            @update:formula-type="updateUniversalType"
            @update:parameters="updateUniversalParameters"
            @update:custom-expression="updateUniversalExpression"
          />
        </div>
      </details>

      <details v-if="availableMeasurements.length > 0" class="custom-scoring-dialog__section" open>
        <summary class="custom-scoring-dialog__section-header">
          <div class="custom-scoring-dialog__section-copy">
            <strong>Test Formula With Real Data</strong>
            <span>Preview formula behavior against current analysis measurements.</span>
          </div>
          <span v-if="testMeasurement" class="custom-scoring-dialog__tag custom-scoring-dialog__tag--primary">
            Testing {{ testMeasurement.test_item }}
          </span>
        </summary>
        <div class="custom-scoring-dialog__section-body">
          <div class="custom-scoring-dialog__notice">
            Test your formulas with actual measurements from the current results to see how they perform.
          </div>

          <label class="custom-scoring-dialog__field">
            <span>Select Measurement to Test</span>
            <select v-model="selectedMeasurementKey" class="custom-scoring-dialog__select">
              <option value="">Choose a measurement</option>
              <option v-for="measurement in availableMeasurements" :key="measurement.test_item" :value="measurement.test_item">
                {{ measurement.test_item }}{{ measurement.category ? ` — ${measurement.category}` : '' }}
              </option>
            </select>
          </label>

          <AppPanel v-if="testMeasurement" title="Test Results" compact-header>
            <table class="custom-scoring-dialog__table">
              <tbody>
                <tr>
                  <th>Test Item</th>
                  <td>{{ testMeasurement.test_item }}</td>
                </tr>
                <tr>
                  <th>Category</th>
                  <td>
                    <span class="custom-scoring-dialog__tag custom-scoring-dialog__tag--primary">
                      {{ testMeasurement.category || 'General' }}
                    </span>
                  </td>
                </tr>
                <tr>
                  <th>Measured Value</th>
                  <td>{{ testMeasurement.actual.toFixed(4) }}</td>
                </tr>
                <tr>
                  <th>Target Value</th>
                  <td>{{ testMeasurement.target !== null ? testMeasurement.target.toFixed(4) : 'N/A' }}</td>
                </tr>
                <tr>
                  <th>USL / LSL</th>
                  <td>
                    {{ testMeasurement.usl !== null ? testMeasurement.usl.toFixed(4) : 'N/A' }} /
                    {{ testMeasurement.lsl !== null ? testMeasurement.lsl.toFixed(4) : 'N/A' }}
                  </td>
                </tr>
                <tr>
                  <th>System Score</th>
                  <td>
                    <span class="custom-scoring-dialog__tag" :class="scoreClass(testMeasurement.systemScore)">
                      {{ testMeasurement.systemScore.toFixed(2) }}
                    </span>
                  </td>
                </tr>
                <tr>
                  <th>Custom Score</th>
                  <td class="custom-scoring-dialog__table-score-cell">
                    <span class="custom-scoring-dialog__tag" :class="scoreClass(testResult.customScore)">
                      {{ testResult.customScore.toFixed(2) }}
                    </span>
                    <span class="custom-scoring-dialog__tag custom-scoring-dialog__tag--muted">
                      {{ testResult.formulaName }}
                    </span>
                  </td>
                </tr>
                <tr>
                  <th>Difference</th>
                  <td class="custom-scoring-dialog__table-score-cell">
                    <span class="custom-scoring-dialog__tag" :class="differenceClass(testResult.difference)">
                      {{ testResult.difference > 0 ? '+' : '' }}{{ testResult.difference.toFixed(2) }}
                    </span>
                    <span class="custom-scoring-dialog__difference-note">
                      ({{ testResult.difference > 0 ? 'Higher' : testResult.difference < 0 ? 'Lower' : 'Same' }} than system)
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </AppPanel>

          <div v-else class="custom-scoring-dialog__notice custom-scoring-dialog__notice--subtle">
            Select a measurement above to test your custom formulas.
          </div>
        </div>
      </details>

      <details class="custom-scoring-dialog__section" open>
        <summary class="custom-scoring-dialog__section-header">
          <div class="custom-scoring-dialog__section-copy">
            <strong>Category Formulas</strong>
            <span>Override the universal formula for specific measurement categories.</span>
          </div>
          <span class="custom-scoring-dialog__tag" :class="enabledCategoryCount > 0 ? 'custom-scoring-dialog__tag--success' : 'custom-scoring-dialog__tag--muted'">
            {{ enabledCategoryCount }} / {{ Object.keys(categoryFormulas).length }} Enabled
          </span>
        </summary>
        <div class="custom-scoring-dialog__section-body">
          <div class="custom-scoring-dialog__actions">
            <button type="button" class="custom-scoring-dialog__button custom-scoring-dialog__button--secondary" @click="handleToggleAll(true)">
              Enable All
            </button>
            <button type="button" class="custom-scoring-dialog__button custom-scoring-dialog__button--secondary" @click="handleToggleAll(false)">
              Disable All
            </button>
          </div>

          <div class="custom-scoring-dialog__category-list">
            <details v-for="(formula, category) in categoryFormulas" :key="category" class="custom-scoring-dialog__category-card">
              <summary class="custom-scoring-dialog__category-header">
                <div class="custom-scoring-dialog__category-copy">
                  <span class="custom-scoring-dialog__tag custom-scoring-dialog__tag--primary">{{ category }}</span>
                  <span>{{ formula.name }}</span>
                </div>
                <div class="custom-scoring-dialog__category-meta">
                  <span v-if="formula.enabled" class="custom-scoring-dialog__tag custom-scoring-dialog__tag--success">Enabled</span>
                  <span class="custom-scoring-dialog__category-type">{{ formula.formulaType }}</span>
                </div>
              </summary>
              <div class="custom-scoring-dialog__category-body">
                <FormulaEditor
                  :formula="formula"
                  @update:enabled="updateCategoryEnabled(String(category), $event)"
                  @update:formula-type="updateCategoryType(String(category), $event)"
                  @update:parameters="updateCategoryParameters(String(category), $event)"
                  @update:custom-expression="updateCategoryExpression(String(category), $event)"
                />
              </div>
            </details>
          </div>
        </div>
      </details>
    </div>

    <template #footer>
      <div class="custom-scoring-dialog__footer">
        <button type="button" class="custom-scoring-dialog__button custom-scoring-dialog__button--secondary" @click="handleReset">
          Reset to Defaults
        </button>
        <div class="custom-scoring-dialog__footer-spacer"></div>
        <button type="button" class="custom-scoring-dialog__button custom-scoring-dialog__button--ghost" @click="$emit('update:modelValue', false)">
          Cancel
        </button>
        <button type="button" class="custom-scoring-dialog__button custom-scoring-dialog__button--primary" @click="handleApply">
          Apply
        </button>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { AppDialog, AppPanel } from '@/shared/ui'
import type {
  CategoryFormulasV2,
  CustomFormulaV2,
  FormulaParameters,
  FormulaType,
} from '../composables/useCustomScoringV2'
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
const injectedResults = inject<{ value: TopProductBatchResponse | null }>('topProductResults', {
  value: null,
})

// State for testing
const testMeasurement = ref<TestMeasurement | null>(null)

const selectedMeasurementKey = computed({
  get: () => testMeasurement.value?.test_item ?? '',
  set: (value: string) => {
    testMeasurement.value = availableMeasurements.value.find((measurement) => measurement.test_item === value) ?? null
  },
})

// Extract measurements from current results for testing
const availableMeasurements = computed<TestMeasurement[]>(() => {
  if (!injectedResults.value) return []

  const measurements: TestMeasurement[] = []

  injectedResults.value.results?.forEach((result) => {
    result.test_result?.forEach((station) => {
      // biome-ignore lint/suspicious/noExplicitAny: item can be object or array format, typed dynamically
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
          systemScore,
        })
      })
    })
  })

  // Return unique measurements (by test_item)
  const unique = measurements.filter(
    (m, index, self) => index === self.findIndex((t) => t.test_item === m.test_item),
  )

  return unique.slice(0, 50) // Limit to first 50 for performance
})

// Calculate custom score for test measurement
const testResult = computed(() => {
  if (!testMeasurement.value) {
    return {
      customScore: 0,
      difference: 0,
      formulaName: 'N/A',
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
      customScore = formula.calculate(m.actual, m.usl, m.lsl, m.target ?? 0)
    } catch (error) {
      console.error('Formula calculation error:', error)
      customScore = 0
    }
  }

  return {
    customScore,
    difference: customScore - m.systemScore,
    formulaName,
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

const scoreClass = (score: number): string => `custom-scoring-dialog__tag--${getScoreColor(score)}`

const differenceClass = (difference: number): string => {
  if (difference > 0) return 'custom-scoring-dialog__tag--success'
  if (difference < 0) return 'custom-scoring-dialog__tag--danger'
  return 'custom-scoring-dialog__tag--muted'
}

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
.custom-scoring-dialog {
  display: grid;
  gap: 1rem;
}

.custom-scoring-dialog__summary-banner,
.custom-scoring-dialog__notice {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 0.95rem 1rem;
  border: 1px solid rgba(40, 96, 163, 0.15);
  border-radius: 1rem;
  background: linear-gradient(180deg, rgba(40, 96, 163, 0.08), rgba(40, 96, 163, 0.03));
  color: var(--app-ink);
}

.custom-scoring-dialog__notice {
  justify-content: flex-start;
}

.custom-scoring-dialog__notice--subtle {
  border-style: dashed;
  background: rgba(255, 251, 247, 0.7);
  color: var(--app-muted);
}

.custom-scoring-dialog__section,
.custom-scoring-dialog__category-card {
  border: 1px solid var(--app-border);
  border-radius: 1.15rem;
  background: rgba(255, 251, 247, 0.88);
  overflow: hidden;
}

.custom-scoring-dialog__section[open],
.custom-scoring-dialog__category-card[open] {
  box-shadow: var(--app-shadow-soft);
}

.custom-scoring-dialog__section-header,
.custom-scoring-dialog__category-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.15rem;
  cursor: pointer;
  list-style: none;
}

.custom-scoring-dialog__section-header::-webkit-details-marker,
.custom-scoring-dialog__category-header::-webkit-details-marker {
  display: none;
}

.custom-scoring-dialog__section-copy,
.custom-scoring-dialog__category-copy,
.custom-scoring-dialog__category-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
}

.custom-scoring-dialog__section-copy {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
}

.custom-scoring-dialog__section-copy strong {
  font-size: 1rem;
}

.custom-scoring-dialog__section-copy span,
.custom-scoring-dialog__category-type,
.custom-scoring-dialog__difference-note {
  color: var(--app-muted);
  font-size: 0.84rem;
}

.custom-scoring-dialog__section-body,
.custom-scoring-dialog__category-body {
  display: grid;
  gap: 1rem;
  padding: 0 1.15rem 1.15rem;
}

.custom-scoring-dialog__field {
  display: grid;
  gap: 0.4rem;
}

.custom-scoring-dialog__field span {
  color: var(--app-muted);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.custom-scoring-dialog__select {
  min-height: 2.9rem;
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  padding: 0.75rem 0.9rem;
}

.custom-scoring-dialog__table {
  width: 100%;
  border-collapse: collapse;
}

.custom-scoring-dialog__table th,
.custom-scoring-dialog__table td {
  padding: 0.75rem 0.35rem;
  border-bottom: 1px solid rgba(20, 88, 71, 0.1);
  text-align: left;
  vertical-align: top;
}

.custom-scoring-dialog__table th {
  width: 11rem;
  color: var(--app-muted);
  font-size: 0.84rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.custom-scoring-dialog__table-score-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.custom-scoring-dialog__tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.9rem;
  padding: 0.2rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.custom-scoring-dialog__tag--primary {
  background: rgba(40, 96, 163, 0.14);
  color: #1f4f89;
}

.custom-scoring-dialog__tag--success {
  background: rgba(20, 88, 71, 0.14);
  color: #145847;
}

.custom-scoring-dialog__tag--info {
  background: rgba(40, 96, 163, 0.14);
  color: #1f4f89;
}

.custom-scoring-dialog__tag--warning {
  background: rgba(161, 104, 57, 0.16);
  color: #8c592f;
}

.custom-scoring-dialog__tag--danger,
.custom-scoring-dialog__tag--error {
  background: rgba(164, 52, 58, 0.14);
  color: #8e3037;
}

.custom-scoring-dialog__tag--muted,
.custom-scoring-dialog__tag--default {
  background: rgba(102, 112, 133, 0.14);
  color: #596170;
}

.custom-scoring-dialog__actions,
.custom-scoring-dialog__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.custom-scoring-dialog__footer-spacer {
  flex: 1 1 auto;
}

.custom-scoring-dialog__button {
  min-height: 2.75rem;
  border-radius: 0.95rem;
  padding: 0.6rem 1rem;
  font-weight: 700;
  border: 1px solid transparent;
  cursor: pointer;
  transition: transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
}

.custom-scoring-dialog__button:hover {
  transform: translateY(-1px);
}

.custom-scoring-dialog__button--primary {
  background: var(--app-accent);
  color: white;
}

.custom-scoring-dialog__button--secondary {
  background: rgba(255, 251, 247, 0.92);
  border-color: var(--app-border);
  color: var(--app-ink);
}

.custom-scoring-dialog__button--ghost {
  background: transparent;
  color: var(--app-muted);
}

.custom-scoring-dialog__category-list {
  display: grid;
  gap: 0.85rem;
}

@media (max-width: 700px) {
  .custom-scoring-dialog__summary-banner,
  .custom-scoring-dialog__section-header,
  .custom-scoring-dialog__category-header,
  .custom-scoring-dialog__footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .custom-scoring-dialog__table th {
    width: 8rem;
  }

  .custom-scoring-dialog__footer-spacer {
    display: none;
  }

  .custom-scoring-dialog__button {
    width: 100%;
  }
}
</style>
