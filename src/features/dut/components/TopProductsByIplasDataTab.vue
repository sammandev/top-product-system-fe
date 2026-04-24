<template>
  <section class="top-products-iplas-shell">
    <div class="top-products-iplas-notice">
      <div>
        <strong>Live iPLAS source</strong>
        <p>
          Data is sourced directly from iPLAS via
          <span class="top-products-iplas-inline-label">{{ selectedServer?.name || 'Unknown server' }}</span>
          ({{ selectedServer?.baseIp || 'No IP configured' }}).
        </p>
      </div>

      <span class="top-products-iplas-badge" :class="isSystemMode ? 'is-system' : 'is-custom'">
        {{ isSystemMode ? 'System' : 'Custom' }}
      </span>
    </div>

    <section class="top-products-iplas-panel">
      <AppTabs v-model="searchMode" :items="tabItems" scrollable>
        <template #panel-station>
          <section class="top-products-iplas-pane">
            <TopProductIplasStationContent
              @show-details="handleShowDetails"
              @show-settings="showSettingsDialog = true"
            />
          </section>
        </template>

        <template #panel-isn>
          <section class="top-products-iplas-pane">
            <TopProductIplasIsnContent />
          </section>
        </template>
      </AppTabs>
    </section>

    <TopProductIplasDetailsDialog
      v-model="showDetailsDialog"
      :record="selectedRecord"
      :downloading="downloadingDetails"
      @download="handleDownloadFromDialog"
    />

    <TopProductIplasSettingsDialog v-model="showSettingsDialog" />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useIplasSettings } from '@/features/dut-logs/composables/useIplasSettings'
import { useTabPersistence } from '@/shared/composables/useTabPersistence'
import AppTabs from '@/shared/ui/tabs/AppTabs.vue'
import type { NormalizedRecord } from './IplasTestItemsFullscreenDialog.vue'
import TopProductIplasDetailsDialog from './TopProductIplasDetailsDialog.vue'
import TopProductIplasIsnContent from './TopProductIplasIsnContent.vue'
import TopProductIplasSettingsDialog from './TopProductIplasSettingsDialog.vue'
import TopProductIplasStationContent from './TopProductIplasStationContent.vue'

const searchMode = useTabPersistence<'station' | 'isn'>('subTab', 'station')
const { selectedServer, isSystemMode } = useIplasSettings()

const tabItems = [
  { value: 'station', label: 'Station Search', icon: 'mdi:cog-outline' },
  { value: 'isn', label: 'ISN Search', icon: 'mdi:barcode-scan' },
]

const showSettingsDialog = ref(false)
const showDetailsDialog = ref(false)
const selectedRecord = ref<NormalizedRecord | null>(null)
const downloadingDetails = ref(false)

function handleShowDetails(record: NormalizedRecord) {
  selectedRecord.value = record
  showDetailsDialog.value = true
}

async function handleDownloadFromDialog() {
  downloadingDetails.value = true

  try {
    // Download handling remains delegated to the existing dialog workflow.
  } finally {
    downloadingDetails.value = false
  }
}
</script>

<style scoped>
.top-products-iplas-shell {
  display: grid;
  gap: 1rem;
}

.top-products-iplas-notice,
.top-products-iplas-panel {
  border: 1px solid #dbe4ee;
  border-radius: 1.25rem;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  box-shadow: 0 16px 36px rgb(15 23 42 / 0.06);
}

.top-products-iplas-notice {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  padding: 1rem 1.15rem;
  background: linear-gradient(135deg, rgb(14 165 233 / 0.08), rgb(15 118 110 / 0.08));
}

.top-products-iplas-notice p {
  margin: 0.35rem 0 0;
  color: #475569;
  line-height: 1.55;
}

.top-products-iplas-inline-label {
  font-weight: 700;
  color: #0f172a;
}

.top-products-iplas-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.top-products-iplas-badge.is-system {
  background: rgb(34 197 94 / 0.12);
  color: #166534;
}

.top-products-iplas-badge.is-custom {
  background: rgb(245 158 11 / 0.14);
  color: #92400e;
}

.top-products-iplas-panel {
  overflow: hidden;
}

.top-products-iplas-panel__header {
  padding: 1.15rem 1.25rem 0;
}

.top-products-iplas-panel__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  letter-spacing: 0;
  text-transform: none;
  color: #0f766e;
  font-weight: 700;
}

.top-products-iplas-panel h2 {
  margin: 0;
  color: #0f172a;
}

.top-products-iplas-pane {
  padding: 1rem 1.1rem 1.1rem;
}

@media (max-width: 720px) {
  .top-products-iplas-notice {
    flex-direction: column;
  }

  .top-products-iplas-pane {
    padding: 0.9rem;
  }
}
</style>