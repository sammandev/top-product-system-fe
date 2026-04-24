<template>
    <div class="internal-data-shell">
        <AppPanel
            eyebrow="Search"
            title="DUT ISN Search"
            description="Search internal DUT records by one or more ISNs, then pivot between grid, list, table, and compact views."
            tone="cool"
            split-header
            compact-header
        >
            <template #header-aside>
                <div class="internal-data-header-actions">
                    <span v-if="inputMode === 'multiple'" class="internal-data-context-pill">
                        {{ multipleModeIdentifiers.length }} ready for multi-search
                    </span>
                    <span v-else class="internal-data-context-pill internal-data-context-pill--cool">
                        {{ bulkModeIdentifiers.length }} parsed from bulk input
                    </span>
                    <button
                        type="button"
                        class="internal-data-button internal-data-button--ghost"
                        :disabled="loading || !hasSearchState"
                        @click="clearAll"
                    >
                        <Icon icon="mdi:close-circle-outline" />
                        <span>Clear All</span>
                    </button>
                </div>
            </template>

            <div class="internal-data-mode-toggle">
                <button
                    type="button"
                    class="internal-data-mode-toggle__button"
                    :class="{ 'internal-data-mode-toggle__button--active': inputMode === 'multiple' }"
                    @click="inputMode = 'multiple'"
                >
                    <Icon icon="mdi:format-list-bulleted" />
                    <span>Multiple ISNs</span>
                </button>
                <button
                    type="button"
                    class="internal-data-mode-toggle__button"
                    :class="{ 'internal-data-mode-toggle__button--active': inputMode === 'bulk' }"
                    @click="inputMode = 'bulk'"
                >
                    <Icon icon="mdi:text-box-multiple" />
                    <span>Bulk Paste</span>
                </button>
            </div>

            <section v-if="inputMode === 'multiple'" class="internal-data-input-shell">
                <label class="internal-data-input-card" for="internal-data-isn-input">
                    <span class="internal-data-input-label">DUT ISNs</span>
                    <div class="internal-data-input-row">
                        <Icon icon="mdi:barcode-scan" class="internal-data-input-icon" />
                        <input
                            id="internal-data-isn-input"
                            v-model="multipleIsnSearchText"
                            class="internal-data-text-input"
                            type="text"
                            placeholder="Type an ISN, press Enter or comma to add, then search"
                            @keydown="handleMultipleInputKeydown"
                        >
                        <button
                            type="button"
                            class="internal-data-button internal-data-button--primary"
                            :disabled="loading || multipleModeIdentifiers.length === 0"
                            @click="submitMultipleSearch"
                        >
                            <Icon :icon="loading ? 'mdi:loading' : 'mdi:magnify'" :class="{ 'internal-data-spin': loading }" />
                            <span>Search</span>
                        </button>
                    </div>
                    <p class="internal-data-helper-copy">Press Enter or comma to commit an ISN. Press Enter again on an empty field to search.</p>
                </label>

                <div v-if="selectedISNs.length > 0 || multipleIsnSearchText.trim()" class="internal-data-chip-list">
                    <button
                        v-for="identifier in selectedISNs"
                        :key="identifier"
                        type="button"
                        class="internal-data-chip"
                        @click="removeSelectedISN(identifier)"
                    >
                        <span>{{ identifier }}</span>
                        <Icon icon="mdi:close" />
                    </button>
                    <span v-if="multipleIsnSearchText.trim()" class="internal-data-chip internal-data-chip--draft">
                        Pending: {{ multipleIsnSearchText.trim() }}
                    </span>
                </div>
            </section>

            <section v-else class="internal-data-input-shell">
                <label class="internal-data-input-card internal-data-input-card--textarea" for="internal-data-bulk-input">
                    <span class="internal-data-input-label">Bulk ISN Input</span>
                    <textarea
                        id="internal-data-bulk-input"
                        v-model="dutIsn"
                        class="internal-data-textarea"
                        rows="6"
                        placeholder="Paste multiple ISNs (one per line, comma-separated, or space-separated)&#10;Example:&#10;260884980003907&#10;DM2527470036123&#10;260884980003908"
                    />
                    <p class="internal-data-helper-copy">Paste ISNs separated by newlines, commas, or spaces. Duplicates are collapsed automatically.</p>
                </label>

                <div class="internal-data-bulk-footer">
                    <span class="internal-data-context-pill internal-data-context-pill--cool">
                        {{ bulkModeIdentifiers.length }} parsed identifier{{ bulkModeIdentifiers.length === 1 ? '' : 's' }}
                    </span>
                    <button
                        type="button"
                        class="internal-data-button internal-data-button--primary"
                        :disabled="loading || bulkModeIdentifiers.length === 0"
                        @click="fetchTestRecords"
                    >
                        <Icon :icon="loading ? 'mdi:loading' : 'mdi:magnify'" :class="{ 'internal-data-spin': loading }" />
                        <span>Search</span>
                    </button>
                </div>
            </section>
        </AppPanel>

        <div v-if="error" class="internal-data-notice internal-data-notice--error">
            <div>
                <strong>Search Error</strong>
                <p>{{ error }}</p>
            </div>
            <button type="button" @click="error = null">Dismiss</button>
        </div>

        <AppPanel
            v-if="groupedByISN.length > 0"
            eyebrow="Results"
            title="Internal Records"
            :description="`${groupedByISN.length} ISN group${groupedByISN.length === 1 ? '' : 's'} loaded.`"
            tone="warm"
            split-header
            compact-header
        >
            <template #header-aside>
                <span class="internal-data-context-pill internal-data-context-pill--cool">
                    {{ activeViewModeDescription }}
                </span>
            </template>

            <AppTabs v-model="activeISNTabKey" :items="isnTabItems" scrollable>
                <template v-for="(isnGroup, index) in groupedByISN" :key="isnGroup.isn" #[`panel-isn-${index}`]>
                    <section class="internal-data-result-pane">
                        <div class="internal-data-summary-bar">
                            <div class="internal-data-summary-grid">
                                <article class="internal-data-summary-card">
                                    <span>Site</span>
                                    <strong>{{ isnGroup.site_name }}</strong>
                                </article>
                                <article class="internal-data-summary-card">
                                    <span>Model</span>
                                    <strong>{{ isnGroup.model_name }}</strong>
                                </article>
                                <article class="internal-data-summary-card internal-data-summary-card--cool">
                                    <span>Stations</span>
                                    <strong>{{ isnGroup.record_data.length }}</strong>
                                </article>
                            </div>

                            <div class="internal-data-summary-ribbon">
                                <span class="internal-data-context-pill">{{ isnGroup.isn }}</span>
                                <span class="internal-data-context-pill internal-data-context-pill--cool">
                                    {{ getGroupRecordCount(isnGroup) }} total record{{ getGroupRecordCount(isnGroup) === 1 ? '' : 's' }}
                                </span>
                                <span class="internal-data-context-pill" :class="getGroupErrorCount(isnGroup) > 0 ? 'internal-data-context-pill--error' : 'internal-data-context-pill--success'">
                                    {{ getGroupErrorCount(isnGroup) }} failing record{{ getGroupErrorCount(isnGroup) === 1 ? '' : 's' }}
                                </span>
                            </div>

                            <div class="internal-data-view-toggle">
                                <button
                                    v-for="mode in viewModeOptions"
                                    :key="mode.value"
                                    type="button"
                                    class="internal-data-view-toggle__button"
                                    :class="{ 'internal-data-view-toggle__button--active': viewMode === mode.value }"
                                    @click="viewMode = mode.value"
                                >
                                    <Icon :icon="mode.icon" />
                                    <span>{{ mode.label }}</span>
                                </button>
                            </div>
                        </div>

                        <div v-if="viewMode === 'grid'" class="internal-data-grid">
                            <article
                                v-for="station in getSortedStations(isnGroup)"
                                :key="station.id"
                                class="internal-data-station-card"
                                :class="{ 'internal-data-station-card--alert': hasLatestError(station) }"
                            >
                                {{ initializeCarousel(station.id, station.data.length) }}
                                <header class="internal-data-station-card__header">
                                    <div>
                                        <h3>{{ station.name }}</h3>
                                        <p>{{ station.data.length }} record{{ station.data.length === 1 ? '' : 's' }} for {{ isnGroup.isn }}.</p>
                                    </div>
                                    <span
                                        class="internal-data-badge"
                                        :class="getErrorCount(station) > 0 ? 'internal-data-badge--error' : 'internal-data-badge--success'"
                                    >
                                        {{ getErrorCount(station) > 0 ? `${getErrorCount(station)} error(s)` : 'Latest pass' }}
                                    </span>
                                </header>

                                <div v-if="station.data.length > 1" class="internal-data-carousel-toolbar">
                                    <button type="button" class="internal-data-carousel-button" :disabled="getStationCarouselIndex(station) === 0" @click="setStationCarouselIndex(station, 0)">
                                        <Icon icon="mdi:page-first" />
                                    </button>
                                    <button type="button" class="internal-data-carousel-button" :disabled="getStationCarouselIndex(station) === 0" @click="setStationCarouselIndex(station, getStationCarouselIndex(station) - 1)">
                                        <Icon icon="mdi:chevron-left" />
                                    </button>
                                    <span class="internal-data-context-pill internal-data-context-pill--cool">
                                        Record {{ getStationCarouselIndex(station) + 1 }} / {{ station.data.length }}
                                    </span>
                                    <button type="button" class="internal-data-carousel-button" :disabled="getStationCarouselIndex(station) >= station.data.length - 1" @click="setStationCarouselIndex(station, getStationCarouselIndex(station) + 1)">
                                        <Icon icon="mdi:chevron-right" />
                                    </button>
                                    <button type="button" class="internal-data-carousel-button" :disabled="getStationCarouselIndex(station) >= station.data.length - 1" @click="setStationCarouselIndex(station, station.data.length - 1)">
                                        <Icon icon="mdi:page-last" />
                                    </button>
                                </div>

                                <div v-if="getActiveStationRecord(station)" class="internal-data-record-card" :class="getActiveStationRecord(station)!.test_result === 1 ? 'internal-data-record-card--success' : 'internal-data-record-card--error'">
                                    <div class="internal-data-record-header">
                                        <div class="internal-data-record-title">
                                            <span class="internal-data-record-icon" :class="getActiveStationRecord(station)!.test_result === 1 ? 'internal-data-record-icon--success' : 'internal-data-record-icon--error'">
                                                <Icon :icon="getActiveStationRecord(station)!.test_result === 1 ? 'mdi:check-circle' : 'mdi:alert-circle'" />
                                            </span>
                                            <div>
                                                <strong>{{ getActiveStationRecord(station)!.device_id__name }}</strong>
                                                <p>{{ getActiveStationRecord(station)!.dut_id__isn }}</p>
                                            </div>
                                        </div>
                                        <span class="internal-data-badge" :class="getActiveStationRecord(station)!.test_result === 1 ? 'internal-data-badge--success' : 'internal-data-badge--error'">
                                            {{ getActiveStationRecord(station)!.test_result === 1 ? 'PASS' : (getActiveStationRecord(station)!.error_item || 'FAIL') }}
                                        </span>
                                    </div>

                                    <div class="internal-data-record-meta">
                                        <span class="internal-data-context-pill">
                                            <Icon icon="mdi:barcode" />
                                            {{ getActiveStationRecord(station)!.dut_id__isn }}
                                        </span>
                                        <span class="internal-data-context-pill internal-data-context-pill--cool">
                                            <Icon icon="mdi:calendar" />
                                            {{ formatDate(getActiveStationRecord(station)!.test_date) }}
                                        </span>
                                        <span class="internal-data-context-pill">
                                            <Icon icon="mdi:timer" />
                                            {{ getActiveStationRecord(station)!.test_duration }}s
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        class="internal-data-button internal-data-button--primary internal-data-button--full"
                                        :disabled="downloadingRecordId === getActiveStationRecord(station)!.id"
                                        @click="handleDownload({ station, record: getActiveStationRecord(station)! })"
                                    >
                                        <Icon :icon="downloadingRecordId === getActiveStationRecord(station)!.id ? 'mdi:loading' : 'mdi:download'" :class="{ 'internal-data-spin': downloadingRecordId === getActiveStationRecord(station)!.id }" />
                                        <span>Download</span>
                                    </button>
                                </div>

                                <div v-else class="internal-data-empty-state">
                                    <Icon icon="mdi:database-off-outline" />
                                    <strong>No test records available</strong>
                                    <p>This station does not have downloadable results yet.</p>
                                </div>
                            </article>
                        </div>

                        <section v-if="viewMode === 'list'" class="internal-data-mode-stack">
                            <article v-for="station in getSortedStations(isnGroup)" :key="station.id" class="internal-data-section-card" :class="{ 'internal-data-section-card--alert': hasLatestError(station) }">
                                <header class="internal-data-section-card__header">
                                    <div>
                                        <h3>{{ station.name }}</h3>
                                        <p>{{ station.data.length }} record{{ station.data.length === 1 ? '' : 's' }} arranged as a chronological list.</p>
                                    </div>
                                    <div class="internal-data-section-card__meta">
                                        <span class="internal-data-badge" :class="getErrorCount(station) > 0 ? 'internal-data-badge--error' : 'internal-data-badge--success'">
                                            {{ getErrorCount(station) > 0 ? `${getErrorCount(station)} error(s)` : 'Latest pass' }}
                                        </span>
                                        <span class="internal-data-context-pill internal-data-context-pill--cool">{{ station.data.length }} record{{ station.data.length === 1 ? '' : 's' }}</span>
                                    </div>
                                </header>

                                <div v-if="station.data.length > 0" class="internal-data-list">
                                    <article v-for="record in getReversedData(station.data)" :key="record.id" class="internal-data-list-item" :class="record.test_result === 1 ? 'internal-data-list-item--success' : 'internal-data-list-item--error'">
                                        <div class="internal-data-list-item__summary">
                                            <span class="internal-data-record-icon" :class="record.test_result === 1 ? 'internal-data-record-icon--success' : 'internal-data-record-icon--error'">
                                                <Icon :icon="record.test_result === 1 ? 'mdi:check-circle' : 'mdi:alert-circle'" />
                                            </span>
                                            <div>
                                                <strong>{{ record.device_id__name }}</strong>
                                                <p>{{ record.dut_id__isn }}</p>
                                            </div>
                                        </div>
                                        <div class="internal-data-record-meta">
                                            <span class="internal-data-badge" :class="record.test_result === 1 ? 'internal-data-badge--success' : 'internal-data-badge--error'">{{ record.test_result === 1 ? 'PASS' : record.error_item || 'FAIL' }}</span>
                                            <span class="internal-data-context-pill"><Icon icon="mdi:timer" />{{ record.test_duration }}s</span>
                                            <span class="internal-data-context-pill internal-data-context-pill--cool"><Icon icon="mdi:calendar" />{{ formatDate(record.test_date) }}</span>
                                        </div>
                                        <button type="button" class="internal-data-button internal-data-button--primary" :disabled="downloadingRecordId === record.id" @click="handleDownload({ station, record })">
                                            <Icon :icon="downloadingRecordId === record.id ? 'mdi:loading' : 'mdi:download'" :class="{ 'internal-data-spin': downloadingRecordId === record.id }" />
                                            <span>Download</span>
                                        </button>
                                    </article>
                                </div>
                                <div v-else class="internal-data-empty-state">
                                    <Icon icon="mdi:database-off-outline" />
                                    <strong>No test records available</strong>
                                    <p>This station does not have list-mode results yet.</p>
                                </div>
                            </article>
                        </section>

                        <section v-if="viewMode === 'table'" class="internal-data-mode-stack">
                            <article v-for="station in getSortedStations(isnGroup)" :key="station.id" class="internal-data-section-card" :class="{ 'internal-data-section-card--alert': hasLatestError(station) }">
                                <header class="internal-data-section-card__header">
                                    <div>
                                        <h3>{{ station.name }}</h3>
                                        <p>Tabular audit view for all records captured at this station.</p>
                                    </div>
                                    <div class="internal-data-section-card__meta">
                                        <span class="internal-data-badge" :class="getErrorCount(station) > 0 ? 'internal-data-badge--error' : 'internal-data-badge--success'">
                                            {{ getErrorCount(station) > 0 ? `${getErrorCount(station)} error(s)` : 'Latest pass' }}
                                        </span>
                                        <span class="internal-data-context-pill internal-data-context-pill--cool">{{ station.data.length }} rows</span>
                                    </div>
                                </header>

                                <AppDataGrid
                                    v-if="station.data.length > 0"
                                    :columns="internalTableColumns"
                                    :rows="getStationTableRows(station)"
                                    data-key="id"
                                    :scrollable="true"
                                    scroll-height="20rem"
                                    :paginator="false"
                                    :table-style="{ minWidth: '52rem' }"
                                    empty-message="No records found."
                                >
                                    <template #cell-status="{ data }">
                                        <span class="internal-data-badge" :class="data.test_result === 1 ? 'internal-data-badge--success' : 'internal-data-badge--error'">
                                            {{ data.test_result === 1 ? 'PASS' : (data.error_item || 'FAIL') }}
                                        </span>
                                    </template>
                                    <template #cell-test_duration="{ data }">
                                        <span class="internal-data-context-pill">{{ data.test_duration }}s</span>
                                    </template>
                                    <template #cell-test_date="{ data }">
                                        <span class="internal-data-table-date">{{ formatDate(data.test_date) }}</span>
                                    </template>
                                    <template #cell-actions="{ data }">
                                        <button type="button" class="internal-data-table-action" :disabled="downloadingRecordId === data.id" @click="handleDownload({ station, record: data })">
                                            <Icon :icon="downloadingRecordId === data.id ? 'mdi:loading' : 'mdi:download'" :class="{ 'internal-data-spin': downloadingRecordId === data.id }" />
                                            <span>Download</span>
                                        </button>
                                    </template>
                                </AppDataGrid>
                                <div v-else class="internal-data-empty-state">
                                    <Icon icon="mdi:table-off" />
                                    <strong>No tabular records available</strong>
                                    <p>This station does not have table-mode results yet.</p>
                                </div>
                            </article>
                        </section>

                        <section v-if="viewMode === 'compact'" class="internal-data-mode-stack">
                            <article v-for="station in getSortedStations(isnGroup)" :key="station.id" class="internal-data-section-card" :class="{ 'internal-data-section-card--alert': hasLatestError(station) }">
                                <header class="internal-data-section-card__header">
                                    <div>
                                        <h3>{{ station.name }}</h3>
                                        <p>Compact cards keep the latest station context visible while scanning more records at once.</p>
                                    </div>
                                    <div class="internal-data-section-card__meta">
                                        <span class="internal-data-badge" :class="getErrorCount(station) > 0 ? 'internal-data-badge--error' : 'internal-data-badge--success'">
                                            {{ getErrorCount(station) > 0 ? `${getErrorCount(station)} error(s)` : 'Latest pass' }}
                                        </span>
                                        <span class="internal-data-context-pill internal-data-context-pill--cool">{{ station.data.length }} cards</span>
                                    </div>
                                </header>

                                <div v-if="station.data.length > 0" class="internal-data-compact-grid">
                                    <article v-for="record in station.data" :key="record.id" class="internal-data-compact-card" :class="record.test_result === 1 ? 'internal-data-compact-card--success' : 'internal-data-compact-card--error'">
                                        <div class="internal-data-compact-card__topline">
                                            <strong>{{ record.device_id__name }}</strong>
                                            <span class="internal-data-badge" :class="record.test_result === 1 ? 'internal-data-badge--success' : 'internal-data-badge--error'">
                                                {{ record.test_result === 1 ? 'PASS' : (record.error_item || 'FAIL') }}
                                            </span>
                                        </div>
                                        <p>{{ record.dut_id__isn }}</p>
                                        <div class="internal-data-record-meta">
                                            <span class="internal-data-context-pill internal-data-context-pill--cool"><Icon icon="mdi:calendar" />{{ formatDate(record.test_date) }}</span>
                                            <span class="internal-data-context-pill"><Icon icon="mdi:timer" />{{ record.test_duration }}s</span>
                                        </div>
                                        <button type="button" class="internal-data-button internal-data-button--primary internal-data-button--full" :disabled="downloadingRecordId === record.id" @click="handleDownload({ station, record })">
                                            <Icon :icon="downloadingRecordId === record.id ? 'mdi:loading' : 'mdi:download'" :class="{ 'internal-data-spin': downloadingRecordId === record.id }" />
                                            <span>Download</span>
                                        </button>
                                    </article>
                                </div>
                                <div v-else class="internal-data-empty-state">
                                    <Icon icon="mdi:view-compact-outline" />
                                    <strong>No compact records available</strong>
                                    <p>This station does not have compact-mode results yet.</p>
                                </div>
                            </article>
                        </section>
                    </section>
                </template>
            </AppTabs>
        </AppPanel>
    </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import apiClient from '@/core/api/client'
