<template>
  <div class="iplas-isn-shell">
    <AppPanel
      eyebrow="Controls"
      title="ISN Search"
      description="Search by ISN, SSN, or MAC, optionally expand identifiers through SFISTSP, then review grouped station results."
      tone="cool"
      split-header
    >
      <template #header-aside>
        <button
          type="button"
          class="iplas-isn-button iplas-isn-button--ghost"
          :disabled="loadingIsnSearch || !canClearAll"
          @click="clearAll"
        >
          Clear All
        </button>
      </template>

      <div class="iplas-isn-stack">
        <div class="iplas-isn-toolbar">
          <div class="iplas-isn-toggle-row">
            <button
              type="button"
              class="iplas-isn-toggle-chip"
              :class="{ 'is-active': inputMode === 'multiple' }"
              @click="inputMode = 'multiple'"
            >
              Multiple ISNs
            </button>
            <button
              type="button"
              class="iplas-isn-toggle-chip"
              :class="{ 'is-active': inputMode === 'bulk' }"
              @click="inputMode = 'bulk'"
            >
              Bulk Paste
            </button>
          </div>

          <label class="iplas-isn-toggle-card">
            <input v-model="enableUnifiedSearch" type="checkbox">
            <div>
              <strong>Unified Search</strong>
              <p>Expand the search to related ISN, SSN, and MAC identifiers before requesting iPLAS data.</p>
            </div>
          </label>
        </div>

        <label v-if="inputMode === 'multiple'" class="iplas-isn-field">
          <span>DUT ISNs / SSNs / MACs</span>
          <div class="iplas-isn-entry-row">
            <input
              v-model="multipleIsnSearchText"
              type="text"
              placeholder="Type an identifier and press Enter"
              @keydown.enter.prevent="commitMultipleIdentifier"
            >
            <button
              type="button"
              class="iplas-isn-button iplas-isn-button--secondary"
              :disabled="!multipleIsnSearchText.trim()"
              @click="commitMultipleIdentifier"
            >
              Add
            </button>
            <button
              type="button"
              class="iplas-isn-button iplas-isn-button--ghost"
              :disabled="multipleModeIdentifiers.length === 0 || loadingSfistspLookup"
              @click="handleSfistspLookup"
            >
              {{ loadingSfistspLookup ? 'Looking up...' : 'ISN Ref' }}
            </button>
            <button
              type="button"
              class="iplas-isn-button iplas-isn-button--primary"
              :disabled="multipleModeIdentifiers.length === 0 || isSearching || loadingIsnSearch"
              @click="handleSearch"
            >
              {{ isSearching || loadingIsnSearch ? 'Searching...' : 'Search' }}
            </button>
          </div>
          <small>Press Enter or use Add to queue identifiers before lookup or search.</small>
          <div v-if="selectedISNs.length > 0" class="iplas-isn-token-row">
            <button
              v-for="(isn, index) in selectedISNs"
              :key="`${isn}-${index}`"
              type="button"
              class="iplas-isn-token"
              @click="removeSelectedISN(index)"
            >
              <span>{{ isn }}</span>
              <span aria-hidden="true">x</span>
            </button>
          </div>
        </label>

        <label v-else class="iplas-isn-field">
          <span>Bulk ISN / SSN / MAC Input</span>
          <textarea
            v-model="searchIsn"
            rows="5"
            placeholder="Paste multiple ISNs, SSNs, or MACs separated by newlines, commas, or spaces"
          />
          <div class="iplas-isn-entry-row iplas-isn-entry-row--split">
            <small>Bulk input accepts one-per-line, comma-separated, or space-separated identifiers.</small>
            <div class="iplas-isn-inline-actions">
              <button
                type="button"
                class="iplas-isn-button iplas-isn-button--ghost"
                :disabled="!searchIsn.trim() || loadingSfistspLookup"
                @click="handleSfistspLookup"
              >
                {{ loadingSfistspLookup ? 'Looking up...' : 'ISN Ref' }}
              </button>
              <button
                type="button"
                class="iplas-isn-button iplas-isn-button--primary"
                :disabled="!searchIsn.trim() || isSearching || loadingIsnSearch"
                @click="handleSearch"
              >
                {{ isSearching || loadingIsnSearch ? 'Searching...' : 'Search' }}
              </button>
            </div>
          </div>
        </label>

        <section v-if="sfistspReferences.length > 0" class="iplas-isn-reference-panel">
          <div class="iplas-isn-reference-panel__header">
            <div>
              <p class="iplas-isn-reference-panel__eyebrow">Lookup</p>
              <h3>SFISTSP Matches</h3>
            </div>
            <button type="button" class="iplas-isn-button iplas-isn-button--ghost" @click="sfistspReferences = []">
              Dismiss
            </button>
          </div>

          <div class="iplas-isn-reference-grid">
            <article
              v-for="ref in sfistspReferences"
              :key="ref.isn_searched"
              class="iplas-isn-reference-card"
              :class="ref.success ? 'iplas-isn-reference-card--success' : 'iplas-isn-reference-card--error'"
            >
              <div class="iplas-isn-reference-card__topline">
                <div>
                  <small>Searched</small>
                  <strong>{{ ref.isn_searched }}</strong>
                </div>
                <span class="iplas-isn-pill" :class="ref.success ? 'iplas-isn-pill--success' : 'iplas-isn-pill--danger'">
                  {{ ref.success ? 'Found' : 'Not Found' }}
                </span>
              </div>

              <div v-if="ref.success" class="iplas-isn-reference-stack">
                <button
                  v-if="ref.isn && ref.isn !== ref.isn_searched"
                  type="button"
                  class="iplas-isn-reference-code"
                  @click="copyToClipboard(ref.isn)"
                >
                  <span>Primary ISN</span>
                  <strong>{{ ref.isn }}</strong>
                </button>
                <button v-if="ref.ssn" type="button" class="iplas-isn-reference-code" @click="copyToClipboard(ref.ssn)">
                  <span>SSN</span>
                  <strong>{{ ref.ssn }}</strong>
                </button>
                <button v-if="ref.mac" type="button" class="iplas-isn-reference-code" @click="copyToClipboard(ref.mac)">
                  <span>MAC</span>
                  <strong>{{ formatMacAddress(ref.mac) }}</strong>
                </button>

                <div v-if="ref.isn_references && ref.isn_references.length > 0" class="iplas-isn-reference-stack">
                  <span class="iplas-isn-reference-label">All References</span>
                  <div class="iplas-isn-reference-token-row">
                    <button
                      v-for="refIsn in ref.isn_references"
                      :key="refIsn"
                      type="button"
                      class="iplas-isn-token"
                      @click="copyToClipboard(refIsn)"
                    >
                      {{ refIsn }}
                    </button>
                  </div>
                </div>
              </div>

              <p v-else class="iplas-isn-reference-error">{{ ref.errorMessage || 'No data found' }}</p>
            </article>
          </div>
        </section>
      </div>
    </AppPanel>

    <div v-if="error" class="iplas-isn-notice iplas-isn-notice--error">
      {{ error }}
    </div>

    <div v-if="hasSearched && groupedByISN.length === 0 && !isSearching" class="iplas-isn-notice iplas-isn-notice--info">
      No test records found for the provided ISN(s).
    </div>

        <AppPanel
          v-if="groupedByISN.length > 0"
          eyebrow="Results"
          title="Records"
          description="Review grouped iPLAS records per ISN, switch display modes, and drill into station-level histories."
          tone="warm"
          split-header
          class="iplas-isn-results-panel"
        >
          <template #header-aside>
            <div class="iplas-isn-results-actions">
              <span class="iplas-isn-pill iplas-isn-pill--neutral">{{ groupedByISN.length }} ISN(s)</span>
              <button
                v-if="selectedRecordIndices.length > 0"
                type="button"
                class="iplas-isn-button iplas-isn-button--secondary"
                :disabled="downloading"
                @click="downloadSelectedRecords"
              >
                {{ downloading ? 'Downloading...' : `Download Selected (${selectedRecordIndices.length})` }}
              </button>
              <button type="button" class="iplas-isn-button iplas-isn-button--ghost" @click="toggleExpandAll">
                {{ allExpanded ? 'Collapse All' : 'Expand All' }}
              </button>
            </div>
          </template>

          <AppTabs v-model="activeISNTab" :items="isnTabItems" scrollable>
            <template v-for="(isnGroup, isnIndex) in groupedByISN" :key="isnGroup.isn" v-slot:[`panel-${isnIndex}`]>
              <section class="iplas-isn-results-pane">
                <div class="iplas-isn-results-toolbar">
                  <div class="iplas-isn-summary-grid">
                    <button type="button" class="iplas-isn-summary-card iplas-isn-summary-card--primary" @click="copyToClipboard(isnGroup.isn)">
                      <small>DUT ISN</small>
                      <strong>{{ isnGroup.isn }}</strong>
                    </button>
                    <div class="iplas-isn-summary-card">
                      <small>Site</small>
                      <strong>{{ isnGroup.site }}</strong>
                    </div>
                    <div class="iplas-isn-summary-card">
                      <small>Project</small>
                      <strong>{{ isnGroup.project }}</strong>
                    </div>
                    <div class="iplas-isn-summary-card">
                      <small>Stations</small>
                      <strong>{{ isnGroup.stations.length }}</strong>
                    </div>
                    <div class="iplas-isn-summary-card">
                      <small>Total Records</small>
                      <strong>{{ isnGroup.records.length }}</strong>
                    </div>
                    <div class="iplas-isn-summary-card" :class="isnGroup.hasError ? 'iplas-isn-summary-card--danger' : 'iplas-isn-summary-card--success'">
                      <small>{{ isnGroup.hasError ? 'Errors' : 'Status' }}</small>
                      <strong>{{ isnGroup.hasError ? `${isnGroup.errorCount} issue(s)` : 'Healthy' }}</strong>
                    </div>
                  </div>

                  <div class="iplas-isn-view-toggle-row">
                    <button
                      v-for="option in viewModeOptions"
                      :key="option.value"
                      type="button"
                      class="iplas-isn-toggle-chip"
                      :class="{ 'is-active': viewMode === option.value }"
                      @click="viewMode = option.value"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </div>

                <div v-if="viewMode === 'grid'" class="iplas-isn-station-grid">
                  <article
                    v-for="(stationGroup, stationIndex) in isnGroup.stations"
                    :key="`grid-station-${stationGroup.stationName}`"
                    class="iplas-isn-station-card"
                  >
                    <div class="iplas-isn-station-card__header" :class="hasLatestStationError(stationGroup) ? 'is-error' : ''">
                      <div>
                        <strong>{{ stationGroup.displayName }}</strong>
                        <p>{{ stationGroup.records.length }} record(s)</p>
                      </div>
                      <span v-if="getStationErrorCount(stationGroup) > 0" class="iplas-isn-pill iplas-isn-pill--danger">
                        {{ getStationErrorCount(stationGroup) }} error(s)
                      </span>
                    </div>

                    <template v-if="getDisplayedStationRecords(isnGroup, stationGroup).length > 0">
                      <div class="iplas-isn-carousel-controls">
                        <button
                          type="button"
                          class="iplas-isn-inline-button"
                          :disabled="getGridCarouselIndex(isnGroup, stationGroup) === 0"
                          @click="setGridCarouselIndex(getGridCarouselKey(isnGroup, stationGroup), 0, getDisplayedStationRecords(isnGroup, stationGroup).length)"
                        >
                          First
                        </button>
                        <button
                          type="button"
                          class="iplas-isn-inline-button"
                          :disabled="getGridCarouselIndex(isnGroup, stationGroup) === 0"
                          @click="setGridCarouselIndex(getGridCarouselKey(isnGroup, stationGroup), getGridCarouselIndex(isnGroup, stationGroup) - 1, getDisplayedStationRecords(isnGroup, stationGroup).length)"
                        >
                          Prev
                        </button>
                        <span class="iplas-isn-pill iplas-isn-pill--primary">
                          Record {{ getGridCarouselIndex(isnGroup, stationGroup) + 1 }} / {{ getDisplayedStationRecords(isnGroup, stationGroup).length }}
                        </span>
                        <button
                          type="button"
                          class="iplas-isn-inline-button"
                          :disabled="getGridCarouselIndex(isnGroup, stationGroup) >= getDisplayedStationRecords(isnGroup, stationGroup).length - 1"
                          @click="setGridCarouselIndex(getGridCarouselKey(isnGroup, stationGroup), getGridCarouselIndex(isnGroup, stationGroup) + 1, getDisplayedStationRecords(isnGroup, stationGroup).length)"
                        >
                          Next
                        </button>
                        <button
                          type="button"
                          class="iplas-isn-inline-button"
                          :disabled="getGridCarouselIndex(isnGroup, stationGroup) >= getDisplayedStationRecords(isnGroup, stationGroup).length - 1"
                          @click="setGridCarouselIndex(getGridCarouselKey(isnGroup, stationGroup), getDisplayedStationRecords(isnGroup, stationGroup).length - 1, getDisplayedStationRecords(isnGroup, stationGroup).length)"
                        >
                          Last
                        </button>
                      </div>

                      <div
                        v-if="getCurrentGridRecord(isnGroup, stationGroup)"
                        class="iplas-isn-record-card"
                        :class="isRecordPassing(getCurrentGridRecord(isnGroup, stationGroup)!) ? 'is-pass' : 'is-fail'"
                      >
                        <div class="iplas-isn-record-card__identity">
                          <span class="iplas-isn-pill iplas-isn-pill--primary">{{ getCurrentGridRecord(isnGroup, stationGroup)?.isn }}</span>
                          <span class="iplas-isn-pill iplas-isn-pill--neutral">{{ getCurrentGridRecord(isnGroup, stationGroup)?.device_id }}</span>
                        </div>
                        <div class="iplas-isn-record-card__meta">
                          <span class="iplas-isn-pill iplas-isn-pill--neutral">{{ formatShortTime(getCurrentGridRecord(isnGroup, stationGroup)!.test_end_time, getCurrentGridRecord(isnGroup, stationGroup)!.site) }}</span>
                          <span class="iplas-isn-pill iplas-isn-pill--neutral">{{ calculateDuration(getCurrentGridRecord(isnGroup, stationGroup)!.test_start_time, getCurrentGridRecord(isnGroup, stationGroup)!.test_end_time) }}</span>
                        </div>
                        <p class="iplas-isn-record-card__status" :class="isRecordPassing(getCurrentGridRecord(isnGroup, stationGroup)!) ? 'is-pass' : 'is-fail'">
                          {{ recordStatusText(getCurrentGridRecord(isnGroup, stationGroup)!) }}
                        </p>
                        <div class="iplas-isn-record-card__actions">
                          <button type="button" class="iplas-isn-button iplas-isn-button--ghost" @click="openFullscreen(getCurrentGridRecord(isnGroup, stationGroup)!)">
                            Details
                          </button>
                          <button
                            type="button"
                            class="iplas-isn-button iplas-isn-button--primary"
                            :disabled="downloadingKey === `${isnIndex}-${stationIndex}-${getGridCarouselIndex(isnGroup, stationGroup)}`"
                            @click="downloadSingleRecord(getCurrentGridRecord(isnGroup, stationGroup)!, `${isnIndex}-${stationIndex}`, getGridCarouselIndex(isnGroup, stationGroup))"
                          >
                            {{ downloadingKey === `${isnIndex}-${stationIndex}-${getGridCarouselIndex(isnGroup, stationGroup)}` ? 'Downloading...' : 'Download' }}
                          </button>
                        </div>
                      </div>
                    </template>

                    <div v-else class="iplas-isn-empty-state">
                      No test records available for this station.
                    </div>
                  </article>
                </div>

                <div v-else-if="viewMode === 'list'" class="iplas-isn-section-stack">
                  <section
                    v-for="(stationGroup, stationIndex) in isnGroup.stations"
                    :key="`list-station-${stationGroup.stationName}`"
                    class="iplas-isn-station-section"
                  >
                    <button
                      type="button"
                      class="iplas-isn-station-section__toggle"
                      :class="{ 'is-error': hasLatestStationError(stationGroup) }"
                      @click="toggleStationExpansion(isnIndex, stationIndex)"
                    >
                      <div>
                        <strong>{{ stationGroup.displayName }}</strong>
                        <span>{{ stationGroup.records.length }} record(s)</span>
                      </div>
                      <div class="iplas-isn-station-section__meta">
                        <span v-if="getStationErrorCount(stationGroup) > 0" class="iplas-isn-pill iplas-isn-pill--danger">{{ getStationErrorCount(stationGroup) }} error(s)</span>
                        <span class="iplas-isn-pill iplas-isn-pill--neutral">{{ isStationExpanded(isnIndex, stationIndex) ? 'Collapse' : 'Expand' }}</span>
                      </div>
                    </button>

                    <div v-if="isStationExpanded(isnIndex, stationIndex)" class="iplas-isn-station-section__body">
                      <div v-if="getDisplayedStationRecords(isnGroup, stationGroup).length > 0" class="iplas-isn-list-stack">
                        <article
                          v-for="(record, recordIndex) in getDisplayedStationRecords(isnGroup, stationGroup)"
                          :key="`list-record-${recordIndex}`"
                          class="iplas-isn-list-row"
                          :class="isRecordPassing(record) ? 'is-pass' : 'is-fail'"
                        >
                          <div class="iplas-isn-list-row__copy">
                            <strong>{{ record.device_id }} • {{ record.isn }}</strong>
                            <div class="iplas-isn-list-row__meta">
                              <span class="iplas-isn-pill" :class="isRecordPassing(record) ? 'iplas-isn-pill--success' : 'iplas-isn-pill--danger'">{{ recordStatusText(record) }}</span>
                              <span class="iplas-isn-pill iplas-isn-pill--neutral">{{ calculateDuration(record.test_start_time, record.test_end_time) }}</span>
                              <span class="iplas-isn-pill iplas-isn-pill--neutral">{{ formatShortTime(record.test_end_time, record.site) }}</span>
                            </div>
                          </div>
                          <div class="iplas-isn-record-card__actions">
                            <button type="button" class="iplas-isn-button iplas-isn-button--ghost" @click="openFullscreen(record)">Details</button>
                            <button
                              type="button"
                              class="iplas-isn-button iplas-isn-button--primary"
                              :disabled="downloadingKey === `${isnIndex}-${stationIndex}-${recordIndex}`"
                              @click="downloadSingleRecord(record, `${isnIndex}-${stationIndex}`, recordIndex)"
                            >
                              {{ downloadingKey === `${isnIndex}-${stationIndex}-${recordIndex}` ? 'Downloading...' : 'Download' }}
                            </button>
                          </div>
                        </article>
                      </div>
                      <div v-else class="iplas-isn-empty-state">No test records available for this station.</div>
                    </div>
                  </section>
                </div>

                <div v-else-if="viewMode === 'table'" class="iplas-isn-section-stack">
                  <section
                    v-for="(stationGroup, stationIndex) in isnGroup.stations"
                    :key="`table-station-${stationGroup.stationName}`"
                    class="iplas-isn-station-section"
                  >
                    <button
                      type="button"
                      class="iplas-isn-station-section__toggle"
                      :class="{ 'is-error': hasLatestStationError(stationGroup) }"
                      @click="toggleStationExpansion(isnIndex, stationIndex)"
                    >
                      <div>
                        <strong>{{ stationGroup.displayName }}</strong>
                        <span>{{ stationGroup.records.length }} record(s)</span>
                      </div>
                      <div class="iplas-isn-station-section__meta">
                        <span v-if="getStationErrorCount(stationGroup) > 0" class="iplas-isn-pill iplas-isn-pill--danger">{{ getStationErrorCount(stationGroup) }} error(s)</span>
                        <span class="iplas-isn-pill iplas-isn-pill--neutral">{{ isStationExpanded(isnIndex, stationIndex) ? 'Collapse' : 'Expand' }}</span>
                      </div>
                    </button>

                    <div v-if="isStationExpanded(isnIndex, stationIndex)" class="iplas-isn-station-section__body">
                      <AppDataGrid
                        :columns="recordTableColumns"
                        :rows="getTableRows(isnGroup, stationGroup, stationIndex)"
                        data-key="_rowKey"
                        :paginator="false"
                        scroll-height="24rem"
                        :table-style="{ minWidth: '60rem' }"
                        empty-message="No test records available for this station."
                      >
                        <template #cell-status="{ data }">
                          <span class="iplas-isn-pill" :class="isRecordPassing(data as IsnSearchData) ? 'iplas-isn-pill--success' : 'iplas-isn-pill--danger'">
                            {{ isRecordPassing(data as IsnSearchData) ? 'PASS' : (String((data as IsnSearchData).error_code || 'FAIL')) }}
                          </span>
                        </template>
                        <template #cell-error_name="{ data }">
                          <span :class="isRecordPassing(data as IsnSearchData) ? '' : 'iplas-isn-text-danger'">{{ (data as IsnSearchData).error_name || '-' }}</span>
                        </template>
                        <template #cell-test_end_time="{ data }">
                          {{ formatShortTime((data as IsnSearchData).test_end_time, (data as IsnSearchData).site) }}
                        </template>
                        <template #cell-actions="{ data }">
                          <div class="iplas-isn-record-card__actions iplas-isn-record-card__actions--tight">
                            <button type="button" class="iplas-isn-inline-button" @click="openFullscreen(data as IsnSearchData)">Details</button>
                            <button
                              type="button"
                              class="iplas-isn-inline-button"
                              :disabled="downloadingKey === `${isnIndex}-${(data as TableRow)._stationIndex}-${(data as TableRow)._idx}`"
                              @click="downloadSingleRecord(data as IsnSearchData, `${isnIndex}-${(data as TableRow)._stationIndex}`, (data as TableRow)._idx)"
                            >
                              {{ downloadingKey === `${isnIndex}-${(data as TableRow)._stationIndex}-${(data as TableRow)._idx}` ? 'Downloading...' : 'Download' }}
                            </button>
                          </div>
                        </template>
                      </AppDataGrid>
                    </div>
                  </section>
                </div>

                <div v-else class="iplas-isn-section-stack">
                  <section
                    v-for="(stationGroup, stationIndex) in isnGroup.stations"
                    :key="`compact-station-${stationGroup.stationName}`"
                    class="iplas-isn-station-section"
                  >
                    <button
                      type="button"
                      class="iplas-isn-station-section__toggle"
                      :class="{ 'is-error': hasLatestStationError(stationGroup) }"
                      @click="toggleCompactExpansion(isnIndex, stationIndex)"
                    >
                      <div>
                        <strong>{{ stationGroup.displayName }}</strong>
                        <span>{{ stationGroup.records.length }} record(s)</span>
                      </div>
                      <div class="iplas-isn-station-section__meta">
                        <span v-if="getStationErrorCount(stationGroup) > 0" class="iplas-isn-pill iplas-isn-pill--danger">{{ getStationErrorCount(stationGroup) }} error(s)</span>
                        <span class="iplas-isn-pill iplas-isn-pill--neutral">{{ isCompactExpanded(isnIndex, stationIndex) ? 'Collapse' : 'Expand' }}</span>
                      </div>
                    </button>

                    <div v-if="isCompactExpanded(isnIndex, stationIndex)" class="iplas-isn-station-section__body">
                      <div v-if="getDisplayedStationRecords(isnGroup, stationGroup).length > 0" class="iplas-isn-compact-grid">
                        <article
                          v-for="(record, recordIndex) in getDisplayedStationRecords(isnGroup, stationGroup)"
                          :key="`compact-${record.device_id}-${recordIndex}`"
                          class="iplas-isn-compact-card"
                          :class="isRecordPassing(record) ? 'is-pass' : 'is-fail'"
                        >
                          <strong>{{ record.device_id }} • {{ record.isn }}</strong>
                          <span class="iplas-isn-pill" :class="isRecordPassing(record) ? 'iplas-isn-pill--success' : 'iplas-isn-pill--danger'">
                            {{ recordStatusText(record) }}
                          </span>
                          <div class="iplas-isn-list-row__meta">
                            <span class="iplas-isn-pill iplas-isn-pill--neutral">{{ formatShortTime(record.test_end_time, record.site) }}</span>
                            <span class="iplas-isn-pill iplas-isn-pill--neutral">{{ calculateDuration(record.test_start_time, record.test_end_time) }}</span>
                          </div>
                          <div class="iplas-isn-record-card__actions">
                            <button type="button" class="iplas-isn-button iplas-isn-button--ghost" @click="openFullscreen(record)">Details</button>
                            <button
                              type="button"
                              class="iplas-isn-button iplas-isn-button--primary"
                              :disabled="downloadingKey === `${isnIndex}-${stationIndex}-${recordIndex}`"
                              @click="downloadSingleRecord(record, `${isnIndex}-${stationIndex}`, recordIndex)"
                            >
                              {{ downloadingKey === `${isnIndex}-${stationIndex}-${recordIndex}` ? 'Downloading...' : 'Download' }}
                            </button>
                          </div>
                        </article>
                      </div>
                      <div v-else class="iplas-isn-empty-state">No test records available for this station.</div>
                    </div>
                  </section>
                </div>
              </section>
            </template>
          </AppTabs>
        </AppPanel>
        <!-- Fullscreen Dialog -->
        <IplasTestItemsFullscreenDialog v-model="showFullscreenDialog" :record="fullscreenRecord"
            :downloading="fullscreenDownloading" @download="downloadSingleRecordFromFullscreen" />
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { iplasProxyApi } from '@/features/dut-logs/api/iplasProxyApi'
import {
  lookupIsnsBatch,
  type SfistspIsnReferenceResponse,
} from '@/features/dut-logs/api/sfistspApi'
import {
  type DownloadAttachmentInfo,
  type DownloadCsvLogInfo,
  type IsnSearchData,
  useIplasApi,
} from '@/features/dut-logs/composables/useIplasApi'
import { useNotification } from '@/shared/composables/useNotification'
import AppDataGrid from '@/shared/ui/data-grid/AppDataGrid.vue'
import { AppPanel, AppTabs } from '@/shared/ui'
import { isStatusPass } from '@/shared/utils/helpers'
import IplasTestItemsFullscreenDialog, {
  type NormalizedRecord,
} from './IplasTestItemsFullscreenDialog.vue'

