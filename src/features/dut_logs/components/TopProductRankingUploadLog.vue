<template>
    <v-card class="mb-4">
        <v-card-title class="d-flex justify-space-between align-center">
            <div>
                <v-icon class="mr-2" color="warning">mdi-podium-gold</v-icon>
                Top Product Ranking by Overall Score
            </div>
            <div class="d-flex gap-2">
                <v-btn variant="tonal" color="primary" size="small" prepend-icon="mdi-database-plus"
                    :loading="savingToDb" :disabled="selectedRankingItems.length === 0"
                    @click="saveSelectedToDatabase">
                    Save to DB{{ selectedRankingItems.length > 0 ? ` (${selectedRankingItems.length})` : '' }}
                </v-btn>
                <v-btn variant="tonal" color="success" size="small" prepend-icon="mdi-microsoft-excel"
                    :loading="exportingRanking" @click="exportRankingToExcel">
                    Export{{ selectedRankingItems.length > 0 ? ` (${selectedRankingItems.length})` : '' }}
                </v-btn>
            </div>
        </v-card-title>

        <v-card-subtitle class="text-caption text-medium-emphasis pb-0">
            Rankings are based on overall scoring. ISNs with better scores appear first.
        </v-card-subtitle>

        <v-card-text>
            <!-- Ranking Table -->
            <v-card variant="outlined">
                <v-card-title class="bg-grey-lighten-4 d-flex align-center">
                    <v-icon class="mr-2">mdi-trophy</v-icon>
                    Complete Ranking
                    <v-chip class="ml-2" size="small">{{ filteredRankings.length }}</v-chip>
                    <v-spacer />
                    <v-icon size="large" color="primary" @click="fullscreen = true">mdi-fullscreen</v-icon>
                </v-card-title>

                <!-- Station Tabs -->
                <v-tabs v-model="stationTab" bg-color="grey-lighten-4" density="compact" show-arrows>
                    <v-tab value="all">All Stations</v-tab>
                    <v-tab v-for="station in availableStations" :key="station" :value="station">
                        {{ station }}
                        <v-chip class="ml-1" size="x-small" variant="tonal">{{ getStationCount(station) }}</v-chip>
                    </v-tab>
                </v-tabs>

                <!-- Search and Filters -->
                <v-row dense class="pa-2">
                    <v-col cols="12" md="4">
                        <v-text-field v-model="searchQuery" label="Search" placeholder="ISN, Device, Date..."
                            prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" clearable
                            hide-details />
                    </v-col>
                    <v-col cols="6" md="2">
                        <v-select v-model="scoreFilterType" :items="scoreFilterTypes" label="Score Filter"
                            variant="outlined" density="compact" clearable hide-details />
                    </v-col>
                    <v-col cols="6" md="2">
                        <v-text-field v-model.number="scoreFilterValue" label="Score Value" placeholder="e.g., 9"
                            type="number" variant="outlined" density="compact" clearable hide-details
                            :disabled="!scoreFilterType" />
                    </v-col>
                    <v-col cols="6" md="2">
                        <v-select v-model="resultFilter" :items="resultFilterOptions" label="Test Result"
                            variant="outlined" density="compact" clearable hide-details />
                    </v-col>
                </v-row>

                <v-card-text class="pa-0">
                    <!-- UPDATED: Added row click for test item details + checkbox selection -->
                    <v-data-table :headers="headers" :items="paginatedRankings" :items-per-page="itemsPerPage"
                        density="compact" fixed-header height="500" hide-default-footer striped="even"
                        class="cursor-pointer" show-select v-model="selectedRankingItems" item-value="row_id"
                        return-object @click:row="handleRowClick">
                        <template #item.rank="{ index }">
                            <span class="font-weight-bold">{{ (currentPage - 1) * getPerPage() + index + 1 }}</span>
                        </template>
                        <template #item.isn="{ item }">
                            <span class="text-body-2 font-weight-medium">{{ item.isn || 'N/A' }}</span>
                        </template>
                        <template #item.test_date="{ item }">
                            <span class="text-body-2">{{ formatTestDate(item.test_date) }}</span>
                        </template>
                        <template #item.duration="{ item }">
                            <span class="text-body-2">{{ formatDuration(item.duration_seconds) }}</span>
                        </template>
                        <template #item.station="{ item }">
                            <span class="text-body-2">{{ item.station }}</span>
                        </template>
                        <template #item.device="{ item }">
                            <span class="text-body-2">{{ item.device || 'N/A' }}</span>
                        </template>
                        <template #item.status="{ item }">
                            <v-chip size="small" :color="getStatusColor(item.status)" variant="tonal">
                                {{ item.status }}
                            </v-chip>
                        </template>
                        <template #item.result="{ item }">
                            <v-chip size="small" :color="getResultColor(item.result)" variant="flat">
                                {{ item.result || 'N/A' }}
                            </v-chip>
                        </template>
                        <template #item.score="{ item }">
                            <v-chip :color="getScoreColor(item.score)" size="small"
                                class="font-weight-bold cursor-pointer" @click.stop="showScoreBreakdownForIsn(item)">
                                {{ item.score.toFixed(2) }}
                                <v-icon size="x-small" end>mdi-information-outline</v-icon>
                            </v-chip>
                        </template>
                    </v-data-table>
                    <div class="d-flex align-center justify-space-between pa-2">
                        <div class="d-flex align-center gap-2">
                            <span class="text-caption text-medium-emphasis">Show</span>
                            <v-select v-model="itemsPerPage" :items="itemsPerPageOptions" variant="outlined"
                                class="mx-2" density="compact" hide-details />
                            <span class="text-caption text-medium-emphasis">items</span>
                        </div>
                        <v-pagination
                            v-if="itemsPerPage !== -1 && itemsPerPage !== 0 && filteredRankings.length > itemsPerPage"
                            v-model="currentPage" :length="totalPages" :total-visible="7" size="large"
                            density="compact" />
                        <div style="width: 150px;"></div>
                    </div>
                </v-card-text>
            </v-card>
        </v-card-text>

        <!-- Fullscreen Dialog -->
        <v-dialog v-model="fullscreen" fullscreen transition="dialog-bottom-transition">
            <v-card class="d-flex flex-column" style="height: 100vh; overflow: hidden;">
                <v-card-title class="d-flex justify-space-between align-center flex-shrink-0">
                    <div>
                        <v-icon class="mr-2">mdi-trophy</v-icon>
                        Complete Ranking
                    </div>
                    <v-btn icon="mdi-close" variant="text" @click="fullscreen = false" />
                </v-card-title>
                <!-- Station Tabs (Fullscreen) -->
                <v-tabs v-model="stationTab" bg-color="grey-lighten-4" density="compact" show-arrows class="flex-shrink-0">
                    <v-tab value="all">All Stations</v-tab>
                    <v-tab v-for="station in availableStations" :key="station" :value="station">
                        {{ station }}
                        <v-chip class="ml-1" size="x-small" variant="tonal">{{ getStationCount(station) }}</v-chip>
                    </v-tab>
                </v-tabs>

                <v-card-text class="pb-2 pt-3 flex-shrink-0">
                    <v-row dense>
                        <v-col cols="12" md="5">
                            <v-text-field v-model="searchQuery" label="Search" placeholder="ISN, Device, Date..."
                                prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" clearable
                                hide-details />
                        </v-col>
                        <v-col cols="6" md="3">
                            <v-select v-model="scoreFilterType" :items="scoreFilterTypes" label="Score Filter"
                                variant="outlined" density="compact" clearable hide-details />
                        </v-col>
                        <v-col cols="6" md="2">
                            <v-text-field v-model.number="scoreFilterValue" label="Score Value" placeholder="e.g., 9"
                                type="number" variant="outlined" density="compact" clearable hide-details
                                :disabled="!scoreFilterType" />
                        </v-col>
                        <v-col cols="6" md="2">
                            <v-select v-model="resultFilter" :items="resultFilterOptions" label="Test Result"
                                variant="outlined" density="compact" clearable hide-details />
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-card-text class="pa-0 flex-grow-1 d-flex flex-column" style="overflow: hidden;">
                    <div class="flex-grow-1" style="overflow: auto;">
                        <v-data-table :headers="headers" :items="paginatedRankings" :items-per-page="itemsPerPage"
                            :height="'calc(100vh - 200px)'" fixed-header density="compact" hide-default-footer
                            striped="even">
                            <template #item.rank="{ index }">
                                <span class="font-weight-bold">{{ (currentPage - 1) * getPerPage() + index + 1 }}</span>
                            </template>
                            <template #item.isn="{ item }">
                                <span class="text-body-2 font-weight-medium">{{ item.isn || 'N/A' }}</span>
                            </template>
                            <template #item.test_date="{ item }">
                                <span class="text-body-2">{{ formatTestDate(item.test_date) }}</span>
                            </template>
                            <template #item.duration="{ item }">
                                <span class="text-body-2">{{ formatDuration(item.duration_seconds) }}</span>
                            </template>
                            <template #item.station="{ item }">
                                <span class="text-body-2">{{ item.station }}</span>
                            </template>
                            <template #item.device="{ item }">
                                <span class="text-body-2">{{ item.device || 'N/A' }}</span>
                            </template>
                            <template #item.status="{ item }">
                                <v-chip size="small" :color="getStatusColor(item.status)" variant="tonal">
                                    {{ item.status }}
                                </v-chip>
                            </template>
                            <template #item.result="{ item }">
                                <v-chip size="small" :color="getResultColor(item.result)" variant="flat">
                                    {{ item.result || 'N/A' }}
                                </v-chip>
                            </template>
                            <template #item.score="{ item }">
                                <v-chip :color="getScoreColor(item.score)" size="small" class="font-weight-bold">
                                    {{ item.score.toFixed(2) }}
                                </v-chip>
                            </template>
                        </v-data-table>
                    </div>
                    <div class="flex-shrink-0 pa-2" style="border-top: 1px solid rgba(0,0,0,0.12);">
                        <div class="d-flex align-center justify-space-between">
                            <div class="d-flex align-center gap-2">
                                <span class="text-caption text-medium-emphasis">Show</span>
                                <v-select v-model="itemsPerPage" :items="itemsPerPageOptions" class="mx-2"
                                    variant="outlined" density="compact" size="small" hide-details />
                                <span class="text-caption text-medium-emphasis">items</span>
                            </div>
                            <v-pagination
                                v-if="itemsPerPage !== -1 && itemsPerPage !== 0 && filteredRankings.length > itemsPerPage"
                                v-model="currentPage" :length="totalPages" :total-visible="5" size="large"
                                density="compact" />
                            <div style="width: 150px;"></div>
                        </div>
                    </div>
                </v-card-text>
            </v-card>
        </v-dialog>

        <!-- UPDATED: Test Items Detail Dialog - Matching TopProductIplasDetailsDialog pattern -->
        <v-dialog v-model="showTestItemsDialog" :fullscreen="testItemsFullscreen"
            :max-width="testItemsFullscreen ? undefined : 1200"
            :transition="testItemsFullscreen ? 'dialog-bottom-transition' : 'dialog-transition'">
            <v-card v-if="selectedRankingItem" class="d-flex flex-column"
                :style="{ height: testItemsFullscreen ? '100vh' : '90vh', overflow: 'hidden' }">
                <!-- Sticky Header Container -->
                <div class="dialog-sticky-header flex-shrink-0"
                    style="z-index: 10; background-color: rgb(var(--v-theme-surface));">
                    <v-card-title class="d-flex justify-space-between align-center flex-shrink-0 bg-primary pa-2 py-1">
                        <div class="d-flex align-center">
                            <v-icon class="mr-2" color="white" size="small">mdi-format-list-checks</v-icon>
                            <span class="text-white text-body-1">Test Items Details</span>
                        </div>
                        <div class="d-flex align-center gap-2">
                            <v-btn variant="outlined" color="white" size="x-small"
                                prepend-icon="mdi-database-plus" @click="saveSingleToDatabase"
                                :loading="savingToDb">
                                Save to DB
                            </v-btn>
                            <v-btn v-if="selectedRankingItem?.isn" variant="outlined" color="white" size="x-small"
                                prepend-icon="mdi-compare-horizontal" @click="openIplasCompare">
                                Compare iPLAS
                            </v-btn>
                            <v-btn :icon="testItemsFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'" variant="text"
                                color="white" size="small" @click="testItemsFullscreen = !testItemsFullscreen"
                                :title="testItemsFullscreen ? 'Exit Fullscreen' : 'Fullscreen'" />
                            <v-btn icon="mdi-close" variant="text" color="white" size="small"
                                @click="showTestItemsDialog = false" />
                        </div>
                    </v-card-title>

                    <!-- DUT Information Section -->
                    <div class="flex-shrink-0 px-3 py-2">
                        <!-- Primary Information -->
                        <v-card variant="tonal" color="primary" class="mb-3">
                            <v-card-text class="py-3">
                                <v-row dense>
                                    <v-col cols="12" md="6">
                                        <div class="d-flex align-center cursor-pointer"
                                            @click="copyIsnToClipboard(selectedRankingItem.isn)">
                                            <v-icon size="large" class="mr-3" color="primary">mdi-barcode</v-icon>
                                            <div>
                                                <div class="text-caption text-medium-emphasis">DUT ISN</div>
                                                <div class="text-h6 font-weight-bold">{{ selectedRankingItem.isn || 'N/A' }}</div>
                                            </div>
                                            <v-tooltip activator="parent" location="top">Click to copy ISN</v-tooltip>
                                        </div>
                                    </v-col>
                                    <v-col cols="12" md="6">
                                        <div class="d-flex align-center">
                                            <v-icon size="large" class="mr-3" color="primary">mdi-factory</v-icon>
                                            <div>
                                                <div class="text-caption text-medium-emphasis">Station</div>
                                                <div class="text-h6 font-weight-bold">{{ selectedRankingItem.station }}</div>
                                            </div>
                                        </div>
                                    </v-col>
                                </v-row>
                            </v-card-text>
                        </v-card>

                        <!-- Device & Identifiers -->
                        <v-card variant="outlined" class="mb-3">
                            <v-card-text class="py-2">
                                <v-row dense>
                                    <v-col cols="12" md="4">
                                        <div class="d-flex align-center">
                                            <v-icon size="small" class="mr-2">mdi-chip</v-icon>
                                            <span class="text-body-2">
                                                <strong>Device:</strong>
                                                <span class="ml-2 font-mono">{{ selectedRankingItem.device || 'N/A' }}</span>
                                            </span>
                                        </div>
                                    </v-col>
                                    <v-col cols="12" md="4">
                                        <div class="d-flex align-center">
                                            <v-icon size="small" class="mr-2">mdi-calendar</v-icon>
                                            <span class="text-body-2">
                                                <strong>Test Date:</strong>
                                                <span class="ml-2">{{ formatTestDate(selectedRankingItem.test_date) }}</span>
                                            </span>
                                        </div>
                                    </v-col>
                                    <v-col cols="12" md="4">
                                        <div class="d-flex align-center">
                                            <v-icon size="small" class="mr-2">mdi-timer</v-icon>
                                            <span class="text-body-2">
                                                <strong>Duration:</strong>
                                                <span class="ml-2">{{ formatDuration(selectedRankingItem.duration_seconds) }}</span>
                                            </span>
                                        </div>
                                    </v-col>
                                </v-row>
                            </v-card-text>
                        </v-card>

                        <!-- Status Chips & Score -->
                        <div class="d-flex align-center flex-wrap gap-2 text-caption">
                            <v-chip size="small" variant="tonal" color="info" prepend-icon="mdi-list-box" label>
                                <span class="text-medium-emphasis mr-1">Test Items:</span>
                                {{ selectedTestItems.length }}
                            </v-chip>
                            <v-chip size="small" :color="getStatusColor(selectedRankingItem.status)"
                                :prepend-icon="selectedRankingItem.status === 'PASS' ? 'mdi-check-circle' : 'mdi-alert-circle'" label>
                                <span class="text-medium-emphasis mr-1">SFIS Status:</span>
                                {{ selectedRankingItem.status }}
                            </v-chip>
                            <v-chip size="small" :color="getResultColor(selectedRankingItem.result)"
                                prepend-icon="mdi-flag-checkered" label>
                                <span class="text-medium-emphasis mr-1">Result:</span>
                                {{ selectedRankingItem.result || 'N/A' }}
                            </v-chip>
                            <v-spacer />
                            <v-chip color="primary" variant="tonal" prepend-icon="mdi-chart-line">
                                <strong>Overall Score:</strong>&nbsp;
                                <v-chip :color="getScoreColor(selectedRankingItem.score)" size="x-small" class="ml-1">
                                    {{ selectedRankingItem.score.toFixed(2) }}
                                </v-chip>
                            </v-chip>
                        </div>
                    </div>

                    <v-divider class="flex-shrink-0" />
                </div>
                <!-- End Sticky Header Container -->

                <!-- Search and Filter Controls (Fixed, non-scrollable) -->
                <v-card-text class="pb-2 pt-2 flex-shrink-0">
                    <v-row dense>
                        <v-col cols="12" md="4">
                            <v-text-field v-model="testItemSearch" label="Search Test Items"
                                prepend-inner-icon="mdi-magnify" variant="outlined" density="compact"
                                hide-details clearable placeholder="Search by name..." />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-select v-model="testItemFilterType" :items="testItemFilterOptions" label="Filter Items"
                                variant="outlined" density="compact" prepend-inner-icon="mdi-filter" hide-details />
                        </v-col>
                        <v-col cols="12" md="4" class="d-flex align-center justify-space-between">
                            <v-chip size="small" variant="tonal">
                                {{ filteredTestItems.length }} / {{ selectedTestItems.length }} items
                            </v-chip>
                            <v-btn v-if="testItemFilterType !== 'all' || testItemSearch" size="small" variant="text"
                                color="primary" @click="resetTestItemFilters">
                                <v-icon start size="small">mdi-filter-off</v-icon>
                                Clear Filters
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-card-text>

                <!-- Data Table Container -->
                <div class="flex-grow-1" :style="{ minHeight: 0, overflow: testItemsFullscreen ? 'hidden' : 'auto' }">
                    <v-data-table :headers="testItemHeaders" :items="filteredTestItems" :items-per-page="50"
                        density="comfortable" fixed-header fixed-footer style="height: 100%;"
                        class="elevation-1 v-table--striped clickable-rows"
                        @click:row="(_event: unknown, data: any) => showScoreBreakdown(data.item)">
                        <template #item.test_item="{ item }">
                            <span class="font-weight-medium">{{ item.test_item }}</span>
                        </template>
                        <template #item.value="{ item }">
                            <span>{{ item.value }}</span>
                        </template>
                        <template #item.usl="{ item }">
                            <span class="text-medium-emphasis">{{ item.usl ?? '-' }}</span>
                        </template>
                        <template #item.lsl="{ item }">
                            <span class="text-medium-emphasis">{{ item.lsl ?? '-' }}</span>
                        </template>
                        <template #item.score="{ item }">
                            <v-chip v-if="item.score !== null" :color="getScoreColor(item.score)" size="small"
                                class="font-weight-bold cursor-pointer" @click.stop="showScoreBreakdown(item)">
                                {{ item.score?.toFixed(2) }}
                                <v-icon size="x-small" end>mdi-information-outline</v-icon>
                            </v-chip>
                            <span v-else class="text-medium-emphasis">-</span>
                        </template>
                    </v-data-table>
                </div>
            </v-card>
        </v-dialog>

        <!-- UPDATED: iPLAS Comparison Dialog -->
        <!-- UPDATED: Pass scoring configs for unified scoring between upload log and iPLAS -->
        <IplasCompareDialog v-model="showIplasCompareDialog" :isn="comparisonIsn"
            :upload-test-items="selectedTestItems" :scoring-configs="scoringConfigs" />

        <!-- UPDATED: Score Breakdown Dialog (Universal Scoring) -->
        <v-dialog v-model="showBreakdownDialog" :fullscreen="breakdownFullscreen"
            :max-width="breakdownFullscreen ? undefined : 650" scrollable
            :transition="breakdownFullscreen ? 'dialog-bottom-transition' : undefined">
            <v-card v-if="selectedTestItem">
                <v-card-title class="d-flex align-center bg-info">
                    <v-icon start color="white">mdi-calculator-variant</v-icon>
                    <span class="text-white">Score Breakdown</span>
                    <v-spacer />
                    <v-btn :icon="breakdownFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'" variant="text"
                        color="white" @click="breakdownFullscreen = !breakdownFullscreen" />
                    <v-btn icon="mdi-close" variant="text" color="white" @click="showBreakdownDialog = false" />
                </v-card-title>

                <v-card-text class="pa-4">
                    <!-- Test Item Info -->
                    <v-card variant="tonal" class="mb-4">
                        <v-card-text>
                            <div class="text-h6 mb-2">{{ selectedTestItem.test_item }}</div>
                            <v-row dense>
                                <v-col cols="4">
                                    <div class="text-caption text-medium-emphasis">Actual Value</div>
                                    <div class="text-h6 font-weight-bold">{{ selectedTestItem.value }}</div>
                                </v-col>
                                <v-col cols="4">
                                    <div class="text-caption text-medium-emphasis">Score</div>
                                    <div class="text-h6 font-weight-bold">
                                        <v-chip :color="getScoreColor(selectedTestItem.score ?? 0)" size="small">
                                            {{ selectedTestItem.score?.toFixed(2) ?? 'N/A' }}
                                        </v-chip>
                                    </div>
                                </v-col>
                                <v-col cols="4">
                                    <div class="text-caption text-medium-emphasis">Scoring Type</div>
                                    <v-chip :color="getScoringTypeColor(selectedTestItem.score_breakdown?.scoring_type ?? '')"
                                        size="small">
                                        {{ selectedTestItem.score_breakdown?.scoring_type ?? 'N/A' }}
                                    </v-chip>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>

                    <!-- Breakdown Details Table -->
                    <v-table density="compact">
                        <tbody>
                            <tr>
                                <td class="font-weight-medium">Scoring Type</td>
                                <td>
                                    <v-chip size="small" :color="getScoringTypeColor(selectedTestItem.score_breakdown?.scoring_type ?? '')">
                                        {{ selectedTestItem.score_breakdown?.scoring_type }}
                                    </v-chip>
                                </td>
                            </tr>
                            <tr v-if="selectedTestItem.score_breakdown?.ucl !== null && selectedTestItem.score_breakdown?.ucl !== undefined">
                                <td class="font-weight-medium">UCL (Upper Limit)</td>
                                <td>{{ selectedTestItem.score_breakdown.ucl }}</td>
                            </tr>
                            <tr v-if="selectedTestItem.score_breakdown?.lcl !== null && selectedTestItem.score_breakdown?.lcl !== undefined">
                                <td class="font-weight-medium">LCL (Lower Limit)</td>
                                <td>{{ selectedTestItem.score_breakdown.lcl }}</td>
                            </tr>
                            <tr v-if="selectedTestItem.score_breakdown?.target !== null && selectedTestItem.score_breakdown?.target !== undefined">
                                <td class="font-weight-medium">Target</td>
                                <td class="font-weight-bold text-primary">{{ selectedTestItem.score_breakdown.target?.toFixed(2) }}</td>
                            </tr>
                            <tr v-if="selectedTestItem.score_breakdown?.actual !== null && selectedTestItem.score_breakdown?.actual !== undefined">
                                <td class="font-weight-medium">Actual Value</td>
                                <td class="font-weight-bold">{{ selectedTestItem.score_breakdown.actual }}</td>
                            </tr>
                            <tr v-if="selectedTestItem.score_breakdown?.deviation !== null && selectedTestItem.score_breakdown?.deviation !== undefined">
                                <td class="font-weight-medium">Deviation</td>
                                <td :class="Math.abs(selectedTestItem.score_breakdown.deviation!) > 1 ? 'text-error font-weight-bold' : ''">
                                    {{ selectedTestItem.score_breakdown.deviation?.toFixed(2) }}
                                </td>
                            </tr>
                            <tr v-if="selectedTestItem.score_breakdown?.policy">
                                <td class="font-weight-medium">Policy</td>
                                <td>
                                    <v-chip size="x-small" variant="tonal">{{ selectedTestItem.score_breakdown.policy }}</v-chip>
                                </td>
                            </tr>
                            <tr>
                                <td class="font-weight-medium">Weight</td>
                                <td>{{ selectedTestItem.score_breakdown?.weight ?? 1.0 }}</td>
                            </tr>
                            <tr class="bg-surface-variant">
                                <td class="font-weight-bold">Score (0-10)</td>
                                <td class="font-weight-bold">
                                    <v-chip :color="getScoreColor(selectedTestItem.score_breakdown?.score ?? 0)" size="small">
                                        {{ selectedTestItem.score_breakdown?.score?.toFixed(2) ?? 'N/A' }}
                                    </v-chip>
                                </td>
                            </tr>
                        </tbody>
                    </v-table>
                </v-card-text>

                <v-card-actions>
                    <v-spacer />
                    <v-btn color="primary" variant="text" @click="showBreakdownDialog = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- Custom Items Per Page Dialog -->
        <v-dialog v-model="showCustomInput" max-width="400">
            <v-card>
                <v-card-title>Custom Items Per Page</v-card-title>
                <v-card-text>
                    <v-text-field v-model.number="customItemsPerPage" type="number" label="Enter number of items"
                        variant="outlined" density="comfortable" min="1" autofocus
                        @keyup.enter="applyCustomItemsPerPage" />
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn text @click="cancelCustomInput">Cancel</v-btn>
                    <v-btn color="primary" variant="elevated" @click="applyCustomItemsPerPage">Apply</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-card>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { computed, ref, watch } from 'vue'
