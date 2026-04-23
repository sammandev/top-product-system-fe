<template>
  <AppDialog
    :model-value="dialogOpen"
    width="min(96vw, 70rem)"
    :breakpoints="{ '1100px': '94vw', '760px': '96vw' }"
    persistent
    maximizable
    @update:modelValue="dialogOpen = $event"
  >
    <template #header>
      <div class="upload-scoring-dialog__header">
        <div class="upload-scoring-dialog__header-copy">
          <h2>Configure Scoring</h2>
          <p>Filter, select, and adjust upload-log scoring rules without leaving the comparison workflow.</p>
        </div>
        <div class="upload-scoring-dialog__header-meta">
          <span class="upload-scoring-dialog__pill upload-scoring-dialog__pill--muted">
            {{ scoringConfigCount }} items
          </span>
          <button type="button" class="upload-scoring-dialog__ghost-button" @click="handleCancel">
            Close
          </button>
        </div>
      </div>
    </template>

    <div class="upload-scoring-dialog">
      <div class="upload-scoring-dialog__toolbar">
        <label class="upload-scoring-dialog__field upload-scoring-dialog__field--search">
          <span>Search Test Items</span>
          <input v-model="searchQuery" type="text" placeholder="Search by test item name" />
        </label>

        <label v-if="stationOptions.length > 0" class="upload-scoring-dialog__field">
          <span>Station</span>
          <select v-model="selectedStationValue">
            <option value="">All stations</option>
            <option v-for="station in stationOptions" :key="station" :value="station">
              {{ station }}
            </option>
          </select>
        </label>
      </div>

      <div class="upload-scoring-dialog__action-bands">
        <div class="upload-scoring-dialog__action-band">
          <span class="upload-scoring-dialog__band-label">Select</span>
          <button
            type="button"
            class="upload-scoring-dialog__chip-button upload-scoring-dialog__chip-button--info"
            :disabled="filteredConfigs.length === 0"
            @click="selectDisplayedItems"
          >
            Displayed ({{ filteredConfigs.length }})
          </button>
          <button
            type="button"
            class="upload-scoring-dialog__chip-button upload-scoring-dialog__chip-button--success"
            @click="selectCriteriaItems"
          >
            Criteria
          </button>
          <button
            type="button"
            class="upload-scoring-dialog__chip-button upload-scoring-dialog__chip-button--warning"
            @click="selectNonCriteriaItems"
          >
            Non-Criteria
          </button>
          <button
            type="button"
            class="upload-scoring-dialog__chip-button upload-scoring-dialog__chip-button--danger"
            @click="clearSelection"
          >
            Clear
          </button>
        </div>

        <div class="upload-scoring-dialog__action-band upload-scoring-dialog__action-band--secondary">
          <span class="upload-scoring-dialog__band-label">Bulk Actions</span>
          <button
            type="button"
            class="upload-scoring-dialog__button upload-scoring-dialog__button--primary"
            :disabled="filteredConfigs.length === 0"
            @click="selectDisplayedAndConfigure"
          >
            Select Displayed & Configure ({{ filteredConfigs.length }})
          </button>
          <button
            type="button"
            class="upload-scoring-dialog__button upload-scoring-dialog__button--secondary"
            :disabled="selectedCount === 0"
            @click="openBulkScoringConfig"
          >
            Bulk Config ({{ selectedCount }})
          </button>
          <button
            type="button"
            class="upload-scoring-dialog__button upload-scoring-dialog__button--ghost"
            @click="resetAll"
          >
            Reset All
          </button>
        </div>
      </div>

      <div v-if="selectedCount > 0" class="upload-scoring-dialog__selection-banner">
        <strong>{{ selectedCount }}</strong> test item{{ selectedCount === 1 ? '' : 's' }} selected for bulk actions.
      </div>

      <div class="upload-scoring-dialog__list">
        <div
          v-for="config in filteredConfigs"
          :key="config.test_item_name"
          class="upload-scoring-dialog__item-row"
          :class="{ 'is-selected': selectedItemNames.has(config.test_item_name) }"
          role="button"
          tabindex="0"
          @click="toggleItemSelection(config.test_item_name)"
          @keydown.enter.prevent="toggleItemSelection(config.test_item_name)"
          @keydown.space.prevent="toggleItemSelection(config.test_item_name)"
        >
          <label class="upload-scoring-dialog__checkbox" @click.stop>
            <input
              :checked="selectedItemNames.has(config.test_item_name)"
              type="checkbox"
              @change="toggleItemSelection(config.test_item_name)"
            />
            <span></span>
          </label>

          <div class="upload-scoring-dialog__item-copy">
            <strong :title="config.test_item_name">{{ config.test_item_name }}</strong>
            <span>{{ getScoringTypeDescription(config.scoring_type) }}</span>
          </div>

          <div class="upload-scoring-dialog__item-meta">
            <button
              type="button"
              class="upload-scoring-dialog__pill-button"
              :class="getScoringTypeClass(config.scoring_type)"
              @click.stop="openSingleItemConfig(config.test_item_name)"
            >
              {{ getScoringTypeLabel(config.scoring_type) }}
            </button>
            <span class="upload-scoring-dialog__pill" :class="getItemTypeClass(config.test_item_name)">
              {{ getItemTypeLabel(config.test_item_name) }}
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
        <button type="button" class="upload-scoring-dialog__button upload-scoring-dialog__button--ghost" @click="resetAll">
          Reset All
        </button>
        <div class="upload-scoring-dialog__footer-spacer"></div>
        <button type="button" class="upload-scoring-dialog__button upload-scoring-dialog__button--ghost" @click="handleCancel">
          Cancel
        </button>
        <button type="button" class="upload-scoring-dialog__button upload-scoring-dialog__button--primary" @click="handleApply">
          Apply
        </button>
      </div>
    </template>
  </AppDialog>

  <AppDialog
    :model-value="bulkScoringDialog"
    title="Bulk Configure Scoring"
    description="Apply the same scoring policy across the selected upload-log items."
    width="min(92vw, 34rem)"
    persistent
    @update:modelValue="bulkScoringDialog = $event"
  >
    <div class="upload-scoring-dialog__modal-stack">
      <div class="upload-scoring-dialog__notice upload-scoring-dialog__notice--info">
        This updates {{ selectedCount }} selected test item{{ selectedCount === 1 ? '' : 's' }} at once.
      </div>

      <label class="upload-scoring-dialog__field">
        <span>Scoring Type</span>
        <select v-model="bulkScoringType">
          <option v-for="option in scoringTypeOptions" :key="option.value" :value="option.value">
            {{ option.title }}
          </option>
        </select>
      </label>

      <div class="upload-scoring-dialog__notice" :class="getScoringNoticeClass(bulkScoringType)">
        {{ getScoringTypeDescription(bulkScoringType) }}
      </div>

      <label v-if="bulkScoringType === 'asymmetrical'" class="upload-scoring-dialog__field">
        <span>Policy</span>
        <select v-model="bulkPolicy">
          <option v-for="option in policyOptions" :key="option.value" :value="option.value">
            {{ option.title }}
          </option>
        </select>
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
    </div>

    <template #footer>
      <div class="upload-scoring-dialog__footer">
        <div class="upload-scoring-dialog__footer-spacer"></div>
        <button type="button" class="upload-scoring-dialog__button upload-scoring-dialog__button--ghost" @click="bulkScoringDialog = false">
          Cancel
        </button>
        <button type="button" class="upload-scoring-dialog__button upload-scoring-dialog__button--primary" @click="applyBulkScoringConfig">
          Apply to {{ selectedCount }} Item{{ selectedCount === 1 ? '' : 's' }}
        </button>
      </div>
    </template>
  </AppDialog>

  <AppDialog
    :model-value="singleItemScoringDialog"
    :title="singleConfigItem ? 'Configure Scoring' : 'Configure Scoring'"
    :description="singleConfigItem ?? ''"
    width="min(92vw, 32rem)"
    persistent
    @update:modelValue="singleItemScoringDialog = $event"
  >
    <div v-if="singleConfigItem" class="upload-scoring-dialog__modal-stack">
      <label class="upload-scoring-dialog__field">
        <span>Scoring Type</span>
        <select
          :value="getSingleDialogConfig()?.scoring_type ?? 'symmetrical'"
          @change="updateSingleDialogScoringType(($event.target as HTMLSelectElement).value as RescoreScoringConfig['scoring_type'])"
        >
          <option v-for="option in scoringTypeOptions" :key="option.value" :value="option.value">
            {{ option.title }}
          </option>
        </select>
      </label>

      <div class="upload-scoring-dialog__notice" :class="getScoringNoticeClass(getSingleDialogConfig()?.scoring_type ?? 'symmetrical')">
        {{ getScoringTypeDescription(getSingleDialogConfig()?.scoring_type ?? 'symmetrical') }}
      </div>

      <label
        v-if="getSingleDialogConfig()?.scoring_type === 'asymmetrical'"
        class="upload-scoring-dialog__field"
      >
        <span>Policy</span>
        <select
          :value="getSingleDialogConfig()?.policy ?? 'symmetrical'"
          @change="updateSingleDialogPolicy(($event.target as HTMLSelectElement).value as RescoreScoringConfig['policy'])"
        >
          <option v-for="option in policyOptions" :key="option.value" :value="option.value">
            {{ option.title }}
          </option>
        </select>
      </label>

      <label
        v-if="getSingleDialogConfig()?.scoring_type === 'asymmetrical'"
        class="upload-scoring-dialog__field"
      >
        <span>Custom Target</span>
        <input
          :value="getSingleDialogConfig()?.target ?? ''"
          type="number"
          placeholder="Leave empty for midpoint auto-detection"
          @input="updateSingleDialogTarget(toOptionalNumber(($event.target as HTMLInputElement).value))"
        />
        <small>Leave empty for auto-detection from the midpoint of UCL and LCL.</small>
      </label>

      <label class="upload-scoring-dialog__field">
        <span>Weight</span>
        <input
          :value="getSingleDialogConfig()?.weight ?? 1.0"
          type="number"
          min="0"
          max="10"
          step="0.1"
          @input="updateSingleDialogWeight(toNumber(($event.target as HTMLInputElement).value, 1.0))"
        />
        <small>Weight contribution for this item in the overall score.</small>
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
        <button type="button" class="upload-scoring-dialog__button upload-scoring-dialog__button--primary" @click="singleItemScoringDialog = false">
          Done
        </button>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AppDialog, AppPanel } from '@/shared/ui'
