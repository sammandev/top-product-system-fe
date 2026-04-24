<template>
  <AppDialog
    :modelValue="modelValue"
    width="min(96vw, 88rem)"
    :breakpoints="{ '1200px': '96vw', '760px': '98vw' }"
    persistent
    title="Spec Builder"
    description="Create a custom JSON or INI specification for MasterControl analysis."
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <template #header-actions>
      <div class="spec-builder__toggle-group" role="tablist" aria-label="Specification format">
        <button
          type="button"
          class="spec-builder__toggle"
          :class="{ 'spec-builder__toggle--active': specFormat === 'json' }"
          @click="specFormat = 'json'"
        >
          <Icon icon="mdi:code-json" />
          <span>JSON</span>
        </button>
        <button
          type="button"
          class="spec-builder__toggle"
          :class="{ 'spec-builder__toggle--active': specFormat === 'ini' }"
          @click="specFormat = 'ini'"
        >
          <Icon icon="mdi:file-document" />
          <span>INI</span>
        </button>
      </div>
    </template>

    <div class="spec-builder">
      <section class="spec-builder__column spec-builder__column--editor">
        <article class="spec-builder__panel">
          <header class="spec-builder__panel-header">
            <div>
              <p class="spec-builder__eyebrow">Rule Editor</p>
              <h3>Add or Update Rule</h3>
            </div>
            <Icon icon="mdi:plus-circle-outline" />
          </header>

          <div class="spec-builder__fields">
            <label class="spec-builder__field spec-builder__field--full">
              <span>Test Item Pattern</span>
              <div class="spec-builder__input-shell">
                <Icon icon="mdi:text-search" />
                <input
                  v-model="currentRule.testItem"
                  type="text"
                  :placeholder="specFormat === 'json' ? 'e.g., TX_POW_2412_11B_CCK11_B20 or TX_.*_POW_.*' : 'e.g., WiFi_TX._POW_.*'"
                />
                <button v-if="currentRule.testItem" type="button" class="spec-builder__clear-action" @click="currentRule.testItem = ''">
                  Clear
                </button>
              </div>
              <small>{{ specFormat === 'json' ? 'Pattern supports exact strings or regex-like test item matching.' : 'INI output preserves the same matching pattern.' }}</small>
            </label>

            <label class="spec-builder__field">
              <span>USL</span>
              <div class="spec-builder__input-shell">
                <Icon icon="mdi:arrow-up-bold" />
                <input v-model.number="currentRule.usl" type="number" placeholder="Maximum allowed value" />
              </div>
              <small>Upper spec limit.</small>
            </label>

            <label class="spec-builder__field">
              <span>LSL</span>
              <div class="spec-builder__input-shell">
                <Icon icon="mdi:arrow-down-bold" />
                <input v-model.number="currentRule.lsl" type="number" placeholder="Minimum allowed value" />
              </div>
              <small>Lower spec limit.</small>
            </label>

            <label class="spec-builder__field">
              <span>Target</span>
              <div class="spec-builder__input-shell">
                <Icon icon="mdi:target" />
                <input v-model.number="currentRule.target" type="number" placeholder="Optional ideal value" />
              </div>
              <small>Leave empty to use midpoint logic.</small>
            </label>

            <label class="spec-builder__field">
              <span>Gap / Margin</span>
              <div class="spec-builder__input-shell">
                <Icon icon="mdi:delta" />
                <input v-model.number="currentRule.gap" type="number" placeholder="Warning threshold" />
              </div>
              <small>Threshold for warning or margin states.</small>
            </label>
          </div>

          <div class="spec-builder__actions">
            <button
              type="button"
              class="spec-builder__button spec-builder__button--primary"
              :disabled="!canAddRule"
              @click="addRule"
            >
              <Icon icon="mdi:plus" />
              <span>{{ editingIndex !== null ? 'Update Rule' : 'Add Rule' }}</span>
            </button>
            <button type="button" class="spec-builder__button spec-builder__button--ghost" @click="resetCurrentRule">
              <Icon icon="mdi:cancel" />
              <span>Clear</span>
            </button>
          </div>
        </article>

        <article class="spec-builder__panel">
          <header class="spec-builder__panel-header">
            <div>
              <p class="spec-builder__eyebrow">Rules</p>
              <h3>{{ rules.length }} configured</h3>
            </div>
            <button
              v-if="rules.length > 0"
              type="button"
              class="spec-builder__button spec-builder__button--danger-ghost spec-builder__button--small"
              @click="clearAllRules"
            >
              <Icon icon="mdi:delete-sweep" />
              <span>Clear All</span>
            </button>
          </header>

          <div v-if="rules.length > 0" class="spec-builder__rule-list">
            <article
              v-for="(rule, index) in rules"
              :key="index"
              class="spec-builder__rule-item"
              :class="{ 'spec-builder__rule-item--active': editingIndex === index }"
            >
              <div class="spec-builder__rule-copy">
                <div class="spec-builder__rule-title">
                  <Icon icon="mdi:file-document-outline" />
                  <strong>{{ rule.testItem }}</strong>
                </div>
                <p>USL: {{ formatValue(rule.usl) }} | LSL: {{ formatValue(rule.lsl) }} | Target: {{ formatValue(rule.target) }} | Gap: {{ formatValue(rule.gap) }}</p>
              </div>

              <div class="spec-builder__rule-actions">
                <button type="button" class="spec-builder__icon-button" aria-label="Edit rule" @click="editRule(index)">
                  <Icon icon="mdi:pencil" />
                </button>
                <button type="button" class="spec-builder__icon-button spec-builder__icon-button--danger" aria-label="Delete rule" @click="removeRule(index)">
                  <Icon icon="mdi:delete" />
                </button>
              </div>
            </article>
          </div>

          <div v-else class="spec-builder__empty-state">
            <Icon icon="mdi:playlist-remove" />
            <p>No rules added yet. Start with a test item pattern and at least one spec limit.</p>
          </div>
        </article>
      </section>

      <section class="spec-builder__column spec-builder__column--preview">
        <article class="spec-builder__panel spec-builder__panel--sticky">
          <header class="spec-builder__panel-header">
            <div>
              <p class="spec-builder__eyebrow">Preview</p>
              <h3>{{ specFormat === 'json' ? 'JSON' : 'INI' }} file output</h3>
            </div>
            <Icon icon="mdi:eye" />
          </header>

          <textarea :value="specPreview" readonly rows="30" class="spec-builder__preview" />
        </article>
      </section>
    </div>

    <template #footer>
      <div class="spec-builder__footer">
        <button type="button" class="spec-builder__button spec-builder__button--info-ghost" @click="downloadTemplate">
          <Icon icon="mdi:download" />
          <span>Download Empty Template</span>
        </button>
        <button
          type="button"
          class="spec-builder__button spec-builder__button--success"
          :disabled="rules.length === 0"
          @click="downloadSpecFile"
        >
          <Icon icon="mdi:download" />
          <span>Download Spec File</span>
        </button>
        <button
          type="button"
          class="spec-builder__button spec-builder__button--primary"
          :disabled="rules.length === 0"
          @click="saveAndUse"
        >
          <Icon icon="mdi:check" />
          <span>Save & Use in Analysis</span>
        </button>
        <button type="button" class="spec-builder__button spec-builder__button--ghost spec-builder__footer-cancel" @click="handleClose">
          Cancel
        </button>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { AppDialog } from '@/shared'
