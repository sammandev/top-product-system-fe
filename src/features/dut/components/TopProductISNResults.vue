<template>
  <div class="top-product-isn-results">
    <AppDialog
      v-model="measurementDialog"
      v-model:fullscreen="isFullscreen"
      width="min(96vw, 72rem)"
      fullscreen-width="98vw"
      :breakpoints="dialogBreakpoints"
      fullscreenable
      title="Measurement Details"
      description="Review station measurements and scores."
      class="top-product-isn-results__dialog"
    >

      <div
        v-if="selectedMeasurement"
        class="top-product-isn-results__dialog-body"
        :class="{ 'top-product-isn-results__dialog-body--fullscreen': isFullscreen }"
      >
        <section class="top-product-isn-results__summary-grid">
          <article class="top-product-isn-results__summary-card top-product-isn-results__summary-card--highlight">
            <span class="top-product-isn-results__summary-icon">
              <Icon icon="mdi:barcode" />
            </span>
            <div>
              <small>DUT ISN</small>
              <strong>{{ selectedMeasurement.dutISN }}</strong>
            </div>
          </article>

          <article class="top-product-isn-results__summary-card">
            <span class="top-product-isn-results__summary-icon">
              <Icon icon="mdi:factory" />
            </span>
            <div>
              <small>Station</small>
              <strong>{{ selectedMeasurement.station.station_name }}</strong>
            </div>
          </article>

          <article class="top-product-isn-results__summary-card">
            <span class="top-product-isn-results__summary-icon">
              <Icon icon="mdi:chip" />
            </span>
            <div>
              <small>Device</small>
              <strong>{{ selectedMeasurement.station.device || 'N/A' }}</strong>
            </div>
          </article>

          <article class="top-product-isn-results__summary-card">
            <span class="top-product-isn-results__summary-icon">
              <Icon icon="mdi:calendar-clock" />
            </span>
            <div>
              <small>Test Date</small>
              <strong>{{ formatDate(selectedMeasurement.station.test_date) }}</strong>
            </div>
          </article>
        </section>

        <section class="top-product-isn-results__meta-grid">
          <article class="top-product-isn-results__meta-card top-product-isn-results__meta-card--wide">
            <div class="top-product-isn-results__meta-headline">
              <Icon icon="mdi:identifier" />
              <strong>SN Reference</strong>
            </div>

            <div v-if="loadingIdentifiers" class="top-product-isn-results__inline-note">
              Loading linked identifiers...
            </div>
            <div v-else class="top-product-isn-results__token-row">
              <button
                type="button"
                class="top-product-isn-results__token top-product-isn-results__token--cool"
                @click="copyToClipboard(selectedMeasurement.dutISN)"
              >
                {{ selectedMeasurement.dutISN }}
              </button>

              <details v-if="otherLinkedISNs.length > 0" class="top-product-isn-results__linked-details">
                <summary>
                  {{ allLinkedISNs.length }} linked ISN{{ allLinkedISNs.length === 1 ? '' : 's' }}
                </summary>
                <div class="top-product-isn-results__linked-list">
                  <button
                    v-for="identifier in otherLinkedISNs"
                    :key="identifier"
                    type="button"
                    class="top-product-isn-results__token"
                    @click="copyToClipboard(identifier)"
                  >
                    {{ identifier }}
                  </button>
                </div>
              </details>
            </div>
          </article>

          <article class="top-product-isn-results__meta-card">
            <div class="top-product-isn-results__meta-headline">
              <Icon icon="mdi:timer" />
              <strong>Duration</strong>
            </div>
            <p>
              {{ selectedMeasurement.station.test_duration
                ? `${selectedMeasurement.station.test_duration.toFixed(2)}s`
                : 'N/A' }}
            </p>
          </article>

          <article class="top-product-isn-results__meta-card">
            <div class="top-product-isn-results__meta-headline">
              <Icon icon="mdi:list-box" />
              <strong>Test Items</strong>
            </div>
            <p>{{ selectedMeasurement.station.measurement_count || 0 }}</p>
          </article>

          <article class="top-product-isn-results__meta-card">
            <div class="top-product-isn-results__meta-headline">
              <Icon icon="mdi:flag-checkered" />
              <strong>Result Counts</strong>
            </div>
            <div class="top-product-isn-results__badge-row">
              <span class="top-product-isn-results__badge top-product-isn-results__badge--neutral">
                Total {{ selectedMeasurement.station.test_count || 0 }}
              </span>
              <span class="top-product-isn-results__badge top-product-isn-results__badge--success">
                Pass {{ selectedMeasurement.station.pass_count || 0 }}
              </span>
              <span class="top-product-isn-results__badge top-product-isn-results__badge--error">
                Fail {{ selectedMeasurement.station.fail_count || 0 }}
              </span>
            </div>
          </article>
        </section>

        <section class="top-product-isn-results__status-grid">
          <article
            class="top-product-isn-results__status-card"
            :class="selectedMeasurement.station.error_item ? 'top-product-isn-results__status-card--error' : 'top-product-isn-results__status-card--success'"
          >
            <div class="top-product-isn-results__meta-headline">
              <Icon :icon="selectedMeasurement.station.error_item ? 'mdi:alert-circle' : 'mdi:check-circle'" />
              <strong>Latest Test Status</strong>
            </div>
            <p>
              {{ selectedMeasurement.station.error_item || 'No Errors' }}
            </p>
          </article>

          <article class="top-product-isn-results__status-card">
            <div class="top-product-isn-results__meta-headline">
              <Icon icon="mdi:star" />
              <strong>Overall Score</strong>
            </div>
            <div v-if="selectedMeasurement.station.error_item" class="top-product-isn-results__score-na">
              <span>N/A</span>
              <small>Can't be calculated because the DUT failed.</small>
            </div>
            <span
              v-else
              class="top-product-isn-results__badge"
              :class="badgeToneClass(getScoreColor(selectedMeasurement.station.overall_data_score))"
            >
              {{ selectedMeasurement.station.overall_data_score.toFixed(2) }}
            </span>
          </article>
        </section>

        <section class="top-product-isn-results__filter-grid">
          <label class="top-product-isn-results__field top-product-isn-results__field--wide">
            <span>Search Measurements</span>
            <input
              v-model="measurementSearch"
              type="text"
              placeholder="Search by test item"
            >
          </label>

          <label class="top-product-isn-results__field">
            <span>Score Filter</span>
            <AppSelect v-model="scoreFilter" :options="scoreFilterOptions" placeholder="All Scores"
              :searchable="false" />
          </label>

          <label class="top-product-isn-results__field">
            <span>Limit Status</span>
            <AppSelect v-model="limitFilter" :options="limitFilterOptions" placeholder="All Results"
              :searchable="false" />
          </label>

          <label class="top-product-isn-results__field top-product-isn-results__field--wide">
            <span>Pin Columns</span>
            <AppMultiSelect v-model="measurementLockedColumns" :options="measurementColumnSelectOptions"
              placeholder="Pin columns" />
          </label>
        </section>

        <div class="top-product-isn-results__table-shell">
          <DataTable
            v-if="selectedMeasurement"
            :value="filteredMeasurements"
            paginator
            :rows="25"
            dataKey="test_item"
            scrollable
            :scrollHeight="measurementScrollHeight"
            removableSort
            showGridlines
            stripedRows
            class="top-product-isn-results__data-table app-interactive-datatable"
          >
            <Column
              v-for="column in measurementHeaders"
              :key="column.key"
              :field="column.key"
              :header="column.title"
              :sortable="column.sortable"
              :frozen="measurementLockedColumns.includes(column.key)"
              alignFrozen="left"
              :style="getMeasurementColumnStyle(column.key)"
            >
              <template v-if="column.key === 'test_item'" #body="slotProps">
                <span
                  class="top-product-isn-results__mono"
                  :class="{ 'top-product-isn-results__mono--error': isErrorItem(slotProps.data.test_item) }"
                >
                  {{ slotProps.data.test_item }}
                </span>
              </template>

              <template v-else-if="column.key === 'usl'" #body="slotProps">
                <span class="top-product-isn-results__muted">{{ slotProps.data.usl ?? '-' }}</span>
              </template>

              <template v-else-if="column.key === 'lsl'" #body="slotProps">
                <span class="top-product-isn-results__muted">{{ slotProps.data.lsl ?? '-' }}</span>
              </template>

              <template v-else-if="column.key === 'target'" #body="slotProps">
                <span class="top-product-isn-results__muted">{{ slotProps.data.target || '-' }}</span>
              </template>

              <template v-else-if="column.key === 'actual'" #body="slotProps">
                <span
                  class="top-product-isn-results__badge"
                  :class="badgeToneClass(getActualValueColor(slotProps.data))"
                >
                  {{ slotProps.data.actual !== '' ? slotProps.data.actual : '0' }}
                </span>
              </template>

              <template v-else-if="column.key === 'delta_actual_target'" #body="slotProps">
                <span
                  v-if="slotProps.data.actual !== null && slotProps.data.actual !== '' && slotProps.data.target !== null && slotProps.data.target !== ''"
                  class="top-product-isn-results__badge"
                  :class="badgeToneClass(getDeltaColor(parseFloat(slotProps.data.actual) - parseFloat(slotProps.data.target)))"
                >
                  {{ (parseFloat(slotProps.data.actual) - parseFloat(slotProps.data.target)).toFixed(2) }}
                </span>
                <span v-else class="top-product-isn-results__muted">-</span>
              </template>

              <template v-else-if="column.key === 'score'" #body="slotProps">
                <div class="top-product-isn-results__score-cell">
                  <template v-if="slotProps.data.custom_scoring && slotProps.data.custom_scoring.method === 'custom'">
                    <span
                      class="top-product-isn-results__badge"
                      :class="badgeToneClass(getScoreColor(slotProps.data.custom_scoring.systemScore))"
                      title="System Score"
                    >
                      S: {{ slotProps.data.custom_scoring.systemScore.toFixed(2) }}
                    </span>
                    <span
                      class="top-product-isn-results__badge"
                      :class="badgeToneClass(getScoreColor(slotProps.data.custom_scoring.customScore))"
                      :title="`Custom Score (${slotProps.data.custom_scoring.formula})`"
                    >
                      C: {{ slotProps.data.custom_scoring.customScore.toFixed(2) }}
                    </span>
                    <span
                      class="top-product-isn-results__badge"
                      :class="differenceBadgeClass(slotProps.data.custom_scoring.difference)"
                      title="Difference (Custom - System)"
                    >
                      {{ slotProps.data.custom_scoring.difference > 0 ? '+' : '' }}{{ slotProps.data.custom_scoring.difference.toFixed(2) }}
                    </span>
                  </template>

                  <button
                    v-else
                    type="button"
                    class="top-product-isn-results__badge top-product-isn-results__score-button"
                    :class="badgeToneClass(getScoreColor(slotProps.data.score))"
                    :disabled="!slotProps.data.breakdown"
                    :title="slotProps.data.scoreSource ? getScoreSourceLabel(slotProps.data.scoreSource) : ''"
                    @click="slotProps.data.breakdown ? handleScoreClick(slotProps.data) : undefined"
                  >
                    <span>{{ slotProps.data.score.toFixed(2) }}</span>
                    <Icon v-if="slotProps.data.breakdown" icon="mdi:information-outline" />
                  </button>
                </div>
              </template>
            </Column>

            <template #empty>
              <div class="top-product-isn-results__empty-inline">No measurements match the current filters.</div>
            </template>
          </DataTable>
        </div>
      </div>
    </AppDialog>

    <AppDialog
      v-model="comparisonFullscreen"
      width="96vw"
      :breakpoints="{ '960px': '98vw', '640px': '100vw' }"
      :title="`Comparison: ${selectedCompareStation ? comparisonStationTitle : 'Select a Station'}`"
      description="Compare measured values and scores across DUTs."
      class="top-product-isn-results__dialog"
    >

      <div class="top-product-isn-results__comparison-shell top-product-isn-results__comparison-shell--fullscreen">
        <section class="top-product-isn-results__filter-grid">
          <label class="top-product-isn-results__field">
            <span>Station</span>
            <AppSelect v-model="selectedCompareStation" :options="comparisonStationOptions"
              placeholder="Select a station" />
          </label>

          <label class="top-product-isn-results__field top-product-isn-results__field--wide">
            <span>Search Test Items</span>
            <input v-model="comparisonSearch" type="text" placeholder="Search comparison rows">
          </label>

          <label class="top-product-isn-results__field">
            <span>Score Filter</span>
            <AppSelect v-model="comparisonScoreFilter" :options="scoreFilterOptions" placeholder="All Scores"
              :searchable="false" />
          </label>

          <label class="top-product-isn-results__field">
            <span>Limit Status</span>
            <AppSelect v-model="comparisonLimitFilter" :options="limitFilterOptions" placeholder="All Results"
              :searchable="false" />
          </label>

          <label class="top-product-isn-results__field top-product-isn-results__field--wide">
            <span>Pin Columns</span>
            <AppMultiSelect v-model="comparisonLockedColumns" :options="comparisonColumnSelectOptions"
              placeholder="Pin columns" />
          </label>
        </section>

        <div v-if="selectedCompareStation && filteredComparisonData.length > 0" class="top-product-isn-results__table-shell">
          <DataTable
            :value="filteredComparisonData"
            paginator
            :rows="50"
            dataKey="test_item"
            scrollable
            scrollHeight="calc(100vh - 22rem)"
            removableSort
            showGridlines
            stripedRows
            class="top-product-isn-results__data-table app-interactive-datatable"
          >
            <Column
              v-for="column in comparisonHeaders"
              :key="column.key"
              :field="column.key"
              :header="column.title"
              :sortable="column.sortable"
              :frozen="comparisonLockedColumns.includes(column.key)"
              alignFrozen="left"
              :style="getComparisonColumnStyle(column.key)"
            >
              <template v-if="column.key === 'test_item'" #body="slotProps">
                <span class="top-product-isn-results__strong">{{ slotProps.data.test_item }}</span>
              </template>

              <template v-else-if="column.key === 'usl' || column.key === 'lsl' || column.key === 'target'" #body="slotProps">
                <span class="top-product-isn-results__muted">{{ slotProps.data[column.key] ?? '-' }}</span>
              </template>

              <template v-else-if="column.key === 'measured_max_diff'" #body="slotProps">
                <span
                  v-if="slotProps.data.measured_max_diff !== null"
                  class="top-product-isn-results__badge"
                  :class="badgeToneClass(getDeltaColor(slotProps.data.measured_max_diff))"
                >
                  {{ slotProps.data.measured_max_diff.toFixed(2) }}
                </span>
                <span v-else class="top-product-isn-results__muted">N/A</span>
              </template>

              <template v-else-if="column.key.startsWith('measured_')" #body="slotProps">
                <span
                  v-if="slotProps.data[column.key] !== null && slotProps.data[column.key] !== undefined && slotProps.data[column.key] !== 'N/A'"
                  class="top-product-isn-results__badge"
                  :class="badgeToneClass(getMeasuredValueColor(slotProps.data[column.key], slotProps.data.usl, slotProps.data.lsl))"
                >
                  {{ slotProps.data[column.key] }}
                </span>
                <span v-else class="top-product-isn-results__muted">N/A</span>
              </template>

              <template v-else-if="column.key.startsWith('delta_mt_')" #body="slotProps">
                <span
                  v-if="slotProps.data[column.key] !== undefined && slotProps.data[column.key] !== null"
                  class="top-product-isn-results__badge"
                  :class="badgeToneClass(getDeltaColor(slotProps.data[column.key]))"
                >
                  {{ slotProps.data[column.key].toFixed(2) }}
                </span>
                <span v-else class="top-product-isn-results__muted">N/A</span>
              </template>

              <template v-else-if="column.key.startsWith('score_')" #body="slotProps">
                <button
                  type="button"
                  class="top-product-isn-results__badge top-product-isn-results__score-button"
                  :class="badgeToneClass(getScoreColor(slotProps.data[column.key]))"
                  :disabled="!slotProps.data[`breakdown_${column.key.replace('score_', '')}`]"
                  @click="slotProps.data[`breakdown_${column.key.replace('score_', '')}`] && handleComparisonScoreClick(slotProps.data, column.key.replace('score_', ''))"
                >
                  <span>
                    {{ slotProps.data[column.key] !== undefined ? slotProps.data[column.key].toFixed(2) : 'N/A' }}
                  </span>
                  <Icon v-if="slotProps.data[`breakdown_${column.key.replace('score_', '')}`]" icon="mdi:information-outline" />
                </button>
              </template>
            </Column>

            <template #empty>
              <div class="top-product-isn-results__empty-inline">No comparison rows match the current filters.</div>
            </template>
          </DataTable>
        </div>
        <div v-else class="top-product-isn-results__empty-state">
          <Icon icon="mdi:table-search" />
          <strong>{{ selectedCompareStation ? 'No comparison rows available' : 'Select a station to compare DUTs' }}</strong>
          <p>
            {{ selectedCompareStation
              ? 'The current search and filter set returned no shared test items.'
              : `Choose a station that exists across all ${enhancedResults.length} DUT results.` }}
          </p>
        </div>
      </div>
    </AppDialog>

    <ScoreBreakdownDialog
      v-model="scoreBreakdownDialog"
      :item="selectedScoreBreakdown"
      :custom-scoring-enabled="props.customScoringEnabled"
      :universal-formula="props.universalFormula"
      :category-formulas="props.categoryFormulas"
    />

    <AppPanel
      eyebrow="Results"
      title="Analysis Results"
      :description="`${enhancedResults.length} DUT ${enhancedResults.length === 1 ? 'result' : 'results'} ready for ranking and drilldown.`"
      tone="cool"
      splitHeader
    >
      <template #header-aside>
        <button type="button" class="top-product-isn-results__primary-button" @click="$emit('export')">
          <Icon icon="mdi:download" />
          <span>Export</span>
        </button>
      </template>

      <div class="top-product-isn-results__stat-grid">
        <article class="top-product-isn-results__stat-card">
          <small>DUTs Analyzed</small>
          <strong>{{ enhancedResults.length }}</strong>
        </article>
        <article class="top-product-isn-results__stat-card top-product-isn-results__stat-card--success">
          <small>Total Station Results</small>
          <strong>{{ totalStations }}</strong>
        </article>
        <article class="top-product-isn-results__stat-card top-product-isn-results__stat-card--warning">
          <small>Failed DUTs</small>
          <strong>{{ failedDUTsCount }}</strong>
        </article>
      </div>
    </AppPanel>

    <TopProductRanking
      v-if="enhancedResults.length > 0"
      :results="results"
      @row-click="handleRankingRowClick"
    />

    <section v-if="errors.length > 0" class="top-product-isn-results__notice top-product-isn-results__notice--error">
      <div>
        <strong>Analysis Errors ({{ errors.length }})</strong>
        <ul class="top-product-isn-results__error-list">
          <li v-for="(error, index) in errors" :key="`${error.dut_isn}-${index}`">
            <span>{{ error.dut_isn }}</span>
            <small>{{ error.detail }}</small>
          </li>
        </ul>
      </div>
    </section>

    <AppPanel
      v-if="enhancedResults.length > 1"
      eyebrow="Comparison"
      title="Compare Test Results"
      description="Choose a shared station, then compare measured values and scores."
      splitHeader
      tone="warm"
    >
      <template #header-aside>
        <div class="top-product-isn-results__panel-actions">
          <button
            v-if="selectedCompareStation && comparisonData.length > 0"
            type="button"
            class="top-product-isn-results__ghost-button"
            @click="comparisonFullscreen = true"
          >
            <Icon icon="mdi:fullscreen" />
            <span>Expanded View</span>
          </button>
          <button
            type="button"
            class="top-product-isn-results__ghost-button"
            @click="showComparison = !showComparison"
          >
            <Icon :icon="showComparison ? 'mdi:chevron-up' : 'mdi:chevron-down'" />
            <span>{{ showComparison ? 'Collapse' : 'Expand' }}</span>
          </button>
        </div>
      </template>

      <div v-if="showComparison" class="top-product-isn-results__comparison-shell">
        <section class="top-product-isn-results__filter-grid">
          <label class="top-product-isn-results__field">
            <span>Station</span>
            <AppSelect v-model="selectedCompareStation" :options="comparisonStationOptions"
              placeholder="Select a station" />
          </label>

          <label class="top-product-isn-results__field top-product-isn-results__field--wide">
            <span>Search Test Items</span>
            <input v-model="comparisonSearch" type="text" placeholder="Filter the shared comparison set">
          </label>

          <label class="top-product-isn-results__field">
            <span>Score Filter</span>
            <AppSelect v-model="comparisonScoreFilter" :options="scoreFilterOptions" placeholder="All Scores"
              :searchable="false" />
          </label>

          <label class="top-product-isn-results__field">
            <span>Limit Status</span>
            <AppSelect v-model="comparisonLimitFilter" :options="limitFilterOptions" placeholder="All Results"
              :searchable="false" />
          </label>

          <label class="top-product-isn-results__field top-product-isn-results__field--wide">
            <span>Pin Columns</span>
            <AppMultiSelect v-model="comparisonLockedColumns" :options="comparisonColumnSelectOptions"
              placeholder="Pin columns" />
          </label>
        </section>

        <div v-if="selectedCompareStation && filteredComparisonData.length > 0" class="top-product-isn-results__table-shell">
          <DataTable
            :value="filteredComparisonData"
            paginator
            :rows="15"
            dataKey="test_item"
            scrollable
            scrollHeight="32rem"
            removableSort
            showGridlines
            stripedRows
            class="top-product-isn-results__data-table app-interactive-datatable"
          >
            <Column
              v-for="column in comparisonHeaders"
              :key="column.key"
              :field="column.key"
              :header="column.title"
              :sortable="column.sortable"
              :frozen="comparisonLockedColumns.includes(column.key)"
              alignFrozen="left"
              :style="getComparisonColumnStyle(column.key)"
            >
              <template v-if="column.key === 'test_item'" #body="slotProps">
                <span class="top-product-isn-results__strong">{{ slotProps.data.test_item }}</span>
              </template>

              <template v-else-if="column.key === 'usl' || column.key === 'lsl' || column.key === 'target'" #body="slotProps">
                <span class="top-product-isn-results__muted">{{ slotProps.data[column.key] ?? '-' }}</span>
              </template>

              <template v-else-if="column.key === 'measured_max_diff'" #body="slotProps">
                <span
                  v-if="slotProps.data.measured_max_diff !== null"
                  class="top-product-isn-results__badge"
                  :class="badgeToneClass(getDeltaColor(slotProps.data.measured_max_diff))"
                >
                  {{ slotProps.data.measured_max_diff.toFixed(2) }}
                </span>
                <span v-else class="top-product-isn-results__muted">N/A</span>
              </template>

              <template v-else-if="column.key.startsWith('measured_')" #body="slotProps">
                <span
                  v-if="slotProps.data[column.key] !== null && slotProps.data[column.key] !== undefined && slotProps.data[column.key] !== 'N/A'"
                  class="top-product-isn-results__badge"
                  :class="badgeToneClass(getMeasuredValueColor(slotProps.data[column.key], slotProps.data.usl, slotProps.data.lsl))"
                >
                  {{ slotProps.data[column.key] }}
                </span>
                <span v-else class="top-product-isn-results__muted">N/A</span>
              </template>

              <template v-else-if="column.key.startsWith('delta_mt_')" #body="slotProps">
                <span
                  v-if="slotProps.data[column.key] !== undefined && slotProps.data[column.key] !== null"
                  class="top-product-isn-results__badge"
                  :class="badgeToneClass(getDeltaColor(slotProps.data[column.key]))"
                >
                  {{ slotProps.data[column.key].toFixed(2) }}
                </span>
                <span v-else class="top-product-isn-results__muted">N/A</span>
              </template>

              <template v-else-if="column.key.startsWith('score_')" #body="slotProps">
                <button
                  type="button"
                  class="top-product-isn-results__badge top-product-isn-results__score-button"
                  :class="badgeToneClass(getScoreColor(slotProps.data[column.key]))"
                  :disabled="!slotProps.data[`breakdown_${column.key.replace('score_', '')}`]"
                  @click="slotProps.data[`breakdown_${column.key.replace('score_', '')}`] && handleComparisonScoreClick(slotProps.data, column.key.replace('score_', ''))"
                >
                  <span>
                    {{ slotProps.data[column.key] !== undefined ? slotProps.data[column.key].toFixed(2) : 'N/A' }}
                  </span>
                  <Icon v-if="slotProps.data[`breakdown_${column.key.replace('score_', '')}`]" icon="mdi:information-outline" />
                </button>
              </template>
            </Column>

            <template #empty>
              <div class="top-product-isn-results__empty-inline">No comparison rows match the current filters.</div>
            </template>
          </DataTable>
        </div>

        <div v-else class="top-product-isn-results__empty-state top-product-isn-results__empty-state--compact">
          <Icon icon="mdi:compare-horizontal" />
          <strong>{{ selectedCompareStation ? 'No shared comparison data available' : 'Select a station to compare all DUTs' }}</strong>
          <p>
            {{ selectedCompareStation
              ? 'No test items matched the current score, limit, or search filters.'
              : 'Choose a station above to populate the shared comparison table.' }}
          </p>
        </div>
      </div>
    </AppPanel>

    <section v-if="enhancedResults.length > 0" class="top-product-isn-results__dut-stack">
      <details
        v-for="(result, index) in enhancedResults"
        :key="result.dut_isn"
        class="top-product-isn-results__dut-disclosure"
        :open="openDutPanels.includes(result.dut_isn)"
        @toggle="handleDutDisclosureToggle(result.dut_isn, $event)"
      >
        <summary>
          <div class="top-product-isn-results__dut-summary">
            <div>
              <p class="top-product-isn-results__dut-title">{{ result.dut_isn }}</p>
              <span>{{ result.site_name }} / {{ result.model_name }} • {{ result.test_result.length }} station(s)</span>
            </div>
            <div class="top-product-isn-results__badge-row">
              <span class="top-product-isn-results__badge top-product-isn-results__badge--neutral">
                {{ result.test_result.length }} station{{ result.test_result.length === 1 ? '' : 's' }}
              </span>
              <span
                class="top-product-isn-results__badge"
                :class="hasErrorInResult(result) ? 'top-product-isn-results__badge--error' : 'top-product-isn-results__badge--success'"
              >
                {{ hasErrorInResult(result) ? 'Has Errors' : 'Clean Pass' }}
              </span>
            </div>
          </div>
        </summary>

        <AppPanel
          :eyebrow="index === 0 ? 'Primary DUT' : 'DUT'"
          title="Station Results"
          :description="`Inspect the station outcomes for ${result.dut_isn} and open measurement detail when needed.`"
          tone="default"
        >
          <AppDataGrid
            :columns="stationColumns"
            :rows="result.test_result"
            dataKey="station_name"
            :paginator="true"
            :rowsPerPage="10"
            :rowClass="stationRowClass"
            scrollHeight="28rem"
          >
            <template #cell-station_name="{ data }">
              <div class="top-product-isn-results__station-cell">
                <strong :class="{ 'top-product-isn-results__station-cell--error': data.error_item && data.error_item.trim() !== '' }">
                  {{ data.station_name }}
                </strong>
                <small>{{ data.device || 'No device name' }}</small>
              </div>
            </template>

            <template #cell-test_date="{ data }">
              <span>{{ formatDate(data.test_date) }}</span>
            </template>

            <template #cell-measurement_count="{ data }">
              <span class="top-product-isn-results__badge top-product-isn-results__badge--neutral">
                {{ data.measurement_count || 0 }}
              </span>
            </template>

            <template #cell-overall_data_score="{ data }">
              <div v-if="data.error_item && data.error_item.trim() !== ''" class="top-product-isn-results__score-na">
                <span>N/A</span>
                <small>Failed DUT</small>
              </div>
              <span
                v-else
                class="top-product-isn-results__badge"
                :class="badgeToneClass(getScoreColor(data.overall_data_score))"
              >
                {{ data.overall_data_score.toFixed(2) }}
              </span>
            </template>

            <template #cell-actions="{ data }">
              <button
                type="button"
                class="top-product-isn-results__ghost-button top-product-isn-results__ghost-button--compact"
                @click="showMeasurements(result.dut_isn, data)"
              >
                <Icon icon="mdi:table-eye" />
                <span>Open</span>
              </button>
            </template>

            <template #empty>
              <div class="top-product-isn-results__empty-inline">No station results are available for this DUT.</div>
            </template>
          </AppDataGrid>
        </AppPanel>
      </details>
    </section>

    <AppPanel
      v-else
      eyebrow="No Results"
      title="No successful analyses to display"
      description="Run or retry a Top Product analysis to populate this view."
      tone="default"
    >
      <div class="top-product-isn-results__empty-state">
        <Icon icon="mdi:information-outline" />
        <strong>No Results</strong>
        <p>No successful analyses are available yet.</p>
      </div>
    </AppPanel>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import { computed, ref, watch } from 'vue'
