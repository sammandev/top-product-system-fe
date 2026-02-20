<template>
    <v-dialog v-model="dialog" max-width="800px" scrollable>
        <template #activator="{ props: dialogProps }">
            <v-btn v-bind="dialogProps" color="primary" variant="outlined" prepend-icon="mdi-calculator-variant">
                Custom Scoring
                <v-badge v-if="activeCount > 0" :content="activeCount" color="success" inline />
            </v-btn>
        </template>

        <v-card>
            <v-card-title class="d-flex justify-space-between align-center">
                <div>
                    <v-icon class="mr-2">mdi-calculator-variant</v-icon>
                    Custom Scoring Configuration
                </div>
                <v-btn icon="mdi-close" variant="text" @click="dialog = false" />
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-0">
                <!-- Universal Formula Section -->
                <v-expansion-panels>
                    <v-expansion-panel>
                        <v-expansion-panel-title>
                            <div class="d-flex align-center justify-space-between w-100">
                                <div class="d-flex align-center">
                                    <v-icon class="mr-2">mdi-earth</v-icon>
                                    <span class="font-weight-medium">Universal Custom Scoring</span>
                                </div>
                                <v-switch v-model="universalFormula.enabled" density="compact" hide-details
                                    color="primary" @click.stop />
                            </div>
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                            <v-card variant="tonal" color="info" class="mb-3">
                                <v-card-text class="pa-3">
                                    <div class="text-body-2">
                                        <strong>{{ universalFormula.name }}</strong>
                                    </div>
                                    <div class="text-caption text-medium-emphasis mt-1">
                                        Applied to all test items with USL/LSL (unless overridden by category-specific
                                        formula)
                                    </div>
                                </v-card-text>
                            </v-card>

                            <v-text-field v-model.number="universalFormula.tolerance" label="Tolerance Factor"
                                hint="Adjusts the acceptable deviation range" type="number" step="0.1" min="0.1"
                                variant="outlined" density="compact" :disabled="!universalFormula.enabled" />

                            <v-alert type="info" variant="tonal" density="compact" class="mt-3">
                                <strong>Formula:</strong> Score = 10 × (1 - deviation / tolerance)
                            </v-alert>
                        </v-expansion-panel-text>
                    </v-expansion-panel>

                    <!-- Category-Specific Formulas Section -->
                    <v-expansion-panel>
                        <v-expansion-panel-title>
                            <div class="d-flex align-center justify-space-between w-100">
                                <div class="d-flex align-center">
                                    <v-icon class="mr-2">mdi-target</v-icon>
                                    <span class="font-weight-medium">Category-Specific Formulas</span>
                                </div>
                                <v-chip size="small" :color="enabledCategoryCount > 0 ? 'success' : 'default'"
                                    variant="tonal">
                                    {{ enabledCategoryCount }} / {{ totalCategories }} Enabled
                                </v-chip>
                            </div>
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                            <div class="d-flex justify-end mb-3 gap-2">
                                <v-btn size="small" variant="text" prepend-icon="mdi-check-all"
                                    @click="toggleAllCategories(true)">
                                    Enable All
                                </v-btn>
                                <v-btn size="small" variant="text" prepend-icon="mdi-close-box-multiple"
                                    @click="toggleAllCategories(false)">
                                    Disable All
                                </v-btn>
                            </div>

                            <v-list density="compact" class="pa-0">
                                <v-list-item v-for="(formula, category) in categoryFormulas" :key="category"
                                    class="mb-2">
                                    <template #prepend>
                                        <v-switch v-model="formula.enabled" density="compact" hide-details
                                            color="primary" />
                                    </template>

                                    <v-list-item-title class="font-weight-medium">
                                        {{ category }}
                                    </v-list-item-title>
                                    <v-list-item-subtitle class="text-caption">
                                        {{ formula.name }}
                                    </v-list-item-subtitle>

                                    <template #append>
                                        <v-tooltip location="left">
                                            <template #activator="{ props: tooltipProps }">
                                                <v-icon v-bind="tooltipProps" size="small" color="info">
                                                    mdi-information-outline
                                                </v-icon>
                                            </template>
                                            <div class="text-caption">
                                                {{ getCategoryDescription(String(category)) }}
                                            </div>
                                        </v-tooltip>
                                    </template>
                                </v-list-item>
                            </v-list>

                            <v-alert type="info" variant="tonal" density="compact" class="mt-3">
                                Category formulas <strong>override</strong> universal formula when enabled
                            </v-alert>
                        </v-expansion-panel-text>
                    </v-expansion-panel>
                </v-expansion-panels>
            </v-card-text>

            <v-divider />

            <!-- Summary and Actions -->
            <v-card-text>
                <v-alert v-if="activeCount > 0" type="success" variant="tonal" density="compact">
                    <strong>Active Scoring:</strong>
                    <ul class="mt-2 ml-4">
                        <li v-if="universalFormula.enabled">
                            Universal formula: Applied to measurements with USL/LSL
                        </li>
                        <li v-if="enabledCategoryCount > 0">
                            {{ enabledCategoryCount }} category-specific formula(s): {{ enabledCategories.join(', ') }}
                        </li>
                    </ul>
                </v-alert>
                <v-alert v-else type="info" variant="tonal" density="compact">
                    No custom formulas enabled. System default scoring is active.
                </v-alert>
            </v-card-text>

            <v-card-actions>
                <v-btn color="error" variant="text" prepend-icon="mdi-restore" @click="handleReset">
                    Reset to Default
                </v-btn>
                <v-spacer />
                <v-btn variant="text" @click="dialog = false">
                    Cancel
                </v-btn>
                <v-btn color="primary" variant="flat" prepend-icon="mdi-check" @click="handleApply">
                    Apply
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CategoryFormulas, CustomFormula } from '../composables/useCustomScoring'

