<template>
    <DefaultLayout>
        <div class="dvt-compare-header mb-6">
            <div class="dvt-compare-header__copy">
                <div class="dvt-compare-header__icon">
                    <Icon icon="mdi:file-compare" class="dvt-compare-header__icon-glyph" />
                </div>
                <div>
                    <h1 class="dvt-compare-header__title">DVT-MC2 Format Compare</h1>
                    <p class="dvt-compare-header__subtitle">
                        Compare MasterControl and DVT files to analyze test-result drift and export the final payload.
                    </p>
                </div>
            </div>

            <button v-if="hasComparisonResult" type="button" class="dvt-compare-button dvt-compare-button--ghost" @click="handleReset">
                <Icon icon="mdi:refresh" />
                <span>New Comparison</span>
            </button>
        </div>

        <div v-if="error" class="dvt-compare-notice dvt-compare-notice--error mb-4">
            <div>
                <strong>Comparison failed</strong>
                <p>{{ error }}</p>
            </div>
            <button type="button" @click="error = ''">Dismiss</button>
        </div>

        <div v-if="downloadCompleted" class="dvt-compare-notice dvt-compare-notice--success mb-4">
            <div>
                <strong>Download ready</strong>
                <p>The comparison export was generated successfully.</p>
            </div>
            <button type="button" @click="downloadCompleted = false">Dismiss</button>
        </div>

        <div class="dvt-compare-upload-grid mb-4">
            <AppPanel eyebrow="Source A" title="MasterControl File" description="Accepts `.txt` or `.csv` exports from MasterControl.">
                <template #header-aside>
                    <Icon icon="mdi:file-document" class="dvt-compare-panel__icon" />
                </template>

                <AppFilePicker
                    v-model="masterFile"
                    accept=".txt,.csv"
                    label="Select MC2 file"
                    helper-text="Use the raw MasterControl export you want to reconcile."
                    :disabled="isBusy"
                />

                <div v-if="masterFile" class="dvt-compare-file-note">
                    <strong>{{ getFileName(masterFile) }}</strong>
                    <span>Ready for comparison.</span>
                </div>
            </AppPanel>

            <AppPanel eyebrow="Source B" title="DVT File" description="Upload the DVT export that should be matched against MC2." tone="warm">
                <template #header-aside>
                    <Icon icon="mdi:file-document-outline" class="dvt-compare-panel__icon" />
                </template>

                <AppFilePicker
                    v-model="dvtFile"
                    accept=".txt,.csv"
                    label="Select DVT file"
                    helper-text="Use the DVT source with the same metric family and antenna coverage."
                    :disabled="isBusy"
                />

                <div v-if="dvtFile" class="dvt-compare-file-note">
                    <strong>{{ getFileName(dvtFile) }}</strong>
                    <span>Ready for comparison.</span>
                </div>
            </AppPanel>

            <AppPanel eyebrow="Optional" title="Spec File" description="Supply a custom JSON spec or fall back to the default spec bundle." tone="cool">
                <template #header-aside>
                    <Icon icon="mdi:file-cog" class="dvt-compare-panel__icon" />
                </template>

                <AppFilePicker
                    v-model="specFile"
                    accept=".json"
                    label="Select spec file"
                    helper-text="Leave empty to use the default specification."
                    :disabled="isBusy"
                />

                <div class="dvt-compare-file-note dvt-compare-file-note--info">
                    <strong>{{ specFile ? getFileName(specFile) : 'Default spec bundle' }}</strong>
                    <span>{{ specFile ? 'Custom spec detected.' : 'A built-in specification will be used.' }}</span>
                </div>
            </AppPanel>
        </div>

        <AppPanel eyebrow="Configuration" title="Tuning Parameters" description="Set optional thresholds before generating browser output or downloadable files." class="mb-4">
            <template #header-aside>
                <Icon icon="mdi:cog" class="dvt-compare-panel__icon" />
            </template>

            <div class="dvt-compare-form-grid">
                <label class="dvt-compare-field">
                    <span>Threshold</span>
                    <input v-model.number="threshold" type="number" step="0.1" placeholder="Optional tolerance">
                    <small>Comparison tolerance override.</small>
                </label>

                <label class="dvt-compare-field">
                    <span>Margin Threshold</span>
                    <input v-model.number="marginThreshold" type="number" step="0.1" placeholder="Optional margin">
                    <small>Pass/fail threshold override.</small>
                </label>

                <label class="dvt-compare-field">
                    <span>Frequency Tolerance (MHz)</span>
                    <input v-model.number="freqTolerance" type="number" step="0.1">
                    <small>Used for frequency matching.</small>
                </label>

                <label class="dvt-compare-field">
                    <span>Output Format</span>
                    <select v-model="outputFormat">
                        <option v-for="option in outputFormatOptions" :key="option.value" :value="option.value">
                            {{ option.title }}
                        </option>
                    </select>
                    <small>JSON stays in-browser. CSV and XLSX trigger downloads.</small>
                </label>
            </div>
        </AppPanel>

        <AppPanel eyebrow="Actions" title="Run Compare or Export" compactHeader class="mb-4">

            <div class="dvt-compare-actions">
                <button type="button" class="dvt-compare-button dvt-compare-button--primary dvt-compare-button--large" :disabled="!canCompare" @click="handleCompare">
                    <Icon :icon="processing ? 'mdi:loading' : 'mdi:compare'" :class="{ 'dvt-compare-spin': processing }" />
                    <span>{{ processing ? 'Comparing...' : 'Compare Files' }}</span>
                </button>
                <button type="button" class="dvt-compare-button dvt-compare-button--success dvt-compare-button--large" :disabled="!canDownload" @click="handleDownload">
                    <Icon :icon="downloading ? 'mdi:loading' : 'mdi:download'" :class="{ 'dvt-compare-spin': downloading }" />
                    <span>{{ downloading ? `Downloading ${outputFormat.toUpperCase()}...` : `Download ${outputFormat.toUpperCase()}` }}</span>
                </button>
            </div>

            <AppProgress v-if="processing || downloading" :value="progress" class="mt-4" aria-live="polite" />
        </AppPanel>

        <AppPanel v-if="comparisonResult" eyebrow="Results" title="Comparison Results" tone="success" splitHeader>
            <template #header-aside>
                <div v-if="comparisonResult.summary" class="dvt-compare-summary-chips">
                    <span class="dvt-compare-pill dvt-compare-pill--success">Pass: {{ comparisonResult.summary.pass || 0 }}</span>
                    <span class="dvt-compare-pill dvt-compare-pill--danger">Fail: {{ comparisonResult.summary.fail || 0 }}</span>
                    <span class="dvt-compare-pill dvt-compare-pill--info">Total: {{ comparisonResult.rows?.length || 0 }}</span>
                </div>
            </template>

            <AppDataGrid :columns="resultGridColumns" :rows="comparisonResult.rows || []" paginator :rowsPerPage="20" scrollHeight="500px">
                <template #cell-mc2_result="slotProps">
                    <span class="dvt-compare-pill" :class="resultPillClass(String(slotProps.value || ''))">
                        {{ slotProps.value || 'N/A' }}
                    </span>
                </template>

                <template #cell-dvt_result="slotProps">
                    <span class="dvt-compare-pill" :class="resultPillClass(String(slotProps.value || ''))">
                        {{ slotProps.value || 'N/A' }}
                    </span>
                </template>

                <template #empty>
                    <div class="dvt-compare-empty-state">
                        <Icon icon="mdi:table-off" class="dvt-compare-empty-state__icon" />
                        <p>No comparison results available</p>
                    </div>
                </template>
            </AppDataGrid>
        </AppPanel>

        <AppPanel v-else eyebrow="Playbook" title="Recommended Flow" description="Use the sequence below to keep the DVT and MC2 comparison run consistent." tone="cool">
            <template #header-aside>
                <Icon icon="mdi:information" class="dvt-compare-panel__icon" />
            </template>

            <ol class="dvt-compare-steps">
                <li>
                    <strong>Upload both source files.</strong>
                    <span>Select the MC2 export and its matching DVT export.</span>
                </li>
                <li>
                    <strong>Add a custom spec only when needed.</strong>
                    <span>Leave the spec blank to rely on the default configuration.</span>
                </li>
                <li>
                    <strong>Set tolerance values.</strong>
                    <span>Threshold, margin threshold, and frequency tolerance adjust the comparison behavior.</span>
                </li>
                <li>
                    <strong>Choose output mode.</strong>
                    <span>Use JSON for in-browser review or CSV/XLSX for a generated export.</span>
                </li>
            </ol>
        </AppPanel>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { comparisonApi } from '@/features/comparison/api/comparison.api'
