<template>
  <DefaultLayout>
    <section class="activity-page">
      <header class="activity-hero">
        <div>
          <p class="activity-eyebrow">History</p>
          <h1 class="activity-title">Activity History</h1>
          <p class="activity-lead">
            Review analysis output, filter by time window, and inspect DUT execution signals.
          </p>
        </div>

        <Button :disabled="loading" :loading="loading" severity="secondary" @click="loadActivities(1)">
          <span class="activity-button-content">
            <Icon icon="mdi:refresh" />
            <span>Refresh feed</span>
          </span>
        </Button>
      </header>

      <section class="activity-panel activity-filters">
        <div class="activity-panel__header">
          <div>
            <p class="activity-panel__eyebrow">Filters</p>
            <h2 class="activity-panel__title">Narrow the activity window</h2>
          </div>
        </div>

        <div class="activity-filters__grid">
          <label class="activity-field">
            <span>Time range</span>
            <AppSelect v-model="timeRangeType" :options="timeRangeSelectOptions" :searchable="false" @change="onTimeRangeChange" />
          </label>

          <label v-if="timeRangeType === 'custom'" class="activity-field">
            <span>Start date</span>
            <input v-model="customStartDate" type="date" @change="onCustomDateChange" />
          </label>

          <label v-if="timeRangeType === 'custom'" class="activity-field">
            <span>End date</span>
            <input v-model="customEndDate" type="date" @change="onCustomDateChange" />
          </label>

          <label class="activity-field">
            <span>Search</span>
            <input v-model="searchQuery" placeholder="Search title, ISN, station, device" type="text" @input="onSearchChange" />
          </label>

          <label class="activity-field">
            <span>Sort</span>
            <AppSelect v-model="sortOrder" :options="sortSelectOptions" :searchable="false" @change="loadActivities(1)" />
          </label>

          <label class="activity-field">
            <span>Items per page</span>
            <AppSelect v-model="pageSize" :options="pageSizeSelectOptions" :searchable="false" @change="loadActivities(1)" />
          </label>
        </div>
      </section>

      <div v-if="error" class="activity-alert" role="status">
        <Icon icon="mdi:alert-circle-outline" />
        <span>{{ error }}</span>
      </div>

      <section class="activity-panel">
        <div class="activity-panel__header activity-panel__header--split">
          <div>
            <p class="activity-panel__eyebrow">Timeline</p>
            <h2 class="activity-panel__title">{{ total.toLocaleString() }} recorded activities</h2>
          </div>

          <div class="activity-loading" :class="{ 'is-visible': loading }">
            <span class="activity-loading__dot" />
            <span>{{ loading ? 'Updating' : 'Stable' }}</span>
          </div>
        </div>

        <div v-if="!activities.length && !loading" class="activity-empty">
          <Icon icon="mdi:timeline-alert-outline" />
          <div>
            <h3>No activities matched the current filters</h3>
            <p>Try widening the time window or clearing the search term.</p>
          </div>
        </div>

        <ol v-else class="activity-list">
          <li
            v-for="activity in activities"
            :key="activity.id"
            class="activity-item"
            :style="activityVars(activity)"
          >
            <div class="activity-item__rail">
              <span class="activity-item__marker">
                <Icon :icon="normalizeIcon(getActivityIcon(activity))" />
              </span>
              <span class="activity-item__line" />
            </div>

            <article class="activity-item__card">
              <div class="activity-item__top-row">
                <div>
                  <p class="activity-item__title">{{ activity.title }}</p>
                  <p class="activity-item__timestamp">
                    {{ formatDateShort(activity.timestamp) }}, {{ formatTime(activity.timestamp) }}
                  </p>
                </div>

                <span class="activity-item__badge">{{ badgeLabel(activity) }}</span>
              </div>

              <div class="activity-chip-row">
                <span v-if="activity.dut_isn" class="activity-chip">
                  <Icon icon="mdi:barcode" />
                  {{ activity.dut_isn }}
                </span>
                <span v-if="activity.station_name" class="activity-chip">
                  <Icon icon="mdi:access-point" />
                  {{ activity.station_name }}
                </span>
                <span v-if="activity.device_name" class="activity-chip">
                  <Icon icon="mdi:devices" />
                  {{ activity.device_name }}
                </span>
              </div>

              <div class="activity-chip-row">
                <span v-if="activity.score !== null" class="activity-chip activity-chip--strong">
                  <Icon icon="mdi:star-four-points" />
                  Score {{ activity.score.toFixed(2) }}
                </span>
                <span v-if="activity.pass_count !== null" class="activity-chip">
                  <Icon icon="mdi:check-circle-outline" />
                  {{ activity.pass_count }} pass
                </span>
                <span v-if="activity.fail_count !== null && activity.fail_count > 0" class="activity-chip">
                  <Icon icon="mdi:close-circle-outline" />
                  {{ activity.fail_count }} fail
                </span>
              </div>

              <p v-if="activity.test_date" class="activity-item__meta">
                <Icon icon="mdi:calendar-clock-outline" />
                Test date {{ formatDateShort(activity.test_date) }} - {{ formatTime(activity.test_date) }}
              </p>
            </article>
          </li>
        </ol>

        <div v-if="totalPages > 1" class="activity-pagination">
          <button :disabled="currentPage <= 1 || loading" type="button" @click="loadActivities(currentPage - 1)">
            Previous
          </button>
          <button
            v-for="page in visiblePages"
            :key="page"
            :class="{ 'is-active': page === currentPage }"
            :disabled="loading"
            type="button"
            @click="loadActivities(page)"
          >
            {{ page }}
          </button>
          <button :disabled="currentPage >= totalPages || loading" type="button" @click="loadActivities(currentPage + 1)">
            Next
          </button>
        </div>
      </section>
    </section>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import Button from 'primevue/button'
