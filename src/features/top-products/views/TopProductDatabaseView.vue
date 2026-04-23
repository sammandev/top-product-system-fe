<template>
    <DefaultLayout>
        <div class="top-product-db-shell">
            <header class="top-product-db-header">
                <div class="top-product-db-header__copy">
                    <div class="top-product-db-header__icon">
                        <Icon icon="mdi:database-search-outline" />
                    </div>
                    <div>
                        <p class="top-product-db-header__eyebrow">Top Products Workspace</p>
                        <h1>Top Product Database</h1>
                        <p>
                            Browse, filter, and inspect top-performing DUT records across projects and stations
                            from one database-backed workflow.
                        </p>
                    </div>
                </div>

                <button type="button" class="top-product-db-button top-product-db-button--primary"
                    :disabled="loading || statsLoading" @click="refreshData">
                    <Icon :icon="loading || statsLoading ? 'mdi:loading' : 'mdi:refresh'"
                        :class="{ 'top-product-db-spin': loading || statsLoading }" />
                    <span>{{ loading || statsLoading ? 'Refreshing...' : 'Refresh' }}</span>
                </button>
            </header>

            <section class="top-product-db-stats">
                <article class="top-product-db-stat-card top-product-db-stat-card--cool">
                    <div class="top-product-db-stat-card__icon">
                        <Icon icon="mdi:folder-multiple-outline" />
                    </div>
                    <div>
                        <span>Projects</span>
                        <strong>{{ statsLoading ? '...' : stats.total_projects.toLocaleString() }}</strong>
                    </div>
                </article>

                <article class="top-product-db-stat-card top-product-db-stat-card--indigo">
                    <div class="top-product-db-stat-card__icon">
                        <Icon icon="mdi:identifier" />
                    </div>
                    <div>
                        <span>Unique ISNs</span>
                        <strong>{{ statsLoading ? '...' : stats.total_unique_isns.toLocaleString() }}</strong>
                    </div>
                </article>

                <article class="top-product-db-stat-card top-product-db-stat-card--success">
                    <div class="top-product-db-stat-card__icon">
                        <Icon icon="mdi:database-outline" />
                    </div>
                    <div>
                        <span>Total Analysis</span>
                        <strong>{{ statsLoading ? '...' : stats.total_products.toLocaleString() }}</strong>
                    </div>
                </article>
            </section>

            <AppPanel eyebrow="Filter Parameters" title="Analysis Scope"
                description="Filter DUT records by identifier, project, station, and minimum score before reviewing details or exporting rows."
                tone="warm" splitHeader>
                <template #header-aside>
                    <button type="button" class="top-product-db-button top-product-db-button--ghost"
                        :disabled="!hasActiveFilters" @click="clearFilters">
                        <Icon icon="mdi:filter-remove-outline" />
                        <span>Clear All</span>
                    </button>
                </template>

                <div class="top-product-db-filter-grid">
                    <label class="top-product-db-field">
                        <span>DUT ISN</span>
                        <input v-model="filters.dut_isn" type="text" autocomplete="off" placeholder="Search DUT ISN"
                            @input="debouncedFetch">
                    </label>

                    <label class="top-product-db-field">
                        <span>Projects</span>
                        <select v-model="filters.projects" multiple size="5" @change="debouncedFetch">
                            <option v-for="project in projectOptions" :key="project.value" :value="project.value">
                                {{ project.title }}
                            </option>
                        </select>
                        <small>{{ filters.projects?.length || 0 }} selected</small>
                    </label>

                    <label class="top-product-db-field">
                        <span>Stations</span>
                        <select v-model="filters.stations" multiple size="5" @change="debouncedFetch">
                            <option v-for="station in stationOptions" :key="station.value" :value="station.value">
                                {{ station.stationName }}{{ station.project ? ` (${station.project})` : '' }}
                            </option>
                        </select>
                        <small>{{ filters.stations?.length || 0 }} selected</small>
                    </label>

                    <label class="top-product-db-field">
                        <span>Minimum Score</span>
                        <input v-model.number="filters.min_score" type="number" min="0" step="0.01"
                            placeholder="Optional threshold" @input="debouncedFetch">
                    </label>
                </div>

                <div class="top-product-db-filter-summary">
                    <span>{{ pagination.total.toLocaleString() }} total records</span>
                    <span>{{ filters.projects?.length || 0 }} project filters</span>
                    <span>{{ filters.stations?.length || 0 }} station filters</span>
                    <span>{{ filters.min_score ?? 'Any' }} minimum score</span>
                </div>
            </AppPanel>

            <AppPanel eyebrow="Database Records" title="Top Products"
                description="Review the current result set, inspect individual rows, and queue export or deletion actions without leaving the page."
                splitHeader>
                <template #header-aside>
                    <div class="top-product-db-toolbar">
                        <span class="top-product-db-pill top-product-db-pill--neutral">
                            {{ pagination.total.toLocaleString() }} total
                        </span>
                        <span v-if="selectedProducts.length > 0"
                            class="top-product-db-pill top-product-db-pill--warning">
                            {{ selectedProducts.length }} selected
                        </span>
                        <button v-if="canBulkDelete && selectedProducts.length > 0" type="button"
                            class="top-product-db-button top-product-db-button--danger" @click="confirmBulkDelete">
                            <Icon icon="mdi:delete-sweep-outline" />
                            <span>Delete Selected</span>
                        </button>
                        <label class="top-product-db-page-size">
                            <span>Rows</span>
                            <select v-model.number="pagination.page_size" @change="handlePageSizeChange">
                                <option v-for="size in pageSizeOptions" :key="size" :value="size">
                                    {{ size }} per page
                                </option>
                            </select>
                        </label>
                    </div>
                </template>

                <div v-if="canBulkDelete" class="top-product-db-notice top-product-db-notice--warning">
                    <div>
                        <strong>Delete access enabled</strong>
                        <p>Selection checkboxes are visible because your current role can remove top-product records.
                        </p>
                    </div>
                </div>

                <AppDataGrid class="top-product-db-grid" :columns="gridColumns" :rows="products" :loading="loading"
                    dataKey="id" :selection="selectedProducts" selectionMode="multiple"
                    :showSelectionColumn="canBulkDelete" :paginator="true" :rowsPerPage="pagination.page_size"
                    :rowsPerPageOptions="pageSizeOptions" :totalRecords="pagination.total" :lazy="true"
                    :first="(pagination.page - 1) * pagination.page_size" :sortField="filters.sort_by"
                    :sortOrder="gridSortOrder" scrollHeight="38rem"
                    @update:selection="selectedProducts = ($event as TopProductItem[]) || []"
                    @row-click="handleGridRowClick" @page="handleGridPage" @sort="handleGridSort">
                    <template #cell-dut_isn="slotProps">
                        <div class="top-product-db-cell top-product-db-cell--primary">
                            <Icon icon="mdi:barcode" />
                            <span>{{ slotProps.data.dut_isn }}</span>
                        </div>
                    </template>

                    <template #cell-project_name="slotProps">
                        <span v-if="slotProps.data.project_name" class="top-product-db-pill top-product-db-pill--cool">
                            {{ slotProps.data.project_name }}
                        </span>
                        <span v-else class="top-product-db-muted">N/A</span>
                    </template>

                    <template #cell-station_name="slotProps">
                        <span class="top-product-db-pill top-product-db-pill--neutral">
                            {{ slotProps.data.station_name }}
                        </span>
                    </template>

                    <template #cell-score="slotProps">
                        <span class="top-product-db-pill" :class="scoreToneClass(slotProps.data.score)">
                            <Icon :icon="getScoreIcon(slotProps.data.score)" />
                            {{ slotProps.data.score?.toFixed(2) || '0.00' }}
                        </span>
                    </template>

                    <template #cell-pass_count="slotProps">
                        <span class="top-product-db-pill top-product-db-pill--success">{{ slotProps.data.pass_count
                            }}</span>
                    </template>

                    <template #cell-fail_count="slotProps">
                        <span class="top-product-db-pill"
                            :class="slotProps.data.fail_count > 0 ? 'top-product-db-pill--danger' : 'top-product-db-pill--neutral'">
                            {{ slotProps.data.fail_count }}
                        </span>
                    </template>

                    <template #cell-pass_rate="slotProps">
                        <div class="top-product-db-progress">
                            <div class="top-product-db-progress__track">
                                <span class="top-product-db-progress__value"
                                    :class="passRateToneClass(getPassRateValue(slotProps.data))"
                                    :style="{ width: `${getPassRateValue(slotProps.data)}%` }" />
                            </div>
                            <strong>{{ getPassRate(slotProps.data) }}%</strong>
                        </div>
                    </template>

                    <template #cell-test_date="slotProps">
                        <span>{{ formatDate(slotProps.data.test_date) }}</span>
                    </template>

                    <template #cell-measurements_count="slotProps">
                        <span class="top-product-db-pill top-product-db-pill--outline">
                            {{ slotProps.data.measurements_count || 0 }} items
                        </span>
                    </template>

                    <template #cell-actions="slotProps">
                        <div class="top-product-db-actions">
                            <button type="button" @click.stop="viewDetail(slotProps.data.id)">
                                <Icon icon="mdi:eye-outline" />
                                <span>View</span>
                            </button>
                            <button type="button" @click.stop="handleExport(slotProps.data)">
                                <Icon icon="mdi:download-outline" />
                                <span>Export</span>
                            </button>
                            <button v-if="isAdmin" type="button" class="top-product-db-actions__danger"
                                @click.stop="confirmDelete(slotProps.data)">
                                <Icon icon="mdi:delete-outline" />
                                <span>Delete</span>
                            </button>
                        </div>
                    </template>

                    <template #loading>
                        <div class="top-product-db-empty-state">
                            <div class="top-product-db-empty-state__spinner" />
                            <strong>Loading top-product records...</strong>
                            <p>Fetching the current database slice for the selected filters.</p>
                        </div>
                    </template>

                    <template #empty>
                        <div class="top-product-db-empty-state">
                            <Icon icon="mdi:database-off-outline" />
                            <strong>No products found</strong>
                            <p>{{ hasActiveFilters ? 'Try adjusting your filters.' : 'No data is available yet.' }}</p>
                        </div>
                    </template>
                </AppDataGrid>
            </AppPanel>

            <AppDialog v-model="detailDialog" :width="isFullscreen ? '96vw' : 'min(96vw, 88rem)'"
                :closable="false" :draggable="false" :class="{ 'top-product-db-detail-dialog--expanded': isFullscreen }">
                <template #header>
                    <div class="top-product-db-dialog-header">
                        <div>
                            <p class="top-product-db-dialog-header__eyebrow">Record Detail</p>
                            <h2>Product Details</h2>
                            <p>Inspect measurements, score breakdown, and record metadata before exporting or deleting.</p>
                        </div>
                        <div class="top-product-db-dialog-header__actions">
                            <button type="button" class="top-product-db-icon-button"
                                :title="isFullscreen ? 'Return to windowed dialog' : 'Expand dialog'"
                                @click="isFullscreen = !isFullscreen">
                                <Icon :icon="isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" />
                            </button>
                            <button type="button" class="top-product-db-icon-button" @click="detailDialog = false">
                                <Icon icon="mdi:close" />
                            </button>
                        </div>
                    </div>
                </template>

                <div v-if="selectedProduct" class="top-product-db-detail-stack">
                    <section class="top-product-db-detail-hero">
                        <article class="top-product-db-detail-hero__card top-product-db-detail-hero__card--primary">
                            <span>DUT ISN</span>
                            <strong>{{ selectedProduct.dut_isn }}</strong>
                        </article>
                        <article class="top-product-db-detail-hero__card top-product-db-detail-hero__card--cool">
                            <span>Station</span>
                            <strong>{{ selectedProduct.station_name }}</strong>
                        </article>
                    </section>

                    <section class="top-product-db-detail-meta-grid">
                        <article class="top-product-db-detail-meta-card">
                            <span>Project</span>
                            <strong>{{ selectedProduct.project_name || 'N/A' }}</strong>
                        </article>
                        <article class="top-product-db-detail-meta-card">
                            <span>Device</span>
                            <strong>{{ selectedProduct.device_name || 'N/A' }}</strong>
                        </article>
                        <article class="top-product-db-detail-meta-card">
                            <span>Test Date</span>
                            <strong>{{ formatDate(selectedProduct.test_date) }}</strong>
                        </article>
                        <article class="top-product-db-detail-meta-card">
                            <span>Test Duration</span>
                            <strong>{{ selectedProduct.test_duration ? `${selectedProduct.test_duration.toFixed(2)}s` : 'N/A' }}</strong>
                        </article>
                        <article class="top-product-db-detail-meta-card">
                            <span>Analysis Date</span>
                            <strong>{{ formatDate(selectedProduct.created_at) }}</strong>
                        </article>
                        <article class="top-product-db-detail-meta-card top-product-db-detail-meta-card--score">
                            <span>Overall Score</span>
                            <strong>{{ selectedProduct.score?.toFixed(2) || 'N/A' }}</strong>
                            <em class="top-product-db-pill" :class="scoreToneClass(selectedProduct.score)">
                                <Icon :icon="getScoreIcon(selectedProduct.score)" />
                                {{ getScoreColor(selectedProduct.score).toUpperCase() }}
                            </em>
                        </article>
                    </section>

                    <section class="top-product-db-detail-results">
                        <div>
                            <p class="top-product-db-detail-results__eyebrow">Test Results</p>
                            <h3>Execution Summary</h3>
                        </div>
                        <div class="top-product-db-detail-results__chips">
                            <span class="top-product-db-pill top-product-db-pill--neutral">
                                Total: {{ (selectedProduct.pass_count + selectedProduct.fail_count) || 0 }}
                            </span>
                            <span class="top-product-db-pill top-product-db-pill--success">
                                Pass: {{ selectedProduct.pass_count || 0 }}
                            </span>
                            <span class="top-product-db-pill top-product-db-pill--danger">
                                Fail: {{ selectedProduct.fail_count || 0 }}
                            </span>
                            <span class="top-product-db-pill top-product-db-pill--warning">
                                Retest: {{ selectedProduct.retest_count || 0 }}
                            </span>
                        </div>
                    </section>

                    <section class="top-product-db-measurements">
                        <div class="top-product-db-measurements__header">
                            <div>
                                <p class="top-product-db-detail-results__eyebrow">Measurement Breakdown</p>
                                <h3>Measurements</h3>
                            </div>
                            <div class="top-product-db-measurements__tools">
                                <span class="top-product-db-pill top-product-db-pill--cool">
                                    {{ filteredMeasurements.length }} of {{ selectedProduct.measurements?.length || 0 }}
                                </span>
                                <label class="top-product-db-search-field">
                                    <Icon icon="mdi:magnify" />
                                    <input v-model="measurementSearch" type="text" autocomplete="off"
                                        placeholder="Search measurements">
                                </label>
                            </div>
                        </div>

                        <AppDataGrid :columns="measurementGridColumns" :rows="filteredMeasurements" dataKey="test_item"
                            paginator :rowsPerPage="10" :rowsPerPageOptions="[10, 25, 50, 100]"
                            :tableStyle="{ minWidth: '100%' }" scrollHeight="34rem">
                            <template #cell-test_item="slotProps">
                                <span class="top-product-db-measurement-name">{{ slotProps.data.test_item }}</span>
                            </template>

                            <template #cell-pass_status="slotProps">
                                <span class="top-product-db-status-pill"
                                    :class="isWithinLimits(slotProps.data) ? 'top-product-db-status-pill--success' : 'top-product-db-status-pill--danger'">
                                    <Icon :icon="isWithinLimits(slotProps.data) ? 'mdi:check-circle' : 'mdi:alert-circle'" />
                                    {{ isWithinLimits(slotProps.data) ? 'Pass' : 'Fail' }}
                                </span>
                            </template>

                            <template #cell-actual_value="slotProps">
                                <span :class="isWithinLimits(slotProps.data) ? 'top-product-db-value--success' : 'top-product-db-value--danger'">
                                    {{ slotProps.data.actual_value !== null && slotProps.data.actual_value !== undefined ? slotProps.data.actual_value : '—' }}
                                </span>
                            </template>

                            <template #cell-deviation="slotProps">
                                <span v-if="slotProps.data.deviation !== null">{{ slotProps.data.deviation.toFixed(2) }}</span>
                                <span v-else class="top-product-db-muted">—</span>
                            </template>
                        </AppDataGrid>
                    </section>
                </div>
            </AppDialog>

            <AppDialog v-model="deleteDialog" title="Confirm Delete"
                description="Delete a single top-product record and all of its persisted measurements." width="min(92vw, 34rem)"
                persistent :closable="false">
                <div class="top-product-db-confirm-stack">
                    <section class="top-product-db-confirm-card top-product-db-confirm-card--danger">
                        <div><strong>ISN</strong><span>{{ productToDelete?.dut_isn || 'N/A' }}</span></div>
                        <div><strong>Project</strong><span>{{ productToDelete?.project_name || 'N/A' }}</span></div>
                        <div><strong>Station</strong><span>{{ productToDelete?.station_name || 'N/A' }}</span></div>
                        <div><strong>Score</strong><span>{{ productToDelete?.score?.toFixed(2) || 'N/A' }}</span></div>
                    </section>

                    <div class="top-product-db-notice top-product-db-notice--warning">
                        <div>
                            <strong>This action cannot be undone</strong>
                            <p>Confirm only if this record and its measurements should be permanently removed.</p>
                        </div>
                    </div>

                    <label class="top-product-db-field">
                        <span>Type DELETE to confirm</span>
                        <input v-model="deleteConfirmation" type="text" autocomplete="off" placeholder="DELETE"
                            autofocus @keyup.enter="handleDelete">
                    </label>
                </div>

                <template #footer>
                    <div class="top-product-db-dialog-footer">
                        <button type="button" class="top-product-db-button top-product-db-button--ghost"
                            :disabled="deleting" @click="cancelDelete">
                            Cancel
                        </button>
                        <button type="button" class="top-product-db-button top-product-db-button--danger"
                            :disabled="deleteConfirmation !== 'DELETE' || deleting" @click="handleDelete">
                            <Icon v-if="deleting" icon="mdi:loading" class="top-product-db-spin" />
                            <span>{{ deleting ? 'Deleting...' : 'Delete Data' }}</span>
                        </button>
                    </div>
                </template>
            </AppDialog>

            <AppDialog v-model="bulkDeleteDialog" title="Confirm Bulk Delete"
                description="Delete the current selection of top-product records in one action." width="min(92vw, 40rem)"
                persistent :closable="false">
                <div class="top-product-db-confirm-stack">
                    <p class="top-product-db-dialog-copy">
                        You are about to delete <strong>{{ selectedProducts.length }}</strong> top-product record(s).
                    </p>

                    <section class="top-product-db-confirm-card top-product-db-confirm-card--list">
                        <ul class="top-product-db-selection-list">
                            <li v-for="product in selectedProducts" :key="product.id">
                                <div>
                                    <strong>{{ product.dut_isn }}</strong>
                                    <span>{{ product.station_name }}</span>
                                </div>
                                <span v-if="product.project_name" class="top-product-db-pill top-product-db-pill--cool">
                                    {{ product.project_name }}
                                </span>
                            </li>
                        </ul>
                    </section>

                    <div class="top-product-db-notice top-product-db-notice--warning">
                        <div>
                            <strong>This bulk delete is permanent</strong>
                            <p>Every selected record and its measurements will be removed immediately.</p>
                        </div>
                    </div>

                    <label class="top-product-db-field">
                        <span>Type DELETE to confirm</span>
                        <input v-model="bulkDeleteConfirmation" type="text" autocomplete="off" placeholder="DELETE"
                            autofocus @keyup.enter="handleBulkDelete">
                    </label>
                </div>

                <template #footer>
                    <div class="top-product-db-dialog-footer">
                        <button type="button" class="top-product-db-button top-product-db-button--ghost"
                            :disabled="bulkDeleting" @click="cancelBulkDelete">
                            Cancel
                        </button>
                        <button type="button" class="top-product-db-button top-product-db-button--danger"
                            :disabled="bulkDeleteConfirmation !== 'DELETE' || bulkDeleting" @click="handleBulkDelete">
                            <Icon v-if="bulkDeleting" icon="mdi:loading" class="top-product-db-spin" />
                            <span>{{ bulkDeleting ? 'Deleting...' : `Delete ${selectedProducts.length} Record(s)` }}</span>
                        </button>
                    </div>
                </template>
            </AppDialog>

            <AppDialog v-model="exportDialog" title="Export Product Data"
                description="Export the selected product record into a portable report or clipboard snapshot." width="min(92vw, 34rem)">
                <div class="top-product-db-confirm-stack">
                    <section class="top-product-db-confirm-card top-product-db-confirm-card--export">
                        <div><strong>ISN</strong><span>{{ productToExport?.dut_isn || 'N/A' }}</span></div>
                        <div><strong>Project</strong><span>{{ productToExport?.project_name || 'N/A' }}</span></div>
                        <div><strong>Station</strong><span>{{ productToExport?.station_name || 'N/A' }}</span></div>
                    </section>

                    <div class="top-product-db-export-actions">
                        <button type="button" class="top-product-db-export-button top-product-db-export-button--success"
                            :disabled="exporting" @click="exportProduct('excel')">
                            <Icon :icon="exporting ? 'mdi:loading' : 'mdi:file-excel-box'" :class="{ 'top-product-db-spin': exporting }" />
                            <span>Export to Excel</span>
                        </button>
                        <button type="button" class="top-product-db-export-button top-product-db-export-button--danger"
                            :disabled="exporting" @click="exportProduct('pdf')">
                            <Icon :icon="exporting ? 'mdi:loading' : 'mdi:file-pdf-box'" :class="{ 'top-product-db-spin': exporting }" />
                            <span>Export to PDF</span>
                        </button>
                        <button type="button" class="top-product-db-export-button top-product-db-export-button--cool"
                            :disabled="exporting" @click="exportProduct('clipboard')">
                            <Icon :icon="exporting ? 'mdi:loading' : 'mdi:content-copy'" :class="{ 'top-product-db-spin': exporting }" />
                            <span>Copy to Clipboard</span>
                        </button>
                    </div>
                </div>

                <template #footer>
                    <div class="top-product-db-dialog-footer">
                        <button type="button" class="top-product-db-button top-product-db-button--ghost"
                            :disabled="exporting" @click="exportDialog = false">
                            Close
                        </button>
                    </div>
                </template>
            </AppDialog>
        </div>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { formatDateTimeCompact } from '@/core/utils/dateTime'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import AppDataGrid from '@/shared/ui/data-grid/AppDataGrid.vue'
