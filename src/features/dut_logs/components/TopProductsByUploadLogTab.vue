<template>
    <!-- Section 1: Upload and Configure Section -->
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
                            <div class="d-flex gap-2 flex-wrap">
                                <!-- Configure Scoring Button -->
                                <v-btn color="secondary" size="large" variant="outlined"
                                    :loading="extractingItems" :disabled="!hasFiles || loading"
                                    prepend-icon="mdi-cog-outline"
                                    @click="handleConfigureScoring">
                                    Configure Scoring
                                    <v-chip v-if="appliedScoringConfigs.length > 0" size="x-small" color="success"
                                        class="ml-2">
                                        {{ appliedScoringConfigs.length }}
                                    </v-chip>
                                </v-btn>
                                <!-- Analyze Button -->
                                <v-btn color="primary" size="large" style="flex: 1"
                                    :loading="loading" :disabled="!canAnalyze" prepend-icon="mdi-play"
                                    @click="handleAnalyze">
                                    Analyze Logs
                                </v-btn>
                                <!-- Reset Button -->
                                <v-btn v-if="hasResults" variant="outlined" size="large"
                                    :disabled="loading" prepend-icon="mdi-refresh" @click="handleReset">
                                    Reset
                                </v-btn>
                            </div>

                            <!-- Scoring Config Status -->
                            <div v-if="appliedScoringConfigs.length > 0" class="mt-2">
                                <v-chip size="small" color="success" variant="tonal" prepend-icon="mdi-check-circle">
                                    Scoring configured: {{ appliedScoringConfigs.length }} items
                                </v-chip>
                                <v-btn size="x-small" variant="text" color="warning" class="ml-2"
                                    @click="clearScoringConfigs">
                                    Clear
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
                :scoring-configs="appliedScoringConfigs"
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
                        <template #item.baseline="{ item }">
                            <span v-if="item.baseline !== null">{{ item.baseline }}</span>
                            <span v-else class="text-medium-emphasis">-</span>
                        </template>
                        <template #item.avg_score="{ item }">
                            <v-chip v-if="item.avg_score !== null" :color="getScoreColor(item.avg_score)" 
                                size="small" class="font-weight-bold"
                                @click.stop="showComparisonItemBreakdown(item)">
                                {{ item.avg_score?.toFixed(2) }}
                                <v-icon size="x-small" end>mdi-information-outline</v-icon>
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

    <!-- Score Breakdown Dialog (new universal scoring) -->
    <v-dialog v-model="showBreakdownDialog" :fullscreen="breakdownFullscreen" :max-width="breakdownFullscreen ? undefined : 650" scrollable
        :transition="breakdownFullscreen ? 'dialog-bottom-transition' : undefined">
        <v-card v-if="breakdownItem">
            <v-card-title class="d-flex align-center bg-info">
                <v-icon start color="white">mdi-calculator-variant</v-icon>
                <span class="text-white">Score Breakdown</span>
                <v-spacer />
                <v-btn :icon="breakdownFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'" variant="text" color="white"
                    @click="breakdownFullscreen = !breakdownFullscreen" />
                <v-btn icon="mdi-close" variant="text" color="white" @click="showBreakdownDialog = false" />
            </v-card-title>

            <v-card-text class="pa-4">
                <!-- Test Item Info -->
                <v-card variant="tonal" class="mb-4">
                    <v-card-text>
                        <div class="text-h6 mb-2">{{ breakdownItem.test_item }}</div>
                        <v-row dense>
                            <v-col cols="4">
                                <div class="text-caption text-medium-emphasis">Actual Value</div>
                                <div class="text-h6 font-weight-bold">{{ breakdownItem.value }}</div>
                            </v-col>
                            <v-col cols="4">
                                <div class="text-caption text-medium-emphasis">Score</div>
                                <div class="text-h6 font-weight-bold">
                                    <v-chip :color="getScoreColor(breakdownItem.score ?? 0)" size="small">
                                        {{ breakdownItem.score?.toFixed(2) ?? 'N/A' }}
                                    </v-chip>
                                </div>
                            </v-col>
                            <v-col cols="4">
                                <div class="text-caption text-medium-emphasis">Scoring Type</div>
                                <v-chip :color="getScoringTypeColor(breakdownItem.score_breakdown?.scoring_type ?? '')"
                                    size="small">
                                    {{ breakdownItem.score_breakdown?.scoring_type ?? 'N/A' }}
                                </v-chip>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <!-- Breakdown Details Table -->
                <v-table density="compact">
                    <tbody>
                        <tr>
                            <td class="font-weight-medium">Scoring Type</td>
                            <td>
                                <v-chip size="small" :color="getScoringTypeColor(breakdownItem.score_breakdown?.scoring_type ?? '')">
                                    {{ breakdownItem.score_breakdown?.scoring_type }}
                                </v-chip>
                            </td>
                        </tr>
                        <tr v-if="breakdownItem.score_breakdown?.ucl !== null && breakdownItem.score_breakdown?.ucl !== undefined">
                            <td class="font-weight-medium">UCL (Upper Limit)</td>
                            <td>{{ breakdownItem.score_breakdown.ucl }}</td>
                        </tr>
                        <tr v-if="breakdownItem.score_breakdown?.lcl !== null && breakdownItem.score_breakdown?.lcl !== undefined">
                            <td class="font-weight-medium">LCL (Lower Limit)</td>
                            <td>{{ breakdownItem.score_breakdown.lcl }}</td>
                        </tr>
                        <tr v-if="breakdownItem.score_breakdown?.target !== null && breakdownItem.score_breakdown?.target !== undefined">
                            <td class="font-weight-medium">Target</td>
                            <td class="font-weight-bold text-primary">{{ breakdownItem.score_breakdown.target?.toFixed(4) }}</td>
                        </tr>
                        <tr v-if="breakdownItem.score_breakdown?.actual !== null && breakdownItem.score_breakdown?.actual !== undefined">
                            <td class="font-weight-medium">Actual Value</td>
                            <td class="font-weight-bold">{{ breakdownItem.score_breakdown.actual }}</td>
                        </tr>
                        <tr v-if="breakdownItem.score_breakdown?.deviation !== null && breakdownItem.score_breakdown?.deviation !== undefined">
                            <td class="font-weight-medium">Deviation</td>
                            <td :class="Math.abs(breakdownItem.score_breakdown.deviation!) > 1 ? 'text-error font-weight-bold' : ''">
                                {{ breakdownItem.score_breakdown.deviation?.toFixed(4) }}
                            </td>
                        </tr>
                        <tr v-if="breakdownItem.score_breakdown?.policy">
                            <td class="font-weight-medium">Policy</td>
                            <td>
                                <v-chip size="x-small" variant="tonal">{{ breakdownItem.score_breakdown.policy }}</v-chip>
                            </td>
                        </tr>
                        <tr>
                            <td class="font-weight-medium">Weight</td>
                            <td>{{ breakdownItem.score_breakdown?.weight ?? 1.0 }}</td>
                        </tr>
                        <tr class="bg-surface-variant">
                            <td class="font-weight-bold">Score (0-10)</td>
                            <td class="font-weight-bold">
                                <v-chip :color="getScoreColor(breakdownItem.score_breakdown?.score ?? 0)" size="small">
                                    {{ breakdownItem.score_breakdown?.score?.toFixed(2) ?? 'N/A' }}
                                </v-chip>
                            </td>
                        </tr>
                    </tbody>
                </v-table>
            </v-card-text>

            <v-card-actions>
                <v-spacer />
                <v-btn color="primary" variant="text" @click="showBreakdownDialog = false">Close</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- Error Display -->
    <v-snackbar v-model="errorSnackbar" color="error" :timeout="5000" location="bottom">
        {{ errorMessage }}
        <template #actions>
            <v-btn variant="text" @click="errorSnackbar = false">Close</v-btn>
        </template>
    </v-snackbar>

    <!-- Criteria Builder Dialog -->
    <CriteriaBuilderDialog v-model="criteriaBuilderOpen" @criteria-created="handleCriteriaCreated" />

    <!-- UPDATED: Upload Scoring Config Dialog -->
    <UploadScoringConfigDialog v-model="showScoringConfigDialog" :test-items="extractedTestItems"
        :existing-configs="appliedScoringConfigs" @apply="handleScoringConfigApply" />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import CriteriaBuilderDialog from './CriteriaBuilderDialog.vue'
