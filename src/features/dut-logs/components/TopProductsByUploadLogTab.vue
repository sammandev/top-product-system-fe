<template>
  <section class="upload-log-shell">
    <AppPanel
      class="upload-log-shell__workspace"
      eyebrow="Upload Workspace"
      title="Analyze Upload Logs"
      description="Add DUT logs, optionally adjust criteria and scoring, then run analysis."
      tone="cool"
    >
      <div class="upload-log-shell__grid">
        <section class="upload-log-shell__input-section">
          <header class="upload-log-shell__section-header">
            <span class="upload-log-shell__step">1</span>
            <div>
              <h3>Test Logs</h3>
              <p>Upload TXT, ZIP, RAR, or 7Z files.</p>
            </div>
          </header>
          <AppFilePicker
            v-model="logFiles"
            label="Test log files"
            accept=".txt,.zip,.rar,.7z"
            multiple
            :disabled="loading"
            helperText="Drop one or more test logs here, or browse from disk."
            placeholder="Drop test logs here or browse from disk."
          />

          <p v-if="logFiles && logFiles.length > 0" class="upload-log-shell__helper-text">
            {{ logFiles.length }} {{ logFiles.length === 1 ? 'file' : 'files' }} selected
          </p>
        </section>

        <section class="upload-log-shell__input-section">
          <header class="upload-log-shell__section-header upload-log-shell__section-header--split">
            <span class="upload-log-shell__step">2</span>
            <div>
              <h3>Criteria</h3>
              <p>Optional JSON rules. Empty uses default criteria.</p>
            </div>
            <button type="button" class="upload-log-shell__link" @click="downloadCriteriaTemplate">
              <Icon icon="mdi:download" />
              Download template
            </button>
          </header>

          <AppFilePicker
            v-model="criteriaFile"
            label="Criteria file"
            accept=".json,application/json"
            :disabled="loading"
            helperText="Leave empty to use the default criteria rules."
            placeholder="Drop a criteria file here or browse from disk."
          />

          <label class="upload-log-shell__checkbox">
            <input v-model="showOnlyCriteria" type="checkbox" :disabled="!criteriaFile || loading">
            <span>Show only criteria items</span>
          </label>

          <button
            type="button"
            class="upload-log-shell__ghost-button"
            :disabled="loading"
            @click="openCriteriaBuilder"
          >
            <Icon icon="mdi:tune-variant" />
            Build Criteria
          </button>
        </section>
      </div>

      <div class="upload-log-shell__actions">
        <button
          type="button"
          class="upload-log-shell__primary-button upload-log-shell__action-button--analyze"
          :disabled="!canAnalyze || loading"
          @click="handleAnalyze"
        >
          <Icon :icon="loading ? 'mdi:loading' : 'mdi:chart-box-outline'" :class="{ 'upload-log-shell__spin': loading }" />
          {{ loading ? 'Analyzing...' : 'Analyze Log(s)' }}
        </button>

        <button
          type="button"
          class="upload-log-shell__ghost-button upload-log-shell__action-button--configure"
          :disabled="!hasFiles || loading"
          @click="handleConfigureScoring"
        >
          <Icon :icon="extractingItems ? 'mdi:loading' : 'mdi:function-variant'" :class="{ 'upload-log-shell__spin': extractingItems }" />
          <span>{{ extractingItems ? 'Preparing...' : 'Configure Scoring' }}</span>
          <span v-if="appliedScoringConfigs.length > 0" class="upload-log-shell__pill">
            {{ appliedScoringConfigs.length }}
          </span>
        </button>

        <button
          type="button"
          class="upload-log-shell__ghost-button upload-log-shell__action-button--reset"
          :disabled="loading"
          @click="handleReset"
        >
          <Icon icon="mdi:refresh" />
          Reset
        </button>
      </div>

      <div v-if="appliedScoringConfigs.length > 0" class="upload-log-shell__notice upload-log-shell__notice--success upload-log-shell__notice--configured">
        <div class="upload-log-shell__configured-content">
          <div class="upload-log-shell__configured-header">
            <strong>Scoring configured</strong>
            <span class="upload-log-comparison__pill upload-log-comparison__pill--success">
              {{ appliedScoringConfigs.length }} total item{{ appliedScoringConfigs.length === 1 ? '' : 's' }}
            </span>
          </div>
          <div v-if="configuredStationBreakdown.length > 0" class="upload-log-shell__configured-stations">
            <div
              v-for="item in configuredStationBreakdown"
              :key="item.station"
              class="upload-log-shell__station-pill"
            >
              <span class="upload-log-shell__station-pill-name">{{ item.station }}:</span>
              <strong>{{ item.configuredCount }}</strong>
              <small v-if="item.totalStationItems > 0">/ {{ item.totalStationItems }} items</small>
            </div>
          </div>
          <p v-else>
            {{ appliedScoringConfigs.length }} item{{ appliedScoringConfigs.length === 1 ? '' : 's' }} currently use custom scoring rules.
          </p>
        </div>

        <button type="button" class="upload-log-shell__link" @click="clearScoringConfigs">
          Clear
        </button>
      </div>

      <div v-if="selectedDeviceScope.length > 0" class="upload-log-shell__notice">
        <div>
          <strong>Device scope active</strong>
          <p>{{ selectedDeviceScope.length }} uploaded device{{ selectedDeviceScope.length === 1 ? '' : 's' }} selected for ranking and comparison.</p>
        </div>

        <button type="button" class="upload-log-shell__link" @click="selectedDeviceScope = []">
          Clear
        </button>
      </div>
    </AppPanel>

    <section v-if="hasResults" class="upload-log-shell__summary">
      <TopProductRankingUploadLog
        :parse-result="parsingResult"
        :compare-result="compareResult"
        :scoring-configs="appliedScoringConfigs"
        :device-scope="selectedDeviceScope"
        :scope-mode="scoringScopeMode"
        :included-test-item-names="includedTestItemNames"
      />
    </section>
  </section>

  <section v-if="hasResults && isMultipleFiles" class="upload-log-comparison-section">
    <AppPanel
      class="upload-log-comparison__panel"
      eyebrow="Cross-Log Comparison"
      title="Test Item Comparison"
      description="Compare uploaded values and rescored iPLAS values across the current log batch."
      splitHeader
      tone="cool"
    >
      <template #header-aside>
        <div class="upload-log-comparison__header-actions">
          <span class="upload-log-comparison__pill upload-log-comparison__pill--info">{{ totalFiles }} files</span>
          <span v-if="iplasDataByIsn.size > 0" class="upload-log-comparison__pill upload-log-comparison__pill--success">
            iPLAS: {{ iplasDataByIsn.size }} ISN(s)
          </span>
          <button
            type="button"
            class="upload-log-comparison__ghost-button"
            :disabled="exportingComparison"
            @click="exportComparisonToExcel"
          >
            <Icon icon="mdi:microsoft-excel" />
            {{ exportingComparison ? 'Exporting...' : 'Export' }}
          </button>
          <button type="button" class="upload-log-comparison__ghost-button" @click="comparisonFullscreen = true">
            <Icon icon="mdi:fullscreen" />
            Fullscreen
          </button>
        </div>
      </template>

      <div class="upload-log-comparison__filters">
        <label class="upload-log-comparison__field">
          <span>Station (Uploaded)</span>
          <AppSelect v-model="selectedUploadedStation" :options="uploadedStationSelectOptions" />
        </label>

        <label class="upload-log-comparison__field">
          <span>Station (iPLAS)</span>
          <AppSelect v-model="selectedIplasStation" :options="iplasStationSelectOptions" :disabled="iplasDataByIsn.size === 0" />
        </label>

        <label class="upload-log-comparison__field upload-log-comparison__field--wide">
          <span>ISNs To Compare</span>
          <AppMultiSelect v-model="selectedCompareIsns" :options="compareIsnSelectOptions" placeholder="All detected ISNs" />
        </label>

        <label class="upload-log-comparison__field">
          <span>Filter Items</span>
          <AppSelect v-model="itemFilterType" :options="itemFilterSelectOptions" :searchable="false" />
        </label>

        <label class="upload-log-comparison__field upload-log-comparison__field--wide">
          <span>Search Test Items</span>
          <input v-model="searchQuery" type="text" placeholder="Search by test item name">
        </label>

        <label class="upload-log-comparison__field">
          <span>Pin Columns</span>
          <AppMultiSelect v-model="comparisonLockedColumns" :options="pinColumnSelectOptions" placeholder="Pin columns" />
        </label>

        <label class="upload-log-comparison__field">
          <span>Show Columns</span>
          <AppMultiSelect v-model="comparisonVisibleColumns" :options="visibleColumnSelectOptions" placeholder="All columns" />
        </label>
      </div>

      <div v-if="iplasLoading" class="upload-log-comparison__notice">
        Fetching iPLAS data for {{ allCompareIsns.length }} ISN(s)...
      </div>
      <div v-else-if="iplasDataByIsn.size > 0" class="upload-log-comparison__notice upload-log-comparison__notice--success">
        iPLAS data loaded for {{ iplasDataByIsn.size }} ISN(s)
        <span v-if="selectedIplasStation"> - Station: {{ selectedIplasStation }}</span>
      </div>

      <DataTable
        :value="comparisonTableItems"
        paginator
        :rows="comparisonItemsPerPage"
        :rowsPerPageOptions="comparisonRowsPerPageOptions"
        @update:rows="comparisonItemsPerPage = $event"
        dataKey="test_item"
        scrollable
        scrollHeight="840px"
        removableSort
        showGridlines
        stripedRows
        class="upload-log-comparison__table app-interactive-datatable"
      >
        <ColumnGroup type="header">
          <Row>
            <Column
              header="Test Item"
              :rowspan="2"
              :frozen="isColumnLocked('test_item')"
              alignFrozen="left"
              :class="{ 'upload-log-comparison__frozen-header': isColumnLocked('test_item') }"
            />
            <Column
              v-if="isColumnVisible('usl')"
              header="UCL"
              :rowspan="2"
              :frozen="isColumnLocked('usl')"
              alignFrozen="left"
              :class="{ 'upload-log-comparison__frozen-header': isColumnLocked('usl') }"
            />
            <Column
              v-if="isColumnVisible('lsl')"
              header="LCL"
              :rowspan="2"
              :frozen="isColumnLocked('lsl')"
              alignFrozen="left"
              :class="{ 'upload-log-comparison__frozen-header': isColumnLocked('lsl') }"
            />
            <template v-for="isn in displayedIsns" :key="`group-${isn}`">
              <Column
                v-if="isColumnVisible('uploaded_val') || isColumnVisible('iplas_val')"
                :header="isn"
                :colspan="(isColumnVisible('uploaded_val') ? 1 : 0) + (isColumnVisible('iplas_val') ? 1 : 0)"
              />
            </template>
            <Column
              v-if="displayedIsns.length > 0 && (isColumnVisible('uploaded_score') || isColumnVisible('iplas_score'))"
              header="Score"
              :colspan="displayedIsns.length * ((isColumnVisible('uploaded_score') ? 1 : 0) + (isColumnVisible('iplas_score') ? 1 : 0))"
            />
          </Row>
          <Row>
            <template v-for="(isn, idx) in displayedIsns" :key="`value-row-${isn}`">
              <Column v-if="isColumnVisible('uploaded_val')" header="Uploaded" />
              <Column v-if="isColumnVisible('iplas_val')" header="iPLAS" />
            </template>
            <template v-for="(isn, idx) in displayedIsns" :key="`score-row-${isn}`">
              <Column v-if="isColumnVisible('uploaded_score')" :header="`${shortIsnLabel(isn)} (Upl)`" />
              <Column v-if="isColumnVisible('iplas_score')" :header="`${shortIsnLabel(isn)} (iPLAS)`" />
            </template>
          </Row>
        </ColumnGroup>

        <Column
          field="test_item"
          sortable
          :frozen="isColumnLocked('test_item')"
          alignFrozen="left"
          :class="{ 'upload-log-comparison__frozen-cell': isColumnLocked('test_item') }"
        >
          <template #body="slotProps">
            <span class="upload-log-comparison__strong">{{ slotProps.data.test_item }}</span>
          </template>
        </Column>

        <Column
          v-if="isColumnVisible('usl')"
          field="usl"
          sortable
          :frozen="isColumnLocked('usl')"
          alignFrozen="left"
          :class="{ 'upload-log-comparison__frozen-cell': isColumnLocked('usl') }"
        >
          <template #body="slotProps">
            <span class="upload-log-comparison__muted">{{ slotProps.data.usl ?? '-' }}</span>
          </template>
        </Column>

        <Column
          v-if="isColumnVisible('lsl')"
          field="lsl"
          sortable
          :frozen="isColumnLocked('lsl')"
          alignFrozen="left"
          :class="{ 'upload-log-comparison__frozen-cell': isColumnLocked('lsl') }"
        >
          <template #body="slotProps">
            <span class="upload-log-comparison__muted">{{ slotProps.data.lsl ?? '-' }}</span>
          </template>
        </Column>

        <template v-for="(isn, idx) in displayedIsns" :key="`uploaded-${isn}`">
          <Column v-if="isColumnVisible('uploaded_val')" :field="`uploaded_val_${idx}`" sortable>
            <template #body="slotProps">
              {{ slotProps.data[`uploaded_val_${idx}`] ?? '-' }}
            </template>
          </Column>
          <Column v-if="isColumnVisible('iplas_val')" :field="`iplas_val_${idx}`" sortable>
            <template #body="slotProps">
              {{ slotProps.data[`iplas_val_${idx}`] ?? '-' }}
            </template>
          </Column>
        </template>

        <template v-for="(isn, idx) in displayedIsns" :key="`score-${isn}`">
          <Column v-if="isColumnVisible('uploaded_score')" :field="`uploaded_score_${idx}`" sortable>
            <template #body="slotProps">
              <button
                v-if="slotProps.data[`uploaded_score_${idx}`] != null"
                type="button"
                class="cursor-pointer border-0"
                :class="scoreChipClass(Number(slotProps.data[`uploaded_score_${idx}`]))"
                title="Click to view score breakdown"
                @click="openScoreBreakdownForComparison(slotProps.data, idx, 'uploaded')"
              >
                {{ Number(slotProps.data[`uploaded_score_${idx}`]).toFixed(2) }}
              </button>
              <span v-else class="upload-log-comparison__muted">-</span>
            </template>
          </Column>
          <Column v-if="isColumnVisible('iplas_score')" :field="`iplas_score_${idx}`" sortable>
            <template #body="slotProps">
              <button
                v-if="slotProps.data[`iplas_score_${idx}`] != null"
                type="button"
                class="cursor-pointer border-0"
                :class="scoreChipClass(Number(slotProps.data[`iplas_score_${idx}`]))"
                title="Click to view score breakdown"
                @click="openScoreBreakdownForComparison(slotProps.data, idx, 'iplas')"
              >
                {{ Number(slotProps.data[`iplas_score_${idx}`]).toFixed(2) }}
              </button>
              <span v-else class="upload-log-comparison__muted">-</span>
            </template>
          </Column>
        </template>
      </DataTable>
    </AppPanel>
  </section>

  <AppDialog v-model="comparisonFullscreen" width="98vw" :breakpoints="{ '960px': '100vw' }"
    :show-footer="false" sticky-header title="Test Item Comparison"
    description="Compare uploaded and iPLAS values across detected ISNs."
    class="upload-log-comparison__dialog">
      <template #header-actions>
        <div class="upload-log-comparison__header-actions">
          <span class="upload-log-comparison__pill upload-log-comparison__pill--info">{{ totalFiles }} files</span>
          <button
            type="button"
            class="upload-log-comparison__ghost-button"
            :disabled="exportingComparison"
            @click="exportComparisonToExcel"
          >
            <Icon icon="mdi:microsoft-excel" />
            {{ exportingComparison ? 'Exporting...' : 'Export' }}
          </button>
        </div>
      </template>

      <div class="upload-log-comparison__filters upload-log-comparison__filters--fullscreen">
        <label class="upload-log-comparison__field">
          <span>Station (Uploaded)</span>
          <AppSelect v-model="selectedUploadedStation" :options="uploadedStationSelectOptions" />
        </label>

        <label class="upload-log-comparison__field">
          <span>Station (iPLAS)</span>
          <AppSelect v-model="selectedIplasStation" :options="iplasStationSelectOptions" :disabled="iplasDataByIsn.size === 0" />
        </label>

        <label class="upload-log-comparison__field upload-log-comparison__field--wide">
          <span>ISNs To Compare</span>
          <AppMultiSelect v-model="selectedCompareIsns" :options="compareIsnSelectOptions" placeholder="All detected ISNs" />
        </label>

        <label class="upload-log-comparison__field">
          <span>Filter Items</span>
          <AppSelect v-model="itemFilterType" :options="itemFilterSelectOptions" :searchable="false" />
        </label>

        <label class="upload-log-comparison__field upload-log-comparison__field--wide">
          <span>Search Test Items</span>
          <input v-model="searchQuery" type="text" placeholder="Search by test item name">
        </label>

        <label class="upload-log-comparison__field">
          <span>Pin Columns</span>
          <AppMultiSelect v-model="comparisonLockedColumns" :options="pinColumnSelectOptions" placeholder="Pin columns" />
        </label>

        <label class="upload-log-comparison__field">
          <span>Show Columns</span>
          <AppMultiSelect v-model="comparisonVisibleColumns" :options="visibleColumnSelectOptions" placeholder="All columns" />
        </label>
      </div>

      <div class="upload-log-comparison__table-wrap">
        <DataTable
          :value="comparisonTableItems"
          paginator
          :rows="comparisonItemsPerPage"
          :rowsPerPageOptions="comparisonRowsPerPageOptions"
          @update:rows="comparisonItemsPerPage = $event"
          dataKey="test_item"
          scrollable
          scrollHeight="calc(100vh - 18rem)"
          removableSort
          showGridlines
          stripedRows
          class="upload-log-comparison__table"
        >
          <ColumnGroup type="header">
            <Row>
              <Column
                header="Test Item"
                :rowspan="2"
                :frozen="isColumnLocked('test_item')"
                alignFrozen="left"
                :class="{ 'upload-log-comparison__frozen-header': isColumnLocked('test_item') }"
              />
              <Column
                v-if="isColumnVisible('usl')"
                header="UCL"
                :rowspan="2"
                :frozen="isColumnLocked('usl')"
                alignFrozen="left"
                :class="{ 'upload-log-comparison__frozen-header': isColumnLocked('usl') }"
              />
              <Column
                v-if="isColumnVisible('lsl')"
                header="LCL"
                :rowspan="2"
                :frozen="isColumnLocked('lsl')"
                alignFrozen="left"
                :class="{ 'upload-log-comparison__frozen-header': isColumnLocked('lsl') }"
              />
              <template v-for="isn in displayedIsns" :key="`overlay-group-${isn}`">
                <Column
                  v-if="isColumnVisible('uploaded_val') || isColumnVisible('iplas_val')"
                  :header="isn"
                  :colspan="(isColumnVisible('uploaded_val') ? 1 : 0) + (isColumnVisible('iplas_val') ? 1 : 0)"
                />
              </template>
              <Column
                v-if="displayedIsns.length > 0 && (isColumnVisible('uploaded_score') || isColumnVisible('iplas_score'))"
                header="Score"
                :colspan="displayedIsns.length * ((isColumnVisible('uploaded_score') ? 1 : 0) + (isColumnVisible('iplas_score') ? 1 : 0))"
              />
            </Row>
            <Row>
              <template v-for="(isn, idx) in displayedIsns" :key="`overlay-value-${isn}`">
                <Column v-if="isColumnVisible('uploaded_val')" header="Uploaded" />
                <Column v-if="isColumnVisible('iplas_val')" header="iPLAS" />
              </template>
              <template v-for="(isn, idx) in displayedIsns" :key="`overlay-score-${isn}`">
                <Column v-if="isColumnVisible('uploaded_score')" :header="`${shortIsnLabel(isn)} (Upl)`" />
                <Column v-if="isColumnVisible('iplas_score')" :header="`${shortIsnLabel(isn)} (iPLAS)`" />
              </template>
            </Row>
          </ColumnGroup>

          <Column
            field="test_item"
            sortable
            :frozen="isColumnLocked('test_item')"
            alignFrozen="left"
            :class="{ 'upload-log-comparison__frozen-cell': isColumnLocked('test_item') }"
          >
            <template #body="slotProps">
              <span class="upload-log-comparison__strong">{{ slotProps.data.test_item }}</span>
            </template>
          </Column>

          <Column
            v-if="isColumnVisible('usl')"
            field="usl"
            sortable
            :frozen="isColumnLocked('usl')"
            alignFrozen="left"
            :class="{ 'upload-log-comparison__frozen-cell': isColumnLocked('usl') }"
          >
            <template #body="slotProps">
              <span class="upload-log-comparison__muted">{{ slotProps.data.usl ?? '-' }}</span>
            </template>
          </Column>

          <Column
            v-if="isColumnVisible('lsl')"
            field="lsl"
            sortable
            :frozen="isColumnLocked('lsl')"
            alignFrozen="left"
            :class="{ 'upload-log-comparison__frozen-cell': isColumnLocked('lsl') }"
          >
            <template #body="slotProps">
              <span class="upload-log-comparison__muted">{{ slotProps.data.lsl ?? '-' }}</span>
            </template>
          </Column>

          <template v-for="(isn, idx) in displayedIsns" :key="`overlay-uploaded-${isn}`">
            <Column v-if="isColumnVisible('uploaded_val')" :field="`uploaded_val_${idx}`" sortable>
              <template #body="slotProps">
                {{ slotProps.data[`uploaded_val_${idx}`] ?? '-' }}
              </template>
            </Column>
            <Column v-if="isColumnVisible('iplas_val')" :field="`iplas_val_${idx}`" sortable>
              <template #body="slotProps">
                {{ slotProps.data[`iplas_val_${idx}`] ?? '-' }}
              </template>
            </Column>
          </template>

          <template v-for="(isn, idx) in displayedIsns" :key="`overlay-score-col-${isn}`">
            <Column v-if="isColumnVisible('uploaded_score')" :field="`uploaded_score_${idx}`" sortable>
              <template #body="slotProps">
                <button
                  v-if="slotProps.data[`uploaded_score_${idx}`] != null"
                  type="button"
                  class="cursor-pointer border-0"
                  :class="scoreChipClass(Number(slotProps.data[`uploaded_score_${idx}`]))"
                  title="Click to view score breakdown"
                  @click="openScoreBreakdownForComparison(slotProps.data, idx, 'uploaded')"
                >
                  {{ Number(slotProps.data[`uploaded_score_${idx}`]).toFixed(2) }}
                </button>
                <span v-else class="upload-log-comparison__muted">-</span>
              </template>
            </Column>
            <Column v-if="isColumnVisible('iplas_score')" :field="`iplas_score_${idx}`" sortable>
              <template #body="slotProps">
                <button
                  v-if="slotProps.data[`iplas_score_${idx}`] != null"
                  type="button"
                  class="cursor-pointer border-0"
                  :class="scoreChipClass(Number(slotProps.data[`iplas_score_${idx}`]))"
                  title="Click to view score breakdown"
                  @click="openScoreBreakdownForComparison(slotProps.data, idx, 'iplas')"
                >
                  {{ Number(slotProps.data[`iplas_score_${idx}`]).toFixed(2) }}
                </button>
                <span v-else class="upload-log-comparison__muted">-</span>
              </template>
            </Column>
          </template>
        </DataTable>
      </div>
  </AppDialog>

  <AppDialog
    v-model="showBreakdownDialog"
    v-model:fullscreen="breakdownFullscreen"
    width="min(92vw, 36rem)"
    fullscreen-width="96vw"
    :breakpoints="{ '960px': '98vw', '640px': '100vw' }"
    fullscreenable
    :showFooter="false"
    title="Score Breakdown"
    :description="breakdownItem?.test_item ?? 'Score Breakdown'"
    class="iplas-details-dialog iplas-breakdown-dialog"
  >
    <template #header>
      <div class="iplas-details-dialog__dialog-title">
        <Icon icon="mdi:table-search" />
        <h2>Score Breakdown</h2>
      </div>
    </template>

    <div v-if="breakdownItem" class="iplas-details-subdialog">
      <section class="iplas-breakdown__name-card">
        <span class="iplas-breakdown__name-text">{{ breakdownItem.test_item }}</span>
      </section>

      <section class="iplas-breakdown__rows-container">
        <div v-for="row in breakdownRows" :key="row.key" class="iplas-breakdown__row">
          <div class="iplas-breakdown__row-left">
            <span class="iplas-breakdown__row-icon" :class="getBreakdownIconClass(row)">
              <Icon :icon="getBreakdownRowIcon(row)" />
            </span>
            <span class="iplas-breakdown__row-label">{{ row.label }}</span>
          </div>
          <div class="iplas-breakdown__row-right">
            <span
              v-if="row.valueTone === 'score'"
              class="upload-log-score-chip"
              :class="scoreChipClass(breakdownItem.score ?? 0)"
            >
              {{ row.value }}
            </span>
            <span
              v-else-if="row.valueTone === 'scoring-type'"
              class="iplas-breakdown__value-pill iplas-breakdown__value-pill--cool"
            >
              {{ row.value }}
            </span>
            <span
              v-else-if="row.valueTone === 'policy'"
              class="iplas-breakdown__value-pill iplas-breakdown__value-pill--neutral"
            >
              {{ row.value }}
            </span>
            <span
              v-else
              :class="[row.valueTone === 'warning' ? 'iplas-breakdown__value--warning' : '', 'iplas-breakdown__value-text']"
            >
              {{ row.value }}
            </span>
          </div>
        </div>
      </section>

      <details class="iplas-details-dialog__explanation-card">
        <summary>
          <span>
            <Icon icon="mdi:help-circle-outline" /> How is this score calculated?
          </span>
        </summary>
        <div class="iplas-details-dialog__explanation-body">
          <div class="score-formula-panel score-formula-panel--compact">
            <div class="iplas-details-dialog__metric-label">Formula</div>
            <div class="score-formula-equation">{{ getScoringFormula(breakdownItem.score_breakdown?.scoring_type) }}</div>
            <dl class="score-formula-variable-list">
              <template
                v-for="variable in getScoringFormulaVariables(breakdownItem.score_breakdown?.scoring_type)"
                :key="variable.key"
              >
                <dt>{{ variable.key }}</dt>
                <dd>{{ variable.value }}</dd>
              </template>
            </dl>
          </div>
        </div>
      </details>
    </div>

    <template #footer>
      <div class="iplas-details-dialog__footer-actions">
        <button
          type="button"
          class="iplas-details-dialog__button iplas-details-dialog__button--ghost"
          @click="showBreakdownDialog = false"
        >
          Close
        </button>
      </div>
    </template>
  </AppDialog>

  <!-- Criteria Builder Dialog -->
  <CriteriaBuilderDialog v-model="criteriaBuilderOpen" @criteria-created="handleCriteriaCreated" />

  <!-- UPDATED: Upload Scoring Config Dialog -->
  <UploadScoringConfigDialog v-model="showScoringConfigDialog" :test-items="extractedTestItems"
    :existing-configs="appliedScoringConfigs" :stations="extractedStations" :devices="extractedDevices"
    :test-item-stations="testItemStationsMap" :station-devices="stationDevicesMap"
    :default-station="selectedUploadedStation" :initial-device-scope="selectedDeviceScope"
    :initial-included-test-items="includedTestItemNames" @apply="handleScoringConfigApply" />
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import Column from 'primevue/column'
import ColumnGroup from 'primevue/columngroup'
import DataTable from 'primevue/datatable'
import Row from 'primevue/row'
import { computed, ref, watch } from 'vue'
import { SCORING_TYPE_INFO, type ScoringType } from '@/features/dut/types/scoring.types'
import type { IplasIsnSearchRecord } from '@/features/dut-logs/api/iplasProxyApi'
import { useIplasApi } from '@/features/dut-logs/composables/useIplasApi'
import {
  type CompareItemEnhanced,
  type CompareResponseEnhanced,
  type FileSummaryEnhanced,
  hasMeaningfulUploadLogCriteria,
  hasMeaningfulUploadLogLimit,
  type ParsedTestItemEnhanced,
  type PerIsnData,
  type RescoreItemResult,
  type RescoreScoringConfig,
  type ScoreBreakdown,
  type TestLogParseResponseEnhanced,
  type UploadLogScopeMode,
  type UploadScoringConfigApplyPayload,
  useTestLogUpload,
} from '@/features/dut-logs/composables/useTestLogUpload'
import { useNotification } from '@/shared/composables/useNotification'
import AppDialog from '@/shared/ui/dialog/AppDialog.vue'
import AppFilePicker from '@/shared/ui/forms/AppFilePicker.vue'
import AppMultiSelect from '@/shared/ui/forms/AppMultiSelect.vue'
import AppSelect from '@/shared/ui/forms/AppSelect.vue'
import AppPanel from '@/shared/ui/panel/AppPanel.vue'
import { getErrorMessage } from '@/shared/utils'
import { downloadUploadLogCriteriaTemplate } from '../utils/criteriaTemplate'
import {
  findIplasItemForIsn,
  findIplasTestItem,
  getIplasRecordsForIsn,
  resolveIplasStationRecord,
} from '../utils/iplasComparison'
import {
  buildTopProductWorkbook,
  createTopProductExcelRecordsFromComparison,
  downloadTopProductWorkbook,
} from '../utils/topProductExcelExport'
import CriteriaBuilderDialog from './CriteriaBuilderDialog.vue'
import TopProductRankingUploadLog from './TopProductRankingUploadLog.vue'
import UploadScoringConfigDialog from './UploadScoringConfigDialog.vue'

