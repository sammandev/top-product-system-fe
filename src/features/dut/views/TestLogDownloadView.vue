<template>
    <DefaultLayout>
        <div class="test-log-view">
            <header class="test-log-view__header">
                <div class="test-log-view__header-copy">
                    <div class="test-log-view__header-icon">
                        <Icon icon="mdi:download-box" />
                    </div>
                    <div>
                        <p class="test-log-view__eyebrow">DUT Workspace</p>
                        <h1>Data Explorer Test Logs</h1>
                        <p>
                            Search one or more DUT identifiers, inspect the returned station runs, and download
                            test-log archives from the same workspace.
                        </p>
                    </div>
                </div>
            </header>

            <AppPanel
                eyebrow="Record Lookup"
                title="DUT ISN Search"
                description="Choose a single identifier, curate a short search set, or paste a bulk list before loading station records."
                tone="cool"
            >
                <form class="test-log-view__form" @submit.prevent="fetchTestRecords">
                    <div class="test-log-view__mode-toggle" role="tablist" aria-label="Input mode">
                        <button
                            v-for="mode in inputModeOptions"
                            :key="mode.value"
                            type="button"
                            class="test-log-view__mode-button"
                            :class="{ 'test-log-view__mode-button--active': inputMode === mode.value }"
                            :aria-pressed="inputMode === mode.value"
                            @click="inputMode = mode.value"
                        >
                            <Icon :icon="mode.icon" />
                            <span>{{ mode.label }}</span>
                        </button>
                    </div>

                    <div v-if="inputMode === 'single'" class="test-log-view__search-grid">
                        <label class="test-log-view__field">
                            <span>DUT ISN</span>
                            <input
                                v-model="dutIsn"
                                type="text"
                                autocomplete="off"
                                placeholder="e.g. 260884980003907 or DM2527470036123"
                                @keydown.enter.prevent="fetchTestRecords"
                            >
                            <small>Enter one DUT ISN to pull the latest station records.</small>
                        </label>

                        <div class="test-log-view__action-slot">
                            <button
                                type="submit"
                                class="test-log-view__button test-log-view__button--primary"
                                :disabled="loading || !dutIsn.trim()"
                            >
                                <Icon :icon="loading ? 'mdi:loading' : 'mdi:magnify'" :class="{ 'test-log-view__spin': loading }" />
                                <span>{{ loading ? 'Searching...' : 'Search' }}</span>
                            </button>
                        </div>
                    </div>

                    <div v-else-if="inputMode === 'multiple'" class="test-log-view__multi-shell">
                        <label class="test-log-view__field">
                            <span>DUT ISNs</span>
                            <div class="test-log-view__token-entry">
                                <input
                                    v-model="pendingSelectedIsnInput"
                                    type="text"
                                    autocomplete="off"
                                    placeholder="Type an ISN, then press Enter, comma, or Tab"
                                    @keydown="handleSelectedIsnKeydown"
                                    @blur="commitSelectedIsns()"
                                >
                                <button type="button" class="test-log-view__button test-log-view__button--ghost" @click="commitSelectedIsns()">
                                    Add
                                </button>
                            </div>
                            <small>Build a short list before firing the search request.</small>
                        </label>

                        <div v-if="selectedISNs.length > 0" class="test-log-view__token-list">
                            <button
                                v-for="isn in selectedISNs"
                                :key="isn"
                                type="button"
                                class="test-log-view__token"
                                @click="removeSelectedISN(isn)"
                            >
                                <span>{{ isn }}</span>
                                <Icon icon="mdi:close" />
                            </button>
                        </div>

                        <div class="test-log-view__action-row">
                            <button
                                type="submit"
                                class="test-log-view__button test-log-view__button--primary"
                                :disabled="loading || selectedISNs.length === 0"
                            >
                                <Icon :icon="loading ? 'mdi:loading' : 'mdi:magnify'" :class="{ 'test-log-view__spin': loading }" />
                                <span>{{ loading ? 'Searching...' : 'Search Selected ISNs' }}</span>
                            </button>
                        </div>
                    </div>

                    <div v-else class="test-log-view__bulk-shell">
                        <label class="test-log-view__field">
                            <span>Bulk ISN Input</span>
                            <textarea
                                v-model="dutIsn"
                                rows="6"
                                placeholder="Paste multiple ISNs separated by new lines, commas, or spaces"
                            />
                            <small>Good for long copy-paste blocks from another system or spreadsheet.</small>
                        </label>

                        <div class="test-log-view__action-row">
                            <button
                                type="submit"
                                class="test-log-view__button test-log-view__button--primary"
                                :disabled="loading || !dutIsn.trim()"
                            >
                                <Icon :icon="loading ? 'mdi:loading' : 'mdi:magnify'" :class="{ 'test-log-view__spin': loading }" />
                                <span>{{ loading ? 'Searching...' : 'Search Bulk Input' }}</span>
                            </button>
                        </div>
                    </div>

                    <div v-if="hasSearchState" class="test-log-view__secondary-actions">
                        <button
                            type="button"
                            class="test-log-view__button test-log-view__button--ghost"
                            :disabled="loading"
                            @click="clearAll"
                        >
                            <Icon icon="mdi:close-circle-outline" />
                            <span>Clear All</span>
                        </button>
                    </div>
                </form>
            </AppPanel>

            <div v-if="error" class="test-log-view__notice test-log-view__notice--error">
                <div>
                    <strong>Search error</strong>
                    <p>{{ error }}</p>
                </div>
                <button type="button" @click="error = null">Dismiss</button>
            </div>

            <AppPanel
                v-if="groupedByISN.length > 0"
                eyebrow="Search Results"
                title="Test Records Results"
                :description="resultsDescription"
                tone="warm"
                split-header
                compact-header
            >
                <template #header-aside>
                    <button type="button" class="test-log-view__button test-log-view__button--ghost" @click="toggleExpandAll">
                        <Icon :icon="allExpanded ? 'mdi:arrow-collapse-vertical' : 'mdi:arrow-expand-vertical'" />
                        <span>{{ allExpanded ? 'Collapse All' : 'Expand All' }}</span>
                    </button>
                </template>

                <AppTabs v-model="activeISNTab" :items="isnTabItems" scrollable>
                    <template v-for="(isnGroup, index) in groupedByISN" :key="isnGroup.isn" #[`panel-${index}`]>
                        <section class="test-log-view__result-pane">
                            <div class="test-log-view__summary-row">
                                <div class="test-log-view__summary-grid">
                                    <article class="test-log-view__summary-card">
                                        <span>Site</span>
                                        <strong>{{ isnGroup.site_name || 'Unknown' }}</strong>
                                    </article>
                                    <article class="test-log-view__summary-card test-log-view__summary-card--cool">
                                        <span>Model</span>
                                        <strong>{{ isnGroup.model_name || 'Unknown' }}</strong>
                                    </article>
                                    <article class="test-log-view__summary-card test-log-view__summary-card--accent">
                                        <span>Stations</span>
                                        <strong>{{ isnGroup.record_data.length }}</strong>
                                    </article>
                                </div>

                                <div class="test-log-view__view-toggle" role="tablist" aria-label="Result view mode">
                                    <button
                                        v-for="option in viewModeOptions"
                                        :key="option.value"
                                        type="button"
                                        class="test-log-view__view-button"
                                        :class="{ 'test-log-view__view-button--active': viewMode === option.value }"
                                        :aria-pressed="viewMode === option.value"
                                        @click="viewMode = option.value"
                                    >
                                        <Icon :icon="option.icon" />
                                        <span>{{ option.label }}</span>
                                    </button>
                                </div>
                            </div>

                            <div class="test-log-view__result-divider" />

                        <div v-if="viewMode === 'grid'" class="test-log-view__station-grid">
                            <article
                                v-for="station in getSortedStations(isnGroup)"
                                :key="getStationKey(isnGroup.isn, station)"
                                class="test-log-view__station-card"
                            >
                                <header class="test-log-view__station-card-header">
                                    <div>
                                        <p class="test-log-view__station-card-eyebrow">Station</p>
                                        <h3>{{ station.name }}</h3>
                                    </div>
                                    <div class="test-log-view__station-card-pills">
                                        <span class="test-log-view__pill test-log-view__pill--neutral">
                                            {{ station.data.length }} record{{ station.data.length === 1 ? '' : 's' }}
                                        </span>
                                        <span
                                            v-if="getErrorCount(station) > 0"
                                            class="test-log-view__pill test-log-view__pill--danger"
                                        >
                                            {{ getErrorCount(station) }} error(s)
                                        </span>
                                    </div>
                                </header>

                                <div v-if="station.data.length > 0" class="test-log-view__station-card-body">
                                    <div
                                        v-if="station.data.length > 1"
                                        class="test-log-view__carousel-controls"
                                    >
                                        <button
                                            type="button"
                                            class="test-log-view__carousel-button"
                                            :disabled="getStationRecordPosition(isnGroup.isn, station) === 0"
                                            @click="setStationRecordIndex(isnGroup.isn, station, 0)"
                                        >
                                            <Icon icon="mdi:page-first" />
                                        </button>
                                        <button
                                            type="button"
                                            class="test-log-view__carousel-button"
                                            :disabled="getStationRecordPosition(isnGroup.isn, station) === 0"
                                            @click="stepStationRecordIndex(isnGroup.isn, station, -1)"
                                        >
                                            <Icon icon="mdi:chevron-left" />
                                        </button>
                                        <span class="test-log-view__pill test-log-view__pill--cool">
                                            Record {{ getStationRecordPosition(isnGroup.isn, station) + 1 }} / {{ station.data.length }}
                                        </span>
                                        <button
                                            type="button"
                                            class="test-log-view__carousel-button"
                                            :disabled="getStationRecordPosition(isnGroup.isn, station) >= station.data.length - 1"
                                            @click="stepStationRecordIndex(isnGroup.isn, station, 1)"
                                        >
                                            <Icon icon="mdi:chevron-right" />
                                        </button>
                                        <button
                                            type="button"
                                            class="test-log-view__carousel-button"
                                            :disabled="getStationRecordPosition(isnGroup.isn, station) >= station.data.length - 1"
                                            @click="setStationRecordIndex(isnGroup.isn, station, station.data.length - 1)"
                                        >
                                            <Icon icon="mdi:page-last" />
                                        </button>
                                    </div>

                                    <article
                                        v-if="getStationRecord(isnGroup.isn, station)"
                                        class="test-log-view__record-card"
                                        :class="recordCardToneClass(getStationRecord(isnGroup.isn, station)!)"
                                    >
                                        <div class="test-log-view__record-card-header">
                                            <div class="test-log-view__record-card-device">
                                                <span class="test-log-view__record-icon" :class="recordIconToneClass(getStationRecord(isnGroup.isn, station)!)">
                                                    <Icon :icon="recordStatusIcon(getStationRecord(isnGroup.isn, station)!)" />
                                                </span>
                                                <div>
                                                    <strong>{{ getStationRecord(isnGroup.isn, station)!.device_id__name }}</strong>
                                                    <span>{{ getStationRecord(isnGroup.isn, station)!.dut_id__isn }}</span>
                                                </div>
                                            </div>
                                            <span class="test-log-view__pill" :class="recordPillToneClass(getStationRecord(isnGroup.isn, station)!)">
                                                {{ recordStatusLabel(getStationRecord(isnGroup.isn, station)!) }}
                                            </span>
                                        </div>

                                        <div class="test-log-view__record-meta">
                                            <span class="test-log-view__meta-pill">
                                                <Icon icon="mdi:calendar" />
                                                {{ formatDate(getStationRecord(isnGroup.isn, station)!.test_date) }}
                                            </span>
                                            <span class="test-log-view__meta-pill">
                                                <Icon icon="mdi:timer-outline" />
                                                {{ getStationRecord(isnGroup.isn, station)!.test_duration }}s
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            class="test-log-view__button test-log-view__button--primary test-log-view__button--block"
                                            :disabled="downloadingRecordId === getStationRecord(isnGroup.isn, station)!.id"
                                            @click="handleDownload({ station, record: getStationRecord(isnGroup.isn, station)! })"
                                        >
                                            <Icon :icon="downloadingRecordId === getStationRecord(isnGroup.isn, station)!.id ? 'mdi:loading' : 'mdi:download'" :class="{ 'test-log-view__spin': downloadingRecordId === getStationRecord(isnGroup.isn, station)!.id }" />
                                            <span>{{ downloadingRecordId === getStationRecord(isnGroup.isn, station)!.id ? 'Downloading...' : 'Download' }}</span>
                                        </button>
                                    </article>
                                </div>

                                <div v-else class="test-log-view__empty-state">
                                    <Icon icon="mdi:database-off-outline" />
                                    <div>
                                        <strong>No test records available</strong>
                                        <p>This station did not return any downloadable logs.</p>
                                    </div>
                                </div>
                            </article>
                        </div>

                        <div v-if="viewMode === 'list'" class="test-log-view__station-stack">
                            <article
                                v-for="station in getSortedStations(isnGroup)"
                                :key="getStationKey(isnGroup.isn, station)"
                                class="test-log-view__station-section"
                                :class="{ 'test-log-view__station-section--alert': hasLatestError(station) }"
                            >
                                <button
                                    type="button"
                                    class="test-log-view__station-section-toggle"
                                    @click="toggleStationExpanded(isnGroup.isn, station)"
                                >
                                    <div>
                                        <p class="test-log-view__station-card-eyebrow">Station</p>
                                        <strong>{{ station.name }}</strong>
                                    </div>
                                    <div class="test-log-view__station-section-meta">
                                        <span class="test-log-view__pill test-log-view__pill--neutral">
                                            {{ station.data.length }} record{{ station.data.length === 1 ? '' : 's' }}
                                        </span>
                                        <span
                                            v-if="getErrorCount(station) > 0"
                                            class="test-log-view__pill test-log-view__pill--danger"
                                        >
                                            {{ getErrorCount(station) }} error(s)
                                        </span>
                                        <Icon
                                            class="test-log-view__station-chevron"
                                            :class="{ 'test-log-view__station-chevron--open': isStationExpanded(isnGroup.isn, station) }"
                                            icon="mdi:chevron-down"
                                        />
                                    </div>
                                </button>

                                <div v-if="isStationExpanded(isnGroup.isn, station)" class="test-log-view__station-section-body">
                                    <div v-if="station.data.length > 0" class="test-log-view__record-list">
                                        <article
                                            v-for="record in getReversedData(station.data)"
                                            :key="record.id"
                                            class="test-log-view__record-row"
                                            :class="recordRowToneClass(record)"
                                        >
                                            <div class="test-log-view__record-row-copy">
                                                <span class="test-log-view__record-icon" :class="recordIconToneClass(record)">
                                                    <Icon :icon="recordStatusIcon(record)" />
                                                </span>
                                                <div>
                                                    <strong>{{ record.device_id__name }}</strong>
                                                    <p>{{ record.dut_id__isn }}</p>
                                                    <div class="test-log-view__record-meta">
                                                        <span class="test-log-view__pill" :class="recordPillToneClass(record)">
                                                            {{ recordStatusLabel(record) }}
                                                        </span>
                                                        <span class="test-log-view__meta-pill">
                                                            <Icon icon="mdi:timer-outline" />
                                                            {{ record.test_duration }}s
                                                        </span>
                                                        <span class="test-log-view__meta-pill">
                                                            <Icon icon="mdi:calendar" />
                                                            {{ formatDate(record.test_date) }}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                class="test-log-view__button test-log-view__button--ghost"
                                                :disabled="downloadingRecordId === record.id"
                                                @click="handleDownload({ station, record })"
                                            >
                                                <Icon :icon="downloadingRecordId === record.id ? 'mdi:loading' : 'mdi:download'" :class="{ 'test-log-view__spin': downloadingRecordId === record.id }" />
                                                <span>{{ downloadingRecordId === record.id ? 'Downloading...' : 'Download' }}</span>
                                            </button>
                                        </article>
                                    </div>
                                    <div v-else class="test-log-view__empty-state test-log-view__empty-state--inline">
                                        <Icon icon="mdi:database-off-outline" />
                                        <p>No test records available for this station.</p>
                                    </div>
                                </div>
                            </article>
                        </div>

                        <div v-if="viewMode === 'table'" class="test-log-view__station-stack">
                            <article
                                v-for="station in getSortedStations(isnGroup)"
                                :key="getStationKey(isnGroup.isn, station)"
                                class="test-log-view__station-section"
                                :class="{ 'test-log-view__station-section--alert': hasLatestError(station) }"
                            >
                                <button
                                    type="button"
                                    class="test-log-view__station-section-toggle"
                                    @click="toggleStationExpanded(isnGroup.isn, station)"
                                >
                                    <div>
                                        <p class="test-log-view__station-card-eyebrow">Station</p>
                                        <strong>{{ station.name }}</strong>
                                    </div>
                                    <div class="test-log-view__station-section-meta">
                                        <span class="test-log-view__pill test-log-view__pill--neutral">
                                            {{ station.data.length }} record{{ station.data.length === 1 ? '' : 's' }}
                                        </span>
                                        <span
                                            v-if="getErrorCount(station) > 0"
                                            class="test-log-view__pill test-log-view__pill--danger"
                                        >
                                            {{ getErrorCount(station) }} error(s)
                                        </span>
                                        <Icon
                                            class="test-log-view__station-chevron"
                                            :class="{ 'test-log-view__station-chevron--open': isStationExpanded(isnGroup.isn, station) }"
                                            icon="mdi:chevron-down"
                                        />
                                    </div>
                                </button>

                                <div v-if="isStationExpanded(isnGroup.isn, station)" class="test-log-view__station-section-body test-log-view__station-section-body--table">
                                    <AppDataGrid
                                        class="test-log-view__grid-table"
                                        :columns="tableColumns"
                                        :rows="getStationTableRows(station)"
                                        data-key="id"
                                        :paginator="false"
                                        :rows-per-page="station.data.length || 10"
                                        scroll-height="420px"
                                        :table-style="{ minWidth: '52rem' }"
                                    >
                                        <template #cell-status="{ data }">
                                            <span class="test-log-view__pill" :class="recordPillToneClass(data)">
                                                <Icon :icon="recordStatusIcon(data)" />
                                                {{ recordStatusLabel(data) }}
                                            </span>
                                        </template>

                                        <template #cell-test_duration="{ value }">
                                            {{ value }}s
                                        </template>

                                        <template #cell-test_date="{ value }">
                                            {{ formatDate(String(value)) }}
                                        </template>

                                        <template #cell-actions="{ data }">
                                            <button
                                                type="button"
                                                class="test-log-view__icon-action"
                                                :disabled="downloadingRecordId === data.id"
                                                @click="handleStationRecordDownload(station, data)"
                                            >
                                                <Icon :icon="downloadingRecordId === data.id ? 'mdi:loading' : 'mdi:download'" :class="{ 'test-log-view__spin': downloadingRecordId === data.id }" />
                                            </button>
                                        </template>
                                    </AppDataGrid>
                                </div>
                            </article>
                        </div>

                        <div v-if="viewMode === 'compact'" class="test-log-view__station-stack">
                            <article
                                v-for="station in getSortedStations(isnGroup)"
                                :key="getStationKey(isnGroup.isn, station)"
                                class="test-log-view__station-section"
                                :class="{ 'test-log-view__station-section--alert': hasLatestError(station) }"
                            >
                                <button
                                    type="button"
                                    class="test-log-view__station-section-toggle"
                                    @click="toggleCompactStationExpanded(index, isnGroup.isn, station)"
                                >
                                    <div>
                                        <p class="test-log-view__station-card-eyebrow">Station</p>
                                        <strong>{{ station.name }}</strong>
                                    </div>
                                    <div class="test-log-view__station-section-meta">
                                        <span class="test-log-view__pill test-log-view__pill--neutral">
                                            {{ station.data.length }} record{{ station.data.length === 1 ? '' : 's' }}
                                        </span>
                                        <span
                                            v-if="getErrorCount(station) > 0"
                                            class="test-log-view__pill test-log-view__pill--danger"
                                        >
                                            {{ getErrorCount(station) }} error(s)
                                        </span>
                                        <Icon
                                            class="test-log-view__station-chevron"
                                            :class="{ 'test-log-view__station-chevron--open': isCompactStationExpanded(index, isnGroup.isn, station) }"
                                            icon="mdi:chevron-down"
                                        />
                                    </div>
                                </button>

                                <div v-if="isCompactStationExpanded(index, isnGroup.isn, station)" class="test-log-view__station-section-body">
                                    <div v-if="station.data.length > 0" class="test-log-view__compact-grid">
                                        <article
                                            v-for="record in station.data"
                                            :key="record.id"
                                            class="test-log-view__compact-card"
                                            :class="recordCardToneClass(record)"
                                        >
                                            <div>
                                                <strong>{{ record.device_id__name }}</strong>
                                                <p>{{ record.dut_id__isn }}</p>
                                            </div>
                                            <span class="test-log-view__pill" :class="recordPillToneClass(record)">
                                                {{ recordStatusLabel(record) }}
                                            </span>
                                            <div class="test-log-view__record-meta">
                                                <span class="test-log-view__meta-pill">
                                                    <Icon icon="mdi:calendar" />
                                                    {{ formatDate(record.test_date) }}
                                                </span>
                                                <span class="test-log-view__meta-pill">
                                                    <Icon icon="mdi:timer-outline" />
                                                    {{ record.test_duration }}s
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                class="test-log-view__button test-log-view__button--ghost test-log-view__button--block"
                                                :disabled="downloadingRecordId === record.id"
                                                @click="handleDownload({ station, record })"
                                            >
                                                <Icon :icon="downloadingRecordId === record.id ? 'mdi:loading' : 'mdi:download'" :class="{ 'test-log-view__spin': downloadingRecordId === record.id }" />
                                                <span>{{ downloadingRecordId === record.id ? 'Downloading...' : 'Download' }}</span>
                                            </button>
                                        </article>
                                    </div>
                                    <div v-else class="test-log-view__empty-state test-log-view__empty-state--inline">
                                        <Icon icon="mdi:database-off-outline" />
                                        <p>No test records available for this station.</p>
                                    </div>
                                </div>
                            </article>
                        </div>
                        </section>
                    </template>
                </AppTabs>
            </AppPanel>
        </div>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import apiClient from '@/core/api/client'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
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
const expandedPanels = ref<string[]>([])
const activeISNTab = ref('0')
const inputMode = ref<'single' | 'multiple' | 'bulk'>('single')
const selectedISNs = ref<string[]>([])
const pendingSelectedIsnInput = ref('')
const carouselModels = ref<Record<string, number>>({})
const compactExpanded = ref<Record<number, string[]>>({})
const { showSuccess: showSuccessNotification } = useNotification()