import ScoreBreakdownDialog from '@/features/dut-logs/components/ScoreBreakdownDialog.vue'
import { AppDialog, AppMultiSelect, AppPanel, AppSelect } from '@/shared/ui'
import AppDataGrid from '@/shared/ui/data-grid/AppDataGrid.vue'
import { formatDate } from '@/shared/utils/helpers'
import { dutApi } from '../api/dut.api'
import type {
  ScoreBreakdown,
  TopProductError,
  TopProductMeasurement,
  TopProductResult,
  TopProductStationResult,
} from '../types/dutTopProduct.types'
import TopProductRanking from './TopProductRanking.vue'

interface Props {
  results: TopProductResult[]
  errors: TopProductError[]
  customScoringEnabled?: boolean
  // biome-ignore lint/suspicious/noExplicitAny: FormulaSelection type from useFormulaSelector composable
  universalFormula?: any
  // biome-ignore lint/suspicious/noExplicitAny: CategoryFormulaSelections type from useFormulaSelector composable
  categoryFormulas?: any
}

const props = defineProps<Props>()

defineEmits<(e: 'export') => void>()

const measurementDialog = ref(false)
const isFullscreen = ref(false)
const selectedMeasurement = ref<{ dutISN: string; station: TopProductStationResult } | null>(null)

