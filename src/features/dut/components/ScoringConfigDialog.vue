<template>
    <v-dialog v-model="internalShow" max-width="1000" scrollable persistent>
        <v-card>
            <!-- UPDATED: Added bg-info for distinct dialog header color -->
            <v-card-title class="d-flex align-center bg-info">
                <v-icon start color="white">mdi-tune-variant</v-icon>
                <span class="text-white">Configure Scoring Parameters</span>
                <v-spacer />
                <v-btn icon variant="text" color="white" @click="handleClose">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-0">
                <v-row no-gutters>
                    <!-- Left Panel: Test Items List -->
                    <v-col cols="5" class="border-e">
                        <div class="pa-3">
                            <!-- Search and Filter -->
                            <v-text-field v-model="searchQuery" label="Search Test Items"
                                prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details
                                clearable class="mb-3" />

                            <!-- Quick Actions -->
                            <div class="d-flex flex-wrap gap-1 mb-3">
                                <v-btn size="x-small" variant="tonal" color="primary" @click="enableAll">
                                    Enable All
                                </v-btn>
                                <v-btn size="x-small" variant="tonal" color="grey" @click="disableAll">
                                    Disable All
                                </v-btn>
                                <v-btn size="x-small" variant="tonal" color="secondary" @click="autoDetectAll">
                                    <v-icon start size="small">mdi-auto-fix</v-icon>
                                    Auto-Detect
                                </v-btn>
                            </div>

                            <!-- Filter by Type -->
                            <v-chip-group v-model="typeFilter" column class="mb-2">
                                <v-chip size="small" filter value="all">All</v-chip>
                                <v-chip size="small" filter value="value" color="success">Value</v-chip>
                                <v-chip size="small" filter value="binary" color="grey">Binary</v-chip>
                            </v-chip-group>

                            <!-- Test Items List -->
                            <v-virtual-scroll :items="filteredTestItems" :height="400" item-height="48">
                                <template #default="{ item }">
                                    <v-list-item :key="item.testItemName" density="compact"
                                        :class="{ 'bg-primary-lighten-5': selectedItem === item.testItemName }"
                                        @click="selectItem(item.testItemName)">
                                        <template #prepend>
                                            <v-checkbox-btn :model-value="item.enabled" density="compact"
                                                @update:model-value="toggleEnabled(item.testItemName, $event)"
                                                @click.stop />
                                        </template>

                                        <v-list-item-title class="text-body-2 text-truncate">
                                            {{ item.testItemName }}
                                        </v-list-item-title>

                                        <template #append>
                                            <v-chip :color="getScoringTypeColor(item.scoringType)" size="x-small"
                                                variant="tonal">
                                                {{ getScoringTypeLabel(item.scoringType) }}
                                            </v-chip>
                                        </template>
                                    </v-list-item>
                                </template>
                            </v-virtual-scroll>

                            <div class="text-caption text-medium-emphasis pa-2">
                                {{ filteredTestItems.length }} of {{ configList.length }} items shown
                            </div>
                        </div>
                    </v-col>

                    <!-- Right Panel: Selected Item Configuration -->
                    <v-col cols="7">
                        <div class="pa-4">
                            <template v-if="selectedConfig">
                                <div class="d-flex align-center mb-4">
                                    <v-icon color="primary" class="mr-2">mdi-cog</v-icon>
                                    <span class="text-h6">{{ selectedConfig.testItemName }}</span>
                                </div>

                                <!-- Scoring Type Selection -->
                                <v-select v-model="selectedConfig.scoringType" :items="scoringTypeOptions"
                                    item-title="label" item-value="type" label="Scoring Type" variant="outlined"
                                    density="compact" class="mb-4" @update:model-value="onScoringTypeChange">
                                    <template #prepend-inner>
                                        <v-icon :color="getScoringTypeColor(selectedConfig.scoringType)">
                                            {{ getScoringTypeIcon(selectedConfig.scoringType) }}
                                        </v-icon>
                                    </template>

                                    <template #item="{ item, props: itemProps }">
                                        <v-list-item v-bind="itemProps">
                                            <template #prepend>
                                                <v-icon :color="getScoringTypeColor(item.value)">
                                                    {{ getScoringTypeIcon(item.value) }}
                                                </v-icon>
                                            </template>
                                            <v-list-item-subtitle>
                                                {{ item.raw.description }}
                                            </v-list-item-subtitle>
                                        </v-list-item>
                                    </template>
                                </v-select>

                                <!-- Type Description -->
                                <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                                    <div class="text-body-2">
                                        {{ SCORING_TYPE_INFO[selectedConfig.scoringType]?.description }}
                                    </div>
                                    <div class="text-caption text-medium-emphasis mt-1">
                                        <strong>Use case:</strong>
                                        {{ SCORING_TYPE_INFO[selectedConfig.scoringType]?.useCase }}
                                    </div>
                                </v-alert>

                                <!-- Weight -->
                                <v-text-field v-model.number="selectedConfig.weight" label="Weight" type="number"
                                    min="0" max="10" step="0.1" variant="outlined" density="compact" class="mb-4"
                                    hint="Weight for aggregate scoring (0-10)" persistent-hint>
                                    <template #append-inner>
                                        <v-chip size="x-small" color="primary">×{{
                                            selectedConfig.weight.toFixed(1) }}</v-chip>
                                    </template>
                                </v-text-field>

                                <!-- Type-Specific Parameters -->
                                <div v-if="currentTypeParameters.length > 0">
                                    <div class="text-subtitle-2 mb-2">Parameters</div>

                                    <template v-for="param in currentTypeParameters" :key="param.key">
                                        <!-- Slider Parameters -->
                                        <div v-if="param.type === 'slider'" class="mb-4">
                                            <v-label class="text-caption">
                                                {{ param.label }}
                                                <v-tooltip location="top">
                                                    <template #activator="{ props: tooltipProps }">
                                                        <v-icon v-bind="tooltipProps" size="x-small" class="ml-1">
                                                            mdi-help-circle-outline
                                                        </v-icon>
                                                    </template>
                                                    {{ param.description }}
                                                </v-tooltip>
                                            </v-label>
                                            <v-slider
                                                v-model="(selectedConfig as unknown as Record<string, number>)[param.key]"
                                                :min="param.min" :max="param.max" :step="param.step" thumb-label
                                                color="primary" class="mt-1">
                                                <template #append>
                                                    <v-text-field
                                                        v-model.number="(selectedConfig as unknown as Record<string, number>)[param.key]"
                                                        type="number" :min="param.min" :max="param.max"
                                                        :step="param.step" variant="outlined" density="compact"
                                                        hide-details style="width: 80px" />
                                                </template>
                                            </v-slider>
                                        </div>

                                        <!-- Number Parameters -->
                                        <v-text-field v-else
                                            v-model.number="(selectedConfig as unknown as Record<string, unknown>)[param.key]"
                                            :label="param.label" type="number" :min="param.min" :max="param.max"
                                            :step="param.step" variant="outlined" density="compact" class="mb-4"
                                            :hint="param.description" persistent-hint />
                                    </template>
                                </div>

                                <!-- No Parameters Message -->
                                <v-alert v-else type="info" variant="tonal" density="compact">
                                    This scoring type has no configurable parameters.
                                </v-alert>

                                <!-- Apply to Similar -->
                                <v-divider class="my-4" />
                                <v-btn variant="outlined" color="primary" block @click="applyToSimilar(selectedConfig)">
                                    <v-icon start>mdi-content-copy</v-icon>
                                    Apply Settings to All {{ getScoringTypeLabel(selectedConfig.scoringType) }} Items
                                </v-btn>
                            </template>

                            <!-- No Selection Message -->
                            <div v-else class="d-flex flex-column align-center justify-center" style="height: 100%;">
                                <v-icon size="64" color="grey-lighten-1">mdi-gesture-tap</v-icon>
                                <div class="text-body-1 text-medium-emphasis mt-4">
                                    Select a test item to configure scoring
                                </div>
                                <div class="text-caption text-medium-emphasis mt-1">
                                    Click on any test item from the list
                                </div>
                            </div>
                        </div>
                    </v-col>
                </v-row>
            </v-card-text>

            <v-divider />

            <!-- Summary Stats -->
            <v-card-text class="py-2 bg-grey-lighten-4">
                <v-row dense class="text-center">
                    <v-col cols="3">
                        <div class="text-caption text-medium-emphasis">Total Items</div>
                        <div class="text-body-1 font-weight-medium">{{ configList.length }}</div>
                    </v-col>
                    <v-col cols="3">
                        <div class="text-caption text-medium-emphasis">Enabled</div>
                        <div class="text-body-1 font-weight-medium text-success">{{ enabledCount }}</div>
                    </v-col>
                    <v-col cols="3">
                        <div class="text-caption text-medium-emphasis">Value Items</div>
                        <div class="text-body-1 font-weight-medium text-primary">{{ valueItemsCount }}</div>
                    </v-col>
                    <v-col cols="3">
                        <div class="text-caption text-medium-emphasis">Binary Items</div>
                        <div class="text-body-1 font-weight-medium text-grey">{{ binaryItemsCount }}</div>
                    </v-col>
                </v-row>
            </v-card-text>

            <v-divider />

            <!-- Actions -->
            <v-card-actions class="pa-4">
                <v-btn variant="outlined" color="grey" @click="resetToDefaults">
                    <v-icon start>mdi-refresh</v-icon>
                    Reset Defaults
                </v-btn>
                <v-spacer />
                <v-btn variant="outlined" @click="handleClose">
                    Cancel
                </v-btn>
                <v-btn variant="flat" color="primary" :loading="loading" @click="handleApply">
                    <v-icon start>mdi-check</v-icon>
                    Apply Configuration
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
    type ScoringConfig,
    type ScoringType,
    SCORING_TYPE_INFO,
    createDefaultScoringConfig,
    getUIScoringTypeOptions
} from '../types/scoring.types'
import { useScoring } from '../composables/useScoring'