import type {
  CompareResponseEnhanced,
  ParsedTestItemEnhanced,
  RescoreScoringConfig,
  TestLogParseResponseEnhanced,
} from '@/features/dut_logs/composables/useTestLogUpload'
import {
  createTopProduct,
  createTopProductsBulk,
  type TopProductCreate,
  type TopProductMeasurementCreate,
} from '@/features/top-products/api/topProductsApi'
import { getApiErrorDetail } from '@/shared'
import { useNotification } from '@/shared/composables/useNotification'

dayjs.extend(utc)
dayjs.extend(timezone)

const { showSuccess, showError } = useNotification()

const props = defineProps<{
  parseResult?: TestLogParseResponseEnhanced | null
  compareResult?: CompareResponseEnhanced | null
  scoringConfigs?: RescoreScoringConfig[]
}>()

interface RankingItem {
  row_id: string // Unique ID combining ISN and station
  isn: string | null
  test_date: string | null
  duration_seconds: number | null
  station: string
  device: string | null
  status: string
  result: string | null
  score: number
}

// Search and filters
const searchQuery = ref('')
const stationTab = ref('all') // Station tabs: 'all' or specific station name
const stationFilter = ref<string | null>(null) // Keep for backward compatibility
const scoreFilterType = ref<string | null>(null)
const scoreFilterValue = ref<number | null>(null)
const resultFilter = ref<string | null>(null)
const fullscreen = ref(false)

