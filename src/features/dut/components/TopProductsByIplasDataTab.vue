<template>
    <v-row>
        <!-- iPLAS API Settings Button -->
        <v-col cols="12" class="d-flex justify-end">
            <v-btn variant="outlined" color="secondary" size="small" prepend-icon="mdi-cog"
                @click="showSettingsDialog = true">
                iPLAS Settings
            </v-btn>
        </v-col>

        <!-- Sub-tabs for different search modes -->
        <v-col cols="12">
            <v-tabs v-model="searchMode" color="secondary" class="mb-4" density="compact">
                <v-tab value="station">
                    <v-icon start>mdi-router-wireless</v-icon>
                    Station Search
                </v-tab>
                <v-tab value="station2">
                    <v-icon start>mdi-cog-outline</v-icon>
                    Station Search 2
                </v-tab>
                <v-tab value="isn">
                    <v-icon start>mdi-barcode-scan</v-icon>
                    ISN Search
                </v-tab>
            </v-tabs>

            <v-window v-model="searchMode">
                <!-- Station Search Mode -->
                <v-window-item value="station" eager>
                    <TopProductIplasStationContent 
                        @show-details="handleShowDetails"
                    />
                </v-window-item>

                <!-- Station Search 2 Mode - Custom Configuration -->
                <v-window-item value="station2" eager>
                    <TopProductIplasStationContent2
                        @show-details="handleShowDetails"
                    />
                </v-window-item>

                <!-- ISN Search Mode -->
                <v-window-item value="isn" eager>
                    <TopProductIplasIsnContent
                        @show-details="handleShowDetails"
                    />
                </v-window-item>
            </v-window>
        </v-col>

        <!-- Test Items Details Dialog -->
        <TopProductIplasDetailsDialog
            v-model="showDetailsDialog"
            :record="selectedRecord"
            :downloading="downloadingDetails"
            @download="handleDownloadFromDialog"
        />

        <!-- iPLAS Settings Dialog -->
        <TopProductIplasSettingsDialog v-model="showSettingsDialog" />
    </v-row>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TopProductIplasStationContent from './TopProductIplasStationContent.vue'
import TopProductIplasStationContent2 from './TopProductIplasStationContent2.vue'
import TopProductIplasIsnContent from './TopProductIplasIsnContent.vue'
import TopProductIplasDetailsDialog from './TopProductIplasDetailsDialog.vue'
import TopProductIplasSettingsDialog from './TopProductIplasSettingsDialog.vue'
import type { NormalizedRecord } from './IplasTestItemsFullscreenDialog.vue'

// Search mode tab
const searchMode = ref<'station' | 'station2' | 'isn'>('station')

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
