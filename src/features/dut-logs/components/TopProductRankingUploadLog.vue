<template>
  <div class="top-product-ranking-upload-log">
    <AppDialog
      v-model="fullscreen"
      width="98vw"
      :breakpoints="dialogBreakpoints"
      maximizable
      :closable="false"
      class="top-product-ranking-upload-log__dialog"
    >
      <template #header>
        <div class="top-product-ranking-upload-log__dialog-header">
          <div>
            <p class="top-product-ranking-upload-log__eyebrow">Expanded Ranking</p>
            <h2>Complete Ranking</h2>
            <p>Review the full upload-log ranking set without leaving the Top Product workspace.</p>
          </div>

          <div class="top-product-ranking-upload-log__dialog-actions">
            <button
              type="button"
              class="top-product-ranking-upload-log__ghost-button"
              @click="fullscreen = false"
            >
              <Icon icon="mdi:close" />
              <span>Close</span>
            </button>
          </div>
        </div>
      </template>

      <div class="top-product-ranking-upload-log__workspace top-product-ranking-upload-log__workspace--fullscreen">
        <section class="top-product-ranking-upload-log__station-tabs">
          <button
            type="button"
            class="top-product-ranking-upload-log__station-tab"
            :class="{ 'top-product-ranking-upload-log__station-tab--active': stationTab === 'all' }"
            @click="stationTab = 'all'"
          >
            <span>All Stations</span>
            <strong>{{ rankings.length }}</strong>
          </button>
          <button
            v-for="station in availableStations"
            :key="station"
            type="button"
            class="top-product-ranking-upload-log__station-tab"
            :class="{ 'top-product-ranking-upload-log__station-tab--active': stationTab === station }"
            @click="stationTab = station"
          >
            <span>{{ station }}</span>
            <strong>{{ getStationCount(station) }}</strong>
          </button>
        </section>

        <section class="top-product-ranking-upload-log__filter-grid">
          <label class="top-product-ranking-upload-log__field top-product-ranking-upload-log__field--wide">
            <span>Search</span>
            <input v-model="searchQuery" type="text" placeholder="ISN, device, station, or test date">
          </label>
          <label class="top-product-ranking-upload-log__field">
            <span>Score Filter</span>
            <select v-model="scoreFilterType">
              <option :value="null">No filter</option>
              <option v-for="option in scoreFilterTypes" :key="option.value" :value="option.value">
                {{ option.title }}
              </option>
            </select>
          </label>
          <label class="top-product-ranking-upload-log__field">
            <span>Score Value</span>
            <input
              v-model.number="scoreFilterValue"
              type="number"
              placeholder="e.g. 9"
              :disabled="!scoreFilterType"
            >
          </label>
          <label class="top-product-ranking-upload-log__field">
            <span>Test Result</span>
            <select v-model="resultFilter">
              <option :value="null">All</option>
              <option v-for="option in resultFilterOptions.filter((item) => item.value !== null)" :key="option.value" :value="option.value">
                {{ option.title }}
              </option>
            </select>
          </label>
        </section>

        <AppDataGrid
          :columns="rankingGridColumns"
          :rows="paginatedRankings"
          dataKey="row_id"
          :selection="selectedRankingItems"
          selectionMode="multiple"
          :showSelectionColumn="true"
          :metaKeySelection="false"
          :scrollHeight="'calc(100vh - 24rem)'"
          :rowClass="rankingRowClass"
          emptyMessage="No ranking rows match the current filters."
          @update:selection="updateSelection"
          @row-click="handleGridRowClick"
        >
          <template #cell-rank="{ index }">
            <span class="top-product-ranking-upload-log__rank-value">{{ (currentPage - 1) * getPerPage() + index + 1 }}</span>
          </template>
          <template #cell-isn="{ data }">
            <span class="top-product-ranking-upload-log__strong">{{ data.isn || 'N/A' }}</span>
          </template>
          <template #cell-test_date="{ data }">
            <span>{{ formatTestDate(data.test_date) }}</span>
          </template>
          <template #cell-duration="{ data }">
            <span>{{ formatDuration(data.duration_seconds) }}</span>
          </template>
          <template #cell-device="{ data }">
            <span>{{ data.device || 'N/A' }}</span>
          </template>
          <template #cell-status="{ data }">
            <span class="top-product-ranking-upload-log__badge top-product-ranking-upload-log__badge--neutral">
              {{ data.status }}
            </span>
          </template>
          <template #cell-result="{ data }">
            <span class="top-product-ranking-upload-log__badge" :class="resultBadgeClass(data.result)">
              {{ data.result || 'N/A' }}
            </span>
          </template>
          <template #cell-score="{ data }">
            <button
              type="button"
              class="top-product-ranking-upload-log__score-button"
              :class="scoreBadgeClass(data.score)"
              @click.stop="showScoreBreakdownForIsn(data)"
            >
              <span>{{ data.score.toFixed(2) }}</span>
              <Icon icon="mdi:information-outline" />
            </button>
          </template>
        </AppDataGrid>

        <div class="top-product-ranking-upload-log__footer-bar">
          <div class="top-product-ranking-upload-log__footer-group">
            <span>Show</span>
            <select v-model.number="itemsPerPage">
              <option v-for="option in itemsPerPageOptions" :key="option.value" :value="option.value">
                {{ option.title }}
              </option>
            </select>
            <span>items</span>
          </div>

          <div v-if="totalPages > 1" class="top-product-ranking-upload-log__pager">
            <button type="button" class="top-product-ranking-upload-log__pager-button" :disabled="currentPage === 1" @click="currentPage -= 1">
              Prev
            </button>
            <button
              v-for="page in visiblePageNumbers"
              :key="page"
              type="button"
              class="top-product-ranking-upload-log__pager-button"
              :class="{ 'top-product-ranking-upload-log__pager-button--active': currentPage === page }"
              @click="currentPage = page"
            >
              {{ page }}
            </button>
            <button type="button" class="top-product-ranking-upload-log__pager-button" :disabled="currentPage === totalPages" @click="currentPage += 1">
              Next
            </button>
          </div>
        </div>
      </div>
    </AppDialog>

    <AppDialog
      v-model="showTestItemsDialog"
      :width="testItemsFullscreen ? '98vw' : 'min(96vw, 84rem)'"
      :breakpoints="dialogBreakpoints"
      maximizable
      :closable="false"
      class="top-product-ranking-upload-log__dialog"
    >
      <template #header>
        <div class="top-product-ranking-upload-log__dialog-header">
          <div>
            <p class="top-product-ranking-upload-log__eyebrow">Detail Review</p>
            <h2>Test Items Details</h2>
            <p v-if="selectedRankingItem">Inspect the selected DUT record, save it, or compare it with iPLAS.</p>
          </div>

          <div class="top-product-ranking-upload-log__dialog-actions">
            <button
              type="button"
              class="top-product-ranking-upload-log__ghost-button"
              :disabled="savingToDb"
              @click="saveSingleToDatabase"
            >
              <Icon :icon="savingToDb ? 'mdi:loading' : 'mdi:database-plus'" :class="{ 'top-product-ranking-upload-log__spin': savingToDb }" />
              <span>{{ savingToDb ? 'Saving...' : 'Save to DB' }}</span>
            </button>
            <button
              v-if="selectedRankingItem?.isn"
              type="button"
              class="top-product-ranking-upload-log__ghost-button"
              @click="openIplasCompare"
            >
              <Icon icon="mdi:compare-horizontal" />
              <span>Compare iPLAS</span>
            </button>
            <button
              type="button"
              class="top-product-ranking-upload-log__ghost-button"
              @click="testItemsFullscreen = !testItemsFullscreen"
            >
              <Icon :icon="testItemsFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" />
              <span>{{ testItemsFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}</span>
            </button>
            <button
              type="button"
              class="top-product-ranking-upload-log__ghost-button"
              @click="showTestItemsDialog = false"
            >
              <Icon icon="mdi:close" />
              <span>Close</span>
            </button>
          </div>
        </div>
      </template>

      <div v-if="selectedRankingItem" class="top-product-ranking-upload-log__details-shell">
        <section class="top-product-ranking-upload-log__summary-grid">
          <article class="top-product-ranking-upload-log__summary-card top-product-ranking-upload-log__summary-card--highlight">
            <button type="button" class="top-product-ranking-upload-log__info-button" @click="copyIsnToClipboard(selectedRankingItem.isn)">
              <span class="top-product-ranking-upload-log__info-icon"><Icon icon="mdi:barcode" /></span>
              <span>
                <small>DUT ISN</small>
                <strong>{{ selectedRankingItem.isn || 'N/A' }}</strong>
              </span>
            </button>
          </article>
          <article class="top-product-ranking-upload-log__summary-card">
            <div class="top-product-ranking-upload-log__info-button top-product-ranking-upload-log__info-button--static">
              <span class="top-product-ranking-upload-log__info-icon"><Icon icon="mdi:factory" /></span>
              <span>
                <small>Station</small>
                <strong>{{ selectedRankingItem.station }}</strong>
              </span>
            </div>
          </article>
          <article class="top-product-ranking-upload-log__summary-card">
            <div class="top-product-ranking-upload-log__info-button top-product-ranking-upload-log__info-button--static">
              <span class="top-product-ranking-upload-log__info-icon"><Icon icon="mdi:chip" /></span>
              <span>
                <small>Device</small>
                <strong>{{ selectedRankingItem.device || 'N/A' }}</strong>
              </span>
            </div>
          </article>
        </section>

        <section class="top-product-ranking-upload-log__meta-pills">
          <span class="top-product-ranking-upload-log__pill top-product-ranking-upload-log__pill--neutral">
            <Icon icon="mdi:calendar-clock" />
            <strong>Test Date:</strong>
            <span>{{ formatTestDate(selectedRankingItem.test_date) }}</span>
          </span>
          <span class="top-product-ranking-upload-log__pill top-product-ranking-upload-log__pill--neutral">
            <Icon icon="mdi:timer" />
            <strong>Duration:</strong>
            <span>{{ formatDuration(selectedRankingItem.duration_seconds) }}</span>
          </span>
          <span class="top-product-ranking-upload-log__pill top-product-ranking-upload-log__pill--cool">
            <Icon icon="mdi:list-box" />
            <strong>Test Items:</strong>
            <span>{{ selectedTestItems.length }}</span>
          </span>
          <span class="top-product-ranking-upload-log__pill top-product-ranking-upload-log__pill--cool">
            <Icon icon="mdi:cloud-check" />
            <strong>SFIS Status:</strong>
            <span>{{ selectedRankingItem.status }}</span>
          </span>
          <span class="top-product-ranking-upload-log__pill" :class="resultBadgeClass(selectedRankingItem.result)">
            <Icon icon="mdi:flag-checkered" />
            <strong>Result:</strong>
            <span>{{ selectedRankingItem.result || 'N/A' }}</span>
          </span>
          <span class="top-product-ranking-upload-log__pill" :class="scoreBadgeClass(selectedRankingItem.score)">
            <Icon icon="mdi:chart-line" />
            <strong>Overall Score:</strong>
            <span>{{ selectedRankingItem.score.toFixed(2) }}</span>
          </span>
        </section>

        <section class="top-product-ranking-upload-log__filter-grid">
          <label class="top-product-ranking-upload-log__field top-product-ranking-upload-log__field--wide">
            <span>Search Test Items</span>
            <input v-model="testItemSearch" type="text" placeholder="Search by test item name">
          </label>
          <label class="top-product-ranking-upload-log__field">
            <span>Filter Items</span>
            <select v-model="testItemFilterType">
              <option v-for="option in testItemFilterOptions" :key="option.value" :value="option.value">
                {{ option.title }}
              </option>
            </select>
          </label>
          <div class="top-product-ranking-upload-log__field top-product-ranking-upload-log__field--actions">
            <span>Visible Items</span>
            <div class="top-product-ranking-upload-log__action-row">
              <span class="top-product-ranking-upload-log__badge top-product-ranking-upload-log__badge--neutral">
                {{ filteredTestItems.length }} / {{ selectedTestItems.length }}
              </span>
              <button
                v-if="testItemFilterType !== 'all' || testItemSearch"
                type="button"
                class="top-product-ranking-upload-log__ghost-button"
                @click="resetTestItemFilters"
              >
                <Icon icon="mdi:filter-off" />
                <span>Clear Filters</span>
              </button>
            </div>
          </div>
        </section>

        <AppDataGrid
          :columns="testItemGridColumns"
          :rows="filteredTestItems"
          dataKey="test_item"
          paginator
          :rowsPerPage="50"
          :rowsPerPageOptions="[25, 50, 100, 200]"
          :scrollHeight="testItemsFullscreen ? 'calc(100vh - 26rem)' : '30rem'"
          emptyMessage="No test items match the current filters."
          @row-click="handleTestItemRowClick"
        >
          <template #cell-test_item="{ data }">
            <span class="top-product-ranking-upload-log__strong">{{ data.test_item }}</span>
          </template>
          <template #cell-usl="{ data }">
            <span class="top-product-ranking-upload-log__muted">{{ data.usl ?? '-' }}</span>
          </template>
          <template #cell-lsl="{ data }">
            <span class="top-product-ranking-upload-log__muted">{{ data.lsl ?? '-' }}</span>
          </template>
          <template #cell-score="{ data }">
            <button
              v-if="data.score !== null"
              type="button"
              class="top-product-ranking-upload-log__score-button"
              :class="scoreBadgeClass(data.score)"
              @click.stop="showScoreBreakdown(data)"
            >
              <span>{{ data.score?.toFixed(2) }}</span>
              <Icon icon="mdi:information-outline" />
            </button>
            <span v-else class="top-product-ranking-upload-log__muted">-</span>
          </template>
        </AppDataGrid>
      </div>
    </AppDialog>

    <IplasCompareDialog
      v-model="showIplasCompareDialog"
      :isn="comparisonIsn"
      :upload-test-items="selectedTestItems"
      :scoring-configs="scoringConfigs"
    />

    <AppDialog
      v-model="showBreakdownDialog"
      :width="breakdownFullscreen ? '96vw' : 'min(94vw, 44rem)'"
      :breakpoints="{ '960px': '98vw', '640px': '100vw' }"
      :closable="false"
      class="top-product-ranking-upload-log__dialog"
    >
      <template #header>
        <div class="top-product-ranking-upload-log__dialog-header">
          <div>
            <p class="top-product-ranking-upload-log__eyebrow">Score Breakdown</p>
            <h2>{{ selectedTestItem?.test_item || 'Score Breakdown' }}</h2>
            <p v-if="selectedTestItem">Review the applied scoring inputs and final score for this test item.</p>
          </div>

          <div class="top-product-ranking-upload-log__dialog-actions">
            <button
              type="button"
              class="top-product-ranking-upload-log__ghost-button"
              @click="breakdownFullscreen = !breakdownFullscreen"
            >
              <Icon :icon="breakdownFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" />
              <span>{{ breakdownFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}</span>
            </button>
            <button
              type="button"
              class="top-product-ranking-upload-log__ghost-button"
              @click="showBreakdownDialog = false"
            >
              <Icon icon="mdi:close" />
              <span>Close</span>
            </button>
          </div>
        </div>
      </template>

      <div v-if="selectedTestItem?.score_breakdown" class="top-product-ranking-upload-log__breakdown-shell">
        <section class="top-product-ranking-upload-log__summary-grid">
          <article class="top-product-ranking-upload-log__summary-card">
            <small>Actual Value</small>
            <strong>{{ selectedTestItem.value }}</strong>
          </article>
          <article class="top-product-ranking-upload-log__summary-card">
            <small>Score</small>
            <strong>{{ selectedTestItem.score?.toFixed(2) ?? 'N/A' }}</strong>
          </article>
          <article class="top-product-ranking-upload-log__summary-card">
            <small>Scoring Type</small>
            <strong>{{ selectedTestItem.score_breakdown.scoring_type ?? 'N/A' }}</strong>
          </article>
        </section>

        <div class="top-product-ranking-upload-log__detail-table">
          <div class="top-product-ranking-upload-log__detail-row">
            <span>Scoring Type</span>
            <strong>{{ selectedTestItem.score_breakdown.scoring_type }}</strong>
          </div>
          <div v-if="selectedTestItem.score_breakdown.ucl !== null && selectedTestItem.score_breakdown.ucl !== undefined" class="top-product-ranking-upload-log__detail-row">
            <span>UCL (Upper Limit)</span>
            <strong>{{ selectedTestItem.score_breakdown.ucl }}</strong>
          </div>
          <div v-if="selectedTestItem.score_breakdown.lcl !== null && selectedTestItem.score_breakdown.lcl !== undefined" class="top-product-ranking-upload-log__detail-row">
            <span>LCL (Lower Limit)</span>
            <strong>{{ selectedTestItem.score_breakdown.lcl }}</strong>
          </div>
          <div v-if="selectedTestItem.score_breakdown.target !== null && selectedTestItem.score_breakdown.target !== undefined" class="top-product-ranking-upload-log__detail-row">
            <span>Target</span>
            <strong>{{ selectedTestItem.score_breakdown.target?.toFixed(2) }}</strong>
          </div>
          <div v-if="selectedTestItem.score_breakdown.actual !== null && selectedTestItem.score_breakdown.actual !== undefined" class="top-product-ranking-upload-log__detail-row">
            <span>Actual Value</span>
            <strong>{{ selectedTestItem.score_breakdown.actual }}</strong>
          </div>
          <div v-if="selectedTestItem.score_breakdown.deviation !== null && selectedTestItem.score_breakdown.deviation !== undefined" class="top-product-ranking-upload-log__detail-row">
            <span>Deviation</span>
            <strong>{{ selectedTestItem.score_breakdown.deviation?.toFixed(2) }}</strong>
          </div>
          <div v-if="selectedTestItem.score_breakdown.policy" class="top-product-ranking-upload-log__detail-row">
            <span>Policy</span>
            <strong>{{ selectedTestItem.score_breakdown.policy }}</strong>
          </div>
          <div class="top-product-ranking-upload-log__detail-row">
            <span>Weight</span>
            <strong>{{ selectedTestItem.score_breakdown.weight ?? 1.0 }}</strong>
          </div>
          <div class="top-product-ranking-upload-log__detail-row top-product-ranking-upload-log__detail-row--highlight">
            <span>Score (0-10)</span>
            <strong>{{ selectedTestItem.score_breakdown.score?.toFixed(2) ?? 'N/A' }}</strong>
          </div>
        </div>
      </div>
    </AppDialog>

    <AppDialog
      v-model="showCustomInput"
      width="min(92vw, 28rem)"
      :breakpoints="{ '640px': '100vw' }"
      :closable="false"
      class="top-product-ranking-upload-log__dialog"
    >
      <template #header>
        <div class="top-product-ranking-upload-log__dialog-header">
          <div>
            <p class="top-product-ranking-upload-log__eyebrow">Pagination</p>
            <h2>Custom Items Per Page</h2>
            <p>Choose how many ranking rows to show per page.</p>
          </div>
        </div>
      </template>

      <div class="top-product-ranking-upload-log__custom-dialog">
        <label class="top-product-ranking-upload-log__field">
          <span>Items Per Page</span>
          <input
            v-model.number="customItemsPerPage"
            type="number"
            min="1"
            :max="MAX_TABLE_ITEMS_PER_PAGE"
            @keyup.enter="applyCustomItemsPerPage"
          >
        </label>

        <div class="top-product-ranking-upload-log__dialog-actions">
          <button type="button" class="top-product-ranking-upload-log__ghost-button" @click="cancelCustomInput">
            Cancel
          </button>
          <button type="button" class="top-product-ranking-upload-log__primary-button" @click="applyCustomItemsPerPage">
            Apply
          </button>
        </div>
      </div>
    </AppDialog>

    <AppPanel
      eyebrow="Upload Log Ranking"
      title="Top Product Ranking By Overall Score"
      description="Rank uploaded DUT logs, select the winners for database save, and drill into test-item details for iPLAS comparison."
      splitHeader
      tone="warm"
    >
      <template #header-aside>
        <div class="top-product-ranking-upload-log__panel-actions">
          <button
            type="button"
            class="top-product-ranking-upload-log__ghost-button"
            :disabled="selectedRankingItems.length === 0 || savingToDb"
            @click="saveSelectedToDatabase"
          >
            <Icon :icon="savingToDb ? 'mdi:loading' : 'mdi:database-plus'" :class="{ 'top-product-ranking-upload-log__spin': savingToDb }" />
            <span>Save to DB{{ selectedRankingItems.length > 0 ? ` (${selectedRankingItems.length})` : '' }}</span>
          </button>
          <button
            type="button"
            class="top-product-ranking-upload-log__primary-button"
            :disabled="exportingRanking"
            @click="exportRankingToExcel"
          >
            <Icon :icon="exportingRanking ? 'mdi:loading' : 'mdi:microsoft-excel'" :class="{ 'top-product-ranking-upload-log__spin': exportingRanking }" />
            <span>Export{{ selectedRankingItems.length > 0 ? ` (${selectedRankingItems.length})` : '' }}</span>
          </button>
        </div>
      </template>

      <section class="top-product-ranking-upload-log__stat-grid">
        <article class="top-product-ranking-upload-log__stat-card">
          <small>Visible Ranking Rows</small>
          <strong>{{ filteredRankings.length }}</strong>
        </article>
        <article class="top-product-ranking-upload-log__stat-card top-product-ranking-upload-log__stat-card--cool">
          <small>Stations</small>
          <strong>{{ availableStations.length }}</strong>
        </article>
        <article class="top-product-ranking-upload-log__stat-card top-product-ranking-upload-log__stat-card--warm">
          <small>Selected Rows</small>
          <strong>{{ selectedRankingItems.length }}</strong>
        </article>
      </section>

      <section class="top-product-ranking-upload-log__workspace">
        <div class="top-product-ranking-upload-log__section-header">
          <div>
            <h3>Complete Ranking</h3>
            <p>Rankings are based on overall scoring. Higher scores rise to the top.</p>
          </div>

          <button type="button" class="top-product-ranking-upload-log__ghost-button" @click="fullscreen = true">
            <Icon icon="mdi:fullscreen" />
            <span>Fullscreen</span>
          </button>
        </div>

        <section class="top-product-ranking-upload-log__station-tabs">
          <button
            type="button"
            class="top-product-ranking-upload-log__station-tab"
            :class="{ 'top-product-ranking-upload-log__station-tab--active': stationTab === 'all' }"
            @click="stationTab = 'all'"
          >
            <span>All Stations</span>
            <strong>{{ rankings.length }}</strong>
          </button>
          <button
            v-for="station in availableStations"
            :key="station"
            type="button"
            class="top-product-ranking-upload-log__station-tab"
            :class="{ 'top-product-ranking-upload-log__station-tab--active': stationTab === station }"
            @click="stationTab = station"
          >
            <span>{{ station }}</span>
            <strong>{{ getStationCount(station) }}</strong>
          </button>
        </section>

        <section class="top-product-ranking-upload-log__filter-grid">
          <label class="top-product-ranking-upload-log__field top-product-ranking-upload-log__field--wide">
            <span>Search</span>
            <input v-model="searchQuery" type="text" placeholder="ISN, device, station, or test date">
          </label>
          <label class="top-product-ranking-upload-log__field">
            <span>Score Filter</span>
            <select v-model="scoreFilterType">
              <option :value="null">No filter</option>
              <option v-for="option in scoreFilterTypes" :key="option.value" :value="option.value">
                {{ option.title }}
              </option>
            </select>
          </label>
          <label class="top-product-ranking-upload-log__field">
            <span>Score Value</span>
            <input
              v-model.number="scoreFilterValue"
              type="number"
              placeholder="e.g. 9"
              :disabled="!scoreFilterType"
            >
          </label>
          <label class="top-product-ranking-upload-log__field">
            <span>Test Result</span>
            <select v-model="resultFilter">
              <option :value="null">All</option>
              <option v-for="option in resultFilterOptions.filter((item) => item.value !== null)" :key="option.value" :value="option.value">
                {{ option.title }}
              </option>
            </select>
          </label>
        </section>

        <AppDataGrid
          :columns="rankingGridColumns"
          :rows="paginatedRankings"
          dataKey="row_id"
          :selection="selectedRankingItems"
          selectionMode="multiple"
          :showSelectionColumn="true"
          :metaKeySelection="false"
          scrollHeight="32rem"
          :rowClass="rankingRowClass"
          emptyMessage="No ranking rows match the current filters."
          @update:selection="updateSelection"
          @row-click="handleGridRowClick"
        >
          <template #cell-rank="{ index }">
            <span class="top-product-ranking-upload-log__rank-value">{{ (currentPage - 1) * getPerPage() + index + 1 }}</span>
          </template>
          <template #cell-isn="{ data }">
            <span class="top-product-ranking-upload-log__strong">{{ data.isn || 'N/A' }}</span>
          </template>
          <template #cell-test_date="{ data }">
            <span>{{ formatTestDate(data.test_date) }}</span>
          </template>
          <template #cell-duration="{ data }">
            <span>{{ formatDuration(data.duration_seconds) }}</span>
          </template>
          <template #cell-device="{ data }">
            <span>{{ data.device || 'N/A' }}</span>
          </template>
          <template #cell-status="{ data }">
            <span class="top-product-ranking-upload-log__badge top-product-ranking-upload-log__badge--neutral">
              {{ data.status }}
            </span>
          </template>
          <template #cell-result="{ data }">
            <span class="top-product-ranking-upload-log__badge" :class="resultBadgeClass(data.result)">
              {{ data.result || 'N/A' }}
            </span>
          </template>
          <template #cell-score="{ data }">
            <button
              type="button"
              class="top-product-ranking-upload-log__score-button"
              :class="scoreBadgeClass(data.score)"
              @click.stop="showScoreBreakdownForIsn(data)"
            >
              <span>{{ data.score.toFixed(2) }}</span>
              <Icon icon="mdi:information-outline" />
            </button>
          </template>
        </AppDataGrid>

        <div class="top-product-ranking-upload-log__footer-bar">
          <div class="top-product-ranking-upload-log__footer-group">
            <span>Show</span>
            <select v-model.number="itemsPerPage">
              <option v-for="option in itemsPerPageOptions" :key="option.value" :value="option.value">
                {{ option.title }}
              </option>
            </select>
            <span>items</span>
          </div>

          <div v-if="totalPages > 1" class="top-product-ranking-upload-log__pager">
            <button type="button" class="top-product-ranking-upload-log__pager-button" :disabled="currentPage === 1" @click="currentPage -= 1">
              Prev
            </button>
            <button
              v-for="page in visiblePageNumbers"
              :key="page"
              type="button"
              class="top-product-ranking-upload-log__pager-button"
              :class="{ 'top-product-ranking-upload-log__pager-button--active': currentPage === page }"
              @click="currentPage = page"
            >
              {{ page }}
            </button>
            <button type="button" class="top-product-ranking-upload-log__pager-button" :disabled="currentPage === totalPages" @click="currentPage += 1">
              Next
            </button>
          </div>
        </div>
      </section>
    </AppPanel>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import type {
  CompareResponseEnhanced,
  ParsedTestItemEnhanced,
  RescoreScoringConfig,
  TestLogParseResponseEnhanced,
} from '@/features/dut-logs/composables/useTestLogUpload'
import {
  createTopProduct,
  createTopProductsBulk,
  type TopProductCreate,
  type TopProductMeasurementCreate,
} from '@/features/top-products/api/topProducts.api'
import { AppDataGrid, AppDialog, AppPanel, getApiErrorDetail } from '@/shared'
import { useNotification } from '@/shared/composables/useNotification'
import IplasCompareDialog from './IplasCompareDialog.vue'

dayjs.extend(utc)
dayjs.extend(timezone)

const { showSuccess, showError } = useNotification()

const props = defineProps<{
  parseResult?: TestLogParseResponseEnhanced | null
  compareResult?: CompareResponseEnhanced | null
  scoringConfigs?: RescoreScoringConfig[]
}>()

interface RankingItem {
  row_id: string
  isn: string | null
  test_date: string | null
  duration_seconds: number | null
  station: string
  device: string | null
  status: string
  result: string | null
  score: number
}

const dialogBreakpoints = {
  '1400px': '96vw',
  '960px': '98vw',
  '640px': '100vw',
}

const searchQuery = ref('')
const stationTab = ref('all')
const scoreFilterType = ref<string | null>(null)
const scoreFilterValue = ref<number | null>(null)
const resultFilter = ref<string | null>(null)
const fullscreen = ref(false)

const selectedRankingItems = ref<RankingItem[]>([])
const exportingRanking = ref(false)
const savingToDb = ref(false)

const showTestItemsDialog = ref(false)
const testItemsFullscreen = ref(false)
const selectedRankingItem = ref<RankingItem | null>(null)
const selectedTestItems = ref<ParsedTestItemEnhanced[]>([])

const showBreakdownDialog = ref(false)
const breakdownFullscreen = ref(false)
const selectedTestItem = ref<ParsedTestItemEnhanced | null>(null)

const showIplasCompareDialog = ref(false)
const comparisonIsn = ref<string | null>(null)

const testItemFilterType = ref<string>('all')
const testItemSearch = ref('')
const testItemFilterOptions = [
  { title: 'Show All', value: 'all' },
  { title: 'Criteria Items', value: 'criteria' },
  { title: 'Non-Criteria Items', value: 'non-criteria' },
]

const filteredTestItems = computed(() => {
  let items = selectedTestItems.value

  if (testItemFilterType.value === 'criteria') {
    items = items.filter((item) => item.usl !== null || item.lsl !== null)
  } else if (testItemFilterType.value === 'non-criteria') {
    items = items.filter((item) => item.usl === null && item.lsl === null)
  }

  if (testItemSearch.value) {
    const query = testItemSearch.value.toLowerCase()
    items = items.filter((item) => item.test_item.toLowerCase().includes(query))
  }

  return items
})

const resetTestItemFilters = () => {
  testItemFilterType.value = 'all'
  testItemSearch.value = ''
}

const MAX_TABLE_ITEMS_PER_PAGE = 200
const itemsPerPage = ref(10)
const currentPage = ref(1)
const itemsPerPageOptions = [
  { title: '5', value: 5 },
  { title: '10', value: 10 },
  { title: '25', value: 25 },
  { title: '50', value: 50 },
  { title: '100', value: 100 },
  { title: 'Custom', value: 0 },
]
const showCustomInput = ref(false)
const customItemsPerPage = ref(10)

const scoreFilterTypes = [
  { title: 'Greater Than', value: 'gt' },
  { title: 'Less Than', value: 'lt' },
  { title: 'Equal To', value: 'eq' },
]

const resultFilterOptions = [
  { title: 'All', value: null },
  { title: 'Pass Only', value: 'PASS' },
  { title: 'Fail Only', value: 'FAIL' },
]

const rankingGridColumns = [
  { key: 'rank', field: 'rank', header: 'Rank', sortable: false, style: { width: '6rem' } },
  { key: 'isn', field: 'isn', header: 'DUT ISN', sortable: true, style: { width: '12rem' } },
  { key: 'test_date', field: 'test_date', header: 'Test Date', sortable: true, style: { width: '11rem' } },
  { key: 'duration', field: 'duration_seconds', header: 'Duration', sortable: true, style: { width: '8rem' } },
  { key: 'station', field: 'station', header: 'Test Station', sortable: true, style: { width: '11rem' } },
  { key: 'device', field: 'device', header: 'Device', sortable: true, style: { width: '11rem' } },
  { key: 'status', field: 'status', header: 'Status', sortable: true, style: { width: '8rem' } },
  { key: 'result', field: 'result', header: 'Test Result', sortable: true, style: { width: '9rem' } },
  { key: 'score', field: 'score', header: 'Overall Score', sortable: true, style: { width: '10rem' } },
]

const testItemGridColumns = [
  { key: 'test_item', field: 'test_item', header: 'Test Item', sortable: true, style: { width: '18rem' } },
  { key: 'value', field: 'value', header: 'Value', sortable: true, style: { width: '8rem' } },
  { key: 'usl', field: 'usl', header: 'UCL', sortable: true, style: { width: '7rem' } },
  { key: 'lsl', field: 'lsl', header: 'LCL', sortable: true, style: { width: '7rem' } },
  { key: 'score', field: 'score', header: 'Score', sortable: true, style: { width: '9rem' } },
]

const rankings = computed<RankingItem[]>(() => {
  const items: RankingItem[] = []

  if (props.parseResult?.metadata) {
    const isn = props.parseResult.isn || 'unknown'
    const station = props.parseResult.station || 'Unknown'
    items.push({
      row_id: `${isn}_${station}`,
      isn: props.parseResult.isn,
      test_date: props.parseResult.metadata.test_date,
      duration_seconds: props.parseResult.metadata.duration_seconds,
      station,
      device: props.parseResult.metadata.device,
      status: props.parseResult.metadata.sfis_status || 'Unknown',
      result: props.parseResult.metadata.result,
      score: props.parseResult.avg_score || 0,
    })
  } else if (props.compareResult?.file_summaries) {
    props.compareResult.file_summaries.forEach((fileSummary) => {
      const isn = fileSummary.isn || 'unknown'
      const station = fileSummary.metadata.station || 'Unknown'
      items.push({
        row_id: `${isn}_${station}`,
        isn: fileSummary.isn,
        test_date: fileSummary.metadata.test_date,
        duration_seconds: fileSummary.metadata.duration_seconds,
        station,
        device: fileSummary.metadata.device,
        status: fileSummary.metadata.sfis_status || 'Unknown',
        result: fileSummary.metadata.result,
        score: fileSummary.avg_score || 0,
      })
    })
  }

  return items.sort((a, b) => b.score - a.score)
})

const availableStations = computed(() => {
  const stations = new Set<string>()
  rankings.value.forEach((item) => {
    if (item.station) {
      stations.add(item.station)
    }
  })
  return Array.from(stations).sort()
})

function getStationCount(station: string): number {
  return rankings.value.filter((item) => item.station === station).length
}

const filteredRankings = computed(() => {
  let filtered = rankings.value

  if (stationTab.value !== 'all') {
    filtered = filtered.filter((item) => item.station === stationTab.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (item) =>
        item.isn?.toLowerCase().includes(query) ||
        item.device?.toLowerCase().includes(query) ||
        item.test_date?.toLowerCase().includes(query) ||
        item.station.toLowerCase().includes(query),
    )
  }

  if (scoreFilterType.value && scoreFilterValue.value !== null) {
    const scoreValue = scoreFilterValue.value
    filtered = filtered.filter((item) => {
      if (scoreFilterType.value === 'gt') return item.score > scoreValue
      if (scoreFilterType.value === 'lt') return item.score < scoreValue
      if (scoreFilterType.value === 'eq') return Math.abs(item.score - scoreValue) < 0.01
      return true
    })
  }

  if (resultFilter.value) {
    filtered = filtered.filter((item) => item.result === resultFilter.value)
  }

  return filtered
})

const normalizeItemsPerPage = (value: number) => {
  if (value <= 0) {
    return MAX_TABLE_ITEMS_PER_PAGE
  }

  return Math.min(Math.trunc(value), MAX_TABLE_ITEMS_PER_PAGE)
}

const getPerPage = () => {
  if (itemsPerPage.value === 0) {
    return 10
  }

  return normalizeItemsPerPage(itemsPerPage.value)
}

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRankings.value.length / getPerPage())))

