<template>
    <DefaultLayout>
        <!-- Page Header -->
        <div class="d-flex justify-space-between align-center mb-6">
            <div class="d-flex align-center">
                <v-icon size="40" color="primary" class="mr-3">mdi-file-compare</v-icon>
                <div>
                    <h1 class="text-h4 mb-2">DVT-MC2 Format Compare</h1>
                    <p class="text-medium-emphasis mb-0">
                        Compare MasterControl and DVT files to analyze test results
                    </p>
                </div>
            </div>
            <v-btn v-if="hasComparisonResult" color="secondary" prepend-icon="mdi-refresh" @click="handleReset">
                New Comparison
            </v-btn>
        </div>

        <!-- Error Alert -->
        <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">
            {{ error }}
        </v-alert>

        <!-- Success Alert -->
        <v-alert v-if="downloadCompleted" type="success" variant="tonal" closable class="mb-4"
            @click:close="downloadCompleted = false">
            <div class="d-flex align-center">
                <v-icon start>mdi-check-circle</v-icon>
                File downloaded successfully!
            </div>
        </v-alert>

        <!-- File Upload Section -->
        <v-row class="mb-4">
            <!-- MasterControl File Upload -->
            <v-col cols="12" md="4">
                <v-card>
                    <v-card-title class="bg-primary">
                        <v-icon start color="white">mdi-file-document</v-icon>
                        <span class="text-white">MasterControl File</span>
                    </v-card-title>
                    <v-card-text>
                        <v-file-input v-model="masterFile" label="Select MC2 File" accept=".txt,.csv" variant="outlined"
                            prepend-icon="mdi-paperclip" :loading="uploading" show-size density="compact">
                            <template #prepend-inner>
                                <v-icon>mdi-file-check</v-icon>
                            </template>
                        </v-file-input>

                        <v-alert v-if="masterFile" type="success" variant="tonal" density="compact" class="mt-2">
                            <div class="text-caption">
                                <v-icon size="small" start>mdi-check</v-icon>
                                {{ getFileName(masterFile) }}
                            </div>
                        </v-alert>
                    </v-card-text>
                </v-card>
            </v-col>

            <!-- DVT File Upload -->
            <v-col cols="12" md="4">
                <v-card>
                    <v-card-title class="bg-secondary">
                        <v-icon start color="white">mdi-file-document-outline</v-icon>
                        <span class="text-white">DVT File</span>
                    </v-card-title>
                    <v-card-text>
                        <v-file-input v-model="dvtFile" label="Select DVT File" accept=".txt,.csv" variant="outlined"
                            prepend-icon="mdi-paperclip" :loading="uploading" show-size density="compact">
                            <template #prepend-inner>
                                <v-icon>mdi-file-check</v-icon>
                            </template>
                        </v-file-input>

                        <v-alert v-if="dvtFile" type="success" variant="tonal" density="compact" class="mt-2">
                            <div class="text-caption">
                                <v-icon size="small" start>mdi-check</v-icon>
                                {{ getFileName(dvtFile) }}
                            </div>
                        </v-alert>
                    </v-card-text>
                </v-card>
            </v-col>

            <!-- Spec File Upload (Optional) -->
            <v-col cols="12" md="4">
                <v-card>
                    <v-card-title class="bg-info">
                        <v-icon start color="white">mdi-file-cog</v-icon>
                        <span class="text-white">Spec File (Optional)</span>
                    </v-card-title>
                    <v-card-text>
                        <v-file-input v-model="specFile" label="Select Spec File" accept=".json" variant="outlined"
                            prepend-icon="mdi-paperclip" :loading="uploading" show-size density="compact" clearable>
                            <template #prepend-inner>
                                <v-icon>mdi-cog</v-icon>
                            </template>
                        </v-file-input>

                        <v-alert v-if="specFile" type="info" variant="tonal" density="compact" class="mt-2">
                            <div class="text-caption">
                                <v-icon size="small" start>mdi-check</v-icon>
                                {{ getFileName(specFile) }}
                            </div>
                        </v-alert>
                        <v-alert v-else type="info" variant="tonal" density="compact" class="mt-2">
                            <div class="text-caption">
                                Default spec will be used if not provided
                            </div>
                        </v-alert>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <!-- Configuration Section -->
        <v-card class="mb-4">
            <v-card-title>
                <v-icon start>mdi-cog</v-icon>
                Comparison Configuration
            </v-card-title>
            <v-card-text>
                <v-row>
                    <v-col cols="12" md="3">
                        <v-text-field v-model.number="threshold" label="Threshold" type="number" variant="outlined"
                            density="compact" step="0.1" hint="Comparison tolerance (optional)" persistent-hint />
                    </v-col>
                    <v-col cols="12" md="3">
                        <v-text-field v-model.number="marginThreshold" label="Margin Threshold" type="number"
                            variant="outlined" density="compact" step="0.1"
                            hint="Pass/fail threshold override (optional)" persistent-hint />
                    </v-col>
                    <v-col cols="12" md="3">
                        <v-text-field v-model.number="freqTolerance" label="Freq Tolerance (MHz)" type="number"
                            variant="outlined" density="compact" step="0.1" hint="Frequency matching tolerance"
                            persistent-hint />
                    </v-col>
                    <v-col cols="12" md="3">
                        <v-select v-model="outputFormat" :items="outputFormatOptions" label="Output Format"
                            variant="outlined" density="compact" hint="Result format" persistent-hint />
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <!-- Action Buttons -->
        <v-card class="mb-4">
            <v-card-text>
                <v-row dense>
                    <v-col cols="12" md="6">
                        <v-btn color="primary" size="large" block :loading="processing" :disabled="!canCompare"
                            prepend-icon="mdi-compare" @click="handleCompare">
                            Compare Files
                        </v-btn>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-btn color="success" size="large" block :loading="downloading" :disabled="!canDownload"
                            prepend-icon="mdi-download" @click="handleDownload">
                            Download {{ outputFormat.toUpperCase() }}
                        </v-btn>
                    </v-col>
                </v-row>

                <!-- Progress -->
                <v-progress-linear v-if="processing || downloading" :model-value="progress" color="primary" height="6"
                    striped class="mt-4">
                    <template #default="{ value }">
                        <span class="text-caption">{{ Math.round(value) }}%</span>
                    </template>
                </v-progress-linear>
            </v-card-text>
        </v-card>

        <!-- Comparison Results -->
        <v-card v-if="comparisonResult">
            <v-card-title>
                <v-icon start>mdi-chart-box</v-icon>
                Comparison Results
            </v-card-title>
            <v-card-subtitle v-if="comparisonResult.summary">
                <v-chip color="success" variant="tonal" size="small" class="mr-2">
                    Pass: {{ comparisonResult.summary.pass || 0 }}
                </v-chip>
                <v-chip color="error" variant="tonal" size="small" class="mr-2">
                    Fail: {{ comparisonResult.summary.fail || 0 }}
                </v-chip>
                <v-chip color="info" variant="tonal" size="small">
                    Total: {{ comparisonResult.rows?.length || 0 }}
                </v-chip>
            </v-card-subtitle>
            <v-card-text>
                <v-data-table :headers="resultHeaders" :items="comparisonResult.rows || []" density="compact"
                    fixed-header height="500" :items-per-page="20">
                    <template #item.mc2_result="{ item }">
                        <v-chip :color="getResultColor((item as any).mc2_result)" variant="flat" size="small">
                            {{ (item as any).mc2_result || 'N/A' }}
                        </v-chip>
                    </template>
                    <template #item.dvt_result="{ item }">
                        <v-chip :color="getResultColor((item as any).dvt_result)" variant="flat" size="small">
                            {{ (item as any).dvt_result || 'N/A' }}
                        </v-chip>
                    </template>
                    <template #no-data>
                        <div class="text-center pa-4">
                            <v-icon size="48" color="grey">mdi-table-off</v-icon>
                            <p class="text-medium-emphasis mt-2">No comparison results available</p>
                        </div>
                    </template>
                </v-data-table>
            </v-card-text>
        </v-card>

        <!-- Instructions -->
        <v-card v-if="!comparisonResult">
            <v-card-title class="bg-info">
                <v-icon start color="white">mdi-information</v-icon>
                <span class="text-white">Instructions</span>
            </v-card-title>
            <v-card-text>
                <v-timeline density="compact" side="end">
                    <v-timeline-item dot-color="primary" size="small">
                        <div class="text-subtitle-2 mb-1">1. Upload Files</div>
                        <div class="text-caption text-medium-emphasis">
                            Select MasterControl file (.txt, .csv) and DVT file (.txt, .csv)
                        </div>
                    </v-timeline-item>

                    <v-timeline-item dot-color="primary" size="small">
                        <div class="text-subtitle-2 mb-1">2. Optional: Upload Spec</div>
                        <div class="text-caption text-medium-emphasis">
                            Provide custom spec file (.json) or use default specification
                        </div>
                    </v-timeline-item>

                    <v-timeline-item dot-color="primary" size="small">
                        <div class="text-subtitle-2 mb-1">3. Configure Parameters</div>
                        <div class="text-caption text-medium-emphasis">
                            Set threshold, margin threshold, and frequency tolerance values
                        </div>
                    </v-timeline-item>

                    <v-timeline-item dot-color="primary" size="small">
                        <div class="text-subtitle-2 mb-1">4. Compare or Download</div>
                        <div class="text-caption text-medium-emphasis">
                            View results in browser (JSON) or download as CSV/XLSX
                        </div>
                    </v-timeline-item>
                </v-timeline>
            </v-card-text>
        </v-card>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { comparisonApi } from '@/features/comparison/api/comparison.api'
