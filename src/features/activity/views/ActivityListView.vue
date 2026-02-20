<template>
  <DefaultLayout>
    <!-- Header -->
    <div class="mb-6 d-flex justify-space-between align-center">
      <div>
        <h1 class="text-h4 font-weight-bold mb-2">Activity History</h1>
        <p class="text-body-2 text-medium-emphasis">
          View detailed history of all top product analyses and system activities
        </p>
      </div>
      <v-btn :loading="loading" :disabled="loading" color="primary" variant="tonal" prepend-icon="mdi-refresh"
        @click="loadActivities(1)">
        Refresh
      </v-btn>
    </div>

    <!-- Filters -->
    <v-card class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="2">
            <v-select v-model="timeRangeType" :items="timeRangeOptions" label="Time Range"
              prepend-inner-icon="mdi-calendar-range" variant="outlined" density="compact" hide-details
              @update:model-value="onTimeRangeChange" />
          </v-col>

          <!-- Custom Date Range -->
          <template v-if="timeRangeType === 'custom'">
            <v-col cols="12" md="3">
              <v-text-field v-model="customStartDate" label="Start Date" type="date"
                prepend-inner-icon="mdi-calendar-start" variant="outlined" density="compact" hide-details
                @update:model-value="onCustomDateChange" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="customEndDate" label="End Date" type="date" prepend-inner-icon="mdi-calendar-end"
                variant="outlined" density="compact" hide-details @update:model-value="onCustomDateChange" />
            </v-col>
          </template>

          <v-col cols="12" md="3">
            <v-text-field v-model="searchQuery" label="Search" prepend-inner-icon="mdi-magnify" variant="outlined"
              density="compact" clearable hide-details @update:model-value="onSearchChange" />
          </v-col>

          <v-col cols="12" md="2">
            <v-select v-model="sortOrder" :items="sortOptions" label="Sort" prepend-inner-icon="mdi-sort"
              variant="outlined" density="compact" hide-details @update:model-value="loadActivities(1)" />
          </v-col>

          <v-col cols="12" md="2">
            <v-select v-model="pageSize" :items="pageSizeOptions" label="Items" prepend-inner-icon="mdi-table-row"
              variant="outlined" density="compact" hide-details @update:model-value="loadActivities(1)" />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <v-overlay :model-value="loading && !activities.length" contained class="align-center justify-center">
      <v-progress-circular indeterminate size="64" color="primary" />
    </v-overlay>

    <!-- Error State -->
    <v-alert v-if="error" type="error" variant="tonal" class="mb-6">
      {{ error }}
    </v-alert>

    <!-- Activities List -->
    <v-card v-if="!loading || activities.length">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-history</v-icon>
        Activities ({{ total.toLocaleString() }} total)
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-4">
        <v-timeline align="start" density="compact" class="centered-timeline">
          <v-timeline-item v-for="activity in activities" :key="activity.id" :dot-color="getActivityColor(activity)"
            size="small" class="pb-3">
            <template v-slot:icon>
              <v-icon size="small">{{ getActivityIcon(activity) }}</v-icon>
            </template>

            <!-- Right side only: All content consolidated -->
            <div>
              <!-- Title with Analysis Date at the end -->
              <div class="d-flex align-center justify-space-between gap-3 mb-2">
                <span class="font-weight-bold text-body-1">{{ activity.title }}</span>
                <span class="text-body-2 text-medium-emphasis text-no-wrap">
                  {{ formatDateShort(activity.timestamp) }}, {{ formatTime(activity.timestamp) }}
                </span>
              </div>

              <!-- Content Line: ISN, Station, Device -->
              <div class="d-flex flex-wrap align-center gap-2 mb-2">
                <v-chip v-if="activity.dut_isn" size="small" :color="getIsnColor(activity.dut_isn)" variant="tonal">
                  <v-icon start size="small">mdi-barcode</v-icon>
                  {{ activity.dut_isn }}
                </v-chip>
                <v-chip v-if="activity.station_name" size="small" :color="getStationColor(activity.station_name)"
                  variant="tonal">
                  <v-icon start size="small">mdi-access-point</v-icon>
                  {{ activity.station_name }}
                </v-chip>
                <v-chip v-if="activity.device_name" size="small" color="default" variant="tonal">
                  <v-icon start size="small">mdi-devices</v-icon>
                  {{ activity.device_name }}
                </v-chip>
              </div>

              <!-- Score and Pass/Fail Line -->
              <div class="d-flex flex-wrap align-center gap-2 mb-2">
                <v-chip v-if="activity.score !== null" size="small" :color="getScoreColor(activity.score)" variant="flat">
                  <v-icon start size="small">mdi-star</v-icon>
                  Score: {{ activity.score.toFixed(2) }}
                </v-chip>
                <v-chip v-if="activity.pass_count !== null" size="small" color="success" variant="tonal">
                  <v-icon start size="small">mdi-check</v-icon>
                  {{ activity.pass_count }} pass
                </v-chip>
                <v-chip v-if="activity.fail_count !== null && activity.fail_count > 0" size="small" color="error"
                  variant="tonal">
                  <v-icon start size="small">mdi-close</v-icon>
                  {{ activity.fail_count }} fail
                </v-chip>
              </div>

              <!-- Test Date -->
              <div v-if="activity.test_date" class="text-body-2 text-medium-emphasis">
                <v-icon size="small" class="mr-1">mdi-calendar-clock</v-icon>
                Test Date: {{ formatDateShort(activity.test_date) }} - {{ formatTime(activity.test_date) }}
              </div>
            </div>
          </v-timeline-item>
        </v-timeline>

        <!-- Empty State -->
        <v-alert v-if="!activities.length && !loading" type="info" variant="tonal">
          No activities found for the selected time range.
        </v-alert>
      </v-card-text>

      <!-- Pagination -->
      <v-divider />
      <v-card-actions class="justify-center">
        <v-pagination v-model="currentPage" :length="totalPages" :total-visible="7"
          @update:model-value="loadActivities" />
      </v-card-actions>
    </v-card>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import apiClient from '@/core/api/client'

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

