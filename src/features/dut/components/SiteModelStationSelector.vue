<template>
  <AppPanel
    eyebrow="Context"
    title="Site / Model / Station"
    description="Choose the site, model, and station in order. Downstream options load after the upstream selection is set."
    tone="cool"
  >
    <div class="site-model-station-selector__grid">
      <label class="site-model-station-selector__field">
        <span>Test Site</span>
        <AppSelect :model-value="selectedSiteId" :options="siteSelectOptions" :disabled="loadingSites" @update:model-value="handleSiteChange($event as number | null)" />
        <small>{{ loadingSites ? 'Loading sites...' : siteItems.length ? 'Available DUT sites.' : 'No sites available.' }}</small>
        <small v-if="siteError" class="site-model-station-selector__error">{{ siteError }}</small>
      </label>

      <label class="site-model-station-selector__field">
        <span>Device Model</span>
        <AppSelect :model-value="selectedModelId" :options="modelSelectOptions" :disabled="!selectedSiteId || loadingModels" @update:model-value="handleModelChange($event as number | null)" />
        <small>{{ loadingModels ? 'Loading models...' : selectedSiteId ? (modelItems.length ? 'Models available for this site.' : 'No models available for this site.') : 'Choose a site to load models.' }}</small>
        <small v-if="modelError" class="site-model-station-selector__error">{{ modelError }}</small>
      </label>

      <label class="site-model-station-selector__field">
        <span>Test Station</span>
        <AppSelect :model-value="selectedStationId" :options="stationSelectOptions" :disabled="!selectedModelId || loadingStations" @update:model-value="handleStationChange($event as number | null)" />
        <small>{{ loadingStations ? 'Loading stations...' : selectedModelId ? (stationItems.length ? 'Stations available for this model.' : 'No stations available for this model.') : 'Choose a model to load stations.' }}</small>
        <small v-if="stationError" class="site-model-station-selector__error">{{ stationError }}</small>
      </label>
    </div>

    <section v-if="isComplete" class="site-model-station-selector__notice site-model-station-selector__notice--success">
      <strong>Selected</strong>
      <span>{{ selectedSiteName }} → {{ selectedModelName }} → {{ selectedStationName }}</span>
    </section>

    <section v-else-if="showValidation" class="site-model-station-selector__notice site-model-station-selector__notice--warning">
      Select site, model, and station to continue.
    </section>

    <section v-if="error" class="site-model-station-selector__notice site-model-station-selector__notice--danger">
      <div>
        <strong>Load failed</strong>
        <span>{{ error }}</span>
      </div>
      <button type="button" class="site-model-station-selector__button" @click="clearError">Dismiss</button>
    </section>
  </AppPanel>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { DUTModel, DUTSite, DUTStation } from '@/core/types'
import { AppPanel, AppSelect } from '@/shared'
import { getErrorMessage } from '@/shared/utils'
import { useDUTStore } from '../stores'

// Props
interface Props {
  modelValue: {
    siteId: number | null
    modelId: number | null
    stationId: number | null
  }
  showValidation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showValidation: false,
})

// Emits
interface Emits {
  (
    e: 'update:modelValue',
    value: {
      siteId: number | null
      modelId: number | null
      stationId: number | null
    },
  ): void
  (
    e: 'change',
    value: {
      site: DUTSite | null
      model: DUTModel | null
      station: DUTStation | null
    },
  ): void
}

const emit = defineEmits<Emits>()

// Store
const dutStore = useDUTStore()

// State
const selectedSiteId = ref<number | null>(props.modelValue.siteId)
const selectedModelId = ref<number | null>(props.modelValue.modelId)
const selectedStationId = ref<number | null>(props.modelValue.stationId)

const loadingSites = ref(false)
const loadingModels = ref(false)
const loadingStations = ref(false)

const siteError = ref<string>('')
const modelError = ref<string>('')
const stationError = ref<string>('')
const error = ref<string>('')

// Computed
// UPDATED: Map items to ensure v-select works with simple value/title structure
// Backend returns { id, name } so we map to { value, title }
const siteItems = computed(() =>
  dutStore.sites.map((site) => ({
    value: site.id,
    title: site.name,
    raw: site,
  })),
)

const siteSelectOptions = computed(() => [
  { label: 'Select a site', value: null },
  ...siteItems.value.map((site) => ({
    label: site.title,
    value: site.value,
  })),
])

const modelItems = computed(() =>
  dutStore.models.map((model) => ({
    value: model.id,
    title: model.name,
    raw: model,
  })),
)

const modelSelectOptions = computed(() => [
  { label: selectedSiteId.value ? 'Select a model' : 'Select a site first', value: null },
  ...modelItems.value.map((model) => ({
    label: model.title,
    value: model.value,
  })),
])

const stationItems = computed(() =>
  dutStore.stations.map((station) => ({
    value: station.id,
    title: station.name,
    raw: station,
  })),
)

const stationSelectOptions = computed(() => [
  { label: selectedModelId.value ? 'Select a station' : 'Select a model first', value: null },
  ...stationItems.value.map((station) => ({
    label: station.title,
    value: station.value,
  })),
])

const selectedSite = computed(
  () => dutStore.sites.find((s) => s.id === selectedSiteId.value) || null,
)