import { getApiErrorDetail, getErrorMessage } from '@/shared/utils'

// State
const masterFile = ref<File | File[] | null>(null)
const dvtFile = ref<File | File[] | null>(null)
const specFile = ref<File | File[] | null>(null)
const uploading = ref(false)
const threshold = ref<number | null>(null)
const marginThreshold = ref<number | null>(null)
const freqTolerance = ref<number>(2.0)
const outputFormat = ref<'json' | 'csv' | 'xlsx'>('json')
const processing = ref(false)
const downloading = ref(false)
const progress = ref(0)
const error = ref('')
const downloadCompleted = ref(false)
interface ComparisonResultData {
  summary?: { pass?: number; fail?: number }
  rows?: Record<string, unknown>[]
}

const comparisonResult = ref<ComparisonResultData | null>(null)

// Options
const outputFormatOptions = [
  { title: 'JSON (View in Browser)', value: 'json' },
  { title: 'CSV', value: 'csv' },
  { title: 'XLSX', value: 'xlsx' },
]

// Computed
const canCompare = computed(() => {
  const master = Array.isArray(masterFile.value) ? masterFile.value[0] : masterFile.value
  const dvt = Array.isArray(dvtFile.value) ? dvtFile.value[0] : dvtFile.value
  return master && dvt && !processing.value && outputFormat.value === 'json'
})

