<template>
    <v-dialog v-model="dialogOpen" :fullscreen="isFullscreen" :max-width="isFullscreen ? undefined : 650" scrollable
        persistent :transition="isFullscreen ? 'dialog-bottom-transition' : undefined">
        <v-card :class="isFullscreen ? 'd-flex flex-column' : ''"
            :style="isFullscreen ? 'height: 100vh; overflow: hidden;' : ''">
            <v-card-title class="d-flex align-center bg-primary">
                <v-icon start color="white">mdi-cog-outline</v-icon>
                <span class="text-white">Configure Scoring</span>
                <v-spacer />
                <v-chip size="small" color="white" variant="outlined" class="ml-2">
                    {{ scoringConfigs.length }} items
                </v-chip>
                <v-btn :icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'" variant="text" color="white"
                    @click="isFullscreen = !isFullscreen" class="ml-1" />
                <v-btn icon="mdi-close" variant="text" color="white" @click="handleCancel" />
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-0" :class="isFullscreen ? 'flex-grow-1' : ''"
                :style="isFullscreen ? 'overflow: hidden;' : 'height: 600px;'">
                <div style="height: 100%; overflow: hidden; display: flex; flex-direction: column;">
                    <div class="pa-3 pb-2">
                        <v-text-field v-model="searchQuery" label="Search test items" prepend-inner-icon="mdi-magnify"
                            variant="outlined" density="compact" clearable hide-details />
                    </div>

                    <!-- Quick Select Buttons -->
                    <div class="px-3 pb-2 d-flex gap-1 flex-wrap">
                        <span class="text-caption text-medium-emphasis">Select:</span>
                        <v-btn size="x-small" variant="tonal" color="info" @click="selectDisplayedItems"
                            :disabled="filteredConfigs.length === 0">
                            Displayed ({{ filteredConfigs.length }})
                        </v-btn>
                        <v-btn size="x-small" variant="tonal" color="success" @click="selectCriteriaItems">
                            Criteria
                        </v-btn>
                        <v-btn size="x-small" variant="tonal" color="warning" @click="selectNonCriteriaItems">
                            Non-Criteria
                        </v-btn>
                        <v-btn size="x-small" variant="outlined" color="error" @click="clearSelection">
                            Clear
                        </v-btn>
                    </div>

                    <!-- Bulk Actions -->
                    <div class="px-3 pb-2 d-flex gap-1 flex-wrap align-center">
                        <v-divider class="mb-1" />
                        <v-btn size="x-small" variant="flat" color="secondary" prepend-icon="mdi-tune-variant"
                            @click="openBulkScoringConfig" :disabled="selectedItemNames.size === 0">
                            Bulk Config ({{ selectedItemNames.size }})
                        </v-btn>
                        <v-btn size="x-small" variant="tonal" color="grey" prepend-icon="mdi-restore" @click="resetAll">
                            Reset All
                        </v-btn>
                    </div>

                    <v-divider />

                    <!-- Selected Count Info -->
                    <div v-if="selectedItemNames.size > 0" class="px-3 py-1 bg-primary-lighten-5">
                        <span class="text-caption font-weight-bold">
                            {{ selectedItemNames.size }} selected
                        </span>
                    </div>

                    <!-- Test Items List -->
                    <div class="flex-grow-1" style="overflow-y: auto;">
                        <v-list density="compact" class="py-0">
                            <v-list-item v-for="config in filteredConfigs" :key="config.test_item_name"
                                @click="toggleItemSelection(config.test_item_name)" class="py-1 test-item-row">
                                <template #prepend>
                                    <v-checkbox-btn :model-value="selectedItemNames.has(config.test_item_name)"
                                        @click.stop="toggleItemSelection(config.test_item_name)" density="compact" />
                                </template>
                                <template #default>
                                    <div class="d-flex align-center justify-space-between w-100">
                                        <span class="text-body-2 text-truncate" style="max-width: 180px;"
                                            :title="config.test_item_name">
                                            {{ config.test_item_name }}
                                        </span>
                                        <div class="d-flex align-center gap-1">
                                            <!-- Scoring Type Button (opens per-item config) -->
                                            <v-btn size="x-small" variant="tonal"
                                                :color="getScoringTypeColor(config.scoring_type)"
                                                @click.stop="openSingleItemConfig(config.test_item_name)"
                                                class="scoring-config-btn">
                                                {{ getScoringTypeLabel(config.scoring_type) }}
                                                <v-icon end size="x-small">mdi-chevron-down</v-icon>
                                            </v-btn>
                                            <!-- Criteria / Non-Criteria chip -->
                                            <v-chip :color="getItemTypeColor(config.test_item_name)" size="x-small"
                                                variant="tonal">
                                                {{ getItemTypeLabel(config.test_item_name) }}
                                            </v-chip>
                                        </div>
                                    </div>
                                </template>
                            </v-list-item>
                        </v-list>

                        <div v-if="filteredConfigs.length === 0" class="pa-4 text-center text-medium-emphasis">
                            No test items found
                        </div>
                    </div>
                </div>
            </v-card-text>

            <v-divider />

            <v-card-actions class="flex-shrink-0">
                <v-btn variant="text" color="warning" prepend-icon="mdi-restore" @click="resetAll">
                    Reset All
                </v-btn>
                <v-spacer />
                <v-btn variant="text" @click="handleCancel">Cancel</v-btn>
                <v-btn color="primary" variant="elevated" prepend-icon="mdi-check" @click="handleApply">
                    Apply
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- Bulk Scoring Configuration Dialog -->
    <v-dialog v-model="bulkScoringDialog" max-width="550" persistent>
        <v-card>
            <v-card-title class="d-flex align-center bg-secondary">
                <v-icon class="mr-2">mdi-tune-variant</v-icon>
                Bulk Configure Scoring
            </v-card-title>
            <v-card-subtitle class="bg-secondary py-3">
                Apply to {{ selectedItemNames.size }} selected test item(s)
            </v-card-subtitle>

            <v-card-text class="pa-4">
                <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                    This will apply the selected scoring algorithm, policy, and weight to all
                    {{ selectedItemNames.size }} selected test items.
                </v-alert>

                <!-- Scoring Type Selection -->
                <v-select v-model="bulkScoringType" :items="scoringTypeOptions" label="Scoring Type" variant="outlined"
                    density="comfortable" class="mb-3" />

                <!-- Scoring Type Description -->
                <v-alert :type="getScoringAlertType(bulkScoringType)" variant="tonal" density="compact" class="mb-4">
                    {{ getScoringTypeDescription(bulkScoringType) }}
                </v-alert>

                <!-- Policy (for asymmetrical) -->
                <v-select v-if="bulkScoringType === 'asymmetrical'" v-model="bulkPolicy" :items="policyOptions"
                    label="Policy" variant="outlined" density="comfortable" class="mb-3" />

                <!-- Target (for asymmetrical) -->
                <v-text-field v-if="bulkScoringType === 'asymmetrical'" v-model.number="bulkTarget"
                    label="Custom Target (optional)" type="number" variant="outlined" density="comfortable" class="mb-3"
                    hint="Leave empty for auto-detection (midpoint of UCL/LCL)" persistent-hint />

                <!-- Weight -->
                <v-text-field v-model.number="bulkWeight" label="Weight" type="number" variant="outlined"
                    density="comfortable" min="0" max="10" step="0.1"
                    hint="Weight for these test items in overall score calculation (default: 1.0)" persistent-hint />
            </v-card-text>

            <v-divider />

            <v-card-actions class="pa-3">
                <v-btn color="grey" variant="outlined" @click="bulkScoringDialog = false">
                    Cancel
                </v-btn>
                <v-spacer />
                <v-btn color="primary" variant="flat" @click="applyBulkScoringConfig">
                    Apply to {{ selectedItemNames.size }} Items
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- Single Item Scoring Configuration Dialog -->
    <v-dialog v-model="singleItemScoringDialog" max-width="500" persistent>
        <v-card v-if="singleConfigItem">
            <v-card-title class="d-flex align-center bg-info">
                <v-icon class="mr-2">mdi-tune</v-icon>
                Configure Scoring
            </v-card-title>
            <v-card-subtitle class="bg-info py-3 text-truncate">
                {{ singleConfigItem }}
            </v-card-subtitle>

            <v-card-text class="pa-4">
                <!-- Scoring Type Selection -->
                <v-select :model-value="getSingleDialogConfig()?.scoring_type"
                    @update:model-value="updateSingleDialogScoringType($event)" :items="scoringTypeOptions"
                    label="Scoring Type" variant="outlined" density="comfortable" class="mb-3" />

                <!-- Description -->
                <v-alert :type="getScoringAlertType(getSingleDialogConfig()?.scoring_type ?? 'symmetrical')"
                    variant="tonal" density="compact" class="mb-4">
                    {{ getScoringTypeDescription(getSingleDialogConfig()?.scoring_type ?? 'symmetrical') }}
                </v-alert>

                <!-- Policy (for asymmetrical) -->
                <v-select v-if="getSingleDialogConfig()?.scoring_type === 'asymmetrical'"
                    :model-value="getSingleDialogConfig()?.policy"
                    @update:model-value="updateSingleDialogPolicy($event)" :items="policyOptions" label="Policy"
                    variant="outlined" density="comfortable" class="mb-3" />

                <!-- Target (for asymmetrical) -->
                <v-text-field v-if="getSingleDialogConfig()?.scoring_type === 'asymmetrical'"
                    :model-value="getSingleDialogConfig()?.target"
                    @update:model-value="updateSingleDialogTarget($event ? Number($event) : undefined)"
                    label="Custom Target (optional)" type="number" variant="outlined" density="comfortable" class="mb-3"
                    hint="Leave empty for auto-detection (midpoint of UCL/LCL)" persistent-hint />

                <!-- Weight -->
                <v-text-field :model-value="getSingleDialogConfig()?.weight ?? 1.0"
                    @update:model-value="updateSingleDialogWeight($event ? Number($event) : 1.0)" label="Weight"
                    type="number" variant="outlined" density="comfortable" min="0" max="10" step="0.1"
                    hint="Weight for this test item in overall score calculation" persistent-hint />

                <!-- Item Specs Info -->
                <v-card variant="tonal" class="mt-4" v-if="singleDialogSpecs">
                    <v-card-text class="py-2">
                        <div class="text-caption text-medium-emphasis mb-1">Item Specifications</div>
                        <v-row dense>
                            <v-col cols="4">
                                <div class="text-caption">UCL</div>
                                <div class="font-weight-medium">{{ singleDialogSpecs.usl ?? 'N/A' }}</div>
                            </v-col>
                            <v-col cols="4">
                                <div class="text-caption">LCL</div>
                                <div class="font-weight-medium">{{ singleDialogSpecs.lsl ?? 'N/A' }}</div>
                            </v-col>
                            <v-col cols="4">
                                <div class="text-caption">Sample Value</div>
                                <div class="font-weight-medium">{{ singleDialogSpecs.value ?? 'N/A' }}</div>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>
            </v-card-text>

            <v-divider />

            <v-card-actions class="pa-3">
                <v-spacer />
                <v-btn color="primary" variant="flat" @click="singleItemScoringDialog = false">
                    Done
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { RescoreScoringConfig, ParsedTestItemEnhanced } from '@/features/dut_logs/composables/useTestLogUpload'

