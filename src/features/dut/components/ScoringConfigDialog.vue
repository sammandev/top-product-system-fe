<template>
  <v-dialog v-model="internalShow" max-width="650" scrollable persistent>
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
        <div class="pa-3">
          <!-- Search and Filter -->
          <v-text-field v-model="searchQuery" label="Search Test Items" prepend-inner-icon="mdi-magnify"
            variant="outlined" density="compact" hide-details clearable class="mb-3" />

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
              <v-list-item :key="item.testItemName" density="compact">
                <template #prepend>
                  <v-checkbox-btn :model-value="item.enabled" density="compact"
                    @update:model-value="toggleEnabled(item.testItemName, $event)" @click.stop />
                </template>

                <v-list-item-title class="text-body-2 text-truncate">
                  {{ item.testItemName }}
                </v-list-item-title>

                <template #append>
                  <v-chip :color="getScoringTypeColor(item.scoringType)" size="x-small" variant="tonal">
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
import { computed, ref, watch } from 'vue'
import { useScoring } from '../composables/useScoring'
import {
  createDefaultScoringConfig,
  SCORING_TYPE_INFO,
  type ScoringType,
} from '../types/scoring.types'

interface Props {
  show: boolean
  testItems?: { NAME: string; VALUE?: string; UCL?: string; LCL?: string; STATUS?: string }[]
}

const props = withDefaults(defineProps<Props>(), {
  testItems: () => [],
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
  detectScoringType,
} = useScoring()

// Local state
const searchQuery = ref('')
const typeFilter = ref('all')

// Computed
const internalShow = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})

const filteredTestItems = computed(() => {
  let items = configList.value

  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter((c) => c.testItemName.toLowerCase().includes(query))
  }

  // Filter by type
  if (typeFilter.value === 'value') {
    items = items.filter((c) => c.scoringType !== 'binary')
  } else if (typeFilter.value === 'binary') {
    items = items.filter((c) => c.scoringType === 'binary')
  }

  return items
})

const enabledCount = computed(() => configList.value.filter((c) => c.enabled).length)

const valueItemsCount = computed(
  () => configList.value.filter((c) => c.scoringType !== 'binary').length,
)

const binaryItemsCount = computed(
  () => configList.value.filter((c) => c.scoringType === 'binary').length,
)

// Initialize when test items change
watch(
  () => props.testItems,
  (items) => {
    if (items.length > 0 && configList.value.length === 0) {
      initializeConfigs(items)
    }
  },
  { immediate: true },
)

// Methods
function getScoringTypeColor(type: ScoringType): string {
  return SCORING_TYPE_INFO[type]?.color || 'grey'
}

function getScoringTypeLabel(type: ScoringType): string {
  return SCORING_TYPE_INFO[type]?.label || type
}

function toggleEnabled(testItemName: string, enabled: unknown): void {
  updateConfig(testItemName, { enabled: enabled as boolean })
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
