<template>
  <div class="parsing-result-view">
    <AppPanel
      eyebrow="Parsing Workspace"
      title="Parsing Results"
      :description="`${result.parsed_count} parsed item${result.parsed_count === 1 ? '' : 's'} extracted from the uploaded log.`"
      tone="cool"
    >
      <section class="parsing-result-view__metadata-panel">
        <div class="parsing-result-view__section-heading">
          <div class="parsing-result-view__section-title">
            <Icon icon="mdi:information" />
            <span>Log Metadata</span>
          </div>
        </div>

        <div class="parsing-result-view__metadata-grid">
          <article class="parsing-result-view__metadata-item"><small>Station</small><strong>{{ result.station }}</strong></article>
          <article class="parsing-result-view__metadata-item"><small>ISN</small><strong>{{ result.isn || 'N/A' }}</strong></article>
          <article class="parsing-result-view__metadata-item"><small>Filename</small><strong>{{ result.filename }}</strong></article>
          <article class="parsing-result-view__metadata-item"><small>Test Date</small><strong>{{ result.metadata?.test_date || 'N/A' }}</strong></article>
          <article class="parsing-result-view__metadata-item"><small>Device</small><strong>{{ result.metadata?.device || 'N/A' }}</strong></article>
          <article class="parsing-result-view__metadata-item"><small>Script Version</small><strong>{{ result.metadata?.script_version || 'N/A' }}</strong></article>
          <article class="parsing-result-view__metadata-item"><small>Duration</small><strong>{{ formatDuration(result.metadata?.duration_seconds) }}</strong></article>
          <article class="parsing-result-view__metadata-item"><small>SFIS Status</small><strong>{{ result.metadata?.sfis_status || 'N/A' }}</strong></article>
          <article class="parsing-result-view__metadata-item"><small>Result</small><span class="parsing-result-view__pill" :class="resultPillClass(result.metadata?.result)">{{ result.metadata?.result || 'N/A' }}</span></article>
          <article class="parsing-result-view__metadata-item"><small>Counter</small><strong>{{ result.metadata?.counter || 'N/A' }}</strong></article>
        </div>
      </section>

      <section class="parsing-result-view__stat-grid">
        <article class="parsing-result-view__stat-card parsing-result-view__stat-card--primary"><small>Value Items</small><strong>{{ result.value_type_count }}</strong></article>
        <article class="parsing-result-view__stat-card parsing-result-view__stat-card--secondary"><small>Non-Value Items</small><strong>{{ result.non_value_type_count }}</strong></article>
        <article class="parsing-result-view__stat-card parsing-result-view__stat-card--info"><small>Hex Values</small><strong>{{ result.hex_value_count }}</strong></article>
        <article class="parsing-result-view__stat-card parsing-result-view__stat-card--success"><small>Avg Score</small><strong>{{ formatScore(result.avg_score) }}</strong><span>Median: {{ formatScore(result.median_score) }}</span></article>
      </section>

      <section class="parsing-result-view__section">
        <div class="parsing-result-view__section-heading parsing-result-view__section-heading--info">
          <div>
            <p class="parsing-result-view__section-eyebrow">Numeric Surface</p>
            <h3>Value Items (Numeric Data)</h3>
          </div>
          <div class="parsing-result-view__section-actions">
            <span class="parsing-result-view__count-pill">{{ filteredValueItems.length }}</span>
            <button type="button" class="parsing-result-view__icon-button" @click="fullscreenValue = true">
              <Icon icon="mdi:fullscreen" />
            </button>
          </div>
        </div>

        <label class="result-surface-search">
          <span>Search value items</span>
          <input v-model="searchValue" placeholder="Filter by test item name" type="text">
        </label>

        <AppDataGrid
          :columns="valueGridColumns"
          :rows="valueGridRows"
          paginator
          :rowsPerPage="10"
          :rowsPerPageOptions="gridRowsPerPageOptions"
          scrollHeight="500px"
        >
          <template #cell-test_item="{ data }">
            <div class="parsing-result-view__test-item" :class="{ 'parsing-result-view__test-item--accent': data.is_calculated }">
              <span>{{ data.test_item }}</span>
              <span v-if="data.is_calculated" class="parsing-result-view__pill parsing-result-view__pill--info">Calculated</span>
            </div>
          </template>

          <template #cell-usl="{ data }"><span>{{ formatNumber(data.usl as number | null | undefined) }}</span></template>
          <template #cell-lsl="{ data }"><span>{{ formatNumber(data.lsl as number | null | undefined) }}</span></template>

          <template #cell-value="{ data }">
            <div class="parsing-result-view__value-stack">
              <span>{{ data.value }}</span>
              <span v-if="data.is_hex" class="parsing-result-view__pill parsing-result-view__pill--info">{{ data.hex_decimal }}</span>
            </div>
          </template>

          <template #cell-type="{ data }">
            <span class="parsing-result-view__pill" :class="typePillClass(data as ParsedTestItemEnhanced)">{{ getTypeLabel(data as ParsedTestItemEnhanced) }}</span>
          </template>

          <template #cell-score="{ data }">
            <button
              v-if="data.score !== null"
              type="button"
              class="parsing-result-view__score-pill"
              :class="scorePillClass(Number(data.score))"
              @click="openScoreBreakdown(data as ParsedTestItemEnhanced)"
            >
              {{ Number(data.score).toFixed(2) }}
            </button>
            <span v-else class="parsing-result-view__muted">N/A</span>
          </template>

          <template #cell-matched_criteria="{ data }">
            <Icon :icon="data.matched_criteria ? 'mdi:check-circle' : 'mdi:minus-circle'" :class="data.matched_criteria ? 'parsing-result-view__criteria-icon parsing-result-view__criteria-icon--success' : 'parsing-result-view__criteria-icon parsing-result-view__criteria-icon--neutral'" />
          </template>
        </AppDataGrid>
      </section>

      <section class="parsing-result-view__section">
        <div class="parsing-result-view__section-heading parsing-result-view__section-heading--secondary">
          <div>
            <p class="parsing-result-view__section-eyebrow">Textual Surface</p>
            <h3>Non-Value Items (Status/Text Data)</h3>
          </div>
          <div class="parsing-result-view__section-actions">
            <span class="parsing-result-view__count-pill">{{ filteredNonValueItems.length }}</span>
            <button type="button" class="parsing-result-view__icon-button" @click="fullscreenNonValue = true">
              <Icon icon="mdi:fullscreen" />
            </button>
          </div>
        </div>

        <label class="result-surface-search">
          <span>Search non-value items</span>
          <input v-model="searchNonValue" placeholder="Filter by test item name" type="text">
        </label>

        <AppDataGrid
          :columns="nonValueGridColumns"
          :rows="nonValueGridRows"
          paginator
          :rowsPerPage="10"
          :rowsPerPageOptions="gridRowsPerPageOptions"
          scrollHeight="500px"
        >
          <template #cell-test_item="{ data }">
            <div class="parsing-result-view__test-item" :class="{ 'parsing-result-view__test-item--accent': data.is_calculated }">
              {{ data.test_item }}
            </div>
          </template>

          <template #cell-value="{ data }">
            <span class="parsing-result-view__pill" :class="valuePillClass(String(data.value), data.is_calculated)">{{ data.value }}</span>
          </template>

          <template #cell-decimal_value="{ data }">
            <span
              v-if="String(data.test_item).includes('ADJUSTED_POW') && data.hex_decimal !== null && data.hex_decimal !== undefined"
              class="parsing-result-view__decimal-value"
            >
              {{ data.hex_decimal }}
            </span>
            <span v-else class="parsing-result-view__muted">—</span>
          </template>

          <template #cell-type="{ data }">
            <span class="parsing-result-view__pill" :class="typePillClass(data as ParsedTestItemEnhanced)">{{ getTypeLabel(data as ParsedTestItemEnhanced) }}</span>
          </template>

          <template #cell-matched_criteria="{ data }">
            <Icon :icon="data.matched_criteria ? 'mdi:check-circle' : 'mdi:minus-circle'" :class="data.matched_criteria ? 'parsing-result-view__criteria-icon parsing-result-view__criteria-icon--success' : 'parsing-result-view__criteria-icon parsing-result-view__criteria-icon--neutral'" />
          </template>
        </AppDataGrid>
      </section>
    </AppPanel>

    <AppDialog v-model="fullscreenValue" title="Value Items (Numeric Data)" description="Expanded parsing result view for numeric measurements." width="min(98vw, 112rem)" :breakpoints="dialogBreakpoints">

      <label class="result-surface-search">
        <span>Search value items</span>
        <input v-model="searchValue" placeholder="Filter by test item name" type="text">
      </label>

      <AppDataGrid
        :columns="valueGridColumns"
        :rows="valueGridRows"
        paginator
        :rowsPerPage="25"
        :rowsPerPageOptions="gridRowsPerPageOptions"
        scrollHeight="calc(100vh - 22rem)"
      >
        <template #cell-test_item="{ data }">
          <div class="parsing-result-view__test-item" :class="{ 'parsing-result-view__test-item--accent': data.is_calculated }">
            <span>{{ data.test_item }}</span>
            <span v-if="data.is_calculated" class="parsing-result-view__pill parsing-result-view__pill--info">Calculated</span>
          </div>
        </template>
        <template #cell-usl="{ data }"><span>{{ formatNumber(data.usl as number | null | undefined) }}</span></template>
        <template #cell-lsl="{ data }"><span>{{ formatNumber(data.lsl as number | null | undefined) }}</span></template>
        <template #cell-value="{ data }">
          <div class="parsing-result-view__value-stack">
            <span>{{ data.value }}</span>
            <span v-if="data.is_hex" class="parsing-result-view__pill parsing-result-view__pill--info">{{ data.hex_decimal }}</span>
          </div>
        </template>
        <template #cell-type="{ data }"><span class="parsing-result-view__pill" :class="typePillClass(data as ParsedTestItemEnhanced)">{{ getTypeLabel(data as ParsedTestItemEnhanced) }}</span></template>
        <template #cell-score="{ data }">
          <button v-if="data.score !== null" type="button" class="parsing-result-view__score-pill" :class="scorePillClass(Number(data.score))" @click="openScoreBreakdown(data as ParsedTestItemEnhanced)">
            {{ Number(data.score).toFixed(2) }}
          </button>
          <span v-else class="parsing-result-view__muted">N/A</span>
        </template>
        <template #cell-matched_criteria="{ data }"><Icon :icon="data.matched_criteria ? 'mdi:check-circle' : 'mdi:minus-circle'" :class="data.matched_criteria ? 'parsing-result-view__criteria-icon parsing-result-view__criteria-icon--success' : 'parsing-result-view__criteria-icon parsing-result-view__criteria-icon--neutral'" /></template>
      </AppDataGrid>
    </AppDialog>

    <AppDialog v-model="fullscreenNonValue" title="Non-Value Items (Status/Text Data)" description="Expanded parsing result view for status and text fields." width="min(98vw, 112rem)" :breakpoints="dialogBreakpoints">

      <label class="result-surface-search">
        <span>Search non-value items</span>
        <input v-model="searchNonValue" placeholder="Filter by test item name" type="text">
      </label>

      <AppDataGrid
        :columns="nonValueGridColumns"
        :rows="nonValueGridRows"
        paginator
        :rowsPerPage="25"
        :rowsPerPageOptions="gridRowsPerPageOptions"
        scrollHeight="calc(100vh - 22rem)"
      >
        <template #cell-test_item="{ data }"><div class="parsing-result-view__test-item" :class="{ 'parsing-result-view__test-item--accent': data.is_calculated }">{{ data.test_item }}</div></template>
        <template #cell-value="{ data }"><span class="parsing-result-view__pill" :class="valuePillClass(String(data.value), data.is_calculated)">{{ data.value }}</span></template>
        <template #cell-decimal_value="{ data }"><span v-if="String(data.test_item).includes('ADJUSTED_POW') && data.hex_decimal !== null && data.hex_decimal !== undefined" class="parsing-result-view__decimal-value">{{ data.hex_decimal }}</span><span v-else class="parsing-result-view__muted">—</span></template>
        <template #cell-type="{ data }"><span class="parsing-result-view__pill" :class="typePillClass(data as ParsedTestItemEnhanced)">{{ getTypeLabel(data as ParsedTestItemEnhanced) }}</span></template>
        <template #cell-matched_criteria="{ data }"><Icon :icon="data.matched_criteria ? 'mdi:check-circle' : 'mdi:minus-circle'" :class="data.matched_criteria ? 'parsing-result-view__criteria-icon parsing-result-view__criteria-icon--success' : 'parsing-result-view__criteria-icon parsing-result-view__criteria-icon--neutral'" /></template>
      </AppDataGrid>
    </AppDialog>

    <ScoreBreakdownDialog v-model="scoreDialogOpen" :item="selectedItem" />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { AppDataGrid, AppDialog, AppPanel } from '@/shared'
