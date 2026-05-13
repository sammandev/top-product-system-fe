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

          <AppPanel eyebrow="Scope" title="Station Search" tone="cool" split-header>
            <template #header-aside>
              <div class="iplas-header-actions">
                  <button type="button" class="iplas-button iplas-button--ghost" :disabled="loading" @click="handleRefresh">
                  <Icon :icon="loading ? 'mdi:loading' : 'mdi:refresh'" :class="{ 'iplas-spin': loading }" />
                  <span>{{ loading ? 'Refreshing...' : 'Refresh' }}</span>
                </button>
                <button type="button" class="iplas-button iplas-button--ghost" @click="emit('show-settings')">
                  iPLAS Settings
                </button>
              </div>
            </template>

            <div class="iplas-selection-shell">
              <div class="iplas-control-grid iplas-control-grid--two">
                <label class="iplas-field">
                  <span>Site</span>
                  <AppSelect v-model="selectedSite" :options="siteSelectOptions" :disabled="loading" @change="handleSiteChange" />
                </label>

                <label class="iplas-field">
                  <span>Project</span>
                  <AppSelect v-model="selectedProject" :options="projectSelectOptions" :disabled="!selectedSite || loadingStations"
                    @change="handleProjectChange" />
                </label>
              </div>

              <div class="iplas-control-grid iplas-control-grid--three">
                <label class="iplas-field">
                  <span>Date Range</span>
                  <AppSelect v-model="dateRangePreset" :options="dateRangePresetSelectOptions" :searchable="false" @change="applyDateRangePreset(dateRangePreset)" />
                </label>

                <label class="iplas-field">
                  <span>Start Time</span>
                  <input
                    v-model="startTime"
                    type="datetime-local"
                    class="iplas-datetime-input app-themed-input app-themed-datetime-input"
                    @click="openNativeDateTimePicker"
                  />
                </label>

                <label class="iplas-field">
                  <span>End Time</span>
                  <input
                    v-model="endTime"
                    type="datetime-local"
                    class="iplas-datetime-input app-themed-input app-themed-datetime-input"
                    @click="openNativeDateTimePicker"
                  />
                </label>
              </div>

              <div class="iplas-action-card">
                <div>
                  <strong>Configure Stations</strong>
                  <p>Select stations, device IDs, and status filters for iPLAS search.</p>
                </div>
                <button type="button" class="iplas-button iplas-button--secondary"
                  :disabled="!selectedSite || !selectedProject || loadingStations" @click="openStationSelectionDialog">
                  <Icon icon="mdi:tune-variant" />
                  <span>{{ loadingStations ? 'Loading...' : 'Configure Stations' }}</span>
                  <strong v-if="selectedStations.length > 0">{{ selectedStations.length }}</strong>
                </button>
              </div>

              <section v-if="selectedProject" class="iplas-summary-panel">
                <div class="iplas-summary-panel__header">
                  <div>
                    <p class="iplas-summary-panel__eyebrow">Selected Station(s)</p>
                  </div>
                  <span class="iplas-pill iplas-pill--neutral">{{ configuredStations.length }} active</span>
                </div>

                <div v-if="!selectedProject" class="iplas-empty-state iplas-empty-state--compact">
                  <Icon icon="mdi:folder-search-outline" />
                  <div>
                    <strong>Select a project first</strong>
                    <p>Projects unlock the station and device options for iPLAS search.</p>
                  </div>
                </div>

                <div v-else-if="configuredStations.length === 0" class="iplas-empty-state iplas-empty-state--compact">
                  <Icon icon="mdi:router-wireless-off" />
                  <div>
                    <strong>No stations configured yet</strong>
                    <p>Open the station dialog to choose one or more stations.</p>
                  </div>
                </div>

                <div v-else class="iplas-summary-list">
                  <article v-for="configuredStation in configuredStations" :key="configuredStation.stationValue"
                    class="iplas-summary-item" role="button" tabindex="0" @click="openStationSelectionDialog"
                    @keydown.enter.prevent="openStationSelectionDialog" @keydown.space.prevent="openStationSelectionDialog">
                    <div class="iplas-summary-item__copy">
                      <h4>{{ configuredStation.displayName }}</h4>
                      <p>{{ configuredStation.stationName }}</p>
                    </div>
                    <div class="iplas-summary-item__actions">
                      <span v-if="configuredStation.order !== null" class="iplas-pill iplas-pill--neutral">
                        #{{ configuredStation.order }}
                      </span>
                      <span class="iplas-pill iplas-pill--cool">{{ configuredStation.deviceChip }}</span>
                      <span class="iplas-pill iplas-pill--warm">{{ configuredStation.statusChip }}</span>
                    </div>
                  </article>
                </div>
              </section>

              <section v-if="selectedStations.length > 0" class="iplas-fetch-panel">
                <div class="iplas-fetch-panel__actions">
                  <button type="button" class="iplas-button iplas-button--primary" :disabled="stationSearchRunLoading"
                    @click="fetchTestItems">
                    <Icon :icon="stationSearchRunLoading ? 'mdi:loading' : 'mdi:database-search-outline'"
                      :class="{ 'iplas-spin': stationSearchRunLoading }" />
                    <span>Search Test Data</span>
                    <strong>({{ selectedStations.length }} station{{ selectedStations.length > 1 ? 's' : '' }})</strong>
                  </button>
                </div>

                <div v-if="stationSearchRunLoading" class="iplas-progress-card">
                  <div class="iplas-progress-card__spinner" />
                  <div>
                    <strong>
                      Processing {{ stationSearchRunProgress.processed }} of
                      {{ stationSearchRunProgress.total }} station/device searches
                    </strong>
                    <p>Preparing a backend-managed search run before paging results.</p>
                  </div>
                </div>
              </section>

              <div v-if="stationSearchPossiblyTruncated && hasRegularModeData" class="iplas-notice iplas-notice--warning">
                <div>
                  <strong>Backend flagged possible truncation</strong>
                  <p>
                    Results may still be incomplete if the upstream iPLAS API could not be fully covered by backend splitting.
                    Narrow the date range or station and device scope, then run the search again.
                  </p>
                </div>
              </div>
            </div>
          </AppPanel>

          <!-- Test Items Results (Regular Mode) -->
          <section v-if="hasRegularModeData" class="iplas-section">
            <div class="iplas-section__header iplas-section__header--split">
              <div>
                <p class="iplas-section__eyebrow">Regular Mode</p>
                <h2>Test Results</h2>
                <p class="iplas-section__description">
                  {{ regularModeRecordCount }} records are available from the backend search run. Use station tabs to review paged results.
                </p>
              </div>
              <div class="iplas-result-toolbar">
                <span class="iplas-pill iplas-pill--cool">{{ regularModeRecordCount }} records</span>
                <button v-if="selectedRecordIndices.length > 0" type="button"
                  class="iplas-button iplas-button--secondary" :disabled="downloading || downloadingCsv"
                  @click="downloadAllSelectedRecords">
                  <Icon :icon="downloading || downloadingCsv ? 'mdi:loading' : 'mdi:download-multiple'"
                    :class="{ 'iplas-spin': downloading || downloadingCsv }" />
                  <span>Download All Logs ({{ selectedRecordIndices.length }})</span>
                </button>
                <button v-if="selectedRecordIndices.length > 0" type="button" class="iplas-button iplas-button--ghost"
                  :disabled="downloading" @click="downloadSelectedRecords">
                  <Icon :icon="downloading ? 'mdi:loading' : 'mdi:download'" :class="{ 'iplas-spin': downloading }" />
                  <span>Download TXT ({{ selectedRecordIndices.length }})</span>
                </button>
                <button v-if="selectedRecordIndices.length > 0" type="button" class="iplas-button iplas-button--success"
                  :disabled="downloadingCsv" @click="downloadSelectedRecordsCsv">
                  <Icon :icon="downloadingCsv ? 'mdi:loading' : 'mdi:file-delimited'"
                    :class="{ 'iplas-spin': downloadingCsv }" />
                  <span>Download CSV ({{ selectedRecordIndices.length }})</span>
                </button>
              </div>
            </div>

            <AppTabs v-model="activeStationTabKey" :items="regularStationTabItems" scrollable>
              <template v-for="(stationGroup, stationIndex) in groupedByStation" :key="stationGroup.stationName"
                #[`panel-station-${stationIndex}`]>
                <div class="iplas-result-summary-card">
                  <div>
                    <strong>{{ stationGroup.displayName }}</strong>
                    <p>{{ stationGroup.totalRecords }} records ready for review. Filters and pagination are handled by the backend run.</p>
                  </div>
                  <span class="iplas-pill iplas-pill--cool">{{ stationGroup.totalRecords }}
                    visible</span>
                </div>
              </template>
            </AppTabs>

            <div v-if="currentStationGroup" class="iplas-result-pane">
              <div class="iplas-filter-grid">
                <label class="iplas-field">
                  <span>Search Records</span>
                  <div class="iplas-input-with-icon">
                    <Icon icon="mdi:magnify" />
                    <input :value="recordSearchQueries[currentStationGroup.stationName] || ''" class="app-themed-input" type="text"
                      placeholder="Search ISN, Device ID, Error Code, Error Name..."
                      @input="handleStationSearchInput(currentStationGroup.stationName, $event)">
                  </div>
                </label>

                <label class="iplas-field">
                  <span>Status</span>
                  <AppSelect
                    :model-value="stationStatusFilters[currentStationGroup.stationName] || 'ALL'"
                    :options="stationStatusSelectOptions"
                    :searchable="false"
                    @update:model-value="handleStationStatusChange(currentStationGroup.stationName, $event as 'ALL' | 'PASS' | 'FAIL')"
                  />
                </label>

                <div class="iplas-field iplas-field--device-filter">
                  <div class="iplas-field__row">
                    <span>Device Filter</span>
                    <button v-if="(selectedFilterDeviceIds[currentStationGroup.stationName] || []).length > 0"
                      type="button" class="iplas-inline-action"
                      @click="clearStationDeviceFilters(currentStationGroup.stationName)">
                      Clear
                    </button>
                  </div>
                  <div class="iplas-device-filter-shell">
                    <p>
                      {{ (selectedFilterDeviceIds[currentStationGroup.stationName] || []).length }} selected of
                      {{ getUniqueDeviceIdsForStation(currentStationGroup).length }} devices.
                    </p>
                    <div class="iplas-device-filter-list">
                      <button v-for="deviceId in getUniqueDeviceIdsForStation(currentStationGroup)" :key="deviceId"
                        type="button" class="iplas-device-chip" :class="{
                          'iplas-device-chip--active': isStationDeviceSelected(currentStationGroup.stationName, deviceId),
                        }" @click="toggleStationDeviceFilter(currentStationGroup.stationName, deviceId)">
                        <Icon
                          :icon="isStationDeviceSelected(currentStationGroup.stationName, deviceId) ? 'mdi:checkbox-marked-circle' : 'mdi:checkbox-blank-circle-outline'" />
                        <span>{{ deviceId }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="iplas-result-summary-card">
                <div>
                  <strong>Server-side result page</strong>
                  <p>
                    Showing {{ getActiveStationPaginationState(currentStationGroup.stationName).items.length }} of
                    {{ getActiveStationPaginationState(currentStationGroup.stationName).totalItems }} matching rows.
                  </p>
                </div>
                <span class="iplas-pill iplas-pill--cool">
                  Page {{ getActiveStationPaginationState(currentStationGroup.stationName).page }}
                </span>
              </div>

              <IplasRecordTable :items="getActiveStationPaginationState(currentStationGroup.stationName).items"
                :total-items="getActiveStationPaginationState(currentStationGroup.stationName).totalItems"
                :loading="getActiveStationPaginationState(currentStationGroup.stationName).loading"
                :downloading-record="downloadingKey" :downloading-csv-record="downloadingCsvKey" :selectable="true"
                :selected-keys="getSelectedKeysForStation(currentStationGroup.stationName)" :server-side="true"
                @update:options="handleTableOptionsUpdate(currentStationGroup.stationName, $event)"
                @update:selected-keys="handleTableSelectionChange(currentStationGroup.stationName, $event)"
                @row-click="openFullscreen" @download="downloadSingleRecord($event, currentStationGroup.stationName, 0)"
                @download-csv="downloadCsvRecord($event, currentStationGroup.stationName, 0)" />
            </div>
          </section>

        </section>
      </template>

      <template #panel-isn>
        <section class="iplas-content-pane">
          <IplasIsnSearchContent v-if="searchMode === 'isn'" />
        </section>
      </template>
    </AppTabs>

    <DataExplorerStationSelectionDialog v-if="showStationSelectionDialog" v-model:show="showStationSelectionDialog"
      :stations="stationOptions" :selected-stations="selectedStations" :device-ids-by-station="deviceIdsByStation"
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
import { useMutation, useQuery } from '@tanstack/vue-query'
import { useDebounceFn } from '@vueuse/core'
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import { iplasProxyApi } from '@/features/dut-logs/api/iplasProxyApi'
import type {
  CsvTestItemData,
  DownloadAttachmentInfo,
  Station,
  TestItem,
} from '@/features/dut-logs/api/iplasApi'
import type { CompactCsvTestItemData } from '@/features/dut-logs/api/iplasProxyApi'
import type { DownloadCsvLogInfo } from '@/features/dut-logs/composables/useIplasApi'
import { useIplasApi } from '@/features/dut-logs/composables/useIplasApi'
import {
  createIplasStationSearchRun,
  fetchIplasStationSearchRunRecordsQuery,
  fetchIplasStationSearchRunQuery,
} from '@/features/dut-logs/composables/useIplasQueries'
import { useIplasSettings } from '@/features/dut-logs/composables/useIplasSettings'
import { queryKeys } from '@/core/query'
import { useNotification } from '@/shared/composables/useNotification'
import AppSelect from '@/shared/ui/forms/AppSelect.vue'
import AppPanel from '@/shared/ui/panel/AppPanel.vue'
import AppTabs from '@/shared/ui/tabs/AppTabs.vue'
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
  totalRecords: number
  deviceIds: string[]
}

