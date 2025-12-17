<template>
    <DefaultLayout>
        <v-container fluid>
            <!-- Header -->
            <v-row class="mb-4">
                <v-col cols="12">
                    <div class="d-flex justify-space-between align-center">
                        <div>
                            <h1 class="text-h4 font-weight-bold mb-2">Top Product Database</h1>
                            <p class="text-body-2 text-medium-emphasis">
                                Browse and analyze top-performing products across all projects and stations
                            </p>
                        </div>
                        <v-btn color="primary" prepend-icon="mdi-refresh" @click="refreshData"
                            :loading="loading || statsLoading">
                            Refresh
                        </v-btn>
                    </div>
                </v-col>
            </v-row>

            <!-- Statistics Cards -->
            <v-row class="mb-4">
                <v-col cols="12" sm="6" md="3">
                    <v-card color="info" variant="tonal">
                        <v-card-text>
                            <div class="d-flex align-center">
                                <v-avatar color="info" size="48" class="mr-3">
                                    <v-icon color="white">mdi-folder-multiple</v-icon>
                                </v-avatar>
                                <div>
                                    <div class="text-overline">Projects</div>
                                    <div class="text-h5 font-weight-bold">
                                        {{ statsLoading ? '...' : stats.total_projects.toLocaleString() }}
                                    </div>
                                </div>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                    <v-card color="indigo" variant="tonal">
                        <v-card-text>
                            <div class="d-flex align-center">
                                <v-avatar color="indigo" size="48" class="mr-3">
                                    <v-icon color="white">mdi-identifier</v-icon>
                                </v-avatar>
                                <div>
                                    <div class="text-overline">Unique ISNs</div>
                                    <div class="text-h5 font-weight-bold">
                                        {{ statsLoading ? '...' : stats.total_unique_isns.toLocaleString() }}
                                    </div>
                                </div>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                    <v-card color="teal" variant="tonal">
                        <v-card-text>
                            <div class="d-flex align-center">
                                <v-avatar color="primary" size="48" class="mr-3">
                                    <v-icon color="white">mdi-database</v-icon>
                                </v-avatar>
                                <div>
                                    <div class="text-overline">Total Analysis</div>
                                    <div class="text-h5 font-weight-bold">
                                        {{ statsLoading ? '...' : stats.total_products.toLocaleString() }}
                                    </div>
                                </div>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                    <v-card color="success" variant="tonal">
                        <v-card-text>
                            <div class="d-flex align-center">
                                <v-avatar color="success" size="48" class="mr-3">
                                    <v-icon color="white">mdi-chart-line</v-icon>
                                </v-avatar>
                                <div>
                                    <div class="text-overline">Avg. Score (per page)</div>
                                    <div class="text-h5 font-weight-bold">
                                        {{ filteredAvgScore }}
                                        <span v-if="hasActiveFilters"
                                            class="text-subtitle-1 text-medium-emphasis">(filtered)</span>
                                    </div>
                                </div>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>

            <!-- Filters Card -->
            <v-card class="mb-4">
                <v-card-title class="d-flex align-center">
                    <v-icon class="mr-2">mdi-filter</v-icon>
                    <span>Filters</span>
                    <v-spacer />
                    <v-btn variant="text" color="error" prepend-icon="mdi-filter-remove" @click="clearFilters"
                        :disabled="!hasActiveFilters">
                        Clear All
                    </v-btn>
                </v-card-title>
                <v-divider />
                <v-card-text>
                    <v-row>
                        <v-col cols="12" sm="6" md="4">
                            <v-text-field v-model="filters.dut_isn" label="DUT ISN" prepend-inner-icon="mdi-chip"
                                variant="outlined" density="compact" clearable hide-details
                                @update:model-value="debouncedFetch" />
                        </v-col>
                        <v-col cols="12" sm="6" md="3">
                            <v-autocomplete v-model="filters.projects" :items="projectOptions" label="Projects"
                                prepend-inner-icon="mdi-folder-outline" variant="outlined" density="compact" multiple
                                chips closable-chips clearable hide-details @update:model-value="debouncedFetch">
                                <template #chip="{ item, props }">
                                    <v-chip v-bind="props" size="small" closable>
                                        {{ item.title }}
                                    </v-chip>
                                </template>
                            </v-autocomplete>
                        </v-col>
                        <v-col cols="12" sm="6" md="3">
                            <v-autocomplete v-model="filters.stations" :items="stationOptions" label="Stations"
                                prepend-inner-icon="mdi-access-point" variant="outlined" density="compact" multiple
                                chips closable-chips clearable hide-details @update:model-value="debouncedFetch">
                                <template #chip="{ item, props }">
                                    <v-chip v-bind="props" size="small" closable>
                                        {{ item.title }}
                                    </v-chip>
                                </template>
                                <template #item="{ item, props }">
                                    <v-list-item v-bind="props">
                                        <template #title>
                                            {{ item.raw.stationName }}
                                        </template>
                                        <template #subtitle v-if="item.raw.project">
                                            <v-chip size="x-small" color="info" variant="tonal">
                                                {{ item.raw.project }}
                                            </v-chip>
                                        </template>
                                    </v-list-item>
                                </template>
                            </v-autocomplete>
                        </v-col>
                        <v-col cols="12" sm="6" md="2">
                            <v-text-field v-model.number="filters.min_score" label="Minimum Score"
                                prepend-inner-icon="mdi-numeric" variant="outlined" density="compact" type="number"
                                clearable hide-details @update:model-value="debouncedFetch" />
                        </v-col>
                    </v-row>
                </v-card-text>
            </v-card>

            <!-- Data Table Card -->
            <v-card>
                <v-card-title class="d-flex align-center">
                    <v-icon class="mr-2">mdi-database</v-icon>
                    <span>Top Products</span>
                    <v-chip class="ml-2" size="small" color="primary" variant="tonal">
                        {{ pagination.total.toLocaleString() }} total
                    </v-chip>
                    <v-spacer />
                    <div class="d-flex align-center gap-2">
                        <v-select v-model="pagination.page_size" :items="pageSizeOptions" label="Items"
                            variant="outlined" density="compact" hide-details style="max-width: 180px"
                            @update:model-value="handlePageSizeChange">
                            <template #selection="{ item }">
                                <span class="text-caption">{{ item.value }} per page</span>
                            </template>
                        </v-select>
                    </div>
                </v-card-title>
                <v-divider />
                <v-card-text class="pa-0">
                    <v-data-table :headers="headers" :items="products" :loading="loading"
                        :items-per-page="pagination.page_size" hide-default-footer hover
                        @click:row="(_event: any, row: any) => viewDetail(row.item.id)" @update:sort-by="handleSort"
                        class="cursor-pointer">
                        <template #item.dut_isn="{ item }">
                            <div class="d-flex align-center">
                                <v-icon size="small" class="mr-2" color="primary">mdi-barcode</v-icon>
                                <span class="font-weight-medium">{{ item.dut_isn }}</span>
                            </div>
                        </template>
                        <template #item.project_name="{ item }">
                            <v-chip v-if="item.project_name" size="small" variant="outlined" color="info">
                                {{ item.project_name }}
                            </v-chip>
                            <span v-else class="text-medium-emphasis">—</span>
                        </template>
                        <template #item.station_name="{ item }">
                            <v-chip size="small" variant="tonal" color="default">
                                {{ item.station_name }}
                            </v-chip>
                        </template>
                        <template #item.test_date="{ item }">
                            <div v-if="item.test_date" class="text-caption">
                                {{ formatDate(item.test_date) }}
                            </div>
                            <span v-else class="text-medium-emphasis">—</span>
                        </template>
                        <template #item.score="{ item }">
                            <v-chip :color="getScoreColor(item.score)" size="small" variant="flat">
                                <v-icon size="x-small" class="mr-1">
                                    {{ getScoreIcon(item.score) }}
                                </v-icon>
                                {{ item.score?.toFixed(2) || '0.00' }}
                            </v-chip>
                        </template>
                        <template #item.pass_count="{ item }">
                            <v-chip size="small" color="success" variant="tonal">
                                <v-icon size="x-small" class="mr-1">mdi-check</v-icon>
                                {{ item.pass_count }}
                            </v-chip>
                        </template>
                        <template #item.fail_count="{ item }">
                            <v-chip size="small" :color="item.fail_count > 0 ? 'error' : 'default'" variant="tonal">
                                <v-icon size="x-small" class="mr-1">mdi-close</v-icon>
                                {{ item.fail_count }}
                            </v-chip>
                        </template>
                        <template #item.pass_rate="{ item }">
                            <div class="d-flex align-center">
                                <v-progress-linear :model-value="getPassRateValue(item)"
                                    :color="getPassRateColor(getPassRateValue(item))" height="6" rounded class="mr-2"
                                    style="max-width: 60px" />
                                <span class="text-caption">{{ getPassRate(item) }}%</span>
                            </div>
                        </template>
                        <template #item.measurements_count="{ item }">
                            <v-chip size="small" variant="outlined">
                                {{ item.measurements_count || 0 }}
                            </v-chip>
                        </template>
                        <template #item.actions="{ item }">
                            <v-menu>
                                <template #activator="{ props }">
                                    <v-btn icon="mdi-dots-vertical" size="small" variant="text" v-bind="props" />
                                </template>
                                <v-list density="compact">
                                    <v-list-item @click="viewDetail(item.id)" prepend-icon="mdi-eye">
                                        <v-list-item-title>View Details</v-list-item-title>
                                    </v-list-item>
                                    <v-list-item @click="handleExport(item)" prepend-icon="mdi-download">
                                        <v-list-item-title>Export</v-list-item-title>
                                    </v-list-item>
                                    <v-divider v-if="isAdmin" />
                                    <v-list-item v-if="isAdmin" @click="confirmDelete(item)" prepend-icon="mdi-delete"
                                        class="text-error">
                                        <v-list-item-title>Delete</v-list-item-title>
                                    </v-list-item>
                                </v-list>
                            </v-menu>
                        </template>
                        <template #loading>
                            <v-skeleton-loader type="table-row@10" />
                        </template>
                        <template #no-data>
                            <div class="text-center pa-8">
                                <v-icon size="64" color="grey-lighten-1">mdi-database-off</v-icon>
                                <p class="text-h6 mt-4 mb-2">No products found</p>
                                <p class="text-body-2 text-medium-emphasis">
                                    {{ hasActiveFilters ? 'Try adjusting your filters' : 'No data available' }}
                                </p>
                            </div>
                        </template>
                    </v-data-table>
                </v-card-text>

                <!-- Pagination -->
                <v-divider />
                <v-card-actions class="justify-center pa-4">
                    <v-pagination v-model="pagination.page" :length="pagination.total_pages" :total-visible="7"
                        @update:model-value="fetchProducts" rounded="circle" show-first-last-page />
                </v-card-actions>
            </v-card>

            <!-- Detail Dialog -->
            <v-dialog v-model="detailDialog" :max-width="isFullscreen ? undefined : '1400px'" :fullscreen="isFullscreen"
                :transition="isFullscreen ? 'dialog-bottom-transition' : 'dialog-transition'" scrollable>
                <v-card v-if="selectedProduct" class="d-flex flex-column"
                    :style="{ height: isFullscreen ? '100vh' : '90vh', overflow: 'hidden' }">
                    <div class="dialog-sticky-header flex-shrink-0"
                        style="z-index: 10; background-color: rgb(var(--v-theme-surface));">
                        <v-card-title class="d-flex justify-space-between align-center flex-shrink-0">
                            <div>
                                <v-icon class="mr-2">mdi-table-eye</v-icon>
                                Product Details
                            </div>
                            <div class="d-flex align-center">
                                <v-btn :icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'" variant="text"
                                    @click="isFullscreen = !isFullscreen"
                                    :title="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'" />
                                <v-btn icon="mdi-close" variant="text" @click="detailDialog = false" />
                            </div>
                        </v-card-title>
                        <!-- DUT Information Section -->
                        <div class="flex-shrink-0">
                            <v-card-subtitle class="pa-4 py-2">
                                <!-- Primary Information Card -->
                                <v-card variant="tonal" color="primary" class="mb-3">
                                    <v-card-text class="py-3">
                                        <v-row dense>
                                            <v-col cols="12" md="6">
                                                <div class="d-flex align-center">
                                                    <v-icon size="large" class="mr-3"
                                                        color="primary">mdi-barcode</v-icon>
                                                    <div>
                                                        <div class="text-caption text-medium-emphasis">DUT ISN</div>
                                                        <div class="text-h6 font-weight-bold">
                                                            {{ selectedProduct.dut_isn }}
                                                        </div>
                                                    </div>
                                                </div>
                                            </v-col>
                                            <v-col cols="12" md="6">
                                                <div class="d-flex align-center">
                                                    <v-icon size="large" class="mr-3"
                                                        color="primary">mdi-factory</v-icon>
                                                    <div>
                                                        <div class="text-caption text-medium-emphasis">Station</div>
                                                        <div class="text-h6 font-weight-bold">
                                                            {{ selectedProduct.station_name }}
                                                        </div>
                                                    </div>
                                                </div>
                                            </v-col>
                                        </v-row>
                                    </v-card-text>
                                </v-card>

                                <!-- Device & Project Info -->
                                <v-card variant="outlined" class="mb-3">
                                    <v-card-text class="py-2">
                                        <v-row dense>
                                            <v-col cols="12" md="6">
                                                <div class="d-flex align-center">
                                                    <v-icon size="small" class="mr-2">mdi-folder</v-icon>
                                                    <span class="text-body-2">
                                                        <strong>Project:</strong>
                                                        <span class="ml-2">{{ selectedProduct.project_name || 'N/A'
                                                            }}</span>
                                                    </span>
                                                </div>
                                            </v-col>
                                            <v-col cols="12" md="6">
                                                <div class="d-flex align-center">
                                                    <v-icon size="small" class="mr-2">mdi-devices</v-icon>
                                                    <span class="text-body-2">
                                                        <strong>Device:</strong>
                                                        <span class="ml-2">{{ selectedProduct.device_name || 'N/A'
                                                            }}</span>
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
                                                            {{ formatDate(selectedProduct.test_date) }}
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
                                                            {{ selectedProduct.test_duration ?
                                                                `${selectedProduct.test_duration.toFixed(2)}s` : 'N/A' }}
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
                                                    <v-icon size="small" class="mr-2">mdi-database-clock</v-icon>
                                                    <div class="text-body-2">
                                                        <div><strong>Analysis Date</strong></div>
                                                        <div class="text-caption">
                                                            {{ formatDate(selectedProduct.created_at) }}
                                                        </div>
                                                    </div>
                                                </div>
                                            </v-card-text>
                                        </v-card>
                                    </v-col>
                                    <v-col cols="12" sm="6" md="3">
                                        <v-card variant="outlined" :color="getScoreColor(selectedProduct.score)"
                                            class="h-100">
                                            <v-card-text class="py-2">
                                                <div class="d-flex align-center">
                                                    <v-icon size="small" class="mr-2">mdi-star</v-icon>
                                                    <div class="text-body-2">
                                                        <div><strong>Overall Score</strong></div>
                                                        <div>
                                                            <v-chip :color="getScoreColor(selectedProduct.score)"
                                                                size="small">
                                                                {{ selectedProduct.score?.toFixed(2) }}
                                                            </v-chip>
                                                        </div>
                                                    </div>
                                                </div>
                                            </v-card-text>
                                        </v-card>
                                    </v-col>
                                </v-row>

                                <!-- Test Results Summary -->
                                <v-row dense class="mb-2">
                                    <v-col cols="12" md="12">
                                        <v-card variant="outlined" class="h-100">
                                            <v-card-text class="py-2">
                                                <div class="d-flex align-center justify-space-between">
                                                    <div class="d-flex align-center">
                                                        <v-icon size="small" class="mr-2">mdi-check-circle</v-icon>
                                                        <strong>Test Results:</strong>
                                                        <v-chip size="x-small" color="primary"
                                                            class="font-weight-bold mx-1">
                                                            Total: {{ (selectedProduct.pass_count +
                                                                selectedProduct.fail_count) || 0
                                                            }}
                                                        </v-chip>
                                                    </div>
                                                    <div class="d-flex align-center gap-2">
                                                        <v-chip size="x-small" color="success" class="font-weight-bold">
                                                            Pass: {{ selectedProduct.pass_count || 0 }}
                                                        </v-chip>
                                                        <v-chip size="x-small" color="error" class="font-weight-bold">
                                                            Fail: {{ selectedProduct.fail_count || 0 }}
                                                        </v-chip>
                                                        <v-chip size="x-small" color="orange-darken-1"
                                                            class="font-weight-bold">
                                                            Retest: {{ selectedProduct.retest_count || 0 }}
                                                        </v-chip>
                                                    </div>
                                                </div>
                                            </v-card-text>
                                        </v-card>
                                    </v-col>
                                </v-row>
                            </v-card-subtitle>
                        </div>
                    </div>

                    <v-divider />
                    <v-card-text class="flex-grow-1 overflow-y-auto pa-4">
                        <!-- Measurements -->
                        <div class="d-flex align-center justify-space-between mb-3">
                            <h3 class="text-h6">
                                <v-icon class="mr-2">mdi-gauge</v-icon>
                                Measurements
                                <v-chip class="ml-2" size="small" color="primary" variant="tonal">
                                    {{ filteredMeasurements.length }} of {{ selectedProduct.measurements?.length || 0 }}
                                </v-chip>
                            </h3>
                            <v-text-field v-model="measurementSearch" label="Search measurements"
                                prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" clearable
                                hide-details style="max-width: 300px" />
                        </div>
                        <v-data-table :headers="measurementHeaders" :items="filteredMeasurements" :items-per-page="10"
                            :items-per-page-options="[10, 25, 50, 100]" density="compact"
                            :class="{ 'sticky-table-header': isFullscreen }">
                            <template #item.test_item="{ item }">
                                <span class="font-weight-medium">{{ item.test_item }}</span>
                            </template>
                            <template #item.pass_status="{ item }">
                                <v-icon :color="isWithinLimits(item) ? 'success' : 'error'" size="small">
                                    {{ isWithinLimits(item) ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                                </v-icon>
                            </template>
                            <template #item.actual_value="{ item }">
                                <span :class="isWithinLimits(item) ? 'text-success' : 'text-error'">
                                    {{ item.actual_value !== null && item.actual_value !== undefined ? item.actual_value
                                        : '—' }}
                                </span>
                            </template>
                            <template #item.deviation="{ item }">
                                <span v-if="item.deviation !== null">
                                    {{ item.deviation.toFixed(2) }}
                                </span>
                                <span v-else class="text-medium-emphasis">—</span>
                            </template>
                        </v-data-table>
                    </v-card-text>
                </v-card>
            </v-dialog>

            <!-- Delete Confirmation Dialog -->
            <v-dialog v-model="deleteDialog" max-width="500px" persistent>
                <v-card>
                    <v-card-title class="text-h5 bg-error text-white">
                        <v-icon start>mdi-alert</v-icon>
                        Confirm Delete
                    </v-card-title>
                    <v-card-text class="pt-4">
                        <div class="mb-4">
                            <p class="text-body-1 mb-2">
                                You are about to delete this top product:
                            </p>
                            <v-card variant="outlined" class="mb-4">
                                <v-card-text>
                                    <div><strong>ISN:</strong> {{ productToDelete?.dut_isn || 'N/A' }}</div>
                                    <div><strong>Project:</strong> {{ productToDelete?.project_name || 'N/A' }}</div>
                                    <div><strong>Station:</strong> {{ productToDelete?.station_name || 'N/A' }}</div>
                                    <div><strong>Score:</strong> {{ productToDelete?.score?.toFixed(2) || 'N/A' }}
                                    </div>
                                </v-card-text>
                            </v-card>
                            <v-alert type="warning" variant="tonal" color="orange-darken-1" class="mb-4">
                                This action cannot be undone. Please make sure you have selected the correct data to
                                delete.
                            </v-alert>
                        </div>
                        <div>
                            <p class="text-body-2 mb-2">
                                Type <strong>DELETE</strong> to confirm:
                            </p>
                            <v-text-field v-model="deleteConfirmation" placeholder="DELETE" variant="outlined"
                                density="comfortable" hide-details autofocus @keyup.enter="handleDelete" />
                        </div>
                    </v-card-text>
                    <v-card-actions>
                        <v-spacer />
                        <v-btn color="default" variant="tonal" @click="cancelDelete" :disabled="deleting">
                            Cancel
                        </v-btn>
                        <v-btn color="error" variant="flat" @click="handleDelete"
                            :disabled="deleteConfirmation !== 'DELETE' || deleting" :loading="deleting">
                            Delete Data
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- Export Dialog -->
            <v-dialog v-model="exportDialog" max-width="500px">
                <v-card>
                    <v-card-title class="text-h5 bg-primary text-white">
                        <v-icon start>mdi-download</v-icon>
                        Export Product Data
                    </v-card-title>
                    <v-card-text>
                        <div class="mb-2">
                            <p class="text-body-1 mb-2">
                                Export data for product:
                            </p>
                            <v-card variant="outlined" class="mb-4">
                                <v-card-text>
                                    <div><strong>ISN:</strong> {{ productToExport?.dut_isn || 'N/A' }}</div>
                                    <div><strong>Project:</strong> {{ productToExport?.project_name || 'N/A' }}</div>
                                    <div><strong>Station:</strong> {{ productToExport?.station_name || 'N/A' }}</div>
                                </v-card-text>
                            </v-card>
                        </div>
                        <div class="d-flex flex-column gap-2">
                            <v-btn color="success" prepend-icon="mdi-file-excel" variant="tonal"
                                @click="exportProduct('excel')" :loading="exporting" size="large">
                                Export to Excel
                            </v-btn>
                            <v-btn color="error" prepend-icon="mdi-file-pdf-box" variant="tonal"
                                @click="exportProduct('pdf')" :loading="exporting" size="large">
                                Export to PDF
                            </v-btn>
                            <v-btn color="info" prepend-icon="mdi-content-copy" variant="tonal"
                                @click="exportProduct('clipboard')" :loading="exporting" size="large">
                                Copy to Clipboard
                            </v-btn>
                        </div>
                    </v-card-text>
                    <v-card-actions class="pt-2">
                        <v-spacer />
                        <v-btn color="default" variant="tonal" @click="exportDialog = false" :disabled="exporting">
                            Close
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </v-container>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { useAuthStore } from '@/features/auth/store'
import apiClient from '@/core/api/client'
import { useTopProductExport } from '../composables/useTopProductExport'
import {
    getTopProductsList,
    getTopProductDetail,
    getTopProductsStats,
    getUniqueProjects,
    getUniqueStations,
    type TopProductItem,
    type TopProductDetail,
    type TopProductStats,
    type TopProductListParams
} from '../api/topProductsApi';
import { it } from 'node:test'

// ===== State =====
const authStore = useAuthStore();
const { exportToExcel, exportToPDF, copyToClipboard } = useTopProductExport();
const loading = ref(false);
const statsLoading = ref(false);
const products = ref<TopProductItem[]>([]);
const stats = ref<TopProductStats>({
    total_products: 0,
    total_unique_isns: 0,
    total_projects: 0,
    avg_score: null,
    max_score: null,
    min_score: null,
    total_pass: 0,
    total_fail: 0,
    recent_products_24h: 0,
    recent_products_7d: 0
});
const selectedProduct = ref<TopProductDetail | null>(null);
const detailDialog = ref(false);
const isFullscreen = ref(false);
const measurementSearch = ref('');

// Export dialog state
const exportDialog = ref(false);
const productToExport = ref<TopProductItem | null>(null);
const exporting = ref(false);

// Delete dialog state
const deleteDialog = ref(false);
const productToDelete = ref<TopProductItem | null>(null);
const deleteConfirmation = ref('');
const deleting = ref(false);

// Filter options
const projectOptions = ref<{ title: string, value: string }[]>([]);
const stationOptions = ref<{ title: string, value: string, stationName: string, project: string | null }[]>([]);

const pagination = ref({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0
});

const filters = ref<TopProductListParams>({
    dut_isn: undefined,
    projects: [],
    stations: [],
    min_score: undefined,
    sort_by: 'created_at',
    sort_desc: true
});

const pageSizeOptions = [10, 20, 50, 100];

// ===== Computed =====
const isAdmin = computed(() => authStore.user?.is_admin || false);

const hasActiveFilters = computed(() => {
    return !!(filters.value.dut_isn ||
        (filters.value.projects && filters.value.projects.length > 0) ||
        (filters.value.stations && filters.value.stations.length > 0) ||
        filters.value.min_score);
});

const filteredAvgScore = computed(() => {
    if (products.value.length === 0) {
        return '0.00';
    }
    const avg = products.value.reduce((sum, p) => sum + p.score, 0) / products.value.length;
    return avg.toFixed(2);
});

const filteredMeasurements = computed(() => {
    if (!selectedProduct.value?.measurements) return [];
    if (!measurementSearch.value) return selectedProduct.value.measurements;

    const search = measurementSearch.value.toLowerCase();
    return selectedProduct.value.measurements.filter(m =>
        m.test_item.toLowerCase().includes(search)
    );
});

// ===== Table Headers =====
const headers = [
    { title: 'DUT ISN', key: 'dut_isn', sortable: true, width: '140px' },
    { title: 'Project', key: 'project_name', sortable: true },
    { title: 'Station', key: 'station_name', sortable: true },
    { title: 'Score', key: 'score', sortable: true, align: 'center' as const },
    { title: 'Passed', key: 'pass_count', sortable: true, align: 'center' as const },
    { title: 'Failed', key: 'fail_count', sortable: true, align: 'center' as const },
    { title: 'Pass Rate', key: 'pass_rate', sortable: false, align: 'center' as const },
    { title: 'Test Date', key: 'test_date', sortable: true },
    { title: 'Measurements', key: 'measurements_count', sortable: false, align: 'center' as const },
    { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const, width: '120px' }
];

const measurementHeaders = [
    { title: 'Test Item', key: 'test_item' },
    { title: 'Status', key: 'pass_status', align: 'center' as const },
    { title: 'USL', key: 'usl', align: 'end' as const },
    { title: 'LSL', key: 'lsl', align: 'end' as const },
    { title: 'Target', key: 'target_value', align: 'end' as const },
    { title: 'Actual', key: 'actual_value', align: 'end' as const },
    { title: 'Deviation', key: 'deviation', align: 'end' as const }
];

// ===== Methods =====
async function fetchProducts() {
    loading.value = true;
    try {
        const params: TopProductListParams = {
            page: pagination.value.page,
            page_size: pagination.value.page_size,
            ...filters.value
        };

        const response = await getTopProductsList(params);
        products.value = response.top_products;
        pagination.value.total = response.total;
        pagination.value.total_pages = response.total_pages;
    } catch (error) {
        console.error('Failed to fetch products:', error);
    } finally {
        loading.value = false;
    }
}

async function fetchStats() {
    statsLoading.value = true;
    try {
        const result = await getTopProductsStats();
        stats.value = result;
    } catch (error) {
        console.error('Failed to fetch stats:', error);
        // Stats already has default values from initialization
    } finally {
        statsLoading.value = false;
    }
}

async function viewDetail(productId: number) {
    try {
        selectedProduct.value = await getTopProductDetail(productId);
        measurementSearch.value = ''; // Reset search when opening dialog
        detailDialog.value = true;
    } catch (error) {
        console.error('Failed to fetch product detail:', error);
    }
}

async function loadFilterOptions() {
    try {
        // Load projects
        const projects = await getUniqueProjects();
        projectOptions.value = projects.map(p => ({
            title: p.label,
            value: p.value
        }));

        // Load stations
        const stations = await getUniqueStations();
        stationOptions.value = stations.map(s => ({
            title: s.label,
            value: s.value,
            stationName: s.value,
            project: s.project
        }));
    } catch (error) {
        console.error('Failed to load filter options:', error);
    }
}

function clearFilters() {
    filters.value = {
        dut_isn: undefined,
        projects: [],
        stations: [],
        min_score: undefined,
        sort_by: 'created_at',
        sort_desc: true
    };
    pagination.value.page = 1;
    fetchProducts();
}

function refreshData() {
    fetchStats();
    fetchProducts();
    loadFilterOptions();
}

function handlePageSizeChange() {
    pagination.value.page = 1;
    fetchProducts();
}

// Debounce helper
let debounceTimer: number | undefined;
function debouncedFetch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        pagination.value.page = 1;
        fetchProducts();
    }, 500) as unknown as number;
}