const paginatedRankings = computed(() => {
  const perPage = getPerPage()
  const start = (currentPage.value - 1) * perPage
  const end = start + perPage
  return filteredRankings.value.slice(start, end)
})

const visiblePageNumbers = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const start = Math.max(1, current - 3)
  const end = Math.min(total, start + 6)
  const adjustedStart = Math.max(1, end - 6)
  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index)
})

watch([searchQuery, stationTab, scoreFilterType, scoreFilterValue, resultFilter], () => {
  currentPage.value = 1
})

watch(filteredRankings, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
  }
})

watch(itemsPerPage, (newValue) => {
  if (newValue === 0) {
    showCustomInput.value = true
  } else {
    showCustomInput.value = false

    const normalized = normalizeItemsPerPage(newValue)
    if (normalized !== newValue) {
      itemsPerPage.value = normalized
      return
    }

    currentPage.value = 1
  }
})

watch(showTestItemsDialog, (isOpen) => {
  if (!isOpen) {
    testItemsFullscreen.value = false
    testItemSearch.value = ''
    testItemFilterType.value = 'all'
  }
})

watch(showBreakdownDialog, (isOpen) => {
  if (!isOpen) {
    breakdownFullscreen.value = false
  }
})

const applyCustomItemsPerPage = () => {
  if (customItemsPerPage.value > 0) {
    itemsPerPage.value = normalizeItemsPerPage(customItemsPerPage.value)
  }
  showCustomInput.value = false
}