import type {
  ParsedTestItemEnhanced,
  TestLogParseResponseEnhanced,
} from '../composables/useTestLogUpload'
import ScoreBreakdownDialog from './ScoreBreakdownDialog.vue'

const props = defineProps<{
  result: TestLogParseResponseEnhanced
}>()

const searchValue = ref('')
const searchNonValue = ref('')
const fullscreenValue = ref(false)
const fullscreenNonValue = ref(false)
const scoreDialogOpen = ref(false)
const selectedItem = ref<ParsedTestItemEnhanced | null>(null)

const gridRowsPerPageOptions = [10, 25, 50, 100, 200]
const dialogBreakpoints = { '1400px': '96vw', '960px': '98vw' }

const valueColumns = [
  {
    key: 'test_item',
    field: 'test_item',
    header: 'Test Item',
    sortable: true,
    style: { width: '20rem' },
  },
  { key: 'usl', field: 'usl', header: 'USL', sortable: true, style: { width: '7rem' } },
  { key: 'lsl', field: 'lsl', header: 'LSL', sortable: true, style: { width: '7rem' } },
  { key: 'value', field: 'value', header: 'Value', sortable: true },
  { key: 'type', field: 'type', header: 'Type', sortable: true, style: { width: '8rem' } },
  { key: 'score', field: 'score', header: 'Score', sortable: true, style: { width: '8rem' } },
  {
    key: 'matched_criteria',
    field: 'matched_criteria',
    header: 'Criteria',
    sortable: true,
    style: { width: '7rem' },
  },
]

