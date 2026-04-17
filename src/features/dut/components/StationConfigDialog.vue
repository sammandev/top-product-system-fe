<template>
  <v-dialog v-model="internalShow" :fullscreen="isFullscreen" :max-width="isFullscreen ? undefined : 900" persistent
    scrollable>
    <v-card class="station-config-card">
      <v-card-title class="d-flex align-center justify-space-between bg-secondary">
        <div class="d-flex align-center station-config-title">
          <v-icon class="mr-2">mdi-cog</v-icon>
          <span class="text-truncate">Configure Station: {{ station?.display_station_name }}</span>
        </div>
        <div class="d-flex align-center gap-1">
          <v-btn :icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'" variant="text" color="white"
            :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'" @click="toggleFullscreen" />
          <v-btn icon="mdi-close" variant="text" color="white" @click="handleClose" />
        </div>
      </v-card-title>

      <v-card-text class="pa-4 station-config-body" :class="{ 'station-config-body--fullscreen': isFullscreen }">
        <v-card variant="outlined" class="mb-4 min-score-section">
          <v-card-text class="pa-3">
            <div class="d-flex align-center justify-space-between flex-wrap gap-3">
              <div class="min-score-summary">
                <div class="text-subtitle-2 font-weight-medium">Minimum Test Item Score</div>
                <div class="text-caption text-medium-emphasis">
                  DUT will be considered as <strong>Min. Score Fail</strong>, if one test item score is below the threshold.
                </div>
              </div>
              <div class="d-flex align-center gap-3 flex-wrap min-score-controls">
                <v-switch v-model="localConfig.minimumItemScoreEnabled" color="warning" inset density="compact"
                  label="Enabled" hide-details class="min-score-switch" />
                <v-text-field v-if="localConfig.minimumItemScoreEnabled" v-model.number="localConfig.minimumItemScore"
                  label="Threshold" type="number" variant="outlined" density="compact"
                  prepend-inner-icon="mdi-chart-box-outline" min="0" max="10" step="0.1" suffix="/ 10" hide-details
                  class="min-score-input" />
                <v-chip v-else size="small" color="grey" variant="outlined">
                  Check disabled
                </v-chip>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-row dense class="mb-4">
          <v-col cols="12">
            <v-autocomplete v-model="localConfig.deviceIds" :items="availableDeviceIds" label="Device IDs (Default All)"
              variant="outlined" density="comfortable" prepend-inner-icon="mdi-devices" multiple chips closable-chips
              hide-details :loading="loadingDevices" :disabled="loadingDevices || availableDeviceIds.length === 0"
              placeholder="Select Devices (empty = all)" clearable>
              <template #prepend-item>
                <v-list-item @click="toggleSelectAllDevices">
                  <template #prepend>
                    <v-checkbox-btn :model-value="allDevicesSelected"
                      :indeterminate="someDevicesSelected && !allDevicesSelected" />
                  </template>
                  <v-list-item-title>
                    {{ allDevicesSelected ? 'Deselect All' : 'Select All' }}
                  </v-list-item-title>
                  <template #append>
                    <v-chip size="x-small" color="primary">{{ availableDeviceIds.length }}</v-chip>
                  </template>
                </v-list-item>
                <v-divider />
              </template>
              <template #chip="{ props: chipProps, item }">
                <v-chip v-bind="chipProps" size="small" closable>{{ item.value }}</v-chip>
              </template>
              <template #no-data>
                <v-list-item>
                  <v-list-item-title class="text-medium-emphasis">
                    {{ loadingDevices ? 'Loading devices...' : 'No devices available' }}
                  </v-list-item-title>
                </v-list-item>
              </template>
              <template #append>
                <v-btn icon="mdi-refresh" size="small" variant="text" :loading="loadingDevices"
                  @click.stop="handleRefreshDevices" />
              </template>
            </v-autocomplete>
          </v-col>
        </v-row>

        <!-- Error Alert for Device Loading -->
        <v-alert v-if="deviceError" type="error" variant="tonal" class="mb-4" closable>
          {{ deviceError }}
        </v-alert>

        <!-- Test Items Selection Section -->
        <v-card variant="outlined">
          <v-card-title class="test-item-section-header d-flex align-center justify-space-between flex-wrap">
            <div class="test-item-section-title d-flex align-center">
              <v-icon start color="primary">mdi-format-list-checks</v-icon>
              Test Items Selection
            </div>
            <div class="d-flex align-center gap-2 flex-wrap justify-end">
              <v-btn-toggle :model-value="testItemSource" color="primary" density="compact" mandatory variant="outlined"
                class="test-item-source-toggle" @update:model-value="handleTestItemSourceChange">
                <v-btn value="default" size="small">Default</v-btn>
                <v-btn value="iplas" size="small">iPLAS</v-btn>
              </v-btn-toggle>
              <v-btn v-if="!loadingTestItems" color="primary" variant="text" size="small" prepend-icon="mdi-refresh"
                @click="handleRefreshTestItems">
                Refresh
              </v-btn>
            </div>
          </v-card-title>
          <v-card-text class="pa-3">
            <!-- Loading State -->
            <div v-if="loadingTestItems" class="text-center pa-4">
              <v-progress-circular indeterminate color="primary" />
              <div class="text-caption text-medium-emphasis mt-2">Loading test items...</div>
            </div>

            <!-- Error State -->
            <v-alert v-else-if="testItemsError" type="error" variant="tonal" class="mb-3">
              {{ testItemsError }}
            </v-alert>

            <!-- No Test Items -->
            <v-alert v-else-if="uniqueAvailableTestItems.length === 0" type="info" variant="tonal">
              No test items available. Refresh the source after device IDs and date range are ready.
            </v-alert>

            <!-- Test Items Selection -->
            <div v-else>
              <v-row dense class="mb-3">
                <v-col cols="12" lg="7">
                  <div class="d-flex align-center gap-2 flex-wrap">
                    <v-btn-toggle v-model="selectionTarget" color="primary" density="compact" mandatory
                      variant="outlined" class="selection-mode-toggle">
                      <v-btn value="include" size="small" prepend-icon="mdi-playlist-plus">
                        INCLUDE ({{ includedTestItems.length }} Selected)
                      </v-btn>
                      <v-btn value="exclude" size="small" prepend-icon="mdi-playlist-remove">
                        EXCLUDE ({{ excludedTestItems.length }} Selected)
                      </v-btn>
                    </v-btn-toggle>
                    <v-chip size="small" variant="outlined">
                      {{ filteredTestItemEntries.length }} Showing
                    </v-chip>
                  </div>
                </v-col>
                <v-col cols="12" lg="5">
                  <div class="d-flex align-center justify-start justify-lg-end gap-2 flex-wrap">
                    <v-btn size="small" variant="outlined" prepend-icon="mdi-tune-variant" color="secondary"
                      @click="openBulkScoringConfig" :disabled="selectedCriteriaCount === 0">
                      Bulk Scoring ({{ selectedCriteriaCount }})
                    </v-btn>
                    <v-menu location="bottom end">
                      <template #activator="{ props: menuProps }">
                        <v-btn v-bind="menuProps" size="small" variant="outlined"
                          prepend-icon="mdi-lightning-bolt-outline">
                          Quick Actions
                        </v-btn>
                      </template>
                      <v-list density="compact" min-width="260">
                        <v-list-item @click="selectDisplayedTestItems" :disabled="filteredTestItemEntries.length === 0">
                          <template #prepend>
                            <v-icon color="info">mdi-text-box-plus-outline</v-icon>
                          </template>
                          <v-list-item-title>
                            Add Displayed to {{ activeSelectionLabel }}
                          </v-list-item-title>
                          <v-list-item-subtitle>
                            {{ filteredTestItemEntries.length }} visible item(s)
                          </v-list-item-subtitle>
                        </v-list-item>
                        <v-list-item @click="selectValueTestItems">
                          <template #prepend>
                            <v-icon color="success">mdi-filter-check-outline</v-icon>
                          </template>
                          <v-list-item-title>
                            Add Criteria to {{ activeSelectionLabel }}
                          </v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="selectNonValueTestItems">
                          <template #prepend>
                            <v-icon color="warning">mdi-format-list-bulleted-square</v-icon>
                          </template>
                          <v-list-item-title>
                            Add Non-Criteria to {{ activeSelectionLabel }}
                          </v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="clearTestItemSelection" :disabled="activeSelectionCount === 0">
                          <template #prepend>
                            <v-icon color="error">mdi-playlist-remove</v-icon>
                          </template>
                          <v-list-item-title>
                            Clear {{ activeSelectionLabel }}
                          </v-list-item-title>
                        </v-list-item>
                        <v-divider class="my-1" />
                        <v-list-item v-if="selectionTarget === 'include'" @click="selectDisplayedAndConfigureScore"
                          :disabled="displayedCriteriaCount === 0">
                          <template #prepend>
                            <v-icon color="primary">mdi-playlist-check</v-icon>
                          </template>
                          <v-list-item-title>
                            Add Displayed Criteria And Configure Score
                          </v-list-item-title>
                          <v-list-item-subtitle>
                            {{ displayedCriteriaCount }} criteria item(s)
                          </v-list-item-subtitle>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </div>
                </v-col>
              </v-row>

              <div class="text-caption text-medium-emphasis mb-3">
                Add items to Include for analysis, add items to Exclude to remove them, and items
                already assigned to one list are locked while you edit the other list.
              </div>

              <v-row dense class="mb-3">
                <v-col cols="12">
                  <v-combobox v-model="testItemSearchTerms" v-model:search="testItemSearchInput"
                    :label="`Search ${activeSelectionLabel} Candidates`" :items="[]" multiple chips closable-chips
                    clearable hide-no-data variant="outlined" density="compact" prepend-inner-icon="mdi-magnify"
                    placeholder="Type keywords and press Enter, e.g. tx rx 2404" @keydown.enter.prevent="commitTestItemSearchInput"
                    @keydown.comma.prevent="commitTestItemSearchInput" @blur="commitTestItemSearchInput"
                    @update:model-value="handleTestItemSearchTermsUpdate" @click:clear="clearTestItemSearch">
                    <template #chip="{ props: chipProps, item }">
                      <v-chip v-bind="chipProps" size="small" closable>
                        {{ item.title }}
                      </v-chip>
                    </template>
                  </v-combobox>
                </v-col>
              </v-row>

              <v-alert v-if="overlapItems.length > 0" type="warning" variant="tonal" density="compact" class="mb-3">
                {{ overlapItems.length }} item(s) exist in both Include and Exclude. They will be
                excluded from analysis.
              </v-alert>

              <div class="border rounded test-item-list-container"
                :class="{ 'test-item-list-container--fullscreen': isFullscreen }">
                <v-virtual-scroll :items="filteredTestItemEntries" :height="testItemListHeight" item-height="56">
                  <template #default="{ item: entry }">
                    <v-list-item :key="entry.name" @click="toggleTestItem(entry.name)" class="test-item-row"
                      :class="{ 'test-item-row--disabled': entry.isLockedByOppositeSelection }"
                      :disabled="entry.isLockedByOppositeSelection">
                      <template #prepend>
                        <v-checkbox-btn :model-value="entry.isActiveSelection" @click.stop="toggleTestItem(entry.name)"
                          density="compact" :disabled="entry.isLockedByOppositeSelection" />
                      </template>
                      <v-list-item-title class="text-body-2">
                        {{ entry.name }}
                      </v-list-item-title>
                      <template #append>
                        <div class="d-flex align-center gap-1 test-item-row-actions">
                          <v-chip v-if="entry.isIncluded" size="x-small" color="success" variant="tonal">
                            Included
                          </v-chip>
                          <v-chip v-if="entry.isExcluded" size="x-small" color="warning" variant="tonal">
                            Excluded
                          </v-chip>
                          <v-btn v-if="entry.canConfigureScoring && entry.scoringLabel" size="x-small" variant="tonal"
                            :color="entry.scoringColor" @click.stop="openScoringConfig(entry.name)"
                            class="scoring-config-btn">
                            <v-icon start size="small">{{ entry.scoringIcon }}</v-icon>
                            {{ entry.scoringLabel }}
                            <v-icon end size="x-small">mdi-chevron-down</v-icon>
                          </v-btn>
                          <v-chip :color="entry.typeColor" size="x-small" variant="tonal">
                            {{ entry.typeLabel }}
                          </v-chip>
                        </div>
                      </template>
                    </v-list-item>
                  </template>
                </v-virtual-scroll>

                <div v-if="filteredTestItemEntries.length === 0" class="text-center text-medium-emphasis pa-4">
                  No matching test items found
                </div>
              </div>

              <div class="text-caption text-medium-emphasis mt-2">
                <v-icon size="x-small">mdi-information</v-icon>
                Leave Include empty to default to all analyzable items on save. Use the scoring button on included
                criteria
                items when you need custom scoring.
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Scoring Configuration Dialog -->
        <v-dialog v-model="scoringConfigDialog" max-width="500px">
          <v-card v-if="scoringConfigItem">
            <v-card-title class="d-flex align-center bg-info">
              <v-icon class="mr-2">mdi-tune</v-icon>
              Configure Scoring
            </v-card-title>
            <v-card-subtitle class="bg-info py-3">
              {{ scoringConfigItem }}
            </v-card-subtitle>

            <v-card-text class="pa-4">
              <!-- Scoring Type Selection -->
              <v-select :model-value="getTestItemScoringConfig(scoringConfigItem).scoringType"
                @update:model-value="updateTestItemScoringType(scoringConfigItem!, $event)" :items="scoringTypeOptions"
                item-title="title" item-value="value" label="Scoring Algorithm" variant="outlined"
                density="comfortable">
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps">
                    <template #prepend>
                      <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                    </template>
                    <template #subtitle>
                      {{ item.raw.subtitle }}
                    </template>
                    <template #append>
                      <v-chip v-if="item.raw.requiresTarget" size="x-small" color="warning" variant="tonal">
                        Requires Target
                      </v-chip>
                    </template>
                  </v-list-item>
                </template>
                <template #selection="{ item }">
                  <v-chip :color="item.raw.color" size="small" variant="flat">
                    <v-icon start size="small">{{ item.raw.icon }}</v-icon>
                    {{ item.title }}
                  </v-chip>
                </template>
              </v-select>

              <!-- Target Value Input (for asymmetrical) -->
              <v-text-field v-if="currentScoringTypeRequiresTarget"
                :model-value="getTestItemScoringConfig(scoringConfigItem).target"
                @update:model-value="updateTestItemTarget(scoringConfigItem!, $event ? Number($event) : undefined)"
                label="Target Value" type="number" variant="outlined" density="comfortable"
                hint="Required: Enter the optimal target value for scoring" persistent-hint class="mt-4">
                <template #prepend-inner>
                  <v-icon color="warning">mdi-target</v-icon>
                </template>
              </v-text-field>

              <!-- Policy Selection (for asymmetrical only) -->
              <v-select v-if="currentScoringTypeRequiresPolicy"
                :model-value="getTestItemScoringConfig(scoringConfigItem).policy || 'symmetrical'"
                @update:model-value="updateTestItemPolicy(scoringConfigItem!, $event)" :items="policyOptions"
                item-title="title" item-value="value" label="Scoring Policy" variant="outlined" density="comfortable"
                class="mt-4">
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps">
                    <template #prepend>
                      <v-icon color="primary">{{ item.raw.icon }}</v-icon>
                    </template>
                    <template #subtitle>
                      {{ item.raw.subtitle }}
                    </template>
                  </v-list-item>
                </template>
                <template #selection="{ item }">
                  <v-chip color="primary" size="small" variant="flat">
                    <v-icon start size="small">{{ item.raw.icon }}</v-icon>
                    {{ item.title }}
                  </v-chip>
                </template>
              </v-select>

              <!-- Weight Input -->
              <v-text-field :model-value="getTestItemScoringConfig(scoringConfigItem).weight ?? 1.0"
                @update:model-value="updateTestItemWeight(scoringConfigItem!, $event ? Number($event) : 1.0)"
                label="Weight" type="number" variant="outlined" density="comfortable"
                hint="Weight for this test item in overall score calculation (default: 1.0)" persistent-hint
                class="mt-4" :min="0" :step="0.1">
                <template #prepend-inner>
                  <v-icon color="info">mdi-weight</v-icon>
                </template>
              </v-text-field>

              <!-- Formula Preview -->
              <v-alert type="info" variant="tonal" class="mt-4" density="compact">
                <div class="text-caption font-weight-bold mb-1">Formula:</div>
                <div class="text-body-2 font-italic">
                  {{
                    getScoringTypeInfo(getTestItemScoringConfig(scoringConfigItem).scoringType).description
                  }}
                </div>
              </v-alert>
            </v-card-text>

            <v-divider />

            <v-card-actions class="pa-3">
              <v-spacer />
              <v-btn color="primary" variant="flat" @click="closeScoringConfig">
                Done
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Bulk Scoring Configuration Dialog -->
        <v-dialog v-model="bulkScoringDialog" max-width="550px">
          <v-card>
            <v-card-title class="d-flex align-center bg-secondary">
              <v-icon class="mr-2">mdi-tune-variant</v-icon>
              Bulk Configure Scoring
            </v-card-title>
            <v-card-subtitle class="bg-secondary py-3">
              Apply to {{ selectedCriteriaCount }} selected criteria test item(s)
            </v-card-subtitle>

            <v-card-text class="pa-4">
              <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                This will apply the selected scoring algorithm and weight to all {{
                  selectedCriteriaCount }} selected
                criteria test items.
              </v-alert>

              <!-- Scoring Type Selection -->
              <v-select v-model="bulkScoringType" :items="scoringTypeOptions" item-title="title" item-value="value"
                label="Scoring Algorithm" variant="outlined" density="comfortable">
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps">
                    <template #prepend>
                      <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                    </template>
                    <template #subtitle>
                      {{ item.raw.subtitle }}
                    </template>
                    <template #append>
                      <v-chip v-if="item.raw.requiresTarget" size="x-small" color="warning" variant="tonal">
                        Requires Target
                      </v-chip>
                    </template>
                  </v-list-item>
                </template>
                <template #selection="{ item }">
                  <v-chip :color="item.raw.color" size="small" variant="flat">
                    <v-icon start size="small">{{ item.raw.icon }}</v-icon>
                    {{ item.title }}
                  </v-chip>
                </template>
              </v-select>

              <!-- Target Value Input (for asymmetrical) -->
              <v-text-field v-if="bulkScoringTypeRequiresTarget" v-model.number="bulkTarget" label="Target Value"
                type="number" variant="outlined" density="comfortable"
                hint="Required: Enter the optimal target value for scoring" persistent-hint class="mt-4">
                <template #prepend-inner>
                  <v-icon color="warning">mdi-target</v-icon>
                </template>
              </v-text-field>

              <!-- Policy Selection (for asymmetrical only) -->
              <v-select v-if="bulkScoringTypeRequiresPolicy" v-model="bulkPolicy" :items="policyOptions"
                item-title="title" item-value="value" label="Scoring Policy" variant="outlined" density="comfortable"
                class="mt-4">
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps">
                    <template #prepend>
                      <v-icon color="primary">{{ item.raw.icon }}</v-icon>
                    </template>
                    <template #subtitle>
                      {{ item.raw.subtitle }}
                    </template>
                  </v-list-item>
                </template>
                <template #selection="{ item }">
                  <v-chip color="primary" size="small" variant="flat">
                    <v-icon start size="small">{{ item.raw.icon }}</v-icon>
                    {{ item.title }}
                  </v-chip>
                </template>
              </v-select>

              <!-- Weight Input -->
              <v-text-field v-model.number="bulkWeight" label="Weight" type="number" variant="outlined"
                density="comfortable" hint="Weight for these test items in overall score calculation (default: 1.0)"
                persistent-hint class="mt-4" :min="0" :step="0.1">
                <template #prepend-inner>
                  <v-icon color="info">mdi-weight</v-icon>
                </template>
              </v-text-field>

              <!-- Formula Preview -->
              <v-alert type="info" variant="tonal" class="mt-4" density="compact">
                <div class="text-caption font-weight-bold mb-1">Formula:</div>
                <div class="text-body-2 font-italic">
                  {{ getScoringTypeInfo(bulkScoringType).description }}
                </div>
              </v-alert>
            </v-card-text>

            <v-divider />

            <v-card-actions class="pa-3">
              <v-btn color="grey" variant="outlined" @click="closeBulkScoringConfig">
                Cancel
              </v-btn>
              <v-spacer />
              <v-btn color="primary" variant="flat" @click="applyBulkScoringConfig"
                :disabled="bulkScoringTypeRequiresTarget && bulkTarget === undefined">
                Apply to {{ selectedCriteriaCount }} Items
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-card-text>

      <v-divider />

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-btn color="error" variant="outlined" @click="handleRemove" v-if="isExistingConfig">
          <v-icon start>mdi-delete</v-icon>
          Remove Station
        </v-btn>
        <v-spacer />
        <v-btn color="grey" variant="outlined" @click="handleClose">
          Cancel
        </v-btn>
        <v-btn color="primary" variant="flat" @click="handleSave">
          Save Configuration
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  SCORING_POLICIES,
  SCORING_TYPE_INFO,
  type ScoringPolicy,
  type ScoringType,
  shouldUseEvmScoring,
  shouldUsePerMaskScoring,
  UI_SCORING_TYPES,
} from '@/features/dut/types/scoring.types'
import type { Station } from '@/features/dut-logs/composables/useIplasApi'
import type { StationConfig, TestItemScoringConfig } from './StationSelectionDialog.vue'