// Checkbox selection and export state
const selectedRankingItems = ref<RankingItem[]>([])
const exportingRanking = ref(false)
const savingToDb = ref(false)

// UPDATED: Test items detail dialog state
const showTestItemsDialog = ref(false)
const testItemsFullscreen = ref(false)
const selectedRankingItem = ref<RankingItem | null>(null)
const selectedTestItems = ref<ParsedTestItemEnhanced[]>([])

// UPDATED: Score breakdown dialog state
const showBreakdownDialog = ref(false)
const breakdownFullscreen = ref(false)
const selectedTestItem = ref<ParsedTestItemEnhanced | null>(null)

// UPDATED: iPLAS comparison dialog state
const showIplasCompareDialog = ref(false)
const comparisonIsn = ref<string | null>(null)

// Test items filter state
const testItemFilterType = ref<string>('all')
const testItemSearch = ref('')
const testItemFilterOptions = [
  { title: 'Show All', value: 'all' },
  { title: 'Criteria Items', value: 'criteria' },
  { title: 'Non-Criteria Items', value: 'non-criteria' },
]

// Filtered test items
const filteredTestItems = computed(() => {
  let items = selectedTestItems.value

  // Filter by type - Criteria = has UCL or LCL, Non-Criteria = no UCL and no LCL
  if (testItemFilterType.value === 'criteria') {
    items = items.filter((item) => item.usl !== null || item.lsl !== null)
  } else if (testItemFilterType.value === 'non-criteria') {
    items = items.filter((item) => item.usl === null && item.lsl === null)
  }

  // Filter by search
  if (testItemSearch.value) {
    const query = testItemSearch.value.toLowerCase()
    items = items.filter((item) => item.test_item.toLowerCase().includes(query))
  }

  return items
})

