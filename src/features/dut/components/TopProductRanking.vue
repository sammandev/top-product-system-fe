<template>
  <AppPanel
    eyebrow="Ranking"
    title="Top Product Ranking by Test Station"
    description="Rankings are based on overall scoring. DUTs with error items remain grouped at the bottom of each station view."
    tone="warm"
    split-header
  >
    <template #header-aside>
      <div class="top-product-ranking__summary-pills">
        <span class="top-product-ranking__pill top-product-ranking__pill--primary">
          {{ stationNames.length }} Stations
        </span>
        <span class="top-product-ranking__pill top-product-ranking__pill--success">
          {{ totalDUTs }} DUTs
        </span>
      </div>
    </template>

    <AppTabs v-model="selectedTab" :items="stationTabItems" scrollable>
      <template v-for="item in stationTabItems" :key="String(item.value)" #[`panel-${item.value}`]>
        <section v-if="selectedTab === String(item.value)" class="top-product-ranking__station-panel">
          <div class="top-product-ranking__station-hero">
            <div>
              <p class="top-product-ranking__section-eyebrow">Station Workspace</p>
              <h3>{{ String(item.value) }}</h3>
            </div>

            <div class="top-product-ranking__station-pills">
              <span class="top-product-ranking__pill top-product-ranking__pill--success">
                {{ getPassedCount(String(item.value)) }} Passed
              </span>
              <span class="top-product-ranking__pill top-product-ranking__pill--danger">
                {{ getFailedCount(String(item.value)) }} Failed
              </span>
              <span
                v-if="getTopScore(String(item.value)) !== null"
                class="top-product-ranking__pill top-product-ranking__pill--warning"
              >
                Top Score: {{ getTopScore(String(item.value))?.toFixed(2) }}
              </span>
            </div>
          </div>

          <section v-if="getStationRanking(String(item.value)).length > 0" class="top-product-ranking__workspace">
            <div class="top-product-ranking__filter-grid">
              <label class="top-product-ranking__field top-product-ranking__field--wide">
                <span>Search</span>
                <input v-model="searchQuery" type="text" placeholder="ISN, Device, Date, Site, Model...">
              </label>

              <label class="top-product-ranking__field">
                <span>Score Filter</span>
                <select :value="scoreFilterType ?? ''" @change="handleScoreFilterTypeInput">
                  <option value="">No filter</option>
                  <option v-for="option in scoreFilterTypes" :key="option.value" :value="option.value">
                    {{ option.title }}
                  </option>
                </select>
              </label>

              <label class="top-product-ranking__field">
                <span>Score Value</span>
                <input
                  :value="scoreFilterValue ?? ''"
                  type="number"
                  placeholder="e.g. 9"
                  :disabled="!scoreFilterType"
                  @input="handleScoreFilterValueInput"
                >
              </label>

              <label class="top-product-ranking__field">
                <span>Status</span>
                <select :value="statusFilter ?? ''" @change="handleStatusFilterInput">
                  <option value="">All</option>
                  <option v-for="option in statusFilterOptions" :key="option.value" :value="option.value">
                    {{ option.title }}
                  </option>
                </select>
              </label>

              <label class="top-product-ranking__field">
                <span>Site</span>
                <select :value="siteFilter ?? ''" @change="handleSiteFilterInput">
                  <option value="">All</option>
                  <option v-for="site in availableSites" :key="site" :value="site">{{ site }}</option>
                </select>
              </label>
            </div>

            <div v-if="hasActiveFilters" class="top-product-ranking__active-filters">
              <span class="top-product-ranking__pill top-product-ranking__pill--primary">
                {{ activeFilterCount }} active filter(s)
              </span>
              <button v-if="searchQuery" type="button" class="top-product-ranking__token" @click="searchQuery = ''">
                Search: "{{ searchQuery }}"
              </button>
              <button
                v-if="scoreFilterType && scoreFilterValue !== null"
                type="button"
                class="top-product-ranking__token"
                @click="clearScoreFilter"
              >
                Score {{ getScoreFilterLabel() }}: {{ scoreFilterValue }}
              </button>
              <button v-if="statusFilter" type="button" class="top-product-ranking__token" @click="statusFilter = null">
                Status: {{ statusFilter === 'passed' ? 'Passed Only' : 'Failed Only' }}
              </button>
              <button v-if="siteFilter" type="button" class="top-product-ranking__token" @click="siteFilter = null">
                Site: {{ siteFilter }}
              </button>
              <button type="button" class="top-product-ranking__button top-product-ranking__button--ghost" @click="clearAllFilters">
                Clear All
              </button>
            </div>

            <div v-if="filteredRanking.length === 0" class="top-product-ranking__notice top-product-ranking__notice--info">
              No results match the current filters.
            </div>
            <p v-else class="top-product-ranking__results-copy">
              Showing {{ filteredRanking.length }} of {{ getStationRanking(String(item.value)).length }} DUT(s)
            </p>

            <AppDataGrid
              :columns="rankingGridColumns"
              :rows="filteredRankingRows"
              dataKey="isn"
              paginator
              :rowsPerPage="10"
              :rowsPerPageOptions="rowsPerPageOptions"
              scrollHeight="40rem"
              :rowClass="getRankingRowClass"
              emptyMessage="No ranking rows available for this station."
              @row-click="handleGridRowClick($event, String(item.value))"
            >
              <template #cell-rank="{ data }">
                <span class="top-product-ranking__rank-pill" :class="rankPillClass(data as RankingItem)">
                  {{ (data as RankingItem).hasError ? 'Error' : (data as RankingItem).rank }}
                </span>
              </template>

              <template #cell-isn="{ data }">
                <span class="top-product-ranking__strong">{{ (data as RankingItem).isn }}</span>
              </template>

              <template #cell-device="{ data }">
                <span class="top-product-ranking__pill top-product-ranking__pill--neutral">
                  {{ (data as RankingItem).device || 'N/A' }}
                </span>
              </template>

              <template #cell-testDate="{ data }">
                <span class="top-product-ranking__muted">{{ formatDate((data as RankingItem).testDate) }}</span>
              </template>

              <template #cell-score="{ data }">
                <span
                  v-if="!(data as RankingItem).hasError"
                  class="top-product-ranking__score-pill"
                  :class="scorePillClass((data as RankingItem).score)"
                >
                  {{ (data as RankingItem).score.toFixed(2) }}
                </span>
                <span v-else class="top-product-ranking__pill top-product-ranking__pill--danger">N/A</span>
              </template>

              <template #cell-site="{ data }">
                <span class="top-product-ranking__muted">{{ (data as RankingItem).site || 'N/A' }}</span>
              </template>

              <template #cell-model="{ data }">
                <span class="top-product-ranking__muted">{{ (data as RankingItem).model || 'N/A' }}</span>
              </template>

              <template #cell-errorItem="{ data }">
                <span
                  class="top-product-ranking__pill"
                  :class="(data as RankingItem).hasError ? 'top-product-ranking__pill--danger' : 'top-product-ranking__pill--success'"
                  :title="(data as RankingItem).errorItem || undefined"
                >
                  {{ (data as RankingItem).hasError ? 'Error' : 'Pass' }}
                </span>
              </template>
            </AppDataGrid>
          </section>

          <div v-else class="top-product-ranking__notice top-product-ranking__notice--info">
            No ranking data available for this station.
          </div>
        </section>
      </template>
    </AppTabs>
  </AppPanel>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AppDataGrid, AppPanel, AppTabs } from '@/shared'
