<template>
  <AppDialog v-model="testItemDialog" width="min(92vw, 64rem)" :breakpoints="{ '960px': '96vw', '640px': '98vw' }"
    :title="`${dialogFilterType === 'include' ? 'Include' : 'Exclude'} Test Items`"
    description="Search and apply grouped test-item patterns for this station.">

    <div class="station-filter-config__dialog-body">
      <label class="station-filter-config__field">
        <span>Search Test Items</span>
        <input v-model="dialogSearch" type="text" placeholder="Type to search..." />
      </label>

      <div class="station-filter-config__toolbar-row">
        <button type="button" class="station-filter-config__button station-filter-config__button--ghost"
          @click="selectAllDialogItems">
          Select All
        </button>
        <button type="button" class="station-filter-config__button station-filter-config__button--ghost"
          @click="invertDialogSelection">
          Select Inverse
        </button>
        <button type="button" class="station-filter-config__button station-filter-config__button--ghost"
          @click="deselectAllDialogItems">
          Deselect All
        </button>
        <span class="station-filter-config__pill station-filter-config__pill--primary">{{ dialogSelectedCount }} selected</span>
      </div>

      <div class="station-filter-config__dialog-list">
        <button v-for="item in dialogFilteredItems" :key="item" type="button" class="station-filter-config__dialog-item"
          :class="{ 'is-selected': isDialogItemSelected(item) }" @click="toggleDialogItem(item)">
          <span class="station-filter-config__checkbox" :class="{ 'is-selected': isDialogItemSelected(item) }">
            <Icon v-if="isDialogItemSelected(item)" icon="mdi:check" />
          </span>
          <span class="station-filter-config__dialog-item-copy">{{ formatPatternLabel(item) }}</span>
          <span v-if="getGroupedItemCount(item)" class="station-filter-config__pill station-filter-config__pill--info">
            {{ getGroupedItemCount(item) }} items
          </span>
        </button>
        <div v-if="dialogFilteredItems.length === 0" class="station-filter-config__empty-state">
          No matching test items found.
        </div>
      </div>
    </div>

    <template #footer>
      <div class="station-filter-config__dialog-footer">
        <button type="button" class="station-filter-config__button station-filter-config__button--ghost"
          @click="testItemDialog = false">
          Cancel
        </button>
        <button type="button" class="station-filter-config__button station-filter-config__button--primary"
          @click="applyDialogSelection">
          Apply
        </button>
      </div>
    </template>
  </AppDialog>

  <AppPanel eyebrow="Station Filters" :title="stationName" :description="'Set device and test-item rules for this station only.'"
    tone="cool" splitHeader class="station-filter-config">
    <template #header-aside>
      <div class="station-filter-config__header-meta">
        <span v-if="stationIdentifier !== stationName" class="station-filter-config__pill station-filter-config__pill--muted">
          ID: {{ stationIdentifier }}
        </span>
        <button v-if="hasFilters" type="button" class="station-filter-config__button station-filter-config__button--ghost"
          @click="clearFilters">
          Clear Filters
        </button>
      </div>
    </template>

    <div class="station-filter-config__layout">
      <section class="station-filter-config__section">
        <div class="station-filter-config__section-heading">
          <div>
            <p class="station-filter-config__section-eyebrow">Device Scope</p>
            <h3>Device Identifiers</h3>
          </div>
          <span class="station-filter-config__pill station-filter-config__pill--muted">{{ localDeviceIdentifiers.length }} selected</span>
        </div>

        <label class="station-filter-config__field">
          <span>Add or search device IDs</span>
          <div class="station-filter-config__input-row">
            <input v-model="deviceSearchInput" type="text" placeholder="Search available devices or add a custom ID"
              @keydown.enter.prevent="commitDeviceDraft" />
            <button type="button" class="station-filter-config__button station-filter-config__button--ghost"
              @click="commitDeviceDraft">
              Add
            </button>
          </div>
        </label>

        <p class="station-filter-config__helper-copy">Set station-specific device IDs. Click a chip to toggle it.</p>

        <div v-if="loading" class="station-filter-config__notice station-filter-config__notice--info">
          Loading device identifiers...
        </div>
        <div v-else-if="filteredDeviceOptions.length === 0 && !deviceSearchInput.trim()"
          class="station-filter-config__notice station-filter-config__notice--info">
          No device suggestions available yet.
        </div>
        <div v-else class="station-filter-config__choice-grid">
          <button v-for="device in filteredDeviceOptions" :key="device" type="button" class="station-filter-config__choice-chip"
            :class="{ 'is-active': localDeviceIdentifiers.includes(device) }" @click="toggleDeviceIdentifier(device)">
            {{ device }}
          </button>
          <button v-if="deviceSearchInput.trim() && !localDeviceIdentifiers.includes(deviceSearchInput.trim()) && !filteredDeviceOptions.includes(deviceSearchInput.trim())"
            type="button" class="station-filter-config__choice-chip station-filter-config__choice-chip--draft"
            @click="commitDeviceDraft">
            Add "{{ deviceSearchInput.trim() }}"
          </button>
        </div>

        <div v-if="localDeviceIdentifiers.length > 0" class="station-filter-config__token-row">
          <button v-for="device in localDeviceIdentifiers" :key="device" type="button" class="station-filter-config__token"
            @click="toggleDeviceIdentifier(device)">
            <span>{{ device }}</span>
            <Icon icon="mdi:close" />
          </button>
        </div>
      </section>

      <section class="station-filter-config__section station-filter-config__section--success">
        <div class="station-filter-config__section-heading">
          <div>
            <p class="station-filter-config__section-eyebrow">Include Rules</p>
            <h3>Include Test Items</h3>
          </div>
          <div class="station-filter-config__header-meta">
            <span class="station-filter-config__pill station-filter-config__pill--success">{{ localTestItemFilters.length }} pattern(s)</span>
            <button type="button" class="station-filter-config__icon-button" @click="openTestItemDialog('include')">
              <Icon icon="mdi:filter-settings" />
            </button>
          </div>
        </div>

        <label class="station-filter-config__field">
          <span>Add regex or search test items</span>
          <div class="station-filter-config__input-row">
            <input v-model="includePatternInput" type="text" placeholder="e.g., WiFi_TX_POW.*, Bluetooth_.*"
              @keydown.enter.prevent="commitPatternDraft('include')" @keydown.",".prevent="commitPatternDraft('include')"
              @blur="commitPatternDraft('include')" />
            <button type="button" class="station-filter-config__button station-filter-config__button--success"
              @click="commitPatternDraft('include')">
              Add
            </button>
          </div>
        </label>

        <p class="station-filter-config__helper-copy">Keep only matching test items for this station.</p>

        <div v-if="filteredIncludeSuggestions.length > 0" class="station-filter-config__suggestion-list">
          <button v-for="item in filteredIncludeSuggestions" :key="`include-${item}`" type="button"
            class="station-filter-config__suggestion-row" :class="{ 'is-active': isItemSelected(item, 'include') }"
            @click="toggleItemSelection(item, 'include')">
            <span>{{ formatPatternLabel(item) }}</span>
            <span class="station-filter-config__suggestion-meta">
              <span v-if="getGroupedItemCount(item)" class="station-filter-config__pill station-filter-config__pill--info">{{ getGroupedItemCount(item) }}</span>
              <span class="station-filter-config__pill" :class="isItemSelected(item, 'include') ? 'station-filter-config__pill--success' : 'station-filter-config__pill--muted'">
                {{ isItemSelected(item, 'include') ? 'Selected' : 'Add' }}
              </span>
            </span>
          </button>
        </div>

        <div v-if="localTestItemFilters.length > 0" class="station-filter-config__token-row">
          <button v-for="pattern in localTestItemFilters" :key="pattern" type="button" class="station-filter-config__token station-filter-config__token--success"
            @click="removePatternSelection(pattern, 'include')">
            <span>{{ formatPatternLabel(pattern) }}</span>
            <Icon icon="mdi:close" />
          </button>
        </div>
      </section>

      <section class="station-filter-config__section station-filter-config__section--danger">
        <div class="station-filter-config__section-heading">
          <div>
            <p class="station-filter-config__section-eyebrow">Exclude Rules</p>
            <h3>Exclude Test Items</h3>
          </div>
          <div class="station-filter-config__header-meta">
            <span class="station-filter-config__pill station-filter-config__pill--danger">{{ localExcludeTestItemFilters.length }} pattern(s)</span>
            <button type="button" class="station-filter-config__icon-button" @click="openTestItemDialog('exclude')">
              <Icon icon="mdi:filter-settings" />
            </button>
          </div>
        </div>

        <label class="station-filter-config__field">
          <span>Add regex or search test items</span>
          <div class="station-filter-config__input-row">
            <input v-model="excludePatternInput" type="text" placeholder="e.g., .*_OLD.*, .*_BACKUP.*"
              @keydown.enter.prevent="commitPatternDraft('exclude')" @keydown.",".prevent="commitPatternDraft('exclude')"
              @blur="commitPatternDraft('exclude')" />
            <button type="button" class="station-filter-config__button station-filter-config__button--danger"
              @click="commitPatternDraft('exclude')">
              Add
            </button>
          </div>
        </label>

        <p class="station-filter-config__helper-copy">Remove matching test items from this station.</p>

        <div v-if="filteredExcludeSuggestions.length > 0" class="station-filter-config__suggestion-list">
          <button v-for="item in filteredExcludeSuggestions" :key="`exclude-${item}`" type="button"
            class="station-filter-config__suggestion-row" :class="{ 'is-active': isItemSelected(item, 'exclude') }"
            @click="toggleItemSelection(item, 'exclude')">
            <span>{{ formatPatternLabel(item) }}</span>
            <span class="station-filter-config__suggestion-meta">
              <span v-if="getGroupedItemCount(item)" class="station-filter-config__pill station-filter-config__pill--info">{{ getGroupedItemCount(item) }}</span>
              <span class="station-filter-config__pill" :class="isItemSelected(item, 'exclude') ? 'station-filter-config__pill--danger' : 'station-filter-config__pill--muted'">
                {{ isItemSelected(item, 'exclude') ? 'Selected' : 'Add' }}
              </span>
            </span>
          </button>
        </div>

        <div v-if="localExcludeTestItemFilters.length > 0" class="station-filter-config__token-row">
          <button v-for="pattern in localExcludeTestItemFilters" :key="pattern" type="button" class="station-filter-config__token station-filter-config__token--danger"
            @click="removePatternSelection(pattern, 'exclude')">
            <span>{{ formatPatternLabel(pattern) }}</span>
            <Icon icon="mdi:close" />
          </button>
        </div>
      </section>

      <div v-if="!hasFilters" class="station-filter-config__notice station-filter-config__notice--info">
        No station-specific filters are set. Shared filters still apply.
      </div>
      <div v-else class="station-filter-config__notice station-filter-config__notice--success">
        <strong>{{ localDeviceIdentifiers.length }}</strong> device(s), <strong>{{ localTestItemFilters.length }}</strong> include pattern(s), and <strong>{{ localExcludeTestItemFilters.length }}</strong> exclude pattern(s) are active.
      </div>
    </div>
  </AppPanel>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, nextTick, ref, watch } from 'vue'
