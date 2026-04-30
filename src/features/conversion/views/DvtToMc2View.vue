<template>
    <DefaultLayout>
        <div class="dvt-converter-header mb-6">
            <div class="dvt-converter-header__copy">
                <div class="dvt-converter-header__icon">
                    <Icon icon="mdi:file-swap" class="dvt-converter-header__icon-glyph" />
                </div>
                <div>
                    <h1 class="dvt-converter-header__title">DVT to MC2 Converter</h1>
                    <p class="dvt-converter-header__subtitle">
                        Convert one or many DVT files into MC2 exports with lightweight preview checks before download.
                    </p>
                </div>
            </div>
        </div>

        <div v-if="showError" class="dvt-converter-notice dvt-converter-notice--error mb-4">
            <div>
                <strong>Conversion failed</strong>
                <p>{{ errorMessage }}</p>
            </div>
            <button type="button" @click="showError = false">Dismiss</button>
        </div>

        <div class="dvt-converter-layout">
            <div class="dvt-converter-layout__main">
                <AppPanel eyebrow="Upload" title="Batch Source Files" description="Load one or many DVT CSV or XLSX files and validate them before conversion." class="mb-4">
                    <template #header-aside>
                        <span class="dvt-converter-pill dvt-converter-pill--info">Multiple files supported</span>
                    </template>

                    <AppFilePicker :modelValue="dvtFiles" accept=".csv,.xlsx" label="Upload DVT file(s)"
                        helper-text="The converter accepts multiple DVT files and will generate a batch of MC2 outputs."
                        :invalid="Boolean(dvtFilesError)" :invalidMessage="dvtFilesError" multiple
                        @update:modelValue="handleDvtFilesSelection" />

                    <div v-if="dvtFiles.length > 0" class="dvt-converter-file-summary">
                        <div>
                            <strong>{{ dvtFiles.length }} file(s) selected</strong>
                            <p>{{ formatTotalSize(dvtFiles) }}</p>
                        </div>
                    </div>

                    <button type="button" class="dvt-converter-button dvt-converter-button--primary dvt-converter-button--block dvt-converter-button--large mt-4" :disabled="!canConvert"
                        @click="handleConvert">
                        <Icon :icon="converting ? 'mdi:loading' : 'mdi:play-circle'" :class="{ 'dvt-converter-spin': converting }" />
                        <span>{{ dvtFiles.length > 1 ? `Convert ${dvtFiles.length} Files` : 'Convert to MC2' }}</span>
                    </button>
                </AppPanel>

                <AppPanel v-if="filePreviews.length > 0 && !converting" eyebrow="Preview" title="Detected File Traits" compactHeader>

                    <div class="dvt-converter-preview-list">
                        <article v-for="(preview, index) in filePreviews" :key="index" class="dvt-converter-preview-item">
                            <div>
                                <strong>{{ preview.filename }}</strong>
                                <p v-if="preview.serialNumber">SN: {{ preview.serialNumber }}</p>
                                <p v-else>No serial number detected.</p>
                            </div>
                            <div class="dvt-converter-preview-bands">
                                <span v-for="band in preview.detectedBands" :key="band" class="dvt-converter-pill dvt-converter-pill--primary dvt-converter-pill--small">
                                    {{ band }}
                                </span>
                                <span v-if="preview.detectedBands.length === 0">No bands detected</span>
                            </div>
                        </article>
                    </div>
                </AppPanel>
            </div>

            <div class="dvt-converter-layout__side">
                <AppPanel v-if="converting" eyebrow="Progress" title="Converting Files" compactHeader>

                    <div class="dvt-converter-progress-list">
                        <article v-for="(progressItem, index) in conversionProgress" :key="index" class="dvt-converter-progress-item">
                            <div class="dvt-converter-progress-item__copy">
                                <strong>{{ progressItem.filename }}</strong>
                                <p>{{ progressItem.progress }}% complete</p>
                            </div>
                            <div class="dvt-converter-progress-track">
                                <div class="dvt-converter-progress-bar" :style="{ width: `${Math.max(progressItem.progress, 8)}%` }" />
                            </div>
                        </article>
                    </div>
                </AppPanel>

                <AppPanel v-else-if="conversionResults.length > 0" eyebrow="Results" title="Conversion Complete"
                    :description="`${successCount} of ${conversionResults.length} file(s) converted successfully.`" tone="success">

                    <div class="dvt-converter-notice dvt-converter-notice--success">
                        <div>
                            <strong>Downloads generated</strong>
                            <p v-if="successCount > 0">MC2 files were downloaded automatically after conversion.</p>
                            <p v-else>No successful conversions were produced in this run.</p>
                        </div>
                    </div>

                    <div class="dvt-converter-result-list">
                        <article v-for="(result, index) in conversionResults" :key="index" class="dvt-converter-result-item"
                            :class="{ 'dvt-converter-result-item--success': result.success, 'dvt-converter-result-item--error': !result.success }">
                            <strong>{{ result.originalName }}</strong>
                            <p v-if="result.success">→ {{ result.filename }}</p>
                            <p v-else>{{ result.error }}</p>
                        </article>
                    </div>

                    <div class="dvt-converter-actions">
                        <button type="button" class="dvt-converter-button dvt-converter-button--ghost" @click="resetForm">
                            <Icon icon="mdi:refresh" />
                            <span>Convert More Files</span>
                        </button>
                        <button v-if="successCount > 0" type="button" class="dvt-converter-button dvt-converter-button--success-ghost"
                            @click="downloadAllResults">
                            <Icon icon="mdi:download-multiple" />
                            <span>Re-download All</span>
                        </button>
                    </div>
                </AppPanel>

                <AppPanel v-else eyebrow="Playbook" title="Recommended Flow"
                    description="Use previews to catch malformed files before you trigger the batch conversion." tone="cool">

                    <ol class="dvt-converter-steps">
                        <li>
                            <strong>Select one or more DVT files.</strong>
                            <span>CSV and XLSX files are both accepted.</span>
                        </li>
                        <li>
                            <strong>Review the preview hints.</strong>
                            <span>Check detected serial numbers and band tags before conversion.</span>
                        </li>
                        <li>
                            <strong>Run the converter once.</strong>
                            <span>The route downloads MC2 outputs automatically for successful conversions.</span>
                        </li>
                    </ol>

                    <div class="dvt-converter-detail-cards">
                        <article class="dvt-converter-detail-card">
                            <span>Input</span>
                            <p>DVT CSV/XLSX with the standard test-data structure.</p>
                        </article>
                        <article class="dvt-converter-detail-card">
                            <span>Output</span>
                            <p>MC2 CSV with header rows, USL/LSL rows, and measurement values.</p>
                        </article>
                        <article class="dvt-converter-detail-card">
                            <span>Batch Mode</span>
                            <p>Multiple files can be converted and downloaded in a single run.</p>
                        </article>
                    </div>
                </AppPanel>
            </div>
        </div>

    </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { AppFilePicker, AppPanel } from '@/shared'
