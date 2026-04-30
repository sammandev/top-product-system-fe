<template>
  <AppDialog :model-value="internalShow" width="min(96vw, 56rem)" persistent title="Select Stations"
    @update:modelValue="internalShow = $event">

    <div class="station-selection-dialog__stack">
      <label class="station-selection-dialog__field">
        <span>Search Stations</span>
        <div class="station-selection-dialog__search-input">
          <input v-model="searchQuery" type="text" placeholder="Search by station name or TSP name" />
          <button v-if="searchQuery" type="button" class="station-selection-dialog__clear-button"
            @click="searchQuery = ''">
            Clear
          </button>
        </div>
      </label>

      <div class="station-selection-dialog__list">
        <div v-for="station in filteredStations" :key="station.station_name" class="station-item"
          :class="{ 'station-configured': isStationConfigured(station.display_station_name) }" role="button"
          tabindex="0" @click="handleStationClick(station)" @keydown.enter.prevent="handleStationClick(station)"
          @keydown.space.prevent="handleStationClick(station)">
          <span class="station-selection-dialog__checkmark"
            :class="{ 'is-active': isStationConfigured(station.display_station_name) }"></span>
          <div class="station-selection-dialog__station-copy">
            <strong>{{ station.display_station_name }}</strong>
            <span>
              TSP: {{ station.station_name }}
              <span v-if="station.order"
                class="station-selection-dialog__pill station-selection-dialog__pill--muted">#{{ station.order }}</span>
            </span>
          </div>
          <div class="station-selection-dialog__station-meta">
            <template v-if="isStationConfigured(station.display_station_name)">
              <span class="station-selection-dialog__pill station-selection-dialog__pill--info">
                {{ getStationConfig(station.display_station_name)?.deviceIds?.length || 'All' }} Device(s)
              </span>
              <span class="station-selection-dialog__pill station-selection-dialog__pill--primary">
                {{ getTestItemsLabel(station.display_station_name) }}
              </span>
              <span v-if="getScoringConfigsCount(station.display_station_name) > 0"
                class="station-selection-dialog__pill station-selection-dialog__pill--warning">
                {{ getScoringConfigsCount(station.display_station_name) }} Scoring
              </span>
            </template>
          </div>
        </div>

        <div v-if="filteredStations.length === 0" class="station-selection-dialog__empty-state">
          No stations found.
        </div>
      </div>
    </div>

    <template #footer>
      <div class="station-selection-dialog__footer">
        <span v-if="configuredStationsCount > 0"
          class="station-selection-dialog__pill station-selection-dialog__pill--success">
          {{ configuredStationsCount }} Station(s) Configured
        </span>
        <div class="station-selection-dialog__footer-spacer"></div>
        <button type="button" class="station-selection-dialog__button station-selection-dialog__button--ghost"
          :disabled="configuredStationsCount === 0" @click="handleClearAll">
          Clear All
        </button>
        <button type="button" class="station-selection-dialog__button station-selection-dialog__button--primary"
          :disabled="configuredStationsCount === 0" @click="handleConfirm">
          Confirm Selection
        </button>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ScoringPolicy, ScoringType } from '@/features/dut/types/scoring.types'
import type { Station } from '@/features/dut-logs/composables/useIplasApi'
import { AppDialog } from '@/shared/ui'

// Per-test-item scoring configuration
export interface TestItemScoringConfig {
  scoringType: ScoringType
  target?: number // Required for asymmetrical
  policy?: ScoringPolicy // Policy for asymmetrical (symmetrical/higher/lower)
  weight?: number // Weight for scoring (default: 1.0)
  maxDeviation?: number // Optional maximum allowed deviation before DUT is marked failed
}