const cancelCustomInput = () => {
  itemsPerPage.value = 10
  showCustomInput.value = false
}

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return 'N/A'
  return `${seconds}s`
}

const formatTestDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A'
  try {
    return dayjs.utc(dateString).tz(dayjs.tz.guess()).format('DD/MM/YYYY, HH:mm:ss')
  } catch {
    return 'N/A'
  }
}

const getStatusColor = (status: string | null): string => {
  if (!status) return 'grey'
  const upper = status.toUpperCase()
  if (upper === 'ONLINE' || upper === 'ON-LINE') return 'primary'
  if (upper === 'OFFLINE' || upper === 'OFF-LINE') return 'secondary'
  return 'grey'
}

const getResultColor = (result: string | null): string => {
  if (!result) return 'grey'
  const upper = result.toUpperCase()
  if (upper === 'PASS') return 'success'
  if (upper === 'FAIL') return 'error'
  return 'warning'
}

const getScoreColor = (score: number): string => {
  if (score >= 9) return 'success'
  if (score >= 7) return 'info'
  if (score >= 6) return 'warning'
  return 'error'
}

const copyIsnToClipboard = async (isn: string | null) => {
  if (!isn) return
  try {
    await navigator.clipboard.writeText(isn)
    showSuccess('ISN copied to clipboard')
  } catch (error) {
    console.error('Failed to copy ISN:', error)
  }
}