import { AppDataGrid, AppFilePicker, AppPanel, AppProgress } from '@/shared'
import { getApiErrorDetail, getErrorMessage } from '@/shared/utils'

// State
const masterFile = ref<File | File[] | null>(null)
const dvtFile = ref<File | File[] | null>(null)
const specFile = ref<File | File[] | null>(null)
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

const isBusy = computed(() => processing.value || downloading.value)

// Computed
const canCompare = computed(() => {
    const master = getSelectedFile(masterFile.value)
    const dvt = getSelectedFile(dvtFile.value)
  return master && dvt && !processing.value && outputFormat.value === 'json'
})

const canDownload = computed(() => {
    const master = getSelectedFile(masterFile.value)
    const dvt = getSelectedFile(dvtFile.value)
  return (
    master &&
    dvt &&
    !downloading.value &&
    (outputFormat.value === 'csv' || outputFormat.value === 'xlsx')
  )
})

const hasComparisonResult = computed(() => comparisonResult.value !== null)

const resultGridColumns = computed(() => [
    { key: 'antenna_dvt', field: 'antenna_dvt', header: 'Antenna', sortable: true },
    { key: 'metric', field: 'metric', header: 'Metric', sortable: true },
    { key: 'freq', field: 'freq', header: 'Freq', sortable: true },
    { key: 'standard', field: 'standard', header: 'Standard', sortable: true },
    { key: 'datarate', field: 'datarate', header: 'Data Rate', sortable: true },
    { key: 'bandwidth', field: 'bandwidth', header: 'BW', sortable: true },
    { key: 'mc2_value', field: 'mc2_value', header: 'MC2 Value', sortable: true },
    { key: 'mc2_result', field: 'mc2_result', header: 'MC2 Result', sortable: true },
    { key: 'dvt_value', field: 'dvt_value', header: 'DVT Value', sortable: true },
    { key: 'dvt_result', field: 'dvt_result', header: 'DVT Result', sortable: true },
    { key: 'mc2_dvt_diff', field: 'mc2_dvt_diff', header: 'Diff', sortable: true },
])