// ============================================================================
// Timezone Utilities for ISN Search API
// ============================================================================

/**
 * Get timezone offset in hours based on site
 * PTB (Vietnam), PVN (Vietnam) = UTC+8
 * PSZ (China), PTY (Taiwan) = UTC+8
 */
function getSiteTimezoneOffset(site: string): number {
  const siteUpper = (site || '').toUpperCase()
  if (siteUpper === 'PTB' || siteUpper === 'PVN') {
    return 8 // UTC+8
  } else if (siteUpper === 'PSZ' || siteUpper === 'PTY') {
    return 8 // UTC+8
  }
  // Default to UTC+8 for unknown sites
  return 8
}

/**
 * Format time for display in tables
 * Input: "2025-09-16 13:23:57%:z" (UTC+0 time from isn_search API)
 * Output: "2025/09/16, 21:23:57" (local time in display format)
 *
 * CRITICAL: isn_search API returns UTC+0 time. We need to convert to local time.
 */
function formatTimeForDisplay(timeStr: string, site: string): string {
  if (!timeStr) return ''

  // Clean the time string: remove %:z suffix
  const cleanedTime = timeStr.replace('%:z', '').replace('T', ' ')

  // Parse as UTC
  const utcDate = new Date(`${cleanedTime.replace(' ', 'T')}Z`)

  // Get timezone offset based on site
  const offsetHours = getSiteTimezoneOffset(site)

  // Add timezone offset
  const localDate = new Date(utcDate.getTime() + offsetHours * 60 * 60 * 1000)

  // Format as YYYY/MM/DD, HH:mm:ss (consistent with other iPLAS displays)
  const year = localDate.getUTCFullYear()
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(localDate.getUTCDate()).padStart(2, '0')
  const hours = String(localDate.getUTCHours()).padStart(2, '0')
  const minutes = String(localDate.getUTCMinutes()).padStart(2, '0')
  const seconds = String(localDate.getUTCSeconds()).padStart(2, '0')

  return `${year}/${month}/${day}, ${hours}:${minutes}:${seconds}`
}