const inputModeOptions = [
    { value: 'single' as const, label: 'Single ISN', icon: 'mdi:numeric-1-box' },
    { value: 'multiple' as const, label: 'Multiple ISNs', icon: 'mdi:format-list-bulleted' },
    { value: 'bulk' as const, label: 'Bulk Paste', icon: 'mdi:text-box-multiple' },
]

const viewModeOptions = [
    { value: 'grid' as const, label: 'Grid', icon: 'mdi:view-grid' },
    { value: 'list' as const, label: 'List', icon: 'mdi:view-list' },
    { value: 'table' as const, label: 'Table', icon: 'mdi:table' },
    { value: 'compact' as const, label: 'Compact', icon: 'mdi:view-compact' },
]

const tableColumns = [
    { key: 'record_number', header: 'Record', field: 'record_number', sortable: true },
    { key: 'device_id__name', header: 'Device', field: 'device_id__name', sortable: true },
    { key: 'dut_id__isn', header: 'DUT ISN', field: 'dut_id__isn', sortable: true },
    { key: 'status', header: 'Status', field: 'status' },
    { key: 'test_duration', header: 'Duration', field: 'test_duration', sortable: true },
    { key: 'test_date', header: 'Test Date', field: 'test_date', sortable: true },
    { key: 'actions', header: 'Actions', field: 'actions' },
]

