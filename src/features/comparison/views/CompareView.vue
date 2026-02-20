<template>
  <DefaultLayout>
    <!-- Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 mb-2">Compare Files</h1>
        <p class="text-medium-emphasis">
          Upload two files and compare their contents side by side
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn v-if="hasComparisonResult" color="success" prepend-icon="mdi-download" @click="handleDownload">
          Download Results
        </v-btn>
        <v-btn v-if="hasComparisonResult" color="secondary" prepend-icon="mdi-refresh" variant="outlined"
          @click="handleReset">
          New Comparison
        </v-btn>
      </div>
    </div>

    <!-- Error Alert -->
    <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="clearError">
      {{ error }}
    </v-alert>

    <!-- File Upload Section -->
    <v-row class="mb-4">
      <!-- File A Upload -->


      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-file-document-outline</v-icon>
            File A
          </v-card-title>
          <v-card-text>
            <v-file-input v-model="selectedFileA" label="Select File A" accept=".csv,.xlsx" variant="outlined"
              prepend-icon="mdi-paperclip" :disabled="loadingA" :rules="[fileRules.required, fileRules.fileType]"
              @change="handleFileAChange">
              <template #append>
                <v-btn color="primary" :loading="loadingA" :disabled="!selectedFileA || loadingA"
                  @click="handleUploadFileA">
                  Upload
                </v-btn>
              </template>
            </v-file-input>

            <!-- Upload Progress A -->
            <v-progress-linear v-if="loadingA" :model-value="uploadProgressA" color="primary" class="mt-2" />

            <!-- Preview Info A -->
            <v-alert v-if="hasPreviewA" type="success" class="mt-4">
              <div class="d-flex align-center">
                <v-icon class="mr-2">mdi-check-circle</v-icon>
                <div>
                  <div><strong>{{ fileA?.name }}</strong></div>
                  <div class="text-caption">
                    {{ columnsA.length }} columns × {{ previewRowsA.length }} rows (preview)
                  </div>
                </div>
              </div>
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- File B Upload -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-file-document-outline</v-icon>
            File B
          </v-card-title>
          <v-card-text>
            <v-file-input v-model="selectedFileB" label="Select File B" accept=".csv,.xlsx" variant="outlined"
              prepend-icon="mdi-paperclip" :disabled="loadingB" :rules="[fileRules.required, fileRules.fileType]"
              @change="handleFileBChange">
              <template #append>
                <v-btn color="primary" :loading="loadingB" :disabled="!selectedFileB || loadingB"
                  @click="handleUploadFileB">
                  Upload
                </v-btn>
              </template>
            </v-file-input>

            <!-- Upload Progress B -->
            <v-progress-linear v-if="loadingB" :model-value="uploadProgressB" color="primary" class="mt-2" />

            <!-- Preview Info B -->
            <v-alert v-if="hasPreviewB" type="success" class="mt-4">
              <div class="d-flex align-center">
                <v-icon class="mr-2">mdi-check-circle</v-icon>
                <div>
                  <div><strong>{{ fileB?.name }}</strong></div>
                  <div class="text-caption">
                    {{ columnsB.length }} columns × {{ previewRowsB.length }} rows (preview)
                  </div>
                </div>
              </div>
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Comparison Configuration -->
    <v-row v-if="hasBothPreviews && !hasComparisonResult" class="mb-4">
      <v-col cols="12">
        <!-- Column Mapper -->
        <ColumnMapper v-model="columnMappings" :columns-a="columnsA" :columns-b="columnsB" class="mb-4" />
      </v-col>

      <v-col cols="12">
        <!-- Comparison Mode Selector -->
        <ComparisonModeSelector v-model="comparisonConfig" :columns-a="columnsA" :columns-b="columnsB" class="mb-4" />
      </v-col>

      <v-col cols="12">
        <!-- Action Buttons -->
        <v-card>
          <v-card-text>
            <div class="d-flex gap-2">
              <v-btn color="primary" size="large" :loading="loading" :disabled="!canCompare || loading"
                prepend-icon="mdi-compare" @click="handleCompare">
                Compare Files
              </v-btn>
              <v-btn color="secondary" size="large" variant="outlined" prepend-icon="mdi-refresh" @click="handleReset">
                Reset
              </v-btn>
            </div>

            <!-- Validation Messages -->
            <v-alert v-if="validationMessage" type="warning" variant="tonal" density="compact" class="mt-4">
              {{ validationMessage }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Comparison Results -->
    <v-row v-if="hasComparisonResult">
      <v-col cols="12">
        <ComparisonResults :results="comparisonResult" :mode="comparisonConfig.mode" />
      </v-col>
    </v-row>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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

// Validation rules
const fileRules = {
  required: (v: File | File[] | null | undefined) => {
    if (!v) return 'File is required'
    if (Array.isArray(v) && v.length === 0) return 'File is required'
    return true
  },
  fileType: (v: File | File[] | null | undefined) => {
    if (!v) return true
    if (Array.isArray(v)) {
      if (v.length === 0) return true
      const file = v[0]
      if (!file || !file.name) return 'Invalid file'
      const validExtensions = ['.csv', '.xlsx']
      const hasValidExtension = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
      if (!hasValidExtension) {
        return 'File must be CSV or XLSX format'
      }
      return true
    }
    // Single file
    if (!v.name) return 'Invalid file'
    const validExtensions = ['.csv', '.xlsx']
    const hasValidExtension = validExtensions.some((ext) => v.name.toLowerCase().endsWith(ext))
    if (!hasValidExtension) {
      return 'File must be CSV or XLSX format'
    }
    return true
  },
}

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
function handleFileAChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFileA.value = target.files[0] || null
  }
}

function handleFileBChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFileB.value = target.files[0] || null
  }
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
.gap-2 {
  gap: 0.5rem;
}
</style>