// Reset test item filters
const resetTestItemFilters = () => {
  testItemFilterType.value = 'all'
  testItemSearch.value = ''
}

// Test Items Headers
const testItemHeaders = [
  { title: 'Test Item', key: 'test_item', sortable: true },
  { title: 'Value', key: 'value', sortable: true, width: '120px' },
  { title: 'UCL', key: 'usl', sortable: true, width: '100px' },
  { title: 'LCL', key: 'lsl', sortable: true, width: '100px' },
  { title: 'Score', key: 'score', sortable: true, width: '120px', align: 'center' as const },
]

// Pagination
const itemsPerPage = ref(10)
const currentPage = ref(1)
const itemsPerPageOptions = [
  { title: '5', value: 5 },
  { title: '10', value: 10 },
  { title: '25', value: 25 },
  { title: '50', value: 50 },
  { title: '100', value: 100 },
  { title: 'All', value: -1 },
  { title: 'Custom', value: 0 },
]
const showCustomInput = ref(false)
const customItemsPerPage = ref(10)

// Filter options
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

// Headers
const headers = [
  { title: 'Rank', key: 'rank', sortable: false, width: '100px', align: 'center' as const },
  { title: 'DUT ISN', key: 'isn', sortable: true, width: '180px' },
  { title: 'Test Date', key: 'test_date', sortable: true, width: '150px' },
  { title: 'Duration', key: 'duration', sortable: true, width: '120px', align: 'center' as const },
  { title: 'Test Station', key: 'station', sortable: true, width: '150px' },
  { title: 'Device', key: 'device', sortable: true, width: '150px' },
  { title: 'Status', key: 'status', sortable: true, width: '120px', align: 'center' as const },
  { title: 'Test Result', key: 'result', sortable: true, width: '120px', align: 'center' as const },
  {
    title: 'Overall Score',
    key: 'score',
    sortable: true,
    width: '150px',
    align: 'center' as const,
  },
]

