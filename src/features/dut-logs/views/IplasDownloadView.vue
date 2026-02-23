<template>
    <DefaultLayout>
        <v-container fluid class="py-6">
            <!-- Page Header -->
            <v-row class="mb-4">
                <v-col cols="12">
                    <div class="d-flex align-center justify-space-between flex-wrap">
                        <div>
                            <h1 class="text-h4 font-weight-bold mb-1">Test Log Downloader</h1>
                            <p class="text-body-2 text-medium-emphasis">
                                Download test log attachments from the iPLAS v1 API
                            </p>
                        </div>
                    </div>
                </v-col>
            </v-row>

            <!-- Error Alert -->
            <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = null">
                {{ error }}
            </v-alert>

            <!-- Success Alert -->
            <v-alert v-if="successMessage" type="success" class="mb-4" closable @click:close="successMessage = null">
                {{ successMessage }}
            </v-alert>

            <!-- Download Form Card -->
            <v-row>
                <v-col cols="12" md="8" lg="6">
                    <v-card elevation="2">
                        <v-card-title class="d-flex align-center">
                            <v-icon class="mr-2" color="primary">mdi-download</v-icon>
                            Download Attachment
                        </v-card-title>

                        <v-card-text>
                            <v-form @submit.prevent="handleDownload">
                                <!-- Site Selection -->
                                <v-select v-model="selectedSite" :items="uniqueSites" label="Site" variant="outlined"
                                    density="comfortable" prepend-inner-icon="mdi-map-marker" :rules="[rules.required]"
                                    class="mb-4" />

                                <!-- Project Selection -->
                                <v-select v-model="selectedProject" :items="availableProjects" label="Project"
                                    variant="outlined" density="comfortable" prepend-inner-icon="mdi-folder"
                                    :disabled="!selectedSite" :rules="[rules.required]" class="mb-4" />

                                <!-- Device ISN -->
                                <v-text-field v-model="deviceIsn" label="Device ISN" variant="outlined"
                                    density="comfortable" prepend-inner-icon="mdi-chip"
                                    placeholder="Enter device ISN (e.g., ABC123456)" :rules="[rules.required]"
                                    hint="Device serial number from iPLAS Explorer" persistent-hint class="mb-4" />

                                <!-- Device ID -->
                                <v-text-field v-model="deviceId" label="Device ID" variant="outlined"
                                    density="comfortable" prepend-inner-icon="mdi-identifier"
                                    placeholder="Enter device ID" :rules="[rules.required]"
                                    hint="Device ID from iPLAS Explorer" persistent-hint class="mb-4" />

                                <!-- Station Name -->
                                <v-text-field v-model="stationName" label="Station Name" variant="outlined"
                                    density="comfortable" prepend-inner-icon="mdi-router-wireless"
                                    placeholder="Enter station name" :rules="[rules.required]"
                                    hint="Station name from iPLAS Explorer" persistent-hint class="mb-4" />

                                <!-- Test Time -->
                                <v-text-field v-model="testTime" label="Test Time" variant="outlined"
                                    density="comfortable" prepend-inner-icon="mdi-clock"
                                    placeholder="YYYY/MM/DD HH:mm:ss" :rules="[rules.required]"
                                    hint="Exact test time from iPLAS Explorer" persistent-hint class="mb-4" />

                                <!-- Download Button -->
                                <v-btn type="submit" color="primary" size="large" :loading="downloading"
                                    :disabled="!selectedSite || !selectedProject || !deviceIsn || !deviceId || !stationName || !testTime"
                                    block>
                                    <v-icon start>mdi-download</v-icon>
                                    Download Attachment
                                </v-btn>
                            </v-form>
                        </v-card-text>
                    </v-card>
                </v-col>

                <!-- Instructions Card -->
                <v-col cols="12" md="4" lg="6">
                    <v-card elevation="1" variant="outlined">
                        <v-card-title class="d-flex align-center">
                            <v-icon class="mr-2" color="info">mdi-information</v-icon>
                            Instructions
                        </v-card-title>

                        <v-card-text>
                            <v-list density="compact">
                                <v-list-item>
                                    <template #prepend>
                                        <v-icon color="success" size="small">mdi-check-circle</v-icon>
                                    </template>
                                    <v-list-item-title>
                                        Use the <strong>iPLAS Explorer</strong> to browse devices
                                    </v-list-item-title>
                                </v-list-item>

                                <v-list-item>
                                    <template #prepend>
                                        <v-icon color="success" size="small">mdi-check-circle</v-icon>
                                    </template>
                                    <v-list-item-title>
                                        Copy the device ISN and test time from results
                                    </v-list-item-title>
                                </v-list-item>

                                <v-list-item>
                                    <template #prepend>
                                        <v-icon color="success" size="small">mdi-check-circle</v-icon>
                                    </template>
                                    <v-list-item-title>
                                        Select site/project and enter ISN + time here
                                    </v-list-item-title>
                                </v-list-item>

                                <v-list-item>
                                    <template #prepend>
                                        <v-icon color="warning" size="small">mdi-alert-circle</v-icon>
                                    </template>
                                    <v-list-item-title>
                                        Large files may take some time to download
                                    </v-list-item-title>
                                </v-list-item>
                            </v-list>

                            <v-divider class="my-3" />

                            <v-btn variant="tonal" color="primary" block :to="{ name: 'IplasExplorer' }">
                                <v-icon start>mdi-compass</v-icon>
                                Open iPLAS Explorer
                            </v-btn>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>

            <!-- Recent Downloads Section -->
            <v-row v-if="recentDownloads.length > 0" class="mt-6">
                <v-col cols="12">
                    <v-card variant="outlined">
                        <v-card-title class="d-flex align-center justify-space-between">
                            <div class="d-flex align-center">
                                <v-icon class="mr-2" color="secondary">mdi-history</v-icon>
                                Recent Downloads
                            </div>
                            <v-btn variant="text" size="small" color="error" @click="clearHistory">
                                Clear History
                            </v-btn>
                        </v-card-title>

                        <v-card-text>
                            <v-list density="compact">
                                <v-list-item v-for="(download, index) in recentDownloads" :key="index">
                                    <template #prepend>
                                        <v-icon :color="download.status === 'success' ? 'success' : 'error'"
                                            size="small">
                                            {{ download.status === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle'
                                            }}
                                        </v-icon>
                                    </template>

                                    <v-list-item-title class="text-body-2">
                                        {{ download.deviceIsn }} @ {{ download.testTime }}
                                    </v-list-item-title>
                                    <v-list-item-subtitle>
                                        {{ download.site }}/{{ download.project }} • {{ download.timestamp }}
                                    </v-list-item-subtitle>

                                    <template #append>
                                        <v-btn icon variant="text" size="small" @click="retryDownload(download)">
                                            <v-icon>mdi-refresh</v-icon>
                                        </v-btn>
                                    </template>
                                </v-list-item>
                            </v-list>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>

            <!-- API Status Card -->
            <v-row class="mt-4">
                <v-col cols="12" md="6">
                    <v-card variant="outlined">
                        <v-card-text class="d-flex align-center">
                            <v-icon :color="apiReachable ? 'success' : 'error'" class="mr-2">
                                {{ apiReachable ? 'mdi-check-network' : 'mdi-network-off' }}
                            </v-icon>
                            <div>
                                <div class="text-subtitle-2">
                                    iPLAS v1 API Status
                                </div>
                                <div class="text-caption text-medium-emphasis">
                                    {{ apiReachable ? 'Connected' : 'Unable to reach API' }}
                                </div>
                            </div>
                            <v-spacer />
                            <v-btn variant="text" size="small" :loading="checkingApi" @click="checkApiStatus">
                                Check Status
                            </v-btn>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </v-container>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { DownloadAttachmentInfo } from '@/features/dut-logs/composables/useIplasApi'