// File inputs
const logFiles = ref<File[] | null>(null)
const criteriaFile = ref<File | null>(null)
const showOnlyCriteria = ref(false)

// Results
const parsingResult = ref<TestLogParseResponseEnhanced | null>(null)
const compareResult = ref<CompareResponseEnhanced | null>(null)

// UI state
const loading = ref(false)
const extractingItems = ref(false)
const criteriaBuilderOpen = ref(false)

// Comparison section state
const itemFilterType = ref<string>('all')
const searchQuery = ref('')
const exportingComparison = ref(false)
const comparisonItemsPerPage = ref(25)
const comparisonRowsPerPageOptions = [10, 25, 50, 100]

// UPDATED: iPLAS comparison state
const iplasDataByIsn = ref<Map<string, IplasIsnSearchRecord[]>>(new Map())
const iplasLoading = ref(false)
const selectedIplasStation = ref<string | null>(null)
const selectedCompareIsns = ref<string[]>([])
const iplasScoredByIsn = ref<Map<string, Map<string, { score: number }>>>(new Map())

// Uploaded files station filter
const selectedUploadedStation = ref<string | null>(null)

// Scoring config state
const showScoringConfigDialog = ref(false)
const extractedTestItems = ref<ParsedTestItemEnhanced[]>([])
const extractedStations = ref<string[]>([])
const extractedDevices = ref<string[]>([])
const testItemStationsMap = ref<Map<string, Set<string>>>(new Map()) // Maps test item -> stations
const stationDevicesMap = ref<Map<string, Set<string>>>(new Map()) // Maps station -> devices
const appliedScoringConfigs = ref<RescoreScoringConfig[]>([])
const selectedDeviceScope = ref<string[]>([])
const scoringScopeMode = ref<UploadLogScopeMode>('default')
const includedTestItemNames = ref<string[]>([])