import { useNotification } from '@/shared/composables/useNotification'
import AppDataGrid from '@/shared/ui/data-grid/AppDataGrid.vue'
import AppPanel from '@/shared/ui/panel/AppPanel.vue'
import AppTabs from '@/shared/ui/tabs/AppTabs.vue'
import { getErrorStatus } from '@/shared/utils'

interface TestRecord {
  id: number
  test_date: string
  test_duration: number
  test_result: number
  error_item: string
  device_id: number
  device_id__name: string
  dut_id: number
  dut_id__isn: string
  site_name: string
}

interface Station {
  id: number
  name: string
  status: number
  order: number
  model_id: number
  site_name: string
  model_name: string
  data: TestRecord[]
  dut_isn: string
  dut_id: number
}

interface TestRecordsResponse {
  site_name: string
  model_name: string
  record_data: Station[]
}

interface ISNGroupedRecords {
  isn: string
  site_name: string
  model_name: string
  record_data: Station[]
}

const dutIsn = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const testRecords = ref<TestRecordsResponse | null>(null)
const groupedByISN = ref<ISNGroupedRecords[]>([])
const fetchedISNs = ref<string[]>([])
const downloadingRecordId = ref<number | null>(null)
const viewMode = ref<'grid' | 'list' | 'table' | 'compact'>('grid')
const activeISNTab = ref(0)
const inputMode = ref<'multiple' | 'bulk'>('multiple')
const selectedISNs = ref<string[]>([])
const multipleIsnSearchText = ref('')
const carouselModels = ref<Record<number, number>>({})
const { showSuccess: showSuccessNotification } = useNotification()