const scoreBreakdownDialog = ref(false)
// biome-ignore lint/suspicious/noExplicitAny: wrapper matches ParsedTestItemEnhanced interface loosely
const selectedScoreBreakdown = ref<any | null>(null)

watch(scoreBreakdownDialog, (isOpen) => {
  if (!isOpen) {
    setTimeout(() => {
      selectedScoreBreakdown.value = null
    }, 350)
  }
})

const measurementSearch = ref('')
const scoreFilter = ref<string | null>(null)
const limitFilter = ref<string | null>(null)

const loadingIdentifiers = ref(false)
const linkedIdentifiers = ref<string[]>([])

const showComparison = ref(false)
const selectedCompareStation = ref<string | null>(null)
const comparisonSearch = ref('')
const comparisonFullscreen = ref(false)
const comparisonScoreFilter = ref<string | null>(null)
const comparisonLimitFilter = ref<string | null>(null)

const openDutPanels = ref<string[]>([])

const measurementLockedColumns = ref<string[]>(['test_item', 'usl', 'lsl'])
const comparisonLockedColumns = ref<string[]>(['test_item', 'usl', 'lsl', 'target'])

const measurementDialogWidth = computed(() => (isFullscreen.value ? '96vw' : 'min(96vw, 78rem)'))

const measurementScrollHeight = computed(() =>
  isFullscreen.value ? 'calc(100vh - 25rem)' : '34rem',
)

