<template>
  <AppDialog :model-value="modelValue" width="min(94vw, 76rem)" :breakpoints="{ '1100px': '96vw', '760px': '98vw' }"
    persistent title="Criteria Builder"
    description="Build upload-log criteria rules, preview the JSON output, and immediately reuse the generated file."
    @update:modelValue="emit('update:modelValue', $event)">

    <div class="criteria-builder-dialog__grid">
      <div class="criteria-builder-dialog__stack">
        <AppPanel eyebrow="Rule Editor" title="Add Or Edit Rule" tone="cool" compact-header>
          <div class="criteria-builder-dialog__form-grid">
            <label class="criteria-builder-dialog__field criteria-builder-dialog__field--wide">
              <span>Test Item Pattern</span>
              <input v-model="currentRule.testItem" type="text" placeholder="e.g., WiFi_PA1_.*" />
              <small>Enter a test item name or regex pattern.</small>
            </label>

            <label class="criteria-builder-dialog__field">
              <span>UCL</span>
              <input v-model="currentRule.ucl" type="text" placeholder="Upper criteria limit" />
              <small>Leave empty if no upper limit applies.</small>
            </label>

            <label class="criteria-builder-dialog__field">
              <span>LCL</span>
              <input v-model="currentRule.lcl" type="text" placeholder="Lower criteria limit" />
              <small>Leave empty if no lower limit applies.</small>
            </label>

            <label class="criteria-builder-dialog__field criteria-builder-dialog__field--wide">
              <span>Target</span>
              <input v-model="currentRule.target" type="text" placeholder="Optional explicit target value" />
              <small>Leave empty to use the median or midpoint.</small>
            </label>
          </div>

          <div class="criteria-builder-dialog__actions">
            <button type="button" class="criteria-builder-dialog__button criteria-builder-dialog__button--primary"
              :disabled="!canAddRule" @click="addRule">
              {{ editingIndex !== null ? 'Update' : 'Add' }} Rule
            </button>
            <button type="button" class="criteria-builder-dialog__button criteria-builder-dialog__button--ghost"
              @click="resetCurrentRule">
              Clear
            </button>
          </div>
        </AppPanel>

        <AppPanel eyebrow="Rule Set" :title="`Rules (${rules.length})`" tone="warm" compact-header>
          <div v-if="rules.length > 0" class="criteria-builder-dialog__rule-list">
            <article v-for="(rule, index) in rules" :key="index" class="criteria-builder-dialog__rule-card"
              :class="{ 'is-editing': editingIndex === index }">
              <div class="criteria-builder-dialog__rule-copy">
                <strong>{{ rule.testItem }}</strong>
                <span>UCL: {{ formatValue(rule.ucl) }} | LCL: {{ formatValue(rule.lcl) }} | Target: {{ formatValue(rule.target) }}</span>
              </div>
              <div class="criteria-builder-dialog__rule-actions">
                <button type="button" class="criteria-builder-dialog__button criteria-builder-dialog__button--ghost"
                  @click="editRule(index)">
                  Edit
                </button>
                <button type="button" class="criteria-builder-dialog__button criteria-builder-dialog__button--danger"
                  @click="removeRule(index)">
                  Remove
                </button>
              </div>
            </article>
          </div>
          <div v-else class="criteria-builder-dialog__empty-state">
            No rules added yet. Add your first rule above.
          </div>
        </AppPanel>
      </div>

      <AppPanel eyebrow="Generated Payload" title="JSON Preview" tone="success" compact-header>
        <textarea class="criteria-builder-dialog__preview" :value="jsonPreview" readonly rows="25"></textarea>
      </AppPanel>
    </div>

    <template #footer>
      <div class="criteria-builder-dialog__footer">
        <button type="button" class="criteria-builder-dialog__button criteria-builder-dialog__button--success"
          :disabled="rules.length === 0" @click="downloadFile">
          Download JSON File
        </button>
        <button type="button" class="criteria-builder-dialog__button criteria-builder-dialog__button--primary"
          :disabled="rules.length === 0" @click="saveAndUse">
          Save & Use
        </button>
        <button type="button" class="criteria-builder-dialog__button criteria-builder-dialog__button--ghost"
          @click="handleClose">
          Cancel
        </button>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { AppDialog, AppPanel } from '@/shared'
import {
  buildUploadLogCriteriaJson,
  type UploadLogCriteriaRule,
} from '../utils/criteriaTemplate'

const props = defineProps<{
  modelValue: boolean
  availableTestItems?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'criteria-created': [file: File]
}>()

// UPDATED: Interface with UCL/LCL naming
interface CriteriaRule {
  testItem: string
  ucl: string
  lcl: string
  target: string
}

// State
const rules = ref<CriteriaRule[]>([])
const currentRule = ref<CriteriaRule>({
  testItem: '',
  ucl: '',
  lcl: '',
  target: '',
})
const editingIndex = ref<number | null>(null)

// Available test items for autocomplete
// const availableTestItems = computed(() => props.availableTestItems || [])

// Computed
const canAddRule = computed(() => {
  return currentRule.value.testItem.trim().length > 0
})

// JSON preview
const jsonPreview = computed(() => {
  const criteria: UploadLogCriteriaRule[] = rules.value.map((rule) => ({
    test_item: rule.testItem,
    ucl: rule.ucl,
    lcl: rule.lcl,
    target: rule.target,
  }))
  return buildUploadLogCriteriaJson(criteria)
})

// Methods
const formatValue = (value: string): string => {
  return value.trim() !== '' ? value : 'N/A'
}

