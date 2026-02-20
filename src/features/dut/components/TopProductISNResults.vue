<template>
    <div>
        <!-- Measurement Details Dialog -->
        <v-dialog v-model="measurementDialog" :max-width="isFullscreen ? undefined : '1200px'"
            :fullscreen="isFullscreen" :transition="isFullscreen ? 'dialog-bottom-transition' : 'dialog-transition'">
            <v-card class="d-flex flex-column" :style="{ height: isFullscreen ? '100vh' : '90vh', overflow: 'hidden' }">
                <!-- Sticky Header Container: Title + DUT Info -->
                <div class="dialog-sticky-header flex-shrink-0"
                    style="z-index: 10; background-color: rgb(var(--v-theme-surface));">
                    <v-card-title class="d-flex justify-space-between align-center flex-shrink-0">
                        <div>
                            <v-icon class="mr-2">mdi-table-eye</v-icon>
                            Measurement Details
                        </div>
                        <div class="d-flex align-center">
                            <v-btn :icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'" variant="text"
                                @click="isFullscreen = !isFullscreen"
                                :title="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'" />
                            <v-btn icon="mdi-close" variant="text" @click="measurementDialog = false" />
                        </div>
                    </v-card-title>

                    <!-- DUT Information Section -->
                    <div class="flex-shrink-0">
                        <v-card-subtitle v-if="selectedMeasurement" class="pa-4 py-2">
                            <!-- Primary Information Card -->
                            <v-card variant="tonal" color="primary" class="mb-3">
                                <v-card-text class="py-3">
                                    <v-row dense>
                                        <v-col cols="12" md="6">
                                            <div class="d-flex align-center">
                                                <v-icon size="large" class="mr-3" color="primary">mdi-barcode</v-icon>
                                                <div>
                                                    <div class="text-caption text-medium-emphasis">DUT ISN</div>
                                                    <div class="text-h6 font-weight-bold">
                                                        {{ selectedMeasurement.dutISN }}
                                                    </div>
                                                </div>
                                            </div>
                                        </v-col>
                                        <v-col cols="12" md="6">
                                            <div class="d-flex align-center">
                                                <v-icon size="large" class="mr-3" color="primary">mdi-factory</v-icon>
                                                <div>
                                                    <div class="text-caption text-medium-emphasis">Station</div>
                                                    <div class="text-h6 font-weight-bold">
                                                        {{ selectedMeasurement.station.station_name }}
                                                    </div>
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
                                        <v-col cols="12" md="6">
                                            <div class="d-flex align-center">
                                                <v-icon size="small" class="mr-2">mdi-identifier</v-icon>
                                                <span class="text-body-2">
                                                    <strong>SN Reference:</strong>
                                                    <v-chip v-if="loadingIdentifiers" size="x-small" class="ml-2"
                                                        disabled>
                                                        <v-progress-circular indeterminate size="12" width="2"
                                                            class="mr-1" />
                                                        Loading...
                                                    </v-chip>
                                                    <v-menu v-else-if="otherLinkedISNs.length > 0" open-on-hover>
                                                        <template #activator="{ props: menuProps }">
                                                            <v-chip v-bind="menuProps" size="small" color="primary"
                                                                variant="outlined" class="ml-2"
                                                                prepend-icon="mdi-link-variant">
                                                                {{ allLinkedISNs.length }} Linked ISNs
                                                                <v-icon size="small" class="ml-1">mdi-menu-down</v-icon>
                                                            </v-chip>
                                                        </template>
                                                        <v-list density="compact">
                                                            <v-list-subheader>Other Linked Serial
                                                                Numbers</v-list-subheader>
                                                            <v-list-item v-for="(identifier, idx) in otherLinkedISNs"
                                                                :key="idx" :title="identifier"
                                                                prepend-icon="mdi-barcode">
                                                                <template #append>
                                                                    <v-btn icon="mdi-content-copy" size="x-small"
                                                                        variant="text"
                                                                        @click="copyToClipboard(identifier)" />
                                                                </template>
                                                            </v-list-item>
                                                        </v-list>
                                                    </v-menu>
                                                    <span v-else class="ml-2 font-mono">
                                                        {{ selectedMeasurement.dutISN }}
                                                    </span>
                                                </span>
                                            </div>
                                        </v-col>
                                        <v-col cols="12" md="6">
                                            <div class="d-flex align-center">
                                                <v-icon size="small" class="mr-2">mdi-devices</v-icon>
                                                <span class="text-body-2">
                                                    <strong>Device:</strong>
                                                    <span class="ml-2">{{ selectedMeasurement.station.device || 'N/A' }}</span>
                                                </span>
                                            </div>
                                        </v-col>
                                    </v-row>
                                </v-card-text>
                            </v-card>

                            <!-- Score & Timing Row -->
                            <v-row dense class="mb-2">
                                <v-col cols="12" sm="6" md="3">
                                    <v-card variant="outlined" class="h-100">
                                        <v-card-text class="py-2">
                                            <div class="d-flex align-center">
                                                <v-icon size="small" class="mr-2">mdi-calendar-clock</v-icon>
                                                <div class="text-body-2">
                                                    <div><strong>Test Date</strong></div>
                                                    <div class="text-caption">
                                                        {{ formatDate(selectedMeasurement.station.test_date) }}
                                                    </div>
                                                </div>
                                            </div>
                                        </v-card-text>
                                    </v-card>
                                </v-col>
                                <v-col cols="12" sm="6" md="3">
                                    <v-card variant="outlined" class="h-100">
                                        <v-card-text class="py-2">
                                            <div class="d-flex align-center">
                                                <v-icon size="small" class="mr-2">mdi-timer</v-icon>
                                                <div class="text-body-2">
                                                    <div><strong>Test Duration</strong></div>
                                                    <div class="text-body-2 font-weight-medium">
                                                        {{ selectedMeasurement.station.test_duration
                                                            ? `${selectedMeasurement.station.test_duration.toFixed(2)}s`
                                                            : 'N/A' }}
                                                    </div>
                                                </div>
                                            </div>
                                        </v-card-text>
                                    </v-card>
                                </v-col>
                                <v-col cols="12" sm="6" md="3">
                                    <v-card variant="outlined" class="h-100">
                                        <v-card-text class="py-2">
                                            <div class="d-flex align-center justify-space-between">
                                                <div class="d-flex align-center">
                                                    <v-icon size="small" class="mr-2 pt-5">mdi-check-circle</v-icon>
                                                    <strong>Test Results:</strong>
                                                    <v-chip size="x-small" color="primary"
                                                        class="font-weight-bold mx-1">
                                                        Total: {{ selectedMeasurement.station.test_count || 0 }}
                                                    </v-chip>
                                                </div>
                                            </div>
                                            <div class="text-body-2">
                                                <div class="d-flex align-center">
                                                    <v-icon size="x-small" class="mr-2">mdi-blank</v-icon>
                                                    <v-chip size="x-small" color="success"
                                                        class="font-weight-bold mx-1">
                                                        Pass: {{ selectedMeasurement.station.pass_count || 0 }}
                                                    </v-chip>
                                                    <v-chip size="x-small" color="error" class="font-weight-bold mx-1">
                                                        Fail: {{ selectedMeasurement.station.fail_count || 0 }}
                                                    </v-chip>
                                                </div>
                                            </div>
                                        </v-card-text>
                                    </v-card>
                                </v-col>
                                <v-col cols="12" sm="6" md="3">
                                    <v-card variant="outlined" class="h-100">
                                        <v-card-text class="auto">
                                            <div class="d-flex align-center justify-space-between">
                                                <div>
                                                    <v-icon size="small" class="mr-2">mdi-list-box</v-icon>
                                                    <strong>Test Items:</strong>
                                                </div>
                                                <v-chip size="small" color="info">
                                                    {{ selectedMeasurement.station.measurement_count || 0 }}
                                                </v-chip>
                                            </div>
                                        </v-card-text>
                                    </v-card>
                                </v-col>
                            </v-row>

                            <!-- Error Status -->
                            <v-row dense class="mb-1">
                                <v-col cols="12" sm="6" md="6">
                                    <v-card :variant="selectedMeasurement.station.error_item ? 'tonal' : 'outlined'"
                                        :color="selectedMeasurement.station.error_item ? 'error' : 'success'"
                                        class="h-100">
                                        <v-card-text class="py-2">
                                            <div class="d-flex align-start pt-1">
                                                <v-icon size="small" class="mr-2 mt-1"
                                                    :color="selectedMeasurement.station.error_item ? 'error' : 'success'">
                                                    {{ selectedMeasurement.station.error_item ? 'mdi-alert-circle' : 'mdi-check-circle' }}
                                                </v-icon>
                                                <div class="flex-grow-1" style="min-width: 0;">
                                                    <div>
                                                        <strong>Latest Test Status:</strong>
                                                    </div>
                                                    <div v-if="selectedMeasurement.station.error_item"
                                                        class="text-caption mt-1 font-weight-medium"
                                                        style="word-break: break-word; overflow-wrap: break-word;">
                                                        {{ selectedMeasurement.station.error_item }}
                                                    </div>
                                                    <div v-else class="text-body-2 mt-1">
                                                        No Errors
                                                    </div>
                                                </div>
                                            </div>
                                        </v-card-text>
                                    </v-card>
                                </v-col>
                                <v-col cols="12" sm="6" md="6">
                                    <v-card variant="outlined"
                                        :color="selectedMeasurement.station.error_item && selectedMeasurement.station.error_item.trim() !== '' ? 'default' : getScoreColor(selectedMeasurement.station.overall_data_score)"
                                        class="h-100">
                                        <v-card-text class="py-2">
                                            <div class="d-flex align-start">
                                                <v-icon size="small" class="mr-2 mt-1">mdi-star</v-icon>
                                                <div class="flex-grow-1" style="min-width: 0;">
                                                    <div><strong>Overall Score</strong></div>
                                                    <div v-if="selectedMeasurement.station.error_item && selectedMeasurement.station.error_item.trim() !== ''"
                                                        class="mt-1 d-flex align-center">
                                                        <span class="text-body-2">N/A</span>
                                                        <v-tooltip location="top">
                                                            <template #activator="{ props: tooltipProps }">
                                                                <v-icon v-bind="tooltipProps" size="small" class="ml-1"
                                                                    color="info">
                                                                    mdi-information-slab-circle-outline
                                                                </v-icon>
                                                            </template>
                                                            <span>Can't be calculated because DUT failed</span>
                                                        </v-tooltip>
                                                    </div>
                                                    <div v-else class="mt-1">
                                                        <v-chip
                                                            :color="getScoreColor(selectedMeasurement.station.overall_data_score)"
                                                            size="small">
                                                            {{ selectedMeasurement.station.overall_data_score.toFixed(2) }}
                                                        </v-chip>
                                                    </div>
                                                </div>
                                            </div>
                                        </v-card-text>
                                    </v-card>
                                </v-col>
                            </v-row>
                        </v-card-subtitle>
                    </div>

                    <v-divider class="flex-shrink-0" />
                </div>
                <!-- End Sticky Header Container -->

                <!-- Search and Filter Controls (Fixed, non-scrollable) -->
                <v-card-text class="pb-2 pt-3 flex-shrink-0">
                    <v-row dense>
                        <v-col cols="12" md="4">
                            <v-text-field v-model="measurementSearch" prepend-inner-icon="mdi-magnify"
                                label="Search measurements..." variant="outlined" density="compact" clearable
                                hide-details />
                        </v-col>
                        <v-col cols="12" md="2">
                            <v-select v-model="scoreFilter" :items="scoreFilterOptions" label="Score Filter"
                                variant="outlined" density="compact" clearable hide-details
                                :menu-props="{ zIndex: 2500 }" />
                        </v-col>
                        <v-col cols="12" md="2">
                            <v-select v-model="limitFilter" :items="limitFilterOptions" label="Limit Status"
                                variant="outlined" density="compact" clearable hide-details
                                :menu-props="{ zIndex: 2500 }" />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-select v-model="measurementLockedColumns" :items="measurementColumnOptions"
                                item-title="title" item-value="value" label="Lock columns" variant="outlined"
                                density="compact" multiple chips closable-chips clearable hide-details
                                prepend-inner-icon="mdi-pin" :menu-props="{ zIndex: 2500 }" />
                        </v-col>
                    </v-row>
                </v-card-text>

                <!-- Data Table Container - Conditional styling based on fullscreen mode -->
                <div v-if="isFullscreen" class="flex-grow-1 measurement-details-table"
                    style="min-height: 0; overflow: hidden;">
                    <v-data-table v-if="selectedMeasurement" :headers="measurementHeadersWithWidths"
                        :items="filteredMeasurements" :search="measurementSearch" :items-per-page="25"
                        density="comfortable" striped="even" fixed-header fixed-footer style="height: 100%;"
                        class="sticky-data-table" ref="measurementTableRef">
                        <!-- Test Item -->
                        <template #item.test_item="{ item }">
                            <span class="font-mono text-body-2"
                                :class="{ 'text-error font-weight-bold': isErrorItem(item.test_item) }">
                                {{ item.test_item }}
                            </span>
                        </template>

                        <!-- USL -->
                        <template #item.usl="{ item }">
                            <div class="text-start text-body-2">
                                {{ item.usl !== null ? item.usl : '-' }}
                            </div>
                        </template>

                        <!-- LSL -->
                        <template #item.lsl="{ item }">
                            <div class="text-start text-body-2">
                                {{ item.lsl !== null ? item.lsl : '-' }}
                            </div>
                        </template>

                        <!-- Target -->
                        <template #item.target="{ item }">
                            <div class="text-center text-body-2">
                                {{ item.target || '-' }}
                            </div>
                        </template>

                        <!-- Meas. -->
                        <template #item.actual="{ item }">
                            <div class="text-center">
                                <v-chip size="small" :color="getActualValueColor(item)" variant="tonal">
                                    {{ item.actual !== '' ? item.actual : '0' }}
                                </v-chip>
                            </div>
                        </template>

                        <!-- Delta Act.Tar -->
                        <template #item.delta_actual_target="{ item }">
                            <div class="text-center">
                                <v-chip
                                    v-if="item.actual !== null && item.actual !== '' && item.target !== null && item.target !== ''"
                                    size="small" variant="tonal"
                                    :color="getDeltaColor(parseFloat(item.actual) - parseFloat(item.target))">
                                    {{ (parseFloat(item.actual) - parseFloat(item.target)).toFixed(2) }}
                                </v-chip>
                                <span v-else class="text-medium-emphasis">—</span>
                            </div>
                        </template>

                        <!-- Score -->
                        <template #item.score="{ item }">
                            <div class="text-center">
                                <!-- Show comparison chips when custom scoring is active and different from system -->
                                <div v-if="item.custom_scoring && item.custom_scoring.method === 'custom'"
                                    class="d-flex gap-1 justify-center flex-wrap">
                                    <v-chip :color="getScoreColor(item.custom_scoring.systemScore)" size="x-small"
                                        variant="tonal">
                                        <v-tooltip location="top">
                                            <template #activator="{ props: tooltipProps }">
                                                <span v-bind="tooltipProps">S: {{ item.custom_scoring.systemScore.toFixed(2) }}</span>
                                            </template>
                                            System Score
                                        </v-tooltip>
                                    </v-chip>
                                    <v-chip :color="getScoreColor(item.custom_scoring.customScore)" size="x-small"
                                        variant="elevated">
                                        <v-tooltip location="top">
                                            <template #activator="{ props: tooltipProps }">
                                                <span v-bind="tooltipProps">C: {{ item.custom_scoring.customScore.toFixed(2) }}</span>
                                            </template>
                                            Custom Score ({{ item.custom_scoring.formula }})
                                        </v-tooltip>
                                    </v-chip>
                                    <v-chip
                                        :color="item.custom_scoring.difference > 0 ? 'success' : item.custom_scoring.difference < 0 ? 'error' : 'default'"
                                        size="x-small" variant="outlined">
                                        <v-tooltip location="top">
                                            <template #activator="{ props: tooltipProps }">
                                                <span v-bind="tooltipProps">
                                                    {{ item.custom_scoring.difference > 0 ? '+' : '' }}{{ item.custom_scoring.difference.toFixed(2) }}
                                                </span>
                                            </template>
                                            Difference (Custom - System)
                                        </v-tooltip>
                                    </v-chip>
                                </div>
                                <!-- Default single score display -->
                                <v-chip v-else :color="getScoreColor(item.score)" size="small"
                                    class="d-inline-flex align-center" :style="item.breakdown ? 'cursor: pointer;' : ''"
                                    @click="item.breakdown ? handleScoreClick(item) : undefined">
                                    {{ item.score.toFixed(2) }}
                                    <v-tooltip v-if="item.scoreSource" location="top">
                                        <template #activator="{ props: tooltipProps }">
                                            <v-icon v-bind="tooltipProps" size="x-small" class="ml-1">
                                                {{ getScoreSourceIcon(item.scoreSource) }}
                                            </v-icon>
                                        </template>
                                        <div class="text-caption">
                                            {{ getScoreSourceLabel(item.scoreSource) }}
                                            <div v-if="item.systemScore !== undefined && item.score !== item.systemScore"
                                                class="mt-1">
                                                System: {{ item.systemScore.toFixed(2) }}
                                            </div>
                                        </div>
                                    </v-tooltip>
                                    <v-icon v-if="item.breakdown" size="x-small" class="ml-1">mdi-information</v-icon>
                                </v-chip>
                            </div>
                        </template>
                    </v-data-table>
                </div>

                <!-- Data Table Container - Default mode -->
                <div v-else class="flex-grow-1 d-flex flex-column measurement-details-table"
                    style="min-height: 0; overflow: auto;">
                    <v-data-table v-if="selectedMeasurement" :headers="measurementHeadersWithWidths"
                        :items="filteredMeasurements" :search="measurementSearch" :items-per-page="25"
                        density="comfortable" striped="even" fixed-header fixed-footer
                        class="flex-grow-1 sticky-data-table" ref="measurementTableRef">
                        <!-- Test Item -->
                        <template #item.test_item="{ item }">
                            <span class="font-mono text-body-2"
                                :class="{ 'text-error font-weight-bold': isErrorItem(item.test_item) }">
                                {{ item.test_item }}
                            </span>
                        </template>

                        <!-- USL -->
                        <template #item.usl="{ item }">
                            <div class="text-start text-body-2">
                                {{ item.usl !== null ? item.usl : '-' }}
                            </div>
                        </template>

                        <!-- LSL -->
                        <template #item.lsl="{ item }">
                            <div class="text-start text-body-2">
                                {{ item.lsl !== null ? item.lsl : '-' }}
                            </div>
                        </template>

                        <!-- Target -->
                        <template #item.target="{ item }">
                            <div class="text-center text-body-2">
                                {{ item.target || '-' }}
                            </div>
                        </template>

                        <!-- Actual -->
                        <template #item.actual="{ item }">
                            <div class="text-center">
                                <v-chip size="small" :color="getActualValueColor(item)" variant="tonal">
                                    {{ item.actual !== '' ? item.actual : '0' }}
                                </v-chip>
                            </div>
                        </template>

                        <!-- Delta Act.Tar -->
                        <template #item.delta_actual_target="{ item }">
                            <div class="text-center">
                                <v-chip
                                    v-if="item.actual !== null && item.actual !== '' && item.target !== null && item.target !== ''"
                                    size="small" variant="tonal"
                                    :color="getDeltaColor(parseFloat(item.actual) - parseFloat(item.target))">
                                    {{ (parseFloat(item.actual) - parseFloat(item.target)).toFixed(2) }}
                                </v-chip>
                                <span v-else class="text-medium-emphasis">—</span>
                            </div>
                        </template>

                        <!-- Score -->
                        <template #item.score="{ item }">
                            <div class="text-center">
                                <!-- Show comparison chips when custom scoring is active and different from system -->
                                <div v-if="item.custom_scoring && item.custom_scoring.method === 'custom'"
                                    class="d-flex gap-1 justify-center flex-wrap">
                                    <v-chip :color="getScoreColor(item.custom_scoring.systemScore)" size="x-small"
                                        variant="tonal">
                                        <v-tooltip location="top">
                                            <template #activator="{ props: tooltipProps }">
                                                <span v-bind="tooltipProps">S: {{ item.custom_scoring.systemScore.toFixed(2) }}</span>
                                            </template>
                                            System Score
                                        </v-tooltip>
                                    </v-chip>
                                    <v-chip :color="getScoreColor(item.custom_scoring.customScore)" size="x-small"
                                        variant="elevated">
                                        <v-tooltip location="top">
                                            <template #activator="{ props: tooltipProps }">
                                                <span v-bind="tooltipProps">C: {{ item.custom_scoring.customScore.toFixed(2) }}</span>
                                            </template>
                                            Custom Score ({{ item.custom_scoring.formula }})
                                        </v-tooltip>
                                    </v-chip>
                                    <v-chip
                                        :color="item.custom_scoring.difference > 0 ? 'success' : item.custom_scoring.difference < 0 ? 'error' : 'default'"
                                        size="x-small" variant="outlined">
                                        <v-tooltip location="top">
                                            <template #activator="{ props: tooltipProps }">
                                                <span v-bind="tooltipProps">
                                                    {{ item.custom_scoring.difference > 0 ? '+' : '' }}{{ item.custom_scoring.difference.toFixed(2) }}
                                                </span>
                                            </template>
                                            Difference (Custom - System)
                                        </v-tooltip>
                                    </v-chip>
                                </div>
                                <!-- Default single score display -->
                                <v-chip v-else :color="getScoreColor(item.score)" size="small"
                                    :style="item.breakdown ? 'cursor: pointer;' : ''"
                                    @click="item.breakdown ? handleScoreClick(item) : undefined">
                                    {{ item.score.toFixed(2) }}
                                    <v-icon v-if="item.breakdown" size="x-small" class="ml-1">mdi-information</v-icon>
                                </v-chip>
                            </div>
                        </template>
                    </v-data-table>
                </div>
                <!-- End Table Container -->
            </v-card>
        </v-dialog>

        <!-- Score Breakdown Dialog -->
        <!-- Component kept mounted to prevent Vue lifecycle corruption -->
        <ScoreBreakdownDialog v-model="scoreBreakdownDialog" :item="selectedScoreBreakdown"
            :custom-scoring-enabled="props.customScoringEnabled" :universal-formula="props.universalFormula"
            :category-formulas="props.categoryFormulas" />

        <!-- Results Summary -->
        <v-card class="mb-4">
            <v-card-title class="d-flex justify-space-between align-center">
                <div>
                    <v-icon class="mr-2">mdi-chart-box</v-icon>
                    Analysis Results
                </div>
                <v-btn color="success" prepend-icon="mdi-download" @click="$emit('export')">
                    Export
                </v-btn>
            </v-card-title>

            <v-card-text>
                <v-row>
                    <v-col cols="12" md="4">
                        <v-card variant="tonal" color="primary">
                            <v-card-text class="text-center">
                                <div class="text-h4 font-weight-bold">{{ enhancedResults.length }}</div>
                                <div class="text-caption">DUTs Analyzed</div>
                            </v-card-text>
                        </v-card>
                    </v-col>

                    <v-col cols="12" md="4">
                        <v-card variant="tonal" color="success">
                            <v-card-text class="text-center">
                                <div class="text-h4 font-weight-bold">{{ totalStations }}</div>
                                <div class="text-caption">Total Station Results</div>
                            </v-card-text>
                        </v-card>
                    </v-col>

                    <v-col cols="12" md="4">
                        <v-card variant="tonal" color="error">
                            <v-card-text class="text-center">
                                <div class="text-h4 font-weight-bold">{{ failedDUTsCount }}</div>
                                <div class="text-caption">Fails (DUTs with error items)</div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <!-- Top Product Ranking -->
        <TopProductRanking v-if="enhancedResults.length > 0" :results="results" @row-click="handleRankingRowClick" />

        <!-- Error Display -->
        <v-alert v-if="errors.length > 0" type="error" variant="tonal" class="mb-4">
            <div class="font-weight-medium">Analysis Errors ({{ errors.length }})</div>
            <v-list density="compact" class="mt-2">
                <v-list-item v-for="(error, index) in errors" :key="index" :title="error.dut_isn"
                    :subtitle="error.detail">
                    <template #prepend>
                        <v-icon color="error">mdi-alert-circle</v-icon>
                    </template>
                </v-list-item>
            </v-list>
        </v-alert>

        <!-- Comparison View (only show when multiple DUTs) -->
        <v-card v-if="enhancedResults.length > 1" class="mb-4">
            <v-card-title class="d-flex justify-space-between align-center cursor-pointer"
                @click="showComparison = !showComparison">
                <div>
                    <v-icon class="mr-2">mdi-compare</v-icon>
                    Compare Test Results
                </div>
                <div class="d-flex align-center">
                    <v-btn v-if="selectedCompareStation && comparisonData.length > 0"
                        :icon="comparisonFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'" variant="text"
                        @click.stop="comparisonFullscreen = !comparisonFullscreen"
                        :title="comparisonFullscreen ? 'Exit Fullscreen' : 'Fullscreen'" class="mr-2" />
                    <v-icon>{{ showComparison ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                </div>
            </v-card-title>

            <v-expand-transition>
                <v-card-text v-show="showComparison">
                    <v-row dense>
                        <!-- Station Selector for Comparison -->
                        <v-col cols="12" md="6">
                            <v-select v-model="selectedCompareStation" :items="comparisonStations" item-value="value"
                                item-title="title" label="Select Station" prepend-inner-icon="mdi-factory"
                                variant="outlined" density="comfortable"
                                hint="Choose a test station to compare results across all DUTs" persistent-hint>
                                <template #item="{ props: itemProps, item }">
                                    <v-list-item v-bind="itemProps">
                                        <template #title>
                                            <div class="d-flex align-center">
                                                <v-icon size="small" class="mr-2">mdi-factory</v-icon>
                                                <span class="font-weight-medium">{{ item.raw.raw.station }}</span>
                                            </div>
                                        </template>
                                        <template #subtitle>
                                            <span class="text-caption">{{ item.raw.raw.site }} / {{ item.raw.raw.model }}</span>
                                        </template>
                                    </v-list-item>
                                </template>
                            </v-select>
                        </v-col>

                        <!-- Search Field -->
                        <v-col cols="12" md="6">
                            <v-text-field v-model="comparisonSearch" label="Search Test Items"
                                prepend-inner-icon="mdi-magnify" variant="outlined" density="comfortable" clearable
                                hint="Filter test items by name" persistent-hint />
                        </v-col>
                    </v-row>

                    <!-- Comparison Table -->
                    <v-dialog v-model="comparisonFullscreen" fullscreen transition="dialog-bottom-transition">
                        <v-card class="d-flex flex-column" style="height: 100vh; overflow: hidden;">
                            <v-card-title class="d-flex justify-space-between align-center flex-shrink-0">
                                <div>
                                    <v-icon class="mr-2">mdi-compare</v-icon>
                                    Comparison: {{ selectedCompareStation ? comparisonStations.find((s: any) => s.value === selectedCompareStation)?.title : '' }}
                                </div>
                                <div class="d-flex align-center">
                                    <v-btn icon="mdi-close" variant="text" @click="comparisonFullscreen = false" />
                                </div>
                            </v-card-title>

                            <!-- Filter Controls (Fixed, non-scrollable) -->
                            <v-card-text class="pb-2 pt-3 flex-shrink-0">
                                <v-row dense>
                                    <v-col cols="12" md="4">
                                        <v-text-field v-model="comparisonSearch" prepend-inner-icon="mdi-magnify"
                                            label="Search test items..." variant="outlined" density="compact" clearable
                                            hide-details />
                                    </v-col>
                                    <v-col cols="12" md="2">
                                        <v-select v-model="comparisonScoreFilter" :items="scoreFilterOptions"
                                            label="Score Filter" variant="outlined" density="compact" clearable
                                            hide-details :menu-props="{ zIndex: 2500 }" />
                                    </v-col>
                                    <v-col cols="12" md="2">
                                        <v-select v-model="comparisonLimitFilter" :items="limitFilterOptions"
                                            label="Limit Status" variant="outlined" density="compact" clearable
                                            hide-details :menu-props="{ zIndex: 2500 }" />
                                    </v-col>
                                    <v-col cols="12" md="4">
                                        <v-select v-model="comparisonLockedColumns" :items="comparisonColumnOptions"
                                            item-title="title" item-value="value" label="Lock columns"
                                            variant="outlined" density="compact" multiple chips closable-chips clearable
                                            hide-details prepend-inner-icon="mdi-pin" :menu-props="{ zIndex: 2500 }" />
                                    </v-col>
                                </v-row>
                            </v-card-text>

                            <v-card-text class="pa-0 flex-grow-1 overflow-hidden comparison-table">
                                <v-data-table v-if="filteredComparisonData.length > 0"
                                    :headers="comparisonHeadersWithWidths" :items="filteredComparisonData"
                                    :items-per-page="50" class="h-100 sticky-data-table" density="comfortable"
                                    striped="even" fixed-header fixed-footer :height="'calc(100vh - 140px)'"
                                    ref="comparisonFullscreenTableRef">
                                    <template #no-data>
                                        <v-alert type="info" variant="tonal" class="ma-4">
                                            No data available
                                        </v-alert>
                                    </template>

                                    <!-- Test Item Column -->
                                    <template #item.test_item="{ item }">
                                        <div class="font-weight-medium text-caption">{{ item.test_item }}</div>
                                    </template>

                                    <!-- Limits Columns (no color) -->
                                    <template #item.usl="{ item }">
                                        <span class="text-body-2">{{ item.usl !== null ? item.usl : 'N/A' }}</span>
                                    </template>

                                    <template #item.lsl="{ item }">
                                        <span class="text-body-2">{{ item.lsl !== null ? item.lsl : 'N/A' }}</span>
                                    </template>

                                    <!-- Dynamic DUT Measured Columns -->
                                    <template v-for="result in enhancedResults" :key="`measured-fs-${result.dut_isn}`"
                                        #[`item.measured_${result.dut_isn}`]="{ item }">
                                        <v-chip
                                            v-if="item[`measured_${result.dut_isn}`] !== null && item[`measured_${result.dut_isn}`] !== undefined && item[`measured_${result.dut_isn}`] !== 'N/A'"
                                            size="small"
                                            :color="getMeasuredValueColor(item[`measured_${result.dut_isn}`], item.usl, item.lsl)"
                                            variant="tonal">
                                            {{ item[`measured_${result.dut_isn}`] }}
                                        </v-chip>
                                        <span v-else class="text-caption text-medium-emphasis">N/A</span>
                                    </template>

                                    <!-- Target Column -->
                                    <template #item.target="{ item }">
                                        <span class="text-body-2">{{ item.target || '-' }}</span>
                                    </template>

                                    <!-- Dynamic Delta M.T Columns -->
                                    <template v-for="result in enhancedResults" :key="`delta-fs-${result.dut_isn}`"
                                        #[`item.delta_mt_${result.dut_isn}`]="{ item }">
                                        <v-chip
                                            v-if="item[`delta_mt_${result.dut_isn}`] !== undefined && item[`delta_mt_${result.dut_isn}`] !== null"
                                            size="small" variant="tonal"
                                            :color="getDeltaColor(item[`delta_mt_${result.dut_isn}`])">
                                            {{ item[`delta_mt_${result.dut_isn}`].toFixed(2) }}
                                        </v-chip>
                                        <span v-else class="text-caption text-medium-emphasis">N/A</span>
                                    </template>

                                    <!-- M.Max Diff Column -->
                                    <template #item.measured_max_diff="{ item }">
                                        <v-chip v-if="item.measured_max_diff !== null" size="small" variant="tonal"
                                            :color="getDeltaColor(item.measured_max_diff)">
                                            {{ item.measured_max_diff.toFixed(2) }}
                                        </v-chip>
                                        <span v-else class="text-caption text-medium-emphasis">N/A</span>
                                    </template>

                                    <!-- Dynamic DUT Score Columns -->
                                    <template v-for="result in enhancedResults" :key="`score-fs-${result.dut_isn}`"
                                        #[`item.score_${result.dut_isn}`]="{ item }">
                                        <v-chip :color="getScoreColor(item[`score_${result.dut_isn}`])" size="small"
                                            variant="flat"
                                            :class="item[`breakdown_${result.dut_isn}`] ? 'cursor-pointer' : ''"
                                            @click="item[`breakdown_${result.dut_isn}`] && handleComparisonScoreClick(item, result.dut_isn)">
                                            {{ item[`score_${result.dut_isn}`] !== undefined ?
                                                item[`score_${result.dut_isn}`].toFixed(2) : 'N/A' }}
                                        </v-chip>
                                    </template>
                                </v-data-table>
                            </v-card-text>
                        </v-card>
                    </v-dialog>

                    <!-- Default Mode Filters (shown after station selection) -->
                    <v-row v-if="!comparisonFullscreen && selectedCompareStation" dense class="mt-4">
                        <v-col cols="12" md="3">
                            <v-select v-model="comparisonScoreFilter" :items="scoreFilterOptions" label="Score Filter"
                                variant="outlined" density="compact" clearable hide-details
                                :menu-props="{ zIndex: 2500 }" />
                        </v-col>
                        <v-col cols="12" md="3">
                            <v-select v-model="comparisonLimitFilter" :items="limitFilterOptions" label="Limit Status"
                                variant="outlined" density="compact" clearable hide-details
                                :menu-props="{ zIndex: 2500 }" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-select v-model="comparisonLockedColumns" :items="comparisonColumnOptions"
                                item-title="title" item-value="value" label="Lock columns" variant="outlined"
                                density="compact" multiple chips closable-chips clearable hide-details
                                prepend-inner-icon="mdi-pin" :menu-props="{ zIndex: 2500 }" />
                        </v-col>
                    </v-row>

                    <!-- Inline Table (when not fullscreen) -->
                    <div v-if="!comparisonFullscreen && selectedCompareStation && filteredComparisonData.length > 0"
                        class="comparison-table">
                        <v-data-table :headers="comparisonHeadersWithWidths" :items="filteredComparisonData"
                            :items-per-page="15" class="elevation-1 mt-4 sticky-data-table" density="comfortable"
                            striped="even" fixed-header height="520" ref="comparisonTableRef">
                            <template #no-data>
                                <v-alert type="info" variant="tonal" class="ma-4">
                                    No data available
                                </v-alert>
                            </template>

                            <!-- Test Item Column -->
                            <template #item.test_item="{ item }">
                                <div class="font-weight-medium text-caption">{{ item.test_item }}</div>
                            </template>

                            <!-- Limits Columns (no color) -->
                            <template #item.usl="{ item }">
                                <span class="text-body-2">{{ item.usl !== null ? item.usl : 'N/A' }}</span>
                            </template>

                            <template #item.lsl="{ item }">
                                <span class="text-body-2">{{ item.lsl !== null ? item.lsl : 'N/A' }}</span>
                            </template>

                            <!-- Dynamic DUT Measured Columns -->
                            <template v-for="result in enhancedResults" :key="`measured-${result.dut_isn}`"
                                #[`item.measured_${result.dut_isn}`]="{ item }">
                                <v-chip
                                    v-if="item[`measured_${result.dut_isn}`] !== null && item[`measured_${result.dut_isn}`] !== undefined && item[`measured_${result.dut_isn}`] !== 'N/A'"
                                    size="small"
                                    :color="getMeasuredValueColor(item[`measured_${result.dut_isn}`], item.usl, item.lsl)"
                                    variant="tonal">
                                    {{ item[`measured_${result.dut_isn}`] }}
                                </v-chip>
                                <span v-else class="text-caption text-medium-emphasis">N/A</span>
                            </template>

                            <!-- Target Column -->
                            <template #item.target="{ item }">
                                <span class="text-body-2">{{ item.target || '-' }}</span>
                            </template>

                            <!-- Dynamic Delta M.T Columns -->
                            <template v-for="result in enhancedResults" :key="`delta-${result.dut_isn}`"
                                #[`item.delta_mt_${result.dut_isn}`]="{ item }">
                                <v-chip
                                    v-if="item[`delta_mt_${result.dut_isn}`] !== undefined && item[`delta_mt_${result.dut_isn}`] !== null"
                                    size="small" variant="tonal"
                                    :color="getDeltaColor(item[`delta_mt_${result.dut_isn}`])">
                                    {{ item[`delta_mt_${result.dut_isn}`].toFixed(2) }}
                                </v-chip>
                                <span v-else class="text-caption text-medium-emphasis">N/A</span>
                            </template>

                            <!-- M.Max Diff Column -->
                            <template #item.measured_max_diff="{ item }">
                                <v-chip v-if="item.measured_max_diff !== null" size="small" variant="tonal"
                                    :color="getDeltaColor(item.measured_max_diff)">
                                    {{ item.measured_max_diff.toFixed(2) }}
                                </v-chip>
                                <span v-else class="text-caption text-medium-emphasis">N/A</span>
                            </template>

                            <!-- Dynamic DUT Score Columns -->
                            <template v-for="result in enhancedResults" :key="`score-${result.dut_isn}`"
                                #[`item.score_${result.dut_isn}`]="{ item }">
                                <v-chip :color="getScoreColor(item[`score_${result.dut_isn}`])" size="small"
                                    variant="flat" :class="item[`breakdown_${result.dut_isn}`] ? 'cursor-pointer' : ''"
                                    @click="item[`breakdown_${result.dut_isn}`] && handleComparisonScoreClick(item, result.dut_isn)">
                                    {{ item[`score_${result.dut_isn}`] !== undefined ?
                                        item[`score_${result.dut_isn}`].toFixed(2) : 'N/A' }}
                                </v-chip>
                            </template>
                        </v-data-table>
                    </div>

                    <!-- No Data for Selected Station -->
                    <v-alert
                        v-if="!comparisonFullscreen && selectedCompareStation && filteredComparisonData.length === 0 && comparisonData.length > 0"
                        type="info" variant="tonal" density="compact" class="mt-4">
                        No test items match your search criteria.
                    </v-alert>

                    <v-alert
                        v-else-if="!comparisonFullscreen && selectedCompareStation && filteredComparisonData.length === 0"
                        type="info" variant="tonal" density="compact" class="mt-4">
                        No test data available for the selected station across all DUTs.
                    </v-alert>

                    <!-- Initial State -->
                    <v-alert v-else-if="!comparisonFullscreen && !selectedCompareStation" type="info" variant="tonal"
                        density="compact" class="mt-4">
                        Select a station above to compare test results across all {{ enhancedResults.length }} DUTs.
                    </v-alert>
                </v-card-text>
            </v-expand-transition>
        </v-card>

        <!-- Results by DUT -->
        <v-expansion-panels v-if="enhancedResults.length > 0" multiple>
            <v-expansion-panel v-for="(result, index) in enhancedResults" :key="result.dut_isn"
                :value="index === 0 ? 'open' : undefined">
                <v-expansion-panel-title>
                    <div class="d-flex align-center justify-space-between" style="width: 100%;">
                        <div class="d-flex align-center">
                            <v-icon class="mr-3">mdi-barcode-scan</v-icon>
                            <div>
                                <div class="font-weight-bold">{{ result.dut_isn }}</div>
                                <div class="text-caption text-medium-emphasis">
                                    {{ result.site_name }} / {{ result.model_name }} •
                                    {{ result.test_result.length }} station(s)
                                </div>
                            </div>
                        </div>
                        <v-chip v-if="hasErrorInResult(result)" color="error" size="small" class="mr-2">
                            <v-icon start size="small">mdi-alert-circle</v-icon>
                            Has Errors
                        </v-chip>
                    </div>
                </v-expansion-panel-title>

                <v-expansion-panel-text>
                    <!-- Station Results Table -->
                    <v-data-table :headers="stationHeaders" :items="result.test_result" :items-per-page="10"
                        class="elevation-1 cursor-pointer" striped="even"
                        @click:row="(_event: unknown, data: any) => showMeasurements(result.dut_isn, data.item)">
                        <!-- Station Name -->
                        <template #item.station_name="{ item }">
                            <div class="font-weight-medium"
                                :class="{ 'text-error': item.error_item && item.error_item.trim() !== '' }">
                                {{ item.station_name }}
                            </div>
                        </template>

                        <!-- Device -->
                        <template #item.device="{ item }">
                            <div class="text-body-2">
                                {{ item.device || 'N/A' }}
                            </div>
                        </template>

                        <!-- Test Date -->
                        <template #item.test_date="{ item }">
                            {{ formatDate(item.test_date) }}
                        </template>

                        <!-- Test Item Count -->
                        <template #item.measurement_count="{ item }">
                            <v-chip size="small" color="primary">
                                {{ item.measurement_count || 0 }}
                            </v-chip>
                        </template>

                        <!-- Overall Score -->
                        <template #item.overall_data_score="{ item }">
                            <div v-if="item.error_item && item.error_item.trim() !== ''" class="d-flex align-center">
                                <span class="text-body-2">N/A</span>
                                <v-tooltip location="top">
                                    <template #activator="{ props: tooltipProps }">
                                        <v-icon v-bind="tooltipProps" size="small" class="ml-1" color="info">
                                            mdi-information-slab-circle-outline
                                        </v-icon>
                                    </template>
                                    <span>Can't be calculated because DUT failed</span>
                                </v-tooltip>
                            </div>
                            <v-chip v-else :color="getScoreColor(item.overall_data_score)" size="small">
                                {{ item.overall_data_score.toFixed(2) }}
                            </v-chip>
                        </template>

                        <!-- Actions -->
                        <template #item.actions="{ item }">
                            <v-btn size="small" variant="text" icon="mdi-table-eye"
                                @click="showMeasurements(result.dut_isn, item)" />
                        </template>

                        <!-- Expanded Row: Measurements -->
                        <template #expanded-row="{ item }">
                            <tr>
                                <td :colspan="stationHeaders.length">
                                    <v-card flat class="my-2">
                                        <v-card-title class="text-subtitle-2">Measurements</v-card-title>
                                        <v-card-text>
                                            <v-data-table :headers="measurementHeaders" :items="item.measurement || []"
                                                density="compact" :items-per-page="5" striped="even">
                                                <!-- Test Item -->
                                                <template #item.test_item="{ item: measurement }">
                                                    <span class="text-caption font-mono">
                                                        {{ measurement.test_item }}
                                                    </span>
                                                </template>

                                                <!-- USL -->
                                                <template #item.usl="{ item: measurement }">
                                                    <div class="text-start text-caption">
                                                        {{ measurement.usl !== null ? measurement.usl : '-' }}
                                                    </div>
                                                </template>

                                                <!-- LSL -->
                                                <template #item.lsl="{ item: measurement }">
                                                    <div class="text-start text-caption">
                                                        {{ measurement.lsl !== null ? measurement.lsl : '-' }}
                                                    </div>
                                                </template>

                                                <!-- Target -->
                                                <template #item.target="{ item: measurement }">
                                                    <div class="text-center text-caption">
                                                        {{ measurement.target || '-' }}
                                                    </div>
                                                </template>

                                                <!-- Meas. (Measured) -->
                                                <template #item.actual="{ item: measurement }">
                                                    <div class="text-center">
                                                        <span class="font-weight-bold">
                                                            {{ measurement.actual !== '' ? measurement.actual : '0' }}
                                                        </span>
                                                    </div>
                                                </template>

                                                <!-- Score -->
                                                <template #item.score="{ item: measurement }">
                                                    <div class="text-center">
                                                        <v-chip :color="getScoreColor(measurement.score)" size="x-small"
                                                            :style="measurement.breakdown ? 'cursor: pointer;' : ''"
                                                            @click="measurement.breakdown ? handleScoreClick(measurement) : undefined">
                                                            {{ measurement.score.toFixed(1) }}
                                                            <v-icon v-if="measurement.breakdown" size="x-small"
                                                                class="ml-1">mdi-information</v-icon>
                                                        </v-chip>
                                                    </div>
                                                </template>
                                            </v-data-table>
                                        </v-card-text>
                                    </v-card>
                                </td>
                            </tr>
                        </template>
                    </v-data-table>
                </v-expansion-panel-text>
            </v-expansion-panel>
        </v-expansion-panels>

        <!-- Empty State -->
        <v-card v-else>
            <v-card-text class="text-center py-8">
                <v-icon size="64" color="grey-lighten-1">mdi-information-slab-circle-outline</v-icon>
                <div class="text-h6 mt-4">No Results</div>
                <div class="text-caption text-medium-emphasis">
                    No successful analyses to display
                </div>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useStickyColumns } from '@/shared/composables'
import { formatDate } from '@/shared/utils/helpers'
import { dutApi } from '../api/dut.api'
import type {
  ScoreBreakdown,
  TopProductError,
  TopProductMeasurement,
  TopProductResult,
  TopProductStationResult,
} from '../types/dutTopProduct.types'

interface Props {
  results: TopProductResult[]
  errors: TopProductError[]
  customScoringEnabled?: boolean
  // biome-ignore lint/suspicious/noExplicitAny: FormulaSelection type from useFormulaSelector composable
  universalFormula?: any // FormulaSelection from useFormulaSelector
  // biome-ignore lint/suspicious/noExplicitAny: CategoryFormulaSelections type from useFormulaSelector composable
  categoryFormulas?: any // CategoryFormulaSelections from useFormulaSelector
}

const props = defineProps<Props>()

defineEmits<(e: 'export') => void>()

// State for measurement dialog
const measurementDialog = ref(false)
const isFullscreen = ref(false)
const selectedMeasurement = ref<{ dutISN: string; station: TopProductStationResult } | null>(null)

// State for score breakdown dialog
const scoreBreakdownDialog = ref(false)
// biome-ignore lint/suspicious/noExplicitAny: wrapper matches ParsedTestItemEnhanced interface loosely
const selectedScoreBreakdown = ref<any | null>(null) // Type as 'any' to match ParsedTestItemEnhanced wrapper

// Reset selectedScoreBreakdown when dialog closes
// Delay cleanup to ensure v-dialog transition fully completes (300ms is Vuetify's default transition duration)
watch(scoreBreakdownDialog, (isOpen) => {
  if (!isOpen) {
    // Wait for dialog transition to complete before clearing data
    setTimeout(() => {
      selectedScoreBreakdown.value = null
    }, 350) // 50ms buffer beyond typical 300ms transition
  }
})

// State for search and filters
const measurementSearch = ref('')
const scoreFilter = ref<string | null>(null)
const limitFilter = ref<string | null>(null)

// State for linked identifiers
const loadingIdentifiers = ref(false)
const linkedIdentifiers = ref<string[]>([])

// State for comparison view
const showComparison = ref(false)
const selectedCompareStation = ref<string | null>(null)
const comparisonSearch = ref('')
const comparisonFullscreen = ref(false)
const comparisonScoreFilter = ref<string | null>(null)
const comparisonLimitFilter = ref<string | null>(null)

// Computed: All linked ISNs (for total count, excluding the first index which is usually the search ISN)
const allLinkedISNs = computed(() => {
  if (linkedIdentifiers.value.length === 0) {
    return []
  }
  // Exclude first index (typically the same as dut_isn used for search)
  return linkedIdentifiers.value.slice(1)
})

// Computed: Other linked ISNs (exclude search ISN for dropdown display)
const otherLinkedISNs = computed(() => {
  if (linkedIdentifiers.value.length === 0) {
    return []
  }
  // Filter out the search ISN from the list
  return linkedIdentifiers.value.filter((isn) => isn !== selectedMeasurement.value?.dutISN)
})

// Filter options
const scoreFilterOptions = [
  { title: 'All Scores', value: null },
  { title: 'Score >= 9', value: 'high' },
  { title: 'Score 7-9', value: 'medium' },
  { title: 'Score < 7', value: 'low' },
]

const limitFilterOptions = [
  { title: 'All', value: null },
  { title: 'Within Limits', value: 'within' },
  { title: 'Out of Limits', value: 'out' },
]

// Watch for measurement dialog changes to fetch linked identifiers
watch(measurementDialog, async (isOpen) => {
  if (isOpen && selectedMeasurement.value?.dutISN) {
    await fetchLinkedIdentifiers(selectedMeasurement.value.dutISN)
  } else if (!isOpen) {
    // Clear linked identifiers when dialog closes
    linkedIdentifiers.value = []
    // Reset search and filters
    measurementSearch.value = ''
    scoreFilter.value = null
    limitFilter.value = null
    // Reset fullscreen mode
    isFullscreen.value = false
  }
})

// Parse measurement data from the 'data' field
// biome-ignore lint/suspicious/noExplicitAny: dynamic measurement data from backend API (object or array format)
function parseMeasurements(data: Array<any>): TopProductMeasurement[] {
  if (!data || data.length === 0) return []

  const measurements: TopProductMeasurement[] = []

  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    if (!item) continue

    // Detect format: object has 'test_item' property, array doesn't
    const isObjectFormat = typeof item === 'object' && !Array.isArray(item) && 'test_item' in item

    let testItem: string
    let usl: number | null
    let lsl: number | null
    let actual: number
    let target: number | null
    let systemScore: number
    let breakdown: ScoreBreakdown | null

    if (isObjectFormat) {
      // NEW OBJECT FORMAT: {test_item, usl, lsl, actual, score_breakdown}
      testItem = String(item.test_item || '')
      usl = item.usl !== null && item.usl !== undefined ? Number(item.usl) : null
      lsl = item.lsl !== null && item.lsl !== undefined ? Number(item.lsl) : null
      actual = item.actual !== null && item.actual !== undefined ? Number(item.actual) : 0

      // Extract score from breakdown
      breakdown =
        item.score_breakdown && typeof item.score_breakdown === 'object'
          ? (item.score_breakdown as ScoreBreakdown)
          : null

      // Extract score: prefer final_score, fallback to score for backward compatibility
      // biome-ignore lint/suspicious/noExplicitAny: backward-compat fallback for legacy 'score' field
      systemScore = breakdown?.final_score ?? (breakdown as any)?.score ?? 0
      target = breakdown?.target_used ?? null

      // Debug: Log breakdown data for first item
      if (breakdown && i === 0) {
        console.log('Score Breakdown Sample (Object Format):', {
          test_item: testItem,
          breakdown,
          has_formula: !!breakdown.formula_latex,
          has_final_score: !!breakdown.final_score,
          // biome-ignore lint/suspicious/noExplicitAny: backward-compat check for legacy 'score' field
          has_score: !!(breakdown as any).score,
        })
      }
    } else {
      // OLD ARRAY FORMAT: [test_item, usl, lsl, actual, target, score, breakdown]
      const row = item as Array<string | number | null | ScoreBreakdown>
      if (row.length < 6) continue

      testItem = String(row[0] || '')
      usl = row[1] !== null ? Number(row[1]) : null
      lsl = row[2] !== null ? Number(row[2]) : null
      actual = row[3] !== null && row[3] !== undefined ? Number(row[3]) : 0
      target = row[4] !== null ? Number(row[4]) : null
      systemScore = Number(row[5] || 0)
      breakdown = row[6] && typeof row[6] === 'object' ? (row[6] as ScoreBreakdown) : null

      // Debug: Log breakdown data for first item
      if (breakdown && i === 0) {
        console.log('Score Breakdown Sample (Array Format):', {
          test_item: testItem,
          breakdown,
          has_formula: !!breakdown.formula_latex,
        })
      }
    }

    // Use system score (custom scoring now handled via formula selection in parent)
    const finalScore = systemScore
    const scoreSource = 'system'

    measurements.push({
      test_item: testItem,
      usl,
      lsl,
      actual: String(actual),
      target: target !== null ? String(target) : null,
      expected: target !== null ? String(target) : null,
      score: finalScore,
      breakdown, // Include score breakdown with LaTeX formula
      systemScore, // Keep original system score for reference
      scoreSource, // Track which formula was used
    })
  }

  return measurements
}