const nonValueColumns = [
  {
    key: 'test_item',
    field: 'test_item',
    header: 'Test Item',
    sortable: true,
    style: { width: '20rem' },
  },
  { key: 'value', field: 'value', header: 'Value', sortable: true },
  {
    key: 'decimal_value',
    field: 'decimal_value',
    header: 'Decimal Value',
    sortable: true,
    style: { width: '10rem' },
  },
  { key: 'type', field: 'type', header: 'Type', sortable: true, style: { width: '8rem' } },
  {
    key: 'matched_criteria',
    field: 'matched_criteria',
    header: 'Criteria',
    sortable: true,
    style: { width: '7rem' },
  },
]

const valueGridColumns = computed(() => valueColumns)
const nonValueGridColumns = computed(() => nonValueColumns)

const valueItems = computed(() =>
  props.result.parsed_items_enhanced.filter(
    (item) => item.is_value_type && !item.test_item.includes('ADJUSTED_POW'),
  ),
)

const nonValueItems = computed(() =>
  props.result.parsed_items_enhanced.filter(
    (item) => !item.is_value_type || item.test_item.includes('ADJUSTED_POW'),
  ),
)

const filteredValueItems = computed(() => {
  if (!searchValue.value) return valueItems.value
  const searchLower = searchValue.value.toLowerCase()
  return valueItems.value.filter((item) => item.test_item.toLowerCase().includes(searchLower))
})