import { computed, ref } from 'vue'
import apiClient from '@/core/api/client'
import { queryKeys } from '@/core/query'
import { AppSelect } from '@/shared/ui'
import { getApiErrorDetail } from '@/shared/utils'

interface Activity {
  id: number
  title: string
  description: string
  timestamp: string
  activity_type: string
  dut_isn: string | null
  station_name: string | null
  device_name: string | null
  score: number | null
  pass_count: number | null
  fail_count: number | null
  test_date: string | null
}

interface ActivityListResponse {
  total: number
  activities: Activity[]
  page: number
  page_size: number
  total_pages: number
}

const currentPage = ref(1)
const pageSize = ref(20)

// Time range filters
const timeRangeType = ref<string | number>(30) // default to 30 days
const customStartDate = ref('')
const customEndDate = ref('')

// Search and sort
const searchQuery = ref('')
const sortOrder = ref('newest')

let searchDebounce: number | undefined

// Filter options
const timeRangeOptions = [
  { title: 'Last 7 days', value: 7 },
  { title: 'Last 30 days', value: 30 },
  { title: 'Last 90 days', value: 90 },
  { title: 'Last 6 months', value: 180 },
  { title: 'Last year', value: 365 },
  { title: 'Custom Range', value: 'custom' },
]

const sortOptions = [
  { title: 'Newest First', value: 'newest' },
  { title: 'Oldest First', value: 'oldest' },
]

const pageSizeOptions = [
  { title: '10', value: 10 },
  { title: '20', value: 20 },
  { title: '50', value: 50 },
  { title: '100', value: 100 },
]

const timeRangeSelectOptions = timeRangeOptions.map((option) => ({
  label: option.title,
  value: option.value,
}))

const sortSelectOptions = sortOptions.map((option) => ({
  label: option.title,
  value: option.value,
}))

const pageSizeSelectOptions = pageSizeOptions.map((option) => ({
  label: option.title,
  value: option.value,
}))

const activityParams = computed(() => {
  const params: Record<string, string | number> = {
    page: currentPage.value,
    page_size: pageSize.value,
    sort_order: sortOrder.value,
  }

  if (timeRangeType.value === 'custom' && customStartDate.value && customEndDate.value) {
    params.start_date = new Date(customStartDate.value).toISOString()
    params.end_date = new Date(`${customEndDate.value}T23:59:59`).toISOString()
  } else if (typeof timeRangeType.value === 'number') {
    params.days = timeRangeType.value
  }

  if (searchQuery.value.trim()) {
    params.search = searchQuery.value.trim()
  }

  return params
})

const activitiesQuery = useQuery({
  queryKey: computed(() => queryKeys.activity.list({ ...activityParams.value })),
  queryFn: async () => {
    const response = await apiClient.get<ActivityListResponse>('/api/dashboard/activity/list', {
      params: activityParams.value,
    })
    return response.data
  },
  placeholderData: keepPreviousData,
})

const loading = computed(() => activitiesQuery.isFetching.value)
const error = computed(() =>
  activitiesQuery.error.value
    ? getApiErrorDetail(activitiesQuery.error.value, 'Failed to load activities')
    : null,
)
const activities = computed<Activity[]>(() => activitiesQuery.data.value?.activities ?? [])
const total = computed(() => activitiesQuery.data.value?.total ?? 0)
const totalPages = computed(() => activitiesQuery.data.value?.total_pages ?? 0)