// State
const loading = ref(false)
const error = ref<string | null>(null)
const activities = ref<Activity[]>([])
const total = ref(0)
const currentPage = ref(1)
const totalPages = ref(0)
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
  loading.value = true
  error.value = null

  if (page !== undefined) {
    currentPage.value = page
  }

  try {
    const params: Record<string, string | number> = {
      page: currentPage.value,
      page_size: pageSize.value,
      sort_order: sortOrder.value,
    }

    // Add time range parameters
    if (timeRangeType.value === 'custom' && customStartDate.value && customEndDate.value) {
      params.start_date = new Date(customStartDate.value).toISOString()
      params.end_date = new Date(`${customEndDate.value}T23:59:59`).toISOString()
    } else if (typeof timeRangeType.value === 'number') {
      params.days = timeRangeType.value
    }

    // Add search parameter
    if (searchQuery.value) {
      params.search = searchQuery.value
    }

    const response = await apiClient.get<ActivityListResponse>('/api/dashboard/activity/list', {
      params,
    })

    activities.value = response.data.activities
    total.value = response.data.total
    totalPages.value = response.data.total_pages
  } catch (err: unknown) {
    console.error('Failed to load activities:', err)
    if (err && typeof err === 'object' && 'response' in err) {
      const response = (err as { response?: unknown }).response
      if (response && typeof response === 'object' && 'data' in response) {
        const data = (response as { data?: unknown }).data
        if (data && typeof data === 'object' && 'detail' in data) {
          const detail = (data as { detail?: unknown }).detail
          if (typeof detail === 'string') {
            error.value = detail
            return
          }
        }
      }
    }
    error.value = 'Failed to load activities'
  } finally {
    loading.value = false
  }
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

// Lifecycle
onMounted(() => {
  loadActivities()
})
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}

.gap-3 {
  gap: 0.75rem;
}

.gap-4 {
  gap: 1rem;
}

:deep(.v-timeline-item__body) {
  padding-inline-start: 16px !important;
}

:deep(.v-timeline-item__opposite) {
  padding-inline-end: 16px !important;
}

.centered-timeline :deep(.v-timeline-item) {
  padding-bottom: 0 !important;
}

.centered-timeline :deep(.v-timeline-divider__dot) {
  margin-top: 4px;
}

/* Center the timeline */
.centered-timeline {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
