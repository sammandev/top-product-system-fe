<template>
    <div>
        <!-- Refresh Button -->
        <div class="d-flex justify-end mb-4">
            <v-btn color="primary" variant="tonal" prepend-icon="mdi-close-circle"
                :disabled="loading || (!testRecords && !dutIsn)" @click="clearAll">
                Clear All
            </v-btn>
        </div>

        <!-- Input Section -->
        <v-card elevation="2" class="mb-4">
            <v-card-title class="bg-default">
                <v-icon icon="mdi-barcode-scan" class="mr-2" /> DUT ISN Search
            </v-card-title>
            <v-card-text class="pa-4">
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
                    <v-col cols="12" md="10">
                        <v-text-field v-model="dutIsn" label="DUT ISN"
                            placeholder="e.g., 260884980003907 or DM2527470036123" prepend-inner-icon="mdi-barcode-scan"
                            variant="outlined" clearable hint="Enter a DUT ISN identifier" persistent-hint
                            @keyup.enter="fetchTestRecords" />
                    </v-col>
                    <v-col cols="12" md="2" class="d-flex align-center">
                        <v-btn color="primary" variant="flat" size="large" :loading="loading" :disabled="!dutIsn.trim()"
                            prepend-icon="mdi-magnify" block class="mb-5" @click="fetchTestRecords">
                            Search
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
                                <v-btn color="primary" variant="flat" size="small" :loading="loading"
                                    :disabled="!selectedISNs || selectedISNs.length === 0" prepend-icon="mdi-magnify"
                                    @click="fetchTestRecords">
                                    Search
                                </v-btn>
                            </template>
                        </v-combobox>
                    </v-col>
                </v-row>

                <!-- Bulk Paste Textarea -->
                <v-row v-if="inputMode === 'bulk'">
                    <v-col cols="12">
                        <v-textarea v-model="dutIsn" label="Bulk ISN Input"
                            placeholder="Paste multiple ISNs (one per line, comma-separated, or space-separated)&#10;Example:&#10;260884980003907&#10;DM2527470036123&#10;260884980003908"
                            prepend-inner-icon="mdi-text-box-multiple" variant="outlined" rows="5" clearable
                            hint="Paste ISNs separated by newlines, commas, or spaces" persistent-hint>
                            <template #append>
                                <v-btn color="primary" variant="flat" size="small" :loading="loading"
                                    :disabled="!dutIsn.trim()" prepend-icon="mdi-magnify" @click="fetchTestRecords">
                                    Search
                                </v-btn>
                            </template>
                        </v-textarea>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <!-- Error Display -->
        <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = null">
            <v-alert-title>Search Error</v-alert-title>
            {{ error }}
        </v-alert>

        <!-- Results Section -->
        <v-card v-if="testRecords" elevation="2" class="mb-4">
            <v-card-title class="bg-secondary d-flex justify-space-between align-center">
                <div>
                    <v-icon icon="mdi-database-outline" class="mr-2" />Test Records Results
                </div>
                <div>
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
                        <v-icon start>mdi-barcode</v-icon>
                        {{ isnGroup.isn }}
                    </v-tab>
                </v-tabs>

                <v-window v-model="activeISNTab">
                    <v-window-item v-for="(isnGroup, index) in groupedByISN" :key="isnGroup.isn" :value="index">

                        <!-- Site, Model & View Mode Controls -->
                        <div class="d-flex justify-space-between align-center flex-wrap gap-3 mb-4">
                            <!-- Highlighted Site & Model -->
                            <div class="d-flex align-center gap-4">
                                <div class="d-flex align-center">
                                    <div>
                                        <div class="text-caption text-medium-emphasis">Site</div>
                                        <div class="text-subtitle-1 font-weight-bold text-primary">{{ isnGroup.site_name
                                        }}
                                        </div>
                                    </div>
                                </div>
                                <v-divider vertical />
                                <div class="d-flex align-center">
                                    <div>
                                        <div class="text-caption text-medium-emphasis">Model</div>
                                        <div class="text-subtitle-1 font-weight-bold text-primary">{{
                                            isnGroup.model_name }}
                                        </div>
                                    </div>
                                </div>
                                <v-divider vertical />
                                <div class="d-flex align-center">
                                    <div>
                                        <div class="text-caption text-medium-emphasis">Stations</div>
                                        <div class="text-subtitle-1 font-weight-bold text-info">{{
                                            isnGroup.record_data.length
                                        }}</div>
                                    </div>
                                </div>
                            </div>

                            <!-- View Mode Toggle -->
                            <v-btn-toggle v-model="viewMode" color="primary" mandatory variant="outlined"
                                density="compact">
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

                        <!-- Grid View -->
                        <v-row v-if="viewMode === 'grid'">
                            <v-col v-for="station in getSortedStations(isnGroup)" :key="station.id" cols="12" md="4">
                                <v-card variant="outlined" class="h-100">
                                    <v-card-title class="bg-secondary">
                                        <div class="d-flex align-center w-100">
                                            <span class="font-weight-bold">{{ station.name }}</span>
                                            <v-spacer />
                                            <v-chip v-if="getErrorCount(station) > 0" size="small" color="error"
                                                variant="flat">
                                                {{ getErrorCount(station) }} error(s)
                                            </v-chip>
                                        </div>
                                    </v-card-title>
                                    <v-card-text class="pa-0">
                                        <!-- Multiple records: Carousel with custom navigation -->
                                        <div v-if="station.data.length > 1">
                                            {{ initializeCarousel(station.id, station.data.length) }}
                                            <!-- Navigation Controls -->
                                            <div
                                                class="d-flex justify-center align-center gap-4 pa-1 bg-grey-lighten-4">
                                                <v-btn icon size="x-small" variant="text"
                                                    :disabled="(carouselModels[station.id] || 0) === 0"
                                                    @click="carouselModels[station.id] = 0">
                                                    <v-icon>mdi-page-first</v-icon>
                                                </v-btn>
                                                <v-btn icon size="small" variant="text"
                                                    :disabled="(carouselModels[station.id] || 0) === 0"
                                                    @click="carouselModels[station.id] = Math.max(0, (carouselModels[station.id] || 0) - 1)">
                                                    <v-icon>mdi-chevron-left</v-icon>
                                                </v-btn>
                                                <v-chip color="primary" variant="flat" size="small">
                                                    Record {{ (carouselModels[station.id] || 0) + 1 }} / {{
                                                        station.data.length
                                                    }}
                                                </v-chip>
                                                <v-btn icon size="small" variant="text"
                                                    :disabled="(carouselModels[station.id] || 0) >= station.data.length - 1"
                                                    @click="carouselModels[station.id] = Math.min(station.data.length - 1, (carouselModels[station.id] || 0) + 1)">
                                                    <v-icon>mdi-chevron-right</v-icon>
                                                </v-btn>
                                                <v-btn icon size="x-small" variant="text"
                                                    :disabled="(carouselModels[station.id] || 0) >= station.data.length - 1"
                                                    @click="carouselModels[station.id] = station.data.length - 1">
                                                    <v-icon>mdi-page-last</v-icon>
                                                </v-btn>
                                            </div>
                                            <!-- Carousel Content -->
                                            <v-window v-model="carouselModels[station.id]" class="pa-2">
                                                <v-window-item v-for="(record, idx) in station.data" :key="record.id"
                                                    :value="idx">
                                                    <div
                                                        :class="record.test_result === 1 ? 'bg-green-lighten-5 pa-2 rounded' : 'bg-red-lighten-5 pa-2 rounded'">
                                                        <!-- Device Name -->
                                                        <div class="d-flex align-center mb-3">
                                                            <v-icon
                                                                :color="record.test_result === 1 ? 'success' : 'error'"
                                                                size="large" class="mr-2">
                                                                {{ record.test_result === 1 ? 'mdi-check-circle' :
                                                                    'mdi-alert-circle' }}
                                                            </v-icon>
                                                            <div class="text-h6">{{ record.device_id__name }}</div>
                                                        </div>
                                                        <!-- ISN Chip (Rectangle) -->
                                                        <v-chip color="primary" variant="outlined" size="small"
                                                            class="mb-3 font-weight-bold" label>
                                                            <v-icon start size="small">mdi-barcode</v-icon>
                                                            {{ record.dut_id__isn }}
                                                        </v-chip>
                                                        <!-- Status Chip -->
                                                        <div class="mb-3">
                                                            <v-chip
                                                                :color="record.test_result === 1 ? 'success' : 'error'"
                                                                size="small" label>
                                                                {{ record.test_result === 1 ? 'PASS' :
                                                                    (record.error_item ||
                                                                        'FAIL') }}
                                                            </v-chip>
                                                        </div>
                                                        <!-- Date and Duration Chips in a row with dot separator -->
                                                        <div class="d-flex align-center gap-2 mb-3">
                                                            <v-chip size="small" label color="default">
                                                                <v-icon start size="small">mdi-calendar</v-icon>
                                                                {{ formatDate(record.test_date) }}
                                                            </v-chip>
                                                            <span class="text-medium-emphasis">•</span>
                                                            <v-chip size="small" label color="default">
                                                                <v-icon start size="small">mdi-timer</v-icon>
                                                                {{ record.test_duration }}s
                                                            </v-chip>
                                                        </div>
                                                        <!-- Download Button -->
                                                        <v-btn color="primary" size="small" prepend-icon="mdi-download"
                                                            :loading="downloadingRecordId === record.id" block
                                                            @click="handleDownload({ station, record })">
                                                            Download
                                                        </v-btn>
                                                    </div>
                                                </v-window-item>
                                            </v-window>
                                        </div>
                                        <!-- Single record: Direct card -->
                                        <div v-else-if="station.data.length === 1">
                                            <!-- Navigation Controls (disabled for single record) -->
                                            <div
                                                class="d-flex justify-center align-center gap-3 pa-1 bg-grey-lighten-4">
                                                <v-btn icon size="x-small" variant="text" disabled>
                                                    <v-icon>mdi-page-first</v-icon>
                                                </v-btn>
                                                <v-btn icon size="small" variant="text" disabled>
                                                    <v-icon>mdi-chevron-left</v-icon>
                                                </v-btn>
                                                <v-chip color="primary" variant="flat" size="small">
                                                    Record 1 / 1
                                                </v-chip>
                                                <v-btn icon size="small" variant="text" disabled>
                                                    <v-icon>mdi-chevron-right</v-icon>
                                                </v-btn>
                                                <v-btn icon size="x-small" variant="text" disabled>
                                                    <v-icon>mdi-page-last</v-icon>
                                                </v-btn>
                                            </div>
                                            <div class="pa-2">
                                                <div
                                                    :class="getLatestRecord(station)!.test_result === 1 ? 'bg-green-lighten-5 pa-2 rounded' : 'bg-red-lighten-5 pa-2 rounded'">
                                                    <!-- Device Name -->
                                                    <div class="d-flex align-center mb-3">
                                                        <v-icon
                                                            :color="getLatestRecord(station)!.test_result === 1 ? 'success' : 'error'"
                                                            size="large" class="mr-2">
                                                            {{ getLatestRecord(station)!.test_result === 1 ?
                                                                'mdi-check-circle'
                                                                : 'mdi-alert-circle' }}
                                                        </v-icon>
                                                        <div class="text-h6">{{
                                                            getLatestRecord(station)!.device_id__name }}
                                                        </div>
                                                    </div>
                                                    <!-- ISN Chip (Rectangle) -->
                                                    <v-chip color="primary" variant="outlined" size="small"
                                                        class="mb-3 font-weight-bold" label>
                                                        <v-icon start size="small">mdi-barcode</v-icon>
                                                        {{ getLatestRecord(station)!.dut_id__isn }}
                                                    </v-chip>
                                                    <!-- Status Chip -->
                                                    <div class="mb-3">
                                                        <v-chip
                                                            :color="getLatestRecord(station)!.test_result === 1 ? 'success' : 'error'"
                                                            size="small" label>
                                                            {{ getLatestRecord(station)!.test_result === 1 ? 'PASS' :
                                                                (getLatestRecord(station)!.error_item || 'FAIL') }}
                                                        </v-chip>
                                                    </div>
                                                    <!-- Date and Duration Chips in a row with dot separator -->
                                                    <div class="d-flex align-center gap-2 mb-3">
                                                        <v-chip size="small" label color="default">
                                                            <v-icon start size="small">mdi-calendar</v-icon>
                                                            {{ formatDate(getLatestRecord(station)!.test_date) }}
                                                        </v-chip>
                                                        <span class="text-medium-emphasis">•</span>
                                                        <v-chip size="small" label color="default">
                                                            <v-icon start size="small">mdi-timer</v-icon>
                                                            {{ getLatestRecord(station)!.test_duration }}s
                                                        </v-chip>
                                                    </div>
                                                    <!-- Download Button -->
                                                    <v-btn color="primary" size="small" prepend-icon="mdi-download"
                                                        :loading="downloadingRecordId === getLatestRecord(station)!.id"
                                                        block
                                                        @click="handleDownload({ station, record: getLatestRecord(station)! })">
                                                        Download
                                                    </v-btn>
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

                        <!-- List View -->
                        <div v-if="viewMode === 'list'">
                            <v-expansion-panels v-model="expandedPanels" multiple>
                                <v-expansion-panel v-for="station in getSortedStations(isnGroup)" :key="station.id"
                                    class="mb-3">
                                    <v-expansion-panel-title
                                        :class="hasLatestError(station) ? 'bg-red-lighten-4' : 'bg-secondary'">
                                        <div class="d-flex align-center w-100">
                                            <span class="font-weight-bold">{{ station.name }}</span>
                                            <v-spacer />
                                            <v-chip v-if="getErrorCount(station) > 0" size="small" color="error"
                                                variant="flat" class="mr-2">
                                                {{ getErrorCount(station) }} error(s)
                                            </v-chip>
                                            <v-chip size="small" color="white" variant="outlined" class="mr-2">
                                                {{ station.data.length }} record(s)
                                            </v-chip>
                                        </div>
                                    </v-expansion-panel-title>
                                    <v-expansion-panel-text class="pa-0">
                                        <v-list v-if="station.data.length > 0">
                                            <v-list-item v-for="record in getReversedData(station.data)"
                                                :key="record.id" class="border-b"
                                                :class="record.test_result !== 1 ? 'bg-red-lighten-5' : ''">
                                                <template #prepend>
                                                    <v-icon :color="record.test_result === 1 ? 'success' : 'error'"
                                                        size="large">
                                                        {{ record.test_result === 1 ? 'mdi-check-circle' :
                                                            'mdi-alert-circle' }}
                                                    </v-icon>
                                                </template>
                                                <v-list-item-title>
                                                    <strong>{{ record.device_id__name }}</strong> • {{
                                                        record.dut_id__isn }}
                                                </v-list-item-title>
                                                <v-list-item-subtitle>
                                                    <div class="d-flex flex-wrap align-center gap-2 mt-1">
                                                        <v-chip size="small" label
                                                            :color="record.test_result === 1 ? 'success' : 'error'">
                                                            {{ record.test_result === 1 ? 'PASS' : record.error_item ||
                                                                'FAIL'
                                                            }}
                                                        </v-chip>
                                                        <v-chip size="small" label color="default">
                                                            {{ record.test_duration }}s
                                                        </v-chip>
                                                        <v-chip size="small" label color="default">
                                                            {{ formatDate(record.test_date) }}
                                                        </v-chip>
                                                    </div>
                                                </v-list-item-subtitle>
                                                <template #append>
                                                    <v-btn color="primary" size="small" prepend-icon="mdi-download"
                                                        :loading="downloadingRecordId === record.id"
                                                        @click="handleDownload({ station, record })">
                                                        Download
                                                    </v-btn>
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

                        <!-- Table View -->
                        <div v-if="viewMode === 'table'">
                            <v-expansion-panels v-model="expandedPanels" multiple>
                                <v-expansion-panel v-for="station in getSortedStations(isnGroup)" :key="station.id"
                                    class="mb-4">
                                    <v-expansion-panel-title
                                        :class="hasLatestError(station) ? 'bg-red-lighten-4' : 'bg-secondary'">
                                        <div class="d-flex align-center w-100">
                                            <span class="font-weight-bold">{{ station.name }}</span>
                                            <v-spacer />
                                            <v-chip v-if="getErrorCount(station) > 0" size="small" color="error"
                                                variant="flat" class="mr-2">
                                                {{ getErrorCount(station) }} error(s)
                                            </v-chip>
                                            <v-chip size="small" color="white" variant="outlined" class="mr-2">
                                                {{ station.data.length }} record(s)
                                            </v-chip>
                                        </div>
                                    </v-expansion-panel-title>
                                    <v-expansion-panel-text class="pa-0">
                                        <v-data-table :headers="tableHeaders"
                                            :items="getReversedData(station.data).map((record, idx) => ({ ...record, record_number: station.data.length - idx }))"
                                            density="compact" :items-per-page="-1" hide-default-footer>
                                            <template #item.status="{ item }">
                                                <v-chip :color="item.test_result === 1 ? 'success' : 'error'"
                                                    size="small" label>
                                                    <v-icon start size="small">
                                                        {{ item.test_result === 1 ? 'mdi-check-circle' :
                                                            'mdi-alert-circle' }}
                                                    </v-icon>
                                                    {{ item.test_result === 1 ? 'PASS' : (item.error_item || 'FAIL') }}
                                                </v-chip>
                                            </template>
                                            <template #item.test_duration="{ item }">
                                                {{ item.test_duration }}s
                                            </template>
                                            <template #item.test_date="{ item }">
                                                {{ formatDate(item.test_date) }}
                                            </template>
                                            <template #item.actions="{ item }">
                                                <v-btn color="primary" variant="outlined" size="x-small"
                                                    icon="mdi-download" :loading="downloadingRecordId === item.id"
                                                    @click="handleDownload({ station, record: item })" />
                                            </template>
                                        </v-data-table>
                                    </v-expansion-panel-text>
                                </v-expansion-panel>
                            </v-expansion-panels>
                        </div>

                        <!-- Compact View -->
                        <div v-if="viewMode === 'compact'">
                            <v-expansion-panels v-model="compactExpanded[index]" multiple>
                                <v-expansion-panel v-for="station in getSortedStations(isnGroup)" :key="station.id"
                                    class="mb-3">
                                    <v-expansion-panel-title
                                        :class="hasLatestError(station) ? 'bg-red-lighten-4' : 'bg-secondary'"
                                        class="text-subtitle-1 py-2">
                                        <div class="d-flex align-center w-100">
                                            <span class="font-weight-bold">{{ station.name }}</span>
                                            <v-spacer />
                                            <v-chip v-if="getErrorCount(station) > 0" size="small" color="error"
                                                variant="flat" class="mr-2">
                                                {{ getErrorCount(station) }} error(s)
                                            </v-chip>
                                            <v-chip size="small" color="white" variant="outlined" class="mr-2">
                                                {{ station.data.length }} record(s)
                                            </v-chip>
                                        </div>
                                    </v-expansion-panel-title>
                                    <v-expansion-panel-text class="pa-0">
                                        <div v-if="station.data.length > 0" class="pa-4">
                                            <v-row dense justify="center">
                                                <v-col v-for="record in station.data" :key="record.id"
                                                    :cols="station.data.length === 1 ? 12 : 12"
                                                    :sm="station.data.length === 1 ? 6 : 6"
                                                    :md="station.data.length === 1 ? 4 : 4"
                                                    :lg="station.data.length === 1 ? 3 : 3">
                                                    <v-card variant="flat" class="pa-2"
                                                        :color="record.test_result !== 1 ? 'red-lighten-5' : ''">
                                                        <div class="text-body-2 font-weight-bold mb-2">
                                                            {{ record.device_id__name }} • {{ record.dut_id__isn }}
                                                        </div>
                                                        <v-chip :color="record.test_result === 1 ? 'success' : 'error'"
                                                            size="small" label class="mb-2"
                                                            style="white-space: normal; max-width: 100%;">
                                                            {{ record.test_result === 1 ? 'PASS' : (record.error_item ||
                                                                'FAIL')
                                                            }}
                                                        </v-chip>
                                                        <div class="d-flex flex-wrap gap-2 mb-2">
                                                            <v-chip size="small" label color="default">
                                                                <v-icon start size="small">mdi-calendar</v-icon>
                                                                {{ formatDate(record.test_date) }}
                                                            </v-chip>
                                                            <v-chip size="small" label color="default">
                                                                <v-icon start size="small">mdi-timer</v-icon>
                                                                {{ record.test_duration }}s
                                                            </v-chip>
                                                        </div>
                                                        <v-btn color="primary" size="small" prepend-icon="mdi-download"
                                                            :loading="downloadingRecordId === record.id" block
                                                            @click="handleDownload({ station, record })">
                                                            Download
                                                        </v-btn>
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
                <!-- End ISN tabs -->
            </v-card-text>
        </v-card>

        <!-- Success Notification -->
        <v-snackbar v-model="showSuccess" color="success" timeout="3000">
            <v-icon class="mr-2">mdi-check-circle</v-icon>
            Test log downloaded successfully!
        </v-snackbar>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import apiClient from '@/core/api/client'

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
const showSuccess = ref(false)
const viewMode = ref<'grid' | 'list' | 'table' | 'compact'>('grid')
const expandedPanels = ref<number[]>([])
const activeISNTab = ref(0)
const inputMode = ref<'single' | 'multiple' | 'bulk'>('single')
const selectedISNs = ref<string[]>([])
const carouselModels = ref<Record<number, number>>({})
const compactExpanded = ref<Record<number, number[]>>({})