export interface TestItemInfo {
  name: string
  isValue: boolean // true if it has UCL/LCL limits OR has numeric VALUE (not pure PASS/FAIL)
  isBin: boolean // true if it's a binary test item (PASS/FAIL/1/0/-999 without limits)
  hasUcl: boolean // true if it has UCL (upper criteria limit)
  hasLcl: boolean // true if it has LCL (lower criteria limit)
}

function getScoringTypeIcon(scoringType: ScoringType): string {
  return (SCORING_TYPE_INFO[scoringType] as { icon?: string }).icon ?? 'mdi-tune'
}

// Available scoring types for selection (from UI_SCORING_TYPES)
const scoringTypeOptions = UI_SCORING_TYPES.map((key) => ({
  value: key as ScoringType,
  title: SCORING_TYPE_INFO[key].label,
  subtitle: SCORING_TYPE_INFO[key].description,
  icon: getScoringTypeIcon(key as ScoringType),
  color: SCORING_TYPE_INFO[key].color,
  requiresTarget: SCORING_TYPE_INFO[key].requiredInputs?.includes('target') ?? false,
  requiresPolicy: SCORING_TYPE_INFO[key].requiredInputs?.includes('policy') ?? false,
}))

// Policy options for asymmetrical scoring
const policyOptions = SCORING_POLICIES.map((p) => ({
  value: p.value,
  title: p.label,
  subtitle: p.description,
  icon: (p as { icon?: string }).icon ?? 'mdi-swap-horizontal',
}))

