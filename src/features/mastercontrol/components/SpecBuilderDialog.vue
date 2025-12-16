<template>
    <v-dialog :model-value="modelValue" max-width="1400" persistent scrollable
        @update:model-value="emit('update:modelValue', $event)">
        <v-card>
            <v-card-title class="d-flex align-center bg-primary">
                <v-icon start color="white">mdi-file-cog-outline</v-icon>
                <span class="text-white">Spec Builder - Create Custom Specification</span>
                <v-spacer />
                <v-btn-toggle v-model="specFormat" mandatory class="mx-4" density="compact" color="white">
                    <v-btn value="json" size="small">
                        <v-icon start>mdi-code-json</v-icon>
                        JSON
                    </v-btn>
                    <v-btn value="ini" size="small">
                        <v-icon start>mdi-file-document</v-icon>
                        INI
                    </v-btn>
                </v-btn-toggle>
                <v-btn icon="mdi-close" variant="text" color="white" @click="handleClose" />
            </v-card-title>

            <v-card-text class="pa-4">
                <v-row>
                    <!-- Left Panel: Rule Editor -->
                    <v-col cols="12" md="6">
                        <v-card variant="outlined">
                            <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
                                <v-icon start size="small">mdi-plus-circle</v-icon>
                                Add/Edit Spec Rule
                            </v-card-title>
                            <v-card-text>
                                <!-- Test Item Pattern -->
                                <v-text-field v-model="currentRule.testItem" label="Test Item Pattern"
                                    :hint="specFormat === 'json' ? 'e.g., TX_POW_2412_11B_CCK11_B20 or TX_.*_POW_.*' : 'e.g., WiFi_TX._POW_.*'"
                                    persistent-hint clearable variant="outlined" density="comfortable" class="mt-4 mb-3"
                                    prepend-inner-icon="mdi-text-search" />

                                <!-- USL Input -->
                                <v-text-field v-model.number="currentRule.usl" type="number"
                                    label="USL (Upper Spec Limit)" hint="Maximum allowed value" persistent-hint
                                    clearable variant="outlined" density="comfortable" class="mb-3"
                                    prepend-inner-icon="mdi-arrow-up-bold" />

                                <!-- LSL Input -->
                                <v-text-field v-model.number="currentRule.lsl" type="number"
                                    label="LSL (Lower Spec Limit)" hint="Minimum allowed value" persistent-hint
                                    clearable variant="outlined" density="comfortable" class="mb-3"
                                    prepend-inner-icon="mdi-arrow-down-bold" />

                                <!-- Target Input -->
                                <v-text-field v-model.number="currentRule.target" type="number"
                                    label="Target Value (Optional)" hint="Ideal target value (leave empty for midpoint)"
                                    persistent-hint clearable variant="outlined" density="comfortable" class="mb-3"
                                    prepend-inner-icon="mdi-target" />

                                <!-- Gap/Margin -->
                                <v-text-field v-model.number="currentRule.gap"
                                    type="number" label="Gap/Margin" hint="Warning margin threshold" persistent-hint
                                    clearable variant="outlined" density="comfortable" class="mb-4"
                                    prepend-inner-icon="mdi-delta" />

                                <!-- Action Buttons -->
                                <v-row dense>
                                    <v-col cols="6">
                                        <v-btn block color="primary" prepend-icon="mdi-plus" :disabled="!canAddRule"
                                            @click="addRule">
                                            {{ editingIndex !== null ? 'Update' : 'Add' }} Rule
                                        </v-btn>
                                    </v-col>
                                    <v-col cols="6">
                                        <v-btn block variant="outlined" prepend-icon="mdi-cancel"
                                            @click="resetCurrentRule">
                                            Clear
                                        </v-btn>
                                    </v-col>
                                </v-row>
                            </v-card-text>
                        </v-card>

                        <!-- Rules List -->
                        <v-card variant="outlined" class="mt-4">
                            <v-card-title class="text-subtitle-1 bg-grey-lighten-4 d-flex align-center">
                                <v-icon start size="small">mdi-format-list-bulleted</v-icon>
                                Rules ({{ rules.length }})
                                <v-spacer />
                                <v-btn v-if="rules.length > 0" size="small" color="error" variant="text"
                                    prepend-icon="mdi-delete-sweep" @click="clearAllRules">
                                    Clear All
                                </v-btn>
                            </v-card-title>
                            <v-card-text class="pa-0">
                                <v-list v-if="rules.length > 0" density="compact" class="py-0"
                                    style="max-height: 400px; overflow-y: auto;">
                                    <v-list-item v-for="(rule, index) in rules" :key="index"
                                        :class="editingIndex === index ? 'bg-blue-lighten-5' : ''">
                                        <template #prepend>
                                            <v-icon size="small">mdi-file-document-outline</v-icon>
                                        </template>

                                        <v-list-item-title class="text-body-2 font-weight-medium">
                                            {{ rule.testItem }}
                                        </v-list-item-title>
                                        <v-list-item-subtitle class="text-caption">
                                            USL: {{ formatValue(rule.usl) }} | LSL: {{ formatValue(rule.lsl) }} |
                                            Target: {{ formatValue(rule.target) }} | Gap: {{ formatValue(rule.gap) }}
                                        </v-list-item-subtitle>                                        <template #append>
                                            <v-btn icon="mdi-pencil" size="x-small" variant="text"
                                                @click="editRule(index)" />
                                            <v-btn icon="mdi-delete" size="x-small" variant="text" color="error"
                                                @click="removeRule(index)" />
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
                        <v-card variant="outlined" class="sticky-preview">
                            <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
                                <v-icon start size="small">mdi-eye</v-icon>
                                {{ specFormat === 'json' ? 'JSON' : 'INI' }} File Preview
                            </v-card-title>
                            <v-card-text>
                                <v-textarea :model-value="specPreview" readonly variant="outlined" rows="30"
                                    class="monospace-font mt-2" no-resize density="compact" />
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
            </v-card-text>

            <v-divider />

            <v-card-actions class="pa-4">
                <v-btn color="info" prepend-icon="mdi-download" @click="downloadTemplate">
                    Download Empty Template
                </v-btn>

                <v-btn color="success" prepend-icon="mdi-download" :disabled="rules.length === 0"
                    @click="downloadSpecFile">
                    Download Spec File
                </v-btn>

                <v-btn color="primary" prepend-icon="mdi-check" :disabled="rules.length === 0" @click="saveAndUse">
                    Save & Use in Analysis
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
import { ref, computed } from 'vue'
import { downloadJsonSpecTemplate, downloadIniSpecTemplate } from '../utils/templates'

