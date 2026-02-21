<template>
    <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
            <div>
                <v-icon start>mdi-table</v-icon>
                Top Products Results
            </div>
            <v-chip v-if="items.length > 0" color="primary" size="small">
                {{ items.length }} product{{ items.length !== 1 ? 's' : '' }}
            </v-chip>
        </v-card-title>

        <v-card-text>
            <!-- Toolbar -->
            <v-row class="mb-4">
                <v-col cols="12" md="6">
                    <v-text-field v-model="search" label="Search products" prepend-inner-icon="mdi-magnify"
                        variant="outlined" density="compact" single-line hide-details clearable />
                </v-col>
                <v-col cols="12" md="6" class="d-flex justify-end align-center">
                    <v-btn v-if="items.length > 0" color="success" variant="tonal" prepend-icon="mdi-download"
                        @click="handleExport">
                        Export
                    </v-btn>
                </v-col>
            </v-row>

            <!-- Data Table -->
            <v-data-table :headers="headers" :items="items" :search="search" :items-per-page="itemsPerPage"
                :loading="loading" class="elevation-1" density="comfortable">
                <!-- Loading -->
                <template #loading>
                    <v-skeleton-loader type="table-row@10" />
                </template>

                <!-- No Data -->
                <template #no-data>
                    <div class="text-center py-8">
                        <v-icon size="64" color="grey-lighten-2">mdi-database-off</v-icon>
                        <div class="text-h6 text-medium-emphasis mt-2">No products found</div>
                        <div class="text-caption text-medium-emphasis">
                            Try adjusting your search criteria or filters
                        </div>
                    </div>
                </template>

                <!-- ISN Column -->
                <template #item.isn="{ item }">
                    <v-chip size="small" color="primary" variant="tonal">
                        {{ item.isn }}
                    </v-chip>
                </template>

                <!-- Overall Score Column with Color Coding -->
                <template #item.overall_data_score="{ item }">
                    <v-chip size="small" :color="getScoreColor(item.overall_data_score)">
                        {{ item.overall_data_score.toFixed(2) }}%
                    </v-chip>
                </template>

                <!-- Test Date Column -->
                <template #item.test_date="{ item }">
                    {{ formatDate(item.test_date) }}
                </template>

                <!-- Expand Toggle Column -->
                <template #item.actions="{ item }">
                    <v-btn size="small" variant="text" icon @click="toggleExpand(item.isn)">
                        <v-icon>
                            {{ isExpanded(item.isn) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                        </v-icon>
                    </v-btn>
                </template>

                <!-- Expanded Row Content -->
                <template #expanded-row="{ columns, item }">
                    <tr>
                        <td :colspan="columns.length" class="pa-0">
                            <v-card flat>
                                <v-card-title class="text-subtitle-2 bg-grey-lighten-4">
                                    Measurement Details for {{ item.isn }}
                                </v-card-title>
                                <v-card-text>
                                    <v-data-table :headers="measurementHeaders" :items="item.latest_data"
                                        :items-per-page="-1" density="compact" hide-default-footer>
                                        <!-- Test Item Column -->
                                        <template #item.test_item="{ item: measurement }">
                                            <span class="font-weight-medium">{{ measurement.test_item }}</span>
                                        </template>

                                        <!-- USL Column -->
                                        <template #item.usl="{ item: measurement }">
                                            <span v-if="measurement.usl !== null">
                                                {{ measurement.usl }}{{ measurement.unit ? ` ${measurement.unit}` : ''
                                                }}
                                            </span>
                                            <span v-else class="text-medium-emphasis">—</span>
                                        </template>

                                        <!-- LSL Column -->
                                        <template #item.lsl="{ item: measurement }">
                                            <span v-if="measurement.lsl !== null">
                                                {{ measurement.lsl }}{{ measurement.unit ? ` ${measurement.unit}` : ''
                                                }}
                                            </span>
                                            <span v-else class="text-medium-emphasis">—</span>
                                        </template>

                                        <!-- Target Column -->
                                        <template #item.target="{ item: measurement }">
                                            <span v-if="measurement.target">
                                                {{ measurement.target }}{{ measurement.unit ? ` ${measurement.unit}` :
                                                    '' }}
                                            </span>
                                            <span v-else class="text-medium-emphasis">—</span>
                                        </template>

                                        <!-- Actual Value Column -->
                                        <template #item.actual="{ item: measurement }">
                                            <v-chip size="x-small" variant="tonal">
                                                {{ measurement.actual }}{{ measurement.unit ? ` ${measurement.unit}` :
                                                    '' }}
                                            </v-chip>
                                        </template>

                                        <!-- Delta Meas. & Target Column -->
                                        <template #item.delta_actual_target="{ item: measurement }">
                                            <v-chip
                                                v-if="measurement.actual !== null && measurement.actual !== '' && measurement.target !== null && measurement.target !== ''"
                                                size="x-small" variant="tonal"
                                                :color="getDeltaColor(parseFloat(measurement.actual) - parseFloat(measurement.target))">
                                                {{ (parseFloat(measurement.actual) -
                                                parseFloat(measurement.target)).toFixed(2) }}{{ measurement.unit ? `
                                                ${measurement.unit}` : '' }}
                                            </v-chip>
                                            <span v-else class="text-medium-emphasis">—</span>
                                        </template>

                                        <!-- Score Column -->
                                        <template #item.score="{ item: measurement }">
                                            <v-chip size="x-small" :color="getScoreColor(measurement.score)">
                                                {{ measurement.score.toFixed(1) }}%
                                            </v-chip>
                                        </template>
                                    </v-data-table>
                                </v-card-text>
                            </v-card>
                        </td>
                    </tr>
                </template>
            </v-data-table>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TopProduct } from '@/core/types'
import { formatDate } from '@/shared/utils/helpers'

// Props
interface Props {
    items: TopProduct[]
    loading?: boolean
}

defineProps<Props>()

// Emits
type Emits = (e: 'export') => void

const emit = defineEmits<Emits>()

// State
const search = ref<string>('')
const itemsPerPage = ref<number>(10)
const expanded = ref<Set<string>>(new Set())

// Computed
const headers = computed(() => [
    { title: 'ISN', key: 'isn', sortable: true },
    { title: 'Device', key: 'device', sortable: true },
    { title: 'Station', key: 'station_name', sortable: true },
    { title: 'Test Date', key: 'test_date', sortable: true },
    { title: 'Overall Score', key: 'overall_data_score', sortable: true },
    { title: 'Details', key: 'actions', sortable: false, align: 'center' as const },
])

const measurementHeaders = computed(() => [
    { title: 'Test Item', key: 'test_item', sortable: false },
    { title: 'USL', key: 'usl', sortable: false },
    { title: 'LSL', key: 'lsl', sortable: false },
    { title: 'Target', key: 'target', sortable: false },
    { title: 'Measurement', key: 'actual', sortable: false },
    { title: 'Δ Meas. & Target', key: 'delta_actual_target', sortable: false },
    { title: 'Score', key: 'score', sortable: false },
])

// Methods
function getScoreColor(score: number): string {
    if (score >= 90) return 'success'
    if (score >= 70) return 'primary'
    if (score >= 50) return 'warning'
    return 'error'
}

function getDeltaColor(delta: number): string {
    if (delta === 0) return 'success'
    if (Math.abs(delta) < 1) return 'primary'
    if (Math.abs(delta) < 5) return 'warning'
    return 'error'
}

function toggleExpand(isn: string) {
    if (expanded.value.has(isn)) {
        expanded.value.delete(isn)
    } else {
        expanded.value.add(isn)
    }
}

function isExpanded(isn: string): boolean {
    return expanded.value.has(isn)
}

function handleExport() {
    emit('export')
}
</script>

<style scoped>
:deep(.v-data-table) {
    border-radius: 4px;
}

:deep(.v-data-table .v-data-table__td) {
    font-size: 0.875rem;
}

:deep(.v-data-table .v-data-table__th) {
    font-weight: 600;
}

.bg-grey-lighten-4 {
    background-color: rgb(var(--v-theme-grey-lighten-4));
}

/* Sticky first column (Test Item) in measurement details table */
:deep(.v-card-text .v-data-table) {

    /* Make first column sticky in nested measurement table */
    th:first-child,
    td:first-child {
        position: sticky !important;
        left: 0 !important;
        z-index: 2 !important;
        background-color: rgb(var(--v-theme-surface)) !important;
    }

    /* Higher z-index for header to stay above sticky cells */
    thead th:first-child {
        z-index: 3 !important;
        background-color: rgb(var(--v-theme-grey-lighten-4)) !important;
    }

    /* Add shadow to indicate sticky column */
    td:first-child::after {
        content: '';
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        width: 1px;
        background: linear-gradient(to right, rgba(0, 0, 0, 0.08), transparent);
    }

    th:first-child::after {
        content: '';
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        width: 1px;
        background: linear-gradient(to right, rgba(0, 0, 0, 0.12), transparent);
    }
}
</style>
