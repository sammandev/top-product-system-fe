<template>
  <AppPanel
    eyebrow="Comparison Strategy"
    title="Comparison Mode"
    description="Choose whether the workflow compares structure, row data, or both, then configure join keys and tolerance rules as needed."
    tone="cool"
  >
    <div class="compare-mode-grid">
      <label v-for="option in modeOptions" :key="option.value" class="compare-mode-card" :class="{ 'compare-mode-card--active': modelValue.mode === option.value }">
        <input :checked="modelValue.mode === option.value" :value="option.value" type="radio" @change="updateMode(option.value)">
        <span>{{ option.label }}</span>
        <small>{{ option.description }}</small>
      </label>
    </div>

    <div v-if="needsJoinKeys" class="compare-mode-section mt-6">
      <div class="compare-mode-divider"></div>

      <div class="compare-mode-section__title">
        <Icon icon="mdi:key" />
        <span>Join Keys Configuration</span>
      </div>

      <div class="compare-mode-notice compare-mode-notice--info mb-4">
        Select the columns to use as join keys for matching rows between the two files. Use stable identifiers such as ID, ISN, or Serial Number.
      </div>

      <div class="compare-mode-join-grid">
        <label class="compare-mode-field">
          <span>File A Join Key</span>
          <div class="compare-mode-field__input">
            <span class="compare-mode-pill compare-mode-pill--a">A</span>
            <select :value="modelValue.joinKeyA" @change="updateJoinKeyA(($event.target as HTMLSelectElement).value)">
              <option value="">Select join key</option>
              <option v-for="column in columnsA" :key="`a-${column}`" :value="column">{{ column }}</option>
            </select>
          </div>
          <small v-if="joinKeyAError" class="compare-mode-field__error">{{ joinKeyAError }}</small>
        </label>

        <label class="compare-mode-field">
          <span>File B Join Key</span>
          <div class="compare-mode-field__input">
            <span class="compare-mode-pill compare-mode-pill--b">B</span>
            <select :value="modelValue.joinKeyB" @change="updateJoinKeyB(($event.target as HTMLSelectElement).value)">
              <option value="">Select join key</option>
              <option v-for="column in columnsB" :key="`b-${column}`" :value="column">{{ column }}</option>
            </select>
          </div>
          <small v-if="joinKeyBError" class="compare-mode-field__error">{{ joinKeyBError }}</small>
        </label>
      </div>

      <div v-if="joinKeysMatched" class="compare-mode-notice compare-mode-notice--success mt-2">
        Join keys configured: <strong>{{ modelValue.joinKeyA }}</strong> ↔ <strong>{{ modelValue.joinKeyB }}</strong>
      </div>

      <div v-else-if="modelValue.joinKeyA || modelValue.joinKeyB" class="compare-mode-notice compare-mode-notice--warning mt-2">
        Both join keys must be selected to compare rows.
      </div>
    </div>

    <div v-if="showAdvancedOptions" class="compare-mode-section mt-6">
      <div class="compare-mode-divider"></div>

      <div class="compare-mode-section__title">
        <Icon icon="mdi:cog" />
        <span>Advanced Options</span>
      </div>

      <label class="compare-mode-toggle">
        <input v-model="caseSensitive" type="checkbox" @change="updateCaseSensitive(caseSensitive)">
        <span>Case-sensitive comparison</span>
      </label>

      <label v-if="needsJoinKeys" class="compare-mode-field mt-3">
        <span>Numeric Tolerance</span>
        <input v-model.number="numericTolerance" min="0" step="0.0001" type="number" @input="updateNumericTolerance(Number(numericTolerance))">
        <small class="compare-mode-field__hint">Tolerance for comparing numeric values. Default is 0.0001.</small>
      </label>
    </div>

    <div class="mt-4">
      <button type="button" class="compare-mode-button" @click="showAdvancedOptions = !showAdvancedOptions">
        <span>{{ showAdvancedOptions ? 'Hide' : 'Show' }} Advanced Options</span>
        <Icon :icon="showAdvancedOptions ? 'mdi:chevron-up' : 'mdi:chevron-down'" />
      </button>
    </div>
  </AppPanel>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { AppPanel } from '@/shared'

// Types
export type ComparisonMode = 'columns' | 'rows' | 'both'

export interface ComparisonConfig {
  mode: ComparisonMode
  joinKeyA: string
  joinKeyB: string
  caseSensitive?: boolean
  numericTolerance?: number
}

// Props
interface Props {
  modelValue: ComparisonConfig
  columnsA: string[]
  columnsB: string[]
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: ComparisonConfig]
}>()

