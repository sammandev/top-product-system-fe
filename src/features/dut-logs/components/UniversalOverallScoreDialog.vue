<template>
  <AppDialog
    v-model="dialogOpen"
    width="min(94vw, 56rem)"
    :breakpoints="dialogBreakpoints"
    :showFooter="false"
    :title="dialogTitle"
    :description="dialogDescription"
    class="universal-overall-score-dialog"
  >
    <div class="universal-overall-score__body">
      <section class="universal-overall-score__explanation-card">
        <div v-if="sourceName" class="universal-overall-score__source-header">
          <small>Source</small>
          <strong>{{ sourceName }}</strong>
        </div>
        <div class="universal-overall-score__formula-panel">
          <div class="universal-overall-score__metric-label">Weighted Average Formula</div>
          <div class="universal-overall-score__formula-equation">
            Overall Score = &Sigma;(Score_i &times; Weight_i&sup2;) / &Sigma;(Weight_i&sup2;)
          </div>
          <p class="universal-overall-score__formula-note">
            Each scored test item receives a score from 0.0 to 10.0. Items with custom weights contribute proportionally.
            Items without limits or disabled items are excluded from the aggregate.
          </p>
        </div>
      </section>

      <dl class="universal-overall-score__metrics-grid">
        <div>
          <dt>Total Scored Items</dt>
          <dd>{{ stats.scoredCount }}</dd>
        </div>
        <div>
          <dt>Total Score Sum</dt>
          <dd>{{ stats.scoreSum.toFixed(2) }}</dd>
        </div>
        <div>
          <dt>Weighted Sum</dt>
          <dd>{{ stats.weightedSum.toFixed(2) }}</dd>
        </div>
        <div>
          <dt>Total Weight</dt>
          <dd>{{ stats.weightSum.toFixed(2) }}</dd>
        </div>
        <div class="universal-overall-score__metric-highlight">
          <dt>{{ hasForcedFail ? 'Overall Score (Forced Fail)' : 'Overall Score' }}</dt>
          <dd>{{ formatOverallScore(effectiveOverallScore) }}</dd>
        </div>
      </dl>

      <div class="universal-overall-score__calculation-line">
        {{ stats.weightedSum.toFixed(2) }} / {{ stats.weightSum.toFixed(2) }} =
        <strong>{{ formatOverallScore(effectiveOverallScore) }}</strong>
      </div>

      <div class="universal-overall-score__search-shell">
        <input
          v-model="searchQuery"
          type="search"
          class="app-themed-input universal-overall-score__search-input"
          placeholder="Search scored test items..."
        />
      </div>

      <AppDataGrid
        :columns="gridColumns"
        :rows="filteredItems"
        dataKey="test_item"
        paginator
        :rowsPerPage="10"
        :rowsPerPageOptions="[10, 25, 50]"
        scrollHeight="20rem"
        emptyMessage="No test items found."
      >
        <template #cell-test_item="{ data }">
          <span class="font-mono font-medium">{{ data.test_item }}</span>
        </template>
        <template #cell-value="{ data }">
          <span class="font-mono">{{ data.value ?? '-' }}</span>
        </template>
        <template #cell-usl="{ data }">
          <span class="font-mono text-muted">{{ data.usl ?? '-' }}</span>
        </template>
        <template #cell-lsl="{ data }">
          <span class="font-mono text-muted">{{ data.lsl ?? '-' }}</span>
        </template>
        <template #cell-weight="{ data }">
          <span class="font-mono">{{ (data.weight ?? 1.0).toFixed(2) }}</span>
        </template>
        <template #cell-score="{ data }">
          <button
            v-if="data.score !== null && data.score !== undefined"
            type="button"
            class="universal-overall-score__score-pill cursor-pointer border-0"
            :class="scorePillClass(data.score)"
            title="Click to view score breakdown"
            @click="handleItemClick(data)"
          >
            {{ Number(data.score).toFixed(2) }}
          </button>
          <span v-else class="text-muted">-</span>
        </template>
      </AppDataGrid>

      <div class="universal-overall-score__footer-actions">
        <button
          type="button"
          class="universal-overall-score__button universal-overall-score__button--ghost"
          @click="dialogOpen = false"
        >
          Close
        </button>
      </div>
    </div>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { AppDataGrid, AppDialog } from '@/shared'

export interface OverallScoreContributorItem {
  test_item: string
  value?: string | number | null
  usl?: number | null
  lsl?: number | null
  weight?: number | null
  score?: number | null
  rawItem?: unknown
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    description?: string
    sourceName?: string
    score?: number | null
    items: OverallScoreContributorItem[]
    hasForcedFail?: boolean
  }>(),
  {
    title: 'Overall Score Breakdown',
    description:
      'Detailed explanation of how the overall score is aggregated across all scored test items.',
    sourceName: '',
    score: null,
    hasForcedFail: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'click-item': [item: OverallScoreContributorItem]
}>()

