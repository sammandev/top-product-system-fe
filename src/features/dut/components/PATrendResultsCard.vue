<template>
  <section class="pa-trend-results-panel">
    <div class="pa-trend-results-panel__header">
      <div>
        <p class="pa-trend-results-panel__eyebrow">Trend Results</p>
        <h2>{{ title }}</h2>
      </div>
      <span class="pa-trend-results-panel__type">{{ type.toUpperCase() }}</span>
    </div>

    <div v-if="loading" class="pa-trend-results-loading">
      <div class="pa-trend-results-loading__spinner" />
      <strong>Loading PA trend data...</strong>
      <p>Fetching and aggregating trend measurements for the selected DUTs.</p>
    </div>

    <div v-else-if="gridRows.length === 0" class="pa-trend-results-empty">
      <Icon icon="mdi:information-outline" />
      <strong>No data available</strong>
      <p>Set filters and click Analyze to fetch PA trend data.</p>
    </div>

    <template v-else>
      <div class="pa-trend-results-summary">
        <article class="pa-trend-results-stat">
          <span>Total Records</span>
          <strong>{{ gridRows.length }}</strong>
        </article>
        <article class="pa-trend-results-stat pa-trend-results-stat--cool">
          <span>Total Trend Items</span>
          <strong>{{ totalTrendItems }}</strong>
        </article>
      </div>

      <AppDataGrid
        :columns="columns"
        :rows="gridRows"
        :loading="loading"
        paginator
        :rowsPerPage="10"
        dataKey="rowKey"
      >
        <template #cell-isn="slotProps">
          <span class="pa-trend-results-strong">{{ slotProps.data.isn || 'N/A' }}</span>
        </template>

        <template #cell-station_id="slotProps">
          <span class="pa-trend-results-badge">{{ slotProps.data.station_id }}</span>
        </template>

        <template #cell-device="slotProps">
          <span class="pa-trend-results-muted">{{ slotProps.data.device || 'N/A' }}</span>
        </template>

        <template #cell-test_date="slotProps">
          {{ formatDate(slotProps.data.test_date as string | null) }}
        </template>

        <template #cell-trend_items_count="slotProps">
          <span class="pa-trend-results-badge pa-trend-results-badge--success">
            {{ getTrendItemsCount(slotProps.data as TrendRow) }} items
          </span>
        </template>

        <template #cell-actions="slotProps">
          <div class="pa-trend-results-actions">
            <button type="button" @click="openDetails(slotProps.data as TrendRow)">
              <Icon icon="mdi:list-box-outline" />
              <span>Details</span>
            </button>
          </div>
        </template>
      </AppDataGrid>
    </template>

    <AppDialog v-model="detailsDialogOpen" title="Trend Item Details" width="min(92vw, 52rem)">
      <div v-if="selectedRow" class="pa-trend-results-detail-stack">
        <section class="pa-trend-results-detail-summary">
          <div>
            <p class="pa-trend-results-detail-summary__eyebrow">Record</p>
            <h3>{{ selectedRow.isn || 'Unknown DUT' }}</h3>
          </div>
          <dl>
            <div>
              <dt>Station</dt>
              <dd>{{ selectedRow.station_name }}</dd>
            </div>
            <div>
              <dt>Station ID</dt>
              <dd>{{ selectedRow.station_id }}</dd>
            </div>
            <div>
              <dt>Device</dt>
              <dd>{{ selectedRow.device || 'N/A' }}</dd>
            </div>
            <div>
              <dt>Test Date</dt>
              <dd>{{ formatDate(selectedRow.test_date) }}</dd>
            </div>
          </dl>
        </section>

        <div class="pa-trend-results-detail-table-wrap">
          <table class="pa-trend-results-detail-table">
            <thead>
              <tr>
                <th>Test Item Name</th>
                <th>MID</th>
                <th>Mean</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(trendItem, index) in getTrendItems(selectedRow)" :key="`${selectedRow.rowKey}-${index}`">
                <td class="pa-trend-results-strong">{{ trendItem.test_item_name }}</td>
                <td>{{ trendItem.mid ?? 'N/A' }}</td>
                <td>{{ formatMean(trendItem.mean) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <template #footer>
        <button
          type="button"
          class="pa-trend-results-dialog-close"
          @click="detailsDialogOpen = false"
        >
          Close
        </button>
      </template>
    </AppDialog>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { computed, ref } from 'vue'
import type {
  PADiffStationDataSchema,
  PATrendStationDataSchema,
  PATrendStationItemSchema,
} from '@/core/types'
import AppDataGrid from '@/shared/ui/data-grid/AppDataGrid.vue'
import AppDialog from '@/shared/ui/dialog/AppDialog.vue'

dayjs.extend(utc)
dayjs.extend(timezone)

type TrendRow = (PATrendStationDataSchema | PADiffStationDataSchema) & { rowKey: string }

const props = defineProps<{
  data: PATrendStationDataSchema[] | PADiffStationDataSchema[]
  loading: boolean
  title: string
  type: 'auto' | 'dex' | 'diff'
}>()

const detailsDialogOpen = ref(false)
const selectedRow = ref<TrendRow | null>(null)

const columns = [
  { key: 'isn', field: 'isn', header: 'ISN', sortable: true },
  { key: 'station_id', field: 'station_id', header: 'Station ID', sortable: true },
  { key: 'station_name', field: 'station_name', header: 'Station Name', sortable: true },
  { key: 'device', field: 'device', header: 'Device', sortable: true },
  { key: 'test_date', field: 'test_date', header: 'Test Date', sortable: true },
  { key: 'trend_items_count', header: 'Trend Items', sortable: false },
  { key: 'actions', header: 'Actions', sortable: false },
]

const gridRows = computed<TrendRow[]>(() => {
  return props.data.map((item, index) => ({
    ...item,
    rowKey: `${item.station_id}-${item.isn || 'na'}-${index}`,
  }))
})

const totalTrendItems = computed(() => {
  return gridRows.value.reduce((sum, item) => sum + getTrendItemsCount(item), 0)
})

function getTrendItems(item: PATrendStationDataSchema | PADiffStationDataSchema): PATrendStationItemSchema[] {
  if ('trend_items' in item) {
    return item.trend_items
  }

  if ('trend_diff_items' in item) {
    return item.trend_diff_items
  }

  return []
}

function getTrendItemsCount(item: PATrendStationDataSchema | PADiffStationDataSchema): number {
  return getTrendItems(item).length
}

function openDetails(item: TrendRow) {
  selectedRow.value = item
  detailsDialogOpen.value = true
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A'

  try {
    return dayjs.utc(dateString).tz(dayjs.tz.guess()).format('YYYY-MM-DD HH:mm:ss')
  } catch {
    return dateString
  }
}

function formatMean(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return 'N/A'
  }

  return value.toFixed(4)
}
</script>

<style scoped>
.pa-trend-results-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pa-trend-results-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.pa-trend-results-panel__eyebrow,
.pa-trend-results-detail-summary__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  letter-spacing: 0;
  text-transform: none;
  color: #0f766e;
  font-weight: 700;
}