const selectedModel = computed(
  () => dutStore.models.find((m) => m.id === selectedModelId.value) || null,
)

const selectedStation = computed(
  () => dutStore.stations.find((s) => s.id === selectedStationId.value) || null,
)

const selectedSiteName = computed(() => selectedSite.value?.name || '')
const selectedModelName = computed(() => selectedModel.value?.name || '')
const selectedStationName = computed(() => selectedStation.value?.name || '')

const isComplete = computed(
  () =>
    selectedSiteId.value !== null &&
    selectedModelId.value !== null &&
    selectedStationId.value !== null,
)

// Methods
async function loadSites() {
  loadingSites.value = true
  siteError.value = ''
  error.value = ''

  try {
    await dutStore.fetchSites()
  } catch (err: unknown) {
    siteError.value = 'Failed to load sites'
    error.value = getErrorMessage(err) || 'Failed to load sites'
  } finally {
    loadingSites.value = false
  }
}

async function loadModels(siteId: number) {
  loadingModels.value = true
  modelError.value = ''
  error.value = ''

  try {
    await dutStore.fetchModels(siteId)
  } catch (err: unknown) {
    modelError.value = 'Failed to load models'
    error.value = getErrorMessage(err) || 'Failed to load models'
  } finally {
    loadingModels.value = false
  }
}

async function loadStations(modelId: number) {
  loadingStations.value = true
  stationError.value = ''
  error.value = ''

  try {
    await dutStore.fetchStations(modelId)
  } catch (err: unknown) {
    stationError.value = 'Failed to load stations'
    error.value = getErrorMessage(err) || 'Failed to load stations'
  } finally {
    loadingStations.value = false
  }
}

function handleSiteChange(siteId: number | null) {
  selectedSiteId.value = siteId

  // Clear downstream selections
  selectedModelId.value = null
  selectedStationId.value = null
  dutStore.models = []
  dutStore.stations = []

  // Load models if site selected
  if (siteId !== null) {
    loadModels(siteId)
  }

  emitChange()
}

function handleModelChange(modelId: number | null) {
  selectedModelId.value = modelId

  // Clear downstream selections
  selectedStationId.value = null
  dutStore.stations = []

  // Load stations if model selected
  if (modelId !== null) {
    loadStations(modelId)
  }

  emitChange()
}

function handleStationChange(stationId: number | null) {
  selectedStationId.value = stationId
  emitChange()
}

function emitChange() {
  // Emit v-model update
  emit('update:modelValue', {
    siteId: selectedSiteId.value,
    modelId: selectedModelId.value,
    stationId: selectedStationId.value,
  })

  // Emit detailed change event
  emit('change', {
    site: selectedSite.value,
    model: selectedModel.value,
    station: selectedStation.value,
  })
}

function clearError() {
  error.value = ''
  siteError.value = ''
  modelError.value = ''
  stationError.value = ''
}

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    selectedSiteId.value = newValue.siteId
    selectedModelId.value = newValue.modelId
    selectedStationId.value = newValue.stationId
  },
  { deep: true },
)

// Lifecycle
onMounted(() => {
  loadSites()

  // If initial values provided, load downstream data
  if (props.modelValue.siteId) {
    loadModels(props.modelValue.siteId)
  }
  if (props.modelValue.modelId) {
    loadStations(props.modelValue.modelId)
  }
})
</script>

<style scoped>
.site-model-station-selector__grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.site-model-station-selector__field {
  display: grid;
  gap: 0.45rem;
}

.site-model-station-selector__field span {
  color: var(--app-ink);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.site-model-station-selector__field select {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  padding: 0.72rem 0.82rem;
}

.site-model-station-selector__field select:focus {
  outline: none;
  border-color: var(--app-accent);
  box-shadow: 0 0 0 4px var(--app-ring);
}

.site-model-station-selector__field select:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.site-model-station-selector__field small {
  color: var(--app-muted);
}

.site-model-station-selector__error {
  color: #8f2020;
}

.site-model-station-selector__notice,
.site-model-station-selector__button {
  display: flex;
}

.site-model-station-selector__notice {
  margin-top: 1rem;
  border: 1px solid transparent;
  border-radius: 0.8rem;
  padding: 0.8rem 0.9rem;
  gap: 1rem;
  justify-content: space-between;
  align-items: center;
}

.site-model-station-selector__notice strong,
.site-model-station-selector__notice span {
  display: block;
}

.site-model-station-selector__notice--success {
  border-color: rgba(15, 118, 110, 0.16);
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.site-model-station-selector__notice--warning {
  border-color: rgba(184, 118, 38, 0.18);
  background: rgba(184, 118, 38, 0.16);
  color: #8f5314;
}

.site-model-station-selector__notice--danger {
  border-color: rgba(189, 64, 64, 0.18);
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

.site-model-station-selector__button {
  align-items: center;
  justify-content: center;
  border: 1px solid currentColor;
  border-radius: 0.75rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0.58rem 0.82rem;
  font-weight: 700;
}

@media (max-width: 920px) {
  .site-model-station-selector__grid {
    grid-template-columns: 1fr;
  }

  .site-model-station-selector__notice {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