const scoreFilterOptions = [
  { label: 'All Scores', value: null },
  { label: 'Score >= 9', value: 'high' },
  { label: 'Score 7-9', value: 'medium' },
  { label: 'Score < 7', value: 'low' },
]

const limitFilterOptions = [
  { label: 'All Results', value: null },
  { label: 'Within Limits', value: 'within' },
  { label: 'Out Of Limits', value: 'out' },
]

const dialogBreakpoints = {
  '1200px': '94vw',
  '960px': '98vw',
  '640px': '100vw',
}

const allLinkedISNs = computed(() => {
  if (linkedIdentifiers.value.length === 0) {
    return []
  }
  return linkedIdentifiers.value.slice(1)
})

const otherLinkedISNs = computed(() => {
  if (linkedIdentifiers.value.length === 0) {
    return []
  }
  return linkedIdentifiers.value.filter((isn) => isn !== selectedMeasurement.value?.dutISN)
})

watch(measurementDialog, async (isOpen) => {
  if (isOpen && selectedMeasurement.value?.dutISN) {
    await fetchLinkedIdentifiers(selectedMeasurement.value.dutISN)
  } else if (!isOpen) {
    linkedIdentifiers.value = []
    measurementSearch.value = ''
    scoreFilter.value = null
    limitFilter.value = null
    isFullscreen.value = false
  }
})