const activeISNTabKey = computed({
    get: () => `isn-${activeISNTab.value}`,
    set: (value: string) => {
        const match = value.match(/^isn-(\d+)$/)
        activeISNTab.value = match ? Number(match[1]) : 0
    },
})

const isnTabItems = computed(() => {
    return groupedByISN.value.map((group, index) => ({
        value: `isn-${index}`,
        label: group.isn,
        icon: 'mdi:barcode',
    }))
})

const viewModeOptions = [
    { value: 'grid' as const, label: 'Grid', icon: 'mdi:view-grid' },
    { value: 'list' as const, label: 'List', icon: 'mdi:view-list' },
    { value: 'table' as const, label: 'Table', icon: 'mdi:table' },
    { value: 'compact' as const, label: 'Compact', icon: 'mdi:view-compact' },
]

const activeViewModeDescription = computed(() => {
    switch (viewMode.value) {
        case 'grid':
            return 'Grid mode highlights one active record per station.'
        case 'list':
            return 'List mode keeps every record visible without collapsible shells.'
        case 'table':
            return 'Table mode uses the shared grid wrapper for requirement comparison.'
        case 'compact':
            return 'Compact mode scans dense station cards without expansion panels.'
        default:
            return ''
    }
})

const bulkModeIdentifiers = computed(() => parseBulkIdentifiers(dutIsn.value))