// Table column configuration (pinning & visibility)
const comparisonLockedColumns = ref<string[]>(['test_item'])
const comparisonVisibleColumns = ref<string[]>([
  'usl',
  'lsl',
  'uploaded_val',
  'iplas_val',
  'uploaded_score',
  'iplas_score',
])

const pinColumnSelectOptions = [
  { label: 'Test Item', value: 'test_item' },
  { label: 'UCL', value: 'usl' },
  { label: 'LCL', value: 'lsl' },
]

const visibleColumnSelectOptions = [
  { label: 'UCL', value: 'usl' },
  { label: 'LCL', value: 'lsl' },
  { label: 'Uploaded Value', value: 'uploaded_val' },
  { label: 'iPLAS Value', value: 'iplas_val' },
  { label: 'Uploaded Score', value: 'uploaded_score' },
  { label: 'iPLAS Score', value: 'iplas_score' },
]

const isColumnLocked = (key: string) => comparisonLockedColumns.value.includes(key)
const isColumnVisible = (key: string) => comparisonVisibleColumns.value.includes(key)

// Score breakdown dialog (new universal scoring)
const showBreakdownDialog = ref(false)
const breakdownFullscreen = ref(false)
const breakdownItem = ref<ParsedTestItemEnhanced | null>(null)