import AppDialog from '@/shared/ui/dialog/AppDialog.vue'
import AppPanel from '@/shared/ui/panel/AppPanel.vue'
import { getApiErrorDetail } from '@/shared/utils'
import {
    bulkDeleteTopProducts,
    deleteTopProduct,
    getTopProductDetail,
    getTopProductsList,
    getTopProductsStats,
    getUniqueProjects,
    getUniqueStations,
    type TopProductDetail,
    type TopProductItem,
    type TopProductListParams,
    type TopProductMeasurement,
    type TopProductStats,
} from '../api/topProducts.api'
import { useTopProductExport } from '../composables/useTopProductExport'

// ===== State =====
const authStore = useAuthStore()
const { exportToExcel, exportToPDF, copyToClipboard } = useTopProductExport()
const loading = ref(false)
const statsLoading = ref(false)
const products = ref<TopProductItem[]>([])
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
    recent_products_7d: 0,
})
const selectedProduct = ref<TopProductDetail | null>(null)
const detailDialog = ref(false)
const isFullscreen = ref(false)
const measurementSearch = ref('')

// Export dialog state
const exportDialog = ref(false)
const productToExport = ref<TopProductItem | null>(null)
const exporting = ref(false)

// Delete dialog state
const deleteDialog = ref(false)
const productToDelete = ref<TopProductItem | null>(null)
const deleteConfirmation = ref('')
const deleting = ref(false)