// Enhance results with parsed measurements
const enhancedResults = computed(() => {
  return props.results.map((result) => ({
    ...result,
    test_result: result.test_result.map((station) => ({
      ...station,
      measurement: parseMeasurements(station.data),
      // Get measurement_count from metadata first, fallback to data length
      measurement_count: Number(station.metadata?.measurement_count || station.data?.length || 0),
      device_name: station.device, // Add alias for backward compatibility
    })),
  }))
})

// Table Headers
const stationHeaders = [
  { title: 'Station', key: 'station_name', sortable: true },
  { title: 'Device', key: 'device', sortable: true },
  { title: 'Test Date', key: 'test_date', sortable: true },
  { title: 'Test Item Count', key: 'measurement_count', sortable: true, align: 'start' as const },
  { title: 'Overall Score', key: 'overall_data_score', sortable: true, align: 'start' as const },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const },
]

// Make measurementHeaders reactive to work with useStickyColumns
const measurementHeaders = computed(() => [
  { title: 'Test Item', key: 'test_item', sortable: true },
  { title: 'USL', key: 'usl', sortable: true, align: 'start' as const },
  { title: 'LSL', key: 'lsl', sortable: true, align: 'start' as const },
  { title: 'Target', key: 'target', sortable: false, align: 'center' as const },
  { title: 'Meas.', key: 'actual', sortable: false, align: 'center' as const },
  {
    title: 'Δ Meas. & Target',
    key: 'delta_actual_target',
    sortable: false,
    align: 'center' as const,
  },
  { title: 'Score', key: 'score', sortable: true, align: 'center' as const },
])

