<template>
  <AppPanel title="DUT ISN Search" eyebrow="Input" description="Add DUT serials one by one or paste a batch, then refine the optional site and model hints emitted to the parent flow." tone="cool">
    <div class="dut-isn-input__stack">
      <div class="dut-isn-input__toggle-row">
        <button
          type="button"
          class="dut-isn-input__toggle-chip"
          :class="{ 'is-active': inputMode === 'multiple' }"
          @click="inputMode = 'multiple'"
        >
          ISN Search
        </button>
        <button
          type="button"
          class="dut-isn-input__toggle-chip"
          :class="{ 'is-active': inputMode === 'bulk' }"
          @click="inputMode = 'bulk'"
        >
          Bulk Paste
        </button>
      </div>

      <label v-if="inputMode === 'multiple'" class="dut-isn-input__field">
        <span>DUT ISNs</span>
        <div class="dut-isn-input__entry-row">
          <input
            v-model="isnEntry"
            type="text"
            placeholder="Type ISNs and press Enter"
            @input="handleISNEntryInput"
            @keydown.enter.prevent="commitISNEntry"
            @blur="commitISNEntry"
          />
        </div>
        <small>Space, comma, or new line automatically queues multiple serials.</small>
      </label>

      <label v-else class="dut-isn-input__field">
        <span>Bulk ISN Input</span>
        <textarea
          v-model="bulkText"
          rows="5"
          placeholder="Paste multiple ISNs, one per line, comma-separated, or space-separated"
        />
        <div class="dut-isn-input__entry-row dut-isn-input__entry-row--end">
          <small>Paste ISNs separated by newlines, commas, or spaces.</small>
          <button type="button" class="dut-isn-input__button dut-isn-input__button--primary" :disabled="!bulkText" @click="parseBulkISNs">
            Parse
          </button>
        </div>
      </label>

      <section v-if="selectedISNs.length > 0" class="dut-isn-input__section">
        <div class="dut-isn-input__section-header">
          <strong>Selected ISNs ({{ selectedISNs.length }})</strong>
          <button type="button" class="dut-isn-input__link" @click="clearAll">Clear All</button>
        </div>
        <div class="dut-isn-input__token-row">
          <button v-for="(isn, index) in selectedISNs" :key="`${isn}-${index}`" type="button" class="dut-isn-input__token" @click="removeISN(index)">
            <span>{{ isn }}</span>
            <span aria-hidden="true">x</span>
          </button>
        </div>
      </section>

      <div class="dut-isn-input__grid">
        <label class="dut-isn-input__field">
          <span>Site Identifier (Optional)</span>
          <div class="dut-isn-input__entry-row">
            <input
              v-model="siteEntry"
              type="text"
              list="dut-isn-input-sites"
              placeholder="Auto-populated from DUT ISNs"
              @keydown.enter.prevent="commitSiteEntry"
              @blur="commitSiteEntry"
            />
            <button type="button" class="dut-isn-input__button dut-isn-input__button--ghost" @click="commitSiteEntry">
              Add
            </button>
          </div>
          <datalist id="dut-isn-input-sites">
            <option v-for="site in availableSites" :key="site" :value="site" />
          </datalist>
          <small>Sites detected from selected ISNs. Add or remove tokens to refine the scope.</small>
          <div v-if="selectedSites.length > 0" class="dut-isn-input__token-row">
            <button v-for="site in selectedSites" :key="site" type="button" class="dut-isn-input__token dut-isn-input__token--info" @click="removeSite(site)">
              <span>{{ site }}</span>
              <span aria-hidden="true">x</span>
            </button>
          </div>
        </label>

        <label class="dut-isn-input__field">
          <span>Model Identifier (Optional)</span>
          <div class="dut-isn-input__entry-row">
            <input
              v-model="modelEntry"
              type="text"
              list="dut-isn-input-models"
              placeholder="Auto-populated from DUT ISNs"
              @keydown.enter.prevent="commitModelEntry"
              @blur="commitModelEntry"
            />
            <button type="button" class="dut-isn-input__button dut-isn-input__button--ghost" @click="commitModelEntry">
              Add
            </button>
          </div>
          <datalist id="dut-isn-input-models">
            <option v-for="model in availableModels" :key="model" :value="model" />
          </datalist>
          <small>Models detected from selected ISNs. Leave empty to keep the parent flow unconstrained.</small>
          <div v-if="selectedModels.length > 0" class="dut-isn-input__token-row">
            <button v-for="model in selectedModels" :key="model" type="button" class="dut-isn-input__token dut-isn-input__token--info" @click="removeModel(model)">
              <span>{{ model }}</span>
              <span aria-hidden="true">x</span>
            </button>
          </div>
        </label>
      </div>

      <div v-if="validationMessage" class="dut-isn-input__notice" :class="`dut-isn-input__notice--${validationType}`">
        {{ validationMessage }}
      </div>
    </div>
  </AppPanel>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AppPanel } from '@/shared/ui'