const filteredNonValueItems = computed(() => {
  if (!searchNonValue.value) return nonValueItems.value
  const searchLower = searchNonValue.value.toLowerCase()
  return nonValueItems.value.filter((item) => item.test_item.toLowerCase().includes(searchLower))
})

const valueGridRows = computed(
  () => filteredValueItems.value as unknown as Array<Record<string, unknown>>,
)
const nonValueGridRows = computed(
  () => filteredNonValueItems.value as unknown as Array<Record<string, unknown>>,
)

function formatDuration(seconds: number | null): string {
  if (!seconds) return 'N/A'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

function getResultColor(result: string | null): string {
  if (!result) return 'grey'
  const upper = result.toUpperCase()
  if (upper === 'PASS') return 'success'
  if (upper === 'FAIL') return 'error'
  return 'warning'
}

function formatScore(score: number | null | undefined): string {
  return score !== null && score !== undefined ? score.toFixed(2) : 'N/A'
}

function formatNumber(value: number | null | undefined): string {
  return value !== null && value !== undefined ? value.toString() : 'N/A'
}

function getTypeLabel(item: ParsedTestItemEnhanced): string {
  if (item.is_hex) return 'Hex'
  if (item.is_value_type) return 'Value'
  return 'Non-Value'
}

function getTypeColor(item: ParsedTestItemEnhanced): string {
  if (item.is_hex) return 'info'
  if (item.is_value_type) return 'primary'
  return 'secondary'
}

function getScoreColor(score: number): string {
  if (score >= 9) return 'success'
  if (score >= 7) return 'warning'
  return 'error'
}

function getStatusColor(value: string): string {
  const upper = value.toUpperCase()
  if (upper === 'PASS' || upper === 'OK') return 'success'
  if (upper === 'FAIL' || upper === 'ERROR') return 'error'
  return 'grey'
}

function openScoreBreakdown(item: ParsedTestItemEnhanced) {
  selectedItem.value = item
  scoreDialogOpen.value = true
}

function resultPillClass(result: string | null): string {
  const tone = getResultColor(result)
  if (tone === 'success') return 'parsing-result-view__pill--success'
  if (tone === 'error') return 'parsing-result-view__pill--error'
  if (tone === 'warning') return 'parsing-result-view__pill--warning'
  return 'parsing-result-view__pill--neutral'
}

function typePillClass(item: ParsedTestItemEnhanced): string {
  const tone = getTypeColor(item)
  if (tone === 'info') return 'parsing-result-view__pill--info'
  if (tone === 'primary') return 'parsing-result-view__pill--primary'
  return 'parsing-result-view__pill--secondary'
}

function scorePillClass(score: number): string {
  const tone = getScoreColor(score)
  if (tone === 'success') return 'parsing-result-view__pill--success'
  if (tone === 'warning') return 'parsing-result-view__pill--warning'
  return 'parsing-result-view__pill--error'
}

function valuePillClass(value: string, isCalculated?: boolean): string {
  if (isCalculated) return 'parsing-result-view__pill--primary'
  const tone = getStatusColor(value)
  if (tone === 'success') return 'parsing-result-view__pill--success'
  if (tone === 'error') return 'parsing-result-view__pill--error'
  return 'parsing-result-view__pill--neutral'
}
</script>

<style scoped>
.parsing-result-view {
  display: grid;
  gap: 1rem;
}

.parsing-result-view__metadata-panel,
.parsing-result-view__section,
.parsing-result-view__stat-card {
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel);
}

