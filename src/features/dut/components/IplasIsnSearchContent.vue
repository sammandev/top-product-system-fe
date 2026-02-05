<template>
    <div>
        <!-- Search Card -->
        <v-card elevation="2" class="mb-4">
            <v-card-title class="d-flex align-center justify-space-between bg-primary">
                <div class="d-flex align-center">
                    <v-icon class="mr-2">mdi-barcode-scan</v-icon>
                    ISN Search
                </div>
                <v-btn color="error" variant="outlined" size="small" prepend-icon="mdi-close-circle"
                    :disabled="loadingIsnSearch || (!searchIsn && selectedISNs.length === 0 && groupedByISN.length === 0)"
                    @click="clearAll">
                    Clear All
                </v-btn>
            </v-card-title>
            <v-card-text class="pt-4">
                <!-- Input Mode Toggle -->
                <v-btn-toggle v-model="inputMode" mandatory color="primary" class="mb-4">
                    <v-btn value="single" size="small">
                        <v-icon start>mdi-numeric-1-box</v-icon>
                        Single ISN
                    </v-btn>
                    <v-btn value="multiple" size="small">
                        <v-icon start>mdi-format-list-bulleted</v-icon>
                        Multiple ISNs
                    </v-btn>
                    <v-btn value="bulk" size="small">
                        <v-icon start>mdi-text-box-multiple</v-icon>
                        Bulk Paste
                    </v-btn>
                </v-btn-toggle>

                <!-- Single ISN Input -->
                <v-row v-if="inputMode === 'single'">
                    <v-col cols="12" md="8">
                        <v-text-field v-model="searchIsn" label="DUT ISN" placeholder="e.g., DM2520270073965"
                            prepend-inner-icon="mdi-barcode-scan" variant="outlined" density="comfortable" clearable
                            hint="Enter the ISN to search across all stations" persistent-hint
                            @keyup.enter="handleSearch" />
                    </v-col>
                    <v-col cols="12" md="2" class="d-flex align-center">
                        <v-btn color="primary" size="large" :loading="loadingIsnSearch" :disabled="!searchIsn?.trim()"
                            prepend-icon="mdi-magnify" block class="mb-5" @click="handleSearch">
                            Search
                        </v-btn>
                    </v-col>
                    <v-col cols="12" md="2" class="d-flex align-center">
                        <v-btn color="secondary" size="large" variant="outlined" :loading="loadingSfistspLookup"
                            :disabled="!searchIsn?.trim()" prepend-icon="mdi-link-variant" block class="mb-5"
                            @click="handleSfistspLookup">
                            Lookup Ref
                            <v-tooltip activator="parent" location="top">
                                Look up ISN references (SSN, MAC) from SFISTSP
                            </v-tooltip>
                        </v-btn>
                    </v-col>
                </v-row>

                <!-- Multiple ISNs Combobox -->
                <v-row v-if="inputMode === 'multiple'">
                    <v-col cols="12">
                        <v-combobox v-model="selectedISNs" label="DUT ISNs" placeholder="Type ISN and press Enter"
                            prepend-inner-icon="mdi-barcode-scan" variant="outlined" chips multiple closable-chips
                            clearable hint="Type ISN and press Enter to add multiple" persistent-hint>
                            <template #chip="{ props, item }">
                                <v-chip v-bind="props" :text="String(item.value || item)" closable />
                            </template>
                            <template #append>
                                <v-btn color="primary" variant="flat" size="small" :loading="loadingIsnSearch"
                                    :disabled="!selectedISNs || selectedISNs.length === 0" prepend-icon="mdi-magnify"
                                    @click="handleSearch">
                                    Search
                                </v-btn>
                            </template>
                        </v-combobox>
                    </v-col>
                </v-row>

                <!-- Bulk Paste Textarea -->
                <v-row v-if="inputMode === 'bulk'">
                    <v-col cols="12">
                        <v-textarea v-model="searchIsn" label="Bulk ISN Input"
                            placeholder="Paste multiple ISNs (one per line, comma-separated, or space-separated)&#10;Example:&#10;DM2520270073965&#10;DM2527470036123"
                            prepend-inner-icon="mdi-text-box-multiple" variant="outlined" rows="4" clearable
                            hint="Paste ISNs separated by newlines, commas, or spaces" persistent-hint>
                            <template #append>
                                <v-btn color="primary" variant="flat" size="small" :loading="loadingIsnSearch"
                                    :disabled="!searchIsn?.trim()" prepend-icon="mdi-magnify" @click="handleSearch">
                                    Search
                                </v-btn>
                            </template>
                        </v-textarea>
                    </v-col>
                </v-row>

                <!-- SFISTSP Reference Results (shown when lookup is performed) -->
                <v-expand-transition>
                    <v-card v-if="sfistspReferences.length > 0" variant="outlined" color="info" class="mt-4">
                        <v-card-title class="text-subtitle-1 bg-info d-flex align-center justify-space-between">
                            <div class="d-flex align-center">
                                <v-icon class="mr-2" size="small">mdi-link-variant</v-icon>
                                ISN References from SFISTSP
                            </div>
                            <v-btn icon size="x-small" variant="text" @click="sfistspReferences = []">
                                <v-icon>mdi-close</v-icon>
                            </v-btn>
                        </v-card-title>
                        <v-card-text class="pt-3">
                            <v-row dense>
                                <v-col v-for="ref in sfistspReferences" :key="ref.isn" cols="12" md="4">
                                    <v-card variant="tonal" :color="ref.success ? 'success' : 'error'">
                                        <v-card-text class="pa-3">
                                            <div class="d-flex align-center justify-space-between mb-2">
                                                <span class="font-weight-bold">{{ ref.isn }}</span>
                                                <v-chip :color="ref.success ? 'success' : 'error'" size="x-small">
                                                    {{ ref.success ? 'Found' : 'Not Found' }}
                                                </v-chip>
                                            </div>
                                            <div v-if="ref.success" class="text-body-2">
                                                <div v-if="ref.ssn" class="d-flex align-center gap-2 mb-1">
                                                    <span class="text-medium-emphasis">SSN:</span>
                                                    <code class="bg-grey-lighten-4 px-1 rounded cursor-pointer"
                                                        @click="copyToClipboard(ref.ssn)">
                                                        {{ ref.ssn }}
                                                        <v-tooltip activator="parent" location="top">Click to
                                                            copy</v-tooltip>
                                                    </code>
                                                </div>
                                                <div v-if="ref.mac" class="d-flex align-center gap-2">
                                                    <span class="text-medium-emphasis">MAC:</span>
                                                    <code class="bg-grey-lighten-4 px-1 rounded cursor-pointer"
                                                        @click="copyToClipboard(ref.mac)">
                                                        {{ formatMacAddress(ref.mac) }}
                                                        <v-tooltip activator="parent" location="top">Click to
                                                            copy</v-tooltip>
                                                    </code>
                                                </div>
                                            </div>
                                            <div v-else class="text-body-2 text-error">
                                                {{ ref.errorMessage || 'No data found' }}
                                            </div>
                                        </v-card-text>
                                    </v-card>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>
                </v-expand-transition>
            </v-card-text>
        </v-card>

        <!-- Error Alert -->
        <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = null">
            {{ error }}
        </v-alert>

        <!-- No Results Alert -->
        <v-alert v-if="hasSearched && groupedByISN.length === 0 && !loadingIsnSearch" type="info" class="mb-4">
            No test records found for the provided ISN(s).
        </v-alert>

        <!-- Results Section -->
        <v-card v-if="groupedByISN.length > 0" elevation="2" class="mb-4">
            <v-card-title class="bg-secondary d-flex justify-space-between align-center">
                <div>
                    <v-icon icon="mdi-database-outline" class="mr-2" />
                    Test Records Results
                    <v-chip size="small" color="white" variant="outlined" class="ml-2">
                        {{ groupedByISN.length }} ISN(s)
                    </v-chip>
                </div>
                <div class="d-flex align-center gap-2">
                    <v-btn v-if="selectedRecordIndices.length > 0" color="success" variant="tonal" size="small"
                        :loading="downloading" @click="downloadSelectedRecords">
                        <v-icon start size="small">mdi-download-multiple</v-icon>
                        Download Selected ({{ selectedRecordIndices.length }})
                    </v-btn>
                    <v-btn size="small" variant="outlined" color="white" @click="toggleExpandAll">
                        <v-icon start>{{ allExpanded ? 'mdi-arrow-collapse-vertical' : 'mdi-arrow-expand-vertical'
                            }}</v-icon>
                        {{ allExpanded ? 'Collapse All' : 'Expand All' }}
                    </v-btn>
                </div>
            </v-card-title>
            <v-card-text class="pa-4">
                <!-- Tabs for each ISN -->
                <v-tabs v-model="activeISNTab" color="primary" class="mb-4">
                    <v-tab v-for="(isnGroup, index) in groupedByISN" :key="isnGroup.isn" :value="index">
                        <v-btn icon size="x-small" variant="text" class="mr-1"
                            @click.stop="copyToClipboard(isnGroup.isn)">
                            <v-icon size="small">mdi-content-copy</v-icon>
                            <v-tooltip activator="parent" location="top">Copy ISN</v-tooltip>
                        </v-btn>
                        <span>{{ isnGroup.isn }}</span>
                        <v-chip v-if="isnGroup.hasError" size="x-small" color="error" class="ml-2">
                            {{ isnGroup.errorCount }}
                        </v-chip>
                        <v-chip v-else size="x-small" color="success" class="ml-2">
                            {{ isnGroup.records.length }}
                        </v-chip>
                    </v-tab>
                </v-tabs>

                <v-window v-model="activeISNTab">
                    <v-window-item v-for="(isnGroup, isnIndex) in groupedByISN" :key="isnGroup.isn" :value="isnIndex"
                        eager>
                        <!-- Site, Project & View Mode Controls -->
                        <div class="d-flex justify-space-between align-center flex-wrap gap-3 mb-4">
                            <!-- Highlighted Site & Project Info -->
                            <div class="d-flex align-center gap-4">
                                <div>
                                    <div class="text-caption text-medium-emphasis">Site</div>
                                    <div class="text-subtitle-1 font-weight-bold text-primary">{{ isnGroup.site }}</div>
                                </div>
                                <v-divider vertical />
                                <div>
                                    <div class="text-caption text-medium-emphasis">Project</div>
                                    <div class="text-subtitle-1 font-weight-bold text-primary">{{ isnGroup.project }}</div>
                                </div>
                                <v-divider vertical />
                                <div>
                                    <div class="text-caption text-medium-emphasis">Stations</div>
                                    <div class="text-subtitle-1 font-weight-bold text-info">{{ isnGroup.stations.length }}</div>
                                </div>
                                <v-divider vertical />
                                <div>
                                    <div class="text-caption text-medium-emphasis">Total Records</div>
                                    <div class="text-subtitle-1 font-weight-bold text-info">{{ isnGroup.records.length }}</div>
                                </div>
                                <v-divider vertical />
                                <div>
                                    <div class="text-caption text-medium-emphasis">Status</div>
                                    <v-chip :color="isnGroup.hasError ? 'error' : 'success'" size="small">
                                        {{ isnGroup.hasError ? 'HAS ERRORS' : 'ALL PASS' }}
                                    </v-chip>
                                </div>
                            </div>

                            <!-- View Mode Toggle -->
                            <v-btn-toggle v-model="viewMode" color="primary" mandatory variant="outlined" density="compact">
                                <v-btn value="grid" size="small">
                                    <v-icon>mdi-view-grid</v-icon>
                                    <span class="ml-1 d-none d-sm-inline">Grid</span>
                                </v-btn>
                                <v-btn value="list" size="small">
                                    <v-icon>mdi-view-list</v-icon>
                                    <span class="ml-1 d-none d-sm-inline">List</span>
                                </v-btn>
                                <v-btn value="table" size="small">
                                    <v-icon>mdi-table</v-icon>
                                    <span class="ml-1 d-none d-sm-inline">Table</span>
                                </v-btn>
                                <v-btn value="compact" size="small">
                                    <v-icon>mdi-view-compact</v-icon>
                                    <span class="ml-1 d-none d-sm-inline">Compact</span>
                                </v-btn>
                            </v-btn-toggle>
                        </div>

                        <v-divider class="mb-4" />

                        <!-- Grid View - Show all stations as cards -->
                        <v-row v-if="viewMode === 'grid'">
                            <v-col v-for="(stationGroup, stationIndex) in isnGroup.stations" :key="`grid-station-${stationGroup.stationName}`" cols="12" md="4">
                                <v-card variant="outlined" class="h-100">
                                    <v-card-title :class="hasLatestStationError(stationGroup) ? 'bg-red-lighten-4' : 'bg-secondary'">
                                        <div class="d-flex align-center w-100">
                                            <span class="font-weight-bold">{{ stationGroup.displayName }}</span>
                                            <v-spacer />
                                            <v-chip v-if="getStationErrorCount(stationGroup) > 0" size="small" color="error" variant="flat">
                                                {{ getStationErrorCount(stationGroup) }} error(s)
                                            </v-chip>
                                        </div>
                                    </v-card-title>
                                    <v-card-text class="pa-0">
                                        <!-- Multiple records: Carousel with custom navigation -->
                                        <div v-if="getDisplayedStationRecords(isnGroup, stationGroup).length > 1">
                                            <span v-show="false">{{ initializeCarousel(`${isnGroup.isn}-${stationGroup.stationName}`, getDisplayedStationRecords(isnGroup, stationGroup).length) }}</span>
                                            <!-- Navigation Controls -->
                                            <div class="d-flex justify-center align-center gap-4 pa-1 bg-grey-lighten-4">
                                                <v-btn icon size="x-small" variant="text"
                                                    :disabled="(carouselModels[`${isnGroup.isn}-${stationGroup.stationName}`] || 0) === 0"
                                                    @click="carouselModels[`${isnGroup.isn}-${stationGroup.stationName}`] = 0">
                                                    <v-icon>mdi-page-first</v-icon>
                                                </v-btn>
                                                <v-btn icon size="small" variant="text"
                                                    :disabled="(carouselModels[`${isnGroup.isn}-${stationGroup.stationName}`] || 0) === 0"
                                                    @click="carouselModels[`${isnGroup.isn}-${stationGroup.stationName}`] = Math.max(0, (carouselModels[`${isnGroup.isn}-${stationGroup.stationName}`] || 0) - 1)">
                                                    <v-icon>mdi-chevron-left</v-icon>
                                                </v-btn>
                                                <v-chip color="primary" variant="flat" size="small">
                                                    Record {{ (carouselModels[`${isnGroup.isn}-${stationGroup.stationName}`] || 0) + 1 }} / {{ getDisplayedStationRecords(isnGroup, stationGroup).length }}
                                                </v-chip>
                                                <v-btn icon size="small" variant="text"
                                                    :disabled="(carouselModels[`${isnGroup.isn}-${stationGroup.stationName}`] || 0) >= getDisplayedStationRecords(isnGroup, stationGroup).length - 1"
                                                    @click="carouselModels[`${isnGroup.isn}-${stationGroup.stationName}`] = Math.min(getDisplayedStationRecords(isnGroup, stationGroup).length - 1, (carouselModels[`${isnGroup.isn}-${stationGroup.stationName}`] || 0) + 1)">
                                                    <v-icon>mdi-chevron-right</v-icon>
                                                </v-btn>
                                                <v-btn icon size="x-small" variant="text"
                                                    :disabled="(carouselModels[`${isnGroup.isn}-${stationGroup.stationName}`] || 0) >= getDisplayedStationRecords(isnGroup, stationGroup).length - 1"
                                                    @click="carouselModels[`${isnGroup.isn}-${stationGroup.stationName}`] = getDisplayedStationRecords(isnGroup, stationGroup).length - 1">
                                                    <v-icon>mdi-page-last</v-icon>
                                                </v-btn>
                                            </div>
                                            <!-- Carousel Content -->
                                            <v-window v-model="carouselModels[`${isnGroup.isn}-${stationGroup.stationName}`]" class="pa-2">
                                                <v-window-item v-for="(record, idx) in getDisplayedStationRecords(isnGroup, stationGroup)" :key="`grid-${record.device_id}-${idx}`" :value="idx">
                                                    <div :class="isStatusPass(record.test_status) && isStatusPass(record.error_code) ? 'bg-green-lighten-5 pa-3 rounded' : 'bg-red-lighten-5 pa-3 rounded'">
                                                        <!-- Device Name with ISN and Status Icon -->
                                                        <div class="d-flex align-center mb-3">
                                                            <v-icon :color="isStatusPass(record.test_status) && isStatusPass(record.error_code) ? 'success' : 'error'" size="large" class="mr-2">
                                                                {{ isStatusPass(record.test_status) && isStatusPass(record.error_code) ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                                                            </v-icon>
                                                            <div class="text-h6">{{ record.device_id }}</div>
                                                            <v-chip color="primary" variant="outlined" size="small" class="ml-2 font-weight-bold" label>
                                                                <v-icon start size="small">mdi-barcode</v-icon>
                                                                {{ record.isn }}
                                                            </v-chip>
                                                        </div>
                                                        <!-- Status Chip -->
                                                        <div class="mb-3">
                                                            <v-chip :color="isStatusPass(record.test_status) && isStatusPass(record.error_code) ? 'success' : 'error'" size="small" label>
                                                                {{ isStatusPass(record.test_status) && isStatusPass(record.error_code) ? 'PASS' : (record.error_name || record.error_code || 'FAIL') }}
                                                            </v-chip>
                                                        </div>
                                                        <!-- Date and Duration Chips -->
                                                        <div class="d-flex align-center gap-2 mb-3">
                                                            <v-chip size="small" label color="default">
                                                                <v-icon start size="small">mdi-calendar</v-icon>
                                                                {{ formatShortTime(record.test_end_time) }}
                                                            </v-chip>
                                                            <span class="text-medium-emphasis">•</span>
                                                            <v-chip size="small" label color="default">
                                                                <v-icon start size="small">mdi-timer</v-icon>
                                                                {{ calculateDuration(record.test_start_time, record.test_end_time) }}
                                                            </v-chip>
                                                        </div>
                                                        <!-- Action Buttons -->
                                                        <div class="d-flex gap-2">
                                                            <v-btn color="secondary" size="small" prepend-icon="mdi-fullscreen" @click="openFullscreen(record)">
                                                                Details
                                                            </v-btn>
                                                            <v-btn color="primary" size="small" prepend-icon="mdi-download"
                                                                :loading="downloadingKey === `${isnIndex}-${stationIndex}-${idx}`"
                                                                @click="downloadSingleRecord(record, `${isnIndex}-${stationIndex}`, idx)">
                                                                Download
                                                            </v-btn>
                                                        </div>
                                                    </div>
                                                </v-window-item>
                                            </v-window>
                                        </div>
                                        <!-- Single record: Direct card -->
                                        <div v-else-if="getDisplayedStationRecords(isnGroup, stationGroup).length === 1">
                                            <!-- Navigation Controls (disabled for single record) -->
                                            <div class="d-flex justify-center align-center gap-3 pa-1 bg-grey-lighten-4">
                                                <v-btn icon size="x-small" variant="text" disabled><v-icon>mdi-page-first</v-icon></v-btn>
                                                <v-btn icon size="small" variant="text" disabled><v-icon>mdi-chevron-left</v-icon></v-btn>
                                                <v-chip color="primary" variant="flat" size="small">Record 1 / 1</v-chip>
                                                <v-btn icon size="small" variant="text" disabled><v-icon>mdi-chevron-right</v-icon></v-btn>
                                                <v-btn icon size="x-small" variant="text" disabled><v-icon>mdi-page-last</v-icon></v-btn>
                                            </div>
                                            <div class="pa-2">
                                                <div v-for="(record, idx) in getDisplayedStationRecords(isnGroup, stationGroup).slice(0, 1)" :key="`grid-single-${idx}`"
                                                    :class="isStatusPass(record.test_status) && isStatusPass(record.error_code) ? 'bg-green-lighten-5 pa-3 rounded' : 'bg-red-lighten-5 pa-3 rounded'">
                                                    <div class="d-flex align-center mb-3">
                                                        <v-icon :color="isStatusPass(record.test_status) && isStatusPass(record.error_code) ? 'success' : 'error'" size="large" class="mr-2">
                                                            {{ isStatusPass(record.test_status) && isStatusPass(record.error_code) ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                                                        </v-icon>
                                                        <div class="text-h6">{{ record.device_id }}</div>
                                                        <v-chip color="primary" variant="outlined" size="small" class="ml-2 font-weight-bold" label>
                                                            <v-icon start size="small">mdi-barcode</v-icon>
                                                            {{ record.isn }}
                                                        </v-chip>
                                                    </div>
                                                    <div class="mb-3">
                                                        <v-chip :color="isStatusPass(record.test_status) && isStatusPass(record.error_code) ? 'success' : 'error'" size="small" label>
                                                            {{ isStatusPass(record.test_status) && isStatusPass(record.error_code) ? 'PASS' : (record.error_name || record.error_code || 'FAIL') }}
                                                        </v-chip>
                                                    </div>
                                                    <div class="d-flex align-center gap-2 mb-3">
                                                        <v-chip size="small" label color="default">
                                                            <v-icon start size="small">mdi-calendar</v-icon>
                                                            {{ formatShortTime(record.test_end_time) }}
                                                        </v-chip>
                                                        <span class="text-medium-emphasis">•</span>
                                                        <v-chip size="small" label color="default">
                                                            <v-icon start size="small">mdi-timer</v-icon>
                                                            {{ calculateDuration(record.test_start_time, record.test_end_time) }}
                                                        </v-chip>
                                                    </div>
                                                    <div class="d-flex gap-2">
                                                        <v-btn color="secondary" size="small" prepend-icon="mdi-fullscreen" @click="openFullscreen(record)">
                                                            Details
                                                        </v-btn>
                                                        <v-btn color="primary" size="small" prepend-icon="mdi-download"
                                                            :loading="downloadingKey === `${isnIndex}-${stationIndex}-0`"
                                                            @click="downloadSingleRecord(record, `${isnIndex}-${stationIndex}`, 0)">
                                                            Download
                                                        </v-btn>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <!-- No records: Empty state -->
                                        <v-alert v-else type="info" variant="tonal" density="compact" class="ma-4">
                                            No test records available for this station
                                        </v-alert>
                                    </v-card-text>
                                </v-card>
                            </v-col>
                        </v-row>

                        <!-- List View - Expansion panels per station -->
                        <div v-if="viewMode === 'list'">
                            <v-expansion-panels v-model="expandedPanels[isnIndex]" multiple>
                                <v-expansion-panel v-for="(stationGroup, stationIndex) in isnGroup.stations" :key="`list-station-${stationGroup.stationName}`" class="mb-3">
                                    <v-expansion-panel-title :class="hasLatestStationError(stationGroup) ? 'bg-red-lighten-4' : 'bg-secondary'">
                                        <div class="d-flex align-center w-100">
                                            <span class="font-weight-bold">{{ stationGroup.displayName }}</span>
                                            <v-spacer />
                                            <v-chip v-if="getStationErrorCount(stationGroup) > 0" size="small" color="error" variant="flat" class="mr-2">
                                                {{ getStationErrorCount(stationGroup) }} error(s)
                                            </v-chip>
                                            <v-chip size="small" color="white" variant="outlined" class="mr-2">
                                                {{ stationGroup.records.length }} record(s)
                                            </v-chip>
                                        </div>
                                    </v-expansion-panel-title>
                                    <v-expansion-panel-text class="pa-0">
                                        <v-list v-if="getDisplayedStationRecords(isnGroup, stationGroup).length > 0">
                                            <v-list-item v-for="(record, recordIndex) in getDisplayedStationRecords(isnGroup, stationGroup)"
                                                :key="`list-record-${recordIndex}`" class="border-b"
                                                :class="!isStatusPass(record.test_status) || !isStatusPass(record.error_code) ? 'bg-red-lighten-5' : ''">
                                                <template #prepend>
                                                    <v-icon :color="isStatusPass(record.test_status) && isStatusPass(record.error_code) ? 'success' : 'error'" size="large">
                                                        {{ isStatusPass(record.test_status) && isStatusPass(record.error_code) ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                                                    </v-icon>
                                                </template>
                                                <v-list-item-title>
                                                    <strong>{{ record.device_id }}</strong> • {{ record.isn }}
                                                </v-list-item-title>
                                                <v-list-item-subtitle>
                                                    <div class="d-flex flex-wrap align-center gap-2 mt-1">
                                                        <v-chip size="small" label :color="isStatusPass(record.test_status) && isStatusPass(record.error_code) ? 'success' : 'error'">
                                                            {{ isStatusPass(record.test_status) && isStatusPass(record.error_code) ? 'PASS' : record.error_name || record.error_code || 'FAIL' }}
                                                        </v-chip>
                                                        <v-chip size="small" label color="default">
                                                            {{ calculateDuration(record.test_start_time, record.test_end_time) }}
                                                        </v-chip>
                                                        <v-chip size="small" label color="default">
                                                            {{ formatShortTime(record.test_end_time) }}
                                                        </v-chip>
                                                    </div>
                                                </v-list-item-subtitle>
                                                <template #append>
                                                    <div class="d-flex gap-1">
                                                        <v-btn color="secondary" size="small" prepend-icon="mdi-fullscreen" @click="openFullscreen(record)">
                                                            Details
                                                        </v-btn>
                                                        <v-btn color="primary" size="small" prepend-icon="mdi-download"
                                                            :loading="downloadingKey === `${isnIndex}-${stationIndex}-${recordIndex}`"
                                                            @click="downloadSingleRecord(record, `${isnIndex}-${stationIndex}`, recordIndex)">
                                                            Download
                                                        </v-btn>
                                                    </div>
                                                </template>
                                            </v-list-item>
                                        </v-list>
                                        <v-alert v-else type="info" variant="tonal" density="compact" class="my-2">
                                            No test records available for this station
                                        </v-alert>
                                    </v-expansion-panel-text>
                                </v-expansion-panel>
                            </v-expansion-panels>
                        </div>

                        <!-- Table View - Expansion panels per station with data table -->
                        <div v-if="viewMode === 'table'">
                            <v-expansion-panels v-model="expandedPanels[isnIndex]" multiple>
                                <v-expansion-panel v-for="(stationGroup, stationIndex) in isnGroup.stations" :key="`table-station-${stationGroup.stationName}`" class="mb-4">
                                    <v-expansion-panel-title :class="hasLatestStationError(stationGroup) ? 'bg-red-lighten-4' : 'bg-secondary'">
                                        <div class="d-flex align-center w-100">
                                            <span class="font-weight-bold">{{ stationGroup.displayName }}</span>
                                            <v-spacer />
                                            <v-chip v-if="getStationErrorCount(stationGroup) > 0" size="small" color="error" variant="flat" class="mr-2">
                                                {{ getStationErrorCount(stationGroup) }} error(s)
                                            </v-chip>
                                            <v-chip size="small" color="white" variant="outlined" class="mr-2">
                                                {{ stationGroup.records.length }} record(s)
                                            </v-chip>
                                        </div>
                                    </v-expansion-panel-title>
                                    <v-expansion-panel-text class="pa-0">
                                        <v-data-table
                                            :headers="recordTableHeaders"
                                            :items="getDisplayedStationRecords(isnGroup, stationGroup).map((record, idx) => ({
                                                ...record,
                                                record_number: getTotalFilteredStationRecords(isnGroup, stationGroup) - idx,
                                                duration: calculateDuration(record.test_start_time, record.test_end_time),
                                                _idx: idx,
                                                _stationIndex: stationIndex
                                            }))"
                                            density="compact"
                                            :items-per-page="-1"
                                            hide-default-footer
                                        >
                                            <template #item.status="{ item }">
                                                <v-chip :color="isStatusPass(item.test_status) && isStatusPass(item.error_code) ? 'success' : 'error'" size="small" label>
                                                    <v-icon start size="small">
                                                        {{ isStatusPass(item.test_status) && isStatusPass(item.error_code) ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                                                    </v-icon>
                                                    {{ isStatusPass(item.test_status) && isStatusPass(item.error_code) ? 'PASS' : item.error_code }}
                                                </v-chip>
                                            </template>
                                            <template #item.error_name="{ item }">
                                                <span :class="!isStatusPass(item.error_code) ? 'text-error' : ''">{{ item.error_name || '-' }}</span>
                                            </template>
                                            <template #item.test_end_time="{ item }">
                                                {{ formatShortTime(item.test_end_time) }}
                                            </template>
                                            <template #item.actions="{ item }">
                                                <div class="d-flex gap-1">
                                                    <v-btn color="secondary" variant="outlined" size="x-small" icon="mdi-fullscreen" @click="openFullscreen(item)" />
                                                    <v-btn color="primary" variant="outlined" size="x-small" icon="mdi-download"
                                                        :loading="downloadingKey === `${isnIndex}-${item._stationIndex}-${item._idx}`"
                                                        @click="downloadSingleRecord(item, `${isnIndex}-${item._stationIndex}`, item._idx)" />
                                                </div>
                                            </template>
                                        </v-data-table>
                                    </v-expansion-panel-text>
                                </v-expansion-panel>
                            </v-expansion-panels>
                        </div>

                        <!-- Compact View - Cards per station -->
                        <div v-if="viewMode === 'compact'">
                            <v-expansion-panels v-model="compactExpanded[isnIndex]" multiple>
                                <v-expansion-panel v-for="(stationGroup, stationIndex) in isnGroup.stations" :key="`compact-station-${stationGroup.stationName}`" class="mb-3">
                                    <v-expansion-panel-title :class="hasLatestStationError(stationGroup) ? 'bg-red-lighten-4' : 'bg-secondary'" class="text-subtitle-1 py-2">
                                        <div class="d-flex align-center w-100">
                                            <span class="font-weight-bold">{{ stationGroup.displayName }}</span>
                                            <v-spacer />
                                            <v-chip v-if="getStationErrorCount(stationGroup) > 0" size="small" color="error" variant="flat" class="mr-2">
                                                {{ getStationErrorCount(stationGroup) }} error(s)
                                            </v-chip>
                                            <v-chip size="small" color="white" variant="outlined" class="mr-2">
                                                {{ stationGroup.records.length }} record(s)
                                            </v-chip>
                                        </div>
                                    </v-expansion-panel-title>
                                    <v-expansion-panel-text class="pa-0">
                                        <div v-if="getDisplayedStationRecords(isnGroup, stationGroup).length > 0" class="pa-4">
                                            <v-row dense justify="center">
                                                <v-col v-for="(record, recordIndex) in getDisplayedStationRecords(isnGroup, stationGroup)" :key="`compact-${record.device_id}-${recordIndex}`"
                                                    :cols="getDisplayedStationRecords(isnGroup, stationGroup).length === 1 ? 12 : 12"
                                                    :sm="getDisplayedStationRecords(isnGroup, stationGroup).length === 1 ? 6 : 6"
                                                    :md="getDisplayedStationRecords(isnGroup, stationGroup).length === 1 ? 4 : 4"
                                                    :lg="getDisplayedStationRecords(isnGroup, stationGroup).length === 1 ? 3 : 3">
                                                    <v-card variant="flat" class="pa-2"
                                                        :color="isStatusPass(record.test_status) && isStatusPass(record.error_code) ? 'green-lighten-5' : 'red-lighten-5'">
                                                        <div class="text-body-2 font-weight-bold mb-2">
                                                            {{ record.device_id }} • {{ record.isn }}
                                                        </div>
                                                        <v-chip :color="isStatusPass(record.test_status) && isStatusPass(record.error_code) ? 'success' : 'error'"
                                                            size="small" label class="mb-2" style="white-space: normal; max-width: 100%;">
                                                            {{ isStatusPass(record.test_status) && isStatusPass(record.error_code) ? 'PASS' : (record.error_name || record.error_code || 'FAIL') }}
                                                        </v-chip>
                                                        <div class="d-flex flex-wrap gap-2 mb-2">
                                                            <v-chip size="small" label color="default">
                                                                <v-icon start size="small">mdi-calendar</v-icon>
                                                                {{ formatShortTime(record.test_end_time) }}
                                                            </v-chip>
                                                            <v-chip size="small" label color="default">
                                                                <v-icon start size="small">mdi-timer</v-icon>
                                                                {{ calculateDuration(record.test_start_time, record.test_end_time) }}
                                                            </v-chip>
                                                        </div>
                                                        <div class="d-flex gap-1">
                                                            <v-btn color="secondary" size="small" prepend-icon="mdi-fullscreen" @click="openFullscreen(record)">
                                                                Details
                                                            </v-btn>
                                                            <v-btn color="primary" size="small" prepend-icon="mdi-download"
                                                                :loading="downloadingKey === `${isnIndex}-${stationIndex}-${recordIndex}`"
                                                                @click="downloadSingleRecord(record, `${isnIndex}-${stationIndex}`, recordIndex)">
                                                                Download
                                                            </v-btn>
                                                        </div>
                                                    </v-card>
                                                </v-col>
                                            </v-row>
                                        </div>
                                        <v-alert v-else type="info" variant="tonal" density="compact" class="ma-2">
                                            No test records available for this station
                                        </v-alert>
                                    </v-expansion-panel-text>
                                </v-expansion-panel>
                            </v-expansion-panels>
                        </div>
                    </v-window-item>
                </v-window>
            </v-card-text>
        </v-card>

        <!-- Success Notification -->
        <v-snackbar v-model="showSuccess" color="success" timeout="3000" location="bottom">
            <v-icon class="mr-2">mdi-check-circle</v-icon>
            Test log downloaded successfully!
        </v-snackbar>

        <!-- Copy Success Notification -->
        <v-snackbar v-model="showCopySuccess" color="info" timeout="2000" location="bottom">
            <v-icon class="mr-2">mdi-content-copy</v-icon>
            Copied to clipboard!
        </v-snackbar>

        <!-- Fullscreen Dialog -->
        <IplasTestItemsFullscreenDialog v-model="showFullscreenDialog" :record="fullscreenRecord"
            :downloading="fullscreenDownloading" @download="downloadSingleRecordFromFullscreen" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useIplasApi } from '@/features/dut_logs/composables/useIplasApi'
import IplasTestItemsFullscreenDialog from './IplasTestItemsFullscreenDialog.vue'
import type { NormalizedRecord } from './IplasTestItemsFullscreenDialog.vue'
import { type IsnSearchData, type DownloadAttachmentInfo } from '@/features/dut_logs/composables/useIplasApi'
import type { IsnSearchTestItem } from '@/features/dut_logs/api/iplasApi'
import { adjustIplasDisplayTime, getStatusColor, normalizeStatus, isStatusPass, isStatusFail } from '@/shared/utils/helpers'
import { lookupIsn, lookupIsnsBatch, type SfistspIsnReferenceResponse } from '@/features/dut_logs/api/sfistspApi'

interface StationGroup {
    stationName: string
    displayName: string
    hasError: boolean
    errorCount: number
    records: IsnSearchData[]
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
    isn: string
    success: boolean
    ssn?: string
    mac?: string
    errorMessage?: string
}

const {
    loadingIsnSearch,
    downloading,
    error,
    searchByIsn,
    downloadAttachments,
    clearIsnSearchData
} = useIplasApi()

// Input mode
const inputMode = ref<'single' | 'multiple' | 'bulk'>('single')
const searchIsn = ref('')
const selectedISNs = ref<string[]>([])

// Search state
const hasSearched = ref(false)
const groupedByISN = ref<ISNGroup[]>([])
const activeISNTab = ref(0)
const showSuccess = ref(false)

// SFISTSP lookup state
const loadingSfistspLookup = ref(false)
const sfistspReferences = ref<SfistspReference[]>([])

// Display controls
const viewMode = ref<'grid' | 'list' | 'table' | 'compact'>('list')
const testItemFilters = ref<Record<string, 'all' | 'value' | 'non-value' | 'bin'>>({})
const testItemStatusFilters = ref<Record<string, 'ALL' | 'PASS' | 'FAIL'>>({}) // Per-test item status filter
const testStatusFilter = ref<'ALL' | 'PASS' | 'FAIL'>('ALL')
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

function showMoreRecords(isn: string): void {
    displayLimits.value[isn] = (displayLimits.value[isn] || INITIAL_DISPLAY_LIMIT) + 50
}

// Fullscreen dialog controls
const fullscreenRecord = ref<NormalizedRecord | null>(null)
const showFullscreenDialog = ref(false)
const showCopySuccess = ref(false)
const fullscreenSearchQuery = ref('')
const fullscreenDownloading = ref(false)

// Original record for download (to get site/project info)
const fullscreenOriginalRecord = ref<IsnSearchData | null>(null)

// Download controls
const selectedRecordIndices = ref<string[]>([]) // Format: "tabIndex-recordIndex"
const downloadingKey = ref<string | null>(null)

const testItemHeaders = [
    { title: 'Test Item', key: 'NAME', sortable: true },
    { title: 'Status', key: 'STATUS', sortable: true },
    { title: 'Value', key: 'VALUE', sortable: true },
    { title: 'UCL', key: 'UCL', sortable: true },
    { title: 'LCL', key: 'LCL', sortable: true }
]

// Table headers for records table view (like InternalDataContent.vue)
const recordTableHeaders = [
    { title: '#', key: 'record_number', sortable: true },
    { title: 'Test Time', key: 'test_end_time', sortable: true },
    { title: 'Device ID', key: 'device_id', sortable: true },
    { title: 'Status', key: 'status', sortable: false },
    { title: 'Error Name', key: 'error_name', sortable: true },
    { title: 'Duration', key: 'duration', sortable: true },
    { title: 'Actions', key: 'actions', sortable: false }
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

// Helper to initialize carousel at latest record for grid view
function initializeCarousel(key: string, dataLength: number): void {
    if (!(key in carouselModels.value) && dataLength > 1) {
        carouselModels.value[key] = dataLength - 1 // Start at last record
    }
}

// Helper to get error count for a station
function getStationErrorCount(stationGroup: StationGroup): number {
    return stationGroup.records.filter(r => !isStatusPass(r.test_status) || !isStatusPass(r.error_code)).length
}

// Helper to check if latest record has error
function hasLatestStationError(stationGroup: StationGroup): boolean {
    if (stationGroup.records.length === 0) return false
    // Sort by test_end_time descending and check the first one
    const sortedRecords = [...stationGroup.records].sort((a, b) => {
        const timeA = new Date(a.test_end_time.replace('%:z', '').replace(' ', 'T') + 'Z').getTime()
        const timeB = new Date(b.test_end_time.replace('%:z', '').replace(' ', 'T') + 'Z').getTime()
        return timeB - timeA
    })
    const latestRecord = sortedRecords[0]
    return latestRecord ? (!isStatusPass(latestRecord.test_status) || !isStatusPass(latestRecord.error_code)) : false
}

// Helper functions
function isValueData(item: IsnSearchTestItem): boolean {
    const value = item.VALUE?.toUpperCase() || ''
    // Value data: not PASS, FAIL, 1, 0, or -999
    if (value === 'PASS' || value === 'FAIL' || value === '1' || value === '0' || value === '-999') {
        return false
    }
    const hasNumericValue = !isNaN(parseFloat(item.VALUE)) && item.VALUE !== ''
    const hasNumericUcl = !isNaN(parseFloat(item.UCL || '')) && item.UCL !== ''
    const hasNumericLcl = !isNaN(parseFloat(item.LCL || '')) && item.LCL !== ''
    const numericCount = [hasNumericValue, hasNumericUcl, hasNumericLcl].filter(Boolean).length
    return numericCount >= 2
}

function isPassFailData(item: IsnSearchTestItem): boolean {
    const value = item.VALUE?.toUpperCase() || ''
    // STATUS must be PASS, FAIL, 1, 0, or -1 AND VALUE must be PASS, FAIL, 1, 0, or -999
    const isStatusPF = isStatusPass(item.STATUS) || isStatusFail(item.STATUS) || item.STATUS === '-1'
    const isValuePF = value === 'PASS' || value === 'FAIL' || value === '1' || value === '0' || value === '-999'
    return isStatusPF && isValuePF
}

// Alias for better naming consistency
function isBinData(item: IsnSearchTestItem): boolean {
    return isPassFailData(item)
}

function isNonValueData(item: IsnSearchTestItem): boolean {
    return !isValueData(item) && !isBinData(item)
}

function filterTestItemsByType(items: IsnSearchTestItem[], filterType: 'all' | 'value' | 'non-value' | 'bin'): IsnSearchTestItem[] {
    switch (filterType) {
        case 'value':
            return items.filter(isValueData)
        case 'non-value':
            return items.filter(isNonValueData)
        case 'bin':
            return items.filter(isBinData)
        default:
            return items
    }
}

function filterTestItems(items: IsnSearchTestItem[] | undefined): IsnSearchTestItem[] {
    if (!items) return []
    // Default to 'value' filter for backward compatibility
    return filterTestItemsByType(items, 'value')
}

function filterAndSearchTestItems(items: IsnSearchTestItem[] | undefined, key: string): IsnSearchTestItem[] {
    if (!items) return []

    // Use fullscreen search query if key is 'fullscreen', otherwise use per-record filter
    const filterType = key === 'fullscreen' ? 'value' : (testItemFilters.value[key] || 'value')
    let filtered = filterTestItemsByType(items, filterType)

    // Apply test item status filter (PASS/FAIL)
    const statusFilter = testItemStatusFilters.value[key] || 'ALL'
    if (statusFilter !== 'ALL') {
        filtered = filtered.filter(item => item.STATUS === statusFilter)
    }

    // Get search terms - use fullscreen search query if key is 'fullscreen'
    const searchTerms = key === 'fullscreen'
        ? (fullscreenSearchQuery.value?.trim() ? [fullscreenSearchQuery.value.trim()] : [])
        : (testItemSearchTerms.value[key] || [])

    // Apply multi-term regex search (OR logic - at least one term must match)
    if (searchTerms.length > 0) {
        filtered = filtered.filter(item => {
            const searchableText = `${item.NAME || ''} ${item.STATUS || ''} ${item.VALUE || ''}`.toLowerCase()
            return searchTerms.some(term => {
                const trimmedTerm = term.trim().toLowerCase()
                if (!trimmedTerm) return false
                try {
                    const regex = new RegExp(trimmedTerm, 'i')
                    return regex.test(searchableText)
                } catch {
                    // If invalid regex, fall back to simple includes
                    return searchableText.includes(trimmedTerm)
                }
            })
        })
    }
    return filtered
}

function formatShortTime(timeStr: string): string {
    // Use the centralized helper to adjust time by -1 hour for display
    return adjustIplasDisplayTime(timeStr, 1)
}

function getValueClass(item: IsnSearchTestItem): string {
    const value = item.VALUE?.toUpperCase() || ''
    if (value === 'PASS' || value === '1') return 'text-success font-weight-medium'
    if (value === 'FAIL' || value === '0') return 'text-error font-weight-medium'
    if (value === '-999') return 'text-warning'
    return ''
}

function formatLocalTime(timeStr: string): string {
    // Use the centralized helper to adjust time by -1 hour for display
    return adjustIplasDisplayTime(timeStr, 1)
}

function calculateDuration(startStr: string, endStr: string): string {
    if (!startStr || !endStr) return '-'
    try {
        const cleanStart = startStr.replace('%:z', '').replace('T', ' ')
        const cleanEnd = endStr.replace('%:z', '').replace('T', ' ')
        const start = new Date(cleanStart.replace(' ', 'T') + 'Z')
        const end = new Date(cleanEnd.replace(' ', 'T') + 'Z')
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

function calculateTotalCycleTime(testItems: IsnSearchTestItem[] | undefined): string {
    if (!testItems || testItems.length === 0) return '-'

    let totalSeconds = 0
    for (const item of testItems) {
        if (item.CYCLE && item.CYCLE !== '') {
            const cycleTime = parseFloat(item.CYCLE)
            if (!isNaN(cycleTime)) {
                totalSeconds += cycleTime
            }
        }
    }

    if (totalSeconds === 0) return '-'

    const minutes = Math.floor(totalSeconds / 60)
    const seconds = (totalSeconds % 60).toFixed(2)
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
}

// Helper functions for device ID filtering
function getUniqueDeviceIdsForStation(stationGroup: StationGroup): string[] {
    return [...new Set(stationGroup.records.map(r => r.device_id))]
}

function getFilteredStationRecords(isnGroup: ISNGroup, stationGroup: StationGroup): IsnSearchData[] {
    let records = stationGroup.records

    // Key for per-station status filter
    const stationKey = `${isnGroup.isn}-${stationGroup.stationName}`

    // Apply per-station status filter (PASS/FAIL)
    const statusFilter = stationStatusFilters.value[stationKey] || 'ALL'
    if (statusFilter !== 'ALL') {
        const isPass = statusFilter === 'PASS'
        records = records.filter(r => {
            const recordPass = isStatusPass(r.test_status) && isStatusPass(r.error_code)
            return isPass ? recordPass : !recordPass
        })
    }

    // Apply device ID filter
    const filterIds = selectedFilterDeviceIds.value[stationKey]
    if (filterIds && filterIds.length > 0) {
        records = records.filter(r => filterIds.includes(r.device_id))
    }

    // Apply search query filter
    const searchQuery = recordSearchQueries.value[stationKey]?.toLowerCase().trim()
    if (searchQuery) {
        records = records.filter(r => {
            const searchableText = [
                r.isn,
                r.device_id,
                r.error_code,
                r.error_name,
                r.station_name,
                r.display_station_name
            ].join(' ').toLowerCase()
            return searchableText.includes(searchQuery)
        })
    }

    return records
}

// Performance: Get limited records for display
function getDisplayedStationRecords(isnGroup: ISNGroup, stationGroup: StationGroup): IsnSearchData[] {
    const filtered = getFilteredStationRecords(isnGroup, stationGroup)
    const limit = getDisplayLimit(`${isnGroup.isn}-${stationGroup.stationName}`)
    // Sort by test_end_time descending (latest first)
    const sorted = [...filtered].sort((a, b) => {
        const timeA = new Date(a.test_end_time.replace('%:z', '').replace(' ', 'T') + 'Z').getTime()
        const timeB = new Date(b.test_end_time.replace('%:z', '').replace(' ', 'T') + 'Z').getTime()
        return timeB - timeA
    })
    return sorted.slice(0, limit)
}

function hasMoreStationRecords(isnGroup: ISNGroup, stationGroup: StationGroup): boolean {
    const filtered = getFilteredStationRecords(isnGroup, stationGroup)
    const limit = getDisplayLimit(`${isnGroup.isn}-${stationGroup.stationName}`)
    return filtered.length > limit
}

function getRemainingStationRecordsCount(isnGroup: ISNGroup, stationGroup: StationGroup): number {
    const filtered = getFilteredStationRecords(isnGroup, stationGroup)
    const limit = getDisplayLimit(`${isnGroup.isn}-${stationGroup.stationName}`)
    return Math.max(0, filtered.length - limit)
}

// Record search queries per station
const recordSearchQueries = ref<Record<string, string>>({})

// Get total filtered records count for a station
function getTotalFilteredStationRecords(isnGroup: ISNGroup, stationGroup: StationGroup): number {
    return getFilteredStationRecords(isnGroup, stationGroup).length
}

async function copyToClipboard(text: string): Promise<void> {
    if (!text) return
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
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
        showCopySuccess.value = true
    } catch (err) {
        console.error('Failed to copy to clipboard:', err)
    }
}

function normalizeIsnRecord(record: IsnSearchData): NormalizedRecord {
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
        testStartTime: record.test_start_time,
        testEndTime: record.test_end_time,
        testItems: record.test_item?.map(ti => ({
            NAME: ti.NAME,
            STATUS: ti.STATUS,
            VALUE: ti.VALUE,
            UCL: ti.UCL || '',
            LCL: ti.LCL || '',
            CYCLE: ti.CYCLE || ''
        })) || []
    }
}

function openFullscreen(record: IsnSearchData): void {
    fullscreenOriginalRecord.value = record
    fullscreenRecord.value = normalizeIsnRecord(record)
    showFullscreenDialog.value = true
}

function closeFullscreen(): void {
    fullscreenRecord.value = null
    fullscreenOriginalRecord.value = null
    showFullscreenDialog.value = false
    fullscreenSearchQuery.value = ''
}

async function downloadSingleRecordFromFullscreen(): Promise<void> {
    if (!fullscreenOriginalRecord.value) return
    fullscreenDownloading.value = true
    try {
        const attachmentInfo = createAttachmentInfo(fullscreenOriginalRecord.value)
        await downloadAttachments(fullscreenOriginalRecord.value.site, fullscreenOriginalRecord.value.project, [attachmentInfo])
        showSuccess.value = true
    } catch (err) {
        console.error('Failed to download test log:', err)
    } finally {
        fullscreenDownloading.value = false
    }
}

function isRecordSelected(isnIndex: number, stationIndex: number, recordIndex: number): boolean {
    return selectedRecordIndices.value.includes(`${isnIndex}-${stationIndex}-${recordIndex}`)
}

function toggleRecordSelection(isnIndex: number, stationIndex: number, recordIndex: number): void {
    const key = `${isnIndex}-${stationIndex}-${recordIndex}`
    const idx = selectedRecordIndices.value.indexOf(key)
    if (idx === -1) {
        selectedRecordIndices.value.push(key)
    } else {
        selectedRecordIndices.value.splice(idx, 1)
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
    const utcDate = new Date(cleanedTime.replace(' ', 'T') + 'Z')

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
        // Use display_station_name as per API documentation
        station: record.display_station_name || record.station_name
    }
}

async function downloadSingleRecord(record: IsnSearchData, stationKey: string, recordIndex: number): Promise<void> {
    downloadingKey.value = `${stationKey}-${recordIndex}`
    try {
        const attachmentInfo = createAttachmentInfo(record)
        console.log('Download attachment info:', attachmentInfo)
        await downloadAttachments(record.site, record.project, [attachmentInfo])
        showSuccess.value = true
    } catch (err) {
        console.error('Failed to download test log:', err)
    } finally {
        downloadingKey.value = null
    }
}

async function downloadSelectedRecords(): Promise<void> {
    if (selectedRecordIndices.value.length === 0) return

    try {
        // Group by site and project
        const groupedByProject: Record<string, { site: string; project: string; attachments: DownloadAttachmentInfo[] }> = {}

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
                    attachments: []
                }
            }
            groupedByProject[projectKey].attachments.push(createAttachmentInfo(record))
        }

        // Download from each site/project
        for (const projectGroup of Object.values(groupedByProject)) {
            await downloadAttachments(projectGroup.site, projectGroup.project, projectGroup.attachments)
        }
        showSuccess.value = true
    } catch (err) {
        console.error('Failed to download test logs:', err)
    }
}

function groupDataByISN(data: IsnSearchData[]): ISNGroup[] {
    const groups: Record<string, ISNGroup> = {}

    for (const record of data) {
        if (!groups[record.isn]) {
            groups[record.isn] = {
                isn: record.isn,
                site: record.site,
                project: record.project,
                hasError: false,
                errorCount: 0,
                records: [],
                stations: []
            }
        }
        const group = groups[record.isn]
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
                stationMap[stationKey] = {
                    stationName: record.station_name,
                    displayName: record.display_station_name || record.station_name,
                    hasError: false,
                    errorCount: 0,
                    records: []
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

        isnGroup.stations = Object.values(stationMap)
    }

    return Object.values(groups)
}

function clearAll(): void {
    searchIsn.value = ''
    selectedISNs.value = []
    groupedByISN.value = []
    hasSearched.value = false
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
    // Determine ISN list based on input mode
    let isnList: string[] = []

    if (inputMode.value === 'multiple') {
        isnList = selectedISNs.value.map(isn => String(isn).trim()).filter(isn => isn.length > 0)
    } else {
        if (!searchIsn.value?.trim()) return
        isnList = searchIsn.value
            .split(/[\n,\s]+/)
            .map(isn => isn.trim())
            .filter(isn => isn && isn.length > 0)
    }

    if (isnList.length === 0) {
        error.value = 'Please enter at least one valid ISN for SFISTSP lookup'
        return
    }

    loadingSfistspLookup.value = true
    sfistspReferences.value = []

    try {
        if (isnList.length === 1) {
            // Single ISN lookup
            const response = await lookupIsn(isnList[0]!)
            sfistspReferences.value = [{
                isn: response.isn,
                success: response.success,
                ssn: response.ssn || undefined,
                mac: response.mac || undefined,
                errorMessage: response.error_message || undefined
            }]
        } else {
            // Batch lookup
            const response = await lookupIsnsBatch(isnList)
            sfistspReferences.value = response.results.map((r: SfistspIsnReferenceResponse) => ({
                isn: r.isn,
                success: r.success,
                ssn: r.ssn || undefined,
                mac: r.mac || undefined,
                errorMessage: r.error_message || undefined
            }))
        }
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error('SFISTSP lookup failed:', err)
        error.value = `SFISTSP lookup failed: ${errorMessage}`
    } finally {
        loadingSfistspLookup.value = false
    }
}

async function handleSearch(): Promise<void> {
    // Determine ISN list based on input mode
    let isnList: string[] = []

    if (inputMode.value === 'multiple') {
        isnList = selectedISNs.value.map(isn => String(isn).trim()).filter(isn => isn.length > 0)
    } else {
        if (!searchIsn.value?.trim()) return
        isnList = searchIsn.value
            .split(/[\n,\s]+/)
            .map(isn => isn.trim())
            .filter(isn => isn && isn.length > 0)
    }

    if (isnList.length === 0) {
        error.value = 'Please enter at least one valid ISN'
        return
    }

    clearIsnSearchData()
    selectedRecordIndices.value = []
    expandedPanels.value = {}
    hasSearched.value = true

    try {
        // Fetch all ISNs
        const allRecords: IsnSearchData[] = []

        for (const isn of isnList) {
            try {
                const data = await searchByIsn(isn)
                // The searchByIsn function already returns data matching IsnSearchData interface
                // (lowercase field names from backend: isn, device_id, site, project, etc.)
                allRecords.push(...data)
            } catch (err) {
                console.warn(`Failed to fetch records for ISN ${isn}:`, err)
            }
        }

        // Group by ISN
        groupedByISN.value = groupDataByISN(allRecords)

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
    }
}
</script>

<style scoped>
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
    background-color: rgba(0, 0, 0, 0.02);
}

:deep(.v-theme--dark .v-table--striped tbody tr:nth-of-type(even)) {
    background-color: rgba(255, 255, 255, 0.02);
}
</style>
