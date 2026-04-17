<template>
  <v-dialog v-model="isOpen" :max-width="isFullscreen ? undefined : '1200px'" :fullscreen="isFullscreen"
    :transition="isFullscreen ? 'dialog-bottom-transition' : 'dialog-transition'">
    <v-card v-if="record" class="d-flex flex-column"
      :style="{ height: isFullscreen ? '100vh' : '90vh', overflow: 'hidden' }">
      <!-- Sticky Header Container -->
      <div class="dialog-sticky-header flex-shrink-0"
        style="z-index: 10; background-color: rgb(var(--v-theme-surface));">
        <v-card-title class="d-flex justify-space-between align-center flex-shrink-0 bg-primary pa-2 py-1">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white" size="small">mdi-table-eye</v-icon>
            <span class="text-white text-body-1">Test Items Details</span>
          </div>
          <div class="d-flex align-center gap-2">
            <v-btn variant="outlined" color="white" size="x-small" :loading="downloading" @click="handleDownload">
              <v-icon start size="x-small">mdi-download</v-icon>
              Download
            </v-btn>
            <v-btn :icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'" variant="text" color="white"
              size="small" @click="isFullscreen = !isFullscreen"
              :title="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'" />
            <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="close" />
          </div>
        </v-card-title>

        <!-- DUT Information Section -->
        <div class="flex-shrink-0 px-3 py-2">
          <!-- Primary Information -->
          <v-card variant="tonal" color="primary" class="mb-3">
            <v-card-text class="py-3">
              <v-row dense class="align-center">
                <v-col cols="12" md="4">
                  <div class="d-flex align-center cursor-pointer" @click="copyToClipboard(record.isn)">
                    <v-icon size="large" class="mr-3" color="primary">mdi-barcode</v-icon>
                    <div>
                      <div class="text-caption text-medium-emphasis">DUT ISN</div>
                      <div class="text-h6 font-weight-bold">{{ record.isn || '-' }}</div>
                    </div>
                    <v-tooltip activator="parent" location="top">Click to copy ISN</v-tooltip>
                  </div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="d-flex align-center">
                    <v-icon size="large" class="mr-3" color="primary">mdi-factory</v-icon>
                    <div>
                      <div class="text-caption text-medium-emphasis">Station</div>
                      <div class="text-h6 font-weight-bold">
                        {{ record.displayStationName || record.stationName }}
                      </div>
                    </div>
                  </div>
                </v-col>
                <v-col v-if="scoreSummaryPrimary" cols="12" md="4">
                  <button type="button" class="summary-stat-button" @click="openOverallScoreDialog">
                    <div class="d-flex align-center">
                      <v-icon size="large" class="mr-3" :color="scoreSummaryIconColor">{{ scoreSummaryIcon }}</v-icon>
                      <div class="summary-stat-button__content">
                        <div class="text-caption text-medium-emphasis">{{ scoreSummaryLabel }}</div>
                        <div class="text-h6 font-weight-bold" :class="getScoreColorClass(scoreSummaryPrimary.score)">
                          {{ formatScoreOutOfTen(scoreSummaryPrimary.score) }}
                        </div>
                        <div class="text-body-2 text-medium-emphasis">
                          {{ scoreSummaryCaption }}
                        </div>
                        <div v-if="scoreSummarySecondaryText" class="text-caption text-medium-emphasis mt-1">
                          {{ scoreSummarySecondaryText }}
                        </div>
                      </div>
                    </div>
                    <v-tooltip activator="parent" location="top">Open score calculation details</v-tooltip>
                  </button>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Device & Identifiers -->
          <v-card variant="outlined" class="mb-3">
            <v-card-text class="py-2">
              <v-row dense>
                <v-col cols="12" md="4">
                  <div class="d-flex align-center cursor-pointer" @click="copyToClipboard(record.deviceId)">
                    <v-icon size="small" class="mr-2">mdi-chip</v-icon>
                    <span class="text-body-2">
                      <strong>Device ID:</strong>
                      <span class="ml-2 font-mono">{{ record.deviceId }}</span>
                    </span>
                    <v-tooltip activator="parent" location="top">Click to copy Device
                      ID</v-tooltip>
                  </div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="d-flex align-center">
                    <v-icon size="small" class="mr-2">mdi-map-marker</v-icon>
                    <span class="text-body-2">
                      <strong>Site:</strong>
                      <span class="ml-2">{{ record.site }}</span>
                    </span>
                  </div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="d-flex align-center">
                    <v-icon size="small" class="mr-2">mdi-folder</v-icon>
                    <span class="text-body-2">
                      <strong>Project:</strong>
                      <span class="ml-2">{{ record.project }}</span>
                    </span>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Timing & Status -->
          <div class="d-flex align-center flex-wrap gap-2 timing-status-row">
            <v-chip size="default" variant="tonal" color="primary" prepend-icon="mdi-calendar-clock" label class="timing-meta-chip">
              <span class="text-medium-emphasis mr-1">Start:</span>
              {{ formatTime(record.testStartTime) }}
            </v-chip>
            <v-chip size="default" variant="tonal" color="primary" prepend-icon="mdi-calendar-check" label class="timing-meta-chip">
              <span class="text-medium-emphasis mr-1">End:</span>
              {{ formatTime(record.testEndTime) }}
            </v-chip>
            <v-chip size="default" variant="tonal" color="secondary" prepend-icon="mdi-timer" label class="timing-meta-chip">
              <span class="text-medium-emphasis mr-1">Duration:</span>
              {{ calculateDuration(record.testStartTime, record.testEndTime) }}
            </v-chip>
            <v-chip size="default" variant="tonal" color="info" prepend-icon="mdi-list-box" label class="timing-meta-chip">
              <span class="text-medium-emphasis mr-1">Test Items:</span>
              {{ record.testItems?.length || 0 }}
            </v-chip>
            <v-chip size="default" :color="getStatusColor(record.errorCode)"
              :prepend-icon="isStatusPass(record.errorCode) ? 'mdi-check-circle' : 'mdi-alert-circle'"
              class="cursor-pointer timing-meta-chip" label @click="copyToClipboard(record.errorCode)">
              <span class="text-medium-emphasis mr-1">Status:</span>
              {{ record.errorCode }}
              <v-tooltip activator="parent" location="top">Click to copy Error Code</v-tooltip>
            </v-chip>
            <v-chip v-if="forcedFailSummary" size="default" color="warning"
              :variant="forcedFailSummary.clickable ? 'flat' : 'tonal'" prepend-icon="mdi-alert-octagon"
              class="timing-meta-chip" :class="{ 'cursor-pointer': forcedFailSummary.clickable }" label
              @click="openForcedFailDialog">
              <span class="text-medium-emphasis mr-1">Forced Fail:</span>
              {{ forcedFailSummary.detailText }}
            </v-chip>
            <template v-if="record.errorName && record.errorName !== 'N/A' && !isStatusPass(record.errorCode)">
              <v-chip size="default" color="error" variant="outlined" class="cursor-pointer timing-meta-chip" label
                prepend-icon="mdi-alert-octagon" @click="copyToClipboard(record.errorName)">
                <span class="text-medium-emphasis mr-1">Error:</span>
                {{ record.errorName }}
                <v-tooltip activator="parent" location="top">Click to copy Error Name</v-tooltip>
              </v-chip>
            </template>
          </div>
        </div>

        <v-divider class="flex-shrink-0" />
      </div>
      <!-- End Sticky Header Container -->

      <!-- Search and Filter Controls -->
      <v-card-text class="pb-2 pt-2 flex-shrink-0">
        <v-row dense>
          <v-col cols="12" md="4">
            <!-- UPDATED: Changed hint to AND logic -->
            <v-combobox v-model="searchTerms" label="Search Test Items (Regex)" prepend-inner-icon="mdi-magnify"
              variant="outlined" density="compact" hide-details clearable multiple chips closable-chips
              placeholder="Type and press Enter (AND logic)..." hint="Multiple terms use AND logic">
              <template #chip="{ props, item }">
                <v-chip v-bind="props" :text="String(item.value || item)" size="small" color="primary" />
              </template>
            </v-combobox>
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="testItemFilter" :items="testItemFilterOptions" item-title="title" item-value="value"
              label="Data Type" variant="outlined" density="compact" hide-details multiple chips closable-chips>
              <template #chip="{ props, item }">
                <v-chip v-bind="props" :text="item.title" size="small" />
              </template>
            </v-select>
          </v-col>
          <!-- UPDATED: Score Filter -->
          <v-col cols="12" md="4" v-if="hasScores">
            <v-row dense class="align-center">
              <v-col cols="6">
                <v-select v-model="scoreFilterType" :items="scoreFilterOptions" item-title="title" item-value="value"
                  label="Score Filter" variant="outlined" density="compact" hide-details clearable
                  placeholder="Filter...">
                </v-select>
              </v-col>
              <v-col cols="6">
                <v-text-field v-model.number="scoreFilterValue" type="number" label="Value (0-10)" variant="outlined"
                  density="compact" hide-details :disabled="!scoreFilterType" :min="0" :max="10" step="0.1"
                  placeholder="0.00" />
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-card-text>

      <!-- Data Table Container - UPDATED: Added overflow-y: auto for scrolling in non-fullscreen mode -->
      <div class="flex-grow-1 position-relative" :style="{ minHeight: 0, overflow: isFullscreen ? 'hidden' : 'auto' }">
        <!-- Loading Overlay when fetching test items -->
        <v-overlay v-model="props.loadingTestItems" contained class="align-center justify-center" persistent>
          <div class="text-center">
            <v-progress-circular indeterminate color="primary" size="64" />
            <div class="text-body-1 mt-4">Loading test items...</div>
          </div>
        </v-overlay>

        <v-data-table :headers="testItemHeaders" :items="tableTestItems" :items-per-page="50" density="comfortable"
          fixed-header fixed-footer style="height: 100%;" class="elevation-1 v-table--striped"
          :class="{ 'clickable-rows': hasScores }" @click:row="handleRowClick">
          <template #item.statusSort="{ item }">
            <span class="status-text" :class="getStatusTextClass(item.STATUS)">
              {{ normalizeStatus(item.STATUS) }}
            </span>
          </template>
          <template #item.VALUE="{ item }">
            <span class="table-value" :class="getValueClass(item)">{{ formatTableValue(item) }}</span>
          </template>
          <template #item.UCL="{ item }">
            <span class="table-limit">{{ item.UCL || '-' }}</span>
          </template>
          <template #item.LCL="{ item }">
            <span class="table-limit">{{ item.LCL || '-' }}</span>
          </template>
          <template #item.scoreSort="{ item }">
            <template v-if="item.score !== undefined && item.score !== null">
              <v-chip :color="getScoreColor(item.score)" size="small" variant="tonal"
                class="font-weight-bold cursor-pointer score-cell-chip" @click.stop="showScoreBreakdown(item)">
                {{ formatScoreValue(item.score) }}
              </v-chip>
            </template>
            <span v-else class="text-medium-emphasis">-</span>
          </template>
        </v-data-table>
      </div>

    </v-card>
  </v-dialog>

  <!-- Forced Fail Items Dialog -->
  <v-dialog v-model="showForcedFailDialog" max-width="900px" width="min(90vw, 900px)">
    <v-card v-if="record">
      <v-card-title class="d-flex align-center bg-warning">
        <v-icon class="mr-2" color="white">mdi-alert-octagon</v-icon>
        <span class="text-white">Forced Fail Items</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="showForcedFailDialog = false" />
      </v-card-title>
      <v-card-text class="pt-4">
        <v-alert color="warning" variant="tonal" density="compact" class="mb-4">
          {{ record.forcedFailureDetails?.length || 0 }} scored item(s) fell below the minimum score of
          {{ record.forcedFailureMinimumScore?.toFixed(1) ?? '6.5' }} / 10
        </v-alert>

        <v-text-field v-model="forcedFailSearch" label="Search Failed Items" prepend-inner-icon="mdi-magnify"
          variant="outlined" density="compact" hide-details clearable class="mb-3"
          placeholder="Search by test item name..." />

        <v-list density="compact" class="rounded border" style="max-height: 400px; overflow-y: auto;">
          <v-list-item v-for="item in filteredForcedFailureDetails" :key="item.name" class="cursor-pointer forced-fail-item"
            @click="copyToClipboard(item.name)">
            <template #prepend>
              <v-icon size="small" color="warning">mdi-alert-circle</v-icon>
            </template>
            <v-list-item-title class="forced-fail-item-title" :title="item.name">
              {{ item.name }}
            </v-list-item-title>
            <template #append>
              <div class="d-flex align-center gap-2 forced-fail-item-append">
                <v-chip size="small" :color="getScoreColor(item.score)" variant="flat" class="font-weight-bold">
                  {{ (item.score * 10).toFixed(2) }} / 10
                </v-chip>
                <v-icon size="x-small" color="grey">mdi-content-copy</v-icon>
              </div>
            </template>
          </v-list-item>
          <div v-if="filteredForcedFailureDetails.length === 0" class="text-center text-medium-emphasis pa-4">
            No failed items match the current search.
          </div>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="warning" variant="tonal" @click="showForcedFailDialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Score Breakdown Dialog -->
  <v-dialog v-model="showBreakdownDialog" max-width="500px" persistent>
    <v-card v-if="selectedTestItem" class="d-flex flex-column" style="max-height: 80vh;">
      <v-card-title class="d-flex align-center bg-primary flex-shrink-0">
        <v-icon class="mr-2" color="white">mdi-calculator-variant</v-icon>
        <span class="text-white">Score Breakdown</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="showBreakdownDialog = false" />
      </v-card-title>
      <v-card-text class="pt-4" style="flex: 1; overflow-y: auto;">
        <!-- Test Item Name -->
        <v-alert color="info" variant="tonal" density="compact" class="mb-4">
          <div class="text-subtitle-2 font-weight-bold">{{ selectedTestItem.NAME }}</div>
        </v-alert>

        <!-- Score Details -->
        <v-list density="compact" class="rounded border">
          <v-list-item>
            <template #prepend>
              <v-icon color="error">mdi-arrow-up-bold</v-icon>
            </template>
            <v-list-item-title>Upper Criteria Limit (UCL)</v-list-item-title>
            <template #append>
              <span class="font-weight-medium">{{ selectedTestItem.UCL || '-' }}</span>
            </template>
          </v-list-item>

          <v-divider />

          <v-list-item>
            <template #prepend>
              <v-icon color="warning">mdi-arrow-down-bold</v-icon>
            </template>
            <v-list-item-title>Lower Criteria Limit (LCL)</v-list-item-title>
            <template #append>
              <span class="font-weight-medium">{{ selectedTestItem.LCL || '-' }}</span>
            </template>
          </v-list-item>

          <v-divider />

          <v-list-item>
            <template #prepend>
              <v-icon color="primary">mdi-speedometer</v-icon>
            </template>
            <v-list-item-title>Measured Value</v-list-item-title>
            <template #append>
              <span class="font-weight-bold">{{ selectedTestItem.VALUE }}</span>
            </template>
          </v-list-item>

          <v-divider />

          <v-list-item>
            <template #prepend>
              <v-icon color="success">mdi-target</v-icon>
            </template>
            <v-list-item-title>
              Target
              <span class="text-caption text-medium-emphasis">
                ({{ getTargetLabel(selectedTestItem) }})
              </span>
            </v-list-item-title>
            <template #append>
              <span class="font-weight-bold text-success">{{ computeTarget(selectedTestItem) }}</span>
            </template>
          </v-list-item>

          <v-divider />

          <v-list-item>
            <template #prepend>
              <v-icon color="secondary">mdi-function-variant</v-icon>
            </template>
            <v-list-item-title>Scoring Algorithm</v-list-item-title>
            <template #append>
              <v-chip size="small" :color="getScoringTypeColor(selectedTestItem.scoringType)" variant="tonal">
                {{ formatScoringType(selectedTestItem.scoringType) }}
              </v-chip>
            </template>
          </v-list-item>

          <v-divider />

          <v-list-item>
            <template #prepend>
              <v-icon color="blue-grey">mdi-weight</v-icon>
            </template>
            <v-list-item-title>Score Weight</v-list-item-title>
            <template #append>
              <v-chip size="small" color="blue-grey" variant="tonal">
                {{ formatWeight(selectedTestItem.weight) }}
              </v-chip>
            </template>
          </v-list-item>

          <v-divider />

          <v-list-item v-if="selectedTestItem.deviation !== undefined">
            <template #prepend>
              <v-icon color="purple">mdi-delta</v-icon>
            </template>
            <v-list-item-title>Deviation from Target</v-list-item-title>
            <template #append>
              <span class="font-weight-medium">{{ selectedTestItem.deviation?.toFixed(2) }}</span>
            </template>
          </v-list-item>

          <v-divider v-if="selectedTestItem.deviation !== undefined" />

          <v-list-item>
            <template #prepend>
              <v-icon :color="getScoreColor(selectedTestItem.score ?? 0)">mdi-star</v-icon>
            </template>
            <v-list-item-title class="font-weight-bold">Final Score</v-list-item-title>
            <template #append>
              <v-chip size="small" :color="getScoreColor(selectedTestItem.score ?? 0)" variant="flat"
                class="font-weight-bold">
                {{ selectedTestItem.score !== undefined ? ((selectedTestItem.score ?? 0) * 10).toFixed(2) : '-' }} / 10
              </v-chip>
            </template>
          </v-list-item>
        </v-list>

        <!-- Scoring Formula Explanation -->
        <v-expansion-panels variant="accordion" class="mt-4">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon start size="small">mdi-help-circle-outline</v-icon>
              How is this score calculated?
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="text-body-2">
                <p class="mb-3">{{ getScoringExplanation(selectedTestItem.scoringType) }}</p>

                <!-- Formula Display -->
                <v-alert density="compact" variant="tonal" color="info" class="mb-3">
                  <div class="text-subtitle-2 font-weight-bold mb-1">Formula:</div>
                  <code class="text-body-2">{{ getScoringFormula(selectedTestItem.scoringType) }}</code>
                </v-alert>

                <!-- Score Range Explanation -->
                <div class="text-caption text-medium-emphasis">
                  <v-icon size="x-small" class="mr-1">mdi-information-outline</v-icon>
                  <strong>Score Range:</strong> 0.00 - 10.00
                  <ul class="mt-1 ml-4">
                    <li><strong>10.00</strong> = At target (best possible)</li>
                    <li><strong>1.00</strong> = At UCL/LCL boundary (limit score)</li>
                    <li><strong>0.00</strong> = Outside limits (failed)</li>
                  </ul>
                </div>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
      <v-card-actions class="flex-shrink-0">
        <v-spacer />
        <v-btn color="primary" variant="tonal" @click="showBreakdownDialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showOverallScoreDialog" max-width="640px">
    <v-card v-if="record && scoreSummaryPrimary && overallScoreExplanation">
      <v-card-title class="d-flex align-center bg-primary">
        <v-icon class="mr-2" color="white">mdi-chart-line</v-icon>
        <span class="text-white">{{ scoreSummaryLabel }} Calculation</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="showOverallScoreDialog = false" />
      </v-card-title>
      <v-card-text class="pt-4">
        <v-alert :color="record.isForcedFailure ? 'warning' : 'info'" variant="tonal" class="mb-4">
          <div class="text-subtitle-2 font-weight-bold">{{ scoreSummaryLabel }}</div>
          <div class="text-h6 mt-1" :class="getScoreColorClass(scoreSummaryPrimary.score)">
            {{ formatScoreOutOfTen(scoreSummaryPrimary.score) }}
          </div>
          <div class="text-body-2 mt-2">
            {{ scoreSummaryCaption }}
          </div>
        </v-alert>

        <div class="text-body-2 mb-3">
          The backend calculates this aggregate score as a weighted average across scored test items.
        </div>

        <v-alert color="info" variant="tonal" density="comfortable" class="mb-4">
          <div class="text-subtitle-2 font-weight-bold mb-1">Formula</div>
          <code class="text-body-2 score-formula-code">
            Aggregate = sum(item score × effective weight) / sum(effective weight)
          </code>
          <div class="text-caption mt-2">
            Effective weight = configured weight × configured weight.
          </div>
          <div class="text-caption mt-1">
            Displayed scores are shown on a /10 scale. The backend stores and averages them on a 0-1 scale.
          </div>
        </v-alert>

        <v-row dense>
          <v-col cols="12" sm="6">
            <div class="score-explanation-stat">
              <div class="text-caption text-medium-emphasis">Scored Test Items</div>
              <div class="text-h6 font-weight-bold">{{ overallScoreExplanation.scoredItemCount }}</div>
              <div class="text-caption text-medium-emphasis mt-1">
                {{ overallScoreExplanation.valueItemCount }} value, {{ overallScoreExplanation.binaryItemCount }} binary
              </div>
            </div>
          </v-col>
          <v-col cols="12" sm="6">
            <div class="score-explanation-stat">
              <div class="text-caption text-medium-emphasis">Total Effective Weight</div>
              <div class="text-h6 font-weight-bold">{{ formatCompactNumber(overallScoreExplanation.totalEffectiveWeight) }}</div>
              <div class="text-caption text-medium-emphasis mt-1">
                Based on squared per-item weights.
              </div>
            </div>
          </v-col>
        </v-row>

        <div v-if="scoreExplanationMetrics.length" class="mt-4">
          <div class="text-subtitle-2 font-weight-bold mb-2">Available Aggregate Scores</div>
          <div class="d-flex flex-wrap gap-2">
            <v-chip v-for="metric in scoreExplanationMetrics" :key="metric.key" size="small"
              :color="metric.key === scoreSummaryPrimary.key ? 'primary' : undefined"
              :variant="metric.key === scoreSummaryPrimary.key ? 'flat' : 'tonal'">
              {{ metric.label }}: {{ formatScoreOutOfTen(metric.score) }}
            </v-chip>
          </div>
        </div>

        <v-alert v-if="record.isForcedFailure" color="warning" variant="tonal" class="mt-4">
          <div class="text-subtitle-2 font-weight-bold mb-1">Forced Fail Override</div>
          <div class="text-body-2">
            This record is marked as forced fail because
            {{ overallScoreExplanation.failingItemCount }}
            {{ overallScoreExplanation.failingItemCount === 1 ? 'item fell' : 'items fell' }} below the minimum score of
            {{ overallScoreExplanation.forcedFailureThreshold }} / 10.
          </div>
          <div class="text-caption mt-2">
            That threshold rule is separate from the aggregate weighted-average score shown above.
          </div>
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="tonal" @click="showOverallScoreDialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Copy Success Snackbar -->
  <v-snackbar v-model="showCopySuccess" :timeout="2000" color="success" location="bottom">
    <v-icon start>mdi-check</v-icon>
    Copied to clipboard!
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  adjustIplasDisplayTime,
  getStatusColor,
  isStatusFail,
  isStatusPass,
  normalizeStatus,
} from '@/shared/utils/helpers'
import type { ScoringType } from '../types/scoring.types'
import { getScoreColor, SCORING_TYPE_INFO } from '../types/scoring.types'
import type { NormalizedRecord, NormalizedTestItem } from './IplasTestItemsFullscreenDialog.vue'