interface Props {
    modelValue: boolean
    testItems: ParsedTestItemEnhanced[]
    existingConfigs?: RescoreScoringConfig[]
}

interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'apply', configs: RescoreScoringConfig[]): void
}

const props = withDefaults(defineProps<Props>(), {
    existingConfigs: () => []
})

const emit = defineEmits<Emits>()

const dialogOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

// Local state
const isFullscreen = ref(false)
const searchQuery = ref('')
const selectedItemNames = ref<Set<string>>(new Set())
const scoringConfigs = ref<RescoreScoringConfig[]>([])

// Single item scoring dialog (popup from clicking scoring type button)
const singleItemScoringDialog = ref(false)
const singleConfigItem = ref<string | null>(null)

// Bulk scoring dialog
const bulkScoringDialog = ref(false)
const bulkScoringType = ref<RescoreScoringConfig['scoring_type']>('symmetrical')
const bulkPolicy = ref<RescoreScoringConfig['policy']>('symmetrical')
const bulkTarget = ref<number | undefined>(undefined)
const bulkWeight = ref(1.0)

// Scoring type options
const scoringTypeOptions = [
    { title: 'Symmetrical (Linear)', value: 'symmetrical' },
    { title: 'Asymmetrical (Custom Target)', value: 'asymmetrical' },
    { title: 'PER / Mask (Near-Zero)', value: 'per_mask' },
    { title: 'EVM (Lower-is-Better)', value: 'evm' },
    { title: 'Throughput (Higher-is-Better)', value: 'throughput' },
    { title: 'Binary (PASS/FAIL)', value: 'binary' },
]

