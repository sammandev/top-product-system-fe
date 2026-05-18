<template>
  <AppDialog :model-value="dialogOpen" v-model:fullscreen="dialogFullscreen" width="min(98vw, 84rem)"
    fullscreen-width="100vw" fullscreenable sticky-header :breakpoints="{ '1100px': '96vw', '760px': '100vw' }"
    persistent title="Configure Scoring"
    description="Filter, select, and adjust upload-log scoring rules without leaving the comparison workflow."
    @update:modelValue="dialogOpen = $event">
    <template #header-actions>
      <span class="upload-scoring-dialog__pill upload-scoring-dialog__pill--muted">
        {{ appliedConfigCount }} custom
      </span>
    </template>

    <div class="upload-scoring-dialog">
      <div class="upload-scoring-dialog__toolbar">
        <label v-if="stationOptions.length > 0" class="upload-scoring-dialog__field">
          <span>Station</span>
          <AppSelect v-model="selectedStationValue" :options="stationSelectOptions" />
        </label>

        <label v-if="deviceSelectOptions.length > 0" class="upload-scoring-dialog__field">
          <span>Device Scope</span>
          <AppMultiSelect v-model="selectedDevices" :options="deviceSelectOptions" placeholder="All uploaded devices" />
        </label>

        <label class="upload-scoring-dialog__field">
          <span>Min. Test Item Score</span>
          <input :value="getGlobalMinScoreValue()" type="number" min="0" max="10" step="0.1"
            placeholder="Leave empty to ignore low-score filtering"
            @input="updateGlobalMinScore(($event.target as HTMLInputElement).value)" />
        </label>
      </div>

      <section class="upload-scoring-dialog__selection-shell">
        <div class="upload-scoring-dialog__selection-header">
          <div class="upload-scoring-dialog__selection-copy">
            <h3>Test Items Selection</h3>
            <p>Choose Include or Exclude first, then add visible criteria groups or click individual test items below.</p>
          </div>
          <button type="button" class="upload-scoring-dialog__selection-pill upload-scoring-dialog__selection-pill--ghost"
            :disabled="selectedCount === 0" @click="openBulkScoringConfig">
            Bulk Scoring ({{ selectedCount }})
          </button>
        </div>

        <div class="upload-scoring-dialog__selection-mode-row">
          <button type="button" class="upload-scoring-dialog__selection-pill"
            :class="activeSelectionMode === 'included'
              ? 'upload-scoring-dialog__selection-pill--include is-active'
              : 'upload-scoring-dialog__selection-pill--ghost'"
            @click="setActiveSelectionMode('included')">
            INCLUDE ({{ includedScopedCount }} Selected)
          </button>
          <button type="button" class="upload-scoring-dialog__selection-pill"
            :class="activeSelectionMode === 'excluded'
              ? 'upload-scoring-dialog__selection-pill--exclude is-active'
              : 'upload-scoring-dialog__selection-pill--ghost'"
            @click="setActiveSelectionMode('excluded')">
            EXCLUDE ({{ excludedScopedCount }} Selected)
          </button>
          <span class="upload-scoring-dialog__selection-pill upload-scoring-dialog__selection-pill--muted">
            {{ filteredConfigs.length }} Showing
          </span>
          <span v-if="scoreFailCount > 0" class="upload-scoring-dialog__selection-pill upload-scoring-dialog__selection-pill--danger">
            Score Fail ({{ scoreFailCount }})
          </span>
        </div>

        <div class="upload-scoring-dialog__action-card-grid">
          <button type="button" class="upload-scoring-dialog__action-card"
            :disabled="!hasActiveSelectionMode || selectableFilteredCount === 0" @click="selectDisplayedItems">
            <strong>Add Displayed</strong>
            <span>{{ selectableFilteredCount }} visible item(s)</span>
          </button>
          <button type="button" class="upload-scoring-dialog__action-card"
            :disabled="!hasActiveSelectionMode || selectableFilteredCriteriaCount === 0" @click="selectCriteriaItems">
            <strong>Add Criteria</strong>
            <span>Add criteria items to {{ activeSelectionActionLabel }}</span>
          </button>
          <button type="button" class="upload-scoring-dialog__action-card"
            :disabled="!hasActiveSelectionMode || selectableFilteredNonCriteriaCount === 0" @click="selectNonCriteriaItems">
            <strong>Add Non-Criteria</strong>
            <span>Add non-criteria items to {{ activeSelectionActionLabel }}</span>
          </button>
          <button type="button" class="upload-scoring-dialog__action-card"
            :disabled="!hasActiveSelectionMode || activeScopeCount === 0" @click="clearActiveScope">
            <strong>Clear {{ activeSelectionScopeLabel }}</strong>
            <span>Remove all items from the active list</span>
          </button>
          <button type="button" class="upload-scoring-dialog__action-card upload-scoring-dialog__action-card--primary"
            :disabled="!hasActiveSelectionMode || selectableDisplayedCriteriaCount === 0"
            @click="selectDisplayedCriteriaAndConfigure">
            <strong>Add Displayed Criteria And Configure Score</strong>
            <span>{{ selectableDisplayedCriteriaCount }} criteria item(s)</span>
          </button>
        </div>

        <div v-if="!hasActiveSelectionMode" class="upload-scoring-dialog__notice upload-scoring-dialog__notice--info">
          Select <strong>Include</strong> or <strong>Exclude</strong> mode first. Items already scoped to the opposite mode stay locked until you switch modes.
        </div>
      </section>

      <div class="upload-scoring-dialog__search-row">
        <label class="upload-scoring-dialog__field upload-scoring-dialog__field--search">
          <span>{{ activeSelectionMode === 'excluded' ? 'Search Exclude Candidates' : 'Search Include Candidates' }}</span>
          <input v-model="searchQuery" type="text" placeholder="Type keywords and press Enter, e.g. tx rx 2404" />
        </label>
      </div>

      <div v-if="selectedDevices.length > 0" class="upload-scoring-dialog__notice upload-scoring-dialog__notice--info">
        Device scope is limited to {{ selectedDevices.length }} uploaded device{{ selectedDevices.length === 1 ? '' :
        's'
        }}.
      </div>

      <div v-if="selectedCount > 0 && hasActiveSelectionMode" class="upload-scoring-dialog__selection-banner">
        <strong>{{ selectedCount }}</strong> item{{ selectedCount === 1 ? '' : 's' }} currently staged for
        <strong>{{ activeSelectionLabel }}</strong> updates.
      </div>

      <div class="upload-scoring-dialog__list">
        <div v-for="config in filteredConfigs" :key="config.test_item_name" class="upload-scoring-dialog__item-row"
          :class="{
            'is-selected': selectedItemNames.has(config.test_item_name),
            'is-excluded': getItemScopeMode(config.test_item_name) === 'excluded',
            'is-locked': isItemSelectionLocked(config.test_item_name),
          }" role="button"
          :tabindex="hasActiveSelectionMode && !isItemSelectionLocked(config.test_item_name) ? 0 : -1"
          :aria-disabled="!hasActiveSelectionMode || isItemSelectionLocked(config.test_item_name)"
          @click="toggleItemSelection(config.test_item_name)"
          @keydown.enter.prevent="toggleItemSelection(config.test_item_name)"
          @keydown.space.prevent="toggleItemSelection(config.test_item_name)">
          <label class="upload-scoring-dialog__checkbox" @click.stop>
            <input :checked="selectedItemNames.has(config.test_item_name)" type="checkbox"
              :disabled="!hasActiveSelectionMode || isItemSelectionLocked(config.test_item_name)"
              @change="toggleItemSelection(config.test_item_name)" />
            <span></span>
          </label>

          <div class="upload-scoring-dialog__item-copy">
            <strong :title="config.test_item_name">{{ config.test_item_name }}</strong>
            <span>{{ getScoringTypeDescription(config.scoring_type) }}</span>
          </div>

          <div class="upload-scoring-dialog__item-meta">
            <button type="button" class="upload-scoring-dialog__pill-button"
              :class="getScoringTypeClass(config.scoring_type)"
              @click.stop="openSingleItemConfig(config.test_item_name)">
              <Icon icon="mdi:cog-outline" />
              <span>{{ getScoringTypeLabel(config.scoring_type) }}</span>
            </button>
            <span class="upload-scoring-dialog__pill" :class="getItemTypeClass(config.test_item_name)">
              {{ getItemTypeLabel(config.test_item_name) }}
            </span>
            <span class="upload-scoring-dialog__pill" :class="getItemScopeClass(config.test_item_name)">
              {{ getItemScopeLabel(config.test_item_name) }}
            </span>
            <span class="upload-scoring-dialog__pill" :class="getItemStatusClass(config.test_item_name)">
              {{ getItemStatusLabel(config.test_item_name) }}
            </span>
          </div>
        </div>

        <div v-if="filteredConfigs.length === 0" class="upload-scoring-dialog__empty-state">
          No test items match the current search and station filters.
        </div>
      </div>
    </div>

    <template #footer>
      <div class="upload-scoring-dialog__footer">
        <button type="button" class="upload-scoring-dialog__button upload-scoring-dialog__button--ghost"
          @click="resetAll">
          Reset All
        </button>
        <div class="upload-scoring-dialog__footer-spacer"></div>
        <button type="button" class="upload-scoring-dialog__button upload-scoring-dialog__button--ghost"
          @click="handleCancel">
          Cancel
        </button>
        <button type="button" class="upload-scoring-dialog__button upload-scoring-dialog__button--primary"
          @click="handleApply">
          Apply
        </button>
      </div>
    </template>
  </AppDialog>

  <AppDialog :model-value="bulkScoringDialog" title="Bulk Configure Scoring"
    description="Apply the same scoring policy across the selected upload-log items." width="min(92vw, 34rem)"
    persistent @update:modelValue="bulkScoringDialog = $event">
    <div class="upload-scoring-dialog__modal-stack">
      <div class="upload-scoring-dialog__notice upload-scoring-dialog__notice--info">
        This updates {{ selectedCount }} selected test item{{ selectedCount === 1 ? '' : 's' }} at once.
      </div>

      <label class="upload-scoring-dialog__field">
        <span>Scoring Type</span>
        <AppSelect v-model="bulkScoringType" :options="scoringTypeSelectOptions" :searchable="false" />
      </label>

      <div class="upload-scoring-dialog__notice" :class="getScoringNoticeClass(bulkScoringType)">
        {{ getScoringTypeDescription(bulkScoringType) }}
      </div>

      <label v-if="bulkScoringType === 'asymmetrical'" class="upload-scoring-dialog__field">
        <span>Policy</span>
        <AppSelect v-model="bulkPolicy" :options="policySelectOptions" :searchable="false" />
      </label>

      <label v-if="bulkScoringType === 'asymmetrical'" class="upload-scoring-dialog__field">
        <span>Custom Target</span>
        <input v-model.number="bulkTarget" type="number" placeholder="Leave empty for midpoint auto-detection" />
        <small>Leave empty for auto-detection from the midpoint of UCL and LCL.</small>
      </label>

      <label class="upload-scoring-dialog__field">
        <span>Weight</span>
        <input v-model.number="bulkWeight" type="number" min="0" max="10" step="0.1" />
        <small>Weight contribution for all selected items in the overall score.</small>
      </label>

      <label class="upload-scoring-dialog__field">
        <span>Minimum Test Item Score</span>
        <input v-model.number="bulkMinScore" type="number" min="0" max="10" step="0.1"
          placeholder="Leave empty to ignore low-score filtering" />
        <small>Items scoring below this threshold are excluded from aggregate analysis.</small>
      </label>

      <label class="upload-scoring-dialog__field">
        <span>Analysis Scope</span>
        <AppSelect v-model="bulkScopeMode" :options="bulkScopeSelectOptions" :searchable="false" />
      </label>
    </div>

    <template #footer>
      <div class="upload-scoring-dialog__footer">
        <div class="upload-scoring-dialog__footer-spacer"></div>
        <button type="button" class="upload-scoring-dialog__button upload-scoring-dialog__button--ghost"
          @click="bulkScoringDialog = false">
          Cancel
        </button>
        <button type="button" class="upload-scoring-dialog__button upload-scoring-dialog__button--primary"
          @click="applyBulkScoringConfig">
          Apply to {{ selectedCount }} Item{{ selectedCount === 1 ? '' : 's' }}
        </button>
      </div>
    </template>
  </AppDialog>

  <AppDialog :model-value="singleItemScoringDialog"
    :title="singleConfigItem ? 'Configure Scoring' : 'Configure Scoring'" :description="singleConfigItem ?? ''"
    width="min(92vw, 32rem)" persistent @update:modelValue="singleItemScoringDialog = $event">
    <div v-if="singleConfigItem" class="upload-scoring-dialog__modal-stack">
      <label class="upload-scoring-dialog__field">
        <span>Analysis Scope</span>
        <AppSelect :model-value="getItemScopeMode(singleConfigItem)" :options="itemScopeSelectOptions"
          :searchable="false" @update:model-value="updateSingleDialogScopeMode($event as ItemScopeMode)" />
      </label>

      <label class="upload-scoring-dialog__field">
        <span>Scoring Type</span>
        <AppSelect :model-value="getSingleDialogConfig()?.scoring_type ?? 'symmetrical'"
          :options="scoringTypeSelectOptions" :searchable="false"
          @update:model-value="updateSingleDialogScoringType($event as RescoreScoringConfig['scoring_type'])" />
      </label>

      <div class="upload-scoring-dialog__notice"
        :class="getScoringNoticeClass(getSingleDialogConfig()?.scoring_type ?? 'symmetrical')">
        {{ getScoringTypeDescription(getSingleDialogConfig()?.scoring_type ?? 'symmetrical') }}
      </div>

      <label v-if="getSingleDialogConfig()?.scoring_type === 'asymmetrical'" class="upload-scoring-dialog__field">
        <span>Policy</span>
        <AppSelect :model-value="getSingleDialogConfig()?.policy ?? 'symmetrical'" :options="policySelectOptions"
          :searchable="false"
          @update:model-value="updateSingleDialogPolicy($event as RescoreScoringConfig['policy'])" />
      </label>

      <label v-if="getSingleDialogConfig()?.scoring_type === 'asymmetrical'" class="upload-scoring-dialog__field">
        <span>Custom Target</span>
        <input :value="getSingleDialogConfig()?.target ?? ''" type="number"
          placeholder="Leave empty for midpoint auto-detection"
          @input="updateSingleDialogTarget(toOptionalNumber(($event.target as HTMLInputElement).value))" />
        <small>Leave empty for auto-detection from the midpoint of UCL and LCL.</small>
      </label>

      <label class="upload-scoring-dialog__field">
        <span>Weight</span>
        <input :value="getSingleDialogConfig()?.weight ?? 1.0" type="number" min="0" max="10" step="0.1"
          @input="updateSingleDialogWeight(toNumber(($event.target as HTMLInputElement).value, 1.0))" />
        <small>Weight contribution for this item in the overall score.</small>
      </label>

      <label class="upload-scoring-dialog__field">
        <span>Minimum Test Item Score</span>
        <input :value="getSingleDialogMinScoreValue()" type="number" min="0" max="10" step="0.1"
          placeholder="Leave empty to ignore low-score filtering"
          @input="updateSingleDialogMinScore(($event.target as HTMLInputElement).value)" />
        <small>Exclude this item from aggregate analysis when its score falls below the threshold.</small>
      </label>

      <AppPanel v-if="singleDialogSpecs" title="Item Specifications" tone="warm" compact-header>
        <div class="upload-scoring-dialog__spec-grid">
          <div>
            <span>UCL</span>
            <strong>{{ singleDialogSpecs.usl ?? 'N/A' }}</strong>
          </div>
          <div>
            <span>LCL</span>
            <strong>{{ singleDialogSpecs.lsl ?? 'N/A' }}</strong>
          </div>
          <div>
            <span>Sample Value</span>
            <strong>{{ singleDialogSpecs.value ?? 'N/A' }}</strong>
          </div>
        </div>
      </AppPanel>
    </div>

    <template #footer>
      <div class="upload-scoring-dialog__footer">
        <div class="upload-scoring-dialog__footer-spacer"></div>
        <button type="button" class="upload-scoring-dialog__button upload-scoring-dialog__button--primary"
          @click="singleItemScoringDialog = false">
          Done
        </button>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import type {
  ParsedTestItemEnhanced,
  RescoreScoringConfig,
  UploadScoringConfigApplyPayload,
} from '@/features/dut-logs/composables/useTestLogUpload'
import { hasMeaningfulUploadLogCriteria } from '@/features/dut-logs/composables/useTestLogUpload'
import { AppDialog, AppMultiSelect, AppPanel, AppSelect } from '@/shared/ui'