import { formatDate } from '@/shared/utils/helpers'
import type { TopProductResult } from '../types/dutTopProduct.types'

interface Props {
  results: TopProductResult[]
}

interface RankingItem {
  rank: number
  isn: string
  device: string | null
  testDate: string
  score: number
  site: string | null
  model: string | null
  hasError: boolean
  errorItem: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<(e: 'row-click', payload: { isn: string; stationName: string }) => void>()

const selectedTab = ref<string>('')
const searchQuery = ref<string>('')
const scoreFilterType = ref<string | null>(null)
const scoreFilterValue = ref<number | null>(null)
const statusFilter = ref<string | null>(null)
const siteFilter = ref<string | null>(null)

const rowsPerPageOptions = [10, 25, 50, 100]

const scoreFilterTypes = [
  { title: 'Greater than (>)', value: 'gt' },
  { title: 'Greater or equal (≥)', value: 'gte' },
  { title: 'Less than (<)', value: 'lt' },
  { title: 'Less or equal (≤)', value: 'lte' },
  { title: 'Equal (=)', value: 'eq' },
]

const statusFilterOptions = [
  { title: 'Passed Only', value: 'passed' },
  { title: 'Failed Only', value: 'failed' },
]

const rankingByStation = computed(() => {
  const stationMap: Record<string, RankingItem[]> = {}

  props.results.forEach((result) => {
    ;(result.test_result || []).forEach((station) => {
      const stationName = station.station_name
      if (!stationName) return

      if (!stationMap[stationName]) {
        stationMap[stationName] = []
      }

      const hasError = typeof station.error_item === 'string' && station.error_item.trim() !== ''

      stationMap[stationName].push({
        rank: 0,
        isn: result.dut_isn,
        device: station.device,
        testDate: station.test_date,
        score: station.overall_data_score,
        site: result.site_name,
        model: result.model_name,
        hasError,
        errorItem: station.error_item,
      })
    })
  })

  Object.keys(stationMap).forEach((station) => {
    const items = stationMap[station]

    if (!items) return

    const passed = items.filter((item) => !item.hasError)
    const failed = items.filter((item) => item.hasError)

    passed.sort((a, b) => b.score - a.score)

    passed.forEach((item, index) => {
      item.rank = index + 1
    })

    failed.forEach((item) => {
      item.rank = 999
    })

    stationMap[station] = [...passed, ...failed]
  })

  return stationMap
})

const stationNames = computed(() => Object.keys(rankingByStation.value))

const stationTabItems = computed(() =>
  stationNames.value.map((station) => ({
    value: station,
    label: station,
    icon: 'mdi:factory',
    count: rankingByStation.value[station]?.length ?? 0,
  })),
)

watch(
  stationNames,
  (stations) => {
    if (stations.length === 0) {
      selectedTab.value = ''
      return
    }

    if (!selectedTab.value || !stations.includes(selectedTab.value)) {
      selectedTab.value = stations[0] || ''
    }
  },
  { immediate: true },
)

const totalDUTs = computed(() => {
  const uniqueISNs = new Set<string>()
  props.results.forEach((result) => {
    uniqueISNs.add(result.dut_isn)
  })
  return uniqueISNs.size
})

const availableSites = computed(() => {
  const sites = new Set<string>()
  props.results.forEach((result) => {
    if (result.site_name) {
      sites.add(result.site_name)
    }
  })
  return Array.from(sites)
})

const filteredRanking = computed(() => {
  const currentStation = selectedTab.value
  if (!currentStation || !rankingByStation.value[currentStation]) {
    return []
  }

  let items = rankingByStation.value[currentStation]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter((item) => {
      return (
        item.isn.toLowerCase().includes(query) ||
        item.device?.toLowerCase().includes(query) ||
        item.testDate.toLowerCase().includes(query) ||
        item.site?.toLowerCase().includes(query) ||
        item.model?.toLowerCase().includes(query)
      )
    })
  }

  if (scoreFilterType.value && scoreFilterValue.value !== null) {
    items = items.filter((item) => {
      if (item.hasError) return true

      const score = item.score
      const filterValue = scoreFilterValue.value as number

      switch (scoreFilterType.value) {
        case 'gt':
          return score > filterValue
        case 'gte':
          return score >= filterValue
        case 'lt':
          return score < filterValue
        case 'lte':
          return score <= filterValue
        case 'eq':
          return Math.abs(score - filterValue) < 0.01
        default:
          return true
      }
    })
  }

  if (statusFilter.value) {
    if (statusFilter.value === 'passed') {
      items = items.filter((item) => !item.hasError)
    } else if (statusFilter.value === 'failed') {
      items = items.filter((item) => item.hasError)
    }
  }

  if (siteFilter.value) {
    items = items.filter((item) => item.site === siteFilter.value)
  }

  return items
})

