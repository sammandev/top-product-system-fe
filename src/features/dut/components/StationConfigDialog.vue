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
                            variant="outlined" density="comfortable" prepend-inner-icon="mdi-devices" multiple chips
                            closable-chips hide-details :loading="loadingDevices"
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

                            <!-- Quick Select Buttons -->
                            <v-row dense class="mb-3">
                                <v-col cols="12" class="d-flex align-center gap-2 flex-wrap">
                                    <span class="text-caption text-medium-emphasis">Select:</span>
                                    <v-btn size="x-small" variant="tonal" color="info" @click="selectDisplayedTestItems"
                                        :disabled="filteredTestItems.length === 0">
                                        Select Displayed ({{ filteredTestItems.length }})
                                    </v-btn>
                                    <v-btn size="x-small" variant="tonal" color="success" @click="selectValueTestItems">
                                        Criteria
                                    </v-btn>
                                    <v-btn size="x-small" variant="tonal" color="warning"
                                        @click="selectNonValueTestItems">
                                        Non-Criteria
                                    </v-btn>
                                    <v-btn size="x-small" variant="outlined" color="error"
                                        @click="clearTestItemSelection">
                                        Clear
                                    </v-btn>
                                    <v-divider vertical class="mx-2" />
                                    <v-btn size="x-small" variant="flat" color="secondary"
                                        prepend-icon="mdi-tune-variant" @click="openBulkScoringConfig"
                                        :disabled="selectedCriteriaCount === 0">
                                        Bulk Config ({{ selectedCriteriaCount }})
                                    </v-btn>
                                    <v-btn size="x-small" variant="flat" color="primary"
                                        prepend-icon="mdi-playlist-check" @click="selectDisplayedAndConfigureScore"
                                        :disabled="filteredTestItems.length === 0">
                                        Select Displayed & Configure Score ({{ displayedCriteriaCount }})
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
                                            <div class="d-flex align-center gap-1">
                                                <!-- Scoring Type Indicator (only for selected items with criteria) -->
                                                <v-btn
                                                    v-if="localConfig.selectedTestItems.includes(item.name) && item.isValue"
                                                    size="x-small" variant="tonal"
                                                    :color="getScoringTypeInfo(getTestItemScoringConfig(item.name).scoringType).color"
                                                    @click.stop="openScoringConfig(item.name)"
                                                    class="scoring-config-btn">
                                                    <v-icon start size="small">{{
                                                        getScoringTypeInfo(getTestItemScoringConfig(item.name).scoringType).icon
                                                        }}</v-icon>
                                                    {{
                                                        getScoringTypeInfo(getTestItemScoringConfig(item.name).scoringType).label
                                                    }}
                                                    <v-icon end size="x-small">mdi-chevron-down</v-icon>
                                                </v-btn>
                                                <v-chip :color="getTestItemTypeColor(item)" size="x-small"
                                                    variant="tonal">
                                                    {{ getTestItemTypeLabel(item) }}
                                                </v-chip>
                                            </div>
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
                                Leave empty to include all CRITERIA and NON-CRITERIA test items (excludes Bin items).
                                Select specific items to filter results. Click on scoring type button to configure scoring algorithm.
                            </div>
                        </div>
                    </v-card-text>
                </v-card>

                <!-- Scoring Configuration Dialog -->
                <v-dialog v-model="scoringConfigDialog" max-width="500px">
                    <v-card v-if="scoringConfigItem">
                        <v-card-title class="d-flex align-center bg-primary">
                            <v-icon class="mr-2">mdi-tune</v-icon>
                            Configure Scoring
                        </v-card-title>
                        <v-card-subtitle class="bg-primary pb-3">
                            {{ scoringConfigItem }}
                        </v-card-subtitle>

                        <v-card-text class="pa-4">
                            <!-- Scoring Type Selection -->
                            <v-select :model-value="getTestItemScoringConfig(scoringConfigItem).scoringType"
                                @update:model-value="updateTestItemScoringType(scoringConfigItem!, $event)"
                                :items="scoringTypeOptions" item-title="title" item-value="value"
                                label="Scoring Algorithm" variant="outlined" density="comfortable">
                                <template #item="{ props: itemProps, item }">
                                    <v-list-item v-bind="itemProps">
                                        <template #prepend>
                                            <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                                        </template>
                                        <template #subtitle>
                                            {{ item.raw.subtitle }}
                                        </template>
                                        <template #append>
                                            <v-chip v-if="item.raw.requiresTarget" size="x-small" color="warning"
                                                variant="tonal">
                                                Requires Target
                                            </v-chip>
                                        </template>
                                    </v-list-item>
                                </template>
                                <template #selection="{ item }">
                                    <v-chip :color="item.raw.color" size="small" variant="flat">
                                        <v-icon start size="small">{{ item.raw.icon }}</v-icon>
                                        {{ item.title }}
                                    </v-chip>
                                </template>
                            </v-select>

                            <!-- Target Value Input (for asymmetrical and throughput) -->
                            <v-text-field v-if="currentScoringTypeRequiresTarget"
                                :model-value="getTestItemScoringConfig(scoringConfigItem).target"
                                @update:model-value="updateTestItemTarget(scoringConfigItem!, $event ? Number($event) : undefined)"
                                label="Target Value" type="number" variant="outlined" density="comfortable"
                                hint="Required: Enter the optimal target value for scoring" persistent-hint
                                class="mt-4">
                                <template #prepend-inner>
                                    <v-icon color="warning">mdi-target</v-icon>
                                </template>
                            </v-text-field>

                            <!-- Weight Input -->
                            <v-text-field :model-value="getTestItemScoringConfig(scoringConfigItem).weight ?? 1.0"
                                @update:model-value="updateTestItemWeight(scoringConfigItem!, $event ? Number($event) : 1.0)"
                                label="Weight" type="number" variant="outlined" density="comfortable"
                                hint="Weight for this test item in overall score calculation (default: 1.0)"
                                persistent-hint class="mt-4" :min="0" :step="0.1">
                                <template #prepend-inner>
                                    <v-icon color="info">mdi-weight</v-icon>
                                </template>
                            </v-text-field>

                            <!-- Formula Preview -->
                            <v-alert type="info" variant="tonal" class="mt-4" density="compact">
                                <div class="text-caption font-weight-bold mb-1">Formula:</div>
                                <div class="text-body-2 font-italic">
                                    {{
                                        getScoringTypeInfo(getTestItemScoringConfig(scoringConfigItem).scoringType).description
                                    }}
                                </div>
                            </v-alert>
                        </v-card-text>

                        <v-divider />

                        <v-card-actions class="pa-3">
                            <v-spacer />
                            <v-btn color="primary" variant="flat" @click="closeScoringConfig">
                                Done
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>

                <!-- Bulk Scoring Configuration Dialog -->
                <v-dialog v-model="bulkScoringDialog" max-width="550px">
                    <v-card>
                        <v-card-title class="d-flex align-center bg-secondary">
                            <v-icon class="mr-2">mdi-tune-variant</v-icon>
                            Bulk Configure Scoring
                        </v-card-title>
                        <v-card-subtitle class="bg-secondary pb-3">
                            Apply to {{ selectedCriteriaCount }} selected criteria test item(s)
                        </v-card-subtitle>

                        <v-card-text class="pa-4">
                            <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                                <v-icon start size="small">mdi-information</v-icon>
                                This will apply the selected scoring algorithm and weight to all {{
                                selectedCriteriaCount }} selected
                                criteria test items.
                            </v-alert>

                            <!-- Scoring Type Selection -->
                            <v-select v-model="bulkScoringType" :items="scoringTypeOptions" item-title="title"
                                item-value="value" label="Scoring Algorithm" variant="outlined" density="comfortable">
                                <template #item="{ props: itemProps, item }">
                                    <v-list-item v-bind="itemProps">
                                        <template #prepend>
                                            <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                                        </template>
                                        <template #subtitle>
                                            {{ item.raw.subtitle }}
                                        </template>
                                        <template #append>
                                            <v-chip v-if="item.raw.requiresTarget" size="x-small" color="warning"
                                                variant="tonal">
                                                Requires Target
                                            </v-chip>
                                        </template>
                                    </v-list-item>
                                </template>
                                <template #selection="{ item }">
                                    <v-chip :color="item.raw.color" size="small" variant="flat">
                                        <v-icon start size="small">{{ item.raw.icon }}</v-icon>
                                        {{ item.title }}
                                    </v-chip>
                                </template>
                            </v-select>

                            <!-- Target Value Input (for asymmetrical and throughput) -->
                            <v-text-field v-if="bulkScoringTypeRequiresTarget" v-model.number="bulkTarget"
                                label="Target Value" type="number" variant="outlined" density="comfortable"
                                hint="Required: Enter the optimal target value for scoring" persistent-hint
                                class="mt-4">
                                <template #prepend-inner>
                                    <v-icon color="warning">mdi-target</v-icon>
                                </template>
                            </v-text-field>

                            <!-- Weight Input -->
                            <v-text-field v-model.number="bulkWeight" label="Weight" type="number" variant="outlined"
                                density="comfortable"
                                hint="Weight for these test items in overall score calculation (default: 1.0)"
                                persistent-hint class="mt-4" :min="0" :step="0.1">
                                <template #prepend-inner>
                                    <v-icon color="info">mdi-weight</v-icon>
                                </template>
                            </v-text-field>

                            <!-- Formula Preview -->
                            <v-alert type="info" variant="tonal" class="mt-4" density="compact">
                                <div class="text-caption font-weight-bold mb-1">Formula:</div>
                                <div class="text-body-2 font-italic">
                                    {{ getScoringTypeInfo(bulkScoringType).description }}
                                </div>
                            </v-alert>
                        </v-card-text>

                        <v-divider />

                        <v-card-actions class="pa-3">
                            <v-btn color="grey" variant="outlined" @click="closeBulkScoringConfig">
                                Cancel
                            </v-btn>
                            <v-spacer />
                            <v-btn color="primary" variant="flat" @click="applyBulkScoringConfig"
                                :disabled="bulkScoringTypeRequiresTarget && bulkTarget === undefined">
                                Apply to {{ selectedCriteriaCount }} Items
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>
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
import type { StationConfig, TestItemScoringConfig } from './StationSelectionDialog.vue'
import { SCORING_TYPE_INFO, type ScoringType } from '@/features/dut/types/scoring.types'