// Methods
function getFileName(file: File | File[] | null): string {
    return getSelectedFile(file)?.name || ''
}

function getSelectedFile(file: File | File[] | null) {
    if (!file) return null
    return Array.isArray(file) ? (file[0] ?? null) : file
}

function getResultColor(result: string): string {
  if (!result) return 'grey'
  const upper = result.toUpperCase()
  if (upper.includes('PASS')) return 'success'
  if (upper.includes('FAIL')) return 'error'
  return 'info'
}

function resultPillClass(result: string): string {
    const tone = getResultColor(result)
    if (tone === 'success') return 'dvt-compare-pill--success'
    if (tone === 'error') return 'dvt-compare-pill--danger'
    if (tone === 'info') return 'dvt-compare-pill--info'
    return 'dvt-compare-pill--neutral'
}

async function handleCompare() {
  if (!canCompare.value) return

  processing.value = true
  progress.value = 0
  error.value = ''
  comparisonResult.value = null
    const progressInterval = startProgressTicker()

  try {
    const formData = new FormData()
        const master = getSelectedFile(masterFile.value) as File
        const dvt = getSelectedFile(dvtFile.value) as File

    formData.append('master_file', master)
    formData.append('dvt_file', dvt)

    if (specFile.value) {
            const spec = getSelectedFile(specFile.value) as File
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

    const result = await comparisonApi.compareFormats(formData, false)
    comparisonResult.value = result as ComparisonResultData

    progress.value = 100
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err) || getErrorMessage(err) || 'Comparison failed'
  } finally {
        clearInterval(progressInterval)
    processing.value = false
  }
}

