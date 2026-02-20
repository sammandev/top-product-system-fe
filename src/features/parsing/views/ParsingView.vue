<template>
  <DefaultLayout>
    <!-- Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 mb-2">File Upload & Parsing</h1>
        <p class="text-medium-emphasis">
          Upload CSV or Excel files to preview, select columns/rows, and parse data
        </p>
      </div>
      <v-btn v-if="hasPreview" color="secondary" prepend-icon="mdi-refresh" @click="handleReset">
        New Upload
      </v-btn>
    </div>

    <!-- Error Alert -->
    <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="clearError">
      {{ error }}
    </v-alert>

    <!-- Upload Section -->
    <v-card v-if="!hasPreview" class="mb-4">
      <v-card-title>
        <v-icon start>mdi-file-upload</v-icon>
        Upload File
      </v-card-title>
      <v-card-text>
        <v-form ref="uploadFormRef" v-model="uploadFormValid">
          <!-- File Input -->
          <v-file-input v-model="selectedFile" label="Select CSV or Excel file" accept=".csv,.xlsx,.xls"
            variant="outlined" prepend-icon="mdi-paperclip" :rules="[rules.required, rules.fileType]" :loading="loading"
            show-size class="mb-4" @update:model-value="handleFileSelect">
            <template #prepend-inner>
              <v-icon>mdi-file-document</v-icon>
            </template>
          </v-file-input>

          <!-- Upload Options -->
          <v-row>
            <v-col cols="12" md="4">
              <v-checkbox v-model="uploadOptions.hasHeader" label="First row is header" density="compact"
                hide-details />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="uploadOptions.delimiter" label="Delimiter (optional)" placeholder="Auto-detect"
                variant="outlined" density="compact" hide-details clearable />
            </v-col>
            <v-col cols="12" md="4">
              <v-checkbox v-model="uploadOptions.persist" label="Persist to disk" density="compact" hide-details />
            </v-col>
          </v-row>

          <!-- Upload Progress -->
          <v-progress-linear v-if="loading" :model-value="uploadProgress" color="primary" height="4" class="mt-4" />

          <!-- Upload Button -->
          <v-btn :disabled="!uploadFormValid || !selectedFile || loading" :loading="loading" color="primary"
            size="large" block class="mt-4" @click="handleUpload">
            <v-icon start>mdi-upload</v-icon>
            Upload and Preview
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>

    <!-- Preview Section -->
    <v-card v-if="hasPreview" class="mb-4">
      <v-card-title>
        <div class="d-flex justify-space-between align-center w-100">
          <div>
            <v-icon start>mdi-table-eye</v-icon>
            File Preview
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
          height="400" :items-per-page="20" :loading="loading">
          <template #no-data>
            <div class="text-center pa-4">
              <v-icon size="48" color="grey">mdi-table-off</v-icon>
              <p class="text-medium-emphasis mt-2">No preview data available</p>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Parse Section -->
    <v-row v-if="hasPreview">
      <v-col cols="12">
        <v-card class="mb-4">
          <v-card-title>
            <v-icon start>mdi-filter-variant</v-icon>
            Parse Options
          </v-card-title>
          <v-card-text>
            <!-- Mode Selection -->
            <v-radio-group v-model="parseMode" inline hide-details>
              <v-radio label="Select Columns" value="columns" />
              <v-radio label="Select Rows" value="rows" />
              <v-radio label="Select Both" value="both" />
            </v-radio-group>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Column Selection Component -->
      <v-col v-if="parseMode === 'columns' || parseMode === 'both'" cols="12" md="6">
        <ColumnSelector v-model="selectedColumns" :columns="columns" :column-types="columnTypes" />
      </v-col>

      <!-- Row Selection Component -->
      <v-col v-if="parseMode === 'rows' || parseMode === 'both'" cols="12" :md="parseMode === 'both' ? 6 : 12">
        <RowSelector v-model="rowSelection" :total-rows="preview?.preview.length || 0" />
      </v-col>

      <!-- Action Buttons -->
      <v-col cols="12">
        <v-card>
          <v-card-text>
            <div class="d-flex gap-2 flex-wrap align-center">
              <v-btn :disabled="!canParse || loading" :loading="loading" color="primary" size="large"
                prepend-icon="mdi-play" @click="handleParse">
                Parse Data
              </v-btn>

              <!-- Download Format Selection -->
              <v-select v-model="downloadFormat" :items="downloadFormatOptions" label="Download Format"
                variant="outlined" density="compact" style="width: 150px" hide-details />

              <v-btn :disabled="!canParse || loading" :loading="loading" color="secondary" size="large"
                prepend-icon="mdi-download" @click="handleDownload">
                Download
              </v-btn>

              <v-spacer />
              <v-btn variant="tonal" prepend-icon="mdi-information"
                @click="showSelectionSummary = !showSelectionSummary">
                Selection Summary
              </v-btn>
            </div>

            <!-- Selection Summary -->
            <v-expand-transition>
              <v-alert v-if="showSelectionSummary" type="info" variant="tonal" density="compact" class="mt-4">
                <div class="text-caption">
                  <div><strong>Mode:</strong> {{ parseMode }}</div>
                  <div v-if="parseMode === 'columns' || parseMode === 'both'">
                    <strong>Columns:</strong> {{ selectedColumns.length }} selected
                  </div>
                  <div v-if="parseMode === 'rows' || parseMode === 'both'">
                    <strong>Rows:</strong> {{ rowSelectionSummary }}
                  </div>
                </div>
              </v-alert>
            </v-expand-transition>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Parsed Data Section -->
    <v-card v-if="hasParsedData" class="mt-4">
      <v-card-title>
        <v-icon start>mdi-table-check</v-icon>
        Parsed Data
      </v-card-title>
      <v-card-subtitle>
        {{ parsedData?.columns.length }} columns · {{ parsedData?.rows.length }} rows
      </v-card-subtitle>
      <v-card-text>
        <v-data-table :headers="parsedHeaders" :items="parsedRowsWithNumbers" density="compact" fixed-header
          height="400" :items-per-page="20">
          <template #no-data>
            <div class="text-center pa-4">
              <v-icon size="48" color="grey">mdi-table-off</v-icon>
              <p class="text-medium-emphasis mt-2">No parsed data available</p>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFileParsing } from '../composables'
