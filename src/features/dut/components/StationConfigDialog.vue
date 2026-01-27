<template>
    <v-dialog v-model="internalShow" max-width="900px" persistent scrollable>
        <v-card>
            <v-card-title class="d-flex align-center justify-space-between bg-secondary">
                <div class="d-flex align-center">
                    <v-icon class="mr-2">mdi-cog</v-icon>
                    Configure Station: {{ station?.display_station_name }}
                </div>
                <v-btn icon="mdi-close" variant="text" color="white" @click="handleClose" />
            </v-card-title>

            <v-card-subtitle class="pa-3 bg-grey-lighten-4">
                <div class="text-caption text-medium-emphasis">
                    Configure test status, device IDs, and test items for this station
                </div>
            </v-card-subtitle>

            <v-divider />

            <v-card-text class="pa-4" style="max-height: 70vh; overflow-y: auto;">
                <!-- Test Status Selection - Dropdown -->
                <v-row dense class="mb-4">
                    <v-col cols="12" md="6">
                        <v-select v-model="localConfig.testStatus" :items="testStatusOptions" item-title="title"
                            item-value="value" label="Test Status Filter" variant="outlined" density="comfortable"
                            prepend-inner-icon="mdi-filter" hide-details>
                            <template #item="{ props: itemProps, item }">
                                <v-list-item v-bind="itemProps">
                                    <template #prepend>
                                        <v-icon :color="getStatusColor(item.value)">
                                            {{ getStatusIcon(item.value) }}
                                        </v-icon>
                                    </template>
                                </v-list-item>
                            </template>
                            <template #selection="{ item }">
                                <v-chip :color="getStatusColor(item.value)" size="small" variant="flat" class="mr-1">
                                    <v-icon start size="small">{{ getStatusIcon(item.value) }}</v-icon>
                                    {{ item.title }}
                                </v-chip>
                            </template>
                        </v-select>
                    </v-col>
                    <v-col cols="12" md="6">
                        <!-- Device IDs Selection - Dropdown -->
                        <v-autocomplete v-model="localConfig.deviceIds" :items="availableDeviceIds" label="Device IDs"
                            variant="outlined" density="comfortable" prepend-inner-icon="mdi-devices" multiple
                            chips closable-chips hide-details :loading="loadingDevices"
                            :disabled="loadingDevices || availableDeviceIds.length === 0"
                            placeholder="Select devices (empty = all)" clearable>
                            <template #prepend-item>
                                <v-list-item @click="toggleSelectAllDevices">
                                    <template #prepend>
                                        <v-checkbox-btn :model-value="allDevicesSelected"
                                            :indeterminate="someDevicesSelected && !allDevicesSelected" />
                                    </template>
                                    <v-list-item-title>
                                        {{ allDevicesSelected ? 'Deselect All' : 'Select All' }}
                                    </v-list-item-title>
                                    <template #append>
                                        <v-chip size="x-small" color="primary">{{ availableDeviceIds.length }}</v-chip>
                                    </template>
                                </v-list-item>
                                <v-divider />
                            </template>
                            <template #chip="{ props: chipProps, item }">
                                <v-chip v-bind="chipProps" size="small" closable>{{ item.value }}</v-chip>
                            </template>
                            <template #no-data>
                                <v-list-item>
                                    <v-list-item-title class="text-medium-emphasis">
                                        {{ loadingDevices ? 'Loading devices...' : 'No devices available' }}
                                    </v-list-item-title>
                                </v-list-item>
                            </template>
                            <template #append>
                                <v-btn icon="mdi-refresh" size="small" variant="text" :loading="loadingDevices"
                                    @click.stop="handleRefreshDevices" />
                            </template>
                        </v-autocomplete>
                    </v-col>
                </v-row>

                <!-- Error Alert for Device Loading -->
                <v-alert v-if="deviceError" type="error" variant="tonal" class="mb-4" closable>
                    {{ deviceError }}
                </v-alert>

                <!-- Test Items Selection Section -->
                <v-card variant="outlined">
                    <v-card-title class="text-subtitle-1 bg-grey-lighten-5 d-flex align-center justify-space-between">
                        <div>
                            <v-icon start color="primary">mdi-format-list-checks</v-icon>
                            Test Items Selection
                        </div>
                        <div class="d-flex align-center gap-2">
                            <v-chip v-if="localConfig.selectedTestItems.length > 0" size="small" color="success"
                                variant="tonal">
                                {{ localConfig.selectedTestItems.length }} / {{ availableTestItems.length }} Selected
                            </v-chip>
                            <v-chip v-else size="small" color="info" variant="tonal">
                                All Items ({{ availableTestItems.length }})
                            </v-chip>
                            <v-btn v-if="!loadingTestItems" color="primary" variant="text" size="small"
                                prepend-icon="mdi-refresh" @click="handleRefreshTestItems">
                                Refresh
                            </v-btn>
                        </div>
                    </v-card-title>
                    <v-card-text class="pa-3">
                        <!-- Loading State -->
                        <div v-if="loadingTestItems" class="text-center pa-4">
                            <v-progress-circular indeterminate color="primary" />
                            <div class="text-caption text-medium-emphasis mt-2">Loading test items...</div>
                        </div>

                        <!-- Error State -->
                        <v-alert v-else-if="testItemsError" type="error" variant="tonal" class="mb-3">
                            {{ testItemsError }}
                        </v-alert>

                        <!-- No Test Items -->
                        <v-alert v-else-if="availableTestItems.length === 0" type="info" variant="tonal">
                            No test items available. Click "Refresh" to load test items, or ensure device IDs and date
                            range are selected.
                        </v-alert>

                        <!-- Test Items Selection -->
                        <div v-else>
                            <!-- Quick Actions and Search -->
                            <v-row dense class="mb-3">
                                <v-col cols="12">
                                    <v-text-field v-model="testItemSearchQuery" label="Search Test Items"
                                        prepend-inner-icon="mdi-magnify" variant="outlined" density="compact"
                                        hide-details clearable placeholder="Search by test item name..." />
                                </v-col>
                            </v-row>
                            
                            <!-- Test Item Type Filters (multi-select) -->
                            <v-row dense class="mb-3">
                                <v-col cols="12" class="d-flex align-center gap-2 flex-wrap">
                                    <span class="text-caption text-medium-emphasis">Filter:</span>
                                    <v-chip-group v-model="testItemTypeFilter" multiple>
                                        <v-chip value="all" filter label variant="outlined" color="primary" size="small">
                                            All
                                        </v-chip>
                                        <v-chip value="value" filter label variant="outlined" color="success" size="small">
                                            Criteria
                                        </v-chip>
                                        <v-chip value="non-value" filter label variant="outlined" color="warning" size="small">
                                            Non-Criteria
                                        </v-chip>
                                        <v-chip value="bin" filter label variant="outlined" color="grey" size="small">
                                            Bin
                                        </v-chip>
                                    </v-chip-group>
                                    <v-divider vertical class="mx-2" />
                                    <span class="text-caption text-medium-emphasis">Select:</span>
                                    <v-btn size="x-small" variant="tonal" color="primary"
                                        @click="selectAllTestItems">
                                        All
                                    </v-btn>
                                    <v-btn size="x-small" variant="tonal" color="success"
                                        @click="selectValueTestItems">
                                        Criteria
                                    </v-btn>
                                    <v-btn size="x-small" variant="tonal" color="warning"
                                        @click="selectNonValueTestItems">
                                        Non-Criteria
                                    </v-btn>
                                    <v-btn size="x-small" variant="tonal" color="grey"
                                        @click="selectBinTestItems">
                                        Bin
                                    </v-btn>
                                    <v-btn size="x-small" variant="outlined" color="error"
                                        @click="clearTestItemSelection">
                                        Clear
                                    </v-btn>
                                </v-col>
                            </v-row>

                            <!-- Test Items List -->
                            <div style="max-height: 300px; overflow-y: auto;" class="border rounded">
                                <v-list density="compact" class="pa-0">
                                    <v-list-item v-for="item in filteredTestItems" :key="item.name"
                                        @click="toggleTestItem(item.name)" class="test-item-row">
                                        <template #prepend>
                                            <v-checkbox-btn
                                                :model-value="localConfig.selectedTestItems.includes(item.name)"
                                                @click.stop="toggleTestItem(item.name)" density="compact" />
                                        </template>
                                        <v-list-item-title class="text-body-2">
                                            {{ item.name }}
                                        </v-list-item-title>
                                        <template #append>
                                            <v-chip :color="getTestItemTypeColor(item)" size="x-small"
                                                variant="tonal">
                                                {{ getTestItemTypeLabel(item) }}
                                            </v-chip>
                                        </template>
                                    </v-list-item>
                                </v-list>

                                <div v-if="filteredTestItems.length === 0"
                                    class="text-center text-medium-emphasis pa-4">
                                    No matching test items found
                                </div>
                            </div>

                            <div class="text-caption text-medium-emphasis mt-2">
                                <v-icon size="x-small">mdi-information</v-icon>
                                Leave empty to include all test items. Select specific items to filter results.
                            </div>
                        </div>
                    </v-card-text>
                </v-card>
            </v-card-text>

            <v-divider />

            <!-- Actions -->
            <v-card-actions class="pa-4">
                <v-btn color="error" variant="outlined" @click="handleRemove" v-if="isExistingConfig">
                    <v-icon start>mdi-delete</v-icon>
                    Remove Station
                </v-btn>
                <v-spacer />
                <v-btn color="grey" variant="outlined" @click="handleClose">
                    Cancel
                </v-btn>
                <v-btn color="primary" variant="flat" @click="handleSave">
                    Save Configuration
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Station } from '@/features/dut_logs/composables/useIplasApi'
import type { StationConfig } from './StationSelectionDialog.vue'