// Generate rankings from results
const rankings = computed<RankingItem[]>(() => {
  const items: RankingItem[] = []

  if (props.parseResult?.metadata) {
    // Single file parsing mode
    const isn = props.parseResult.isn || 'unknown'
    const station = props.parseResult.station || 'Unknown'
    items.push({
      row_id: `${isn}_${station}`,
      isn: props.parseResult.isn,
      test_date: props.parseResult.metadata.test_date,
      duration_seconds: props.parseResult.metadata.duration_seconds,
      station: station,
      device: props.parseResult.metadata.device,
      status: props.parseResult.metadata.sfis_status || 'Unknown',
      result: props.parseResult.metadata.result,
      score: props.parseResult.avg_score || 0,
    })
  } else if (props.compareResult) {
    // Multiple files comparison mode - use file_summaries for metadata
    if (props.compareResult.file_summaries) {
      props.compareResult.file_summaries.forEach((fileSummary) => {
        const isn = fileSummary.isn || 'unknown'
        const station = fileSummary.metadata.station || 'Unknown'
        items.push({
          row_id: `${isn}_${station}`,
          isn: fileSummary.isn,
          test_date: fileSummary.metadata.test_date,
          duration_seconds: fileSummary.metadata.duration_seconds,
          station: station,
          device: fileSummary.metadata.device,
          status: fileSummary.metadata.sfis_status || 'Unknown',
          result: fileSummary.metadata.result,
          score: fileSummary.avg_score || 0,
        })
      })
    }
  }

  // Sort by score (descending)
  return items.sort((a, b) => b.score - a.score)
})