interface Props {
  show: boolean
  station: Station | null
  site: string
  project: string
  startTime?: string // Optional - not needed for ISN search
  endTime?: string // Optional - not needed for ISN search
  existingConfig?: StationConfig
  availableDeviceIds: string[]
  loadingDevices: boolean
  deviceError: string | null
  availableTestItems: TestItemInfo[]
  testItemSource: 'default' | 'iplas'
  loadingTestItems: boolean
  testItemsError: string | null
}

const props = withDefaults(defineProps<Props>(), {
  startTime: '',
  endTime: '',
  availableTestItems: () => [],
  loadingTestItems: false,
  testItemsError: null,
})

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'save', config: StationConfig): void
  (e: 'remove', displayName: string): void
  (e: 'refresh-devices'): void
  (e: 'refresh-test-items'): void
  (e: 'change-test-item-source', source: 'default' | 'iplas'): void
}>()

const internalShow = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value),
})

const localConfig = ref<StationConfig>({
  displayName: '',
  stationName: '',
  deviceIds: [],
  testStatus: 'PASS',
  minimumItemScore: 6.5,
  minimumItemScoreEnabled: true,
  includedTestItems: [],
  excludedTestItems: [],
  testItemScoringConfigs: {},
})

const isFullscreen = ref(false)
const testItemSearchTerms = ref<string[]>([])
const testItemSearchInput = ref('')
const selectionTarget = ref<'include' | 'exclude'>('include')