async function handleDownload() {
  if (!canDownload.value) return

  downloading.value = true
  progress.value = 0
  error.value = ''
  downloadCompleted.value = false
    const progressInterval = startProgressTicker()

  try {
    const formData = new FormData()
        const master = getSelectedFile(masterFile.value) as File
        const dvt = getSelectedFile(dvtFile.value) as File

    formData.append('master_file', master)
    formData.append('dvt_file', dvt)

    if (specFile.value) {
            const spec = getSelectedFile(specFile.value) as File
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

    const blob = (await comparisonApi.compareFormats(formData, true)) as Blob

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
        clearInterval(progressInterval)
    downloading.value = false
  }
}

function startProgressTicker() {
    return window.setInterval(() => {
        if (progress.value < 90) {
            progress.value += 10
        }
    }, 100)
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
.dvt-compare-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
}

.dvt-compare-header__copy {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.dvt-compare-header__icon {
    display: grid;
    place-items: center;
    width: 3.4rem;
    height: 3.4rem;
    border-radius: 1.1rem;
    background: linear-gradient(135deg, rgba(15, 118, 110, 0.14), rgba(45, 212, 191, 0.16));
    color: var(--app-accent);
    box-shadow: var(--app-shadow-soft);
}

.dvt-compare-header__icon-glyph {
    font-size: 2rem;
}

.dvt-compare-header__title {
    margin: 0 0 0.5rem;
    font-size: clamp(2rem, 3vw, 2.5rem);
    line-height: 1.08;
}

.dvt-compare-header__subtitle {
    margin: 0;
    color: var(--app-muted);
    line-height: 1.55;
}

.dvt-compare-upload-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
}

.dvt-compare-button,
.dvt-compare-pill,
.dvt-compare-empty-state,
.dvt-compare-panel__icon {
    display: inline-flex;
}

.dvt-compare-button {
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

.dvt-compare-button:disabled {
    cursor: not-allowed;
    opacity: 0.64;
}

.dvt-compare-button--primary {
    background: #1f4e86;
    border-color: #1f4e86;
    color: #f8f3ec;
}

.dvt-compare-button--success {
    background: var(--app-accent);
    border-color: var(--app-accent);
    color: #f8f3ec;
}

.dvt-compare-button--ghost {
    background: var(--app-panel);
    color: var(--app-ink);
}

.dvt-compare-button--large {
    padding-inline: 1.15rem;
}

.dvt-compare-spin {
    animation: dvt-compare-spin 0.9s linear infinite;
}

.dvt-compare-panel__icon {
    font-size: 1.75rem;
    color: var(--app-ink);
}

.dvt-compare-file-note,
.dvt-compare-notice {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    border: 1px solid var(--app-border);
    border-radius: 1rem;
    padding: 0.95rem 1rem;
    box-shadow: var(--app-shadow-soft);
}

.dvt-compare-file-note {
    background: var(--app-panel);
}

.dvt-compare-file-note--info {
    border-style: dashed;
}

.dvt-compare-file-note strong {
    display: block;
    color: var(--app-ink);
}

.dvt-compare-file-note span,
.dvt-compare-notice p {
    display: block;
    margin-top: 0.25rem;
    color: var(--app-muted);
    line-height: 1.55;
}

.dvt-compare-notice--error {
    background: rgba(163, 61, 45, 0.08);
    border-color: rgba(163, 61, 45, 0.24);
}

.dvt-compare-notice--success {
    background: rgba(15, 118, 110, 0.06);
    border-color: rgba(15, 118, 110, 0.2);
}

.dvt-compare-notice button {
    border: 0;
    background: transparent;
    color: var(--app-accent);
    cursor: pointer;
    font-weight: 700;
}

.dvt-compare-form-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.9rem;
}

.dvt-compare-field {
    display: grid;
    gap: 0.45rem;
}

.dvt-compare-field > span {
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: none;
    color: var(--app-muted);
}

.dvt-compare-field input,
.dvt-compare-field select {
    width: 100%;
    border: 1px solid var(--app-border);
    border-radius: 1rem;
    background: var(--app-panel);
    color: var(--app-ink);
    box-shadow: var(--app-shadow-soft);
    padding: 0.85rem 0.95rem;
}

.dvt-compare-field input:focus,
.dvt-compare-field select:focus {
    outline: none;
    border-color: var(--app-accent);
    box-shadow: 0 0 0 4px var(--app-ring);
}

.dvt-compare-field small {
    color: var(--app-muted);
    line-height: 1.5;
}

.dvt-compare-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.dvt-compare-summary-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.dvt-compare-pill {
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    border-radius: 999px;
    padding: 0.32rem 0.75rem;
    font-size: 0.78rem;
    font-weight: 700;
}

.dvt-compare-pill--success {
    background: rgba(15, 118, 110, 0.1);
    color: var(--app-accent);
}

.dvt-compare-pill--danger {
    background: rgba(163, 61, 45, 0.12);
    color: #8b2f20;
}

.dvt-compare-pill--info {
    background: rgba(20, 113, 153, 0.12);
    color: #0f6c92;
}

.dvt-compare-pill--neutral {
    background: rgba(120, 129, 143, 0.12);
    color: #4f5d6d;
}

.dvt-compare-empty-state {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    padding: 1.25rem;
    color: var(--app-muted);
}

.dvt-compare-empty-state__icon {
    font-size: 3rem;
    color: #8a94a6;
}

.dvt-compare-empty-state p {
    margin: 0;
}

.dvt-compare-steps {
    display: grid;
    gap: 0.9rem;
    padding-left: 1.25rem;
    margin: 0;
}

.dvt-compare-steps li {
    color: var(--app-muted);
    line-height: 1.6;
}

.dvt-compare-steps strong {
    display: block;
    color: var(--app-ink);
}

.dvt-compare-steps span {
    display: block;
}

@media (max-width: 960px) {
    .dvt-compare-upload-grid,
    .dvt-compare-form-grid {
        grid-template-columns: 1fr;
    }

    .dvt-compare-header {
        flex-direction: column;
    }

    .dvt-compare-header__copy {
        align-items: flex-start;
    }
}

@keyframes dvt-compare-spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
</style>
