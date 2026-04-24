<template>
  <AppPanel
    :title="formula.name"
    tone="cool"
    compact-header
    class="formula-editor"
    :class="{ 'formula-editor--disabled': !formula.enabled }"
  >
    <template #header-aside>
      <label class="formula-editor__toggle">
        <input :checked="formula.enabled" type="checkbox" @change="handleEnabledChange" />
        <span class="formula-editor__toggle-track">
          <span class="formula-editor__toggle-thumb"></span>
        </span>
        <span class="formula-editor__toggle-label">{{ formula.enabled ? 'Enabled' : 'Disabled' }}</span>
      </label>
    </template>

    <label class="formula-editor__field">
      <span>Formula Type</span>
      <select
        :value="formula.formulaType"
        class="formula-editor__select"
        :disabled="!formula.enabled"
        @change="handleFormulaTypeSelect"
      >
        <option v-for="option in formulaTypes" :key="option.value" :value="option.value">
          {{ option.title }}
        </option>
      </select>
    </label>

    <p class="formula-editor__field-hint">{{ currentFormulaDescription }}</p>

    <div v-if="formula.enabled" class="formula-editor__sections">
      <section v-if="formula.formulaType === 'linear'" class="formula-editor__section">
        <header class="formula-editor__section-header">
          <h3>Linear Parameters</h3>
          <p>Adjust the tolerance curve using both a slider and an exact number input.</p>
        </header>
        <div class="formula-editor__range-control">
          <label class="formula-editor__field formula-editor__field--range">
            <span>Tolerance</span>
            <input
              :value="formula.parameters.tolerance"
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              @input="updateParameter('tolerance', toNumber(($event.target as HTMLInputElement).value))"
            />
          </label>
          <label class="formula-editor__field formula-editor__field--number formula-editor__field--inline">
            <span>Value</span>
            <input
              :value="formula.parameters.tolerance"
              type="number"
              min="0.1"
              max="5"
              step="0.1"
              @input="updateParameter('tolerance', toNumber(($event.target as HTMLInputElement).value))"
            />
          </label>
        </div>
      </section>

      <section v-if="formula.formulaType === 'exponential'" class="formula-editor__section">
        <header class="formula-editor__section-header">
          <h3>Exponential Parameters</h3>
          <p>Shape the decay, baseline, and bonus behavior for exponential scoring.</p>
        </header>
        <div class="formula-editor__field-grid">
          <label class="formula-editor__field">
            <span>Decay Rate</span>
            <input :value="formula.parameters.decayRate" type="number" @input="updateParameter('decayRate', toNumber(($event.target as HTMLInputElement).value))" />
            <small>Higher values slow the score decay.</small>
          </label>
          <label class="formula-editor__field">
            <span>Baseline Score</span>
            <input :value="formula.parameters.baseline" type="number" @input="updateParameter('baseline', toNumber(($event.target as HTMLInputElement).value))" />
            <small>Score at the USL/LSL boundary.</small>
          </label>
          <label class="formula-editor__field">
            <span>Bonus Threshold</span>
            <input :value="formula.parameters.bonusThreshold" type="number" @input="updateParameter('bonusThreshold', toNumber(($event.target as HTMLInputElement).value))" />
            <small>Margin before bonus points apply.</small>
          </label>
          <label class="formula-editor__field">
            <span>Bonus Rate</span>
            <input :value="formula.parameters.bonusRate" type="number" @input="updateParameter('bonusRate', toNumber(($event.target as HTMLInputElement).value))" />
            <small>Bonus multiplier used once the threshold is met.</small>
          </label>
        </div>
      </section>

      <section v-if="formula.formulaType === 'logarithmic'" class="formula-editor__section">
        <header class="formula-editor__section-header">
          <h3>Logarithmic Parameters</h3>
          <p>Control the overall scaling applied to the logarithmic curve.</p>
        </header>
        <div class="formula-editor__field-grid formula-editor__field-grid--single">
          <label class="formula-editor__field">
            <span>Scale Factor</span>
            <input :value="formula.parameters.scaleFactor" type="number" @input="updateParameter('scaleFactor', toNumber(($event.target as HTMLInputElement).value))" />
            <small>Multiplier for the log scale.</small>
          </label>
        </div>
      </section>

      <section v-if="formula.formulaType === 'step'" class="formula-editor__section">
        <header class="formula-editor__section-header">
          <h3>Step Parameters</h3>
          <p>Define threshold breakpoints and the score awarded at each step.</p>
        </header>
        <div class="formula-editor__step-list">
          <div v-for="(threshold, index) in stepThresholds" :key="index" class="formula-editor__step-row">
            <label class="formula-editor__field">
              <span>{{ `Threshold ${index + 1}` }}</span>
              <input :value="threshold" type="number" @input="updateThreshold(index, toNumber(($event.target as HTMLInputElement).value))" />
            </label>
            <label class="formula-editor__field">
              <span>{{ `Score ${index + 1}` }}</span>
              <input :value="stepScores[index] ?? 0" type="number" @input="updateScore(index, toNumber(($event.target as HTMLInputElement).value))" />
            </label>
            <button
              type="button"
              class="formula-editor__icon-button formula-editor__icon-button--danger"
              :disabled="stepThresholds.length <= 1"
              @click="removeStep(index)"
            >
              Remove
            </button>
          </div>
        </div>
        <button type="button" class="formula-editor__button formula-editor__button--secondary" @click="addStep">
          Add Step
        </button>
      </section>

      <section v-if="formula.formulaType === 'custom'" class="formula-editor__section">
        <header class="formula-editor__section-header">
          <h3>Custom Expression</h3>
          <p>Write a JavaScript expression using the measurement variables available to the scorer.</p>
        </header>
        <label class="formula-editor__field">
          <span>JavaScript Expression</span>
          <textarea
            :value="formula.customExpression"
            rows="4"
            @input="updateCustomExpression"
          ></textarea>
          <small>Available: actual, usl, lsl, target, Math, min, max, abs, exp, log, pow, sqrt, clamp01</small>
        </label>
        <div class="formula-editor__notice formula-editor__notice--info">
          <strong>Example:</strong>
          <code>10 * clamp01(1 - abs(actual - target) / ((usl - lsl) / 2))</code>
        </div>
        <button type="button" class="formula-editor__button formula-editor__button--secondary" @click="testExpression">
          Test Expression
        </button>
        <div v-if="testResult !== null" class="formula-editor__notice" :class="testResult.success ? 'formula-editor__notice--success' : 'formula-editor__notice--danger'">
          {{ testResult.message }}
        </div>
      </section>

      <section class="formula-editor__section">
        <header class="formula-editor__section-header">
          <h3>Score Bounds</h3>
          <p>Clamp the calculated formula output into the score range used by the flow.</p>
        </header>
        <div class="formula-editor__field-grid">
          <label class="formula-editor__field">
            <span>Min Score</span>
            <input :value="formula.parameters.minScore" type="number" @input="updateParameter('minScore', toNumber(($event.target as HTMLInputElement).value))" />
          </label>
          <label class="formula-editor__field">
            <span>Max Score</span>
            <input :value="formula.parameters.maxScore" type="number" @input="updateParameter('maxScore', toNumber(($event.target as HTMLInputElement).value))" />
          </label>
        </div>
      </section>
    </div>
  </AppPanel>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { AppPanel } from '@/shared/ui'