// ============================================================================
// Interfaces
// ============================================================================

interface StationGroup {
  stationName: string
  displayName: string
  hasError: boolean
  errorCount: number
  records: IsnSearchData[]
  order: number // Station order from iPLAS API
}

interface ISNGroup {
  isn: string
  site: string
  project: string
  hasError: boolean
  errorCount: number
  records: IsnSearchData[]
  stations: StationGroup[]
}

// SFISTSP Reference interface
interface SfistspReference {
  isn_searched: string // Original search term
  isn: string // Primary ISN from references
  success: boolean
  ssn?: string
  mac?: string
  errorMessage?: string
  isn_references?: string[]
}

interface TableRow extends IsnSearchData {
  _rowKey: string
  _idx: number
  _stationIndex: number
  record_number: number
  duration: string
}

const {
  loadingIsnSearch,
  downloading,
  error,
  searchByIsn,
  searchByIsnBatch,
  downloadAttachments,
  downloadCsvLogs,
  clearIsnSearchData,
} = useIplasApi()

// Input mode
const inputMode = ref<'multiple' | 'bulk'>('multiple')
const searchIsn = ref('')
const selectedISNs = ref<string[]>([])
const multipleIsnSearchText = ref('')

// Search state
const hasSearched = ref(false)
const isSearching = ref(false) // Local state to track entire search operation (fixes premature "no results" alert)
const groupedByISN = ref<ISNGroup[]>([])
const activeISNTab = ref(0)
const {
  showError: showErrorNotification,
  showInfo: showInfoNotification,
  showSuccess: showSuccessNotification,
} = useNotification()

