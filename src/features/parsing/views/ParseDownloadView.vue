<template>
    <DefaultLayout>
        <!-- Page Header -->
        <div class="d-flex justify-space-between align-center mb-6">
            <div class="d-flex align-center">
                <v-icon size="40" color="primary" class="mr-3">mdi-file-export</v-icon>
                <div>
                    <h1 class="text-h4 mb-2">Parse & Download Format</h1>
                    <p class="text-medium-emphasis mb-0">
                        Upload file, select data, and download in your preferred format
                    </p>
                </div>
            </div>
            <v-btn v-if="hasPreview" color="secondary" prepend-icon="mdi-refresh" @click="handleReset">
                New Upload
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

        <!-- Step 1: Upload File -->
        <v-card v-if="!hasPreview" class="mb-4">
            <v-card-title>
                <v-icon start>mdi-file-upload</v-icon>
                Step 1: Upload File
            </v-card-title>
            <v-card-text>
                <v-file-input v-model="selectedFile" label="Select CSV or Excel file" accept=".csv,.xlsx,.xls"
                    variant="outlined" prepend-icon="mdi-paperclip" :loading="uploading" show-size
                    @update:model-value="handleFileChange">
                    <template #prepend-inner>
                        <v-icon>mdi-file-document</v-icon>
                    </template>
                </v-file-input>

                <!-- Upload Options -->
                <v-row class="mt-2">
                    <v-col cols="12" md="4">
                        <v-checkbox v-model="uploadOptions.hasHeader" label="First row is header" density="compact"
                            hide-details />
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-text-field v-model="uploadOptions.delimiter" label="Delimiter (optional)"
                            placeholder="Auto-detect" variant="outlined" density="compact" hide-details clearable />
                    </v-col>
                </v-row>

                <!-- Upload Progress -->
                <v-progress-linear v-if="uploading" :model-value="uploadProgress" color="primary" height="4"
                    class="mt-4" />

                <!-- Upload Button -->
                <v-btn :disabled="!selectedFile || uploading" :loading="uploading" color="primary" size="large" block
                    class="mt-4" @click="handleUpload">
                    <v-icon start>mdi-upload</v-icon>
                    Upload and Preview
                </v-btn>
            </v-card-text>
        </v-card>

        <!-- Step 2: Preview & Configure -->
        <v-card v-if="hasPreview" class="mb-4">
            <v-card-title>
                <div class="d-flex justify-space-between align-center w-100">
                    <div>
                        <v-icon start>mdi-table-eye</v-icon>
                        Step 2: File Preview
                    </div>
                    <v-chip color="primary" variant="tonal">
                        {{ preview?.filename }}
                    </v-chip>
                </div>
            </v-card-title>
            <v-card-subtitle>
                {{ columns.length }} columns · {{ previewRows.length }} preview rows
            </v-card-subtitle>
            <v-card-text>
                <!-- Preview Data Table -->
                <v-data-table :headers="previewHeaders" :items="previewRowsWithNumbers" density="compact" fixed-header
                    height="300" :items-per-page="20" :loading="uploading">
                    <template #no-data>
                        <div class="text-center pa-4">
                            <v-icon size="48" color="grey">mdi-table-off</v-icon>
                            <p class="text-medium-emphasis mt-2">No preview data available</p>
                        </div>
                    </template>
                </v-data-table>
            </v-card-text>
        </v-card>

        <!-- Step 3: Selection & Download -->
        <v-row v-if="hasPreview">
            <v-col cols="12" lg="6">
                <v-card>
                    <v-card-title class="bg-primary">
                        <v-icon start color="white">mdi-filter-variant</v-icon>
                        <span class="text-white">Step 3: Configure Selection</span>
                    </v-card-title>

                    <v-card-text class="pa-4">
                        <!-- Selection Mode -->
                        <div class="mb-4">
                            <div class="text-subtitle-2 mb-3">Selection Mode</div>
                            <v-radio-group v-model="mode" inline density="compact">
                                <v-radio label="Columns Only" value="columns" />
                                <v-radio label="Rows Only" value="rows" />
                                <v-radio label="Both" value="both" />
                            </v-radio-group>
                        </div>

                        <!-- Download Format -->
                        <div class="mb-4">
                            <div class="text-subtitle-2 mb-3">Download Format</div>
                            <v-radio-group v-model="format" inline density="compact">
                                <v-radio label="CSV" value="csv" />
                                <v-radio label="XLSX" value="xlsx" />
                                <v-radio label="Both (ZIP)" value="both" />
                            </v-radio-group>
                        </div>

                        <v-divider class="my-4" />

                        <!-- Column Selection -->
                        <div v-if="mode === 'columns' || mode === 'both'" class="mb-4">
                            <div class="text-subtitle-2 mb-3">
                                <v-icon size="small" start>mdi-table-column</v-icon>
                                Column Selection
                            </div>

                            <v-autocomplete v-model="selectedColumns" :items="columns" label="Select Columns" multiple
                                chips closable-chips variant="outlined" density="compact" clearable
                                hint="Select columns to include" persistent-hint class="mb-3" />

                            <v-autocomplete v-model="excludeColumns" :items="columns" label="Exclude Columns (optional)"
                                multiple chips closable-chips variant="outlined" density="compact" clearable
                                hint="Remove specific columns from selection" persistent-hint />
                        </div>

                        <!-- Row Selection -->
                        <div v-if="mode === 'rows' || mode === 'both'" class="mb-4">
                            <div class="text-subtitle-2 mb-3">
                                <v-icon size="small" start>mdi-table-row</v-icon>
                                Row Selection
                            </div>

                            <v-text-field v-model="selectedRowsText" label="Selected Row Indices (comma-separated)"
                                variant="outlined" density="compact" prepend-inner-icon="mdi-check-circle"
                                hint="e.g., 0, 2, 4 (zero-indexed)" persistent-hint class="mb-3" />

                            <v-text-field v-model="excludeRowsText" label="Exclude Row Indices (optional)"
                                variant="outlined" density="compact" prepend-inner-icon="mdi-minus-circle"
                                hint="e.g., 1, 3" persistent-hint />
                        </div>

                        <v-divider class="my-4" />

                        <!-- Action Buttons -->
                        <v-row dense>
                            <v-col cols="12">
                                <v-btn color="primary" size="large" block :loading="processing" :disabled="!canProcess"
                                    prepend-icon="mdi-download" @click="handleDownload">
                                    Parse & Download {{ format.toUpperCase() }}
                                </v-btn>
                            </v-col>
                        </v-row>

                        <!-- Progress -->
                        <v-progress-linear v-if="processing" :model-value="progress" color="primary" height="6" striped
                            class="mt-4">
                            <template #default="{ value }">
                                <span class="text-caption">{{ Math.round(value) }}%</span>
                            </template>
                        </v-progress-linear>
                    </v-card-text>
                </v-card>
            </v-col>

            <!-- Right Panel: Instructions -->
            <v-col cols="12" lg="6">
                <v-card>
                    <v-card-title class="bg-info">
                        <v-icon start color="white">mdi-information</v-icon>
                        <span class="text-white">Instructions</span>
                    </v-card-title>

                    <v-card-text class="pa-4">
                        <div class="text-body-2">
                            <h3 class="text-h6 mb-3">Quick Guide:</h3>

                            <v-timeline density="compact" side="end" class="mb-4">
                                <v-timeline-item dot-color="success" size="small" icon="mdi-check">
                                    <div class="text-subtitle-2 mb-1">✓ File Uploaded</div>
                                    <div class="text-caption text-medium-emphasis">
                                        Preview showing {{ columns.length }} columns
                                    </div>
                                </v-timeline-item>

                                <v-timeline-item dot-color="primary" size="small">
                                    <div class="text-subtitle-2 mb-1">2. Select Data</div>
                                    <div class="text-caption text-medium-emphasis">
                                        Choose which columns/rows to include in download
                                    </div>
                                </v-timeline-item>

                                <v-timeline-item dot-color="primary" size="small">
                                    <div class="text-subtitle-2 mb-1">3. Download</div>
                                    <div class="text-caption text-medium-emphasis">
                                        Get your filtered file in preferred format
                                    </div>
                                </v-timeline-item>
                            </v-timeline>

                            <v-divider class="my-4" />

                            <h3 class="text-h6 mb-3">Format Options:</h3>

                            <v-list density="compact" class="bg-transparent">
                                <v-list-item>
                                    <template #prepend>
                                        <v-icon size="small">mdi-file-delimited</v-icon>
                                    </template>
                                    <v-list-item-title class="text-caption">CSV</v-list-item-title>
                                    <v-list-item-subtitle class="text-caption">
                                        Comma-separated values (universal format)
                                    </v-list-item-subtitle>
                                </v-list-item>

                                <v-list-item>
                                    <template #prepend>
                                        <v-icon size="small">mdi-file-excel</v-icon>
                                    </template>
                                    <v-list-item-title class="text-caption">XLSX</v-list-item-title>
                                    <v-list-item-subtitle class="text-caption">
                                        Excel spreadsheet format
                                    </v-list-item-subtitle>
                                </v-list-item>

                                <v-list-item>
                                    <template #prepend>
                                        <v-icon size="small">mdi-folder-zip</v-icon>
                                    </template>
                                    <v-list-item-title class="text-caption">Both (ZIP)</v-list-item-title>
                                    <v-list-item-subtitle class="text-caption">
                                        Both CSV and XLSX in a single ZIP file
                                    </v-list-item-subtitle>
                                </v-list-item>
                            </v-list>

                            <v-divider class="my-4" />

                            <v-alert type="info" variant="tonal" density="compact">
                                <div class="text-caption">
                                    <strong>Tip:</strong> Leave row/column selections empty to include all data
                                </div>
                            </v-alert>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { UploadPreviewResponse } from '@/core/types/api.types'
