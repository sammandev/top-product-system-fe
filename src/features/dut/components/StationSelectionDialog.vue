<template>
    <v-dialog v-model="internalShow" max-width="900px" persistent>
        <v-card>
            <v-card-title class="d-flex align-center justify-space-between bg-primary">
                <div class="d-flex align-center">
                    <v-icon class="mr-2">mdi-format-list-checkbox</v-icon>
                    Select Stations
                </div>
                <v-btn icon="mdi-close" variant="text" color="white" @click="handleClose" />
            </v-card-title>

            <!-- Search and Filter -->
            <v-card-text class="pa-3">
                <v-text-field v-model="searchQuery" label="Search Stations" prepend-inner-icon="mdi-magnify"
                    variant="outlined" density="compact" hide-details clearable
                    placeholder="Search by station name..." />
            </v-card-text>

            <v-divider />

            <!-- Stations List -->
            <v-card-text class="pa-0" style="max-height: 500px; overflow-y: auto;">
                <v-list>
                    <v-list-item v-for="station in filteredStations" :key="station.station_name"
                        @click="handleStationClick(station)" class="station-item"
                        :class="{ 'station-configured': isStationConfigured(station.display_station_name) }">
                        <template #prepend>
                            <v-icon :color="isStationConfigured(station.display_station_name) ? 'success' : 'grey'">
                                {{ isStationConfigured(station.display_station_name) ? 'mdi-checkbox-marked-circle' :
                                    'mdi-circle-outline' }}
                            </v-icon>
                        </template>

                        <v-list-item-title>
                            {{ station.display_station_name }}
                        </v-list-item-title>

                        <v-list-item-subtitle>
                            Station: {{ station.station_name }}
                            <v-chip v-if="station.order" size="x-small" class="ml-2" variant="outlined">
                                Order: {{ station.order }}
                            </v-chip>
                        </v-list-item-subtitle>

                        <template #append>
                            <div v-if="isStationConfigured(station.display_station_name)"
                                class="text-caption d-flex align-center">
                                <v-chip size="small" color="primary" variant="tonal" class="mr-1">
                                    {{ getStationConfig(station.display_station_name)?.deviceIds?.length || 'All' }}
                                    Device(s)
                                </v-chip>
                                <v-chip size="small" color="info" variant="tonal" class="mr-1">
                                    {{ getTestItemsLabel(station.display_station_name) }}
                                </v-chip>
                                <v-chip 
                                    v-if="getScoringConfigsCount(station.display_station_name) > 0"
                                    size="small" 
                                    color="warning" 
                                    variant="tonal" 
                                    class="mr-1"
                                >
                                    <v-icon start size="x-small">mdi-tune</v-icon>
                                    {{ getScoringConfigsCount(station.display_station_name) }} Scoring
                                </v-chip>
                                <v-chip size="small" color="secondary" variant="tonal">
                                    {{ getStationConfig(station.display_station_name)?.testStatus || 'ALL' }}
                                </v-chip>
                            </div>
                            <v-icon>mdi-chevron-right</v-icon>
                        </template>
                    </v-list-item>

                    <v-list-item v-if="filteredStations.length === 0">
                        <v-list-item-title class="text-center text-medium-emphasis">
                            No stations found
                        </v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-card-text>

            <v-divider />

            <!-- Actions -->
            <v-card-actions class="pa-4">
                <v-chip v-if="configuredStationsCount > 0" color="success" variant="tonal">
                    {{ configuredStationsCount }} Station(s) Configured
                </v-chip>
                <v-spacer />
                <v-btn color="error" variant="outlined" @click="handleClearAll"
                    :disabled="configuredStationsCount === 0">
                    Clear All
                </v-btn>
                <v-btn color="primary" variant="flat" @click="handleConfirm" :disabled="configuredStationsCount === 0">
                    Confirm Selection
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Station } from '@/features/dut_logs/composables/useIplasApi'
import type { ScoringType } from '@/features/dut/types/scoring.types'

// Per-test-item scoring configuration
export interface TestItemScoringConfig {
    scoringType: ScoringType
    target?: number  // Required for asymmetrical and throughput
    weight?: number  // Weight for scoring (default: 1.0)
}

export interface StationConfig {
    displayName: string
    stationName: string
    deviceIds: string[]
    testStatus: 'ALL' | 'PASS' | 'FAIL'
    selectedTestItems: string[] // Empty means all test items
    testItemScoringConfigs?: Record<string, TestItemScoringConfig> // Per-test-item scoring config
}

interface Props {
    show: boolean
    site: string
    project: string
    stations: Station[]
    selectedConfigs: Record<string, StationConfig>
}

const props = defineProps<Props>()

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void
    (e: 'station-click', station: Station): void
    (e: 'confirm', configs: Record<string, StationConfig>): void
    (e: 'clear-all'): void
}>()

const internalShow = computed({
    get: () => props.show,
    set: (value) => emit('update:show', value)
})

const searchQuery = ref('')

const filteredStations = computed(() => {
    if (!searchQuery.value) return props.stations

    const query = searchQuery.value.toLowerCase()
    return props.stations.filter(station =>
        station.display_station_name.toLowerCase().includes(query) ||
        station.station_name.toLowerCase().includes(query)
    )
})

const configuredStationsCount = computed(() => {
    return Object.keys(props.selectedConfigs).length
})

function isStationConfigured(displayName: string): boolean {
    return !!props.selectedConfigs[displayName]
}

function getStationConfig(displayName: string): StationConfig | undefined {
    return props.selectedConfigs[displayName]
}

function getTestItemsLabel(displayName: string): string {
    const config = props.selectedConfigs[displayName]
    if (!config || config.selectedTestItems.length === 0) {
        return 'All Items'
    }
    return `${config.selectedTestItems.length} Item(s)`
}

function getScoringConfigsCount(displayName: string): number {
    const config = props.selectedConfigs[displayName]
    if (!config?.testItemScoringConfigs) return 0
    return Object.keys(config.testItemScoringConfigs).length
}

function handleStationClick(station: Station): void {
    emit('station-click', station)
}

function handleConfirm(): void {
    emit('confirm', props.selectedConfigs)
}

function handleClearAll(): void {
    emit('clear-all')
}

function handleClose(): void {
    internalShow.value = false
}

// Reset search when dialog closes
watch(() => props.show, (newShow) => {
    if (!newShow) {
        searchQuery.value = ''
    }
})
</script>

<style scoped>
.station-item {
    cursor: pointer;
    transition: background-color 0.2s;
}

.station-item:hover {
    background-color: rgba(0, 0, 0, 0.04);
}

.station-configured {
    background-color: rgba(76, 175, 80, 0.08);
}

.station-configured:hover {
    background-color: rgba(76, 175, 80, 0.15);
}
</style>