type ItemScopeMode = 'auto' | 'included' | 'excluded'
type BulkScopeMode = 'keep' | ItemScopeMode
type ActiveSelectionMode = Exclude<ItemScopeMode, 'auto'>

interface Props {
  modelValue: boolean
  testItems: ParsedTestItemEnhanced[]
  existingConfigs?: RescoreScoringConfig[]
  stations?: string[]
  devices?: string[]
  testItemStations?: Map<string, Set<string>> // Maps test item name -> stations it appears in
  defaultStation?: string | null // Initial station to filter by when dialog opens
  initialDeviceScope?: string[]
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'apply', payload: UploadScoringConfigApplyPayload): void
}

const props = withDefaults(defineProps<Props>(), {
  existingConfigs: () => [],
  stations: () => [],
  devices: () => [],
  defaultStation: null,
  initialDeviceScope: () => [],
})

const emit = defineEmits<Emits>()

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// Local state
const dialogFullscreen = ref(false)
const searchQuery = ref('')
const selectedStation = ref<string | null>(null)
const selectedDevices = ref<string[]>([])
const selectedItemNames = ref<Set<string>>(new Set())
const scoringConfigs = ref<RescoreScoringConfig[]>([])
const itemScopeModes = ref<Map<string, ItemScopeMode>>(new Map())
const activeSelectionMode = ref<ActiveSelectionMode | null>(null)
const globalMinScore = ref<number | undefined>(undefined)