// SFISTSP lookup state
const loadingSfistspLookup = ref(false)
const sfistspReferences = ref<SfistspReference[]>([])

// Unified search toggle - when enabled, first looks up SFISTSP to find all related identifiers
const enableUnifiedSearch = ref(true)

// Display controls
const viewMode = ref<'grid' | 'list' | 'table' | 'compact'>('grid')
const testItemFilters = ref<Record<string, 'all' | 'value' | 'non-value' | 'bin'>>({})
// const testItemStatusFilters = ref<Record<string, 'ALL' | 'PASS' | 'FAIL'>>({}) // Per-test item status filter
// const testStatusFilter = ref<'ALL' | 'PASS' | 'FAIL'>('ALL')
const expandedPanels = ref<Record<number, number[]>>({}) // Key: isnIndex, Value: array of expanded station panel indices
const testItemSearchTerms = ref<Record<string, string[]>>({})
const carouselModels = ref<Record<string, number>>({}) // For grid view carousel navigation
const compactExpanded = ref<Record<number, number[]>>({}) // For compact view per-ISN station expansion

// Device ID filter controls
const selectedFilterDeviceIds = ref<Record<string, string[]>>({})

// Per-station status filters
const stationStatusFilters = ref<Record<string, 'ALL' | 'PASS' | 'FAIL'>>({})

// Performance: Limit displayed records per ISN group
const INITIAL_DISPLAY_LIMIT = 50
const displayLimits = ref<Record<string, number>>({})

function getDisplayLimit(isn: string): number {
  return displayLimits.value[isn] || INITIAL_DISPLAY_LIMIT
}

function normalizeIdentifierList(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)),
  )
}

function parseBulkIdentifiers(value: string): string[] {
  return normalizeIdentifierList(value.split(/[\n,\s]+/))
}

const multipleModeIdentifiers = computed(() => {
  return normalizeIdentifierList(selectedISNs.value.map((value) => String(value ?? '')))
})

const canClearAll = computed(() => {
  return Boolean(
    searchIsn.value.trim() ||
      selectedISNs.value.length > 0 ||
      groupedByISN.value.length > 0 ||
      sfistspReferences.value.length > 0,
  )
})

const isnTabItems = computed(() =>
  groupedByISN.value.map((group, index) => ({
    value: index,
    label: group.isn,
  })),
)

const viewModeOptions = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
  { value: 'table', label: 'Table' },
  { value: 'compact', label: 'Compact' },
] as const

function getCurrentInputIdentifiers(): string[] {
  if (inputMode.value === 'multiple') {
    return multipleModeIdentifiers.value
  }

  return parseBulkIdentifiers(searchIsn.value)
}

function commitMultipleIdentifier(): void {
  const entry = multipleIsnSearchText.value.trim()
  if (!entry) return

  selectedISNs.value = normalizeIdentifierList([...selectedISNs.value, entry])
  multipleIsnSearchText.value = ''
}

function removeSelectedISN(index: number): void {
  selectedISNs.value = selectedISNs.value.filter((_, currentIndex) => currentIndex !== index)
}

async function handleMultipleIsnsEnter(event: KeyboardEvent): Promise<void> {
  if (multipleIsnSearchText.value.trim()) {
    return
  }

  if (multipleModeIdentifiers.value.length === 0 || isSearching.value || loadingIsnSearch.value) {
    return
  }

  event.preventDefault()
  await handleSearch()
}

// Fullscreen dialog controls
const fullscreenRecord = ref<NormalizedRecord | null>(null)
const showFullscreenDialog = ref(false)
const fullscreenDownloading = ref(false)

// Original record for download (to get site/project info)
const fullscreenOriginalRecord = ref<IsnSearchData | null>(null)

// Download controls
const selectedRecordIndices = ref<string[]>([]) // Format: "tabIndex-recordIndex"
const downloadingKey = ref<string | null>(null)

// const testItemHeaders = [
//   { title: 'Test Item', key: 'NAME', sortable: true },
//   { title: 'Status', key: 'STATUS', sortable: true },
//   { title: 'Value', key: 'VALUE', sortable: true },
//   { title: 'UCL', key: 'UCL', sortable: true },
//   { title: 'LCL', key: 'LCL', sortable: true },
// ]

const recordTableColumns = [
  { key: 'record_number', field: 'record_number', header: '#', sortable: true, style: { width: '5rem' } },
  { key: 'test_end_time', field: 'test_end_time', header: 'Test Time', sortable: true, style: { width: '12rem' } },
  { key: 'device_id', field: 'device_id', header: 'Device ID', sortable: true, style: { width: '10rem' } },
  { key: 'status', field: 'status', header: 'Status', style: { width: '10rem' } },
  { key: 'error_name', field: 'error_name', header: 'Error Name', sortable: true, style: { width: '18rem' } },
  { key: 'duration', field: 'duration', header: 'Duration', sortable: true, style: { width: '8rem' } },
  { key: 'actions', field: 'actions', header: 'Actions', style: { width: '10rem' } },
]