// Props
interface Props {
  modelValue: string[]
  maxISNs?: number
  siteIdentifiers?: string[]
  modelIdentifiers?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  maxISNs: 10,
  siteIdentifiers: () => [],
  modelIdentifiers: () => [],
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'update:siteIdentifiers': [value: string[]]
  'update:modelIdentifiers': [value: string[]]
  change: [value: { isns: string[]; sites: string[]; models: string[]; valid: boolean }]
}>()

// State
const inputMode = ref<'multiple' | 'bulk'>('multiple')
const selectedISNs = ref<string[]>(props.modelValue)
const bulkText = ref('')
const isnEntry = ref('')
const validationMessage = ref<string | null>(null)
const validationType = ref<'success' | 'warning' | 'error'>('success')

// Site and Model state
const selectedSites = ref<string[]>(props.siteIdentifiers)
const selectedModels = ref<string[]>(props.modelIdentifiers)
const availableSites = ref<string[]>([])
const availableModels = ref<string[]>([])
const siteEntry = ref('')
const modelEntry = ref('')

// Computed
const isValid = computed(() => {
  return selectedISNs.value.length > 0 && selectedISNs.value.length <= props.maxISNs
})

// Methods
function sanitizeToken(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').trim()
}

function normalizeFreeformToken(value: string): string {
  return value.trim()
}

function addUniqueValue(items: string[], value: string): string[] {
  if (!value || items.includes(value)) {
    return items
  }

  return [...items, value]
}

function commitISNEntry() {
  const nextValues = parseISNText(isnEntry.value)
  isnEntry.value = ''

  if (nextValues.length === 0) {
    return
  }

  const nextISNs = [...new Set([...selectedISNs.value, ...nextValues])]
  if (nextISNs.length > props.maxISNs) {
    validationMessage.value = `ISN limit is ${props.maxISNs}.`
    validationType.value = 'warning'
    return
  }

  selectedISNs.value = nextISNs
}

function handleISNEntryInput() {
  if (!/[\n,\s]/.test(isnEntry.value)) {
    return
  }

  commitISNEntry()
}

function parseISNText(value: string): string[] {
  return value
    .split(/[\n,\s]+/)
    .map((isn) => sanitizeToken(isn))
    .filter((isn) => isn.length > 0)
}

function parseBulkISNs() {
  if (!bulkText.value) return

  // Parse ISNs from bulk text (support newlines, commas, spaces)
  const isns = parseISNText(bulkText.value)

  // Remove duplicates
  const uniqueISNs = [...new Set([...selectedISNs.value, ...isns])]

  // Check limit
  if (uniqueISNs.length > props.maxISNs) {
    validationMessage.value = `Parsed ${isns.length} ISNs, but limit is ${props.maxISNs}. Using first ${props.maxISNs}.`
    validationType.value = 'warning'
    selectedISNs.value = uniqueISNs.slice(0, props.maxISNs)
  } else {
    validationMessage.value = `Successfully parsed ${isns.length} ISNs`
    validationType.value = 'success'
    selectedISNs.value = uniqueISNs
  }

  bulkText.value = ''

  // Clear message after 3 seconds
  setTimeout(() => {
    validationMessage.value = null
  }, 3000)
}

function commitSiteEntry() {
  const nextValue = normalizeFreeformToken(siteEntry.value)
  siteEntry.value = ''
  if (!nextValue) {
    return
  }

  selectedSites.value = addUniqueValue(selectedSites.value, nextValue)
}

function commitModelEntry() {
  const nextValue = normalizeFreeformToken(modelEntry.value)
  modelEntry.value = ''
  if (!nextValue) {
    return
  }

  selectedModels.value = addUniqueValue(selectedModels.value, nextValue)
}

function removeISN(index: number) {
  selectedISNs.value.splice(index, 1)
}

function removeSite(site: string) {
  selectedSites.value = selectedSites.value.filter((item) => item !== site)
}

function removeModel(model: string) {
  selectedModels.value = selectedModels.value.filter((item) => item !== model)
}

function clearAll() {
  selectedISNs.value = []
  bulkText.value = ''
  isnEntry.value = ''
  validationMessage.value = null
}

// Watch for changes and emit (with sanitization)
watch(
  selectedISNs,
  (newValue) => {
    // Sanitize ISNs by removing non-alphanumeric characters and trimming
    const sanitized = newValue
      .map((isn) =>
        String(isn)
          .replace(/[^A-Za-z0-9]/g, '')
          .trim(),
      )
      .filter((isn) => isn.length > 0)

    // If sanitization changed the ISNs, update them
    if (JSON.stringify(sanitized) !== JSON.stringify(newValue)) {
      selectedISNs.value = sanitized
      return // Will trigger watch again with sanitized values
    }

    emit('update:modelValue', sanitized)
    emit('change', {
      isns: sanitized,
      sites: selectedSites.value,
      models: selectedModels.value,
      valid: isValid.value,
    })
  },
  { deep: true },
)