import type { RowSelection } from '../types'

// Composable
const {
  preview,
  parsedData,
  loading,
  error,
  uploadProgress,
  hasPreview,
  hasParsedData,
  columns,
  previewRows,
  uploadFile,
  parseData,
  downloadParsedFormat,
  reset,
  clearError,
} = useFileParsing({
  hasHeader: true,
  delimiter: '',
  persist: false,
})

// Form state
const uploadFormRef = ref()
const uploadFormValid = ref(false)

// Upload state
const selectedFile = ref<File | File[] | null>(null)
const uploadOptions = ref({
  hasHeader: true,
  delimiter: '',
  persist: false,
})

// Parse state
const parseMode = ref<'columns' | 'rows' | 'both'>('columns')
const selectedColumns = ref<string[]>([])
const rowSelection = ref<RowSelection>({ mode: 'all' })
const showSelectionSummary = ref(false)
const downloadFormat = ref<'csv' | 'xlsx' | 'both'>('xlsx')
const downloadFormatOptions = [
  { title: 'CSV', value: 'csv' },
  { title: 'XLSX', value: 'xlsx' },
  { title: 'Both (ZIP)', value: 'both' },
]

// Column types (mock data - can be enhanced later)
const columnTypes = computed(() => {
  const types: Record<string, string> = {}
  columns.value.forEach((col) => {
    types[col] = 'text' // Default to text, can be enhanced with actual type detection
  })
  return types
})

