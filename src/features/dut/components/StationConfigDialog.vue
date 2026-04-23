<template>
  <AppDialog :model-value="internalShow" :width="dialogWidth" :breakpoints="{ '1200px': '96vw', '760px': '98vw' }"
    persistent :closable="false" @update:modelValue="internalShow = $event">
    <template #header>
      <div class="station-config-dialog__header">
        <div class="station-config-dialog__header-copy">
          <p class="station-config-dialog__eyebrow">Station Configuration</p>
          <h2>Configure Station: {{ station?.display_station_name }}</h2>
          <span>Refine device scope, analyzable items, and scoring rules for this iPLAS station.</span>
        </div>
        <div class="station-config-dialog__header-actions">
          <button type="button" class="station-config-dialog__icon-button"
            :aria-label="isFullscreen ? 'Exit expanded mode' : 'Expand dialog'" @click="toggleFullscreen">
            {{ isFullscreen ? 'Collapse' : 'Expand' }}
          </button>
          <button type="button" class="station-config-dialog__icon-button" @click="handleClose">
            Close
          </button>
        </div>
      </div>
    </template>

    <section class="station-config-body" :class="{ 'station-config-body--fullscreen': isFullscreen }">
      <div class="station-config-shell">
        <AppPanel title="Minimum Test Item Score" tone="warm" compact-header class="min-score-section">
          <div class="station-config-dialog__min-score-layout">
            <div class="min-score-summary">
              <p>DUT will be considered as <strong>Min. Score Fail</strong> if one test item score is below the
                threshold.
              </p>
            </div>
            <div class="station-config-dialog__toggle-row min-score-controls">
              <label class="station-config-dialog__toggle-pill"
                :class="{ 'is-active': localConfig.minimumItemScoreEnabled }">
                <input v-model="localConfig.minimumItemScoreEnabled" type="checkbox" />
                <span>{{ localConfig.minimumItemScoreEnabled ? 'Enabled' : 'Disabled' }}</span>
              </label>
              <label v-if="localConfig.minimumItemScoreEnabled" class="station-config-dialog__field min-score-input">
                <span>Threshold</span>
                <input v-model.number="localConfig.minimumItemScore" type="number" min="0" max="10" step="0.1" />
              </label>
              <span v-else class="station-config-dialog__pill station-config-dialog__pill--muted">Check disabled</span>
            </div>
          </div>
        </AppPanel>

        <AppPanel title="Device Scope" tone="cool" compact-header>
          <div class="station-config-dialog__section-stack">
            <div class="station-config-dialog__toolbar-row">
              <button type="button" class="station-config-dialog__button station-config-dialog__button--ghost"
                @click="toggleSelectAllDevices">
                {{ allDevicesSelected ? 'Deselect All Devices' : 'Select All Devices' }}
              </button>
              <button type="button" class="station-config-dialog__button station-config-dialog__button--ghost"
                :disabled="loadingDevices" @click="handleRefreshDevices">
                {{ loadingDevices ? 'Refreshing...' : 'Refresh Devices' }}
              </button>
            </div>

            <div v-if="loadingDevices" class="station-config-dialog__notice station-config-dialog__notice--info">
              Loading devices for the selected station...
            </div>
            <div v-else-if="availableDeviceIds.length === 0"
              class="station-config-dialog__notice station-config-dialog__notice--info">
              No devices available yet. Refresh after station data is ready.
            </div>
            <div v-else class="station-config-dialog__chip-grid">
              <button v-for="deviceId in availableDeviceIds" :key="deviceId" type="button"
                class="station-config-dialog__choice-chip"
                :class="{ 'is-active': localConfig.deviceIds.includes(deviceId) }" @click="toggleDeviceId(deviceId)">
                {{ deviceId }}
              </button>
            </div>

            <div v-if="localConfig.deviceIds.length > 0" class="station-config-dialog__token-row">
              <button v-for="deviceId in localConfig.deviceIds" :key="deviceId" type="button"
                class="station-config-dialog__token" @click="toggleDeviceId(deviceId)">
                <span>{{ deviceId }}</span>
                <span aria-hidden="true">x</span>
              </button>
            </div>
          </div>
        </AppPanel>

        <div v-if="deviceError" class="station-config-dialog__notice station-config-dialog__notice--danger">
          {{ deviceError }}
        </div>

        <AppPanel title="Test Items Selection" compact-header>
          <template #header-aside>
            <div class="station-config-dialog__header-chip-row">
              <button type="button" class="station-config-dialog__toggle-chip"
                :class="{ 'is-active': testItemSource === 'default' }" @click="handleTestItemSourceChange('default')">
                Default
              </button>
              <button type="button" class="station-config-dialog__toggle-chip"
                :class="{ 'is-active': testItemSource === 'iplas' }" @click="handleTestItemSourceChange('iplas')">
                iPLAS
              </button>
              <button v-if="!loadingTestItems" type="button"
                class="station-config-dialog__button station-config-dialog__button--ghost"
                @click="handleRefreshTestItems">
                Refresh
              </button>
            </div>
          </template>

          <div v-if="loadingTestItems" class="station-config-dialog__loading-state">
            <div class="station-config-dialog__spinner"></div>
            <p>Loading test items...</p>
          </div>
          <div v-else-if="testItemsError" class="station-config-dialog__notice station-config-dialog__notice--danger">
            {{ testItemsError }}
          </div>
          <div v-else-if="uniqueAvailableTestItems.length === 0"
            class="station-config-dialog__notice station-config-dialog__notice--info">
            No test items available. Refresh the source after device IDs and date range are ready.
          </div>
          <div v-else class="station-config-dialog__section-stack">
            <div class="station-config-dialog__toolbar-grid">
              <div class="station-config-dialog__selection-toggle-row">
                <button type="button" class="station-config-dialog__toggle-chip"
                  :class="{ 'is-active': selectionTarget === 'include' }" @click="selectionTarget = 'include'">
                  INCLUDE ({{ includedTestItems.length }} Selected)
                </button>
                <button type="button" class="station-config-dialog__toggle-chip"
                  :class="{ 'is-active': selectionTarget === 'exclude' }" @click="selectionTarget = 'exclude'">
                  EXCLUDE ({{ excludedTestItems.length }} Selected)
                </button>
                <span class="station-config-dialog__pill station-config-dialog__pill--muted">{{
                  filteredTestItemEntries.length }} Showing</span>
              </div>
              <div class="station-config-dialog__header-chip-row station-config-dialog__header-chip-row--end">
                <button type="button" class="station-config-dialog__button station-config-dialog__button--ghost"
                  :disabled="selectedCriteriaCount === 0" @click="openBulkScoringConfig">
                  Bulk Scoring ({{ selectedCriteriaCount }})
                </button>
              </div>
            </div>

            <div class="station-config-dialog__action-grid">
              <button type="button" class="station-config-dialog__action-tile"
                :disabled="filteredTestItemEntries.length === 0" @click="selectDisplayedTestItems">
                <strong>Add Displayed</strong>
                <span>{{ filteredTestItemEntries.length }} visible item(s)</span>
              </button>
              <button type="button" class="station-config-dialog__action-tile" @click="selectValueTestItems">
                <strong>Add Criteria</strong>
                <span>Add criteria items to {{ activeSelectionLabel }}</span>
              </button>
              <button type="button" class="station-config-dialog__action-tile" @click="selectNonValueTestItems">
                <strong>Add Non-Criteria</strong>
                <span>Add non-criteria items to {{ activeSelectionLabel }}</span>
              </button>
              <button type="button" class="station-config-dialog__action-tile" :disabled="activeSelectionCount === 0"
                @click="clearTestItemSelection">
                <strong>Clear {{ activeSelectionLabel }}</strong>
                <span>Remove all items from the active list</span>
              </button>
              <button v-if="selectionTarget === 'include'" type="button" class="station-config-dialog__action-tile"
                :disabled="displayedCriteriaCount === 0" @click="selectDisplayedAndConfigureScore">
                <strong>Add Displayed Criteria And Configure Score</strong>
                <span>{{ displayedCriteriaCount }} criteria item(s)</span>
              </button>
            </div>

            <p class="station-config-dialog__helper-copy">
              Add items to Include for analysis, add items to Exclude to remove them, and items already assigned to one
              list
              are locked while you edit the other list.
            </p>

            <div class="station-config-dialog__search-stack">
              <label class="station-config-dialog__field">
                <span>Search {{ activeSelectionLabel }} Candidates</span>
                <input v-model="testItemSearchInput" type="text"
                  placeholder="Type keywords and press Enter, e.g. tx rx 2404"
                  @keydown.enter.prevent="commitTestItemSearchInput" @keydown.comma.prevent="commitTestItemSearchInput"
                  @blur="commitTestItemSearchInput" />
              </label>
              <div v-if="testItemSearchTerms.length > 0" class="station-config-dialog__token-row">
                <button v-for="term in testItemSearchTerms" :key="term" type="button"
                  class="station-config-dialog__token" @click="removeTestItemSearchTerm(term)">
                  <span>{{ term }}</span>
                  <span aria-hidden="true">x</span>
                </button>
                <button type="button" class="station-config-dialog__button station-config-dialog__button--ghost"
                  @click="clearTestItemSearch">
                  Clear Search
                </button>
              </div>
            </div>

            <div v-if="overlapItems.length > 0"
              class="station-config-dialog__notice station-config-dialog__notice--warning">
              {{ overlapItems.length }} item(s) exist in both Include and Exclude. They will be excluded from analysis.
            </div>

            <div class="test-item-list-container" :class="{ 'test-item-list-container--fullscreen': isFullscreen }">
              <div class="station-config-dialog__item-list" :style="{ maxHeight: `${testItemListHeight}px` }">
                <div v-for="entry in filteredTestItemEntries" :key="entry.name" class="test-item-row"
                  :class="{ 'test-item-row--disabled': entry.isLockedByOppositeSelection, 'is-active': entry.isActiveSelection }"
                  role="button" :tabindex="entry.isLockedByOppositeSelection ? -1 : 0"
                  :aria-disabled="entry.isLockedByOppositeSelection"
                  @click="!entry.isLockedByOppositeSelection && toggleTestItem(entry.name)"
                  @keydown.enter.prevent="!entry.isLockedByOppositeSelection && toggleTestItem(entry.name)"
                  @keydown.space.prevent="!entry.isLockedByOppositeSelection && toggleTestItem(entry.name)">
                  <span class="station-config-dialog__checkmark"
                    :class="{ 'is-active': entry.isActiveSelection }"></span>
                  <span class="station-config-dialog__item-name">{{ entry.name }}</span>
                  <span class="test-item-row-actions">
                    <span v-if="entry.isIncluded"
                      class="station-config-dialog__pill station-config-dialog__pill--success">Included</span>
                    <span v-if="entry.isExcluded"
                      class="station-config-dialog__pill station-config-dialog__pill--warning">Excluded</span>
                    <button v-if="entry.canConfigureScoring && entry.scoringLabel" type="button"
                      class="station-config-dialog__pill-button" :class="getScoringColorClass(entry.scoringColor)"
                      @click.stop="openScoringConfig(entry.name)">
                      {{ entry.scoringLabel }}
                    </button>
                    <span class="station-config-dialog__pill" :class="getTestItemTypeClass(entry.typeColor)">{{
                      entry.typeLabel }}</span>
                  </span>
                </div>
              </div>
              <div v-if="filteredTestItemEntries.length === 0" class="station-config-dialog__empty-state">
                No matching test items found.
              </div>
            </div>

            <p class="station-config-dialog__helper-copy station-config-dialog__helper-copy--footnote">
              Leave Include empty to default to all analyzable items on save. Use the scoring button on included
              criteria
              items when you need custom scoring.
            </p>
          </div>
        </AppPanel>
      </div>
    </section>

    <template #footer>
      <div class="station-config-dialog__footer">
        <button v-if="isExistingConfig" type="button"
          class="station-config-dialog__button station-config-dialog__button--danger" @click="handleRemove">
          Remove Station
        </button>
        <div class="station-config-dialog__footer-spacer"></div>
        <button type="button" class="station-config-dialog__button station-config-dialog__button--ghost"
          @click="handleClose">
          Cancel
        </button>
        <button type="button" class="station-config-dialog__button station-config-dialog__button--primary"
          @click="handleSave">
          Save Configuration
        </button>
      </div>
    </template>
  </AppDialog>

  <AppDialog :model-value="scoringConfigDialog" title="Configure Scoring" :description="scoringConfigItem ?? ''"
    width="min(92vw, 34rem)" persistent :closable="false" @update:modelValue="handleScoringDialogVisibility">
    <div v-if="scoringConfigItem" class="station-config-dialog__modal-stack">
      <label class="station-config-dialog__field">
        <span>Scoring Algorithm</span>
        <select :value="getTestItemScoringConfig(scoringConfigItem).scoringType"
          @change="updateTestItemScoringType(scoringConfigItem, ($event.target as HTMLSelectElement).value as ScoringType)">
          <option v-for="option in scoringTypeOptions" :key="option.value" :value="option.value">
            {{ option.title }}
          </option>
        </select>
        <small>{{ getScoringTypeInfo(getTestItemScoringConfig(scoringConfigItem).scoringType).description }}</small>
      </label>

      <label v-if="currentScoringTypeRequiresTarget" class="station-config-dialog__field">
        <span>Target Value</span>
        <input :value="getTestItemScoringConfig(scoringConfigItem).target ?? ''" type="number"
          placeholder="Enter the optimal target value"
          @input="updateTestItemTarget(scoringConfigItem, toOptionalNumber(($event.target as HTMLInputElement).value))" />
        <small>Required when the selected scoring algorithm depends on a target.</small>
      </label>

      <label v-if="currentScoringTypeRequiresPolicy" class="station-config-dialog__field">
        <span>Scoring Policy</span>
        <select :value="getTestItemScoringConfig(scoringConfigItem).policy || 'symmetrical'"
          @change="updateTestItemPolicy(scoringConfigItem, ($event.target as HTMLSelectElement).value as ScoringPolicy)">
          <option v-for="option in policyOptions" :key="option.value" :value="option.value">
            {{ option.title }}
          </option>
        </select>
      </label>

      <label class="station-config-dialog__field">
        <span>Weight</span>
        <input :value="getTestItemScoringConfig(scoringConfigItem).weight ?? 1.0" type="number" min="0" step="0.1"
          @input="updateTestItemWeight(scoringConfigItem, toNumber(($event.target as HTMLInputElement).value, 1.0))" />
        <small>Weight for this test item in the overall score calculation.</small>
      </label>

      <div class="station-config-dialog__notice station-config-dialog__notice--info">
        <strong>Formula:</strong>
        <span>{{ getScoringTypeInfo(getTestItemScoringConfig(scoringConfigItem).scoringType).description }}</span>
      </div>
    </div>

    <template #footer>
      <div class="station-config-dialog__footer">
        <div class="station-config-dialog__footer-spacer"></div>
        <button type="button" class="station-config-dialog__button station-config-dialog__button--primary"
          @click="closeScoringConfig">
          Done
        </button>
      </div>
    </template>
  </AppDialog>

  <AppDialog :model-value="bulkScoringDialog" title="Bulk Configure Scoring"
    :description="`Apply to ${selectedCriteriaCount} selected criteria test item(s).`" width="min(92vw, 36rem)"
    persistent :closable="false" @update:modelValue="bulkScoringDialog = $event">
    <div class="station-config-dialog__modal-stack">
      <div class="station-config-dialog__notice station-config-dialog__notice--info">
        This applies the selected scoring algorithm and weight to all {{ selectedCriteriaCount }} selected criteria
        items.
      </div>

      <label class="station-config-dialog__field">
        <span>Scoring Algorithm</span>
        <select v-model="bulkScoringType">
          <option v-for="option in scoringTypeOptions" :key="option.value" :value="option.value">
            {{ option.title }}
          </option>
        </select>
        <small>{{ getScoringTypeInfo(bulkScoringType).description }}</small>
      </label>

      <label v-if="bulkScoringTypeRequiresTarget" class="station-config-dialog__field">
        <span>Target Value</span>
        <input v-model.number="bulkTarget" type="number" placeholder="Enter the optimal target value" />
        <small>Required when the selected scoring algorithm depends on a target.</small>
      </label>

      <label v-if="bulkScoringTypeRequiresPolicy" class="station-config-dialog__field">
        <span>Scoring Policy</span>
        <select v-model="bulkPolicy">
          <option v-for="option in policyOptions" :key="option.value" :value="option.value">
            {{ option.title }}
          </option>
        </select>
      </label>

      <label class="station-config-dialog__field">
        <span>Weight</span>
        <input v-model.number="bulkWeight" type="number" min="0" step="0.1" />
        <small>Weight for these test items in the overall score calculation.</small>
      </label>

      <div class="station-config-dialog__notice station-config-dialog__notice--info">
        <strong>Formula:</strong>
        <span>{{ getScoringTypeInfo(bulkScoringType).description }}</span>
      </div>
    </div>

    <template #footer>
      <div class="station-config-dialog__footer">
        <button type="button" class="station-config-dialog__button station-config-dialog__button--ghost"
          @click="closeBulkScoringConfig">
          Cancel
        </button>
        <div class="station-config-dialog__footer-spacer"></div>
        <button type="button" class="station-config-dialog__button station-config-dialog__button--primary"
          :disabled="bulkScoringTypeRequiresTarget && bulkTarget === undefined" @click="applyBulkScoringConfig">
          Apply to {{ selectedCriteriaCount }} Items
        </button>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AppDialog, AppPanel } from '@/shared/ui'
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

