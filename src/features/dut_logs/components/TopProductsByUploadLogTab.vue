<template>
    <!-- Section 1: Upload and Customize Section -->
    <v-row>
        <v-col cols="12">
            <v-card>
                <v-card-title class="d-flex align-center">
                    <v-icon start color="primary">mdi-upload</v-icon>
                    Upload and Configure
                </v-card-title>

                <v-card-text>
                    <v-row>
                        <!-- Upload Log Field -->
                        <v-col cols="12" md="6">
                            <v-card variant="outlined">
                                <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
                                    <v-icon start size="small">mdi-file-document-multiple</v-icon>
                                    Upload Test Logs
                                </v-card-title>
                                <v-card-text>
                                    <v-file-input v-model="logFiles"
                                        label="Test log files (.txt, .zip, .rar, .7z)"
                                        accept=".txt,.zip,.rar,.7z" multiple
                                        prepend-icon="mdi-file-document" show-size :clearable="true" :disabled="loading"
                                        variant="outlined">
                                        <template #selection="{ fileNames }">
                                            <template v-for="(fileName, index) in fileNames" :key="fileName">
                                                <v-chip v-if="index < 3" size="small" class="me-2">{{ fileName }}</v-chip>
                                            </template>
                                            <span v-if="fileNames.length > 3" class="text-caption text-medium-emphasis">
                                                +{{ fileNames.length - 3 }} more {{ fileNames.length - 3 === 1 ? 'file' : 'files' }}
                                            </span>
                                        </template>
                                    </v-file-input>
                                    <div v-if="logFiles && logFiles.length > 0" class="text-caption text-medium-emphasis mt-2">
                                        {{ logFiles.length }} {{ logFiles.length === 1 ? 'file' : 'files' }} selected
                                    </div>
                                </v-card-text>
                            </v-card>
                        </v-col>

                        <!-- Custom Criteria (Optional) -->
                        <v-col cols="12" md="6">
                            <v-card variant="outlined">
                                <v-card-title class="text-subtitle-1 bg-grey-lighten-4 d-flex align-center">
                                    <v-icon start size="small">mdi-filter-variant</v-icon>
                                    Custom Criteria (Optional)
                                    <v-spacer />
                                    <v-btn size="x-small" variant="text" color="primary" prepend-icon="mdi-download"
                                        @click="downloadCriteriaTemplate" title="Download JSON template">
                                        Template
                                    </v-btn>
                                </v-card-title>
                                <v-card-text>
                                    <v-file-input v-model="criteriaFile" label="Criteria file (.json)"
                                        accept=".json" prepend-icon="mdi-file-cog" show-size :clearable="true"
                                        :disabled="loading" variant="outlined" density="compact" />

                                    <v-checkbox v-model="showOnlyCriteria" label="Show only criteria items"
                                        :disabled="!criteriaFile || loading" density="compact" color="primary"
                                        hide-details class="mt-0 mb-2" />

                                    <v-btn block variant="outlined" color="primary" prepend-icon="mdi-cog-outline"
                                        size="small" :disabled="loading" @click="openCriteriaBuilder">
                                        Build Criteria
                                    </v-btn>
                                </v-card-text>
                            </v-card>
                        </v-col>
                    </v-row>

                    <!-- Action Buttons -->
                    <v-row class="mt-3">
                        <v-col cols="12">
                            <div class="d-flex gap-2">
                                <v-btn color="primary" size="large" :style="hasResults ? 'flex: 1' : 'flex: 1'"
                                    :loading="loading" :disabled="!canAnalyze" prepend-icon="mdi-play"
                                    @click="handleAnalyze">
                                    Analyze Logs
                                </v-btn>
                                <v-btn v-if="hasResults" variant="outlined" size="large" style="flex: 1"
                                    :disabled="loading" prepend-icon="mdi-refresh" @click="handleReset">
                                    Reset
                                </v-btn>
                            </div>
                        </v-col>
                    </v-row>
                </v-card-text>
            </v-card>
        </v-col>
    </v-row>

    <!-- Section 2: Ranking Summary Section -->
    <v-row v-if="hasResults" class="mt-4">
        <v-col cols="12">
            <TopProductRankingUploadLog 
                :parse-result="parsingResult" 
                :compare-result="compareResult" 
            />
        </v-col>
    </v-row>

    <!-- Section 3: Comparison Section (for 2+ logs) -->
    <v-row v-if="hasResults && isMultipleFiles" class="mt-4">
        <v-col cols="12">
            <v-card>
                <v-card-title class="d-flex align-center">
                    <v-icon start color="info">mdi-compare</v-icon>
                    Test Item Comparison
                    <v-chip class="ml-2" size="small" color="info">{{ totalFiles }} files</v-chip>
                </v-card-title>

                <v-card-text>
                    <!-- Station Selection -->
                    <v-row dense class="mb-4">
                        <v-col cols="12" md="4">
                            <v-select v-model="selectedStation" :items="stationOptions" label="Select Station"
                                variant="outlined" density="compact" prepend-inner-icon="mdi-router-wireless"
                                hide-details clearable />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-select v-model="itemFilterType" :items="itemFilterOptions" label="Filter Items"
                                variant="outlined" density="compact" prepend-inner-icon="mdi-filter"
                                hide-details />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field v-model="searchQuery" label="Search Test Items"
                                variant="outlined" density="compact" prepend-inner-icon="mdi-magnify"
                                hide-details clearable />
                        </v-col>
                    </v-row>

                    <!-- Comparison Table -->
                    <v-data-table :headers="comparisonHeaders" :items="filteredComparisonItems"
                        :items-per-page="25" density="comfortable" class="elevation-1"
                        @click:row="(_event: any, data: any) => showTestItemBreakdown(data.item)">
                        <template #item.test_item="{ item }">
                            <span class="font-weight-medium">{{ item.test_item }}</span>
                        </template>
                        <template #item.matched_criteria="{ item }">
                            <v-chip v-if="item.matched_criteria" size="x-small" color="success" variant="tonal">
                                Criteria
                            </v-chip>
                            <v-chip v-else size="x-small" color="grey" variant="tonal">
                                Non-Criteria
                            </v-chip>
                        </template>
                        <template #item.baseline="{ item }">
                            <span v-if="item.baseline !== null">{{ item.baseline }}</span>
                            <span v-else class="text-medium-emphasis">-</span>
                        </template>
                        <template #item.avg_score="{ item }">
                            <v-chip v-if="item.avg_score !== null" :color="getScoreColor(item.avg_score)" 
                                size="small" class="font-weight-bold">
                                {{ item.avg_score?.toFixed(2) }}
                            </v-chip>
                            <span v-else class="text-medium-emphasis">-</span>
                        </template>
                        <template #item.avg_deviation="{ item }">
                            <span v-if="item.avg_deviation !== null" 
                                :class="Math.abs(item.avg_deviation) > 1 ? 'text-error' : ''">
                                {{ item.avg_deviation?.toFixed(4) }}
                            </span>
                            <span v-else class="text-medium-emphasis">-</span>
                        </template>
                    </v-data-table>
                </v-card-text>
            </v-card>
        </v-col>
    </v-row>

    <!-- Error Display -->
    <v-snackbar v-model="errorSnackbar" color="error" :timeout="5000" location="bottom">
        {{ errorMessage }}
        <template #actions>
            <v-btn variant="text" @click="errorSnackbar = false">Close</v-btn>
        </template>
    </v-snackbar>

    <!-- Criteria Builder Dialog -->
    <CriteriaBuilderDialog v-model="criteriaBuilderOpen" @criteria-created="handleCriteriaCreated" />

    <!-- Score Breakdown Dialog for comparison items -->
    <ScoreBreakdownDialog v-model="showBreakdownDialog" :item="selectedBreakdownItem" />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import CriteriaBuilderDialog from './CriteriaBuilderDialog.vue'