const policyOptions = [
    { title: 'Symmetrical (Centered)', value: 'symmetrical' },
    { title: 'Higher is Better', value: 'higher' },
    { title: 'Lower is Better', value: 'lower' },
]

// Initialize scoring configs from test items
function initializeConfigs() {
    const existingMap = new Map<string, RescoreScoringConfig>()
    props.existingConfigs.forEach(cfg => existingMap.set(cfg.test_item_name, cfg))

    const allNames = new Set<string>()
    props.testItems.forEach(item => allNames.add(item.test_item))

    scoringConfigs.value = Array.from(allNames).map(name => {
        if (existingMap.has(name)) {
            return { ...existingMap.get(name)! }
        }
        return {
            test_item_name: name,
            scoring_type: detectScoringType(name) as RescoreScoringConfig['scoring_type'],
            enabled: true,
            weight: 1.0,
            policy: 'symmetrical' as const,
        }
    })
}

// Auto-detect scoring type by test item name patterns
function detectScoringType(name: string): string {
    const upper = name.toUpperCase()
    if (upper.includes('PER_') || upper.includes('_PER') || upper.includes('MASK')) return 'per_mask'
    if (upper.includes('EVM')) return 'evm'
    if (upper.includes('THROUGHPUT') || upper.includes('THRUPUT') || upper.includes('TPUT')) return 'throughput'
    return 'symmetrical'
}

