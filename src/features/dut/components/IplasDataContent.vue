<template>
  <div class="iplas-content-shell">
    <AppTabs v-model="searchMode" :items="searchModeItems">
      <template #panel-station>
        <section class="iplas-content-pane">
          <div v-if="error" class="iplas-notice iplas-notice--error">
            <div>
              <strong>iPLAS search error</strong>
              <p>{{ error }}</p>
            </div>
            <button type="button" @click="error = null">Dismiss</button>
          </div>

          <AppPanel
            eyebrow="Selection Controls"
            title="Station Search"
            description="Choose the site, project, time range, and configured stations before pulling iPLAS test data. The heavier result surfaces remain on the legacy internals for now."
            tone="cool"
          >
            <div class="iplas-selection-shell">
              <div class="iplas-selection-shell__toolbar">
                <div class="iplas-selection-shell__summary">
                  <span class="iplas-pill">{{ selectedStations.length }} configured station{{ selectedStations.length === 1 ? '' : 's' }}</span>
                  <span class="iplas-pill iplas-pill--cool">{{ totalDeviceCount }} device candidate{{ totalDeviceCount === 1 ? '' : 's' }}</span>
                  <span class="iplas-pill iplas-pill--warm">{{ useIndexedDbMode ? 'Streaming to disk' : 'In-memory search' }}</span>
                </div>
                <button
                  type="button"
                  class="iplas-button iplas-button--ghost"
                  :disabled="loading"
                  @click="handleRefresh"
                >
                  <Icon :icon="loading ? 'mdi:loading' : 'mdi:refresh'" :class="{ 'iplas-spin': loading }" />
                  <span>{{ loading ? 'Refreshing...' : 'Refresh' }}</span>
                </button>
              </div>

              <div class="iplas-control-grid iplas-control-grid--two">
                <label class="iplas-field">
                  <span>Site</span>
                  <select v-model="selectedSite" :disabled="loading" @change="handleSiteChange">
                    <option :value="null">Select a site</option>
                    <option v-for="site in uniqueSites" :key="site" :value="site">{{ site }}</option>
                  </select>
                </label>

                <label class="iplas-field">
                  <span>Project</span>
                  <select
                    v-model="selectedProject"
                    :disabled="!selectedSite || loadingStations"
                    @change="handleProjectChange"
                  >
                    <option :value="null">Select a project</option>
                    <option v-for="project in availableProjects" :key="project" :value="project">{{ project }}</option>
                  </select>
                </label>
              </div>

              <div class="iplas-control-grid iplas-control-grid--three">
                <label class="iplas-field">
                  <span>Date Range</span>
                  <select v-model="dateRangePreset" @change="applyDateRangePreset(dateRangePreset)">
                    <option v-for="preset in dateRangePresets" :key="preset.value" :value="preset.value">{{ preset.title }}</option>
                  </select>
                </label>

                <label class="iplas-field">
                  <span>Start Time</span>
                  <input v-model="startTime" type="datetime-local">
                </label>

                <label class="iplas-field">
                  <span>End Time</span>
                  <input v-model="endTime" type="datetime-local">
                </label>
              </div>

              <div class="iplas-selection-actions">
                <button
                  type="button"
                  class="iplas-button iplas-button--secondary"
                  :disabled="!selectedProject || loadingStations"
                  @click="openStationSelectionDialog"
                >
                  <Icon icon="mdi:tune-variant" />
                  <span>Configure Stations</span>
                  <strong v-if="selectedStations.length > 0">{{ selectedStations.length }}</strong>
                </button>
                <p>
                  Station and device selection still uses the existing dialog so this slice can focus on the route shell and primary controls.
                </p>
              </div>

              <section class="iplas-summary-panel">
                <div class="iplas-summary-panel__header">
                  <div>
                    <p class="iplas-summary-panel__eyebrow">Configured Stations</p>
                    <h3>Selection summary</h3>
                  </div>
                  <span class="iplas-pill iplas-pill--neutral">{{ configuredStations.length }} active</span>
                </div>

                <div v-if="!selectedProject" class="iplas-empty-state iplas-empty-state--compact">
                  <Icon icon="mdi:folder-search-outline" />
                  <div>
                    <strong>Select a project first</strong>
                    <p>Projects drive the station options and device lookup for iPLAS search.</p>
                  </div>
                </div>

                <div v-else-if="configuredStations.length === 0" class="iplas-empty-state iplas-empty-state--compact">
                  <Icon icon="mdi:router-wireless-off" />
                  <div>
                    <strong>No stations configured yet</strong>
                    <p>Open the station dialog to choose one or more stations before searching.</p>
                  </div>
                </div>

                <div v-else class="iplas-summary-list">
                  <article
                    v-for="configuredStation in configuredStations"
                    :key="configuredStation.stationValue"
                    class="iplas-summary-item"
                  >
                    <div>
                      <h4>{{ configuredStation.displayName }}</h4>
                      <p>{{ configuredStation.deviceSummary }}</p>
                    </div>
                    <div class="iplas-summary-item__actions">
                      <span class="iplas-pill iplas-pill--cool">{{ configuredStation.deviceSummary }}</span>
                      <span v-if="configuredStation.testStatus !== 'ALL'" class="iplas-pill iplas-pill--warm">{{ configuredStation.testStatus }}</span>
                      <button
                        type="button"
                        class="iplas-summary-remove"
                        @click="removeSelectedStation(configuredStation.stationValue)"
                      >
                        <Icon icon="mdi:close" />
                      </button>
                    </div>
                  </article>
                </div>
              </section>

              <section v-if="selectedStations.length > 0" class="iplas-fetch-panel">
                <label class="iplas-toggle-card">
                  <input v-model="useIndexedDbMode" type="checkbox">
                  <div>
                    <span>Stream to Disk</span>
                    <p>Enable IndexedDB streaming for long or high-volume searches. Searches over 7 days are forced to disk automatically.</p>
                  </div>
                </label>

                <div class="iplas-fetch-panel__actions">
                  <button
                    type="button"
                    class="iplas-button iplas-button--primary"
                    :disabled="isStreaming"
                    @click="fetchTestItems"
                  >
                    <Icon :icon="loadingTestItems || isStreaming ? 'mdi:loading' : 'mdi:database-search-outline'" :class="{ 'iplas-spin': loadingTestItems || isStreaming }" />
                    <span>{{ useIndexedDbMode ? 'Stream' : 'Search' }} Test Data</span>
                    <strong>({{ selectedStations.length }} station{{ selectedStations.length > 1 ? 's' : '' }})</strong>
                  </button>

                  <button
                    v-if="isStreaming"
                    type="button"
                    class="iplas-button iplas-button--danger"
                    @click="abortIndexedDbStream"
                  >
                    <Icon icon="mdi:stop-circle-outline" />
                    <span>Stop Stream</span>
                  </button>
                </div>

                <div v-if="loadingTestItems && chunkProgress && !useIndexedDbMode" class="iplas-progress-card">
                  <div class="iplas-progress-card__spinner" />
                  <div>
                    <strong>Fetching chunk {{ chunkProgress.fetched }} of {{ chunkProgress.total }}</strong>
                    <p>Regular mode is loading the current response set into memory.</p>
                  </div>
                </div>

                <div v-if="isStreaming" class="iplas-progress-card iplas-progress-card--success">
                  <div class="iplas-progress-card__spinner" />
                  <div>
                    <strong>Streaming {{ streamStatus.recordsWritten.toLocaleString() }} records to disk</strong>
                    <p>
                      <template v-if="streamStatus.totalEstimated > 0">
                        Estimated total: {{ streamStatus.totalEstimated.toLocaleString() }} records.
                      </template>
                      <template v-else>
                        Total estimate will appear once the stream reports it.
                      </template>
                    </p>
                  </div>
                </div>
              </section>

              <div v-if="autoIndexedDbReason" class="iplas-notice iplas-notice--info">
                <div>
                  <strong>Stream mode was enabled automatically</strong>
                  <p>{{ autoIndexedDbReason }}</p>
                </div>
                <button type="button" @click="autoIndexedDbReason = null">Dismiss</button>
              </div>

              <div v-if="possiblyTruncated && hasRegularModeData" class="iplas-notice iplas-notice--warning">
                <div>
                  <strong>5,000-row upstream limit reached</strong>
                  <p>
                    Results may be incomplete because the upstream iPLAS API caps each response at 5,000 rows. Narrow the date range or keep Stream to Disk enabled for larger searches.
                  </p>
                </div>
              </div>
            </div>
          </AppPanel>

          <!-- Test Items Results (Regular Mode) -->
          <AppPanel
            v-if="!useIndexedDbMode && hasRegularModeData"
            eyebrow="Regular Mode"
            title="Test Results"
            :description="`${regularModeRecordCount} records are loaded in memory. Use station tabs to narrow the current comparison slice before opening the legacy table internals below.`"
            tone="cool"
            split-header
            compact-header
          >
            <template #header-aside>
              <div class="iplas-result-toolbar">
                <span class="iplas-pill iplas-pill--cool">{{ regularModeRecordCount }} records</span>
                <button
                  v-if="selectedRecordIndices.length > 0"
                  type="button"
                  class="iplas-button iplas-button--secondary"
                  :disabled="downloading || downloadingCsv"
                  @click="downloadAllSelectedRecords"
                >
                  <Icon :icon="downloading || downloadingCsv ? 'mdi:loading' : 'mdi:download-multiple'" :class="{ 'iplas-spin': downloading || downloadingCsv }" />
                  <span>Download All Logs ({{ selectedRecordIndices.length }})</span>
                </button>
                <button
                  v-if="selectedRecordIndices.length > 0"
                  type="button"
                  class="iplas-button iplas-button--ghost"
                  :disabled="downloading"
                  @click="downloadSelectedRecords"
                >
                  <Icon :icon="downloading ? 'mdi:loading' : 'mdi:download'" :class="{ 'iplas-spin': downloading }" />
                  <span>Download TXT ({{ selectedRecordIndices.length }})</span>
                </button>
                <button
                  v-if="selectedRecordIndices.length > 0"
                  type="button"
                  class="iplas-button iplas-button--success"
                  :disabled="downloadingCsv"
                  @click="downloadSelectedRecordsCsv"
                >
                  <Icon :icon="downloadingCsv ? 'mdi:loading' : 'mdi:file-delimited'" :class="{ 'iplas-spin': downloadingCsv }" />
                  <span>Download CSV ({{ selectedRecordIndices.length }})</span>
                </button>
              </div>
            </template>

            <AppTabs v-model="activeStationTabKey" :items="regularStationTabItems" scrollable>
              <template v-for="(stationGroup, stationIndex) in groupedByStation" :key="stationGroup.stationName" #[`panel-station-${stationIndex}`]>
                <div class="iplas-result-summary-card">
                  <div>
                    <strong>{{ stationGroup.displayName }}</strong>
                    <p>{{ getFilteredStationRecords(stationGroup).length }} filtered records are ready for download or fullscreen review.</p>
                  </div>
                  <span class="iplas-pill iplas-pill--cool">{{ getFilteredStationRecords(stationGroup).length }} visible</span>
                </div>
              </template>
            </AppTabs>

            <div v-if="currentStationGroup" class="iplas-result-pane">
              <div class="iplas-filter-grid">
                <label class="iplas-field">
                  <span>Search Records</span>
                  <div class="iplas-input-with-icon">
                    <Icon icon="mdi:magnify" />
                    <input
                      :value="recordSearchQueries[currentStationGroup.stationName] || ''"
                      type="text"
                      placeholder="Search ISN, Device ID, Error Code, Error Name..."
                      @input="handleStationSearchInput(currentStationGroup.stationName, $event)"
                    >
                  </div>
                </label>

                <label class="iplas-field">
                  <span>Status</span>
                  <select
                    :value="stationStatusFilters[currentStationGroup.stationName] || 'ALL'"
                    @change="handleStationStatusChange(currentStationGroup.stationName, $event)"
                  >
                    <option value="ALL">All Results</option>
                    <option value="PASS">PASS</option>
                    <option value="FAIL">FAIL</option>
                  </select>
                </label>

                <div class="iplas-field iplas-field--device-filter">
                  <div class="iplas-field__row">
                    <span>Device Filter</span>
                    <button
                      v-if="(selectedFilterDeviceIds[currentStationGroup.stationName] || []).length > 0"
                      type="button"
                      class="iplas-inline-action"
                      @click="clearStationDeviceFilters(currentStationGroup.stationName)"
                    >
                      Clear
                    </button>
                  </div>
                  <div class="iplas-device-filter-shell">
                    <p>
                      {{ (selectedFilterDeviceIds[currentStationGroup.stationName] || []).length }} selected of
                      {{ getUniqueDeviceIdsForStation(currentStationGroup).length }} devices.
                    </p>
                    <div class="iplas-device-filter-list">
                      <button
                        v-for="deviceId in getUniqueDeviceIdsForStation(currentStationGroup)"
                        :key="deviceId"
                        type="button"
                        class="iplas-device-chip"
                        :class="{
                          'iplas-device-chip--active': isStationDeviceSelected(currentStationGroup.stationName, deviceId),
                        }"
                        @click="toggleStationDeviceFilter(currentStationGroup.stationName, deviceId)"
                      >
                        <Icon :icon="isStationDeviceSelected(currentStationGroup.stationName, deviceId) ? 'mdi:checkbox-marked-circle' : 'mdi:checkbox-blank-circle-outline'" />
                        <span>{{ deviceId }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <IplasRecordTable :items="getFilteredStationRecords(currentStationGroup)"
                :total-items="getFilteredStationRecords(currentStationGroup).length" :loading="false"
                :downloading-record="downloadingKey" :downloading-csv-record="downloadingCsvKey" :selectable="true"
                :selected-keys="getSelectedKeysForStation(currentStationGroup.stationName)" :server-side="false"
                @update:selected-keys="handleTableSelectionChange(currentStationGroup.stationName, $event)"
                @row-click="openFullscreen" @download="downloadSingleRecord($event, currentStationGroup.stationName, 0)"
                @download-csv="downloadCsvRecord($event, currentStationGroup.stationName, 0)" />
            </div>
          </AppPanel>

          <!-- IndexedDB Mode Results -->
          <AppPanel
            v-if="useIndexedDbMode && (indexedDbTotalItems > 0 || isStreaming)"
            eyebrow="Disk Mode"
            title="IndexedDB Results"
            :description="`${indexedDbTotalItems.toLocaleString()} records currently live on disk${isStreaming ? ' while the stream is still running' : ''}. Use station tabs to scope the current result view before interacting with the existing paginated table.`"
            tone="success"
            split-header
            compact-header
          >
            <template #header-aside>
              <div class="iplas-result-toolbar">
                <span class="iplas-pill iplas-pill--success">{{ indexedDbTotalItems.toLocaleString() }} on disk</span>
                <span v-if="isStreaming" class="iplas-pill iplas-pill--warm">Streaming in progress</span>
                <button
                  v-if="indexedDbSelectedKeys.length > 0"
                  type="button"
                  class="iplas-button iplas-button--ghost"
                  :disabled="downloading"
                  @click="downloadIndexedDbSelectedRecords"
                >
                  <Icon :icon="downloading ? 'mdi:loading' : 'mdi:download'" :class="{ 'iplas-spin': downloading }" />
                  <span>Download TXT ({{ indexedDbSelectedKeys.length }})</span>
                </button>
                <button
                  v-if="indexedDbSelectedKeys.length > 0"
                  type="button"
                  class="iplas-button iplas-button--success"
                  :disabled="downloadingCsv"
                  @click="downloadIndexedDbSelectedRecordsCsv"
                >
                  <Icon :icon="downloadingCsv ? 'mdi:loading' : 'mdi:file-delimited'" :class="{ 'iplas-spin': downloadingCsv }" />
                  <span>Download CSV ({{ indexedDbSelectedKeys.length }})</span>
                </button>
              </div>
            </template>

            <div v-if="streamStatus.error" class="iplas-notice iplas-notice--error">
              <div>
                <strong>IndexedDB stream error</strong>
                <p>{{ streamStatus.error }}</p>
              </div>
            </div>

            <AppTabs v-if="indexedDbStationList.length > 0 && !isStreaming" v-model="indexedDbActiveStationTabKey" :items="indexedDbTabItems" scrollable>
              <template #panel-all>
                <div class="iplas-result-summary-card">
                  <div>
                    <strong>All Stations</strong>
                    <p>Browse the full disk-backed result set before narrowing to a single station.</p>
                  </div>
                  <span class="iplas-pill iplas-pill--cool">{{ indexedDbTotalItems.toLocaleString() }} rows</span>
                </div>
              </template>
              <template v-for="panel in indexedDbStationPanels" :key="panel.stationName" v-slot:[panel.slotName]>
                <div class="iplas-result-summary-card">
                  <div>
                    <strong>{{ panel.stationName }}</strong>
                    <p>Use the existing server-side table below while the active station filter is applied from the scaffold-era tab shell.</p>
                  </div>
                  <span class="iplas-pill iplas-pill--cool">Station filter active</span>
                </div>
              </template>
            </AppTabs>
            <div v-else class="iplas-result-summary-card">
              <div>
                <strong>{{ isStreaming ? 'Streaming to disk' : 'Disk-backed result view' }}</strong>
                <p>
                  <template v-if="isStreaming">
                    Station sub-tabs will appear after the stream finishes and the station list can be derived from the stored payload.
                  </template>
                  <template v-else>
                    Station sub-tabs will appear once disk-backed rows are available for at least one station.
                  </template>
                </p>
              </div>
            </div>

            <div class="iplas-indexeddb-status-bar">
              <div>
                <strong>{{ indexedDbSelectedKeys.length }} selected row{{ indexedDbSelectedKeys.length === 1 ? '' : 's' }}</strong>
                <p>
                  <template v-if="indexedDbActiveStationTab === 0">
                    The disk-backed table is showing all stations.
                  </template>
                  <template v-else>
                    Active station filter: {{ indexedDbStationList[indexedDbActiveStationTab - 1] || 'Unknown station' }}.
                  </template>
                </p>
              </div>
              <div>
                <strong>{{ isStreaming ? 'Stream in progress' : 'Ready for pagination' }}</strong>
                <p>
                  <template v-if="isStreaming">
                    {{ streamStatus.recordsWritten.toLocaleString() }} records written so far.
                  </template>
                  <template v-else>
                    Existing table pagination internals remain unchanged in this slice.
                  </template>
                </p>
              </div>
            </div>

            <AppDataGrid
              class="iplas-indexeddb-grid"
              :columns="indexedDbGridColumns"
              :rows="indexedDbGridRows"
              data-key="recordKey"
              :loading="indexedDbLoading || isStreaming"
              paginator
              :rows-per-page="indexedDbTableOptions.itemsPerPage"
              :total-records="indexedDbTotalItems"
              lazy
              :selection="indexedDbSelectedRows"
              selection-mode="multiple"
              :show-selection-column="true"
              :sort-field="indexedDbSortField"
              :sort-order="indexedDbSortOrder"
              scroll-height="640px"
              :table-style="{ minWidth: '62rem' }"
              :row-class="indexedDbRowClass"
              @update:selection="handleIndexedDbSelectionChange"
              @page="handleIndexedDbGridPage"
              @sort="handleIndexedDbGridSort"
              @row-click="handleIndexedDbRowClick"
            >
              <template #cell-ISN="{ data }">
                <div class="iplas-indexeddb-inline-cell">
                  <button type="button" class="iplas-indexeddb-icon-button" title="Copy ISN" aria-label="Copy ISN" @click.stop="copyToClipboard(String(data.ISN || ''))">
                    <Icon icon="mdi:content-copy" />
                  </button>
                  <button type="button" class="iplas-indexeddb-copy-value" :title="String(data.ISN || 'No ISN')" @click.stop="copyToClipboard(String(data.ISN || ''))">
                    {{ data.ISN || '-' }}
                  </button>
                </div>
              </template>

              <template #cell-DeviceId="{ data }">
                <button type="button" class="iplas-indexeddb-copy-pill" :title="String(data.DeviceId || 'No Device ID')" @click.stop="copyToClipboard(String(data.DeviceId || ''))">
                  {{ data.DeviceId }}
                </button>
              </template>

              <template #cell-TestEndTime="{ value }">
                {{ value }}
              </template>

              <template #cell-Duration="{ value }">
                <span class="iplas-indexeddb-badge iplas-indexeddb-badge--neutral">
                  {{ value }}
                </span>
              </template>

              <template #cell-TestStatus="{ data }">
                <span class="iplas-indexeddb-badge" :class="data.TestStatus === 'PASS' ? 'iplas-indexeddb-badge--success' : 'iplas-indexeddb-badge--error'">
                  {{ data.TestStatus }}
                </span>
              </template>

              <template #cell-actions="{ data }">
                <div class="iplas-indexeddb-action-cell">
                  <button
                    type="button"
                    class="iplas-indexeddb-action-button"
                    :disabled="downloading"
                    title="Download Test Log"
                    @click.stop="downloadIndexedDbRecord(data.sourceRecord)"
                  >
                    <Icon :icon="downloading ? 'mdi:loading' : 'mdi:download'" :class="{ 'iplas-spin': downloading }" />
                    <span>TXT</span>
                  </button>
                </div>
              </template>

              <template #empty>
                <div v-if="isStreaming" class="iplas-indexeddb-empty-state">
                  <Icon icon="mdi:database-sync-outline" class="iplas-indexeddb-empty-state__icon iplas-spin" />
                  <strong>Streaming data to disk...</strong>
                  <p>{{ streamStatus.recordsWritten.toLocaleString() }} records saved so far.</p>
                </div>
                <div v-else class="iplas-indexeddb-empty-state">
                  <Icon icon="mdi:database-off-outline" class="iplas-indexeddb-empty-state__icon" />
                  <strong>No data in IndexedDB</strong>
                  <p>Start a search with Stream to Disk enabled.</p>
                </div>
              </template>

              <template #loading>
                <div class="iplas-indexeddb-loading-state">
                  <Icon icon="mdi:loading" class="iplas-spin" />
                  <span>{{ isStreaming ? 'Streaming rows from disk...' : 'Loading IndexedDB rows...' }}</span>
                </div>
              </template>
            </AppDataGrid>
          </AppPanel>
        </section>
      </template>

      <template #panel-isn>
        <section class="iplas-content-pane">
          <IplasIsnSearchContent v-if="searchMode === 'isn'" />
        </section>
      </template>
    </AppTabs>

    <DataExplorerStationSelectionDialog v-if="showStationSelectionDialog" v-model:show="showStationSelectionDialog" :stations="stationOptions"
      :selected-stations="selectedStations" :device-ids-by-station="deviceIdsByStation"
      :selected-device-ids="stationDeviceIds" :selected-test-status="stationTestStatus"
      :loading-device-ids-by-station="loadingDevicesByStation" :loading="loadingStations"
      @confirm="handleStationSelectionConfirm" @station-toggled="handleDialogStationToggle" />

    <!-- Test Items Details Dialog -->
    <TopProductIplasDetailsDialog v-if="showFullscreenDialog" v-model="showFullscreenDialog" :record="fullscreenRecord"
      :downloading="fullscreenDownloading" :loading-test-items="loadingFullscreenTestItems"
      @download="downloadFromFullscreen" />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useDebounceFn } from '@vueuse/core'
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import type {
  CsvTestItemData,
  DownloadAttachmentInfo,
  Station,
  TestItem,
} from '@/features/dut-logs/api/iplasApi'
import type { CompactCsvTestItemData } from '@/features/dut-logs/api/iplasProxyApi'
import type { DownloadCsvLogInfo } from '@/features/dut-logs/composables/useIplasApi'
import { useIplasApi } from '@/features/dut-logs/composables/useIplasApi'
import { useIplasLocalData } from '@/features/dut-logs/composables/useIplasLocalData'
import { useIplasSettings } from '@/features/dut-logs/composables/useIplasSettings'
import { useNotification } from '@/shared/composables/useNotification'
import AppDataGrid from '@/shared/ui/data-grid/AppDataGrid.vue'
import AppPanel from '@/shared/ui/panel/AppPanel.vue'
import AppTabs from '@/shared/ui/tabs/AppTabs.vue'
import { adjustIplasDisplayTime } from '@/shared/utils/helpers'
import type { StationSelectionResult } from './DataExplorerStationSelectionDialog.vue'
import type { NormalizedRecord } from './IplasTestItemsFullscreenDialog.vue'