.parsing-result-view__metadata-panel,
.parsing-result-view__section {
  padding: 1rem;
}

.parsing-result-view__section-heading,
.parsing-result-view__section-title,
.parsing-result-view__section-actions,
.parsing-result-view__test-item,
.parsing-result-view__value-stack {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.parsing-result-view__section-heading {
  justify-content: space-between;
  margin-bottom: 1rem;
}

.parsing-result-view__section-title {
  color: var(--app-ink);
  font-weight: 700;
}

.parsing-result-view__metadata-grid,
.parsing-result-view__stat-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
}

.parsing-result-view__metadata-item,
.parsing-result-view__stat-card {
  display: grid;
  gap: 0.35rem;
}

.parsing-result-view__metadata-item small,
.parsing-result-view__section-eyebrow,
.parsing-result-view__muted,
.parsing-result-view__stat-card small,
.parsing-result-view__stat-card span {
  color: var(--app-muted);
}

.parsing-result-view__metadata-item strong,
.parsing-result-view__stat-card strong,
.parsing-result-view__test-item,
.parsing-result-view__decimal-value {
  color: var(--app-ink);
  font-weight: 700;
}

.parsing-result-view__stat-card {
  padding: 1rem;
}

.parsing-result-view__stat-card--primary {
  background: linear-gradient(145deg, rgba(40, 96, 163, 0.1), var(--app-panel));
}