const selectedCount = computed(() => selectedItemNames.value.size)
const hasActiveSelectionMode = computed(() => activeSelectionMode.value !== null)
const activeSelectionLabel = computed(() => activeSelectionMode.value === 'excluded' ? 'Exclude' : 'Include')
const activeSelectionActionLabel = computed(() => activeSelectionMode.value === 'excluded' ? 'Exclude' : 'Include')
const activeSelectionScopeLabel = computed(() => activeSelectionMode.value === 'excluded' ? 'Exclude' : 'Include')
const selectedStationValue = computed({
  get: () => selectedStation.value ?? '',
  set: (value: string) => {
    selectedStation.value = value || null
  },
})

// Station options computed from props
const stationOptions = computed(() => props.stations || [])

const stationSelectOptions = computed(() => [
  { label: 'All stations', value: '' },
  ...stationOptions.value.map((station) => ({
    label: station,
    value: station,
  })),
])

const deviceSelectOptions = computed(() =>
  (props.devices || []).map((device) => ({
    label: device,
    value: device,
  })),
)

// Single item scoring dialog (popup from clicking scoring type button)
const singleItemScoringDialog = ref(false)
const singleConfigItem = ref<string | null>(null)

// Bulk scoring dialog
const bulkScoringDialog = ref(false)
const bulkScoringType = ref<RescoreScoringConfig['scoring_type']>('symmetrical')
const bulkPolicy = ref<RescoreScoringConfig['policy']>('symmetrical')
const bulkTarget = ref<number | undefined>(undefined)
const bulkWeight = ref(1.0)
const bulkMinScore = ref<number | undefined>(undefined)
const bulkScopeMode = ref<BulkScopeMode>('keep')

