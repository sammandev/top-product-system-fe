<template>
    <DefaultLayout>
        <!-- Header -->
        <div class="d-flex justify-space-between align-center mb-6">
            <div>
                <h1 class="text-h4 mb-2">
                    <v-icon color="primary" class="mr-2">mdi-database-search</v-icon>
                    Data Explorer
                </h1>
                <p class="text-medium-emphasis">
                    Search and download DUT test data from multiple sources
                </p>
            </div>
            <div v-if="activeTab === 'iplas'">
                <v-btn color="secondary" variant="outlined" prepend-icon="mdi-cog" @click="showSettingsDialog = true">
                    iPLAS Settings
                </v-btn>
            </div>
        </div>

        <!-- Tabs -->
        <v-tabs v-model="activeTab" color="primary" class="mb-4">
            <v-tab value="iplas">
                <v-icon start>mdi-cloud-download</v-icon>
                iPLAS Data
            </v-tab>
            <v-tab value="internal">
                <v-icon start>mdi-database</v-icon>
                Internal Data
            </v-tab>
        </v-tabs>

        <v-window v-model="activeTab">
            <!-- iPLAS Data Tab -->
            <v-window-item value="iplas">
                <!-- Info Alert -->
                <v-alert type="info" variant="tonal" class="mb-4" density="compact">
                    Data is sourced directly from iPLAS but cannot display all test station data at the same time.
                    <span class="text-caption ml-2">
                        Connected to: <strong>{{ selectedServer?.name }}</strong> ({{ selectedServer?.baseIp }})
                    </span>
                </v-alert>

                <!-- iPLAS Data Content - UPDATED: Added show-settings event handler -->
                <IplasDataContent @show-settings="showSettingsDialog = true" />
            </v-window-item>

            <!-- Internal Data Tab -->
            <v-window-item value="internal">
                <!-- Info Alert -->
                <v-alert type="info" variant="tonal" class="mb-4" density="compact">
                    Data has been processed so that it can display all test station data based on the ISN provided.
                    <span class="text-caption font-italic">*Data is not as recent as iPLAS data.</span>
                </v-alert>

                <!-- Internal Data Content -->
                <InternalDataContent />
            </v-window-item>
        </v-window>

        <!-- iPLAS Settings Dialog -->
        <IplasSettingsDialog v-model="showSettingsDialog" />
    </DefaultLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import IplasDataContent from '@/features/dut/components/IplasDataContent.vue'
import InternalDataContent from '@/features/dut/components/InternalDataContent.vue'
import IplasSettingsDialog from '@/features/dut/components/IplasSettingsDialog.vue'
import { useIplasSettings } from '@/features/dut_logs/composables/useIplasSettings'
import { useTabPersistence } from '@/shared/composables/useTabPersistence'

// Active tab state - persisted in URL
const activeTab = useTabPersistence('tab', 'iplas')

// Settings dialog
const showSettingsDialog = ref(false)

// iPLAS Settings
const { selectedServer } = useIplasSettings()
</script>