function parseMeasurements(data: unknown[]): TopProductMeasurement[] {
  if (!data || data.length === 0) return []

  const measurements: TopProductMeasurement[] = []

  for (let index = 0; index < data.length; index += 1) {
    const item = data[index]
    if (!item) continue

    const isObjectFormat =
      typeof item === 'object' && item !== null && !Array.isArray(item) && 'test_item' in item

    let testItem: string
    let usl: number | null
    let lsl: number | null
    let actual: number
    let target: number | null
    let systemScore: number
    let breakdown: ScoreBreakdown | null

    if (isObjectFormat) {
      const objectItem = item as Record<string, unknown>
      testItem = String(objectItem.test_item || '')
      usl = objectItem.usl !== null && objectItem.usl !== undefined ? Number(objectItem.usl) : null
      lsl = objectItem.lsl !== null && objectItem.lsl !== undefined ? Number(objectItem.lsl) : null
      actual =
        objectItem.actual !== null && objectItem.actual !== undefined
          ? Number(objectItem.actual)
          : 0

      breakdown =
        objectItem.score_breakdown && typeof objectItem.score_breakdown === 'object'
          ? (objectItem.score_breakdown as ScoreBreakdown)
          : null

      systemScore = breakdown?.final_score ?? (breakdown as { score?: number } | null)?.score ?? 0
      target = breakdown?.target_used ?? null
    } else {
      const row = item as Array<string | number | null | ScoreBreakdown>
      if (row.length < 6) continue

      testItem = String(row[0] || '')
      usl = row[1] !== null ? Number(row[1]) : null
      lsl = row[2] !== null ? Number(row[2]) : null
      actual = row[3] !== null && row[3] !== undefined ? Number(row[3]) : 0
      target = row[4] !== null ? Number(row[4]) : null
      systemScore = Number(row[5] || 0)
      breakdown = row[6] && typeof row[6] === 'object' ? (row[6] as ScoreBreakdown) : null
    }

    measurements.push({
      test_item: testItem,
      usl,
      lsl,
      actual: String(actual),
      target: target !== null ? String(target) : null,
      expected: target !== null ? String(target) : null,
      score: systemScore,
      breakdown,
      systemScore,
      scoreSource: 'system',
    })
  }

  return measurements
}

const enhancedResults = computed(() => {
  return props.results.map((result) => ({
    ...result,
    test_result: result.test_result.map((station) => ({
      ...station,
      measurement: parseMeasurements(station.data),
      measurement_count: Number(station.metadata?.measurement_count || station.data?.length || 0),
      device_name: station.device,
    })),
  }))
})

const comparisonStations = computed(() => {
  if (enhancedResults.value.length === 0) return []

  const siteModelGroups = new Map<string, typeof enhancedResults.value>()

  enhancedResults.value.forEach((result) => {
    const key = `${result.site_name || 'Unknown'}|${result.model_name || 'Unknown'}`
    if (!siteModelGroups.has(key)) {
      siteModelGroups.set(key, [])
    }
    siteModelGroups.get(key)?.push(result)
  })

  const stationOptions: Array<{
    value: string
    title: string
    raw: { station: string; site: string; model: string }
  }> = []

  siteModelGroups.forEach((dutGroup) => {
    if (dutGroup.length === 0) return

    const firstDUT = dutGroup[0]
    if (!firstDUT) return

    const potentialStations = new Map<string, { station: string; site: string; model: string }>()

    firstDUT.test_result.forEach((station) => {
      potentialStations.set(station.station_name, {
        station: station.station_name,
        site: firstDUT.site_name || 'Unknown',
        model: firstDUT.model_name || 'Unknown',
      })
    })

    potentialStations.forEach((stationInfo, stationName) => {
      const existsInAllDUTs = dutGroup.every((dut) =>
        dut.test_result.some((station) => station.station_name === stationName),
      )

      if (existsInAllDUTs) {
        stationOptions.push({
          value: stationName,
          title: stationName,
          raw: stationInfo,
        })
      }
    })
  })

  return stationOptions.sort((a, b) => a.title.localeCompare(b.title))
})

const comparisonStationOptions = computed(() => [
  { label: 'Select a station', value: null },
  ...comparisonStations.value.map((station) => ({
    label: station.title,
    value: station.value,
  })),
])

watch(
  enhancedResults,
  (value) => {
    if (value.length === 0) {
      openDutPanels.value = []
      return
    }

    if (openDutPanels.value.length === 0) {
      const firstResult = value[0]
      if (firstResult) {
        openDutPanels.value = [firstResult.dut_isn]
      }
    }

    if (!selectedCompareStation.value) {
      const firstStation = comparisonStations.value[0]
      if (firstStation) {
        selectedCompareStation.value = firstStation.value
      }
    }
  },
  { immediate: true },
)

const stationColumns = [
  { key: 'station_name', header: 'Station', field: 'station_name', sortable: true },
  { key: 'test_date', header: 'Test Date', field: 'test_date', sortable: true },
  { key: 'measurement_count', header: 'Items', field: 'measurement_count', sortable: true },
  {
    key: 'overall_data_score',
    header: 'Overall Score',
    field: 'overall_data_score',
    sortable: true,
  },
  { key: 'actions', header: 'Actions', field: 'actions', sortable: false },
]

