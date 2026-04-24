<template>
  <DefaultLayout>
    <!-- Header -->
    <div class="parsing-view-page-header mb-6">
      <div>
        <h1 class="parsing-view-page-title">File Upload & Parsing</h1>
        <p class="parsing-view-page-subtitle">
          Upload CSV or Excel files to preview, select columns/rows, and parse data
        </p>
      </div>
      <button v-if="hasPreview" type="button" class="parsing-view-button parsing-view-button--secondary" @click="handleReset">
        <Icon icon="mdi:refresh" />
        <span>New Upload</span>
      </button>
    </div>

    <div v-if="error" class="parsing-view-notice parsing-view-notice--error mb-4">
      <div>
        <strong>Parsing error</strong>
        <p>{{ error }}</p>
      </div>
      <button type="button" @click="clearError">Dismiss</button>
    </div>

    <section v-if="!hasPreview" class="parsing-view-panel mb-4">
      <div class="parsing-view-panel__header">
        <div>
          <p class="parsing-view-panel__eyebrow">Upload</p>
          <h2>Prepare Source File</h2>
          <p>Load a CSV or Excel source, set the ingestion hints, and generate the preview surface.</p>
        </div>
        <Icon icon="mdi:file-upload" class="parsing-view-panel__icon" />
      </div>

      <form class="parsing-view-form" @submit.prevent="handleUpload">
        <AppFilePicker
          v-model="selectedFile"
          accept=".csv,.xlsx,.xls"
          helper-text="CSV and Excel files are supported. Preview loads before parse actions are enabled."
          label="Select CSV or Excel file"
          :disabled="loading"
          class="mb-4"
          @select="handleFileSelect"
        />

        <div class="parsing-view-upload-grid">
          <label class="parsing-view-toggle">
            <input v-model="uploadOptions.hasHeader" type="checkbox">
            <span>First row is header</span>
          </label>

          <label class="parsing-view-field">
            <span>Delimiter</span>
            <input v-model="uploadOptions.delimiter" placeholder="Auto-detect" type="text">
          </label>

          <label class="parsing-view-toggle">
            <input v-model="uploadOptions.persist" type="checkbox">
            <span>Persist to disk</span>
          </label>
        </div>

        <AppProgress v-if="loading" :value="uploadProgress" class="mt-4" aria-live="polite" />

        <button type="submit" class="parsing-view-button parsing-view-button--primary parsing-view-button--block parsing-view-button--large mt-4" :disabled="!isUploadReady || loading">
          <Icon :icon="loading ? 'mdi:loading' : 'mdi:upload'" :class="{ 'parsing-view-spin': loading }" />
          <span>{{ loading ? 'Uploading...' : 'Upload and Preview' }}</span>
        </button>
      </form>
    </section>

    <section v-if="hasPreview" class="parsing-view-panel mb-4">
      <div class="parsing-view-panel__header parsing-view-panel__header--split">
        <div>
          <p class="parsing-view-panel__eyebrow">Preview</p>
          <h2>Inspect Incoming Rows</h2>
          <p>{{ columns.length }} columns · {{ previewRows.length }} preview rows</p>
        </div>
        <span class="parsing-view-pill parsing-view-pill--primary">
          {{ preview?.filename }}
        </span>
      </div>

      <AppDataGrid
        :columns="previewGridColumns"
        :rows="previewRowsWithNumbers"
        :loading="loading"
        paginator
        :rowsPerPage="20"
        scrollHeight="400px"
      >
        <template #empty>
          <div class="parsing-view-empty-state">
            <Icon icon="mdi:table-off" class="parsing-view-empty-state__icon" />
            <p>No preview data available</p>
          </div>
        </template>
      </AppDataGrid>
    </section>

    <div v-if="hasPreview" class="parsing-view-workbench">
      <section class="parsing-view-panel mb-4">
        <div class="parsing-view-panel__header">
          <div>
            <p class="parsing-view-panel__eyebrow">Mode</p>
            <h2>Choose Parse Scope</h2>
            <p>Switch between schema trimming, row filtering, or both in one execution.</p>
          </div>
          <Icon icon="mdi:filter-variant" class="parsing-view-panel__icon" />
        </div>

        <div class="parsing-view-mode-grid">
          <label v-for="option in parseModeOptions" :key="option.value" class="parsing-view-mode-card" :class="{ 'parsing-view-mode-card--active': parseMode === option.value }">
            <input v-model="parseMode" :value="option.value" type="radio">
            <span>{{ option.label }}</span>
            <small>{{ option.description }}</small>
          </label>
        </div>
      </section>

      <div class="parsing-view-selection-grid">
        <div v-if="parseMode === 'columns' || parseMode === 'both'" class="parsing-view-selection-grid__item">
          <ColumnSelector v-model="selectedColumns" :columns="columns" :column-types="columnTypes" />
        </div>

        <div v-if="parseMode === 'rows' || parseMode === 'both'" class="parsing-view-selection-grid__item" :class="{ 'parsing-view-selection-grid__item--full': parseMode === 'rows' }">
          <RowSelector v-model="rowSelection" :total-rows="preview?.preview.length || 0" />
        </div>
      </div>

      <section class="parsing-view-panel">
        <div class="parsing-view-panel__header parsing-view-panel__header--compact">
          <div>
            <p class="parsing-view-panel__eyebrow">Actions</p>
            <h2>Run Parse or Export</h2>
          </div>
        </div>

        <div class="parsing-view-action-row">
          <button type="button" class="parsing-view-button parsing-view-button--primary parsing-view-button--large" :disabled="!canParse || loading" @click="handleParse">
            <Icon :icon="loading ? 'mdi:loading' : 'mdi:play'" :class="{ 'parsing-view-spin': loading }" />
            <span>{{ loading ? 'Parsing...' : 'Parse Data' }}</span>
          </button>

          <label class="parsing-view-field parsing-view-field--compact">
            <span>Download Format</span>
            <select v-model="downloadFormat">
              <option v-for="option in downloadFormatOptions" :key="option.value" :value="option.value">{{ option.title }}</option>
            </select>
          </label>

          <button type="button" class="parsing-view-button parsing-view-button--secondary parsing-view-button--large" :disabled="!canParse || loading" @click="handleDownload">
            <Icon :icon="loading ? 'mdi:loading' : 'mdi:download'" :class="{ 'parsing-view-spin': loading }" />
            <span>{{ loading ? 'Preparing...' : 'Download' }}</span>
          </button>

          <div class="parsing-view-action-spacer" />
          <button type="button" class="parsing-view-button parsing-view-button--ghost" @click="showSelectionSummary = !showSelectionSummary">
            <Icon icon="mdi:information" />
            <span>Selection Summary</span>
          </button>
        </div>

        <Transition name="parsing-view-expand">
          <div v-if="showSelectionSummary" class="parsing-view-summary mt-4">
            <div><strong>Mode:</strong> {{ parseMode }}</div>
            <div v-if="parseMode === 'columns' || parseMode === 'both'"><strong>Columns:</strong> {{ selectedColumns.length }} selected</div>
            <div v-if="parseMode === 'rows' || parseMode === 'both'"><strong>Rows:</strong> {{ rowSelectionSummary }}</div>
          </div>
        </Transition>
      </section>
    </div>

    <section v-if="hasParsedData" class="parsing-view-panel mt-4">
      <div class="parsing-view-panel__header">
        <div>
          <p class="parsing-view-panel__eyebrow">Output</p>
          <h2>Parsed Data</h2>
          <p>{{ parsedData?.columns.length }} columns · {{ parsedData?.rows.length }} rows</p>
        </div>
        <Icon icon="mdi:table-check" class="parsing-view-panel__icon" />
      </div>

      <AppDataGrid
        :columns="parsedGridColumns"
        :rows="parsedRowsWithNumbers"
        paginator
        :rowsPerPage="20"
        scrollHeight="400px"
      >
        <template #empty>
          <div class="parsing-view-empty-state">
            <Icon icon="mdi:table-off" class="parsing-view-empty-state__icon" />
            <p>No parsed data available</p>
          </div>
        </template>
      </AppDataGrid>
    </section>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { AppDataGrid, AppFilePicker, AppProgress } from '@/shared'
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
const parseModeOptions: Array<{ value: 'columns' | 'rows' | 'both'; label: string; description: string }> = [
  { value: 'columns', label: 'Select Columns', description: 'Trim the schema and keep all rows.' },
  { value: 'rows', label: 'Select Rows', description: 'Filter row ranges while preserving the schema.' },
  { value: 'both', label: 'Select Both', description: 'Control columns and rows in one pass.' },
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

const isUploadReady = computed(() => getSelectedFile(selectedFile.value) !== null)

const rowSelectionSummary = computed(() => {
  if (rowSelection.value.mode === 'all') {
    return `All rows (${preview.value?.preview.length || 0})`
  }
  if (rowSelection.value.mode === 'range' && rowSelection.value.range) {
    const count = rowSelection.value.range.end - rowSelection.value.range.start + 1
    const excluded = rowSelection.value.excluded?.length || 0
    return excluded > 0
      ? `Range [${rowSelection.value.range.start}-${rowSelection.value.range.end}] (${count} rows, excluding ${excluded})`
      : `Range [${rowSelection.value.range.start}-${rowSelection.value.range.end}] (${count} rows)`
  }
  return 'Not configured'
})

function getSelectedFile(value: File | File[] | null | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : value ?? null
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

const previewGridColumns = computed(() =>
  previewHeaders.value.map((header) => ({
    key: String(header.key),
    field: String(header.key),
    header: String(header.title),
    sortable: Boolean(header.sortable),
    style: header.width ? { width: `${header.width}px` } : undefined,
  })),
)

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

const parsedGridColumns = computed(() =>
  parsedHeaders.value.map((header) => ({
    key: String(header.key),
    field: String(header.key),
    header: String(header.title),
    sortable: Boolean(header.sortable),
    style: header.width ? { width: `${header.width}px` } : undefined,
  })),
)

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
  const file = getSelectedFile(selectedFile.value)
  if (file?.name?.toLowerCase().endsWith('.csv')) {
    uploadOptions.value.delimiter = ','
  }
}

async function handleUpload() {
  const file = getSelectedFile(selectedFile.value)
  if (!file) {
    error.value = 'Please select a file'
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
        excluded: rowSelectionData.excluded ?? [],
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
        excluded: rowSelectionData.excluded ?? [],
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
.parsing-view-page-header,
.parsing-view-button,
.parsing-view-pill {
  display: inline-flex;
  align-items: center;
}

.parsing-view-page-header {
  justify-content: space-between;
  gap: 1rem;
}

.parsing-view-page-title {
  margin: 0 0 0.5rem;
  font-size: clamp(2rem, 3vw, 2.5rem);
  line-height: 1.08;
}

.parsing-view-page-subtitle {
  margin: 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.parsing-view-panel {
  display: grid;
  gap: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  padding: 1.2rem;
  background:
    radial-gradient(circle at top right, rgba(15, 118, 110, 0.06), transparent 32%),
    var(--app-panel);
  box-shadow: var(--app-shadow-soft);
}

.parsing-view-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.parsing-view-panel__header--split {
  align-items: center;
}

.parsing-view-panel__header--compact {
  align-items: center;
}

.parsing-view-panel__icon {
  font-size: 1.75rem;
  color: var(--app-ink);
}

.parsing-view-panel__header h2 {
  margin: 0.2rem 0 0;
  color: var(--app-ink);
  font-size: 1.1rem;
}

.parsing-view-panel__header p {
  margin: 0.35rem 0 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.parsing-view-panel__eyebrow {
  margin: 0;
  color: var(--app-accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.parsing-view-workbench {
  display: grid;
  gap: 1rem;
}

.parsing-view-selection-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.parsing-view-selection-grid__item--full {
  grid-column: 1 / -1;
}

.parsing-view-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.parsing-view-button {
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  padding: 0.78rem 1rem;
  background: var(--app-panel);
  color: var(--app-ink);
  cursor: pointer;
  font-weight: 700;
}

.parsing-view-button:disabled {
  cursor: not-allowed;
  opacity: 0.64;
}

.parsing-view-button--primary {
  background: #1f4e86;
  border-color: #1f4e86;
  color: #f8f3ec;
}

.parsing-view-button--secondary {
  background: rgba(15, 118, 110, 0.06);
  border-color: rgba(15, 118, 110, 0.2);
  color: var(--app-accent);
}

.parsing-view-button--ghost {
  background: var(--app-panel);
}

.parsing-view-button--block {
  width: 100%;
}

.parsing-view-button--large {
  padding-inline: 1.15rem;
}

.parsing-view-pill {
  justify-content: center;
  border: 1px solid rgba(31, 78, 134, 0.18);
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  background: rgba(31, 78, 134, 0.1);
  color: #1f4e86;
  font-size: 0.78rem;
  font-weight: 700;
}

.parsing-view-empty-state {
  display: grid;
  place-items: center;
  gap: 0.5rem;
  padding: 1rem;
  text-align: center;
  color: var(--app-muted);
}

.parsing-view-empty-state__icon {
  font-size: 2rem;
}

.parsing-view-spin {
  animation: parsing-view-spin 0.9s linear infinite;
}

.parsing-view-action-spacer {
  flex: 1 1 auto;
}

.parsing-view-notice,
.parsing-view-summary {
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  padding: 0.95rem 1rem;
  box-shadow: var(--app-shadow-soft);
}

.parsing-view-notice {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  background: rgba(163, 61, 45, 0.08);
  border-color: rgba(163, 61, 45, 0.24);
}

.parsing-view-notice p {
  margin: 0.25rem 0 0;
  color: var(--app-muted);
}

.parsing-view-notice button {
  border: 0;
  background: transparent;
  color: var(--app-accent);
  cursor: pointer;
  font-weight: 700;
}

.parsing-view-form,
.parsing-view-upload-grid,
.parsing-view-mode-grid {
  display: grid;
  gap: 0.9rem;
}

.parsing-view-upload-grid,
.parsing-view-mode-grid {
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
}

.parsing-view-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
  color: var(--app-ink);
  box-shadow: var(--app-shadow-soft);
  padding: 0.95rem 1rem;
  font-weight: 600;
}

.parsing-view-toggle input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--app-accent);
}

.parsing-view-field {
  display: grid;
  gap: 0.45rem;
}

.parsing-view-field > span {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  color: var(--app-muted);
}

.parsing-view-field input,
.parsing-view-field select {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
  color: var(--app-ink);
  box-shadow: var(--app-shadow-soft);
  padding: 0.85rem 0.95rem;
}

.parsing-view-field input:focus,
.parsing-view-field select:focus {
  outline: none;
  border-color: var(--app-accent);
  box-shadow: 0 0 0 4px var(--app-ring);
}

.parsing-view-field--compact {
  min-width: 11rem;
}

.parsing-view-mode-card {
  display: grid;
  gap: 0.3rem;
  border: 1px solid var(--app-border);
  border-radius: 1.15rem;
  background: var(--app-panel);
  padding: 1rem;
  cursor: pointer;
  box-shadow: var(--app-shadow-soft);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.parsing-view-mode-card input {
  position: absolute;
  opacity: 0;
}

.parsing-view-mode-card span {
  color: var(--app-ink);
  font-weight: 700;
}

.parsing-view-mode-card small {
  color: var(--app-muted);
  line-height: 1.55;
}

.parsing-view-mode-card--active {
  border-color: var(--app-accent);
  background: linear-gradient(180deg, rgba(15, 118, 110, 0.08), var(--app-panel));
  box-shadow: 0 0 0 4px var(--app-ring);
  transform: translateY(-1px);
}

.parsing-view-summary {
  background: var(--app-panel);
  line-height: 1.6;
}

.parsing-view-summary strong {
  color: var(--app-ink);
}

.parsing-view-expand-enter-active,
.parsing-view-expand-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.parsing-view-expand-enter-from,
.parsing-view-expand-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 720px) {
  .parsing-view-page-header,
  .parsing-view-panel__header {
    align-items: flex-start;
  }

  .parsing-view-selection-grid,
  .parsing-view-upload-grid,
  .parsing-view-mode-grid {
    grid-template-columns: 1fr;
  }

  .parsing-view-action-spacer {
    display: none;
  }
}

@keyframes parsing-view-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