const DataExplorerStationSelectionDialog = defineAsyncComponent(
  () => import('./DataExplorerStationSelectionDialog.vue'),
)
const IplasIsnSearchContent = defineAsyncComponent(() => import('./IplasIsnSearchContent.vue'))
const IplasRecordTable = defineAsyncComponent(() => import('./IplasRecordTable.vue'))
const TopProductIplasDetailsDialog = defineAsyncComponent(
  () => import('./TopProductIplasDetailsDialog.vue'),
)

// UPDATED: Define emits for iPLAS Settings button
const emit = defineEmits<(e: 'show-settings') => void>()

// Station group - now supports both full and compact records
interface StationGroup {
  stationName: string
  displayName: string
  records: (CsvTestItemData | CompactCsvTestItemData)[]
}

// Search mode tab - persisted in URL
import { useTabPersistence } from '@/shared/composables/useTabPersistence'

const searchMode = useTabPersistence<'station' | 'isn'>('subTab', 'station')

const searchModeItems = [
  { value: 'station', label: 'Station Search', icon: 'mdi:router-wireless' },
  { value: 'isn', label: 'ISN Search', icon: 'mdi:barcode-search' },
]

const {
  loading,
  loadingStations,
  loadingTestItems,
  downloading,
  error,
  chunkProgress,
  possiblyTruncated,
  siteProjects,
  stations,
  testItemData,
  compactTestItemData,
  uniqueSites,
  projectsBySite,
  fetchSiteProjects,
  fetchStations,
  fetchDeviceIds,
  fetchTestItemsFull: fetchTestItemsApi,
  fetchTestItemsCompact,
  fetchTestItemsPaginated,
  fetchRecordTestItems,
  downloadAttachments,
  downloadCsvLogs,
  batchDownloadLogs,
  clearTestItemData,
} = useIplasApi()

