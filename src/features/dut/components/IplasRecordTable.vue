<template>
  <div class="iplas-record-table-shell">
    <AppDataGrid
      class="iplas-record-table-grid clickable-rows"
      :columns="computedHeaders"
      :rows="itemsWithKeys"
      data-key="recordKey"
      :loading="loading"
      paginator
      :rows-per-page="itemsPerPage"
      :total-records="serverSide ? totalItems : itemsWithKeys.length"
      :lazy="serverSide"
      :selection="selectedRows"
      :selection-mode="selectionMode"
      :show-selection-column="selectable"
      :sort-field="sortField"
      :sort-order="sortOrder"
      scroll-height="640px"
      :table-style="{ minWidth: '74rem' }"
      :row-class="getRowClass"
      @update:selection="onSelectionChange"
      @row-click="handleRowClick"
      @page="handlePage"
      @sort="handleSort"
    >
      <template #cell-ISN="{ data }">
        <div class="iplas-record-table-inline-cell">
          <button type="button" class="iplas-record-table-icon-button" title="Copy ISN" aria-label="Copy ISN" @click.stop="copyToClipboard(data.ISN)">
            <Icon icon="mdi:content-copy" />
          </button>
          <button type="button" class="iplas-record-table-copy-value font-mono" :title="String(data.ISN || 'No ISN')" @click.stop="copyToClipboard(String(data.ISN || ''))">
            {{ data.ISN || '-' }}
          </button>
        </div>
      </template>

      <template #cell-DeviceId="{ data }">
        <button type="button" class="iplas-record-table-copy-pill font-mono" :title="String(data.DeviceId || 'No Device ID')" @click.stop="copyToClipboard(String(data.DeviceId || ''))">
          {{ data.DeviceId || '-' }}
        </button>
      </template>

      <template #cell-ErrorCode="{ data }">
        <span class="iplas-record-table-badge" :class="isStatusPass(String(data.ErrorCode || '')) ? 'iplas-record-table-badge--success' : 'iplas-record-table-badge--error'">
          {{ data.ErrorCode || '-' }}
        </span>
      </template>

      <template #cell-ErrorName="{ data }">
        <template v-if="data.ErrorName && data.ErrorName !== 'N/A' && !isStatusPass(String(data.ErrorCode || ''))">
          <span class="iplas-record-table-error-name">{{ data.ErrorName }}</span>
        </template>
        <span v-else class="iplas-record-table-muted">-</span>
      </template>

      <template #cell-TestStartTime="{ value }">
        <span class="iplas-record-table-caption">{{ formatDateTime(asOptionalString(value)) }}</span>
      </template>

      <template #cell-TestEndTime="{ value }">
        <span class="iplas-record-table-caption">{{ formatDateTime(asOptionalString(value)) }}</span>
      </template>

      <template #cell-Duration="{ value }">
        <span class="iplas-record-table-caption iplas-record-table-muted">{{ value }}</span>
      </template>

      <template #cell-TestItemCount="{ value }">
        <span class="iplas-record-table-caption">{{ value }}</span>
      </template>

      <template #cell-actions="{ data }">
        <div class="iplas-record-table-action-cell">
          <button
            type="button"
            class="iplas-record-table-action-button iplas-record-table-action-button--primary"
            :disabled="downloadingRecord === data.recordKey"
            title="Download TXT Log"
            @click.stop="emit('download', data.sourceRecord)"
          >
            <Icon :icon="downloadingRecord === data.recordKey ? 'mdi:loading' : 'mdi:download'" :class="{ 'iplas-record-table-spin': downloadingRecord === data.recordKey }" />
            <span>TXT</span>
          </button>
          <button
            type="button"
            class="iplas-record-table-action-button iplas-record-table-action-button--success"
            :disabled="downloadingCsvRecord === data.recordKey"
            title="Download CSV Log"
            @click.stop="emit('download-csv', data.sourceRecord)"
          >
            <Icon :icon="downloadingCsvRecord === data.recordKey ? 'mdi:loading' : 'mdi:file-delimited'" :class="{ 'iplas-record-table-spin': downloadingCsvRecord === data.recordKey }" />
            <span>CSV</span>
          </button>
        </div>
      </template>

      <template #loading>
        <div class="iplas-record-table-loading-state">
          <Icon icon="mdi:loading" class="iplas-record-table-spin" />
          <span>Loading iPLAS records...</span>
        </div>
      </template>

      <template #empty>
        <div class="iplas-record-table-empty-state">
          <Icon icon="mdi:database-off-outline" class="iplas-record-table-empty-state__icon" />
          <strong>No records found</strong>
          <p>Try adjusting your search criteria.</p>
        </div>
      </template>
    </AppDataGrid>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import type { CompactCsvTestItemData, CsvTestItemData } from '@/features/dut-logs/api/iplasProxyApi'
