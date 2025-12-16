<template>
  <v-card>
    <v-card-title>
      <v-icon start>mdi-compare</v-icon>
      Comparison Mode
    </v-card-title>

    <v-card-text>
      <!-- Mode Selection -->
      <v-radio-group :model-value="modelValue.mode" @update:model-value="(value) => updateMode(value as ComparisonMode)"
        hide-details>
        <v-radio value="columns">
          <template #label>
            <div>
              <div class="font-weight-medium">Compare Columns</div>
              <div class="text-caption text-medium-emphasis">
                Compare which columns exist in each file (structure comparison)
              </div>
            </div>
          </template>
        </v-radio>

        <v-radio value="rows" class="mt-3">
          <template #label>
            <div>
              <div class="font-weight-medium">Compare Rows</div>
              <div class="text-caption text-medium-emphasis">
                Compare data rows using join keys (data comparison)
              </div>
            </div>
          </template>
        </v-radio>

        <v-radio value="both" class="mt-3">
          <template #label>
            <div>
              <div class="font-weight-medium">Compare Both</div>
              <div class="text-caption text-medium-emphasis">
                Full comparison with structure + data differences
              </div>
            </div>
          </template>
        </v-radio>
      </v-radio-group>

      <!-- Join Key Configuration (for rows/both mode) -->
      <v-expand-transition>
        <div v-if="needsJoinKeys" class="mt-6">
          <v-divider class="mb-4" />

          <div class="text-subtitle-2 mb-3">
            <v-icon start size="small">mdi-key</v-icon>
            Join Keys Configuration
          </div>

          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            <template #prepend>
              <v-icon>mdi-information</v-icon>
            </template>
            <div class="text-caption">
              Select the columns to use as join keys for matching rows between the two files.
              These should be unique identifiers (e.g., ID, ISN, Serial Number).
            </div>
          </v-alert>

          <v-row>
            <!-- File A Join Key -->
            <v-col cols="12" md="6">
              <v-select :model-value="modelValue.joinKeyA" :items="columnsA" label="File A Join Key" variant="outlined"
                density="comfortable" prepend-inner-icon="mdi-key-variant" :error-messages="joinKeyAError"
                @update:model-value="(value) => updateJoinKeyA(value)">
                <template #prepend>
                  <v-chip size="small" color="blue" variant="tonal">
                    A
                  </v-chip>
                </template>
              </v-select>
            </v-col>

            <!-- File B Join Key -->
            <v-col cols="12" md="6">
              <v-select :model-value="modelValue.joinKeyB" :items="columnsB" label="File B Join Key" variant="outlined"
                density="comfortable" prepend-inner-icon="mdi-key-variant" :error-messages="joinKeyBError"
                @update:model-value="(value) => updateJoinKeyB(value)">
                <template #prepend>
                  <v-chip size="small" color="orange" variant="tonal">
                    B
                  </v-chip>
                </template>
              </v-select>
            </v-col>
          </v-row>

          <!-- Join Keys Match Indicator -->
          <v-alert v-if="joinKeysMatched" type="success" variant="tonal" density="compact" class="mt-2">
            <template #prepend>
              <v-icon>mdi-check-circle</v-icon>
            </template>
            <div class="text-caption">
              Join keys configured: <strong>{{ modelValue.joinKeyA }}</strong> ↔ <strong>{{ modelValue.joinKeyB
                }}</strong>
            </div>
          </v-alert>

          <!-- Validation Warning -->
          <v-alert v-else-if="modelValue.joinKeyA || modelValue.joinKeyB" type="warning" variant="tonal"
            density="compact" class="mt-2">
            <template #prepend>
              <v-icon>mdi-alert</v-icon>
            </template>
            <div class="text-caption">
              Both join keys must be selected to compare rows
            </div>
          </v-alert>
        </div>
      </v-expand-transition>

      <!-- Advanced Options (Optional) -->
      <v-expand-transition>
        <div v-if="showAdvancedOptions" class="mt-6">
          <v-divider class="mb-4" />

          <div class="text-subtitle-2 mb-3">
            <v-icon start size="small">mdi-cog</v-icon>
            Advanced Options
          </div>

          <v-checkbox v-model="caseSensitive" label="Case-sensitive comparison" density="compact" hide-details
            @update:model-value="(value) => updateCaseSensitive(value ?? false)" />

          <v-text-field v-if="needsJoinKeys" v-model.number="numericTolerance" label="Numeric Tolerance" type="number"
            variant="outlined" density="compact" hint="Tolerance for comparing numeric values (default: 0.0001)"
            persistent-hint step="0.0001" min="0" class="mt-3"
            @update:model-value="(value) => updateNumericTolerance(Number(value))" />
        </div>
      </v-expand-transition>

      <!-- Toggle Advanced Options -->
      <div class="mt-4">
        <v-btn size="small" variant="text" @click="showAdvancedOptions = !showAdvancedOptions">
          {{ showAdvancedOptions ? 'Hide' : 'Show' }} Advanced Options
          <v-icon end>
            {{ showAdvancedOptions ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
          </v-icon>
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Types
export type ComparisonMode = 'columns' | 'rows' | 'both'

export interface ComparisonConfig {
  mode: ComparisonMode
  joinKeyA: string
  joinKeyB: string
  caseSensitive?: boolean
  numericTolerance?: number
}

// Props
interface Props {
  modelValue: ComparisonConfig
  columnsA: string[]
  columnsB: string[]
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: ComparisonConfig]
}>()

// State
const showAdvancedOptions = ref(false)
const caseSensitive = ref(props.modelValue.caseSensitive ?? false)
const numericTolerance = ref(props.modelValue.numericTolerance ?? 0.0001)

// Computed
const needsJoinKeys = computed(() => {
  return props.modelValue.mode === 'rows' || props.modelValue.mode === 'both'
})

const joinKeysMatched = computed(() => {
  return needsJoinKeys.value &&
    props.modelValue.joinKeyA &&
    props.modelValue.joinKeyB
})

const joinKeyAError = computed(() => {
  if (needsJoinKeys.value && !props.modelValue.joinKeyA) {
    return 'Join key is required for row comparison'
  }
  return undefined
})

const joinKeyBError = computed(() => {
  if (needsJoinKeys.value && !props.modelValue.joinKeyB) {
    return 'Join key is required for row comparison'
  }
  return undefined
})

// Methods
function updateMode(mode: ComparisonMode) {
  emit('update:modelValue', {
    ...props.modelValue,
    mode
  })
}

function updateJoinKeyA(value: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    joinKeyA: value
  })
}

function updateJoinKeyB(value: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    joinKeyB: value
  })
}

function updateCaseSensitive(value: boolean) {
  emit('update:modelValue', {
    ...props.modelValue,
    caseSensitive: value
  })
}

function updateNumericTolerance(value: number) {
  emit('update:modelValue', {
    ...props.modelValue,
    numericTolerance: value
  })
}
</script>

<style scoped>
:deep(.v-radio .v-label) {
  opacity: 1;
}
</style>
