<template>
  <AppPanel
    eyebrow="Scoring Gate"
    title="Criteria Configuration"
    description="Set the minimum acceptable criteria score, cap the result list, and optionally attach a custom criteria JSON file."
    tone="warm"
  >
    <div class="criteria-config__grid">
      <label class="criteria-config__field">
        <span>Criteria Score</span>
        <div class="criteria-config__input-row">
          <input v-model.number="criteriaScore" type="number" min="0" max="10" step="0.1" @input="handleScoreChange">
          <span class="criteria-config__pill" :class="scorePillClass(criteriaScore)">{{ criteriaScore.toFixed(1) }}</span>
        </div>
        <small>Minimum score threshold (0-10).</small>
        <small v-if="scoreError" class="criteria-config__error">{{ scoreError }}</small>
      </label>

      <label class="criteria-config__field">
        <span>Results Limit</span>
        <input v-model.number="resultLimit" type="number" min="1" max="100" @input="handleLimitChange">
        <small>Maximum number of results (1-100).</small>
        <small v-if="limitError" class="criteria-config__error">{{ limitError }}</small>
      </label>
    </div>

    <section class="criteria-config__upload-card">
      <div class="criteria-config__upload-header">
        <div>
          <p class="criteria-config__section-eyebrow">Custom File</p>
          <h3>Criteria JSON File</h3>
        </div>
        <button type="button" class="criteria-config__button criteria-config__button--ghost" @click="downloadTemplate">
          Download Template
        </button>
      </div>

      <label class="criteria-config__field">
        <span>Upload custom criteria JSON</span>
        <input type="file" accept=".json,application/json" @change="handleNativeFileChange">
        <small>Upload a custom criteria configuration JSON file.</small>
      </label>

      <div v-if="criteriaFileActual" class="criteria-config__file-strip">
        <div>
          <strong>{{ criteriaFileActual.name }}</strong>
          <span>{{ formatFileSize(criteriaFileActual.size) }}</span>
        </div>
        <button type="button" class="criteria-config__button criteria-config__button--ghost" @click="clearCriteriaFile">
          Remove
        </button>
      </div>
    </section>

    <section v-if="isValid" class="criteria-config__notice criteria-config__notice--success">
      <strong>Criteria configured</strong>
      <span>Score >= {{ criteriaScore.toFixed(1) }}, limit {{ resultLimit }} results<span v-if="criteriaFileActual">, file {{ criteriaFileActual.name }} ({{ formatFileSize(criteriaFileActual.size) }})</span>.</span>
    </section>

    <section v-else-if="showValidation" class="criteria-config__notice criteria-config__notice--warning">
      Please enter a valid criteria score (0-10) and results limit (1-100).
    </section>
  </AppPanel>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AppPanel } from '@/shared'
import { downloadCriteriaJsonTemplate } from '../utils/criteriaTemplate'

interface Props {
  modelValue: {
    criteriaScore: number
    limit: number
    criteriaFile: File | null
  }
  showValidation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showValidation: false,
})

interface Emits {
  (
    e: 'update:modelValue',
    value: {
      criteriaScore: number
      limit: number
      criteriaFile: File | null
    },
  ): void
  (
    e: 'change',
    value: {
      criteriaScore: number
      limit: number
      criteriaFile: File | null
      valid: boolean
    },
  ): void
}

const emit = defineEmits<Emits>()

const criteriaScore = ref<number>(props.modelValue.criteriaScore)
const resultLimit = ref<number>(props.modelValue.limit)
const criteriaFile = ref<File[] | File | null>(null)
const scoreError = ref('')
const limitError = ref('')

if (props.modelValue.criteriaFile) {
  criteriaFile.value = props.modelValue.criteriaFile
}

const criteriaFileActual = computed<File | undefined>(() => {
  if (!criteriaFile.value) return undefined
  if (Array.isArray(criteriaFile.value)) {
    return criteriaFile.value[0]
  }
  return criteriaFile.value
})

const isValid = computed(() => {
  return (
    criteriaScore.value >= 0 &&
    criteriaScore.value <= 10 &&
    resultLimit.value >= 1 &&
    resultLimit.value <= 100
  )
})

function handleScoreChange() {
  scoreError.value = ''

  if (criteriaScore.value < 0 || criteriaScore.value > 10) {
    scoreError.value = 'Score must be between 0 and 10'
  }

  emitChange()
}