const openRankingItem = (item: RankingItem) => {
  selectedRankingItem.value = item

  if (props.parseResult?.parsed_items_enhanced) {
    selectedTestItems.value = props.parseResult.parsed_items_enhanced
  } else if (props.compareResult) {
    const isnTestItems: ParsedTestItemEnhanced[] = []

    props.compareResult.comparison_value_items?.forEach((compareItem) => {
      const perIsnData = compareItem.per_isn_data.find((data) => data.isn === item.isn)
      if (perIsnData) {
        isnTestItems.push({
          test_item: compareItem.test_item,
          usl: compareItem.usl,
          lsl: compareItem.lsl,
          value: perIsnData.value,
          is_value_type: perIsnData.is_value_type,
          numeric_value: perIsnData.numeric_value,
          is_hex: perIsnData.is_hex,
          hex_decimal: perIsnData.hex_decimal,
          matched_criteria: compareItem.matched_criteria,
          target: null,
          score: perIsnData.score,
          score_breakdown: perIsnData.score_breakdown,
        })
      }
    })

    props.compareResult.comparison_non_value_items?.forEach((compareItem) => {
      const perIsnData = compareItem.per_isn_data.find((data) => data.isn === item.isn)
      if (perIsnData) {
        isnTestItems.push({
          test_item: compareItem.test_item,
          usl: compareItem.usl,
          lsl: compareItem.lsl,
          value: perIsnData.value,
          is_value_type: perIsnData.is_value_type,
          numeric_value: perIsnData.numeric_value,
          is_hex: perIsnData.is_hex,
          hex_decimal: perIsnData.hex_decimal,
          matched_criteria: compareItem.matched_criteria,
          target: null,
          score: perIsnData.score,
          score_breakdown: perIsnData.score_breakdown,
        })
      }
    })

    selectedTestItems.value = isnTestItems
  }

  showTestItemsDialog.value = true
}