// Watch for site changes and emit
watch(
  selectedSites,
  (newValue) => {
    emit('update:siteIdentifiers', newValue)
    emit('change', {
      isns: selectedISNs.value,
      sites: newValue,
      models: selectedModels.value,
      valid: isValid.value,
    })
  },
  { deep: true },
)

// Watch for model changes and emit
watch(
  selectedModels,
  (newValue) => {
    emit('update:modelIdentifiers', newValue)
    emit('change', {
      isns: selectedISNs.value,
      sites: selectedSites.value,
      models: newValue,
      valid: isValid.value,
    })
  },
  { deep: true },
)

// Initialize from props
watch(
  () => props.modelValue,
  (newValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(selectedISNs.value)) {
      selectedISNs.value = [...newValue]
    }
  },
)

watch(
  () => props.siteIdentifiers,
  (newValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(selectedSites.value)) {
      selectedSites.value = [...newValue]
    }
  },
)

watch(
  () => props.modelIdentifiers,
  (newValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(selectedModels.value)) {
      selectedModels.value = [...newValue]
    }
  },
)

// Function to update available sites and models from parent
defineExpose({
  updateAvailableSites: (sites: string[]) => {
    availableSites.value = sites
    // Auto-select if only one unique value
    if (sites.length === 1 && selectedSites.value.length === 0) {
      selectedSites.value = [...sites]
    }
  },
  updateAvailableModels: (models: string[]) => {
    availableModels.value = models
    // Auto-select if only one unique value
    if (models.length === 1 && selectedModels.value.length === 0) {
      selectedModels.value = [...models]
    }
  },
})
</script>

<style scoped>
.dut-isn-input__stack,
.dut-isn-input__field,
.dut-isn-input__section,
.dut-isn-input__grid,
.dut-isn-input__section-header {
  display: grid;
  gap: 0.85rem;
}

.dut-isn-input__toggle-row,
.dut-isn-input__token-row,
.dut-isn-input__entry-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.dut-isn-input__entry-row--end {
  justify-content: space-between;
}

.dut-isn-input__grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dut-isn-input__field span,
.dut-isn-input__section-header strong {
  color: var(--app-ink);
}

.dut-isn-input__field span {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: none;
}

.dut-isn-input__field small,
.dut-isn-input__notice {
  color: var(--app-muted);
  line-height: 1.55;
}

.dut-isn-input__field input,
.dut-isn-input__field textarea {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.95rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  padding: 0.8rem 0.9rem;
  font: inherit;
}

.dut-isn-input__field textarea {
  resize: vertical;
}

.dut-isn-input__button,
.dut-isn-input__toggle-chip,
.dut-isn-input__token,
.dut-isn-input__link {
  min-height: 2.7rem;
  border-radius: 0.95rem;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-ink);
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.dut-isn-input__button,
.dut-isn-input__toggle-chip,
.dut-isn-input__token {
  padding: 0.6rem 0.9rem;
}

.dut-isn-input__link {
  padding: 0.55rem 0.9rem;
}

.dut-isn-input__button:hover,
.dut-isn-input__toggle-chip:hover,
.dut-isn-input__token:hover,
.dut-isn-input__link:hover {
  border-color: rgba(15, 118, 110, 0.24);
}

.dut-isn-input__button--primary,
.dut-isn-input__toggle-chip.is-active {
  background: var(--app-accent);
  border-color: var(--app-accent);
  color: var(--app-canvas);
}

.dut-isn-input__button--ghost,
.dut-isn-input__link,
.dut-isn-input__token {
  background: var(--app-panel);
}

.dut-isn-input__section {
  padding: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
}

.dut-isn-input__token {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.dut-isn-input__token--info {
  border-color: var(--app-info-line);
  background: var(--app-info-soft);
  color: var(--app-info);
}

.dut-isn-input__notice {
  padding: 0.9rem 1rem;
  border-radius: 0.95rem;
  border: 1px solid var(--app-info-line);
  background: var(--app-info-soft);
}

.dut-isn-input__notice--success {
  border-color: rgba(15, 118, 110, 0.16);
  background: rgba(15, 118, 110, 0.08);
  color: var(--app-accent);
}

.dut-isn-input__notice--warning {
  border-color: var(--app-warning-line);
  background: var(--app-warning-soft);
  color: var(--app-warning);
}

.dut-isn-input__notice--error {
  border-color: var(--app-danger-line);
  background: var(--app-danger-soft);
  color: var(--app-danger);
}

@media (max-width: 760px) {
  .dut-isn-input__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .dut-isn-input__entry-row--end {
    justify-content: start;
  }
}
</style>