// ===== Computed & Helpers =====
function formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getPassRate(item: TopProductItem): string {
    const total = item.pass_count + item.fail_count;
    if (total === 0) return '0.00';
    return ((item.pass_count / total) * 100).toFixed(2);
}

function getPassRateValue(item: TopProductItem): number {
    const total = item.pass_count + item.fail_count;
    if (total === 0) return 0;
    return (item.pass_count / total) * 100;
}

function getPassRateColor(passRate: number): string {
    if (passRate >= 95) return 'success';
    if (passRate >= 80) return 'warning';
    return 'error';
}

function getScoreColor(score: number | null | undefined): string {
    if (!score) return 'error';
    if (score >= 8) return 'success';
    if (score >= 6) return 'warning';
    return 'error';
}

function getScoreIcon(score: number | null | undefined): string {
    if (!score) return 'mdi-alert-circle';
    if (score >= 8) return 'mdi-check-circle';
    if (score >= 6) return 'mdi-alert';
    return 'mdi-close-circle';
}

function isWithinLimits(measurement: any): boolean {
    if (measurement.actual_value === null) return false;
    const withinLSL = measurement.lsl === null || measurement.actual_value >= measurement.lsl;
    const withinUSL = measurement.usl === null || measurement.actual_value <= measurement.usl;
    return withinLSL && withinUSL;
}