const canDownload = computed(() => {
  const master = Array.isArray(masterFile.value) ? masterFile.value[0] : masterFile.value
  const dvt = Array.isArray(dvtFile.value) ? dvtFile.value[0] : dvtFile.value
  return (
    master &&
    dvt &&
    !downloading.value &&
    (outputFormat.value === 'csv' || outputFormat.value === 'xlsx')
  )
})

const hasComparisonResult = computed(() => comparisonResult.value !== null)

const resultHeaders = computed(() => [
  { title: 'Antenna', key: 'antenna_dvt', sortable: true, align: 'center' as const },
  { title: 'Metric', key: 'metric', sortable: true, align: 'center' as const },
  { title: 'Freq', key: 'freq', sortable: true, align: 'center' as const },
  { title: 'Standard', key: 'standard', sortable: true, align: 'center' as const },
  { title: 'Data Rate', key: 'datarate', sortable: true, align: 'center' as const },
  { title: 'BW', key: 'bandwidth', sortable: true, align: 'center' as const },
  { title: 'MC2 Value', key: 'mc2_value', sortable: true, align: 'center' as const },
  { title: 'MC2 Result', key: 'mc2_result', sortable: true, align: 'center' as const },
  { title: 'DVT Value', key: 'dvt_value', sortable: true, align: 'center' as const },
  { title: 'DVT Result', key: 'dvt_result', sortable: true, align: 'center' as const },
  { title: 'Diff', key: 'mc2_dvt_diff', sortable: true, align: 'center' as const },
])