// Search mode tab - persisted in URL
import { useTabPersistence } from '@/shared/composables/useTabPersistence'

const searchMode = useTabPersistence<'station' | 'isn'>('subTab', 'station')

const searchModeItems = [
  { value: 'station', label: 'Station Search', icon: 'mdi:router-wireless' },
  { value: 'isn', label: 'ISN Search', icon: 'mdi:barcode-scan' },
]

const {
  loading,
  loadingStations,
  downloading,
  error,
  stations,
  uniqueSites,
  projectsBySite,
  fetchSiteProjects,
  fetchStations,
  fetchDeviceIds,
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

const dateRangePresetSelectOptions = dateRangePresets.map((preset) => ({
  label: preset.title,
  value: preset.value,
}))

const stationStatusSelectOptions = [
  { label: 'All Results', value: 'ALL' },
  { label: 'PASS', value: 'PASS' },
  { label: 'FAIL', value: 'FAIL' },
]

// Device IDs grouped by station
const deviceIdsByStation = ref<Record<string, string[]>>({})
const stationDeviceRequestPromises = ref<Map<string, Promise<string[]>>>(new Map())

// Computed: Check if the backend search run has records available.
const hasRegularModeData = computed(() => {
  return (stationSearchRunStatus.value?.total_records ?? 0) > 0
})

// Computed: Get the total count of regular mode records
const regularModeRecordCount = computed(() => {
  return stationSearchRunStatus.value?.total_records ?? 0
})

const showStationSelectionDialog = ref(false)
const stationTestStatus = ref<Record<string, 'ALL' | 'PASS' | 'FAIL'>>({})

const stationSearchMutation = useMutation({
  mutationFn: runStationSearch,
})

const stationSearchRunId = ref<string | null>(null)

const stationSearchRunStatusQuery = useQuery({
  queryKey: computed(() =>
    stationSearchRunId.value
      ? queryKeys.iplas.stationSearchRun(stationSearchRunId.value)
      : queryKeys.iplas.stationSearchRun('idle'),
  ),
  queryFn: () => {
    if (!stationSearchRunId.value) {
      throw new Error('Missing Station Search run id')
    }
    return fetchIplasStationSearchRunQuery(stationSearchRunId.value, true)
  },
  enabled: computed(() => Boolean(stationSearchRunId.value)),
  refetchInterval: (query) => {
    const status = query.state.data?.status
    return status === 'completed' || status === 'failed' ? false : 1000
  },
})

const stationSearchRunStatus = computed(() => stationSearchRunStatusQuery.data.value ?? null)

const stationSearchRunLoading = computed(() => {
  const status = stationSearchRunStatus.value?.status
  return status === 'pending' || status === 'running' || stationSearchMutation.isPending.value
})

const stationSearchRunProgress = computed(() => ({
  processed: stationSearchRunStatus.value?.processed_combinations ?? 0,
  total: stationSearchRunStatus.value?.total_combinations ?? 0,
}))

const stationSearchPossiblyTruncated = computed(
  () => stationSearchRunStatus.value?.possibly_truncated ?? false,
)

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
      initialized: boolean
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

function openNativeDateTimePicker(event: MouseEvent): void {
  const input = event.currentTarget as (HTMLInputElement & { showPicker?: () => void }) | null
  if (!input?.showPicker) {
    return
  }

  try {
    input.showPicker()
  } catch {
    // Native picker availability is browser-dependent.
  }
}

async function getObservableIplasNow(): Promise<Date> {
  try {
    const response = await iplasProxyApi.getServerTime()
    const serverNow = new Date(response.server_time)
    if (!Number.isNaN(serverNow.getTime())) {
      return serverNow
    }
  } catch (_err) {
    // Fall back to browser time when proxy server time is unavailable.
  }

  return new Date()
}

/**
 * Get date range based on preset selection.
 * Current Shift follows observable iPLAS server time so local dev matches mirror fixtures.
 */
async function getDateRangeForPreset(preset: string): Promise<{ start: Date; end: Date }> {
  const now = preset === 'current_shift' ? await getObservableIplasNow() : new Date()
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
async function applyDateRangePreset(preset: string): Promise<void> {
  const { start, end } = await getDateRangeForPreset(preset)
  startTime.value = getLocalTimeString(start)
  endTime.value = getLocalTimeString(end)
}

// Time range - initialize with current shift
const startTime = ref('')
const endTime = ref('')

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

const { showError: showErrorNotification, showInfo: showInfoNotification } = useNotification()

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

function getStationName(stationValue: string): string {
  const station = stations.value.find((s: Station) => s.display_station_name === stationValue)
  return station?.station_name || stationValue
}

function getStationOrder(stationValue: string): number | null {
  const station = stations.value.find((s: Station) => s.display_station_name === stationValue)
  return typeof station?.order === 'number' ? station.order : null
}

function getStationDeviceChip(stationValue: string): string {
  const selectedDeviceCount = stationDeviceIds.value[stationValue]?.length || 0
  const totalDeviceCount = deviceIdsByStation.value[stationValue]?.length || 0

  if (selectedDeviceCount === 0) {
    return totalDeviceCount > 0 ? `ALL/${totalDeviceCount} Device(s)` : 'ALL Device(s)'
  }

  return `${selectedDeviceCount} Device(s)`
}

function getStationStatusChip(stationValue: string): string {
  return `${stationTestStatus.value[stationValue] || 'ALL'} Result`
}

const configuredStations = computed<
  Array<{
    stationValue: string
    displayName: string
    stationName: string
    order: number | null
    deviceChip: string
    statusChip: string
  }>
>(() => {
  return selectedStations.value.map((stationValue: string) => ({
    stationValue,
    displayName: getStationDisplayName(stationValue),
    stationName: getStationName(stationValue),
    order: getStationOrder(stationValue),
    deviceChip: getStationDeviceChip(stationValue),
    statusChip: getStationStatusChip(stationValue),
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
    Object.entries(stationDeviceIds.value).filter(([stationValue]) =>
      nextStationSet.has(stationValue),
    ),
  )
  deviceIdsByStation.value = Object.fromEntries(
    Object.entries(deviceIdsByStation.value).filter(([stationValue]) =>
      nextStationSet.has(stationValue),
    ),
  )
  loadingDevicesByStation.value = Object.fromEntries(
    Object.entries(loadingDevicesByStation.value).filter(([stationValue]) =>
      nextStationSet.has(stationValue),
    ),
  )
  selectedFilterDeviceIds.value = Object.fromEntries(
    Object.entries(selectedFilterDeviceIds.value).filter(([stationValue]) =>
      nextStationSet.has(stationValue),
    ),
  )
  stationStatusFilters.value = Object.fromEntries(
    Object.entries(stationStatusFilters.value).filter(([stationValue]) =>
      nextStationSet.has(stationValue),
    ),
  )
  recordSearchQueries.value = Object.fromEntries(
    Object.entries(recordSearchQueries.value).filter(([stationValue]) =>
      nextStationSet.has(stationValue),
    ),
  )
  debouncedRecordSearchQueries.value = Object.fromEntries(
    Object.entries(debouncedRecordSearchQueries.value).filter(([stationValue]) =>
      nextStationSet.has(stationValue),
    ),
  )
  stationTestStatus.value = Object.fromEntries(
    Object.entries(stationTestStatus.value).filter(([stationValue]) =>
      nextStationSet.has(stationValue),
    ),
  )

  if (hasChanged) {
    handleStationChange()
  }
}

function handleStationSelectionConfirm(result: StationSelectionResult): void {
  updateSelectedStations(result.stations)
  stationDeviceIds.value = Object.fromEntries(
    result.stations.map((stationValue) => [stationValue, [...(result.deviceIds[stationValue] || [])]]),
  )
  stationTestStatus.value = Object.fromEntries(
    result.stations.map((stationValue) => [stationValue, result.testStatus[stationValue] || 'ALL']),
  )
  showStationSelectionDialog.value = false
}

async function ensureStationDeviceIdsLoaded(stationValue: string): Promise<string[]> {
  const siteValue = selectedSite.value
  const projectValue = selectedProject.value

  if (!siteValue || !projectValue) {
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
      siteValue,
      projectValue,
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

// Download controls
const selectedRecordKeys = ref<Set<string>>(new Set<string>())
const selectedRecordStationMap = ref<Map<string, string>>(new Map())
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

const siteSelectOptions = computed(() => [
  { label: 'Select a site', value: null },
  ...uniqueSites.value.map((site) => ({
    label: site,
    value: site,
  })),
])

const projectSelectOptions = computed(() => [
  { label: 'Select a project', value: null },
  ...availableProjects.value.map((project) => ({
    label: project,
    value: project,
  })),
])

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

  const stationSummaries = new Map(
    (stationSearchRunStatus.value?.stations ?? []).map((station) => [station.station, station]),
  )

  const sourceData = Object.values(serverPaginationState.value).flatMap((state) => state.items)

  for (const record of sourceData) {
    const stationName = record.station
    if (!groups[stationName]) {
      const stationInfo = stations.value.find((s: Station) => s.station_name === stationName)
      groups[stationName] = {
        stationName,
        displayName: stationInfo?.display_station_name || stationName,
        records: [],
        totalRecords: stationSummaries.get(stationName)?.total_records ?? 0,
        deviceIds: stationSummaries.get(stationName)?.available_device_ids ?? [],
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

  for (const stationSummary of stationSummaries.values()) {
    if (!groups[stationSummary.station]) {
      const stationInfo = stations.value.find(
        (s: Station) => s.display_station_name === stationSummary.station,
      )
      groups[stationSummary.station] = {
        stationName: stationSummary.station,
        displayName: stationInfo?.display_station_name || stationSummary.station,
        records: [],
        totalRecords: stationSummary.total_records,
        deviceIds: stationSummary.available_device_ids,
      }
    }
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

// Helper functions for station sub-tabs and device ID filtering
function getUniqueDeviceIdsForStation(stationGroup: StationGroup): string[] {
  return stationGroup.deviceIds
}

function getActiveStationPaginationState(stationName: string) {
  if (!serverPaginationState.value[stationName]) {
    serverPaginationState.value[stationName] = {
      page: 1,
      itemsPerPage: 25,
      sortBy: 'TestStartTime',
      sortDesc: true,
      items: [],
      totalItems: 0,
      loading: false,
      initialized: false,
    }
  }

  return serverPaginationState.value[stationName]!
}

function handleStationSearchInput(stationName: string, event: Event): void {
  const target = event.target as HTMLInputElement | null
  setRecordSearchQuery(stationName, target?.value ?? '')
}

function handleStationStatusChange(stationName: string, value: 'ALL' | 'PASS' | 'FAIL'): void {
  stationStatusFilters.value[stationName] = value
  void initializeServerPagination(stationName)
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

  void initializeServerPagination(stationName)
}

function clearStationDeviceFilters(stationName: string): void {
  selectedFilterDeviceIds.value = {
    ...selectedFilterDeviceIds.value,
    [stationName]: [],
  }

  void initializeServerPagination(stationName)
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
watch(selectedStations, async (newStations: string[], oldStations: string[]) => {
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
})

// Initialize testItemFilters when records change - ensure 'value' is selected by default
watch(
  groupedByStation,
  (groups: StationGroup[]) => {
    for (const group of groups) {
      const filteredRecords = getActiveStationPaginationState(group.stationName).items
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
  return Array.from(selectedRecordKeys.value as Set<string>).filter(
    (key) => selectedRecordStationMap.value.get(key) === stationName,
  )
}

/**
 * Handle selection changes from IplasRecordTable
 */
function handleTableSelectionChange(stationName: string, newSelectedKeys: string[]): void {
  for (const key of Array.from(selectedRecordKeys.value)) {
    if (selectedRecordStationMap.value.get(key) === stationName) {
      selectedRecordKeys.value.delete(key)
      selectedRecordStationMap.value.delete(key)
    }
  }

  for (const key of newSelectedKeys) {
    selectedRecordKeys.value.add(key)
    selectedRecordStationMap.value.set(key, stationName)
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
    for (const state of Object.values(serverPaginationState.value)) {
      for (const record of state.items) {
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
      const state = getActiveStationPaginationState(group.stationName)
      for (const record of state.items) {
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
      const state = getActiveStationPaginationState(group.stationName)
      for (const record of state.items) {
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
  activeStationTab.value = 0
  showStationSelectionDialog.value = false
  stationDeviceIds.value = {}
  deviceIdsByStation.value = {}
  loadingDevicesByStation.value = {}
  stations.value = []
  clearTestItemData()
  selectedRecordKeys.value.clear()
  selectedRecordStationMap.value.clear()
  stationDeviceRequestPromises.value.clear()
  stationTestStatus.value = {}
}

async function handleProjectChange() {
  selectedStations.value = []
  activeStationTab.value = 0
  showStationSelectionDialog.value = false
  stationDeviceIds.value = {}
  deviceIdsByStation.value = {}
  loadingDevicesByStation.value = {}
  stationDeviceRequestPromises.value.clear()
  stationTestStatus.value = {}
  clearTestItemData()
  selectedRecordKeys.value.clear()
  selectedRecordStationMap.value.clear()

  if (selectedSite.value && selectedProject.value) {
    await fetchStations(selectedSite.value, selectedProject.value)
  }
}

function handleStationChange() {
  clearTestItemData()
  activeStationTab.value = 0
  stationSearchRunId.value = null
  serverPaginationState.value = {}
  selectedRecordKeys.value.clear()
  selectedRecordStationMap.value.clear()
}

async function fetchTestItems() {
  await stationSearchMutation.mutateAsync()
}

async function runStationSearch() {
  if (!selectedSite.value || !selectedProject.value || selectedStations.value.length === 0) return

  // Pass Date objects - the composable handles ISO format conversion
  const begintime = new Date(startTime.value)
  const endtime = new Date(endTime.value)

  clearTestItemData()
  selectedRecordKeys.value.clear()
  selectedRecordStationMap.value.clear()
  lazyLoadedTestItems.value.clear()
  loadingTestItemsForRecord.value.clear()
  activeStationTab.value = 0
  stationStatusFilters.value = {}
  selectedFilterDeviceIds.value = {}
  recordSearchQueries.value = {}
  debouncedRecordSearchQueries.value = {}
  serverPaginationState.value = {}
  stationSearchRunId.value = null

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

  const run = await createIplasStationSearchRun({
    site: selectedSite.value,
    project: selectedProject.value,
    begin_time: iplasProxyApi.formatDateForRequest(begintime),
    end_time: iplasProxyApi.formatDateForRequest(endtime),
    selections: resolvedStations.map(({ stationInfo, deviceIds }) => ({
      station: stationInfo.display_station_name,
      device_ids: deviceIds.filter((deviceId) => deviceId !== 'ALL'),
      test_status: stationTestStatus.value[stationInfo.display_station_name] || 'ALL',
    })),
  })

  stationSearchRunId.value = run.run_id
}

/**
 * Handle server-side pagination for table view mode.
 * Called when user changes page, sort, or items per page.
 */
async function handleTableOptionsUpdate(
  stationName: string,
  options: { page: number; itemsPerPage: number; sortBy: { key: string; order: 'asc' | 'desc' }[] },
) {
  if (!stationSearchRunId.value) return

  const state = getActiveStationPaginationState(stationName)
  state.loading = true
  state.initialized = true

  // Get sort info
  const sortInfo = options.sortBy[0]
  const sortBy = sortInfo?.key || 'TestStartTime'
  const sortDesc = sortInfo?.order === 'desc'

  const filterDeviceIds = selectedFilterDeviceIds.value[stationName]
  const statusFilter = stationStatusFilters.value[stationName] || 'ALL'
  const search = debouncedRecordSearchQueries.value[stationName] || null

  for (const key of Array.from(selectedRecordKeys.value)) {
    if (selectedRecordStationMap.value.get(key) === stationName) {
      selectedRecordKeys.value.delete(key)
      selectedRecordStationMap.value.delete(key)
    }
  }

  try {
    const result = await fetchIplasStationSearchRunRecordsQuery(
      {
        runId: stationSearchRunId.value,
        station: stationName,
        deviceIds: filterDeviceIds || [],
        testStatus: statusFilter,
        search,
        options: {
          page: options.page,
          itemsPerPage: options.itemsPerPage,
          sortBy,
          sortDesc,
        },
      },
    )

    // Update state
    state.page = options.page
    state.itemsPerPage = options.itemsPerPage
    state.sortBy = sortBy
    state.sortDesc = sortDesc
    state.items = result.data
    state.totalItems = result.total_records
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

watch(
  () => ({ ...debouncedRecordSearchQueries.value }),
  (queries) => {
    for (const [stationName] of Object.entries(queries)) {
      if (serverPaginationState.value[stationName]) {
        void initializeServerPagination(stationName)
      }
    }
  },
  { deep: true },
)

watch(
  stationSearchRunStatus,
  (status) => {
    if (status?.status === 'failed' && status.error_message) {
      error.value = status.error_message
    }

    if (status?.status === 'completed') {
      const stationCount = status.stations.length
      if (stationCount === 0) {
        activeStationTab.value = 0
        return
      }

      if (activeStationTab.value >= stationCount) {
        activeStationTab.value = 0
      }
    }
  },
  { immediate: true },
)

// Watch for station data changes - initialize server pagination
watch(
  groupedByStation,
  async (groups: StationGroup[]) => {
    if (groups.length > 0) {
      // Initialize pagination for the active station tab
      const activeStation = groups[activeStationTab.value]
      const activeState = activeStation
        ? getActiveStationPaginationState(activeStation.stationName)
        : null
      if (activeStation && activeState && !activeState.initialized) {
        await initializeServerPagination(activeStation.stationName)
      }
    }
  },
  { immediate: true },
)

// Watch for active station tab changes - initialize pagination if needed
watch(activeStationTab, async (newTab: number) => {
  if (groupedByStation.value.length > newTab) {
    const station = groupedByStation.value[newTab]
    const stationState = station ? getActiveStationPaginationState(station.stationName) : null
    if (station && stationState && !stationState.initialized) {
      await initializeServerPagination(station.stationName)
    }
  }
})

// Initialize
onMounted(async () => {
  await fetchSiteProjects()
  await applyDateRangePreset(dateRangePreset.value)

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
  selectedRecordStationMap.value.clear()
})
</script>

<style scoped>
.iplas-content-shell,
.iplas-content-pane,
.iplas-selection-shell,
.iplas-header-actions {
  display: grid;
  gap: 1rem;
}

.iplas-section {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 0.95rem;
  background: var(--app-panel);
}

.iplas-section__header {
  display: grid;
  gap: 0.35rem;
}

.iplas-section__header--split {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.iplas-section__eyebrow {
  margin: 0;
  color: var(--app-accent);
  font-size: 0.78rem;
  font-weight: 700;
}

.iplas-section__header h2 {
  margin: 0;
  color: var(--app-ink);
  font-size: 1.12rem;
}

.iplas-section__description {
  margin: 0.25rem 0 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.iplas-selection-shell__toolbar,
.iplas-selection-shell__summary,
.iplas-selection-actions,
.iplas-result-toolbar,
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
  letter-spacing: 0;
  text-transform: none;
}

.iplas-field select,
.iplas-field input:not(.app-themed-input),
.iplas-button,
.iplas-notice button {
  border-radius: 0.75rem;
  font: inherit;
}

.iplas-field :not(.app-select) > select,
.iplas-field input:not(.app-themed-input) {
  width: 100%;
  border: 1px solid var(--app-border);
  padding: 0.74rem 0.82rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
}

.iplas-datetime-input {
  width: 100%;
}

.iplas-field :not(.app-select) > select:focus,
.iplas-field input:not(.app-themed-input):focus {
  outline: none;
  border-color: var(--app-ring);
  box-shadow: none;
}

.iplas-input-with-icon {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.65rem;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  padding: 0 0.95rem;
  background: var(--app-panel-strong);
}

.iplas-input-with-icon svg {
  color: var(--app-muted);
}

.iplas-input-with-icon input.app-themed-input {
  border: 0;
  padding-left: 0;
  padding-right: 0;
  background: transparent;
  box-shadow: none;
}

.iplas-input-with-icon:focus-within {
  border-color: var(--app-ring);
  box-shadow: none;
}

.iplas-header-actions {
  grid-auto-flow: column;
}

.iplas-button,
.iplas-notice button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px solid transparent;
  padding: 0.72rem 0.9rem;
  font-weight: 700;
  cursor: pointer;
}

.iplas-button:disabled,
.iplas-notice button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.iplas-button--primary {
  background: var(--app-accent);
  color: var(--app-canvas);
}

.iplas-button--secondary {
  background: var(--app-info-soft);
  border-color: var(--app-info-line);
  color: var(--app-info);
}

.iplas-button--ghost,
.iplas-notice button {
  background: var(--app-panel);
  border-color: var(--app-border);
  color: var(--app-ink);
}

.iplas-button--danger {
  background: var(--app-danger-soft);
  border-color: var(--app-danger-line);
  color: var(--app-danger);
}

.iplas-button--success {
  background: var(--app-success-soft);
  border-color: var(--app-success-line);
  color: var(--app-success);
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
  border: 1px solid var(--app-border);
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  background: var(--app-panel);
  color: var(--app-ink);
  font-size: 0.82rem;
  font-weight: 700;
}

.iplas-pill--cool {
  background: var(--app-info-soft);
  border-color: var(--app-info-line);
  color: var(--app-info);
}

.iplas-pill--warm {
  background: var(--app-warning-soft);
  border-color: var(--app-warning-line);
  color: var(--app-warning);
}

.iplas-pill--neutral {
  background: color-mix(in srgb, var(--app-muted) 10%, transparent);
  border-color: color-mix(in srgb, var(--app-muted) 16%, transparent);
  color: var(--app-muted);
}

.iplas-action-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.9rem;
  border: 1px solid color-mix(in srgb, var(--app-accent) 12%, var(--app-border));
  border-radius: 0.8rem;
  background: var(--app-panel);
}

.iplas-action-card strong {
  color: var(--app-ink);
}

.iplas-action-card p {
  margin: 0.35rem 0 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.iplas-selection-actions {
  align-items: flex-start;
}

.iplas-selection-actions p,
.iplas-summary-item p,
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
  border-radius: 0.9rem;
  padding: 0.9rem 1rem;
  background: var(--app-panel);
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
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 0.75rem;
}

.iplas-result-toolbar {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.iplas-result-summary-card {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.iplas-result-summary-card strong {
  color: var(--app-ink);
}

.iplas-device-filter-shell {
  display: grid;
  gap: 0.85rem;
  border: 1px solid var(--app-border);
  border-radius: 0.8rem;
  padding: 0.85rem 0.9rem;
  background: var(--app-panel);
}

.iplas-device-filter-shell p {
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
  border: 1px solid var(--app-border);
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  background: var(--app-panel);
  color: var(--app-ink);
  font: inherit;
  cursor: pointer;
}

.iplas-device-chip--active {
  border-color: var(--app-accent);
  background: var(--app-accent-soft);
  color: var(--app-accent);
}

.iplas-summary-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  width: 100%;
  min-height: 0;
  border: 1px solid var(--app-border);
  border-radius: 0.8rem;
  padding: 0.72rem 0.8rem;
  background: var(--app-panel);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.iplas-summary-item:hover {
  border-color: var(--app-accent);
  background: color-mix(in srgb, var(--app-accent) 5%, var(--app-panel));
}

.iplas-summary-item__copy {
  display: grid;
  gap: 0.28rem;
}

.iplas-summary-item__actions {
  align-self: start;
  justify-content: flex-end;
  flex-wrap: wrap;
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

.iplas-progress-card__spinner {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 3px solid color-mix(in srgb, var(--app-accent) 14%, transparent);
  border-top-color: var(--app-accent);
  animation: iplas-spin 0.9s linear infinite;
}

.iplas-notice {
  border-radius: 0.7rem;
  padding: 0.9rem 1rem;
}

.iplas-notice--error {
  border: 1px solid var(--app-danger-line);
  background: var(--app-danger-soft);
}

.iplas-notice--info {
  border: 1px solid var(--app-info-line);
  background: var(--app-info-soft);
}

.iplas-notice--warning {
  border: 1px solid var(--app-warning-line);
  background: var(--app-warning-soft);
}

.iplas-empty-state {
  grid-template-columns: auto 1fr;
  align-items: center;
}

.iplas-empty-state svg {
  font-size: 1.8rem;
  color: var(--app-info);
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
  background-color: var(--app-panel-strong);
}

:deep(.v-theme--dark .v-table--striped tbody tr:nth-of-type(even)) {
  background-color: var(--app-panel-strong);
}

@media (max-width: 960px) {

  .iplas-filter-grid,
  .iplas-control-grid--two,
  .iplas-control-grid--three {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {

  .iplas-header-actions,

  .iplas-section__header--split,
  .iplas-selection-shell__toolbar,
  .iplas-selection-shell__summary,
  .iplas-selection-actions,
  .iplas-action-card,
  .iplas-result-toolbar,
  .iplas-summary-panel__header,
  .iplas-summary-item,
  .iplas-summary-item__actions,
  .iplas-fetch-panel__actions,
  .iplas-notice,
  .iplas-empty-state,
  .iplas-progress-card,
  .iplas-result-summary-card {
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