const {
  lockedColumns: measurementLockedColumns,
  columnOptions: measurementColumnOptions,
  stickyHeaders: measurementStickyHeaders,
  setColumnWidths: setMeasurementColumnWidths,
} = useStickyColumns(measurementHeaders, { initialLocked: ['test_item', 'usl', 'lsl'] })

// Computed properties
const totalStations = computed(() => {
  return enhancedResults.value.reduce((sum, result) => sum + result.test_result.length, 0)
})

// Count DUTs that have at least one station with error_item
const failedDUTsCount = computed(() => {
  return enhancedResults.value.filter((result) => {
    // Check if any station has an error_item
    return result.test_result.some(
      (station) => station.error_item && station.error_item.trim() !== '',
    )
  }).length
})

// Filtered measurements based on search and filters
const filteredMeasurements = computed(() => {
  if (!selectedMeasurement.value?.station.measurement) return []

  let filtered = selectedMeasurement.value.station.measurement

  // Apply score filter
  if (scoreFilter.value) {
    filtered = filtered.filter((m) => {
      if (scoreFilter.value === 'high') return m.score >= 9
      if (scoreFilter.value === 'medium') return m.score >= 7 && m.score < 9
      if (scoreFilter.value === 'low') return m.score < 7
      return true
    })
  }

  // Apply limit filter
  if (limitFilter.value) {
    filtered = filtered.filter((m) => {
      const actual = parseFloat(m.actual)
      if (Number.isNaN(actual)) return false

      const withinLimits =
        (m.lsl === null || actual >= m.lsl) && (m.usl === null || actual <= m.usl)

      if (limitFilter.value === 'within') return withinLimits
      if (limitFilter.value === 'out') return !withinLimits
      return true
    })
  }

  return filtered
})