export interface TestItemInfo {
    name: string
    isValue: boolean // true if it's a value test item (has numeric VALUE)
    isBin: boolean   // true if it's a binary test item (PASS/FAIL only)
}

interface Props {
    show: boolean
    station: Station | null
    site: string
    project: string
    startTime: string
    endTime: string
    existingConfig?: StationConfig
    availableDeviceIds: string[]
    loadingDevices: boolean
    deviceError: string | null
    availableTestItems: TestItemInfo[]
    loadingTestItems: boolean
    testItemsError: string | null
}

const props = withDefaults(defineProps<Props>(), {
    availableTestItems: () => [],
    loadingTestItems: false,
    testItemsError: null
})

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void
    (e: 'save', config: StationConfig): void
    (e: 'remove', displayName: string): void
    (e: 'refresh-devices'): void
    (e: 'refresh-test-items'): void
}>()

const internalShow = computed({
    get: () => props.show,
    set: (value) => emit('update:show', value)
})

// Test Status Options
const testStatusOptions = [
    { title: 'All (PASS & FAIL)', value: 'ALL' },
    { title: 'PASS Only', value: 'PASS' },
    { title: 'FAIL Only', value: 'FAIL' }
]

const localConfig = ref<StationConfig>({
    displayName: '',
    stationName: '',
    deviceIds: [],
    testStatus: 'ALL',
    selectedTestItems: []
})