// Computed
const allExpanded = computed(() => {
  const currentTab = activeISNTab.value
  const currentGroup = groupedByISN.value[currentTab]
  if (!currentGroup) return false

  // Check if all station expansion panels are expanded for current ISN
  const stationsCount = currentGroup.stations.length
  const expandedStations = expandedPanels.value[currentTab] || []
  return expandedStations.length === stationsCount && stationsCount > 0
})

function getGridCarouselKey(isnGroup: ISNGroup, stationGroup: StationGroup): string {
  return `${isnGroup.isn}-${stationGroup.stationName}`
}

function getGridCarouselIndex(isnGroup: ISNGroup, stationGroup: StationGroup): number {
  const records = getDisplayedStationRecords(isnGroup, stationGroup)
  if (records.length <= 1) return 0

  const key = getGridCarouselKey(isnGroup, stationGroup)
  const currentIndex = carouselModels.value[key]
  if (typeof currentIndex !== 'number') {
    return records.length - 1
  }

  return Math.min(Math.max(currentIndex, 0), records.length - 1)
}

function setGridCarouselIndex(key: string, index: number, dataLength: number): void {
  if (dataLength <= 0) {
    carouselModels.value[key] = 0
    return
  }

  carouselModels.value[key] = Math.min(Math.max(index, 0), dataLength - 1)
}

function getCurrentGridRecord(
  isnGroup: ISNGroup,
  stationGroup: StationGroup,
): IsnSearchData | null {
  const records = getDisplayedStationRecords(isnGroup, stationGroup)
  if (records.length === 0) return null

  return records[getGridCarouselIndex(isnGroup, stationGroup)] || null
}

// Helper to get error count for a station
function getStationErrorCount(stationGroup: StationGroup): number {
  return stationGroup.records.filter(
    (r) => !isStatusPass(r.test_status) || !isStatusPass(r.error_code),
  ).length
}

// Helper to check if latest record has error
function hasLatestStationError(stationGroup: StationGroup): boolean {
  if (stationGroup.records.length === 0) return false
  // Sort by test_end_time descending and check the first one
  const sortedRecords = [...stationGroup.records].sort((a, b) => {
    const timeA = new Date(`${a.test_end_time.replace('%:z', '').replace(' ', 'T')}Z`).getTime()
    const timeB = new Date(`${b.test_end_time.replace('%:z', '').replace(' ', 'T')}Z`).getTime()
    return timeB - timeA
  })
  const latestRecord = sortedRecords[0]
  return latestRecord
    ? !isStatusPass(latestRecord.test_status) || !isStatusPass(latestRecord.error_code)
    : false
}

function isRecordPassing(record: IsnSearchData): boolean {
  return isStatusPass(record.test_status) && isStatusPass(record.error_code)
}

function recordStatusText(record: IsnSearchData): string {
  return isRecordPassing(record) ? 'PASS' : record.error_name || record.error_code || 'FAIL'
}

function isStationExpanded(isnIndex: number, stationIndex: number): boolean {
  return (expandedPanels.value[isnIndex] || []).includes(stationIndex)
}

function toggleStationExpansion(isnIndex: number, stationIndex: number): void {
  const current = expandedPanels.value[isnIndex] || []
  expandedPanels.value[isnIndex] = current.includes(stationIndex)
    ? current.filter((index) => index !== stationIndex)
    : [...current, stationIndex]
}

function isCompactExpanded(isnIndex: number, stationIndex: number): boolean {
  return (compactExpanded.value[isnIndex] || []).includes(stationIndex)
}

function toggleCompactExpansion(isnIndex: number, stationIndex: number): void {
  const current = compactExpanded.value[isnIndex] || []
  compactExpanded.value[isnIndex] = current.includes(stationIndex)
    ? current.filter((index) => index !== stationIndex)
    : [...current, stationIndex]
}

// Format time for display using site-specific timezone
// ISN search API returns UTC+0 time, need to convert to local time (UTC+8)
function formatShortTime(timeStr: string, site: string = 'PTB'): string {
  return formatTimeForDisplay(timeStr, site)
}

function calculateDuration(startStr: string, endStr: string): string {
  if (!startStr || !endStr) return '-'
  try {
    const cleanStart = startStr.replace('%:z', '').replace('T', ' ')
    const cleanEnd = endStr.replace('%:z', '').replace('T', ' ')
    const start = new Date(`${cleanStart.replace(' ', 'T')}Z`)
    const end = new Date(`${cleanEnd.replace(' ', 'T')}Z`)
    // Add +8 hours offset to both times
    const adjustedStart = new Date(start.getTime() + 8 * 60 * 60 * 1000)
    const adjustedEnd = new Date(end.getTime() + 8 * 60 * 60 * 1000)
    const diffMs = adjustedEnd.getTime() - adjustedStart.getTime()
    const seconds = (diffMs / 1000).toFixed(2)
    return `${seconds}s`
  } catch {
    return '-'
  }
}

// Get filtered station records (returns all records for the station)
function getFilteredStationRecords(
  _isnGroup: ISNGroup,
  stationGroup: StationGroup,
): IsnSearchData[] {
  return stationGroup.records
}

// Performance: Get limited records for display
function getDisplayedStationRecords(
  isnGroup: ISNGroup,
  stationGroup: StationGroup,
): IsnSearchData[] {
  const filtered = getFilteredStationRecords(isnGroup, stationGroup)
  const limit = getDisplayLimit(`${isnGroup.isn}-${stationGroup.stationName}`)
  // Sort by test_end_time ascending (oldest first, latest last)
  const sorted = [...filtered].sort((a, b) => {
    const timeA = new Date(`${a.test_end_time.replace('%:z', '').replace(' ', 'T')}Z`).getTime()
    const timeB = new Date(`${b.test_end_time.replace('%:z', '').replace(' ', 'T')}Z`).getTime()
    return timeA - timeB
  })
  return sorted.slice(0, limit)
}

// Record search queries per station
const recordSearchQueries = ref<Record<string, string>>({})

// Get total filtered records count for a station
function getTotalFilteredStationRecords(isnGroup: ISNGroup, stationGroup: StationGroup): number {
  return getFilteredStationRecords(isnGroup, stationGroup).length
}

function getTableRows(
  isnGroup: ISNGroup,
  stationGroup: StationGroup,
  stationIndex: number,
): TableRow[] {
  return getDisplayedStationRecords(isnGroup, stationGroup).map((record, idx) => ({
    ...record,
    _rowKey: `${isnGroup.isn}-${stationGroup.stationName}-${idx}`,
    _idx: idx,
    _stationIndex: stationIndex,
    record_number: getTotalFilteredStationRecords(isnGroup, stationGroup) - idx,
    duration: calculateDuration(record.test_start_time, record.test_end_time),
  }))
}

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
    console.error('Failed to copy to clipboard:', err)
  }
}

function normalizeIsnRecord(record: IsnSearchData): NormalizedRecord {
  // UPDATED: Convert UTC+0 times from ISN API to local time for display
  // ISN API returns UTC+0 time with %:z suffix, need to convert to local time
  const localStartTime = formatTimeForDisplay(record.test_start_time, record.site)
  const localEndTime = formatTimeForDisplay(record.test_end_time, record.site)

  return {
    isn: record.isn,
    deviceId: record.device_id,
    stationName: record.station_name,
    displayStationName: record.display_station_name,
    tsp: record.display_station_name, // ISN Search doesn't have TSP, use display_station_name
    site: record.site,
    project: record.project,
    line: record.line,
    errorCode: record.error_code,
    errorName: record.error_name || '',
    testStatus: record.test_status,
    testStartTime: localStartTime,
    testEndTime: localEndTime,
    testItems:
      record.test_item?.map((ti) => ({
        NAME: ti.NAME,
        STATUS: ti.STATUS,
        VALUE: ti.VALUE,
        UCL: ti.UCL || '',
        LCL: ti.LCL || '',
        CYCLE: ti.CYCLE || '',
      })) || [],
  }
}

function openFullscreen(record: IsnSearchData): void {
  fullscreenOriginalRecord.value = record
  fullscreenRecord.value = normalizeIsnRecord(record)
  showFullscreenDialog.value = true
}

async function downloadSingleRecordFromFullscreen(): Promise<void> {
  if (!fullscreenOriginalRecord.value) return
  fullscreenDownloading.value = true
  try {
    const attachmentInfo = createAttachmentInfo(fullscreenOriginalRecord.value)
    const csvLogInfo = createCsvLogInfo(fullscreenOriginalRecord.value)

    // Download both CSV and TXT logs in parallel
    await Promise.all([
      downloadAttachments(
        fullscreenOriginalRecord.value.site,
        fullscreenOriginalRecord.value.project,
        [attachmentInfo],
      ),
      downloadCsvLogs([csvLogInfo]),
    ])

    showSuccessNotification('Test log downloaded successfully!')
  } catch (err) {
    console.error('Failed to download test log:', err)
    showErrorNotification(err instanceof Error ? err.message : 'Failed to download test log')
  } finally {
    fullscreenDownloading.value = false
  }
}