// Computed
const canParse = computed(() => {
  if (parseMode.value === 'columns') {
    return selectedColumns.value.length > 0
  }
  if (parseMode.value === 'rows') {
    return true // Row selection has default 'all' mode
  }
  if (parseMode.value === 'both') {
    return selectedColumns.value.length > 0
  }
  return false
})

const rowSelectionSummary = computed(() => {
  if (rowSelection.value.mode === 'all') {
    return `All rows (${preview.value?.preview.length || 0})`
  }
  if (rowSelection.value.mode === 'range' && rowSelection.value.range) {
    const count = rowSelection.value.range.end - rowSelection.value.range.start + 1
    return `Range [${rowSelection.value.range.start}-${rowSelection.value.range.end}] (${count} rows)`
  }
  if (rowSelection.value.mode === 'exclude' && rowSelection.value.exclude) {
    const total = preview.value?.preview.length || 0
    const excluded = rowSelection.value.exclude.length
    return `${total - excluded} rows (excluding ${excluded})`
  }
  return 'Not configured'
})

// Validation rules
const rules = {
  required: (v: unknown) => {
    if (Array.isArray(v)) {
      return v.length > 0 || 'This field is required'
    }
    return !!v || 'This field is required'
  },
  fileType: (v: File | File[] | null | undefined) => {
    // Handle null/undefined
    if (!v) return true

    // Handle array of files
    if (Array.isArray(v)) {
      if (v.length === 0) return true
      const file = v[0]
      if (!file || !file.name) return 'Invalid file'
      const validTypes = ['.csv', '.xlsx', '.xls']
      const isValid = validTypes.some((type) => file.name.toLowerCase().endsWith(type))
      return isValid || 'Only CSV and Excel files are allowed'
    }

    // Handle single file
    if (!v.name) return 'Invalid file'
    const validTypes = ['.csv', '.xlsx', '.xls']
    const isValid = validTypes.some((type) => v.name.toLowerCase().endsWith(type))
    return isValid || 'Only CSV and Excel files are allowed'
  },
}

// Utility: Convert 0-based column index to Excel-style letter (A, B, C, ..., Z, AA, AB, ...)
function getColumnLetter(index: number): string {
  let letter = ''
  let num = index + 1 // Convert to 1-based

  while (num > 0) {
    const remainder = (num - 1) % 26
    letter = String.fromCharCode(65 + remainder) + letter
    num = Math.floor((num - 1) / 26)
  }

  return letter
}