const testItemSearchQuery = ref('')
const testItemTypeFilter = ref<('all' | 'value' | 'non-value' | 'bin')[]>(['all'])

const isExistingConfig = computed(() => !!props.existingConfig)

// Device selection helpers
const allDevicesSelected = computed(() => {
    return props.availableDeviceIds.length > 0 &&
        localConfig.value.deviceIds.length === props.availableDeviceIds.length
})

const someDevicesSelected = computed(() => {
    return localConfig.value.deviceIds.length > 0
})

// Test Items filtering (supports multi-select type filter)
const filteredTestItems = computed(() => {
    let items = [...props.availableTestItems]
    
    // Apply type filter (multi-select)
    if (testItemTypeFilter.value.length > 0 && !testItemTypeFilter.value.includes('all')) {
        items = items.filter(item => {
            return testItemTypeFilter.value.some(filterType => {
                switch (filterType) {
                    case 'value':
                        return item.isValue
                    case 'non-value':
                        return !item.isValue && !item.isBin
                    case 'bin':
                        return item.isBin
                    default:
                        return true
                }
            })
        })
    }
    
    // Apply search query
    if (testItemSearchQuery.value) {
        const query = testItemSearchQuery.value.toLowerCase()
        items = items.filter(item => item.name.toLowerCase().includes(query))
    }
    
    return items
})

