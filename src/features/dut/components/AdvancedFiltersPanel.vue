<template>
  <section class="advanced-filters-panel">
    <button type="button" class="advanced-filters-panel__toggle" :aria-expanded="isExpanded"
      @click="isExpanded = !isExpanded">
      <div class="advanced-filters-panel__toggle-copy">
        <span class="advanced-filters-panel__icon" :class="{ 'is-open': isExpanded }">
          <Icon icon="mdi:filter-variant" />
        </span>
        <div>
          <p class="advanced-filters-panel__eyebrow">Precision Filters</p>
          <h3>Advanced Filters</h3>
        </div>
      </div>
      <span class="advanced-filters-panel__summary">{{ filterSummary }}</span>
    </button>

    <div v-if="isExpanded" class="advanced-filters-panel__body">
      <div class="advanced-filters-panel__grid">
        <section class="advanced-filters-panel__section">
          <div class="advanced-filters-panel__section-heading">
            <div>
              <p class="advanced-filters-panel__section-eyebrow">Routing Scope</p>
              <h4>Stations</h4>
            </div>
            <span class="advanced-filters-panel__pill advanced-filters-panel__pill--muted">{{ filters.stations?.length || 0 }} selected</span>
          </div>
          <label class="advanced-filters-panel__field">
            <span>Add station IDs or names</span>
            <div class="advanced-filters-panel__input-row">
              <input v-model="stationDraft" type="text" placeholder="Enter station IDs or names"
                @keydown.enter.prevent="commitArrayDraft('stations')" />
              <button type="button" class="advanced-filters-panel__button advanced-filters-panel__button--ghost"
                @click="commitArrayDraft('stations')">
                Add
              </button>
            </div>
          </label>
          <p class="advanced-filters-panel__helper-copy">Filter by specific stations without changing the broader DUT selection.</p>
          <div v-if="filters.stations?.length" class="advanced-filters-panel__token-row">
            <button v-for="station in filters.stations" :key="station" type="button" class="advanced-filters-panel__token"
              @click="removeArrayValue('stations', station)">
              <span>{{ station }}</span>
              <Icon icon="mdi:close" />
            </button>
          </div>
        </section>

        <section class="advanced-filters-panel__section">
          <div class="advanced-filters-panel__section-heading">
            <div>
              <p class="advanced-filters-panel__section-eyebrow">Device Scope</p>
              <h4>Devices</h4>
            </div>
            <span class="advanced-filters-panel__pill advanced-filters-panel__pill--muted">{{ filters.device_identifiers?.length || 0 }} selected</span>
          </div>
          <label class="advanced-filters-panel__field">
            <span>Add device IDs or names</span>
            <div class="advanced-filters-panel__input-row">
              <input v-model="deviceDraft" type="text" placeholder="Enter device IDs or names"
                @keydown.enter.prevent="commitArrayDraft('device_identifiers')" />
              <button type="button" class="advanced-filters-panel__button advanced-filters-panel__button--ghost"
                @click="commitArrayDraft('device_identifiers')">
                Add
              </button>
            </div>
          </label>
          <p class="advanced-filters-panel__helper-copy">Limit the request to a focused device subset when a DUT spans multiple hardware contexts.</p>
          <div v-if="filters.device_identifiers?.length" class="advanced-filters-panel__token-row">
            <button v-for="device in filters.device_identifiers" :key="device" type="button" class="advanced-filters-panel__token"
              @click="removeArrayValue('device_identifiers', device)">
              <span>{{ device }}</span>
              <Icon icon="mdi:close" />
            </button>
          </div>
        </section>

        <section class="advanced-filters-panel__section advanced-filters-panel__section--compact">
          <div class="advanced-filters-panel__section-heading">
            <div>
              <p class="advanced-filters-panel__section-eyebrow">Location</p>
              <h4>Site</h4>
            </div>
          </div>
          <label class="advanced-filters-panel__field">
            <span>Site ID or name</span>
            <input v-model="filters.site_identifier" type="text" placeholder="e.g., 2 or PTB" />
          </label>
        </section>

        <section class="advanced-filters-panel__section advanced-filters-panel__section--compact">
          <div class="advanced-filters-panel__section-heading">
            <div>
              <p class="advanced-filters-panel__section-eyebrow">Product</p>
              <h4>Model</h4>
            </div>
          </div>
          <label class="advanced-filters-panel__field">
            <span>Model ID or name</span>
            <input v-model="filters.model_identifier" type="text" placeholder="e.g., 44 or HH5K" />
          </label>
        </section>

        <section class="advanced-filters-panel__section advanced-filters-panel__section--wide advanced-filters-panel__section--success">
          <div class="advanced-filters-panel__section-heading">
            <div>
              <p class="advanced-filters-panel__section-eyebrow">Inclusion Rules</p>
              <h4>Include Test Patterns</h4>
            </div>
            <span class="advanced-filters-panel__pill advanced-filters-panel__pill--success">{{ filters.test_item_filters?.length || 0 }} active</span>
          </div>
          <label class="advanced-filters-panel__field">
            <span>Add regex include patterns</span>
            <div class="advanced-filters-panel__input-row">
              <input v-model="includeDraft" type="text" placeholder="e.g., WiFi_TX_POW_6185_11AX_MCS11_B160"
                @keydown.enter.prevent="commitArrayDraft('test_item_filters')" />
              <button type="button" class="advanced-filters-panel__button advanced-filters-panel__button--success"
                @click="commitArrayDraft('test_item_filters')">
                Add
              </button>
            </div>
          </label>
          <p class="advanced-filters-panel__helper-copy">Regex patterns here narrow the measurements included in hierarchical analysis.</p>
          <div v-if="filters.test_item_filters?.length" class="advanced-filters-panel__token-row">
            <button v-for="pattern in filters.test_item_filters" :key="pattern" type="button"
              class="advanced-filters-panel__token advanced-filters-panel__token--success"
              @click="removeArrayValue('test_item_filters', pattern)">
              <span>{{ pattern }}</span>
              <Icon icon="mdi:close" />
            </button>
          </div>
        </section>

        <section class="advanced-filters-panel__section advanced-filters-panel__section--wide advanced-filters-panel__section--danger">
          <div class="advanced-filters-panel__section-heading">
            <div>
              <p class="advanced-filters-panel__section-eyebrow">Exclusion Rules</p>
              <h4>Exclude Test Patterns</h4>
            </div>
            <span class="advanced-filters-panel__pill advanced-filters-panel__pill--danger">{{ filters.exclude_test_item_filters?.length || 0 }} active</span>
          </div>
          <label class="advanced-filters-panel__field">
            <span>Add regex exclude patterns</span>
            <div class="advanced-filters-panel__input-row">
              <input v-model="excludeDraft" type="text" placeholder="e.g., WiFi_PA_POW_OLD_6985_11AX_MCS9_B160"
                @keydown.enter.prevent="commitArrayDraft('exclude_test_item_filters')" />
              <button type="button" class="advanced-filters-panel__button advanced-filters-panel__button--danger"
                @click="commitArrayDraft('exclude_test_item_filters')">
                Add
              </button>
            </div>
          </label>
          <p class="advanced-filters-panel__helper-copy">Use this when older, fallback, or noisy measurements should stay out of the score path.</p>
          <div v-if="filters.exclude_test_item_filters?.length" class="advanced-filters-panel__token-row">
            <button v-for="pattern in filters.exclude_test_item_filters" :key="pattern" type="button"
              class="advanced-filters-panel__token advanced-filters-panel__token--danger"
              @click="removeArrayValue('exclude_test_item_filters', pattern)">
              <span>{{ pattern }}</span>
              <Icon icon="mdi:close" />
            </button>
          </div>
        </section>

        <section class="advanced-filters-panel__section advanced-filters-panel__section--wide">
          <div class="advanced-filters-panel__section-heading">
            <div>
              <p class="advanced-filters-panel__section-eyebrow">Criteria Payload</p>
              <h4>Criteria JSON File</h4>
            </div>
            <span v-if="filters.criteria_file" class="advanced-filters-panel__pill advanced-filters-panel__pill--primary">{{ formatFileSize(filters.criteria_file.size) }}</span>
          </div>
          <label class="advanced-filters-panel__field">
            <span>Upload a criteria JSON configuration</span>
            <input type="file" accept=".json,application/json" @change="handleFileChange" />
          </label>
          <p class="advanced-filters-panel__helper-copy">Attach an explicit criteria map when the default scoring criteria should be overridden.</p>
          <div v-if="filters.criteria_file" class="advanced-filters-panel__file-strip">
            <div>
              <strong>{{ filters.criteria_file.name }}</strong>
              <span>{{ formatFileSize(filters.criteria_file.size) }}</span>
            </div>
            <button type="button" class="advanced-filters-panel__button advanced-filters-panel__button--ghost"
              @click="clearCriteriaFile">
              Remove
            </button>
          </div>
        </section>
      </div>

      <div class="advanced-filters-panel__actions">
        <button type="button" class="advanced-filters-panel__button advanced-filters-panel__button--ghost"
          @click="clearFilters">
          Clear Filters
        </button>
        <button type="button" class="advanced-filters-panel__button advanced-filters-panel__button--primary"
          @click="applyFilters">
          Apply Filters
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'