const isnTabItems = computed(() =>
    groupedByISN.value.map((isnGroup, index) => ({
        value: String(index),
        label: isnGroup.isn,
        icon: 'mdi:barcode',
    })),
)

const hasSearchState = computed(() =>
    Boolean(dutIsn.value.trim() || selectedISNs.value.length || groupedByISN.value.length),
)

const resultsDescription = computed(() => {
    const isnCount = groupedByISN.value.length
    const stationCount = groupedByISN.value.reduce((sum, group) => sum + group.record_data.length, 0)
    return `${isnCount} DUT${isnCount === 1 ? '' : 's'} loaded across ${stationCount} station${stationCount === 1 ? '' : 's'}.`
})

const currentISNIndex = computed(() => {
    const parsed = Number(activeISNTab.value)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
})

const commitSelectedIsns = (rawInput: string = pendingSelectedIsnInput.value) => {
    const nextValues = rawInput
        .split(/[\n,\s]+/)
        .map((isn) => isn.trim())
        .filter((isn) => isn.length > 0)

    if (nextValues.length === 0) {
        pendingSelectedIsnInput.value = ''
        return
    }

    selectedISNs.value = Array.from(new Set([...selectedISNs.value, ...nextValues]))
    pendingSelectedIsnInput.value = ''
}

const handleSelectedIsnKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
        event.preventDefault()
        commitSelectedIsns()
    }
}

const removeSelectedISN = (isn: string) => {
    selectedISNs.value = selectedISNs.value.filter((item) => item !== isn)
}

const fetchTestRecords = async () => {
    // Determine ISN list based on input mode
    let isnList: string[] = []

    if (inputMode.value === 'multiple') {
        // Use selected ISNs from combobox
        isnList = selectedISNs.value.map((isn) => String(isn).trim()).filter((isn) => isn.length > 0)
    } else {
        // Parse from text input (single or bulk)
        if (!dutIsn.value.trim()) return
        isnList = dutIsn.value
            .split(/[\n,\s]+/)
            .map((isn) => isn.trim())
            .filter((isn) => isn && isn.length > 0)
    }

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
        activeISNTab.value = '0'
        compactExpanded.value = {}
        carouselModels.value = {}

        // Use first response for backward compatibility (testRecords still used in template)
        const firstValid = validResponses[0]
        if (!firstValid || !firstValid.data) {
            throw new Error('No valid data in response')
        }
        testRecords.value = firstValid.data

        // Auto-expand all panels - calculate total panels across all ISNs
        expandedPanels.value = groupedByISN.value.flatMap((group) => getStationKeys(group))
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
        groupedByISN.value = []
        activeISNTab.value = '0'
        compactExpanded.value = {}
        carouselModels.value = {}
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
    // Example: "2025-11-17T06:00:24Z" (UTC+0) -> "2025/11/17 14:00:24" (UTC+7+1)
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
    pendingSelectedIsnInput.value = ''
    testRecords.value = null
    groupedByISN.value = []
    fetchedISNs.value = []
    error.value = null
    expandedPanels.value = []
    activeISNTab.value = '0'
    compactExpanded.value = {}
    carouselModels.value = {}
}

