<template>
  <DefaultLayout>
    <v-container fluid class="py-6">
      <!-- Page Header -->
      <v-row class="mb-4">
        <v-col cols="12">
          <div class="d-flex align-center justify-space-between flex-wrap">
            <div>
              <h1 class="text-h4 font-weight-bold mb-1">iPLAS Data Explorer</h1>
              <p class="text-body-2 text-medium-emphasis">
                Browse sites, projects, stations, and devices from the iPLAS system
              </p>
            </div>
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-refresh"
              :loading="loading"
              @click="handleRefresh"
            >
              Refresh
            </v-btn>
          </div>
        </v-col>
      </v-row>

      <!-- Error Alert -->
      <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = null">
        {{ error }}
      </v-alert>

      <!-- Selection Cards -->
      <v-row>
        <!-- Site/Project Selection -->
        <v-col cols="12" md="4">
          <v-card elevation="2" class="h-100">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" color="primary">mdi-domain</v-icon>
              Site & Project
            </v-card-title>
            <v-card-text>
              <v-select
                v-model="selectedSite"
                :items="uniqueSites"
                label="Select Site"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-map-marker"
                :loading="loading"
                clearable
                class="mb-3"
                @update:model-value="handleSiteChange"
              />

              <v-select
                v-model="selectedProject"
                :items="availableProjects"
                label="Select Project"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-folder"
                :loading="loadingStations"
                :disabled="!selectedSite"
                clearable
                @update:model-value="handleProjectChange"
              />

              <v-alert v-if="selectedSite && selectedProject" type="success" density="compact" class="mt-3">
                <strong>Access Verified</strong> for {{ selectedSite }} / {{ selectedProject }}
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Station Selection -->
        <v-col cols="12" md="4">
          <v-card elevation="2" class="h-100">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" color="success">mdi-access-point</v-icon>
              Test Station
              <v-chip v-if="stations.length" size="small" class="ml-2">{{ stations.length }}</v-chip>
            </v-card-title>
            <v-card-text>
              <v-select
                v-model="selectedStation"
                :items="stationOptions"
                item-title="text"
                item-value="value"
                label="Select Station"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-router-wireless"
                :loading="loadingStations"
                :disabled="!selectedProject"
                clearable
                @update:model-value="handleStationChange"
              />

              <div v-if="selectedStationInfo" class="mt-3">
                <v-chip size="small" color="info" class="mr-1">
                  Order: {{ selectedStationInfo.order }}
                </v-chip>
                <v-chip size="small" color="secondary">
                  {{ selectedStationInfo.data_source }}
                </v-chip>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Time Range Selection -->
        <v-col cols="12" md="4">
          <v-card elevation="2" class="h-100">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" color="warning">mdi-clock-outline</v-icon>
              Time Range
            </v-card-title>
            <v-card-text>
              <v-text-field
                v-model="startTime"
                label="Start Time"
                type="datetime-local"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-calendar-start"
                class="mb-3"
              />

              <v-text-field
                v-model="endTime"
                label="End Time"
                type="datetime-local"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-calendar-end"
              />

              <v-btn
                color="primary"
                variant="tonal"
                block
                class="mt-3"
                :loading="loadingDevices"
                :disabled="!selectedStation || !startTime || !endTime"
                @click="fetchDevices"
              >
                <v-icon start>mdi-magnify</v-icon>
                Search Devices
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Device Results -->
      <v-row v-if="deviceIds.length > 0" class="mt-4">
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="info">mdi-chip</v-icon>
                Devices Found
                <v-chip size="small" color="success" class="ml-2">{{ deviceIds.length }}</v-chip>
              </div>
              <v-btn
                variant="text"
                size="small"
                @click="showAllDevices = !showAllDevices"
              >
                {{ showAllDevices ? 'Show Less' : 'Show All' }}
              </v-btn>
            </v-card-title>
            <v-card-text>
              <v-chip-group>
                <v-chip
                  v-for="deviceId in displayedDevices"
                  :key="deviceId"
                  :color="selectedDeviceId === deviceId ? 'primary' : undefined"
                  variant="outlined"
                  @click="selectedDeviceId = deviceId"
                >
                  {{ deviceId }}
                </v-chip>
              </v-chip-group>

              <v-alert v-if="deviceIds.length > 20 && !showAllDevices" type="info" density="compact" class="mt-3">
                Showing first 20 devices. Click "Show All" to see all {{ deviceIds.length }} devices.
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Test Items Section -->
      <v-row v-if="selectedDeviceId" class="mt-4">
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="purple">mdi-format-list-checks</v-icon>
                Test Items for Device {{ selectedDeviceId }}
              </div>
              <div class="d-flex align-center gap-2">
                <v-select
                  v-model="testStatusFilter"
                  :items="['ALL', 'PASS', 'FAIL']"
                  label="Status"
                  variant="outlined"
                  density="compact"
                  hide-details
                  style="width: 120px"
                />
                <v-btn
                  color="primary"
                  :loading="loadingTestItems"
                  @click="fetchTestItems"
                >
                  <v-icon start>mdi-download</v-icon>
                  Fetch Test Items
                </v-btn>
              </div>
            </v-card-title>
            <v-card-text>
              <!-- Test Items Data Table -->
              <v-data-table
                v-if="testItemData.length > 0"
                :headers="testItemHeaders"
                :items="flattenedTestItems"
                :items-per-page="25"
                density="compact"
                class="elevation-1"
              >
                <template #item.STATUS="{ item }">
                  <v-chip
                    :color="item.STATUS === 'PASS' ? 'success' : 'error'"
                    size="small"
                  >
                    {{ item.STATUS }}
                  </v-chip>
                </template>
              </v-data-table>

              <v-alert v-else-if="!loadingTestItems" type="info" density="compact">
                Click "Fetch Test Items" to load test data for this device.
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Statistics Summary -->
      <v-row v-if="siteProjects.length > 0" class="mt-4">
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-text>
              <v-row>
                <v-col cols="6" sm="3">
                  <div class="text-center">
                    <div class="text-h4 font-weight-bold text-primary">{{ uniqueSites.length }}</div>
                    <div class="text-caption text-medium-emphasis">Sites</div>
                  </div>
                </v-col>
                <v-col cols="6" sm="3">
                  <div class="text-center">
                    <div class="text-h4 font-weight-bold text-success">{{ siteProjects.length }}</div>
                    <div class="text-caption text-medium-emphasis">Projects</div>
                  </div>
                </v-col>
                <v-col cols="6" sm="3">
                  <div class="text-center">
                    <div class="text-h4 font-weight-bold text-warning">{{ stations.length }}</div>
                    <div class="text-caption text-medium-emphasis">Stations</div>
                  </div>
                </v-col>
                <v-col cols="6" sm="3">
                  <div class="text-center">
                    <div class="text-h4 font-weight-bold text-info">{{ deviceIds.length }}</div>
                    <div class="text-caption text-medium-emphasis">Devices</div>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { useIplasApi } from '@/features/dut_logs/composables/useIplasApi'
