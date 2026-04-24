<template>
  <div class="app-data-grid">
    <DataTable
      v-bind="attrs"
      :value="rows"
      :dataKey="dataKey"
      :loading="loading"
      :paginator="paginator"
      :rows="rowsPerPage"
      :rowsPerPageOptions="rowsPerPageOptions"
      :totalRecords="totalRecords"
      :lazy="lazy"
      :selection="selection"
      :selectionMode="selectionMode && !showSelectionColumn ? selectionMode : undefined"
      :metaKeySelection="metaKeySelection"
      :scrollable="scrollable"
      :scrollHeight="scrollHeight"
      :sortField="sortField"
      :sortOrder="sortOrder ?? undefined"
      :tableStyle="tableStyle"
      :stateStorage="stateStorage"
      :stateKey="stateKey"
      :rowClass="rowClass ?? undefined"
      removableSort
      stripedRows
      class="app-data-grid__table"
      @update:selection="onSelectionChange"
      @row-click="emit('row-click', $event)"
      @page="emit('page', $event)"
      @sort="emit('sort', $event)"
    >
      <template v-if="$slots.header" #header>
        <slot name="header" />
      </template>

      <template #empty>
        <slot name="empty">{{ emptyMessage }}</slot>
      </template>

      <template #loading>
        <slot name="loading">Loading data...</slot>
      </template>

      <Column
        v-if="showSelectionColumn && selectionMode"
        :selectionMode="selectionMode"
        headerStyle="width: 3rem"
      />

      <Column
        v-for="column in visibleColumns"
        :key="column.key"
        :field="column.field"
        :header="column.header"
        :sortable="column.sortable"
        :style="column.style"
        :class="column.className"
        :headerStyle="column.headerStyle"
        :bodyStyle="column.bodyStyle"
      >
        <template v-if="hasCellSlot(column.key)" #body="slotProps">
          <slot
            :name="`cell-${column.key}`"
            :column="column"
            :data="slotProps.data"
            :field="column.field"
            :index="slotProps.index"
            :value="resolveFieldValue(slotProps.data, column.field)"
          />
        </template>

        <template v-else-if="column.body" #body="slotProps">
          {{ renderBody(column, slotProps.data) }}
        </template>
      </Column>

      <template v-if="$slots.footer" #footer>
        <slot name="footer" />
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs, useSlots } from 'vue'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'

defineOptions({ inheritAttrs: false })

type GridRow = any
type GridSelectionMode = 'single' | 'multiple'

interface AppDataGridColumn {
  key?: string
  header: string
  field?: string
  sortable?: boolean
  hidden?: boolean
  style?: Record<string, string> | string
  className?: string
  headerStyle?: Record<string, string> | string
  bodyStyle?: Record<string, string> | string
  body?: (row: GridRow, column: AppDataGridColumn, value: unknown) => unknown
}

interface NormalizedAppDataGridColumn extends AppDataGridColumn {
  key: string
}

const props = withDefaults(
  defineProps<{
    columns: AppDataGridColumn[]
    rows: GridRow[]
    loading?: boolean
    dataKey?: string
    paginator?: boolean
    rowsPerPage?: number
    rowsPerPageOptions?: number[]
    totalRecords?: number
    lazy?: boolean
    selection?: unknown
    selectionMode?: GridSelectionMode
    showSelectionColumn?: boolean
    metaKeySelection?: boolean
    scrollable?: boolean
    scrollHeight?: string
    sortField?: string
    sortOrder?: -1 | 0 | 1 | null
    tableStyle?: Record<string, string>
    stateStorage?: 'local' | 'session'
    stateKey?: string
    emptyMessage?: string
    rowClass?: (row: GridRow) => string | Record<string, boolean> | undefined
  }>(),
  {
    loading: false,
    paginator: false,
    rowsPerPage: 10,
    rowsPerPageOptions: () => [10, 25, 50, 100],
    totalRecords: 0,
    lazy: false,
    showSelectionColumn: false,
    metaKeySelection: false,
    scrollable: true,
    scrollHeight: 'flex',
    sortOrder: undefined,
    tableStyle: () => ({ minWidth: '100%' }),
    emptyMessage: 'No records found.',
  },
)

const emit = defineEmits<{
  (event: 'update:selection', value: unknown): void
  (event: 'row-click', value: unknown): void
  (event: 'page', value: unknown): void
  (event: 'sort', value: unknown): void
}>()

const attrs = useAttrs()
const slots = useSlots()

const visibleColumns = computed<NormalizedAppDataGridColumn[]>(() => {
  return props.columns
    .filter((column) => !column.hidden)
    .map((column, index) => ({
      ...column,
      key: column.key ?? column.field ?? `column-${index}`,
    }))
})

function hasCellSlot(key: string) {
  return Boolean(slots[`cell-${key}`])
}

function onSelectionChange(value: unknown) {
  emit('update:selection', value)
}

function renderBody(column: NormalizedAppDataGridColumn, row: GridRow) {
  return column.body?.(row, column, resolveFieldValue(row, column.field))
}

function resolveFieldValue(row: GridRow, field?: string) {
  if (!field) {
    return undefined
  }

  return field.split('.').reduce<unknown>((current, segment) => {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }

    return (current as Record<string, unknown>)[segment]
  }, row)
}
</script>

<style scoped>
.app-data-grid {
  min-width: 0;
  max-width: 100%;
}

.app-data-grid :deep(.p-datatable) {
  width: 100%;
  min-width: 0;
  border-radius: 0.625rem;
  overflow: hidden;
  border: 1px solid var(--app-border);
  background: var(--app-panel-strong);
  box-shadow: none;
}

.app-data-grid :deep(.p-datatable-wrapper),
.app-data-grid :deep(.p-datatable-table-container) {
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  touch-action: pan-x pan-y;
}

.app-data-grid :deep(.p-datatable-header),
.app-data-grid :deep(.p-datatable-footer) {
  border: 0;
  background: var(--app-panel);
}

.app-data-grid :deep(.p-datatable-thead > tr > th) {
  border: 0;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-ink);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  white-space: pre-line;
}

.app-data-grid :deep(.p-datatable-tbody > tr > td) {
  border: 0;
  border-bottom: 1px solid var(--app-border);
}

.app-data-grid :deep(.p-datatable-tbody > tr) {
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.app-data-grid :deep(.p-datatable-tbody > tr:hover) {
  background: color-mix(in srgb, var(--app-accent) 4%, var(--app-panel-strong));
}

.app-data-grid :deep(.p-datatable-tbody > tr:last-child > td) {
  border-bottom: 0;
}

.app-data-grid :deep(.p-paginator) {
  border: 0;
  border-top: 1px solid var(--app-border);
  background: var(--app-panel);
}
</style>