// Selection state
const selectedSite = ref<string | null>(null)
const selectedProject = ref<string | null>(null)
const selectedStations = ref<string[]>([])
// Per-station device ID selection (key is station value from selectedStations)
const stationDeviceIds = ref<Record<string, string[]>>({})
// Loading state per station
const loadingDevicesByStation = ref<Record<string, boolean>>({})

// Date range preset
const dateRangePreset = ref<string>('current_shift')
const dateRangePresets = [
  { title: 'Current Shift', value: 'current_shift' },
  { title: 'Today', value: 'today' },
  { title: 'Yesterday', value: 'yesterday' },
  { title: 'This Week', value: 'week' },
  { title: 'Last Week', value: 'last_week' },
  { title: 'This Month', value: 'month' },
]

// Device IDs grouped by station
const deviceIdsByStation = ref<Record<string, string[]>>({})
const stationDeviceRequestPromises = ref<Map<string, Promise<string[]>>>(new Map())

// Mode: 'full' loads complete records, 'compact' uses lazy loading for test items
// Compact mode is more memory efficient for large datasets
const useCompactMode = ref(true)

// Computed: Check if there's regular mode data (either testItemData or compactTestItemData)
const hasRegularModeData = computed(() => {
  return testItemData.value.length > 0 || compactTestItemData.value.length > 0
})

// Computed: Get the total count of regular mode records
const regularModeRecordCount = computed(() => {
  return useCompactMode.value && compactTestItemData.value.length > 0
    ? compactTestItemData.value.length
    : testItemData.value.length
})

// IndexedDB Mode: Stream data directly to disk instead of keeping in memory
// This is the most memory-efficient mode for large datasets (10,000+ records)
const useIndexedDbMode = ref(false)
const autoIndexedDbReason = ref<string | null>(null)
const showStationSelectionDialog = ref(false)
const stationTestStatus = ref<Record<string, 'ALL' | 'PASS' | 'FAIL'>>({})

const FORCE_STREAM_RANGE_DAYS = 7
const FORCE_STREAM_RANGE_HOURS = FORCE_STREAM_RANGE_DAYS * 24
const AUTO_INDEXED_DB_LONG_RANGE_HOURS = 12
const AUTO_INDEXED_DB_STATION_HOURS = 24
const AUTO_INDEXED_DB_DEVICE_HOURS = 96

// ============================================================================
// IndexedDB Mode Setup (Stream-to-Disk Architecture)
// ============================================================================

// Initialize the local data composable for IndexedDB table integration
const {
  items: indexedDbItems,
  totalItems: indexedDbTotalItems,
  loading: indexedDbLoading,
  tableOptions: indexedDbTableOptions,
  streamStatus,
  isStreaming,
  streamProgress,
  loadItems: loadIndexedDbItems,
  streamData: streamToIndexedDb,
  abortStream: abortIndexedDbStream,
  updateFilter: updateIndexedDbFilter,
} = useIplasLocalData({
  initialItemsPerPage: 25,
  filterDebounceMs: 300,
})

// Server-side pagination state (for table view mode)
const serverPaginationState = ref<
  Record<
    string,
    {
      page: number
      itemsPerPage: number
      sortBy: string
      sortDesc: boolean
      items: (CsvTestItemData | CompactCsvTestItemData)[]
      totalItems: number
      loading: boolean
    }
  >
>({})

// Local cache for lazy-loaded test items (keyed by ISN_TestStartTime)
const lazyLoadedTestItems = ref<Map<string, TestItem[]>>(new Map())
// Track which records are loading test items
const loadingTestItemsForRecord = ref<Set<string>>(new Set())
// Helper function to format date for datetime-local input
function getLocalTimeString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Get date range based on preset selection
 * Current Shift: 06:50:00 - 20:00:00 (Day) or 20:00:00 - 06:50:00 next day (Night)
 * Today: 00:00:01 - 23:59:59
 * Yesterday: Same as today but yesterday
 * Week: Current week 00:00:01 - 23:59:59
 * Last Week: Monday - Sunday last week
 * Month: Current month
 */
function getDateRangeForPreset(preset: string): { start: Date; end: Date } {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinutes = now.getMinutes()

  switch (preset) {
    case 'current_shift': {
      // Day Shift: 06:50:00 - 20:00:00
      // Night Shift: 20:00:00 - 06:50:00 (next day)
      const isDayShift = currentHour > 6 || (currentHour === 6 && currentMinutes >= 50)
      const isBeforeNightEnd = currentHour < 6 || (currentHour === 6 && currentMinutes < 50)

      if (isDayShift && currentHour < 20) {
        // Currently in day shift
        const start = new Date(now)
        start.setHours(6, 50, 0, 0)
        const end = new Date(now)
        end.setHours(20, 0, 0, 0)
        return { start, end }
      } else if (isBeforeNightEnd) {
        // Currently in night shift (before 06:50 AM)
        const start = new Date(now)
        start.setDate(start.getDate() - 1)
        start.setHours(20, 0, 0, 0)
        const end = new Date(now)
        end.setHours(6, 50, 0, 0)
        return { start, end }
      } else {
        // After 20:00 - start of night shift
        const start = new Date(now)
        start.setHours(20, 0, 0, 0)
        const end = new Date(now)
        end.setDate(end.getDate() + 1)
        end.setHours(6, 50, 0, 0)
        return { start, end }
      }
    }
    case 'today': {
      const start = new Date(now)
      start.setHours(0, 0, 1, 0)
      const end = new Date(now)
      end.setHours(23, 59, 59, 0)
      return { start, end }
    }
    case 'yesterday': {
      const start = new Date(now)
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 1, 0)
      const end = new Date(now)
      end.setDate(end.getDate() - 1)
      end.setHours(23, 59, 59, 0)
      return { start, end }
    }
    case 'week': {
      // Start from Monday of current week
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Sunday is 0, Monday is 1
      const start = new Date(now)
      start.setDate(start.getDate() + diff)
      start.setHours(0, 0, 1, 0)
      const end = new Date(now)
      end.setHours(23, 59, 59, 0)
      return { start, end }
    }
    case 'last_week': {
      // Last Monday to Last Sunday
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const start = new Date(now)
      start.setDate(start.getDate() + diff - 7) // Last Monday
      start.setHours(0, 0, 1, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 6) // Last Sunday
      end.setHours(23, 59, 59, 0)
      return { start, end }
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      start.setHours(0, 0, 1, 0)
      const end = new Date(now)
      end.setHours(23, 59, 59, 0)
      return { start, end }
    }
    default: {
      // Custom - return current values
      return { start: now, end: now }
    }
  }
}

/**
 * Apply selected date range preset
 */
function applyDateRangePreset(preset: string): void {
  const { start, end } = getDateRangeForPreset(preset)
  startTime.value = getLocalTimeString(start)
  endTime.value = getLocalTimeString(end)
}

// Time range - initialize with current shift
const { start: initialStart, end: initialEnd } = getDateRangeForPreset('current_shift')
const startTime = ref(getLocalTimeString(initialStart))
const endTime = ref(getLocalTimeString(initialEnd))

// Per-station status filters (for filtering records within each station tab)
const stationStatusFilters = ref<Record<string, 'ALL' | 'PASS' | 'FAIL'>>({})

// Per-record test item filters (default to 'value') - supports multiple selections
const testItemFilters = ref<Record<string, ('all' | 'value' | 'non-value' | 'bin')[]>>({})
// Per-record test item status filters
const testItemStatusFilters = ref<Record<string, 'ALL' | 'PASS' | 'FAIL'>>({})
// Per-record multi-search terms (array of patterns)
const testItemSearchTerms = ref<Record<string, string[]>>({})

// Record search queries (for searching ISN, Device ID, Error Code, Error Name)
const recordSearchQueries = ref<Record<string, string>>({})
// Debounced search queries for performance
const debouncedRecordSearchQueries = ref<Record<string, string>>({})

// Debounce search query updates (300ms delay)
const updateDebouncedSearch = useDebounceFn((stationName: string, value: string) => {
  debouncedRecordSearchQueries.value = {
    ...debouncedRecordSearchQueries.value,
    [stationName]: value,
  }
}, 300)

function setRecordSearchQuery(stationName: string, value: string | null): void {
  const normalizedValue = value ?? ''
  recordSearchQueries.value[stationName] = normalizedValue
  updateDebouncedSearch(stationName, normalizedValue)
}

const {
  showError: showErrorNotification,
  showInfo: showInfoNotification,
} = useNotification()

// Station tab and device filter controls
const activeStationTab = ref(0)
const selectedFilterDeviceIds = ref<Record<string, string[]>>({})