import TopProductRankingUploadLog from './TopProductRankingUploadLog.vue'
import ScoreBreakdownDialog from './ScoreBreakdownDialog.vue'
import { useTestLogUpload, type CompareItemEnhanced, type ParsedTestItemEnhanced } from '@/features/dut_logs/composables/useTestLogUpload'

// File inputs
const logFiles = ref<File[] | null>(null)
const criteriaFile = ref<File | null>(null)
const showOnlyCriteria = ref(false)

// Results
const parsingResult = ref<any>(null)
const compareResult = ref<any>(null)

// UI state
const loading = ref(false)
const errorSnackbar = ref(false)
const errorMessage = ref('')
const criteriaBuilderOpen = ref(false)

// Comparison section state
const selectedStation = ref<string | null>(null)
const itemFilterType = ref<string>('all')
const searchQuery = ref('')

// Score breakdown dialog
const showBreakdownDialog = ref(false)
const selectedBreakdownItem = ref<ParsedTestItemEnhanced | null>(null)

// Composables
const { parseLog, compareLogs } = useTestLogUpload()

// Filter options for comparison section
const itemFilterOptions = [
    { title: 'Show All', value: 'all' },
    { title: 'Criteria Items', value: 'criteria' },
    { title: 'Non-Criteria Items', value: 'non-criteria' },
    { title: 'Bin Items', value: 'bin' }
]

// Computed
const canAnalyze = computed(() => {
    if (!logFiles.value) return false
    return logFiles.value.length >= 1
})

const hasResults = computed(() => {
    return parsingResult.value !== null || compareResult.value !== null
})

const isMultipleFiles = computed(() => {
    // Show comparison section when we have compare result with multiple files
    return compareResult.value?.total_files > 1
})