// Scoring type options
const scoringTypeOptions = [
  { title: 'Symmetrical (Linear)', value: 'symmetrical' },
  { title: 'Asymmetrical (Custom Target)', value: 'asymmetrical' },
  { title: 'Near-Zero', value: 'per_mask' },
  { title: 'EVM', value: 'evm' },
  // { title: 'Throughput (Higher-is-Better)', value: 'throughput' },
  // { title: 'Binary (PASS/FAIL)', value: 'binary' },
]

const scoringTypeSelectOptions = scoringTypeOptions.map((option) => ({
  label: option.title,
  value: option.value,
}))

const policyOptions = [
  { title: 'Symmetrical (Centered)', value: 'symmetrical' },
  { title: 'Higher is Better', value: 'higher' },
  { title: 'Lower is Better', value: 'lower' },
]

const policySelectOptions = policyOptions.map((option) => ({
  label: option.title,
  value: option.value,
}))

const itemScopeSelectOptions = [
  { label: 'Auto', value: 'auto' },
  { label: 'Included', value: 'included' },
  { label: 'Excluded', value: 'excluded' },
]

const bulkScopeSelectOptions = [
  { label: 'Keep current scope', value: 'keep' },
  ...itemScopeSelectOptions,
]

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function createDefaultConfig(name: string): RescoreScoringConfig {
  return {
    test_item_name: name,
    scoring_type: detectScoringType(name) as RescoreScoringConfig['scoring_type'],
    enabled: true,
    weight: 1.0,
    policy: 'symmetrical' as const,
  }
}

function isConfigCustomized(config: RescoreScoringConfig, defaultConfig: RescoreScoringConfig): boolean {
  return config.scoring_type !== defaultConfig.scoring_type
    || config.weight !== defaultConfig.weight
    || (config.policy ?? 'symmetrical') !== (defaultConfig.policy ?? 'symmetrical')
    || config.target !== defaultConfig.target
    || config.limit_score !== defaultConfig.limit_score
    || config.alpha !== defaultConfig.alpha
    || config.min_score !== defaultConfig.min_score
    || config.max_deviation !== defaultConfig.max_deviation
}

function buildAppliedConfigs(): RescoreScoringConfig[] {
  return scoringConfigs.value.flatMap((config) => {
    const defaultConfig = createDefaultConfig(config.test_item_name)
    const scopeMode = getItemScopeMode(config.test_item_name)
    const shouldEmit = scopeMode !== 'auto' || isConfigCustomized(config, defaultConfig)

    if (!shouldEmit) {
      return []
    }

    return [{
      ...config,
      min_score: globalMinScore.value ?? config.min_score,
      enabled: scopeMode !== 'excluded',
    }]
  })
}

const appliedConfigCount = computed(() => buildAppliedConfigs().length)

// Initialize scoring configs from test items - preserving original order
function initializeConfigs() {
  const existingMap = new Map<string, RescoreScoringConfig>()
  props.existingConfigs.forEach((cfg) => existingMap.set(cfg.test_item_name, cfg))

  // Use array to preserve original order from props.testItems
  const seen = new Set<string>()
  const orderedNames: string[] = []
  props.testItems.forEach((item) => {
    if (!seen.has(item.test_item)) {
      seen.add(item.test_item)
      orderedNames.push(item.test_item)
    }
  })

  const scopeModes = new Map<string, ItemScopeMode>()
  scoringConfigs.value = orderedNames.map((name) => {
    const defaultConfig = createDefaultConfig(name)
    if (existingMap.has(name)) {
      // biome-ignore lint/style/noNonNullAssertion: checked via existingMap.has(name) above
      const existingConfig = { ...defaultConfig, ...existingMap.get(name)! }
      scopeModes.set(name, existingConfig.enabled === false ? 'excluded' : 'included')
      return existingConfig
    }
    scopeModes.set(name, 'auto')
    return defaultConfig
  })
  itemScopeModes.value = scopeModes
  selectedDevices.value = [...props.initialDeviceScope]
  globalMinScore.value = getCommonMinScore(props.existingConfigs)
}

function getCommonMinScore(configs: RescoreScoringConfig[]): number | undefined {
  const definedValues = configs
    .map((config) => config.min_score)
    .filter((value): value is number => value !== null && value !== undefined)

  if (definedValues.length === 0) {
    return undefined
  }

  const first = definedValues[0]
  return definedValues.every((value) => value === first) ? first : undefined
}

// Auto-detect scoring type by test item name patterns
function detectScoringType(name: string): string {
  const upper = name.toUpperCase()
  if (upper.includes('PER_') || upper.includes('_PER') || upper.includes('MASK')) return 'per_mask'
  if (upper.includes('EVM')) return 'evm'
  if (upper.includes('THROUGHPUT') || upper.includes('THRUPUT') || upper.includes('TPUT'))
    return 'throughput'
  return 'symmetrical'
}

function getItemScopeMode(name: string): ItemScopeMode {
  return itemScopeModes.value.get(name) ?? 'auto'
}

function setItemScopeMode(name: string, scopeMode: ItemScopeMode) {
  const nextModes = new Map(itemScopeModes.value)
  nextModes.set(name, scopeMode)
  itemScopeModes.value = nextModes

  const config = scoringConfigs.value.find((entry) => entry.test_item_name === name)
  if (config) {
    config.enabled = scopeMode !== 'excluded'
  }
}

// Filtered configs based on search and station
const filteredConfigs = computed(() => {
  let configs = scoringConfigs.value

  // Filter by station if selected and mapping is provided
  if (selectedStation.value && props.testItemStations) {
    configs = configs.filter((c) => {
      const itemStations = props.testItemStations?.get(c.test_item_name)
      return itemStations?.has(selectedStation.value as string)
    })
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    configs = configs.filter((c) => c.test_item_name.toLowerCase().includes(query))
  }

  return configs
})