// Filtered configs based on search
const filteredConfigs = computed(() => {
    if (!searchQuery.value) return scoringConfigs.value
    const query = searchQuery.value.toLowerCase()
    return scoringConfigs.value.filter(c => c.test_item_name.toLowerCase().includes(query))
})

// Helper: check if item is criteria (has UCL or LCL)
function isItemCriteria(name: string): boolean {
    const item = props.testItems.find(t => t.test_item === name)
    return item ? (item.usl !== null || item.lsl !== null) : false
}

function getItemTypeLabel(name: string): string {
    return isItemCriteria(name) ? 'Criteria' : 'Non-Criteria'
}

function getItemTypeColor(name: string): string {
    return isItemCriteria(name) ? 'success' : 'warning'
}

// ============================================
// Selection management (checkbox multi-select)
// ============================================

function toggleItemSelection(name: string) {
    const newSet = new Set(selectedItemNames.value)
    if (newSet.has(name)) {
        newSet.delete(name)
    } else {
        newSet.add(name)
    }
    selectedItemNames.value = newSet
}

function selectDisplayedItems() {
    const newSet = new Set(selectedItemNames.value)
    filteredConfigs.value.forEach(c => newSet.add(c.test_item_name))
    selectedItemNames.value = newSet
}

function selectCriteriaItems() {
    const newSet = new Set(selectedItemNames.value)
    scoringConfigs.value.forEach(c => {
        if (isItemCriteria(c.test_item_name)) {
            newSet.add(c.test_item_name)
        }
    })
    selectedItemNames.value = newSet
}

function selectNonCriteriaItems() {
    const newSet = new Set(selectedItemNames.value)
    scoringConfigs.value.forEach(c => {
        if (!isItemCriteria(c.test_item_name)) {
            newSet.add(c.test_item_name)
        }
    })
    selectedItemNames.value = newSet
}

function clearSelection() {
    selectedItemNames.value = new Set()
}

// ============================================
// Single item config dialog (popup from scoring type button)
// ============================================

function openSingleItemConfig(name: string) {
    singleConfigItem.value = name
    singleItemScoringDialog.value = true
}

function getSingleDialogConfig(): RescoreScoringConfig | undefined {
    if (!singleConfigItem.value) return undefined
    return scoringConfigs.value.find(c => c.test_item_name === singleConfigItem.value)
}

const singleDialogSpecs = computed(() => {
    if (!singleConfigItem.value) return null
    return props.testItems.find(item => item.test_item === singleConfigItem.value) || null
})

function updateSingleDialogScoringType(type: RescoreScoringConfig['scoring_type']) {
    const config = getSingleDialogConfig()
    if (config) {
        config.scoring_type = type
        if (type !== 'asymmetrical') config.policy = 'symmetrical'
    }
}