interface Props {
  universalFormula: CustomFormula
  categoryFormulas: CategoryFormulas
}

interface Emits {
  (e: 'update:universalFormula', value: CustomFormula): void
  (e: 'update:categoryFormulas', value: CategoryFormulas): void
  (e: 'reset'): void
  (e: 'apply'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialog = ref(false)

// Computed properties
const totalCategories = computed(() => Object.keys(props.categoryFormulas).length)

const enabledCategoryCount = computed(() => {
  return Object.values(props.categoryFormulas).filter((f) => f.enabled).length
})

const enabledCategories = computed(() => {
  return Object.entries(props.categoryFormulas)
    .filter(([_, formula]) => formula.enabled)
    .map(([category]) => category)
})

const activeCount = computed(() => {
  let count = 0
  if (props.universalFormula.enabled) count++
  count += enabledCategoryCount.value
  return count
})

// Methods
const toggleAllCategories = (enabled: boolean) => {
  const updated = { ...props.categoryFormulas }
  Object.keys(updated).forEach((category) => {
    const formula = updated[category]
    if (formula) {
      formula.enabled = enabled
    }
  })
  emit('update:categoryFormulas', updated)
}

const getCategoryDescription = (category: string): string => {
  const descriptions: Record<string, string> = {
    POW: 'TX Power: Strict ±0.5 dB tolerance',
    EVM: 'TX EVM: Exponential penalty beyond USL',
    FREQ: 'TX Frequency: Symmetric tolerance around target',
    PER: 'RX PER: Linear decay, lower is better',
    RSSI: 'RX RSSI: Linear scoring within limits',
    MASK: 'TX Mask: Threshold-based with headroom bonus',
    LO_LEAKAGE: 'LO Leakage: Threshold-based, more margin = better',
    POW_DIF_ABS: 'PA Power Delta: Linear decay from zero',
    ADJUSTED_POW: 'PA Adjusted Power: Linear decay with 5 dB threshold',
  }
  return descriptions[category] || 'Custom formula for this category'
}

const handleReset = () => {
  emit('reset')
}

const handleApply = () => {
  emit('apply')
  dialog.value = false
}
</script>

<style scoped>
.v-list-item {
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 4px;
}
</style>