// Table headers for table view
const tableHeaders = [
    { title: 'Record', key: 'record_number', sortable: true },
    { title: 'Device', key: 'device_id__name', sortable: true },
    { title: 'DUT ISN', key: 'dut_id__isn', sortable: true },
    { title: 'Status', key: 'status', sortable: false },
    { title: 'Duration', key: 'test_duration', sortable: true },
    { title: 'Test Date', key: 'test_date', sortable: true },
    { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const }
]

const fetchTestRecords = async () => {
    // Determine ISN list based on input mode
    let isnList: string[] = []

    if (inputMode.value === 'multiple') {
        // Use selected ISNs from combobox
        isnList = selectedISNs.value.map(isn => String(isn).trim()).filter(isn => isn.length > 0)
    } else {
        // Parse from text input (single or bulk)
        if (!dutIsn.value.trim()) return
        isnList = dutIsn.value
            .split(/[\n,\s]+/)
            .map(isn => isn.trim())
            .filter(isn => isn && isn.length > 0)
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
            isnList.map(isn =>
                apiClient.get<TestRecordsResponse>(`/api/dut/records/${isn}`)
                    .then(response => ({ isn, data: response.data, success: true }))
                    .catch(err => {
                        console.warn(`Failed to fetch records for ISN ${isn}:`, err)
                        return { isn, data: null, success: false }
                    })
            )
        )

        // Separate successful responses
        const validResponses = responses.filter(r => r.success && r.data)

        if (validResponses.length === 0) {
            throw new Error('Failed to fetch records for all ISNs')
        }

        // Store fetched ISNs for reference
        fetchedISNs.value = isnList

        // Group results by ISN
        groupedByISN.value = validResponses.map(response => ({
            isn: response.isn,
            site_name: response.data!.site_name,
            model_name: response.data!.model_name,
            record_data: response.data!.record_data
        }))

        // Use first response for backward compatibility (testRecords still used in template)
        const firstValid = validResponses[0]
        if (!firstValid || !firstValid.data) {
            throw new Error('No valid data in response')
        }
        testRecords.value = firstValid.data

        // Auto-expand all panels - calculate total panels across all ISNs
        const totalPanels = groupedByISN.value.reduce((sum, group) => sum + group.record_data.length, 0)
        expandedPanels.value = Array.from({ length: totalPanels }, (_, i) => i)
    } catch (err: any) {
        // Show user-friendly error message
        if (err.response?.status === 400) {
            error.value = 'Invalid ISN or no records found. Please check the ISN and try again.'
        } else if (err.response?.status === 404) {
            error.value = 'No test records found for the provided ISN.'
        } else if (err.response?.status >= 500) {
            error.value = 'Server error. Please try again later.'
        } else {
            error.value = 'Failed to fetch test records. Please check your connection and try again.'
        }
        testRecords.value = null
    } finally {
        loading.value = false
    }
}