type TestItemFilter = 'all' | 'value' | 'non-value' | 'bin'
type ScoreFilterType = 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
type ScoreSummaryMetricKey = 'overall' | 'value' | 'binary'

interface ScoreSummaryMetric {
  key: ScoreSummaryMetricKey
  label: string
  score: number
}

interface ForcedFailSummary {
  detailText: string
  clickable: boolean
}

interface OverallScoreExplanation {
  scoredItemCount: number
  valueItemCount: number
  binaryItemCount: number
  totalEffectiveWeight: number
  failingItemCount: number
  forcedFailureThreshold: string
}

interface Props {
  modelValue: boolean
  record: NormalizedRecord | null
  downloading?: boolean
  loadingTestItems?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'download'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Dialog state
const isOpen = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const isFullscreen = ref(false)

// Filter controls
// UPDATED: Default to 'all' (Show All) instead of 'value'
const testItemFilter = ref<TestItemFilter[]>(['all'])
const searchTerms = ref<string[]>([])
const showCopySuccess = ref(false)

// UPDATED: Score filter state
const scoreFilterType = ref<ScoreFilterType | null>(null)
const scoreFilterValue = ref<number | null>(null)

// Score breakdown dialog
const showBreakdownDialog = ref(false)
const selectedTestItem = ref<NormalizedTestItem | null>(null)
const showOverallScoreDialog = ref(false)

// Forced fail items dialog
const showForcedFailDialog = ref(false)
const forcedFailSearch = ref('')

// Filter options for dropdown
const testItemFilterOptions: { title: string; value: TestItemFilter }[] = [
  { title: 'Criteria Data ★', value: 'value' },
  { title: 'Show All', value: 'all' },
  { title: 'Non-Criteria', value: 'non-value' },
  { title: 'Bin Data', value: 'bin' },
]

// UPDATED: Score filter options
const scoreFilterOptions: { title: string; value: ScoreFilterType }[] = [
  { title: '> Greater than', value: 'gt' },
  { title: '≥ Greater or equal', value: 'gte' },
  { title: '< Less than', value: 'lt' },
  { title: '≤ Less or equal', value: 'lte' },
  { title: '= Equals', value: 'eq' },
]

// Computed: check if scores are available
const hasScores = computed(() => {
  return props.record?.testItems?.some((item: NormalizedTestItem) => item.score !== undefined) ?? false
})

function hasScore(score: number | null | undefined): score is number {
  return score !== null && score !== undefined
}

function areDisplayedScoresEqual(left: number | null | undefined, right: number | null | undefined): boolean {
  if (!hasScore(left) || !hasScore(right)) {
    return false
  }

  return formatScoreValue(left) === formatScoreValue(right)
}

const scoreSummaryPrimary = computed<ScoreSummaryMetric | null>(() => {
  const record = props.record

  if (!record) {
    return null
  }

  if (hasScore(record.overallScore)) {
    return { key: 'overall', label: 'Overall Score', score: record.overallScore }
  }

  if (hasScore(record.valueItemsScore)) {
    return { key: 'value', label: 'Value', score: record.valueItemsScore }
  }

  if (hasScore(record.binItemsScore)) {
    return { key: 'binary', label: 'Binary', score: record.binItemsScore }
  }

  return null
})

const scoreSummarySecondaryMetrics = computed<ScoreSummaryMetric[]>(() => {
  const record = props.record
  const primaryMetric = scoreSummaryPrimary.value

  if (!record || !primaryMetric) {
    return []
  }

  const candidates: ScoreSummaryMetric[] = []

  if (hasScore(record.valueItemsScore)) {
    candidates.push({ key: 'value', label: 'Value', score: record.valueItemsScore })
  }

  if (hasScore(record.binItemsScore)) {
    candidates.push({ key: 'binary', label: 'Binary', score: record.binItemsScore })
  }

  return candidates.reduce<ScoreSummaryMetric[]>((visibleMetrics, metric) => {
    if (metric.key === primaryMetric.key || areDisplayedScoresEqual(metric.score, primaryMetric.score)) {
      return visibleMetrics
    }

    if (
      visibleMetrics.some((visibleMetric: ScoreSummaryMetric) =>
        areDisplayedScoresEqual(visibleMetric.score, metric.score),
      )
    ) {
      return visibleMetrics
    }

    visibleMetrics.push(metric)
    return visibleMetrics
  }, [])
})

const scoreExplanationMetrics = computed<ScoreSummaryMetric[]>(() => {
  const record = props.record

  if (!record) {
    return []
  }

  const metrics: ScoreSummaryMetric[] = []

  if (hasScore(record.overallScore)) {
    metrics.push({ key: 'overall', label: 'Overall Score', score: record.overallScore })
  }

  if (hasScore(record.valueItemsScore)) {
    metrics.push({ key: 'value', label: 'Value', score: record.valueItemsScore })
  }

  if (hasScore(record.binItemsScore)) {
    metrics.push({ key: 'binary', label: 'Binary', score: record.binItemsScore })
  }

  return metrics
})

const forcedFailSummary = computed<ForcedFailSummary | null>(() => {
  const record = props.record

  if (!record?.isForcedFailure) {
    return null
  }

  const threshold = record.forcedFailureMinimumScore?.toFixed(1) ?? '6.5'
  const failingItemCount = record.forcedFailureDetails?.length ?? 0
  const itemLabel = failingItemCount === 1 ? 'item' : 'items'

  return {
    detailText:
      failingItemCount > 0
        ? `${failingItemCount} ${itemLabel} below ${threshold} / 10`
        : `Below ${threshold} / 10`,
    clickable: failingItemCount > 0,
  }
})

const scoreSummaryLabel = computed(() => {
  if (props.record?.isForcedFailure) {
    return 'Forced Fail Score'
  }

  return scoreSummaryPrimary.value?.label ?? 'Score'
})

const scoreSummaryCaption = computed(() => {
  const record = props.record

  if (record?.isForcedFailure) {
    return `Minimum score ${record.forcedFailureMinimumScore?.toFixed(1) ?? '6.5'} / 10 triggered fail. Click for details.`
  }

  if (scoreSummaryPrimary.value?.key === 'overall') {
    return 'Overall scored result. Click for calculation details.'
  }

  return `${scoreSummaryPrimary.value?.label ?? 'Score'} scored result. Click for calculation details.`
})

const scoreSummaryIcon = computed(() => {
  if (props.record?.isForcedFailure) {
    return 'mdi-alert-octagon'
  }

  if ((scoreSummaryPrimary.value?.score ?? 0) >= 0.9) {
    return 'mdi-check-decagram'
  }

  return 'mdi-chart-line'
})

const scoreSummaryIconColor = computed(() => {
  if (props.record?.isForcedFailure) {
    return 'warning'
  }

  if ((scoreSummaryPrimary.value?.score ?? 0) >= 0.9) {
    return 'success'
  }

  return 'primary'
})

const scoreSummarySecondaryText = computed(() => {
  if (scoreSummarySecondaryMetrics.value.length === 0) {
    return ''
  }

  return scoreSummarySecondaryMetrics.value
    .map((metric: ScoreSummaryMetric) => `${metric.label}: ${formatScoreOutOfTen(metric.score)}`)
    .join(' | ')
})

const overallScoreExplanation = computed<OverallScoreExplanation | null>(() => {
  const record = props.record

  if (!record || !scoreSummaryPrimary.value) {
    return null
  }

  const scoredItems = record.testItems.filter((item: NormalizedTestItem) => hasScore(item.score))
  const binaryItemCount = scoredItems.filter((item: NormalizedTestItem) => isBinData(item)).length
  const valueItemCount = scoredItems.length - binaryItemCount
  const totalEffectiveWeight = scoredItems.reduce((total: number, item: NormalizedTestItem) => {
    const weight = item.weight ?? 1.0
    return total + (weight * weight)
  }, 0)

  return {
    scoredItemCount: scoredItems.length,
    valueItemCount,
    binaryItemCount,
    totalEffectiveWeight,
    failingItemCount: record.forcedFailureDetails?.length ?? 0,
    forcedFailureThreshold: record.forcedFailureMinimumScore?.toFixed(1) ?? '6.5',
  }
})

// Dynamic headers - add Score column if scores are available
const testItemHeaders = computed(() => {
  const baseHeaders = [
    { title: 'Test Item', key: 'NAME', sortable: true },
    { title: 'Status', key: 'statusSort', sortable: true },
    { title: 'Value', key: 'VALUE', sortable: true },
    { title: 'UCL', key: 'UCL', sortable: true },
    { title: 'LCL', key: 'LCL', sortable: true },
  ]

  if (hasScores.value) {
    baseHeaders.push({ title: 'Score', key: 'scoreSort', sortable: true })
  }

  return baseHeaders
})

const tableTestItems = computed(() => {
  return filteredTestItems.value.map((item: NormalizedTestItem) => ({
    ...item,
    statusSort: normalizeStatus(item.STATUS),
    scoreSort: item.score ?? Number.NEGATIVE_INFINITY,
  }))
})

const filteredForcedFailureDetails = computed(() => {
  const details = [...(props.record?.forcedFailureDetails || [])]
    .sort((left, right) => left.score - right.score)

  const query = forcedFailSearch.value.trim().toLowerCase()
  if (!query) {
    return details
  }

  return details.filter((item) => item.name.toLowerCase().includes(query))
})

// Helper functions
function isValueData(item: NormalizedTestItem): boolean {
  const value = item.VALUE?.toUpperCase() || ''
  // Value data: not PASS, FAIL, 1, 0, or -999
  if (value === 'PASS' || value === 'FAIL' || value === '1' || value === '0' || value === '-999') {
    return false
  }
  const hasNumericValue = !Number.isNaN(parseFloat(item.VALUE)) && item.VALUE !== ''
  const hasNumericUcl = !Number.isNaN(parseFloat(item.UCL)) && item.UCL !== ''
  const hasNumericLcl = !Number.isNaN(parseFloat(item.LCL)) && item.LCL !== ''
  const numericCount = [hasNumericValue, hasNumericUcl, hasNumericLcl].filter(Boolean).length
  return numericCount >= 2
}

function isPassFailData(item: NormalizedTestItem): boolean {
  const value = item.VALUE?.toUpperCase() || ''
  // STATUS must be PASS, FAIL, 1, 0, or -1 AND VALUE must be PASS, FAIL, 1, 0, or -999
  const isStatusPF = isStatusPass(item.STATUS) || isStatusFail(item.STATUS) || item.STATUS === '-1'
  const isValuePF =
    value === 'PASS' || value === 'FAIL' || value === '1' || value === '0' || value === '-999'
  return isStatusPF && isValuePF
}

function isBinData(item: NormalizedTestItem): boolean {
  return isPassFailData(item)
}

function isNonValueData(item: NormalizedTestItem): boolean {
  return !isValueData(item) && !isBinData(item)
}

function getValueClass(item: NormalizedTestItem): string {
  const value = item.VALUE?.toUpperCase() || ''
  if (value === 'PASS' || value === '1') return 'text-success font-weight-medium'
  if (value === 'FAIL' || value === '0') return 'text-error font-weight-medium'
  if (value === '-999') return 'text-medium-emphasis'
  return 'text-high-emphasis'
}

function getStatusTextClass(status: string | undefined): string {
  if (isStatusPass(status ?? '')) return 'text-success'
  if (isStatusFail(status ?? '')) return 'text-error'
  return 'text-medium-emphasis'
}

function formatScoreValue(score: number | null | undefined): string {
  if (score === null || score === undefined) return '-'
  return (score * 10).toFixed(2)
}

function formatScoreOutOfTen(score: number | null | undefined): string {
  const formattedScore = formatScoreValue(score)
  return formattedScore === '-' ? formattedScore : `${formattedScore} / 10`
}

function formatTableValue(item: NormalizedTestItem): string {
  const rawValue = item.VALUE?.trim() || ''
  if (!rawValue || rawValue === '-999') return '-'
  if (rawValue.toUpperCase() === 'PASS' || rawValue === '1') return 'PASS'
  if (rawValue.toUpperCase() === 'FAIL' || rawValue === '0') return 'FAIL'
  return rawValue
}

function formatTime(timeStr: string): string {
  // Use the centralized helper to adjust time by -1 hour for display
  // Returns format: YYYY-MM-DD HH:MM:SS (e.g., 2026-02-06 22:34:42)
  return adjustIplasDisplayTime(timeStr, 1)
}

function parseDurationDate(value: string): Date | null {
  if (!value) {
    return null
  }

  const trimmedValue = value.trim()

  if (trimmedValue.includes('/') && trimmedValue.includes(',')) {
    const normalizedValue = trimmedValue.replace(',', '').replace(/\//g, '-').replace(/\s+/g, 'T')
    const parsedDate = new Date(normalizedValue)
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
  }

  const sanitizedValue = trimmedValue.replace('%:z', '').replace(/\.\d+$/, '')
  const isoCandidate = sanitizedValue.includes('T') ? sanitizedValue : sanitizedValue.replace(' ', 'T')

  const utcParsedDate = new Date(`${isoCandidate}Z`)
  if (!Number.isNaN(utcParsedDate.getTime())) {
    return utcParsedDate
  }

  const localParsedDate = new Date(isoCandidate)
  return Number.isNaN(localParsedDate.getTime()) ? null : localParsedDate
}

function calculateDuration(startStr: string, endStr: string): string {
  if (!startStr || !endStr) return '-'
  const start = parseDurationDate(startStr)
  const end = parseDurationDate(endStr)

  if (!start || !end) {
    return '-'
  }

  const diffMs = end.getTime() - start.getTime()
  if (Number.isNaN(diffMs) || diffMs < 0) {
    return '-'
  }

  const diffSeconds = Math.floor(diffMs / 1000)
  const hours = Math.floor(diffSeconds / 3600)
  const minutes = Math.floor((diffSeconds % 3600) / 60)
  const seconds = diffSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }

  return `${minutes}m ${seconds}s`
}

function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '-'
  }

  return value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d*[1-9])0$/, '$1')
}