import TopProductRankingUploadLog from './TopProductRankingUploadLog.vue'
import UploadScoringConfigDialog from './UploadScoringConfigDialog.vue'
import {
    useTestLogUpload,
    type CompareItemEnhanced,
    type ParsedTestItemEnhanced,
    type RescoreScoringConfig
} from '@/features/dut_logs/composables/useTestLogUpload'

// File inputs
const logFiles = ref<File[] | null>(null)
const criteriaFile = ref<File | null>(null)
const showOnlyCriteria = ref(false)

// Results
const parsingResult = ref<any>(null)
const compareResult = ref<any>(null)

// UI state
const loading = ref(false)
const extractingItems = ref(false)
const errorSnackbar = ref(false)
const errorMessage = ref('')
const criteriaBuilderOpen = ref(false)

// Comparison section state
const selectedStation = ref<string | null>(null)
const itemFilterType = ref<string>('all')
const searchQuery = ref('')

// Scoring config state
const showScoringConfigDialog = ref(false)
const extractedTestItems = ref<ParsedTestItemEnhanced[]>([])
const appliedScoringConfigs = ref<RescoreScoringConfig[]>([])

// Score breakdown dialog (new universal scoring)
const showBreakdownDialog = ref(false)
const breakdownFullscreen = ref(false)
const breakdownItem = ref<ParsedTestItemEnhanced | null>(null)