import { useNotification } from '@/shared/composables/useNotification'
import {
  type BatchConvertResult,
  convertDvtToMc2Batch,
  downloadMultipleMc2Results,
  parseDvtFilePreview,
  validateDvtFile,
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
const { showError: showErrorNotification } = useNotification()

// Computed
const canConvert = computed(() => {
  return dvtFiles.value.length > 0 && !converting.value && !dvtFilesError.value
})

const successCount = computed(() => {
  return conversionResults.value.filter((r) => r.success).length
})

// Methods
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`
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
            ...preview,
          }
        } catch (error) {
          console.error(`Preview failed for ${file.name}:`, error)
          return {
            filename: file.name,
            serialNumber: undefined,
            detectedBands: [],
            rowCount: 0,
          }
        }
      }),
    )
    filePreviews.value = previews
  } catch (error) {
    console.error('Preview generation failed:', error)
  }
}

function handleDvtFilesSelection(value: File | File[] | null) {
  dvtFiles.value = Array.isArray(value) ? value : value ? [value] : []
  void handleDvtFilesChange()
}

async function handleConvert() {
  if (dvtFiles.value.length === 0) return

  converting.value = true
  conversionProgress.value = dvtFiles.value.map((file) => ({
    filename: file.name,
    progress: 0,
  }))
  conversionResults.value = []
  showError.value = false

  try {
    const results = await convertDvtToMc2Batch(dvtFiles.value, (fileIndex, _fileName, progress) => {
      if (conversionProgress.value[fileIndex]) {
        conversionProgress.value[fileIndex].progress = progress
      }
    })

    conversionResults.value = results

    // Auto-download successful conversions
    downloadMultipleMc2Results(results.filter((r) => r.success))

    // Show error if some conversions failed
    const failedCount = results.filter((r) => !r.success).length
    if (failedCount > 0) {
      errorMessage.value = `${failedCount} file(s) failed to convert. See results for details.`
      showError.value = true
      showErrorNotification(errorMessage.value)
    }
  } catch (error) {
    console.error('Batch conversion failed:', error)
    errorMessage.value =
      error instanceof Error ? error.message : 'Conversion failed. Please try again.'
    showError.value = true
    showErrorNotification(errorMessage.value)
  } finally {
    converting.value = false
  }
}

function downloadAllResults() {
  if (conversionResults.value.length > 0) {
    downloadMultipleMc2Results(conversionResults.value.filter((r) => r.success))
  }
}

function resetForm() {
  dvtFiles.value = []
  dvtFilesError.value = ''
  conversionProgress.value = []
  conversionResults.value = []
  filePreviews.value = []
  showError.value = false
  errorMessage.value = ''
}
</script>

<style scoped>
.dvt-converter-header__copy {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.dvt-converter-header__icon {
    display: grid;
    place-items: center;
    width: 3.4rem;
    height: 3.4rem;
    border-radius: 1.1rem;
    background: linear-gradient(135deg, rgba(15, 118, 110, 0.14), rgba(45, 212, 191, 0.16));
    color: var(--app-accent);
    box-shadow: var(--app-shadow-soft);
}

.dvt-converter-header__icon-glyph {
    font-size: 2rem;
}

.dvt-converter-header__title {
    margin: 0 0 0.5rem;
    font-size: clamp(2rem, 3vw, 2.5rem);
    line-height: 1.08;
}

.dvt-converter-header__subtitle {
    margin: 0;
    color: var(--app-muted);
    line-height: 1.55;
}

.dvt-converter-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(20rem, 0.92fr);
    gap: 1rem;
}

.dvt-converter-layout__main,
.dvt-converter-layout__side {
    display: grid;
    gap: 1rem;
}

.dvt-converter-notice,
.dvt-converter-file-summary {
    border: 1px solid var(--app-border);
    border-radius: 1.25rem;
    background: var(--app-panel);
    box-shadow: var(--app-shadow-soft);
}

.dvt-converter-detail-card span {
    margin: 0;
    color: var(--app-accent);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: none;
}

.dvt-converter-file-summary p,
.dvt-converter-preview-item p,
.dvt-converter-progress-item p,
.dvt-converter-result-item p,
.dvt-converter-detail-card p,
.dvt-converter-steps span,
.dvt-converter-notice p {
    margin: 0.25rem 0 0;
    color: var(--app-muted);
    line-height: 1.55;
}

.dvt-converter-notice {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    padding: 0.95rem 1rem;
}

.dvt-converter-notice--error {
    background: rgba(163, 61, 45, 0.08);
    border-color: rgba(163, 61, 45, 0.24);
}

.dvt-converter-notice--success {
    background: rgba(15, 118, 110, 0.06);
    border-color: rgba(15, 118, 110, 0.2);
}

.dvt-converter-notice button {
    border: 0;
    background: transparent;
    color: var(--app-accent);
    cursor: pointer;
    font-weight: 700;
}

.dvt-converter-file-summary {
    padding: 0.95rem 1rem;
}

.dvt-converter-file-summary strong,
.dvt-converter-preview-item strong,
.dvt-converter-progress-item strong,
.dvt-converter-result-item strong,
.dvt-converter-steps strong {
    color: var(--app-ink);
}

.dvt-converter-preview-list,
.dvt-converter-progress-list,
.dvt-converter-result-list,
.dvt-converter-detail-cards {
    display: grid;
    gap: 0.85rem;
}

.dvt-converter-preview-item,
.dvt-converter-progress-item,
.dvt-converter-result-item,
.dvt-converter-detail-card {
    border: 1px solid var(--app-border);
    border-radius: 1rem;
    background: var(--app-panel);
    padding: 0.95rem 1rem;
}

.dvt-converter-preview-item {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
}

.dvt-converter-preview-bands {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    justify-content: flex-end;
}

.dvt-converter-preview-bands span {
    color: var(--app-muted);
    font-size: 0.82rem;
}

.dvt-converter-progress-item {
    display: grid;
    gap: 0.6rem;
}

.dvt-converter-progress-track {
    position: relative;
    overflow: hidden;
    height: 0.5rem;
    border-radius: 999px;
    background: rgba(15, 118, 110, 0.1);
}

.dvt-converter-progress-bar {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--app-accent), rgba(45, 212, 191, 0.8));
    transition: width 0.2s ease;
}

.dvt-converter-result-item--success {
    border-color: rgba(15, 118, 110, 0.18);
}

.dvt-converter-result-item--error {
    border-color: rgba(163, 61, 45, 0.24);
}

.dvt-converter-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.dvt-converter-button,
.dvt-converter-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
}

.dvt-converter-button {
    border-radius: 999px;
    border: 1px solid var(--app-border);
    padding: 0.78rem 1rem;
    cursor: pointer;
    font-weight: 700;
    background: var(--app-panel);
    color: var(--app-ink);
}

.dvt-converter-button:disabled {
    cursor: not-allowed;
    opacity: 0.64;
}

.dvt-converter-button--primary {
    background: #1f4e86;
    border-color: #1f4e86;
    color: #f8f3ec;
}

.dvt-converter-button--ghost {
    background: var(--app-panel);
    color: var(--app-ink);
}

.dvt-converter-button--success-ghost {
    background: rgba(15, 118, 110, 0.06);
    border-color: rgba(15, 118, 110, 0.2);
    color: var(--app-accent);
}

.dvt-converter-button--block {
    width: 100%;
}

.dvt-converter-button--large {
    padding-inline: 1.15rem;
}

.dvt-converter-spin {
    animation: dvt-converter-spin 0.9s linear infinite;
}

.dvt-converter-pill {
    border-radius: 999px;
    padding: 0.32rem 0.75rem;
    font-size: 0.78rem;
    font-weight: 700;
}

.dvt-converter-pill--info {
    background: rgba(20, 113, 153, 0.12);
    color: #0f6c92;
}

.dvt-converter-pill--primary {
    background: rgba(40, 96, 163, 0.12);
    color: #1f4e86;
}

.dvt-converter-pill--small {
    padding: 0.22rem 0.6rem;
    font-size: 0.72rem;
}

.dvt-converter-steps {
    display: grid;
    gap: 0.9rem;
    padding-left: 1.25rem;
    margin: 0;
}

.dvt-converter-detail-card p {
    margin-top: 0.35rem;
}

@media (max-width: 960px) {
    .dvt-converter-layout {
        grid-template-columns: 1fr;
    }

    .dvt-converter-preview-item {
        flex-direction: column;
    }

    .dvt-converter-preview-bands {
        justify-content: flex-start;
    }
}

@keyframes dvt-converter-spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
</style>