const measurementHeaders = [
  { title: 'Test Item', key: 'test_item', sortable: true },
  { title: 'USL', key: 'usl', sortable: true },
  { title: 'LSL', key: 'lsl', sortable: true },
  { title: 'Target', key: 'target', sortable: false },
  { title: 'Meas.', key: 'actual', sortable: false },
  { title: 'Δ Meas. & Target', key: 'delta_actual_target', sortable: false },
  { title: 'Score', key: 'score', sortable: true },
]

const measurementColumnOptions = computed(() =>
  measurementHeaders.map((header) => ({
    title: header.title,
    value: header.key,
  })),
)

const measurementColumnSelectOptions = computed(() =>
  measurementColumnOptions.value.map((option) => ({
    label: option.title,
    value: option.value,
  })),
)

const totalStations = computed(() => {
  return enhancedResults.value.reduce((sum, result) => sum + result.test_result.length, 0)
})

const failedDUTsCount = computed(() => {
  return enhancedResults.value.filter((result) => {
    return result.test_result.some(
      (station) => station.error_item && station.error_item.trim() !== '',
    )
  }).length
})

const filteredMeasurements = computed(() => {
  if (!selectedMeasurement.value?.station.measurement) return []

  let filtered = selectedMeasurement.value.station.measurement

  if (measurementSearch.value) {
    const searchLower = measurementSearch.value.toLowerCase()
    filtered = filtered.filter((measurement) =>
      measurement.test_item.toLowerCase().includes(searchLower),
    )
  }

  if (scoreFilter.value) {
    filtered = filtered.filter((measurement) => {
      if (scoreFilter.value === 'high') return measurement.score >= 9
      if (scoreFilter.value === 'medium') return measurement.score >= 7 && measurement.score < 9
      if (scoreFilter.value === 'low') return measurement.score < 7
      return true
    })
  }

  if (limitFilter.value) {
    filtered = filtered.filter((measurement) => {
      const actual = parseFloat(measurement.actual)
      if (Number.isNaN(actual)) return false

      const withinLimits =
        (measurement.lsl === null || actual >= measurement.lsl) &&
        (measurement.usl === null || actual <= measurement.usl)

      if (limitFilter.value === 'within') return withinLimits
      if (limitFilter.value === 'out') return !withinLimits
      return true
    })
  }

  return filtered
})

const comparisonStationTitle = computed(() => {
  return (
    comparisonStations.value.find((station) => station.value === selectedCompareStation.value)
      ?.title || ''
  )
})

const comparisonHeaders = computed(() => {
  const baseHeaders = [
    { title: 'Test Item', key: 'test_item', sortable: true },
    { title: 'USL', key: 'usl', sortable: true },
    { title: 'LSL', key: 'lsl', sortable: true },
    { title: 'Target', key: 'target', sortable: false },
  ]

  const measuredHeaders = enhancedResults.value.map((result) => ({
    title: `Meas. ${result.dut_isn}`,
    key: `measured_${result.dut_isn}`,
    sortable: false,
  }))

  const actMaxDiffHeader = {
    title: 'Meas.Max Diff',
    key: 'measured_max_diff',
    sortable: true,
  }

  const deltaHeaders = enhancedResults.value.map((result) => ({
    title: `Δ Meas. & Target ${result.dut_isn}`,
    key: `delta_mt_${result.dut_isn}`,
    sortable: false,
  }))

  const scoreHeaders = enhancedResults.value.map((result) => ({
    title: `Score ${result.dut_isn}`,
    key: `score_${result.dut_isn}`,
    sortable: true,
  }))

  return [...baseHeaders, ...measuredHeaders, actMaxDiffHeader, ...deltaHeaders, ...scoreHeaders]
})

const comparisonColumnOptions = computed(() =>
  comparisonHeaders.value.map((header) => ({
    title: header.title,
    value: header.key,
  })),
)

const comparisonColumnSelectOptions = computed(() =>
  comparisonColumnOptions.value.map((option) => ({
    label: option.title,
    value: option.value,
  })),
)