import type {
  ParsedTestItemEnhanced,
  RescoreScoringConfig,
} from '@/features/dut-logs/composables/useTestLogUpload'

interface Props {
  modelValue: boolean
  testItems: ParsedTestItemEnhanced[]
  existingConfigs?: RescoreScoringConfig[]
  stations?: string[]
  testItemStations?: Map<string, Set<string>> // Maps test item name -> stations it appears in
  defaultStation?: string | null // Initial station to filter by when dialog opens
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'apply', configs: RescoreScoringConfig[]): void
}

const props = withDefaults(defineProps<Props>(), {
  existingConfigs: () => [],
  stations: () => [],
  defaultStation: null,
})

const emit = defineEmits<Emits>()

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// Local state
const searchQuery = ref('')
const selectedStation = ref<string | null>(null)
const selectedItemNames = ref<Set<string>>(new Set())
const scoringConfigs = ref<RescoreScoringConfig[]>([])

const selectedCount = computed(() => selectedItemNames.value.size)
const scoringConfigCount = computed(() => scoringConfigs.value.length)
const selectedStationValue = computed({
  get: () => selectedStation.value ?? '',
  set: (value: string) => {
    selectedStation.value = value || null
  },
})

// Station options computed from props
const stationOptions = computed(() => props.stations || [])

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
  { title: 'Near-Zero', value: 'per_mask' },
  { title: 'EVM', value: 'evm' },
  // { title: 'Throughput (Higher-is-Better)', value: 'throughput' },
  // { title: 'Binary (PASS/FAIL)', value: 'binary' },
]