const handleDownload = async (downloadInfo: {
    station: Station
    record: TestRecord
}) => {
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
                        station: downloadInfo.station.name
                    }
                ],
                site: downloadInfo.station.site_name,
                project: downloadInfo.station.model_name
            },
            { responseType: 'blob' }
        )

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url

        // Extract filename from Content-Disposition or use default
        const contentDisposition = response.headers['content-disposition']
        const filename = contentDisposition
            ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
            : `${downloadInfo.record.dut_id__isn}_${downloadInfo.station.name}.zip`

        link.setAttribute('download', filename)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)

        // Show success message
        showSuccess.value = true
    } catch (err: any) {
        // Show user-friendly error message
        if (err.response?.status === 404) {
            error.value = 'Test log file not found. It may have been deleted or moved.'
        } else if (err.response?.status >= 500) {
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
    testRecords.value = null
    groupedByISN.value = []
    fetchedISNs.value = []
    error.value = null
    expandedPanels.value = []
}

// Helper to get sorted stations for an ISN group
const getSortedStations = (isnGroup: ISNGroupedRecords) => {
    return [...isnGroup.record_data].sort((a, b) => a.order - b.order)
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

// Helper to get reversed data (latest first) for list and table views
const getReversedData = (data: TestRecord[]) => {
    return [...data].reverse()
}

// Expand/Collapse all panels
const expandAll = () => {
    const totalPanels = groupedByISN.value.reduce((sum, group) => sum + group.record_data.length, 0)
    expandedPanels.value = Array.from({ length: totalPanels }, (_, i) => i)
}

const collapseAll = () => {
    expandedPanels.value = []
}

// Computed to check if all panels are expanded
const allExpanded = computed(() => {
    if (viewMode.value === 'compact') {
        const currentISN = activeISNTab.value
        const isnGroup = groupedByISN.value[currentISN]
        if (!isnGroup) return false

        const stationCount = isnGroup.record_data.length
        const currentExpanded = compactExpanded.value[currentISN] || []
        return currentExpanded.length === stationCount && stationCount > 0
    } else {
        const totalPanels = groupedByISN.value.reduce((sum, group) => sum + group.record_data.length, 0)
        return expandedPanels.value.length === totalPanels && totalPanels > 0
    }
})

// Toggle between expand and collapse all
const toggleExpandAll = () => {
    if (viewMode.value === 'compact') {
        // For compact view, toggle expansion per ISN tab
        const currentISN = activeISNTab.value
        const isnGroup = groupedByISN.value[currentISN]
        if (!isnGroup) return

        const stationCount = isnGroup.record_data.length
        const currentExpanded = compactExpanded.value[currentISN] || []

        if (currentExpanded.length === stationCount) {
            compactExpanded.value[currentISN] = []
        } else {
            compactExpanded.value[currentISN] = Array.from({ length: stationCount }, (_, i) => i)
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
    return station.data.filter(record => record.test_result !== 1).length
}

// Helper to check if latest record has error
const hasLatestError = (station: Station): boolean => {
    if (station.data.length === 0) return false
    // Sort by test_date descending and check the first one
    const sortedData = [...station.data].sort((a, b) =>
        new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
    )
    const latestRecord = sortedData[0]
    return latestRecord ? latestRecord.test_result !== 1 : false
}
</script>

<style scoped>
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
</style>