const comparisonData = computed(() => {
  if (!selectedCompareStation.value) return []

  let canonicalOrder: string[] = []
  const firstResult = enhancedResults.value[0]
  if (firstResult) {
    const firstStation = firstResult.test_result.find(
      (station) => station.station_name === selectedCompareStation.value,
    )
    if (firstStation) {
      const measurements = parseMeasurements(firstStation.data)
      canonicalOrder = measurements.map((measurement) => measurement.test_item)
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: dynamic comparison data with computed DUT-specific keys
  const testItemMap = new Map<string, any>()

  enhancedResults.value.forEach((result) => {
    const station = result.test_result.find(
      (entry) => entry.station_name === selectedCompareStation.value,
    )
    if (!station) return

    const measurements = parseMeasurements(station.data)
    measurements.forEach((measurement) => {
      if (!testItemMap.has(measurement.test_item)) {
        const globalIndex = canonicalOrder.indexOf(measurement.test_item)

        testItemMap.set(measurement.test_item, {
          test_item: measurement.test_item,
          usl: measurement.usl,
          lsl: measurement.lsl,
          target: measurement.target,
          _global_index: globalIndex >= 0 ? globalIndex : 9999,
        })
      }

      const entry = testItemMap.get(measurement.test_item)
      if (entry) {
        entry[`score_${result.dut_isn}`] = measurement.score
        entry[`measured_${result.dut_isn}`] = measurement.actual
        entry[`breakdown_${result.dut_isn}`] = measurement.breakdown

        if (
          measurement.actual !== null &&
          measurement.actual !== '' &&
          measurement.target !== null
        ) {
          const measuredNum = parseFloat(measurement.actual)
          const targetNum = parseFloat(measurement.target)
          if (!Number.isNaN(measuredNum) && !Number.isNaN(targetNum)) {
            entry[`delta_mt_${result.dut_isn}`] = measuredNum - targetNum
          }
        }
      }
    })
  })

  const comparisonItems = Array.from(testItemMap.values()).map((item) => {
    const measuredValues: number[] = []

    enhancedResults.value.forEach((result) => {
      const measured = item[`measured_${result.dut_isn}`]
      if (measured !== undefined && measured !== '') {
        const measuredNum = parseFloat(measured)
        if (!Number.isNaN(measuredNum)) {
          measuredValues.push(measuredNum)
        }
      }
    })

    return {
      ...item,
      measured_max_diff:
        measuredValues.length > 1
          ? Math.max(...measuredValues) - Math.min(...measuredValues)
          : null,
    }
  })

  return comparisonItems.sort((a, b) => (a._global_index ?? 9999) - (b._global_index ?? 9999))
})

const filteredComparisonData = computed(() => {
  let filtered = comparisonData.value

  if (comparisonSearch.value) {
    const searchLower = comparisonSearch.value.toLowerCase()
    filtered = filtered.filter((item) => item.test_item.toLowerCase().includes(searchLower))
  }

  if (comparisonScoreFilter.value) {
    filtered = filtered.filter((item) => {
      return enhancedResults.value.some((result) => {
        const score = item[`score_${result.dut_isn}`]
        if (score === undefined) return false

        if (comparisonScoreFilter.value === 'high') return score >= 9
        if (comparisonScoreFilter.value === 'medium') return score >= 7 && score < 9
        if (comparisonScoreFilter.value === 'low') return score < 7
        return true
      })
    })
  }

  if (comparisonLimitFilter.value) {
    filtered = filtered.filter((item) => {
      return enhancedResults.value.some((result) => {
        const measured = item[`measured_${result.dut_isn}`]
        if (!measured || measured === 'N/A') return false

        const measuredNum = parseFloat(measured)
        if (Number.isNaN(measuredNum)) return false

        const withinLimits =
          (item.lsl === null || measuredNum >= item.lsl) &&
          (item.usl === null || measuredNum <= item.usl)

        if (comparisonLimitFilter.value === 'within') return withinLimits
        if (comparisonLimitFilter.value === 'out') return !withinLimits
        return true
      })
    })
  }

  return filtered
})

async function fetchLinkedIdentifiers(isn: string) {
  if (!isn || isn.length < 10) {
    linkedIdentifiers.value = []
    return
  }

  loadingIdentifiers.value = true
  try {
    const response = await dutApi.getDUTISNVariants(isn)
    linkedIdentifiers.value = response
  } catch (_error) {
    linkedIdentifiers.value = []
  } finally {
    loadingIdentifiers.value = false
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch (_error) {
    // Clipboard access is optional.
  }
}

function getScoreColor(score: number): string {
  if (score >= 9) return 'success'
  if (score >= 7) return 'primary'
  if (score >= 4) return 'warning'
  return 'error'
}

type ScoreSource = 'category' | 'universal' | 'system'

function getScoreSourceLabel(source: ScoreSource): string {
  switch (source) {
    case 'category':
      return 'Category Custom Formula'
    case 'universal':
      return 'Universal Custom Formula'
    default:
      return 'System Default'
  }
}

function getDeltaColor(delta: number): string {
  const absDelta = Math.abs(delta)
  if (absDelta <= 0.5) return 'success'
  if (absDelta <= 1) return 'primary'
  if (absDelta < 3) return 'warning'
  return 'error'
}

function isErrorItem(testItemName: string): boolean {
  if (!selectedMeasurement.value?.station.error_item) {
    return false
  }
  return selectedMeasurement.value.station.error_item === testItemName
}

function hasErrorInResult(result: TopProductResult): boolean {
  return result.test_result.some(
    (station) => station.error_item && station.error_item.trim() !== '',
  )
}

function handleScoreClick(item: TopProductMeasurement) {
  if (item.breakdown) {
    selectedScoreBreakdown.value = {
      test_item: item.test_item,
      value: item.actual,
      score: item.score,
      score_breakdown: item.breakdown,
      // biome-ignore lint/suspicious/noExplicitAny: type assertion needed for ParsedTestItemEnhanced interface mismatch
    } as any

    scoreBreakdownDialog.value = true
  }
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic comparison item with DUT-specific computed keys
function handleComparisonScoreClick(comparisonItem: any, dutIsn: string) {
  const breakdown = comparisonItem[`breakdown_${dutIsn}`]
  const score = comparisonItem[`score_${dutIsn}`]
  const measuredValue = comparisonItem[`measured_${dutIsn}`]

  if (breakdown) {
    selectedScoreBreakdown.value = {
      test_item: comparisonItem.test_item,
      value: measuredValue,
      score,
      score_breakdown: breakdown,
      // biome-ignore lint/suspicious/noExplicitAny: type assertion needed for ParsedTestItemEnhanced interface mismatch
    } as any

    scoreBreakdownDialog.value = true
  }
}

function getActualValueColor(measurement: TopProductMeasurement): string {
  const actual = parseFloat(measurement.actual)
  if (Number.isNaN(actual)) return 'default'

  const withinLimits =
    (measurement.lsl === null || actual >= measurement.lsl) &&
    (measurement.usl === null || actual <= measurement.usl)

  if (!withinLimits) return 'error'

  if (measurement.lsl !== null && measurement.usl !== null) {
    const range = measurement.usl - measurement.lsl
    const lowerWarning = measurement.lsl + range * 0.1
    const upperWarning = measurement.usl - range * 0.1

    if (actual <= lowerWarning || actual >= upperWarning) {
      return 'warning'
    }
  }

  return 'success'
}

// biome-ignore lint/suspicious/noExplicitAny: accepts string or number from dynamic comparison data
function getMeasuredValueColor(measuredValue: any, usl: number | null, lsl: number | null): string {
  const actual = parseFloat(measuredValue)
  if (Number.isNaN(actual)) return 'default'

  const withinLimits = (lsl === null || actual >= lsl) && (usl === null || actual <= usl)

  if (!withinLimits) return 'error'

  if (lsl !== null && usl !== null) {
    const range = usl - lsl
    const lowerWarning = lsl + range * 0.1
    const upperWarning = usl - range * 0.1

    if (actual <= lowerWarning || actual >= upperWarning) {
      return 'warning'
    }
  }

  return 'success'
}

function handleRankingRowClick(payload: { isn: string; stationName: string }) {
  const dutResult = enhancedResults.value.find((result) => result.dut_isn === payload.isn)
  if (!dutResult) return

  const stationResult = dutResult.test_result.find(
    (result) => result.station_name === payload.stationName,
  )
  if (!stationResult) return

  showMeasurements(payload.isn, stationResult)
}

function showMeasurements(dutISN: string, station: TopProductStationResult) {
  selectedMeasurement.value = { dutISN, station }
  measurementDialog.value = true
}

function handleDutDisclosureToggle(dutIsn: string, event: Event) {
  const target = event.target as HTMLDetailsElement
  if (target.open) {
    if (!openDutPanels.value.includes(dutIsn)) {
      openDutPanels.value = [...openDutPanels.value, dutIsn]
    }
    return
  }

  openDutPanels.value = openDutPanels.value.filter((value) => value !== dutIsn)
}

function badgeToneClass(color: string): string {
  switch (color) {
    case 'success':
      return 'top-product-isn-results__badge--success'
    case 'primary':
      return 'top-product-isn-results__badge--primary'
    case 'warning':
      return 'top-product-isn-results__badge--warning'
    case 'error':
      return 'top-product-isn-results__badge--error'
    default:
      return 'top-product-isn-results__badge--neutral'
  }
}

function differenceBadgeClass(delta: number): string {
  if (delta > 0) return 'top-product-isn-results__badge--success'
  if (delta < 0) return 'top-product-isn-results__badge--error'
  return 'top-product-isn-results__badge--neutral'
}

function getMeasurementColumnStyle(key: string) {
  const widths: Record<string, string> = {
    test_item: 'min-width: 16rem; width: 16rem;',
    usl: 'min-width: 7rem; width: 7rem;',
    lsl: 'min-width: 7rem; width: 7rem;',
    target: 'min-width: 8rem; width: 8rem;',
    actual: 'min-width: 8rem; width: 8rem;',
    delta_actual_target: 'min-width: 11rem; width: 11rem;',
    score: 'min-width: 13rem; width: 13rem;',
  }

  return widths[key] || 'min-width: 10rem;'
}

function getComparisonColumnStyle(key: string) {
  if (key === 'test_item') return 'min-width: 16rem; width: 16rem;'
  if (key === 'usl' || key === 'lsl') return 'min-width: 7rem; width: 7rem;'
  if (key === 'target') return 'min-width: 8rem; width: 8rem;'
  if (key === 'measured_max_diff') return 'min-width: 11rem; width: 11rem;'
  if (key.startsWith('measured_')) return 'min-width: 10rem; width: 10rem;'
  if (key.startsWith('delta_mt_')) return 'min-width: 12rem; width: 12rem;'
  if (key.startsWith('score_')) return 'min-width: 10rem; width: 10rem;'
  return 'min-width: 10rem;'
}

function stationRowClass(row: Record<string, unknown>) {
  const errorItem = String(row.error_item || '')
  return errorItem.trim() !== '' ? 'top-product-isn-results__station-row--error' : undefined
}
</script>

<style scoped>
.top-product-isn-results {
  display: grid;
  gap: 1rem;
}

.top-product-isn-results__dialog-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.top-product-isn-results__eyebrow {
  margin: 0 0 0.35rem;
  color: var(--app-accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.top-product-isn-results__dialog-header h2 {
  margin: 0;
  font-size: 1.35rem;
}

.top-product-isn-results__dialog-header p:last-child {
  margin: 0.35rem 0 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.top-product-isn-results__dialog-actions,
.top-product-isn-results__panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  justify-content: flex-end;
}

.top-product-isn-results__dialog-body,
.top-product-isn-results__comparison-shell {
  display: grid;
  gap: 1rem;
}

.top-product-isn-results__dialog-body--fullscreen {
  min-height: calc(100vh - 12rem);
}

.top-product-isn-results__summary-grid,
.top-product-isn-results__meta-grid,
.top-product-isn-results__status-grid,
.top-product-isn-results__stat-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
}

.top-product-isn-results__summary-card,
.top-product-isn-results__meta-card,
.top-product-isn-results__status-card,
.top-product-isn-results__stat-card {
  display: grid;
  gap: 0.65rem;
  border: 1px solid var(--app-border);
  border-radius: 0.8rem;
  padding: 0.9rem;
  background: var(--app-panel);
}

.top-product-isn-results__summary-card--highlight {
  border-color: var(--app-success-line);
  background: var(--app-panel);
}

.top-product-isn-results__summary-icon {
  display: inline-flex;
  width: 2.15rem;
  height: 2.15rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--app-panel-strong);
  color: var(--app-info);
}

.top-product-isn-results__summary-card small,
.top-product-isn-results__meta-card small,
.top-product-isn-results__stat-card small {
  color: var(--app-muted);
}

.top-product-isn-results__summary-card strong,
.top-product-isn-results__meta-card strong,
.top-product-isn-results__status-card strong,
.top-product-isn-results__stat-card strong {
  color: var(--app-ink);
  font-size: 1rem;
}

.top-product-isn-results__meta-card--wide {
  grid-column: span 2;
}

.top-product-isn-results__meta-headline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--app-ink);
}

.top-product-isn-results__token-row,
.top-product-isn-results__linked-list,
.top-product-isn-results__badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.top-product-isn-results__token {
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-panel);
  color: var(--app-ink);
  padding: 0.35rem 0.75rem;
  cursor: pointer;
}

.top-product-isn-results__token--cool {
  background: var(--app-info-soft);
  border-color: var(--app-info-line);
  color: var(--app-info);
}

.top-product-isn-results__linked-details {
  border: 1px solid var(--app-border);
  border-radius: 0.8rem;
  padding: 0.55rem 0.8rem;
  background: var(--app-panel);
}

.top-product-isn-results__linked-details summary {
  cursor: pointer;
  font-weight: 600;
}

.top-product-isn-results__linked-list {
  margin-top: 0.75rem;
}

.top-product-isn-results__inline-note,
.top-product-isn-results__muted,
.top-product-isn-results__score-na small,
.top-product-isn-results__station-cell small,
.top-product-isn-results__dut-summary span,
.top-product-isn-results__empty-state p,
.top-product-isn-results__empty-inline,
.top-product-isn-results__error-list small {
  color: var(--app-muted);
}

.top-product-isn-results__status-card--error {
  background: var(--app-danger-soft);
  border-color: var(--app-danger-line);
}

.top-product-isn-results__status-card--success {
  background: var(--app-success-soft);
  border-color: var(--app-success-line);
}

.top-product-isn-results__filter-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
}