// Track which test item is currently being configured for scoring
const scoringConfigItem = ref<string | null>(null)
const scoringConfigDialog = ref(false)

// Bulk configuration state
const bulkScoringDialog = ref(false)
const bulkScoringType = ref<ScoringType>('symmetrical')
const bulkTarget = ref<number | undefined>(undefined)
const bulkPolicy = ref<ScoringPolicy>('symmetrical') // UPDATED: Add policy for bulk config
const bulkWeight = ref<number>(1.0)

const isExistingConfig = computed(() => !!props.existingConfig)
const testItemListHeight = computed(() => (isFullscreen.value ? 480 : 320))

// Device selection helpers
const allDevicesSelected = computed(() => {
  return (
    props.availableDeviceIds.length > 0 &&
    localConfig.value.deviceIds.length === props.availableDeviceIds.length
  )
})

const someDevicesSelected = computed(() => {
  return localConfig.value.deviceIds.length > 0
})

// Test Items filtering - only show Criteria and Non-Criteria items (exclude Bin)
const uniqueAvailableTestItems = computed(() => {
  const merged = new Map<string, TestItemInfo>()

  for (const item of props.availableTestItems) {
    const name = item.name.trim()
    if (!name) {
      continue
    }

    const existing = merged.get(name)
    if (!existing) {
      merged.set(name, { ...item, name })
      continue
    }

    merged.set(name, {
      ...existing,
      name,
      isValue: existing.isValue || item.isValue,
      isBin: existing.isBin || item.isBin,
      hasUcl: existing.hasUcl || item.hasUcl,
      hasLcl: existing.hasLcl || item.hasLcl,
    })
  }

  return Array.from(merged.values())
})