.pa-trend-results-panel h2,
.pa-trend-results-detail-summary h3 {
  margin: 0;
  color: #0f172a;
}

.pa-trend-results-panel__type,
.pa-trend-results-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.pa-trend-results-panel__type {
  background: rgb(15 118 110 / 0.08);
  color: #0f766e;
}

.pa-trend-results-loading,
.pa-trend-results-empty,
.pa-trend-results-detail-summary {
  border: 1px solid #dbe4ee;
  border-radius: 1.25rem;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  box-shadow: 0 16px 36px rgb(15 23 42 / 0.06);
}

.pa-trend-results-loading,
.pa-trend-results-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2.5rem 1.25rem;
  text-align: center;
}

.pa-trend-results-loading p,
.pa-trend-results-empty p {
  margin: 0;
  color: #64748b;
}

.pa-trend-results-empty :deep(svg) {
  font-size: 3rem;
  color: #94a3b8;
}

.pa-trend-results-loading__spinner {
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
  border: 3px solid rgb(15 118 110 / 0.18);
  border-top-color: #0f766e;
  animation: pa-trend-spin 0.9s linear infinite;
}

.pa-trend-results-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.pa-trend-results-stat {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1rem;
  border-radius: 1rem;
  border: 1px solid #dbe4ee;
  background: rgb(15 118 110 / 0.06);
}

.pa-trend-results-stat--cool {
  background: rgb(14 165 233 / 0.08);
}

.pa-trend-results-stat span,
.pa-trend-results-detail-summary dt {
  font-size: 0.78rem;
  letter-spacing: 0;
  text-transform: none;
  color: #64748b;
  font-weight: 700;
}

.pa-trend-results-stat strong {
  font-size: 1.6rem;
  color: #0f172a;
}

.pa-trend-results-badge {
  background: rgb(14 165 233 / 0.12);
  color: #0c4a6e;
}

.pa-trend-results-badge--success {
  background: rgb(34 197 94 / 0.12);
  color: #166534;
}

.pa-trend-results-strong {
  font-weight: 700;
  color: #0f172a;
}

.pa-trend-results-muted {
  color: #64748b;
}

.pa-trend-results-actions {
  display: flex;
  justify-content: flex-end;
}

.pa-trend-results-actions button,
.pa-trend-results-dialog-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.4rem;
  padding: 0.6rem 0.9rem;
  border-radius: 0.85rem;
  border: 1px solid #cbd5e1;
  background: white;
  color: #0f172a;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.pa-trend-results-detail-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pa-trend-results-detail-summary {
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

.pa-trend-results-detail-summary dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 0;
}

.pa-trend-results-detail-summary dd {
  margin: 0.2rem 0 0;
  color: #0f172a;
  font-weight: 600;
}

.pa-trend-results-detail-table-wrap {
  overflow-x: auto;
  border: 1px solid #dbe4ee;
  border-radius: 1rem;
}

.pa-trend-results-detail-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 32rem;
  background: white;
}

.pa-trend-results-detail-table th,
.pa-trend-results-detail-table td {
  padding: 0.8rem 0.9rem;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

.pa-trend-results-detail-table th {
  background: #f8fafc;
  color: #475569;
  font-size: 0.78rem;
  letter-spacing: 0;
  text-transform: none;
}

@keyframes pa-trend-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 720px) {
  .pa-trend-results-panel__header,
  .pa-trend-results-summary,
  .pa-trend-results-detail-summary dl {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: flex-start;
  }

  .pa-trend-results-actions {
    justify-content: flex-start;
  }
}
</style>