const multipleModeIdentifiers = computed(() =>
    normalizeIdentifierList([
        ...selectedISNs.value.map((value) => String(value)),
        multipleIsnSearchText.value,
    ]),
)

const hasSearchState = computed(() => {
    return (
        groupedByISN.value.length > 0 ||
        testRecords.value !== null ||
        multipleModeIdentifiers.value.length > 0 ||
        parseBulkIdentifiers(dutIsn.value).length > 0
    )
})

// Table headers for table view
const tableHeaders = [
  { title: 'Record', key: 'record_number', sortable: true },
  { title: 'Device', key: 'device_id__name', sortable: true },
  { title: 'DUT ISN', key: 'dut_id__isn', sortable: true },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Duration', key: 'test_duration', sortable: true },
  { title: 'Test Date', key: 'test_date', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
]

const internalTableColumns = [
    { key: 'record_number', header: 'Record', field: 'record_number' },
    { key: 'device_id__name', header: 'Device', field: 'device_id__name' },
    { key: 'dut_id__isn', header: 'DUT ISN', field: 'dut_id__isn' },
    { key: 'status', header: 'Status', field: 'status' },
    { key: 'test_duration', header: 'Duration', field: 'test_duration' },
    { key: 'test_date', header: 'Test Date', field: 'test_date' },
    { key: 'actions', header: 'Actions', field: 'actions' },
]

const normalizeIdentifierList = (values: string[]): string[] => {
    const identifiers = new Set<string>()

    for (const value of values) {
        const trimmed = value.trim()
        if (trimmed) {
            identifiers.add(trimmed)
        }
    }

    return Array.from(identifiers)
}

const parseBulkIdentifiers = (input: string): string[] => {
    return normalizeIdentifierList(input.split(/[\n,\s]+/))
}

const getCurrentInputIdentifiers = (): string[] => {
    if (inputMode.value === 'multiple') {
        return multipleModeIdentifiers.value
    }

    return parseBulkIdentifiers(dutIsn.value)
}

const commitPendingMultipleIdentifier = () => {
    const candidate = multipleIsnSearchText.value.trim()

    if (!candidate) {
        return
    }

    if (!selectedISNs.value.includes(candidate)) {
        selectedISNs.value = [...selectedISNs.value, candidate]
    }

    multipleIsnSearchText.value = ''
}

const removeSelectedISN = (identifier: string) => {
    selectedISNs.value = selectedISNs.value.filter((value) => value !== identifier)
}

const submitMultipleSearch = async () => {
    if (multipleIsnSearchText.value.trim()) {
        commitPendingMultipleIdentifier()
    }

    await fetchTestRecords()
}

const handleMultipleInputKeydown = async (event: KeyboardEvent) => {
    if (event.key === ',' || event.key === 'Enter') {
        if (loading.value) {
            event.preventDefault()
            return
        }

        if (multipleIsnSearchText.value.trim()) {
            event.preventDefault()
            commitPendingMultipleIdentifier()
            return
        }
    }

    if (event.key === 'Backspace' && !multipleIsnSearchText.value.trim() && selectedISNs.value.length > 0) {
        selectedISNs.value = selectedISNs.value.slice(0, -1)
    }

    if (event.key === 'Enter' && multipleModeIdentifiers.value.length > 0) {
        event.preventDefault()
        await fetchTestRecords()
    }
}

const handleMultipleIsnsEnter = async (event: KeyboardEvent) => {
    if (loading.value) {
        event.preventDefault()
        return
    }

    if (multipleIsnSearchText.value.trim()) {
        return
    }

    if (multipleModeIdentifiers.value.length === 0) {
        return
    }

    event.preventDefault()
    await fetchTestRecords()
}

const fetchTestRecords = async () => {
    const isnList = getCurrentInputIdentifiers()

  if (isnList.length === 0) {
    error.value = 'Please enter at least one valid ISN'
    return
  }

  loading.value = true
  error.value = null

  try {
    // Fetch all ISNs in parallel
    const responses = await Promise.all(
      isnList.map((isn) =>
        apiClient
          .get<TestRecordsResponse>(`/api/dut/records/${isn}`)
          .then((response) => ({ isn, data: response.data, success: true }))
          .catch((err) => {
            console.warn(`Failed to fetch records for ISN ${isn}:`, err)
            return { isn, data: null, success: false }
          }),
      ),
    )

    // Separate successful responses
    const validResponses = responses.filter((r) => r.success && r.data)

    if (validResponses.length === 0) {
      throw new Error('Failed to fetch records for all ISNs')
    }

    // Store fetched ISNs for reference
    fetchedISNs.value = isnList

    // Group results by ISN
    groupedByISN.value = validResponses.map((response) => ({
      isn: response.isn,
      site_name: response.data?.site_name ?? '',
      model_name: response.data?.model_name ?? '',
      record_data: response.data?.record_data ?? [],
    }))

    // Use first response for backward compatibility (testRecords still used in template)
    const firstValid = validResponses[0]
    if (!firstValid || !firstValid.data) {
      throw new Error('No valid data in response')
    }
    testRecords.value = firstValid.data
  } catch (err: unknown) {
    // Show user-friendly error message
    if (getErrorStatus(err) === 400) {
      error.value = 'Invalid ISN or no records found. Please check the ISN and try again.'
    } else if (getErrorStatus(err) === 404) {
      error.value = 'No test records found for the provided ISN.'
    } else if ((getErrorStatus(err) ?? 0) >= 500) {
      error.value = 'Server error. Please try again later.'
    } else {
      error.value = 'Failed to fetch test records. Please check your connection and try again.'
    }
    testRecords.value = null
  } finally {
    loading.value = false
  }
}

const handleDownload = async (downloadInfo: { station: Station; record: TestRecord }) => {
  downloadingRecordId.value = downloadInfo.record.id
  error.value = null

  try {
    const response = await apiClient.post(
      '/api/dut/test-log/download',
      {
        info_list: [
          {
            isn: downloadInfo.record.dut_id__isn,
            time: formatTimeForExternal2(downloadInfo.record.test_date),
            deviceid: downloadInfo.record.device_id__name,
            station: downloadInfo.station.name,
          },
        ],
        site: downloadInfo.station.site_name,
        project: downloadInfo.station.model_name,
      },
      { responseType: 'blob' },
    )

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url

    // Extract filename from Content-Disposition or use default
    const contentDisposition = response.headers['content-disposition']
    const defaultFilename = `${downloadInfo.record.dut_id__isn}_${downloadInfo.station.name}.zip`
    const filename = contentDisposition
      ? (contentDisposition.split('filename=')[1]?.replace(/"/g, '') ?? defaultFilename)
      : defaultFilename

    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)

        showSuccessNotification('Test log downloaded successfully!')
  } catch (err: unknown) {
    // Show user-friendly error message
    if (getErrorStatus(err) === 404) {
      error.value = 'Test log file not found. It may have been deleted or moved.'
    } else if ((getErrorStatus(err) ?? 0) >= 500) {
      error.value = 'Server error while downloading. Please try again later.'
    } else {
      error.value = 'Failed to download test log. Please try again.'
    }
  } finally {
    downloadingRecordId.value = null
  }
}

const formatTimeForExternal2 = (isoDate: string): string => {
  // Convert UTC time to local timezone + 1 hour for UTC+7 (making it UTC+8)
  const date = new Date(isoDate)

  // Add 1 hour (3600000 ms) to the local time for UTC+7 timezone
  const adjustedDate = new Date(date.getTime() + 3600000)

  const year = adjustedDate.getFullYear()
  const month = String(adjustedDate.getMonth() + 1).padStart(2, '0')
  const day = String(adjustedDate.getDate()).padStart(2, '0')
  const hours = String(adjustedDate.getHours()).padStart(2, '0')
  const minutes = String(adjustedDate.getMinutes()).padStart(2, '0')
  const seconds = String(adjustedDate.getSeconds()).padStart(2, '0')

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

const formatDate = (isoDate: string): string => {
  return new Date(isoDate).toLocaleString()
}

// Clear all data
const clearAll = () => {
  dutIsn.value = ''
  selectedISNs.value = []
    multipleIsnSearchText.value = ''
  testRecords.value = null
  groupedByISN.value = []
  fetchedISNs.value = []
  error.value = null
}

// Helper to get sorted stations for an ISN group
const getSortedStations = (isnGroup: ISNGroupedRecords) => {
  return [...isnGroup.record_data].sort((a, b) => a.order - b.order)
}

const getGroupRecordCount = (isnGroup: ISNGroupedRecords): number => {
    return isnGroup.record_data.reduce((total, station) => total + station.data.length, 0)
}

const getGroupErrorCount = (isnGroup: ISNGroupedRecords): number => {
    return isnGroup.record_data.reduce((total, station) => total + getErrorCount(station), 0)
}

const getStationTableRows = (station: Station) => {
    return getReversedData(station.data).map((record, idx) => ({
        ...record,
        record_number: station.data.length - idx,
        status: record.test_result === 1 ? 'PASS' : (record.error_item || 'FAIL'),
        actions: 'download',
    }))
}

// Helper to get the latest record from a station
const getLatestRecord = (station: Station): TestRecord | null => {
  if (station.data.length === 0) return null
  return station.data[station.data.length - 1] || null
}

// Helper to initialize carousel at latest record for a station
const initializeCarousel = (stationId: number, dataLength: number) => {
  if (!(stationId in carouselModels.value) && dataLength > 1) {
    carouselModels.value[stationId] = dataLength - 1 // Start at last record
  }
}

const getStationCarouselIndex = (station: Station): number => {
    if (station.data.length <= 1) {
        return 0
    }

    const currentIndex = carouselModels.value[station.id]

    if (typeof currentIndex !== 'number') {
        return station.data.length - 1
    }

    return Math.min(Math.max(currentIndex, 0), station.data.length - 1)
}

const setStationCarouselIndex = (station: Station, index: number) => {
    if (station.data.length === 0) {
        return
    }

    carouselModels.value[station.id] = Math.min(Math.max(index, 0), station.data.length - 1)
}

const getActiveStationRecord = (station: Station): TestRecord | null => {
    if (station.data.length === 0) {
        return null
    }

    return station.data[getStationCarouselIndex(station)] || station.data[station.data.length - 1] || null
}

// Helper to get reversed data (latest first) for list and table views
const getReversedData = (data: TestRecord[]) => {
  return [...data].reverse()
}

// Helper to calculate error count for a station
const getErrorCount = (station: Station): number => {
  return station.data.filter((record) => record.test_result !== 1).length
}

// Helper to check if latest record has error
const hasLatestError = (station: Station): boolean => {
  if (station.data.length === 0) return false
  // Sort by test_date descending and check the first one
  const sortedData = [...station.data].sort(
    (a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime(),
  )
  const latestRecord = sortedData[0]
  return latestRecord ? latestRecord.test_result !== 1 : false
}
</script>

<style scoped>
.internal-data-shell,
.internal-data-result-pane {
    display: grid;
    gap: 1rem;
}

.internal-data-header-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.75rem;
    align-items: center;
}

.internal-data-button,
.internal-data-notice button,
.internal-data-mode-toggle__button,
.internal-data-view-toggle__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border: 1px solid transparent;
    border-radius: 999px;
    padding: 0.78rem 1rem;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
}

.internal-data-button:disabled,
.internal-data-mode-toggle__button:disabled,
.internal-data-view-toggle__button:disabled,
.internal-data-notice button:disabled {
    cursor: not-allowed;
    opacity: 0.65;
}

.internal-data-button--ghost {
    background: var(--app-surface);
    border-color: rgba(15, 118, 110, 0.16);
    color: var(--app-ink);
}

.internal-data-button--primary {
    background: var(--app-accent);
    border-color: var(--app-accent);
    color: white;
}

.internal-data-button--full {
    width: 100%;
}

.internal-data-mode-toggle,
.internal-data-view-toggle {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
}

.internal-data-mode-toggle__button,
.internal-data-view-toggle__button {
    background: var(--app-panel);
    border-color: var(--app-border);
    color: var(--app-muted);
}

.internal-data-mode-toggle__button--active,
.internal-data-view-toggle__button--active {
    background: var(--app-accent-soft);
    border-color: rgba(15, 118, 110, 0.24);
    color: var(--app-accent);
}

.internal-data-notice {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    border-radius: 0.7rem;
    padding: 0.9rem 1rem;
}

.internal-data-notice--error {
    border: 1px solid var(--app-danger-line);
    background: var(--app-danger-soft);
}

.internal-data-notice strong {
    color: var(--app-danger);
}

.internal-data-notice p {
    margin: 0.35rem 0 0;
    color: var(--app-muted);
    line-height: 1.55;
}

.internal-data-input-shell,
.internal-data-summary-ribbon,
.internal-data-record-meta,
.internal-data-chip-list,
.internal-data-bulk-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.internal-data-input-shell {
    flex-direction: column;
}

.internal-data-input-card {
    display: grid;
    gap: 0.85rem;
    border: 1px solid var(--app-border);
    border-radius: 0.9rem;
    padding: 0.9rem;
    background: var(--app-panel);
}

.internal-data-input-card--textarea {
    min-height: 12rem;
}

.internal-data-input-label {
    color: var(--app-ink);
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: none;
}

.internal-data-input-row {
    display: grid;
    gap: 0.75rem;
    align-items: center;
    grid-template-columns: auto minmax(0, 1fr) auto;
}

.internal-data-input-icon {
    font-size: 1.2rem;
    color: var(--app-info);
}

.internal-data-text-input,
.internal-data-textarea {
    width: 100%;
    border: 1px solid var(--app-border);
    border-radius: 0.75rem;
    padding: 0.75rem 0.82rem;
    background: var(--app-panel-strong);
    color: var(--app-ink);
    font: inherit;
}

.internal-data-text-input:focus,
.internal-data-textarea:focus {
    outline: 1px solid rgba(15, 118, 110, 0.28);
    outline-offset: 0;
}

.internal-data-textarea {
    min-height: 10.5rem;
    resize: vertical;
}

.internal-data-helper-copy {
    margin: 0;
    color: var(--app-muted);
    line-height: 1.55;
}

.internal-data-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: 1px solid var(--app-info-line);
    border-radius: 999px;
    padding: 0.45rem 0.75rem;
    background: var(--app-info-soft);
    color: var(--app-info);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
}

.internal-data-chip--draft {
    cursor: default;
    background: var(--app-panel-strong);
    border-color: var(--app-border);
    color: var(--app-muted);
}

.internal-data-context-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    border-radius: 999px;
    padding: 0.42rem 0.78rem;
    background: var(--app-info-soft);
    color: var(--app-info);
    font-size: 0.78rem;
    font-weight: 800;
}

