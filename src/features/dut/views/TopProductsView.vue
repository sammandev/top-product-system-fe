<template>
  <DefaultLayout>
    <!-- Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 mb-2">
          <v-icon color="primary" class="mr-2">mdi-trophy</v-icon>
          Top Products Analysis
        </h1>
        <p class="text-medium-emphasis">
          Analyze top performing products by station time window or by DUT ISN across multiple stations.
        </p>
      </div>

      <!-- Export Button (visible when results exist) -->
      <v-btn v-if="hasResults" color="success" prepend-icon="mdi-download" @click="handleExport">
        Export Results
      </v-btn>
    </div>

    <!-- Authentication Warning -->
    <!-- <v-alert v-if="!hasDUTAccess" type="warning" variant="tonal" class="mb-4">
      <template #prepend>
        <v-icon>mdi-alert</v-icon>
      </template>
      <div>
        <div class="font-weight-medium">External Login Required</div>
        <div class="text-caption">
          This feature requires external login access.
        </div>
      </div>
    </v-alert> -->

    <!-- Tab Navigation -->
    <v-tabs v-model="activeTab" class="mb-6">
      <!-- <v-tab value="station">
        <v-icon class="mr-2">mdi-access-point</v-icon>
        By Station
      </v-tab> -->
      <v-tab value="dut-isn">
        <v-icon class="mr-2">mdi-barcode-scan</v-icon>
        By DUT ISN
      </v-tab>
      <v-tab value="iplas-data">
        <v-icon class="mr-2">mdi-database-search</v-icon>
        By iPLAS Data
      </v-tab>
      <v-tab value="upload-log">
        <v-icon class="mr-2">mdi-upload</v-icon>
        By Upload Log
      </v-tab>
    </v-tabs>

    <!-- Error Alert (shared across tabs) -->
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="clearError">
      {{ error }}
    </v-alert>

    <!-- Tab Content -->
    <v-window v-model="activeTab">
      <!-- Tab 1: By Station (Existing) -->
      <v-window-item value="station">
        <TopProductsByStationTab @export="handleExport" />
      </v-window-item>

      <!-- Tab 2: By DUT ISN (New) -->
      <v-window-item value="dut-isn">
        <TopProductsByISNTab />
      </v-window-item>

      <!-- Tab 3: By iPLAS Data -->
      <v-window-item value="iplas-data">
        <TopProductsByIplasDataTab />
      </v-window-item>

      <!-- Tab 4: By Upload Log (New) -->
      <v-window-item value="upload-log">
        <TopProductsByUploadLogTab />
      </v-window-item>
    </v-window>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/store'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import TopProductsByStationTab from '../components/TopProductsByStationTab.vue'
import TopProductsByISNTab from '../components/TopProductsByISNTab.vue'
import TopProductsByIplasDataTab from '../components/TopProductsByIplasDataTab.vue'
import TopProductsByUploadLogTab from '@/features/dut_logs/components/TopProductsByUploadLogTab.vue'

// Stores
const router = useRouter()
const authStore = useAuthStore()

// Tab State
const activeTab = ref('dut-isn') // Changed default from 'station' to 'dut-isn'

// Shared State (minimal - most moved to tab components)
const error = ref<string>('')

// Computed
const hasDUTAccess = computed(() => authStore.hasDUTAccess)
const hasResults = computed(() => false) // TODO: Get from active tab

// Methods
function handleExport() {
  // TODO: Implement export based on active tab
  console.log('Export requested for tab:', activeTab.value)
}

function clearError() {
  error.value = ''
}

function goToLogin() {
  router.push({ path: '/login', query: { redirect: '/dut/top-products' } })
}
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}
</style>