export interface TestItemInfo {
    name: string
    isValue: boolean // true if it's a value test item (has numeric VALUE, NOT PASS/FAIL/1/0/-999)
    isBin: boolean   // true if it's a binary test item (PASS/FAIL/1/0/-999 only)
    hasUcl: boolean  // true if it has UCL (upper control limit)
    hasLcl: boolean  // true if it has LCL (lower control limit)
}

// Available scoring types for selection (exclude binary as it's auto-detected)
const scoringTypeOptions = Object.entries(SCORING_TYPE_INFO)
    .filter(([key]) => key !== 'binary')
    .map(([key, info]) => ({
        value: key as ScoringType,
        title: info.label,
        subtitle: info.description,
        icon: info.icon,
        color: info.color,
        requiresTarget: info.requiredInputs?.includes('target') ?? false
    }))

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
    selectedTestItems: [],
    testItemScoringConfigs: {}
})

const testItemSearchQuery = ref('')

// Track which test item is currently being configured for scoring
const scoringConfigItem = ref<string | null>(null)
const scoringConfigDialog = ref(false)

// Bulk configuration state
const bulkScoringDialog = ref(false)
const bulkScoringType = ref<ScoringType>('symmetrical')
const bulkTarget = ref<number | undefined>(undefined)
const bulkWeight = ref<number>(1.0)

