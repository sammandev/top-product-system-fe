<template>
    <!-- Mode Toggle -->
    <v-row>
        <v-col cols="12">
            <v-card>
                <v-card-text>
                    <v-btn-toggle v-model="mode" mandatory color="primary" class="mb-4">
                        <v-btn value="PARSING">
                            <v-icon start>mdi-file-document-outline</v-icon>
                            PARSING MODE
                        </v-btn>
                        <v-btn value="COMPARE">
                            <v-icon start>mdi-compare</v-icon>
                            COMPARE MODE
                        </v-btn>
                    </v-btn-toggle>

                    <v-alert v-if="mode === 'PARSING'" type="info" density="compact" class="mb-4">
                        <strong>PARSING MODE:</strong> Upload a single log file or archive to analyze test items
                        grouped by station.
                        Includes metadata extraction, value classification, and scoring.
                    </v-alert>

                    <v-alert v-else type="info" density="compact" class="mb-4">
                        <strong>COMPARE MODE:</strong> Upload multiple log files to compare test items across ISNs.
                        Shows per-ISN deviations from median baseline with individual scores.
                    </v-alert>

                    <!-- File Upload Section -->
                    <v-row>
                        <v-col cols="12" md="7">
                            <v-card variant="elevated">
                                <v-card-title>
                                    <v-icon start>mdi-upload</v-icon>
                                    {{ mode === 'PARSING' ? 'Upload Test Log' : 'Upload Test Logs (Multiple)' }}
                                </v-card-title>
                                <v-card-text>
                                    <v-file-input v-model="logFiles"
                                        :label="mode === 'PARSING' ? 'Test log file (.txt, .zip, .rar, .7z)' : 'Test log files (.txt, .zip, .rar, .7z)'"
                                        accept=".txt,.zip,.rar,.7z" :multiple="mode === 'COMPARE'"
                                        prepend-icon="mdi-file-document" show-size :clearable="true" :disabled="loading"
                                        variant="outlined">
                                        <template #selection="{ fileNames }">
                                            <template v-for="(fileName, index) in fileNames" :key="fileName">
                                                <v-chip v-if="index < 2" size="small" class="me-2">{{ fileName
                                                    }}</v-chip>
                                            </template>
                                            <span v-if="fileNames.length > 2" class="text-caption text-medium-emphasis">
                                                +{{ fileNames.length - 2 }} {{ fileNames.length - 2 === 1 ? 'file' :
                                                    'files' }}
                                            </span>
                                        </template>
                                    </v-file-input>
                                    <div v-if="logFiles" class="text-caption text-medium-emphasis mt-2">
                                        {{ Array.isArray(logFiles) ? logFiles.length : 1 }} {{ (Array.isArray(logFiles) ? logFiles.length : 1) === 1 ? 'file' : 'files' }} selected
                                    </div>
                                </v-card-text>
                            </v-card>
                        </v-col>

                        <v-col cols="12" md="5">
                            <v-card variant="elevated">
                                <v-card-title class="d-flex align-center">
                                    <v-icon start>mdi-filter</v-icon>
                                    Criteria (Optional)
                                    <v-spacer />
                                    <v-btn size="small" variant="outlined" color="primary" prepend-icon="mdi-download"
                                        @click="downloadCriteriaTemplate"
                                        title="Download criteria configuration template">
                                        Download Template
                                    </v-btn>
                                </v-card-title>
                                <v-card-text>
                                    <v-file-input v-model="criteriaFile" label="Criteria file (.ini)" accept=".ini"
                                        prepend-icon="mdi-file-cog" show-size :clearable="true" :disabled="loading"
                                        variant="outlined" />

                                    <v-checkbox v-model="showOnlyCriteria" label="Show only criteria items"
                                        :disabled="!criteriaFile || loading" density="compact" color="primary"
                                        hide-details class="mt-n2 mb-3" />

                                    <v-btn block variant="outlined" color="primary" prepend-icon="mdi-cog-outline"
                                        :disabled="loading" @click="openCriteriaBuilder">
                                        Build Criteria
                                    </v-btn>
                                </v-card-text>
                            </v-card>
                        </v-col>
                    </v-row>

                    <!-- Action Buttons -->
                    <v-row class="mt-2">
                        <v-col cols="12">
                            <div class="d-flex ga-2">
                                <v-btn color="primary" size="large" :block="!hasResults"
                                    :style="hasResults ? 'flex: 1' : ''" :loading="loading" :disabled="!canAnalyze"
                                    prepend-icon="mdi-play" @click="handleAnalyze">
                                    {{ mode === 'PARSING' ? 'Parse Log' : 'Compare Logs' }}
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

    <!-- Results Section -->
    <v-row v-if="hasResults">
        <v-col cols="12">
            <!-- Top Product Ranking -->
            <TopProductRankingUploadLog :parse-result="mode === 'PARSING' ? parsingResult : null"
                :compare-result="mode === 'COMPARE' ? compareResult : null" />

            <!-- Detailed Results -->
            <ParsingResultView v-if="mode === 'PARSING' && parsingResult" :result="parsingResult" />

            <CompareResultView v-else-if="mode === 'COMPARE' && compareResult" :result="compareResult"
                @export-excel="handleExportExcel" @export-pdf="handleExportPDF"
                @copy-clipboard="handleCopyToClipboard" />
        </v-col>
    </v-row>

    <!-- Error Display -->
    <v-snackbar v-model="errorSnackbar" color="error" :timeout="5000" location="top">
        {{ errorMessage }}
        <template #actions>
            <v-btn variant="text" @click="errorSnackbar = false">
                Close
            </v-btn>
        </template>
    </v-snackbar>

    <!-- Criteria Builder Dialog -->
    <CriteriaBuilderDialog v-model="criteriaBuilderOpen" @criteria-created="handleCriteriaCreated" />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ParsingResultView from './ParsingResultView.vue'