// Helper: check if item is criteria (has UCL or LCL)
function isItemCriteria(name: string): boolean {
  const item = props.testItems.find((t) => t.test_item === name)
  return item ? hasMeaningfulUploadLogCriteria(item.usl, item.lsl) : false
}

function getItemTypeLabel(name: string): string {
  return isItemCriteria(name) ? 'Criteria' : 'Non-Criteria'
}

function getItemTypeClass(name: string): string {
  return isItemCriteria(name)
    ? 'upload-scoring-dialog__pill--success'
    : 'upload-scoring-dialog__pill--warning'
}

function getItemScopeLabel(name: string): string {
  const scopeMode = getItemScopeMode(name)
  if (scopeMode === 'included') return 'Included'
  if (scopeMode === 'excluded') return 'Excluded'
  return 'Auto'
}

function getItemScopeClass(name: string): string {
  const scopeMode = getItemScopeMode(name)
  if (scopeMode === 'included') return 'upload-scoring-dialog__pill--info'
  if (scopeMode === 'excluded') return 'upload-scoring-dialog__pill--danger'
  return 'upload-scoring-dialog__pill--muted'
}

function isItemSelectionLocked(name: string): boolean {
  if (!activeSelectionMode.value) {
    return false
  }

  const scopeMode = getItemScopeMode(name)
  return scopeMode !== 'auto' && scopeMode !== activeSelectionMode.value
}

function getSelectableConfigs(configs: RescoreScoringConfig[]): RescoreScoringConfig[] {
  return configs.filter((config) => !isItemSelectionLocked(config.test_item_name))
}

const selectableFilteredCount = computed(() => getSelectableConfigs(filteredConfigs.value).length)
const selectableFilteredCriteriaCount = computed(() =>
  getSelectableConfigs(filteredConfigs.value).filter((config) => isItemCriteria(config.test_item_name)).length,
)
const selectableFilteredNonCriteriaCount = computed(() =>
  getSelectableConfigs(filteredConfigs.value).filter((config) => !isItemCriteria(config.test_item_name)).length,
)
const selectableDisplayedCriteriaCount = computed(() =>
  getSelectableConfigs(filteredConfigs.value).filter((config) => isItemCriteria(config.test_item_name)).length,
)
const includedScopedCount = computed(() =>
  scoringConfigs.value.filter((config) => getItemScopeMode(config.test_item_name) === 'included').length,
)
const excludedScopedCount = computed(() =>
  scoringConfigs.value.filter((config) => getItemScopeMode(config.test_item_name) === 'excluded').length,
)
const activeScopeCount = computed(() => {
  if (!activeSelectionMode.value) {
    return 0
  }

  return scoringConfigs.value.filter((config) => getItemScopeMode(config.test_item_name) === activeSelectionMode.value).length
})

const scoreFailCount = computed(() =>
  scoringConfigs.value.filter((config) => isItemScoreFail(config.test_item_name)).length,
)

function getTestItem(name: string): ParsedTestItemEnhanced | undefined {
  return props.testItems.find((item) => item.test_item === name)
}

function getConfig(name: string): RescoreScoringConfig | undefined {
  return scoringConfigs.value.find((config) => config.test_item_name === name)
}

function getItemScore(name: string): number | null {
  const score = getTestItem(name)?.score
  return score === undefined ? null : score
}

function getEffectiveMinScore(name: string): number | undefined {
  return globalMinScore.value ?? getConfig(name)?.min_score
}

function isItemScoreFail(name: string): boolean {
  const minScore = getEffectiveMinScore(name)
  const score = getItemScore(name)

  if (minScore === undefined || score === null) {
    return false
  }

  return score < minScore * 10
}

function getItemStatusLabel(name: string): string {
  if (isItemScoreFail(name)) return 'Score Fail'
  if (getItemScore(name) !== null) return 'Scored'
  return 'Not Scored'
}

function getItemStatusClass(name: string): string {
  if (isItemScoreFail(name)) return 'upload-scoring-dialog__pill--danger'
  if (getItemScore(name) !== null) return 'upload-scoring-dialog__pill--success'
  return 'upload-scoring-dialog__pill--muted'
}

// ============================================
// Selection management (checkbox multi-select)
// ============================================

function setActiveSelectionMode(mode: ActiveSelectionMode) {
  activeSelectionMode.value = mode
  selectedItemNames.value = new Set()
}

function toggleItemSelection(name: string) {
  if (!activeSelectionMode.value || isItemSelectionLocked(name)) {
    return
  }

  const newSet = new Set(selectedItemNames.value)
  if (newSet.has(name)) {
    newSet.delete(name)
    if (getItemScopeMode(name) === activeSelectionMode.value) {
      setItemScopeMode(name, 'auto')
    }
  } else {
    newSet.add(name)
    setItemScopeMode(name, activeSelectionMode.value)
  }
  selectedItemNames.value = newSet
}

function selectDisplayedItems() {
  if (!activeSelectionMode.value) return

  const names = getSelectableConfigs(filteredConfigs.value).map((config) => config.test_item_name)
  names.forEach((name) => setItemScopeMode(name, activeSelectionMode.value as ActiveSelectionMode))
  selectedItemNames.value = new Set([...selectedItemNames.value, ...names])
}

function selectCriteriaItems() {
  if (!activeSelectionMode.value) return

  const names: string[] = []
  getSelectableConfigs(filteredConfigs.value).forEach((c) => {
    if (isItemCriteria(c.test_item_name)) {
      names.push(c.test_item_name)
    }
  })
  names.forEach((name) => setItemScopeMode(name, activeSelectionMode.value as ActiveSelectionMode))
  selectedItemNames.value = new Set([...selectedItemNames.value, ...names])
}

function selectNonCriteriaItems() {
  if (!activeSelectionMode.value) return

  const names: string[] = []
  getSelectableConfigs(filteredConfigs.value).forEach((c) => {
    if (!isItemCriteria(c.test_item_name)) {
      names.push(c.test_item_name)
    }
  })
  names.forEach((name) => setItemScopeMode(name, activeSelectionMode.value as ActiveSelectionMode))
  selectedItemNames.value = new Set([...selectedItemNames.value, ...names])
}

function clearSelection() {
  const currentMode = activeSelectionMode.value
  if (currentMode) {
    selectedItemNames.value.forEach((name) => {
      if (getItemScopeMode(name) === currentMode) {
        setItemScopeMode(name, 'auto')
      }
    })
  }

  selectedItemNames.value = new Set()
}

