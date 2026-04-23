<template>
    <DefaultLayout>
        <div class="analyze-view-header mb-6">
            <div class="analyze-view-header__copy">
                <div class="analyze-view-header__icon">
                    <Icon icon="mdi:file-chart" class="analyze-view-header__icon-glyph" />
                </div>
                <div>
                    <h1 class="analyze-view-header__title">MasterControl Analyze</h1>
                    <p class="analyze-view-header__subtitle">
                        Analyze multi-DUT MC2 data with custom specifications and download the compiled workbook.
                    </p>
                </div>
            </div>
        </div>

        <div v-if="analysisError" class="analyze-view-notice analyze-view-notice--error mb-4">
            <div>
                <strong>Analysis failed</strong>
                <p>{{ analysisError }}</p>
            </div>
            <button type="button" @click="analysisError = ''">Dismiss</button>
        </div>

        <div class="analyze-view-layout">
            <div class="analyze-view-layout__main">
                <AppPanel eyebrow="Upload" title="Source and Specification" description="Load the MC2 dataset, attach or build the spec file, then run the compiled workbook export." class="mb-4">
                    <template #header-aside>
                        <Icon icon="mdi:file-upload" class="analyze-view-panel__icon" />
                    </template>

                    <section class="analyze-view-section">
                        <div class="analyze-view-section__header">
                            <div>
                                <strong>MC2 Data File</strong>
                                <p>CSV or XLSX source containing the multi-DUT measurements.</p>
                            </div>
                            <button type="button" class="analyze-view-button analyze-view-button--info-ghost analyze-view-button--small" @click="downloadMc2Template">
                                <Icon icon="mdi:download" />
                                <span>Download Template</span>
                            </button>
                        </div>

                        <AppFilePicker :modelValue="mc2FileActual" accept=".csv,.xlsx" label="Upload MC2 file"
                            helper-text="Use the raw MC2 workbook or CSV that should be analyzed."
                            :invalid="Boolean(mc2FileError)" :invalidMessage="mc2FileError"
                            @update:modelValue="handleMc2FileSelection" />

                        <div v-if="mc2FileActual" class="analyze-view-file-note">
                            <strong>{{ mc2FileActual.name }}</strong>
                            <p>{{ formatFileSize(mc2FileActual.size) }}</p>
                        </div>
                    </section>

                    <section class="analyze-view-section">
                        <div class="analyze-view-section__header">
                            <div>
                                <strong>Spec File</strong>
                                <p>JSON or INI limits used to evaluate pass, margin, and fail states.</p>
                            </div>
                            <div class="analyze-view-section__actions">
                                <button type="button" class="analyze-view-button analyze-view-button--success-ghost analyze-view-button--small" @click="openSpecBuilder">
                                    <Icon icon="mdi:wrench" />
                                    <span>Build Spec</span>
                                </button>
                                <button type="button" class="analyze-view-button analyze-view-button--info-ghost analyze-view-button--small" @click="downloadSpecTemplate">
                                    <Icon icon="mdi:download" />
                                    <span>Download Template</span>
                                </button>
                            </div>
                        </div>

                        <AppFilePicker :modelValue="specFileActual" accept=".json,.ini" label="Upload spec file"
                            helper-text="Attach a JSON or INI spec, or open the builder to generate one."
                            :invalid="Boolean(specFileError)" :invalidMessage="specFileError"
                            @update:modelValue="handleSpecFileSelection" />

                        <div v-if="specFileActual" class="analyze-view-file-note analyze-view-file-note--accent">
                            <strong>{{ specFileActual.name }}</strong>
                            <p>{{ formatFileSize(specFileActual.size) }}</p>
                        </div>
                    </section>

                    <button type="button" class="analyze-view-button analyze-view-button--primary analyze-view-button--block analyze-view-button--large" :disabled="!canAnalyze" @click="handleAnalyze">
                        <Icon :icon="analyzing ? 'mdi:loading' : 'mdi:play-circle'" :class="{ 'analyze-view-spin': analyzing }" />
                        <span>{{ analyzing ? 'Analyzing...' : 'Analyze Multi-DUT Data' }}</span>
                    </button>

                    <AppProgress v-if="analyzing" :value="uploadProgress" aria-live="polite" />
                </AppPanel>
            </div>

            <div class="analyze-view-layout__side">
                <AppPanel v-if="analysisCompleted" eyebrow="Results" title="Analysis Complete" description="The compiled workbook was generated and downloaded automatically." tone="success">
                    <div class="analyze-view-notice analyze-view-notice--success">
                        <div>
                            <strong>Workbook ready</strong>
                            <p>The compiled XLSX file was downloaded after the analysis finished.</p>
                        </div>
                    </div>

                    <div class="analyze-view-result-list">
                        <article class="analyze-view-result-item">
                            <strong>Source File</strong>
                            <p>{{ lastAnalyzedFile }}</p>
                        </article>
                        <article class="analyze-view-result-item">
                            <strong>Output File</strong>
                            <p>{{ lastAnalyzedFile.replace(/\.(csv|xlsx)$/i, '_Compiled.xlsx') }}</p>
                        </article>
                    </div>

                    <button type="button" class="analyze-view-button analyze-view-button--ghost analyze-view-button--block" @click="resetForm">
                        <Icon icon="mdi:refresh" />
                        <span>Analyze Another File</span>
                    </button>
                </AppPanel>

                <AppPanel v-else eyebrow="Playbook" title="Recommended Flow" description="Keep the compiled workbook reliable by pairing the right source and spec before you run the analysis." tone="cool">
                    <ol class="analyze-view-steps">
                        <li>
                            <strong>Upload the MC2 data file.</strong>
                            <span>Use the CSV or XLSX workbook containing the full multi-DUT measurements.</span>
                        </li>
                        <li>
                            <strong>Attach or build the spec.</strong>
                            <span>JSON and INI specs define the USL and LSL thresholds used in the export.</span>
                        </li>
                        <li>
                            <strong>Run the analysis once.</strong>
                            <span>The compiled XLSX downloads automatically when processing completes.</span>
                        </li>
                    </ol>

                    <div class="analyze-view-detail-cards">
                        <article class="analyze-view-detail-card">
                            <span>VALUE_DATA</span>
                            <p>Numeric measurements with pass, margin, and fail analysis.</p>
                        </article>
                        <article class="analyze-view-detail-card">
                            <span>NON_VALUE_DATA</span>
                            <p>Non-numeric test items and related statuses.</p>
                        </article>
                        <article class="analyze-view-detail-card">
                            <span>Color Coding</span>
                            <p>Pass, margin pass, margin fail, and fail are preserved in the workbook.</p>
                        </article>
                    </div>
                </AppPanel>
            </div>
        </div>

        <SpecBuilderDialog v-model="showSpecBuilder" @spec-created="handleSpecCreated" />

        <AppDialog v-model="showTemplateDialog" title="Download Spec Template" description="Choose the template format to download.">
            <div class="analyze-view-template-grid">
                <button type="button" class="analyze-view-button analyze-view-button--primary analyze-view-button--block analyze-view-button--large" @click="downloadTemplate('json')">
                    <Icon icon="mdi:code-json" />
                    <span>JSON</span>
                </button>
                <button type="button" class="analyze-view-button analyze-view-button--success analyze-view-button--block analyze-view-button--large" @click="downloadTemplate('ini')">
                    <Icon icon="mdi:file-document" />
                    <span>INI</span>
                </button>
            </div>

            <template #footer>
                <div class="analyze-view-dialog-footer">
                    <button type="button" class="analyze-view-button analyze-view-button--ghost analyze-view-button--small" @click="showTemplateDialog = false">Cancel</button>
                </div>
            </template>
        </AppDialog>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { AppDialog, AppFilePicker, AppPanel, AppProgress } from '@/shared'
