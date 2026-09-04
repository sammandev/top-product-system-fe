<template>
  <AppDialog
    v-model="dialogOpen"
    v-model:fullscreen="isFullscreen"
    width="min(94vw, 42rem)"
    fullscreen-width="96vw"
    :breakpoints="{ '960px': '98vw', '640px': '100vw' }"
    fullscreenable
    :showFooter="false"
    :title="dialogTitle"
    :description="dialogDescription"
    class="universal-score-breakdown-dialog"
  >
    <template #header>
      <div class="universal-score-breakdown__dialog-title">
        <Icon icon="mdi:table-search" />
        <h2>{{ dialogTitle }}</h2>
      </div>
    </template>

    <div v-if="normalizedItem" class="universal-score-breakdown__subdialog">
      <section class="universal-score-breakdown__name-card">
        <span class="universal-score-breakdown__name-text">{{ normalizedItem.test_item }}</span>
      </section>

      <section class="universal-score-breakdown__rows-container">
        <div v-for="row in breakdownRows" :key="row.key" class="universal-score-breakdown__row">
          <div class="universal-score-breakdown__row-left">
            <span class="universal-score-breakdown__row-icon" :class="getBreakdownIconClass(row)">
              <Icon :icon="getBreakdownRowIcon(row)" />
            </span>
            <span class="universal-score-breakdown__row-label">{{ row.label }}</span>
          </div>
          <div class="universal-score-breakdown__row-right">
            <span
              v-if="row.valueTone === 'score'"
              class="universal-score-breakdown__score-pill"
              :class="scorePillClass(normalizedItem.score ?? 0)"
            >
              {{ row.value }}
            </span>
            <span
              v-else-if="row.valueTone === 'algorithm'"
              class="universal-score-breakdown__value-pill universal-score-breakdown__value-pill--cool"
            >
              {{ row.value }}
            </span>
            <span
              v-else-if="row.valueTone === 'policy'"
              class="universal-score-breakdown__value-pill universal-score-breakdown__value-pill--neutral"
            >
              {{ row.value }}
            </span>
            <span
              v-else
              :class="[row.valueTone === 'warning' ? 'universal-score-breakdown__value--warning' : '', 'universal-score-breakdown__value-text']"
            >
              {{ row.value }}
            </span>
          </div>
        </div>
      </section>

      <details class="universal-score-breakdown__explanation-card" open>
        <summary>
          <span>
            <Icon icon="mdi:help-circle-outline" /> Detailed Score Calculation
          </span>
        </summary>
        <div class="universal-score-breakdown__explanation-body">
          <div class="universal-score-breakdown__formula-panel">
            <div class="universal-score-breakdown__metric-label">Algorithm: {{ scoringTypeLabel }}</div>
            <div class="universal-score-breakdown__formula-equation">{{ formulaText }}</div>

            <div v-if="calculationSteps.length > 0" class="universal-score-breakdown__calculation-steps">
              <div class="universal-score-breakdown__calculation-step-title">Step-by-Step Calculation:</div>
              <ul class="universal-score-breakdown__calculation-step-list">
                <li v-for="(step, idx) in calculationSteps" :key="idx">
                  <code>{{ step }}</code>
                </li>
              </ul>
            </div>

            <dl class="universal-score-breakdown__variable-list">
              <template v-for="variable in formulaVariables" :key="variable.key">
                <dt>{{ variable.key }}</dt>
                <dd>{{ variable.value }}</dd>
              </template>
            </dl>
          </div>
          <p class="universal-score-breakdown__algorithm-desc">{{ scoringTypeDescription }}</p>
        </div>
      </details>
    </div>

    <template #footer>
      <div class="universal-score-breakdown__footer-actions">
        <button
          type="button"
          class="universal-score-breakdown__button universal-score-breakdown__button--ghost"
          @click="dialogOpen = false"
        >
          Close
        </button>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { SCORING_TYPE_INFO, type ScoringType } from '@/features/dut/types/scoring.types'
import type { ScoreBreakdown } from '@/features/dut-logs/composables/useTestLogUpload'
import AppDialog from '@/shared/ui/dialog/AppDialog.vue'