function applyScopeModeToSelected(scopeMode: ItemScopeMode) {
  selectedItemNames.value.forEach((name) => setItemScopeMode(name, scopeMode))
}

function clearActiveScope() {
  if (!activeSelectionMode.value) {
    return
  }

  scoringConfigs.value.forEach((config) => {
    if (getItemScopeMode(config.test_item_name) === activeSelectionMode.value) {
      setItemScopeMode(config.test_item_name, 'auto')
    }
  })
  selectedItemNames.value = new Set()
}

/**
 * Select all displayed items and open bulk config dialog
 */
function selectDisplayedAndConfigure() {
  if (!activeSelectionMode.value) return

  // First, select all displayed items
  const newSet = new Set(selectedItemNames.value)
  getSelectableConfigs(filteredConfigs.value).forEach((c) => {
    newSet.add(c.test_item_name)
    setItemScopeMode(c.test_item_name, activeSelectionMode.value as ActiveSelectionMode)
  })
  selectedItemNames.value = newSet

  // Then open bulk config dialog
  if (newSet.size > 0) {
    openBulkScoringConfig()
  }
}

function selectDisplayedCriteriaAndConfigure() {
  if (!activeSelectionMode.value) return

  const names = getSelectableConfigs(filteredConfigs.value)
    .filter((config) => isItemCriteria(config.test_item_name))
    .map((config) => config.test_item_name)

  names.forEach((name) => setItemScopeMode(name, activeSelectionMode.value as ActiveSelectionMode))
  selectedItemNames.value = new Set([...selectedItemNames.value, ...names])

  if (selectedItemNames.value.size > 0) {
    openBulkScoringConfig()
  }
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
  return scoringConfigs.value.find((c) => c.test_item_name === singleConfigItem.value)
}

const singleDialogSpecs = computed(() => {
  if (!singleConfigItem.value) return null
  return props.testItems.find((item) => item.test_item === singleConfigItem.value) || null
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

function updateSingleDialogScopeMode(scopeMode: ItemScopeMode) {
  if (singleConfigItem.value) {
    setItemScopeMode(singleConfigItem.value, scopeMode)
  }
}

function getSingleDialogMinScoreValue(): string {
  const minScore = getSingleDialogConfig()?.min_score
  if (minScore === null || minScore === undefined) return ''
  return String(Number((minScore * 10).toFixed(2)))
}

function updateSingleDialogMinScore(rawValue: string) {
  const config = getSingleDialogConfig()
  if (!config) return

  const parsed = toOptionalNumber(rawValue)
  config.min_score = parsed === undefined ? undefined : clampNumber(parsed, 0, 10) / 10
}

function getGlobalMinScoreValue(): string {
  if (globalMinScore.value === null || globalMinScore.value === undefined) return ''
  return String(Number((globalMinScore.value * 10).toFixed(2)))
}

function updateGlobalMinScore(rawValue: string) {
  const parsed = toOptionalNumber(rawValue)
  globalMinScore.value = parsed === undefined ? undefined : clampNumber(parsed, 0, 10) / 10
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
  bulkMinScore.value = undefined
  bulkScopeMode.value = 'keep'
  bulkScoringDialog.value = true
}

function applyBulkScoringConfig() {
  scoringConfigs.value.forEach((c) => {
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

      c.min_score = bulkMinScore.value === undefined
        ? undefined
        : clampNumber(bulkMinScore.value, 0, 10) / 10
    }
  })

  if (bulkScopeMode.value !== 'keep') {
    applyScopeModeToSelected(bulkScopeMode.value)
  }

  bulkScoringDialog.value = false
}

// ============================================
// Global actions
// ============================================

function resetAll() {
  scoringConfigs.value.forEach((c) => {
    c.scoring_type = detectScoringType(c.test_item_name) as RescoreScoringConfig['scoring_type']
    c.enabled = true
    c.weight = 1.0
    c.policy = 'symmetrical'
    c.target = undefined
    c.min_score = undefined
    c.max_deviation = undefined
  })
  itemScopeModes.value = new Map(scoringConfigs.value.map((c) => [c.test_item_name, 'auto']))
  selectedDevices.value = []
  selectedItemNames.value = new Set()
  activeSelectionMode.value = null
  globalMinScore.value = undefined
}

// Handlers
function handleApply() {
  emit('apply', {
    configs: buildAppliedConfigs(),
    deviceScope: [...selectedDevices.value],
  })
  dialogOpen.value = false
}

function handleCancel() {
  dialogOpen.value = false
}

function toNumber(value: string, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toOptionalNumber(value: string): number | undefined {
  if (value.trim().length === 0) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

// Helpers
function getScoringTypeClass(type: string): string {
  switch (type) {
    case 'symmetrical':
      return 'upload-scoring-dialog__pill--info'
    case 'asymmetrical':
      return 'upload-scoring-dialog__pill--violet'
    case 'per_mask':
      return 'upload-scoring-dialog__pill--warning'
    case 'evm':
      return 'upload-scoring-dialog__pill--success'
    case 'throughput':
      return 'upload-scoring-dialog__pill--success'
    case 'binary':
      return 'upload-scoring-dialog__pill--muted'
    default:
      return 'upload-scoring-dialog__pill--info'
  }
}

function getScoringTypeLabel(type: string): string {
  switch (type) {
    case 'symmetrical':
      return 'Sym'
    case 'asymmetrical':
      return 'Asym'
    case 'per_mask':
      return 'Near Zero'
    case 'evm':
      return 'EVM'
    case 'throughput':
      return 'TPUT'
    case 'binary':
      return 'Bin'
    default:
      return type
  }
}

function getScoringNoticeClass(type: string): string {
  switch (type) {
    case 'asymmetrical':
      return 'upload-scoring-dialog__notice--warning'
    case 'per_mask':
    case 'evm':
      return 'upload-scoring-dialog__notice--success'
    default:
      return 'upload-scoring-dialog__notice--info'
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
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      initializeConfigs()
      selectedItemNames.value = new Set()
      activeSelectionMode.value = null
      dialogFullscreen.value = false
      searchQuery.value = ''
      // Set default station filter if provided
      selectedStation.value = props.defaultStation || null
    }
  },
)
</script>

<style scoped>
.upload-scoring-dialog {
  display: grid;
  gap: 1rem;
}

.upload-scoring-dialog__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  width: 100%;
}

.upload-scoring-dialog__header-copy {
  display: grid;
  gap: 0.3rem;
}

.upload-scoring-dialog__header-copy h2 {
  margin: 0;
  color: var(--app-ink);
  font-family: var(--app-display);
  font-size: 1.35rem;
}

.upload-scoring-dialog__header-copy p {
  margin: 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.upload-scoring-dialog__header-meta {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.upload-scoring-dialog__toolbar,
.upload-scoring-dialog__footer,
.upload-scoring-dialog__item-row,
.upload-scoring-dialog__item-meta,
.upload-scoring-dialog__spec-grid {
  display: grid;
  gap: 0.85rem;
}

.upload-scoring-dialog__toolbar {
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
}

.upload-scoring-dialog__selection-shell {
  display: grid;
  gap: 0.7rem;
  padding: 0.75rem;
  border: 1px solid rgba(15, 118, 110, 0.12);
  border-radius: 1rem;
  background: linear-gradient(180deg, color-mix(in srgb, var(--app-panel) 90%, white 10%), var(--app-panel));
}

.upload-scoring-dialog__selection-header,
.upload-scoring-dialog__selection-mode-row,
.upload-scoring-dialog__action-band-controls,
.upload-scoring-dialog__action-card-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.upload-scoring-dialog__selection-header {
  justify-content: space-between;
  align-items: center;
}

.upload-scoring-dialog__selection-copy {
  display: grid;
  gap: 0.3rem;
}

.upload-scoring-dialog__selection-copy h3 {
  margin: 0;
  color: var(--app-ink);
  font-size: 1rem;
}

.upload-scoring-dialog__selection-copy p,
.upload-scoring-dialog__selection-copy small {
  margin: 0;
  color: var(--app-muted);
  font-size: 0.82rem;
  line-height: 1.35;
}

.upload-scoring-dialog__selection-mode-row {
  align-items: center;
}

.upload-scoring-dialog__action-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10.5rem, 1fr));
}