const addRule = () => {
  if (!canAddRule.value) return

  const rule: CriteriaRule = {
    testItem: currentRule.value.testItem.trim(),
    ucl: currentRule.value.ucl,
    lcl: currentRule.value.lcl,
    target: currentRule.value.target,
  }

  if (editingIndex.value !== null) {
    // Update existing rule
    rules.value[editingIndex.value] = rule
    editingIndex.value = null
  } else {
    // Add new rule
    rules.value.push(rule)
  }

  resetCurrentRule()
}

const editRule = (index: number) => {
  const rule = rules.value[index]
  if (!rule) return

  currentRule.value = {
    testItem: rule.testItem,
    ucl: rule.ucl,
    lcl: rule.lcl,
    target: rule.target,
  }
  editingIndex.value = index
}

const removeRule = (index: number) => {
  rules.value.splice(index, 1)
  if (editingIndex.value === index) {
    resetCurrentRule()
  }
}

const resetCurrentRule = () => {
  currentRule.value = {
    testItem: '',
    ucl: '',
    lcl: '',
    target: '',
  }
  editingIndex.value = null
}

// Download JSON file
const downloadFile = () => {
  const content = jsonPreview.value
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'criteria_upload_log.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Save and use JSON file
const saveAndUse = () => {
  const content = jsonPreview.value
  const blob = new Blob([content], { type: 'application/json' })
  const file = new File([blob], 'criteria_upload_log.json', { type: 'application/json' })
  emit('criteria-created', file)
  handleClose()
}

const handleClose = () => {
  resetCurrentRule()
  emit('update:modelValue', false)
}
</script>

<style scoped>
.criteria-builder-dialog__header,
.criteria-builder-dialog__header-copy,
.criteria-builder-dialog__grid,
.criteria-builder-dialog__stack,
.criteria-builder-dialog__form-grid,
.criteria-builder-dialog__actions,
.criteria-builder-dialog__rule-card,
.criteria-builder-dialog__rule-actions,
.criteria-builder-dialog__footer {
  display: flex;
}

.criteria-builder-dialog__header,
.criteria-builder-dialog__rule-card,
.criteria-builder-dialog__footer {
  justify-content: space-between;
  gap: 1rem;
}

.criteria-builder-dialog__header-copy,
.criteria-builder-dialog__actions,
.criteria-builder-dialog__rule-actions,
.criteria-builder-dialog__footer {
  align-items: center;
}

.criteria-builder-dialog__header-copy {
  gap: 0.85rem;
}

.criteria-builder-dialog__header-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 999px;
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.criteria-builder-dialog__eyebrow {
  margin: 0;
  color: var(--app-muted);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.criteria-builder-dialog__header h2 {
  margin: 0.2rem 0 0;
}

.criteria-builder-dialog__header span:last-child {
  color: var(--app-muted);
}

.criteria-builder-dialog__icon-button,
.criteria-builder-dialog__button {
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-panel);
  color: var(--app-ink);
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
}

.criteria-builder-dialog__icon-button:hover,
.criteria-builder-dialog__button:hover {
  transform: translateY(-1px);
}

.criteria-builder-dialog__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.6rem;
  height: 2.6rem;
}

.criteria-builder-dialog__grid {
  gap: 1rem;
  align-items: stretch;
}

.criteria-builder-dialog__stack {
  flex: 1;
  flex-direction: column;
  gap: 1rem;
}

.criteria-builder-dialog__grid > :last-child {
  flex: 1;
}

.criteria-builder-dialog__form-grid {
  gap: 0.9rem;
  flex-wrap: wrap;
}

.criteria-builder-dialog__field {
  display: grid;
  gap: 0.45rem;
  flex: 1 1 calc(50% - 0.5rem);
}

.criteria-builder-dialog__field--wide {
  flex-basis: 100%;
}

.criteria-builder-dialog__field span {
  color: var(--app-ink);
  font-size: 0.82rem;
  font-weight: 700;
}

.criteria-builder-dialog__field input,
.criteria-builder-dialog__preview {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  background: var(--app-panel);
  color: var(--app-ink);
  padding: 0.82rem 0.95rem;
}

.criteria-builder-dialog__field small {
  color: var(--app-muted);
}

.criteria-builder-dialog__actions,
.criteria-builder-dialog__footer {
  gap: 0.7rem;
  flex-wrap: wrap;
}

.criteria-builder-dialog__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  font-weight: 700;
}

.criteria-builder-dialog__button--primary {
  border-color: rgba(40, 96, 163, 0.22);
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.criteria-builder-dialog__button--success {
  border-color: rgba(15, 118, 110, 0.22);
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.criteria-builder-dialog__button--danger {
  border-color: rgba(189, 64, 64, 0.22);
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

.criteria-builder-dialog__button--ghost {
  color: #4f5d6d;
}

.criteria-builder-dialog__rule-list {
  display: grid;
  gap: 0.75rem;
}

.criteria-builder-dialog__rule-card {
  align-items: flex-start;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
  padding: 0.85rem 1rem;
}

.criteria-builder-dialog__rule-card.is-editing {
  border-color: rgba(40, 96, 163, 0.28);
  background: rgba(40, 96, 163, 0.08);
}

.criteria-builder-dialog__rule-copy {
  display: grid;
  gap: 0.25rem;
}

.criteria-builder-dialog__rule-copy strong {
  color: var(--app-ink);
}

.criteria-builder-dialog__rule-copy span,
.criteria-builder-dialog__empty-state {
  color: var(--app-muted);
}

.criteria-builder-dialog__preview {
  min-height: 32rem;
  resize: vertical;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.45;
}

@media (max-width: 960px) {
  .criteria-builder-dialog__grid,
  .criteria-builder-dialog__header,
  .criteria-builder-dialog__rule-card {
    flex-direction: column;
    align-items: stretch;
  }

  .criteria-builder-dialog__field {
    flex-basis: 100%;
  }
}
</style>
