<template>
    <v-expansion-panels v-model="panel">
        <v-expansion-panel>
            <v-expansion-panel-title>
                <template #default="{ expanded }">
                    <v-row no-gutters>
                        <v-col cols="4" class="d-flex justify-start align-center">
                            <v-icon :class="expanded ? 'rotate-180' : ''" class="mr-2">
                                mdi-filter-variant
                            </v-icon>
                            <span>Advanced Filters</span>
                        </v-col>
                        <v-col cols="8" class="text-caption text-medium-emphasis text-right">
                            {{ filterSummary }}
                        </v-col>
                    </v-row>
                </template>
            </v-expansion-panel-title>

            <v-expansion-panel-text>
                <v-row>
                    <!-- Station Filter -->
                    <v-col cols="12" md="6">
                        <v-combobox v-model="filters.stations" label="Stations (Optional)"
                            placeholder="Enter station IDs or names" prepend-inner-icon="mdi-router-wireless" chips
                            multiple closable-chips clearable hint="Filter by specific stations" persistent-hint>
                            <template #chip="{ props, item }">
                                <v-chip v-bind="props" :text="item.value" size="small" closable />
                            </template>
                        </v-combobox>
                    </v-col>

                    <!-- Device Filter -->
                    <v-col cols="12" md="6">
                        <v-combobox v-model="filters.device_identifiers" label="Devices (Optional)"
                            placeholder="Enter device IDs or names" prepend-inner-icon="mdi-chip" chips multiple
                            closable-chips clearable hint="Filter by specific devices" persistent-hint>
                            <template #chip="{ props, item }">
                                <v-chip v-bind="props" :text="item.value" size="small" closable />
                            </template>
                        </v-combobox>
                    </v-col>

                    <!-- Site Filter -->
                    <v-col cols="12" md="6">
                        <v-text-field v-model="filters.site_identifier" label="Site (Optional)"
                            placeholder="e.g., 2 or PTB" prepend-inner-icon="mdi-office-building" clearable
                            hint="Site ID or name" persistent-hint />
                    </v-col>

                    <!-- Model Filter -->
                    <v-col cols="12" md="6">
                        <v-text-field v-model="filters.model_identifier" label="Model (Optional)"
                            placeholder="e.g., 44 or HH5K" prepend-inner-icon="mdi-package-variant" clearable
                            hint="Model ID or name" persistent-hint />
                    </v-col>

                    <!-- Test Item Include Patterns -->
                    <v-col cols="12">
                        <v-combobox v-model="filters.test_item_filters" label="Include Test Patterns (Optional)"
                            placeholder="e.g., WiFi_TX_POW_6185_11AX_MCS11_B160" prepend-inner-icon="mdi-filter-plus"
                            chips multiple closable-chips clearable
                            hint="Regex patterns to include specific measurements" persistent-hint>
                            <template #chip="{ props, item }">
                                <v-chip v-bind="props" :text="item.value" size="small" color="success" variant="tonal"
                                    closable />
                            </template>
                        </v-combobox>
                    </v-col>

                    <!-- Test Item Exclude Patterns -->
                    <v-col cols="12">
                        <v-combobox v-model="filters.exclude_test_item_filters" label="Exclude Test Patterns (Optional)"
                            placeholder="e.g., WiFi_PA_POW_OLD_6985_11AX_MCS9_B160"
                            prepend-inner-icon="mdi-filter-minus" chips multiple closable-chips clearable
                            hint="Regex patterns to exclude specific measurements" persistent-hint>
                            <template #chip="{ props, item }">
                                <v-chip v-bind="props" :text="item.value" size="small" color="error" variant="tonal"
                                    closable />
                            </template>
                        </v-combobox>
                    </v-col>

                    <!-- Criteria File Upload -->
                    <v-col cols="12">
                        <v-file-input v-model="criteriaFileArray" label="Criteria File (Optional)"
                            placeholder="Upload criteria configuration" prepend-inner-icon="mdi-file-upload"
                            accept=".ini,.txt,.json,.csv" clearable show-size
                            hint="Upload .ini, .txt, .json, or .csv criteria file" persistent-hint
                            @update:model-value="handleFileChange">
                            <template v-if="filters.criteria_file" #append>
                                <v-chip size="small" color="primary">
                                    {{ formatFileSize(filters.criteria_file.size) }}
                                </v-chip>
                            </template>
                        </v-file-input>
                    </v-col>

                    <!-- Action Buttons -->
                    <v-col cols="12" class="d-flex justify-space-between">
                        <v-btn variant="text" prepend-icon="mdi-refresh" @click="clearFilters">
                            Clear Filters
                        </v-btn>

                        <v-btn color="primary" variant="outlined" prepend-icon="mdi-check" @click="applyFilters">
                            Apply Filters
                        </v-btn>
                    </v-col>
                </v-row>
            </v-expansion-panel-text>
        </v-expansion-panel>
    </v-expansion-panels>
</template>

<script setup lang="ts">
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
const panel = ref<number | undefined>(undefined) // undefined = collapsed
const filters = ref<Props['modelValue']>({ ...props.modelValue })
const criteriaFileArray = ref<File[]>([])

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
function handleFileChange(files: File | File[] | null) {
  if (files) {
    const fileArray = Array.isArray(files) ? files : [files]
    if (fileArray.length > 0) {
      filters.value.criteria_file = fileArray[0]
    } else {
      filters.value.criteria_file = null
    }
  } else {
    filters.value.criteria_file = null
  }
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
  criteriaFileArray.value = []
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
    if (newValue.criteria_file) {
      criteriaFileArray.value = [newValue.criteria_file]
    } else {
      criteriaFileArray.value = []
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.rotate-180 {
    transform: rotate(180deg);
    transition: transform 0.3s ease;
}
</style>