// Available stations for filtering (derived from rankings)
const availableStations = computed(() => {
  const stations = new Set<string>()
  rankings.value.forEach((item) => {
    if (item.station) {
      stations.add(item.station)
    }
  })
  return Array.from(stations).sort()
})

// Get count of items for a specific station
function getStationCount(station: string): number {
  return rankings.value.filter((item) => item.station === station).length
}

// Filtered rankings
const filteredRankings = computed(() => {
  let filtered = rankings.value

  // Station tab filter (replaces dropdown filter)
  if (stationTab.value && stationTab.value !== 'all') {
    filtered = filtered.filter((item) => item.station === stationTab.value)
  }

  // Search filter
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

  // Score filter
  if (scoreFilterType.value && scoreFilterValue.value !== null) {
    filtered = filtered.filter((item) => {
      // biome-ignore lint/style/noNonNullAssertion: scoreFilterValue !== null is checked in outer condition
      if (scoreFilterType.value === 'gt') return item.score > scoreFilterValue.value!
      // biome-ignore lint/style/noNonNullAssertion: scoreFilterValue !== null is checked in outer condition
      if (scoreFilterType.value === 'lt') return item.score < scoreFilterValue.value!
      if (scoreFilterType.value === 'eq')
        // biome-ignore lint/style/noNonNullAssertion: scoreFilterValue !== null is checked in outer condition
        return Math.abs(item.score - scoreFilterValue.value!) < 0.01
      return true
    })
  }

  // Result filter
  if (resultFilter.value) {
    filtered = filtered.filter((item) => item.result === resultFilter.value)
  }

  return filtered
})

