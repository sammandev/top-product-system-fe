<template>
  <DefaultLayout>
    <!-- Header -->
    <div class="compare-view-header mb-6">
      <div>
        <h1 class="compare-view-title">Compare Files</h1>
        <p class="compare-view-subtitle">
          Upload two files and compare their contents side by side
        </p>
      </div>
      <div class="compare-view-header__actions">
        <button v-if="hasComparisonResult" type="button" class="compare-view-button compare-view-button--success" @click="handleDownload">
          <Icon icon="mdi:download" />
          <span>Download Results</span>
        </button>
        <button v-if="hasComparisonResult" type="button" class="compare-view-button compare-view-button--ghost" @click="handleReset">
          <Icon icon="mdi:refresh" />
          <span>New Comparison</span>
        </button>
      </div>
    </div>

    <div v-if="error" class="compare-view-notice compare-view-notice--error mb-4">
      <div>
        <strong>Comparison error</strong>
        <p>{{ error }}</p>
      </div>
      <button type="button" @click="clearError">Dismiss</button>
    </div>

    <div class="compare-view-upload-grid mb-4">
      <AppPanel eyebrow="File A" title="Left Source" description="Upload the baseline file used for the comparison.">
        <template #header-aside>
          <Icon icon="mdi:file-document-outline" class="compare-view-panel__icon" />
        </template>

        <AppFilePicker
          v-model="selectedFileA"
          label="Select File A"
          accept=".csv,.xlsx"
          helper-text="Upload the left-hand comparison source as CSV or XLSX."
          :disabled="loadingA"
          :invalid="Boolean(fileATypeError)"
          :invalidMessage="fileATypeError"
        />

        <div class="compare-view-panel__actions mt-3">
          <button type="button" class="compare-view-button compare-view-button--primary" :disabled="!selectedFileA || loadingA || Boolean(fileATypeError)" @click="handleUploadFileA">
            <Icon :icon="loadingA ? 'mdi:loading' : 'mdi:upload'" :class="{ 'compare-view-spin': loadingA }" />
            <span>{{ loadingA ? 'Uploading...' : 'Upload' }}</span>
          </button>
        </div>

        <AppProgress v-if="loadingA" :value="uploadProgressA" class="mt-3" aria-live="polite" />

        <div v-if="hasPreviewA" class="compare-view-preview mt-4">
          <div>
            <strong>{{ fileA?.name }}</strong>
            <p>{{ columnsA.length }} columns × {{ previewRowsA.length }} rows (preview)</p>
          </div>
          <Icon icon="mdi:check-circle" class="compare-view-preview__icon compare-view-preview__icon--success" />
        </div>
      </AppPanel>

      <AppPanel eyebrow="File B" title="Right Source" description="Upload the incoming file that should be checked against File A." tone="warm">
        <template #header-aside>
          <Icon icon="mdi:file-document-outline" class="compare-view-panel__icon" />
        </template>

        <AppFilePicker
          v-model="selectedFileB"
          label="Select File B"
          accept=".csv,.xlsx"
          helper-text="Upload the right-hand comparison source as CSV or XLSX."
          :disabled="loadingB"
          :invalid="Boolean(fileBTypeError)"
          :invalidMessage="fileBTypeError"
        />

        <div class="compare-view-panel__actions mt-3">
          <button type="button" class="compare-view-button compare-view-button--primary" :disabled="!selectedFileB || loadingB || Boolean(fileBTypeError)" @click="handleUploadFileB">
            <Icon :icon="loadingB ? 'mdi:loading' : 'mdi:upload'" :class="{ 'compare-view-spin': loadingB }" />
            <span>{{ loadingB ? 'Uploading...' : 'Upload' }}</span>
          </button>
        </div>

        <AppProgress v-if="loadingB" :value="uploadProgressB" class="mt-3" aria-live="polite" />

        <div v-if="hasPreviewB" class="compare-view-preview mt-4">
          <div>
            <strong>{{ fileB?.name }}</strong>
            <p>{{ columnsB.length }} columns × {{ previewRowsB.length }} rows (preview)</p>
          </div>
          <Icon icon="mdi:check-circle" class="compare-view-preview__icon compare-view-preview__icon--success" />
        </div>
      </AppPanel>
    </div>

    <!-- Comparison Configuration -->
    <div v-if="hasBothPreviews && !hasComparisonResult" class="compare-view-config mb-4">
      <ColumnMapper v-model="columnMappings" :columns-a="columnsA" :columns-b="columnsB" class="mb-4" />

      <ComparisonModeSelector v-model="comparisonConfig" :columns-a="columnsA" :columns-b="columnsB" class="mb-4" />

      <AppPanel eyebrow="Run Comparison" title="Execute With Current Mapping" compactHeader>

        <div class="compare-view-action-row">
          <button type="button" class="compare-view-button compare-view-button--primary compare-view-button--large" :disabled="!canCompare || loading" @click="handleCompare">
            <Icon :icon="loading ? 'mdi:loading' : 'mdi:compare'" :class="{ 'compare-view-spin': loading }" />
            <span>{{ loading ? 'Comparing...' : 'Compare Files' }}</span>
          </button>
          <button type="button" class="compare-view-button compare-view-button--ghost compare-view-button--large" @click="handleReset">
            <Icon icon="mdi:refresh" />
            <span>Reset</span>
          </button>
        </div>

        <div v-if="validationMessage" class="compare-view-notice compare-view-notice--warning mt-4">
          <div>
            <strong>Configuration incomplete</strong>
            <p>{{ validationMessage }}</p>
          </div>
        </div>
      </AppPanel>
    </div>

    <!-- Comparison Results -->
    <section v-if="hasComparisonResult" class="compare-view-results">
      <ComparisonResults :results="comparisonResult" :mode="comparisonConfig.mode" />
    </section>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { AppFilePicker, AppPanel, AppProgress } from '@/shared'