const breakdownRows = computed(() => {
  if (!breakdownItem.value) {
    return []
  }

  const breakdown = breakdownItem.value.score_breakdown
  const rows: Array<{
    key: string
    label: string
    value: string
    valueTone?: 'scoring-type' | 'policy' | 'score' | 'warning'
  }> = [
    {
      key: 'scoring_type',
      label: 'Scoring Type',
      value: breakdown?.scoring_type ?? 'N/A',
      valueTone: 'scoring-type',
    },
  ]

  if (breakdown?.ucl !== null && breakdown?.ucl !== undefined) {
    rows.push({ key: 'ucl', label: 'UCL (Upper Limit)', value: String(breakdown.ucl) })
  }

  if (breakdown?.lcl !== null && breakdown?.lcl !== undefined) {
    rows.push({ key: 'lcl', label: 'LCL (Lower Limit)', value: String(breakdown.lcl) })
  }

  if (breakdown?.target !== null && breakdown?.target !== undefined) {
    rows.push({ key: 'target', label: 'Target', value: breakdown.target.toFixed(2) })
  }

  if (breakdown?.actual !== null && breakdown?.actual !== undefined) {
    rows.push({ key: 'actual', label: 'Actual Value', value: String(breakdown.actual) })
  }

  if (breakdown?.deviation !== null && breakdown?.deviation !== undefined) {
    rows.push({
      key: 'deviation',
      label: 'Deviation',
      value: breakdown.deviation.toFixed(2),
      valueTone: Math.abs(breakdown.deviation ?? 0) > 1 ? 'warning' : undefined,
    })
  }

  if (breakdown?.policy) {
    rows.push({ key: 'policy', label: 'Policy', value: breakdown.policy, valueTone: 'policy' })
  }

  rows.push({ key: 'weight', label: 'Weight', value: String(breakdown?.weight ?? 1.0) })
  rows.push({
    key: 'score',
    label: 'Score (0-10)',
    value: breakdown?.score?.toFixed(2) ?? 'N/A',
    valueTone: 'score',
  })

  return rows
})

function getBreakdownRowIcon(row: { key: string }): string {
  const iconMap: Record<string, string> = {
    scoring_type: 'mdi:function-variant',
    ucl: 'mdi:arrow-collapse-up',
    lcl: 'mdi:arrow-collapse-down',
    target: 'mdi:crosshairs-gps',
    actual: 'mdi:numeric',
    deviation: 'mdi:delta',
    policy: 'mdi:compass-outline',
    weight: 'mdi:weight',
    score: 'mdi:star',
  }
  return iconMap[row.key] || 'mdi:information-outline'
}

function getBreakdownIconClass(row: { key: string }): string {
  const classMap: Record<string, string> = {
    scoring_type: 'iplas-breakdown__row-icon--purple',
    ucl: 'iplas-breakdown__row-icon--red',
    lcl: 'iplas-breakdown__row-icon--orange',
    target: 'iplas-breakdown__row-icon--green',
    actual: 'iplas-breakdown__row-icon--blue',
    deviation: 'iplas-breakdown__row-icon--amber',
    policy: 'iplas-breakdown__row-icon--muted',
    weight: 'iplas-breakdown__row-icon--muted',
    score: 'iplas-breakdown__row-icon--star',
  }
  return classMap[row.key] || 'iplas-breakdown__row-icon--muted'
}

function getScoringFormula(scoringType?: string): string {
  const type = (scoringType as ScoringType) || 'binary'
  const latex = SCORING_TYPE_INFO[type]?.formulaLatex
  if (latex) {
    return latex
      .replace(/\\cdot/g, 'x')
      .replace(/\\frac\{L - \|x - T\|\}\{L\}/g, '(L - |x - T|) / L')
      .replace(/\\frac\{L - d\}\{L\}/g, '(L - d) / L')
      .replace(/\\frac\{UCL - x\}\{UCL\}/g, '(UCL - x) / UCL')
      .replace(
        /\\left\(1 - \\frac\{x - ref\}\{UCL - ref\}\\right\)\^\{0\.25\}/g,
        '(1 - (x - ref) / (UCL - ref))^0.25',
      )
      .replace(
        /\\begin\{cases\} 10\.0 & \\text\{STATUS\} = \\text\{PASS\} \\\\ 0\.0 & \\text\{STATUS\} = \\text\{FAIL\} \\end\{cases\}/g,
        '10.0 if STATUS = PASS, 0.0 if STATUS = FAIL',
      )
  }
  const formulas: Record<string, string> = {
    symmetrical: 'Score = 1 + 9 x (L - |x - T|) / L',
    asymmetrical: 'Score = 1 + 9 x (L - d) / L',
    per_mask: 'Score = 1 + 9 x (UCL - x) / UCL',
    evm: 'Score = 1 + 9 x (1 - (x - ref) / (UCL - ref))^0.25',
    throughput: 'Score = 1 + 9 x (x - LCL) / (UCL - LCL)',
    binary: '10.0 if PASS, 0.0 if FAIL',
  }
  return formulas[type] || 'Score calculation based on criteria limits'
}

function getScoringFormulaVariables(scoringType?: string): Array<{ key: string; value: string }> {
  const type = (scoringType as ScoringType) || 'binary'
  const variables = SCORING_TYPE_INFO[type]?.variables
  if (!variables) {
    return []
  }
  return Object.entries(variables).map(([key, value]) => ({
    key,
    value: value.replace(/\\frac\{UCL \+ LCL\}\{2\}/g, '(UCL + LCL) / 2'),
  }))
}

function openScoreBreakdownForComparison(
  row: Record<string, unknown>,
  idx: number,
  source: 'uploaded' | 'iplas',
) {
  const testItemName = String(row.test_item || '')
  const usl = row.usl !== null && row.usl !== undefined ? Number(row.usl) : null
  const lsl = row.lsl !== null && row.lsl !== undefined ? Number(row.lsl) : null
  const value = String(row[`${source}_val_${idx}`] ?? '-')
  const scoreVal = row[`${source}_score_${idx}`]
  const score = scoreVal !== null && scoreVal !== undefined ? Number(scoreVal) : null

  const compareItem = [
    ...(compareResult.value?.comparison_value_items || []),
    ...(compareResult.value?.comparison_non_value_items || []),
  ].find((it) => it.test_item === testItemName)
  const perIsn = compareItem?.per_isn_data?.[idx]

  const appliedConfig = appliedScoringConfigs.value.find(
    (c) => c.test_item_name.toLowerCase() === testItemName.toLowerCase(),
  )
  const scoringType =
    appliedConfig?.scoring_type || perIsn?.score_breakdown?.scoring_type || 'symmetrical'

  const fallbackBreakdown: ScoreBreakdown = {
    scoring_type: scoringType,
    ucl: usl,
    lcl: lsl,
    target: appliedConfig?.target ?? (usl !== null && lsl !== null ? (usl + lsl) / 2 : null),
    actual: parseFloat(value) || null,
    deviation: perIsn?.score_breakdown?.deviation ?? perIsn?.deviation ?? null,
    weight: appliedConfig?.weight ?? 1.0,
    score: score ?? undefined,
    policy: appliedConfig?.policy ?? 'symmetrical',
  }

  breakdownItem.value = {
    test_item: testItemName,
    value,
    usl,
    lsl,
    is_value_type: true,
    numeric_value: parseFloat(value) || null,
    is_hex: false,
    hex_decimal: null,
    matched_criteria: Boolean(compareItem?.matched_criteria),
    target: appliedConfig?.target ?? perIsn?.score_breakdown?.target ?? null,
    score,
    score_breakdown: perIsn?.score_breakdown ?? fallbackBreakdown,
  }
  showBreakdownDialog.value = true
}

const configuredStationBreakdown = computed(() => {
  if (appliedScoringConfigs.value.length === 0) return []

  const breakdown: Array<{
    station: string
    configuredCount: number
    totalStationItems: number
  }> = []

  const stationList =
    extractedStations.value.length > 0
      ? extractedStations.value
      : Array.from(
          new Set(Array.from(testItemStationsMap.value.values()).flatMap((set) => Array.from(set))),
        ).sort()

  const configuredNames = new Set(appliedScoringConfigs.value.map((c) => c.test_item_name))

  stationList.forEach((st) => {
    let count = 0
    let total = 0
    testItemStationsMap.value.forEach((stationsSet, itemName) => {
      if (stationsSet.has(st)) {
        total++
        if (configuredNames.has(itemName)) {
          count++
        }
      }
    })
    if (count > 0 || (stationList.length === 1 && total > 0)) {
      breakdown.push({
        station: st,
        configuredCount: count,
        totalStationItems: total,
      })
    }
  })

  return breakdown
})

// Comparison section fullscreen
const comparisonFullscreen = ref(false)

// Composables
const { parseLog, compareLogs, rescoreItems } = useTestLogUpload()
const { searchByIsnBatch } = useIplasApi()
const { showError: showErrorNotification } = useNotification()

// Filter options for comparison section
const itemFilterOptions = [
  { title: 'Show All', value: 'all' },
  { title: 'Criteria Items', value: 'criteria' },
  { title: 'Non-Criteria Items', value: 'non-criteria' },
]

const itemFilterSelectOptions = itemFilterOptions.map((option) => ({
  label: option.title,
  value: option.value,
}))

