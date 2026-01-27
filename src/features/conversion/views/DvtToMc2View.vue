<template>
    <DefaultLayout>
        <!-- Page Header -->
        <div class="d-flex justify-space-between align-center mb-6">
            <div class="d-flex align-center">
                <v-icon size="40" color="primary" class="mr-3">mdi-file-swap</v-icon>
                <div>
                    <h1 class="text-h4 mb-2">DVT to MC2 Converter</h1>
                    <p class="text-medium-emphasis mb-0">
                        Convert DVT format test files to MC2 format (supports batch processing)
                    </p>
                </div>
            </div>
        </div>

        <!-- Error Alert -->
        <v-alert v-if="showError" type="error" variant="tonal" closable class="mb-4" @click:close="showError = false">
            {{ errorMessage }}
        </v-alert>

        <v-row>
            <!-- Left Panel: File Upload -->
            <v-col cols="12" lg="6">
                <v-card elevation="2">
                    <v-card-title class="bg-primary">
                        <v-icon start color="white">mdi-file-upload</v-icon>
                        <span class="text-white">Upload DVT Files</span>
                    </v-card-title>

                    <v-card-text class="pa-4">
                        <!-- DVT File Upload (Multiple) -->
                        <div class="mb-4">
                            <div class="text-subtitle-2 mb-3 d-flex align-center">
                                <v-icon start size="small">mdi-file-document-multiple</v-icon>
                                DVT Files (CSV or XLSX)
                                <v-chip size="small" color="info" class="ml-2">Multiple files supported</v-chip>
                            </div>

                            <v-file-input v-model="dvtFiles" label="Upload DVT file(s)" accept=".csv,.xlsx"
                                variant="outlined" density="comfortable" prepend-icon="mdi-file-document-multiple"
                                multiple clearable show-size :error-messages="dvtFilesError"
                                @update:model-value="handleDvtFilesChange">
                                <template #selection="{ fileNames }">
                                    <v-chip v-for="fileName in fileNames.slice(0, 2)" :key="fileName"
                                        size="small" color="primary" class="me-2">
                                        {{ fileName }}
                                    </v-chip>
                                    <v-chip v-if="fileNames.length > 2" size="small" color="grey" class="me-2">
                                        +{{ fileNames.length - 2 }} more
                                    </v-chip>
                                </template>
                            </v-file-input>

                            <v-alert v-if="dvtFiles.length > 0" type="info" variant="tonal" density="compact"
                                class="mt-2">
                                <template #prepend>
                                    <v-icon size="small">mdi-information</v-icon>
                                </template>
                                {{ dvtFiles.length }} file(s) selected ({{ formatTotalSize(dvtFiles) }})
                            </v-alert>
                        </div>

                        <v-divider class="my-4" />

                        <!-- Action Buttons -->
                        <v-row dense>
                            <v-col cols="12">
                                <v-btn color="primary" size="large" block :loading="converting" :disabled="!canConvert"
                                    prepend-icon="mdi-play-circle" @click="handleConvert">
                                    {{ dvtFiles.length > 1 ? `Convert ${dvtFiles.length} Files` : 'Convert to MC2' }}
                                </v-btn>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <!-- File Previews -->
                <v-card v-if="filePreviews.length > 0 && !converting" elevation="2" class="mt-4">
                    <v-card-title class="bg-grey-lighten-4">
                        <v-icon start size="small">mdi-eye</v-icon>
                        File Previews
                    </v-card-title>

                    <v-card-text class="pa-0">
                        <v-list density="compact">
                            <v-list-item v-for="(preview, index) in filePreviews" :key="index">
                                <template #prepend>
                                    <v-icon size="small" color="info">mdi-file-document</v-icon>
                                </template>

                                <v-list-item-title class="text-body-2">{{ preview.filename }}</v-list-item-title>
                                <v-list-item-subtitle class="text-caption">
                                    <v-chip v-if="preview.serialNumber" size="x-small" class="mr-1">
                                        SN: {{ preview.serialNumber }}
                                    </v-chip>
                                    <v-chip v-for="band in preview.detectedBands" :key="band" size="x-small"
                                        class="mr-1" color="primary">
                                        {{ band }}
                                    </v-chip>
                                </v-list-item-subtitle>
                            </v-list-item>
                        </v-list>
                    </v-card-text>
                </v-card>
            </v-col>

            <!-- Right Panel: Conversion Progress/Results -->
            <v-col cols="12" lg="6">
                <!-- Conversion in Progress -->
                <v-card v-if="converting" elevation="2">
                    <v-card-title class="bg-info">
                        <v-icon start color="white">mdi-progress-clock</v-icon>
                        <span class="text-white">Converting Files...</span>
                    </v-card-title>

                    <v-card-text class="pa-4">
                        <v-list density="compact">
                            <v-list-item v-for="(progress, index) in conversionProgress" :key="index">
                                <template #prepend>
                                    <v-icon v-if="progress.progress === 100" color="success">mdi-check-circle</v-icon>
                                    <v-progress-circular v-else :model-value="progress.progress" size="24" width="3"
                                        color="primary" />
                                </template>

                                <v-list-item-title class="text-body-2">{{ progress.filename }}</v-list-item-title>
                                <v-list-item-subtitle class="text-caption">
                                    {{ progress.progress }}% complete
                                </v-list-item-subtitle>

                                <template #append>
                                    <v-chip size="small" :color="progress.progress === 100 ? 'success' : 'primary'">
                                        {{ progress.progress }}%
                                    </v-chip>
                                </template>
                            </v-list-item>
                        </v-list>
                    </v-card-text>
                </v-card>

                <!-- Conversion Results -->
                <v-card v-else-if="conversionResults.length > 0" elevation="2">
                    <v-card-title class="bg-success">
                        <v-icon start color="white">mdi-check-circle</v-icon>
                        <span class="text-white">Conversion Complete</span>
                    </v-card-title>

                    <v-card-text class="pa-4">
                        <v-alert type="success" variant="tonal" class="mb-4">
                            <template #prepend>
                                <v-icon>mdi-download</v-icon>
                            </template>
                            <div class="text-body-2">
                                <strong>{{ successCount }} of {{ conversionResults.length }} files converted
                                    successfully!</strong><br>
                                <span v-if="successCount > 0" class="text-caption">
                                    MC2 files have been downloaded automatically.
                                </span>
                            </div>
                        </v-alert>

                        <div class="text-subtitle-2 mb-2">Conversion Results:</div>
                        <v-list density="compact" class="bg-transparent">
                            <v-list-item v-for="(result, index) in conversionResults" :key="index">
                                <template #prepend>
                                    <v-icon :color="result.success ? 'success' : 'error'">
                                        {{ result.success ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                                    </v-icon>
                                </template>

                                <v-list-item-title class="text-body-2">{{ result.originalName }}</v-list-item-title>
                                <v-list-item-subtitle v-if="result.success" class="text-caption text-success">
                                    → {{ result.filename }}
                                </v-list-item-subtitle>
                                <v-list-item-subtitle v-else class="text-caption text-error">
                                    {{ result.error }}
                                </v-list-item-subtitle>
                            </v-list-item>
                        </v-list>

                        <v-divider class="my-4" />

                        <v-row dense>
                            <v-col cols="6">
                                <v-btn block color="primary" variant="outlined" prepend-icon="mdi-refresh"
                                    @click="resetForm">
                                    Convert More Files
                                </v-btn>
                            </v-col>
                            <v-col v-if="successCount > 0" cols="6">
                                <v-btn block color="success" variant="outlined" prepend-icon="mdi-download-multiple"
                                    @click="downloadAllResults">
                                    Re-download All
                                </v-btn>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <!-- Instructions -->
                <v-card v-else elevation="2">
                    <v-card-title class="bg-grey-lighten-4">
                        <v-icon start size="small">mdi-information</v-icon>
                        How to Use
                    </v-card-title>

                    <v-card-text class="pa-4">
                        <v-timeline side="end" density="compact" class="mb-2">
                            <v-timeline-item dot-color="primary" size="small">
                                <template #opposite>
                                    <div class="text-caption">Step 1</div>
                                </template>
                                <div class="text-body-2">
                                    <strong>Select DVT File(s)</strong><br>
                                    <span class="text-caption text-medium-emphasis">
                                        Choose one or more DVT format files (CSV or XLSX)
                                    </span>
                                </div>
                            </v-timeline-item>

                            <v-timeline-item dot-color="success" size="small">
                                <template #opposite>
                                    <div class="text-caption">Step 2</div>
                                </template>
                                <div class="text-body-2">
                                    <strong>Preview Files</strong><br>
                                    <span class="text-caption text-medium-emphasis">
                                        Review detected serial numbers and frequency bands
                                    </span>
                                </div>
                            </v-timeline-item>

                            <v-timeline-item dot-color="info" size="small">
                                <template #opposite>
                                    <div class="text-caption">Step 3</div>
                                </template>
                                <div class="text-body-2">
                                    <strong>Convert</strong><br>
                                    <span class="text-caption text-medium-emphasis">
                                        Click "Convert" to process and download MC2 files
                                    </span>
                                </div>
                            </v-timeline-item>
                        </v-timeline>

                        <v-divider class="my-4" />

                        <div class="text-subtitle-2 mb-2">Conversion Details:</div>
                        <v-list density="compact" class="bg-transparent">
                            <v-list-item>
                                <template #prepend>
                                    <v-icon size="small">mdi-table</v-icon>
                                </template>
                                <v-list-item-title class="text-caption">Input Format</v-list-item-title>
                                <v-list-item-subtitle class="text-caption">DVT CSV/XLSX with standard test data
                                    structure</v-list-item-subtitle>
                            </v-list-item>
                            <v-list-item>
                                <template #prepend>
                                    <v-icon size="small">mdi-file-excel</v-icon>
                                </template>
                                <v-list-item-title class="text-caption">Output Format</v-list-item-title>
                                <v-list-item-subtitle class="text-caption">MC2 CSV with header, USL/LSL rows, and
                                    measurement
                                    data</v-list-item-subtitle>
                            </v-list-item>
                            <v-list-item>
                                <template #prepend>
                                    <v-icon size="small" color="primary">mdi-file-multiple</v-icon>
                                </template>
                                <v-list-item-title class="text-caption">Batch Processing</v-list-item-title>
                                <v-list-item-subtitle class="text-caption">Convert multiple files
                                    simultaneously</v-list-item-subtitle>
                            </v-list-item>
                        </v-list>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <!-- Error Display -->
        <v-snackbar v-model="showError" color="error" :timeout="6000" location="bottom">
            <div class="d-flex align-center">
                <v-icon start>mdi-alert-circle</v-icon>
                {{ errorMessage }}
            </div>
            <template #actions>
                <v-btn variant="text" @click="showError = false">Close</v-btn>
            </template>
        </v-snackbar>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import {
    convertDvtToMc2Batch,
    downloadMultipleMc2Results,
    validateDvtFile,
    parseDvtFilePreview,
    type BatchConvertResult
} from '../api/convert'

interface FilePreview {
    filename: string
    serialNumber?: string
    detectedBands: string[]
    rowCount: number
}

interface ConversionProgress {
    filename: string
    progress: number
}

// State
const dvtFiles = ref<File[]>([])
const dvtFilesError = ref('')
const converting = ref(false)
const conversionProgress = ref<ConversionProgress[]>([])
const conversionResults = ref<BatchConvertResult[]>([])
const filePreviews = ref<FilePreview[]>([])
const showError = ref(false)
const errorMessage = ref('')

// Computed
const canConvert = computed(() => {
    return dvtFiles.value.length > 0 && !converting.value && !dvtFilesError.value
})

const successCount = computed(() => {
    return conversionResults.value.filter(r => r.success).length
})

// Methods
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function formatTotalSize(files: File[]): string {
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
    return formatFileSize(totalBytes)
}

async function handleDvtFilesChange() {
    dvtFilesError.value = ''
    filePreviews.value = []

    if (dvtFiles.value.length === 0) return

    // Validate each file
    for (const file of dvtFiles.value) {
        const validation = validateDvtFile(file)
        if (!validation.valid) {
            dvtFilesError.value = `${file.name}: ${validation.error}`
            return
        }
    }

    // Generate previews for each file
    try {
        const previews = await Promise.all(
            dvtFiles.value.map(async (file) => {
                try {
                    const preview = await parseDvtFilePreview(file)
                    return {
                        filename: file.name,
                        ...preview
                    }
                } catch (error) {
                    console.error(`Preview failed for ${file.name}:`, error)
                    return {
                        filename: file.name,
                        serialNumber: undefined,
                        detectedBands: [],
                        rowCount: 0
                    }
                }
            })
        )
        filePreviews.value = previews
    } catch (error) {
        console.error('Preview generation failed:', error)
    }
}

async function handleConvert() {
    if (dvtFiles.value.length === 0) return

    converting.value = true
    conversionProgress.value = dvtFiles.value.map(file => ({
        filename: file.name,
        progress: 0
    }))
    conversionResults.value = []
    showError.value = false

    try {
        const results = await convertDvtToMc2Batch(
            dvtFiles.value,
            (fileIndex, _fileName, progress) => {
                if (conversionProgress.value[fileIndex]) {
                    conversionProgress.value[fileIndex].progress = progress
                }
            }
        )

        conversionResults.value = results

        // Auto-download successful conversions
        downloadMultipleMc2Results(results.filter(r => r.success))

        // Show error if some conversions failed
        const failedCount = results.filter(r => !r.success).length
        if (failedCount > 0) {
            errorMessage.value = `${failedCount} file(s) failed to convert. See results for details.`
            showError.value = true
        }
    } catch (error) {
        console.error('Batch conversion failed:', error)
        errorMessage.value = error instanceof Error ? error.message : 'Conversion failed. Please try again.'
        showError.value = true
    } finally {
        converting.value = false
    }
}

function downloadAllResults() {
    if (conversionResults.value.length > 0) {
        downloadMultipleMc2Results(conversionResults.value.filter(r => r.success))
    }
}

function resetForm() {
    dvtFiles.value = []
    dvtFilesError.value = ''
    conversionProgress.value = []
    conversionResults.value = []
    filePreviews.value = []
}
</script>

<style scoped>
/* Add any custom styles here */
</style>
