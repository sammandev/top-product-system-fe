<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon start>mdi-cog</v-icon>
      Criteria Configuration
    </v-card-title>

    <v-card-text>
      <v-row>
        <v-col cols="12" md="6">
          <v-text-field v-model.number="criteriaScore" label="Criteria Score" type="number" variant="outlined"
            density="comfortable" prepend-inner-icon="mdi-star" min="0" max="10" step="0.1" :error-messages="scoreError"
            hint="Minimum score threshold (0-10)" persistent-hint @update:model-value="handleScoreChange">
            <template #append>
              <v-chip size="small" :color="getScoreColor(criteriaScore)">
                {{ criteriaScore.toFixed(1) }}
              </v-chip>
            </template>
          </v-text-field>
        </v-col>

        <v-col cols="12" md="6">
          <v-text-field v-model.number="resultLimit" label="Results Limit" type="number" variant="outlined"
            density="comfortable" prepend-inner-icon="mdi-format-list-numbered" min="1" max="100"
            :error-messages="limitError" hint="Maximum number of results (1-100)" persistent-hint
            @update:model-value="handleLimitChange" />
        </v-col>
      </v-row>

      <v-divider class="my-4" />

      <div class="text-subtitle-2 mb-3 d-flex align-center">
        <v-icon start size="small">mdi-file-upload</v-icon>
        Custom Criteria File (Optional)
        <v-spacer />
        <v-btn size="small" variant="outlined" color="primary" prepend-icon="mdi-download"
          title="Download criteria JSON template" @click="downloadTemplate">
          Download Template
        </v-btn>
      </div>

      <v-file-input v-model="criteriaFile" label="Upload criteria JSON file" accept=".json,application/json"
        variant="outlined" density="comfortable" prepend-icon="mdi-paperclip" :clearable="true" :show-size="true"
        hint="Upload custom criteria configuration JSON file (.json)" persistent-hint
        @update:model-value="handleFileChange">
        <template #selection="{ fileNames }">
          <v-chip v-for="fileName in fileNames" :key="fileName" size="small" color="primary" class="me-2">
            {{ fileName }}
          </v-chip>
        </template>
      </v-file-input>

      <v-alert v-if="isValid" type="success" variant="tonal" density="compact" class="mt-4">
        <template #prepend>
          <v-icon>mdi-check-circle</v-icon>
        </template>
        <div class="text-caption">
          <strong>Criteria configured:</strong> Score >= {{ criteriaScore.toFixed(1) }},
          Limit: {{ resultLimit }} results
          <span v-if="criteriaFileActual">
            | Custom criteria file: {{ criteriaFileActual.name }}
            ({{ formatFileSize(criteriaFileActual.size) }})
          </span>
        </div>
      </v-alert>

      <v-alert v-else-if="showValidation" type="warning" variant="tonal" density="compact" class="mt-4">
        <template #prepend>
          <v-icon>mdi-alert</v-icon>
        </template>
        <div class="text-caption">
          Please enter a valid criteria score (0-10) and results limit (1-100)
        </div>
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { downloadCriteriaJsonTemplate } from '../utils/criteriaTemplate'

interface Props {
  modelValue: {
    criteriaScore: number
    limit: number
    criteriaFile: File | null
  }
  showValidation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showValidation: false,
})

interface Emits {
  (
    e: 'update:modelValue',
    value: {
      criteriaScore: number
      limit: number
      criteriaFile: File | null
    },
  ): void
  (
    e: 'change',
    value: {
      criteriaScore: number
      limit: number
      criteriaFile: File | null
      valid: boolean
    },
  ): void
}

const emit = defineEmits<Emits>()

const criteriaScore = ref<number>(props.modelValue.criteriaScore)
const resultLimit = ref<number>(props.modelValue.limit)
const criteriaFile = ref<File[] | File | null>(null)
const scoreError = ref('')
const limitError = ref('')

if (props.modelValue.criteriaFile) {
  criteriaFile.value = props.modelValue.criteriaFile
}

const criteriaFileActual = computed<File | undefined>(() => {
  if (!criteriaFile.value) return undefined
  if (Array.isArray(criteriaFile.value)) {
    return criteriaFile.value[0]
  }
  return criteriaFile.value
})

const isValid = computed(() => {
  return (
    criteriaScore.value >= 0 &&
    criteriaScore.value <= 10 &&
    resultLimit.value >= 1 &&
    resultLimit.value <= 100
  )
})

function handleScoreChange() {
  scoreError.value = ''

  if (criteriaScore.value < 0 || criteriaScore.value > 10) {
    scoreError.value = 'Score must be between 0 and 10'
  }

  emitChange()
}

function handleLimitChange() {
  limitError.value = ''

  if (resultLimit.value < 1) {
    limitError.value = 'Limit must be at least 1'
  } else if (resultLimit.value > 100) {
    limitError.value = 'Limit cannot exceed 100'
  }

  emitChange()
}

function handleFileChange() {
  emitChange()
}

function emitChange() {
  const file = criteriaFileActual.value || null

  emit('update:modelValue', {
    criteriaScore: criteriaScore.value,
    limit: resultLimit.value,
    criteriaFile: file,
  })

  emit('change', {
    criteriaScore: criteriaScore.value,
    limit: resultLimit.value,
    criteriaFile: file,
    valid: isValid.value,
  })
}

function getScoreColor(score: number): string {
  if (score >= 9) return 'success'
  if (score >= 7) return 'primary'
  if (score >= 5) return 'warning'
  return 'error'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`
}

function downloadTemplate() {
  downloadCriteriaJsonTemplate()
}

watch(
  () => props.modelValue,
  (newValue) => {
    criteriaScore.value = newValue.criteriaScore
    resultLimit.value = newValue.limit
    criteriaFile.value = newValue.criteriaFile ?? null
  },
  { deep: true },
)
</script>

<style scoped></style>