// Composables
const { parseLog, compareLogs } = useTestLogUpload()

// Filter options for comparison section
const itemFilterOptions = [
    { title: 'Show All', value: 'all' },
    { title: 'Criteria Items', value: 'criteria' },
    { title: 'Non-Criteria Items', value: 'non-criteria' }
]

// Computed
const hasFiles = computed(() => {
    return logFiles.value && logFiles.value.length > 0
})

const canAnalyze = computed(() => {
    if (!logFiles.value) return false
    return logFiles.value.length >= 1
})

const hasResults = computed(() => {
    return parsingResult.value !== null || compareResult.value !== null
})

const isMultipleFiles = computed(() => {
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

    // Filter by type - Criteria = has USL or LSL, Non-Criteria = no USL and no LSL
    if (itemFilterType.value === 'criteria') {
        items = items.filter(item => item.usl !== null || item.lsl !== null)
    } else if (itemFilterType.value === 'non-criteria') {
        items = items.filter(item => item.usl === null && item.lsl === null)
    }

    // Filter by search
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        items = items.filter(item => item.test_item.toLowerCase().includes(query))
    }

    return items
})

// Methods

/**
 * Quick-parse the first file to extract test item names for scoring config dialog
 */
const extractTestItems = async (): Promise<void> => {
    if (!logFiles.value || logFiles.value.length === 0) return

    extractingItems.value = true
    try {
        const firstFile = logFiles.value[0]
        if (!firstFile) return

        const result = await parseLog(firstFile, criteriaFile.value, showOnlyCriteria.value)
        extractedTestItems.value = result.parsed_items_enhanced || []
    } catch (err: any) {
        // If quick-parse fails, we can still open config dialog with empty items
        console.warn('Failed to extract test items for scoring config:', err.message)
        extractedTestItems.value = []
    } finally {
        extractingItems.value = false
    }
}

/**
 * Open scoring config dialog - extracts test items first if needed
 */
const handleConfigureScoring = async () => {
    if (extractedTestItems.value.length === 0) {
        await extractTestItems()
    }
    showScoringConfigDialog.value = true
}

/**
 * Handle scoring config applied from dialog
 */
const handleScoringConfigApply = (configs: RescoreScoringConfig[]) => {
    appliedScoringConfigs.value = configs
}

/**
 * Clear scoring configs
 */
const clearScoringConfigs = () => {
    appliedScoringConfigs.value = []
}

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
                showOnlyCriteria.value,
                appliedScoringConfigs.value
            )
            parsingResult.value = result
            compareResult.value = null

            // Also update extracted test items from latest parse
            extractedTestItems.value = result.parsed_items_enhanced || []
        } else {
            // Multiple files - use compareLogs
            const result = await compareLogs(
                files,
                criteriaFile.value,
                showOnlyCriteria.value,
                appliedScoringConfigs.value
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
    extractedTestItems.value = []
    appliedScoringConfigs.value = []
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

const getScoringTypeColor = (type: string): string => {
    switch (type) {
        case 'symmetrical': return 'blue'
        case 'asymmetrical': return 'purple'
        case 'per_mask': return 'orange'
        case 'evm': return 'teal'
        case 'throughput': return 'green'
        case 'binary': return 'grey'
        default: return 'blue'
    }
}

/**
 * Show score breakdown for a comparison item (uses first ISN's data)
 */
const showTestItemBreakdown = (item: CompareItemEnhanced) => {
    const firstIsnData = item.per_isn_data?.[0]
    if (firstIsnData) {
        breakdownItem.value = {
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

/**
 * Show score breakdown when clicking on score chip in comparison table
 */
const showComparisonItemBreakdown = (item: CompareItemEnhanced) => {
    showTestItemBreakdown(item)
}

// Watch for showOnlyCriteria changes and re-analyze if results exist
watch(showOnlyCriteria, async () => {
    if (hasResults.value && criteriaFile.value) {
        await handleAnalyze()
    }
})

// When files change, clear extracted items so they get re-extracted
watch(logFiles, () => {
    extractedTestItems.value = []
})
</script>

<style scoped>
.gap-2 {
    gap: 0.5rem;
}
</style>