// Methods
function getFileName(file: File | File[] | null): string {
  if (!file) return ''
  const f = Array.isArray(file) ? file[0] : file
  return f?.name || ''
}

function getResultColor(result: string): string {
  if (!result) return 'grey'
  const upper = result.toUpperCase()
  if (upper.includes('PASS')) return 'success'
  if (upper.includes('FAIL')) return 'error'
  return 'info'
}

async function handleCompare() {
  if (!canCompare.value) return

  processing.value = true
  progress.value = 0
  error.value = ''
  comparisonResult.value = null

  try {
    const formData = new FormData()
    const master = (
      Array.isArray(masterFile.value) ? masterFile.value[0] : masterFile.value
    ) as File
    const dvt = (Array.isArray(dvtFile.value) ? dvtFile.value[0] : dvtFile.value) as File

    formData.append('master_file', master)
    formData.append('dvt_file', dvt)

    if (specFile.value) {
      const spec = (Array.isArray(specFile.value) ? specFile.value[0] : specFile.value) as File
      formData.append('spec_file', spec)
    }

    if (threshold.value !== null) {
      formData.append('threshold', threshold.value.toString())
    }

    if (marginThreshold.value !== null) {
      formData.append('margin_threshold', marginThreshold.value.toString())
    }

    formData.append('freq_tol', freqTolerance.value.toString())
    formData.append('human', 'false')

    // Simulate progress
    const progressInterval = setInterval(() => {
      if (progress.value < 90) {
        progress.value += 10
      }
    }, 100)

    const result = await comparisonApi.compareFormats(formData, false)
    comparisonResult.value = result as ComparisonResultData

    clearInterval(progressInterval)
    progress.value = 100
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err) || getErrorMessage(err) || 'Comparison failed'
  } finally {
    processing.value = false
  }
}

async function handleDownload() {
  if (!canDownload.value) return

  downloading.value = true
  progress.value = 0
  error.value = ''
  downloadCompleted.value = false

  try {
    const formData = new FormData()
    const master = (
      Array.isArray(masterFile.value) ? masterFile.value[0] : masterFile.value
    ) as File
    const dvt = (Array.isArray(dvtFile.value) ? dvtFile.value[0] : dvtFile.value) as File

    formData.append('master_file', master)
    formData.append('dvt_file', dvt)

    if (specFile.value) {
      const spec = (Array.isArray(specFile.value) ? specFile.value[0] : specFile.value) as File
      formData.append('spec_file', spec)
    }

    if (threshold.value !== null) {
      formData.append('threshold', threshold.value.toString())
    }

    if (marginThreshold.value !== null) {
      formData.append('margin_threshold', marginThreshold.value.toString())
    }

    formData.append('freq_tol', freqTolerance.value.toString())
    formData.append('human', 'true')

    if (outputFormat.value === 'xlsx') {
      formData.append('return_xlsx', 'true')
    }

    // Simulate progress
    const progressInterval = setInterval(() => {
      if (progress.value < 90) {
        progress.value += 10
      }
    }, 100)

    const blob = (await comparisonApi.compareFormats(formData, true)) as Blob

    clearInterval(progressInterval)
    progress.value = 100

    // Download the file
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `comparison_${Date.now()}.${outputFormat.value}`
    link.click()
    URL.revokeObjectURL(url)

    downloadCompleted.value = true
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err) || getErrorMessage(err) || 'Download failed'
  } finally {
    downloading.value = false
  }
}

function handleReset() {
  masterFile.value = null
  dvtFile.value = null
  specFile.value = null
  threshold.value = null
  marginThreshold.value = null
  freqTolerance.value = 2.0
  outputFormat.value = 'json'
  comparisonResult.value = null
  error.value = ''
  downloadCompleted.value = false
}
</script>

<style scoped>
.text-caption {
    font-size: 0.75rem;
}
</style>