async function copyToClipboard(text: string): Promise<void> {
  if (!text) return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    showCopySuccess.value = true
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

watch(showForcedFailDialog, (isOpen: boolean) => {
  if (!isOpen) {
    forcedFailSearch.value = ''
  }
})

// Computed filtered test items
const filteredTestItems = computed(() => {
  if (!props.record?.testItems) return []

  let items = [...props.record.testItems]

  // Apply test item type filter (supports multiple selections)
  if (testItemFilter.value.length > 0 && !testItemFilter.value.includes('all')) {
    items = items.filter((item: NormalizedTestItem) => {
      return testItemFilter.value.some((filterType: TestItemFilter) => {
        switch (filterType) {
          case 'value':
            return isValueData(item)
          case 'non-value':
            return isNonValueData(item)
          case 'bin':
            return isBinData(item)
          default:
            return true
        }
      })
    })
  }

  // UPDATED: Apply multi-term regex search (AND logic - all terms must match)
  if (searchTerms.value.length > 0) {
    items = items.filter((item: NormalizedTestItem) => {
      const searchableText =
        `${item.NAME || ''} ${item.STATUS || ''} ${item.VALUE || ''}`.toLowerCase()
      // AND logic: every term must match
      return searchTerms.value.every((term: string) => {
        const trimmedTerm = term.trim().toLowerCase()
        if (!trimmedTerm) return true // Empty terms don't affect filtering
        try {
          const regex = new RegExp(trimmedTerm, 'i')
          return regex.test(searchableText)
        } catch {
          return searchableText.includes(trimmedTerm)
        }
      })
    })
  }

  // UPDATED: Apply score filter if active
  if (scoreFilterType.value && scoreFilterValue.value !== null && hasScores.value) {
    items = items.filter((item: NormalizedTestItem) => {
      if (item.score === undefined || item.score === null) return true // Keep items without scores
      const score = item.score * 10 // Convert to 0-10 scale for comparison
      // biome-ignore lint/style/noNonNullAssertion: scoreFilterValue !== null is checked in outer condition
      const filterValue = scoreFilterValue.value!
      switch (scoreFilterType.value) {
        case 'gt':
          return score > filterValue
        case 'gte':
          return score >= filterValue
        case 'lt':
          return score < filterValue
        case 'lte':
          return score <= filterValue
        case 'eq':
          return Math.abs(score - filterValue) < 0.01
        default:
          return true
      }
    })
  }

  return items
})

// Methods
function close(): void {
  isOpen.value = false
  searchTerms.value = []
}

function handleDownload(): void {
  emit('download')
}

function openOverallScoreDialog(): void {
  if (scoreSummaryPrimary.value) {
    showOverallScoreDialog.value = true
  }
}

function openForcedFailDialog(): void {
  if (forcedFailSummary.value?.clickable) {
    showForcedFailDialog.value = true
  }
}

// Score-related helpers
function getScoreColorClass(score: number): string {
  if (score >= 0.9) return 'text-success font-weight-bold'
  if (score >= 0.7) return 'text-primary font-weight-bold'
  if (score >= 0.5) return 'text-warning font-weight-bold'
  return 'text-error font-weight-bold'
}

function getScoringTypeColor(scoringType?: ScoringType): string {
  if (!scoringType) return 'grey'
  const info = SCORING_TYPE_INFO[scoringType]
  return info?.color ?? 'grey'
}

function formatScoringType(scoringType?: ScoringType): string {
  if (!scoringType) return 'Unknown'
  const info = SCORING_TYPE_INFO[scoringType]
  return info?.label ?? scoringType
}

function getScoringExplanation(scoringType?: ScoringType): string {
  const explanations: Record<ScoringType, string> = {
    symmetrical:
      'Linear scoring where the target is the midpoint between UCL and LCL. Score decreases linearly as the measured value moves away from the target toward either limit. At the target, score is 10.0. At UCL or LCL boundary, score is 1.0.',
    symmetrical_nl:
      'Non-linear (Gaussian) scoring centered on the midpoint. Score follows a bell curve, with faster degradation near the limits.',
    evm: 'EVM-style scoring optimized for Error Vector Magnitude measurements. Lower (more negative) values in dB are better. Uses a gentle decay exponent (0.25) from reference point of -35 dB.',
    throughput:
      'Throughput scoring where higher values are better. Score is 10.0 at or above UCL, and decreases toward LCL.',
    asymmetrical:
      'Scoring with a user-defined target that may not be centered between limits. Score degrades based on deviation from the specified target according to the selected policy.',
    per_mask:
      'Lower-is-better scoring ideal for PER/MASK measurements. Zero is the ideal value with score 10.0, score decreases linearly as the value approaches UCL (failure threshold).',
    binary:
      'Simple PASS/FAIL scoring. PASS status = 10.0, FAIL status = 0.0. No intermediate values.',
  }
  return explanations[scoringType ?? 'binary'] ?? 'Unknown scoring algorithm.'
}

// UPDATED: Get target label based on scoring type and policy
function getTargetLabel(item: NormalizedTestItem): string {
  const scoringType = item.scoringType

  // For asymmetrical scoring, use policy
  if (scoringType === 'asymmetrical' && item.policy) {
    switch (item.policy) {
      case 'higher':
        return 'Higher is Better'
      case 'lower':
        return 'Lower is Better'
      default:
        return 'Centered'
    }
  }

  // For other scoring types
  switch (scoringType) {
    case 'per_mask':
      return 'Lower is Better'
    case 'evm':
      return 'Lower is Better'
    case 'throughput':
      return 'Higher is Better'
    case 'symmetrical':
    case 'symmetrical_nl':
      return 'Centered'
    case 'binary':
      return 'Pass/Fail'
    default:
      return 'Centered'
  }
}

// UPDATED: Compute target using backend target value if available, otherwise compute locally
function computeTarget(item: NormalizedTestItem): string {
  // If target is provided from backend, use it
  if (item.target !== undefined && item.target !== null) {
    return item.target.toFixed(2)
  }

  // Fallback: compute target locally based on scoring type
  const ucl = parseFloat(item.UCL)
  const lcl = parseFloat(item.LCL)

  // For asymmetrical scoring with policy, compute target based on policy
  if (item.scoringType === 'asymmetrical' && item.policy) {
    switch (item.policy) {
      case 'higher':
        // Target is UCL for "higher is better"
        return Number.isNaN(ucl) ? '-' : ucl.toFixed(2)
      case 'lower':
        // Target is LCL for "lower is better"
        return Number.isNaN(lcl) ? '-' : lcl.toFixed(2)
      default:
        // For 'symmetrical' policy or unknown, use centered target
        break
    }
  }

  // For per_mask, target is 0
  if (item.scoringType === 'per_mask') {
    return '0.00'
  }

  // For evm, target is -35 dB
  if (item.scoringType === 'evm') {
    return '-35.00'
  }

  // For throughput, target is UCL
  if (item.scoringType === 'throughput') {
    return Number.isNaN(ucl) ? '-' : ucl.toFixed(2)
  }

  // For symmetrical scoring, target = (UCL + LCL) / 2
  if (!Number.isNaN(ucl) && !Number.isNaN(lcl)) {
    const target = (ucl + lcl) / 2
    return target.toFixed(2)
  }

  // For UCL only, target is 0 (assumed lower is better)
  if (!Number.isNaN(ucl) && Number.isNaN(lcl)) {
    return '0.00'
  }

  return '-'
}

// UPDATED: Format weight for display (e.g., "1.0x", "3.0x")
function formatWeight(weight?: number): string {
  const w = weight ?? 1.0
  return `${w.toFixed(1)}x`
}

// UPDATED: Added helper to format policy for display
// function formatPolicy(policy?: string): string {
//   const policyLabels: Record<string, string> = {
//     higher: 'Higher is Better',
//     lower: 'Lower is Better',
//     symmetrical: 'Centered',
//   }
//   return policyLabels[policy ?? ''] ?? policy ?? 'Unknown'
// }

// UPDATED: Added helper to get formula for score breakdown display
function getScoringFormula(scoringType?: ScoringType): string {
  const formulas: Record<ScoringType, string> = {
    symmetrical: 'Score = 1 + 9 × (L - |x - T|) / L, where T = (UCL + LCL) / 2',
    symmetrical_nl: 'Score = exp(-((x - T) / σ)²), Gaussian decay',
    evm: 'Score = 1 + 9 × (1 - (x - ref) / (UCL - ref))^0.25, ref = -35 dB',
    throughput: 'Score = 1 + 9 × (x - LCL) / (UCL - LCL)',
    asymmetrical: 'Score = 1 + 9 × (L - d) / L, with policy-based limit selection',
    per_mask: 'Score = 1 + 9 × (UCL - x) / UCL, where 0 is ideal',
    binary: 'Score = 10.0 if PASS, 0.0 if FAIL',
  }
  return formulas[scoringType ?? 'binary'] ?? 'Unknown formula'
}

// Handle row click to show score breakdown
function handleRowClick(_event: Event, row: { item: NormalizedTestItem }): void {
  if (hasScores.value && row.item.score !== undefined) {
    showScoreBreakdown(row.item)
  }
}

// Show score breakdown dialog
function showScoreBreakdown(item: NormalizedTestItem): void {
  selectedTestItem.value = item
  showBreakdownDialog.value = true
}

// Reset filters when record changes - always default to Show All
watch(
  () => props.record,
  () => {
    // UPDATED: Always default to Show All
    testItemFilter.value = ['all']
    searchTerms.value = []
    // Clear score filter
    scoreFilterType.value = null
    scoreFilterValue.value = null
  },
)
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}