// Initialize config when dialog opens
watch(() => props.show, (newShow) => {
    if (newShow && props.station) {
        if (props.existingConfig) {
            // Load existing config
            localConfig.value = { ...props.existingConfig }
        } else {
            // Initialize new config
            localConfig.value = {
                displayName: props.station.display_station_name,
                stationName: props.station.station_name,
                deviceIds: [],
                testStatus: 'ALL',
                selectedTestItems: []
            }
        }
        testItemSearchQuery.value = ''
    }
})

// Helper functions
function getStatusColor(value: string): string {
    switch (value) {
        case 'PASS': return 'success'
        case 'FAIL': return 'error'
        default: return 'primary'
    }
}

function getStatusIcon(value: string): string {
    switch (value) {
        case 'PASS': return 'mdi-check-circle'
        case 'FAIL': return 'mdi-close-circle'
        default: return 'mdi-format-list-bulleted'
    }
}

function toggleSelectAllDevices(): void {
    if (allDevicesSelected.value) {
        localConfig.value.deviceIds = []
    } else {
        localConfig.value.deviceIds = [...props.availableDeviceIds]
    }
}

function toggleTestItem(name: string): void {
    const index = localConfig.value.selectedTestItems.indexOf(name)
    if (index > -1) {
        localConfig.value.selectedTestItems.splice(index, 1)
    } else {
        localConfig.value.selectedTestItems.push(name)
    }
}

function selectAllTestItems(): void {
    localConfig.value.selectedTestItems = props.availableTestItems.map(item => item.name)
}

function selectValueTestItems(): void {
    localConfig.value.selectedTestItems = props.availableTestItems
        .filter(item => item.isValue)
        .map(item => item.name)
}

function selectNonValueTestItems(): void {
    // Non-Criteria: items that are NOT value AND NOT bin (e.g., items with empty/non-numeric values)
    localConfig.value.selectedTestItems = props.availableTestItems
        .filter(item => !item.isValue && !item.isBin)
        .map(item => item.name)
}

function selectBinTestItems(): void {
    // Bin: items that have PASS/FAIL only values
    localConfig.value.selectedTestItems = props.availableTestItems
        .filter(item => item.isBin)
        .map(item => item.name)
}

function clearTestItemSelection(): void {
    localConfig.value.selectedTestItems = []
}

function getTestItemTypeLabel(item: TestItemInfo): string {
    if (item.isValue) return 'CRITERIA'
    if (item.isBin) return 'BIN'
    return 'NON-CRITERIA'
}

function getTestItemTypeColor(item: TestItemInfo): string {
    if (item.isValue) return 'success'
    if (item.isBin) return 'grey'
    return 'warning'
}

function handleSave(): void {
    if (!props.station) return

    // Update display and station names to ensure they're current
    localConfig.value.displayName = props.station.display_station_name
    localConfig.value.stationName = props.station.station_name

    emit('save', { ...localConfig.value })
    internalShow.value = false
}

function handleRemove(): void {
    if (props.station) {
        emit('remove', props.station.display_station_name)
        internalShow.value = false
    }
}

function handleClose(): void {
    internalShow.value = false
}

function handleRefreshDevices(): void {
    emit('refresh-devices')
}

function handleRefreshTestItems(): void {
    emit('refresh-test-items')
}
</script>

<style scoped>
.border {
    border: 1px solid rgba(0, 0, 0, 0.12);
}

.gap-2 {
    gap: 0.5rem;
}

.test-item-row {
    cursor: pointer;
}

.test-item-row:hover {
    background-color: rgba(0, 0, 0, 0.04);
}
</style>