// State
const showAdvancedOptions = ref(false)
const caseSensitive = ref(props.modelValue.caseSensitive ?? false)
const numericTolerance = ref(props.modelValue.numericTolerance ?? 0.0001)
const modeOptions: Array<{ value: ComparisonMode; label: string; description: string }> = [
  {
    value: 'columns',
    label: 'Compare Columns',
    description: 'Check structure differences between the two files.',
  },
  {
    value: 'rows',
    label: 'Compare Rows',
    description: 'Match data rows using join keys and compare values.',
  },
  {
    value: 'both',
    label: 'Compare Both',
    description: 'Run the structure and data comparison in one pass.',
  },
]

// Computed
const needsJoinKeys = computed(() => {
  return props.modelValue.mode === 'rows' || props.modelValue.mode === 'both'
})

const joinKeysMatched = computed(() => {
  return needsJoinKeys.value && props.modelValue.joinKeyA && props.modelValue.joinKeyB
})

const joinKeyAError = computed(() => {
  if (needsJoinKeys.value && !props.modelValue.joinKeyA) {
    return 'Join key is required for row comparison'
  }
  return undefined
})

const joinKeyBError = computed(() => {
  if (needsJoinKeys.value && !props.modelValue.joinKeyB) {
    return 'Join key is required for row comparison'
  }
  return undefined
})

// Methods
function updateMode(mode: ComparisonMode) {
  emit('update:modelValue', {
    ...props.modelValue,
    mode,
  })
}

function updateJoinKeyA(value: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    joinKeyA: value,
  })
}

function updateJoinKeyB(value: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    joinKeyB: value,
  })
}

function updateCaseSensitive(value: boolean) {
  emit('update:modelValue', {
    ...props.modelValue,
    caseSensitive: value,
  })
}

function updateNumericTolerance(value: number) {
  emit('update:modelValue', {
    ...props.modelValue,
    numericTolerance: value,
  })
}
</script>

<style scoped>
.compare-mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 0.9rem;
}

.compare-mode-card {
  display: grid;
  gap: 0.3rem;
  border: 1px solid var(--app-border);
  border-radius: 1.15rem;
  background: var(--app-panel);
  padding: 1rem;
  cursor: pointer;
  box-shadow: var(--app-shadow-soft);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.compare-mode-card input {
  position: absolute;
  opacity: 0;
}

.compare-mode-card span {
  color: var(--app-ink);
  font-weight: 700;
}

.compare-mode-card small {
  color: var(--app-muted);
  line-height: 1.55;
}

.compare-mode-card--active {
  border-color: var(--app-accent);
  background: linear-gradient(180deg, rgba(15, 118, 110, 0.08), var(--app-panel));
  box-shadow: 0 0 0 4px var(--app-ring);
  transform: translateY(-1px);
}

.compare-mode-section__title,
.compare-mode-field__input,
.compare-mode-toggle,
.compare-mode-button,
.compare-mode-pill {
  display: flex;
}

.compare-mode-section__title {
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.75rem;
  color: var(--app-ink);
  font-size: 0.95rem;
  font-weight: 700;
}

.compare-mode-divider {
  height: 1px;
  background: var(--app-border);
  margin-bottom: 1rem;
}

.compare-mode-join-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1rem;
}

.compare-mode-field {
  display: grid;
  gap: 0.45rem;
}

.compare-mode-field > span {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  color: var(--app-muted);
}

.compare-mode-field__input,
.compare-mode-field input {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
  color: var(--app-ink);
  box-shadow: var(--app-shadow-soft);
}

.compare-mode-field__input {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.85rem;
}

.compare-mode-field__input select,
.compare-mode-field input {
  border: 0;
  background: transparent;
  padding: 0.1rem;
  width: 100%;
  color: var(--app-ink);
}

.compare-mode-field__input select:focus,
.compare-mode-field input:focus {
  outline: none;
}

.compare-mode-field__error {
  color: var(--app-danger);
  font-size: 0.8rem;
}

.compare-mode-field__hint {
  color: var(--app-muted);
  font-size: 0.82rem;
}

.compare-mode-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: var(--app-ink);
  font-weight: 600;
}

.compare-mode-toggle input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--app-accent);
}

.compare-mode-pill {
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 700;
}

.compare-mode-pill--a {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.compare-mode-pill--b {
  background: rgba(198, 110, 39, 0.14);
  color: #8d4b12;
}

.compare-mode-notice {
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  padding: 0.9rem 1rem;
  box-shadow: var(--app-shadow-soft);
  line-height: 1.55;
}

.compare-mode-notice--info {
  background: var(--app-panel);
}

.compare-mode-notice--success {
  background: rgba(15, 118, 110, 0.06);
}

.compare-mode-notice--warning {
  background: rgba(245, 168, 71, 0.1);
}

.compare-mode-button {
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-panel);
  color: var(--app-ink);
  cursor: pointer;
  padding: 0.72rem 0.95rem;
  font-weight: 700;
}

@media (max-width: 720px) {
  .compare-mode-grid,
  .compare-mode-join-grid {
    grid-template-columns: 1fr;
  }
}
</style>