const isExistingConfig = computed(() => !!props.existingConfig)

// Device selection helpers
const allDevicesSelected = computed(() => {
    return props.availableDeviceIds.length > 0 &&
        localConfig.value.deviceIds.length === props.availableDeviceIds.length
})

const someDevicesSelected = computed(() => {
    return localConfig.value.deviceIds.length > 0
})

// Test Items filtering - only show Criteria and Non-Criteria items (exclude Bin)
const filteredTestItems = computed(() => {
    // Filter out Bin items, only keep Criteria (isValue) and Non-Criteria (!isValue && !isBin)
    let items = props.availableTestItems.filter(item => !item.isBin)

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
            localConfig.value = {
                ...props.existingConfig,
                testItemScoringConfigs: props.existingConfig.testItemScoringConfigs || {}
            }
        } else {
            // Initialize new config
            localConfig.value = {
                displayName: props.station.display_station_name,
                stationName: props.station.station_name,
                deviceIds: [],
                testStatus: 'ALL',
                selectedTestItems: [],
                testItemScoringConfigs: {}
            }
        }
        testItemSearchQuery.value = ''
        scoringConfigItem.value = null
        scoringConfigDialog.value = false
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

function selectDisplayedTestItems(): void {
    // Select only currently displayed/filtered test items
    localConfig.value.selectedTestItems = filteredTestItems.value.map(item => item.name)
}

function selectDisplayedAndConfigureScore(): void {
    // First select all displayed test items
    selectDisplayedTestItems()
    // Then open bulk scoring config dialog
    openBulkScoringConfig()
}

function selectValueTestItems(): void {
    // CRITERIA: test items with numeric VALUE AND (has UCL OR has LCL)
    localConfig.value.selectedTestItems = props.availableTestItems
        .filter(item => item.isValue && (item.hasUcl || item.hasLcl))
        .map(item => item.name)
}

function selectNonValueTestItems(): void {
    // NON-CRITERIA: test items with numeric VALUE but NO UCL AND NO LCL
    localConfig.value.selectedTestItems = props.availableTestItems
        .filter(item => item.isValue && !item.hasUcl && !item.hasLcl)
        .map(item => item.name)
}

function clearTestItemSelection(): void {
    localConfig.value.selectedTestItems = []
}

function getTestItemTypeLabel(item: TestItemInfo): string {
    // CRITERIA: has VALUE + (UCL or LCL)
    if (item.isValue && (item.hasUcl || item.hasLcl)) return 'CRITERIA'
    // NON-CRITERIA: has VALUE but no limits
    if (item.isValue && !item.hasUcl && !item.hasLcl) return 'NON-CRITERIA'
    return 'OTHER'
}

function getTestItemTypeColor(item: TestItemInfo): string {
    if (item.isValue && (item.hasUcl || item.hasLcl)) return 'success'
    if (item.isValue && !item.hasUcl && !item.hasLcl) return 'warning'
    return 'grey'
}

function handleSave(): void {
    if (!props.station) return

    // Update display and station names to ensure they're current
    localConfig.value.displayName = props.station.display_station_name
    localConfig.value.stationName = props.station.station_name

    // If no test items selected, default to all CRITERIA and NON-CRITERIA items (exclude Bin)
    const configToSave = { ...localConfig.value }
    if (configToSave.selectedTestItems.length === 0) {
        configToSave.selectedTestItems = props.availableTestItems
            .filter(item => !item.isBin)
            .map(item => item.name)
    }

    emit('save', configToSave)
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

// Scoring configuration helper functions
function getTestItemScoringConfig(testItemName: string): TestItemScoringConfig {
    return localConfig.value.testItemScoringConfigs?.[testItemName] || { scoringType: 'symmetrical' }
}

function openScoringConfig(testItemName: string): void {
    scoringConfigItem.value = testItemName
    scoringConfigDialog.value = true
}

function closeScoringConfig(): void {
    scoringConfigDialog.value = false
    scoringConfigItem.value = null
}

function getScoringTypeInfo(scoringType: ScoringType) {
    return SCORING_TYPE_INFO[scoringType]
}

function updateTestItemScoringType(testItemName: string, scoringType: ScoringType): void {
    if (!localConfig.value.testItemScoringConfigs) {
        localConfig.value.testItemScoringConfigs = {}
    }

    const existing = localConfig.value.testItemScoringConfigs[testItemName] || {}
    localConfig.value.testItemScoringConfigs[testItemName] = {
        ...existing,
        scoringType
    }

    // Clear target if not required
    const typeInfo = SCORING_TYPE_INFO[scoringType]
    if (!typeInfo.requiredInputs?.includes('target')) {
        delete localConfig.value.testItemScoringConfigs[testItemName].target
    }
}

function updateTestItemTarget(testItemName: string, target: number | undefined): void {
    if (!localConfig.value.testItemScoringConfigs) {
        localConfig.value.testItemScoringConfigs = {}
    }

    if (!localConfig.value.testItemScoringConfigs[testItemName]) {
        localConfig.value.testItemScoringConfigs[testItemName] = { scoringType: 'symmetrical' }
    }

    localConfig.value.testItemScoringConfigs[testItemName].target = target
}

function scoringRequiresTarget(scoringType: ScoringType): boolean {
    return SCORING_TYPE_INFO[scoringType].requiredInputs?.includes('target') ?? false
}

// Bulk configuration functions
function openBulkScoringConfig(): void {
    bulkScoringType.value = 'symmetrical'
    bulkTarget.value = undefined
    bulkWeight.value = 1.0
    bulkScoringDialog.value = true
}

function closeBulkScoringConfig(): void {
    bulkScoringDialog.value = false
}

function applyBulkScoringConfig(): void {
    if (!localConfig.value.testItemScoringConfigs) {
        localConfig.value.testItemScoringConfigs = {}
    }

    // Apply to all selected criteria test items (has VALUE + UCL or LCL)
    const criteriaItems = props.availableTestItems
        .filter(item => item.isValue && (item.hasUcl || item.hasLcl) && localConfig.value.selectedTestItems.includes(item.name))

    for (const item of criteriaItems) {
        const config: TestItemScoringConfig = {
            scoringType: bulkScoringType.value,
            weight: bulkWeight.value
        }

        // Only add target if required and provided
        if (scoringRequiresTarget(bulkScoringType.value) && bulkTarget.value !== undefined) {
            config.target = bulkTarget.value
        }

        localConfig.value.testItemScoringConfigs[item.name] = config
    }

    closeBulkScoringConfig()
}

// Get count of selected criteria items for bulk config
const selectedCriteriaCount = computed(() => {
    // CRITERIA: has VALUE + (UCL or LCL)
    return props.availableTestItems
        .filter(item => item.isValue && (item.hasUcl || item.hasLcl) && localConfig.value.selectedTestItems.includes(item.name))
        .length
})

// Get count of criteria items in currently displayed/filtered list
const displayedCriteriaCount = computed(() => {
    return filteredTestItems.value
        .filter(item => item.isValue && (item.hasUcl || item.hasLcl))
        .length
})

const bulkScoringTypeRequiresTarget = computed(() => {
    return scoringRequiresTarget(bulkScoringType.value)
})

// Update test item weight
function updateTestItemWeight(testItemName: string, weight: number | undefined): void {
    if (!localConfig.value.testItemScoringConfigs) {
        localConfig.value.testItemScoringConfigs = {}
    }

    if (!localConfig.value.testItemScoringConfigs[testItemName]) {
        localConfig.value.testItemScoringConfigs[testItemName] = { scoringType: 'symmetrical' }
    }

    localConfig.value.testItemScoringConfigs[testItemName].weight = weight ?? 1.0
}

// Computed for current scoring config being edited
const currentScoringConfig = computed(() => {
    if (!scoringConfigItem.value) return null
    return getTestItemScoringConfig(scoringConfigItem.value)
})

const currentScoringTypeRequiresTarget = computed(() => {
    if (!currentScoringConfig.value) return false
    return scoringRequiresTarget(currentScoringConfig.value.scoringType)
})
</script>

<style scoped>
.border {
    border: 1px solid rgba(0, 0, 0, 0.12);
}

.gap-1 {
    gap: 0.25rem;
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

.scoring-config-btn {
    text-transform: none;
    font-size: 0.7rem;
}
</style>
