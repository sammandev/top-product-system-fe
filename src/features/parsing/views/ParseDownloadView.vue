<template>
    <DefaultLayout>
        <!-- Page Header -->
    <div class="parse-download-page-header mb-6">
      <div class="parse-download-page-header__copy">
        <Icon icon="mdi:file-export" class="parse-download-page-header__icon" />
                <div>
          <h1 class="parse-download-page-title">Parse & Download Format</h1>
          <p class="parse-download-page-subtitle">
                        Upload file, select data, and download in your preferred format
                    </p>
                </div>
            </div>
      <button v-if="hasPreview" type="button" class="parse-download-button parse-download-button--secondary" @click="handleReset">
        <Icon icon="mdi:refresh" />
        <span>New Upload</span>
      </button>
        </div>

        <div v-if="error" class="parse-download-notice parse-download-notice--error mb-4">
          <div>
            <strong>Parse and download failed</strong>
            <p>{{ error }}</p>
          </div>
          <button type="button" @click="error = ''">Dismiss</button>
        </div>

        <AppPanel v-if="!hasPreview" eyebrow="Step 1" title="Upload Source File" description="Keep the preview in memory, tune the ingest hints, and stage the export flow." class="mb-4">
          <template #header-aside>
            <Icon icon="mdi:file-upload" class="parse-download-panel__icon" />
          </template>

          <AppFilePicker v-model="selectedFile" label="Select CSV or Excel file" accept=".csv,.xlsx,.xls"
            helper-text="CSV and Excel previews stay in memory for this parse-and-download workflow."
            :disabled="uploading" @select="handleFileChange" />

          <div class="parse-download-upload-options mt-4">
            <label class="parse-download-toggle">
              <input v-model="uploadOptions.hasHeader" type="checkbox">
              <span>First row is header</span>
            </label>
            <label class="parse-download-field">
              <span>Delimiter</span>
              <input v-model="uploadOptions.delimiter" placeholder="Auto-detect" type="text">
            </label>
          </div>

          <AppProgress v-if="uploading" :value="uploadProgress" class="mt-4" aria-live="polite" />

          <button type="button" class="parse-download-button parse-download-button--primary parse-download-button--block parse-download-button--large mt-4"
            :disabled="!selectedFile || uploading" @click="handleUpload">
            <Icon :icon="uploading ? 'mdi:loading' : 'mdi:upload'" :class="{ 'parse-download-spin': uploading }" />
            <span>{{ uploading ? 'Uploading...' : 'Upload and Preview' }}</span>
          </button>
        </AppPanel>

        <AppPanel v-if="hasPreview" eyebrow="Step 2" title="Inspect Preview"
          :description="`${columns.length} columns · ${previewRows.length} preview rows`" splitHeader class="mb-4">
          <template #header-aside>
            <span class="parse-download-pill parse-download-pill--primary">
              {{ preview?.filename }}
            </span>
          </template>

          <AppDataGrid :columns="previewGridColumns" :rows="previewRowsWithNumbers" :loading="uploading"
            paginator :rowsPerPage="20" scrollHeight="300px">
            <template #empty>
              <div class="parse-download-empty-state">
                <Icon icon="mdi:table-off" class="parse-download-empty-state__icon" />
                <p>No preview data available</p>
              </div>
            </template>
          </AppDataGrid>
        </AppPanel>

        <div v-if="hasPreview" class="parse-download-layout">
            <AppPanel eyebrow="Step 3" title="Configure Selection" description="Trim the payload, exclude noisy rows, and export from the current preview snapshot.">
                    <template #header-aside>
                      <Icon icon="mdi:filter-variant" class="parse-download-panel__icon" />
                    </template>

                    <div>
                        <div class="parse-download-section mb-4">
                          <div class="parse-download-section__title">Selection Mode</div>
                          <div class="parse-download-choice-grid">
                            <label v-for="option in modeOptions" :key="option.value" class="parse-download-choice"
                              :class="{ 'parse-download-choice--active': mode === option.value }">
                              <input v-model="mode" :value="option.value" type="radio">
                              <span>{{ option.label }}</span>
                              <small>{{ option.description }}</small>
                            </label>
                          </div>
                        </div>

                        <div class="parse-download-section mb-4">
                          <div class="parse-download-section__title">Download Format</div>
                          <div class="parse-download-choice-grid">
                            <label v-for="option in formatOptions" :key="option.value" class="parse-download-choice"
                              :class="{ 'parse-download-choice--active': format === option.value }">
                              <input v-model="format" :value="option.value" type="radio">
                              <span>{{ option.label }}</span>
                              <small>{{ option.description }}</small>
                            </label>
                          </div>
                        </div>
                        <div class="parse-download-divider" />

                        <!-- Column Selection -->
                        <div v-if="mode === 'columns' || mode === 'both'" class="parse-download-section mb-4">
                          <div class="parse-download-section-heading mb-3">
                                <Icon icon="mdi:table-column" />
                                Column Selection
                            </div>

                          <div class="parse-download-toolbar mb-3">
                            <span class="parse-download-toolbar__meta">{{ selectedColumns.length }} selected</span>
                            <button class="parse-download-link" type="button" @click="selectAllColumns">Select all</button>
                            <button class="parse-download-link" type="button" @click="clearSelectedColumns">Clear selected</button>
                            <button class="parse-download-link" type="button" @click="clearExcludedColumns">Clear excluded</button>
                          </div>

                          <div class="parse-download-select-grid">
                            <label class="parse-download-field">
                              <span>Include Columns</span>
                              <AppMultiSelect v-model="selectedColumns" :options="columnSelectOptions" placeholder="Include all columns" />
                              <small class="parse-download-field__hint">Leave empty to include all columns.</small>
                            </label>

                            <label class="parse-download-field">
                              <span>Exclude Columns</span>
                              <AppMultiSelect v-model="excludeColumns" :options="columnSelectOptions" placeholder="No excluded columns" />
                              <small class="parse-download-field__hint">Optional removal list applied after the main selection.</small>
                            </label>
                          </div>
                        </div>

                        <!-- Row Selection -->
                        <div v-if="mode === 'rows' || mode === 'both'" class="parse-download-section mb-4">
                          <div class="parse-download-section-heading mb-3">
                            <Icon icon="mdi:table-row" />
                                Row Selection
                            </div>

                          <div class="parse-download-select-grid parse-download-select-grid--single">
                            <label class="parse-download-field">
                              <span>Selected Row Indices</span>
                              <input v-model="selectedRowsText" placeholder="0, 2, 4" type="text">
                              <small class="parse-download-field__hint">Comma-separated and zero-indexed.</small>
                            </label>

                            <label class="parse-download-field">
                              <span>Exclude Row Indices</span>
                              <input v-model="excludeRowsText" placeholder="1, 3" type="text">
                              <small class="parse-download-field__hint">Optional exclusions applied after selection.</small>
                            </label>
                          </div>
                        </div>

                        <div class="parse-download-summary-card">
                          <div>
                            <span>Columns in scope</span>
                            <strong>{{ mode === 'rows' ? columns.length : selectedColumns.length || columns.length }}</strong>
                          </div>
                          <div>
                            <span>Rows selected</span>
                            <strong>{{ selectedRowCount || 'All' }}</strong>
                          </div>
                          <div>
                            <span>Rows excluded</span>
                            <strong>{{ excludedRowCount || 0 }}</strong>
                          </div>
                        </div>

                        <div class="parse-download-divider" />

                        <!-- Action Buttons -->
            <button type="button" class="parse-download-button parse-download-button--primary parse-download-button--block parse-download-button--large" :disabled="!canProcess"
              @click="handleDownload">
              <Icon :icon="processing ? 'mdi:loading' : 'mdi:download'" :class="{ 'parse-download-spin': processing }" />
              <span>{{ processing ? 'Processing...' : `Parse & Download ${format.toUpperCase()}` }}</span>
            </button>

            <AppProgress v-if="processing" :value="progress" class="mt-4" aria-live="polite" />
          </div>
      </AppPanel>

            <!-- Right Panel: Instructions -->
      <section class="parse-download-layout__aside">
                <AppPanel eyebrow="Playbook" title="Recommended Flow" description="Shape the export before it leaves preview." tone="cool" class="parse-download-playbook-panel">
                <div class="parse-download-playbook">
                  <div class="parse-download-playbook__hero">
                    <span>Workflow Brief</span>
                    <h2>Shape the export before it leaves preview.</h2>
                    <p>Keep the flow lean: choose scope, trim columns or rows only when needed, then export once.</p>
                  </div>

                  <div class="parse-download-playbook__steps">
                    <article class="parse-download-step parse-download-step--done">
                      <strong>1. Preview ready</strong>
                      <p>{{ preview?.filename }} is loaded with {{ columns.length }} columns.</p>
                    </article>
                    <article class="parse-download-step">
                      <strong>2. Shape the payload</strong>
                      <p>{{ mode === 'both' ? 'Columns and rows are both active.' : `Only ${mode} selection is active.` }}</p>
                    </article>
                    <article class="parse-download-step">
                      <strong>3. Export once</strong>
                      <p>{{ format.toUpperCase() }} output will be generated from the current selection.</p>
                    </article>
                  </div>

                  <div class="parse-download-format-cards">
                    <article v-for="option in formatOptions" :key="`guide-${option.value}`" class="parse-download-format-card"
                      :class="{ 'parse-download-format-card--active': format === option.value }">
                      <span>{{ option.label }}</span>
                      <p>{{ option.description }}</p>
                    </article>
                  </div>

                  <div class="parse-download-note">
                    <strong>Fast-path tip</strong>
                    <p>Leave row inputs empty to export every previewed row, and keep all columns selected when the source schema is already clean.</p>
                  </div>
                </div>
                </AppPanel>
            </section>
        </div>

        <AppDialog v-model="downloadCompleted" title="Parsed file downloaded"
          description="The export has been generated and downloaded to your machine.">
          <div class="parse-download-summary">
            <div>
              <span>Filename</span>
              <strong>{{ lastDownloadedFilename }}</strong>
            </div>
            <div>
              <span>Selection mode</span>
              <strong>{{ mode.toUpperCase() }}</strong>
            </div>
            <div>
              <span>Output format</span>
              <strong>{{ format.toUpperCase() }}</strong>
            </div>
            <div>
              <span>Columns selected</span>
              <strong>{{ selectedColumns.length || columns.length }}</strong>
            </div>
          </div>
          <template #footer>
            <div class="parse-download-dialog-footer">
              <button type="button" class="parse-download-button parse-download-button--ghost parse-download-button--small" @click="downloadCompleted = false">Close</button>
            </div>
          </template>
        </AppDialog>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import type { UploadPreviewResponse } from '@/core/types/api.types'