// Comparison feature computed properties
// Get all unique station names across all DUTs with site and model information
// Only show stations that exist in ALL DUTs with matching Site/Model
const comparisonStations = computed(() => {
  if (enhancedResults.value.length === 0) return []

  // Group DUTs by Site/Model combination
  const siteModelGroups = new Map<string, typeof enhancedResults.value>()

  enhancedResults.value.forEach((result) => {
    const key = `${result.site_name || 'Unknown'}|${result.model_name || 'Unknown'}`
    if (!siteModelGroups.has(key)) {
      siteModelGroups.set(key, [])
    }
    siteModelGroups.get(key)?.push(result)
  })

  // For each Site/Model group, find stations that exist in ALL DUTs
  const stationOptions: Array<{
    value: string
    title: string
    raw: { station: string; site: string; model: string }
  }> = []

  siteModelGroups.forEach((dutGroup) => {
    if (dutGroup.length === 0) return

    // Get stations from first DUT in this group
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

    // Filter to only stations present in ALL DUTs of this Site/Model group
    potentialStations.forEach((stationInfo, stationName) => {
      const existsInAllDUTs = dutGroup.every((dut) =>
        dut.test_result.some((s) => s.station_name === stationName),
      )

      if (existsInAllDUTs) {
        stationOptions.push({
          value: stationName,
          title: stationName, // Display only station name in selector
          raw: stationInfo,
        })
      }
    })
  })

  return stationOptions.sort((a, b) => a.title.localeCompare(b.title))
})

