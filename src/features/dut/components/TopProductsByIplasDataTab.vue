<template>
    <v-row>
        <!-- Connected Server Indicator -->
        <v-col cols="12">
            <v-alert type="info" variant="tonal" density="compact" class="mb-2">
                Data is sourced directly from iPLAS.
                <span class="text-caption ml-2">
                    Connected to: <strong>{{ selectedServer?.name }}</strong> ({{ selectedServer?.baseIp }})
                    <v-chip v-if="isSystemMode" size="x-small" color="success" variant="tonal" label class="ml-1">
                        System
                    </v-chip>
                    <v-chip v-else size="x-small" color="warning" variant="tonal" label class="ml-1">
                        Custom
                    </v-chip>
                </span>
            </v-alert>
        </v-col>

        <!-- Sub-tabs for different search modes -->
        <v-col cols="12">
            <v-tabs v-model="searchMode" color="secondary" class="mb-4" density="compact">
                <v-tab value="station">
                    <v-icon start>mdi-cog-outline</v-icon>
                    Station Search
                </v-tab>
                <v-tab value="isn">
                    <v-icon start>mdi-barcode-scan</v-icon>
                    ISN Search
                </v-tab>
            </v-tabs>

            <v-window v-model="searchMode">
                <!-- Station Search Mode -->
                <v-window-item value="station" eager>
                    <TopProductIplasStationContent @show-details="handleShowDetails"
                        @show-settings="showSettingsDialog = true" />
                </v-window-item>

                <!-- ISN Search Mode -->
                <v-window-item value="isn" eager>
                    <TopProductIplasIsnContent />
                </v-window-item>
            </v-window>
        </v-col>

        <!-- Test Items Details Dialog -->
        <TopProductIplasDetailsDialog v-model="showDetailsDialog" :record="selectedRecord"
            :downloading="downloadingDetails" @download="handleDownloadFromDialog" />

        <!-- iPLAS Settings Dialog -->
        <TopProductIplasSettingsDialog v-model="showSettingsDialog" />
    </v-row>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useIplasSettings } from '@/features/dut-logs/composables/useIplasSettings'
import { useTabPersistence } from '@/shared/composables/useTabPersistence'
import type { NormalizedRecord } from './IplasTestItemsFullscreenDialog.vue'
import TopProductIplasDetailsDialog from './TopProductIplasDetailsDialog.vue'
import TopProductIplasIsnContent from './TopProductIplasIsnContent.vue'
import TopProductIplasSettingsDialog from './TopProductIplasSettingsDialog.vue'
import TopProductIplasStationContent from './TopProductIplasStationContent.vue'

// Search mode tab - persisted in URL
const searchMode = useTabPersistence<'station' | 'isn'>('subTab', 'station')

// iPLAS Settings
const { selectedServer, isSystemMode } = useIplasSettings()

// Settings dialog
const showSettingsDialog = ref(false)

// Details dialog state
const showDetailsDialog = ref(false)
const selectedRecord = ref<NormalizedRecord | null>(null)
const downloadingDetails = ref(false)

// Handle showing details from child components
function handleShowDetails(record: NormalizedRecord) {
  selectedRecord.value = record
  showDetailsDialog.value = true
}

// Handle download from dialog
async function handleDownloadFromDialog() {
  // This will be handled by the dialog component internally
  // or we can emit to parent for centralized download handling
  downloadingDetails.value = true
  try {
    // Download logic would go here
    // The dialog should emit the necessary data for download
  } finally {
    downloadingDetails.value = false
  }
}
</script>