export interface StationConfig {
  displayName: string
  stationName: string
  deviceIds: string[]
  totalDeviceCount?: number // Total available device count (used when deviceIds is empty)
  testStatus: 'ALL' | 'PASS' | 'FAIL'
  minimumItemScore?: number
  minimumItemScoreEnabled?: boolean // Whether minimum item score check is enabled (default: true)
  includedTestItems?: string[] // Empty means all items are included unless explicitly excluded
  excludedTestItems?: string[] // Items removed from analysis after inclusion rules are applied
  selectedTestItems?: string[] // Legacy field for migration
  testItemSelectionMode?: 'include' | 'exclude' // Legacy field for migration
  testItemScoringConfigs?: Record<string, TestItemScoringConfig> // Per-test-item scoring config
}

interface Props {
  show: boolean
  site: string
  project: string
  stations: Station[]
  selectedConfigs: Record<string, StationConfig>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'station-click', station: Station): void
  (e: 'confirm', configs: Record<string, StationConfig>): void
  (e: 'clear-all'): void
}>()

const internalShow = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})

const searchQuery = ref('')

const filteredStations = computed(() => {
  if (!searchQuery.value) return props.stations

  const query = searchQuery.value.toLowerCase()
  return props.stations.filter(
    (station) =>
      station.display_station_name.toLowerCase().includes(query) ||
      station.station_name.toLowerCase().includes(query),
  )
})

const configuredStationsCount = computed(() => {
  return Object.keys(props.selectedConfigs).length
})

function isStationConfigured(displayName: string): boolean {
  return !!props.selectedConfigs[displayName]
}

function getStationConfig(displayName: string): StationConfig | undefined {
  return props.selectedConfigs[displayName]
}

function getTestItemsLabel(displayName: string): string {
  const config = props.selectedConfigs[displayName]
  if (!config) {
    return 'All Items'
  }

  const includeCount = config.includedTestItems?.length ?? 0
  const excludeCount = config.excludedTestItems?.length ?? 0

  if (includeCount === 0 && excludeCount === 0) {
    return 'All Items'
  }

  if (includeCount > 0 && excludeCount > 0) {
    return `${includeCount} In / ${excludeCount} Out`
  }

  if (includeCount > 0) {
    return `${includeCount} Included`
  }

  return `${excludeCount} Excluded`
}

function getScoringConfigsCount(displayName: string): number {
  const config = props.selectedConfigs[displayName]
  if (!config?.testItemScoringConfigs) return 0
  return Object.keys(config.testItemScoringConfigs).length
}

function handleStationClick(station: Station): void {
  emit('station-click', station)
}

function handleConfirm(): void {
  emit('confirm', props.selectedConfigs)
}

function handleClearAll(): void {
  emit('clear-all')
}

function handleClose(): void {
  internalShow.value = false
}

// Reset search when dialog closes
watch(
  () => props.show,
  (newShow) => {
    if (!newShow) {
      searchQuery.value = ''
    }
  },
)
</script>

<style scoped>
.station-selection-dialog__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: start;
  width: 100%;
}

.station-selection-dialog__header-copy {
  display: grid;
  gap: 0.3rem;
}

.station-selection-dialog__eyebrow {
  margin: 0;
  color: var(--app-accent);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.station-selection-dialog__header-copy h2 {
  margin: 0;
  color: var(--app-ink);
  font-family: var(--app-display);
  font-size: 1.35rem;
}

.station-selection-dialog__header-copy span,
.station-selection-dialog__station-copy span,
.station-selection-dialog__empty-state {
  color: var(--app-muted);
  line-height: 1.55;
}

.station-selection-dialog__stack,
.station-selection-dialog__station-copy,
.station-selection-dialog__station-meta,
.station-selection-dialog__footer {
  display: grid;
  gap: 1rem;
}

.station-selection-dialog__icon-button,
.station-selection-dialog__button,
.station-selection-dialog__clear-button {
  min-height: 2.75rem;
  border-radius: 0.75rem;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-ink);
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.station-selection-dialog__icon-button:hover,
.station-selection-dialog__button:hover,
.station-selection-dialog__clear-button:hover,
.station-item:hover {
  border-color: var(--app-accent);
}

.station-selection-dialog__icon-button,
.station-selection-dialog__button,
.station-selection-dialog__clear-button {
  padding: 0.65rem 0.9rem;
}

.station-selection-dialog__button--primary {
  background: var(--app-accent);
  border-color: var(--app-accent);
  color: var(--app-canvas);
}

.station-selection-dialog__button--ghost {
  background: var(--app-panel);
}

.station-selection-dialog__field {
  display: grid;
  gap: 0.45rem;
}

.station-selection-dialog__field span {
  color: var(--app-ink);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: none;
}

.station-selection-dialog__search-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.65rem;
}