// Computed
const hasFiles = computed(() => {
  return logFiles.value && logFiles.value.length > 0
})

const canAnalyze = computed(() => {
  if (!logFiles.value) return false
  return logFiles.value.length >= 1
})

const hasResults = computed(() => {
  return parsingResult.value !== null || compareResult.value !== null
})

const isMultipleFiles = computed(() => {
  return (compareResult.value?.total_files ?? 0) > 1
})

const totalFiles = computed(() => {
  return compareResult.value?.total_files || 0
})

// UPDATED: All ISNs from comparison results
const allCompareIsns = computed<string[]>(() => {
  if (!compareResult.value?.file_summaries) return []
  return compareResult.value.file_summaries
    .filter((summary: FileSummaryEnhanced) => {
      if (selectedDeviceScope.value.length > 0) {
        const device = summary.metadata?.device
        if (!device || !selectedDeviceScope.value.includes(device)) {
          return false
        }
      }
      if (selectedUploadedStation.value) {
        const station = summary.station || summary.metadata?.station
        if (station !== selectedUploadedStation.value) {
          return false
        }
      }
      return true
    })
    .map((s: FileSummaryEnhanced) => s.isn)
    .filter((isn: string | null): isn is string => isn !== null)
})

const compareIsnSelectOptions = computed(() =>
  allCompareIsns.value.map((isn) => ({
    label: isn,
    value: isn,
  })),
)

// Available stations from uploaded files
const uploadedStationOptions = computed(() => {
  if (!compareResult.value?.file_summaries) return []
  const stations = new Set<string>()
  compareResult.value.file_summaries.forEach((s: FileSummaryEnhanced) => {
    if (selectedDeviceScope.value.length > 0) {
      const device = s.metadata?.device
      if (!device || !selectedDeviceScope.value.includes(device)) {
        return
      }
    }
    const station = s.station || s.metadata?.station
    if (station && station !== 'Unknown') {
      stations.add(station)
    }
  })
  return Array.from(stations).sort()
})

const uploadedStationSelectOptions = computed(() => [
  { label: 'All uploaded stations', value: null },
  ...uploadedStationOptions.value.map((station) => ({
    label: station,
    value: station,
  })),
])

// ISNs currently displayed in the table columns (with station filter support)
const displayedIsns = computed(() => {
  const availableSet = new Set(allCompareIsns.value)
  let isns =
    selectedCompareIsns.value.length > 0
      ? selectedCompareIsns.value.filter((isn) => availableSet.has(isn))
      : allCompareIsns.value

  // Filter by uploaded station if selected
  if (selectedUploadedStation.value && compareResult.value?.file_summaries) {
    const isnsFromStation = new Set(
      compareResult.value.file_summaries
        .filter(
          (s: FileSummaryEnhanced) =>
            (s.station || s.metadata?.station) === selectedUploadedStation.value,
        )
        .map((s: FileSummaryEnhanced) => s.isn)
        .filter((isn: string | null): isn is string => isn !== null),
    )
    isns = isns.filter((isn) => isnsFromStation.has(isn))
  }

  return isns
})

// Available iPLAS stations across all fetched ISN data
const iplasStationOptions = computed(() => {
  const stations = new Set<string>()
  const isnsToInclude = new Set(displayedIsns.value)
  for (const [isn, records] of iplasDataByIsn.value) {
    if (isnsToInclude.size === 0 || isnsToInclude.has(isn)) {
      records.forEach((r) => {
        const name = r.display_station_name || r.station_name
        if (name) stations.add(name)
      })
    }
  }
  return Array.from(stations).sort()
})

const iplasStationSelectOptions = computed(() => [
  { label: 'Auto', value: null },
  ...iplasStationOptions.value.map((station) => ({
    label: station,
    value: station,
  })),
])

// UPDATED: Comparison table items with per-ISN uploaded + iPLAS data
const comparisonTableItems = computed(() => {
  if (!compareResult.value) return []

  let items: CompareItemEnhanced[] = [
    ...(compareResult.value.comparison_value_items || []),
    ...(compareResult.value.comparison_non_value_items || []),
  ]

  // Filter to items that belong to the selected station if a station is selected
  if (selectedUploadedStation.value) {
    const targetStation = selectedUploadedStation.value
    items = items.filter((item) => {
      if (testItemStationsMap.value.get(item.test_item)?.has(targetStation)) {
        return true
      }
      return item.per_isn_data.some((d) => {
        if (d.station === targetStation) return true
        if (d.filename) {
          const s = compareResult.value?.file_summaries?.find((fs) => fs.filename === d.filename)
          if ((s?.station || s?.metadata?.station) === targetStation) return true
        }
        if (d.isn) {
          const s = compareResult.value?.file_summaries?.find((fs) => fs.isn === d.isn)
          if ((s?.station || s?.metadata?.station) === targetStation) return true
        }
        return false
      })
    })
  }

  const isns = displayedIsns.value

  // Filter to only items that have data for at least one of the displayed ISNs
  // This ensures station filter applies to test items as well
  if (isns.length > 0) {
    items = items.filter((item) =>
      item.per_isn_data.some((d) => d.isn !== null && isns.includes(d.isn)),
    )
  }

  if (scoringScopeMode.value === 'include') {
    const includedNames = new Set(includedTestItemNames.value.map((name) => name.toLowerCase()))
    items = items.filter((item) => includedNames.has(item.test_item.toLowerCase()))
  } else if (scoringScopeMode.value === 'exclude') {
    const scoringConfigMap = new Map(
      appliedScoringConfigs.value.map((config) => [config.test_item_name.toLowerCase(), config]),
    )
    items = items.filter(
      (item) => scoringConfigMap.get(item.test_item.toLowerCase())?.enabled !== false,
    )
  }

  // Apply criteria filters
  if (itemFilterType.value === 'criteria') {
    items = items.filter((item) => hasMeaningfulUploadLogCriteria(item.usl, item.lsl))
  } else if (itemFilterType.value === 'non-criteria') {
    items = items.filter((item) => !hasMeaningfulUploadLogCriteria(item.usl, item.lsl))
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter((item) => item.test_item.toLowerCase().includes(query))
  }

  return items.map((item) => {
    const row: Record<string, unknown> = {
      test_item: item.test_item,
      usl: item.usl,
      lsl: item.lsl,
    }

    isns.forEach((isn, idx) => {
      // Uploaded data from comparison result
      const perIsn = item.per_isn_data.find((d) => d.isn === isn)
      row[`uploaded_val_${idx}`] = perIsn?.value ?? null
      row[`uploaded_score_${idx}`] = perIsn?.score ?? null

      // Preferred uploaded station for this ISN
      const uploadedSummary = compareResult.value?.file_summaries?.find((s) => s.isn === isn)
      const preferredStation =
        perIsn?.station || uploadedSummary?.station || uploadedSummary?.metadata?.station

      // iPLAS data from fetched records
      const iplasRecords = getIplasRecordsForIsn(iplasDataByIsn.value, isn)
      if (iplasRecords && iplasRecords.length > 0) {
        const iplasItem = findIplasItemForIsn(
          iplasRecords,
          item.test_item,
          selectedIplasStation.value,
          preferredStation,
        )
        row[`iplas_val_${idx}`] = iplasItem?.VALUE ?? null
      }

      // iPLAS score from rescored data
      const iplasScoredMap = iplasScoredByIsn.value.get(isn)
      if (iplasScoredMap) {
        const scored = iplasScoredMap.get(item.test_item.toLowerCase())
        row[`iplas_score_${idx}`] = scored?.score ?? null
      }
    })

    return row
  })
})

// Methods

/**
 * Quick-parse files to extract test item names and stations for scoring config dialog
 */
const extractTestItems = async (): Promise<void> => {
  if (!logFiles.value || logFiles.value.length === 0) return

  extractingItems.value = true
  try {
    const stations = new Set<string>()
    const devices = new Set<string>()
    const stDevices = new Map<string, Set<string>>()
    const itemsMap = new Map<string, ParsedTestItemEnhanced>()
    const itemStationsMap = new Map<string, Set<string>>() // Track which items appear in which stations

    // Helper to check if file is archive
    const isArchiveFile = (file: File) => {
      const ext = file.name.toLowerCase()
      return ext.endsWith('.zip') || ext.endsWith('.rar') || ext.endsWith('.7z')
    }

    const hasArchive = logFiles.value.some(isArchiveFile)

    if (hasArchive || logFiles.value.length > 1) {
      // Use compareLogs for archives or multiple files
      try {
        const result = await compareLogs(logFiles.value, criteriaFile.value, showOnlyCriteria.value)

        // Extract stations from file_summaries
        result.file_summaries?.forEach((summary: FileSummaryEnhanced) => {
          const station = summary.station || summary.metadata?.station || 'Unknown'
          if (station && station !== 'Unknown') {
            stations.add(station)
          } else if (stations.size === 0) {
            stations.add('Unknown')
          }
          if (summary.metadata?.device) {
            devices.add(summary.metadata.device)
            if (!stDevices.has(station)) {
              stDevices.set(station, new Set())
            }
            stDevices.get(station)?.add(summary.metadata.device)
          }
        })

        // Extract items from comparison_value_items and comparison_non_value_items
        const allItems = [
          ...(result.comparison_value_items || []),
          ...(result.comparison_non_value_items || []),
        ]

        // Build itemsMap and itemStationsMap from per_isn_data
        allItems.forEach((item: CompareItemEnhanced) => {
          if (!itemsMap.has(item.test_item)) {
            const firstData = item.per_isn_data?.[0]
            itemsMap.set(item.test_item, {
              test_item: item.test_item,
              value: firstData?.value || '',
              usl: item.usl,
              lsl: item.lsl,
              is_value_type: firstData?.is_value_type ?? false,
              numeric_value: firstData?.numeric_value ?? null,
              is_hex: firstData?.is_hex ?? false,
              hex_decimal: firstData?.hex_decimal ?? null,
              matched_criteria: item.matched_criteria || false,
              target: item.baseline,
              score: item.avg_score,
              score_breakdown: firstData?.score_breakdown ?? null,
            } as ParsedTestItemEnhanced)
          }

          // Track stations per item from per_isn_data
          if (!itemStationsMap.has(item.test_item)) {
            itemStationsMap.set(item.test_item, new Set())
          }
          item.per_isn_data?.forEach((data: PerIsnData) => {
            if (data.station && data.station !== 'Unknown') {
              itemStationsMap.get(item.test_item)?.add(data.station)
            } else if (data.filename) {
              const summary = result.file_summaries?.find(
                (s: FileSummaryEnhanced) => s.filename === data.filename,
              )
              const st = summary?.station || summary?.metadata?.station
              if (st && st !== 'Unknown') {
                itemStationsMap.get(item.test_item)?.add(st)
              }
            } else if (data.isn) {
              const summary = result.file_summaries?.find(
                (s: FileSummaryEnhanced) => s.isn === data.isn,
              )
              const st = summary?.station || summary?.metadata?.station
              if (st && st !== 'Unknown') {
                itemStationsMap.get(item.test_item)?.add(st)
              }
            }
          })
        })
      } catch (err: unknown) {
        console.warn(`Failed to compare files:`, getErrorMessage(err))
      }
    } else {
      // Single .txt file - use parseLog
      for (const file of logFiles.value) {
        try {
          const result = await parseLog(file, criteriaFile.value, showOnlyCriteria.value)
          const station = result.station || 'Unknown'
          stations.add(station)
          if (result.metadata?.device) {
            devices.add(result.metadata.device)
            if (!stDevices.has(station)) {
              stDevices.set(station, new Set())
            }
            stDevices.get(station)?.add(result.metadata.device)
          }

          // Track items and their stations
          for (const item of result.parsed_items_enhanced || []) {
            // Keep first occurrence of each item
            if (!itemsMap.has(item.test_item)) {
              itemsMap.set(item.test_item, item)
            }
            // Track which stations have this item
            if (!itemStationsMap.has(item.test_item)) {
              itemStationsMap.set(item.test_item, new Set())
            }
            itemStationsMap.get(item.test_item)?.add(station)
          }
        } catch (err: unknown) {
          console.warn(`Failed to parse file ${file.name}:`, getErrorMessage(err))
        }
      }
    }

    extractedTestItems.value = Array.from(itemsMap.values())
    extractedStations.value = Array.from(stations).sort()
    extractedDevices.value = Array.from(devices).sort()
    testItemStationsMap.value = itemStationsMap
    stationDevicesMap.value = stDevices
  } catch (err: unknown) {
    // If quick-parse fails, we can still open config dialog with empty items
    console.warn('Failed to extract test items for scoring config:', getErrorMessage(err))
    extractedTestItems.value = []
    extractedStations.value = []
    extractedDevices.value = []
    testItemStationsMap.value = new Map()
    stationDevicesMap.value = new Map()
  } finally {
    extractingItems.value = false
  }
}

