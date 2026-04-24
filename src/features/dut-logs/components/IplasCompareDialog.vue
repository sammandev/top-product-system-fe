<template>
  <AppDialog
    v-model="dialogOpen"
    :width="isFullscreen ? '98vw' : 'min(96vw, 88rem)'"
    :breakpoints="dialogBreakpoints"
    maximizable
    :closable="false"
    class="iplas-compare-dialog"
  >
    <template #header>
      <div class="iplas-compare-dialog__header">
        <div class="iplas-compare-dialog__header-copy">
          <span class="iplas-compare-dialog__header-icon">
            <Icon icon="mdi:compare-horizontal" />
          </span>
          <div>
            <p class="iplas-compare-dialog__eyebrow">Upload Log Cross-Check</p>
            <h2>Compare With iPLAS{{ isn ? ` - ${isn}` : '' }}</h2>
            <p>Review uploaded measurements against iPLAS values, re-score both sides with the same rules, and export the aligned result set.</p>
          </div>
        </div>

        <div class="iplas-compare-dialog__header-actions">
          <button
            type="button"
            class="iplas-compare-dialog__button iplas-compare-dialog__button--ghost"
            @click="isFullscreen = !isFullscreen"
          >
            <Icon :icon="isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" />
            <span>{{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}</span>
          </button>
          <button
            type="button"
            class="iplas-compare-dialog__button iplas-compare-dialog__button--ghost"
            @click="dialogOpen = false"
          >
            <Icon icon="mdi:close" />
            <span>Close</span>
          </button>
        </div>
      </div>
    </template>

    <div class="iplas-compare-dialog__body" :class="{ 'iplas-compare-dialog__body--fullscreen': isFullscreen }">
      <div v-if="loading" class="iplas-compare-dialog__empty-state">
        <Icon icon="mdi:loading" class="iplas-compare-dialog__spin" />
        <strong>Fetching iPLAS data{{ isn ? ` for ${isn}` : '' }}...</strong>
        <p>The comparison view will populate once the proxy search returns.</p>
      </div>

      <section v-else-if="errorMessage" class="iplas-compare-dialog__notice iplas-compare-dialog__notice--error">
        <strong>Comparison Error</strong>
        <p>{{ errorMessage }}</p>
      </section>

      <section v-else-if="!iplasTestItems.length" class="iplas-compare-dialog__notice iplas-compare-dialog__notice--warning">
        <strong>No iPLAS Data</strong>
        <p>No iPLAS records were found for {{ isn || 'the selected ISN' }}.</p>
      </section>

      <template v-else>
        <section class="iplas-compare-dialog__controls">
          <label class="iplas-compare-dialog__field iplas-compare-dialog__field--wide">
            <span>Search Test Items (Regex)</span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Example: ^RF.*|Power"
            >
          </label>

          <label class="iplas-compare-dialog__field">
            <span>Data Type</span>
            <select v-model="typeFilter">
              <option v-for="option in typeFilterOptions" :key="option.value" :value="option.value">
                {{ option.title }}
              </option>
            </select>
          </label>

          <label class="iplas-compare-dialog__field">
            <span>Score Filter</span>
            <select v-model="scoreFilter">
              <option v-for="option in scoreFilterOptions" :key="option.value" :value="option.value">
                {{ option.title }}
              </option>
            </select>
          </label>

          <div class="iplas-compare-dialog__field iplas-compare-dialog__field--actions">
            <span>Actions</span>
            <div class="iplas-compare-dialog__action-row">
              <button
                type="button"
                class="iplas-compare-dialog__button iplas-compare-dialog__button--ghost"
                @click="showScoringConfig = true"
              >
                <Icon icon="mdi:tune-variant" />
                <span>Scoring{{ customScoringCount > 0 ? ` (${customScoringCount})` : '' }}</span>
              </button>
              <button
                type="button"
                class="iplas-compare-dialog__button iplas-compare-dialog__button--primary"
                :disabled="exporting"
                @click="exportToExcel"
              >
                <Icon :icon="exporting ? 'mdi:loading' : 'mdi:microsoft-excel'" :class="{ 'iplas-compare-dialog__spin': exporting }" />
                <span>{{ exporting ? 'Exporting...' : 'Export' }}</span>
              </button>
            </div>
          </div>
        </section>

        <section class="iplas-compare-dialog__chip-row">
          <button
            v-for="option in comparisonFilterOptions"
            :key="option.value"
            type="button"
            class="iplas-compare-dialog__chip"
            :class="{ 'iplas-compare-dialog__chip--active': comparisonFilter === option.value }"
            @click="comparisonFilter = option.value"
          >
            <span>{{ option.title }}</span>
            <strong>{{ option.count }}</strong>
          </button>
        </section>

        <section class="iplas-compare-dialog__summary-grid">
          <article class="iplas-compare-dialog__summary-card iplas-compare-dialog__summary-card--primary">
            <small>Uploaded Overall Score</small>
            <strong>{{ formatOverallScore(uploadOverallScore) }}</strong>
          </article>
          <article class="iplas-compare-dialog__summary-card iplas-compare-dialog__summary-card--secondary">
            <small>iPLAS Overall Score</small>
            <strong>{{ formatOverallScore(iplasOverallScore) }}</strong>
          </article>
        </section>

        <AppDataGrid
          :columns="comparisonGridColumns"
          :rows="filteredComparisonItems"
          dataKey="test_item"
          paginator
          :rowsPerPage="25"
          :rowsPerPageOptions="[10, 25, 50, 100]"
          :scrollHeight="isFullscreen ? 'calc(100vh - 24rem)' : '34rem'"
          :rowClass="comparisonRowClass"
          emptyMessage="No comparison rows match the current filters."
        >
          <template #cell-test_item="{ data }">
            <div class="iplas-compare-dialog__item-cell">
              <strong>{{ data.test_item }}</strong>
              <small>{{ data.status }}</small>
            </div>
          </template>

          <template #cell-usl="{ data }">
            <span class="iplas-compare-dialog__muted">{{ data.usl ?? '-' }}</span>
          </template>

          <template #cell-lsl="{ data }">
            <span class="iplas-compare-dialog__muted">{{ data.lsl ?? '-' }}</span>
          </template>

          <template #cell-upload_value="{ data }">
            <span :class="data.upload_value === null ? 'iplas-compare-dialog__muted' : ''">
              {{ data.upload_value ?? '-' }}
            </span>
          </template>

          <template #cell-iplas_value="{ data }">
            <span :class="data.iplas_value === null ? 'iplas-compare-dialog__muted' : ''">
              {{ data.iplas_value ?? '-' }}
            </span>
          </template>

          <template #cell-upload_score="{ data }">
            <button
              v-if="data.upload_score !== null"
              type="button"
              class="iplas-compare-dialog__score-pill"
              :class="scorePillClass(getScoreColor(data.upload_score))"
              @click="showScoreBreakdown(data, 'upload')"
            >
              {{ data.upload_score.toFixed(2) }}
            </button>
            <span v-else class="iplas-compare-dialog__muted">-</span>
          </template>

          <template #cell-iplas_score="{ data }">
            <button
              v-if="data.iplas_score !== null"
              type="button"
              class="iplas-compare-dialog__score-pill"
              :class="scorePillClass(getScoreColor(data.iplas_score))"
              @click="showScoreBreakdown(data, 'iplas')"
            >
              {{ data.iplas_score.toFixed(2) }}
            </button>
            <span v-else class="iplas-compare-dialog__muted">-</span>
          </template>
        </AppDataGrid>
      </template>
    </div>
  </AppDialog>

  <AppDialog
    v-model="showBreakdownDialog"
    :width="breakdownFullscreen ? '96vw' : 'min(94vw, 42rem)'"
    :breakpoints="{ '960px': '98vw', '640px': '100vw' }"
    :closable="false"
    class="iplas-compare-dialog__breakdown-dialog"
  >
    <template #header>
      <div class="iplas-compare-dialog__header">
        <div class="iplas-compare-dialog__header-copy">
          <span class="iplas-compare-dialog__header-icon">
            <Icon icon="mdi:calculator-variant" />
          </span>
          <div>
            <p class="iplas-compare-dialog__eyebrow">Score Breakdown</p>
            <h2>{{ breakdownSource === 'upload' ? 'Uploaded' : 'iPLAS' }} Score</h2>
            <p v-if="breakdownItem">{{ breakdownItem.test_item }}</p>
          </div>
        </div>

        <div class="iplas-compare-dialog__header-actions">
          <button
            type="button"
            class="iplas-compare-dialog__button iplas-compare-dialog__button--ghost"
            @click="breakdownFullscreen = !breakdownFullscreen"
          >
            <Icon :icon="breakdownFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" />
            <span>{{ breakdownFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}</span>
          </button>
          <button
            type="button"
            class="iplas-compare-dialog__button iplas-compare-dialog__button--ghost"
            @click="showBreakdownDialog = false"
          >
            <Icon icon="mdi:close" />
            <span>Close</span>
          </button>
        </div>
      </div>
    </template>

    <div v-if="breakdownItem" class="iplas-compare-dialog__breakdown-grid">
      <article class="iplas-compare-dialog__summary-card">
        <small>Measured Value</small>
        <strong>{{ breakdownSource === 'upload' ? breakdownItem.upload_value : breakdownItem.iplas_value }}</strong>
      </article>
      <article class="iplas-compare-dialog__summary-card">
        <small>Score</small>
        <strong>
          {{ (breakdownSource === 'upload' ? breakdownItem.upload_score : breakdownItem.iplas_score)?.toFixed(2) }}
        </strong>
      </article>
      <article class="iplas-compare-dialog__summary-card">
        <small>Scoring Type</small>
        <strong>{{ breakdownScoringType }}</strong>
      </article>

      <div class="iplas-compare-dialog__detail-table">
        <div class="iplas-compare-dialog__detail-row">
          <span>Test Item</span>
          <strong>{{ breakdownItem.test_item }}</strong>
        </div>
        <div class="iplas-compare-dialog__detail-row">
          <span>UCL</span>
          <strong>{{ breakdownItem.usl ?? '-' }}</strong>
        </div>
        <div class="iplas-compare-dialog__detail-row">
          <span>LCL</span>
          <strong>{{ breakdownItem.lsl ?? '-' }}</strong>
        </div>
        <div class="iplas-compare-dialog__detail-row">
          <span>Target</span>
          <strong>{{ breakdownTarget !== null ? breakdownTarget.toFixed(4) : '-' }}</strong>
        </div>
        <div class="iplas-compare-dialog__detail-row">
          <span>Deviation</span>
          <strong>{{ breakdownDeviation !== null ? breakdownDeviation.toFixed(4) : '-' }}</strong>
        </div>
      </div>
    </div>
  </AppDialog>

  <UploadScoringConfigDialog
    v-model="showScoringConfig"
    :test-items="scoringDialogTestItems"
    :existing-configs="localScoringConfigs"
    @apply="handleScoringConfigApply"
  />
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import type { IplasIsnTestItem } from '@/features/dut-logs/api/iplasProxyApi'
import { useIplasApi } from '@/features/dut-logs/composables/useIplasApi'
import type {
  ParsedTestItemEnhanced,
  RescoreItemResult,
  RescoreScoringConfig,
} from '@/features/dut-logs/composables/useTestLogUpload'
import { useTestLogUpload } from '@/features/dut-logs/composables/useTestLogUpload'
import { AppDataGrid, AppDialog } from '@/shared'
import UploadScoringConfigDialog from './UploadScoringConfigDialog.vue'

const props = defineProps<{
  modelValue: boolean
  isn: string | null
  uploadTestItems: ParsedTestItemEnhanced[]
  scoringConfigs?: RescoreScoringConfig[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

interface ComparisonItem {
  test_item: string
  usl: number | null
  lsl: number | null
  upload_value: string | null
  iplas_value: string | null
  upload_score: number | null
  iplas_score: number | null
  upload_scoring_type?: string
  iplas_scoring_type?: string
  upload_target?: number | null
  iplas_target?: number | null
  upload_deviation?: number | null
  iplas_deviation?: number | null
  status: 'match' | 'upload-only' | 'iplas-only'
}

const { searchByIsn } = useIplasApi()
const { rescoreItems } = useTestLogUpload()

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const dialogBreakpoints = {
  '1400px': '96vw',
  '960px': '98vw',
  '640px': '100vw',
}

const loading = ref(false)
const exporting = ref(false)
const isFullscreen = ref(false)
const errorMessage = ref<string | null>(null)
const iplasTestItems = ref<IplasIsnTestItem[]>([])
const comparisonFilter = ref<'match' | 'mismatch' | 'upload-only' | 'iplas-only' | 'all'>('match')
const searchQuery = ref('')
const typeFilter = ref('all')
const scoreFilter = ref('all')

const showBreakdownDialog = ref(false)
const breakdownFullscreen = ref(false)
const breakdownItem = ref<ComparisonItem | null>(null)
const breakdownSource = ref<'upload' | 'iplas'>('upload')

const uploadScoredMap = ref<Map<string, RescoreItemResult>>(new Map())
const iplasScoredMap = ref<Map<string, RescoreItemResult>>(new Map())
const uploadOverallScore = ref<number | null>(null)
const iplasOverallScore = ref<number | null>(null)

const showScoringConfig = ref(false)
const localScoringConfigs = ref<RescoreScoringConfig[]>([])

const customScoringCount = computed(
  () => localScoringConfigs.value.filter((config) => config.enabled && config.scoring_type !== 'symmetrical').length,
)

const scoringDialogTestItems = computed<ParsedTestItemEnhanced[]>(() => {
  const items: ParsedTestItemEnhanced[] = []
  const seenKeys = new Set<string>()

  props.uploadTestItems.forEach((item) => {
    const key = item.test_item.toLowerCase()
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      items.push({ ...item })
    }
  })

  iplasTestItems.value.forEach((iplasItem) => {
    const key = iplasItem.NAME.toLowerCase()
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      items.push({
        test_item: iplasItem.NAME,
        value: iplasItem.VALUE,
        usl: iplasItem.UCL ? parseFloat(iplasItem.UCL) : null,
        lsl: iplasItem.LCL ? parseFloat(iplasItem.LCL) : null,
        is_value_type: true,
        numeric_value: parseFloat(iplasItem.VALUE) || null,
        is_hex: false,
        hex_decimal: null,
        matched_criteria: false,
        target: null,
        score: null,
        score_breakdown: null,
      })
    }
  })

  return items
})

function handleScoringConfigApply(configs: RescoreScoringConfig[]) {
  localScoringConfigs.value = configs
  rescoreAllItems()
}

function initializeScoringConfigs() {
  const allTestItems = new Set<string>()
  props.uploadTestItems.forEach((item) => allTestItems.add(item.test_item))
  iplasTestItems.value.forEach((item) => allTestItems.add(item.NAME))

  const existingMap = new Map<string, RescoreScoringConfig>()
  if (props.scoringConfigs && props.scoringConfigs.length > 0) {
    props.scoringConfigs.forEach((config) => existingMap.set(config.test_item_name, config))
  }

  localScoringConfigs.value = Array.from(allTestItems).map((name) => {
    const existing = existingMap.get(name)
    if (existing) {
      return { ...existing }
    }

    return {
      test_item_name: name,
      scoring_type: 'symmetrical' as const,
      enabled: true,
      weight: 1.0,
      policy: 'symmetrical' as const,
    }
  })
}

const typeFilterOptions = [
  { title: 'Show All', value: 'all' },
  { title: 'Criteria', value: 'criteria' },
  { title: 'Non-Criteria', value: 'non-criteria' },
]

const scoreFilterOptions = [
  { title: 'All Scores', value: 'all' },
  { title: 'Score >= 9', value: 'gte9' },
  { title: 'Score 7-9', value: '7to9' },
  { title: 'Score < 7', value: 'lt7' },
  { title: 'Has Score', value: 'hasScore' },
  { title: 'No Score', value: 'noScore' },
]

const comparisonGridColumns = [
  { key: 'test_item', field: 'test_item', header: 'Test Item', sortable: true, style: { width: '18rem' } },
  { key: 'usl', field: 'usl', header: 'UCL', sortable: true, style: { width: '7rem' } },
  { key: 'lsl', field: 'lsl', header: 'LCL', sortable: true, style: { width: '7rem' } },
  { key: 'upload_value', field: 'upload_value', header: 'Uploaded Value', sortable: true, style: { width: '10rem' } },
  { key: 'iplas_value', field: 'iplas_value', header: 'iPLAS Value', sortable: true, style: { width: '10rem' } },
  { key: 'upload_score', field: 'upload_score', header: 'Uploaded Score', sortable: true, style: { width: '9rem' } },
  { key: 'iplas_score', field: 'iplas_score', header: 'iPLAS Score', sortable: true, style: { width: '9rem' } },
]

const breakdownScoringType = computed(() => {
  if (!breakdownItem.value) return 'N/A'
  return breakdownSource.value === 'upload'
    ? breakdownItem.value.upload_scoring_type || 'symmetrical'
    : breakdownItem.value.iplas_scoring_type || 'symmetrical'
})

const breakdownTarget = computed<number | null>(() => {
  if (!breakdownItem.value) return null
  return (
    breakdownSource.value === 'upload'
      ? breakdownItem.value.upload_target
      : breakdownItem.value.iplas_target
  ) ?? null
})

const breakdownDeviation = computed<number | null>(() => {
  if (!breakdownItem.value) return null
  return (
    breakdownSource.value === 'upload'
      ? breakdownItem.value.upload_deviation
      : breakdownItem.value.iplas_deviation
  ) ?? null
})

const comparisonItems = computed<ComparisonItem[]>(() => {
  const items: ComparisonItem[] = []
  const uploadItemMap = new Map<string, ParsedTestItemEnhanced>()
  const iplasItemMap = new Map<string, IplasIsnTestItem>()
  const processedKeys = new Set<string>()

  props.uploadTestItems.forEach((item) => {
    uploadItemMap.set(item.test_item.toLowerCase(), item)
  })

  iplasTestItems.value.forEach((item) => {
    iplasItemMap.set(item.NAME.toLowerCase(), item)
  })

  const buildComparisonItem = (testItemKey: string): ComparisonItem => {
    const uploadItem = uploadItemMap.get(testItemKey)
    const iplasItem = iplasItemMap.get(testItemKey)

    let status: ComparisonItem['status']
    if (uploadItem && iplasItem) {
      status = 'match'
    } else if (uploadItem) {
      status = 'upload-only'
    } else {
      status = 'iplas-only'
    }

    const uploadScored = uploadScoredMap.value.get(testItemKey)
    const iplasScored = iplasScoredMap.value.get(testItemKey)

    return {
      test_item: uploadItem?.test_item || iplasItem?.NAME || testItemKey,
      usl: uploadItem?.usl ?? (iplasItem?.UCL ? parseFloat(iplasItem.UCL) : null),
      lsl: uploadItem?.lsl ?? (iplasItem?.LCL ? parseFloat(iplasItem.LCL) : null),
      upload_value: uploadItem?.value ?? null,
      iplas_value: iplasItem?.VALUE ?? null,
      upload_score: uploadScored?.score ?? uploadItem?.score ?? null,
      iplas_score: iplasScored?.score ?? null,
      upload_scoring_type: uploadScored?.scoring_type ?? 'symmetrical',
      iplas_scoring_type: iplasScored?.scoring_type ?? 'symmetrical',
      upload_target: uploadScored?.target ?? null,
      iplas_target: iplasScored?.target ?? null,
      upload_deviation: uploadScored?.deviation ?? null,
      iplas_deviation: iplasScored?.deviation ?? null,
      status,
    }
  }

  props.uploadTestItems.forEach((item) => {
    const key = item.test_item.toLowerCase()
    if (!processedKeys.has(key)) {
      processedKeys.add(key)
      items.push(buildComparisonItem(key))
    }
  })

  iplasTestItems.value.forEach((item) => {
    const key = item.NAME.toLowerCase()
    if (!processedKeys.has(key)) {
      processedKeys.add(key)
      items.push(buildComparisonItem(key))
    }
  })

  return items
})

const filteredComparisonItems = computed(() => {
  let items = comparisonItems.value

  if (comparisonFilter.value === 'match') {
    items = items.filter((item) => item.status === 'match')
  } else if (comparisonFilter.value === 'mismatch') {
    items = items.filter((item) => item.status === 'upload-only' || item.status === 'iplas-only')
  } else if (comparisonFilter.value === 'upload-only') {
    items = items.filter((item) => item.status === 'match' || item.status === 'upload-only')
  } else if (comparisonFilter.value === 'iplas-only') {
    items = items.filter((item) => item.status === 'match' || item.status === 'iplas-only')
  }

  if (typeFilter.value === 'criteria') {
    items = items.filter((item) => item.usl !== null || item.lsl !== null)
  } else if (typeFilter.value === 'non-criteria') {
    items = items.filter((item) => item.usl === null && item.lsl === null)
  }

  if (scoreFilter.value === 'gte9') {
    items = items.filter((item) => item.upload_score !== null && item.upload_score >= 9)
  } else if (scoreFilter.value === '7to9') {
    items = items.filter((item) => item.upload_score !== null && item.upload_score >= 7 && item.upload_score < 9)
  } else if (scoreFilter.value === 'lt7') {
    items = items.filter((item) => item.upload_score !== null && item.upload_score < 7)
  } else if (scoreFilter.value === 'hasScore') {
    items = items.filter((item) => item.upload_score !== null)
  } else if (scoreFilter.value === 'noScore') {
    items = items.filter((item) => item.upload_score === null)
  }

  if (searchQuery.value) {
    try {
      const regex = new RegExp(searchQuery.value, 'i')
      items = items.filter((item) => regex.test(item.test_item))
    } catch {
      const query = searchQuery.value.toLowerCase()
      items = items.filter((item) => item.test_item.toLowerCase().includes(query))
    }
  }

  return items
})

const matchCount = computed(() => comparisonItems.value.filter((item) => item.status === 'match').length)
const mismatchCount = computed(() => comparisonItems.value.filter((item) => item.status === 'upload-only' || item.status === 'iplas-only').length)
const uploadOnlyCount = computed(() => comparisonItems.value.filter((item) => item.status === 'match' || item.status === 'upload-only').length)
const iplasOnlyCount = computed(() => comparisonItems.value.filter((item) => item.status === 'match' || item.status === 'iplas-only').length)

const comparisonFilterOptions = computed(() => [
  { title: 'Match Items', value: 'match' as const, count: matchCount.value },
  { title: 'Mismatch Items', value: 'mismatch' as const, count: mismatchCount.value },
  { title: 'Uploaded Items', value: 'upload-only' as const, count: uploadOnlyCount.value },
  { title: 'iPLAS Items', value: 'iplas-only' as const, count: iplasOnlyCount.value },
  { title: 'All Items', value: 'all' as const, count: comparisonItems.value.length },
])

function showScoreBreakdown(item: ComparisonItem, source: 'upload' | 'iplas') {
  breakdownItem.value = item
  breakdownSource.value = source
  showBreakdownDialog.value = true
}

function formatOverallScore(score: number | null): string {
  return score === null ? 'N/A' : score.toFixed(2)
}

async function rescoreAllItems() {
  if (localScoringConfigs.value.length === 0) return

  const explicitlyConfigured = new Set(localScoringConfigs.value.map((config) => config.test_item_name))

  try {
    const uploadItems = props.uploadTestItems
      .filter((item) => {
        const hasCriteria = item.usl !== null || item.lsl !== null
        return hasCriteria || explicitlyConfigured.has(item.test_item)
      })
      .map((item) => ({
        test_item: item.test_item,
        value: item.value,
        usl: item.usl,
        lsl: item.lsl,
        status: 'PASS',
      }))

    if (uploadItems.length > 0) {
      const uploadResult = await rescoreItems(uploadItems, localScoringConfigs.value)
      uploadScoredMap.value.clear()
      uploadResult.test_item_scores.forEach((score) => {
        uploadScoredMap.value.set(score.test_item.toLowerCase(), score)
      })
      uploadOverallScore.value = uploadResult.overall_score
    } else {
      uploadScoredMap.value.clear()
      uploadOverallScore.value = null
    }

    const iplasItems = iplasTestItems.value
      .filter((item) => {
        const hasCriteria = (item.UCL && item.UCL !== '') || (item.LCL && item.LCL !== '')
        return hasCriteria || explicitlyConfigured.has(item.NAME)
      })
      .map((item) => ({
        test_item: item.NAME,
        value: item.VALUE,
        usl: item.UCL ? parseFloat(item.UCL) : null,
        lsl: item.LCL ? parseFloat(item.LCL) : null,
        status: item.STATUS || 'PASS',
      }))

    if (iplasItems.length > 0) {
      const iplasResult = await rescoreItems(iplasItems, localScoringConfigs.value)
      iplasScoredMap.value.clear()
      iplasResult.test_item_scores.forEach((score) => {
        iplasScoredMap.value.set(score.test_item.toLowerCase(), score)
      })
      iplasOverallScore.value = iplasResult.overall_score
    } else {
      iplasScoredMap.value.clear()
      iplasOverallScore.value = null
    }
  } catch (error) {
    console.error('Failed to rescore items:', error)
    uploadOverallScore.value = null
    iplasOverallScore.value = null
  }
}

watch(dialogOpen, (isOpen) => {
  if (!isOpen) {
    isFullscreen.value = false
    breakdownFullscreen.value = false
    showBreakdownDialog.value = false
  }
})

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen && props.isn) {
      loading.value = true
      errorMessage.value = null
      iplasTestItems.value = []
      uploadScoredMap.value.clear()
      iplasScoredMap.value.clear()
      uploadOverallScore.value = null
      iplasOverallScore.value = null
      searchQuery.value = ''
      typeFilter.value = 'all'
      scoreFilter.value = 'all'
      comparisonFilter.value = 'match'

      try {
        const results = await searchByIsn(props.isn)
        if (results && results.length > 0) {
          const allItems: IplasIsnTestItem[] = []
          results.forEach((record) => {
            if (record.test_item) {
              allItems.push(...record.test_item)
            }
          })
          iplasTestItems.value = allItems
        }

        initializeScoringConfigs()
        await rescoreAllItems()
      } catch (error: unknown) {
        errorMessage.value = error instanceof Error ? error.message : 'Failed to fetch iPLAS data'
      } finally {
        loading.value = false
      }
    }
  },
)