// Copy to clipboard function
async function copyToClipboard(text: string): Promise<void> {
  if (!text) return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback for older browsers or non-HTTPS contexts
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    showInfoNotification('Copied to clipboard!')
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

function getStationDisplayName(stationValue: string): string {
  const station = stations.value.find((s: Station) => s.display_station_name === stationValue)
  return station?.display_station_name || stationValue
}

function getStationDeviceSummary(stationValue: string): string {
  const selectedDeviceCount = stationDeviceIds.value[stationValue]?.length || 0
  if (selectedDeviceCount === 0) {
    return 'All devices'
  }
  return `${selectedDeviceCount} DeviceId${selectedDeviceCount > 1 ? 's' : ''} selected`
}

const configuredStations = computed<
  Array<{
    stationValue: string
    displayName: string
    deviceSummary: string
    testStatus: 'ALL' | 'PASS' | 'FAIL'
  }>
>(() => {
  return selectedStations.value.map((stationValue: string) => ({
    stationValue,
    displayName: getStationDisplayName(stationValue),
    deviceSummary: getStationDeviceSummary(stationValue),
    testStatus: stationTestStatus.value[stationValue] || 'ALL',
  }))
})

function openStationSelectionDialog(): void {
  if (!selectedProject.value) return
  showStationSelectionDialog.value = true
}

function updateSelectedStations(nextSelectedStations: string[]): void {
  const nextStations = Array.from(new Set(nextSelectedStations))
  const nextStationSet = new Set(nextStations)
  const hasChanged =
    nextStations.length !== selectedStations.value.length ||
    nextStations.some((stationValue) => !selectedStations.value.includes(stationValue))

  selectedStations.value = nextStations
  stationDeviceIds.value = Object.fromEntries(
    Object.entries(stationDeviceIds.value).filter(([stationValue]) => nextStationSet.has(stationValue)),
  )
  deviceIdsByStation.value = Object.fromEntries(
    Object.entries(deviceIdsByStation.value).filter(([stationValue]) => nextStationSet.has(stationValue)),
  )
  loadingDevicesByStation.value = Object.fromEntries(
    Object.entries(loadingDevicesByStation.value).filter(([stationValue]) => nextStationSet.has(stationValue)),
  )
  selectedFilterDeviceIds.value = Object.fromEntries(
    Object.entries(selectedFilterDeviceIds.value).filter(([stationValue]) => nextStationSet.has(stationValue)),
  )
  stationStatusFilters.value = Object.fromEntries(
    Object.entries(stationStatusFilters.value).filter(([stationValue]) => nextStationSet.has(stationValue)),
  )
  recordSearchQueries.value = Object.fromEntries(
    Object.entries(recordSearchQueries.value).filter(([stationValue]) => nextStationSet.has(stationValue)),
  )
  debouncedRecordSearchQueries.value = Object.fromEntries(
    Object.entries(debouncedRecordSearchQueries.value).filter(([stationValue]) => nextStationSet.has(stationValue)),
  )
  stationTestStatus.value = Object.fromEntries(
    Object.entries(stationTestStatus.value).filter(([stationValue]) => nextStationSet.has(stationValue)),
  )

  if (hasChanged) {
    handleStationChange()
  }
}

function handleStationSelectionConfirm(result: StationSelectionResult): void {
  stationDeviceIds.value = result.deviceIds
  stationTestStatus.value = result.testStatus
  updateSelectedStations(result.stations)
  showStationSelectionDialog.value = false
}

async function ensureStationDeviceIdsLoaded(stationValue: string): Promise<string[]> {
  if (!selectedSite.value || !selectedProject.value) {
    return []
  }
  if (deviceIdsByStation.value[stationValue]?.length) {
    return deviceIdsByStation.value[stationValue] || []
  }
  const pendingRequest = stationDeviceRequestPromises.value.get(stationValue)
  if (pendingRequest) {
    return pendingRequest
  }

  loadingDevicesByStation.value[stationValue] = true
  const requestPromise = (async () => {
    const devices = await fetchDeviceIds(
      selectedSite.value,
      selectedProject.value,
      stationValue,
      new Date(startTime.value),
      new Date(endTime.value),
    )
    deviceIdsByStation.value[stationValue] = devices
    return devices
  })()

  stationDeviceRequestPromises.value.set(stationValue, requestPromise)

  try {
    return await requestPromise
  } catch (err) {
    console.error(`Failed to fetch device IDs for ${stationValue}:`, err)
    deviceIdsByStation.value[stationValue] = []
    return []
  } finally {
    stationDeviceRequestPromises.value.delete(stationValue)
    loadingDevicesByStation.value[stationValue] = false
  }
}

function handleDialogStationToggle(stationValue: string, selected: boolean): void {
  if (!selected) return
  void ensureStationDeviceIdsLoaded(stationValue)
}

function removeSelectedStation(stationValue: string): void {
  updateSelectedStations(selectedStations.value.filter((value: string) => value !== stationValue))
}

function formatIndexedDbHours(durationHours: number): string {
  return Number.isInteger(durationHours) ? `${durationHours}` : durationHours.toFixed(1)
}

function getAutoIndexedDbReason(
  resolvedStations: { deviceIds: string[] }[],
  beginTime: Date,
  endTime: Date,
): string | null {
  const durationHours = Math.max((endTime.getTime() - beginTime.getTime()) / 3_600_000, 1)
  const stationCount = Math.max(resolvedStations.length, 1)
  const selectedDeviceCount = resolvedStations.reduce(
    (total, entry) => total + Math.max(entry.deviceIds.length, 1),
    0,
  )
  const includesAllDevices = resolvedStations.some(
    (entry) => entry.deviceIds.length === 0 || entry.deviceIds.includes('ALL'),
  )

  if (durationHours > FORCE_STREAM_RANGE_HOURS) {
    return `Date range exceeds ${FORCE_STREAM_RANGE_DAYS} days (${formatIndexedDbHours(durationHours)} hours). Stream to Disk is required for this search.`
  }

  if (durationHours >= AUTO_INDEXED_DB_LONG_RANGE_HOURS) {
    return `Long date range detected (${formatIndexedDbHours(durationHours)} hours). Stream to Disk was enabled automatically to keep the page responsive.`
  }

  if (stationCount * durationHours >= AUTO_INDEXED_DB_STATION_HOURS) {
    return `${stationCount} stations across ${formatIndexedDbHours(durationHours)} hours can return a large result set. Stream to Disk was enabled automatically.`
  }

  if (selectedDeviceCount * durationHours >= AUTO_INDEXED_DB_DEVICE_HOURS) {
    return `${selectedDeviceCount} device selections across ${formatIndexedDbHours(durationHours)} hours can return a large result set. Stream to Disk was enabled automatically.`
  }

  if (includesAllDevices && stationCount > 1 && durationHours >= 4) {
    return `Multiple stations with all devices selected can exceed the in-memory limit. Stream to Disk was enabled automatically.`
  }

  return null
}

async function refreshIndexedDbPage(resetPage = false): Promise<void> {
  if (resetPage) {
    indexedDbTableOptions.value = {
      ...indexedDbTableOptions.value,
      page: 1,
    }
  }

  await loadIndexedDbItems({
    ...indexedDbTableOptions.value,
  })
}

// Download controls
const selectedRecordKeys = ref<Set<string>>(new Set<string>())
const downloadingKey = ref<string | null>(null)
const downloadingCsvKey = ref<string | null>(null)
const downloadingCsv = ref(false)

// Fullscreen dialog controls
const showFullscreenDialog = ref(false)
const fullscreenRecord = ref<NormalizedRecord | null>(null)
const fullscreenOriginalRecord = ref<CsvTestItemData | null>(null)
const fullscreenDownloading = ref(false)
const loadingFullscreenTestItems = ref(false)

// Computed
const availableProjects = computed(() => {
  if (!selectedSite.value) return []
  return projectsBySite.value[selectedSite.value] || []
})

const stationOptions = computed(() => {
  return [...stations.value]
    .sort((a: Station, b: Station) => a.order - b.order)
    .map((s: Station) => ({
      displayName: s.display_station_name,
      stationName: s.station_name,
      displayText: `${s.display_station_name} - ${s.station_name}`,
      chipText: s.display_station_name,
      value: s.display_station_name,
      order: s.order,
      dataSource: s.data_source,
    }))
})

const totalDeviceCount = computed(() => {
  let count = 0
  for (const deviceList of Object.values(deviceIdsByStation.value) as string[][]) {
    count += deviceList.length
  }
  return count
})

const selectedRecordIndices = computed(() => {
  return Array.from(selectedRecordKeys.value)
})

const activeStationTabKey = computed({
  get: () => `station-${activeStationTab.value}`,
  set: (value: string) => {
    const match = value.match(/^station-(\d+)$/)
    activeStationTab.value = match ? Number(match[1]) : 0
  },
})

const groupedByStation = computed<StationGroup[]>(() => {
  const groups: Record<string, StationGroup> = {}

  // Choose data source based on mode
  const sourceData =
    useCompactMode.value && compactTestItemData.value.length > 0
      ? compactTestItemData.value
      : testItemData.value

  for (const record of sourceData) {
    const stationName = record.station
    if (!groups[stationName]) {
      const stationInfo = stations.value.find((s: Station) => s.station_name === stationName)
      groups[stationName] = {
        stationName,
        displayName: stationInfo?.display_station_name || stationName,
        records: [],
      }
    }
    groups[stationName].records.push(record)
  }

  // Sort records within each group by Test end Time descending (latest first)
  for (const group of Object.values(groups)) {
    group.records.sort((a, b) => {
      const timeA = new Date(a['Test end Time']).getTime()
      const timeB = new Date(b['Test end Time']).getTime()
      return timeB - timeA // Latest first
    })
  }

  return Object.values(groups)
})

const regularStationTabItems = computed(() => {
  return groupedByStation.value.map((stationGroup, index) => ({
    value: `station-${index}`,
    label: stationGroup.displayName,
    icon: 'mdi:router-wireless',
  }))
})

const currentStationGroup = computed(() => {
  return groupedByStation.value[activeStationTab.value] || null
})

// Headers for IndexedDB table - User requested columns:
// Checkbox (via show-select), ISN, Device ID, Test End, Duration, Status, Actions
const indexedDbHeaders = [
  { title: 'ISN', key: 'ISN', sortable: true, width: '180px' },
  { title: 'Device ID', key: 'DeviceId', sortable: true, width: '100px' },
  { title: 'Test End', key: 'TestEndTime', sortable: true, width: '160px' },
  { title: 'Duration', key: 'Duration', sortable: false, width: '90px' },
  { title: 'Status', key: 'TestStatus', sortable: true, width: '90px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '100px' },
]

const indexedDbGridColumns = indexedDbHeaders.map((header) => ({
  header: header.title,
  key: header.key,
  field: header.key,
  sortable: header.sortable,
  style: { width: header.width },
}))

// Selected keys for IndexedDB table (for bulk download)
const indexedDbSelectedKeys = ref<string[]>([])

const indexedDbGridRows = computed(() =>
  indexedDbItems.value.map((item) => ({
    ...item,
    recordKey: getIndexedDbRecordKey(item),
    TestEndTime: item.TestEndTime
      ? adjustIplasDisplayTime(item.TestEndTime, 1)
      : adjustIplasDisplayTime(item.TestStartTime, 1),
    Duration: calculateIndexedDbDuration(item),
    sourceRecord: item,
  })),
)

const indexedDbSelectedRows = computed(() => {
  if (indexedDbSelectedKeys.value.length === 0) {
    return []
  }

  const selectedKeySet = new Set(indexedDbSelectedKeys.value)
  return indexedDbGridRows.value.filter((item) => selectedKeySet.has(String(item.recordKey)))
})

const indexedDbSortField = computed(() => indexedDbTableOptions.value.sortBy[0]?.key)

const indexedDbSortOrder = computed(() => {
  const currentSort = indexedDbTableOptions.value.sortBy[0]
  if (!currentSort) {
    return null
  }

  return currentSort.order === 'desc' ? -1 : 1
})

// Active station tab for IndexedDB results
const indexedDbActiveStationTab = ref(0)

const indexedDbActiveStationTabKey = computed({
  get: () => (indexedDbActiveStationTab.value === 0 ? 'all' : `station-${indexedDbActiveStationTab.value}`),
  set: (value: string) => {
    if (value === 'all') {
      indexedDbActiveStationTab.value = 0
      return
    }

    const match = value.match(/^station-(\d+)$/)
    indexedDbActiveStationTab.value = match ? Number(match[1]) : 0
  },
})

// Get distinct stations from IndexedDB data
const indexedDbStationList = computed(() => {
  const stations = new Set<string>()
  for (const item of indexedDbItems.value) {
    if (item.Station) {
      stations.add(item.Station)
    }
  }
  return Array.from(stations).sort()
})

const indexedDbTabItems = computed(() => {
  return [
    { value: 'all', label: 'All Stations', icon: 'mdi:view-list' },
    ...indexedDbStationList.value.map((stationName, index) => ({
      value: `station-${index + 1}`,
      label: stationName,
      icon: 'mdi:router-wireless',
    })),
  ]
})

const indexedDbStationPanels = computed(() => {
  return indexedDbStationList.value.map((stationName, index) => ({
    stationName,
    slotName: `panel-station-${index + 1}`,
  }))
})

// Calculate duration for IndexedDB records
function calculateIndexedDbDuration(record: (typeof indexedDbItems.value)[0]): string {
  // First try to use pre-calculated TestDuration
  if (record.TestDuration && record.TestDuration > 0) {
    const mins = Math.floor(record.TestDuration / 60)
    const secs = record.TestDuration % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  // Fallback: calculate from TestStartTime and TestEndTime
  const startTime = record.TestStartTime
  const endTime = record.TestEndTime
  if (startTime && endTime) {
    try {
      const start = new Date(startTime).getTime()
      const end = new Date(endTime).getTime()
      const diffSecs = Math.floor((end - start) / 1000)
      if (diffSecs >= 0) {
        const mins = Math.floor(diffSecs / 60)
        const secs = diffSecs % 60
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
      }
    } catch {
      // Ignore parse errors
    }
  }
  return '-'
}

// Get record key for IndexedDB records
function getIndexedDbRecordKey(record: (typeof indexedDbItems.value)[0]): string {
  return record.id || `${record.ISN}_${record.TestStartTime}`
}

// Handle IndexedDB row click to show details dialog
async function handleIndexedDbRowClick(
  event: unknown,
): Promise<void> {
  const item = (event as { data?: (typeof indexedDbItems.value)[0]; sourceRecord?: (typeof indexedDbItems.value)[0] }).data
    ?? (event as { sourceRecord?: (typeof indexedDbItems.value)[0] }).sourceRecord
  if (!item) return

  if (!selectedSite.value || !selectedProject.value) return

  // Get station from record - use Station field for API calls (not TSP)
  // Per iPLAS API docs: "station" is used to make requests, "TSP" is display only
  const station =
    item.Station || (indexedDbStationList.value[indexedDbActiveStationTab.value - 1] ?? '')

  if (!station) {
    console.error('Cannot fetch record test items: station is undefined')
    return
  }

  // Fetch test items for this record
  const testItems = await fetchRecordTestItems(
    selectedSite.value,
    selectedProject.value,
    station,
    item.ISN,
    item.TestStartTime,
    item.DeviceId,
  )

  // Create normalized record for dialog
  const normalizedRecord: NormalizedRecord = {
    isn: item.ISN,
    deviceId: item.DeviceId,
    stationName: item.Station,
    displayStationName: item.Station,
    tsp: item.Station,
    site: item.Site,
    project: item.Project,
    line: item.Slot || '',
    errorCode: item.ErrorCode || '',
    errorName: item.ErrorName || '',
    testStatus: item.TestStatus,
    testStartTime: item.TestStartTime,
    testEndTime: item.TestStartTime, // Will be computed from duration
    testItems: testItems || [],
  }

  fullscreenRecord.value = normalizedRecord
  showFullscreenDialog.value = true
}

function indexedDbRowClass(): string {
  return 'iplas-indexeddb-row'
}

function handleIndexedDbSelectionChange(selection: unknown): void {
  const selectedRows = Array.isArray(selection)
    ? (selection as Array<{ recordKey: string }>).map((row) => row.recordKey)
    : []
  indexedDbSelectedKeys.value = selectedRows
}

async function handleIndexedDbGridPage(event: unknown): Promise<void> {
  const pageEvent = event as { page?: number; rows?: number }
  indexedDbTableOptions.value = {
    ...indexedDbTableOptions.value,
    page: typeof pageEvent.page === 'number' ? pageEvent.page + 1 : indexedDbTableOptions.value.page,
    itemsPerPage:
      typeof pageEvent.rows === 'number' ? pageEvent.rows : indexedDbTableOptions.value.itemsPerPage,
  }

  await loadIndexedDbItems({
    ...indexedDbTableOptions.value,
  })
}

async function handleIndexedDbGridSort(event: unknown): Promise<void> {
  const sortEvent = event as { sortField?: string; sortOrder?: number }
  indexedDbTableOptions.value = {
    ...indexedDbTableOptions.value,
    sortBy:
      sortEvent.sortField && sortEvent.sortOrder
        ? [{ key: sortEvent.sortField, order: sortEvent.sortOrder === -1 ? 'desc' : 'asc' }]
        : [],
  }

  await loadIndexedDbItems({
    ...indexedDbTableOptions.value,
  })
}

// Download selected IndexedDB records
async function downloadIndexedDbSelectedRecords(): Promise<void> {
  if (!selectedSite.value || !selectedProject.value || indexedDbSelectedKeys.value.length === 0)
    return

  try {
    const attachments: DownloadAttachmentInfo[] = []

    for (const item of indexedDbItems.value) {
      const key = getIndexedDbRecordKey(item)
      if (indexedDbSelectedKeys.value.includes(key)) {
        // Use ISN if available, otherwise use DeviceId
        const isn = item.ISN && item.ISN.trim() !== '' ? item.ISN : item.DeviceId
        // Use TestEndTime for download API (required format), fallback to TestStartTime
        const timeField = item.TestEndTime || item.TestStartTime
        attachments.push({
          isn,
          time: formatTimeForDownload(timeField),
          deviceid: item.DeviceId,
          station: item.Station || '',
        })
      }
    }

    if (attachments.length > 0) {
      console.log('Download IndexedDB attachments:', attachments)
      await downloadAttachments(selectedSite.value, selectedProject.value, attachments)
    }
  } catch (err) {
    console.error('Failed to download IndexedDB test logs:', err)
  }
}

// Download selected IndexedDB records as CSV files
async function downloadIndexedDbSelectedRecordsCsv(): Promise<void> {
  if (!selectedSite.value || !selectedProject.value || indexedDbSelectedKeys.value.length === 0)
    return

  downloadingCsv.value = true

  try {
    const csvContents: { content: string; filename: string }[] = []

    for (const item of indexedDbItems.value) {
      const key = getIndexedDbRecordKey(item)
      if (!indexedDbSelectedKeys.value.includes(key)) continue

      // Get station from indexedDbStationList if not available
      // Use Station field for API calls (not TSP) per iPLAS API docs
      const station =
        item.Station || indexedDbStationList.value[indexedDbActiveStationTab.value - 1] || ''

      // Fetch test items
      const testItems = await fetchRecordTestItems(
        selectedSite.value,
        selectedProject.value,
        station,
        item.DeviceId,
        item.TestStartTime,
        item.TestEndTime || item.TestStartTime,
      )

      if (testItems && testItems.length > 0) {
        // Create a mock record for CSV conversion
        const mockRecord: CsvTestItemData = {
          Site: selectedSite.value,
          Project: selectedProject.value,
          station,
          TSP: station,
          Model: '',
          MO: '',
          Line: '',
          ISN: item.ISN || item.DeviceId,
          DeviceId: item.DeviceId,
          'Test Status': item.TestStatus,
          'Test Start Time': item.TestStartTime,
          'Test end Time': item.TestEndTime || item.TestStartTime,
          ErrorCode: item.ErrorCode || '',
          ErrorName: item.ErrorName || '',
          TestItem: testItems,
        }

        const csvContent = convertTestItemsToCsv(mockRecord, testItems)
        const timestamp = item.TestStartTime.replace(/[/:]/g, '_').replace(/ /g, '_')
        const filename = `${item.ISN || item.DeviceId}_${timestamp}_test_items.csv`
        csvContents.push({ content: csvContent, filename })
      }
    }

    // Download all CSVs
    for (const { content, filename } of csvContents) {
      downloadCsvFile(content, filename)
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log(`Downloaded ${csvContents.length} CSV files from IndexedDB`)
  } catch (err) {
    console.error('Failed to download IndexedDB CSV files:', err)
  } finally {
    downloadingCsv.value = false
  }
}

// Download single IndexedDB record
async function downloadIndexedDbRecord(record: (typeof indexedDbItems.value)[0]): Promise<void> {
  if (!selectedSite.value || !selectedProject.value) return

  try {
    const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
    // Use TestEndTime for download API (required format), fallback to TestStartTime
    const timeField = record.TestEndTime || record.TestStartTime
    const attachmentInfo: DownloadAttachmentInfo = {
      isn,
      time: formatTimeForDownload(timeField),
      deviceid: record.DeviceId,
      station: record.Station || '',
    }
    console.log('Download IndexedDB attachment:', attachmentInfo)
    await downloadAttachments(selectedSite.value, selectedProject.value, [attachmentInfo])
  } catch (err) {
    console.error('Failed to download IndexedDB test log:', err)
  }
}

// Helper functions for station sub-tabs and device ID filtering
function getUniqueDeviceIdsForStation(stationGroup: StationGroup): string[] {
  return [...new Set(stationGroup.records.map((r) => r.DeviceId))]
}

function getFilteredStationRecords(
  stationGroup: StationGroup,
): (CsvTestItemData | CompactCsvTestItemData)[] {
  let records = stationGroup.records

  // Apply per-station status filter (ALL/PASS/FAIL)
  const statusFilter = stationStatusFilters.value[stationGroup.stationName] || 'ALL'
  if (statusFilter !== 'ALL') {
    records = records.filter((r) => r['Test Status'] === statusFilter)
  }

  // Apply device ID filter
  const filterIds = selectedFilterDeviceIds.value[stationGroup.stationName]
  if (filterIds && filterIds.length > 0) {
    records = records.filter((r) => filterIds.includes(r.DeviceId))
  }

  // Apply record search filter (debounced for performance)
  const searchQuery = debouncedRecordSearchQueries.value[stationGroup.stationName]
    ?.toLowerCase()
    .trim()
  if (searchQuery) {
    records = records.filter(
      (r) =>
        (r.ISN?.toLowerCase() || '').includes(searchQuery) ||
        (r.DeviceId?.toLowerCase() || '').includes(searchQuery) ||
        (r.ErrorCode?.toLowerCase() || '').includes(searchQuery) ||
        (r.ErrorName?.toLowerCase() || '').includes(searchQuery),
    )
  }

  return records
}

function handleStationSearchInput(stationName: string, event: Event): void {
  const target = event.target as HTMLInputElement | null
  setRecordSearchQuery(stationName, target?.value ?? '')
}

function handleStationStatusChange(stationName: string, event: Event): void {
  const target = event.target as HTMLSelectElement | null
  stationStatusFilters.value[stationName] =
    (target?.value as 'ALL' | 'PASS' | 'FAIL' | undefined) || 'ALL'
}

function isStationDeviceSelected(stationName: string, deviceId: string): boolean {
  return (selectedFilterDeviceIds.value[stationName] || []).includes(deviceId)
}

function toggleStationDeviceFilter(stationName: string, deviceId: string): void {
  const selectedIds = selectedFilterDeviceIds.value[stationName] || []
  const nextSelectedIds = selectedIds.includes(deviceId)
    ? selectedIds.filter((value) => value !== deviceId)
    : [...selectedIds, deviceId]

  selectedFilterDeviceIds.value = {
    ...selectedFilterDeviceIds.value,
    [stationName]: nextSelectedIds,
  }
}

function clearStationDeviceFilters(stationName: string): void {
  selectedFilterDeviceIds.value = {
    ...selectedFilterDeviceIds.value,
    [stationName]: [],
  }
}

/**
 * Generate a unique key for a record (used for caching test items)
 */
function getRecordKey(record: CsvTestItemData | CompactCsvTestItemData): string {
  return `${record.ISN}_${record['Test Start Time']}`
}

/**
 * Check if a record is a compact record (without TestItem array)
 */
function isCompactRecord(
  record: CsvTestItemData | CompactCsvTestItemData,
): record is CompactCsvTestItemData {
  return 'TestItemCount' in record && !('TestItem' in record)
}

/**
 * Get test items for a record - returns from local cache, full record, or undefined if not loaded
 */
function getTestItemsForRecord(
  record: CsvTestItemData | CompactCsvTestItemData,
): TestItem[] | undefined {
  // If it's a full record with TestItem array, return it directly
  if (!isCompactRecord(record) && record.TestItem) {
    return record.TestItem
  }

  // Otherwise check local cache for lazy-loaded items
  const key = getRecordKey(record)
  return lazyLoadedTestItems.value.get(key)
}

// Watch for station selection changes to fetch device IDs
watch(
  selectedStations,
  async (newStations: string[], oldStations: string[]) => {
    // Find newly added stations
    const addedStations = newStations.filter((s: string) => !oldStations.includes(s))
    // Find removed stations
    const removedStations = oldStations.filter((s: string) => !newStations.includes(s))

    // Remove device IDs and selections for removed stations
    for (const station of removedStations) {
      delete deviceIdsByStation.value[station]
      delete stationDeviceIds.value[station]
      delete loadingDevicesByStation.value[station]
      stationDeviceRequestPromises.value.delete(station)
    }

    // Fetch device IDs for newly added stations
    if (selectedSite.value && selectedProject.value && startTime.value && endTime.value) {
      for (const station of addedStations) {
        const devices = await ensureStationDeviceIdsLoaded(station)
        if (!devices.length && !deviceIdsByStation.value[station]) {
          deviceIdsByStation.value[station] = []
        }
        if (!stationDeviceIds.value[station]) {
          stationDeviceIds.value[station] = []
        }
      }
    }
  },
)

// Initialize testItemFilters when records change - ensure 'value' is selected by default
watch(
  groupedByStation,
  (groups: StationGroup[]) => {
    for (const group of groups) {
      const filteredRecords = getFilteredStationRecords(group)
      for (let i = 0; i < filteredRecords.length; i++) {
        const key = `${group.stationName}-${i}`
        // Only set if not already set
        if (testItemFilters.value[key] === undefined) {
          testItemFilters.value[key] = ['value']
        }
      }
    }
  },
  { immediate: true },
)

/**
 * Get selected record keys for a specific station (used by IplasRecordTable)
 */
function getSelectedKeysForStation(stationName: string): string[] {
  const stationGroup = groupedByStation.value.find((g: StationGroup) => g.stationName === stationName)
  if (!stationGroup) return []

  const stationRecordKeys = stationGroup.records.map((r: CsvTestItemData | CompactCsvTestItemData) => `${r.ISN}_${r['Test Start Time']}`)

  return Array.from(selectedRecordKeys.value as Set<string>).filter((key) => stationRecordKeys.includes(key))
}

/**
 * Handle selection changes from IplasRecordTable
 */
function handleTableSelectionChange(stationName: string, newSelectedKeys: string[]): void {
  const stationGroup = groupedByStation.value.find((g: StationGroup) => g.stationName === stationName)
  if (!stationGroup) return

  // Get all record keys for this station
  const stationRecordKeys = new Set(
    stationGroup.records.map((r: CsvTestItemData | CompactCsvTestItemData) => `${r.ISN}_${r['Test Start Time']}`),
  )

  // Remove old selections for this station
  for (const key of selectedRecordKeys.value) {
    if (stationRecordKeys.has(key)) {
      selectedRecordKeys.value.delete(key)
    }
  }

  // Add new selections
  for (const key of newSelectedKeys) {
    selectedRecordKeys.value.add(key)
  }
}

// Fullscreen functions
function normalizeStationRecord(record: CsvTestItemData): NormalizedRecord {
  return {
    isn: record.ISN,
    deviceId: record.DeviceId,
    stationName: record.station,
    displayStationName: record.TSP || record.station,
    tsp: record.TSP,
    site: record.Site,
    project: record.Project,
    line: record.Line,
    errorCode: record.ErrorCode,
    errorName: record.ErrorName,
    testStatus: record['Test Status'],
    testStartTime: record['Test Start Time'],
    testEndTime: record['Test end Time'],
    testItems: record.TestItem || [],
  }
}

async function openFullscreen(record: CsvTestItemData | CompactCsvTestItemData): Promise<void> {
  // Show dialog immediately with loading state for compact records
  showFullscreenDialog.value = true

  // For compact records, we need to fetch test items
  if (isCompactRecord(record)) {
    let testItems = getTestItemsForRecord(record)

    if (!testItems) {
      // Show loading and fetch test items
      loadingFullscreenTestItems.value = true
      fullscreenRecord.value = normalizeStationRecord({
        ...record,
        TestItem: [],
      } as CsvTestItemData)
      fullscreenOriginalRecord.value = null

      try {
        // Fetch test items from server
        if (selectedSite.value && selectedProject.value) {
          // Use station field for API calls (not TSP) per iPLAS API docs
          testItems =
            (await fetchRecordTestItems(
              selectedSite.value,
              selectedProject.value,
              record.station,
              record.ISN || record.DeviceId, // ISN as identifier
              record['Test Start Time'],
              record.DeviceId, // deviceId as last parameter
            )) || []

          // Note: The composable already caches test items internally
        }
      } catch (err) {
        console.error('Failed to fetch test items:', err)
        testItems = []
      } finally {
        loadingFullscreenTestItems.value = false
      }
    }

    // Create a synthetic full record with test items
    const fullRecord: CsvTestItemData = {
      ...record,
      TestItem: testItems || [],
    }
    fullscreenOriginalRecord.value = fullRecord
    fullscreenRecord.value = normalizeStationRecord(fullRecord)
  } else {
    fullscreenOriginalRecord.value = record
    fullscreenRecord.value = normalizeStationRecord(record)
  }
}

async function downloadFromFullscreen(): Promise<void> {
  if (!fullscreenOriginalRecord.value || !selectedSite.value || !selectedProject.value) {
    showErrorNotification('Missing site or project information for download')
    return
  }
  fullscreenDownloading.value = true
  try {
    const attachmentInfo = createAttachmentInfo(fullscreenOriginalRecord.value)
    await downloadAttachments(selectedSite.value, selectedProject.value, [attachmentInfo])
  } catch (err) {
    console.error('Failed to download test log:', err)
    showErrorNotification(err instanceof Error ? err.message : 'Failed to download test log')
  } finally {
    fullscreenDownloading.value = false
  }
}

/**
 * Format time for v1 API download (get_csv_testitem data)
 * Input: "2026-01-05 14:46:14" (from API response - already in local time)
 * Output: "2026/01/05 14:46:14" (required by download API)
 * Note: get_csv_testitem returns local time, so no timezone conversion needed
 */
function formatTimeForDownload(timeStr: string): string {
  if (!timeStr) return ''
  // Replace dashes with slashes for the date part
  // Handle both "YYYY-MM-DD HH:mm:ss" and ISO formats
  return timeStr.replace('T', ' ').replace(/-/g, '/').split('.')[0] || ''
}

function createAttachmentInfo(
  record: CsvTestItemData | CompactCsvTestItemData,
): DownloadAttachmentInfo {
  // Use ISN if available, otherwise use DeviceId
  const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
  // CRITICAL: Use 'Test end Time' for download_attachment API
  const time = formatTimeForDownload(record['Test end Time'])
  const deviceid = record.DeviceId
  // Use TSP as per API documentation - TSP corresponds to display_station_name
  const station = record.TSP || record.station

  return { isn, time, deviceid, station }
}

async function downloadSingleRecord(
  record: CsvTestItemData | CompactCsvTestItemData,
  stationName: string,
  recordIndex: number,
): Promise<void> {
  if (!selectedSite.value || !selectedProject.value) return

  downloadingKey.value = `${stationName}-${recordIndex}`
  try {
    const attachmentInfo = createAttachmentInfo(record)
    console.log('Download attachment info:', attachmentInfo)
    await downloadAttachments(selectedSite.value, selectedProject.value, [attachmentInfo])
  } catch (err) {
    console.error('Failed to download test log:', err)
  } finally {
    downloadingKey.value = null
  }
}

/**
 * Download CSV test log from iPLAS API for a single record
 * UPDATED: Uses the actual iPLAS API endpoint to get official CSV test logs
 */
async function downloadCsvRecord(
  record: CsvTestItemData | CompactCsvTestItemData,
  stationName: string,
  recordIndex: number,
): Promise<void> {
  if (!selectedSite.value || !selectedProject.value) return

  downloadingCsvKey.value = `${stationName}-${recordIndex}`

  try {
    // Format test_end_time with .000 milliseconds as required by iPLAS API
    const testEndTime = record['Test end Time']
    const formattedEndTime = testEndTime.includes('.') ? testEndTime : `${testEndTime}.000`
    // Convert from 2026-01-22 18:57:05 format to 2026/01/22 18:57:05.000 format
    const apiEndTime = formattedEndTime.replace(/-/g, '/')

    await downloadCsvLogs([
      {
        site: selectedSite.value,
        project: selectedProject.value,
        station: record.TSP || record.station || stationName,
        line: record.Line || 'NA',
        model: record.Model || 'ALL',
        deviceid: record.DeviceId,
        isn: record.ISN,
        test_end_time: apiEndTime,
        data_source: 0,
      },
    ])
  } catch (err) {
    console.error('Failed to download CSV:', err)
  } finally {
    downloadingCsvKey.value = null
  }
}

/**
 * Convert test items to CSV format
 */
function convertTestItemsToCsv(
  record: CsvTestItemData | CompactCsvTestItemData,
  testItems: TestItem[],
): string {
  // Header row with record info
  const headerInfo = [
    `# ISN: ${record.ISN}`,
    `# Device ID: ${record.DeviceId}`,
    `# Station: ${record.station || ''}`,
    `# Test Status: ${record['Test Status']}`,
    `# Test Start: ${record['Test Start Time']}`,
    `# Test End: ${record['Test end Time']}`,
    '',
  ].join('\n')

  // CSV header
  const csvHeader = 'NAME,STATUS,VALUE,UCL,LCL,CYCLE'

  // CSV rows
  const csvRows = testItems.map((item) => {
    const name = escapeCSVField(item.NAME || '')
    const status = escapeCSVField(item.STATUS || '')
    const value = escapeCSVField(item.VALUE || '')
    const ucl = escapeCSVField(item.UCL || '')
    const lcl = escapeCSVField(item.LCL || '')
    // Handle CYCLE field from API
    const cycle = escapeCSVField(item.CYCLE || '')
    return `${name},${status},${value},${ucl},${lcl},${cycle}`
  })

  return `${headerInfo + csvHeader}\n${csvRows.join('\n')}`
}

/**
 * Escape CSV field value
 */
function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Download string content as a CSV file
 */
function downloadCsvFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function downloadSelectedRecords(): Promise<void> {
  if (!selectedSite.value || !selectedProject.value || selectedRecordKeys.value.size === 0) return

  // UPDATED: Use batch download for multiple TXT files
  if (selectedRecordKeys.value.size > 1) {
    await downloadSelectedBatch('txt')
    return
  }

  // Single file download - use original method
  try {
    const attachments: DownloadAttachmentInfo[] = []

    // Build a map of recordKey -> record for quick lookup
    const recordMap = new Map<string, CsvTestItemData | CompactCsvTestItemData>()
    for (const group of groupedByStation.value) {
      for (const record of group.records) {
        const recordKey = `${record.ISN}_${record['Test Start Time']}`
        recordMap.set(recordKey, record)
      }
    }

    // Find selected records and create attachment info
    for (const key of selectedRecordKeys.value) {
      const record = recordMap.get(key)
      if (record) {
        attachments.push(createAttachmentInfo(record))
      }
    }

    if (attachments.length > 0) {
      console.log('Download attachments:', attachments)
      await downloadAttachments(selectedSite.value, selectedProject.value, attachments)
    }
  } catch (err) {
    console.error('Failed to download test logs:', err)
  }
}

/**
 * Download all selected records as CSV files (one per record)
 * UPDATED: Uses batch download for multiple files to create proper zip archive
 */
async function downloadSelectedRecordsCsv(): Promise<void> {
  if (!selectedSite.value || !selectedProject.value || selectedRecordKeys.value.size === 0) return

  // UPDATED: Use batch download for multiple CSV files
  if (selectedRecordKeys.value.size > 1) {
    await downloadSelectedBatch('csv')
    return
  }

  // Single file download - use original method
  downloadingCsv.value = true

  try {
    // Build a map of recordKey -> record for quick lookup
    const recordMap = new Map<
      string,
      { record: CsvTestItemData | CompactCsvTestItemData; stationName: string }
    >()
    for (const group of groupedByStation.value) {
      for (const record of group.records) {
        const recordKey = `${record.ISN}_${record['Test Start Time']}`
        recordMap.set(recordKey, { record, stationName: group.stationName })
      }
    }

    // Collect all CSV log info for selected records
    const csvLogInfos: DownloadCsvLogInfo[] = []

    for (const key of selectedRecordKeys.value) {
      const entry = recordMap.get(key)
      if (!entry) continue

      const { record, stationName } = entry

      // Format test_end_time with .000 milliseconds as required by iPLAS API
      const testEndTime = record['Test end Time']
      const formattedEndTime = testEndTime.includes('.') ? testEndTime : `${testEndTime}.000`
      // Convert from 2026-01-22 18:57:05 format to 2026/01/22 18:57:05.000 format
      const apiEndTime = formattedEndTime.replace(/-/g, '/')

      csvLogInfos.push({
        // biome-ignore lint/style/noNonNullAssertion: guarded by early return at function entry
        site: selectedSite.value!,
        // biome-ignore lint/style/noNonNullAssertion: guarded by early return at function entry
        project: selectedProject.value!,
        station: record.TSP || record.station || stationName,
        line: record.Line || 'NA',
        model: record.Model || 'ALL',
        deviceid: record.DeviceId,
        isn: record.ISN,
        test_end_time: apiEndTime,
        data_source: 0,
      })
    }

    if (csvLogInfos.length > 0) {
      console.log(`Downloading ${csvLogInfos.length} CSV logs via iPLAS API`)
      await downloadCsvLogs(csvLogInfos)
    }
  } catch (err) {
    console.error('Failed to download CSV files:', err)
  } finally {
    downloadingCsv.value = false
  }
}

/**
 * Download selected records using batch download API
 * Creates a proper zip archive with organized folder structure
 */
async function downloadSelectedBatch(downloadType: 'txt' | 'csv' | 'all'): Promise<void> {
  if (!selectedSite.value || !selectedProject.value || selectedRecordKeys.value.size === 0) return

  if (downloadType === 'csv') {
    downloadingCsv.value = true
  }

  try {
    // Build a map of recordKey -> record for quick lookup
    const recordMap = new Map<
      string,
      { record: CsvTestItemData | CompactCsvTestItemData; stationName: string }
    >()
    for (const group of groupedByStation.value) {
      for (const record of group.records) {
        const recordKey = `${record.ISN}_${record['Test Start Time']}`
        recordMap.set(recordKey, { record, stationName: group.stationName })
      }
    }

    // Collect all log info for selected records
    const logInfos: DownloadCsvLogInfo[] = []

    for (const key of selectedRecordKeys.value) {
      const entry = recordMap.get(key)
      if (!entry) continue

      const { record, stationName } = entry

      // Format test_end_time with .000 milliseconds as required by iPLAS API
      const testEndTime = record['Test end Time']
      const formattedEndTime = testEndTime.includes('.') ? testEndTime : `${testEndTime}.000`
      // Convert from 2026-01-22 18:57:05 format to 2026/01/22 18:57:05.000 format
      const apiEndTime = formattedEndTime.replace(/-/g, '/')

      logInfos.push({
        // biome-ignore lint/style/noNonNullAssertion: guarded by early return at function entry
        site: selectedSite.value!,
        // biome-ignore lint/style/noNonNullAssertion: guarded by early return at function entry
        project: selectedProject.value!,
        station: record.TSP || record.station || stationName,
        line: record.Line || 'NA',
        model: record.Model || 'ALL',
        deviceid: record.DeviceId,
        isn: record.ISN,
        test_end_time: apiEndTime,
        data_source: 0,
      })
    }

    if (logInfos.length > 0) {
      console.log(`Batch downloading ${logInfos.length} ${downloadType} logs`)
      const response = await batchDownloadLogs(
        selectedSite.value,
        selectedProject.value,
        logInfos,
        downloadType,
      )
      console.log(`Downloaded: ${response.txt_count} TXT + ${response.csv_count} CSV files`)
    }
  } catch (err) {
    console.error(`Failed to batch download ${downloadType} files:`, err)
  } finally {
    downloadingCsv.value = false
  }
}

/**
 * Download all logs (both TXT and CSV) for selected records
 * UPDATED: Uses batch download to create a single zip with both types
 */
async function downloadAllSelectedRecords(): Promise<void> {
  if (!selectedSite.value || !selectedProject.value || selectedRecordKeys.value.size === 0) return

  // UPDATED: Use batch download with 'all' type to get both TXT and CSV in one zip
  await downloadSelectedBatch('all')
}

// Handlers
function handleSiteChange() {
  selectedProject.value = null
  selectedStations.value = []
  showStationSelectionDialog.value = false
  stationDeviceIds.value = {}
  deviceIdsByStation.value = {}
  loadingDevicesByStation.value = {}
  stations.value = []
  clearTestItemData()
  selectedRecordKeys.value.clear()
  stationDeviceRequestPromises.value.clear()
  stationTestStatus.value = {}
}

async function handleProjectChange() {
  selectedStations.value = []
  showStationSelectionDialog.value = false
  stationDeviceIds.value = {}
  deviceIdsByStation.value = {}
  loadingDevicesByStation.value = {}
  stationDeviceRequestPromises.value.clear()
  stationTestStatus.value = {}
  clearTestItemData()
  selectedRecordKeys.value.clear()

  if (selectedSite.value && selectedProject.value) {
    await fetchStations(selectedSite.value, selectedProject.value)
  }
}

function handleStationChange() {
  clearTestItemData()
  selectedRecordKeys.value.clear()
}

async function fetchTestItems() {
  if (!selectedSite.value || !selectedProject.value || selectedStations.value.length === 0) return

  // Pass Date objects - the composable handles ISO format conversion
  const begintime = new Date(startTime.value)
  const endtime = new Date(endTime.value)

  clearTestItemData()
  selectedRecordKeys.value.clear()
  lazyLoadedTestItems.value.clear()
  loadingTestItemsForRecord.value.clear()
  // Clear IndexedDB selection when fetching new data
  indexedDbSelectedKeys.value = []

  // STEP 1: Collect all stations and identify which need device ID fetching
  const stationInfoList: {
    stationInfo: Station
    stationDisplayName: string
    deviceIds: string[]
  }[] = []
  for (const stationDisplayName of selectedStations.value) {
    const stationInfo = stations.value.find(
      (s: Station) => s.display_station_name === stationDisplayName,
    )
    if (!stationInfo) continue
    const deviceIds = stationDeviceIds.value[stationDisplayName] || []
    stationInfoList.push({ stationInfo, stationDisplayName, deviceIds })
  }

  // STEP 2: Fetch device IDs in parallel for stations that don't have them
  const deviceIdPromises = stationInfoList.map(async (entry) => {
    if (entry.deviceIds.length === 0) {
      try {
        entry.deviceIds = await fetchDeviceIds(
          // biome-ignore lint/style/noNonNullAssertion: guarded by early return at function entry
          selectedSite.value!,
          // biome-ignore lint/style/noNonNullAssertion: guarded by early return at function entry
          selectedProject.value!,
          entry.stationInfo.display_station_name,
          begintime,
          endtime,
        )
      } catch (_err) {
        console.warn(
          `Failed to fetch device IDs for ${entry.stationDisplayName}, falling back to ALL`,
        )
        entry.deviceIds = ['ALL']
      }
    }
    return entry
  })
  const resolvedStations = await Promise.all(deviceIdPromises)

  const automaticIndexedDbReason = getAutoIndexedDbReason(resolvedStations, begintime, endtime)
  const useDiskBackedResults = useIndexedDbMode.value || automaticIndexedDbReason !== null

  if (useDiskBackedResults) {
    if (!useIndexedDbMode.value && automaticIndexedDbReason) {
      useIndexedDbMode.value = true
    }

    autoIndexedDbReason.value = automaticIndexedDbReason

    let totalRecords = 0
    const streamPromises: Promise<void>[] = []
    for (const { stationInfo, deviceIds } of resolvedStations) {
      for (const deviceId of deviceIds) {
        streamPromises.push(
          (async () => {
            try {
              const recordCount = await streamToIndexedDb({
                // biome-ignore lint/style/noNonNullAssertion: guarded by early return at function entry
                site: selectedSite.value!,
                // biome-ignore lint/style/noNonNullAssertion: guarded by early return at function entry
                project: selectedProject.value!,
                station: stationInfo.display_station_name,
                deviceId,
                beginTime: begintime,
                endTime: endtime,
                testStatus: stationTestStatus.value[stationInfo.display_station_name] || 'ALL',
              })
              console.log(
                `[IndexedDB] Streamed ${recordCount} records for station ${stationInfo.display_station_name} device ${deviceId}`,
              )
              totalRecords += recordCount
            } catch (err) {
              console.error(
                `[IndexedDB] Stream failed for station ${stationInfo.display_station_name} device ${deviceId}:`,
                err,
              )
              error.value =
                err instanceof Error ? err.message : 'Failed to stream data to IndexedDB'
            }
          })(),
        )
      }
    }
    await Promise.all(streamPromises)

    console.log(
      `[IndexedDB] Total: Streamed ${totalRecords} records from ${selectedStations.value.length} stations`,
    )

    indexedDbActiveStationTab.value = 0
    updateIndexedDbFilter({ station: undefined })
    await refreshIndexedDbPage(true)
    return
  }

  autoIndexedDbReason.value = null

  // =========================================================================
  // Regular Mode: Fetch to memory for bounded result sets only
  // =========================================================================
  const fetchMethod = useCompactMode.value ? fetchTestItemsCompact : fetchTestItemsApi

  // STEP 3: Build list of all station+device combinations and fetch data in parallel
  const fetchPromises: Promise<unknown>[] = []
  for (const { stationInfo, deviceIds } of resolvedStations) {
    for (const deviceId of deviceIds) {
      fetchPromises.push(
        fetchMethod(
          // biome-ignore lint/style/noNonNullAssertion: guarded by early return at function entry
          selectedSite.value!,
          // biome-ignore lint/style/noNonNullAssertion: guarded by early return at function entry
          selectedProject.value!,
          stationInfo.display_station_name,
          deviceId,
          begintime,
          endtime,
          stationTestStatus.value[stationInfo.display_station_name] || 'ALL',
        ),
      )
    }
  }
  await Promise.all(fetchPromises)
}

/**
 * Handle server-side pagination for table view mode.
 * Called when user changes page, sort, or items per page.
 */
async function handleTableOptionsUpdate(
  stationName: string,
  options: { page: number; itemsPerPage: number; sortBy: { key: string; order: 'asc' | 'desc' }[] },
) {
  if (!selectedSite.value || !selectedProject.value) return

  const stationInfo = stations.value.find((s: Station) => s.display_station_name === stationName)
  if (!stationInfo) return

  // Initialize state for this station if needed
  if (!serverPaginationState.value[stationName]) {
    serverPaginationState.value[stationName] = {
      page: 1,
      itemsPerPage: 25,
      sortBy: 'TestStartTime',
      sortDesc: true,
      items: [],
      totalItems: 0,
      loading: false,
    }
  }

  // biome-ignore lint/style/noNonNullAssertion: initialized in the block above
  const state = serverPaginationState.value[stationName]!
  state.loading = true

  // Get sort info
  const sortInfo = options.sortBy[0]
  const sortBy = sortInfo?.key || 'TestStartTime'
  const sortDesc = sortInfo?.order === 'desc'

  // Get device IDs for this station - use filter if set, otherwise ALL
  const filterDeviceIds = selectedFilterDeviceIds.value[stationName]
  let deviceId: string = 'ALL'
  if (filterDeviceIds && filterDeviceIds.length === 1 && filterDeviceIds[0]) {
    // If only one device ID is selected in filter, use it for server-side filtering
    deviceId = filterDeviceIds[0]
  }

  // Get status filter for this station
  const statusFilter = stationStatusFilters.value[stationName] || 'ALL'

  try {
    const result = await fetchTestItemsPaginated(
      selectedSite.value,
      selectedProject.value,
      stationInfo.display_station_name,
      deviceId,
      new Date(startTime.value),
      new Date(endTime.value),
      statusFilter,
      {
        page: options.page,
        itemsPerPage: options.itemsPerPage,
        sortBy,
        sortDesc,
      },
    )

    // Update state
    state.page = result.page
    state.itemsPerPage = result.itemsPerPage
    state.sortBy = sortBy
    state.sortDesc = sortDesc
    state.items = result.items
    state.totalItems = result.totalItems
  } catch (err) {
    console.error('Failed to fetch paginated data:', err)
  } finally {
    state.loading = false
  }
}

/**
 * Initialize server-side pagination for a station (called when switching to table view).
 */
async function initializeServerPagination(stationName: string) {
  await handleTableOptionsUpdate(stationName, {
    page: 1,
    itemsPerPage: 25,
    sortBy: [{ key: 'TestStartTime', order: 'desc' }],
  })
}

async function handleRefresh() {
  await fetchSiteProjects(true)
}

// Watch for station data changes - initialize server pagination
watch(
  groupedByStation,
  async (groups: StationGroup[]) => {
    if (groups.length > 0) {
      // Initialize pagination for the active station tab
      const activeStation = groups[activeStationTab.value]
      if (activeStation && !serverPaginationState.value[activeStation.stationName]) {
        await initializeServerPagination(activeStation.stationName)
      }
    }
  },
  { immediate: true },
)

// UPDATED: Watch for streaming completion to load all items for client-side table
watch(isStreaming, async (streaming: boolean, wasStreaming: boolean) => {
  if (wasStreaming && !streaming && streamStatus.recordsWritten > 0) {
    await refreshIndexedDbPage(true)
  }
})

// Watch for active station tab changes - initialize pagination if needed
watch(activeStationTab, async (newTab: number) => {
  if (groupedByStation.value.length > newTab) {
    const station = groupedByStation.value[newTab]
    if (station && !serverPaginationState.value[station.stationName]) {
      await initializeServerPagination(station.stationName)
    }
  }
})

// Watch for IndexedDB station tab changes - update filter
watch(indexedDbActiveStationTab, async (newTab: number) => {
  if (newTab === 0) {
    // All stations - clear station filter
    updateIndexedDbFilter({ station: undefined })
  } else {
    // Specific station selected
    const stationName = indexedDbStationList.value[newTab - 1]
    if (stationName) {
      updateIndexedDbFilter({ station: stationName })
    }
  }
  await refreshIndexedDbPage(true)
})

// Initialize
onMounted(async () => {
  await fetchSiteProjects()
  await refreshIndexedDbPage(true)

  // UPDATED: Set default site based on connected iPLAS server
  const { selectedServer } = useIplasSettings()
  const serverId = selectedServer.value?.id?.toUpperCase()
  if (serverId && uniqueSites.value.includes(serverId) && !selectedSite.value) {
    selectedSite.value = serverId
  }
})

// Cleanup on unmount to free memory
onUnmounted(() => {
  clearTestItemData()
  lazyLoadedTestItems.value.clear()
  loadingTestItemsForRecord.value.clear()
  recordSearchQueries.value = {}
  debouncedRecordSearchQueries.value = {}
  testItemFilters.value = {}
  testItemStatusFilters.value = {}
  testItemSearchTerms.value = {}
  serverPaginationState.value = {}
  selectedRecordKeys.value.clear()
})
</script>

<style scoped>
.iplas-content-shell,
.iplas-content-pane,
.iplas-selection-shell {
  display: grid;
  gap: 1rem;
}

.iplas-selection-shell__toolbar,
.iplas-selection-shell__summary,
.iplas-selection-actions,
.iplas-result-toolbar,
.iplas-summary-item,
.iplas-summary-item__actions,
.iplas-fetch-panel__actions,
.iplas-notice {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
}

.iplas-control-grid {
  display: grid;
  gap: 1rem;
}

.iplas-filter-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1.2fr) minmax(11rem, 0.5fr) minmax(0, 1.4fr);
}

.iplas-control-grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.iplas-control-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.iplas-field {
  display: grid;
  gap: 0.45rem;
}

.iplas-field--device-filter {
  align-content: start;
}

.iplas-field__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.iplas-field span,
.iplas-summary-panel__eyebrow {
  color: var(--app-ink);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.iplas-field select,
.iplas-field input,
.iplas-button,
.iplas-notice button,
.iplas-summary-remove {
  border-radius: 1rem;
  font: inherit;
}

.iplas-field select,
.iplas-field input {
  width: 100%;
  border: 1px solid rgba(20, 88, 71, 0.18);
  padding: 0.82rem 0.95rem;
  background: rgba(255, 255, 255, 0.92);
  color: var(--app-ink);
}

.iplas-field select:focus,
.iplas-field input:focus {
  outline: none;
  border-color: rgba(20, 88, 71, 0.4);
  box-shadow: 0 0 0 3px rgba(20, 88, 71, 0.12);
}

.iplas-input-with-icon {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.65rem;
  border: 1px solid rgba(20, 88, 71, 0.18);
  border-radius: 1rem;
  padding: 0 0.95rem;
  background: rgba(255, 255, 255, 0.92);
}

.iplas-input-with-icon svg {
  color: var(--app-muted);
}

.iplas-input-with-icon input {
  border: 0;
  padding-left: 0;
  padding-right: 0;
  background: transparent;
}

.iplas-input-with-icon:focus-within {
  border-color: rgba(20, 88, 71, 0.4);
  box-shadow: 0 0 0 3px rgba(20, 88, 71, 0.12);
}

.iplas-button,
.iplas-notice button,
.iplas-summary-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px solid transparent;
  padding: 0.82rem 1rem;
  font-weight: 700;
  cursor: pointer;
}

.iplas-button:disabled,
.iplas-notice button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.iplas-button--primary {
  background: linear-gradient(135deg, #145847, #1c7c62);
  color: #fff;
}

.iplas-button--secondary {
  background: rgba(36, 116, 184, 0.12);
  color: #1d4f91;
}

.iplas-button--ghost,
.iplas-notice button,
.iplas-summary-remove {
  background: rgba(255, 248, 240, 0.84);
  border-color: rgba(20, 88, 71, 0.16);
  color: var(--app-ink);
}

.iplas-button--danger {
  background: rgba(180, 54, 45, 0.14);
  color: #a61b1b;
}

.iplas-button--success {
  background: rgba(20, 88, 71, 0.14);
  color: #145847;
}

.iplas-inline-action {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--app-accent);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.iplas-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(20, 88, 71, 0.12);
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  background: rgba(255, 248, 240, 0.84);
  color: var(--app-ink);
  font-size: 0.82rem;
  font-weight: 700;
}

.iplas-pill--cool {
  background: rgba(36, 116, 184, 0.12);
  color: #1d4f91;
}

.iplas-pill--warm {
  background: rgba(184, 122, 40, 0.14);
  color: #9a5a12;
}

.iplas-pill--neutral {
  background: rgba(20, 88, 71, 0.08);
  color: #145847;
}

.iplas-selection-actions {
  align-items: flex-start;
}

.iplas-selection-actions p,
.iplas-summary-item p,
.iplas-toggle-card p,
.iplas-progress-card p,
.iplas-notice p,
.iplas-empty-state p {
  margin: 0.35rem 0 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.iplas-summary-panel,
.iplas-fetch-panel,
.iplas-result-pane,
.iplas-progress-card,
.iplas-empty-state,
.iplas-result-summary-card {
  display: grid;
  gap: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 1.25rem;
  padding: 1rem 1.1rem;
  background: rgba(255, 251, 247, 0.94);
}

.iplas-summary-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.iplas-summary-panel h3,
.iplas-summary-item h4 {
  margin: 0;
  color: var(--app-ink);
}

.iplas-summary-list {
  display: grid;
  gap: 0.75rem;
}

.iplas-result-toolbar {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.iplas-result-summary-card {
  grid-template-columns: 1fr auto;
  align-items: center;
  background: linear-gradient(180deg, rgba(20, 88, 71, 0.06), rgba(255, 255, 255, 0.92));
}

.iplas-result-summary-card strong {
  color: var(--app-ink);
}

.iplas-device-filter-shell,
.iplas-indexeddb-status-bar {
  display: grid;
  gap: 0.85rem;
  border: 1px solid rgba(20, 88, 71, 0.12);
  border-radius: 1rem;
  padding: 0.9rem 1rem;
  background: rgba(255, 255, 255, 0.82);
}

.iplas-device-filter-shell p,
.iplas-indexeddb-status-bar p {
  margin: 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.iplas-device-filter-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.iplas-device-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid rgba(20, 88, 71, 0.12);
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  background: rgba(255, 248, 240, 0.84);
  color: var(--app-ink);
  font: inherit;
  cursor: pointer;
}

.iplas-device-chip--active {
  border-color: rgba(20, 88, 71, 0.28);
  background: rgba(20, 88, 71, 0.12);
  color: #145847;
}

.iplas-indexeddb-status-bar {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  background: linear-gradient(180deg, rgba(20, 88, 71, 0.06), rgba(255, 255, 255, 0.94));
}

.iplas-indexeddb-status-bar strong {
  color: var(--app-ink);
}

.iplas-summary-item {
  border: 1px solid rgba(20, 88, 71, 0.12);
  border-radius: 1rem;
  padding: 0.9rem 1rem;
  background: rgba(255, 255, 255, 0.82);
}

.iplas-summary-remove {
  width: 2.3rem;
  height: 2.3rem;
  padding: 0;
  border-radius: 999px;
}

.iplas-toggle-card {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
  border: 1px solid rgba(20, 88, 71, 0.12);
  border-radius: 1rem;
  padding: 0.9rem 1rem;
  background: rgba(20, 88, 71, 0.05);
}

.iplas-toggle-card input {
  width: 1rem;
  height: 1rem;
  margin-top: 0.2rem;
}

.iplas-toggle-card span {
  display: block;
  color: var(--app-ink);
  font-weight: 700;
}

.iplas-progress-card {
  grid-template-columns: auto 1fr;
  align-items: center;
}

.iplas-progress-card strong,
.iplas-empty-state strong,
.iplas-notice strong {
  color: var(--app-ink);
}

.iplas-progress-card--success {
  background: rgba(240, 253, 244, 0.9);
}

.iplas-progress-card__spinner {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 3px solid rgba(20, 88, 71, 0.14);
  border-top-color: #145847;
  animation: iplas-spin 0.9s linear infinite;
}

.iplas-notice {
  border-radius: 1.2rem;
  padding: 1rem 1.1rem;
}

.iplas-notice--error {
  border: 1px solid rgba(180, 54, 45, 0.18);
  background: rgba(254, 242, 242, 0.92);
}

.iplas-notice--info {
  border: 1px solid rgba(36, 116, 184, 0.18);
  background: rgba(240, 249, 255, 0.92);
}

.iplas-notice--warning {
  border: 1px solid rgba(184, 122, 40, 0.18);
  background: rgba(255, 247, 237, 0.92);
}

.iplas-empty-state {
  grid-template-columns: auto 1fr;
  align-items: center;
}

.iplas-empty-state svg {
  font-size: 1.8rem;
  color: rgba(20, 88, 71, 0.45);
}

.iplas-empty-state--compact {
  min-height: auto;
}

.iplas-spin {
  animation: iplas-spin 1s linear infinite;
}

.w-100 {
  width: 100%;
}

.gap-2 {
  gap: 0.5rem;
}

.gap-3 {
  gap: 0.75rem;
}

.cursor-pointer {
  cursor: pointer;
}

/* Striped table styling */
:deep(.v-table--striped tbody tr:nth-of-type(even)) {
  background-color: rgba(0, 0, 0, 0.02);
}

:deep(.v-theme--dark .v-table--striped tbody tr:nth-of-type(even)) {
  background-color: rgba(255, 255, 255, 0.02);
}

@media (max-width: 960px) {
  .iplas-filter-grid,
  .iplas-control-grid--two,
  .iplas-control-grid--three {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .iplas-selection-shell__toolbar,
  .iplas-selection-shell__summary,
  .iplas-selection-actions,
  .iplas-result-toolbar,
  .iplas-summary-panel__header,
  .iplas-summary-item,
  .iplas-summary-item__actions,
  .iplas-fetch-panel__actions,
  .iplas-notice,
  .iplas-empty-state,
  .iplas-progress-card,
  .iplas-result-summary-card,
  .iplas-indexeddb-status-bar {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }
}

@keyframes iplas-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