// Build comparison headers dynamically based on DUTs
const comparisonHeaders = computed(() => {
  const baseHeaders = [
    { title: 'Test Item', key: 'test_item', sortable: true },
    { title: 'USL', key: 'usl', sortable: true, align: 'start' as const },
    { title: 'LSL', key: 'lsl', sortable: true, align: 'start' as const },
  ]

  // Add Target column (before Actual columns)
  const targetHeader = {
    title: 'Target',
    key: 'target',
    sortable: false,
    align: 'center' as const,
    width: '120px',
  }

  // Add Actual columns for each DUT
  const measuredHeaders = enhancedResults.value.map((result) => ({
    title: `Meas.\n${result.dut_isn}`,
    key: `measured_${result.dut_isn}`,
    sortable: false,
    align: 'center' as const,
  }))

  // Add Meas.Max Diff column (Maximum difference between actual values)
  const actMaxDiffHeader = {
    title: 'Meas.Max Diff',
    key: 'measured_max_diff',
    sortable: true,
    align: 'center' as const,
  }

  // Add Delta Act.Tar columns for each DUT
  const deltaHeaders = enhancedResults.value.map((result) => ({
    title: `Δ Meas. & Target\n${result.dut_isn}`,
    key: `delta_mt_${result.dut_isn}`,
    sortable: false,
    align: 'center' as const,
  }))

  // Add Score columns for each DUT
  const scoreHeaders = enhancedResults.value.map((result) => ({
    title: `Score\n${result.dut_isn}`,
    key: `score_${result.dut_isn}`,
    sortable: true,
    align: 'center' as const,
  }))

  // Order: Test Item | USL | LSL | Target | Meas.(\n)ISN1 | Meas.(\n) ISN2 | Meas.Max Diff | Δ Meas. & Target(\n)ISN1 | Δ Meas. & Target(\n)ISN2 | Score(\n)ISN1 | Score(\n)ISN2
  return [
    ...baseHeaders,
    targetHeader,
    ...measuredHeaders,
    actMaxDiffHeader,
    ...deltaHeaders,
    ...scoreHeaders,
  ]
})