// Helper to get sorted stations for an ISN group
const getSortedStations = (isnGroup: ISNGroupedRecords) => {
    return [...isnGroup.record_data].sort((a, b) => a.order - b.order)
}

const getStationKey = (isn: string, station: Station) => `${isn}:${station.id}`

const getStationKeys = (isnGroup: ISNGroupedRecords) =>
    getSortedStations(isnGroup).map((station) => getStationKey(isnGroup.isn, station))

const isSuccessfulRecord = (record: TestRecord) => record.test_result === 1

const recordStatusLabel = (record: TestRecord) =>
    isSuccessfulRecord(record) ? 'PASS' : record.error_item || 'FAIL'

const recordStatusIcon = (record: TestRecord) =>
    isSuccessfulRecord(record) ? 'mdi:check-circle' : 'mdi:alert-circle'

const recordPillToneClass = (record: TestRecord) =>
    isSuccessfulRecord(record) ? 'test-log-view__pill--success' : 'test-log-view__pill--danger'

const recordIconToneClass = (record: TestRecord) =>
    isSuccessfulRecord(record) ? 'test-log-view__record-icon--success' : 'test-log-view__record-icon--danger'

const recordCardToneClass = (record: TestRecord) =>
    isSuccessfulRecord(record) ? 'test-log-view__record-card--success' : 'test-log-view__record-card--danger'