const filteredTestItems = computed(() => {
  // Filter out Bin items, only keep Criteria (isValue) and Non-Criteria (!isValue && !isBin)
  let items = uniqueAvailableTestItems.value.filter((item: TestItemInfo) => !item.isBin)

  // Apply search query
  if (searchTerms.value.length > 0) {
    items = items.filter((item: TestItemInfo) => {
      const itemName = item.name.toLowerCase()
      return searchTerms.value.every((term: string) => itemName.includes(term))
    })
  }

  return items
})

const includedTestItems = computed(() => localConfig.value.includedTestItems ?? [])
const excludedTestItems = computed(() => localConfig.value.excludedTestItems ?? [])
const searchTerms = computed(() =>
  normalizeSearchKeywords([...testItemSearchTerms.value, testItemSearchInput.value]),
)
const includedSet = computed(() => new Set(includedTestItems.value))
const excludedSet = computed(() => new Set(excludedTestItems.value))
const activeSelectionSet = computed(() =>
  selectionTarget.value === 'include' ? includedSet.value : excludedSet.value,
)
const oppositeSelectionSet = computed(() =>
  selectionTarget.value === 'include' ? excludedSet.value : includedSet.value,
)
const activeSelectionLabel = computed(() => (selectionTarget.value === 'include' ? 'Include' : 'Exclude'))
const activeSelectionCount = computed(() => activeSelectionSet.value.size)
const overlapItems = computed(() => {
  return includedTestItems.value.filter((itemName: string) => excludedSet.value.has(itemName))
})
const filteredTestItemEntries = computed(() => {
  return filteredTestItems.value.map((item: TestItemInfo) => {
    const isIncluded = includedSet.value.has(item.name)
    const isExcluded = excludedSet.value.has(item.name)
    const scoringConfig = isIncluded && item.isValue ? getTestItemScoringConfig(item.name) : null
    const scoringInfo = scoringConfig ? getScoringTypeInfo(scoringConfig.scoringType) : null

    return {
      name: item.name,
      isActiveSelection: activeSelectionSet.value.has(item.name),
      isIncluded,
      isExcluded,
      isLockedByOppositeSelection: oppositeSelectionSet.value.has(item.name),
      canConfigureScoring: isIncluded && item.isValue,
      scoringLabel: scoringInfo?.label,
      scoringColor: scoringInfo?.color ?? 'primary',
      scoringIcon: scoringInfo?.icon ?? 'mdi-tune',
      typeLabel: getTestItemTypeLabel(item),
      typeColor: getTestItemTypeColor(item),
    }
  })
})

function normalizeTestItemNames(items: string[] | undefined): string[] {
  return Array.from(new Set((items || []).map((item) => item.trim()).filter(Boolean)))
}