const {
  lockedColumns: comparisonLockedColumns,
  columnOptions: comparisonColumnOptions,
  stickyHeaders: comparisonStickyHeaders,
  setColumnWidths: setComparisonColumnWidths,
} = useStickyColumns(comparisonHeaders, { initialLocked: ['test_item', 'usl', 'lsl', 'target'] })

// Column width measurement (keeps natural widths for sticky columns)
const measurementColumnWidths = ref<Record<string, number>>({})
const comparisonColumnWidths = ref<Record<string, number>>({})

const measurementHeadersWithWidths = computed(() => {
  let cumulativeLeft = 0
  return measurementStickyHeaders.value.map((header) => {
    const key = String(header.key ?? '')
    const isLocked = measurementLockedColumns.value.includes(key)

    if (isLocked) {
      const width = measurementColumnWidths.value[key] || 0
      const leftPosition = cumulativeLeft
      const result = {
        ...header,
        width: width || undefined,
        cellProps: () => ({
          class: 'locked-column',
          style: `position: sticky !important; left: ${leftPosition}px !important; z-index: 2 !important; background-color: rgb(var(--v-theme-surface)) !important;`,
        }),
        // Add headerProps to style the header cells with both horizontal and vertical sticky
        headerProps: {
          class: 'locked-column locked-header',
          style: `position: sticky !important; left: ${leftPosition}px !important; top: 0px !important; z-index: 10 !important; background-color: rgb(var(--v-theme-surface)) !important;`,
        },
      }
      if (width > 0) {
        cumulativeLeft += width
      }
      return result
    }
    return header
  })
})