// Bulk delete state
const selectedProducts = ref<TopProductItem[]>([])
const bulkDeleteDialog = ref(false)
const bulkDeleteConfirmation = ref('')
const bulkDeleting = ref(false)

// Filter options
const projectOptions = ref<{ title: string; value: string }[]>([])
const stationOptions = ref<
    { title: string; value: string; stationName: string; project: string | null }[]
>([])

const pagination = ref({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
})

const filters = ref<TopProductListParams>({
    dut_isn: undefined,
    projects: [],
    stations: [],
    min_score: undefined,
    sort_by: 'created_at',
    sort_desc: true,
})

const pageSizeOptions = [10, 20, 50, 100]

// ===== Computed =====
const isAdmin = computed(() => authStore.user?.is_admin || false)

/**
 * Whether the current user can perform bulk delete.
 * Only available to superadmin and developer roles, or users with explicit delete permission.
 */
const canBulkDelete = computed(() => {
    return authStore.isSuperAdmin || authStore.hasMenuPermission('top_product_database', 'delete')
})

/**
 * Dynamic headers — same base headers for all users.
 */
const gridSortOrder = computed(() => (filters.value.sort_desc ? -1 : 1))

const hasActiveFilters = computed(() => {
    return !!(
        filters.value.dut_isn ||
        (filters.value.projects && filters.value.projects.length > 0) ||
        (filters.value.stations && filters.value.stations.length > 0) ||
        filters.value.min_score
    )
})