export interface UniversalScoreBreakdownItem {
  test_item: string
  value?: string | number | null
  usl?: number | null
  lsl?: number | null
  target?: number | null
  deviation?: number | null
  weight?: number | null
  score?: number | null
  scoring_type?: string
  policy?: string | null
  score_breakdown?: ScoreBreakdown | null
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    item?: UniversalScoreBreakdownItem | null
    sourceTitle?: string
    title?: string
    description?: string
  }>(),
  {
    item: null,
    sourceTitle: '',
    title: '',
    description: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isFullscreen = ref(false)

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const dialogTitle = computed(() => {
  if (props.title) return props.title
  if (props.sourceTitle) return `${props.sourceTitle} Score Breakdown`
  return 'Score Breakdown'
})

const dialogDescription = computed(() => {
  if (props.description) return props.description
  return props.item?.test_item ?? 'Score Breakdown'
})

const normalizedItem = computed(() => {
  if (!props.item) return null
  const it = props.item
  const sb = it.score_breakdown

  const usl = it.usl !== null && it.usl !== undefined ? it.usl : (sb?.ucl ?? sb?.usl ?? null)
  const lsl = it.lsl !== null && it.lsl !== undefined ? it.lsl : (sb?.lcl ?? sb?.lsl ?? null)
  const valRaw = it.value !== undefined && it.value !== null ? it.value : (sb?.actual ?? null)
  const valStr = valRaw !== null && valRaw !== undefined ? String(valRaw) : null
  const score =
    it.score !== null && it.score !== undefined ? it.score : (sb?.score ?? sb?.final_score ?? null)
  const scoringType = it.scoring_type || sb?.scoring_type || 'symmetrical'
  const target =
    it.target !== null && it.target !== undefined
      ? it.target
      : (sb?.target ?? sb?.target_used ?? null)
  const deviation =
    it.deviation !== null && it.deviation !== undefined ? it.deviation : (sb?.deviation ?? null)
  const weight = it.weight !== null && it.weight !== undefined ? it.weight : (sb?.weight ?? 1.0)
  const policy = it.policy || sb?.policy || null

  return {
    test_item: it.test_item,
    value: valStr,
    usl,
    lsl,
    score,
    scoring_type: scoringType,
    target,
    deviation,
    weight,
    policy,
  }
})

function formatScoringTypeLabel(type: string): string {
  switch (type) {
    case 'symmetrical':
      return 'Target Centered (Symmetrical)'
    case 'asymmetrical':
      return 'Custom Target (Asymmetrical)'
    case 'per_mask':
      return 'Near Zero (PER/MASK)'
    case 'evm':
      return 'EVM Curve'
    case 'throughput':
      return 'Throughput (LCL-Based)'
    case 'binary':
      return 'Binary (PASS/FAIL)'
    default:
      return type
  }
}

function formatPolicyLabel(policy?: string | null): string {
  if (!policy) return 'Centered'
  switch (policy.toLowerCase()) {
    case 'higher':
      return 'Higher is Better'
    case 'lower':
      return 'Lower is Better'
    default:
      return 'Centered'
  }
}

const scoringTypeLabel = computed(() => {
  return formatScoringTypeLabel(normalizedItem.value?.scoring_type || 'symmetrical')
})

const breakdownRows = computed(() => {
  if (!normalizedItem.value) return []
  const item = normalizedItem.value

  const rows: Array<{
    key: string
    label: string
    value: string
    valueTone?: 'score' | 'algorithm' | 'policy' | 'warning'
  }> = [
    {
      key: 'scoring_type',
      label: 'Scoring Algorithm',
      value: formatScoringTypeLabel(item.scoring_type),
      valueTone: 'algorithm',
    },
  ]

  if (item.usl !== null && item.usl !== undefined) {
    rows.push({ key: 'ucl', label: 'UCL (Upper Limit)', value: String(item.usl) })
  }
  if (item.lsl !== null && item.lsl !== undefined) {
    rows.push({ key: 'lcl', label: 'LCL (Lower Limit)', value: String(item.lsl) })
  }
  if (item.target !== null && item.target !== undefined) {
    rows.push({ key: 'target', label: 'Target', value: item.target.toFixed(4) })
  }
  if (item.value !== null && item.value !== undefined) {
    rows.push({ key: 'actual', label: 'Measured Value', value: String(item.value) })
  }
  if (item.deviation !== null && item.deviation !== undefined) {
    rows.push({
      key: 'deviation',
      label: 'Deviation',
      value: item.deviation.toFixed(4),
      valueTone: Math.abs(item.deviation) > 1 ? 'warning' : undefined,
    })
  }
  if (item.policy) {
    rows.push({
      key: 'policy',
      label: 'Policy',
      value: formatPolicyLabel(item.policy),
      valueTone: 'policy',
    })
  }

  rows.push({ key: 'weight', label: 'Weight', value: String(item.weight ?? 1.0) })
  rows.push({
    key: 'score',
    label: 'Score (0-10)',
    value: item.score !== null && item.score !== undefined ? item.score.toFixed(2) : 'N/A',
    valueTone: 'score',
  })

  return rows
})

function getBreakdownRowIcon(row: { key: string }): string {
  const iconMap: Record<string, string> = {
    scoring_type: 'mdi:function-variant',
    ucl: 'mdi:arrow-collapse-up',
    lcl: 'mdi:arrow-collapse-down',
    target: 'mdi:crosshairs-gps',
    actual: 'mdi:numeric',
    deviation: 'mdi:delta',
    policy: 'mdi:compass-outline',
    weight: 'mdi:weight',
    score: 'mdi:star',
  }
  return iconMap[row.key] || 'mdi:information-outline'
}

function getBreakdownIconClass(row: { key: string }): string {
  const classMap: Record<string, string> = {
    scoring_type: 'universal-score-breakdown__row-icon--purple',
    ucl: 'universal-score-breakdown__row-icon--red',
    lcl: 'universal-score-breakdown__row-icon--orange',
    target: 'universal-score-breakdown__row-icon--green',
    actual: 'universal-score-breakdown__row-icon--blue',
    deviation: 'universal-score-breakdown__row-icon--amber',
    policy: 'universal-score-breakdown__row-icon--muted',
    weight: 'universal-score-breakdown__row-icon--muted',
    score: 'universal-score-breakdown__row-icon--star',
  }
  return classMap[row.key] || 'universal-score-breakdown__row-icon--muted'
}

const formulaText = computed(() => {
  const type = (normalizedItem.value?.scoring_type as ScoringType) || 'binary'
  const latex = SCORING_TYPE_INFO[type]?.formulaLatex
  if (latex) {
    return latex
      .replace(/\\cdot/g, 'x')
      .replace(/\\frac\{L - \|x - T\|\}\{L\}/g, '(L - |x - T|) / L')
      .replace(/\\frac\{L - d\}\{L\}/g, '(L - d) / L')
      .replace(/\\frac\{UCL - x\}\{UCL\}/g, '(UCL - x) / UCL')
      .replace(
        /\\left\(1 - \\frac\{x - ref\}\{UCL - ref\}\\right\)\^\{0\.25\}/g,
        '(1 - (x - ref) / (UCL - ref))^0.25',
      )
      .replace(
        /\\begin\{cases\} 10\.0 & \\text\{STATUS\} = \\text\{PASS\} \\\\ 0\.0 & \\text\{STATUS\} = \\text\{FAIL\} \\end\{cases\}/g,
        '10.0 if STATUS = PASS, 0.0 if STATUS = FAIL',
      )
  }
  const formulas: Record<string, string> = {
    symmetrical: 'Score = 1 + 9 x (L - |x - T|) / L',
    asymmetrical: 'Score = 1 + 9 x (L - d) / L',
    per_mask: 'Score = 1 + 9 x (UCL - x) / UCL',
    evm: 'Score = 1 + 9 x (1 - (x - ref) / (UCL - ref))^0.25',
    throughput: 'Score = 1 + 9 x (x - LCL) / (UCL - LCL)',
    binary: '10.0 if PASS, 0.0 if FAIL',
  }
  return formulas[type] || 'Score calculation based on criteria limits'
})

const formulaVariables = computed(() => {
  const type = (normalizedItem.value?.scoring_type as ScoringType) || 'binary'
  const variables = SCORING_TYPE_INFO[type]?.variables
  if (!variables) return []
  return Object.entries(variables).map(([key, value]) => ({
    key,
    value: value.replace(/\\frac\{UCL \+ LCL\}\{2\}/g, '(UCL + LCL) / 2'),
  }))
})

const scoringTypeDescription = computed(() => {
  const type = normalizedItem.value?.scoring_type
  switch (type) {
    case 'symmetrical':
      return 'Target is centered midpoint between UCL and LCL. Score is 10 at target and scales down to 1 at limits.'
    case 'asymmetrical':
      return 'Custom user target with policy (higher/lower/symmetrical). Deviation is measured from target toward limit.'
    case 'per_mask':
      return 'Near-zero scoring for PER/MASK test items where 0 is ideal and higher values toward UCL decrease the score.'
    case 'evm':
      return 'EVM scoring with exponential decay curve from reference best (-35 dB) toward UCL limit.'
    case 'throughput':
      return 'Throughput scoring where higher values above LCL yield higher scores.'
    case 'binary':
      return 'Simple status check: PASS gives 10.0, FAIL gives 0.0.'
    default:
      return 'Standard criteria-based scoring algorithm.'
  }
})

const calculationSteps = computed<string[]>(() => {
  if (!normalizedItem.value) return []
  const item = normalizedItem.value
  const type = (item.scoring_type as ScoringType) || 'symmetrical'
  const x = item.value !== null ? parseFloat(item.value) : null
  const usl = item.usl
  const lsl = item.lsl
  const target = item.target
  const dev = item.deviation
  const score = item.score

  if (x === null || Number.isNaN(x)) {
    return ['Non-numeric value: Binary PASS/FAIL rules apply']
  }

  const steps: string[] = []

  if (type === 'symmetrical') {
    if (usl !== null && lsl !== null) {
      const T = target ?? (usl + lsl) / 2
      const L = (usl - lsl) / 2
      const d = dev !== null ? Math.abs(dev) : Math.abs(x - T)
      const raw = L > 0 ? 1 + 9 * ((L - d) / L) : 10
      steps.push(`Target T = (${usl} + ${lsl}) / 2 = ${T.toFixed(4)}`)
      steps.push(`Distance to limit L = (${usl} - ${lsl}) / 2 = ${L.toFixed(4)}`)
      steps.push(`Distance to target d = |${x} - ${T.toFixed(4)}| = ${d.toFixed(4)}`)
      steps.push(
        `Raw Score = 1 + 9 x (${L.toFixed(4)} - ${d.toFixed(4)}) / ${L.toFixed(4)} = ${raw.toFixed(4)}`,
      )
      steps.push(
        `Final Score (clamped 0-10) = ${score !== null && score !== undefined ? score.toFixed(2) : Math.max(0, Math.min(10, raw)).toFixed(2)}`,
      )
    }
  } else if (type === 'per_mask') {
    if (usl !== null && usl > 0) {
      const raw = 1 + 9 * ((usl - x) / usl)
      steps.push(`UCL = ${usl}, Measured value x = ${x}`)
      steps.push(`Raw Score = 1 + 9 x (${usl} - ${x}) / ${usl} = ${raw.toFixed(4)}`)
      steps.push(
        `Final Score (clamped 0-10) = ${score !== null && score !== undefined ? score.toFixed(2) : Math.max(0, Math.min(10, raw)).toFixed(2)}`,
      )
    }
  } else if (type === 'evm') {
    if (usl !== null) {
      const ref = -35
      const ratio = (x - ref) / (usl - ref)
      steps.push(`Reference best = ${ref} dB, UCL = ${usl} dB, Measured x = ${x} dB`)
      if (ratio >= 0 && ratio <= 1) {
        const decay = (1 - ratio) ** 0.25
        const raw = 1 + 9 * decay
        steps.push(
          `Normalized ratio = (${x} - (${ref})) / (${usl} - (${ref})) = ${ratio.toFixed(4)}`,
        )
        steps.push(`Decay = (1 - ${ratio.toFixed(4)})^0.25 = ${decay.toFixed(4)}`)
        steps.push(`Score = 1 + 9 x ${decay.toFixed(4)} = ${raw.toFixed(4)}`)
      }
      steps.push(
        `Final Score = ${score !== null && score !== undefined ? score.toFixed(2) : '10.00'}`,
      )
    }
  } else if (type === 'asymmetrical') {
    if (target !== null && (usl !== null || lsl !== null)) {
      const T = target
      const d = dev !== null ? Math.abs(dev) : Math.abs(x - T)
      steps.push(`User Target T = ${T.toFixed(4)}, Measured value x = ${x}`)
      steps.push(`Deviation d = |${x} - ${T.toFixed(4)}| = ${d.toFixed(4)}`)
      steps.push(
        `Final Score = ${score !== null && score !== undefined ? score.toFixed(2) : '10.00'}`,
      )
    }
  } else if (type === 'throughput') {
    if (usl !== null && lsl !== null && usl > lsl) {
      const raw = 1 + 9 * ((x - lsl) / (usl - lsl))
      steps.push(`UCL = ${usl}, LCL = ${lsl}, Measured x = ${x}`)
      steps.push(`Score = 1 + 9 x (${x} - ${lsl}) / (${usl} - ${lsl}) = ${raw.toFixed(4)}`)
      steps.push(
        `Final Score = ${score !== null && score !== undefined ? score.toFixed(2) : Math.max(0, Math.min(10, raw)).toFixed(2)}`,
      )
    }
  } else if (type === 'binary') {
    steps.push(`Status rule: PASS = 10.00, FAIL = 0.00`)
    steps.push(
      `Final Score = ${score !== null && score !== undefined ? score.toFixed(2) : '10.00'}`,
    )
  }

  return steps
})

function scorePillClass(score: number): string {
  if (score >= 9) return 'universal-score-breakdown__score-pill--success'
  if (score >= 7) return 'universal-score-breakdown__score-pill--info'
  if (score >= 6) return 'universal-score-breakdown__score-pill--warning'
  return 'universal-score-breakdown__score-pill--error'
}
</script>

<style scoped>
.universal-score-breakdown__subdialog {
  display: grid;
  gap: 1rem;
}

.universal-score-breakdown__dialog-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.universal-score-breakdown__dialog-title h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--app-ink);
}