const comparisonHeadersWithWidths = computed(() => {
  let cumulativeLeft = 0
  return comparisonStickyHeaders.value.map((header) => {
    const key = String(header.key ?? '')
    const isLocked = comparisonLockedColumns.value.includes(key)

    if (isLocked) {
      const width = comparisonColumnWidths.value[key] || 0
      const leftPosition = cumulativeLeft
      const result = {
        ...header,
        width: width || undefined,
        cellProps: () => ({
          class: 'locked-column',
          style: `position: sticky !important; left: ${leftPosition}px !important; z-index: 2 !important; background-color: rgb(var(--v-theme-surface)) !important;`,
        }),
        // Add headerProps to style the header cells with both horizontal and vertical sticky
        headerProps: {
          class: 'locked-column locked-header',
          style: `position: sticky !important; left: ${leftPosition}px !important; top: 0px !important; z-index: 10 !important; background-color: rgb(var(--v-theme-surface)) !important;`,
        },
      }
      if (width > 0) {
        cumulativeLeft += width
      }
      return result
    }
    return header
  })
})

const measurementTableRef = ref<HTMLElement | null>(null)
const comparisonTableRef = ref<HTMLElement | null>(null)
const comparisonFullscreenTableRef = ref<HTMLElement | null>(null)

function measureLockedColumns(
  tableEl: HTMLElement | null,
  lockedKeys: string[],
  setter: (map: Record<string, number>) => void,
) {
  if (!tableEl) return

  // Access the actual DOM element from Vue component instance
  // Vue component refs have $el property that contains the root DOM element
  let actualTableEl: HTMLElement | null = null

  // biome-ignore lint/suspicious/noExplicitAny: Vue component ref may be a component instance with $el
  if ((tableEl as any)?.$el) {
    // It's a Vue component instance
    // biome-ignore lint/suspicious/noExplicitAny: Vue component ref $el accessor
    actualTableEl = (tableEl as any).$el.querySelector('table')
  } else if (tableEl instanceof HTMLElement) {
    // It's already a DOM element
    actualTableEl = tableEl.querySelector('table')
  }

  if (!actualTableEl) {
    console.warn('Could not find table element for width measurement')
    return
  }

  const newMap: Record<string, number> = {}
  const headers = actualTableEl.querySelectorAll('thead th')

  if (headers.length === 0) {
    console.warn('No table headers found for width measurement')
    return
  }

  // biome-ignore lint/suspicious/noExplicitAny: DOM element iterated from querySelectorAll
  headers.forEach((th: any) => {
    // Try to get the key from data attribute or text content
    const key = th.getAttribute('data-key') || th.textContent?.trim()?.replace(/\n/g, '')

    // Find matching header to get the actual key
    const allHeaders = [...measurementHeaders.value, ...comparisonHeaders.value]
    const matchingHeader = allHeaders.find((h) => {
      const headerTitle = h.title?.replace(/\n/g, '')
      return h.key === key || headerTitle === key
    })

    const actualKey = matchingHeader ? matchingHeader.key : key

    if (actualKey && lockedKeys.includes(actualKey)) {
      const rectWidth = Math.ceil(th.getBoundingClientRect().width)
      const computedWidth = rectWidth > 0 ? rectWidth : Math.ceil(th.offsetWidth || 0)
      newMap[actualKey] = computedWidth || 160
    }
  })

  setter(newMap)
}

function measureMeasurementWidths() {
  nextTick(() => {
    // Add a small delay to ensure the table is fully rendered
    setTimeout(() => {
      measureLockedColumns(measurementTableRef.value, measurementLockedColumns.value, (map) => {
        measurementColumnWidths.value = map
        setMeasurementColumnWidths(map)
      })
    }, 100)
  })
}

function measureComparisonWidths() {
  nextTick(() => {
    // Add a small delay to ensure the table is fully rendered
    setTimeout(() => {
      const tableEl = comparisonFullscreenTableRef.value || comparisonTableRef.value
      measureLockedColumns(tableEl, comparisonLockedColumns.value, (map) => {
        comparisonColumnWidths.value = map
        setComparisonColumnWidths(map)
      })
    }, 100)
  })
}

// Build comparison data for selected station
const comparisonData = computed(() => {
  if (!selectedCompareStation.value) return []

  // First, collect all test item names and create a global ordering
  // Use the first DUT's order as the canonical order
  let canonicalOrder: string[] = []
  const firstResult = enhancedResults.value[0]
  if (firstResult) {
    const firstStation = firstResult.test_result.find(
      (s) => s.station_name === selectedCompareStation.value,
    )
    if (firstStation) {
      const measurements = parseMeasurements(firstStation.data)
      canonicalOrder = measurements.map((m) => m.test_item)
    }
  }

  // Collect all test items from all DUTs for the selected station
  // biome-ignore lint/suspicious/noExplicitAny: dynamic comparison data with computed DUT-specific keys
  const testItemMap = new Map<string, any>()

  enhancedResults.value.forEach((result) => {
    const station = result.test_result.find((s) => s.station_name === selectedCompareStation.value)
    if (!station) return

    const measurements = parseMeasurements(station.data)
    measurements.forEach((m) => {
      if (!testItemMap.has(m.test_item)) {
        // Get global index from canonical order
        const globalIndex = canonicalOrder.indexOf(m.test_item)

        testItemMap.set(m.test_item, {
          test_item: m.test_item,
          usl: m.usl,
          lsl: m.lsl,
          target: m.target,
          _global_index: globalIndex >= 0 ? globalIndex : 9999, // Items not in canonical order go to end
        })
      }

      // Add this DUT's score and measured value
      const entry = testItemMap.get(m.test_item)
      if (entry) {
        entry[`score_${result.dut_isn}`] = m.score
        entry[`measured_${result.dut_isn}`] = m.actual

        // Store breakdown data for score dialog
        entry[`breakdown_${result.dut_isn}`] = m.breakdown

        // Calculate Delta M.T (Measured - Target)
        if (m.actual !== null && m.actual !== '' && m.target !== null) {
          const measuredNum = parseFloat(m.actual)
          const targetNum = parseFloat(m.target)
          if (!Number.isNaN(measuredNum) && !Number.isNaN(targetNum)) {
            entry[`delta_mt_${result.dut_isn}`] = measuredNum - targetNum
          }
        }
      }
    })
  })

  // Calculate max differences for each test item
  const comparisonItems = Array.from(testItemMap.values()).map((item) => {
    const scores: number[] = []
    const measuredValues: number[] = []

    enhancedResults.value.forEach((result) => {
      const score = item[`score_${result.dut_isn}`]
      const measured = item[`measured_${result.dut_isn}`]

      if (score !== undefined) {
        scores.push(score)
      }

      if (measured !== undefined && measured !== '') {
        const measuredNum = parseFloat(measured)
        if (!Number.isNaN(measuredNum)) {
          measuredValues.push(measuredNum)
        }
      }
    })

    const scoreDiff = scores.length > 1 ? Math.max(...scores) - Math.min(...scores) : null

    // Calculate Meas.Max Diff (maximum difference between measured values)
    const measuredMaxDiff =
      measuredValues.length > 1 ? Math.max(...measuredValues) - Math.min(...measuredValues) : null

    return {
      ...item,
      score_diff: scoreDiff,
      measured_max_diff: measuredMaxDiff,
    }
  })

  // Sort by global index to maintain consistent canonical order across all DUTs
  return comparisonItems.sort((a, b) => {
    return (a._global_index ?? 9999) - (b._global_index ?? 9999)
  })
})