function toggleExpandAll(): void {
  const currentTab = activeISNTab.value
  const currentGroup = groupedByISN.value[currentTab]
  if (!currentGroup) return

  const stationsCount = currentGroup.stations.length

  // Toggle all station expansion panels
  const currentExpanded = expandedPanels.value[currentTab] || []
  if (currentExpanded.length === stationsCount && stationsCount > 0) {
    expandedPanels.value[currentTab] = []
  } else {
    expandedPanels.value[currentTab] = currentGroup.stations.map((_, i) => i)
  }

  // Also toggle compact expansion panels
  if (viewMode.value === 'compact') {
    const compactCurrentExpanded = compactExpanded.value[currentTab] || []
    if (compactCurrentExpanded.length === stationsCount && stationsCount > 0) {
      compactExpanded.value[currentTab] = []
    } else {
      compactExpanded.value[currentTab] = currentGroup.stations.map((_, i) => i)
    }
  }
}

/**
 * Format time for download_attachment API (ISN Search data)
 * Input: "2025-09-16 13:23:57%:z" (UTC+0 time from isn_search API)
 * Output: "2025/09/16 20:23:57" (local time for PTB/PVN) or "2025/09/16 21:23:57" (for PSZ/PTY)
 *
 * CRITICAL: isn_search API returns UTC+0 time. We need to convert to local time:
 * - PTB, PVN sites: add +7 hours
 * - PSZ, PTY sites: add +8 hours
 */