const policyOptions = [
  { title: 'Symmetrical (Centered)', value: 'symmetrical' },
  { title: 'Higher is Better', value: 'higher' },
  { title: 'Lower is Better', value: 'lower' },
]

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

  scoringConfigs.value = orderedNames.map((name) => {
    if (existingMap.has(name)) {
      // biome-ignore lint/style/noNonNullAssertion: checked via existingMap.has(name) above
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
  if (upper.includes('THROUGHPUT') || upper.includes('THRUPUT') || upper.includes('TPUT'))
    return 'throughput'
  return 'symmetrical'
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
  return item ? item.usl !== null || item.lsl !== null : false
}

function getItemTypeLabel(name: string): string {
  return isItemCriteria(name) ? 'Criteria' : 'Non-Criteria'
}

function getItemTypeClass(name: string): string {
  return isItemCriteria(name)
    ? 'upload-scoring-dialog__pill--success'
    : 'upload-scoring-dialog__pill--warning'
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
  filteredConfigs.value.forEach((c) => newSet.add(c.test_item_name))
  selectedItemNames.value = newSet
}

function selectCriteriaItems() {
  const newSet = new Set(selectedItemNames.value)
  scoringConfigs.value.forEach((c) => {
    if (isItemCriteria(c.test_item_name)) {
      newSet.add(c.test_item_name)
    }
  })
  selectedItemNames.value = newSet
}

function selectNonCriteriaItems() {
  const newSet = new Set(selectedItemNames.value)
  scoringConfigs.value.forEach((c) => {
    if (!isItemCriteria(c.test_item_name)) {
      newSet.add(c.test_item_name)
    }
  })
  selectedItemNames.value = newSet
}

function clearSelection() {
  selectedItemNames.value = new Set()
}

/**
 * Select all displayed items and open bulk config dialog
 */
function selectDisplayedAndConfigure() {
  // First, select all displayed items
  const newSet = new Set<string>()
  filteredConfigs.value.forEach((c) => newSet.add(c.test_item_name))
  selectedItemNames.value = newSet

  // Then open bulk config dialog
  if (newSet.size > 0) {
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
    }
  })
  bulkScoringDialog.value = false
}