import { getApiErrorDetail, getErrorMessage } from '@/shared/utils'
import { parsingApi } from '../api/parsing.api'

// State
const selectedFile = ref<File | File[] | null>(null)
const uploadOptions = ref({
  hasHeader: true,
  delimiter: '',
})
const uploading = ref(false)
const uploadProgress = ref(0)
const preview = ref<UploadPreviewResponse | null>(null)
const error = ref('')

const mode = ref<'columns' | 'rows' | 'both'>('both')
const format = ref<'csv' | 'xlsx' | 'both'>('xlsx')
const selectedColumns = ref<string[]>([])
const excludeColumns = ref<string[]>([])
const selectedRowsText = ref('')
const excludeRowsText = ref('')
const processing = ref(false)
const progress = ref(0)
const downloadCompleted = ref(false)

// Computed
const hasPreview = computed(() => preview.value !== null)

const columns = computed(() => preview.value?.columns || [])

const previewRows = computed(() => preview.value?.preview || [])

const previewHeaders = computed(() => {
  if (!columns.value || columns.value.length === 0) return []

  const headers = [
    {
      title: '#',
      key: '__rowNumber',
      sortable: false,
      width: 60,
      align: 'center' as const,
    },
  ]

  columns.value.forEach((col) => {
    headers.push({
      title: col,
      key: col,
      sortable: true,
      width: 150,
      align: 'center' as const,
    })
  })

  return headers
})