function updateSingleDialogPolicy(policy: RescoreScoringConfig['policy']) {
    const config = getSingleDialogConfig()
    if (config) config.policy = policy
}

function updateSingleDialogTarget(target: number | undefined) {
    const config = getSingleDialogConfig()
    if (config) config.target = target
}

function updateSingleDialogWeight(weight: number) {
    const config = getSingleDialogConfig()
    if (config) config.weight = weight
}

// ============================================
// Bulk scoring config dialog
// ============================================

function openBulkScoringConfig() {
    if (selectedItemNames.value.size === 0) return
    bulkScoringType.value = 'symmetrical'
    bulkPolicy.value = 'symmetrical'
    bulkTarget.value = undefined
    bulkWeight.value = 1.0
    bulkScoringDialog.value = true
}

function applyBulkScoringConfig() {
    scoringConfigs.value.forEach(c => {
        if (selectedItemNames.value.has(c.test_item_name)) {
            c.scoring_type = bulkScoringType.value
            c.weight = bulkWeight.value
            if (bulkScoringType.value === 'asymmetrical') {
                c.policy = bulkPolicy.value
                c.target = bulkTarget.value
            } else {
                c.policy = 'symmetrical'
                c.target = undefined
            }
        }
    })
    bulkScoringDialog.value = false
}

// ============================================
// Global actions
// ============================================

function resetAll() {
    scoringConfigs.value.forEach(c => {
        c.scoring_type = detectScoringType(c.test_item_name) as RescoreScoringConfig['scoring_type']
        c.weight = 1.0
        c.policy = 'symmetrical'
        c.target = undefined
    })
}

// Handlers
function handleApply() {
    emit('apply', [...scoringConfigs.value])
    dialogOpen.value = false
}

function handleCancel() {
    dialogOpen.value = false
}

// Helpers
function getScoringTypeColor(type: string): string {
    switch (type) {
        case 'symmetrical': return 'blue'
        case 'asymmetrical': return 'purple'
        case 'per_mask': return 'orange'
        case 'evm': return 'teal'
        case 'throughput': return 'green'
        case 'binary': return 'grey'
        default: return 'blue'
    }
}

function getScoringTypeLabel(type: string): string {
    switch (type) {
        case 'symmetrical': return 'Sym'
        case 'asymmetrical': return 'Asym'
        case 'per_mask': return 'Near Zero'
        case 'evm': return 'EVM'
        case 'throughput': return 'TPUT'
        case 'binary': return 'Bin'
        default: return type
    }
}

function getScoringAlertType(type: string): 'info' | 'warning' | 'success' {
    switch (type) {
        case 'asymmetrical': return 'warning'
        case 'per_mask':
        case 'evm': return 'success'
        default: return 'info'
    }
}

function getScoringTypeDescription(type: string): string {
    switch (type) {
        case 'symmetrical':
            return 'Linear scoring centered on midpoint of UCL/LCL. Score decreases proportionally as value moves toward limits.'
        case 'asymmetrical':
            return 'Custom target with directional bias. Use Policy to prefer higher or lower values relative to the target.'
        case 'per_mask':
            return 'Near-zero scoring for PER/MASK items. Zero value = perfect score. Score decreases as value increases toward UCL.'
        case 'evm':
            return 'EVM scoring where lower values are better. Score based on how far value is from UCL (upper limit).'
        case 'throughput':
            return 'Higher-is-better scoring with LCL as minimum. Score increases as value rises above the lower limit.'
        case 'binary':
            return 'Simple PASS/FAIL scoring. PASS = 10.0, FAIL = 0.0. No intermediate scores.'
        default:
            return 'Select a scoring type.'
    }
}

// Watch dialog open to initialize
watch(() => props.modelValue, (isOpen) => {
    if (isOpen) {
        initializeConfigs()
        selectedItemNames.value = new Set()
        searchQuery.value = ''
    }
})
</script>

<style scoped>
.gap-1 {
    gap: 0.25rem;
}

.test-item-row {
    cursor: pointer;
    transition: background-color 0.2s;
}

.test-item-row:hover {
    background-color: rgba(0, 0, 0, 0.04);
}

.scoring-config-btn {
    text-transform: none;
    letter-spacing: 0;
}
</style>