const recordRowToneClass = (record: TestRecord) =>
    isSuccessfulRecord(record) ? 'test-log-view__record-row--success' : 'test-log-view__record-row--danger'

const getStationRecordPosition = (isn: string, station: Station) => {
    if (station.data.length === 0) {
        return 0
    }

    const stationKey = getStationKey(isn, station)
    const fallbackIndex = station.data.length - 1
    const currentIndex = carouselModels.value[stationKey] ?? fallbackIndex
    const clampedIndex = Math.min(Math.max(currentIndex, 0), fallbackIndex)

    if (carouselModels.value[stationKey] !== clampedIndex) {
        carouselModels.value[stationKey] = clampedIndex
    }

    return clampedIndex
}

const setStationRecordIndex = (isn: string, station: Station, nextIndex: number) => {
    if (station.data.length === 0) {
        return
    }

    const stationKey = getStationKey(isn, station)
    const maxIndex = station.data.length - 1
    carouselModels.value[stationKey] = Math.min(Math.max(nextIndex, 0), maxIndex)
}

const stepStationRecordIndex = (isn: string, station: Station, delta: number) => {
    setStationRecordIndex(isn, station, getStationRecordPosition(isn, station) + delta)
}

const getStationRecord = (isn: string, station: Station): TestRecord | null => {
    if (station.data.length === 0) {
        return null
    }

    return station.data[getStationRecordPosition(isn, station)] || null
}

