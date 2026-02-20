<template>
    <v-card>
        <v-card-title class="d-flex align-center">
            <v-icon start>mdi-cog</v-icon>
            Criteria Configuration
        </v-card-title>

        <v-card-text>
            <v-row>
                <!-- Criteria Score Input -->
                <v-col cols="12" md="6">
                    <v-text-field v-model.number="criteriaScore" label="Criteria Score" type="number" variant="outlined"
                        density="comfortable" prepend-inner-icon="mdi-star" min="0" max="100" step="0.1"
                        :error-messages="scoreError" hint="Minimum score threshold (0-100)" persistent-hint
                        @update:model-value="handleScoreChange">
                        <template #append>
                            <v-chip size="small" :color="getScoreColor(criteriaScore)">
                                {{ criteriaScore }}%
                            </v-chip>
                        </template>
                    </v-text-field>
                </v-col>

                <!-- Results Limit -->
                <v-col cols="12" md="6">
                    <v-text-field v-model.number="resultLimit" label="Results Limit" type="number" variant="outlined"
                        density="comfortable" prepend-inner-icon="mdi-format-list-numbered" min="1" max="1000"
                        :error-messages="limitError" hint="Maximum number of results (1-1000)" persistent-hint
                        @update:model-value="handleLimitChange" />
                </v-col>
            </v-row>

            <!-- Optional Criteria File Upload -->
            <v-divider class="my-4" />

            <div class="text-subtitle-2 mb-3 d-flex align-center">
                <v-icon start size="small">mdi-file-upload</v-icon>
                Custom Criteria File (Optional)
                <v-spacer />
                <v-btn size="small" variant="outlined" color="primary" prepend-icon="mdi-download"
                    @click="downloadTemplate" title="Download criteria configuration template">
                    Download Template
                </v-btn>
            </div>

            <v-file-input v-model="criteriaFile" label="Upload criteria file" accept=".ini,.txt,.json,.csv"
                variant="outlined" density="comfortable" prepend-icon="mdi-paperclip" :clearable="true"
                :show-size="true" hint="Upload custom criteria configuration file (.ini, .txt, .json, .csv)"
                persistent-hint @update:model-value="handleFileChange">
                <template #selection="{ fileNames }">
                    <v-chip v-for="fileName in fileNames" :key="fileName" size="small" color="primary" class="me-2">
                        {{ fileName }}
                    </v-chip>
                </template>
            </v-file-input>

            <!-- Configuration Summary -->
            <v-alert v-if="isValid" type="success" variant="tonal" density="compact" class="mt-4">
                <template #prepend>
                    <v-icon>mdi-check-circle</v-icon>
                </template>
                <div class="text-caption">
                    <strong>Criteria configured:</strong> Score ≥ {{ criteriaScore }}%,
                    Limit: {{ resultLimit }} results
                    <span v-if="criteriaFileActual"> | Custom criteria file: {{ criteriaFileActual.name }} ({{ formatFileSize(criteriaFileActual.size) }})</span>
                </div>
            </v-alert>

            <!-- Validation Alert -->
            <v-alert v-else-if="showValidation" type="warning" variant="tonal" density="compact" class="mt-4">
                <template #prepend>
                    <v-icon>mdi-alert</v-icon>
                </template>
                <div class="text-caption">
                    Please enter a valid criteria score (0-100) and results limit (1-1000)
                </div>
            </v-alert>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

// Props
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

// Emits
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

// State
const criteriaScore = ref<number>(props.modelValue.criteriaScore)
const resultLimit = ref<number>(props.modelValue.limit)
const criteriaFile = ref<File[] | File | null>(null)
const scoreError = ref<string>('')
const limitError = ref<string>('')

// Set initial file if provided
if (props.modelValue.criteriaFile) {
  criteriaFile.value = props.modelValue.criteriaFile
}

// Computed - Extract actual File from criteriaFile (handles both File and File[] formats)
const criteriaFileActual = computed<File | undefined>(() => {
  if (!criteriaFile.value) return undefined
  if (Array.isArray(criteriaFile.value)) {
    return criteriaFile.value.length > 0 ? criteriaFile.value[0] : undefined
  }
  return criteriaFile.value
})

