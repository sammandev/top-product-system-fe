<template>
  <AppDialog
    v-model="internalShow"
    title="Select & Configure Stations"
    description="Pick the stations to include, then optionally narrow device IDs and status per station."
    width="min(96vw, 56rem)"
    persistent
  >
    <div class="station-dialog">
      <label class="station-dialog__field">
        <span>Search Stations</span>
        <div class="station-dialog__search-shell">
          <Icon icon="mdi:magnify" />
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Search by station name..."
          />
          <button
            v-if="searchQuery"
            type="button"
            class="station-dialog__ghost-action"
            @click="searchQuery = ''"
          >
            Clear
          </button>
        </div>
      </label>

      <div class="station-dialog__toolbar">
        <div class="station-dialog__pills">
          <span class="station-dialog__pill station-dialog__pill--cool">{{ filteredStations.length }} shown</span>
          <span v-if="localSelectedStations.length > 0" class="station-dialog__pill station-dialog__pill--success">
            {{ localSelectedStations.length }} selected
          </span>
        </div>

        <button type="button" class="station-dialog__ghost-action" @click="toggleSelectAllFiltered">
          {{ allFilteredSelected ? 'Deselect filtered stations' : someFilteredSelected ? 'Select remaining filtered stations' : 'Select filtered stations' }}
        </button>
      </div>

      <div class="station-dialog__list">
        <article v-for="station in filteredStations" :key="station.value" class="station-dialog__item">
          <label class="station-dialog__item-toggle">
            <input
              type="checkbox"
              :checked="localSelectedStations.includes(station.value)"
              @change="toggleStation(station.value)"
            />

            <div class="station-dialog__item-copy">
              <strong>{{ station.displayName }}</strong>
              <span>{{ station.stationName }}</span>
            </div>
          </label>

          <div v-if="localSelectedStations.includes(station.value)" class="station-dialog__config">
            <div class="station-dialog__config-header">
              <p>Device IDs</p>
              <button
                v-if="(localDeviceIds[station.value] || []).length > 0"
                type="button"
                class="station-dialog__ghost-action"
                @click="clearStationDeviceIds(station.value)"
              >
                Clear devices
              </button>
            </div>

            <div v-if="loadingDeviceIdsByStation[station.value]" class="station-dialog__subtle-state">
              <Icon icon="mdi:loading" class="station-dialog__spin" />
              <span>Loading device IDs...</span>
            </div>
            <div v-else-if="(deviceIdsByStation[station.value] || []).length > 0" class="station-dialog__device-list">
              <button
                v-for="deviceId in deviceIdsByStation[station.value] || []"
                :key="deviceId"
                type="button"
                class="station-dialog__device-chip"
                :class="{ 'station-dialog__device-chip--active': isStationDeviceSelected(station.value, deviceId) }"
                @click="toggleStationDeviceId(station.value, deviceId)"
              >
                <Icon :icon="isStationDeviceSelected(station.value, deviceId) ? 'mdi:checkbox-marked-circle' : 'mdi:checkbox-blank-circle-outline'" />
                <span>{{ deviceId }}</span>
              </button>
            </div>
            <p v-else class="station-dialog__subtle-copy">No device IDs available yet. Empty selection keeps all devices.</p>

            <label class="station-dialog__field station-dialog__field--compact">
              <span>Test Status</span>
              <select v-model="localTestStatus[station.value]">
                <option v-for="status in testStatusOptions" :key="status" :value="status">{{ status }}</option>
              </select>
            </label>
          </div>
        </article>

        <div v-if="filteredStations.length === 0" class="station-dialog__empty-state">
          <Icon icon="mdi:database-search-outline" />
          <p>No stations found.</p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="station-dialog__footer">
        <button type="button" class="station-dialog__ghost-action" @click="handleClose">
          Cancel
        </button>
        <button
          type="button"
          class="station-dialog__ghost-action"
          :disabled="localSelectedStations.length === 0"
          @click="clearSelection"
        >
          Clear All
        </button>
        <button
          type="button"
          class="station-dialog__primary-action"
          :disabled="loading"
          @click="handleConfirm"
        >
          <Icon :icon="loading ? 'mdi:loading' : 'mdi:check-circle-outline'" :class="{ 'station-dialog__spin': loading }" />
          <span>{{ loading ? 'Saving...' : 'Confirm Selection' }}</span>
        </button>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import AppDialog from '@/shared/ui/dialog/AppDialog.vue'

export interface DataExplorerStationOption {
  value: string
  displayName: string
  stationName: string
}