import { useNotification } from '@/shared/composables/useNotification'
import AppDataGrid from '@/shared/ui/data-grid/AppDataGrid.vue'
import { adjustIplasDisplayTime, isStatusPass } from '@/shared/utils/helpers'

type SortDirection = 'asc' | 'desc'

interface IplasRecordTableRow extends Record<string, unknown> {
  recordKey: string
  ISN: string
  DeviceId: string
  ErrorCode: string
  ErrorName: string
  TestStartTime: string
  TestEndTime: string
  Duration: string
  TestItemCount: number
  sourceRecord: CsvTestItemData | CompactCsvTestItemData
}

// Props
const props = withDefaults(
  defineProps<{
    items: (CsvTestItemData | CompactCsvTestItemData)[]
    totalItems: number
    loading: boolean
    downloadingRecord?: string | null
    downloadingCsvRecord?: string | null
    selectable?: boolean
    selectedKeys?: string[]
    serverSide?: boolean
  }>(),
  {
    selectable: false,
    selectedKeys: () => [],
    serverSide: true,
  },
)

// Emits
const emit = defineEmits<{
  (
    e: 'update:options',
    options: {
      page: number
      itemsPerPage: number
      sortBy: { key: string; order: 'asc' | 'desc' }[]
    },
  ): void
  (e: 'update:selected-keys', keys: string[]): void
  (e: 'row-click', record: CsvTestItemData | CompactCsvTestItemData): void
  (e: 'download', record: CsvTestItemData | CompactCsvTestItemData): void
  (e: 'download-csv', record: CsvTestItemData | CompactCsvTestItemData): void
}>()

// Table state
const page = ref(1)
const itemsPerPage = ref(25)
const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([
  { key: 'TestStartTime', order: 'desc' },
])

const { showInfo: showInfoNotification } = useNotification()

const itemsWithKeys = computed(() =>
  props.items.map((item) => ({
    ...item,
    ISN: item.ISN || '',
    DeviceId: item.DeviceId || '',
    ErrorCode: item.ErrorCode || '',
    ErrorName: item.ErrorName || '',
    TestStartTime: item['Test Start Time'] || '',
    TestEndTime: item['Test end Time'] || '',
    Duration: calculateDuration(item['Test Start Time'], item['Test end Time']),
    TestItemCount: getTestItemCount(item),
    recordKey: `${item.ISN}_${item['Test Start Time']}`,
    sourceRecord: item,
  })) as IplasRecordTableRow[],
)

const computedHeaders = computed(() => {
  return [
    { header: 'ISN', key: 'ISN', field: 'ISN', sortable: true, style: { width: '180px' } },
    { header: 'Device ID', key: 'DeviceId', field: 'DeviceId', sortable: true, style: { width: '120px' } },
    { header: 'Error Code', key: 'ErrorCode', field: 'ErrorCode', sortable: true, style: { width: '100px' } },
    { header: 'Error Name', key: 'ErrorName', field: 'ErrorName', sortable: false, style: { width: '150px' } },
    { header: 'Test Start', key: 'TestStartTime', field: 'TestStartTime', sortable: true, style: { width: '160px' } },
    { header: 'Test End', key: 'TestEndTime', field: 'TestEndTime', sortable: true, style: { width: '160px' } },
    { header: 'Duration', key: 'Duration', field: 'Duration', sortable: false, style: { width: '110px' } },
    { header: 'Test Items', key: 'TestItemCount', field: 'TestItemCount', sortable: false, style: { width: '110px' } },
    { header: 'Actions', key: 'actions', sortable: false, style: { width: '140px' } },
  ]
})

const selectionMode = computed(() => (props.selectable ? 'multiple' : undefined))

const selectedRows = computed(() => {
  if (!props.selectable || props.selectedKeys.length === 0) {
    return [] as IplasRecordTableRow[]
  }

  const selectedKeySet = new Set(props.selectedKeys)
  return itemsWithKeys.value.filter((item) => selectedKeySet.has(item.recordKey))
})

const sortField = computed(() => sortBy.value[0]?.key)

const sortOrder = computed(() => {
  const current = sortBy.value[0]
  if (!current) {
    return null
  }

  return current.order === 'desc' ? -1 : 1
})

// Helper functions
function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return '-'
  return adjustIplasDisplayTime(dateStr, 1)
}

function calculateDuration(startStr: string | undefined, endStr: string | undefined): string {
  if (!startStr || !endStr) return '-'
  try {
    const start = new Date(startStr)
    const end = new Date(endStr)
    const diffMs = end.getTime() - start.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const mins = Math.floor(diffSecs / 60)
    const secs = diffSecs % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  } catch {
    return '-'
  }
}