import type { ColumnMapping } from '../components/ColumnMapper.vue'
import type { ComparisonConfig } from '../components/ComparisonModeSelector.vue'
import { useComparison } from '../composables'

// Composable
const {
  fileA,
  fileB,
  comparisonResult,
  loading,
  loadingA,
  loadingB,
  error,
  uploadProgressA,
  uploadProgressB,
  hasPreviewA,
  hasPreviewB,
  hasBothPreviews,
  hasComparisonResult,
  columnsA,
  columnsB,
  previewRowsA,
  previewRowsB,
  uploadFileA,
  uploadFileB,
  compareFiles,
  downloadComparison,
  reset,
  clearError,
} = useComparison()

// Form state
const selectedFileA = ref<File | File[] | null>(null)
const selectedFileB = ref<File | File[] | null>(null)
const columnMappings = ref<ColumnMapping[]>([])
const comparisonConfig = ref<ComparisonConfig>({
  mode: 'both',
  joinKeyA: '',
  joinKeyB: '',
  caseSensitive: false,
  numericTolerance: 0.0001,
})

const fileATypeError = computed(() => getFileTypeError(selectedFileA.value))
const fileBTypeError = computed(() => getFileTypeError(selectedFileB.value))

// Computed
const canCompare = computed(() => {
  if (!hasBothPreviews.value) return false

  // Check if join keys are required and set
  const needsJoinKeys =
    comparisonConfig.value.mode === 'rows' || comparisonConfig.value.mode === 'both'
  if (needsJoinKeys) {
    if (!comparisonConfig.value.joinKeyA || !comparisonConfig.value.joinKeyB) {
      return false
    }
  }

  return true
})

const validationMessage = computed(() => {
  if (!hasBothPreviews.value) return null

  const needsJoinKeys =
    comparisonConfig.value.mode === 'rows' || comparisonConfig.value.mode === 'both'
  if (needsJoinKeys) {
    if (!comparisonConfig.value.joinKeyA || !comparisonConfig.value.joinKeyB) {
      return 'Please select join keys for both files to compare rows'
    }
  }

  return null
})

// Methods
function getFileTypeError(value: File | File[] | null | undefined) {
  if (!value) return ''

  const file = Array.isArray(value) ? value[0] : value
  if (!file?.name) return 'Invalid file'

  return ['.csv', '.xlsx'].some((ext) => file.name.toLowerCase().endsWith(ext))
    ? ''
    : 'File must be CSV or XLSX format'
}

async function handleUploadFileA() {
  const file = Array.isArray(selectedFileA.value) ? selectedFileA.value[0] : selectedFileA.value

  if (!file) return

  await uploadFileA(file, {
    hasHeader: true,
    delimiter: ',',
    persist: false,
  })
}

async function handleUploadFileB() {
  const file = Array.isArray(selectedFileB.value) ? selectedFileB.value[0] : selectedFileB.value

  if (!file) return

  await uploadFileB(file, {
    hasHeader: true,
    delimiter: ',',
    persist: false,
  })
}

