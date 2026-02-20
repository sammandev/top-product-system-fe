<template>
    <DefaultLayout>
        <!-- Page Header -->
        <div class="d-flex justify-space-between align-center mb-6">
            <div class="d-flex align-center">
                <v-icon size="40" color="primary" class="mr-3">mdi-file-chart</v-icon>
                <div>
                    <h1 class="text-h4 mb-2">MasterControl Analyze</h1>
                    <p class="text-medium-emphasis mb-0">
                        Analyze multi-DUT MC2 data with custom specifications
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
                        <span class="text-white">Upload Files</span>
                    </v-card-title>

                    <v-card-text class="pa-4">
                        <!-- MC2 Data File -->
                        <div class="mb-6">
                            <div class="text-subtitle-2 mb-3 d-flex align-center">
                                <v-icon start size="small">mdi-file-table</v-icon>
                                MC2 Data File (CSV or XLSX)
                                <v-spacer />
                                <v-btn size="small" variant="outlined" color="info" prepend-icon="mdi-download"
                                    @click="downloadMc2Template">
                                    Download Template
                                </v-btn>
                            </div>

                            <v-file-input v-model="mc2File" label="Upload MC2 file" accept=".csv,.xlsx"
                                variant="outlined" density="comfortable" prepend-icon="mdi-file-table" clearable
                                show-size :error-messages="mc2FileError" @update:model-value="handleMc2FileChange">
                                <template #selection="{ fileNames }">
                                    <v-chip v-for="fileName in fileNames" :key="fileName" size="small" color="primary"
                                        class="me-2">
                                        {{ fileName }}
                                    </v-chip>
                                </template>
                            </v-file-input>

                            <v-alert v-if="mc2FileActual" type="info" variant="tonal" density="compact" class="mt-2">
                                File: {{ mc2FileActual.name }} ({{ formatFileSize(mc2FileActual.size) }})
                            </v-alert>
                        </div>

                        <!-- Spec File -->
                        <div class="mb-4">
                            <div class="text-subtitle-2 mb-3 d-flex align-center">
                                <v-icon start size="small">mdi-file-cog</v-icon>
                                Spec File (JSON or INI)
                                <v-spacer />
                                <v-btn-group density="compact">
                                    <v-btn size="small" variant="outlined" color="success" prepend-icon="mdi-wrench"
                                        @click="openSpecBuilder">
                                        Build Spec
                                    </v-btn>
                                    <v-btn size="small" variant="outlined" color="info" prepend-icon="mdi-download"
                                        @click="downloadSpecTemplate">
                                        Download Template
                                    </v-btn>
                                </v-btn-group>
                            </div>

                            <v-file-input v-model="specFile" label="Upload spec file" accept=".json,.ini"
                                variant="outlined" density="comfortable" prepend-icon="mdi-file-cog" clearable show-size
                                :error-messages="specFileError" @update:model-value="handleSpecFileChange">
                                <template #selection="{ fileNames }">
                                    <v-chip v-for="fileName in fileNames" :key="fileName" size="small" color="success"
                                        class="me-2">
                                        {{ fileName }}
                                    </v-chip>
                                </template>
                            </v-file-input>

                            <v-alert v-if="specFileActual" type="info" variant="tonal" density="compact" class="mt-2">
                                File: {{ specFileActual.name }} ({{ formatFileSize(specFileActual.size) }})
                            </v-alert>
                        </div>

                        <v-divider class="my-4" />

                        <!-- Action Buttons -->
                        <v-row dense>
                            <v-col cols="12">
                                <v-btn color="primary" size="large" block :loading="analyzing" :disabled="!canAnalyze"
                                    prepend-icon="mdi-play-circle" @click="handleAnalyze">
                                    Analyze Multi-DUT Data
                                </v-btn>
                            </v-col>
                        </v-row>

                        <!-- Upload Progress -->
                        <v-progress-linear v-if="analyzing" :model-value="uploadProgress" color="primary" height="6"
                            striped class="mt-4">
                            <template #default="{ value }">
                                <span class="text-caption">{{ Math.round(value) }}%</span>
                            </template>
                        </v-progress-linear>
                    </v-card-text>
                </v-card>
            </v-col>

            <!-- Right Panel: Results/Instructions -->
            <v-col cols="12" lg="6">
                <!-- Analysis Results -->
                <v-card v-if="analysisCompleted" elevation="2" class="mb-4">
                    <v-card-title class="bg-success">
                        <v-icon start color="white">mdi-check-circle</v-icon>
                        <span class="text-white">Analysis Complete</span>
                    </v-card-title>

                    <v-card-text class="pa-4">
                        <v-alert type="success" variant="tonal" class="mb-4">
                            <template #prepend>
                                <v-icon>mdi-file-excel</v-icon>
                            </template>
                            <div class="text-body-2">
                                <strong>Analysis completed successfully!</strong><br>
                                Your compiled XLSX file has been downloaded automatically.
                            </div>
                        </v-alert>

                        <div class="text-subtitle-2 mb-2">Result Summary:</div>
                        <v-list density="compact" class="bg-transparent">
                            <v-list-item>
                                <template #prepend>
                                    <v-icon color="info">mdi-file</v-icon>
                                </template>
                                <v-list-item-title>Source File:</v-list-item-title>
                                <v-list-item-subtitle>{{ lastAnalyzedFile }}</v-list-item-subtitle>
                            </v-list-item>
                            <v-list-item>
                                <template #prepend>
                                    <v-icon color="success">mdi-download</v-icon>
                                </template>
                                <v-list-item-title>Output File:</v-list-item-title>
                                <v-list-item-subtitle>{{ lastAnalyzedFile.replace(/\.(csv|xlsx)$/i, '_Compiled.xlsx') }}</v-list-item-subtitle>
                            </v-list-item>
                        </v-list>

                        <v-btn block color="primary" variant="outlined" prepend-icon="mdi-refresh" class="mt-4"
                            @click="resetForm">
                            Analyze Another File
                        </v-btn>
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
                                    <strong>Upload MC2 Data File</strong><br>
                                    <span class="text-caption text-medium-emphasis">
                                        CSV or XLSX file containing multi-DUT test measurements
                                    </span>
                                </div>
                            </v-timeline-item>

                            <v-timeline-item dot-color="success" size="small">
                                <template #opposite>
                                    <div class="text-caption">Step 2</div>
                                </template>
                                <div class="text-body-2">
                                    <strong>Upload or Build Spec File</strong><br>
                                    <span class="text-caption text-medium-emphasis">
                                        Define test specifications (USL/LSL limits) in JSON or INI format
                                    </span>
                                </div>
                            </v-timeline-item>

                            <v-timeline-item dot-color="info" size="small">
                                <template #opposite>
                                    <div class="text-caption">Step 3</div>
                                </template>
                                <div class="text-body-2">
                                    <strong>Analyze</strong><br>
                                    <span class="text-caption text-medium-emphasis">
                                        Click "Analyze" to process data and download results
                                    </span>
                                </div>
                            </v-timeline-item>
                        </v-timeline>

                        <v-divider class="my-4" />

                        <div class="text-subtitle-2 mb-2">Output Format:</div>
                        <v-list density="compact" class="bg-transparent">
                            <v-list-item>
                                <template #prepend>
                                    <v-icon size="small">mdi-table</v-icon>
                                </template>
                                <v-list-item-title class="text-caption">VALUE_DATA Sheet</v-list-item-title>
                                <v-list-item-subtitle class="text-caption">Numeric measurements with pass/fail
                                    analysis</v-list-item-subtitle>
                            </v-list-item>
                            <v-list-item>
                                <template #prepend>
                                    <v-icon size="small">mdi-table-large</v-icon>
                                </template>
                                <v-list-item-title class="text-caption">NON_VALUE_DATA Sheet</v-list-item-title>
                                <v-list-item-subtitle class="text-caption">Non-numeric test items and
                                    status</v-list-item-subtitle>
                            </v-list-item>
                            <v-list-item>
                                <template #prepend>
                                    <v-icon size="small" color="success">mdi-checkbox-marked</v-icon>
                                </template>
                                <v-list-item-title class="text-caption">Color Coding</v-list-item-title>
                                <v-list-item-subtitle class="text-caption">Pass, Margin Pass, Margin Fail,
                                    Fail</v-list-item-subtitle>
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

        <!-- Spec Builder Dialog -->
        <SpecBuilderDialog v-model="showSpecBuilder" @spec-created="handleSpecCreated" />

        <!-- Template Download Dialog -->
        <v-dialog v-model="showTemplateDialog" max-width="400">
            <v-card>
                <v-card-title class="bg-primary">
                    <v-icon start color="white">mdi-download</v-icon>
                    <span class="text-white">Download Spec Template</span>
                </v-card-title>
                <v-card-text class="pa-6">
                    <p class="text-body-2 mb-4">Choose the template format to download:</p>
                    <v-row dense>
                        <v-col cols="6">
                            <v-btn block size="large" color="primary" prepend-icon="mdi-code-json"
                                @click="downloadTemplate('json')">
                                JSON
                            </v-btn>
                        </v-col>
                        <v-col cols="6">
                            <v-btn block size="large" color="success" prepend-icon="mdi-file-document"
                                @click="downloadTemplate('ini')">
                                INI
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="showTemplateDialog = false">Cancel</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  analyzeMultiDut,
  downloadAnalysisResult,
  validateMc2File,
  validateSpecFile,
} from '../api/analyze'
import {
  downloadIniSpecTemplate,
  downloadJsonSpecTemplate,
  downloadMc2CsvTemplate,
} from '../utils/templates'

