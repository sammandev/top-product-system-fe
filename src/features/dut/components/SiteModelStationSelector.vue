<template>
    <v-card>
        <v-card-title class="d-flex align-center">
            <v-icon start>mdi-map-marker-path</v-icon>
            Site / Model / Station Selection
        </v-card-title>

        <v-card-text>
            <v-row>
                <!-- Site Selector -->
                <v-col cols="12" md="4">
                    <v-select v-model="selectedSiteId" :items="siteItems" label="Test Site" variant="outlined"
                        density="comfortable" prepend-inner-icon="mdi-office-building" :loading="loadingSites"
                        :disabled="loadingSites" :error-messages="siteError" clearable
                        @update:model-value="handleSiteChange">
                        <template #no-data>
                            <v-list-item>
                                <v-list-item-title class="text-caption text-medium-emphasis">
                                    No sites available
                                </v-list-item-title>
                            </v-list-item>
                        </template>
                    </v-select>
                </v-col>

                <!-- Model Selector -->
                <v-col cols="12" md="4">
                    <v-select v-model="selectedModelId" :items="modelItems" label="Device Model" variant="outlined"
                        density="comfortable" prepend-inner-icon="mdi-cellphone" :loading="loadingModels"
                        :disabled="!selectedSiteId || loadingModels" :error-messages="modelError" clearable
                        @update:model-value="handleModelChange">
                        <template #no-data>
                            <v-list-item>
                                <v-list-item-title class="text-caption text-medium-emphasis">
                                    {{ selectedSiteId ? 'No models available for this site' : 'Select a site first' }}
                                </v-list-item-title>
                            </v-list-item>
                        </template>
                    </v-select>
                </v-col>

                <!-- Station Selector -->
                <v-col cols="12" md="4">
                    <v-select v-model="selectedStationId" :items="stationItems" label="Test Station" variant="outlined"
                        density="comfortable" prepend-inner-icon="mdi-test-tube" :loading="loadingStations"
                        :disabled="!selectedModelId || loadingStations" :error-messages="stationError" clearable
                        @update:model-value="handleStationChange">
                        <template #no-data>
                            <v-list-item>
                                <v-list-item-title class="text-caption text-medium-emphasis">
                                    {{ selectedModelId ? 'No stations available for this model' : 'Select a model first'
                                    }}
                                </v-list-item-title>
                            </v-list-item>
                        </template>
                    </v-select>
                </v-col>
            </v-row>

            <!-- Selection Summary -->
            <v-alert v-if="isComplete" type="success" variant="tonal" density="compact" class="mt-2">
                <template #prepend>
                    <v-icon>mdi-check-circle</v-icon>
                </template>
                <div class="text-caption">
                    <strong>Selected:</strong> {{ selectedSiteName }} → {{ selectedModelName }} → {{ selectedStationName
                    }}
                </div>
            </v-alert>

            <!-- Validation Alert -->
            <v-alert v-else-if="showValidation" type="warning" variant="tonal" density="compact" class="mt-2">
                <template #prepend>
                    <v-icon>mdi-alert</v-icon>
                </template>
                <div class="text-caption">
                    Please select Site, Model, and Station to continue
                </div>
            </v-alert>

            <!-- Error Alert -->
            <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-2" closable
                @click:close="clearError">
                {{ error }}
            </v-alert>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useDUTStore } from '../store'
import type { DUTSite, DUTModel, DUTStation } from '@/core/types'

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
    showValidation: false
})

// Emits
interface Emits {
    (e: 'update:modelValue', value: {
        siteId: number | null
        modelId: number | null
        stationId: number | null
    }): void
    (e: 'change', value: {
        site: DUTSite | null
        model: DUTModel | null
        station: DUTStation | null
    }): void
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
    dutStore.sites.map(site => ({
        value: site.id,
        title: site.name,
        raw: site
    }))
)

const modelItems = computed(() =>
    dutStore.models.map(model => ({
        value: model.id,
        title: model.name,
        raw: model
    }))
)

const stationItems = computed(() =>
    dutStore.stations.map(station => ({
        value: station.id,
        title: station.name,
        raw: station
    }))
)

const selectedSite = computed(() =>
    dutStore.sites.find(s => s.id === selectedSiteId.value) || null
)

const selectedModel = computed(() =>
    dutStore.models.find(m => m.id === selectedModelId.value) || null
)

const selectedStation = computed(() =>
    dutStore.stations.find(s => s.id === selectedStationId.value) || null
)

const selectedSiteName = computed(() => selectedSite.value?.name || '')
const selectedModelName = computed(() => selectedModel.value?.name || '')
const selectedStationName = computed(() => selectedStation.value?.name || '')

const isComplete = computed(() =>
    selectedSiteId.value !== null &&
    selectedModelId.value !== null &&
    selectedStationId.value !== null
)

// Methods
async function loadSites() {
    loadingSites.value = true
    siteError.value = ''
    error.value = ''

    try {
        await dutStore.fetchSites()
    } catch (err: any) {
        siteError.value = 'Failed to load sites'
        error.value = err.message || 'Failed to load sites'
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
    } catch (err: any) {
        modelError.value = 'Failed to load models'
        error.value = err.message || 'Failed to load models'
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
    } catch (err: any) {
        stationError.value = 'Failed to load stations'
        error.value = err.message || 'Failed to load stations'
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
        stationId: selectedStationId.value
    })

    // Emit detailed change event
    emit('change', {
        site: selectedSite.value,
        model: selectedModel.value,
        station: selectedStation.value
    })
}

function clearError() {
    error.value = ''
    siteError.value = ''
    modelError.value = ''
    stationError.value = ''
}

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
    selectedSiteId.value = newValue.siteId
    selectedModelId.value = newValue.modelId
    selectedStationId.value = newValue.stationId
}, { deep: true })

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
</style>