// Props
interface Props {
  modelValue: {
    stations?: string[]
    site_identifier?: string
    model_identifier?: string
    device_identifiers?: string[]
    test_item_filters?: string[]
    exclude_test_item_filters?: string[]
    criteria_file?: File | null
  }
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: Props['modelValue']]
  apply: [value: Props['modelValue']]
}>()

// State
const isExpanded = ref(false)
const filters = ref<Props['modelValue']>({ ...props.modelValue })
const stationDraft = ref('')
const deviceDraft = ref('')
const includeDraft = ref('')
const excludeDraft = ref('')

// Computed
const filterSummary = computed(() => {
  const parts: string[] = []

  if (filters.value.stations && filters.value.stations.length > 0) {
    parts.push(`${filters.value.stations.length} station(s)`)
  }

  if (filters.value.device_identifiers && filters.value.device_identifiers.length > 0) {
    parts.push(`${filters.value.device_identifiers.length} device(s)`)
  }

  if (filters.value.site_identifier) {
    parts.push(`site: ${filters.value.site_identifier}`)
  }

  if (filters.value.model_identifier) {
    parts.push(`model: ${filters.value.model_identifier}`)
  }

  if (filters.value.test_item_filters && filters.value.test_item_filters.length > 0) {
    parts.push(`${filters.value.test_item_filters.length} include pattern(s)`)
  }

  if (
    filters.value.exclude_test_item_filters &&
    filters.value.exclude_test_item_filters.length > 0
  ) {
    parts.push(`${filters.value.exclude_test_item_filters.length} exclude pattern(s)`)
  }

  if (filters.value.criteria_file) {
    parts.push(`criteria file: ${filters.value.criteria_file.name}`)
  }

  return parts.length > 0 ? parts.join(', ') : 'No filters applied'
})