import {
  AppDataGrid,
  AppDialog,
  AppFilePicker,
  AppMultiSelect,
  AppPanel,
  AppProgress,
} from '@/shared'
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
const lastDownloadedFilename = ref('')

const modeOptions = [
  { value: 'columns', label: 'Columns Only', description: 'Keep every row and trim the schema.' },
  { value: 'rows', label: 'Rows Only', description: 'Keep the schema and filter row indices.' },
  { value: 'both', label: 'Both', description: 'Control columns and rows in a single pass.' },
] as const

const formatOptions = [
  { value: 'csv', label: 'CSV', description: 'Lightweight flat export for broad compatibility.' },
  { value: 'xlsx', label: 'XLSX', description: 'Spreadsheet output with Excel-native formatting.' },
  {
    value: 'both',
    label: 'Both (ZIP)',
    description: 'Bundle CSV and XLSX together for downstream users.',
  },
] as const

// Computed
const hasPreview = computed(() => preview.value !== null)

const columns = computed(() => preview.value?.columns || [])
const columnSelectOptions = computed(() =>
  columns.value.map((column) => ({
    label: column,
    value: column,
  })),
)

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

const previewGridColumns = computed(() =>
  previewHeaders.value.map((header) => ({
    key: String(header.key),
    field: String(header.key),
    header: String(header.title),
    sortable: Boolean(header.sortable),
    style: 'width' in header && header.width ? { width: `${header.width}px` } : undefined,
  })),
)