const filteredMeasurements = computed(() => {
    if (!selectedProduct.value?.measurements) return []
    if (!measurementSearch.value) return selectedProduct.value.measurements

    const search = measurementSearch.value.toLowerCase()
    return selectedProduct.value.measurements.filter((m) =>
        m.test_item.toLowerCase().includes(search),
    )
})

// ===== Table Headers =====
const gridColumns = [
    { key: 'dut_isn', field: 'dut_isn', header: 'DUT ISN', sortable: true, style: { minWidth: '12rem' } },
    { key: 'project_name', field: 'project_name', header: 'Project', sortable: true, style: { minWidth: '10rem' } },
    { key: 'station_name', field: 'station_name', header: 'Station', sortable: true, style: { minWidth: '10rem' } },
    { key: 'score', field: 'score', header: 'Score', sortable: true, style: { minWidth: '8rem' } },
    { key: 'pass_count', field: 'pass_count', header: 'Passed', sortable: true, style: { minWidth: '7rem' } },
    { key: 'fail_count', field: 'fail_count', header: 'Failed', sortable: true, style: { minWidth: '7rem' } },
    { key: 'pass_rate', header: 'Pass Rate', sortable: false, style: { minWidth: '10rem' } },
    { key: 'test_date', field: 'test_date', header: 'Test Date', sortable: true, style: { minWidth: '11rem' } },
    { key: 'measurements_count', field: 'measurements_count', header: 'Measurements', sortable: false, style: { minWidth: '10rem' } },
    { key: 'actions', header: 'Actions', sortable: false, style: { minWidth: '14rem' } },
]

