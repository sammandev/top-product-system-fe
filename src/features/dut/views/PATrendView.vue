<template>
    <DefaultLayout>
        <!-- Header -->
        <div class="d-flex justify-space-between align-center mb-6">
            <div>
                <h1 class="text-h4 mb-2">
                    <v-icon color="primary" class="mr-2">mdi-chart-line-variant</v-icon>
                    PA Trend Analysis
                </h1>
                <p class="text-medium-emphasis">
                    Analyze PA trends across multiple DUTs and stations with auto and differential modes.
                </p>
            </div>

            <!-- Export Button (visible when results exist) -->
            <v-btn v-if="hasResults" color="success" prepend-icon="mdi-download" @click="handleExport">
                Export Results
            </v-btn>
        </div>

        <!-- Authentication Warning -->
        <v-alert v-if="!hasDUTAccess" type="warning" variant="tonal" class="mb-4">
            <template #prepend>
                <v-icon>mdi-alert</v-icon>
            </template>
            <div>
                <div class="font-weight-medium">External Login Required</div>
                <div class="text-caption">
                    This feature requires external login access.
                </div>
            </div>
        </v-alert>

        <!-- Filters Card -->
        <v-card class="mb-6">
            <v-card-title class="bg-primary">
                <v-icon class="mr-2">mdi-filter-variant</v-icon>
                Filter Parameters
            </v-card-title>

            <v-card-text class="pt-4">
                <v-form ref="filterForm">
                    <v-row>
                        <!-- DUT ISN Selection -->
                        <v-col cols="12" md="6">
                            <v-combobox v-model="selectedDutIsns" label="DUT ISN *" multiple chips closable-chips
                                hint="Enter one or more DUT ISNs (press Enter after each)" persistent-hint
                                :rules="[v => v.length > 0 || 'At least one DUT ISN is required']">
                                <template #chip="{ props, item }">
                                    <v-chip v-bind="props" closable>
                                        {{ String(item) }}
                                    </v-chip>
                                </template>
                            </v-combobox>
                        </v-col>

                        <!-- Station ID Selection -->
                        <v-col cols="12" md="6">
                            <v-combobox v-model="selectedStationIds" label="Station ID *" multiple chips closable-chips
                                hint="Enter one or more Station IDs (press Enter after each)" persistent-hint
                                :rules="[v => v.length > 0 || 'At least one Station ID is required']">
                                <template #chip="{ props, item }">
                                    <v-chip v-bind="props" closable>
                                        {{ String(item) }}
                                    </v-chip>
                                </template>
                            </v-combobox>
                        </v-col>

                        <!-- Site Identifier (Optional) -->
                        <v-col cols="12" md="4">
                            <v-text-field v-model="siteIdentifier" label="Site Identifier"
                                hint="Optional: Filter by site" persistent-hint clearable />
                        </v-col>

                        <!-- Model Identifier (Optional) -->
                        <v-col cols="12" md="4">
                            <v-text-field v-model="modelIdentifier" label="Model Identifier"
                                hint="Optional: Filter by model" persistent-hint clearable />
                        </v-col>

                        <!-- SROM Filter -->
                        <v-col cols="12" md="4">
                            <v-select v-model="sromFilter" label="SROM Filter" :items="sromFilterOptions"
                                hint="Filter by SROM version" persistent-hint />
                        </v-col>

                        <!-- Start Time -->
                        <v-col cols="12" md="6">
                            <v-text-field v-model="startTime" label="Start Time" type="datetime-local"
                                hint="Optional: Start of date range" persistent-hint clearable />
                        </v-col>

                        <!-- End Time -->
                        <v-col cols="12" md="6">
                            <v-text-field v-model="endTime" label="End Time" type="datetime-local"
                                hint="Optional: End of date range" persistent-hint clearable />
                        </v-col>
                    </v-row>

                    <!-- Action Buttons -->
                    <v-row>
                        <v-col class="d-flex gap-2">
                            <v-btn color="primary" prepend-icon="mdi-chart-line" :loading="dutStore.paTrendLoading"
                                :disabled="!canAnalyze" @click="handleAnalyze">
                                Analyze
                            </v-btn>
                            <v-btn variant="outlined" prepend-icon="mdi-refresh" @click="handleReset">
                                Reset
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-form>
            </v-card-text>
        </v-card>

        <!-- Error Alert -->
        <v-alert v-if="dutStore.paTrendError" type="error" variant="tonal" class="mb-4" closable
            @click:close="dutStore.paTrendError = null">
            {{ dutStore.paTrendError }}
        </v-alert>

        <!-- Tab Navigation -->
        <v-tabs v-model="activeTab" class="mb-6">
            <v-tab value="auto">
                <v-icon class="mr-2">mdi-auto-mode</v-icon>
                Auto Trend
            </v-tab>
            <v-tab value="dex">
                <v-icon class="mr-2">mdi-gesture-tap</v-icon>
                Dex Trend
            </v-tab>
            <v-tab value="diff">
                <v-icon class="mr-2">mdi-delta</v-icon>
                Differential
            </v-tab>
        </v-tabs>

        <!-- Results Display -->
        <v-window v-model="activeTab">
            <!-- Auto Trend Tab -->
            <v-window-item value="auto">
                <PATrendResultsCard :data="dutStore.paTrendAutoData" :loading="dutStore.paTrendLoading"
                    title="Auto Trend Results" type="auto" />
            </v-window-item>

            <!-- Dex Trend Tab -->
            <v-window-item value="dex">
                <PATrendResultsCard :data="dutStore.paTrendDexData" :loading="dutStore.paTrendLoading"
                    title="Dex Trend Results" type="dex" />
            </v-window-item>

            <!-- Differential Tab -->
            <v-window-item value="diff">
                <PATrendResultsCard :data="dutStore.paDiffData" :loading="dutStore.paTrendLoading"
                    title="Differential Results" type="diff" />
            </v-window-item>
        </v-window>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDUTStore } from '../store/dut.store'