import { downloadIniSpecTemplate, downloadJsonSpecTemplate } from '../utils/templates'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'spec-created': [file: File, format: 'json' | 'ini']
}>()

interface SpecRule {
  testItem: string // test_pattern in JSON
  usl: number | null
  lsl: number | null
  target: number | null
  gap: number | null
}

// State
const specFormat = ref<'json' | 'ini'>('json')
const rules = ref<SpecRule[]>([])
const currentRule = ref<SpecRule>({
  testItem: '',
  usl: null,
  lsl: null,
  target: null,
  gap: null,
})
const editingIndex = ref<number | null>(null)

// Computed
const canAddRule = computed(() => {
  return (
    currentRule.value.testItem.trim().length > 0 &&
    (currentRule.value.usl !== null || currentRule.value.lsl !== null)
  )
})

const specPreview = computed(() => {
  if (specFormat.value === 'json') {
    return generateJsonPreview()
  } else {
    return generateIniPreview()
  }
})

// Methods
function generateJsonPreview(): string {
  const spec = rules.value.map((rule) => ({
    test_pattern: rule.testItem,
    usl: rule.usl ?? 0,
    lsl: rule.lsl ?? 0,
    target: rule.target ?? 0,
    gap: rule.gap ?? 0,
  }))
  return JSON.stringify(spec, null, 2)
}