const canProcess = computed(() => {
  if (!hasPreview.value || processing.value) return false

  if (mode.value === 'columns' || mode.value === 'both') {
    return selectedColumns.value.length > 0
  }

  return true
})

const selectedRowCount = computed(() => parseRowIndices(selectedRowsText.value).length)
const excludedRowCount = computed(() => parseRowIndices(excludeRowsText.value).length)

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

function selectAllColumns() {
  selectedColumns.value = [...columns.value]
}

function clearSelectedColumns() {
  selectedColumns.value = []
}

function clearExcludedColumns() {
  excludeColumns.value = []
}

async function handleUpload() {
  if (!selectedFile.value) return

  const file = Array.isArray(selectedFile.value) ? selectedFile.value[0] : selectedFile.value
  if (!file) return

  uploading.value = true
  uploadProgress.value = 0
  error.value = ''
  const progressInterval = startProgressTicker(uploadProgress)

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('has_header', uploadOptions.value.hasHeader.toString())
    if (uploadOptions.value.delimiter) {
      formData.append('delimiter', uploadOptions.value.delimiter)
    }
    formData.append('persist', 'false') // Don't persist to disk for this workflow

    const response = await parsingApi.uploadPreview(formData)
    preview.value = response

    uploadProgress.value = 100

    // Auto-select all columns by default
    selectedColumns.value = [...columns.value]
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err) || getErrorMessage(err) || 'Upload failed'
  } finally {
    clearInterval(progressInterval)
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
  const progressInterval = startProgressTicker(progress)

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

    const blob = await parsingApi.parseDownloadFormat(formData)

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

    lastDownloadedFilename.value = filename
    downloadCompleted.value = true
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err) || getErrorMessage(err) || 'Download failed'
  } finally {
    clearInterval(progressInterval)
    processing.value = false
  }
}