.gap-3 {
  gap: 0.75rem;
}

.cursor-pointer {
  cursor: pointer;
}

.timing-status-row {
  align-items: center;
}

.timing-meta-chip {
  font-size: 0.92rem;
  font-weight: 600;
}

.summary-stat-button {
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.summary-stat-button__content {
  min-width: 0;
}

.summary-stat-button:hover .text-body-2,
.summary-stat-button:focus-visible .text-body-2 {
  color: rgba(var(--v-theme-on-surface), 0.88) !important;
}

.summary-stat-button:focus-visible {
  outline: 2px solid rgba(var(--v-theme-primary), 0.4);
  outline-offset: 4px;
  border-radius: 10px;
}

.score-explanation-stat {
  height: 100%;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.score-formula-code {
  display: inline-block;
  white-space: normal;
  overflow-wrap: anywhere;
}

.status-text {
  display: inline-block;
  min-width: 52px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.table-value {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
}

.table-limit {
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-variant-numeric: tabular-nums;
}

.score-cell-chip {
  min-width: 70px;
  justify-content: center;
  font-variant-numeric: tabular-nums;
}

:deep(.v-table--striped tbody tr:nth-of-type(even)) {
  background-color: rgba(0, 0, 0, 0.02);
}

:deep(.v-theme--dark .v-table--striped tbody tr:nth-of-type(even)) {
  background-color: rgba(255, 255, 255, 0.02);
}

/* Clickable rows styling when scores are available */
.clickable-rows :deep(tbody tr) {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.clickable-rows :deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.08) !important;
}

.forced-fail-item :deep(.v-list-item__content) {
  overflow: visible;
}

.forced-fail-item-title {
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.35;
}

.forced-fail-item-append {
  flex-wrap: nowrap;
}

@media (max-width: 960px) {
  .summary-stat-button {
    width: 100%;
  }
}
</style>