import { useAuthStore } from '@/features/auth/store'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import PATrendResultsCard from '@/features/dut/components/PATrendResultsCard.vue'
import type { PATrendRequest } from '@/types/api'

// Stores
const dutStore = useDUTStore()
const authStore = useAuthStore()

// Filter State
const selectedDutIsns = ref<string[]>([])
const selectedStationIds = ref<string[]>([])
const siteIdentifier = ref<string>('')
const modelIdentifier = ref<string>('')
const sromFilter = ref<'all' | 'old' | 'new'>('all')
const startTime = ref<string>('')
const endTime = ref<string>('')

// Tab State
const activeTab = ref<'auto' | 'dex' | 'diff'>('auto')

// Filter Form Ref
const filterForm = ref()

// SROM Filter Options
const sromFilterOptions = [
    { title: 'All', value: 'all' },
    { title: 'Old', value: 'old' },
    { title: 'New', value: 'new' }
]

// Computed
const hasDUTAccess = computed(() => authStore.hasDUTAccess)

const canAnalyze = computed(() => {
    return selectedDutIsns.value.length > 0 && selectedStationIds.value.length > 0
})

const hasResults = computed(() => {
    if (activeTab.value === 'auto') return dutStore.paTrendAutoData.length > 0
    if (activeTab.value === 'dex') return dutStore.paTrendDexData.length > 0
    if (activeTab.value === 'diff') return dutStore.paDiffData.length > 0
    return false
})

// Actions
async function handleAnalyze() {
    // Build request params
    const params: PATrendRequest = {
        dut_isn: selectedDutIsns.value,
        station_id: selectedStationIds.value.map(String),
        srom_filter: sromFilter.value
    }

    // Add optional parameters
    if (siteIdentifier.value) {
        params.site_identifier = siteIdentifier.value
    }
    if (modelIdentifier.value) {
        params.model_identifier = modelIdentifier.value
    }
    if (startTime.value) {
        params.start_time = startTime.value
    }
    if (endTime.value) {
        params.end_time = endTime.value
    }

    try {
        // Fetch data based on active tab
        if (activeTab.value === 'auto') {
            await dutStore.fetchPATrendAuto(params)
        } else if (activeTab.value === 'dex') {
            await dutStore.fetchPATrendDex(params)
        } else if (activeTab.value === 'diff') {
            await dutStore.fetchPATrendDiff(params)
        }
    } catch (error) {
        console.error('Failed to fetch PA trend data:', error)
    }
}

function handleReset() {
    selectedDutIsns.value = []
    selectedStationIds.value = []
    siteIdentifier.value = ''
    modelIdentifier.value = ''
    sromFilter.value = 'all'
    startTime.value = ''
    endTime.value = ''
    dutStore.clearPATrendData()
}

function handleExport() {
    // TODO: Implement export functionality
    console.log('Export functionality to be implemented')
}
</script>

<style scoped>
.gap-2 {
    gap: 0.5rem;
}
</style>