function handleSort(column: { key: string; order?: 'asc' | 'desc' }) {
    if (!column.key || column.key === 'pass_rate' || column.key === 'actions') return;

    // Toggle sort order if clicking same column
    if (filters.value.sort_by === column.key) {
        filters.value.sort_desc = !filters.value.sort_desc;
    } else {
        filters.value.sort_by = column.key;
        filters.value.sort_desc = true;
    }

    pagination.value.page = 1;
    fetchProducts();
}

// ===== Delete Handlers =====
function confirmDelete(product: TopProductItem) {
    productToDelete.value = product;
    deleteConfirmation.value = '';
    deleteDialog.value = true;
}

function cancelDelete() {
    deleteDialog.value = false;
    productToDelete.value = null;
    deleteConfirmation.value = '';
}

async function handleDelete() {
    if (deleteConfirmation.value !== 'DELETE' || !productToDelete.value || deleting.value) {
        return;
    }

    deleting.value = true;
    try {
        await apiClient.delete(`/api/top-products/${productToDelete.value.id}`);

        // Show success message
        console.log('Product deleted successfully');

        // Close dialog
        cancelDelete();

        // Refresh the data
        await fetchProducts();
        await fetchStats();

    } catch (error: any) {
        console.error('Failed to delete product:', error);
        const errorMessage = error.response?.data?.detail || 'Failed to delete product. Please try again.';
        alert(errorMessage);
    } finally {
        deleting.value = false;
    }
}