.upload-scoring-dialog__search-row {
  display: grid;
  gap: 0.75rem;
}

.upload-scoring-dialog__band-label,
.upload-scoring-dialog__field span,
.upload-scoring-dialog__spec-grid span {
  color: var(--app-ink);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.upload-scoring-dialog__field {
  display: grid;
  gap: 0.4rem;
}

.upload-scoring-dialog__field input,
.upload-scoring-dialog__field select {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.95rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  padding: 0.78rem 0.9rem;
  font: inherit;
}

.upload-scoring-dialog__field small {
  color: var(--app-muted);
  line-height: 1.5;
}

.upload-scoring-dialog__selection-banner,
.upload-scoring-dialog__notice {
  padding: 0.9rem 1rem;
  border-radius: 1rem;
  border: 1px solid transparent;
  font-size: 0.9rem;
  line-height: 1.55;
}

.upload-scoring-dialog__selection-banner {
  background: rgba(15, 118, 110, 0.08);
  border-color: rgba(15, 118, 110, 0.14);
  color: var(--app-accent);
}

.upload-scoring-dialog__notice--info {
  background: rgba(40, 96, 163, 0.08);
  border-color: rgba(40, 96, 163, 0.16);
  color: #1f4f89;
}

.upload-scoring-dialog__notice--warning {
  background: rgba(169, 102, 34, 0.1);
  border-color: rgba(169, 102, 34, 0.18);
  color: #88551c;
}

.upload-scoring-dialog__notice--success {
  background: rgba(15, 118, 110, 0.08);
  border-color: rgba(15, 118, 110, 0.16);
  color: var(--app-accent);
}

.upload-scoring-dialog__list {
  display: grid;
  gap: 0.7rem;
  max-height: min(58vh, 42rem);
  overflow-y: auto;
  padding-right: 0.25rem;
}

.upload-scoring-dialog__item-row {
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  padding: 0.95rem 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(15, 118, 110, 0.1);
  background: var(--app-panel-strong);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.upload-scoring-dialog__item-row:hover,
.upload-scoring-dialog__item-row:focus-visible {
  transform: translateY(-1px);
  border-color: rgba(15, 118, 110, 0.22);
  box-shadow: 0 0.9rem 1.8rem rgba(15, 118, 110, 0.08);
  outline: none;
}

.upload-scoring-dialog__item-row.is-locked {
  cursor: not-allowed;
  opacity: 0.72;
}

.upload-scoring-dialog__item-row.is-locked:hover,
.upload-scoring-dialog__item-row.is-locked:focus-visible {
  transform: none;
  border-color: rgba(15, 118, 110, 0.1);
  box-shadow: none;
}

.upload-scoring-dialog__item-row.is-selected {
  border-color: rgba(15, 118, 110, 0.28);
  background: rgba(15, 118, 110, 0.1);
}

.upload-scoring-dialog__item-row.is-excluded {
  border-color: rgba(185, 28, 28, 0.22);
  background: rgba(185, 28, 28, 0.08);
}

.upload-scoring-dialog__checkbox {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.upload-scoring-dialog__checkbox input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.upload-scoring-dialog__checkbox input:disabled+span {
  opacity: 0.5;
}

.upload-scoring-dialog__checkbox span {
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 0.35rem;
  border: 1px solid rgba(15, 118, 110, 0.25);
  background: var(--app-panel);
  box-shadow: inset 0 0 0 0 rgba(15, 118, 110, 0.95);
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.upload-scoring-dialog__checkbox input:checked+span {
  border-color: rgba(15, 118, 110, 0.9);
  box-shadow: inset 0 0 0 0.45rem rgba(15, 118, 110, 0.95);
}

.upload-scoring-dialog__item-copy {
  display: grid;
  gap: 0.25rem;
  min-width: 0;
}

.upload-scoring-dialog__item-copy strong {
  color: var(--app-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-scoring-dialog__item-copy span {
  color: var(--app-muted);
  font-size: 0.84rem;
  line-height: 1.5;
}

.upload-scoring-dialog__item-meta {
  grid-auto-flow: column;
  align-items: center;
}

.upload-scoring-dialog__pill,
.upload-scoring-dialog__pill-button,
.upload-scoring-dialog__chip-button,
.upload-scoring-dialog__selection-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.2rem;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1;
}

.upload-scoring-dialog__pill-button {
  gap: 0.4rem;
}

.upload-scoring-dialog__pill-button svg {
  font-size: 0.95rem;
}

.upload-scoring-dialog__selection-pill {
  min-height: 3rem;
  padding: 0.8rem 1.2rem;
  border: 1px solid var(--app-border);
  background: var(--app-panel-strong);
  color: var(--app-ink);
  font-size: 0.95rem;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.upload-scoring-dialog__selection-pill--muted {
  cursor: default;
  color: var(--app-muted);
}

.upload-scoring-dialog__selection-pill--ghost {
  background: var(--app-panel);
}

.upload-scoring-dialog__selection-pill--include {
  background: rgba(15, 118, 110, 0.12);
  border-color: rgba(15, 118, 110, 0.22);
  color: #0f766e;
}

.upload-scoring-dialog__selection-pill--exclude {
  background: rgba(164, 52, 58, 0.1);
  border-color: rgba(164, 52, 58, 0.18);
  color: #8e3037;
}

.upload-scoring-dialog__selection-pill--danger {
  background: rgba(164, 52, 58, 0.1);
  border-color: rgba(164, 52, 58, 0.18);
  color: #8e3037;
  cursor: default;
}

.upload-scoring-dialog__selection-pill.is-active {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--app-accent) 16%, transparent);
}

.upload-scoring-dialog__action-card {
  display: grid;
  align-content: start;
  gap: 0.25rem;
  min-height: 5.25rem;
  padding: 0.75rem 0.85rem;
  text-align: left;
  border: 1px solid var(--app-border);
  border-radius: 1.2rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.upload-scoring-dialog__action-card strong {
  font-size: 0.82rem;
  line-height: 1.2;
}

.upload-scoring-dialog__action-card span {
  color: var(--app-muted);
  font-size: 0.8rem;
  line-height: 1.35;
}

.upload-scoring-dialog__action-card:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(15, 118, 110, 0.24);
  box-shadow: 0 0.9rem 1.8rem rgba(15, 118, 110, 0.08);
}

.upload-scoring-dialog__action-card--primary {
  background: linear-gradient(180deg, rgba(40, 96, 163, 0.12), rgba(15, 118, 110, 0.08));
}

.upload-scoring-dialog__action-card:disabled,
.upload-scoring-dialog__selection-pill:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.upload-scoring-dialog__pill-button,
.upload-scoring-dialog__chip-button,
.upload-scoring-dialog__button,
.upload-scoring-dialog__ghost-button {
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease, border-color 0.15s ease;
}

.upload-scoring-dialog__pill-button:hover,
.upload-scoring-dialog__chip-button:hover,
.upload-scoring-dialog__button:hover,
.upload-scoring-dialog__ghost-button:hover {
  transform: translateY(-1px);
}

.upload-scoring-dialog__pill-button:disabled,
.upload-scoring-dialog__chip-button:disabled,
.upload-scoring-dialog__button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.upload-scoring-dialog__pill--info,
.upload-scoring-dialog__chip-button--info {
  background: rgba(40, 96, 163, 0.1);
  border-color: rgba(40, 96, 163, 0.16);
  color: #1f4f89;
}

.upload-scoring-dialog__pill--violet {
  background: rgba(128, 83, 161, 0.1);
  border-color: rgba(128, 83, 161, 0.16);
  color: #6e3f91;
}

.upload-scoring-dialog__pill--success,
.upload-scoring-dialog__chip-button--success {
  background: rgba(15, 118, 110, 0.1);
  border-color: rgba(15, 118, 110, 0.16);
  color: var(--app-accent);
}

.upload-scoring-dialog__pill--warning,
.upload-scoring-dialog__chip-button--warning {
  background: rgba(169, 102, 34, 0.1);
  border-color: rgba(169, 102, 34, 0.18);
  color: #88551c;
}

.upload-scoring-dialog__pill--danger,
.upload-scoring-dialog__chip-button--danger {
  background: rgba(164, 52, 58, 0.1);
  border-color: rgba(164, 52, 58, 0.18);
  color: #8e3037;
}

.upload-scoring-dialog__pill--muted {
  background: rgba(95, 103, 122, 0.1);
  border-color: rgba(95, 103, 122, 0.16);
  color: #4c566a;
}

.upload-scoring-dialog__button,
.upload-scoring-dialog__ghost-button {
  min-height: 2.75rem;
  padding: 0.7rem 1rem;
  border-radius: 0.95rem;
  border: 1px solid var(--app-border);
  font-weight: 700;
}

.upload-scoring-dialog__button--primary {
  background: linear-gradient(135deg, #0f766e, #1b6c58);
  border-color: var(--app-accent);
  color: white;
}

.upload-scoring-dialog__button--secondary {
  background: rgba(40, 96, 163, 0.1);
  border-color: rgba(40, 96, 163, 0.18);
  color: #1f4f89;
}

.upload-scoring-dialog__button--danger {
  background: rgba(164, 52, 58, 0.1);
  border-color: rgba(164, 52, 58, 0.18);
  color: #8e3037;
}

.upload-scoring-dialog__button--active {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--app-accent) 18%, transparent);
}

.upload-scoring-dialog__button--ghost,
.upload-scoring-dialog__ghost-button {
  background: var(--app-panel);
  color: var(--app-ink);
}

.upload-scoring-dialog__footer {
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
}

.upload-scoring-dialog__footer-spacer {
  min-width: 1px;
}

.upload-scoring-dialog__modal-stack {
  display: grid;
  gap: 1rem;
}

.upload-scoring-dialog__spec-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.upload-scoring-dialog__spec-grid div {
  display: grid;
  gap: 0.3rem;
}

.upload-scoring-dialog__spec-grid strong {
  color: var(--app-ink);
  font-size: 1rem;
}

.upload-scoring-dialog__empty-state {
  padding: 1.4rem;
  border: 1px dashed rgba(95, 103, 122, 0.22);
  border-radius: 1rem;
  color: var(--app-muted);
  text-align: center;
}

@media (max-width: 900px) {

  .upload-scoring-dialog__toolbar,
  .upload-scoring-dialog__item-row,
  .upload-scoring-dialog__footer,
  .upload-scoring-dialog__spec-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .upload-scoring-dialog__action-band-controls,
  .upload-scoring-dialog__selection-header,
  .upload-scoring-dialog__selection-mode-row {
    width: 100%;
  }

  .upload-scoring-dialog__selection-header {
    align-items: stretch;
  }

  .upload-scoring-dialog__item-meta {
    grid-auto-flow: row;
    justify-items: start;
  }

  .upload-scoring-dialog__header {
    flex-direction: column;
  }
}
</style>
