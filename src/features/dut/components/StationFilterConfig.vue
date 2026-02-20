<template>
    <!-- Test Item Selection Dialog -->
    <v-dialog v-model="testItemDialog" max-width="1000px">
        <v-card>
            <v-card-title class="d-flex justify-space-between align-center bg-primary-lighten-5">
                <div>
                    <v-icon class="mr-2" :color="dialogFilterType === 'include' ? 'success' : 'error'">
                        {{ dialogFilterType === 'include' ? 'mdi-filter-plus' : 'mdi-filter-minus' }}
                    </v-icon>
                    {{ dialogFilterType === 'include' ? 'Include' : 'Exclude' }} Test Items
                </div>
                <v-btn icon="mdi-close" variant="text" @click="testItemDialog = false" />
            </v-card-title>

            <v-card-text class="pa-4">
                <!-- Search Bar -->
                <v-text-field v-model="dialogSearch" prepend-inner-icon="mdi-magnify" label="Search Test Items"
                    placeholder="Type to search..." clearable density="comfortable" variant="outlined" class="mb-4" />

                <!-- Action Buttons -->
                <div class="d-flex mb-4" style="gap: 8px;">
                    <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-select-all"
                        @click="selectAllDialogItems">
                        Select All
                    </v-btn>
                    <v-btn size="small" variant="tonal" color="info" prepend-icon="mdi-select-inverse"
                        @click="invertDialogSelection">
                        Select Inverse
                    </v-btn>
                    <v-btn size="small" variant="tonal" color="warning" prepend-icon="mdi-select-off"
                        @click="deselectAllDialogItems">
                        Deselect All
                    </v-btn>
                    <v-spacer />
                    <v-chip size="small" color="primary" variant="tonal">
                        {{ dialogSelectedCount }} selected
                    </v-chip>
                </div>

                <!-- Test Item List with Virtual Scrolling for Performance -->
                <v-card variant="outlined">
                    <v-virtual-scroll :items="dialogFilteredItems" height="500" item-height="48">
                        <template v-slot:default="{ item }">
                            <v-list-item :key="item" @click="toggleDialogItem(item)" class="test-item-row">
                                <template #prepend>
                                    <v-checkbox-btn :model-value="isDialogItemSelected(item)"
                                        @click.stop="toggleDialogItem(item)" />
                                </template>
                                <v-list-item-title class="text-wrap"
                                    style="white-space: normal; word-break: break-word;">
                                    {{ item.replace(/\.\*/, '').replace(/\s+\(Grouped - \d+ items\)$/i, '') }}
                                </v-list-item-title>
                                <template #append v-if="/\(Grouped - \d+ items\)$/i.test(item)">
                                    <v-chip size="x-small" color="info" variant="outlined">
                                        {{ item.match(/\(Grouped - (\d+) items\)$/i)?.[1] }} items
                                    </v-chip>
                                </template>
                            </v-list-item>
                        </template>
                    </v-virtual-scroll>
                </v-card>
            </v-card-text>

            <v-card-actions class="pa-4">
                <v-spacer />
                <v-btn variant="text" @click="testItemDialog = false">Cancel</v-btn>
                <v-btn variant="elevated" color="primary" @click="applyDialogSelection">Apply</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <v-card variant="outlined" class="station-filter-card">
        <v-card-title class="d-flex align-center bg-primary-lighten-5">
            <v-icon class="mr-2" color="primary">mdi-access-point</v-icon>
            <span class="text-h6">{{ stationName }}</span>
            <v-chip v-if="stationIdentifier !== stationName" size="small" class="ml-2" variant="tonal">
                ID: {{ stationIdentifier }}
            </v-chip>
            <v-spacer />
            <v-btn v-if="hasFilters" icon="mdi-close" size="small" variant="text" @click="clearFilters"
                title="Clear all filters for this station">
            </v-btn>
        </v-card-title>

        <v-card-text>
            <v-row>
                <!-- Device Selection -->
                <v-col cols="12">
                    <v-combobox v-model="localDeviceIdentifiers" :items="availableDevices" :loading="loading"
                        label="Device Identifiers (Optional)" placeholder="Select specific devices for this station"
                        multiple chips closable-chips clearable
                        hint="Override universal device filters for this station" persistent-hint>
                        <template #prepend-inner>
                            <v-icon size="small">mdi-chip</v-icon>
                        </template>
                        <template #chip="{ props: chipProps, item }">
                            <v-chip v-bind="chipProps" :text="String(item.value || item)" closable size="small" />
                        </template>
                    </v-combobox>
                </v-col>

                <!-- Test Item Include Filters -->
                <v-col cols="12">
                    <div class="d-flex align-center" style="gap: 8px;">
                        <v-combobox v-model="localTestItemFilters" :items="testItemSuggestions" :loading="loading"
                            label="Include Test Items (Regex)" placeholder="e.g., WiFi_TX_POW.*, Bluetooth_.*" multiple
                            chips closable-chips clearable style="flex: 1;"
                            hint="Regex patterns to include specific test items for this station" persistent-hint
                            @click:clear="localTestItemFilters = []" :custom-filter="customFilterFunction"
                            @update:search-input="handleSearchInput">
                            <template #prepend-inner>
                                <v-icon size="small" color="success">mdi-filter-plus</v-icon>
                            </template>
                            <template #item="{ item }">
                                <v-list-item :title="String(item.value || item).replace(/\.\*/, '')"
                                    @click="handleItemClick(String(item.value || item), 'include', $event)">
                                    <template #prepend>
                                        <v-checkbox-btn
                                            :model-value="isItemSelected(String(item.value || item), 'include')"
                                            @click.stop="handleCheckboxClick(String(item.value || item), 'include', $event)" />
                                    </template>
                                </v-list-item>
                            </template>
                            <template #chip="{ props: chipProps, item }">
                                <v-chip v-bind="chipProps" :text="String(item.value || item).replace(/\.\*/, '')"
                                    closable size="small" color="success" variant="tonal" />
                            </template>
                        </v-combobox>
                        <v-btn density="default" variant="tonal" color="success" :rounded="1"
                            @click="openTestItemDialog('include')" title="Advanced Test Item Selection"
                            style="height: 56px; min-width: 56px; margin-bottom: 18px; display: flex; align-items: center; justify-content: center;">
                            <v-icon size="large">mdi-filter-settings</v-icon>
                        </v-btn>
                    </div>
                </v-col>

                <!-- Test Item Exclude Filters -->
                <v-col cols="12">
                    <div class="d-flex align-center" style="gap: 8px;">
                        <v-combobox v-model="localExcludeTestItemFilters" :items="testItemSuggestions"
                            :loading="loading" label="Exclude Test Items (Regex)"
                            placeholder="e.g., .*_OLD.*, .*_BACKUP.*" multiple chips closable-chips clearable
                            hint="Regex patterns to exclude test items for this station" persistent-hint
                            @click:clear="localExcludeTestItemFilters = []" style="flex: 1;"
                            :custom-filter="customFilterFunction" @update:search-input="handleSearchInput">
                            <template #prepend-inner>
                                <v-icon size="small" color="error">mdi-filter-minus</v-icon>
                            </template>
                            <template #item="{ item }">
                                <v-list-item :title="String(item.value || item).replace(/\.\*/, '')"
                                    @click="handleItemClick(String(item.value || item), 'exclude', $event)">
                                    <template #prepend>
                                        <v-checkbox-btn
                                            :model-value="isItemSelected(String(item.value || item), 'exclude')"
                                            @click.stop="handleCheckboxClick(String(item.value || item), 'exclude', $event)" />
                                    </template>
                                </v-list-item>
                            </template>
                            <template #chip="{ props: chipProps, item }">
                                <v-chip v-bind="chipProps" :text="String(item.value || item).replace(/\.\*/, '')"
                                    closable size="small" color="error" variant="tonal" />
                            </template>
                        </v-combobox>
                        <v-btn variant="tonal" color="error" :rounded="1" @click="openTestItemDialog('exclude')"
                            title="Advanced Test Item Selection"
                            style="height: 56px; min-width: 56px; margin-bottom: 18px; display: flex; align-items: center; justify-content: center;">
                            <v-icon size="large">mdi-filter-settings</v-icon>
                        </v-btn>
                    </div>
                </v-col>

                <!-- Info Alert -->
                <v-col v-if="!hasFilters" cols="12">
                    <v-alert type="info" variant="tonal" density="compact">
                        No station-specific filters configured. Universal filters will apply.
                    </v-alert>
                </v-col>

                <!-- Active Filters Summary -->
                <v-col v-else cols="12">
                    <v-alert type="success" variant="tonal" density="compact">
                        <template #prepend>
                            <v-icon size="small">mdi-check-circle</v-icon>
                        </template>
                        <div class="text-caption">
                            <span v-if="localDeviceIdentifiers.length > 0">
                                <strong>{{ localDeviceIdentifiers.length }}</strong> device(s)
                            </span>
                            <span v-if="localTestItemFilters.length > 0">
                                <span v-if="localDeviceIdentifiers.length > 0"> • </span>
                                <strong>{{ localTestItemFilters.length }}</strong> include pattern(s)
                            </span>
                            <span v-if="localExcludeTestItemFilters.length > 0">
                                <span v-if="localDeviceIdentifiers.length > 0 || localTestItemFilters.length > 0"> •
                                </span>
                                <strong>{{ localExcludeTestItemFilters.length }}</strong> exclude pattern(s)
                            </span>
                        </div>
                    </v-alert>
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
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

// Search input state for showing grouped items
const searchInput = ref<string>('')

// Flag to prevent recursive updates
const isUpdatingFromProps = ref(false)

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
  const isSearching = searchInput.value && searchInput.value.trim().length > 0

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

// Custom filter function for combobox search - searches on display value (without .*)
function customFilterFunction(itemValue: string, queryText: string): boolean {
  if (!queryText) return true

  // Remove .* from the item value for search matching
  const displayValue = itemValue.replace(/\.\*/g, '').toLowerCase()
  const query = queryText.toLowerCase()

  return displayValue.includes(query)
}

// Handle search input updates to control grouped item visibility
function handleSearchInput(value: string | undefined) {
  searchInput.value = value || ''
}

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
.station-filter-card {
    border-left: 4px solid rgb(var(--v-theme-primary));
}
</style>