// Computed
const isValid = computed(() => {
  return (
    criteriaScore.value >= 0 &&
    criteriaScore.value <= 100 &&
    resultLimit.value >= 1 &&
    resultLimit.value <= 1000
  )
})

// Methods
function handleScoreChange() {
  scoreError.value = ''

  // Validate score
  if (criteriaScore.value < 0 || criteriaScore.value > 100) {
    scoreError.value = 'Score must be between 0 and 100'
  }

  emitChange()
}

function handleLimitChange() {
  limitError.value = ''

  // Validate limit
  if (resultLimit.value < 1) {
    limitError.value = 'Limit must be at least 1'
  } else if (resultLimit.value > 1000) {
    limitError.value = 'Limit cannot exceed 1000'
  }

  emitChange()
}

function handleFileChange() {
  emitChange()
}

function emitChange() {
  const file = criteriaFileActual.value || null

  // Emit v-model update
  emit('update:modelValue', {
    criteriaScore: criteriaScore.value,
    limit: resultLimit.value,
    criteriaFile: file,
  })

  // Emit detailed change event
  emit('change', {
    criteriaScore: criteriaScore.value,
    limit: resultLimit.value,
    criteriaFile: file,
    valid: isValid.value,
  })
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'success'
  if (score >= 70) return 'primary'
  if (score >= 50) return 'warning'
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
  // Create the template content with enhanced documentation
  const templateContent = `; TOP PRODUCT CRITERIA CONFIGURATION TEMPLATE
; ================================================================
; Format: (can define multiple [Model|Station] sections)
; --------
; [ModelName|StationName]
; "TEST_ITEM" <USL,LSL>  ===> "TargetValue" (Test item names are case-insensitive)
; ================================================================
; Explanation of the fields:
; ---------------------------
; ModelName = DUT model name as defined in the DUT configuration file.
; StationName = Station name as defined in the test plan.
; TEST_ITEM = Uses regex function to determine the same item 
;			  - Exact: "WiFi_TX1_POW_6175_11AX_MCS9_B20"
;			  - Pattern: "WiFi_TX_POW_6175_11AX_MCS9_B20" (matches TX1, TX2, TX3, TX4)
; USL = Upper Specification Limit. If empty: "<,10>", then the higher (>10) the better.
; LSL = Lower Specification Limit. If empty: "<0,>", then the lower (<0) the better.
; TargetValue = Target value to be achieved. If empty, ensure data complies with USL or LSL.
; ================================================================
; Example: HH5K project
; ---------------------
; [HH5K|Wireless_Test_2_5G]
; "WiFi_TX_FIXTURE_OR_DUT_PROBLEM_POW_2437_11N_MCS0_B20" <20,10>  ===> "15"
; "WiFi_TX_FIXTURE_OR_DUT_PROBLEM_POW_5300_11AC_MCS8_B20" <20,10>  ===> "15"
; "WiFi_RX_PER_2462_11B_CCK11_B20" <10,>  ===> "16"
; "WiFi_TX1_POW_5190_11N_MCS7_B40" <19,16>  ===> "17.5"
; 
; [HH5K|Wireless_Test_6G]
; "WiFi_TX_FIXTURE_OR_DUT_PROBLEM_POW_6175_11AX_MCS9_B20" <20,10>  ===> "15"
; "WiFi_TX_POW_6185_11AX_MCS11_B160" <17,14>  ===> "16"
; ================================================================

[ModelName|StationName]
"TEST_ITEM" <USL,LSL>  ===> "TargetValue"
`

  // Create a Blob from the content
  const blob = new Blob([templateContent], { type: 'text/plain;charset=utf-8' })

  // Create a download link
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'top_product_criteria_configuration.ini'

  // Trigger download
  document.body.appendChild(link)
  link.click()

  // Cleanup
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    criteriaScore.value = newValue.criteriaScore
    resultLimit.value = newValue.limit
    if (newValue.criteriaFile) {
      criteriaFile.value = newValue.criteriaFile
    } else {
      criteriaFile.value = null
    }
  },
  { deep: true },
)
</script>

<style scoped>
</style>
