<template>
    <v-card>
        <v-card-title>
            <v-icon class="mr-2">mdi-barcode</v-icon>
            DUT ISN Search
        </v-card-title>

        <v-card-text class="pa-4">
            <!-- Input Mode Toggle -->
            <v-btn-toggle v-model="inputMode" mandatory color="primary" class="mb-4">
                <v-btn value="multiple" size="small">
                    <v-icon start>mdi-format-list-bulleted</v-icon>
                    ISN Search
                </v-btn>
                <v-btn value="bulk" size="small">
                    <v-icon start>mdi-text-box-multiple</v-icon>
                    Bulk Paste
                </v-btn>
            </v-btn-toggle>

            <v-row>
                <!-- Multiple ISNs Combobox -->
                <v-col v-if="inputMode === 'multiple'" cols="12">
                    <v-combobox v-model="selectedISNs" label="DUT ISNs" placeholder="Type ISN and press Enter"
                        prepend-inner-icon="mdi-barcode-scan" variant="outlined" chips multiple closable-chips clearable
                        :rules="[rules.minOneISN]" hint="Type ISN and press Enter to add multiple" persistent-hint>
                        <template #chip="{ props, item }">
                            <v-chip v-bind="props" :text="item.value" closable />
                        </template>
                    </v-combobox>
                </v-col>

                <!-- Bulk Paste Textarea -->
                <v-col v-if="inputMode === 'bulk'" cols="12">
                    <v-textarea v-model="bulkText" label="Bulk ISN Input"
                        placeholder="Paste multiple ISNs (one per line, comma-separated, or space-separated)&#10;Example:&#10;260884980003907&#10;DM2527470036123&#10;260884980003908"
                        prepend-inner-icon="mdi-text-box-multiple" variant="outlined" rows="5" clearable
                        hint="Paste ISNs separated by newlines, commas, or spaces" persistent-hint>
                        <template #append>
                            <v-btn color="primary" variant="flat" size="small" :disabled="!bulkText"
                                @click="parseBulkISNs">
                                Parse
                            </v-btn>
                        </template>
                    </v-textarea>
                </v-col>

                <!-- Selected ISNs Display -->
                <v-col v-if="selectedISNs.length > 0" cols="12">
                    <div class="d-flex justify-space-between align-center mb-2">
                        <span class="text-subtitle-2">
                            Selected ISNs ({{ selectedISNs.length }})
                        </span>
                        <v-btn variant="text" size="small" color="error" @click="clearAll">
                            Clear All
                        </v-btn>
                    </div>

                    <v-chip-group column>
                        <v-chip v-for="(isn, index) in selectedISNs" :key="index" closable color="primary"
                            variant="tonal" @click:close="removeISN(index)">
                            {{ isn }}
                        </v-chip>
                    </v-chip-group>
                </v-col>

                <!-- Site Identifier (Auto-populated) -->
                <v-col cols="12" md="6">
                    <v-combobox v-model="selectedSites" :items="availableSites" label="Site Identifier (Optional)"
                        placeholder="Auto-populated from DUT ISNs" prepend-inner-icon="mdi-office-building" multiple
                        chips closable-chips clearable hint="Sites detected from selected ISNs" persistent-hint>
                        <template #chip="{ props, item }">
                            <v-chip v-bind="props" :text="String(item.value || item)" closable size="small" color="info"
                                variant="tonal" />
                        </template>
                    </v-combobox>
                </v-col>

                <!-- Model Identifier (Auto-populated) -->
                <v-col cols="12" md="6">
                    <v-combobox v-model="selectedModels" :items="availableModels" label="Model Identifier (Optional)"
                        placeholder="Auto-populated from DUT ISNs" prepend-inner-icon="mdi-cube-outline" multiple chips
                        closable-chips clearable hint="Models detected from selected ISNs" persistent-hint>
                        <template #chip="{ props, item }">
                            <v-chip v-bind="props" :text="String(item.value || item)" closable size="small" color="info"
                                variant="tonal" />
                        </template>
                    </v-combobox>
                </v-col>

                <!-- Validation Message -->
                <v-col v-if="validationMessage" cols="12">
                    <v-alert :type="validationType" density="compact">
                        {{ validationMessage }}
                    </v-alert>
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

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
    modelIdentifiers: () => []
})