// Pagination
const getPerPage = () => {
  return itemsPerPage.value === -1
    ? filteredRankings.value.length
    : itemsPerPage.value === 0
      ? 10
      : itemsPerPage.value
}

const totalPages = computed(() => {
  return Math.ceil(filteredRankings.value.length / getPerPage())
})

const paginatedRankings = computed(() => {
  const perPage = getPerPage()
  const start = (currentPage.value - 1) * perPage
  const end = start + perPage
  return filteredRankings.value.slice(start, end)
})

// Watchers
watch([searchQuery, stationFilter, scoreFilterType, scoreFilterValue, resultFilter], () => {
  currentPage.value = 1
})

watch(itemsPerPage, (newVal) => {
  if (newVal === 0) {
    showCustomInput.value = true
  } else {
    showCustomInput.value = false
    currentPage.value = 1
  }
})

// Methods
const applyCustomItemsPerPage = () => {
  if (customItemsPerPage.value > 0) {
    itemsPerPage.value = customItemsPerPage.value
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
    // Parse as UTC and convert to user's local timezone
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
  if (score >= 9) return 'success' // 9-10: green
  if (score >= 7) return 'info' // 7-8.99: blue
  if (score >= 6) return 'warning' // 6-6.99: yellow/orange
  return 'error' // <6: red
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

// Copy ISN to clipboard with toast notification
const copyIsnToClipboard = async (isn: string | null) => {
  if (!isn) return
  try {
    await navigator.clipboard.writeText(isn)
    showSuccess('ISN copied to clipboard')
  } catch (err) {
    console.error('Failed to copy ISN:', err)
  }
}

// UPDATED: Handle row click to show test items dialog
const handleRowClick = (_event: unknown, data: { item: RankingItem }) => {
  const item = data.item
  selectedRankingItem.value = item

  // Get test items for this ISN
  if (props.parseResult?.parsed_items_enhanced) {
    // Single parsing mode - show all test items
    selectedTestItems.value = props.parseResult.parsed_items_enhanced
  } else if (props.compareResult) {
    // Compare mode - get test items for this ISN from comparison data
    const isnTestItems: ParsedTestItemEnhanced[] = []

    // Get value items
    if (props.compareResult.comparison_value_items) {
      props.compareResult.comparison_value_items.forEach((compareItem) => {
        const perIsnData = compareItem.per_isn_data.find((d) => d.isn === item.isn)
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
    }

    // Get non-value items
    if (props.compareResult.comparison_non_value_items) {
      props.compareResult.comparison_non_value_items.forEach((compareItem) => {
        const perIsnData = compareItem.per_isn_data.find((d) => d.isn === item.isn)
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
    }

    selectedTestItems.value = isnTestItems
  }

  showTestItemsDialog.value = true
}

// UPDATED: Show score breakdown for a test item
const showScoreBreakdown = (item: ParsedTestItemEnhanced) => {
  if (item.score_breakdown) {
    selectedTestItem.value = item
    showBreakdownDialog.value = true
  }
}

// UPDATED: Show aggregated score breakdown info for an ISN (overall summary)
const showScoreBreakdownForIsn = (_item: RankingItem) => {
  // For now, just open the test items dialog
  // The user can then click on individual test items to see breakdown
  handleRowClick(null, { item: _item })
}

// UPDATED: Open iPLAS comparison dialog
const openIplasCompare = () => {
  if (selectedRankingItem.value?.isn) {
    comparisonIsn.value = selectedRankingItem.value.isn
    showIplasCompareDialog.value = true
  }
}

/**
 * Export ranking data to Excel
 */
async function exportRankingToExcel() {
  exportingRanking.value = true
  try {
    // Use selected items if any, otherwise export all filtered rankings
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

    // Generate filename with timestamp
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
  } catch (err: unknown) {
    console.error('Export failed:', err)
  } finally {
    exportingRanking.value = false
  }
}

/**
 * Build TopProductCreate data from a RankingItem and its test items
 */
function buildTopProductData(
  rankingItem: RankingItem,
  testItems: ParsedTestItemEnhanced[],
): TopProductCreate {
  // Build measurements from test items
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

/**
 * Get test items for a specific ISN from compare/parse results
 */
function getTestItemsForIsn(isn: string | null): ParsedTestItemEnhanced[] {
  if (!isn) return []

  if (props.parseResult?.parsed_items_enhanced) {
    return props.parseResult.parsed_items_enhanced
  }

  if (props.compareResult) {
    const items: ParsedTestItemEnhanced[] = []

    // Get value items
    props.compareResult.comparison_value_items?.forEach((compareItem) => {
      const perIsnData = compareItem.per_isn_data.find((d) => d.isn === isn)
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

    // Get non-value items
    props.compareResult.comparison_non_value_items?.forEach((compareItem) => {
      const perIsnData = compareItem.per_isn_data.find((d) => d.isn === isn)
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

/**
 * Save a single ISN to the Top Product Database (from the Test Items dialog)
 */
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
  } catch (err: unknown) {
    console.error('Failed to save to database:', err)
    showError(getApiErrorDetail(err, 'Failed to save to database'))
  } finally {
    savingToDb.value = false
  }
}

/**
 * Save selected ISNs to the Top Product Database (bulk save)
 */
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
  } catch (err: unknown) {
    console.error('Failed to save to database:', err)
    showError(getApiErrorDetail(err, 'Failed to save to database'))
  } finally {
    savingToDb.value = false
  }
}
</script>