import { useNotification } from '@/shared/composables/useNotification'
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
const mc2File = ref<File | null>(null)
const specFile = ref<File | null>(null)
const mc2FileError = ref('')
const specFileError = ref('')
const analyzing = ref(false)
const uploadProgress = ref(0)
const analysisCompleted = ref(false)
const lastAnalyzedFile = ref('')
const showSpecBuilder = ref(false)
const showTemplateDialog = ref(false)
const analysisError = ref('')
const { showError: showErrorNotification } = useNotification()

// Computed
const mc2FileActual = computed(() => mc2File.value)
const specFileActual = computed(() => specFile.value)

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

function handleMc2FileSelection(value: File | File[] | null) {
    mc2File.value = Array.isArray(value) ? (value[0] ?? null) : value
    handleMc2FileChange()
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

function handleSpecFileSelection(value: File | File[] | null) {
    specFile.value = Array.isArray(value) ? (value[0] ?? null) : value
    handleSpecFileChange()
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
    specFile.value = file
  handleSpecFileChange()
}

async function handleAnalyze() {
  if (!mc2FileActual.value || !specFileActual.value) return

  analyzing.value = true
  uploadProgress.value = 0
  analysisCompleted.value = false
    analysisError.value = ''

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
        analysisError.value = error instanceof Error ? error.message : 'Analysis failed. Please try again.'
        showErrorNotification(analysisError.value)
  } finally {
    analyzing.value = false
    uploadProgress.value = 0
  }
}

function resetForm() {
    mc2File.value = null
    specFile.value = null
  mc2FileError.value = ''
  specFileError.value = ''
  analysisCompleted.value = false
  uploadProgress.value = 0
    analysisError.value = ''
}
</script>

<style scoped>
.analyze-view-button,
.analyze-view-panel__icon {
    display: inline-flex;
}