const updateSelection = (value: unknown) => {
  selectedRankingItems.value = Array.isArray(value) ? (value as RankingItem[]) : []
}

const handleGridRowClick = (event: unknown) => {
  const item =
    typeof event === 'object' && event !== null && 'data' in event
      ? ((event as { data?: RankingItem }).data ?? null)
      : null

  if (item) {
    openRankingItem(item)
  }
}

const handleTestItemRowClick = (event: unknown) => {
  const item =
    typeof event === 'object' && event !== null && 'data' in event
      ? ((event as { data?: ParsedTestItemEnhanced }).data ?? null)
      : null

  if (item?.score_breakdown) {
    showScoreBreakdown(item)
  }
}

const showScoreBreakdown = (item: ParsedTestItemEnhanced) => {
  if (item.score_breakdown) {
    selectedTestItem.value = item
    showBreakdownDialog.value = true
  }
}

const showScoreBreakdownForIsn = (item: RankingItem) => {
  openRankingItem(item)
}

const openIplasCompare = () => {
  if (selectedRankingItem.value?.isn) {
    comparisonIsn.value = selectedRankingItem.value.isn
    showIplasCompareDialog.value = true
  }
}

async function exportRankingToExcel() {
  exportingRanking.value = true
  try {
    const itemsToExport =
      selectedRankingItems.value.length > 0 ? selectedRankingItems.value : filteredRankings.value

    const exportData = itemsToExport.map((item, index) => ({
      Rank: index + 1,
      'DUT ISN': item.isn || 'N/A',
      'Test Date': formatTestDate(item.test_date),
      'Duration (s)': item.duration_seconds ?? '',
      'Test Station': item.station,
      Device: item.device || 'N/A',
      Status: item.status,
      'Test Result': item.result || 'N/A',
      'Overall Score': item.score.toFixed(2),
    }))

    const ExcelJS = await import('exceljs')
    const workbook = new (ExcelJS.default || ExcelJS).Workbook()
    const worksheet = workbook.addWorksheet('Ranking')

    if (exportData.length > 0) {
      const rows = exportData as Array<Record<string, unknown>>
      const headers = Object.keys(rows[0] ?? {})
      worksheet.addRow(headers)
      rows.forEach((item) => {
        worksheet.addRow(headers.map((header) => item[header] ?? ''))
      })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `Top_Product_Ranking_${timestamp}.xlsx`

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error: unknown) {
    console.error('Export failed:', error)
  } finally {
    exportingRanking.value = false
  }
}

function buildTopProductData(
  rankingItem: RankingItem,
  testItems: ParsedTestItemEnhanced[],
): TopProductCreate {
  const measurements: TopProductMeasurementCreate[] = testItems.map((item) => ({
    test_item: item.test_item,
    usl: item.usl,
    lsl: item.lsl,
    target_value: item.target ?? null,
    actual_value: item.numeric_value,
    deviation: item.score_breakdown?.deviation ?? null,
  }))

  return {
    dut_isn: rankingItem.isn || 'UNKNOWN',
    station_name: rankingItem.station,
    device_name: rankingItem.device,
    test_date: rankingItem.test_date ? new Date(rankingItem.test_date).toISOString() : null,
    test_duration: rankingItem.duration_seconds ?? undefined,
    pass_count: rankingItem.result === 'PASS' ? 1 : 0,
    fail_count: rankingItem.result === 'FAIL' ? 1 : 0,
    retest_count: 0,
    score: rankingItem.score,
    measurements,
  }
}

function getTestItemsForIsn(isn: string | null): ParsedTestItemEnhanced[] {
  if (!isn) return []

  if (props.parseResult?.parsed_items_enhanced) {
    return props.parseResult.parsed_items_enhanced
  }

  if (props.compareResult) {
    const items: ParsedTestItemEnhanced[] = []

    props.compareResult.comparison_value_items?.forEach((compareItem) => {
      const perIsnData = compareItem.per_isn_data.find((data) => data.isn === isn)
      if (perIsnData) {
        items.push({
          test_item: compareItem.test_item,
          usl: compareItem.usl,
          lsl: compareItem.lsl,
          value: perIsnData.value,
          is_value_type: perIsnData.is_value_type,
          numeric_value: perIsnData.numeric_value,
          is_hex: perIsnData.is_hex,
          hex_decimal: perIsnData.hex_decimal,
          matched_criteria: compareItem.matched_criteria,
          target: null,
          score: perIsnData.score,
          score_breakdown: perIsnData.score_breakdown,
        })
      }
    })

    props.compareResult.comparison_non_value_items?.forEach((compareItem) => {
      const perIsnData = compareItem.per_isn_data.find((data) => data.isn === isn)
      if (perIsnData) {
        items.push({
          test_item: compareItem.test_item,
          usl: compareItem.usl,
          lsl: compareItem.lsl,
          value: perIsnData.value,
          is_value_type: perIsnData.is_value_type,
          numeric_value: perIsnData.numeric_value,
          is_hex: perIsnData.is_hex,
          hex_decimal: perIsnData.hex_decimal,
          matched_criteria: compareItem.matched_criteria,
          target: null,
          score: perIsnData.score,
          score_breakdown: perIsnData.score_breakdown,
        })
      }
    })

    return items
  }

  return []
}

async function saveSingleToDatabase() {
  if (!selectedRankingItem.value) {
    showError('No item selected')
    return
  }

  savingToDb.value = true
  try {
    const testItems =
      selectedTestItems.value.length > 0
        ? selectedTestItems.value
        : getTestItemsForIsn(selectedRankingItem.value.isn)

    const productData = buildTopProductData(selectedRankingItem.value, testItems)
    const response = await createTopProduct(productData)

    if (response.success) {
      showSuccess(`Saved ISN ${selectedRankingItem.value.isn || 'UNKNOWN'} to database`)
    }
  } catch (error: unknown) {
    console.error('Failed to save to database:', error)
    showError(getApiErrorDetail(error, 'Failed to save to database'))
  } finally {
    savingToDb.value = false
  }
}

async function saveSelectedToDatabase() {
  if (selectedRankingItems.value.length === 0) {
    showError('No items selected')
    return
  }

  savingToDb.value = true
  try {
    const products: TopProductCreate[] = selectedRankingItems.value.map((item) => {
      const testItems = getTestItemsForIsn(item.isn)
      return buildTopProductData(item, testItems)
    })

    const response = await createTopProductsBulk({ products })

    if (response.success) {
      showSuccess(`Saved ${response.created_count} item(s) to database`)
    }
  } catch (error: unknown) {
    console.error('Failed to save to database:', error)
    showError(getApiErrorDetail(error, 'Failed to save to database'))
  } finally {
    savingToDb.value = false
  }
}

function scoreBadgeClass(score: number): string {
  const color = getScoreColor(score)
  if (color === 'success') return 'top-product-ranking-upload-log__score-button--success'
  if (color === 'info') return 'top-product-ranking-upload-log__score-button--info'
  if (color === 'warning') return 'top-product-ranking-upload-log__score-button--warning'
  return 'top-product-ranking-upload-log__score-button--error'
}

function resultBadgeClass(result: string | null): string {
  const color = getResultColor(result)
  if (color === 'success') return 'top-product-ranking-upload-log__badge--success'
  if (color === 'error') return 'top-product-ranking-upload-log__badge--error'
  if (color === 'warning') return 'top-product-ranking-upload-log__badge--warning'
  return 'top-product-ranking-upload-log__badge--neutral'
}

function rankingRowClass(row: Record<string, unknown>) {
  const result = String(row.result || '')
  if (result.toUpperCase() === 'FAIL') {
    return 'top-product-ranking-upload-log__row--fail'
  }

  const status = String(row.status || '')
  if (getStatusColor(status) === 'secondary') {
    return 'top-product-ranking-upload-log__row--offline'
  }

  return undefined
}
</script>

<style scoped>
.top-product-ranking-upload-log {
  display: grid;
  gap: 1rem;
}

.top-product-ranking-upload-log__dialog-header,
.top-product-ranking-upload-log__section-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.top-product-ranking-upload-log__eyebrow {
  margin: 0 0 0.3rem;
  color: var(--app-accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.top-product-ranking-upload-log__dialog-header h2,
.top-product-ranking-upload-log__section-header h3 {
  margin: 0;
}

.top-product-ranking-upload-log__dialog-header p:last-child,
.top-product-ranking-upload-log__section-header p {
  margin: 0.35rem 0 0;
  color: var(--app-muted);
  line-height: 1.5;
}

.top-product-ranking-upload-log__dialog-actions,
.top-product-ranking-upload-log__panel-actions,
.top-product-ranking-upload-log__action-row,
.top-product-ranking-upload-log__station-tabs,
.top-product-ranking-upload-log__meta-pills,
.top-product-ranking-upload-log__pager,
.top-product-ranking-upload-log__footer-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.top-product-ranking-upload-log__workspace,
.top-product-ranking-upload-log__details-shell,
.top-product-ranking-upload-log__breakdown-shell {
  display: grid;
  gap: 1rem;
}

.top-product-ranking-upload-log__workspace--fullscreen {
  min-height: calc(100vh - 12rem);
}

.top-product-ranking-upload-log__stat-grid,
.top-product-ranking-upload-log__summary-grid,
.top-product-ranking-upload-log__filter-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
}

.top-product-ranking-upload-log__stat-card,
.top-product-ranking-upload-log__summary-card {
  display: grid;
  gap: 0.35rem;
  border: 1px solid var(--app-border);
  border-radius: 1.1rem;
  padding: 1rem;
  background: var(--app-panel);
}

.top-product-ranking-upload-log__stat-card--cool {
  background: linear-gradient(145deg, rgba(40, 96, 163, 0.12), var(--app-panel));
}

.top-product-ranking-upload-log__stat-card--warm,
.top-product-ranking-upload-log__summary-card--highlight {
  background: linear-gradient(145deg, rgba(184, 118, 38, 0.12), var(--app-panel));
}

.top-product-ranking-upload-log__stat-card small,
.top-product-ranking-upload-log__summary-card small,
.top-product-ranking-upload-log__muted {
  color: var(--app-muted);
}

.top-product-ranking-upload-log__stat-card strong,
.top-product-ranking-upload-log__summary-card strong,
.top-product-ranking-upload-log__detail-row strong,
.top-product-ranking-upload-log__strong,
.top-product-ranking-upload-log__rank-value {
  color: var(--app-ink);
  font-weight: 700;
}

.top-product-ranking-upload-log__info-button,
.top-product-ranking-upload-log__info-button--static {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
}

.top-product-ranking-upload-log__info-button {
  cursor: pointer;
}

.top-product-ranking-upload-log__info-icon {
  display: inline-flex;
  width: 2.4rem;
  height: 2.4rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.top-product-ranking-upload-log__pill,
.top-product-ranking-upload-log__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 700;
}

.top-product-ranking-upload-log__pill {
  border: 1px solid var(--app-border);
  background: var(--app-panel);
}

.top-product-ranking-upload-log__pill--cool {
  background: rgba(40, 96, 163, 0.1);
}

.top-product-ranking-upload-log__pill--neutral,
.top-product-ranking-upload-log__badge--neutral {
  background: rgba(120, 129, 143, 0.12);
  color: #4f5d6d;
}

.top-product-ranking-upload-log__badge--success {
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.top-product-ranking-upload-log__badge--warning {
  background: rgba(184, 118, 38, 0.16);
  color: #8f5314;
}

.top-product-ranking-upload-log__badge--error {
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

.top-product-ranking-upload-log__field {
  display: grid;
  gap: 0.45rem;
}

.top-product-ranking-upload-log__field--wide {
  grid-column: span 2;
}

.top-product-ranking-upload-log__field--actions {
  justify-content: end;
}

.top-product-ranking-upload-log__field span {
  color: var(--app-ink);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.top-product-ranking-upload-log__field input,
.top-product-ranking-upload-log__field select,
.top-product-ranking-upload-log__footer-group select {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.95rem;
  padding: 0.75rem 0.9rem;
  background: var(--app-panel);
  color: var(--app-ink);
}

.top-product-ranking-upload-log__station-tab,
.top-product-ranking-upload-log__ghost-button,
.top-product-ranking-upload-log__primary-button,
.top-product-ranking-upload-log__score-button,
.top-product-ranking-upload-log__pager-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
}

.top-product-ranking-upload-log__station-tab,
.top-product-ranking-upload-log__ghost-button,
.top-product-ranking-upload-log__pager-button {
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-ink);
  padding: 0.65rem 0.95rem;
}

.top-product-ranking-upload-log__station-tab--active {
  border-color: rgba(15, 118, 110, 0.35);
  background: rgba(15, 118, 110, 0.1);
}

.top-product-ranking-upload-log__primary-button {
  border: 1px solid rgba(15, 118, 110, 0.1);
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.95), rgba(40, 96, 163, 0.92));
  color: #fff;
  padding: 0.65rem 1rem;
}

.top-product-ranking-upload-log__score-button {
  border: 0;
  padding: 0.35rem 0.75rem;
}

.top-product-ranking-upload-log__score-button--success {
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.top-product-ranking-upload-log__score-button--info {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.top-product-ranking-upload-log__score-button--warning {
  background: rgba(184, 118, 38, 0.16);
  color: #8f5314;
}

.top-product-ranking-upload-log__score-button--error {
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

.top-product-ranking-upload-log__footer-bar {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.top-product-ranking-upload-log__pager-button--active {
  border-color: rgba(15, 118, 110, 0.35);
  background: rgba(15, 118, 110, 0.1);
}

.top-product-ranking-upload-log__detail-table {
  display: grid;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  overflow: hidden;
}

.top-product-ranking-upload-log__detail-row {
  display: grid;
  grid-template-columns: minmax(10rem, 14rem) 1fr;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-top: 1px solid var(--app-border);
  background: var(--app-panel);
}

.top-product-ranking-upload-log__detail-row:first-child {
  border-top: 0;
}

.top-product-ranking-upload-log__detail-row--highlight {
  background: rgba(40, 96, 163, 0.08);
}

.top-product-ranking-upload-log__detail-row span {
  color: var(--app-muted);
  font-weight: 600;
}

.top-product-ranking-upload-log__custom-dialog {
  display: grid;
  gap: 1rem;
}

.top-product-ranking-upload-log__row--fail :deep(td) {
  background: rgba(189, 64, 64, 0.04);
}

.top-product-ranking-upload-log__row--offline :deep(td) {
  background: rgba(120, 129, 143, 0.05);
}

.top-product-ranking-upload-log__spin {
  animation: top-product-ranking-upload-log-spin 1s linear infinite;
}

@keyframes top-product-ranking-upload-log-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 960px) {
  .top-product-ranking-upload-log__dialog-header,
  .top-product-ranking-upload-log__section-header,
  .top-product-ranking-upload-log__footer-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .top-product-ranking-upload-log__field--wide {
    grid-column: span 1;
  }

  .top-product-ranking-upload-log__detail-row {
    grid-template-columns: 1fr;
  }
}
</style>