const dialogWidth = computed(() => (isFullscreen.value ? '98vw' : 'min(96vw, 72rem)'))

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

function removeTestItemSearchTerm(term: string): void {
  testItemSearchTerms.value = testItemSearchTerms.value.filter((item: string) => item !== term)
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

function toggleDeviceId(deviceId: string): void {
  if (localConfig.value.deviceIds.includes(deviceId)) {
    localConfig.value.deviceIds = localConfig.value.deviceIds.filter((id: string) => id !== deviceId)
    return
  }

  localConfig.value.deviceIds = [...localConfig.value.deviceIds, deviceId]
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

function getTestItemTypeClass(typeColor: string): string {
  switch (typeColor) {
    case 'success':
      return 'station-config-dialog__pill--success'
    case 'warning':
      return 'station-config-dialog__pill--warning'
    default:
      return 'station-config-dialog__pill--muted'
  }
}

function getScoringColorClass(color: string): string {
  switch (color) {
    case 'success':
    case 'green':
      return 'station-config-dialog__pill-button--success'
    case 'warning':
    case 'orange':
      return 'station-config-dialog__pill-button--warning'
    case 'error':
    case 'red':
      return 'station-config-dialog__pill-button--danger'
    case 'info':
    case 'primary':
    case 'blue':
      return 'station-config-dialog__pill-button--info'
    default:
      return 'station-config-dialog__pill-button--violet'
  }
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

function handleScoringDialogVisibility(value: boolean): void {
  if (!value) {
    closeScoringConfig()
    return
  }

  scoringConfigDialog.value = true
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

function toNumber(value: string, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toOptionalNumber(value: string): number | undefined {
  if (value.trim().length === 0) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
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

.station-config-title {
  min-width: 0;
}

.station-config-shell {
  display: grid;
  gap: 1rem;
}

.station-config-dialog__section-stack,
.station-config-dialog__search-stack,
.station-config-dialog__item-list,
.station-config-dialog__chip-grid,
.station-config-dialog__action-grid,
.station-config-dialog__min-score-layout,
.station-config-dialog__toolbar-grid,
.station-config-dialog__toolbar-row,
.station-config-dialog__selection-toggle-row,
.station-config-dialog__header-chip-row,
.station-config-dialog__token-row,
.station-config-dialog__toggle-row,
.test-item-row,
.test-item-row-actions {
  display: grid;
  gap: 0.75rem;
}

.station-config-dialog__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  width: 100%;
}

.station-config-dialog__header-copy {
  display: grid;
  gap: 0.25rem;
}

.station-config-dialog__header-copy h2 {
  margin: 0;
  color: var(--app-ink);
  font-family: var(--app-display);
  font-size: 1.35rem;
}

.station-config-dialog__header-copy span {
  color: var(--app-muted);
  line-height: 1.55;
}

.station-config-dialog__eyebrow {
  margin: 0;
  color: var(--app-accent);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.station-config-dialog__header-actions,
.station-config-dialog__footer {
  display: grid;
  grid-auto-flow: column;
  gap: 0.65rem;
  align-items: center;
}

.station-config-dialog__footer {
  width: 100%;
}

.station-config-dialog__footer-spacer {
  min-width: 1px;
}

.station-config-dialog__button,
.station-config-dialog__icon-button {
  min-height: 2.75rem;
  border-radius: 0.95rem;
  border: 1px solid var(--app-border);
  background: rgba(255, 251, 247, 0.92);
  color: var(--app-ink);
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.station-config-dialog__button:hover,
.station-config-dialog__icon-button:hover {
  transform: translateY(-1px);
}

.station-config-dialog__button {
  padding: 0.7rem 1rem;
}

.station-config-dialog__icon-button {
  padding: 0.7rem 0.95rem;
}

.station-config-dialog__button--primary {
  background: linear-gradient(135deg, #145847, #1b6c58);
  border-color: #145847;
  color: white;
}

.station-config-dialog__button--danger {
  border-color: rgba(164, 52, 58, 0.24);
  color: #8e3037;
}

.station-config-dialog__button--ghost {
  background: rgba(255, 251, 247, 0.92);
}

.station-config-dialog__modal-stack {
  display: grid;
  gap: 1rem;
}

.station-config-dialog__field {
  display: grid;
  gap: 0.4rem;
}

.station-config-dialog__field span {
  color: var(--app-ink);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.station-config-dialog__field input,
.station-config-dialog__field select {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.95rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  padding: 0.8rem 0.9rem;
  font: inherit;
}

.station-config-dialog__field small {
  color: var(--app-muted);
  line-height: 1.5;
}

.station-config-dialog__notice {
  display: grid;
  gap: 0.35rem;
  padding: 0.9rem 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(40, 96, 163, 0.14);
  background: rgba(40, 96, 163, 0.08);
  color: #1f4f89;
  line-height: 1.55;
}

.station-config-dialog__notice--info strong {
  color: #173b66;
}

.station-config-dialog__notice--danger {
  border-color: rgba(164, 52, 58, 0.16);
  background: rgba(164, 52, 58, 0.08);
  color: #8e3037;
}

.station-config-dialog__notice--warning {
  border-color: rgba(169, 102, 34, 0.18);
  background: rgba(169, 102, 34, 0.1);
  color: #88551c;
}

.station-config-dialog__toolbar-row,
.station-config-dialog__header-chip-row,
.station-config-dialog__token-row,
.station-config-dialog__toggle-row,
.station-config-dialog__selection-toggle-row {
  grid-auto-flow: column;
  align-items: center;
  justify-content: start;
}

.station-config-dialog__toolbar-grid {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.station-config-dialog__header-chip-row--end {
  justify-content: end;
}

.station-config-dialog__action-grid,
.station-config-dialog__chip-grid {
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
}

.station-config-dialog__choice-chip,
.station-config-dialog__toggle-chip,
.station-config-dialog__token,
.station-config-dialog__pill,
.station-config-dialog__pill-button,
.station-config-dialog__action-tile,
.station-config-dialog__toggle-pill {
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 700;
}

.station-config-dialog__choice-chip,
.station-config-dialog__toggle-chip,
.station-config-dialog__token,
.station-config-dialog__pill-button,
.station-config-dialog__action-tile,
.station-config-dialog__toggle-pill,
.test-item-row {
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.station-config-dialog__choice-chip:hover,
.station-config-dialog__toggle-chip:hover,
.station-config-dialog__token:hover,
.station-config-dialog__pill-button:hover,
.station-config-dialog__action-tile:hover,
.station-config-dialog__toggle-pill:hover,
.test-item-row:hover {
  transform: translateY(-1px);
}

.station-config-dialog__choice-chip,
.station-config-dialog__toggle-chip,
.station-config-dialog__token,
.station-config-dialog__pill,
.station-config-dialog__pill-button,
.station-config-dialog__toggle-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.4rem;
  padding: 0.5rem 0.8rem;
  background: rgba(255, 251, 247, 0.92);
  color: var(--app-ink);
}

.station-config-dialog__toggle-pill input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.station-config-dialog__choice-chip.is-active,
.station-config-dialog__toggle-chip.is-active,
.station-config-dialog__toggle-pill.is-active {
  background: rgba(20, 88, 71, 0.1);
  border-color: rgba(20, 88, 71, 0.18);
  color: #145847;
}

.station-config-dialog__token {
  gap: 0.35rem;
  border-color: rgba(40, 96, 163, 0.16);
  background: rgba(40, 96, 163, 0.08);
  color: #1f4f89;
}

.station-config-dialog__pill--muted {
  background: rgba(95, 103, 122, 0.1);
  border-color: rgba(95, 103, 122, 0.16);
  color: #4c566a;
}

.station-config-dialog__pill--success,
.station-config-dialog__pill-button--success {
  background: rgba(20, 88, 71, 0.1);
  border-color: rgba(20, 88, 71, 0.16);
  color: #145847;
}

.station-config-dialog__pill--warning,
.station-config-dialog__pill-button--warning {
  background: rgba(169, 102, 34, 0.1);
  border-color: rgba(169, 102, 34, 0.18);
  color: #88551c;
}

.station-config-dialog__pill-button--info {
  background: rgba(40, 96, 163, 0.08);
  border-color: rgba(40, 96, 163, 0.16);
  color: #1f4f89;
}

.station-config-dialog__pill-button--danger {
  background: rgba(164, 52, 58, 0.08);
  border-color: rgba(164, 52, 58, 0.16);
  color: #8e3037;
}

.station-config-dialog__pill-button--violet {
  background: rgba(128, 83, 161, 0.08);
  border-color: rgba(128, 83, 161, 0.16);
  color: #6e3f91;
}

.station-config-dialog__action-tile {
  display: grid;
  gap: 0.25rem;
  align-content: start;
  justify-items: start;
  min-height: 5.25rem;
  padding: 0.9rem 1rem;
  border-radius: 1rem;
  border-color: rgba(20, 88, 71, 0.12);
  background: rgba(255, 255, 255, 0.72);
  color: var(--app-ink);
  text-align: left;
}

.station-config-dialog__action-tile span,
.station-config-dialog__helper-copy,
.min-score-summary p,
.station-config-dialog__empty-state {
  color: var(--app-muted);
  line-height: 1.55;
}

.station-config-dialog__loading-state {
  display: grid;
  place-items: center;
  gap: 0.8rem;
  padding: 2rem 1rem;
  color: var(--app-muted);
}

.station-config-dialog__spinner {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 3px solid rgba(20, 88, 71, 0.16);
  border-top-color: #145847;
  animation: station-config-spin 0.9s linear infinite;
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

.test-item-row:hover {
  background-color: rgba(246, 255, 250, 0.88);
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

.station-config-dialog__min-score-layout {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
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
  border: 1px solid rgba(20, 88, 71, 0.12);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.72);
  overflow: hidden;
}

.test-item-list-container--fullscreen {
  max-height: none;
}

.test-item-row {
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  width: 100%;
  padding: 0.85rem 0.95rem;
  border-radius: 0.9rem;
  border: 1px solid transparent;
  background: transparent;
  text-align: left;
}

.test-item-row.is-active {
  border-color: rgba(20, 88, 71, 0.18);
}

.test-item-row-actions {
  grid-auto-flow: column;
  align-items: center;
  justify-content: end;
}

.station-config-dialog__checkmark {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 0.3rem;
  border: 1px solid rgba(20, 88, 71, 0.24);
  background: white;
}

.station-config-dialog__checkmark.is-active {
  background: #145847;
  border-color: #145847;
  box-shadow: inset 0 0 0 0.2rem white;
}

.station-config-dialog__item-name {
  color: var(--app-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.station-config-dialog__helper-copy--footnote {
  margin: 0;
}

.station-config-dialog__empty-state {
  padding: 1.5rem;
  text-align: center;
}

@keyframes station-config-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 840px) {
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

  .station-config-dialog__toolbar-grid,
  .station-config-dialog__min-score-layout,
  .test-item-row,
  .test-item-row-actions,
  .station-config-dialog__selection-toggle-row,
  .station-config-dialog__header-chip-row,
  .station-config-dialog__token-row,
  .station-config-dialog__toggle-row {
    grid-auto-flow: row;
    grid-template-columns: minmax(0, 1fr);
    justify-content: stretch;
  }

  .station-config-dialog__header,
  .station-config-dialog__header-actions,
  .station-config-dialog__footer {
    grid-auto-flow: row;
  }

  .station-config-body {
    padding: 12px !important;
  }

  .test-item-row-actions {
    max-width: 100%;
  }
}
</style>