const filteredRankingRows = computed(
  () => filteredRanking.value as unknown as Array<Record<string, unknown>>,
)

const hasActiveFilters = computed(
  () => !!(searchQuery.value || scoreFilterType.value || statusFilter.value || siteFilter.value),
)

const activeFilterCount = computed(() => {
  let count = 0
  if (searchQuery.value) count++
  if (scoreFilterType.value && scoreFilterValue.value !== null) count++
  if (statusFilter.value) count++
  if (siteFilter.value) count++
  return count
})

const rankingGridColumns = [
  { key: 'rank', field: 'rank', header: 'Rank', sortable: true, style: { width: '7rem' } },
  { key: 'isn', field: 'isn', header: 'DUT ISN', sortable: true, style: { width: '14rem' } },
  { key: 'device', field: 'device', header: 'Device', sortable: true, style: { width: '12rem' } },
  { key: 'testDate', field: 'testDate', header: 'Test Date', sortable: true, style: { width: '14rem' } },
  { key: 'score', field: 'score', header: 'Score', sortable: true, style: { width: '8rem' } },
  { key: 'site', field: 'site', header: 'Site', sortable: true, style: { width: '10rem' } },
  { key: 'model', field: 'model', header: 'Model', sortable: true, style: { width: '10rem' } },
  { key: 'errorItem', field: 'errorItem', header: 'Status', sortable: false, style: { width: '8rem' } },
]