function normalizeSearchKeywords(items: string[] | undefined): string[] {
  return Array.from(
    new Set(
      (items || [])
        .flatMap((item) => item.toLowerCase().split(/[\s,]+/))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

function normalizeSelectionState(
  includedItems: string[] | undefined,
  excludedItems: string[] | undefined,
): { includedItems: string[]; excludedItems: string[] } {
  const normalizedExcluded = normalizeTestItemNames(excludedItems)
  const excludedLookup = new Set(normalizedExcluded)
  const normalizedIncluded = normalizeTestItemNames(includedItems).filter((item) => !excludedLookup.has(item))

  return {
    includedItems: normalizedIncluded,
    excludedItems: normalizedExcluded,
  }
}

function createDefaultConfig(): StationConfig {
  return {
    displayName: props.station?.display_station_name || '',
    stationName: props.station?.station_name || '',
    deviceIds: [],
    testStatus: 'PASS',
    minimumItemScore: 6.5,
    minimumItemScoreEnabled: true,
    includedTestItems: [],
    excludedTestItems: [],
    testItemScoringConfigs: {},
  }
}

function migrateStationConfig(config?: StationConfig): StationConfig {
  const defaultConfig = createDefaultConfig()
  const legacySelectedTestItems = normalizeTestItemNames(config?.selectedTestItems)
  const legacyMode = config?.testItemSelectionMode ?? 'include'
  const normalizedSelectionState = normalizeSelectionState(
    config?.includedTestItems ?? (legacyMode === 'include' ? legacySelectedTestItems : []),
    config?.excludedTestItems ?? (legacyMode === 'exclude' ? legacySelectedTestItems : []),
  )

  return {
    ...defaultConfig,
    ...config,
    deviceIds: [...(config?.deviceIds || [])],
    minimumItemScore: config?.minimumItemScore ?? 6.5,
    minimumItemScoreEnabled: config?.minimumItemScoreEnabled ?? true,
    includedTestItems: normalizedSelectionState.includedItems,
    excludedTestItems: normalizedSelectionState.excludedItems,
    selectedTestItems: undefined,
    testItemSelectionMode: undefined,
    testItemScoringConfigs: config?.testItemScoringConfigs || {},
  }
}

function getAllAnalyzableTestItemNames(): string[] {
  return uniqueAvailableTestItems.value
    .filter((item: TestItemInfo) => !item.isBin)
    .map((item: TestItemInfo) => item.name)
}

function getSelectionItems(target: 'include' | 'exclude'): string[] {
  return target === 'include' ? includedTestItems.value : excludedTestItems.value
}

function setSelectionItems(target: 'include' | 'exclude', items: string[]): void {
  const normalized = normalizeTestItemNames(items)
  if (target === 'include') {
    localConfig.value.includedTestItems = normalized.filter((item: string) => !excludedSet.value.has(item))
  } else {
    localConfig.value.excludedTestItems = normalized.filter((item: string) => !includedSet.value.has(item))
  }
}

function handleTestItemSearchTermsUpdate(items: string[]): void {
  testItemSearchTerms.value = normalizeSearchKeywords(items)
}

function commitTestItemSearchInput(): void {
  const normalizedInput = normalizeSearchKeywords([testItemSearchInput.value])
  if (normalizedInput.length === 0) {
    testItemSearchInput.value = ''
    return
  }

  testItemSearchTerms.value = normalizeSearchKeywords([...testItemSearchTerms.value, ...normalizedInput])
  testItemSearchInput.value = ''
}

function clearTestItemSearch(): void {
  testItemSearchTerms.value = []
  testItemSearchInput.value = ''
}

// Initialize config when dialog opens
watch(
  () => props.show,
  (newShow: boolean) => {
    if (newShow && props.station) {
      isFullscreen.value = false
      if (props.existingConfig) {
        localConfig.value = migrateStationConfig(props.existingConfig)
      } else {
        localConfig.value = migrateStationConfig(createDefaultConfig())
      }
      clearTestItemSearch()
      selectionTarget.value = 'include'
      scoringConfigItem.value = null
      scoringConfigDialog.value = false
    } else if (!newShow) {
      isFullscreen.value = false
    }
  },
)

function toggleFullscreen(): void {
  isFullscreen.value = !isFullscreen.value
}

function toggleSelectAllDevices(): void {
  if (allDevicesSelected.value) {
    localConfig.value.deviceIds = []
  } else {
    localConfig.value.deviceIds = [...props.availableDeviceIds]
  }
}

function toggleTestItem(name: string): void {
  if (oppositeSelectionSet.value.has(name)) {
    return
  }

  const activeItems = [...getSelectionItems(selectionTarget.value)]
  const index = activeItems.indexOf(name)
  if (index > -1) {
    activeItems.splice(index, 1)
  } else {
    activeItems.push(name)
  }

  setSelectionItems(selectionTarget.value, activeItems)
}

function selectDisplayedTestItems(): void {
  const currentItems = new Set(getSelectionItems(selectionTarget.value))
  for (const item of filteredTestItems.value) {
    currentItems.add(item.name)
  }
  setSelectionItems(selectionTarget.value, Array.from(currentItems))
}

function selectDisplayedAndConfigureScore(): void {
  selectionTarget.value = 'include'
  selectDisplayedTestItems()
  openBulkScoringConfig()
}

function selectValueTestItems(): void {
  const currentItems = new Set(getSelectionItems(selectionTarget.value))
  const itemsToAdd = uniqueAvailableTestItems.value
    .filter((item: TestItemInfo) => item.isValue && (item.hasUcl || item.hasLcl))
    .map((item: TestItemInfo) => item.name)

  for (const itemName of itemsToAdd) {
    currentItems.add(itemName)
  }

  setSelectionItems(selectionTarget.value, Array.from(currentItems))
}

function selectNonValueTestItems(): void {
  const currentItems = new Set(getSelectionItems(selectionTarget.value))
  const itemsToAdd = uniqueAvailableTestItems.value
    .filter((item: TestItemInfo) => item.isValue && !item.hasUcl && !item.hasLcl)
    .map((item: TestItemInfo) => item.name)

  for (const itemName of itemsToAdd) {
    currentItems.add(itemName)
  }

  setSelectionItems(selectionTarget.value, Array.from(currentItems))
}

function clearTestItemSelection(): void {
  setSelectionItems(selectionTarget.value, [])
}

function getTestItemTypeLabel(item: TestItemInfo): string {
  // CRITERIA: has UCL or LCL (criteria limits define criteria)
  if (item.isValue && (item.hasUcl || item.hasLcl)) return 'CRITERIA'
  // NON-CRITERIA: has numeric VALUE but no limits
  if (item.isValue && !item.hasUcl && !item.hasLcl) return 'NON-CRITERIA'
  return 'OTHER'
}

function getTestItemTypeColor(item: TestItemInfo): string {
  if (item.isValue && (item.hasUcl || item.hasLcl)) return 'success'
  if (item.isValue && !item.hasUcl && !item.hasLcl) return 'warning'
  return 'grey'
}

function handleSave(): void {
  if (!props.station) return

  // Update display and station names to ensure they're current
  localConfig.value.displayName = props.station.display_station_name
  localConfig.value.stationName = props.station.station_name

  const configToSave = migrateStationConfig(localConfig.value)
  configToSave.minimumItemScore = Math.min(10, Math.max(0, configToSave.minimumItemScore ?? 6.5))
  if ((configToSave.includedTestItems?.length ?? 0) === 0) {
    configToSave.includedTestItems = getAllAnalyzableTestItemNames()
  }

  emit('save', configToSave)
  isFullscreen.value = false
  internalShow.value = false
}

function handleRemove(): void {
  if (props.station) {
    emit('remove', props.station.display_station_name)
    isFullscreen.value = false
    internalShow.value = false
  }
}

function handleClose(): void {
  isFullscreen.value = false
  internalShow.value = false
}

function handleRefreshDevices(): void {
  emit('refresh-devices')
}

function handleRefreshTestItems(): void {
  emit('refresh-test-items')
}

function handleTestItemSourceChange(source: 'default' | 'iplas' | null): void {
  if (!source || source === props.testItemSource) {
    return
  }

  emit('change-test-item-source', source)
}

// Scoring configuration helper functions
function getTestItemScoringConfig(testItemName: string): TestItemScoringConfig {
  // Return existing config if already set
  if (localConfig.value.testItemScoringConfigs?.[testItemName]) {
    return localConfig.value.testItemScoringConfigs[testItemName]
  }

  // Auto-detect scoring type for new items
  const testItem = uniqueAvailableTestItems.value.find(
    (item: TestItemInfo) => item.name === testItemName,
  )

  // UPDATED: Auto-detect PER/MASK items (UCL-only, lower is better)
  if (testItem && shouldUsePerMaskScoring(testItemName) && testItem.hasUcl && !testItem.hasLcl) {
    return { scoringType: 'per_mask' }
  }

  // UPDATED: Auto-detect EVM items (UCL-only, lower is better with gentle decay)
  // Only use EVM scoring when there's no LCL - if LCL exists, use symmetrical
  if (testItem && shouldUseEvmScoring(testItemName) && testItem.hasUcl && !testItem.hasLcl) {
    return { scoringType: 'evm' }
  }

  // Default to symmetrical for all other items
  return { scoringType: 'symmetrical' }
}

function openScoringConfig(testItemName: string): void {
  scoringConfigItem.value = testItemName
  scoringConfigDialog.value = true
}

function closeScoringConfig(): void {
  scoringConfigDialog.value = false
  scoringConfigItem.value = null
}

function getScoringTypeInfo(scoringType: ScoringType) {
  return {
    ...SCORING_TYPE_INFO[scoringType],
    icon: getScoringTypeIcon(scoringType),
  }
}

function updateTestItemScoringType(testItemName: string, scoringType: ScoringType): void {
  if (!localConfig.value.testItemScoringConfigs) {
    localConfig.value.testItemScoringConfigs = {}
  }

  const existing = localConfig.value.testItemScoringConfigs[testItemName] || {}
  localConfig.value.testItemScoringConfigs[testItemName] = {
    ...existing,
    scoringType,
  }

  // Clear target if not required
  const typeInfo = SCORING_TYPE_INFO[scoringType]
  if (!typeInfo.requiredInputs?.includes('target')) {
    delete localConfig.value.testItemScoringConfigs[testItemName].target
  }
}

function updateTestItemTarget(testItemName: string, target: number | undefined): void {
  if (!localConfig.value.testItemScoringConfigs) {
    localConfig.value.testItemScoringConfigs = {}
  }

  if (!localConfig.value.testItemScoringConfigs[testItemName]) {
    localConfig.value.testItemScoringConfigs[testItemName] = { scoringType: 'symmetrical' }
  }

  localConfig.value.testItemScoringConfigs[testItemName].target = target
}

// UPDATED: Add function to update test item policy
function updateTestItemPolicy(testItemName: string, policy: ScoringPolicy): void {
  if (!localConfig.value.testItemScoringConfigs) {
    localConfig.value.testItemScoringConfigs = {}
  }

  if (!localConfig.value.testItemScoringConfigs[testItemName]) {
    localConfig.value.testItemScoringConfigs[testItemName] = { scoringType: 'asymmetrical' }
  }

  localConfig.value.testItemScoringConfigs[testItemName].policy = policy
}

function scoringRequiresTarget(scoringType: ScoringType): boolean {
  return SCORING_TYPE_INFO[scoringType].requiredInputs?.includes('target') ?? false
}

// Bulk configuration functions
function openBulkScoringConfig(): void {
  bulkScoringType.value = 'symmetrical'
  bulkTarget.value = undefined
  bulkPolicy.value = 'symmetrical' // UPDATED: Reset policy
  bulkWeight.value = 1.0
  bulkScoringDialog.value = true
}

function closeBulkScoringConfig(): void {
  bulkScoringDialog.value = false
}

function applyBulkScoringConfig(): void {
  if (!localConfig.value.testItemScoringConfigs) {
    localConfig.value.testItemScoringConfigs = {}
  }

  // Apply to all selected criteria test items (has VALUE + UCL or LCL)
  const criteriaItems = uniqueAvailableTestItems.value.filter(
    (item: TestItemInfo) =>
      item.isValue &&
      (item.hasUcl || item.hasLcl) &&
      includedTestItems.value.includes(item.name),
  )

  for (const item of criteriaItems) {
    const config: TestItemScoringConfig = {
      scoringType: bulkScoringType.value,
      weight: bulkWeight.value,
    }

    // Only add target if required and provided
    if (scoringRequiresTarget(bulkScoringType.value) && bulkTarget.value !== undefined) {
      config.target = bulkTarget.value
    }

    // UPDATED: Add policy for asymmetrical scoring
    if (bulkScoringType.value === 'asymmetrical') {
      config.policy = bulkPolicy.value
    }

    localConfig.value.testItemScoringConfigs[item.name] = config
  }

  closeBulkScoringConfig()
}

// Get count of selected criteria items for bulk config
const selectedCriteriaCount = computed(() => {
  // CRITERIA: has VALUE + (UCL or LCL)
  return uniqueAvailableTestItems.value.filter(
    (item: TestItemInfo) =>
      item.isValue &&
      (item.hasUcl || item.hasLcl) &&
      includedSet.value.has(item.name),
  ).length
})

// Get count of criteria items in currently displayed/filtered list
const displayedCriteriaCount = computed(() => {
  return filteredTestItems.value.filter(
    (item: TestItemInfo) => item.isValue && (item.hasUcl || item.hasLcl),
  ).length
})

const bulkScoringTypeRequiresTarget = computed(() => {
  return scoringRequiresTarget(bulkScoringType.value)
})

// Update test item weight
function updateTestItemWeight(testItemName: string, weight: number | undefined): void {
  if (!localConfig.value.testItemScoringConfigs) {
    localConfig.value.testItemScoringConfigs = {}
  }

  if (!localConfig.value.testItemScoringConfigs[testItemName]) {
    localConfig.value.testItemScoringConfigs[testItemName] = { scoringType: 'symmetrical' }
  }

  localConfig.value.testItemScoringConfigs[testItemName].weight = weight ?? 1.0
}

// Computed for current scoring config being edited
const currentScoringConfig = computed(() => {
  if (!scoringConfigItem.value) return null
  return getTestItemScoringConfig(scoringConfigItem.value)
})

const currentScoringTypeRequiresTarget = computed(() => {
  if (!currentScoringConfig.value) return false
  return scoringRequiresTarget(currentScoringConfig.value.scoringType)
})

// UPDATED: Check if current scoring type requires policy (asymmetrical only)
const currentScoringTypeRequiresPolicy = computed(() => {
  if (!currentScoringConfig.value) return false
  return currentScoringConfig.value.scoringType === 'asymmetrical'
})

// UPDATED: Check if bulk scoring type requires policy
const bulkScoringTypeRequiresPolicy = computed(() => {
  return bulkScoringType.value === 'asymmetrical'
})
</script>

<style scoped>
.border {
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.station-config-card {
  height: 100%;
}

.station-config-title {
  min-width: 0;
}

.station-config-body {
  max-height: 70vh;
  overflow-y: auto;
}

.station-config-body--fullscreen {
  max-height: calc(100vh - 64px);
}

.gap-1 {
  gap: 0.25rem;
}

.gap-2 {
  gap: 0.5rem;
}

.gap-3 {
  gap: 0.75rem;
}

.test-item-row {
  cursor: pointer;
}

.test-item-row:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.test-item-row--disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.test-item-row--disabled:hover {
  background-color: transparent;
}

.scoring-config-btn {
  text-transform: none;
  font-size: 0.7rem;
}

.test-item-section-header {
  background: linear-gradient(135deg,
      rgba(var(--v-theme-surface-variant), 0.18),
      rgba(var(--v-theme-surface), 0.94));
  color: rgb(var(--v-theme-on-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  gap: 0.75rem;
  white-space: normal;
}

.test-item-section-title {
  gap: 0.375rem;
  font-weight: 600;
}

.test-item-source-toggle {
  border-radius: 999px;
  background-color: rgba(var(--v-theme-background), 0.92);
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-on-surface), 0.04);
  padding: 0.1875rem;
}

:deep(.test-item-source-toggle .v-btn) {
  min-width: 84px;
  color: rgba(var(--v-theme-on-surface), 0.82) !important;
  border-color: transparent !important;
  font-weight: 600;
  letter-spacing: 0.01em;
}

:deep(.test-item-source-toggle .v-btn:hover) {
  background-color: rgba(var(--v-theme-primary), 0.12);
}

:deep(.test-item-source-toggle .v-btn.v-btn--active) {
  color: rgb(var(--v-theme-on-primary)) !important;
  background-color: rgb(var(--v-theme-primary)) !important;
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.28);
}

.selection-mode-toggle {
  flex-wrap: wrap;
}

:deep(.selection-mode-toggle .v-btn) {
  min-width: 184px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

/* UPDATED: Fix icon cropping inside chips */
:deep(.v-chip .v-icon) {
  margin-right: 4px;
}

:deep(.v-chip__content) {
  overflow: visible;
}

.min-score-section {
  border-color: rgba(255, 193, 7, 0.28);
  background: linear-gradient(180deg, rgba(255, 193, 7, 0.08), rgba(255, 193, 7, 0.02));
}

.min-score-summary {
  flex: 1 1 320px;
}

.min-score-switch {
  min-width: 120px;
}

.min-score-controls {
  justify-content: flex-end;
}

.min-score-input {
  width: 150px;
}

.test-item-list-container {
  overflow: hidden;
}

.test-item-list-container--fullscreen {
  max-height: none;
}

.test-item-row-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

@media (max-width: 960px) {
  .min-score-controls {
    width: 100%;
    justify-content: flex-start;
  }

  .min-score-input {
    width: 100%;
    max-width: 220px;
  }
}

@media (max-width: 600px) {
  .station-config-body {
    padding: 12px !important;
  }

  .test-item-row-actions {
    max-width: 100%;
  }
}
</style>