const measurementGridColumns = [
    { key: 'test_item', field: 'test_item', header: 'Test Item', sortable: true, style: { minWidth: '16rem' } },
    { key: 'pass_status', header: 'Status', sortable: false, style: { minWidth: '9rem' } },
    { key: 'usl', field: 'usl', header: 'USL', sortable: true, style: { minWidth: '8rem' } },
    { key: 'lsl', field: 'lsl', header: 'LSL', sortable: true, style: { minWidth: '8rem' } },
    { key: 'target_value', field: 'target_value', header: 'Target', sortable: true, style: { minWidth: '8rem' } },
    { key: 'actual_value', field: 'actual_value', header: 'Actual', sortable: true, style: { minWidth: '8rem' } },
    { key: 'deviation', field: 'deviation', header: 'Deviation', sortable: true, style: { minWidth: '8rem' } },
]

// ===== Methods =====
async function fetchProducts() {
    loading.value = true
    try {
        const params: TopProductListParams = {
            page: pagination.value.page,
            page_size: pagination.value.page_size,
            ...filters.value,
        }

        console.log('🔍 Fetching products with params:', params)
        console.log('  - Projects filter:', filters.value.projects)
        console.log('  - Stations filter:', filters.value.stations)

        const response = await getTopProductsList(params)

        console.log('✅ Received products:', response.top_products.length, 'total:', response.total)

        products.value = response.top_products
        pagination.value.total = response.total
        pagination.value.total_pages = response.total_pages
        // Clear selection when data changes
        selectedProducts.value = []
    } catch (error) {
        console.error('❌ Failed to fetch products:', error)
    } finally {
        loading.value = false
    }
}

async function fetchStats() {
    statsLoading.value = true
    try {
        const result = await getTopProductsStats()
        stats.value = result
    } catch (error) {
        console.error('Failed to fetch stats:', error)
        // Stats already has default values from initialization
    } finally {
        statsLoading.value = false
    }
}

async function viewDetail(productId: number) {
    try {
        selectedProduct.value = await getTopProductDetail(productId)
        measurementSearch.value = '' // Reset search when opening dialog
        detailDialog.value = true
    } catch (error) {
        console.error('Failed to fetch product detail:', error)
    }
}

async function loadFilterOptions() {
    try {
        // Load projects
        const projects = await getUniqueProjects()
        projectOptions.value = projects.map((p) => ({
            title: p.label,
            value: p.value,
        }))

        // Load stations
        const stations = await getUniqueStations()
        stationOptions.value = stations.map((s) => ({
            title: s.label,
            value: s.value,
            stationName: s.value,
            project: s.project,
        }))
    } catch (error) {
        console.error('Failed to load filter options:', error)
    }
}

function clearFilters() {
    filters.value = {
        dut_isn: undefined,
        projects: [],
        stations: [],
        min_score: undefined,
        sort_by: 'created_at',
        sort_desc: true,
    }
    pagination.value.page = 1
    fetchProducts()
}

function refreshData() {
    fetchStats()
    fetchProducts()
    loadFilterOptions()
}

function handlePageSizeChange() {
    pagination.value.page = 1
    fetchProducts()
}

function handleGridPage(event: unknown) {
    const pageEvent = event as { page?: number; rows?: number } | null
    if (!pageEvent) {
        return
    }

    pagination.value.page = (pageEvent.page ?? 0) + 1
    if (pageEvent.rows && pageEvent.rows !== pagination.value.page_size) {
        pagination.value.page_size = pageEvent.rows
    }
    fetchProducts()
}

// Debounce helper
let debounceTimer: number | undefined
function debouncedFetch() {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        pagination.value.page = 1
        fetchProducts()
    }, 500) as unknown as number
}

// ===== Computed & Helpers =====
function formatDate(dateString: string | null): string {
    // Convert UTC to user's local timezone
    return formatDateTimeCompact(dateString)
}

function getPassRate(item: TopProductItem): string {
    const total = item.pass_count + item.fail_count
    if (total === 0) return '0.00'
    return ((item.pass_count / total) * 100).toFixed(2)
}

function getPassRateValue(item: TopProductItem): number {
    const total = item.pass_count + item.fail_count
    if (total === 0) return 0
    return (item.pass_count / total) * 100
}

function getPassRateColor(passRate: number): string {
    if (passRate >= 95) return 'success'
    if (passRate >= 80) return 'warning'
    return 'error'
}

function passRateToneClass(passRate: number): string {
    if (passRate >= 95) return 'top-product-db-progress__value--success'
    if (passRate >= 80) return 'top-product-db-progress__value--warning'
    return 'top-product-db-progress__value--danger'
}

function getScoreColor(score: number | null | undefined): string {
    if (!score) return 'error'
    if (score >= 8) return 'success'
    if (score >= 6) return 'warning'
    return 'error'
}