const visiblePages = computed(() => {
  const pageWindow = 7
  const start = Math.max(1, currentPage.value - Math.floor(pageWindow / 2))
  const end = Math.min(totalPages.value, start + pageWindow - 1)
  const normalizedStart = Math.max(1, end - pageWindow + 1)

  return Array.from({ length: end - normalizedStart + 1 }, (_, index) => normalizedStart + index)
})

// Methods
function onTimeRangeChange() {
  if (timeRangeType.value === 'custom') {
    // Set default dates (last 30 days)
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    const endStr = end.toISOString().split('T')[0]
    const startStr = start.toISOString().split('T')[0]
    customEndDate.value = endStr || ''
    customStartDate.value = startStr || ''
  } else {
    loadActivities(1)
  }
}

function onCustomDateChange() {
  if (customStartDate.value && customEndDate.value) {
    loadActivities(1)
  }
}

function onSearchChange() {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    loadActivities(1)
  }, 500) as unknown as number
}

async function loadActivities(page?: number) {
  if (page !== undefined) {
    const previousPage = currentPage.value
    currentPage.value = page
    if (page !== previousPage) {
      return
    }
  }

  await activitiesQuery.refetch()
}

function getActivityIcon(activity: Activity): string {
  if (activity.title.includes('PASS')) return 'mdi-check-circle'
  if (activity.title.includes('FAIL')) return 'mdi-alert-circle'
  if (activity.title.includes('ANALYZED')) return 'mdi-chart-box'
  return 'mdi-chart-line'
}

function getActivityColor(activity: Activity): string {
  if (activity.title.includes('PASS')) return 'success'
  if (activity.title.includes('FAIL')) return 'error'
  if (activity.title.includes('ANALYZED')) return 'primary'
  return 'info'
}

function normalizeIcon(icon: string): string {
  return icon.startsWith('mdi-') ? `mdi:${icon.slice(4)}` : icon
}

function activityVars(activity: Activity) {
  const color = getActivityColor(activity)
  const palette = {
    success: { solid: '#2f7f59', soft: 'rgba(47, 127, 89, 0.14)', line: 'rgba(47, 127, 89, 0.24)' },
    error: { solid: '#a33d2d', soft: 'rgba(163, 61, 45, 0.14)', line: 'rgba(163, 61, 45, 0.24)' },
    primary: {
      solid: '#0f766e',
      soft: 'rgba(15, 118, 110, 0.14)',
      line: 'rgba(15, 118, 110, 0.24)',
    },
    info: { solid: '#2b6a88', soft: 'rgba(43, 106, 136, 0.14)', line: 'rgba(43, 106, 136, 0.24)' },
  } as const
  const resolved = palette[color as keyof typeof palette] ?? palette.primary
  return {
    '--activity-accent': resolved.solid,
    '--activity-accent-soft': resolved.soft,
    '--activity-accent-line': resolved.line,
  }
}

function badgeLabel(activity: Activity) {
  if (activity.title.includes('PASS')) return 'PASS'
  if (activity.title.includes('FAIL')) return 'FAIL'
  if (activity.title.includes('ANALYZED')) return 'ANALYZED'
  return 'EVENT'
}

function getScoreColor(score: number): string {
  if (score >= 9) return 'success'
  if (score >= 7) return 'primary'
  if (score >= 5) return 'warning'
  return 'error'
}

function getIsnColor(isn: string): string {
  // Generate consistent color based on ISN hash
  const colors = ['primary', 'info', 'lime', 'cyan']
  const hash = isn.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length] as string
}

function getStationColor(station: string): string {
  // Generate consistent color based on station name hash
  const colors = ['indigo', 'teal', 'light-green', 'green', 'blue', 'light-blue']
  const hash = station.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length] as string
}

function formatDateShort(timestamp: string): string {
  const date = new Date(timestamp)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.activity-page {
  display: grid;
  gap: 1.25rem;
}

.activity-hero,
.activity-panel,
.activity-item__card,
.activity-item__marker {
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  box-shadow: var(--app-shadow-soft);
}

.activity-hero,
.activity-panel,
.activity-item__card {
  border-radius: 0.5rem;
}

.activity-hero,
.activity-panel__header,
.activity-item__top-row,
.activity-pagination,
.activity-button-content,
.activity-loading,
.activity-chip-row,
.activity-item__meta,
.activity-empty {
  display: flex;
}

.activity-hero,
.activity-panel__header,
.activity-item__top-row,
.activity-pagination,
.activity-button-content,
.activity-loading,
.activity-chip-row,
.activity-empty {
  align-items: center;
}

.activity-hero,
.activity-panel__header,
.activity-item__top-row,
.activity-pagination {
  justify-content: space-between;
}

.activity-hero,
.activity-panel {
  padding: 1.35rem;
}

.activity-hero {
  gap: 1rem;
  background:
    radial-gradient(circle at top right, rgba(15, 118, 110, 0.08), transparent 34%),
    radial-gradient(circle at bottom left, rgba(45, 212, 191, 0.08), transparent 28%),
    var(--app-panel);
}

.activity-eyebrow,
.activity-panel__eyebrow,
.activity-field span,
.activity-item__timestamp,
.activity-item__meta,
.activity-item__badge,
.activity-loading {
  margin: 0;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  color: var(--app-muted);
}

.activity-title,
.activity-panel__title,
.activity-item__title {
  margin: 0;
  color: var(--app-ink);
}

.activity-title,
.activity-panel__title {
  font-family: var(--app-display);
}

.activity-title {
  margin-top: 0.35rem;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.02;
}

.activity-lead {
  margin: 0.7rem 0 0;
  max-width: 46rem;
  color: var(--app-muted);
  line-height: 1.65;
}

.activity-panel__title {
  margin-top: 0.35rem;
  font-size: 1.45rem;
}

.activity-filters__grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.9rem;
}