function getTestItemCount(record: CsvTestItemData | CompactCsvTestItemData): number {
  if ('TestItemCount' in record) {
    return record.TestItemCount
  }
  return record.TestItem?.length || 0
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

async function copyToClipboard(text: string | undefined) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    showInfoNotification('Copied to clipboard!')
  } catch (_err) {
    // Fallback for browsers that don't support clipboard API or non-secure contexts
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      showInfoNotification('Copied to clipboard!')
    } catch (e) {
      console.error('Failed to copy:', e)
    }
    document.body.removeChild(textArea)
  }
}

function getRowClass(): string {
  return 'iplas-record-table-row'
}

function updateOptions(nextPage = page.value, nextItemsPerPage = itemsPerPage.value, nextSortBy = sortBy.value) {
  emit('update:options', {
    page: nextPage,
    itemsPerPage: nextItemsPerPage,
    sortBy: nextSortBy,
  })
}

function handleRowClick(event: unknown) {
  const row = (event as { data?: IplasRecordTableRow }).data
  if (!row) {
    return
  }

  emit('row-click', row.sourceRecord)
}

function handlePage(event: unknown) {
  const pageEvent = event as { page?: number; rows?: number }
  page.value = typeof pageEvent.page === 'number' ? pageEvent.page + 1 : page.value
  itemsPerPage.value = typeof pageEvent.rows === 'number' ? pageEvent.rows : itemsPerPage.value
  updateOptions()
}

function handleSort(event: unknown) {
  const sortEvent = event as { sortField?: string; sortOrder?: number }
  if (!sortEvent.sortField || !sortEvent.sortOrder) {
    sortBy.value = []
    updateOptions()
    return
  }

  sortBy.value = [
    {
      key: sortEvent.sortField,
      order: sortEvent.sortOrder === -1 ? 'desc' : 'asc',
    },
  ]
  updateOptions()
}

function onSelectionChange(selection: unknown) {
  const selected = Array.isArray(selection) ? (selection as IplasRecordTableRow[]) : []
  emit(
    'update:selected-keys',
    selected.map((row) => row.recordKey),
  )
}
</script>

<style scoped>
.iplas-record-table-shell {
  display: grid;
}

.clickable-rows :deep(.p-datatable-tbody > tr.iplas-record-table-row) {
  cursor: pointer;
}

.clickable-rows :deep(.p-datatable-tbody > tr.iplas-record-table-row:hover) {
  background-color: rgba(15, 118, 110, 0.08);
}

.font-mono {
  font-family: 'Roboto Mono', monospace;
}

.iplas-record-table-inline-cell,
.iplas-record-table-action-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.iplas-record-table-icon-button,
.iplas-record-table-copy-value,
.iplas-record-table-copy-pill,
.iplas-record-table-action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
}

.iplas-record-table-icon-button {
  width: 1.9rem;
  height: 1.9rem;
  color: #1f6aa5;
}

.iplas-record-table-copy-value {
  justify-content: flex-start;
  max-width: 100%;
  padding: 0.22rem 0.55rem;
  color: var(--app-ink);
}

.iplas-record-table-copy-pill {
  padding: 0.28rem 0.65rem;
  background: rgba(15, 118, 110, 0.08);
  border-color: rgba(15, 118, 110, 0.12);
  color: var(--app-ink);
}

.iplas-record-table-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.28rem 0.6rem;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
}

.iplas-record-table-badge--success {
  background: rgba(28, 126, 84, 0.12);
  color: #1c7e54;
}

.iplas-record-table-badge--error {
  background: var(--app-danger-soft);
  color: var(--app-danger);
}

.iplas-record-table-caption {
  font-size: 0.76rem;
}

.iplas-record-table-muted {
  color: var(--app-muted);
}

.iplas-record-table-error-name {
  color: var(--app-danger);
  font-weight: 600;
}

.iplas-record-table-action-button {
  padding: 0.3rem 0.65rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0;
}

.iplas-record-table-action-button--primary {
  background: rgba(31, 106, 165, 0.1);
  border-color: rgba(31, 106, 165, 0.16);
  color: #1f6aa5;
}

.iplas-record-table-action-button--success {
  background: rgba(28, 126, 84, 0.1);
  border-color: rgba(28, 126, 84, 0.16);
  color: #1c7e54;
}

.iplas-record-table-icon-button:disabled,
.iplas-record-table-copy-value:disabled,
.iplas-record-table-copy-pill:disabled,
.iplas-record-table-action-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.iplas-record-table-empty-state {
  display: grid;
  justify-items: center;
  gap: 0.45rem;
  padding: 1.4rem 1rem;
  color: var(--app-muted);
  text-align: center;
}

.iplas-record-table-empty-state strong {
  color: var(--app-ink);
}

.iplas-record-table-empty-state__icon {
  font-size: 2rem;
  color: rgba(77, 89, 108, 0.72);
}

.iplas-record-table-loading-state {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 1rem;
  color: var(--app-muted);
}

.iplas-record-table-spin {
  animation: iplas-record-table-spin 0.9s linear infinite;
}

@keyframes iplas-record-table-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