/**
 * Open scoring config dialog - extracts test items first if needed
 */
const handleConfigureScoring = async () => {
  if (extractedTestItems.value.length === 0) {
    await extractTestItems()
  }
  showScoringConfigDialog.value = true
}

/**
 * Handle scoring config applied from dialog
 */
const handleScoringConfigApply = (payload: UploadScoringConfigApplyPayload) => {
  appliedScoringConfigs.value = payload.configs
  selectedDeviceScope.value = payload.deviceScope
  scoringScopeMode.value = payload.scopeMode
  includedTestItemNames.value = payload.includedTestItems
}

/**
 * Clear scoring configs
 */
const clearScoringConfigs = () => {
  appliedScoringConfigs.value = []
  scoringScopeMode.value = 'default'
  includedTestItemNames.value = []
}

// ============================================
// iPLAS Comparison Data
// ============================================

/**
 * Fetch iPLAS data for all ISNs in the comparison using batch search
 */
const fetchIplasForComparison = async () => {
  const isns = allCompareIsns.value
  if (isns.length === 0) return

  iplasLoading.value = true
  try {
    const results = await searchByIsnBatch(isns)
    iplasDataByIsn.value = results

    if (
      selectedIplasStation.value &&
      !iplasStationOptions.value.includes(selectedIplasStation.value)
    ) {
      selectedIplasStation.value = null
    }

    // Rescore iPLAS data with current scoring configs
    await rescoreIplasData()
  } catch (err: unknown) {
    console.error('Failed to fetch iPLAS comparison data:', err)
  } finally {
    iplasLoading.value = false
  }
}

function parseLimitNumber(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'number') return Number.isFinite(val) ? val : null
  const str = String(val).trim()
  if (!str || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'null') return null
  const parsed = parseFloat(str)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Rescore iPLAS data for all ISNs using the applied scoring configs
 * UPDATED: Score criteria items across all matching records for each ISN
 */
const rescoreIplasData = async () => {
  const isns = allCompareIsns.value
  const nextIplasScoredByIsn = new Map<string, Map<string, { score: number }>>()

  // Build set of explicitly configured item names
  const explicitlyConfigured = new Set(appliedScoringConfigs.value.map((c) => c.test_item_name))

  // Build lookup of comparison items to use fallback USL/LSL if iPLAS item is missing limits
  const allComparisonItems = [
    ...(compareResult.value?.comparison_value_items || []),
    ...(compareResult.value?.comparison_non_value_items || []),
  ]
  const comparisonLimitsMap = new Map<string, { usl: number | null; lsl: number | null }>()
  for (const item of allComparisonItems) {
    comparisonLimitsMap.set(item.test_item.trim().toLowerCase(), {
      usl: item.usl,
      lsl: item.lsl,
    })
  }

  for (const isn of isns) {
    const records = getIplasRecordsForIsn(iplasDataByIsn.value, isn)
    if (!records || records.length === 0) continue

    let targetRecords: IplasIsnSearchRecord[] = []
    if (selectedIplasStation.value) {
      const stationRecord = resolveIplasStationRecord(records, selectedIplasStation.value)
      if (stationRecord) {
        targetRecords = [stationRecord]
      }
    } else {
      targetRecords = records
    }

    if (targetRecords.length === 0) continue

    const testItemMap = new Map<
      string,
      { test_item: string; value: string; usl: number | null; lsl: number | null; status: string }
    >()

    for (const record of targetRecords) {
      for (const t of record.test_item || []) {
        const key = t.NAME.trim().toLowerCase()
        if (!testItemMap.has(key)) {
          const rawUcl = parseLimitNumber(t.UCL)
          const rawLcl = parseLimitNumber(t.LCL)
          const fallbackLimits = comparisonLimitsMap.get(key)
          const usl = rawUcl ?? fallbackLimits?.usl ?? null
          const lsl = rawLcl ?? fallbackLimits?.lsl ?? null

          const hasLimits = hasMeaningfulUploadLogLimit(usl) || hasMeaningfulUploadLogLimit(lsl)
          if (hasLimits || explicitlyConfigured.has(t.NAME)) {
            testItemMap.set(key, {
              test_item: t.NAME,
              value: t.VALUE,
              usl,
              lsl,
              status: t.STATUS || 'PASS',
            })
          }
        }
      }
    }

    const testItems = Array.from(testItemMap.values())
    if (testItems.length === 0) continue

    try {
      const result = await rescoreItems(testItems, appliedScoringConfigs.value)
      const scoreMap = new Map<string, { score: number }>()
      result.test_item_scores.forEach((score: RescoreItemResult) => {
        if (score.score !== null && score.score !== undefined) {
          scoreMap.set(score.test_item.trim().toLowerCase(), { score: score.score })
        }
      })
      nextIplasScoredByIsn.set(isn, scoreMap)
    } catch (err: unknown) {
      console.error(`Failed to rescore iPLAS data for ${isn}:`, err)
    }
  }

  iplasScoredByIsn.value = nextIplasScoredByIsn
}

/**
 * Check if a column key represents a score column (for chip rendering)
 */
function isScoreColumn(key: string | undefined): boolean {
  if (!key) return false
  return key.startsWith('uploaded_score_') || key.startsWith('iplas_score_')
}

function shortIsnLabel(isn: string): string {
  return isn.length > 10 ? `...${isn.slice(-8)}` : isn
}

function scoreChipClass(score: number): string[] {
  return ['upload-log-score-chip', `is-${getScoreColor(score)}`]
}

function scoringTypeChipClass(type: string): string[] {
  return ['upload-log-score-chip', `is-${getScoringTypeColor(type)}`]
}