function getStationRanking(stationName: string): RankingItem[] {
  return rankingByStation.value[stationName] ?? []
}

function getPassedCount(stationName: string): number {
  return getStationRanking(stationName).filter((item) => !item.hasError).length
}

function getFailedCount(stationName: string): number {
  return getStationRanking(stationName).filter((item) => item.hasError).length
}

function getTopScore(stationName: string): number | null {
  const topItem = getStationRanking(stationName).find((item) => !item.hasError)
  return topItem ? topItem.score : null
}

function getScoreColor(score: number): string {
  if (score >= 9.5) return 'success'
  if (score >= 8.5) return 'primary'
  if (score >= 7.5) return 'lime'
  if (score >= 6.5) return 'warning'
  if (score >= 5.0) return 'orange'
  return 'danger'
}

function scorePillClass(score: number): string {
  const tone = getScoreColor(score)
  if (tone === 'success') return 'top-product-ranking__score-pill--success'
  if (tone === 'primary') return 'top-product-ranking__score-pill--primary'
  if (tone === 'lime') return 'top-product-ranking__score-pill--lime'
  if (tone === 'warning') return 'top-product-ranking__score-pill--warning'
  if (tone === 'orange') return 'top-product-ranking__score-pill--orange'
  return 'top-product-ranking__score-pill--danger'
}

function rankPillClass(item: RankingItem): string {
  if (item.hasError) return 'top-product-ranking__rank-pill--danger'
  if (item.rank === 1) return 'top-product-ranking__rank-pill--gold'
  if (item.rank === 2) return 'top-product-ranking__rank-pill--silver'
  if (item.rank === 3) return 'top-product-ranking__rank-pill--bronze'
  return 'top-product-ranking__rank-pill--default'
}

function getScoreFilterLabel(): string {
  switch (scoreFilterType.value) {
    case 'gt':
      return '>'
    case 'gte':
      return '≥'
    case 'lt':
      return '<'
    case 'lte':
      return '≤'
    case 'eq':
      return '='
    default:
      return ''
  }
}

function clearScoreFilter() {
  scoreFilterType.value = null
  scoreFilterValue.value = null
}

function clearAllFilters() {
  searchQuery.value = ''
  clearScoreFilter()
  statusFilter.value = null
  siteFilter.value = null
}

function getRankingRowClass(item: RankingItem): string {
  if (item.hasError) return 'error-row'
  if (item.rank === 1) return 'rank-1-row'
  if (item.rank === 2) return 'rank-2-row'
  if (item.rank === 3) return 'rank-3-row'
  return ''
}

function handleRowClick(item: RankingItem, stationName: string) {
  emit('row-click', { isn: item.isn, stationName })
}

function handleGridRowClick(event: unknown, stationName: string) {
  const payload = event as { data?: RankingItem; value?: RankingItem }
  const row = payload?.data || payload?.value
  if (row) {
    handleRowClick(row, stationName)
  }
}

function getSelectValue(event: Event): string | null {
  const value = (event.target as HTMLSelectElement).value
  return value || null
}

function handleScoreFilterTypeInput(event: Event) {
  scoreFilterType.value = getSelectValue(event)
  if (!scoreFilterType.value) {
    scoreFilterValue.value = null
  }
}

function handleStatusFilterInput(event: Event) {
  statusFilter.value = getSelectValue(event)
}

function handleSiteFilterInput(event: Event) {
  siteFilter.value = getSelectValue(event)
}

function handleScoreFilterValueInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  scoreFilterValue.value = value === '' ? null : Number(value)
}
</script>

<style scoped>
.top-product-ranking__summary-pills,
.top-product-ranking__station-hero,
.top-product-ranking__station-pills,
.top-product-ranking__active-filters,
.top-product-ranking__button {
  display: flex;
}

.top-product-ranking__station-panel,
.top-product-ranking__workspace,
.top-product-ranking__filter-grid {
  display: grid;
  gap: 1rem;
}