const previewRowsWithNumbers = computed(() => {
  if (!previewRows.value || previewRows.value.length === 0) return []
  return previewRows.value.map((row, index) => ({
    ...row,
    __rowNumber: index + 1,
  }))
})

const canProcess = computed(() => {
  if (!hasPreview.value || processing.value) return false

  if (mode.value === 'columns' || mode.value === 'both') {
    return selectedColumns.value.length > 0
  }

  return true
})

// Methods
function handleFileChange() {
  // Auto-detect CSV delimiter
  if (selectedFile.value) {
    const file = Array.isArray(selectedFile.value) ? selectedFile.value[0] : selectedFile.value
    if (file?.name?.toLowerCase().endsWith('.csv')) {
      uploadOptions.value.delimiter = ','
    }
  }
}

async function handleUpload() {
  if (!selectedFile.value) return

  const file = Array.isArray(selectedFile.value) ? selectedFile.value[0] : selectedFile.value
  if (!file) return

  uploading.value = true
  uploadProgress.value = 0
  error.value = ''

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('has_header', uploadOptions.value.hasHeader.toString())
    if (uploadOptions.value.delimiter) {
      formData.append('delimiter', uploadOptions.value.delimiter)
    }
    formData.append('persist', 'false') // Don't persist to disk for this workflow

    // Simulate progress
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += 10
      }
    }, 100)

    const response = await parsingApi.uploadPreview(formData)
    preview.value = response

    clearInterval(progressInterval)
    uploadProgress.value = 100

    // Auto-select all columns by default
    selectedColumns.value = [...columns.value]
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err) || getErrorMessage(err) || 'Upload failed'
  } finally {
    uploading.value = false
  }
}