// Helper to get reversed data (latest first) for list and table views
const getReversedData = (data: TestRecord[]) => {
    return [...data].reverse()
}

const getStationTableRows = (station: Station) => {
    return getReversedData(station.data).map((record, index) => ({
        ...record,
        record_number: station.data.length - index,
    }))
}

const isStationExpanded = (isn: string, station: Station) =>
    expandedPanels.value.includes(getStationKey(isn, station))

const toggleStationExpanded = (isn: string, station: Station) => {
    const stationKey = getStationKey(isn, station)

    expandedPanels.value = expandedPanels.value.includes(stationKey)
        ? expandedPanels.value.filter((panel) => panel !== stationKey)
        : [...expandedPanels.value, stationKey]
}

const isCompactStationExpanded = (groupIndex: number, isn: string, station: Station) =>
    (compactExpanded.value[groupIndex] || []).includes(getStationKey(isn, station))

const toggleCompactStationExpanded = (groupIndex: number, isn: string, station: Station) => {
    const stationKey = getStationKey(isn, station)
    const currentExpanded = compactExpanded.value[groupIndex] || []

    compactExpanded.value[groupIndex] = currentExpanded.includes(stationKey)
        ? currentExpanded.filter((panel) => panel !== stationKey)
        : [...currentExpanded, stationKey]
}

const handleStationRecordDownload = (station: Station, row: Record<string, unknown>) => {
    handleDownload({ station, record: row as unknown as TestRecord })
}

// Expand/Collapse all panels
const expandAll = () => {
    expandedPanels.value = groupedByISN.value.flatMap((group) => getStationKeys(group))
    compactExpanded.value = Object.fromEntries(
        groupedByISN.value.map((group, index) => [index, getStationKeys(group)]),
    )
}

const collapseAll = () => {
    expandedPanels.value = []
    compactExpanded.value = {}
}

// Computed to check if all panels are expanded
const allExpanded = computed(() => {
    if (viewMode.value === 'compact') {
        const currentISN = currentISNIndex.value
        const isnGroup = groupedByISN.value[currentISN]
        if (!isnGroup) return false

        const stationKeys = getStationKeys(isnGroup)
        const currentExpanded = compactExpanded.value[currentISN] || []
        return currentExpanded.length === stationKeys.length && stationKeys.length > 0
    } else {
        const totalPanels = groupedByISN.value.flatMap((group) => getStationKeys(group))
        return expandedPanels.value.length === totalPanels.length && totalPanels.length > 0
    }
})

// Toggle between expand and collapse all
const toggleExpandAll = () => {
    if (viewMode.value === 'compact') {
        // For compact view, toggle expansion per ISN tab
        const currentISN = currentISNIndex.value
        const isnGroup = groupedByISN.value[currentISN]
        if (!isnGroup) return

        const stationKeys = getStationKeys(isnGroup)
        const currentExpanded = compactExpanded.value[currentISN] || []

        if (currentExpanded.length === stationKeys.length) {
            compactExpanded.value[currentISN] = []
        } else {
            compactExpanded.value[currentISN] = stationKeys
        }
    } else {
        // For list/table views
        if (allExpanded.value) {
            collapseAll()
        } else {
            expandAll()
        }
    }
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
.test-log-view {
    display: grid;
    gap: 1.5rem;
}

.test-log-view__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
}

.test-log-view__header-copy {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
}

.test-log-view__header-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 0.75rem;
    background: var(--app-panel-strong);
    color: var(--app-info);
    font-size: 1.6rem;
    box-shadow: none;
}

.test-log-view__eyebrow {
    margin: 0 0 0.35rem;
    color: var(--app-accent);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: none;
}

.test-log-view__header h1 {
    margin: 0;
    color: var(--app-ink);
    font-size: clamp(1.9rem, 3vw, 2.5rem);
}