import type { Station, CsvTestItemData, TestItem } from '@/features/dut_logs/api/iplasApi'

const {
  loading,
  loadingStations,
  loadingDevices,
  loadingTestItems,
  error,
  siteProjects,
  stations,
  deviceIds,
  testItemData,
  uniqueSites,
  projectsBySite,
  fetchSiteProjects,
  fetchStations,
  fetchDeviceIds,
  fetchTestItems: fetchTestItemsApi,
  formatDateForV1Api
} = useIplasApi()

// Selection state
const selectedSite = ref<string | null>(null)
const selectedProject = ref<string | null>(null)
const selectedStation = ref<string | null>(null)
const selectedDeviceId = ref<string | null>(null)

// Time range (default to last 24 hours)
const now = new Date()
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
const startTime = ref(yesterday.toISOString().slice(0, 16))
const endTime = ref(now.toISOString().slice(0, 16))

// Display controls
const showAllDevices = ref(false)
const testStatusFilter = ref<'ALL' | 'PASS' | 'FAIL'>('ALL')

// Computed
const availableProjects = computed(() => {
  if (!selectedSite.value) return []
  return projectsBySite.value[selectedSite.value] || []
})

const stationOptions = computed(() => {
  return stations.value.map((s: Station) => ({
    text: `${s.display_station_name} (${s.station_name})`,
    value: s.display_station_name
  }))
})

const selectedStationInfo = computed(() => {
  if (!selectedStation.value) return null
  return stations.value.find((s: Station) => s.display_station_name === selectedStation.value)
})

const displayedDevices = computed(() => {
  if (showAllDevices.value) return deviceIds.value
  return deviceIds.value.slice(0, 20)
})

const testItemHeaders = [
  { title: 'Test Item', key: 'NAME', sortable: true },
  { title: 'Status', key: 'STATUS', sortable: true },
  { title: 'Value', key: 'VALUE', sortable: true },
  { title: 'UCL', key: 'UCL', sortable: true },
  { title: 'LCL', key: 'LCL', sortable: true },
  { title: 'Cycle', key: 'CYLCE', sortable: true }
]

const flattenedTestItems = computed(() => {
  const items: TestItem[] = []
  testItemData.value.forEach((record: CsvTestItemData) => {
    if (record.TestItem) {
      items.push(...record.TestItem)
    }
  })
  return items
})

// Handlers
function handleSiteChange() {
  selectedProject.value = null
  selectedStation.value = null
  selectedDeviceId.value = null
  stations.value = []
  deviceIds.value = []
  testItemData.value = []
}

async function handleProjectChange() {
  selectedStation.value = null
  selectedDeviceId.value = null
  deviceIds.value = []
  testItemData.value = []
  
  if (selectedSite.value && selectedProject.value) {
    await fetchStations(selectedSite.value, selectedProject.value)
  }
}

function handleStationChange() {
  selectedDeviceId.value = null
  deviceIds.value = []
  testItemData.value = []
}

async function fetchDevices() {
  if (!selectedSite.value || !selectedProject.value || !selectedStation.value) return
  
  const start = new Date(startTime.value).toISOString()
  const end = new Date(endTime.value).toISOString()
  
  await fetchDeviceIds(
    selectedSite.value,
    selectedProject.value,
    selectedStation.value,
    start,
    end
  )
}

async function fetchTestItems() {
  if (!selectedSite.value || !selectedProject.value || !selectedStation.value || !selectedDeviceId.value) return
  
  const stationInfo = selectedStationInfo.value
  if (!stationInfo) return
  
  const begintime = formatDateForV1Api(new Date(startTime.value))
  const endtime = formatDateForV1Api(new Date(endTime.value))
  
  await fetchTestItemsApi(
    selectedSite.value,
    selectedProject.value,
    stationInfo.station_name, // Use actual station name for v1 API
    selectedDeviceId.value,
    begintime,
    endtime,
    testStatusFilter.value
  )
}

async function handleRefresh() {
  await fetchSiteProjects(true)
}

// Initialize
onMounted(async () => {
  await fetchSiteProjects()
})
</script>

<style scoped>
.h-100 {
  height: 100%;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