.internal-data-context-pill--cool {
    background: var(--app-info-soft);
    color: var(--app-info);
}

.internal-data-context-pill--success {
    background: var(--app-success-soft);
    color: var(--app-success);
}

.internal-data-context-pill--error {
    background: var(--app-danger-soft);
    color: var(--app-danger);
}

.internal-data-summary-bar {
    display: grid;
    gap: 1rem;
}

.internal-data-summary-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
}

.internal-data-summary-card {
    display: grid;
    gap: 0.3rem;
    border: 1px solid var(--app-border);
    border-radius: 0.8rem;
    padding: 0.85rem 0.9rem;
    background: var(--app-panel);
}

.internal-data-summary-card--cool {
    border-color: var(--app-info-line);
}

.internal-data-summary-card span {
    color: var(--app-muted);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: none;
}

.internal-data-summary-card strong {
    color: var(--app-ink);
}

.internal-data-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
}

.internal-data-mode-stack {
    display: grid;
    gap: 1rem;
}

.internal-data-section-card {
    display: grid;
    gap: 1rem;
    border: 1px solid var(--app-border);
    border-radius: 1.25rem;
    padding: 1rem;
    background: var(--app-panel);
}

.internal-data-section-card--alert {
    border-color: var(--app-danger-line);
}

.internal-data-section-card__header,
.internal-data-section-card__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: space-between;
    align-items: flex-start;
}