.top-product-isn-results__field {
  display: grid;
  gap: 0.45rem;
}

.top-product-isn-results__field--wide {
  grid-column: span 2;
}

.top-product-isn-results__field span {
  color: var(--app-ink);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.top-product-isn-results__field input,
.top-product-isn-results__field select {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  padding: 0.72rem 0.82rem;
  background: var(--app-panel);
  color: var(--app-ink);
}

.top-product-isn-results__field select[multiple] {
  min-height: 8.5rem;
}

.top-product-isn-results__table-shell {
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  overflow: hidden;
  background: var(--app-panel);
}

.top-product-isn-results__table-shell :deep(.p-datatable-wrapper),
.top-product-isn-results__table-shell :deep(.p-datatable-table-container) {
  max-width: 100%;
  overflow-x: auto;
}

.top-product-isn-results__data-table :deep(.p-datatable-table) {
  min-width: max-content;
}

.top-product-isn-results__data-table :deep(.p-datatable-thead > tr > th) {
  white-space: normal;
  line-height: 1.3;
}

.top-product-isn-results__data-table :deep(.p-datatable-tbody > tr > td) {
  vertical-align: top;
}

.top-product-isn-results__score-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.top-product-isn-results__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 700;
  border: 1px solid transparent;
}

.top-product-isn-results__badge--primary {
  background: var(--app-info-soft);
  color: var(--app-info);
}

.top-product-isn-results__badge--success {
  background: var(--app-success-soft);
  color: var(--app-success);
}

.top-product-isn-results__badge--warning {
  background: var(--app-warning-soft);
  color: var(--app-warning);
}

.top-product-isn-results__badge--error {
  background: var(--app-danger-soft);
  color: var(--app-danger);
}

.top-product-isn-results__badge--neutral {
  background: rgba(120, 129, 143, 0.12);
  color: var(--app-muted);
}

.top-product-isn-results__score-button {
  border: 0;
  cursor: pointer;
}

.top-product-isn-results__score-button:disabled {
  opacity: 0.9;
  cursor: default;
}

.top-product-isn-results__mono {
  font-family: 'Courier New', Courier, monospace;
}

.top-product-isn-results__mono--error,
.top-product-isn-results__station-cell--error {
  color: var(--app-danger);
}

.top-product-isn-results__primary-button,
.top-product-isn-results__ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 999px;
  padding: 0.65rem 1rem;
  font-weight: 700;
  cursor: pointer;
}

.top-product-isn-results__primary-button {
  border: 1px solid rgba(15, 118, 110, 0.12);
  background: var(--app-accent);
  border-color: var(--app-accent);
  color: var(--app-canvas);
}

.top-product-isn-results__ghost-button {
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-ink);
}

.top-product-isn-results__ghost-button--compact {
  padding: 0.45rem 0.8rem;
}

.top-product-isn-results__notice {
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  padding: 0.9rem 1rem;
}

.top-product-isn-results__notice--error {
  background: rgba(189, 64, 64, 0.08);
}

.top-product-isn-results__error-list {
  margin: 0.8rem 0 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.45rem;
}

.top-product-isn-results__error-list li {
  display: grid;
  gap: 0.2rem;
}

.top-product-isn-results__dut-stack {
  display: grid;
  gap: 1rem;
}

.top-product-isn-results__dut-disclosure {
  border: 1px solid var(--app-border);
  border-radius: 0.7rem;
  background: var(--app-panel);
  overflow: hidden;
}

.top-product-isn-results__dut-disclosure summary {
  list-style: none;
  cursor: pointer;
  padding: 1rem 1.1rem;
}

.top-product-isn-results__dut-disclosure summary::-webkit-details-marker {
  display: none;
}

.top-product-isn-results__dut-summary {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.top-product-isn-results__dut-title {
  margin: 0 0 0.2rem;
  color: var(--app-ink);
  font-size: 1rem;
  font-weight: 700;
}

.top-product-isn-results__station-cell {
  display: grid;
  gap: 0.2rem;
}

.top-product-isn-results__station-row--error :deep(td) {
  background: rgba(189, 64, 64, 0.04);
}

.top-product-isn-results__empty-state {
  display: grid;
  justify-items: center;
  gap: 0.55rem;
  padding: 2rem 1rem;
  text-align: center;
}

.top-product-isn-results__empty-state--compact {
  padding: 1rem 0.5rem;
}

.top-product-isn-results__empty-state strong,
.top-product-isn-results__empty-inline,
.top-product-isn-results__strong {
  color: var(--app-ink);
  font-weight: 700;
}

@media (max-width: 960px) {
  .top-product-isn-results__dialog-header,
  .top-product-isn-results__dut-summary {
    flex-direction: column;
    align-items: stretch;
  }

  .top-product-isn-results__meta-card--wide,
  .top-product-isn-results__field--wide {
    grid-column: span 1;
  }
}
</style>