defineProps<{
    modelValue: boolean
}>()

const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    'spec-created': [file: File, format: 'json' | 'ini']
}>()

interface SpecRule {
    testItem: string // test_pattern in JSON
    usl: number | null
    lsl: number | null
    target: number | null
    gap: number | null
}

// State
const specFormat = ref<'json' | 'ini'>('json')
const rules = ref<SpecRule[]>([])
const currentRule = ref<SpecRule>({
    testItem: '',
    usl: null,
    lsl: null,
    target: null,
    gap: null
})
const editingIndex = ref<number | null>(null)

// Computed
const canAddRule = computed(() => {
    return currentRule.value.testItem.trim().length > 0 &&
        (currentRule.value.usl !== null || currentRule.value.lsl !== null)
})

const specPreview = computed(() => {
    if (specFormat.value === 'json') {
        return generateJsonPreview()
    } else {
        return generateIniPreview()
    }
})

// Methods
function generateJsonPreview(): string {
    const spec = rules.value.map(rule => ({
        test_pattern: rule.testItem,
        usl: rule.usl ?? 0,
        lsl: rule.lsl ?? 0,
        target: rule.target ?? 0,
        gap: rule.gap ?? 0
    }))
    return JSON.stringify(spec, null, 2)
}

function generateIniPreview(): string {
    let content = `; MasterControl Multi-DUT Analysis Criteria File
; =================================================
; Format: "PATTERN" <USL,LSL,Target,Gap>
;
; PATTERN - Test item pattern to match (supports regex)
; USL     - Upper Spec Limit
; LSL     - Lower Spec Limit
; Target  - Target value (use 0 for auto-calculate)
; Gap     - Margin/Gap threshold for warnings
; =================================================

[Test_Items]
`

    rules.value.forEach(rule => {
        const usl = rule.usl !== null ? rule.usl.toString() : ''
        const lsl = rule.lsl !== null ? rule.lsl.toString() : ''
        const target = rule.target !== null ? rule.target.toString() : '0'
        const gap = (rule.gap !== null && rule.gap !== undefined) ? rule.gap.toString() : '0'
        content += `"${rule.testItem}" <${usl},${lsl},${target},${gap}>\n`
    })

    return content
}

function formatValue(value: number | null | undefined): string {
    return value !== null && value !== undefined ? value.toString() : 'N/A'
}

function addRule() {
    if (!canAddRule.value) return

    const rule: SpecRule = {
        testItem: currentRule.value.testItem.trim(),
        usl: currentRule.value.usl,
        lsl: currentRule.value.lsl,
        target: currentRule.value.target,
        gap: currentRule.value.gap
    }

    if (editingIndex.value !== null) {
        rules.value[editingIndex.value] = rule
        editingIndex.value = null
    } else {
        rules.value.push(rule)
    }

    resetCurrentRule()
}

function editRule(index: number) {
    const rule = rules.value[index]
    if (!rule) return

    currentRule.value = {
        testItem: rule.testItem,
        usl: rule.usl,
        lsl: rule.lsl,
        target: rule.target,
        gap: rule.gap
    }
    editingIndex.value = index
}

function removeRule(index: number) {
    rules.value.splice(index, 1)
    if (editingIndex.value === index) {
        resetCurrentRule()
    }
}

function clearAllRules() {
    if (confirm('Are you sure you want to clear all rules?')) {
        rules.value = []
        resetCurrentRule()
    }
}

function resetCurrentRule() {
    currentRule.value = {
        testItem: '',
        usl: null,
        lsl: null,
        target: null,
        gap: null
    }
    editingIndex.value = null
}

function downloadTemplate() {
    if (specFormat.value === 'json') {
        downloadJsonSpecTemplate()
    } else {
        downloadIniSpecTemplate()
    }
}

function downloadSpecFile() {
    const content = specPreview.value
    const blob = new Blob([content], {
        type: specFormat.value === 'json' ? 'application/json' : 'text/plain'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `custom_spec.${specFormat.value}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

function saveAndUse() {
    const content = specPreview.value
    const blob = new Blob([content], {
        type: specFormat.value === 'json' ? 'application/json' : 'text/plain'
    })
    const file = new File([blob], `custom_spec.${specFormat.value}`, {
        type: specFormat.value === 'json' ? 'application/json' : 'text/plain'
    })
    emit('spec-created', file, specFormat.value)
    handleClose()
}

function handleClose() {
    emit('update:modelValue', false)
}
</script>

<style scoped>
.monospace-font :deep(textarea) {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
}

.sticky-preview {
    position: sticky;
}
</style>