async function handleCompare() {
  // Build column selections based on mappings
  const selectedColumnsA = columnMappings.value.map((m) => m.a)
  const selectedColumnsB = columnMappings.value.map((m) => m.b)

  const selections = {
    aColumns:
      selectedColumnsA.length > 0 ? { selected: selectedColumnsA, excluded: [] } : undefined,
    bColumns:
      selectedColumnsB.length > 0 ? { selected: selectedColumnsB, excluded: [] } : undefined,
    joinOn:
      comparisonConfig.value.joinKeyA && comparisonConfig.value.joinKeyB
        ? { a: [comparisonConfig.value.joinKeyA], b: [comparisonConfig.value.joinKeyB] }
        : undefined,
  }

  await compareFiles(comparisonConfig.value.mode, selections)
}

async function handleDownload() {
  // Build column selections based on mappings
  const selectedColumnsA = columnMappings.value.map((m) => m.a)
  const selectedColumnsB = columnMappings.value.map((m) => m.b)

  const selections = {
    aColumns:
      selectedColumnsA.length > 0 ? { selected: selectedColumnsA, excluded: [] } : undefined,
    bColumns:
      selectedColumnsB.length > 0 ? { selected: selectedColumnsB, excluded: [] } : undefined,
    joinOn:
      comparisonConfig.value.joinKeyA && comparisonConfig.value.joinKeyB
        ? { a: [comparisonConfig.value.joinKeyA], b: [comparisonConfig.value.joinKeyB] }
        : undefined,
  }

  const fileNameA = fileA.value?.name.replace(/\.[^/.]+$/, '') || 'fileA'
  const fileNameB = fileB.value?.name.replace(/\.[^/.]+$/, '') || 'fileB'
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const filename = `comparison_${fileNameA}_vs_${fileNameB}_${timestamp}.csv`

  await downloadComparison(comparisonConfig.value.mode, selections, filename)
}

function handleReset() {
  selectedFileA.value = null
  selectedFileB.value = null
  columnMappings.value = []
  comparisonConfig.value = {
    mode: 'both',
    joinKeyA: '',
    joinKeyB: '',
    caseSensitive: false,
    numericTolerance: 0.0001,
  }
  reset()
}
</script>

<style scoped>
.compare-view-header,
.compare-view-header__actions,
.compare-view-button,
.compare-view-preview__icon {
  display: flex;
}

.compare-view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.compare-view-title {
  margin: 0 0 0.5rem;
  font-size: clamp(2rem, 3vw, 2.6rem);
  line-height: 1.1;
}

.compare-view-subtitle {
  margin: 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.compare-view-header__actions {
  flex-wrap: wrap;
  gap: 0.75rem;
}

.compare-view-upload-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.compare-view-config {
  display: grid;
  gap: 1rem;
}

.compare-view-panel__actions {
  display: flex;
  justify-content: flex-end;
}

.compare-view-panel__icon {
  font-size: 1.75rem;
  color: var(--app-ink);
}

.compare-view-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.compare-view-button {
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 999px;
  border: 1px solid var(--app-border);
  padding: 0.78rem 1rem;
  cursor: pointer;
  font-weight: 700;
  background: rgba(255, 251, 247, 0.92);
  color: var(--app-ink);
}

.compare-view-button:disabled {
  cursor: not-allowed;
  opacity: 0.64;
}

.compare-view-button--primary {
  background: #1f4e86;
  border-color: #1f4e86;
  color: #f8f3ec;
}

.compare-view-button--success {
  background: #145847;
  border-color: #145847;
  color: #f8f3ec;
}

.compare-view-button--ghost {
  background: rgba(255, 251, 247, 0.92);
  color: var(--app-ink);
}

.compare-view-button--large {
  padding-inline: 1.15rem;
}

.compare-view-spin {
  animation: compare-view-spin 0.9s linear infinite;
}

.compare-view-notice,
.compare-view-preview {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  padding: 0.95rem 1rem;
  box-shadow: var(--app-shadow-soft);
}

.compare-view-notice p,
.compare-view-preview p {
  margin: 0.25rem 0 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.compare-view-notice--error {
  background: rgba(163, 61, 45, 0.08);
  border-color: rgba(163, 61, 45, 0.24);
}

.compare-view-notice--warning,
.compare-view-preview {
  background: rgba(255, 251, 247, 0.92);
}

.compare-view-preview__icon {
  font-size: 1.45rem;
}

.compare-view-preview__icon--success {
  color: #145847;
}

.compare-view-notice button {
  border: 0;
  background: transparent;
  color: var(--app-accent);
  cursor: pointer;
  font-weight: 700;
}

@media (max-width: 900px) {
  .compare-view-header {
    flex-direction: column;
  }

  .compare-view-upload-grid {
    grid-template-columns: 1fr;
  }
}

@keyframes compare-view-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