function getScoreIcon(score: number | null | undefined): string {
    if (!score) return 'mdi-alert-circle'
    if (score >= 8) return 'mdi-check-circle'
    if (score >= 6) return 'mdi-alert'
    return 'mdi-close-circle'
}

function scoreToneClass(score: number | null | undefined): string {
    if (!score) return 'top-product-db-pill--danger'
    if (score >= 8) return 'top-product-db-pill--success'
    if (score >= 6) return 'top-product-db-pill--warning'
    return 'top-product-db-pill--danger'
}

function isWithinLimits(measurement: TopProductMeasurement): boolean {
    if (measurement.actual_value === null) return false
    const withinLSL = measurement.lsl === null || measurement.actual_value >= measurement.lsl
    const withinUSL = measurement.usl === null || measurement.actual_value <= measurement.usl
    return withinLSL && withinUSL
}

function handleGridSort(event: unknown) {
    const sortEvent = event as { sortField?: string; sortOrder?: -1 | 0 | 1 | null } | null
    if (!sortEvent?.sortField || sortEvent.sortField === 'pass_rate' || sortEvent.sortField === 'actions') {
        return
    }

    filters.value.sort_by = sortEvent.sortField
    filters.value.sort_desc = sortEvent.sortOrder !== 1
    pagination.value.page = 1
    fetchProducts()
}

function handleGridRowClick(event: unknown) {
    const rowEvent = event as { data?: TopProductItem } | null
    if (!rowEvent?.data?.id) {
        return
    }

    viewDetail(rowEvent.data.id)
}

// ===== Delete Handlers =====
function confirmDelete(product: TopProductItem) {
    productToDelete.value = product
    deleteConfirmation.value = ''
    deleteDialog.value = true
}

function cancelDelete() {
    deleteDialog.value = false
    productToDelete.value = null
    deleteConfirmation.value = ''
}

async function handleDelete() {
    if (deleteConfirmation.value !== 'DELETE' || !productToDelete.value || deleting.value) {
        return
    }

    deleting.value = true
    try {
        await deleteTopProduct(productToDelete.value.id)

        // Show success message
        console.log('Product deleted successfully')

        // Close dialog
        cancelDelete()

        // Refresh the data
        await fetchProducts()
        await fetchStats()
    } catch (error: unknown) {
        console.error('Failed to delete product:', error)
        const errorMessage = getApiErrorDetail(error, 'Failed to delete product. Please try again.')
        alert(errorMessage)
    } finally {
        deleting.value = false
    }
}

// ===== Bulk Delete Handlers =====
function confirmBulkDelete() {
    if (selectedProducts.value.length === 0) return
    bulkDeleteConfirmation.value = ''
    bulkDeleteDialog.value = true
}

function cancelBulkDelete() {
    bulkDeleteDialog.value = false
    bulkDeleteConfirmation.value = ''
}

async function handleBulkDelete() {
    if (
        bulkDeleteConfirmation.value !== 'DELETE' ||
        selectedProducts.value.length === 0 ||
        bulkDeleting.value
    ) {
        return
    }

    bulkDeleting.value = true
    try {
        const ids = selectedProducts.value.map((p) => p.id)
        console.log('🗑️ Bulk deleting products with ids:', ids, 'from selected:', selectedProducts.value.map((p) => ({ id: p.id, isn: p.dut_isn })))
        const result = await bulkDeleteTopProducts(ids)

        console.log(`Bulk deleted ${result.deleted_count} products`)

        // Clear selection and close dialog
        selectedProducts.value = []
        cancelBulkDelete()

        // Refresh the data
        await fetchProducts()
        await fetchStats()
    } catch (error: unknown) {
        console.error('Failed to bulk delete products:', error)
        const errorMessage = getApiErrorDetail(
            error,
            'Failed to delete selected products. Please try again.',
        )
        alert(errorMessage)
    } finally {
        bulkDeleting.value = false
    }
}

// ===== Export Handlers =====
function handleExport(product: TopProductItem) {
    productToExport.value = product
    exportDialog.value = true
}

async function exportProduct(format: 'excel' | 'pdf' | 'clipboard') {
    if (!productToExport.value || exporting.value) return

    exporting.value = true
    try {
        // Fetch full product details including measurements
        const details = await getTopProductDetail(productToExport.value.id)

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
            measurements: details.measurements?.map((m) => ({
                test_item: m.test_item,
                usl: m.usl,
                lsl: m.lsl,
                actual_value: m.actual_value,
                deviation: m.deviation,
            })),
        }

        if (format === 'excel') {
            await exportToExcel(exportData)
        } else if (format === 'pdf') {
            await exportToPDF(exportData)
        } else if (format === 'clipboard') {
            await copyToClipboard(exportData)
        }

        exportDialog.value = false
        productToExport.value = null
    } catch (error: unknown) {
        console.error('Export failed:', error)
        alert('Export failed. Please try again.')
    } finally {
        exporting.value = false
    }
}

// ===== Lifecycle =====
onMounted(() => {
    fetchStats()
    fetchProducts()
    loadFilterOptions()
})

onBeforeUnmount(() => {
    // Clear debounce timer
    if (debounceTimer) {
        clearTimeout(debounceTimer)
    }
})
</script>

<style scoped>
.top-product-db-shell {
    display: grid;
    gap: 1.5rem;
}

.top-product-db-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
}

.top-product-db-header__copy {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
}

.top-product-db-header__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 1rem;
    background: linear-gradient(135deg, rgba(15, 118, 110, 0.14), rgba(45, 212, 191, 0.16));
    color: var(--app-accent);
    font-size: 1.5rem;
}