// State
const mc2File = ref<File[]>([])
const specFile = ref<File[]>([])
const mc2FileError = ref('')
const specFileError = ref('')
const analyzing = ref(false)
const uploadProgress = ref(0)
const analysisCompleted = ref(false)
const lastAnalyzedFile = ref('')
const showError = ref(false)
const errorMessage = ref('')
const showSpecBuilder = ref(false)
const showTemplateDialog = ref(false)

// Computed
const mc2FileActual = computed(() => mc2File.value[0])
const specFileActual = computed(() => specFile.value[0])

const canAnalyze = computed(() => {
  return (
    !!mc2FileActual.value &&
    !!specFileActual.value &&
    !analyzing.value &&
    !mc2FileError.value &&
    !specFileError.value
  )
})

// Methods
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`
}

function handleMc2FileChange() {
  mc2FileError.value = ''
  if (mc2FileActual.value) {
    const validation = validateMc2File(mc2FileActual.value)
    if (!validation.valid) {
      mc2FileError.value = validation.error || 'Invalid file'
    }
  }
}

function handleSpecFileChange() {
  specFileError.value = ''
  if (specFileActual.value) {
    const validation = validateSpecFile(specFileActual.value)
    if (!validation.valid) {
      specFileError.value = validation.error || 'Invalid file'
    }
  }
}

function downloadMc2Template() {
  downloadMc2CsvTemplate()
}

function downloadSpecTemplate() {
  showTemplateDialog.value = true
}

function downloadTemplate(format: 'json' | 'ini') {
  if (format === 'json') {
    downloadJsonSpecTemplate()
  } else {
    downloadIniSpecTemplate()
  }
  showTemplateDialog.value = false
}

function openSpecBuilder() {
  showSpecBuilder.value = true
}

function handleSpecCreated(file: File, _format: 'json' | 'ini') {
  specFile.value = [file]
  handleSpecFileChange()
}

async function handleAnalyze() {
  if (!mc2FileActual.value || !specFileActual.value) return

  analyzing.value = true
  uploadProgress.value = 0
  analysisCompleted.value = false
  showError.value = false

  try {
    const blob = await analyzeMultiDut({
      mc2File: mc2FileActual.value,
      specFile: specFileActual.value,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        }
      },
    })

    // Download the result
    downloadAnalysisResult(blob, mc2FileActual.value.name)

    lastAnalyzedFile.value = mc2FileActual.value.name
    analysisCompleted.value = true
  } catch (error) {
    console.error('Analysis failed:', error)
    errorMessage.value =
      error instanceof Error ? error.message : 'Analysis failed. Please try again.'
    showError.value = true
  } finally {
    analyzing.value = false
    uploadProgress.value = 0
  }
}

function resetForm() {
  mc2File.value = []
  specFile.value = []
  mc2FileError.value = ''
  specFileError.value = ''
  analysisCompleted.value = false
  uploadProgress.value = 0
}
</script>

<style scoped>
/* Add any custom styles here */
</style>