import { useIplasApi } from '@/features/dut-logs/composables/useIplasApi'
import { useIplasSettings } from '@/features/dut-logs/composables/useIplasSettings'

const {
  downloading,
  error,
  downloadAttachments,
  fetchSiteProjects,
  siteProjects,
  uniqueSites,
  projectsBySite,
} = useIplasApi()

// Form state
const selectedSite = ref<string | null>(null)
const selectedProject = ref<string | null>(null)
const deviceIsn = ref('')
const deviceId = ref('')
const stationName = ref('')
const testTime = ref('')
const successMessage = ref<string | null>(null)

// API status
const apiReachable = ref(false)
const checkingApi = ref(false)

// Download history (stored in memory, could be moved to localStorage)
interface DownloadRecord {
  site: string
  project: string
  deviceIsn: string
  deviceId: string
  stationName: string
  testTime: string
  timestamp: string
  status: 'success' | 'error'
}
const recentDownloads = ref<DownloadRecord[]>([])

// Validation rules
const rules = {
  required: (v: string) => !!v || 'This field is required',
}

// Computed available projects
const availableProjects = computed(() => {
  if (!selectedSite.value) return []
  return projectsBySite.value[selectedSite.value] || []
})

// Handle download
async function handleDownload() {
  if (
    !selectedSite.value ||
    !selectedProject.value ||
    !deviceIsn.value ||
    !deviceId.value ||
    !stationName.value ||
    !testTime.value
  )
    return

  error.value = null
  successMessage.value = null

  const attachmentInfo: DownloadAttachmentInfo = {
    isn: deviceIsn.value,
    time: testTime.value,
    deviceid: deviceId.value,
    station: stationName.value,
  }

  try {
    await downloadAttachments(selectedSite.value, selectedProject.value, [attachmentInfo])

    const record: DownloadRecord = {
      site: selectedSite.value,
      project: selectedProject.value,
      deviceIsn: deviceIsn.value,
      deviceId: deviceId.value,
      stationName: stationName.value,
      testTime: testTime.value,
      timestamp: new Date().toLocaleString(),
      status: 'success',
    }

    recentDownloads.value.unshift(record)
    if (recentDownloads.value.length > 10) {
      recentDownloads.value.pop()
    }

    successMessage.value = `Successfully downloaded logs for device: ${deviceIsn.value}`
  } catch {
    const record: DownloadRecord = {
      site: selectedSite.value,
      project: selectedProject.value,
      deviceIsn: deviceIsn.value,
      deviceId: deviceId.value,
      stationName: stationName.value,
      testTime: testTime.value,
      timestamp: new Date().toLocaleString(),
      status: 'error',
    }

    recentDownloads.value.unshift(record)
    if (recentDownloads.value.length > 10) {
      recentDownloads.value.pop()
    }
  }
}

// Retry download
function retryDownload(record: DownloadRecord) {
  selectedSite.value = record.site
  selectedProject.value = record.project
  deviceIsn.value = record.deviceIsn
  deviceId.value = record.deviceId
  stationName.value = record.stationName
  testTime.value = record.testTime
  handleDownload()
}

// Clear history
function clearHistory() {
  recentDownloads.value = []
}

// Check API status
async function checkApiStatus() {
  checkingApi.value = true
  try {
    // Just verify that we can fetch site projects
    await fetchSiteProjects()
    apiReachable.value = siteProjects.value.length > 0
  } catch {
    apiReachable.value = false
  } finally {
    checkingApi.value = false
  }
}

// Initialize
onMounted(async () => {
  checkApiStatus()
  await fetchSiteProjects()

  // UPDATED: Set default site based on connected iPLAS server
  const { selectedServer } = useIplasSettings()
  const serverId = selectedServer.value?.id?.toUpperCase()
  if (serverId && uniqueSites.value.includes(serverId) && !selectedSite.value) {
    selectedSite.value = serverId
  }
})
</script>