.station-selection-dialog__search-input input {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  padding: 0.72rem 0.82rem;
  font: inherit;
}

.station-selection-dialog__list {
  display: grid;
  gap: 0.75rem;
  max-height: 32rem;
  overflow-y: auto;
  padding-right: 0.15rem;
}

.station-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: 0.85rem 0.9rem;
  border: 1px solid color-mix(in srgb, var(--app-accent) 12%, var(--app-border));
  border-radius: 0.8rem;
  background: var(--app-panel);
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.station-item:hover {
  border-color: color-mix(in srgb, var(--app-accent) 24%, var(--app-border));
  background-color: var(--app-panel-strong);
}

.station-configured {
  border-color: var(--app-accent-soft);
  background-color: var(--app-panel-strong);
}

.station-configured:hover {
  background-color: var(--app-panel-strong);
}

.station-selection-dialog__checkmark {
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 0.35rem;
  border: 1px solid color-mix(in srgb, var(--app-accent) 24%, var(--app-border));
  background: var(--app-panel-strong);
}

.station-selection-dialog__checkmark.is-active {
  background: var(--app-accent);
  border-color: var(--app-accent);
  box-shadow: inset 0 0 0 0.2rem var(--app-panel-strong);
}

.station-selection-dialog__station-copy {
  gap: 0.2rem;
}

.station-selection-dialog__station-copy strong {
  color: var(--app-ink);
  font-size: 1rem;
}

.station-selection-dialog__station-meta {
  grid-auto-flow: column;
  align-items: center;
  justify-content: end;
  gap: 0.5rem;
}

.station-selection-dialog__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 700;
  white-space: nowrap;
}

.station-selection-dialog__pill--muted {
  background: color-mix(in srgb, var(--app-muted) 10%, transparent);
  border-color: color-mix(in srgb, var(--app-muted) 16%, transparent);
  color: var(--app-muted);
}

.station-selection-dialog__pill--success {
  background: var(--app-accent-soft);
  border-color: color-mix(in srgb, var(--app-accent) 16%, var(--app-border));
  color: var(--app-accent);
}

.station-selection-dialog__pill--primary {
  background: var(--app-info-soft);
  border-color: var(--app-info-line);
  color: var(--app-info);
}

.station-selection-dialog__pill--info {
  background: var(--app-info-soft);
  border-color: var(--app-info-line);
  color: var(--app-info);
}

.station-selection-dialog__pill--warning {
  background: var(--app-warning-soft);
  border-color: var(--app-warning-line);
  color: var(--app-warning);
}

.station-selection-dialog__chevron {
  color: var(--app-muted);
  font-weight: 700;
}

.station-selection-dialog__empty-state {
  padding: 1.5rem 1rem;
  text-align: center;
}

.station-selection-dialog__footer {
  width: 100%;
  grid-auto-flow: column;
  align-items: center;
}

.station-selection-dialog__footer-spacer {
  min-width: 1px;
}

@media (max-width: 700px) {

  .station-selection-dialog__header,
  .station-selection-dialog__footer,
  .station-selection-dialog__station-meta,
  .station-item,
  .station-selection-dialog__search-input {
    grid-template-columns: minmax(0, 1fr);
    grid-auto-flow: row;
  }

  .station-selection-dialog__station-meta {
    justify-content: start;
  }
}
</style>