const handleAnalyze = async () => {
  loading.value = true

  try {
    const files = logFiles.value || []

    // Helper to check if file is archive
    const isArchiveFile = (file: File) => {
      const ext = file.name.toLowerCase()
      return ext.endsWith('.zip') || ext.endsWith('.rar') || ext.endsWith('.7z')
    }

    // Use compareLogs if multiple files OR single archive file
    const hasArchive = files.some(isArchiveFile)

    if (files.length === 1 && !hasArchive) {
      // Single .txt file - use parseLog
      const file = files[0]
      if (!file) {
        throw new Error('No file selected')
      }
      const result = await parseLog(
        file,
        criteriaFile.value,
        showOnlyCriteria.value,
        appliedScoringConfigs.value,
      )
      parsingResult.value = result
      compareResult.value = null

      // Also update extracted test items from latest parse
      extractedTestItems.value = result.parsed_items_enhanced || []
    } else {
      // Multiple files OR archive file - use compareLogs
      const result = await compareLogs(
        files,
        criteriaFile.value,
        showOnlyCriteria.value,
        appliedScoringConfigs.value,
      )
      compareResult.value = result
      parsingResult.value = null

      // Sync extracted test items and stations from compareLogs result
      const stations = new Set<string>()
      const devices = new Set<string>()
      const stDevices = new Map<string, Set<string>>()
      const itemsMap = new Map<string, ParsedTestItemEnhanced>()
      const itemStationsMap = new Map<string, Set<string>>()

      result.file_summaries?.forEach((summary: FileSummaryEnhanced) => {
        const station = summary.station || summary.metadata?.station || 'Unknown'
        if (station && station !== 'Unknown') {
          stations.add(station)
        } else if (stations.size === 0) {
          stations.add('Unknown')
        }
        if (summary.metadata?.device) {
          devices.add(summary.metadata.device)
          if (!stDevices.has(station)) {
            stDevices.set(station, new Set())
          }
          stDevices.get(station)?.add(summary.metadata.device)
        }
      })

      const allItems = [
        ...(result.comparison_value_items || []),
        ...(result.comparison_non_value_items || []),
      ]

      allItems.forEach((item: CompareItemEnhanced) => {
        if (!itemsMap.has(item.test_item)) {
          const firstData = item.per_isn_data?.[0]
          itemsMap.set(item.test_item, {
            test_item: item.test_item,
            value: firstData?.value || '',
            usl: item.usl,
            lsl: item.lsl,
            is_value_type: firstData?.is_value_type ?? false,
            numeric_value: firstData?.numeric_value ?? null,
            is_hex: firstData?.is_hex ?? false,
            hex_decimal: firstData?.hex_decimal ?? null,
            matched_criteria: item.matched_criteria || false,
            target: item.baseline,
            score: item.avg_score,
            score_breakdown: firstData?.score_breakdown ?? null,
          } as ParsedTestItemEnhanced)
        }

        if (!itemStationsMap.has(item.test_item)) {
          itemStationsMap.set(item.test_item, new Set())
        }
        item.per_isn_data?.forEach((data: PerIsnData) => {
          if (data.station && data.station !== 'Unknown') {
            itemStationsMap.get(item.test_item)?.add(data.station)
          } else if (data.filename) {
            const summary = result.file_summaries?.find(
              (s: FileSummaryEnhanced) => s.filename === data.filename,
            )
            const st = summary?.station || summary?.metadata?.station
            if (st && st !== 'Unknown') {
              itemStationsMap.get(item.test_item)?.add(st)
            }
          } else if (data.isn) {
            const summary = result.file_summaries?.find(
              (s: FileSummaryEnhanced) => s.isn === data.isn,
            )
            const st = summary?.station || summary?.metadata?.station
            if (st && st !== 'Unknown') {
              itemStationsMap.get(item.test_item)?.add(st)
            }
          }
        })
      })

      extractedTestItems.value = Array.from(itemsMap.values())
      extractedStations.value = Array.from(stations).sort()
      extractedDevices.value = Array.from(devices).sort()
      testItemStationsMap.value = itemStationsMap
      stationDevicesMap.value = stDevices
    }
  } catch (error: unknown) {
    showErrorNotification(getErrorMessage(error) || 'Analysis failed. Please try again.')
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  logFiles.value = null
  criteriaFile.value = null
  showOnlyCriteria.value = false
  parsingResult.value = null
  compareResult.value = null
  searchQuery.value = ''
  itemFilterType.value = 'all'
  extractedTestItems.value = []
  extractedStations.value = []
  extractedDevices.value = []
  testItemStationsMap.value = new Map()
  stationDevicesMap.value = new Map()
  appliedScoringConfigs.value = []
  selectedDeviceScope.value = []
  scoringScopeMode.value = 'default'
  includedTestItemNames.value = []
  // UPDATED: Clear iPLAS comparison state
  iplasDataByIsn.value = new Map()
  iplasScoredByIsn.value = new Map()
  selectedIplasStation.value = null
  selectedCompareIsns.value = []
}

const openCriteriaBuilder = () => {
  criteriaBuilderOpen.value = true
}

const handleCriteriaCreated = (file: File) => {
  criteriaFile.value = file
}

const downloadCriteriaTemplate = () => {
  downloadUploadLogCriteriaTemplate()
}

const getScoreColor = (score: number): string => {
  if (score >= 9) return 'success' // 9-10: green
  if (score >= 7) return 'info' // 7-8.99: blue
  if (score >= 6) return 'warning' // 6-6.99: yellow/orange
  return 'error' // <6: red
}

/**
 * Export comparison table data to Excel
 */
async function exportComparisonToExcel() {
  exportingComparison.value = true
  try {
    if (!compareResult.value) return

    const exportedItemNames = new Set(
      comparisonTableItems.value.map((item) => String(item.test_item).toLowerCase()),
    )
    const sourceItems = [
      ...(compareResult.value.comparison_value_items || []),
      ...(compareResult.value.comparison_non_value_items || []),
    ].filter((item) => exportedItemNames.has(item.test_item.toLowerCase()))
    const records = createTopProductExcelRecordsFromComparison(
      compareResult.value,
      sourceItems,
      displayedIsns.value,
    )
    const workbook = await buildTopProductWorkbook(records)

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `Test_Item_Comparison_${timestamp}.xlsx`
    await downloadTopProductWorkbook(workbook, filename)
  } catch (err: unknown) {
    console.error('Export failed:', err)
    showErrorNotification(`Export failed: ${getErrorMessage(err) || 'Unknown error'}`)
  } finally {
    exportingComparison.value = false
  }
}

const getScoringTypeColor = (type: string): string => {
  switch (type) {
    case 'symmetrical':
      return 'blue'
    case 'asymmetrical':
      return 'purple'
    case 'per_mask':
      return 'orange'
    case 'evm':
      return 'teal'
    case 'throughput':
      return 'green'
    case 'binary':
      return 'grey'
    default:
      return 'blue'
  }
}

/**
 * Show score breakdown for a comparison item (uses first ISN's data)
 */
// const showTestItemBreakdown = (item: CompareItemEnhanced) => {
//   const firstIsnData = item.per_isn_data?.[0]
//   if (firstIsnData) {
//     breakdownItem.value = {
//       test_item: item.test_item,
//       usl: item.usl,
//       lsl: item.lsl,
//       value: firstIsnData.value,
//       is_value_type: firstIsnData.is_value_type,
//       numeric_value: firstIsnData.numeric_value,
//       is_hex: firstIsnData.is_hex,
//       hex_decimal: firstIsnData.hex_decimal,
//       matched_criteria: item.matched_criteria,
//       target: null,
//       score: firstIsnData.score,
//       score_breakdown: firstIsnData.score_breakdown,
//     }
//     showBreakdownDialog.value = true
//   }
// }

// Watch for showOnlyCriteria changes and re-analyze if results exist
watch(showOnlyCriteria, async () => {
  if (hasResults.value && criteriaFile.value) {
    await handleAnalyze()
  }
})

// When files change, clear extracted items so they get re-extracted
watch(logFiles, () => {
  extractedTestItems.value = []
  extractedStations.value = []
  extractedDevices.value = []
  testItemStationsMap.value = new Map()
  stationDevicesMap.value = new Map()
  selectedDeviceScope.value = []
})

// Prune selected ISNs if they do not belong to the newly selected station
watch(selectedUploadedStation, (newStation) => {
  if (newStation && compareResult.value?.file_summaries) {
    const validIsns = new Set(
      compareResult.value.file_summaries
        .filter((s) => (s.station || s.metadata?.station) === newStation)
        .map((s) => s.isn)
        .filter(Boolean),
    )
    selectedCompareIsns.value = selectedCompareIsns.value.filter((isn) => validIsns.has(isn))
  }
})

// UPDATED: Auto-fetch iPLAS data when comparison results are available
watch(compareResult, async (newVal) => {
  if (newVal) {
    await fetchIplasForComparison()
  }
})

// When iPLAS station changes, rescore iPLAS data
watch(selectedIplasStation, async () => {
  if (iplasDataByIsn.value.size > 0) {
    await rescoreIplasData()
  }
})

// When scoring configs change, rescore iPLAS data
watch(
  appliedScoringConfigs,
  async () => {
    if (iplasDataByIsn.value.size > 0) {
      await rescoreIplasData()
    }
  },
  { deep: true },
)

watch(selectedDeviceScope, async () => {
  if (compareResult.value) {
    await fetchIplasForComparison()
  }
})
</script>

<style scoped>
.upload-log-shell {
  display: grid;
  gap: 1rem;
}

.upload-log-shell__workspace,
.upload-log-comparison__panel {
  border: 1px solid var(--app-border);
  border-radius: 0.5rem;
  background: var(--app-panel);
  overflow: hidden;
}

.upload-log-shell__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.upload-log-shell__input-section {
  display: grid;
  align-content: start;
  gap: 1rem;
  min-width: 0;
  padding: 1rem;
  border: 1px solid var(--app-border);
  border-left: 3px solid var(--app-border);
  border-radius: 0.5rem;
  background: var(--app-surface);
}

.upload-log-shell__input-section:first-child {
  border-left-color: var(--app-accent);
}

.upload-log-shell__section-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 0.75rem;
}

.upload-log-shell__section-header--split {
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.upload-log-shell__section-header h3,
.upload-log-shell__section-header p {
  margin: 0;
}

.upload-log-shell__section-header h3 {
  color: var(--app-ink);
  font-size: 1rem;
}

.upload-log-shell__section-header p {
  margin-top: 0.2rem;
  color: var(--app-muted);
  font-size: 0.78rem;
  line-height: 1.4;
}

.upload-log-shell__step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid var(--app-border);
  border-radius: 50%;
  background: var(--app-panel);
  color: var(--app-accent);
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1;
}

.upload-log-shell__actions,
.upload-log-shell__notice,
.upload-log-shell__checkbox {
  display: flex;
  align-items: center;
}

.upload-log-shell__actions {
  display: grid;
  grid-template-columns: minmax(0, 6fr) minmax(0, 4fr) minmax(8rem, 2fr);
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--app-border);
}

.upload-log-shell__helper-text {
  margin: 0;
  color: var(--app-muted);
  font-size: 0.88rem;
}

.upload-log-shell__checkbox {
  gap: 0.65rem;
  color: var(--app-ink);
  font-weight: 600;
}

.upload-log-shell__checkbox input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--app-accent);
}

.upload-log-shell__ghost-button,
.upload-log-shell__primary-button,
.upload-log-shell__link {
  font: inherit;
}

.upload-log-shell__ghost-button,
.upload-log-shell__primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding: 0.78rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  cursor: pointer;
  transition: border-color 120ms ease-out, background-color 120ms ease-out;
}

.upload-log-shell__ghost-button:hover:not(:disabled),
.upload-log-shell__primary-button:hover:not(:disabled) {
  border-color: var(--app-accent);
}

.upload-log-shell__ghost-button:disabled,
.upload-log-shell__primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.upload-log-shell__ghost-button {
  border-color: var(--app-border);
  background: var(--app-panel);
  color: var(--app-ink);
}

.upload-log-shell__primary-button {
  background: var(--app-accent);
  color: var(--app-canvas);
}

.upload-log-shell__action-button--analyze,
.upload-log-shell__action-button--configure,
.upload-log-shell__action-button--reset {
  width: 100%;
}

.upload-log-shell__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.65rem;
  height: 1.65rem;
  padding: 0 0.4rem;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
  font-size: 0.8rem;
  font-weight: 700;
}

.upload-log-shell__notice,
.upload-log-shell__summary {
  border-radius: 0.5rem;
}

.upload-log-shell__notice {
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1rem;
}

.upload-log-shell__notice strong {
  color: var(--app-ink);
}

.upload-log-shell__notice p {
  margin: 0.25rem 0 0;
  color: var(--app-muted);
}

.upload-log-shell__notice--success {
  background: rgba(15, 118, 110, 0.08);
}

.upload-log-shell__summary {
  min-width: 0;
}

.upload-log-shell__link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.75rem;
  border: 0;
  background: transparent;
  color: var(--app-accent);
  cursor: pointer;
  font-weight: 700;
}

.upload-log-comparison-section {
  margin-top: 1rem;
}