.top-product-ranking__summary-pills,
.top-product-ranking__station-pills,
.top-product-ranking__active-filters {
  flex-wrap: wrap;
  gap: 0.65rem;
}

.top-product-ranking__station-hero {
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: linear-gradient(145deg, rgba(255, 244, 223, 0.9), var(--app-panel));
  padding: 1rem 1.1rem;
}

.top-product-ranking__section-eyebrow,
.top-product-ranking__field span,
.top-product-ranking__results-copy,
.top-product-ranking__muted {
  color: var(--app-muted);
}

.top-product-ranking__section-eyebrow,
.top-product-ranking__field span {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.top-product-ranking__station-hero h3 {
  margin: 0.2rem 0 0;
}

.top-product-ranking__filter-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.top-product-ranking__field {
  display: grid;
  gap: 0.45rem;
}

.top-product-ranking__field--wide {
  grid-column: span 2;
}

.top-product-ranking__field input,
.top-product-ranking__field select {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.95rem;
  background: var(--app-panel);
  color: var(--app-ink);
  padding: 0.82rem 0.95rem;
}

.top-product-ranking__field input:focus,
.top-product-ranking__field select:focus {
  outline: none;
  border-color: var(--app-accent);
  box-shadow: 0 0 0 4px var(--app-ring);
}

.top-product-ranking__field input:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.top-product-ranking__pill,
.top-product-ranking__score-pill,
.top-product-ranking__rank-pill,
.top-product-ranking__token {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 700;
}

.top-product-ranking__pill--primary {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.top-product-ranking__pill--success,
.top-product-ranking__score-pill--success {
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.top-product-ranking__pill--warning,
.top-product-ranking__score-pill--warning {
  background: rgba(184, 118, 38, 0.16);
  color: #8f5314;
}

.top-product-ranking__pill--danger,
.top-product-ranking__score-pill--danger,
.top-product-ranking__rank-pill--danger {
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

.top-product-ranking__pill--neutral {
  background: rgba(120, 129, 143, 0.12);
  color: #4f5d6d;
}

.top-product-ranking__score-pill,
.top-product-ranking__rank-pill {
  min-width: 4.5rem;
}

.top-product-ranking__score-pill--primary {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.top-product-ranking__score-pill--lime {
  background: rgba(97, 140, 35, 0.14);
  color: #557c18;
}

.top-product-ranking__score-pill--orange {
  background: rgba(201, 126, 32, 0.16);
  color: #9c5b12;
}

.top-product-ranking__rank-pill--gold {
  background: rgba(201, 153, 0, 0.18);
  color: #7a5a00;
}

.top-product-ranking__rank-pill--silver {
  background: rgba(127, 137, 148, 0.18);
  color: #55606c;
}

.top-product-ranking__rank-pill--bronze {
  background: rgba(164, 96, 52, 0.18);
  color: #7d451f;
}

.top-product-ranking__rank-pill--default {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.top-product-ranking__button,
.top-product-ranking__token {
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: #4f5d6d;
  cursor: pointer;
}

.top-product-ranking__button {
  padding: 0.72rem 0.95rem;
}

.top-product-ranking__button--ghost {
  border-radius: 999px;
}

.top-product-ranking__token {
  padding: 0.4rem 0.75rem;
}

.top-product-ranking__notice {
  border-radius: 1rem;
  padding: 0.95rem 1rem;
}

.top-product-ranking__notice--info {
  background: rgba(40, 96, 163, 0.08);
  color: #1f4e86;
}

.top-product-ranking__results-copy {
  margin: 0;
  font-size: 0.85rem;
}

.top-product-ranking__strong {
  color: var(--app-ink);
  font-weight: 700;
}

:deep(.rank-1-row) {
  background-color: rgba(255, 215, 0, 0.1) !important;
}

:deep(.rank-2-row) {
  background-color: rgba(192, 192, 192, 0.1) !important;
}

:deep(.rank-3-row) {
  background-color: rgba(205, 127, 50, 0.1) !important;
}

:deep(.error-row) {
  background-color: rgba(244, 67, 54, 0.05) !important;
}

@media (max-width: 1080px) {
  .top-product-ranking__filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .top-product-ranking__field--wide {
    grid-column: span 2;
  }
}

@media (max-width: 720px) {
  .top-product-ranking__station-hero {
    flex-direction: column;
  }

  .top-product-ranking__filter-grid {
    grid-template-columns: 1fr;
  }

  .top-product-ranking__field--wide {
    grid-column: span 1;
  }
}
</style>