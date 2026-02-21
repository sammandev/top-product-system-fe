<template>
  <v-dialog :model-value="modelValue" max-width="1200" persistent scrollable
    @update:model-value="emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="d-flex align-center bg-primary">
        <v-icon start>mdi-cog-outline</v-icon>
        <span class="text-white">Criteria Builder</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" color="white" @click="handleClose" />
      </v-card-title>

      <v-card-text class="pa-4">
        <v-row>
          <!-- Left Panel: Rule Editor -->
          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
                <v-icon start size="small">mdi-plus-circle</v-icon>
                Add/Edit Rule
              </v-card-title>
              <v-card-text>
                <!-- Test Item Input -->
                <v-text-field v-model="currentRule.testItem" label="Test Item Pattern"
                  hint="Enter test item name or regex pattern (e.g., WiFi_PA1_.*)" persistent-hint clearable
                  variant="outlined" density="comfortable" class="mt-4 mb-3" prepend-inner-icon="mdi-text-search" />

                <!-- UCL Input -->
                <v-text-field v-model.number="currentRule.ucl" type="number" label="UCL (Upper Criteria Limit)"
                  hint="Leave empty if no upper limit" persistent-hint clearable variant="outlined"
                  density="comfortable" class="mb-3" prepend-inner-icon="mdi-arrow-up-bold" />

                <!-- LCL Input -->
                <v-text-field v-model.number="currentRule.lcl" type="number" label="LCL (Lower Criteria Limit)"
                  hint="Leave empty if no lower limit" persistent-hint clearable variant="outlined"
                  density="comfortable" class="mb-3" prepend-inner-icon="mdi-arrow-down-bold" />

                <!-- Target Input -->
                <v-text-field v-model.number="currentRule.target" type="number" label="Target Value"
                  hint="Leave empty to use median or (UCL+LCL)/2" persistent-hint clearable variant="outlined"
                  density="comfortable" class="mb-4" prepend-inner-icon="mdi-target" />

                <!-- Action Buttons -->
                <v-row dense>
                  <v-col cols="6">
                    <v-btn block color="primary" prepend-icon="mdi-plus" :disabled="!canAddRule" @click="addRule">
                      {{ editingIndex !== null ? 'Update' : 'Add' }} Rule
                    </v-btn>
                  </v-col>
                  <v-col cols="6">
                    <v-btn block variant="outlined" prepend-icon="mdi-cancel" @click="resetCurrentRule">
                      Clear
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <!-- Rules List -->
            <v-card variant="outlined" class="mt-4">
              <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
                <v-icon start size="small">mdi-format-list-bulleted</v-icon>
                Rules ({{ rules.length }})
              </v-card-title>
              <v-card-text class="pa-0">
                <v-list v-if="rules.length > 0" density="compact" class="py-0">
                  <v-list-item v-for="(rule, index) in rules" :key="index"
                    :class="editingIndex === index ? 'bg-blue-lighten-5' : ''">
                    <template #prepend>
                      <v-icon size="small">mdi-file-document-outline</v-icon>
                    </template>

                    <v-list-item-title class="text-body-2 font-weight-medium">
                      {{ rule.testItem }}
                    </v-list-item-title>
                    <v-list-item-subtitle class="text-caption">
                      UCL: {{ formatValue(rule.ucl) }} | LCL: {{ formatValue(rule.lcl) }} | Target: {{
                        formatValue(rule.target) }}
                    </v-list-item-subtitle>

                    <template #append>
                      <v-btn icon="mdi-pencil" size="x-small" variant="text" @click="editRule(index)" />
                      <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="removeRule(index)" />
                    </template>
                  </v-list-item>
                </v-list>

                <v-card-text v-else class="text-center text-caption text-medium-emphasis py-4">
                  No rules added yet. Add your first rule above.
                </v-card-text>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Right Panel: Preview -->
          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-title class="text-subtitle-1 bg-grey-lighten-4 d-flex align-center">
                <v-icon start size="small">mdi-eye</v-icon>
                JSON Preview
              </v-card-title>
              <v-card-text>
                <v-textarea :model-value="jsonPreview" readonly variant="outlined" rows="25" class="monospace-font mt-2"
                  no-resize density="compact" />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn color="success" prepend-icon="mdi-download" :disabled="rules.length === 0" @click="downloadFile">
          Download JSON File
        </v-btn>

        <v-btn color="primary" prepend-icon="mdi-check" :disabled="rules.length === 0" @click="saveAndUse">
          Save & Use
        </v-btn>

        <v-spacer />

        <v-btn variant="outlined" @click="handleClose">
          Cancel
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  modelValue: boolean
  availableTestItems?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'criteria-created': [file: File]
}>()

// UPDATED: Interface with UCL/LCL naming
interface CriteriaRule {
  testItem: string
  ucl: number | null
  lcl: number | null
  target: number | null
}

// State
const rules = ref<CriteriaRule[]>([])
const currentRule = ref<CriteriaRule>({
  testItem: '',
  ucl: null,
  lcl: null,
  target: null,
})
const editingIndex = ref<number | null>(null)

// Available test items for autocomplete
// const availableTestItems = computed(() => props.availableTestItems || [])

// Computed
const canAddRule = computed(() => {
  return currentRule.value.testItem.trim().length > 0
})

// JSON preview
const jsonPreview = computed(() => {
  const criteria = rules.value.map((rule) => ({
    test_item: rule.testItem,
    ucl: rule.ucl,
    lcl: rule.lcl,
    target: rule.target,
  }))
  return JSON.stringify({ criteria }, null, 2)
})

// Methods
const formatValue = (value: number | null): string => {
  return value !== null ? value.toString() : 'N/A'
}

const addRule = () => {
  if (!canAddRule.value) return

  const rule: CriteriaRule = {
    testItem: currentRule.value.testItem.trim(),
    ucl: currentRule.value.ucl,
    lcl: currentRule.value.lcl,
    target: currentRule.value.target,
  }

  if (editingIndex.value !== null) {
    // Update existing rule
    rules.value[editingIndex.value] = rule
    editingIndex.value = null
  } else {
    // Add new rule
    rules.value.push(rule)
  }

  resetCurrentRule()
}

const editRule = (index: number) => {
  const rule = rules.value[index]
  if (!rule) return

  currentRule.value = {
    testItem: rule.testItem,
    ucl: rule.ucl,
    lcl: rule.lcl,
    target: rule.target,
  }
  editingIndex.value = index
}

const removeRule = (index: number) => {
  rules.value.splice(index, 1)
  if (editingIndex.value === index) {
    resetCurrentRule()
  }
}

const resetCurrentRule = () => {
  currentRule.value = {
    testItem: '',
    ucl: null,
    lcl: null,
    target: null,
  }
  editingIndex.value = null
}

// Download JSON file
const downloadFile = () => {
  const content = jsonPreview.value
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'criteria_upload_log.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Save and use JSON file
const saveAndUse = () => {
  const content = jsonPreview.value
  const blob = new Blob([content], { type: 'application/json' })
  const file = new File([blob], 'criteria_upload_log.json', { type: 'application/json' })
  emit('criteria-created', file)
  handleClose()
}

const handleClose = () => {
  resetCurrentRule()
  emit('update:modelValue', false)
}
</script>

<style scoped>
.monospace-font :deep(textarea) {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}
</style>