.internal-data-station-card {
    display: grid;
    gap: 1rem;
    border: 1px solid var(--app-border);
    border-radius: 0.9rem;
    padding: 0.9rem;
    background: var(--app-panel);
}

.internal-data-station-card--alert {
    border-color: var(--app-danger-line);
}

.internal-data-station-card__header,
.internal-data-record-header {
    display: flex;
    justify-content: space-between;
    gap: 0.9rem;
    align-items: flex-start;
}

.internal-data-station-card__header h3,
.internal-data-record-title strong {
    margin: 0;
    color: var(--app-ink);
}

.internal-data-station-card__header p,
.internal-data-record-title p,
.internal-data-empty-state p,
.internal-data-compact-card p,
.internal-data-list-item__summary p {
    margin: 0.3rem 0 0;
    color: var(--app-muted);
    line-height: 1.5;
}

.internal-data-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    padding: 0.38rem 0.7rem;
    font-size: 0.76rem;
    font-weight: 800;
    white-space: nowrap;
}

.internal-data-badge--success {
    background: var(--app-success-soft);
    color: var(--app-success);
}

.internal-data-badge--error {
    background: var(--app-danger-soft);
    color: var(--app-danger);
}

.internal-data-carousel-toolbar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.6rem;
    padding: 0.2rem;
}