function startProgressTicker(target: { value: number }) {
  return window.setInterval(() => {
    if (target.value < 90) {
      target.value += 10
    }
  }, 100)
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
  lastDownloadedFilename.value = ''
  uploadOptions.value = {
    hasHeader: true,
    delimiter: '',
  }
}
</script>

<style scoped>
.parse-download-page-header,
.parse-download-page-header__copy,
.parse-download-button,
.parse-download-pill,
.parse-download-section-heading {
  display: inline-flex;
  align-items: center;
}

.parse-download-page-header {
  justify-content: space-between;
  gap: 1rem;
}

.parse-download-page-header__copy {
  gap: 0.9rem;
}

.parse-download-page-header__icon {
  font-size: 2.2rem;
  color: #1f4e86;
}

.parse-download-page-title {
  margin: 0 0 0.5rem;
  font-size: clamp(2rem, 3vw, 2.5rem);
  line-height: 1.08;
}

.parse-download-page-subtitle {
  margin: 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.parse-download-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(20rem, 0.92fr);
  gap: 1rem;
}

.parse-download-layout__aside {
  min-height: 100%;
}

.parse-download-panel__icon {
  font-size: 1.75rem;
  color: var(--app-ink);
}

.parse-download-playbook,
.parse-download-note,
.parse-download-notice {
  border: 1px solid var(--app-border);
  border-radius: 1.25rem;
  background: var(--app-panel);
  box-shadow: var(--app-shadow-soft);
}

.parse-download-notice {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  padding: 0.95rem 1rem;
}

.parse-download-notice p {
  margin: 0.25rem 0 0;
  color: var(--app-muted);
}

.parse-download-notice--error {
  background: rgba(163, 61, 45, 0.08);
  border-color: rgba(163, 61, 45, 0.24);
}

.parse-download-notice button {
  border: 0;
  background: transparent;
  color: var(--app-accent);
  cursor: pointer;
  font-weight: 700;
}

.parse-download-summary {
    display: grid;
    gap: 0.75rem;
}

.parse-download-summary > div {
    display: grid;
    gap: 0.2rem;
}

.parse-download-summary span {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: none;
    color: var(--app-muted);
}

.parse-download-summary strong {
    color: var(--app-ink);
}

.parse-download-button {
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

.parse-download-button:disabled {
  cursor: not-allowed;
  opacity: 0.64;
}

.parse-download-button--primary {
  background: #1f4e86;
  border-color: #1f4e86;
  color: #f8f3ec;
}

.parse-download-button--secondary {
  background: rgba(15, 118, 110, 0.06);
  border-color: rgba(15, 118, 110, 0.2);
  color: var(--app-accent);
}

.parse-download-button--ghost {
  background: var(--app-panel);
}

.parse-download-button--block {
  width: 100%;
}

.parse-download-button--large {
  padding-inline: 1.15rem;
}

.parse-download-button--small {
  padding: 0.62rem 0.85rem;
  font-size: 0.85rem;
}

.parse-download-pill {
  justify-content: center;
  border: 1px solid rgba(31, 78, 134, 0.18);
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  background: rgba(31, 78, 134, 0.1);
  color: #1f4e86;
  font-size: 0.78rem;
  font-weight: 700;
}

.parse-download-empty-state {
  display: grid;
  place-items: center;
  gap: 0.5rem;
  padding: 1rem;
  text-align: center;
  color: var(--app-muted);
}

.parse-download-empty-state__icon {
  font-size: 2rem;
}

.parse-download-section-heading {
  gap: 0.45rem;
  color: var(--app-ink);
  font-weight: 700;
}

.parse-download-divider {
  height: 1px;
  margin: 1rem 0;
  background: rgba(15, 118, 110, 0.08);
}

.parse-download-spin {
  animation: parse-download-spin 0.9s linear infinite;
}

.parse-download-upload-options,
.parse-download-select-grid,
.parse-download-choice-grid,
.parse-download-playbook__steps,
.parse-download-format-cards {
  display: grid;
  gap: 0.9rem;
}

.parse-download-upload-options,
.parse-download-select-grid,
.parse-download-choice-grid {
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
}

.parse-download-select-grid--single {
  grid-template-columns: 1fr;
}

.parse-download-field {
  display: grid;
  gap: 0.45rem;
}

.parse-download-field > span,
.parse-download-section__title,
.parse-download-summary-card span,
.parse-download-playbook__hero span,
.parse-download-format-card span {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  color: var(--app-muted);
}

.parse-download-field input,
.parse-download-multi-select {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
  color: var(--app-ink);
  box-shadow: var(--app-shadow-soft);
  padding: 0.85rem 0.95rem;
}

.parse-download-field input:focus,
.parse-download-multi-select:focus {
  outline: none;
  border-color: var(--app-accent);
  box-shadow: 0 0 0 4px var(--app-ring);
}

.parse-download-field__hint {
  color: var(--app-muted);
  font-size: 0.82rem;
}

.parse-download-toggle {
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

.parse-download-toggle input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--app-accent);
}