import { AppDialog, AppPanel } from '@/shared'
import type { StationFilterConfig, TestItem } from '../types/dutTopProduct.types'

// Props
interface Props {
  stationIdentifier: string
  stationName?: string
  availableTestItems?: TestItem[]
  availableDevices?: string[]
  modelValue?: StationFilterConfig
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  stationName: undefined,
  availableTestItems: () => [],
  availableDevices: () => [],
  modelValue: undefined,
  loading: false,
})

// Emits
const emit = defineEmits<(e: 'update:modelValue', value: StationFilterConfig | undefined) => void>()

// Local state
const localDeviceIdentifiers = ref<string[]>(props.modelValue?.device_identifiers || [])
const localTestItemFilters = ref<string[]>(props.modelValue?.test_item_filters || [])
const localExcludeTestItemFilters = ref<string[]>(props.modelValue?.exclude_test_item_filters || [])
const deviceSearchInput = ref('')
const includePatternInput = ref('')
const excludePatternInput = ref('')

// Flag to prevent recursive updates
const isUpdatingFromProps = ref(false)

const suggestionQuery = computed(() => {
  const includeQuery = includePatternInput.value.trim()
  const excludeQuery = excludePatternInput.value.trim()
  return includeQuery || excludeQuery
})

// Computed
const testItemSuggestions = computed(() => {
  if (!props.availableTestItems || props.availableTestItems.length === 0) {
    return []
  }

  // Extract unique test item names (preserve original order)
  const seen = new Set<string>()
  const itemNames = props.availableTestItems
    .map((item) => item.name)
    .filter((name) => {
      if (seen.has(name)) return false
      seen.add(name)
      return true
    })

  // When user is not searching (empty search), show only individual items
  const isSearching = suggestionQuery.value.length > 0

  // Group items by pattern (e.g., TX1, TX2, TX3 -> TX)
  const groups = new Map<string, string[]>()

  itemNames.forEach((name) => {
    // Pattern 1: WiFi_TX1_..., WiFi_TX2_... -> WiFi_TX_...
    // Pattern 2: BT_RX1_..., BT_RX2_... -> BT_RX_...
    // Pattern: Match anything with _TX1_, _TX2_, _RX1_, _RX2_, etc. followed by underscore
    const antennaMatch = name.match(/^(.+_)(TX|RX|PA)(\d+)(_.*?)$/)

    if (antennaMatch) {
      const [, prefix, type, , suffix] = antennaMatch
      const groupKey = `${prefix}${type}${suffix}`

      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)?.push(name)
    }
  })

  // Create grouped suggestions - organized with groups first, then individual items
  const suggestions: string[] = []
  const addedGroups = new Set<string>()
  const groupedItemNames = new Set<string>()

  // First pass: Add grouped patterns only when user is searching
  if (isSearching) {
    itemNames.forEach((name) => {
      // Check if this item belongs to a group
      for (const [groupKey, members] of groups.entries()) {
        if (members.includes(name) && members.length >= 2) {
          // Mark this item as part of a group
          members.forEach((m) => groupedItemNames.add(m))

          // Only add the group once
          if (!addedGroups.has(groupKey)) {
            // Create regex pattern that matches all group members
            const firstMember = members[0]
            if (firstMember) {
              const match = firstMember.match(/^(.+_)(TX|RX|PA)(\d+)(_.*?)$/)
              if (match) {
                const prefix = match[1]
                const type = match[2]
                const suffix = match[4]
                if (prefix && type && suffix) {
                  const groupPattern = `${prefix}${type}.*${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
                  suggestions.push(`${groupPattern} (Grouped - ${members.length} items)`)
                  addedGroups.add(groupKey)
                }
              }
            }
          }
          break
        }
      }
    })
  }

  // Second pass: Add all individual items (both grouped and non-grouped)
  itemNames.forEach((name) => {
    suggestions.push(name)
  })

  // Return unsorted to maintain individual-first order (or groups-first when searching)
  return suggestions
})

// Get expanded form of grouped patterns to check for duplicates
function getExpandedPatterns(pattern: string): string[] {
  if (!props.availableTestItems || props.availableTestItems.length === 0) {
    return [pattern]
  }

  // Check if this is a grouped pattern
  const groupMatch = pattern.match(/^(.+_)(TX|RX|PA)\.\*(_.*?)\s+\(Grouped - \d+ items\)$/i)
  if (!groupMatch) {
    return [pattern] // Not a grouped pattern, return as-is
  }

  const [, prefix, type, suffix] = groupMatch

  // Find all items matching this pattern
  const itemNames = props.availableTestItems.map((item) => item.name)
  const matchingItems = itemNames.filter((name) => {
    const match = name.match(/^(.+_)(TX|RX|PA)(\d+)(_.*?)$/)
    if (!match) return false
    const [, itemPrefix, itemType, , itemSuffix] = match
    return itemPrefix === prefix && itemType === type && itemSuffix === suffix
  })

  return matchingItems.length > 0 ? matchingItems : [pattern]
}

// Check if an item is selected (accounting for grouped patterns)
function isItemSelected(item: string, filterType: 'include' | 'exclude'): boolean {
  const selectedItems =
    filterType === 'include' ? localTestItemFilters.value : localExcludeTestItemFilters.value

  // Direct match
  if (selectedItems.includes(item)) {
    return true
  }

  // Check if item is part of a grouped pattern
  const expandedItem = getExpandedPatterns(item)
  const expandedSelected = selectedItems.flatMap(getExpandedPatterns)

  return expandedItem.some((exp) => expandedSelected.includes(exp))
}

// Handle checkbox click - prevent event propagation issues
function handleCheckboxClick(item: string, filterType: 'include' | 'exclude', event: Event) {
  event.preventDefault()
  event.stopPropagation()
  toggleItemSelection(item, filterType)
}

// Handle list item click - ensure it triggers selection
function handleItemClick(item: string, filterType: 'include' | 'exclude', event: Event) {
  event.preventDefault()
  event.stopPropagation()
  toggleItemSelection(item, filterType)
}

// Toggle item selection (add or remove from filter list)
function toggleItemSelection(item: string, filterType: 'include' | 'exclude') {
  const selectedItems =
    filterType === 'include' ? localTestItemFilters.value : localExcludeTestItemFilters.value

  const expandedItem = getExpandedPatterns(item)
  const expandedSelected = selectedItems.flatMap(getExpandedPatterns)

  // Check if item or its expanded patterns are already selected
  const isAlreadySelected =
    selectedItems.includes(item) || expandedItem.some((exp) => expandedSelected.includes(exp))

  console.log(
    `${filterType === 'include' ? '➕' : '➖'} Toggle [${filterType}]:`,
    item,
    isAlreadySelected ? '(removing)' : '(adding)',
  )

  if (isAlreadySelected) {
    // Remove the item from selection
    if (filterType === 'include') {
      // Remove direct match or find and remove grouped pattern
      if (selectedItems.includes(item)) {
        localTestItemFilters.value = selectedItems.filter((i) => i !== item)
      } else {
        // Find and remove grouped pattern or individual items that cover this item
        localTestItemFilters.value = selectedItems.filter((selectedItem) => {
          const expanded = getExpandedPatterns(selectedItem)
          return !expandedItem.some((exp) => expanded.includes(exp))
        })
      }
    } else {
      if (selectedItems.includes(item)) {
        localExcludeTestItemFilters.value = selectedItems.filter((i) => i !== item)
      } else {
        localExcludeTestItemFilters.value = selectedItems.filter((selectedItem) => {
          const expanded = getExpandedPatterns(selectedItem)
          return !expandedItem.some((exp) => expanded.includes(exp))
        })
      }
    }
  } else {
    // Before adding, remove any overlapping items
    const newItems = selectedItems.filter((selectedItem) => {
      const expanded = getExpandedPatterns(selectedItem)
      return !expandedItem.some((exp) => expanded.includes(exp))
    })

    // Add the item to selection
    if (filterType === 'include') {
      localTestItemFilters.value = [...newItems, item]
    } else {
      localExcludeTestItemFilters.value = [...newItems, item]
    }
  }
}

const filteredDeviceOptions = computed(() => {
  const query = deviceSearchInput.value.trim().toLowerCase()
  if (!query) {
    return props.availableDevices
  }

  return props.availableDevices.filter((device) => device.toLowerCase().includes(query))
})

const filteredIncludeSuggestions = computed(() => {
  const query = includePatternInput.value.trim().toLowerCase()
  if (!query) {
    return []
  }

  return testItemSuggestions.value
    .filter(
      (item) =>
        formatPatternLabel(item).toLowerCase().includes(query) ||
        item.toLowerCase().includes(query),
    )
    .slice(0, 16)
})

const filteredExcludeSuggestions = computed(() => {
  const query = excludePatternInput.value.trim().toLowerCase()
  if (!query) {
    return []
  }

  return testItemSuggestions.value
    .filter(
      (item) =>
        formatPatternLabel(item).toLowerCase().includes(query) ||
        item.toLowerCase().includes(query),
    )
    .slice(0, 16)
})

// Test Item Dialog State
const testItemDialog = ref(false)
const dialogFilterType = ref<'include' | 'exclude'>('include')
const dialogSearch = ref('')
const dialogSelectedItems = ref<Set<string>>(new Set())

// Cache for dialog items to avoid recomputation
const cachedDialogItems = ref<string[]>([])
const lastAvailableItemsCount = ref(0)

// Dialog Computed Properties - Optimized with caching
const dialogAllItems = computed(() => {
  if (!props.availableTestItems || props.availableTestItems.length === 0) {
    return []
  }

  // Use cached version if available items haven't changed
  if (
    cachedDialogItems.value.length > 0 &&
    lastAvailableItemsCount.value === props.availableTestItems.length
  ) {
    return cachedDialogItems.value
  }

  // Extract unique test item names (preserve original order)
  const seen = new Set<string>()
  const itemNames = props.availableTestItems
    .map((item) => item.name)
    .filter((name) => {
      if (seen.has(name)) return false
      seen.add(name)
      return true
    })

  // Group items by pattern
  const groups = new Map<string, string[]>()

  itemNames.forEach((name) => {
    const antennaMatch = name.match(/^(.+_)(TX|RX|PA)(\d+)(_.*?)$/)
    if (antennaMatch) {
      const [, prefix, type, , suffix] = antennaMatch
      const groupKey = `${prefix}${type}${suffix}`

      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)?.push(name)
    }
  })

  // Build all suggestions (individual + grouped items for dialog)
  const allItems: string[] = []
  const addedGroups = new Set<string>()

  // Add grouped patterns for items with 2+ members
  itemNames.forEach((name) => {
    for (const [groupKey, members] of groups.entries()) {
      if (members.includes(name) && members.length >= 2 && !addedGroups.has(groupKey)) {
        const firstMember = members[0]
        if (firstMember) {
          const match = firstMember.match(/^(.+_)(TX|RX|PA)(\d+)(_.*?)$/)
          if (match) {
            const prefix = match[1]
            const type = match[2]
            const suffix = match[4]
            if (prefix && type && suffix) {
              const groupPattern = `${prefix}${type}.*${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
              allItems.push(`${groupPattern} (Grouped - ${members.length} items)`)
              addedGroups.add(groupKey)
            }
          }
        }
        break
      }
    }
  })

  // Add all individual items
  itemNames.forEach((name) => {
    allItems.push(name)
  })

  // Cache the result
  cachedDialogItems.value = allItems
  lastAvailableItemsCount.value = props.availableTestItems.length

  return allItems
})

const dialogFilteredItems = computed(() => {
  const allItems = dialogAllItems.value

  // Filter by search if present
  if (!dialogSearch.value || dialogSearch.value.trim().length === 0) {
    return allItems
  }

  const query = dialogSearch.value.toLowerCase()
  return allItems.filter((item) => item.toLowerCase().includes(query))
})

const dialogSelectedCount = computed(() => dialogSelectedItems.value.size)

// Dialog Functions
function openTestItemDialog(filterType: 'include' | 'exclude') {
  dialogFilterType.value = filterType
  dialogSearch.value = ''

  // Pre-select items from current selection
  const currentItems =
    filterType === 'include' ? localTestItemFilters.value : localExcludeTestItemFilters.value

  dialogSelectedItems.value = new Set(currentItems)
  testItemDialog.value = true
}

function formatPatternLabel(pattern: string): string {
  return pattern.replace(/\s+\(Grouped - \d+ items\)$/i, '').replace(/\.\*/g, '')
}

function getGroupedItemCount(pattern: string): string | null {
  return pattern.match(/\(Grouped - (\d+) items\)$/i)?.[1] ?? null
}

function normalizeDraftValue(value: string): string {
  return value.trim().replace(/,+$/, '')
}

function commitDeviceDraft() {
  const draft = normalizeDraftValue(deviceSearchInput.value)
  if (!draft) {
    return
  }

  if (!localDeviceIdentifiers.value.includes(draft)) {
    localDeviceIdentifiers.value = [...localDeviceIdentifiers.value, draft]
  }

  deviceSearchInput.value = ''
}

function toggleDeviceIdentifier(device: string) {
  if (localDeviceIdentifiers.value.includes(device)) {
    localDeviceIdentifiers.value = localDeviceIdentifiers.value.filter((entry) => entry !== device)
    return
  }

  localDeviceIdentifiers.value = [...localDeviceIdentifiers.value, device]
}

function commitPatternDraft(filterType: 'include' | 'exclude') {
  const source = filterType === 'include' ? includePatternInput : excludePatternInput
  const draft = normalizeDraftValue(source.value)
  if (!draft) {
    source.value = ''
    return
  }

  if (!isItemSelected(draft, filterType)) {
    toggleItemSelection(draft, filterType)
  }

  source.value = ''
}

function removePatternSelection(pattern: string, filterType: 'include' | 'exclude') {
  if (filterType === 'include') {
    localTestItemFilters.value = localTestItemFilters.value.filter((entry) => entry !== pattern)
    return
  }

  localExcludeTestItemFilters.value = localExcludeTestItemFilters.value.filter(
    (entry) => entry !== pattern,
  )
}

function isDialogItemSelected(item: string): boolean {
  return dialogSelectedItems.value.has(item)
}

function toggleDialogItem(item: string) {
  if (dialogSelectedItems.value.has(item)) {
    dialogSelectedItems.value.delete(item)
  } else {
    dialogSelectedItems.value.add(item)
  }
}

function selectAllDialogItems() {
  dialogFilteredItems.value.forEach((item) => {
    dialogSelectedItems.value.add(item)
  })
}

function deselectAllDialogItems() {
  dialogFilteredItems.value.forEach((item) => {
    dialogSelectedItems.value.delete(item)
  })
}

function invertDialogSelection() {
  dialogFilteredItems.value.forEach((item) => {
    if (dialogSelectedItems.value.has(item)) {
      dialogSelectedItems.value.delete(item)
    } else {
      dialogSelectedItems.value.add(item)
    }
  })
}

function applyDialogSelection() {
  const selectedArray = Array.from(dialogSelectedItems.value)

  if (dialogFilterType.value === 'include') {
    localTestItemFilters.value = selectedArray
  } else {
    localExcludeTestItemFilters.value = selectedArray
  }

  testItemDialog.value = false
}

const hasFilters = computed(() => {
  return (
    localDeviceIdentifiers.value.length > 0 ||
    localTestItemFilters.value.length > 0 ||
    localExcludeTestItemFilters.value.length > 0
  )
})

// Helper function to clean up grouped patterns for API submission
function cleanupTestItemPattern(pattern: string): string {
  // Check if this is a grouped pattern with the suffix
  const isGroupedPattern = /\(Grouped - \d+ items\)$/i.test(pattern)

  if (isGroupedPattern) {
    // For grouped patterns: Remove suffix and convert to regex pattern
    // "WiFi_TX.*_POW_5300 (Grouped - 4 items)" -> "WiFi_TX.*_POW_5300"
    return pattern.replace(/\s+\(Grouped - \d+ items\)$/i, '')
  } else {
    // For individual items: Return as-is
    // "WiFi_TX1_POW_5300" -> "WiFi_TX1_POW_5300"
    return pattern
  }
}

// Watch for changes and emit
watch(
  [localDeviceIdentifiers, localTestItemFilters, localExcludeTestItemFilters],
  () => {
    // Don't emit if we're updating from props
    if (isUpdatingFromProps.value) {
      return
    }

    if (!hasFilters.value) {
      // No filters configured, emit undefined to remove station from config
      emit('update:modelValue', undefined)
      return
    }

    // Clean up test item patterns before sending to API
    const cleanedIncludeFilters =
      localTestItemFilters.value.length > 0
        ? localTestItemFilters.value.map(cleanupTestItemPattern)
        : undefined

    const cleanedExcludeFilters =
      localExcludeTestItemFilters.value.length > 0
        ? localExcludeTestItemFilters.value.map(cleanupTestItemPattern)
        : undefined

    // Build filter config
    const config: StationFilterConfig = {
      station_identifier: props.stationIdentifier,
      device_identifiers:
        localDeviceIdentifiers.value.length > 0 ? localDeviceIdentifiers.value : undefined,
      test_item_filters: cleanedIncludeFilters,
      exclude_test_item_filters: cleanedExcludeFilters,
    }

    emit('update:modelValue', config)
  },
  { deep: true },
)

// Watch for external changes to modelValue (only update if different)
watch(
  () => props.modelValue,
  async (newValue) => {
    // Set flag to prevent emitting during prop updates
    isUpdatingFromProps.value = true

    await nextTick()

    if (newValue) {
      localDeviceIdentifiers.value = newValue.device_identifiers || []
      localTestItemFilters.value = newValue.test_item_filters || []
      localExcludeTestItemFilters.value = newValue.exclude_test_item_filters || []
    } else {
      localDeviceIdentifiers.value = []
      localTestItemFilters.value = []
      localExcludeTestItemFilters.value = []
    }

    // Reset flag after DOM updates
    await nextTick()
    isUpdatingFromProps.value = false
  },
  { deep: true },
)

// Methods
function clearFilters() {
  localDeviceIdentifiers.value = []
  localTestItemFilters.value = []
  localExcludeTestItemFilters.value = []
}
</script>

<style scoped>
.station-filter-config {
  border-left: 1px solid rgba(40, 96, 163, 0.18);
}

.station-filter-config__layout,
.station-filter-config__dialog-body,
.station-filter-config__dialog-footer,
.station-filter-config__section,
.station-filter-config__header-meta,
.station-filter-config__toolbar-row,
.station-filter-config__token-row,
.station-filter-config__input-row,
.station-filter-config__dialog-item,
.station-filter-config__suggestion-row,
.station-filter-config__dialog-header {
  display: flex;
}

.station-filter-config__layout,
.station-filter-config__dialog-body,
.station-filter-config__section {
  flex-direction: column;
  gap: 1rem;
}

.station-filter-config__dialog-header,
.station-filter-config__toolbar-row,
.station-filter-config__section-heading {
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.station-filter-config__dialog-header h2,
.station-filter-config__section-heading h3 {
  margin: 0.2rem 0 0;
}

.station-filter-config__eyebrow,
.station-filter-config__section-eyebrow,
.station-filter-config__helper-copy {
  margin: 0;
  color: var(--app-muted);
}

.station-filter-config__eyebrow,
.station-filter-config__section-eyebrow {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.station-filter-config__field {
  display: grid;
  gap: 0.45rem;
}

.station-filter-config__field span:first-child {
  color: var(--app-ink);
  font-size: 0.82rem;
  font-weight: 700;
}

.station-filter-config__input-row {
  gap: 0.65rem;
}

.station-filter-config__field input {
  flex: 1;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  padding: 0.72rem 0.82rem;
}

.station-filter-config__button,
.station-filter-config__icon-button,
.station-filter-config__choice-chip,
.station-filter-config__token,
.station-filter-config__dialog-item,
.station-filter-config__suggestion-row {
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel);
  color: var(--app-ink);
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease;
}

.station-filter-config__button:hover,
.station-filter-config__icon-button:hover,
.station-filter-config__choice-chip:hover,
.station-filter-config__token:hover,
.station-filter-config__dialog-item:hover,
.station-filter-config__suggestion-row:hover {
  border-color: rgba(15, 118, 110, 0.24);
}

.station-filter-config__button {
  padding: 0.62rem 0.88rem;
  font-weight: 700;
}

.station-filter-config__button--primary {
  background: rgba(40, 96, 163, 0.12);
  border-color: rgba(40, 96, 163, 0.2);
  color: #1f4e86;
}

.station-filter-config__button--success {
  background: rgba(15, 118, 110, 0.12);
  border-color: rgba(15, 118, 110, 0.22);
  color: var(--app-accent);
}

.station-filter-config__button--danger {
  background: rgba(189, 64, 64, 0.14);
  border-color: rgba(189, 64, 64, 0.22);
  color: #8f2020;
}

.station-filter-config__button--ghost,
.station-filter-config__icon-button {
  color: #4f5d6d;
}

.station-filter-config__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.65rem;
  height: 2.65rem;
}

.station-filter-config__section {
  border: 1px solid var(--app-border);
  border-radius: 0.8rem;
  background: var(--app-panel);
  padding: 0.9rem;
}

.station-filter-config__section--success {
  background: var(--app-panel);
  border-color: rgba(15, 118, 110, 0.16);
}

.station-filter-config__section--danger {
  background: var(--app-panel);
  border-color: rgba(189, 64, 64, 0.16);
}

.station-filter-config__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  font-size: 0.77rem;
  font-weight: 700;
}

.station-filter-config__pill--primary {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.station-filter-config__pill--info {
  background: rgba(20, 113, 153, 0.12);
  color: #0f6c92;
}

.station-filter-config__pill--muted {
  background: rgba(120, 129, 143, 0.12);
  color: #4f5d6d;
}

.station-filter-config__pill--success {
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.station-filter-config__pill--danger {
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

.station-filter-config__choice-grid,
.station-filter-config__token-row,
.station-filter-config__suggestion-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.station-filter-config__choice-chip,
.station-filter-config__token,
.station-filter-config__suggestion-row {
  padding: 0.58rem 0.82rem;
}

.station-filter-config__choice-chip.is-active,
.station-filter-config__choice-chip--draft {
  border-color: rgba(40, 96, 163, 0.26);
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.station-filter-config__token,
.station-filter-config__suggestion-row,
.station-filter-config__dialog-item {
  align-items: center;
  gap: 0.55rem;
}

.station-filter-config__token--success {
  border-color: rgba(15, 118, 110, 0.22);
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.station-filter-config__token--danger {
  border-color: rgba(189, 64, 64, 0.22);
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

.station-filter-config__suggestion-list {
  flex-direction: column;
}

.station-filter-config__suggestion-row,
.station-filter-config__dialog-item {
  justify-content: space-between;
  width: 100%;
  border-radius: 0.8rem;
}

.station-filter-config__suggestion-row.is-active,
.station-filter-config__dialog-item.is-selected {
  border-color: rgba(40, 96, 163, 0.22);
  background: rgba(40, 96, 163, 0.1);
}

.station-filter-config__suggestion-meta,
.station-filter-config__dialog-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.station-filter-config__notice,
.station-filter-config__empty-state {
  border-radius: 0.8rem;
  padding: 0.8rem 0.9rem;
  font-size: 0.9rem;
}

.station-filter-config__notice--info,
.station-filter-config__empty-state {
  background: rgba(40, 96, 163, 0.08);
  color: #1f4e86;
}

.station-filter-config__notice--success {
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.station-filter-config__dialog-list {
  display: grid;
  gap: 0.65rem;
  max-height: 32rem;
  overflow: auto;
  padding-right: 0.25rem;
}

.station-filter-config__checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  color: transparent;
}

.station-filter-config__checkbox.is-selected {
  background: rgba(40, 96, 163, 0.14);
  color: #1f4e86;
}

.station-filter-config__dialog-item-copy {
  flex: 1;
  text-align: left;
}

@media (max-width: 900px) {
  .station-filter-config__dialog-header,
  .station-filter-config__toolbar-row,
  .station-filter-config__section-heading,
  .station-filter-config__input-row,
  .station-filter-config__dialog-footer {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