.upload-log-comparison__header-actions,
.upload-log-comparison__filters,
.upload-log-breakdown__summary-grid {
  display: flex;
  gap: 0.75rem;
}

.upload-log-comparison__header-actions {
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
}

.upload-log-comparison__pill,
.upload-log-score-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.upload-log-comparison__ghost-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.65rem;
  padding: 0.72rem 0.95rem;
  border: 1px solid var(--app-border);
  border-radius: 0.5rem;
  background: var(--app-panel);
  color: var(--app-ink);
  cursor: pointer;
  transition: border-color 120ms ease-out, background-color 120ms ease-out, opacity 120ms ease-out;
}

.upload-log-comparison__ghost-button:hover:not(:disabled) {
  border-color: var(--app-accent);
}

.upload-log-comparison__ghost-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.upload-log-comparison__pill {
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-ink);
}

.upload-log-comparison__pill--info {
  background: rgba(40, 96, 163, 0.08);
  color: #214d86;
}

.upload-log-comparison__pill--success {
  background: rgba(15, 118, 110, 0.08);
  color: var(--app-accent);
}

.upload-log-comparison__filters {
  flex-wrap: wrap;
  padding: 1rem;
  border: 1px solid var(--app-border);
  border-left: 3px solid var(--app-border);
  border-radius: 0.5rem;
  background: var(--app-surface);
}

.upload-log-comparison__field {
  display: grid;
  gap: 0.4rem;
  min-width: 12rem;
  flex: 1 1 12rem;
}

.upload-log-comparison__field--wide {
  flex-basis: 16rem;
}

.upload-log-comparison__field span,
.upload-log-breakdown__summary-grid span,
.upload-log-breakdown__table td:first-child,
.upload-log-breakdown__eyebrow {
  color: var(--app-muted);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.upload-log-comparison__field select,
.upload-log-comparison__field input {
  width: 100%;
  height: 2.75rem;
  box-sizing: border-box;
  border: 1px solid var(--app-border);
  border-radius: 0.5rem;
  padding: 0.76rem 0.9rem;
  font: inherit;
  color: var(--app-ink);
  background: var(--app-panel-strong);
}

.upload-log-comparison__field :deep(.app-select.p-select),
.upload-log-comparison__field :deep(.app-multi-select.p-select) {
  width: 100%;
  height: 2.75rem;
  min-height: 2.75rem;
  border-radius: 0.5rem;
  box-sizing: border-box;
}

.upload-log-comparison__field select[multiple] {
  min-height: 8rem;
}

.upload-log-comparison__field small,
.upload-log-comparison__muted {
  color: var(--app-muted);
}

.upload-log-comparison__notice {
  padding: 0.85rem 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(40, 96, 163, 0.12);
  background: rgba(40, 96, 163, 0.08);
  color: #214d86;
}

.upload-log-comparison__notice--success {
  border-color: rgba(15, 118, 110, 0.12);
  background: rgba(15, 118, 110, 0.08);
  color: var(--app-accent);
}

.upload-log-comparison__strong,
.upload-log-breakdown__summary-card h3 {
  font-weight: 700;
  color: var(--app-ink);
}

.upload-log-comparison__table :deep(.p-datatable) {
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
}

.upload-log-shell__spin {
  animation: upload-log-shell-spin 0.8s linear infinite;
}

@keyframes upload-log-shell-spin {
  to {
    transform: rotate(360deg);
  }
}

.upload-log-comparison__table :deep(.p-datatable-header),
.upload-log-comparison__table :deep(.p-datatable-footer) {
  border: 0;
  background: rgba(15, 118, 110, 0.05);
}

.upload-log-comparison__table :deep(.p-datatable-thead > tr > th) {
  border-color: var(--app-border);
  background: var(--app-surface);
  color: var(--app-ink);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  text-align: center;
}

.upload-log-comparison__table :deep(.p-datatable-tbody > tr > td) {
  border-color: var(--app-border);
  text-align: center;
}

.upload-log-comparison__table :deep(.p-datatable-tbody > tr > td:first-child) {
  text-align: left;
}

.upload-log-breakdown__header h2 {
  margin: 0.2rem 0 0;
  color: var(--app-ink);
}

.upload-log-comparison__filters--fullscreen {
  padding: 0 0.1rem;
}

.upload-log-comparison__table-wrap {
  min-height: 0;
  overflow: hidden;
}

.upload-log-breakdown__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.upload-log-breakdown {
  display: grid;
  gap: 1rem;
}

.upload-log-breakdown__summary-card,
.upload-log-breakdown__table-wrap {
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel);
}

.upload-log-breakdown__summary-card {
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

.upload-log-breakdown__summary-grid {
  flex-wrap: wrap;
}

.upload-log-breakdown__summary-grid article {
  flex: 1 1 10rem;
  padding: 0.85rem 0.9rem;
  border-radius: 1rem;
  background: rgba(15, 118, 110, 0.06);
}

.upload-log-breakdown__summary-grid strong,
.upload-log-breakdown__emphasis {
  color: var(--app-ink);
  font-weight: 700;
}

.upload-log-breakdown__table {
  width: 100%;
  border-collapse: collapse;
}

.upload-log-breakdown__table td {
  padding: 0.85rem 0.95rem;
  border-bottom: 1px solid var(--app-border);
  vertical-align: top;
}

.upload-log-breakdown__table td:last-child {
  color: var(--app-ink);
}

.upload-log-breakdown__deviation-warning {
  color: #991b1b;
  font-weight: 700;
}

.upload-log-score-chip.is-success {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
}

.upload-log-score-chip.is-info,
.upload-log-score-chip.is-blue,
.upload-log-score-chip.is-teal {
  background: rgba(40, 96, 163, 0.12);
  color: #214d86;
}

.upload-log-score-chip.is-warning,
.upload-log-score-chip.is-orange {
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
}

.upload-log-score-chip.is-error,
.upload-log-score-chip.is-purple {
  background: rgba(139, 92, 246, 0.12);
  color: #6d28d9;
}

.upload-log-score-chip.is-green {
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.upload-log-score-chip.is-grey {
  background: rgba(148, 163, 184, 0.16);
  color: #475569;
}

@media (max-width: 900px) {
  .upload-log-shell__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .upload-log-shell__notice,
  .upload-log-comparison__header-actions,
  .upload-log-breakdown__header {
    flex-direction: column;
    align-items: stretch;
  }

  .upload-log-shell__actions {
    grid-template-columns: 1fr;
  }

  .upload-log-shell__section-header--split {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .upload-log-shell__section-header--split .upload-log-shell__link {
    grid-column: 2;
    justify-self: start;
  }

  .upload-log-shell__ghost-button,
  .upload-log-shell__primary-button,
  .upload-log-comparison__ghost-button {
    width: 100%;
  }
}

.upload-log-shell__notice--configured {
  align-items: flex-start;
}

.upload-log-shell__configured-content {
  display: grid;
  gap: 0.5rem;
  flex: 1;
}

.upload-log-shell__configured-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.upload-log-shell__configured-stations {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.upload-log-shell__station-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: var(--app-panel);
  border: 1px solid var(--app-border);
  font-size: 0.8rem;
  color: var(--app-ink);
}

.upload-log-shell__station-pill-name {
  color: var(--app-muted);
}

.upload-log-shell__station-pill small {
  color: var(--app-muted);
  font-size: 0.72rem;
}

.upload-log-comparison__frozen-header,
.upload-log-comparison__frozen-cell {
  background-color: var(--app-bg-surface, var(--app-panel)) !important;
}

/* ── Score Breakdown shared styles matching iPLAS details dialog ── */
.iplas-details-subdialog {
  display: grid;
  gap: 1rem;
}

.iplas-details-dialog__dialog-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.iplas-details-dialog__dialog-title h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--app-ink);
}

.iplas-breakdown__name-card {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: var(--app-panel);
  border: 1px solid var(--app-border);
}

.iplas-breakdown__name-text {
  font-family: monospace;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--app-ink);
}

.iplas-breakdown__rows-container {
  display: grid;
  border: 1px solid var(--app-border);
  border-radius: 0.5rem;
  background: var(--app-panel);
  overflow: hidden;
}

.iplas-breakdown__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--app-border);
  gap: 1rem;
}

.iplas-breakdown__row:last-child {
  border-bottom: 0;
}

.iplas-breakdown__row-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.iplas-breakdown__row-right {
  display: flex;
  align-items: center;
}

.iplas-breakdown__row-label {
  font-size: 0.85rem;
  color: var(--app-muted);
}

.iplas-breakdown__row-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  font-size: 0.95rem;
}

.iplas-breakdown__row-icon--red { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
.iplas-breakdown__row-icon--orange { color: #f97316; background: rgba(249, 115, 22, 0.1); }
.iplas-breakdown__row-icon--blue { color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
.iplas-breakdown__row-icon--green { color: #10b981; background: rgba(16, 185, 129, 0.1); }
.iplas-breakdown__row-icon--purple { color: #8b5cf6; background: rgba(139, 92, 246, 0.1); }
.iplas-breakdown__row-icon--amber { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
.iplas-breakdown__row-icon--muted { color: var(--app-muted); background: var(--app-surface); }
.iplas-breakdown__row-icon--star { color: #eab308; background: rgba(234, 179, 8, 0.1); }

.iplas-breakdown__value-text {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--app-ink);
}

.iplas-breakdown__value--warning {
  color: #ef4444;
}

.iplas-breakdown__value-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
}

.iplas-breakdown__value-pill--cool {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.iplas-breakdown__value-pill--neutral {
  background: var(--app-surface);
  color: var(--app-muted);
}

.iplas-details-dialog__explanation-card {
  padding: 0.75rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: 0.5rem;
  background: var(--app-panel);
}

.iplas-details-dialog__explanation-card summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--app-accent);
  font-size: 0.85rem;
}

.iplas-details-dialog__explanation-body {
  margin-top: 0.75rem;
}

.score-formula-panel--compact {
  padding: 0.75rem;
  border-radius: 0.35rem;
  background: var(--app-surface);
}

.iplas-details-dialog__metric-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--app-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.score-formula-equation {
  font-family: monospace;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--app-ink);
  margin-bottom: 0.5rem;
}

.score-formula-variable-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 0.75rem;
  font-size: 0.8rem;
  margin: 0;
}

.score-formula-variable-list dt {
  font-family: monospace;
  font-weight: 700;
  color: var(--app-accent);
}

.score-formula-variable-list dd {
  margin: 0;
  color: var(--app-muted);
}

.iplas-details-dialog__footer-actions {
  display: flex;
  justify-content: flex-end;
}

.iplas-details-dialog__button {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-ink);
}
</style>