interface Props {
    show: boolean
    testItems?: { NAME: string; VALUE?: string; UCL?: string; LCL?: string; STATUS?: string }[]
}

const props = withDefaults(defineProps<Props>(), {
    testItems: () => []
})

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void
    (e: 'apply'): void
}>()

// Use scoring composable
const {
    scoringConfigs,
    configList,
    loading,
    initializeConfigs,
    updateConfig,
    setScoringType,
    setAllEnabled,
    detectScoringType
} = useScoring()

// Local state
const searchQuery = ref('')
const typeFilter = ref('all')
const selectedItem = ref<string | null>(null)

// Computed
const internalShow = computed({
    get: () => props.show,
    set: (value) => emit('update:show', value)
})

// UPDATED: Use simplified UI scoring types (only Symmetrical and Asymmetrical)
const scoringTypeOptions = computed(() => getUIScoringTypeOptions())

const filteredTestItems = computed(() => {
    let items = configList.value

    // Filter by search
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        items = items.filter(c => c.testItemName.toLowerCase().includes(query))
    }

    // Filter by type
    if (typeFilter.value === 'value') {
        items = items.filter(c => c.scoringType !== 'binary')
    } else if (typeFilter.value === 'binary') {
        items = items.filter(c => c.scoringType === 'binary')
    }

    return items
})

