<template>
    <v-dialog v-model="dialogOpen" max-width="1000" scrollable persistent>
        <v-card>
            <v-card-title class="d-flex align-center bg-primary">
                <v-icon start color="white">mdi-cog-outline</v-icon>
                <span class="text-white">Configure Scoring</span>
                <v-spacer />
                <v-chip size="small" color="white" variant="outlined" class="ml-2">
                    {{ scoringConfigs.length }} items
                </v-chip>
                <v-btn icon="mdi-close" variant="text" color="white" @click="handleCancel" />
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-0" style="height: 600px;">
                <v-row no-gutters style="height: 100%;">
                    <!-- Left Panel: Test Items List -->
                    <v-col cols="5" class="border-e" style="height: 100%; overflow: hidden; display: flex; flex-direction: column;">
                        <div class="pa-3 pb-2">
                            <v-text-field v-model="searchQuery" label="Search test items"
                                prepend-inner-icon="mdi-magnify" variant="outlined" density="compact"
                                clearable hide-details />
                        </div>

                        <!-- Bulk Actions -->
                        <div class="px-3 pb-2 d-flex gap-1 flex-wrap">
                            <v-btn size="x-small" variant="tonal" color="blue"
                                @click="setAllScoringType('symmetrical')">
                                All Symmetrical
                            </v-btn>
                            <v-btn size="x-small" variant="tonal" color="purple"
                                @click="setAllScoringType('asymmetrical')">
                                All Asymmetrical
                            </v-btn>
                            <v-btn size="x-small" variant="tonal" color="grey"
                                @click="resetAll">
                                Reset All
                            </v-btn>
                        </div>

                        <v-divider />

                        <!-- Test Items List -->
                        <div class="flex-grow-1" style="overflow-y: auto;">
                            <v-list density="compact" class="py-0">
                                <v-list-item v-for="config in filteredConfigs" :key="config.test_item_name"
                                    :active="selectedItem === config.test_item_name"
                                    @click="selectedItem = config.test_item_name"
                                    class="py-1">
                                    <template #default>
                                        <div class="d-flex align-center justify-space-between w-100">
                                            <span class="text-body-2 text-truncate" style="max-width: 200px;"
                                                :title="config.test_item_name">
                                                {{ config.test_item_name }}
                                            </span>
                                            <v-chip size="x-small" :color="getScoringTypeColor(config.scoring_type)"
                                                variant="tonal">
                                                {{ config.scoring_type }}
                                            </v-chip>
                                        </div>
                                    </template>
                                </v-list-item>
                            </v-list>

                            <div v-if="filteredConfigs.length === 0" class="pa-4 text-center text-medium-emphasis">
                                No test items found
                            </div>
                        </div>
                    </v-col>

                    <!-- Right Panel: Selected Item Config -->
                    <v-col cols="7" style="height: 100%; overflow-y: auto;">
                        <div v-if="selectedConfig" class="pa-4">
                            <div class="text-h6 mb-4 text-truncate" :title="selectedConfig.test_item_name">
                                {{ selectedConfig.test_item_name }}
                            </div>

                            <!-- Scoring Type -->
                            <v-select v-model="selectedConfig.scoring_type" :items="scoringTypeOptions"
                                label="Scoring Type" variant="outlined" density="compact" class="mb-3" />

                            <!-- Scoring Type Description -->
                            <v-alert :type="getScoringAlertType(selectedConfig.scoring_type)" variant="tonal"
                                density="compact" class="mb-4">
                                {{ getScoringTypeDescription(selectedConfig.scoring_type) }}
                            </v-alert>

                            <!-- Policy (only for asymmetrical) -->
                            <v-select v-if="selectedConfig.scoring_type === 'asymmetrical'"
                                v-model="selectedConfig.policy" :items="policyOptions" label="Policy"
                                variant="outlined" density="compact" class="mb-3" />

                            <!-- Target (for asymmetrical) -->
                            <v-text-field v-if="selectedConfig.scoring_type === 'asymmetrical'"
                                v-model.number="selectedConfig.target" label="Custom Target (optional)"
                                type="number" variant="outlined" density="compact" class="mb-3"
                                hint="Leave empty for auto-detection (midpoint of UCL/LCL)" persistent-hint />

                            <!-- Weight -->
                            <v-text-field v-model.number="selectedConfig.weight" label="Weight"
                                type="number" variant="outlined" density="compact" class="mb-3"
                                min="0" max="10" step="0.1"
                                hint="Higher weight = more influence on overall score (0-10)" persistent-hint />

                            <!-- Item Specs Info -->
                            <v-card variant="tonal" class="mt-4" v-if="selectedItemSpecs">
                                <v-card-text class="py-2">
                                    <div class="text-caption text-medium-emphasis mb-1">Item Specifications</div>
                                    <v-row dense>
                                        <v-col cols="4">
                                            <div class="text-caption">UCL</div>
                                            <div class="font-weight-medium">{{ selectedItemSpecs.usl ?? 'N/A' }}</div>
                                        </v-col>
                                        <v-col cols="4">
                                            <div class="text-caption">LCL</div>
                                            <div class="font-weight-medium">{{ selectedItemSpecs.lsl ?? 'N/A' }}</div>
                                        </v-col>
                                        <v-col cols="4">
                                            <div class="text-caption">Sample Value</div>
                                            <div class="font-weight-medium">{{ selectedItemSpecs.value ?? 'N/A' }}</div>
                                        </v-col>
                                    </v-row>
                                </v-card-text>
                            </v-card>
                        </div>

                        <div v-else class="pa-4 text-center text-medium-emphasis" style="margin-top: 200px;">
                            <v-icon size="64" color="grey-lighten-1">mdi-cursor-default-click</v-icon>
                            <div class="mt-2">Select a test item to configure scoring</div>
                        </div>
                    </v-col>
                </v-row>
            </v-card-text>

            <v-divider />

            <v-card-actions>
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
const searchQuery = ref('')
const selectedItem = ref<string | null>(null)
const scoringConfigs = ref<RescoreScoringConfig[]>([])

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

// Selected config
const selectedConfig = computed(() => {
    if (!selectedItem.value) return null
    return scoringConfigs.value.find(c => c.test_item_name === selectedItem.value) || null
})

// Selected item specs (UCL/LCL/value from test items)
const selectedItemSpecs = computed(() => {
    if (!selectedItem.value) return null
    return props.testItems.find(item => item.test_item === selectedItem.value) || null
})

// Bulk actions
function setAllScoringType(type: RescoreScoringConfig['scoring_type']) {
    scoringConfigs.value.forEach(c => {
        c.scoring_type = type
        if (type !== 'asymmetrical') {
            c.policy = 'symmetrical'
        }
    })
}

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
        selectedItem.value = null
        searchQuery.value = ''
    }
})
</script>

<style scoped>
.gap-1 {
    gap: 0.25rem;
}
</style>