const previewHeaders = computed(() => {
  if (!columns.value || columns.value.length === 0) return []

  // Add row number column first
  const headers = [
    {
      title: '#',
      key: '__rowNumber',
      sortable: false,
      width: 60,
      align: 'center' as const,
    },
  ]

  // Add data columns with Excel-style alphabet letters
  columns.value.forEach((col, index) => {
    const columnLetter = getColumnLetter(index)
    // Replace "Unnamed: X" with column letter
    const displayName = col.match(/^Unnamed:\s*\d+$/i) ? columnLetter : col
    headers.push({
      title: `[${columnLetter}]\n${displayName}`,
      key: col,
      sortable: true,
      width: 100,
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

const parsedHeaders = computed(() => {
  if (!parsedData.value?.columns || parsedData.value.columns.length === 0) return []

  // Add row number column first
  const headers = [
    {
      title: '#',
      key: '__rowNumber',
      sortable: false,
      width: 60,
      align: 'center' as const,
    },
  ]

  // Add data columns with Excel-style alphabet letters
  parsedData.value.columns.forEach((col, index) => {
    const columnLetter = getColumnLetter(index)
    // Replace "Unnamed: X" with column letter
    const displayName = col.match(/^Unnamed:\s*\d+$/i) ? columnLetter : col
    headers.push({
      title: `[${columnLetter}]\n${displayName}`,
      key: col,
      sortable: true,
      width: 100,
      align: 'center' as const,
    })
  })

  return headers
})

const parsedRowsWithNumbers = computed(() => {
  if (!parsedData.value?.rows || parsedData.value.rows.length === 0) return []
  return parsedData.value.rows.map((row, index) => ({
    ...row,
    __rowNumber: index + 1,
  }))
})

// Handlers
function handleFileSelect() {
  // Auto-fill some options based on file extension
  if (selectedFile.value) {
    const file = Array.isArray(selectedFile.value) ? selectedFile.value[0] : selectedFile.value
    if (file?.name?.toLowerCase().endsWith('.csv')) {
      uploadOptions.value.delimiter = ','
    }
  }
}

async function handleUpload() {
  // Check if file is selected
  if (!selectedFile.value) {
    error.value = 'Please select a file'
    return
  }

  // Get the file (handle both single file and array)
  const file = Array.isArray(selectedFile.value) ? selectedFile.value[0] : selectedFile.value

  if (!file) {
    error.value = 'Invalid file selection'
    return
  }

  // Upload the file
  await uploadFile(file, uploadOptions.value)
}

async function handleParse() {
  const columnSelection =
    parseMode.value === 'columns' || parseMode.value === 'both'
      ? {
          selected: selectedColumns.value,
          excluded: [],
        }
      : undefined

  const rowSelectionData =
    parseMode.value === 'rows' || parseMode.value === 'both' ? rowSelection.value : undefined

  // Convert rowSelection to the format expected by parseData
  let rowSelectionForAPI: { selected: number[]; excluded: number[] } | undefined
  if (rowSelectionData) {
    if (rowSelectionData.mode === 'range' && rowSelectionData.range) {
      const { start, end } = rowSelectionData.range
      rowSelectionForAPI = {
        selected: Array.from({ length: end - start + 1 }, (_, i) => start + i),
        excluded: [],
      }
    } else if (rowSelectionData.mode === 'exclude' && rowSelectionData.exclude) {
      rowSelectionForAPI = {
        selected: [],
        excluded: rowSelectionData.exclude,
      }
    }
  }

  await parseData(parseMode.value, columnSelection, rowSelectionForAPI)
}

async function handleDownload() {
  const columnSelection =
    parseMode.value === 'columns' || parseMode.value === 'both'
      ? {
          selected: selectedColumns.value,
          excluded: [],
        }
      : undefined

  const rowSelectionData =
    parseMode.value === 'rows' || parseMode.value === 'both' ? rowSelection.value : undefined

  // Convert rowSelection to the format expected by downloadParsed
  let rowSelectionForAPI: { selected: number[]; excluded: number[] } | undefined
  if (rowSelectionData) {
    if (rowSelectionData.mode === 'range' && rowSelectionData.range) {
      const { start, end } = rowSelectionData.range
      rowSelectionForAPI = {
        selected: Array.from({ length: end - start + 1 }, (_, i) => start + i),
        excluded: [],
      }
    } else if (rowSelectionData.mode === 'exclude' && rowSelectionData.exclude) {
      rowSelectionForAPI = {
        selected: [],
        excluded: rowSelectionData.exclude,
      }
    }
  }

  await downloadParsedFormat(
    parseMode.value,
    columnSelection,
    rowSelectionForAPI,
    downloadFormat.value,
    'parsed',
    uploadOptions.value.hasHeader,
  )
}

function handleReset() {
  reset()
  selectedFile.value = null
  selectedColumns.value = []
  rowSelection.value = { mode: 'all' }
  parseMode.value = 'columns'
  downloadFormat.value = 'xlsx'
  showSelectionSummary.value = false
  uploadOptions.value = {
    hasHeader: true,
    delimiter: '',
    persist: false,
  }
}
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}

/* Preserve newlines in table headers */
:deep(.v-data-table th) {
  white-space: pre-line;
  vertical-align: middle;
  line-height: 1.4;
}

:deep(.v-data-table-header__content) {
  white-space: pre-line;
}
</style>