.internal-data-carousel-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--app-border);
    border-radius: 999px;
    background: var(--app-panel);
    color: var(--app-ink);
    cursor: pointer;
}

.internal-data-carousel-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.internal-data-record-card {
    display: grid;
    gap: 1rem;
    border-radius: 0.8rem;
    padding: 0.9rem;
}

.internal-data-record-card--success {
    border: 1px solid var(--app-success-line);
    background: var(--app-panel);
}

.internal-data-record-card--error {
    border: 1px solid var(--app-danger-line);
    background: var(--app-panel);
}

.internal-data-record-title {
    display: flex;
    gap: 0.75rem;
}

.internal-data-record-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 999px;
    font-size: 1.2rem;
}

.internal-data-record-icon--success {
    background: var(--app-success-soft);
    color: var(--app-success);
}

.internal-data-record-icon--error {
    background: var(--app-danger-soft);
    color: var(--app-danger);
}

.internal-data-empty-state {
    display: grid;
    justify-items: center;
    gap: 0.45rem;
    padding: 1.4rem 1rem;
    border: 1px dashed var(--app-border);
    border-radius: 1rem;
    text-align: center;
    color: var(--app-muted);
}

.internal-data-empty-state strong {
    color: var(--app-ink);
}

.internal-data-spin {
    animation: internal-data-spin 0.9s linear infinite;
}