function generateIniPreview(): string {
  let content = `; MasterControl Multi-DUT Analysis Criteria File
; =================================================
; Format: "PATTERN" <USL,LSL,Target,Gap>
;
; PATTERN - Test item pattern to match (supports regex)
; USL     - Upper Spec Limit
; LSL     - Lower Spec Limit
; Target  - Target value (use 0 for auto-calculate)
; Gap     - Margin/Gap threshold for warnings
; =================================================

[Test_Items]
`

  rules.value.forEach((rule) => {
    const usl = rule.usl !== null ? rule.usl.toString() : ''
    const lsl = rule.lsl !== null ? rule.lsl.toString() : ''
    const target = rule.target !== null ? rule.target.toString() : '0'
    const gap = rule.gap !== null && rule.gap !== undefined ? rule.gap.toString() : '0'
    content += `"${rule.testItem}" <${usl},${lsl},${target},${gap}>\n`
  })

  return content
}

function formatValue(value: number | null | undefined): string {
  return value !== null && value !== undefined ? value.toString() : 'N/A'
}

function addRule() {
  if (!canAddRule.value) return

  const rule: SpecRule = {
    testItem: currentRule.value.testItem.trim(),
    usl: currentRule.value.usl,
    lsl: currentRule.value.lsl,
    target: currentRule.value.target,
    gap: currentRule.value.gap,
  }

  if (editingIndex.value !== null) {
    rules.value[editingIndex.value] = rule
    editingIndex.value = null
  } else {
    rules.value.push(rule)
  }

  resetCurrentRule()
}

function editRule(index: number) {
  const rule = rules.value[index]
  if (!rule) return

  currentRule.value = {
    testItem: rule.testItem,
    usl: rule.usl,
    lsl: rule.lsl,
    target: rule.target,
    gap: rule.gap,
  }
  editingIndex.value = index
}

function removeRule(index: number) {
  rules.value.splice(index, 1)
  if (editingIndex.value === index) {
    resetCurrentRule()
  }
}

function clearAllRules() {
  if (confirm('Are you sure you want to clear all rules?')) {
    rules.value = []
    resetCurrentRule()
  }
}

function resetCurrentRule() {
  currentRule.value = {
    testItem: '',
    usl: null,
    lsl: null,
    target: null,
    gap: null,
  }
  editingIndex.value = null
}

function downloadTemplate() {
  if (specFormat.value === 'json') {
    downloadJsonSpecTemplate()
  } else {
    downloadIniSpecTemplate()
  }
}