export interface StationSelectionResult {
  stations: string[]
  deviceIds: Record<string, string[]>
  testStatus: Record<string, 'ALL' | 'PASS' | 'FAIL'>
}

interface Props {
  show: boolean
  stations: DataExplorerStationOption[]
  selectedStations: string[]
  deviceIdsByStation?: Record<string, string[]>
  selectedDeviceIds?: Record<string, string[]>
  selectedTestStatus?: Record<string, 'ALL' | 'PASS' | 'FAIL'>
  loadingDeviceIdsByStation?: Record<string, boolean>
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  deviceIdsByStation: () => ({}),
  selectedDeviceIds: () => ({}),
  selectedTestStatus: () => ({}),
  loadingDeviceIdsByStation: () => ({}),
})

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'confirm', value: StationSelectionResult): void
  (e: 'station-toggled', stationValue: string, selected: boolean): void
}>()

const internalShow = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value),
})

const searchQuery = ref('')
const localSelectedStations = ref<string[]>([])
const localDeviceIds = ref<Record<string, string[]>>({})
const localTestStatus = ref<Record<string, 'ALL' | 'PASS' | 'FAIL'>>({})
const testStatusOptions = ['ALL', 'PASS', 'FAIL']

const filteredStations = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) {
    return props.stations
  }

  return props.stations.filter((station) => {
    return (
      station.displayName.toLowerCase().includes(query) ||
      station.stationName.toLowerCase().includes(query)
    )
  })
})

const filteredValues = computed(() => filteredStations.value.map((station) => station.value))

const allFilteredSelected = computed(() => {
  return (
    filteredValues.value.length > 0 &&
    filteredValues.value.every((value) => localSelectedStations.value.includes(value))
  )
})

const someFilteredSelected = computed(() => {
  return filteredValues.value.some((value) => localSelectedStations.value.includes(value))
})

function syncLocalSelection(): void {
  localSelectedStations.value = [...props.selectedStations]
  localDeviceIds.value = { ...props.selectedDeviceIds }
  const ts: Record<string, 'ALL' | 'PASS' | 'FAIL'> = {}
  for (const station of props.selectedStations) {
    ts[station] = props.selectedTestStatus[station] || 'ALL'
  }
  localTestStatus.value = ts
}

function toggleStation(stationValue: string): void {
  if (localSelectedStations.value.includes(stationValue)) {
    localSelectedStations.value = localSelectedStations.value.filter((value) => value !== stationValue)
    delete localDeviceIds.value[stationValue]
    delete localTestStatus.value[stationValue]
    emit('station-toggled', stationValue, false)
    return
  }

  localSelectedStations.value = [...localSelectedStations.value, stationValue]
  if (!localTestStatus.value[stationValue]) {
    localTestStatus.value[stationValue] = 'ALL'
  }
  emit('station-toggled', stationValue, true)
}

function toggleSelectAllFiltered(): void {
  if (allFilteredSelected.value) {
    const filteredSet = new Set(filteredValues.value)
    const removed = localSelectedStations.value.filter((v) => filteredSet.has(v))
    localSelectedStations.value = localSelectedStations.value.filter((value) => !filteredSet.has(value))
    for (const val of removed) emit('station-toggled', val, false)
    return
  }

  const newlyAdded = filteredValues.value.filter((v) => !localSelectedStations.value.includes(v))
  const merged = new Set([...localSelectedStations.value, ...filteredValues.value])
  localSelectedStations.value = Array.from(merged)
  for (const val of newlyAdded) {
    if (!localTestStatus.value[val]) localTestStatus.value[val] = 'ALL'
    emit('station-toggled', val, true)
  }
}

function isStationDeviceSelected(stationValue: string, deviceId: string): boolean {
  return (localDeviceIds.value[stationValue] || []).includes(deviceId)
}

function toggleStationDeviceId(stationValue: string, deviceId: string): void {
  const currentIds = localDeviceIds.value[stationValue] || []
  localDeviceIds.value[stationValue] = currentIds.includes(deviceId)
    ? currentIds.filter((value) => value !== deviceId)
    : [...currentIds, deviceId]
}

function clearStationDeviceIds(stationValue: string): void {
  localDeviceIds.value[stationValue] = []
}

function clearSelection(): void {
  const cleared = [...localSelectedStations.value]
  localSelectedStations.value = []
  localDeviceIds.value = {}
  localTestStatus.value = {}
  for (const val of cleared) emit('station-toggled', val, false)
}