.analyze-view-header__copy {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.analyze-view-header__icon {
    display: grid;
    place-items: center;
    width: 3.4rem;
    height: 3.4rem;
    border-radius: 1.1rem;
    background: linear-gradient(135deg, rgba(15, 118, 110, 0.14), rgba(45, 212, 191, 0.16));
    color: var(--app-accent);
    box-shadow: var(--app-shadow-soft);
}

.analyze-view-header__icon-glyph {
    font-size: 2rem;
}

.analyze-view-header__title {
    margin: 0 0 0.5rem;
    font-size: clamp(2rem, 3vw, 2.5rem);
    line-height: 1.08;
}

.analyze-view-header__subtitle {
    margin: 0;
    color: var(--app-muted);
    line-height: 1.55;
}

.analyze-view-panel__icon {
    font-size: 1.75rem;
    color: var(--app-ink);
}

.analyze-view-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(20rem, 0.92fr);
    gap: 1rem;
}

.analyze-view-layout__main,
.analyze-view-layout__side {
    display: grid;
    gap: 1rem;
}

.analyze-view-section,
.analyze-view-file-note,
.analyze-view-notice,
.analyze-view-result-item,
.analyze-view-detail-card {
    border: 1px solid var(--app-border);
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.7);
}

.analyze-view-section {
    display: grid;
    gap: 0.9rem;
    padding: 1rem;
}

.analyze-view-section__header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
}

.analyze-view-section__header strong,
.analyze-view-file-note strong,
.analyze-view-result-item strong,
.analyze-view-steps strong {
    color: var(--app-ink);
}

.analyze-view-section__header p,
.analyze-view-file-note p,
.analyze-view-notice p,
.analyze-view-result-item p,
.analyze-view-detail-card p,
.analyze-view-steps span {
    margin: 0.25rem 0 0;
    color: var(--app-muted);
    line-height: 1.55;
}

.analyze-view-section__actions,
.analyze-view-dialog-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    justify-content: flex-end;
}

.analyze-view-button {
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    border-radius: 999px;
    border: 1px solid var(--app-border);
    padding: 0.78rem 1rem;
    cursor: pointer;
    font-weight: 700;
    background: var(--app-panel);
    color: var(--app-ink);
}

.analyze-view-button:disabled {
    cursor: not-allowed;
    opacity: 0.64;
}

.analyze-view-button--primary {
    background: #1f4e86;
    border-color: #1f4e86;
    color: #f8f3ec;
}

.analyze-view-button--success {
    background: var(--app-accent);
    border-color: var(--app-accent);
    color: #f8f3ec;
}

.analyze-view-button--ghost {
    background: var(--app-panel);
    color: var(--app-ink);
}

.analyze-view-button--info-ghost {
    background: rgba(20, 113, 153, 0.08);
    border-color: rgba(20, 113, 153, 0.24);
    color: #0f6c92;
}

.analyze-view-button--success-ghost {
    background: rgba(15, 118, 110, 0.06);
    border-color: rgba(15, 118, 110, 0.2);
    color: var(--app-accent);
}

.analyze-view-button--block {
    width: 100%;
}

.analyze-view-button--large {
    padding-inline: 1.15rem;
}

.analyze-view-button--small {
    padding: 0.62rem 0.85rem;
    font-size: 0.85rem;
}

.analyze-view-spin {
    animation: analyze-view-spin 0.9s linear infinite;
}

.analyze-view-file-note,
.analyze-view-notice,
.analyze-view-result-item,
.analyze-view-detail-card {
    padding: 0.95rem 1rem;
}

.analyze-view-file-note--accent {
    border-color: rgba(15, 118, 110, 0.2);
}

.analyze-view-notice {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
}

.analyze-view-notice--error {
    background: rgba(163, 61, 45, 0.08);
    border-color: rgba(163, 61, 45, 0.24);
}

.analyze-view-notice--success {
    background: rgba(15, 118, 110, 0.06);
    border-color: rgba(15, 118, 110, 0.2);
}

.analyze-view-notice button {
    border: 0;
    background: transparent;
    color: var(--app-accent);
    cursor: pointer;
    font-weight: 700;
}

.analyze-view-detail-card span,
.analyze-view-detail-card span {
    color: var(--app-muted);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.analyze-view-result-list,
.analyze-view-detail-cards {
    display: grid;
    gap: 0.85rem;
}

.analyze-view-steps {
    display: grid;
    gap: 0.9rem;
    padding-left: 1.25rem;
    margin: 0;
}

.analyze-view-template-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem;
}

@media (max-width: 960px) {
    .analyze-view-layout,
    .analyze-view-template-grid {
        grid-template-columns: 1fr;
    }

    .analyze-view-section__header {
        flex-direction: column;
    }
}

@keyframes analyze-view-spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
</style>
