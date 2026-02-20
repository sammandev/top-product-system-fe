<template>
    <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
            <span>{{ formula.name }}</span>
            <v-switch :model-value="formula.enabled" @update:model-value="emitEnabled" color="primary" hide-details
                density="compact" />
        </v-card-title>

        <v-card-text>
            <!-- Formula Type Selector -->
            <v-select :model-value="formula.formulaType" @update:model-value="handleFormulaTypeChange"
                :items="formulaTypes" label="Formula Type" variant="outlined" density="compact" class="mb-4"
                :disabled="!formula.enabled">
                <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                        <template #subtitle>
                            <span class="text-caption">{{ item.raw.description }}</span>
                        </template>
                    </v-list-item>
                </template>
            </v-select>

            <!-- Parameters based on formula type -->
            <div v-if="formula.enabled">
                <!-- Linear Parameters -->
                <div v-if="formula.formulaType === 'linear'" class="parameter-section">
                    <div class="text-subtitle-2 mb-2">Linear Parameters</div>
                    <v-row>
                        <v-col cols="12">
                            <div class="d-flex align-center gap-4">
                                <v-slider :model-value="formula.parameters.tolerance"
                                    @update:model-value="updateParameter('tolerance', $event)" label="Tolerance"
                                    min="0.1" max="5.0" step="0.1" thumb-label class="flex-grow-1" />
                                <v-text-field :model-value="formula.parameters.tolerance"
                                    @update:model-value="updateParameter('tolerance', Number($event))" type="number"
                                    variant="outlined" density="compact" style="width: 100px" hide-details />
                            </div>
                        </v-col>
                    </v-row>
                </div>

                <!-- Exponential Parameters -->
                <div v-if="formula.formulaType === 'exponential'" class="parameter-section">
                    <div class="text-subtitle-2 mb-2">Exponential Parameters</div>
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field :model-value="formula.parameters.decayRate"
                                @update:model-value="updateParameter('decayRate', Number($event))" label="Decay Rate"
                                type="number" variant="outlined" density="compact" hint="Higher = slower decay"
                                persistent-hint />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field :model-value="formula.parameters.baseline"
                                @update:model-value="updateParameter('baseline', Number($event))" label="Baseline Score"
                                type="number" variant="outlined" density="compact" hint="Score at USL/LSL boundary"
                                persistent-hint />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field :model-value="formula.parameters.bonusThreshold"
                                @update:model-value="updateParameter('bonusThreshold', Number($event))"
                                label="Bonus Threshold" type="number" variant="outlined" density="compact"
                                hint="Margin for bonus points" persistent-hint />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field :model-value="formula.parameters.bonusRate"
                                @update:model-value="updateParameter('bonusRate', Number($event))" label="Bonus Rate"
                                type="number" variant="outlined" density="compact" hint="Bonus multiplier"
                                persistent-hint />
                        </v-col>
                    </v-row>
                </div>

                <!-- Logarithmic Parameters -->
                <div v-if="formula.formulaType === 'logarithmic'" class="parameter-section">
                    <div class="text-subtitle-2 mb-2">Logarithmic Parameters</div>
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field :model-value="formula.parameters.scaleFactor"
                                @update:model-value="updateParameter('scaleFactor', Number($event))"
                                label="Scale Factor" type="number" variant="outlined" density="compact"
                                hint="Multiplier for log scale" persistent-hint />
                        </v-col>
                    </v-row>
                </div>

                <!-- Step Parameters -->
                <div v-if="formula.formulaType === 'step'" class="parameter-section">
                    <div class="text-subtitle-2 mb-2">Step Parameters</div>
                    <div class="text-caption text-medium-emphasis mb-3">
                        Define threshold breakpoints and corresponding scores
                    </div>
                    <v-row v-for="(threshold, index) in formula.parameters.thresholds" :key="index">
                        <v-col cols="5">
                            <v-text-field :model-value="threshold"
                                @update:model-value="updateThreshold(index, Number($event))"
                                :label="`Threshold ${index + 1}`" type="number" variant="outlined" density="compact"
                                hide-details />
                        </v-col>
                        <v-col cols="5">
                            <v-text-field :model-value="formula.parameters.scores?.[index]"
                                @update:model-value="updateScore(index, Number($event))" :label="`Score ${index + 1}`"
                                type="number" variant="outlined" density="compact" hide-details />
                        </v-col>
                        <v-col cols="2" class="d-flex align-center">
                            <v-btn icon="mdi-delete" size="small" variant="text" color="error"
                                @click="removeStep(index)"
                                :disabled="(formula.parameters.thresholds?.length ?? 0) <= 1" />
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-col cols="12">
                            <v-btn prepend-icon="mdi-plus" variant="outlined" size="small" @click="addStep" block>
                                Add Step
                            </v-btn>
                        </v-col>
                    </v-row>
                </div>

                <!-- Custom Expression -->
                <div v-if="formula.formulaType === 'custom'" class="parameter-section">
                    <div class="text-subtitle-2 mb-2">Custom Expression</div>
                    <v-textarea :model-value="formula.customExpression"
                        @update:model-value="$emit('update:customExpression', $event)" label="JavaScript Expression"
                        variant="outlined" rows="4"
                        hint="Available: actual, usl, lsl, target, Math, min, max, abs, exp, log, pow, sqrt, clamp01"
                        persistent-hint class="mb-2" />
                    <v-alert type="info" variant="tonal" density="compact" class="mb-2">
                        <div class="text-caption">
                            <strong>Example:</strong><br>
                            <code>10 * clamp01(1 - abs(actual - target) / ((usl - lsl) / 2))</code>
                        </div>
                    </v-alert>
                    <v-btn prepend-icon="mdi-atom-variant" variant="outlined" size="small" @click="testExpression"
                        block>
                        Test Expression
                    </v-btn>
                    <div v-if="testResult !== null" class="mt-2">
                        <v-alert :type="testResult.success ? 'success' : 'error'" variant="tonal" density="compact">
                            {{ testResult.message }}
                        </v-alert>
                    </div>
                </div>

                <!-- Min/Max Score (common to all types) -->
                <v-row class="mt-2">
                    <v-col cols="12" md="6">
                        <v-text-field :model-value="formula.parameters.minScore"
                            @update:model-value="updateParameter('minScore', Number($event))" label="Min Score"
                            type="number" variant="outlined" density="compact" hide-details />
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-text-field :model-value="formula.parameters.maxScore"
                            @update:model-value="updateParameter('maxScore', Number($event))" label="Max Score"
                            type="number" variant="outlined" density="compact" hide-details />
                    </v-col>
                </v-row>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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

// Workaround for Vue type inference with boolean emit
const emitEnabled = (value: boolean | null) => {
  if (value !== null) {
    emit('update:enabled', value)
  }
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

const handleFormulaTypeChange = (newType: FormulaType) => {
  emit('update:formulaType', newType)
  // Reset parameters to defaults for new type
  emit('update:parameters', getDefaultParameters(newType))
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
.parameter-section {
    padding: 12px;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 4px;
    margin-bottom: 12px;
}

code {
    font-family: 'Courier New', monospace;
    font-size: 0.85em;
    background-color: rgba(0, 0, 0, 0.05);
    padding: 2px 4px;
    border-radius: 2px;
}
</style>