// Emits
const emit = defineEmits<{
    'update:modelValue': [value: string[]]
    'update:siteIdentifiers': [value: string[]]
    'update:modelIdentifiers': [value: string[]]
    'change': [value: { isns: string[], sites: string[], models: string[], valid: boolean }]
}>()

// State
const inputMode = ref<'multiple' | 'bulk'>('multiple')
const selectedISNs = ref<string[]>(props.modelValue)
const bulkText = ref('')
const validationMessage = ref<string | null>(null)
const validationType = ref<'success' | 'warning' | 'error'>('success')

// Site and Model state
const selectedSites = ref<string[]>(props.siteIdentifiers)
const selectedModels = ref<string[]>(props.modelIdentifiers)
const availableSites = ref<string[]>([])
const availableModels = ref<string[]>([])

// Validation Rules
const rules = {
    required: (value: string) => !!value || 'ISN is required',
    isnFormat: (value: string) => {
        // Accept any non-empty alphanumeric string
        if (!value) return true
        const isn = value.trim()
        return /^[A-Za-z0-9]+$/.test(isn) || 'ISN should contain only letters and numbers'
    },
    minOneISN: (value: string[]) => {
        return value.length > 0 || 'At least one ISN is required'
    }
}

// Computed
const isValid = computed(() => {
    return selectedISNs.value.length > 0 &&
        selectedISNs.value.length <= props.maxISNs
})

// Methods
function parseBulkISNs() {
    if (!bulkText.value) return

    // Parse ISNs from bulk text (support newlines, commas, spaces)
    const separators = /[\n,\s]+/
    const isns = bulkText.value
        .split(separators)
        .map(isn => isn.trim())
        .filter(isn => isn.length > 0 && /^[A-Za-z0-9]+$/.test(isn)) // Accept alphanumeric ISNs

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

function removeISN(index: number) {
    selectedISNs.value.splice(index, 1)
}

function clearAll() {
    selectedISNs.value = []
    bulkText.value = ''
    validationMessage.value = null
}

// Watch for changes and emit (with sanitization)
watch(selectedISNs, (newValue) => {
    // Sanitize ISNs by removing non-alphanumeric characters and trimming
    const sanitized = newValue.map(isn => String(isn).replace(/[^A-Za-z0-9]/g, '').trim()).filter(isn => isn.length > 0)
    
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
        valid: isValid.value
    })
}, { deep: true })

// Watch for site changes and emit
watch(selectedSites, (newValue) => {
    emit('update:siteIdentifiers', newValue)
    emit('change', {
        isns: selectedISNs.value,
        sites: newValue,
        models: selectedModels.value,
        valid: isValid.value
    })
}, { deep: true })

// Watch for model changes and emit
watch(selectedModels, (newValue) => {
    emit('update:modelIdentifiers', newValue)
    emit('change', {
        isns: selectedISNs.value,
        sites: selectedSites.value,
        models: newValue,
        valid: isValid.value
    })
}, { deep: true })

// Initialize from props
watch(() => props.modelValue, (newValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(selectedISNs.value)) {
        selectedISNs.value = [...newValue]
    }
})

watch(() => props.siteIdentifiers, (newValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(selectedSites.value)) {
        selectedSites.value = [...newValue]
    }
})

watch(() => props.modelIdentifiers, (newValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(selectedModels.value)) {
        selectedModels.value = [...newValue]
    }
})

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
    }
})
</script>

<style scoped>
.v-btn-toggle {
    width: 100%;
}
</style>