// Filtered comparison data based on search
const filteredComparisonData = computed(() => {
  let filtered = comparisonData.value

  // Apply search filter
  if (comparisonSearch.value) {
    const searchLower = comparisonSearch.value.toLowerCase()
    filtered = filtered.filter((item) => item.test_item.toLowerCase().includes(searchLower))
  }

  // Apply score filter (check all DUT scores)
  if (comparisonScoreFilter.value) {
    filtered = filtered.filter((item) => {
      // Check if any DUT score matches the filter criteria
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

  // Apply limit status filter (check all DUT measured values)
  if (comparisonLimitFilter.value) {
    filtered = filtered.filter((item) => {
      // Check if any DUT measured value matches the filter criteria
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

watch([measurementLockedColumns, filteredMeasurements], measureMeasurementWidths, {
  immediate: true,
})
watch([comparisonLockedColumns, filteredComparisonData], measureComparisonWidths, {
  immediate: true,
})

// Watch for locked columns changes specifically to ensure proper width measurement
watch(
  measurementLockedColumns,
  () => {
    // Clear existing widths first
    measurementColumnWidths.value = {}
    // Then measure new widths
    measureMeasurementWidths()
  },
  { deep: true },
)

watch(
  comparisonLockedColumns,
  () => {
    // Clear existing widths first
    comparisonColumnWidths.value = {}
    // Then measure new widths
    measureComparisonWidths()
  },
  { deep: true },
)

onMounted(() => {
  measureMeasurementWidths()
  measureComparisonWidths()
})

// Methods
async function fetchLinkedIdentifiers(isn: string) {
  // Validate ISN format before making API call
  if (!isn || isn.length < 10) {
    linkedIdentifiers.value = []
    return
  }

  loadingIdentifiers.value = true
  try {
    // Use getDUTISNVariants to get all ISN variants linked to this DUT
    // The endpoint returns all ISNs including the search ISN in the response
    const response = await dutApi.getDUTISNVariants(isn)
    // Store all linked ISNs including the search ISN
    linkedIdentifiers.value = response
  } catch (_error) {
    // Silently handle error - linked identifiers are optional
    linkedIdentifiers.value = []
  } finally {
    loadingIdentifiers.value = false
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch (_error) {
    // Silently handle clipboard errors
  }
}

function getScoreColor(score: number): string {
  // Score color mapping based on 0-10 scale:
  // Score ≥9: Excellent (green)
  // Score ≥7: Good (blue/primary)
  // Score <7: Warning/Error (yellow/red)
  if (score >= 9) return 'success' // Excellent (green)
  if (score >= 7) return 'primary' // Good (blue)
  if (score >= 4) return 'warning' // Acceptable (yellow/orange)
  return 'error' // Poor (red)
}

// Score source type for backward compatibility
type ScoreSource = 'category' | 'universal' | 'system'

function getScoreSourceIcon(source: ScoreSource): string {
  switch (source) {
    case 'category':
      return 'mdi-target'
    case 'universal':
      return 'mdi-earth'
    default:
      return 'mdi-cog'
  }
}

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

  // Green (success): delta = 0 - 0.5 (very close match)
  if (absDelta <= 0.5) return 'success'

  // Blue (primary): |delta| <= 1 (close, above 0.5 until 1)
  if (absDelta <= 1) return 'primary'

  // Orange (warning): |delta| < 3 (acceptable)
  if (absDelta < 3) return 'warning'

  // Red (error): |delta| >= 3 (significant deviation)
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

// Handle score breakdown click
function handleScoreClick(item: TopProductMeasurement) {
  console.log('Score clicked:', { item, has_breakdown: !!item.breakdown })
  if (item.breakdown) {
    console.log('Opening breakdown dialog with:', item.breakdown)
    // Create a wrapper object that matches ParsedTestItemEnhanced interface
    selectedScoreBreakdown.value = {
      test_item: item.test_item,
      value: item.actual,
      score: item.score,
      score_breakdown: item.breakdown,
      // biome-ignore lint/suspicious/noExplicitAny: type assertion needed for ParsedTestItemEnhanced interface mismatch
    } as any

    // Open dialog immediately - component is always mounted
    scoreBreakdownDialog.value = true
  } else {
    console.warn('No breakdown data available for:', item.test_item)
  }
}

// Handle score breakdown click from comparison table
// biome-ignore lint/suspicious/noExplicitAny: dynamic comparison item with DUT-specific computed keys
function handleComparisonScoreClick(comparisonItem: any, dutIsn: string) {
  const breakdown = comparisonItem[`breakdown_${dutIsn}`]
  const score = comparisonItem[`score_${dutIsn}`]
  const measuredValue = comparisonItem[`measured_${dutIsn}`]

  console.log('Comparison score clicked:', {
    test_item: comparisonItem.test_item,
    dut_isn: dutIsn,
    has_breakdown: !!breakdown,
  })

  if (breakdown) {
    console.log('Opening breakdown dialog with:', breakdown)
    selectedScoreBreakdown.value = {
      test_item: comparisonItem.test_item,
      value: measuredValue,
      score: score,
      score_breakdown: breakdown,
      // biome-ignore lint/suspicious/noExplicitAny: type assertion needed for ParsedTestItemEnhanced interface mismatch
    } as any

    // Open dialog immediately - component is always mounted
    scoreBreakdownDialog.value = true
  } else {
    console.warn('No breakdown data available for:', comparisonItem.test_item, 'DUT:', dutIsn)
  }
}

function getActualValueColor(measurement: TopProductMeasurement): string {
  const actual = parseFloat(measurement.actual)
  if (Number.isNaN(actual)) return 'default'

  const withinLimits =
    (measurement.lsl === null || actual >= measurement.lsl) &&
    (measurement.usl === null || actual <= measurement.usl)

  if (!withinLimits) return 'error'

  // Check if value is close to limits (within 10%)
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

// Get color for measured values in comparison view
// biome-ignore lint/suspicious/noExplicitAny: accepts string or number from dynamic comparison data
function getMeasuredValueColor(measuredValue: any, usl: number | null, lsl: number | null): string {
  const actual = parseFloat(measuredValue)
  if (Number.isNaN(actual)) return 'default'

  const withinLimits = (lsl === null || actual >= lsl) && (usl === null || actual <= usl)

  if (!withinLimits) return 'error'

  // Check if value is close to limits (within 10%)
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
  // Find the DUT result for this ISN
  const dutResult = enhancedResults.value.find((r) => r.dut_isn === payload.isn)
  if (!dutResult) return

  // Find the station result matching the station name
  const stationResult = dutResult.test_result.find(
    (r: TopProductStationResult) => r.station_name === payload.stationName,
  )
  if (!stationResult) return

  showMeasurements(payload.isn, stationResult)
}

function showMeasurements(dutISN: string, station: TopProductStationResult) {
  selectedMeasurement.value = { dutISN, station }
  measurementDialog.value = true
}
</script>

<style scoped>
.font-mono {
    font-family: 'Courier New', Courier, monospace;
}

.cursor-pointer {
    cursor: pointer;
}

:deep(.v-data-table-footer) {
    padding: 4px 8px !important;
    min-height: 40px !important;
}

:deep(.v-data-table-footer .v-data-table-footer__items-per-page) {
    margin: 0 8px !important;
}

:deep(.v-data-table-footer .v-data-table-footer__pagination) {
    margin: 0 8px !important;
}

.table-toolbar {
    gap: 12px;
}

/* Shared sticky table styling */
:deep(.sticky-data-table .v-table__wrapper) {
    position: relative;
    overflow: auto;
    max-height: 100%;
}

:deep(.sticky-data-table table) {
    min-width: max-content;
    table-layout: auto;
    position: relative;
}

:deep(.sticky-data-table thead th),
:deep(.sticky-data-table tbody td) {
    white-space: nowrap;
    box-sizing: border-box;
}

:deep(.sticky-data-table thead th) {
    position: sticky;
    top: 0;
    z-index: 4;
    background-color: rgb(var(--v-theme-surface));
}

/* Fixed/Sticky columns */
:deep(.sticky-data-table .v-data-table-column--fixed),
:deep(.sticky-data-table .v-data-table-column--sticky) {
    position: sticky !important;
    z-index: 3;
    background-color: rgb(var(--v-theme-surface)) !important;
    box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
}

/* Header cells that are fixed */
:deep(.sticky-data-table thead th.v-data-table-column--fixed),
:deep(.sticky-data-table thead th.v-data-table-column--sticky),
:deep(.sticky-data-table thead th.locked-column) {
    position: sticky !important;
    z-index: 5 !important;
    top: 0 !important;
    background-color: rgb(var(--v-theme-surface)) !important;
}

/* Locked header cells - highest z-index for both horizontal and vertical sticky */
:deep(.sticky-data-table thead th.locked-header) {
    position: sticky !important;
    z-index: 10 !important;
    top: 0 !important;
    background-color: rgb(var(--v-theme-surface)) !important;
    box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.15) !important;
}

/* Ensure locked headers maintain position over body cells */
:deep(.sticky-data-table thead th.locked-header)::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgb(var(--v-theme-surface));
    z-index: -1;
}

/* Body cells that are locked/sticky */
:deep(.sticky-data-table tbody td[style*="position: sticky"]),
:deep(.sticky-data-table tbody td.locked-column) {
    background-color: rgb(var(--v-theme-surface)) !important;
    z-index: 2 !important;
    box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
}

/* Ensure even/odd row colors work with sticky columns - use solid colors */
:deep(.sticky-data-table tbody tr:nth-child(even) td[style*="position: sticky"]),
:deep(.sticky-data-table tbody tr:nth-child(even) td.locked-column) {
    background-color: rgb(var(--v-theme-surface-variant)) !important;
}

/* Hover effect for sticky columns - use solid background with slight tint */
:deep(.sticky-data-table tbody tr:hover td[style*="position: sticky"]),
:deep(.sticky-data-table tbody tr:hover td.locked-column) {
    background-color: rgb(var(--v-theme-surface-light)) !important;
    filter: brightness(0.95);
}

/* Ensure hover on even rows uses the correct base color */
:deep(.sticky-data-table tbody tr:nth-child(even):hover td[style*="position: sticky"]),
:deep(.sticky-data-table tbody tr:nth-child(even):hover td.locked-column) {
    background-color: rgb(var(--v-theme-surface-variant)) !important;
    filter: brightness(0.95);
}

/* Explicit widths for locked columns to avoid overlap */
/* Do not force widths; measured widths are applied inline when columns are locked */

:deep(.sticky-data-table .v-data-table__wrapper)::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

:deep(.sticky-data-table .v-data-table__wrapper)::-webkit-scrollbar-track {
    background: rgba(var(--v-theme-on-surface), 0.05);
}

:deep(.sticky-data-table .v-data-table__wrapper)::-webkit-scrollbar-thumb {
    background: rgba(var(--v-theme-on-surface), 0.2);
    border-radius: 4px;
}

:deep(.sticky-data-table .v-data-table__wrapper)::-webkit-scrollbar-thumb:hover {
    background: rgba(var(--v-theme-on-surface), 0.3);
}
</style>