.parse-download-choice {
  display: grid;
  gap: 0.3rem;
  border: 1px solid var(--app-border);
  border-radius: 1.15rem;
  background: var(--app-panel);
  padding: 1rem;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.parse-download-choice input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.parse-download-choice span {
  color: var(--app-ink);
  font-weight: 700;
}

.parse-download-choice small {
  color: var(--app-muted);
  line-height: 1.5;
}

.parse-download-choice--active {
  border-color: var(--app-accent);
  background: linear-gradient(180deg, rgba(15, 118, 110, 0.08), var(--app-panel));
  box-shadow: 0 0 0 4px var(--app-ring);
  transform: translateY(-1px);
}

.parse-download-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  align-items: center;
}

.parse-download-toolbar__meta {
  color: var(--app-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.parse-download-link {
  border: 0;
  background: transparent;
  color: var(--app-accent);
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 700;
}

.parse-download-summary-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.9rem;
  padding: 1rem;
}

.parse-download-summary-card > div {
  display: grid;
  gap: 0.25rem;
}

.parse-download-summary-card strong,
.parse-download-playbook__hero h2 {
  color: var(--app-ink);
}

.parse-download-playbook {
  display: grid;
  gap: 1rem;
}

.parse-download-playbook-panel {
  min-height: 100%;
}

.parse-download-playbook__hero {
  display: grid;
  gap: 0.45rem;
}

.parse-download-playbook__hero h2 {
  margin: 0;
  font-family: var(--app-display);
  font-size: clamp(1.35rem, 1.8vw, 1.9rem);
}

.parse-download-playbook__hero p,
.parse-download-step p,
.parse-download-format-card p,
.parse-download-note p {
  margin: 0;
  color: var(--app-muted);
  line-height: 1.6;
}

.parse-download-step,
.parse-download-format-card,
.parse-download-note {
  border-radius: 1rem;
  padding: 0.95rem 1rem;
}

.parse-download-step {
  background: rgba(255, 255, 255, 0.64);
  border: 1px solid var(--app-border);
}

.parse-download-step--done {
  background: linear-gradient(180deg, rgba(15, 118, 110, 0.1), rgba(255, 255, 255, 0.84));
}

.parse-download-step strong,
.parse-download-note strong {
  display: block;
  margin-bottom: 0.3rem;
  color: var(--app-ink);
}

.parse-download-format-card {
  border: 1px solid var(--app-border);
  background: rgba(255, 255, 255, 0.65);
}

.parse-download-format-card--active {
  border-color: var(--app-accent);
  background: rgba(15, 118, 110, 0.06);
}

.parse-download-note {
  background: rgba(245, 168, 71, 0.1);
}

.parse-download-dialog-footer {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 960px) {
  .parse-download-page-header,
  .parse-download-page-header__copy {
    align-items: flex-start;
  }

  .parse-download-layout,
  .parse-download-choice-grid,
  .parse-download-upload-options,
  .parse-download-select-grid,
  .parse-download-summary-card {
    grid-template-columns: 1fr;
  }
}

@keyframes parse-download-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
