<template>
  <v-dialog v-model="internalShow" max-width="900px" persistent>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between bg-primary">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-format-list-checkbox</v-icon>
          Select Stations
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

          <v-list-item
            v-for="station in filteredStations"
            :key="station.value"
            @click="toggleStation(station.value)"
            class="station-item"
          >
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

interface Props {
  show: boolean
  stations: DataExplorerStationOption[]
  selectedStations: string[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'confirm', value: string[]): void
}>()

const internalShow = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value),
})

const searchQuery = ref('')
const localSelectedStations = ref<string[]>([])

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
}

function toggleStation(stationValue: string): void {
  if (localSelectedStations.value.includes(stationValue)) {
    localSelectedStations.value = localSelectedStations.value.filter((value) => value !== stationValue)
    return
  }

  localSelectedStations.value = [...localSelectedStations.value, stationValue]
}

function toggleSelectAllFiltered(): void {
  if (allFilteredSelected.value) {
    const filteredSet = new Set(filteredValues.value)
    localSelectedStations.value = localSelectedStations.value.filter((value) => !filteredSet.has(value))
    return
  }

  const merged = new Set([...localSelectedStations.value, ...filteredValues.value])
  localSelectedStations.value = Array.from(merged)
}

function clearSelection(): void {
  localSelectedStations.value = []
}

function handleConfirm(): void {
  emit('confirm', localSelectedStations.value)
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