function handleLimitChange() {
  limitError.value = ''

  if (resultLimit.value < 1) {
    limitError.value = 'Limit must be at least 1'
  } else if (resultLimit.value > 100) {
    limitError.value = 'Limit cannot exceed 100'
  }

  emitChange()
}

function handleFileChange() {
  emitChange()
}

function handleNativeFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  criteriaFile.value = input.files?.[0] ?? null
  handleFileChange()
}

function clearCriteriaFile() {
  criteriaFile.value = null
  handleFileChange()
}

function emitChange() {
  const file = criteriaFileActual.value || null

  emit('update:modelValue', {
    criteriaScore: criteriaScore.value,
    limit: resultLimit.value,
    criteriaFile: file,
  })

  emit('change', {
    criteriaScore: criteriaScore.value,
    limit: resultLimit.value,
    criteriaFile: file,
    valid: isValid.value,
  })
}

function getScoreColor(score: number): string {
  if (score >= 9) return 'success'
  if (score >= 7) return 'primary'
  if (score >= 5) return 'warning'
  return 'error'
}

function scorePillClass(score: number): string {
  const tone = getScoreColor(score)
  if (tone === 'success') return 'criteria-config__pill--success'
  if (tone === 'primary') return 'criteria-config__pill--primary'
  if (tone === 'warning') return 'criteria-config__pill--warning'
  return 'criteria-config__pill--danger'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`
}

function downloadTemplate() {
  downloadCriteriaJsonTemplate()
}

watch(
  () => props.modelValue,
  (newValue) => {
    criteriaScore.value = newValue.criteriaScore
    resultLimit.value = newValue.limit
    criteriaFile.value = newValue.criteriaFile ?? null
  },
  { deep: true },
)
</script>

<style scoped>
.criteria-config__grid,
.criteria-config__input-row,
.criteria-config__upload-header,
.criteria-config__file-strip,
.criteria-config__button {
  display: flex;
}

.criteria-config__grid,
.criteria-config__upload-card {
  display: grid;
  gap: 1rem;
}

.criteria-config__grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.criteria-config__field {
  display: grid;
  gap: 0.45rem;
}

.criteria-config__field span,
.criteria-config__section-eyebrow {
  color: var(--app-ink);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.criteria-config__field input {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.95rem;
  background: var(--app-panel);
  color: var(--app-ink);
  padding: 0.82rem 0.95rem;
}

.criteria-config__field input:focus {
  outline: none;
  border-color: var(--app-accent);
  box-shadow: 0 0 0 4px var(--app-ring);
}

.criteria-config__field small,
.criteria-config__file-strip span {
  color: var(--app-muted);
}

.criteria-config__input-row {
  align-items: center;
  gap: 0.7rem;
}

.criteria-config__input-row input {
  flex: 1;
}

.criteria-config__pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 700;
}

.criteria-config__pill--success {
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.criteria-config__pill--primary {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.criteria-config__pill--warning {
  background: rgba(184, 118, 38, 0.16);
  color: #8f5314;
}

.criteria-config__pill--danger {
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

.criteria-config__upload-card {
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
  padding: 1rem;
  margin-top: 1rem;
}

.criteria-config__upload-header,
.criteria-config__file-strip {
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.criteria-config__upload-header h3 {
  margin: 0.2rem 0 0;
}

.criteria-config__button {
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-panel);
  color: #4f5d6d;
  cursor: pointer;
  padding: 0.72rem 0.95rem;
  font-weight: 700;
}

.criteria-config__file-strip {
  border: 1px dashed rgba(40, 96, 163, 0.24);
  border-radius: 1rem;
  background: rgba(40, 96, 163, 0.06);
  padding: 0.85rem 1rem;
}

.criteria-config__file-strip strong,
.criteria-config__file-strip span {
  display: block;
}

.criteria-config__notice {
  margin-top: 1rem;
  border-radius: 1rem;
  padding: 0.85rem 1rem;
  display: grid;
  gap: 0.25rem;
}

.criteria-config__notice--success {
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.criteria-config__notice--warning {
  background: rgba(184, 118, 38, 0.16);
  color: #8f5314;
}

.criteria-config__error {
  color: #8f2020;
}

@media (max-width: 720px) {
  .criteria-config__grid {
    grid-template-columns: 1fr;
  }

  .criteria-config__upload-header,
  .criteria-config__file-strip,
  .criteria-config__input-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