// Methods
function normalizeDraft(value: string): string {
  return value.trim().replace(/,+$/, '')
}

function commitArrayDraft(
  key: 'stations' | 'device_identifiers' | 'test_item_filters' | 'exclude_test_item_filters',
) {
  const source =
    key === 'stations'
      ? stationDraft
      : key === 'device_identifiers'
        ? deviceDraft
        : key === 'test_item_filters'
          ? includeDraft
          : excludeDraft

  const value = normalizeDraft(source.value)
  if (!value) {
    source.value = ''
    return
  }

  const currentValues = filters.value[key] || []
  if (!currentValues.includes(value)) {
    filters.value[key] = [...currentValues, value]
  }

  source.value = ''
}

function removeArrayValue(
  key: 'stations' | 'device_identifiers' | 'test_item_filters' | 'exclude_test_item_filters',
  value: string,
) {
  filters.value[key] = (filters.value[key] || []).filter((entry) => entry !== value)
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  filters.value.criteria_file = file
  emitChange()
}

function clearCriteriaFile() {
  filters.value.criteria_file = null
  emitChange()
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`
}

function clearFilters() {
  filters.value = {
    stations: [],
    site_identifier: '',
    model_identifier: '',
    device_identifiers: [],
    test_item_filters: [],
    exclude_test_item_filters: [],
    criteria_file: null,
  }
  stationDraft.value = ''
  deviceDraft.value = ''
  includeDraft.value = ''
  excludeDraft.value = ''
  emitChange()
}

function applyFilters() {
  emit('apply', { ...filters.value })
}

function emitChange() {
  emit('update:modelValue', { ...filters.value })
}

// Watch for changes
watch(
  filters,
  () => {
    emitChange()
  },
  { deep: true },
)

// Initialize from props
watch(
  () => props.modelValue,
  (newValue) => {
    filters.value = { ...newValue }
  },
  { immediate: true },
)
</script>

<style scoped>
.advanced-filters-panel {
  border: 1px solid var(--app-border);
  border-radius: 1.25rem;
  background:
    radial-gradient(circle at top right, rgba(20, 113, 153, 0.1), transparent 34%),
    var(--app-panel);
  overflow: hidden;
}

.advanced-filters-panel__toggle,
.advanced-filters-panel__input-row,
.advanced-filters-panel__section-heading,
.advanced-filters-panel__actions,
.advanced-filters-panel__file-strip,
.advanced-filters-panel__toggle-copy,
.advanced-filters-panel__token,
.advanced-filters-panel__button {
  display: flex;
  align-items: center;
}

.advanced-filters-panel__toggle,
.advanced-filters-panel__section-heading,
.advanced-filters-panel__actions,
.advanced-filters-panel__file-strip {
  justify-content: space-between;
  gap: 1rem;
}

.advanced-filters-panel__toggle {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--app-ink);
  cursor: pointer;
  padding: 1rem 1.15rem;
  text-align: left;
}

.advanced-filters-panel__toggle-copy {
  gap: 0.85rem;
}

.advanced-filters-panel__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
  transition: transform 180ms ease;
}

.advanced-filters-panel__icon.is-open {
  transform: rotate(180deg);
}

.advanced-filters-panel__eyebrow,
.advanced-filters-panel__section-eyebrow,
.advanced-filters-panel__helper-copy {
  margin: 0;
  color: var(--app-muted);
}

.advanced-filters-panel__eyebrow,
.advanced-filters-panel__section-eyebrow {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.advanced-filters-panel__toggle h3,
.advanced-filters-panel__section-heading h4 {
  margin: 0.2rem 0 0;
}

.advanced-filters-panel__summary {
  color: var(--app-muted);
  font-size: 0.9rem;
  max-width: 36rem;
}

.advanced-filters-panel__body {
  border-top: 1px solid var(--app-border);
  padding: 1rem 1.15rem 1.15rem;
}

.advanced-filters-panel__grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.advanced-filters-panel__section {
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
  padding: 1rem;
  display: grid;
  gap: 0.9rem;
}

.advanced-filters-panel__section--compact {
  align-content: start;
}

.advanced-filters-panel__section--wide {
  grid-column: 1 / -1;
}

.advanced-filters-panel__section--success {
  border-color: var(--app-success-line);
  background: var(--app-panel);
}

.advanced-filters-panel__section--danger {
  border-color: var(--app-danger-line);
  background: var(--app-panel);
}

.advanced-filters-panel__field {
  display: grid;
  gap: 0.45rem;
}

.advanced-filters-panel__field span:first-child {
  color: var(--app-ink);
  font-size: 0.82rem;
  font-weight: 700;
}

.advanced-filters-panel__field input {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  background: var(--app-panel);
  color: var(--app-ink);
  padding: 0.82rem 0.95rem;
}

.advanced-filters-panel__input-row {
  gap: 0.65rem;
}

.advanced-filters-panel__input-row input {
  flex: 1;
}

.advanced-filters-panel__token-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.advanced-filters-panel__button,
.advanced-filters-panel__token {
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-panel);
  color: var(--app-ink);
  cursor: pointer;
  gap: 0.45rem;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
}

.advanced-filters-panel__button:hover,
.advanced-filters-panel__token:hover {
  transform: translateY(-1px);
}

.advanced-filters-panel__button {
  justify-content: center;
  padding: 0.75rem 0.95rem;
  font-weight: 700;
}

.advanced-filters-panel__button--ghost {
  color: #4f5d6d;
}

.advanced-filters-panel__button--primary {
  border-color: rgba(40, 96, 163, 0.22);
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.advanced-filters-panel__button--success {
  border-color: rgba(15, 118, 110, 0.22);
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.advanced-filters-panel__button--danger {
  border-color: rgba(189, 64, 64, 0.22);
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

.advanced-filters-panel__token {
  padding: 0.55rem 0.8rem;
}

.advanced-filters-panel__token--success {
  border-color: rgba(15, 118, 110, 0.22);
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.advanced-filters-panel__token--danger {
  border-color: rgba(189, 64, 64, 0.22);
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

.advanced-filters-panel__pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.3rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 700;
}

.advanced-filters-panel__pill--muted {
  background: rgba(120, 129, 143, 0.12);
  color: #4f5d6d;
}

.advanced-filters-panel__pill--primary {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.advanced-filters-panel__pill--success {
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.advanced-filters-panel__pill--danger {
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

.advanced-filters-panel__file-strip {
  border: 1px dashed rgba(40, 96, 163, 0.24);
  border-radius: 1rem;
  background: rgba(40, 96, 163, 0.06);
  padding: 0.85rem 1rem;
}

.advanced-filters-panel__file-strip strong,
.advanced-filters-panel__file-strip span {
  display: block;
}

.advanced-filters-panel__file-strip span {
  color: var(--app-muted);
}

.advanced-filters-panel__actions {
  margin-top: 1rem;
}

@media (max-width: 900px) {
  .advanced-filters-panel__toggle,
  .advanced-filters-panel__section-heading,
  .advanced-filters-panel__actions,
  .advanced-filters-panel__file-strip,
  .advanced-filters-panel__input-row {
    flex-direction: column;
    align-items: stretch;
  }

  .advanced-filters-panel__grid {
    grid-template-columns: 1fr;
  }

  .advanced-filters-panel__summary {
    max-width: none;
  }
}
</style>
