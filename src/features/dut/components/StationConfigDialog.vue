<template>
    <v-dialog v-model="internalShow" max-width="800px" persistent scrollable>
        <v-card>
            <v-card-title class="d-flex align-center justify-space-between bg-secondary">
                <div class="d-flex align-center">
                    <v-icon class="mr-2">mdi-cog</v-icon>
                    Configure Station: {{ station?.display_station_name }}
                </div>
                <v-btn icon="mdi-close" variant="text" @click="handleClose" />
            </v-card-title>

            <v-card-subtitle class="pa-3 bg-grey-lighten-4">
                <div class="text-body-2">
                    <strong>Station Name:</strong> {{ station?.station_name }}
                </div>
                <div class="text-caption text-medium-emphasis">
                    Configure device IDs and test status for this station
                </div>
            </v-card-subtitle>

            <v-divider />

            <v-card-text class="pa-4">
                <!-- Test Status Selection -->
                <v-card variant="outlined" class="mb-4">
                    <v-card-title class="text-subtitle-1 bg-grey-lighten-5">
                        <v-icon start color="primary">mdi-filter</v-icon>
                        Test Status Filter
                    </v-card-title>
                    <v-card-text>
                        <v-radio-group v-model="localConfig.testStatus" inline hide-details>
                            <v-radio label="All (PASS & FAIL)" value="ALL" color="primary" />
                            <v-radio label="PASS Only" value="PASS" color="success" />
                            <v-radio label="FAIL Only" value="FAIL" color="error" />
                        </v-radio-group>
                    </v-card-text>
                </v-card>

                <!-- Device IDs Selection -->
                <v-card variant="outlined">
                    <v-card-title class="text-subtitle-1 bg-grey-lighten-5 d-flex align-center justify-space-between">
                        <div>
                            <v-icon start color="primary">mdi-devices</v-icon>
                            Device IDs
                        </div>
                        <v-btn v-if="!loadingDevices" color="primary" variant="text" size="small"
                            prepend-icon="mdi-refresh" @click="handleRefreshDevices">
                            Refresh
                        </v-btn>
                    </v-card-title>
                    <v-card-text>
                        <!-- Loading State -->
                        <div v-if="loadingDevices" class="text-center pa-4">
                            <v-progress-circular indeterminate color="primary" />
                            <div class="text-caption text-medium-emphasis mt-2">Loading device IDs...</div>
                        </div>

                        <!-- Error State -->
                        <v-alert v-else-if="deviceError" type="error" variant="tonal" class="mb-3">
                            {{ deviceError }}
                        </v-alert>

                        <!-- Device IDs Selection -->
                        <div v-else>
                            <div class="mb-3">
                                <v-btn-toggle v-model="selectAllDevices" color="primary" density="compact" class="mb-2">
                                    <v-btn :value="true" size="small" variant="outlined">
                                        <v-icon start>mdi-checkbox-multiple-marked</v-icon>
                                        Select All ({{ availableDeviceIds.length }})
                                    </v-btn>
                                </v-btn-toggle>
                            </div>

                            <!-- Search -->
                            <v-text-field v-model="deviceSearchQuery" label="Search Device IDs"
                                prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details
                                clearable class="mb-3" placeholder="Search..." />

                            <!-- No devices available -->
                            <v-alert v-if="availableDeviceIds.length === 0" type="info" variant="tonal">
                                No device IDs available for the selected date range
                            </v-alert>

                            <!-- Device IDs List -->
                            <div v-else style="max-height: 300px; overflow-y: auto;" class="border rounded pa-2">
                                <v-checkbox v-for="deviceId in filteredDeviceIds" :key="deviceId"
                                    :model-value="localConfig.deviceIds.includes(deviceId)" :label="deviceId"
                                    @update:model-value="toggleDeviceId(deviceId)" density="compact" hide-details
                                    class="mb-1" />

                                <div v-if="filteredDeviceIds.length === 0" class="text-center text-medium-emphasis pa-4">
                                    No matching device IDs found
                                </div>
                            </div>

                            <!-- Selected Count -->
                            <div v-if="localConfig.deviceIds.length > 0" class="mt-3">
                                <v-chip color="success" variant="tonal" size="small">
                                    {{ localConfig.deviceIds.length }} Device(s) Selected
                                </v-chip>
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
import type { Station } from '@/features/dut_logs/api/iplasApi'
import type { StationConfig } from './StationSelectionDialog.vue'

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
}

const props = defineProps<Props>()

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void
    (e: 'save', config: StationConfig): void
    (e: 'remove', displayName: string): void
    (e: 'refresh-devices'): void
}>()

const internalShow = computed({
    get: () => props.show,
    set: (value) => emit('update:show', value)
})

const localConfig = ref<StationConfig>({
    displayName: '',
    stationName: '',
    deviceIds: [],
    testStatus: 'ALL'
})

const deviceSearchQuery = ref('')
const selectAllDevices = ref<boolean>(false)

const isExistingConfig = computed(() => !!props.existingConfig)

const filteredDeviceIds = computed(() => {
    if (!deviceSearchQuery.value) return props.availableDeviceIds

    const query = deviceSearchQuery.value.toLowerCase()
    return props.availableDeviceIds.filter(id => id.toLowerCase().includes(query))
})

// Watch for select all toggle
watch(selectAllDevices, (value) => {
    if (value) {
        localConfig.value.deviceIds = [...props.availableDeviceIds]
    } else {
        // Only clear if all were previously selected
        if (localConfig.value.deviceIds.length === props.availableDeviceIds.length) {
            localConfig.value.deviceIds = []
        }
    }
})

// Watch for changes in selected device IDs to update selectAllDevices
watch(() => localConfig.value.deviceIds.length, (newLength) => {
    selectAllDevices.value = newLength === props.availableDeviceIds.length && newLength > 0
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
                testStatus: 'ALL'
            }
        }
        deviceSearchQuery.value = ''
    }
})

function toggleDeviceId(deviceId: string): void {
    const index = localConfig.value.deviceIds.indexOf(deviceId)
    if (index > -1) {
        localConfig.value.deviceIds.splice(index, 1)
    } else {
        localConfig.value.deviceIds.push(deviceId)
    }
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
</script>

<style scoped>
.border {
    border: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
