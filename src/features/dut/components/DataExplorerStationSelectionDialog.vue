<template>
  <v-dialog v-model="internalShow" max-width="900px" persistent>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between bg-primary">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-format-list-checkbox</v-icon>
          Select &amp; Configure Stations
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" @click="handleClose" />
      </v-card-title>

      <v-card-text class="pa-3">
        <v-text-field
          v-model="searchQuery"
          label="Search Stations"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          placeholder="Search by station name..."
        />
      </v-card-text>

      <v-divider />

      <v-card-text class="pa-0" style="max-height: 500px; overflow-y: auto;">
        <v-list>
          <v-list-item>
            <template #prepend>
              <v-checkbox-btn
                :model-value="allFilteredSelected"
                :indeterminate="someFilteredSelected && !allFilteredSelected"
                @click.stop="toggleSelectAllFiltered"
              />
            </template>
            <v-list-item-title class="font-weight-medium">
              {{ allFilteredSelected ? 'Deselect filtered stations' : 'Select filtered stations' }}
            </v-list-item-title>
            <template #append>
              <v-chip size="small" color="primary" variant="tonal">
                {{ filteredStations.length }} shown
              </v-chip>
            </template>
          </v-list-item>

          <v-divider />

          <template v-for="station in filteredStations" :key="station.value">
            <v-list-item class="station-item" @click="toggleStation(station.value)">
              <template #prepend>
                <v-checkbox-btn
                  :model-value="localSelectedStations.includes(station.value)"
                  @click.stop="toggleStation(station.value)"
                />
              </template>

              <v-list-item-title class="font-weight-medium">
                {{ station.displayName }}
              </v-list-item-title>

              <v-list-item-subtitle>
                {{ station.stationName }}
              </v-list-item-subtitle>
            </v-list-item>

            <!-- Per-station configuration (Device IDs + Test Status) -->
            <div
              v-if="localSelectedStations.includes(station.value)"
              class="px-4 pb-3 pt-1 bg-grey-lighten-5"
              @click.stop
            >
              <v-row dense>
                <v-col cols="12" sm="8">
                  <v-autocomplete
                    v-model="localDeviceIds[station.value]"
                    :items="deviceIdsByStation[station.value] || []"
                    :loading="loadingDeviceIdsByStation[station.value]"
                    label="Device IDs (Empty = ALL)"
                    variant="outlined"
                    density="compact"
                    prepend-inner-icon="mdi-chip"
                    multiple
                    chips
                    closable-chips
                    clearable
                    hide-details
                    placeholder="All Device IDs"
                  >
                    <template #chip="{ props: chipProps, item }">
                      <v-chip v-bind="chipProps" :text="item.value" size="x-small" />
                    </template>
                  </v-autocomplete>
                </v-col>
                <v-col cols="12" sm="4">
                  <v-select
                    v-model="localTestStatus[station.value]"
                    :items="testStatusOptions"
                    label="Test Status"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
              </v-row>
            </div>
          </template>

          <v-list-item v-if="filteredStations.length === 0">
            <v-list-item-title class="text-center text-medium-emphasis">
              No stations found
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-chip v-if="localSelectedStations.length > 0" color="success" variant="tonal">
          {{ localSelectedStations.length }} station(s) selected
        </v-chip>
        <v-spacer />
        <v-btn variant="outlined" @click="clearSelection" :disabled="localSelectedStations.length === 0">
          Clear All
        </v-btn>
        <v-btn color="primary" @click="handleConfirm" :disabled="loading">
          Confirm Selection
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

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
.station-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.station-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>