function handleConfirm(): void {
  const deviceIds: Record<string, string[]> = {}
  const testStatus: Record<string, 'ALL' | 'PASS' | 'FAIL'> = {}
  for (const station of localSelectedStations.value) {
    deviceIds[station] = localDeviceIds.value[station] || []
    testStatus[station] = localTestStatus.value[station] || 'ALL'
  }
  emit('confirm', { stations: localSelectedStations.value, deviceIds, testStatus })
  internalShow.value = false
}

function handleClose(): void {
  internalShow.value = false
}

watch(
  () => props.show,
  (show) => {
    if (show) {
      syncLocalSelection()
      return
    }

    searchQuery.value = ''
  },
)

watch(
  () => props.selectedStations,
  () => {
    if (!props.show) {
      syncLocalSelection()
    }
  },
  { deep: true },
)
</script>

<style scoped>
.station-dialog {
  display: grid;
  gap: 1rem;
}

.station-dialog__field {
  display: grid;
  gap: 0.45rem;
}

.station-dialog__field span,
.station-dialog__config-header p {
  margin: 0;
  color: var(--app-ink);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.station-dialog__field input,
.station-dialog__field select {
  min-height: 2.75rem;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: rgba(255, 252, 249, 0.96);
  color: var(--app-ink);
  font: inherit;
}

.station-dialog__field select {
  padding: 0.7rem 0.85rem;
}

.station-dialog__field--compact {
  max-width: 13rem;
}

.station-dialog__search-shell {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.6rem;
  align-items: center;
  padding: 0.3rem 0.35rem 0.3rem 0.85rem;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: rgba(255, 252, 249, 0.96);
}

.station-dialog__search-shell input {
  border: 0;
  background: transparent;
  min-height: 2.2rem;
  padding: 0;
  outline: none;
}

.station-dialog__toolbar,
.station-dialog__footer,
.station-dialog__config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.station-dialog__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.station-dialog__pill {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}

.station-dialog__pill--cool {
  background: rgba(40, 96, 163, 0.12);
  color: #17406a;
}

.station-dialog__pill--success {
  background: rgba(28, 126, 84, 0.12);
  color: #1c7e54;
}

.station-dialog__list {
  display: grid;
  gap: 0.8rem;
  max-height: 31rem;
  overflow-y: auto;
  padding-right: 0.2rem;
}

.station-dialog__item {
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: rgba(255, 252, 249, 0.96);
  overflow: hidden;
}

.station-dialog__item-toggle {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
  padding: 0.9rem 1rem;
  cursor: pointer;
}

.station-dialog__item-toggle input {
  margin-top: 0.2rem;
}

.station-dialog__item-copy {
  display: grid;
  gap: 0.2rem;
}

.station-dialog__item-copy strong {
  color: var(--app-ink);
}

.station-dialog__item-copy span,
.station-dialog__subtle-copy,
.station-dialog__subtle-state {
  color: var(--app-muted);
}

.station-dialog__config {
  display: grid;
  gap: 0.85rem;
  padding: 0 1rem 1rem;
  background: rgba(245, 250, 247, 0.9);
}

.station-dialog__device-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.station-dialog__device-chip,
.station-dialog__ghost-action,
.station-dialog__primary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: rgba(255, 252, 249, 0.96);
  color: var(--app-ink);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
}

.station-dialog__device-chip {
  padding: 0.45rem 0.8rem;
}

.station-dialog__device-chip--active {
  border-color: rgba(20, 88, 71, 0.28);
  background: rgba(20, 88, 71, 0.12);
  color: var(--app-accent);
}

.station-dialog__ghost-action,
.station-dialog__primary-action {
  min-height: 2.7rem;
  padding: 0.7rem 1rem;
}

.station-dialog__primary-action {
  border-color: rgba(20, 88, 71, 0.32);
  background: linear-gradient(135deg, rgba(20, 88, 71, 0.98), rgba(161, 104, 57, 0.92));
  color: #fff;
}

.station-dialog__ghost-action:disabled,
.station-dialog__primary-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.station-dialog__empty-state {
  display: grid;
  justify-items: center;
  gap: 0.45rem;
  padding: 1.5rem 1rem;
  color: var(--app-muted);
  text-align: center;
}

.station-dialog__empty-state p,
.station-dialog__subtle-copy,
.station-dialog__subtle-state {
  margin: 0;
}

.station-dialog__spin {
  animation: station-dialog-spin 0.9s linear infinite;
}

@keyframes station-dialog-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 720px) {
  .station-dialog__toolbar,
  .station-dialog__footer,
  .station-dialog__config-header {
    align-items: stretch;
  }

  .station-dialog__ghost-action,
  .station-dialog__primary-action,
  .station-dialog__field--compact {
    width: 100%;
    max-width: none;
  }
}
</style>