.internal-data-list {
    display: grid;
    gap: 0.8rem;
}

.internal-data-list-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.85rem;
    align-items: center;
    border-radius: 0.8rem;
    padding: 0.8rem 0.9rem;
}

.internal-data-list-item--success {
    background: rgba(240, 253, 246, 0.92);
}

.internal-data-list-item--error {
    background: rgba(254, 242, 242, 0.92);
}

.internal-data-list-item__summary {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
}

.internal-data-table-date {
    color: var(--app-muted);
    white-space: nowrap;
}

.internal-data-table-action {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    border: 1px solid rgba(15, 118, 110, 0.16);
    border-radius: 999px;
    padding: 0.42rem 0.78rem;
    background: rgba(15, 118, 110, 0.1);
    color: var(--app-accent);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
}

.internal-data-table-action:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.internal-data-compact-grid {
    display: grid;
    gap: 0.85rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.internal-data-compact-card {
    display: grid;
    gap: 0.75rem;
    border-radius: 0.8rem;
    padding: 0.8rem;
}

.internal-data-compact-card--success {
    background: rgba(240, 253, 246, 0.92);
}

.internal-data-compact-card--error {
    background: rgba(254, 242, 242, 0.92);
}

.internal-data-compact-card__topline {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    justify-content: space-between;
}

.gap-2 {
    gap: 0.5rem;
}

.gap-3 {
    gap: 0.75rem;
}

.gap-4 {
    gap: 1rem;
}

.w-100 {
    width: 100%;
}

.border-b {
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

@keyframes internal-data-spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 960px) {
    .internal-data-summary-grid {
        grid-template-columns: 1fr;
    }

    .internal-data-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 720px) {
    .internal-data-notice {
        flex-direction: column;
        align-items: stretch;
    }

    .internal-data-input-row,
    .internal-data-station-card__header,
    .internal-data-record-header,
    .internal-data-list-item,
    .internal-data-section-card__header,
    .internal-data-section-card__meta,
    .internal-data-compact-card__topline {
        flex-direction: column;
    }

    .internal-data-input-row {
        display: grid;
        grid-template-columns: 1fr;
    }
}
</style>