// ============================================
// Global actions
// ============================================

function resetAll() {
  scoringConfigs.value.forEach((c) => {
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
.upload-scoring-dialog__action-band,
.upload-scoring-dialog__footer,
.upload-scoring-dialog__item-row,
.upload-scoring-dialog__item-meta,
.upload-scoring-dialog__spec-grid {
  display: grid;
  gap: 0.85rem;
}

.upload-scoring-dialog__toolbar {
  grid-template-columns: minmax(0, 2fr) minmax(14rem, 1fr);
}

.upload-scoring-dialog__action-bands {
  display: grid;
  gap: 0.75rem;
}

.upload-scoring-dialog__action-band {
  grid-template-columns: auto repeat(4, max-content);
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 1rem;
  border: 1px solid rgba(20, 88, 71, 0.12);
  border-radius: 1rem;
  background: rgba(255, 251, 247, 0.88);
}

.upload-scoring-dialog__action-band--secondary {
  grid-template-columns: auto repeat(3, max-content);
}

.upload-scoring-dialog__band-label,
.upload-scoring-dialog__field span,
.upload-scoring-dialog__spec-grid span {
  color: var(--app-ink);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
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
  background: rgba(20, 88, 71, 0.08);
  border-color: rgba(20, 88, 71, 0.14);
  color: #145847;
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
  background: rgba(20, 88, 71, 0.08);
  border-color: rgba(20, 88, 71, 0.16);
  color: #145847;
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
  border: 1px solid rgba(20, 88, 71, 0.1);
  background: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.upload-scoring-dialog__item-row:hover,
.upload-scoring-dialog__item-row:focus-visible {
  transform: translateY(-1px);
  border-color: rgba(20, 88, 71, 0.22);
  box-shadow: 0 0.9rem 1.8rem rgba(20, 88, 71, 0.08);
  outline: none;
}

.upload-scoring-dialog__item-row.is-selected {
  border-color: rgba(20, 88, 71, 0.28);
  background: rgba(246, 255, 250, 0.9);
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

.upload-scoring-dialog__checkbox span {
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 0.35rem;
  border: 1px solid rgba(20, 88, 71, 0.25);
  background: white;
  box-shadow: inset 0 0 0 0 rgba(20, 88, 71, 0.95);
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.upload-scoring-dialog__checkbox input:checked + span {
  border-color: rgba(20, 88, 71, 0.9);
  box-shadow: inset 0 0 0 0.45rem rgba(20, 88, 71, 0.95);
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
.upload-scoring-dialog__chip-button {
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
  background: rgba(20, 88, 71, 0.1);
  border-color: rgba(20, 88, 71, 0.16);
  color: #145847;
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
  background: linear-gradient(135deg, #145847, #1b6c58);
  border-color: #145847;
  color: white;
}

.upload-scoring-dialog__button--secondary {
  background: rgba(40, 96, 163, 0.1);
  border-color: rgba(40, 96, 163, 0.18);
  color: #1f4f89;
}

.upload-scoring-dialog__button--ghost,
.upload-scoring-dialog__ghost-button {
  background: rgba(255, 251, 247, 0.92);
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
  .upload-scoring-dialog__action-band,
  .upload-scoring-dialog__action-band--secondary,
  .upload-scoring-dialog__item-row,
  .upload-scoring-dialog__footer,
  .upload-scoring-dialog__spec-grid {
    grid-template-columns: minmax(0, 1fr);
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