const selectedConfig = computed(() => {
    if (!selectedItem.value) return null
    return scoringConfigs.value.get(selectedItem.value) || null
})

const currentTypeParameters = computed(() => {
    if (!selectedConfig.value) return []
    return SCORING_TYPE_INFO[selectedConfig.value.scoringType]?.parameters || []
})

const enabledCount = computed(() =>
    configList.value.filter(c => c.enabled).length
)

const valueItemsCount = computed(() =>
    configList.value.filter(c => c.scoringType !== 'binary').length
)

const binaryItemsCount = computed(() =>
    configList.value.filter(c => c.scoringType === 'binary').length
)

// Initialize when test items change
watch(() => props.testItems, (items) => {
    if (items.length > 0 && configList.value.length === 0) {
        initializeConfigs(items)
    }
}, { immediate: true })

// Methods
function getScoringTypeColor(type: ScoringType): string {
    return SCORING_TYPE_INFO[type]?.color || 'grey'
}

function getScoringTypeLabel(type: ScoringType): string {
    return SCORING_TYPE_INFO[type]?.label || type
}

function getScoringTypeIcon(type: ScoringType): string {
    return SCORING_TYPE_INFO[type]?.icon || 'mdi-help'
}

function selectItem(testItemName: string): void {
    selectedItem.value = testItemName
}

function toggleEnabled(testItemName: string, enabled: unknown): void {
    updateConfig(testItemName, { enabled: enabled as boolean })
}

function onScoringTypeChange(newType: ScoringType): void {
    if (selectedItem.value) {
        setScoringType(selectedItem.value, newType)
    }
}

function enableAll(): void {
    setAllEnabled(true)
}

function disableAll(): void {
    setAllEnabled(false)
}

function autoDetectAll(): void {
    // Re-detect scoring types for all items
    for (const item of props.testItems) {
        const detected = detectScoringType(item)
        const existing = scoringConfigs.value.get(item.NAME)
        if (existing && existing.scoringType !== detected) {
            setScoringType(item.NAME, detected)
        }
    }
}

function applyToSimilar(config: ScoringConfig): void {
    // Apply same settings to all items with the same scoring type
    for (const [name, c] of scoringConfigs.value) {
        if (c.scoringType === config.scoringType && name !== config.testItemName) {
            scoringConfigs.value.set(name, {
                ...c,
                ...config,
                testItemName: name  // Keep original name
            })
        }
    }
}

function resetToDefaults(): void {
    for (const item of props.testItems) {
        const detected = detectScoringType(item)
        const newConfig = createDefaultScoringConfig(item.NAME, detected)
        scoringConfigs.value.set(item.NAME, newConfig)
    }
}

function handleClose(): void {
    internalShow.value = false
}

function handleApply(): void {
    emit('apply')
    internalShow.value = false
}
</script>

<style scoped>
.test-item-row:hover {
    background-color: rgba(var(--v-theme-primary), 0.05);
}

/* UPDATED: Fix icon cropping inside chips */
:deep(.v-chip .v-icon) {
    margin-right: 4px;
}

:deep(.v-chip__content) {
    overflow: visible;
}
</style>