const totalFiles = computed(() => {
    return compareResult.value?.total_files || 0
})

// Station options for comparison
const stationOptions = computed(() => {
    if (!compareResult.value?.file_summaries) return []
    const stations = new Set<string>()
    compareResult.value.file_summaries.forEach((summary: any) => {
        if (summary.metadata?.station) {
            stations.add(summary.metadata.station)
        }
    })
    return Array.from(stations)
})

// Comparison table headers
const comparisonHeaders = [
    { title: 'Test Item', key: 'test_item', sortable: true },
    { title: 'Type', key: 'matched_criteria', sortable: true, width: '120px' },
    { title: 'Baseline', key: 'baseline', sortable: true, width: '120px' },
    { title: 'Avg Score', key: 'avg_score', sortable: true, width: '120px', align: 'center' as const },
    { title: 'Avg Deviation', key: 'avg_deviation', sortable: true, width: '140px' }
]

// Filtered comparison items
const filteredComparisonItems = computed(() => {
    if (!compareResult.value) return []
    
    let items: CompareItemEnhanced[] = [
        ...(compareResult.value.comparison_value_items || []),
        ...(compareResult.value.comparison_non_value_items || [])
    ]

    // Filter by type
    if (itemFilterType.value === 'criteria') {
        items = items.filter(item => item.matched_criteria)
    } else if (itemFilterType.value === 'non-criteria') {
        items = items.filter(item => !item.matched_criteria)
    } else if (itemFilterType.value === 'bin') {
        items = items.filter(item => item.test_item.toLowerCase().includes('bin'))
    }

    // Filter by search
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        items = items.filter(item => item.test_item.toLowerCase().includes(query))
    }

    return items
})

// Methods
const handleAnalyze = async () => {
    loading.value = true
    errorSnackbar.value = false

    try {
        const files = logFiles.value || []
        
        if (files.length === 1) {
            // Single file - use parseLog
            const file = files[0]
            if (!file) {
                throw new Error('No file selected')
            }
            const result = await parseLog(
                file,
                criteriaFile.value,
                showOnlyCriteria.value
            )
            parsingResult.value = result
            compareResult.value = null
        } else {
            // Multiple files - use compareLogs
            const result = await compareLogs(
                files,
                criteriaFile.value,
                showOnlyCriteria.value
            )
            compareResult.value = result
            parsingResult.value = null
        }
    } catch (error: any) {
        errorMessage.value = error.message || 'Analysis failed. Please try again.'
        errorSnackbar.value = true
    } finally {
        loading.value = false
    }
}

const handleReset = () => {
    logFiles.value = null
    criteriaFile.value = null
    showOnlyCriteria.value = false
    parsingResult.value = null
    compareResult.value = null
    selectedStation.value = null
    searchQuery.value = ''
    itemFilterType.value = 'all'
}

const openCriteriaBuilder = () => {
    criteriaBuilderOpen.value = true
}

const handleCriteriaCreated = (file: File) => {
    criteriaFile.value = file
}

const downloadCriteriaTemplate = () => {
    const template = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$comment": "Criteria Configuration Template for Test Log Parser",
        "criteria": [
            {
                "test_item": "WiFi_TX_POW_2462_11B_CCK11_B20",
                "ucl": 20,
                "lcl": 10,
                "target": 15
            },
            {
                "test_item": "BT_FREQ_KHZ",
                "ucl": 2500000,
                "lcl": 2400000,
                "target": 2450000
            }
        ]
    }
    const templateJson = JSON.stringify(template, null, 2)
    const blob = new Blob([templateJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'criteria_template.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

const getScoreColor = (score: number): string => {
    if (score >= 9) return 'success'
    if (score >= 7) return 'warning'
    return 'error'
}

const showTestItemBreakdown = (item: CompareItemEnhanced) => {
    // Create a ParsedTestItemEnhanced-like object for the dialog
    // Use the first ISN's data as representative
    const firstIsnData = item.per_isn_data?.[0]
    if (firstIsnData?.score_breakdown) {
        selectedBreakdownItem.value = {
            test_item: item.test_item,
            usl: item.usl,
            lsl: item.lsl,
            value: firstIsnData.value,
            is_value_type: firstIsnData.is_value_type,
            numeric_value: firstIsnData.numeric_value,
            is_hex: firstIsnData.is_hex,
            hex_decimal: firstIsnData.hex_decimal,
            matched_criteria: item.matched_criteria,
            target: null,
            score: firstIsnData.score,
            score_breakdown: firstIsnData.score_breakdown
        }
        showBreakdownDialog.value = true
    }
}

// Watch for showOnlyCriteria changes and re-analyze if results exist
watch(showOnlyCriteria, async () => {
    if (hasResults.value && criteriaFile.value) {
        await handleAnalyze()
    }
})
</script>

<style scoped>
.gap-2 {
    gap: 0.5rem;
}
</style>