.activity-field {
  display: grid;
  gap: 0.45rem;
}

.activity-field input,
.activity-field select {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.5rem;
  background: var(--app-panel);
  padding: 0.85rem 0.95rem;
  color: var(--app-ink);
  outline: none;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.activity-field input:focus,
.activity-field select:focus {
  border-color: var(--app-accent);
  box-shadow: 0 0 0 4px var(--app-ring);
}

.activity-alert {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid rgba(163, 61, 45, 0.24);
  border-radius: 0.5rem;
  background: var(--app-danger-soft);
  padding: 0.85rem 1rem;
  color: var(--app-danger);
}

.activity-loading {
  gap: 0.5rem;
}

.activity-loading__dot {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 999px;
  background: var(--app-accent);
  opacity: 0.35;
}

.activity-loading.is-visible .activity-loading__dot {
  animation: activity-pulse 1s ease-in-out infinite;
}

.activity-empty {
  gap: 0.9rem;
  border: 1px dashed var(--app-border);
  border-radius: 0.5rem;
  padding: 1.1rem;
  color: var(--app-muted);
}

.activity-empty h3,
.activity-empty p {
  margin: 0;
}

.activity-empty h3 {
  color: var(--app-ink);
  font-size: 1rem;
}

.activity-empty p {
  margin-top: 0.25rem;
}

.activity-list {
  display: grid;
  gap: 1rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}

.activity-item {
  display: grid;
  grid-template-columns: 2.5rem minmax(0, 1fr);
  gap: 1rem;
}

.activity-item__rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.activity-item__marker {
  display: inline-grid;
  width: 2.2rem;
  height: 2.2rem;
  place-items: center;
  border-radius: 999px;
  background: var(--activity-accent-soft);
  border-color: var(--activity-accent-line);
  color: var(--activity-accent);
}

.activity-item__line {
  width: 2px;
  flex: 1;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--activity-accent-line), transparent);
}

.activity-item__card {
  padding: 1rem 1.1rem;
  border-color: var(--activity-accent-line);
}

.activity-item__top-row {
  gap: 1rem;
}

.activity-item__title {
  font-size: 1rem;
  font-weight: 700;
}

.activity-item__timestamp {
  margin-top: 0.25rem;
}

.activity-item__badge,
.activity-chip {
  border-radius: 0.5rem;
  padding: 0.4rem 0.65rem;
  background: var(--activity-accent-soft);
  color: var(--activity-accent);
}

.activity-item__badge {
  white-space: nowrap;
}

.activity-chip-row {
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.8rem;
}

.activity-chip,
.activity-item__meta {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.activity-chip {
  font-size: 0.86rem;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}

.activity-chip--strong {
  font-weight: 700;
}

.activity-item__meta {
  margin-top: 0.9rem;
}

.activity-pagination {
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.activity-pagination button {
  border: 1px solid var(--app-border);
  border-radius: 0.5rem;
  background: var(--app-panel);
  padding: 0.65rem 0.95rem;
  color: var(--app-ink);
  cursor: pointer;
  transition: border-color 0.16s ease, transform 0.16s ease;
}

.activity-pagination button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: var(--app-accent);
}

.activity-pagination button.is-active {
  border-color: var(--app-accent);
  background: var(--app-accent-soft);
  color: var(--app-accent);
}

.activity-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

@keyframes activity-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(1);
  }

  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

@media (max-width: 1100px) {
  .activity-filters__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .activity-hero,
  .activity-panel,
  .activity-item__card {
    padding: 1rem;
  }

  .activity-hero,
  .activity-panel__header,
  .activity-item__top-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .activity-filters__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .activity-item {
    grid-template-columns: 1.75rem minmax(0, 1fr);
    gap: 0.75rem;
  }
}
</style>