.universal-score-breakdown__name-card {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: var(--app-panel);
  border: 1px solid var(--app-border);
}

.universal-score-breakdown__name-text {
  font-family: monospace;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--app-ink);
}

.universal-score-breakdown__rows-container {
  display: grid;
  border: 1px solid var(--app-border);
  border-radius: 0.5rem;
  background: var(--app-panel);
  overflow: hidden;
}

.universal-score-breakdown__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--app-border);
  gap: 1rem;
}

.universal-score-breakdown__row:last-child {
  border-bottom: 0;
}

.universal-score-breakdown__row-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.universal-score-breakdown__row-right {
  display: flex;
  align-items: center;
}

.universal-score-breakdown__row-label {
  font-size: 0.85rem;
  color: var(--app-muted);
}

.universal-score-breakdown__row-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  font-size: 0.95rem;
}

.universal-score-breakdown__row-icon--red { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
.universal-score-breakdown__row-icon--orange { color: #f97316; background: rgba(249, 115, 22, 0.1); }
.universal-score-breakdown__row-icon--blue { color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
.universal-score-breakdown__row-icon--green { color: #10b981; background: rgba(16, 185, 129, 0.1); }
.universal-score-breakdown__row-icon--purple { color: #8b5cf6; background: rgba(139, 92, 246, 0.1); }
.universal-score-breakdown__row-icon--amber { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
.universal-score-breakdown__row-icon--muted { color: var(--app-muted); background: var(--app-surface); }
.universal-score-breakdown__row-icon--star { color: #eab308; background: rgba(234, 179, 8, 0.1); }

.universal-score-breakdown__value-text {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--app-ink);
}

.universal-score-breakdown__value--warning {
  color: #ef4444;
}

.universal-score-breakdown__value-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
}

.universal-score-breakdown__value-pill--cool {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.universal-score-breakdown__value-pill--neutral {
  background: var(--app-surface);
  color: var(--app-muted);
}

.universal-score-breakdown__score-pill {
  border: 0;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.universal-score-breakdown__score-pill--success {
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.universal-score-breakdown__score-pill--info {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.universal-score-breakdown__score-pill--warning {
  background: rgba(184, 118, 38, 0.16);
  color: #8f5314;
}

.universal-score-breakdown__score-pill--error {
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

.universal-score-breakdown__explanation-card {
  padding: 0.75rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: 0.5rem;
  background: var(--app-panel);
}

.universal-score-breakdown__explanation-card summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--app-accent);
  font-size: 0.85rem;
}

.universal-score-breakdown__explanation-body {
  margin-top: 0.75rem;
}

.universal-score-breakdown__formula-panel {
  padding: 0.75rem;
  border-radius: 0.35rem;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
}

.universal-score-breakdown__metric-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--app-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.universal-score-breakdown__formula-equation {
  font-family: monospace;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--app-ink);
  margin-bottom: 0.5rem;
}

.universal-score-breakdown__calculation-steps {
  margin: 0.6rem 0;
  padding: 0.6rem;
  background: var(--app-panel);
  border-radius: 0.35rem;
  border: 1px solid var(--app-border);
}

.universal-score-breakdown__calculation-step-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--app-ink);
  margin-bottom: 0.35rem;
}

.universal-score-breakdown__calculation-step-list {
  margin: 0;
  padding-left: 1.25rem;
  display: grid;
  gap: 0.25rem;
}

.universal-score-breakdown__calculation-step-list li {
  font-size: 0.82rem;
}

.universal-score-breakdown__calculation-step-list code {
  color: var(--app-accent);
  font-family: monospace;
}

.universal-score-breakdown__variable-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 0.75rem;
  font-size: 0.8rem;
  margin: 0;
}

.universal-score-breakdown__variable-list dt {
  font-family: monospace;
  font-weight: 700;
  color: var(--app-accent);
}

.universal-score-breakdown__variable-list dd {
  margin: 0;
  color: var(--app-muted);
}

.universal-score-breakdown__algorithm-desc {
  margin: 0.5rem 0 0;
  font-size: 0.82rem;
  color: var(--app-muted);
  line-height: 1.4;
}

.universal-score-breakdown__footer-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.universal-score-breakdown__button {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-ink);
}
</style>