.parsing-result-view__stat-card--secondary {
  background: linear-gradient(145deg, rgba(95, 64, 176, 0.1), var(--app-panel));
}

.parsing-result-view__stat-card--info {
  background: linear-gradient(145deg, rgba(20, 113, 153, 0.1), var(--app-panel));
}

.parsing-result-view__stat-card--success {
  background: linear-gradient(145deg, rgba(15, 118, 110, 0.1), var(--app-panel));
}

.parsing-result-view__section-heading--info {
  color: #1f4e86;
}

.parsing-result-view__section-heading--secondary {
  color: #5f40b0;
}

.parsing-result-view__section-eyebrow {
  margin: 0 0 0.2rem;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.parsing-result-view__section-heading h3 {
  margin: 0;
}

.parsing-result-view__count-pill,
.parsing-result-view__pill,
.parsing-result-view__score-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 700;
}

.parsing-result-view__count-pill {
  background: rgba(120, 129, 143, 0.12);
  color: #4f5d6d;
}

.parsing-result-view__pill--success {
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.parsing-result-view__pill--warning {
  background: rgba(184, 118, 38, 0.16);
  color: #8f5314;
}

.parsing-result-view__pill--error {
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

.parsing-result-view__pill--info {
  background: rgba(20, 113, 153, 0.12);
  color: #0f6c92;
}

.parsing-result-view__pill--primary {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.parsing-result-view__pill--secondary {
  background: rgba(95, 64, 176, 0.14);
  color: #5f40b0;
}

.parsing-result-view__pill--neutral {
  background: rgba(120, 129, 143, 0.12);
  color: #4f5d6d;
}

.parsing-result-view__score-pill,
.parsing-result-view__icon-button {
  border: 0;
  cursor: pointer;
}

.parsing-result-view__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  background: var(--app-panel);
  color: var(--app-ink);
  border: 1px solid var(--app-border);
}

.parsing-result-view__criteria-icon {
  font-size: 1rem;
}

.parsing-result-view__criteria-icon--success {
  color: var(--app-accent);
}

.parsing-result-view__criteria-icon--neutral {
  color: #8a94a6;
}

.parsing-result-view__test-item--accent,
.parsing-result-view__decimal-value {
  color: #1f4e86;
}

.result-surface-search {
  display: grid;
  gap: 0.45rem;
}

.result-surface-search span {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  color: var(--app-muted);
}

.result-surface-search input {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
  color: var(--app-ink);
  box-shadow: var(--app-shadow-soft);
  padding: 0.85rem 0.95rem;
}

.result-surface-search input:focus {
  outline: none;
  border-color: var(--app-accent);
  box-shadow: 0 0 0 4px var(--app-ring);
}

.result-surface-dialog-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  align-items: flex-start;
}

.result-surface-dialog-title {
  margin: 0;
  font-family: var(--app-display);
  font-size: 1.4rem;
}

.result-surface-dialog-description {
  margin: 0.35rem 0 0;
  color: var(--app-muted);
  line-height: 1.55;
}

@media (max-width: 720px) {
  .result-surface-dialog-header,
  .parsing-result-view__section-heading,
  .parsing-result-view__test-item,
  .parsing-result-view__value-stack {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