function getScoreColor(score: number): string {
  if (score >= 9) return 'success'
  if (score >= 7) return 'info'
  if (score >= 6) return 'warning'
  return 'error'
}

async function exportToExcel() {
  exporting.value = true
  try {
    const exportData = filteredComparisonItems.value.map((item) => ({
      'Test Item': item.test_item,
      UCL: item.usl ?? '',
      LCL: item.lsl ?? '',
      'Uploaded Value': item.upload_value ?? '',
      'iPLAS Value': item.iplas_value ?? '',
      'Uploaded Score': item.upload_score ?? '',
      'iPLAS Score': item.iplas_score ?? '',
      Status: item.status,
    }))

    const ExcelJS = await import('exceljs')
    const workbook = new (ExcelJS.default || ExcelJS).Workbook()
    const worksheet = workbook.addWorksheet(props.isn || 'Comparison')

    if (exportData.length > 0) {
      const rows = exportData as Array<Record<string, unknown>>
      const headers = Object.keys(rows[0] ?? {})
      worksheet.addRow(headers)
      rows.forEach((item) => {
        worksheet.addRow(headers.map((header) => item[header] ?? ''))
      })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `iPLAS_Compare_${props.isn}_${timestamp}.xlsx`

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error: unknown) {
    console.error('Export failed:', error)
    errorMessage.value = `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
  } finally {
    exporting.value = false
  }
}

function scorePillClass(color: string) {
  switch (color) {
    case 'success':
      return 'iplas-compare-dialog__score-pill--success'
    case 'info':
      return 'iplas-compare-dialog__score-pill--info'
    case 'warning':
      return 'iplas-compare-dialog__score-pill--warning'
    default:
      return 'iplas-compare-dialog__score-pill--error'
  }
}

function comparisonRowClass(row: Record<string, unknown>) {
  const status = String(row.status || '')
  if (status === 'upload-only' || status === 'iplas-only') {
    return 'iplas-compare-dialog__row--mismatch'
  }
  return undefined
}
</script>

<style scoped>
.iplas-compare-dialog__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.iplas-compare-dialog__header-copy {
  display: flex;
  gap: 0.85rem;
}

.iplas-compare-dialog__header-icon {
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.iplas-compare-dialog__eyebrow {
  margin: 0 0 0.3rem;
  color: var(--app-accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.iplas-compare-dialog__header h2 {
  margin: 0;
  font-size: 1.35rem;
}

.iplas-compare-dialog__header p:last-child {
  margin: 0.35rem 0 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.iplas-compare-dialog__header-actions,
.iplas-compare-dialog__action-row,
.iplas-compare-dialog__chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.iplas-compare-dialog__body {
  display: grid;
  gap: 1rem;
}

.iplas-compare-dialog__body--fullscreen {
  min-height: calc(100vh - 12rem);
}

.iplas-compare-dialog__controls,
.iplas-compare-dialog__summary-grid,
.iplas-compare-dialog__breakdown-grid {
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
}

.iplas-compare-dialog__field {
  display: grid;
  gap: 0.45rem;
}

.iplas-compare-dialog__field--wide {
  grid-column: span 2;
}

.iplas-compare-dialog__field--actions {
  justify-content: end;
}

.iplas-compare-dialog__field span {
  color: var(--app-ink);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.iplas-compare-dialog__field input,
.iplas-compare-dialog__field select {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.95rem;
  padding: 0.75rem 0.9rem;
  background: var(--app-panel);
  color: var(--app-ink);
}

.iplas-compare-dialog__button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 999px;
  padding: 0.7rem 1rem;
  font-weight: 700;
  cursor: pointer;
}

.iplas-compare-dialog__button--ghost {
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-ink);
}

.iplas-compare-dialog__button--primary {
  border: 1px solid rgba(15, 118, 110, 0.1);
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.95), rgba(40, 96, 163, 0.92));
  color: #fff;
}

.iplas-compare-dialog__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  background: var(--app-panel);
  color: var(--app-ink);
  cursor: pointer;
}

.iplas-compare-dialog__chip--active {
  border-color: rgba(15, 118, 110, 0.35);
  background: rgba(15, 118, 110, 0.1);
}

.iplas-compare-dialog__summary-card {
  display: grid;
  gap: 0.35rem;
  border: 1px solid var(--app-border);
  border-radius: 1.1rem;
  padding: 1rem;
  background: var(--app-panel);
}

.iplas-compare-dialog__summary-card--primary {
  background: linear-gradient(145deg, rgba(40, 96, 163, 0.14), var(--app-panel));
}

.iplas-compare-dialog__summary-card--secondary {
  background: linear-gradient(145deg, rgba(15, 118, 110, 0.12), var(--app-panel));
}

.iplas-compare-dialog__summary-card small,
.iplas-compare-dialog__muted,
.iplas-compare-dialog__item-cell small,
.iplas-compare-dialog__empty-state p,
.iplas-compare-dialog__notice p {
  color: var(--app-muted);
}

.iplas-compare-dialog__summary-card strong,
.iplas-compare-dialog__detail-row strong,
.iplas-compare-dialog__item-cell strong {
  color: var(--app-ink);
}

.iplas-compare-dialog__item-cell {
  display: grid;
  gap: 0.2rem;
}

.iplas-compare-dialog__score-pill {
  border: 0;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-weight: 700;
  cursor: pointer;
}

.iplas-compare-dialog__score-pill--success {
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.iplas-compare-dialog__score-pill--info {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.iplas-compare-dialog__score-pill--warning {
  background: rgba(184, 118, 38, 0.16);
  color: #8f5314;
}

.iplas-compare-dialog__score-pill--error {
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

.iplas-compare-dialog__empty-state,
.iplas-compare-dialog__notice {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  padding: 2rem 1rem;
  text-align: center;
  border: 1px solid var(--app-border);
  border-radius: 1.25rem;
}

.iplas-compare-dialog__notice--error {
  background: rgba(189, 64, 64, 0.08);
}

.iplas-compare-dialog__notice--warning {
  background: rgba(184, 118, 38, 0.1);
}

.iplas-compare-dialog__detail-table {
  display: grid;
  grid-column: 1 / -1;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  overflow: hidden;
}

.iplas-compare-dialog__detail-row {
  display: grid;
  grid-template-columns: minmax(10rem, 14rem) 1fr;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-top: 1px solid var(--app-border);
  background: var(--app-panel);
}

.iplas-compare-dialog__detail-row:first-child {
  border-top: 0;
}

.iplas-compare-dialog__detail-row span {
  color: var(--app-muted);
  font-weight: 600;
}

.iplas-compare-dialog__row--mismatch :deep(td) {
  background: rgba(184, 118, 38, 0.06);
}

.iplas-compare-dialog__spin {
  animation: iplas-compare-dialog-spin 1s linear infinite;
}

@keyframes iplas-compare-dialog-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 960px) {
  .iplas-compare-dialog__header,
  .iplas-compare-dialog__header-copy {
    flex-direction: column;
    align-items: stretch;
  }

  .iplas-compare-dialog__field--wide {
    grid-column: span 1;
  }

  .iplas-compare-dialog__detail-row {
    grid-template-columns: 1fr;
  }
}
</style>