function parseRowIndices(text: string): number[] {
  if (!text.trim()) return []
  return text
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => parseInt(s, 10))
    .filter((n) => !Number.isNaN(n))
}

async function handleDownload() {
  if (!canProcess.value || !preview.value) return

  processing.value = true
  progress.value = 0
  error.value = ''
  downloadCompleted.value = false

  try {
    const formData = new FormData()
    formData.append('file_id', preview.value.file_id)
    formData.append('mode', mode.value)
    formData.append('format', format.value)

    // Add column selections
    if (mode.value === 'columns' || mode.value === 'both') {
      if (selectedColumns.value.length > 0) {
        formData.append('selected_columns', JSON.stringify(selectedColumns.value))
      }
      if (excludeColumns.value.length > 0) {
        formData.append('exclude_columns', JSON.stringify(excludeColumns.value))
      }
    }

    // Add row selections
    if (mode.value === 'rows' || mode.value === 'both') {
      const selectedRows = parseRowIndices(selectedRowsText.value)
      const excludeRows = parseRowIndices(excludeRowsText.value)

      if (selectedRows.length > 0) {
        formData.append('selected_rows', JSON.stringify(selectedRows))
      }
      if (excludeRows.length > 0) {
        formData.append('exclude_rows', JSON.stringify(excludeRows))
      }
    }

    // Simulate progress
    const progressInterval = setInterval(() => {
      if (progress.value < 90) {
        progress.value += 10
      }
    }, 100)

    const blob = await parsingApi.parseDownloadFormat(formData)

    clearInterval(progressInterval)
    progress.value = 100

    // Determine filename and extension
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const baseName = preview.value.filename.replace(/\.[^/.]+$/, '')

    let filename: string
    if (format.value === 'csv') {
      filename = `${baseName}_parsed_${timestamp}.csv`
    } else if (format.value === 'xlsx') {
      filename = `${baseName}_parsed_${timestamp}.xlsx`
    } else {
      filename = `${baseName}_parsed_${timestamp}.zip`
    }

    // Download the file
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)

    downloadCompleted.value = true
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err) || getErrorMessage(err) || 'Download failed'
  } finally {
    processing.value = false
  }
}

function handleReset() {
  selectedFile.value = null
  preview.value = null
  selectedColumns.value = []
  excludeColumns.value = []
  selectedRowsText.value = ''
  excludeRowsText.value = ''
  mode.value = 'both'
  format.value = 'xlsx'
  error.value = ''
  downloadCompleted.value = false
  uploadOptions.value = {
    hasHeader: true,
    delimiter: '',
  }
}
</script>

<style scoped>
.gap-2 {
    gap: 0.5rem;
}
</style>