const searchQuery = ref('')

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const dialogBreakpoints = {
  '1400px': '96vw',
  '960px': '98vw',
  '640px': '100vw',
}

const dialogTitle = computed(() => props.title || 'Overall Score Breakdown')
const dialogDescription = computed(
  () =>
    props.description ||
    'Detailed explanation of how the overall score is aggregated across all scored test items.',
)

const contributingItems = computed(() => {
  return props.items.filter((item) => item.score !== null && item.score !== undefined)
})

const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) {
    return contributingItems.value
  }
  return contributingItems.value.filter((item) => item.test_item.toLowerCase().includes(query))
})

const stats = computed(() => {
  const list = contributingItems.value
  if (list.length === 0) {
    return {
      scoredCount: 0,
      scoreSum: 0,
      weightedSum: 0,
      weightSum: 1,
    }
  }

  let scoreSum = 0
  let weightedSum = 0
  let weightSum = 0

  list.forEach((item) => {
    const sc = item.score ?? 0
    const w = item.weight ?? 1.0
    const effWeight = w * w
    scoreSum += sc
    weightedSum += sc * effWeight
    weightSum += effWeight
  })

  return {
    scoredCount: list.length,
    scoreSum,
    weightedSum,
    weightSum: weightSum > 0 ? weightSum : 1,
  }
})

const effectiveOverallScore = computed<number | null>(() => {
  if (props.score !== null && props.score !== undefined) {
    return props.score
  }
  if (stats.value.scoredCount === 0) {
    return null
  }
  return stats.value.weightedSum / stats.value.weightSum
})

function formatOverallScore(val: number | null): string {
  if (val === null || val === undefined) return 'N/A'
  return val.toFixed(2)
}

function scorePillClass(score: number): string {
  if (score >= 9) return 'universal-overall-score__score-pill--success'
  if (score >= 7) return 'universal-overall-score__score-pill--info'
  if (score >= 6) return 'universal-overall-score__score-pill--warning'
  return 'universal-overall-score__score-pill--error'
}

function handleItemClick(item: OverallScoreContributorItem) {
  emit('click-item', item)
}

const gridColumns = [
  {
    key: 'test_item',
    field: 'test_item',
    header: 'Test Item',
    sortable: true,
    style: { width: '18rem' },
  },
  { key: 'value', field: 'value', header: 'Value', sortable: true, style: { width: '8rem' } },
  { key: 'usl', field: 'usl', header: 'UCL', sortable: true, style: { width: '7rem' } },
  { key: 'lsl', field: 'lsl', header: 'LCL', sortable: true, style: { width: '7rem' } },
  { key: 'weight', field: 'weight', header: 'Weight', sortable: true, style: { width: '6rem' } },
  { key: 'score', field: 'score', header: 'Score', sortable: true, style: { width: '8rem' } },
]
</script>

<style scoped>
.universal-overall-score__body {
  display: grid;
  gap: 1rem;
}

.universal-overall-score__explanation-card {
  display: grid;
  gap: 0.5rem;
}

.universal-overall-score__source-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.universal-overall-score__source-header small {
  color: var(--app-muted);
  font-size: 0.8rem;
}

.universal-overall-score__source-header strong {
  color: var(--app-ink);
}

.universal-overall-score__formula-panel {
  display: grid;
  gap: 0.35rem;
  padding: 0.8rem;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 0.5rem;
}

.universal-overall-score__metric-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--app-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.universal-overall-score__formula-equation {
  font-family: monospace;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--app-ink);
  margin-bottom: 0.25rem;
}

.universal-overall-score__formula-note {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: var(--app-muted);
  line-height: 1.4;
}

.universal-overall-score__metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.75rem;
  margin: 0;
  padding: 0.85rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: 0.5rem;
  background: var(--app-surface);
}

.universal-overall-score__metrics-grid dt {
  font-size: 0.72rem;
  color: var(--app-muted);
  text-transform: uppercase;
}

.universal-overall-score__metrics-grid dd {
  margin: 0.25rem 0 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--app-ink);
}

.universal-overall-score__metric-highlight dd {
  color: var(--app-accent);
}

.universal-overall-score__calculation-line {
  padding: 0.6rem 0.8rem;
  border-radius: 0.35rem;
  background: var(--app-surface);
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--app-ink);
  text-align: center;
  border: 1px solid var(--app-border);
}

.universal-overall-score__search-shell {
  margin-top: 0.25rem;
}

.universal-overall-score__search-input {
  width: 100%;
}

.universal-overall-score__score-pill {
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.universal-overall-score__score-pill--success {
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.universal-overall-score__score-pill--info {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.universal-overall-score__score-pill--warning {
  background: rgba(184, 118, 38, 0.16);
  color: #8f5314;
}

.universal-overall-score__score-pill--error {
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

.universal-overall-score__footer-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.universal-overall-score__button {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-ink);
}
</style>