function downloadSpecFile() {
  const content = specPreview.value
  const blob = new Blob([content], {
    type: specFormat.value === 'json' ? 'application/json' : 'text/plain',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `custom_spec.${specFormat.value}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function saveAndUse() {
  const content = specPreview.value
  const blob = new Blob([content], {
    type: specFormat.value === 'json' ? 'application/json' : 'text/plain',
  })
  const file = new File([blob], `custom_spec.${specFormat.value}`, {
    type: specFormat.value === 'json' ? 'application/json' : 'text/plain',
  })
  emit('spec-created', file, specFormat.value)
  handleClose()
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.spec-builder {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(22rem, 0.92fr);
  gap: 1rem;
}

.spec-builder__column {
  display: grid;
  gap: 1rem;
}

.spec-builder__header,
.spec-builder__header-copy,
.spec-builder__header-actions,
.spec-builder__panel-header,
.spec-builder__actions,
.spec-builder__footer,
.spec-builder__rule-title,
.spec-builder__rule-actions,
.spec-builder__button,
.spec-builder__toggle,
.spec-builder__icon-button,
.spec-builder__input-shell,
.spec-builder__clear-action {
  display: inline-flex;
  align-items: center;
}

.spec-builder__header,
.spec-builder__panel-header,
.spec-builder__rule-item,
.spec-builder__footer {
  justify-content: space-between;
}

.spec-builder__header {
  gap: 1rem;
  width: 100%;
}

.spec-builder__header-copy {
  gap: 1rem;
  align-items: flex-start;
}

.spec-builder__header-copy h2,
.spec-builder__panel-header h3 {
  margin: 0;
}

.spec-builder__header-copy p,
.spec-builder__panel-header p,
.spec-builder__field small,
.spec-builder__rule-copy p,
.spec-builder__empty-state p {
  margin: 0.25rem 0 0;
  color: var(--app-muted);
  line-height: 1.5;
}

.spec-builder__header-icon,
.spec-builder__panel-header > svg,
.spec-builder__empty-state > svg {
  display: grid;
  place-items: center;
}

.spec-builder__header-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.18), rgba(45, 212, 191, 0.2));
  color: var(--app-accent);
  font-size: 1.55rem;
}

.spec-builder__header-actions,
.spec-builder__toggle-group,
.spec-builder__actions,
.spec-builder__rule-actions,
.spec-builder__footer {
  gap: 0.65rem;
  flex-wrap: wrap;
}

.spec-builder__toggle {
  gap: 0.45rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  padding: 0.6rem 0.9rem;
  background: var(--app-panel);
  color: var(--app-ink);
  cursor: pointer;
  font-weight: 700;
}

.spec-builder__toggle--active {
  background: #1f4e86;
  border-color: #1f4e86;
  color: #f8f3ec;
}

.spec-builder__panel {
  border: 1px solid var(--app-border);
  border-radius: 1.25rem;
  background: var(--app-panel);
  box-shadow: var(--app-shadow-soft);
  padding: 1rem;
  display: grid;
  gap: 1rem;
}

.spec-builder__panel--sticky {
  position: sticky;
  top: 0;
}

.spec-builder__eyebrow {
  margin: 0 0 0.2rem;
  color: var(--app-accent);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.spec-builder__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.spec-builder__field {
  display: grid;
  gap: 0.4rem;
}

.spec-builder__field--full {
  grid-column: 1 / -1;
}

.spec-builder__field > span {
  font-weight: 700;
  color: var(--app-ink);
}

.spec-builder__input-shell {
  gap: 0.5rem;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.72rem 0.85rem;
}

.spec-builder__input-shell svg {
  color: var(--app-muted);
  flex-shrink: 0;
}

.spec-builder__input-shell input {
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--app-ink);
  font: inherit;
}

.spec-builder__clear-action {
  justify-content: center;
  border: 0;
  background: transparent;
  color: var(--app-accent);
  cursor: pointer;
  font-weight: 700;
}

.spec-builder__button,
.spec-builder__icon-button {
  justify-content: center;
  gap: 0.45rem;
  border-radius: 999px;
  border: 1px solid var(--app-border);
  padding: 0.78rem 1rem;
  background: var(--app-panel);
  color: var(--app-ink);
  cursor: pointer;
  font-weight: 700;
}

.spec-builder__button:disabled,
.spec-builder__icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.64;
}

.spec-builder__button--small {
  padding: 0.62rem 0.85rem;
  font-size: 0.85rem;
}

.spec-builder__button--primary {
  background: #1f4e86;
  border-color: #1f4e86;
  color: #f8f3ec;
}

.spec-builder__button--success {
  background: var(--app-accent);
  border-color: var(--app-accent);
  color: #f8f3ec;
}

.spec-builder__button--ghost {
  background: var(--app-panel);
}

.spec-builder__button--info-ghost {
  background: rgba(20, 113, 153, 0.08);
  border-color: rgba(20, 113, 153, 0.24);
  color: #0f6c92;
}

.spec-builder__button--danger-ghost,
.spec-builder__icon-button--danger {
  background: rgba(163, 61, 45, 0.08);
  border-color: rgba(163, 61, 45, 0.24);
  color: #a33d2d;
}

.spec-builder__rule-list {
  display: grid;
  gap: 0.75rem;
  max-height: 26rem;
  overflow-y: auto;
  padding-right: 0.15rem;
}

.spec-builder__rule-item {
  display: flex;
  gap: 0.9rem;
  align-items: flex-start;
  border: 1px solid rgba(15, 118, 110, 0.1);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.7);
  padding: 0.85rem 0.95rem;
}

.spec-builder__rule-item--active {
  border-color: rgba(31, 78, 134, 0.28);
  background: rgba(31, 78, 134, 0.08);
}

.spec-builder__rule-copy {
  display: grid;
  gap: 0.2rem;
  flex: 1;
}

.spec-builder__rule-title {
  gap: 0.45rem;
  font-weight: 700;
  color: var(--app-ink);
}

.spec-builder__empty-state {
  display: grid;
  place-items: center;
  gap: 0.5rem;
  min-height: 12rem;
  text-align: center;
  border: 1px dashed rgba(15, 118, 110, 0.2);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.56);
  padding: 1rem;
}

.spec-builder__empty-state > svg {
  font-size: 1.5rem;
  color: var(--app-muted);
}

.spec-builder__preview {
  width: 100%;
  min-height: 32rem;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.9);
  padding: 1rem;
  color: var(--app-ink);
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.55;
  resize: vertical;
}

.spec-builder__footer-cancel {
  margin-left: auto;
}

@media (max-width: 1100px) {
  .spec-builder {
    grid-template-columns: 1fr;
  }

  .spec-builder__panel--sticky {
    position: static;
  }
}

@media (max-width: 760px) {
  .spec-builder__header,
  .spec-builder__panel-header,
  .spec-builder__rule-item {
    flex-direction: column;
  }

  .spec-builder__fields {
    grid-template-columns: 1fr;
  }

  .spec-builder__footer-cancel {
    margin-left: 0;
  }
}
</style>