function formatTimeForDownloadWithTimezone(timeStr: string, site: string): string {
  if (!timeStr) return ''

  // Clean the time string: remove %:z suffix
  const cleanedTime = timeStr.replace('%:z', '').replace('T', ' ')

  // Parse as UTC
  const utcDate = new Date(`${cleanedTime.replace(' ', 'T')}Z`)

  // Get timezone offset based on site
  const offsetHours = getSiteTimezoneOffset(site)

  // Add timezone offset
  const localDate = new Date(utcDate.getTime() + offsetHours * 60 * 60 * 1000)

  // Format as YYYY/MM/DD HH:mm:ss
  const year = localDate.getUTCFullYear()
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(localDate.getUTCDate()).padStart(2, '0')
  const hours = String(localDate.getUTCHours()).padStart(2, '0')
  const minutes = String(localDate.getUTCMinutes()).padStart(2, '0')
  const seconds = String(localDate.getUTCSeconds()).padStart(2, '0')

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

function createAttachmentInfo(record: IsnSearchData): DownloadAttachmentInfo {
  return {
    isn: record.isn,
    // CRITICAL: Use test_end_time with timezone adjustment based on site
    time: formatTimeForDownloadWithTimezone(record.test_end_time, record.site),
    deviceid: record.device_id || '',
    // Prefer raw station_name — display_station_name may not be recognized by iPLAS download API
    station: record.station_name || record.display_station_name,
  }
}

/**
 * Create CSV log info from record for downloading CSV test logs
 */
function createCsvLogInfo(record: IsnSearchData): DownloadCsvLogInfo {
  // Format test_end_time with milliseconds for CSV download API
  const testEndTime = formatTimeForDownloadWithTimezone(record.test_end_time, record.site)
  // Add .000 milliseconds if not present
  const testEndTimeWithMs = testEndTime.includes('.') ? testEndTime : `${testEndTime}.000`

  return {
    site: record.site,
    project: record.project,
    station: record.station_name || record.display_station_name,
    line: record.line || 'ALL',
    model: 'ALL',
    deviceid: record.device_id || '',
    isn: record.isn,
    test_end_time: testEndTimeWithMs,
    data_source: 0,
  }
}

async function downloadSingleRecord(
  record: IsnSearchData,
  stationKey: string,
  recordIndex: number,
): Promise<void> {
  downloadingKey.value = `${stationKey}-${recordIndex}`
  try {
    const attachmentInfo = createAttachmentInfo(record)
    const csvLogInfo = createCsvLogInfo(record)
    console.log('Download attachment info:', attachmentInfo)
    console.log('Download CSV log info:', csvLogInfo)

    // Download both CSV and TXT logs in parallel
    await Promise.all([
      downloadAttachments(record.site, record.project, [attachmentInfo]),
      downloadCsvLogs([csvLogInfo]),
    ])

    showSuccessNotification('Test log downloaded successfully!')
  } catch (err) {
    console.error('Failed to download test log:', err)
    showErrorNotification(err instanceof Error ? err.message : 'Failed to download test log')
  } finally {
    downloadingKey.value = null
  }
}

async function downloadSelectedRecords(): Promise<void> {
  if (selectedRecordIndices.value.length === 0) return

  try {
    // Group by site and project
    const groupedByProject: Record<
      string,
      { site: string; project: string; attachments: DownloadAttachmentInfo[] }
    > = {}

    for (const key of selectedRecordIndices.value) {
      const parts = key.split('-').map(Number)
      const isnIdx = parts[0] as number
      const stationIdx = parts[1] as number
      const recordIdx = parts[2] as number
      const isnGroup = groupedByISN.value[isnIdx]
      if (!isnGroup) continue
      const stationGroup = isnGroup.stations[stationIdx]
      if (!stationGroup) continue
      const displayedRecords = getDisplayedStationRecords(isnGroup, stationGroup)
      const record = displayedRecords[recordIdx]
      if (!record) continue

      const projectKey = `${record.site}::${record.project}`
      if (!groupedByProject[projectKey]) {
        groupedByProject[projectKey] = {
          site: record.site,
          project: record.project,
          attachments: [],
        }
      }
      groupedByProject[projectKey].attachments.push(createAttachmentInfo(record))
    }

    // Download from each site/project
    for (const projectGroup of Object.values(groupedByProject)) {
      await downloadAttachments(projectGroup.site, projectGroup.project, projectGroup.attachments)
    }
    showSuccessNotification('Test log downloaded successfully!')
  } catch (err) {
    console.error('Failed to download test logs:', err)
  }
}

function groupDataByISN(
  data: IsnSearchData[],
  identifierToPrimaryIsn: Map<string, string> = new Map(),
  stationOrderMap: Map<string, number> = new Map(),
): ISNGroup[] {
  const groups: Record<string, ISNGroup> = {}

  // Get the primary ISN for a record - uses the mapping if available, otherwise uses record's ISN
  const getPrimaryIsn = (record: IsnSearchData): string => {
    // Check if record's ISN has a mapped primary ISN
    const primaryIsn = identifierToPrimaryIsn.get(record.isn)
    return primaryIsn || record.isn
  }

  for (const record of data) {
    const groupKey = getPrimaryIsn(record)
    if (!groups[groupKey]) {
      groups[groupKey] = {
        isn: groupKey,
        site: record.site,
        project: record.project,
        hasError: false,
        errorCount: 0,
        records: [],
        stations: [],
      }
    }
    const group = groups[groupKey]
    if (group) {
      group.records.push(record)
      if (!isStatusPass(record.test_status) || !isStatusPass(record.error_code)) {
        group.hasError = true
        group.errorCount++
      }
    }
  }

  // Group records within each ISN by station
  for (const isnGroup of Object.values(groups)) {
    const stationMap: Record<string, StationGroup> = {}

    for (const record of isnGroup.records) {
      const stationKey = record.display_station_name || record.station_name
      if (!stationMap[stationKey]) {
        // Get station order from map, default to high number if not found
        const order =
          stationOrderMap.get(stationKey) ?? stationOrderMap.get(record.station_name) ?? 9999
        stationMap[stationKey] = {
          stationName: record.station_name,
          displayName: record.display_station_name || record.station_name,
          hasError: false,
          errorCount: 0,
          records: [],
          order,
        }
      }
      const station = stationMap[stationKey]
      if (station) {
        station.records.push(record)
        if (!isStatusPass(record.test_status) || !isStatusPass(record.error_code)) {
          station.hasError = true
          station.errorCount++
        }
      }
    }

    // Sort stations by order
    isnGroup.stations = Object.values(stationMap).sort((a, b) => a.order - b.order)
  }

  return Object.values(groups)
}

function clearAll(): void {
  searchIsn.value = ''
  selectedISNs.value = []
  multipleIsnSearchText.value = ''
  groupedByISN.value = []
  hasSearched.value = false
  isSearching.value = false
  selectedRecordIndices.value = []
  expandedPanels.value = {}
  activeISNTab.value = 0
  stationStatusFilters.value = {}
  recordSearchQueries.value = {}
  selectedFilterDeviceIds.value = {}
  testItemFilters.value = {}
  testItemSearchTerms.value = {}
  sfistspReferences.value = []
  carouselModels.value = {}
  compactExpanded.value = {}
  clearIsnSearchData()
}

/**
 * Format MAC address with colons (e.g., "AABBCCDDEEFF" -> "AA:BB:CC:DD:EE:FF")
 */
function formatMacAddress(mac: string | undefined): string {
  if (!mac) return '-'
  // Remove any existing separators and whitespace
  const cleanMac = mac.replace(/[:\-\s]/g, '').toUpperCase()
  if (cleanMac.length !== 12) return mac // Return original if not valid length
  return cleanMac.match(/.{2}/g)?.join(':') || mac
}

/**
 * Handle SFISTSP ISN reference lookup
 */
async function handleSfistspLookup(): Promise<void> {
  const isnList = getCurrentInputIdentifiers()

  if (isnList.length === 0) {
    error.value = 'Please enter at least one valid ISN for SFISTSP lookup'
    return
  }

  loadingSfistspLookup.value = true
  sfistspReferences.value = []

  try {
    const response = await lookupIsnsBatch(isnList)
    sfistspReferences.value = response.results.map((r: SfistspIsnReferenceResponse) => ({
      isn_searched: r.isn_searched,
      isn: r.isn,
      success: r.success,
      ssn: r.ssn || undefined,
      mac: r.mac || undefined,
      errorMessage: r.error_message || undefined,
      isn_references: r.isn_references,
    }))
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('SFISTSP lookup failed:', err)
    error.value = `SFISTSP lookup failed: ${errorMessage}`
  } finally {
    loadingSfistspLookup.value = false
  }
}

async function handleSearch(): Promise<void> {
  const isnList = getCurrentInputIdentifiers()

  if (isnList.length === 0) {
    error.value = 'Please enter at least one valid ISN'
    return
  }

  clearIsnSearchData()
  selectedRecordIndices.value = []
  expandedPanels.value = {}
  isSearching.value = true
  hasSearched.value = false // Will be set to true after search completes

  try {
    // Maps for unified search: identifier -> primary ISN
    const identifierToPrimaryIsn = new Map<string, string>()
    let searchTerms: string[] = [...isnList]

    if (enableUnifiedSearch.value) {
      // Collect all related identifiers from SFISTSP and map them to primary ISN
      const allIdentifiers = new Set<string>(isnList)

      try {
        const response = await lookupIsnsBatch(isnList)
        for (let i = 0; i < response.results.length; i++) {
          const result = response.results[i]
          const searchedIsn = isnList[i]
          if (!result?.success || !result.isn || !searchedIsn) {
            continue
          }

          const primaryIsn = result.isn
          identifierToPrimaryIsn.set(searchedIsn, primaryIsn)
          allIdentifiers.add(primaryIsn)
          identifierToPrimaryIsn.set(primaryIsn, primaryIsn)

          if (result.ssn) {
            allIdentifiers.add(result.ssn)
            identifierToPrimaryIsn.set(result.ssn, primaryIsn)
          }

          if (result.mac) {
            allIdentifiers.add(result.mac)
            identifierToPrimaryIsn.set(result.mac, primaryIsn)
          }
        }
      } catch (err) {
        console.warn(
          'SFISTSP lookup failed during unified search, proceeding with original terms:',
          err,
        )
      }

      searchTerms = Array.from(allIdentifiers).filter((term) => term && term.length > 0)
      console.log(
        `Unified search: expanded ${isnList.length} terms to ${searchTerms.length} unique identifiers`,
      )
    }

    // Fetch all ISNs - use batch endpoint for better performance (1 HTTP call instead of N)
    const allRecords: IsnSearchData[] = []
    const seenRecordKeys = new Set<string>() // Deduplicate records

    // Use batch search for multiple search terms (significantly faster - 1 HTTP call vs N)
    if (searchTerms.length > 1) {
      const resultMap = await searchByIsnBatch(searchTerms)
      for (const [_isn, records] of resultMap) {
        for (const record of records) {
          const recordKey = `${record.site}-${record.project}-${record.device_id}-${record.test_end_time}`
          if (!seenRecordKeys.has(recordKey)) {
            seenRecordKeys.add(recordKey)
            allRecords.push(record)
          }
        }
      }
    } else if (searchTerms.length === 1) {
      // Single ISN - use regular search
      try {
        // biome-ignore lint/style/noNonNullAssertion: length === 1 guarantees index 0 exists
        const data = await searchByIsn(searchTerms[0]!)
        for (const record of data) {
          const recordKey = `${record.site}-${record.project}-${record.device_id}-${record.test_end_time}`
          if (!seenRecordKeys.has(recordKey)) {
            seenRecordKeys.add(recordKey)
            allRecords.push(record)
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch records for ISN ${searchTerms[0]}:`, err)
      }
    }
    // Fetch station order from iPLAS API
    const stationOrderMap = new Map<string, number>()
    if (allRecords.length > 0) {
      try {
        // Get unique ISNs from records to fetch station info
        const uniqueIsns = [...new Set(allRecords.map((r) => r.isn))]
        if (uniqueIsns.length === 1) {
          // biome-ignore lint/style/noNonNullAssertion: length === 1 guarantees index 0 exists
          const stationsResponse = await iplasProxyApi.getStationsFromIsn({ isn: uniqueIsns[0]! })
          for (const station of stationsResponse.stations) {
            stationOrderMap.set(station.display_station_name, station.order)
            stationOrderMap.set(station.station_name, station.order)
          }
        } else if (uniqueIsns.length > 1) {
          const stationsResponse = await iplasProxyApi.getStationsFromIsnBatch({
            isns: uniqueIsns.slice(0, 50),
          })
          for (const result of stationsResponse.results) {
            for (const station of result.stations) {
              stationOrderMap.set(station.display_station_name, station.order)
              stationOrderMap.set(station.station_name, station.order)
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch station order, using default order:', err)
      }
    }

    // Group by ISN with identifier mapping and station order
    groupedByISN.value = groupDataByISN(allRecords, identifierToPrimaryIsn, stationOrderMap)

    // Initialize expanded panels for first tab
    if (groupedByISN.value.length > 0) {
      expandedPanels.value[0] = [0]
      activeISNTab.value = 0

      // Initialize testItemFilters to 'value' for all records
      for (let isnIndex = 0; isnIndex < groupedByISN.value.length; isnIndex++) {
        const isnGroup = groupedByISN.value[isnIndex]
        if (!isnGroup) continue
        for (let stationIndex = 0; stationIndex < isnGroup.stations.length; stationIndex++) {
          const station = isnGroup.stations[stationIndex]
          if (!station) continue
          for (let recordIndex = 0; recordIndex < station.records.length; recordIndex++) {
            const key = `${isnGroup.isn}-${stationIndex}-${recordIndex}`
            testItemFilters.value[key] = 'value'
          }
        }
      }
    }
  } catch (err) {
    console.error('Search failed:', err)
  } finally {
    // Mark search as complete - this prevents premature "no results" alert
    isSearching.value = false
    hasSearched.value = true
  }
}
</script>

<style scoped>
.iplas-isn-shell {
  display: grid;
  gap: 1rem;
}

.iplas-isn-stack,
.iplas-isn-toolbar,
.iplas-isn-field,
.iplas-isn-reference-stack,
.iplas-isn-results-pane,
.iplas-isn-section-stack,
.iplas-isn-summary-card,
.iplas-isn-list-stack,
.iplas-isn-compact-card {
  display: grid;
  gap: 0.9rem;
}

.iplas-isn-toolbar,
.iplas-isn-toggle-row,
.iplas-isn-entry-row,
.iplas-isn-token-row,
.iplas-isn-inline-actions,
.iplas-isn-reference-panel__header,
.iplas-isn-reference-card__topline,
.iplas-isn-reference-token-row,
.iplas-isn-results-actions,
.iplas-isn-view-toggle-row,
.iplas-isn-station-section__toggle,
.iplas-isn-station-section__meta,
.iplas-isn-record-card__identity,
.iplas-isn-record-card__meta,
.iplas-isn-record-card__actions,
.iplas-isn-list-row,
.iplas-isn-list-row__meta,
.iplas-isn-carousel-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.iplas-isn-toolbar {
  justify-content: space-between;
}

.iplas-isn-toggle-chip,
.iplas-isn-button,
.iplas-isn-token,
.iplas-isn-reference-code {
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel);
  color: var(--app-ink);
  font: inherit;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.iplas-isn-toggle-chip,
.iplas-isn-button,
.iplas-isn-token,
.iplas-isn-reference-code {
  cursor: pointer;
}

.iplas-isn-toggle-chip:hover,
.iplas-isn-button:hover,
.iplas-isn-token:hover,
.iplas-isn-reference-code:hover {
  border-color: rgba(15, 118, 110, 0.24);
}

.iplas-isn-toggle-chip,
.iplas-isn-button,
.iplas-isn-token,
.iplas-isn-reference-code {
  padding: 0.62rem 0.88rem;
}

.iplas-isn-toggle-chip.is-active,
.iplas-isn-button--primary {
  background: var(--app-accent);
  border-color: var(--app-accent);
  color: var(--app-canvas);
}

.iplas-isn-button--secondary {
  background: var(--app-info-soft);
  border-color: var(--app-info-line);
  color: var(--app-info);
}

.iplas-isn-button--ghost {
  background: var(--app-panel);
}

.iplas-isn-toggle-card,
.iplas-isn-notice,
.iplas-isn-reference-panel {
  border: 1px solid var(--app-border);
  border-radius: 0.8rem;
  background: var(--app-panel);
}

.iplas-isn-toggle-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.85rem;
  align-items: start;
  padding: 0.82rem 0.9rem;
}

.iplas-isn-toggle-card input {
  margin-top: 0.15rem;
  accent-color: var(--app-accent);
}

.iplas-isn-toggle-card p,
.iplas-isn-field small,
.iplas-isn-reference-error {
  margin: 0;
  color: var(--app-muted);
}

.iplas-isn-field span,
.iplas-isn-reference-label,
.iplas-isn-reference-card small {
  color: var(--app-ink);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: none;
}

.iplas-isn-field input,
.iplas-isn-field textarea {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  padding: 0.72rem 0.82rem;
  font: inherit;
}

.iplas-isn-field textarea {
  resize: vertical;
}

.iplas-isn-entry-row {
  align-items: stretch;
}

.iplas-isn-entry-row input {
  flex: 1 1 16rem;
}

.iplas-isn-entry-row--split {
  justify-content: space-between;
}

.iplas-isn-inline-actions {
  justify-content: flex-end;
}

.iplas-isn-token-row,
.iplas-isn-reference-token-row {
  gap: 0.6rem;
}

.iplas-isn-token {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.iplas-isn-reference-panel {
  padding: 0.9rem;
}

.iplas-isn-reference-panel__header {
  justify-content: space-between;
  margin-bottom: 0.85rem;
}

.iplas-isn-reference-panel__eyebrow {
  margin: 0 0 0.2rem;
  color: var(--app-accent);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.iplas-isn-reference-panel__header h3 {
  margin: 0;
  color: var(--app-ink);
}

.iplas-isn-reference-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 0.85rem;
}

.iplas-isn-results-actions {
  justify-content: flex-end;
}

.iplas-isn-results-toolbar {
  display: grid;
  gap: 1rem;
  padding-bottom: 0.25rem;
}

.iplas-isn-summary-grid,
.iplas-isn-station-grid,
.iplas-isn-compact-grid {
  display: grid;
  gap: 1rem;
}

.iplas-isn-summary-grid {
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
}

.iplas-isn-summary-card,
.iplas-isn-station-card,
.iplas-isn-station-section,
.iplas-isn-compact-card {
  border: 1px solid var(--app-border);
  border-radius: 1.25rem;
  background: var(--app-panel-strong);
}

.iplas-isn-summary-card {
  padding: 0.9rem 1rem;
  text-align: left;
}

.iplas-isn-summary-card small {
  color: var(--app-muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.iplas-isn-summary-card strong {
  color: var(--app-ink);
  font-size: 1rem;
}

.iplas-isn-summary-card--primary {
  cursor: pointer;
  border-color: var(--app-success-line);
  background: var(--app-panel);
}

.iplas-isn-summary-card--success {
  border-color: var(--app-success-line);
  background: var(--app-success-soft);
}

.iplas-isn-summary-card--danger {
  border-color: var(--app-danger-line);
  background: var(--app-danger-soft);
}

.iplas-isn-station-grid {
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
}

.iplas-isn-station-card,
.iplas-isn-station-section {
  overflow: hidden;
}

.iplas-isn-station-card__header,
.iplas-isn-station-section__toggle {
  justify-content: space-between;
  width: 100%;
  padding: 1rem 1.1rem;
  border: 0;
  background: var(--app-panel);
  color: var(--app-ink);
  text-align: left;
  cursor: pointer;
}

.iplas-isn-station-card__header.is-error,
.iplas-isn-station-section__toggle.is-error {
  background: var(--app-danger-soft);
}

.iplas-isn-station-card__header p,
.iplas-isn-station-section__toggle span {
  margin: 0.25rem 0 0;
  color: var(--app-muted);
}

.iplas-isn-station-section__body,
.iplas-isn-record-card,
.iplas-isn-empty-state {
  padding: 1rem 1.1rem;
}

.iplas-isn-record-card,
.iplas-isn-list-row,
.iplas-isn-compact-card {
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
}

.iplas-isn-record-card.is-pass,
.iplas-isn-list-row.is-pass,
.iplas-isn-compact-card.is-pass {
  border-color: var(--app-success-line);
  background: var(--app-success-soft);
}

.iplas-isn-record-card.is-fail,
.iplas-isn-list-row.is-fail,
.iplas-isn-compact-card.is-fail {
  border-color: var(--app-danger-line);
  background: var(--app-danger-soft);
}

.iplas-isn-record-card__status {
  margin: 0;
  font-weight: 700;
}

.iplas-isn-record-card__status.is-pass {
  color: var(--app-accent);
}

.iplas-isn-record-card__status.is-fail,
.iplas-isn-text-danger {
  color: var(--app-danger);
}

.iplas-isn-record-card__actions {
  justify-content: flex-start;
}

.iplas-isn-record-card__actions--tight {
  gap: 0.5rem;
}

.iplas-isn-inline-button {
  border: 1px solid var(--app-border);
  border-radius: 0.85rem;
  background: var(--app-panel);
  color: var(--app-ink);
  padding: 0.55rem 0.8rem;
  font: inherit;
  cursor: pointer;
}

.iplas-isn-inline-button:disabled,
.iplas-isn-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.iplas-isn-list-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
}

.iplas-isn-list-row__copy {
  display: grid;
  gap: 0.55rem;
}

.iplas-isn-compact-grid {
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  padding: 1rem 1.1rem;
}

.iplas-isn-compact-card {
  padding: 0.9rem 1rem;
}

.iplas-isn-empty-state {
  color: var(--app-muted);
}

.iplas-isn-reference-card {
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
  padding: 1rem;
}

.iplas-isn-reference-card--success {
  border-color: var(--app-success-line);
  background: var(--app-panel);
}

.iplas-isn-reference-card--error {
  border-color: var(--app-danger-line);
  background: var(--app-panel);
}

.iplas-isn-reference-card__topline {
  justify-content: space-between;
  align-items: start;
  margin-bottom: 0.8rem;
}

.iplas-isn-reference-card__topline strong {
  display: block;
  margin-top: 0.2rem;
  color: var(--app-ink);
}

.iplas-isn-reference-code {
  display: grid;
  gap: 0.25rem;
  text-align: left;
}

.iplas-isn-reference-code span {
  color: var(--app-muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: none;
}

.iplas-isn-reference-code strong {
  color: var(--app-ink);
  font-family: var(--app-mono, 'Consolas', monospace);
}

.iplas-isn-notice {
  padding: 0.95rem 1rem;
  font-weight: 600;
}

.iplas-isn-notice--error {
  border-color: var(--app-danger-line);
  background: var(--app-danger-soft);
  color: var(--app-danger);
}

.iplas-isn-notice--info {
  border-color: var(--app-info-line);
  background: var(--app-info-soft);
  color: var(--app-info);
}

.iplas-isn-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.78rem;
  font-weight: 700;
}

.iplas-isn-pill--success {
  background: rgba(15, 118, 110, 0.1);
  border-color: rgba(15, 118, 110, 0.16);
  color: var(--app-accent);
}

.iplas-isn-pill--danger {
  background: var(--app-danger-soft);
  border-color: var(--app-danger-line);
  color: var(--app-danger);
}

.iplas-isn-pill--primary {
  background: var(--app-info-soft);
  border-color: var(--app-info-line);
  color: var(--app-info);
}

.iplas-isn-pill--neutral {
  background: rgba(95, 103, 122, 0.08);
  border-color: rgba(95, 103, 122, 0.16);
  color: var(--app-muted);
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

.gap-4 {
    gap: 1rem;
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

@media (max-width: 900px) {
  .iplas-isn-toolbar,
  .iplas-isn-entry-row--split,
  .iplas-isn-list-row {
    flex-direction: column;
    align-items: stretch;
  }

  .iplas-isn-inline-actions {
    justify-content: flex-start;
  }

  .iplas-isn-results-actions {
    justify-content: flex-start;
  }
}
</style>