// ===== Export Handlers =====
function handleExport(product: TopProductItem) {
    productToExport.value = product;
    exportDialog.value = true;
}

async function exportProduct(format: 'excel' | 'pdf' | 'clipboard') {
    if (!productToExport.value || exporting.value) return;

    exporting.value = true;
    try {
        // Fetch full product details including measurements
        const details = await getTopProductDetail(productToExport.value.id);

        const exportData = {
            dut_isn: details.dut_isn,
            project_name: details.project_name,
            station_name: details.station_name,
            device_name: details.device_name,
            score: details.score,
            test_date: details.test_date,
            pass_count: details.pass_count,
            fail_count: details.fail_count,
            retest_count: details.retest_count,
            test_duration: details.test_duration,
            measurements: details.measurements?.map(m => ({
                test_item: m.test_item,
                usl: m.usl,
                lsl: m.lsl,
                actual_value: m.actual_value,
                deviation: m.deviation
            }))
        };

        if (format === 'excel') {
            await exportToExcel(exportData);
        } else if (format === 'pdf') {
            await exportToPDF(exportData);
        } else if (format === 'clipboard') {
            await copyToClipboard(exportData);
        }

        exportDialog.value = false;
        productToExport.value = null;
    } catch (error: any) {
        console.error('Export failed:', error);
        alert('Export failed. Please try again.');
    } finally {
        exporting.value = false;
    }
}

// ===== Lifecycle =====
onMounted(() => {
    fetchStats();
    fetchProducts();
    loadFilterOptions();
});

onBeforeUnmount(() => {
    // Clear debounce timer
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
});
</script>

<style scoped>
.cursor-pointer :deep(tbody tr) {
    cursor: pointer;
}

.cursor-pointer :deep(tbody tr:hover) {
    background-color: rgba(var(--v-theme-primary), 0.04);
}

.border-b {
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.gap-2 {
    gap: 0.5rem;
}

.dialog-sticky-header {
    position: sticky;
    top: 0;
    z-index: 10;
}

.sticky-table-header :deep(thead) {
    position: sticky;
    top: 0;
    z-index: 5;
    background-color: rgb(var(--v-theme-surface));
}

.sticky-table-header :deep(thead th) {
    background-color: rgb(var(--v-theme-surface)) !important;
    border-bottom: 2px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