.test-log-view__header p:last-child {
    max-width: 48rem;
    margin: 0.45rem 0 0;
    color: var(--app-muted);
    line-height: 1.6;
}

.test-log-view__form {
    display: grid;
    gap: 1rem;
}

.test-log-view__mode-toggle,
.test-log-view__view-toggle {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.test-log-view__mode-button,
.test-log-view__view-button,
.test-log-view__button,
.test-log-view__token,
.test-log-view__icon-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    border: 1px solid var(--app-border);
    border-radius: 999px;
    background: var(--app-panel);
    color: var(--app-ink);
    font: inherit;
    cursor: pointer;
    transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease;
}

.test-log-view__mode-button,
.test-log-view__view-button,
.test-log-view__button,
.test-log-view__token {
    padding: 0.8rem 1rem;
}

.test-log-view__mode-button:hover,
.test-log-view__view-button:hover,
.test-log-view__button:hover,
.test-log-view__token:hover,
.test-log-view__icon-action:hover {
    border-color: rgba(15, 118, 110, 0.45);
}

.test-log-view__mode-button--active,
.test-log-view__view-button--active,
.test-log-view__button--primary {
    border-color: rgba(15, 118, 110, 0.28);
    background: var(--app-accent);
    color: var(--app-canvas);
}

.test-log-view__button--ghost {
    background: var(--app-panel);
    border-color: var(--app-border);
    color: var(--app-ink);
}

.test-log-view__search-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1rem;
    align-items: end;
}

.test-log-view__multi-shell,
.test-log-view__bulk-shell,
.test-log-view__result-pane {
    display: grid;
    gap: 1rem;
}

.test-log-view__field {
    display: grid;
    gap: 0.5rem;
}

.test-log-view__field > span {
    color: var(--app-ink);
    font-size: 0.9rem;
    font-weight: 700;
}

.test-log-view__field input,
.test-log-view__field textarea {
    width: 100%;
    border: 1px solid var(--app-border);
    border-radius: 1rem;
    background: var(--app-panel);
    color: var(--app-ink);
    padding: 0.95rem 1rem;
    font: inherit;
    box-sizing: border-box;
}

.test-log-view__field textarea {
    resize: vertical;
    min-height: 9rem;
}

.test-log-view__field small {
    color: var(--app-muted);
    line-height: 1.5;
}

.test-log-view__token-entry {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
}

.test-log-view__token-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
}

.test-log-view__token {
    padding-inline: 0.9rem;
    background: var(--app-info-soft);
    border-color: var(--app-info-line);
    color: var(--app-info);
}

.test-log-view__action-slot,
.test-log-view__action-row,
.test-log-view__secondary-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.test-log-view__notice {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    border: 1px solid var(--app-border);
    border-radius: 1.25rem;
    padding: 1rem 1.1rem;
}

.test-log-view__notice--error {
    border-color: var(--app-danger-line);
    background: var(--app-danger-soft);
}

.test-log-view__notice strong {
    display: block;
    margin-bottom: 0.25rem;
    color: var(--app-danger);
}

.test-log-view__notice p {
    margin: 0;
    color: var(--app-muted);
}

.test-log-view__notice button {
    border: 0;
    background: transparent;
    color: var(--app-danger);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
}

.test-log-view__summary-row {
    display: grid;
    gap: 1rem;
}

.test-log-view__summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.85rem;
}

.test-log-view__summary-card {
    display: grid;
    gap: 0.25rem;
    padding: 0.95rem 1rem;
    border: 1px solid var(--app-border);
    border-radius: 1.15rem;
    background: var(--app-panel);
}

.test-log-view__summary-card span {
    color: var(--app-muted);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: none;
}

.test-log-view__summary-card strong {
    color: var(--app-ink);
    font-size: 1rem;
}

.test-log-view__summary-card--cool {
    border-color: var(--app-info-line);
    background: var(--app-panel);
}

.test-log-view__summary-card--accent {
    border-color: var(--app-success-line);
    background: var(--app-panel);
}

.test-log-view__result-divider {
    height: 1px;
    background: var(--app-border);
}

.test-log-view__grid-table {
    padding: 0.75rem;
}

.test-log-view__icon-action {
    width: 2.35rem;
    height: 2.35rem;
    padding: 0;
}

.test-log-view__spin {
    animation: test-log-view-spin 0.8s linear infinite;
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

@keyframes test-log-view-spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 960px) {
    .test-log-view__search-grid {
        grid-template-columns: 1fr;
    }

    .test-log-view__action-slot {
        justify-content: stretch;
    }

    .test-log-view__action-slot .test-log-view__button {
        width: 100%;
    }
}

@media (max-width: 720px) {
    .test-log-view__header-copy,
    .test-log-view__notice {
        flex-direction: column;
    }

    .test-log-view__token-entry {
        grid-template-columns: 1fr;
    }
}
</style>