.top-product-db-header__eyebrow {
    margin: 0 0 0.35rem;
    color: var(--app-accent);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.top-product-db-header h1 {
    margin: 0;
    color: var(--app-ink);
}

.top-product-db-header p {
    margin: 0.35rem 0 0;
    color: var(--app-muted);
    max-width: 52rem;
    line-height: 1.6;
}

.top-product-db-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    border-radius: 999px;
    border: 1px solid transparent;
    padding: 0.8rem 1.15rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.top-product-db-button:disabled {
    cursor: not-allowed;
    opacity: 0.65;
}

.top-product-db-button:not(:disabled):hover {
    transform: translateY(-1px);
}

.top-product-db-button--primary {
    background: linear-gradient(135deg, var(--app-accent), #14b8a6);
    color: #fff;
    box-shadow: 0 18px 32px rgba(15, 118, 110, 0.14);
}

.top-product-db-button--ghost {
    border-color: var(--app-border);
    background: var(--app-panel);
    color: var(--app-ink);
}

.top-product-db-button--danger {
    background: rgba(180, 54, 45, 0.12);
    border-color: rgba(180, 54, 45, 0.16);
    color: #a61b1b;
}

.top-product-db-spin {
    animation: top-product-db-spin 1s linear infinite;
}

.top-product-db-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
}

.top-product-db-stat-card {
    display: flex;
    gap: 0.9rem;
    align-items: center;
    border: 1px solid var(--app-border);
    border-radius: 1.4rem;
    padding: 1rem 1.1rem;
    background: var(--app-panel);
    box-shadow: var(--app-shadow-soft);
}

.top-product-db-stat-card--cool {
    background: linear-gradient(180deg, rgba(36, 116, 184, 0.1), var(--app-panel));
}

.top-product-db-stat-card--indigo {
    background: linear-gradient(180deg, rgba(79, 70, 229, 0.1), var(--app-panel));
}

.top-product-db-stat-card--success {
    background: linear-gradient(180deg, rgba(15, 118, 110, 0.1), var(--app-panel));
}

.top-product-db-stat-card__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.95rem;
    background: rgba(255, 255, 255, 0.72);
    color: var(--app-ink);
    font-size: 1.2rem;
}

.top-product-db-stat-card span {
    display: block;
    color: var(--app-muted);
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.top-product-db-stat-card strong {
    display: block;
    margin-top: 0.2rem;
    color: var(--app-ink);
    font-size: 1.7rem;
}

.top-product-db-filter-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
}

.top-product-db-field {
    display: grid;
    gap: 0.45rem;
}

.top-product-db-field span {
    color: var(--app-ink);
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.top-product-db-field input,
.top-product-db-field select {
    width: 100%;
    border: 1px solid var(--app-border);
    border-radius: 1rem;
    padding: 0.78rem 0.95rem;
    background: rgba(255, 255, 255, 0.92);
    color: var(--app-ink);
}

.top-product-db-field select[multiple] {
    min-height: 9.5rem;
}

.top-product-db-field input:focus,
.top-product-db-field select:focus {
    outline: none;
    border-color: rgba(15, 118, 110, 0.4);
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
}

.top-product-db-field small {
    color: var(--app-muted);
}

.top-product-db-filter-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    color: var(--app-muted);
    font-size: 0.9rem;
}

.top-product-db-filter-summary span {
    border-radius: 999px;
    border: 1px solid var(--app-border);
    padding: 0.4rem 0.75rem;
    background: var(--app-panel);
}

.top-product-db-toolbar {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.65rem;
    align-items: center;
}

.top-product-db-page-size {
    display: inline-flex;
    gap: 0.5rem;
    align-items: center;
    color: var(--app-muted);
    font-size: 0.88rem;
}

.top-product-db-page-size select {
    border: 1px solid var(--app-border);
    border-radius: 999px;
    padding: 0.5rem 0.8rem;
    background: rgba(255, 255, 255, 0.92);
    color: var(--app-ink);
}

.top-product-db-notice {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    border-radius: 1.1rem;
    padding: 0.95rem 1rem;
}

.top-product-db-notice--warning {
    border: 1px solid rgba(184, 122, 40, 0.18);
    background: rgba(255, 247, 237, 0.96);
}

.top-product-db-notice strong {
    display: block;
    color: #9a5a12;
}

.top-product-db-notice p {
    margin: 0.25rem 0 0;
    color: #7c5a34;
}

.top-product-db-grid :deep(.p-datatable-tbody > tr) {
    cursor: pointer;
}

.top-product-db-grid :deep(.p-datatable-tbody > tr:hover > td) {
    background: rgba(15, 118, 110, 0.04);
}

.top-product-db-cell {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
}

.top-product-db-cell--primary {
    color: var(--app-ink);
    font-weight: 700;
}

.top-product-db-muted {
    color: var(--app-muted);
}

.top-product-db-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border-radius: 999px;
    padding: 0.28rem 0.65rem;
    font-size: 0.82rem;
    font-weight: 700;
}

.top-product-db-pill--neutral {
    background: rgba(148, 163, 184, 0.15);
    color: #334155;
}

.top-product-db-pill--cool {
    background: rgba(36, 116, 184, 0.12);
    color: #1d4f91;
}

.top-product-db-pill--outline {
    border: 1px solid var(--app-border);
    color: var(--app-ink);
}

.top-product-db-pill--success {
    background: rgba(15, 118, 110, 0.1);
    color: var(--app-accent);
}

.top-product-db-pill--warning {
    background: rgba(184, 122, 40, 0.14);
    color: #9a5a12;
}

.top-product-db-pill--danger {
    background: rgba(180, 54, 45, 0.14);
    color: #a61b1b;
}

.top-product-db-progress {
    display: inline-flex;
    gap: 0.55rem;
    align-items: center;
    min-width: 9rem;
}

.top-product-db-progress__track {
    position: relative;
    width: 4.5rem;
    height: 0.45rem;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.2);
    overflow: hidden;
}

.top-product-db-progress__value {
    display: block;
    height: 100%;
    border-radius: inherit;
}

.top-product-db-progress__value--success {
    background: linear-gradient(90deg, var(--app-accent), #14b8a6);
}

.top-product-db-progress__value--warning {
    background: linear-gradient(90deg, #c37a1f, #e0a146);
}

.top-product-db-progress__value--danger {
    background: linear-gradient(90deg, #b4362d, #df6b5b);
}

.top-product-db-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}

.top-product-db-actions button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1px solid var(--app-border);
    border-radius: 999px;
    padding: 0.38rem 0.7rem;
    background: var(--app-panel);
    color: var(--app-ink);
    cursor: pointer;
}

.top-product-db-actions__danger {
    border-color: rgba(180, 54, 45, 0.16) !important;
    color: #a61b1b !important;
}

.top-product-db-empty-state {
    display: grid;
    place-items: center;
    gap: 0.65rem;
    min-height: 14rem;
    text-align: center;
    color: var(--app-muted);
}

.top-product-db-empty-state svg {
    font-size: 2.6rem;
    color: rgba(15, 118, 110, 0.5);
}

.top-product-db-empty-state__spinner {
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    border: 3px solid rgba(15, 118, 110, 0.12);
    border-top-color: var(--app-accent);
    animation: top-product-db-spin 0.9s linear infinite;
}

.top-product-db-dialog-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    width: 100%;
}