import type {
  CustomFormulaV2,
  FormulaParameters,
  FormulaType,
} from '../composables/useCustomScoringV2'
import { getDefaultParameters, getFormulaTypeDescription } from '../composables/useCustomScoringV2'

interface Props {
  formula: CustomFormulaV2
}

interface Emits {
  (e: 'update:enabled', value: boolean): void
  (e: 'update:formulaType', value: FormulaType): void
  (e: 'update:parameters', value: FormulaParameters): void
  (e: 'update:customExpression', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const testResult = ref<{ success: boolean; message: string } | null>(null)

const formulaTypes = [
  { value: 'linear', title: 'Linear', description: getFormulaTypeDescription('linear') },
  {
    value: 'exponential',
    title: 'Exponential',
    description: getFormulaTypeDescription('exponential'),
  },
  {
    value: 'logarithmic',
    title: 'Logarithmic',
    description: getFormulaTypeDescription('logarithmic'),
  },
  { value: 'step', title: 'Step', description: getFormulaTypeDescription('step') },
  { value: 'custom', title: 'Custom', description: getFormulaTypeDescription('custom') },
]

const currentFormulaDescription = computed(() => {
  return formulaTypes.find((option) => option.value === props.formula.formulaType)?.description ?? ''
})

const stepThresholds = computed(() => props.formula.parameters.thresholds ?? [])
const stepScores = computed(() => props.formula.parameters.scores ?? [])

const handleEnabledChange = (event: Event) => {
  emit('update:enabled', (event.target as HTMLInputElement).checked)
}

const handleFormulaTypeSelect = (event: Event) => {
  handleFormulaTypeChange((event.target as HTMLSelectElement).value as FormulaType)
}

const updateCustomExpression = (event: Event) => {
  emit('update:customExpression', (event.target as HTMLTextAreaElement).value)
}

const handleFormulaTypeChange = (newType: FormulaType) => {
  emit('update:formulaType', newType)
  // Reset parameters to defaults for new type
  emit('update:parameters', getDefaultParameters(newType))
}

const toNumber = (value: string): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const updateParameter = (key: keyof FormulaParameters, value: number | number[] | undefined) => {
  emit('update:parameters', {
    ...props.formula.parameters,
    [key]: value,
  })
}

const updateThreshold = (index: number, value: number) => {
  const thresholds = [...(props.formula.parameters.thresholds ?? [])]
  thresholds[index] = value
  updateParameter('thresholds', thresholds)
}

const updateScore = (index: number, value: number) => {
  const scores = [...(props.formula.parameters.scores ?? [])]
  scores[index] = value
  updateParameter('scores', scores)
}

const addStep = () => {
  const thresholds = [...(props.formula.parameters.thresholds ?? [])]
  const scores = [...(props.formula.parameters.scores ?? [])]
  const lastThreshold = thresholds[thresholds.length - 1] ?? 1
  thresholds.push(lastThreshold + 1)
  scores.push(0)
  emit('update:parameters', {
    ...props.formula.parameters,
    thresholds,
    scores,
  })
}

const removeStep = (index: number) => {
  const thresholds = [...(props.formula.parameters.thresholds ?? [])]
  const scores = [...(props.formula.parameters.scores ?? [])]
  thresholds.splice(index, 1)
  scores.splice(index, 1)
  emit('update:parameters', {
    ...props.formula.parameters,
    thresholds,
    scores,
  })
}

const testExpression = () => {
  try {
    const expression = props.formula.customExpression ?? ''
    if (!expression.trim()) {
      testResult.value = { success: false, message: 'Expression is empty' }
      return
    }

    // Test with sample values
    const context = {
      actual: 5,
      usl: 10,
      lsl: 0,
      target: 5,
      Math,
      min: Math.min,
      max: Math.max,
      abs: Math.abs,
      exp: Math.exp,
      log: Math.log,
      pow: Math.pow,
      sqrt: Math.sqrt,
      clamp01: (x: number) => Math.max(0, Math.min(1, x)),
    }

    const func = new Function(...Object.keys(context), `return ${expression}`)
    const result = func(...Object.values(context))

    if (typeof result !== 'number' || !Number.isFinite(result)) {
      testResult.value = { success: false, message: `Invalid result: ${result}` }
      return
    }

    testResult.value = {
      success: true,
      message: `✓ Expression valid. Test result: ${result.toFixed(2)} (actual=5, usl=10, lsl=0, target=5)`,
    }
  } catch (error) {
    testResult.value = {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
</script>

<style scoped>
.formula-editor {
  position: relative;
}

.formula-editor--disabled {
  opacity: 0.86;
}

.formula-editor__sections {
  display: grid;
  gap: 1rem;
}

.formula-editor__section {
  display: grid;
  gap: 0.85rem;
  padding: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
}

.formula-editor__section-header {
  display: grid;
  gap: 0.3rem;
}

.formula-editor__section-header h3 {
  margin: 0;
  color: var(--app-ink);
  font-size: 0.98rem;
}

.formula-editor__section-header p,
.formula-editor__field-hint,
.formula-editor__field small {
  margin: 0;
  color: var(--app-muted);
  font-size: 0.82rem;
  line-height: 1.5;
}

.formula-editor__field,
.formula-editor__field--inline {
  display: grid;
  gap: 0.4rem;
}

.formula-editor__field span,
.formula-editor__toggle-label {
  color: var(--app-ink);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.formula-editor__field input,
.formula-editor__field select,
.formula-editor__field textarea {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  padding: 0.75rem 0.9rem;
  font: inherit;
}

.formula-editor__field textarea {
  resize: vertical;
  min-height: 7rem;
}

.formula-editor__field input[type='range'] {
  padding: 0;
  accent-color: var(--app-accent);
}

.formula-editor__range-control,
.formula-editor__field-grid,
.formula-editor__step-row {
  display: grid;
  gap: 0.85rem;
}

.formula-editor__range-control,
.formula-editor__step-row {
  grid-template-columns: minmax(0, 1fr) 8rem;
  align-items: end;
}

.formula-editor__step-row {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
}

.formula-editor__field-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.formula-editor__field-grid--single {
  grid-template-columns: minmax(0, 1fr);
}

.formula-editor__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  cursor: pointer;
}

.formula-editor__toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.formula-editor__toggle-track {
  position: relative;
  width: 2.9rem;
  height: 1.7rem;
  border-radius: 999px;
  background: rgba(102, 112, 133, 0.28);
  transition: background-color 0.2s ease;
}

.formula-editor__toggle-thumb {
  position: absolute;
  top: 0.18rem;
  left: 0.2rem;
  width: 1.3rem;
  height: 1.3rem;
  border-radius: 50%;
  background: white;
  box-shadow: 0 0.15rem 0.5rem rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}

.formula-editor__toggle input:checked + .formula-editor__toggle-track {
  background: rgba(15, 118, 110, 0.7);
}

.formula-editor__toggle input:checked + .formula-editor__toggle-track .formula-editor__toggle-thumb {
  transform: translateX(1.18rem);
}

.formula-editor__button,
.formula-editor__icon-button {
  min-height: 2.75rem;
  border-radius: 0.95rem;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-ink);
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.formula-editor__button:hover,
.formula-editor__icon-button:hover {
  border-color: rgba(15, 118, 110, 0.24);
}

.formula-editor__button {
  padding: 0.6rem 1rem;
}

.formula-editor__icon-button {
  padding: 0.6rem 0.85rem;
  min-width: 5.5rem;
}

.formula-editor__icon-button--danger {
  border-color: var(--app-danger-line);
  color: var(--app-danger);
}

.formula-editor__icon-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.formula-editor__notice {
  display: grid;
  gap: 0.4rem;
  padding: 0.85rem 1rem;
  border-radius: 0.95rem;
  border: 1px solid transparent;
  font-size: 0.84rem;
  line-height: 1.55;
}

.formula-editor__notice--info {
  border-color: var(--app-info-line);
  background: var(--app-info-soft);
  color: var(--app-info);
}

.formula-editor__notice--success {
  border-color: rgba(15, 118, 110, 0.16);
  background: rgba(15, 118, 110, 0.08);
  color: var(--app-accent);
}

.formula-editor__notice--danger {
  border-color: var(--app-danger-line);
  background: var(--app-danger-soft);
  color: var(--app-danger);
}

code {
  font-family: 'Courier New', monospace;
  font-size: 0.85em;
  background-color: var(--app-panel-strong);
  padding: 0.15rem 0.35rem;
  border-radius: 0.35rem;
}

@media (max-width: 760px) {
  .formula-editor__range-control,
  .formula-editor__field-grid,
  .formula-editor__step-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