import CompareResultView from './CompareResultView.vue'
import CriteriaBuilderDialog from './CriteriaBuilderDialog.vue'
import TopProductRankingUploadLog from './TopProductRankingUploadLog.vue'
import { useTestLogUpload } from '@/features/dut_logs/composables/useTestLogUpload'
import { useTestLogExport } from '@/features/dut_logs/composables/useTestLogExport'

// Mode selection
const mode = ref<'PARSING' | 'COMPARE'>('PARSING')

// File inputs
const logFiles = ref<File[] | File | null>(null)
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

// Composables
const { parseLog, compareLogs } = useTestLogUpload()
const { exportToExcel, exportToPDF, copyToClipboard } = useTestLogExport()

// Computed
const canAnalyze = computed(() => {
    // Handle both array and single file cases
    if (!logFiles.value) return false
    if (Array.isArray(logFiles.value)) {
        return logFiles.value.length >= 1
    }
    // Single file (File object)
    return logFiles.value instanceof File
})

const hasResults = computed(() => {
    return (mode.value === 'PARSING' && parsingResult.value) ||
        (mode.value === 'COMPARE' && compareResult.value)
})

// Methods
const handleAnalyze = async () => {
    loading.value = true
    errorSnackbar.value = false

    try {
        if (mode.value === 'PARSING') {
            // Handle both single file and array
            const file = Array.isArray(logFiles.value) ? logFiles.value[0] : logFiles.value
            if (!file) {
                throw new Error('No file selected')
            }
            const result = await parseLog(
                file,
                criteriaFile.value,
                showOnlyCriteria.value
            )
            console.log('Parsing result:', result)
            if (!result.metadata) {
                console.error('Warning: No metadata in parsing result')
            }
            parsingResult.value = result
            compareResult.value = null
        } else {
            // COMPARE mode always expects array
            const files = Array.isArray(logFiles.value) ? logFiles.value : (logFiles.value ? [logFiles.value] : [])
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
}

const openCriteriaBuilder = () => {
    criteriaBuilderOpen.value = true
}

const handleCriteriaCreated = (file: File) => {
    criteriaFile.value = file
}

const handleExportExcel = async () => {
    const data = mode.value === 'PARSING' ? parsingResult.value : compareResult.value
    await exportToExcel(data, mode.value)
}

const handleExportPDF = async () => {
    const data = mode.value === 'PARSING' ? parsingResult.value : compareResult.value
    await exportToPDF(data, mode.value)
}

const handleCopyToClipboard = async () => {
    const data = mode.value === 'PARSING' ? parsingResult.value : compareResult.value
    await copyToClipboard(data, mode.value)
}

const downloadCriteriaTemplate = () => {
    const template = `[Test_Items]
# Criteria Configuration Template for Test Log Parser
# Format: "TEST_ITEM_PATTERN" <USL,LSL> ===> "TARGET_VALUE"
# Example:
# "WiFi_TX_POW" <20,10> ===> "15"
# "BT_FREQ_KHZ" <2500000,2400000> ===> "2450000"

# Add your criteria below:
`
    const blob = new Blob([template], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'criteria_template.ini'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

// Watch for showOnlyCriteria changes and re-analyze if results exist
watch(showOnlyCriteria, async () => {
    // Only re-analyze if we have results and criteria file
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