.top-product-db-dialog-header__eyebrow,
.top-product-db-detail-results__eyebrow {
    margin: 0 0 0.35rem;
    color: var(--app-accent);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.top-product-db-dialog-header h2,
.top-product-db-detail-results h3 {
    margin: 0;
    color: var(--app-ink);
}

.top-product-db-dialog-header p,
.top-product-db-dialog-copy {
    margin: 0.35rem 0 0;
    color: var(--app-muted);
    line-height: 1.55;
}

.top-product-db-dialog-header__actions,
.top-product-db-dialog-footer {
    display: flex;
    gap: 0.65rem;
    align-items: center;
    justify-content: flex-end;
}

.top-product-db-icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.8rem;
    height: 2.8rem;
    border: 1px solid var(--app-border);
    border-radius: 999px;
    background: var(--app-panel);
    color: var(--app-ink);
    cursor: pointer;
}

.top-product-db-detail-stack,
.top-product-db-confirm-stack {
    display: grid;
    gap: 1rem;
}

.top-product-db-detail-hero {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
}

.top-product-db-detail-hero__card,
.top-product-db-detail-meta-card,
.top-product-db-detail-results,
.top-product-db-confirm-card {
    border: 1px solid var(--app-border);
    border-radius: 1.25rem;
    padding: 1rem 1.1rem;
    background: var(--app-panel);
}

.top-product-db-detail-hero__card--primary {
    background: linear-gradient(180deg, rgba(15, 118, 110, 0.1), var(--app-panel));
}

.top-product-db-detail-hero__card--cool {
    background: linear-gradient(180deg, rgba(36, 116, 184, 0.1), var(--app-panel));
}

.top-product-db-detail-hero__card span,
.top-product-db-detail-meta-card span,
.top-product-db-confirm-card strong {
    display: block;
    color: var(--app-muted);
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.top-product-db-detail-hero__card strong,
.top-product-db-detail-meta-card strong,
.top-product-db-confirm-card span {
    display: block;
    margin-top: 0.35rem;
    color: var(--app-ink);
    font-size: 1.2rem;
}

.top-product-db-detail-meta-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
}

.top-product-db-detail-meta-card--score {
    background: linear-gradient(180deg, rgba(15, 118, 110, 0.06), var(--app-panel));
}

.top-product-db-detail-meta-card em {
    margin-top: 0.7rem;
    font-style: normal;
}

.top-product-db-detail-results {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
}

.top-product-db-detail-results__chips,
.top-product-db-measurements__tools,
.top-product-db-export-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    align-items: center;
}

.top-product-db-measurements {
    display: grid;
    gap: 1rem;
}

.top-product-db-measurements__header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-end;
}

.top-product-db-measurements__header h3 {
    margin: 0;
    color: var(--app-ink);
}

.top-product-db-search-field {
    display: inline-flex;
    gap: 0.45rem;
    align-items: center;
    min-width: 18rem;
    border: 1px solid var(--app-border);
    border-radius: 999px;
    padding: 0.68rem 0.9rem;
    background: rgba(255, 255, 255, 0.92);
}

.top-product-db-search-field input {
    width: 100%;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--app-ink);
}

.top-product-db-measurement-name {
    color: var(--app-ink);
    font-weight: 700;
}

.top-product-db-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border-radius: 999px;
    padding: 0.28rem 0.65rem;
    font-size: 0.8rem;
    font-weight: 700;
}

.top-product-db-status-pill--success,
.top-product-db-value--success {
    color: var(--app-accent);
    background: rgba(15, 118, 110, 0.1);
}

.top-product-db-status-pill--danger,
.top-product-db-value--danger {
    color: #a61b1b;
    background: rgba(180, 54, 45, 0.12);
}

.top-product-db-confirm-card {
    display: grid;
    gap: 0.75rem;
}

.top-product-db-confirm-card--danger {
    background: linear-gradient(180deg, rgba(180, 54, 45, 0.06), var(--app-panel));
}

.top-product-db-confirm-card--list {
    max-height: 16rem;
    overflow: auto;
}

.top-product-db-selection-list {
    display: grid;
    gap: 0.65rem;
    padding: 0;
    margin: 0;
    list-style: none;
}

.top-product-db-selection-list li {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: center;
    border: 1px solid var(--app-border);
    border-radius: 1rem;
    padding: 0.75rem 0.85rem;
    background: rgba(255, 255, 255, 0.7);
}

.top-product-db-selection-list li strong {
    display: block;
    color: var(--app-ink);
}

.top-product-db-selection-list li span {
    color: var(--app-muted);
}

.top-product-db-export-actions {
    display: grid;
    gap: 0.75rem;
}

.top-product-db-export-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.65rem;
    border: 1px solid transparent;
    border-radius: 1rem;
    padding: 0.95rem 1rem;
    font-weight: 700;
    cursor: pointer;
}

.top-product-db-export-button:disabled {
    opacity: 0.65;
    cursor: not-allowed;
}

.top-product-db-export-button--success {
    background: rgba(15, 118, 110, 0.1);
    color: var(--app-accent);
}

.top-product-db-export-button--danger {
    background: rgba(180, 54, 45, 0.12);
    color: #a61b1b;
}

.top-product-db-export-button--cool {
    background: rgba(36, 116, 184, 0.12);
    color: #1d4f91;
}

.top-product-db-detail-dialog--expanded :deep(.p-dialog) {
    height: 92vh;
}

.top-product-db-detail-dialog--expanded :deep(.p-dialog-content) {
    height: calc(92vh - 7rem);
    overflow: auto;
}

@media (max-width: 960px) {

    .top-product-db-header,
    .top-product-db-header__copy {
        flex-direction: column;
    }

    .top-product-db-stats,
    .top-product-db-filter-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .top-product-db-detail-meta-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 720px) {

    .top-product-db-stats,
    .top-product-db-filter-grid {
        grid-template-columns: 1fr;
    }

    .top-product-db-toolbar {
        justify-content: flex-start;
    }

    .top-product-db-page-size {
        width: 100%;
        justify-content: space-between;
    }

    .top-product-db-detail-hero,
    .top-product-db-detail-meta-grid {
        grid-template-columns: 1fr;
    }

    .top-product-db-dialog-header,
    .top-product-db-detail-results,
    .top-product-db-measurements__header,
    .top-product-db-dialog-footer {
        flex-direction: column;
        align-items: stretch;
    }

    .top-product-db-search-field {
        min-width: 0;
        width: 100%;
    }

    .top-product-db-selection-list li {
        flex-direction: column;
        align-items: flex-start;
    }
}

@keyframes top-product-db-spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}
</style>
