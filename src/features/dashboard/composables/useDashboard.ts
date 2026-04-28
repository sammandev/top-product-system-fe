import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { getErrorMessage } from '@/shared/utils'
import type { DashboardResponse } from '../api/dashboard.api'
import { dashboardApi } from '../api/dashboard.api'

/**
 * Dashboard Statistics
 */
interface DashboardStat {
  title: string
  value: number
  trend: number
  icon: string
  color: string
}

/**
 * Quick Action
 */
interface QuickAction {
  title: string
  subtitle: string
  icon: string
  color: string
  path: string
}

/**
 * Recent Activity Item
 */
interface ActivityItem {
  title: string
  description: string
  time: string
  icon: string
  color: string
}

/**
 * System Status Item
 */
interface StatusItem {
  label: string
  value: string
  icon: string
  color: string
}

/**
 * Dashboard Composable
 *
 * Provides dashboard data and business logic including:
 * - Statistics cards
 * - Quick actions
 * - Recent activity
 * - System status
 * - Storage information
 *
 * Uses TanStack Query for automatic caching, background refetching,
 * and deduplication of requests.
 *
 * @example
 * ```typescript
 * const {
 *   stats,
 *   quickActions,
 *   recentActivities,
 *   systemStatus,
 *   storagePercentage
 * } = useDashboard()
 * ```
 */
export function useDashboard() {
  const authStore = useAuthStore()
  const queryClient = useQueryClient()

  const statsQuery = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.getStats(),
    staleTime: 60_000,
  })

  const uploadsQuery = useQuery({
    queryKey: ['dashboard', 'uploads'],
    queryFn: () => dashboardApi.getUploadStats(),
    staleTime: 60_000,
  })

  // Loading & error — same external API as before
  const loading = computed(() => statsQuery.isPending.value || uploadsQuery.isPending.value)
  const error = computed(() => {
    const e = statsQuery.error.value || uploadsQuery.error.value
    return e ? getErrorMessage(e) : null
  })

  // Dashboard data from API
  const dashboardData = computed<DashboardResponse | null>(() => statsQuery.data.value ?? null)

  // Stats Data
  const stats = computed<DashboardStat[]>(() => {
    if (!dashboardData.value) {
      return [
        {
          title: 'Top Products',
          value: 0,
          trend: 0,
          icon: 'mdi-trophy',
          color: 'primary',
        },
        {
          title: 'Unique DUTs',
          value: 0,
          trend: 0,
          icon: 'mdi-chip',
          color: 'success',
        },
        {
          title: 'Test Stations',
          value: 0,
          trend: 0,
          icon: 'mdi-access-point',
          color: 'warning',
        },
        {
          title: 'Recent Analyses',
          value: 0,
          trend: 0,
          icon: 'mdi-chart-line',
          color: 'info',
        },
      ]
    }

    const { statistics } = dashboardData.value

    return [
      {
        title: 'Projects',
        value: statistics.total_unique_projects,
        trend: statistics.total_unique_projects > 0 ? 8.2 : 0,
        icon: 'mdi-folder-multiple',
        color: 'warning',
      },
      {
        title: 'Unique DUTs',
        value: statistics.total_unique_duts,
        trend: statistics.total_unique_duts > 0 ? 12.5 : 0,
        icon: 'mdi-chip',
        color: 'success',
      },
      {
        title: 'Total Analysis',
        value: statistics.total_top_products,
        trend:
          statistics.recent_analyses > 0
            ? (statistics.recent_analyses / statistics.total_top_products) * 100
            : 0,
        icon: 'mdi-trophy',
        color: 'primary',
      },
      {
        title: 'Recent (7 days)',
        value: statistics.recent_analyses,
        trend:
          statistics.total_top_products > 0
            ? (statistics.recent_analyses / statistics.total_top_products) * 100
            : 0,
        icon: 'mdi-chart-line',
        color: 'info',
      },
    ]
  })

  // Quick Actions
  const quickActions: QuickAction[] = [
    {
      title: 'Data Explorer',
      subtitle: 'Search and download test logs',
      icon: 'mdi-download',
      color: 'primary',
      path: '/dut/data-explorer',
    },
    {
      title: 'Top Products',
      subtitle: 'Browse database',
      icon: 'mdi-database',
      color: 'warning',
      path: '/dut/top-products/data',
    },
    {
      title: 'Top Product Analysis',
      subtitle: 'Multi-DUT insights',
      icon: 'mdi-chart-box',
      color: 'info',
      path: '/dut/top-products/analysis',
    },
  ]

  // Helper to format relative time
  const formatRelativeTime = (timestamp: string): string => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  // Recent Activity
  const recentActivities = computed<ActivityItem[]>(() => {
    if (!dashboardData.value || !dashboardData.value.recent_activities.length) {
      return [
        {
          title: 'No Recent Activity',
          description: 'Start by uploading a test log or analyzing DUTs',
          time: '-',
          icon: 'mdi-information',
          color: 'info',
        },
      ]
    }

    // Only show first 5 activities
    return dashboardData.value.recent_activities.slice(0, 5).map((activity) => {
      // Determine icon and color based on activity type
      let icon = 'mdi-chart-line'
      let color = 'info'

      if (activity.title.includes('PASS')) {
        icon = 'mdi-check-circle'
        color = 'success'
      } else if (activity.title.includes('FAIL')) {
        icon = 'mdi-alert-circle'
        color = 'error'
      } else if (activity.title.includes('ANALYZED')) {
        icon = 'mdi-chart-box'
        color = 'primary'
      }

      return {
        title: activity.title,
        description: activity.description,
        time: formatRelativeTime(activity.timestamp),
        icon,
        color,
      }
    })
  })

  // System Status
  const systemStatus = computed<StatusItem[]>(() => {
    if (!dashboardData.value) {
      return [
        {
          label: 'Database',
          value: 'Loading...',
          icon: 'mdi-database',
          color: 'info',
        },
        {
          label: 'Cache',
          value: 'Loading...',
          icon: 'mdi-cached',
          color: 'info',
        },
      ]
    }

    const { system_status } = dashboardData.value

    const statusItems: StatusItem[] = [
      {
        label: 'Database',
        value: system_status.database_status,
        icon: 'mdi-database',
        color: system_status.database_status === 'Online' ? 'success' : 'error',
      },
      {
        label: 'Total Records',
        value: system_status.database_records.toLocaleString(),
        icon: 'mdi-table',
        color: 'primary',
      },
      {
        label: 'Cache',
        value: system_status.cache_enabled ? system_status.cache_status : 'Disabled',
        icon: 'mdi-cached',
        color: system_status.cache_status === 'Online' ? 'success' : 'warning',
      },
    ]

    // Add cache metrics if cache is online
    if (system_status.cache_status === 'Online') {
      // Cache hit rate
      if (system_status.cache_hit_rate !== null) {
        statusItems.push({
          label: 'Cache Hit Rate',
          value: `${system_status.cache_hit_rate.toFixed(1)}%`,
          icon: 'mdi-chart-arc',
          color:
            system_status.cache_hit_rate > 70
              ? 'success'
              : system_status.cache_hit_rate > 50
                ? 'warning'
                : 'error',
        })
      }

      // Total cached keys
      if (system_status.cache_total_keys !== null) {
        statusItems.push({
          label: 'Cached Keys',
          value: system_status.cache_total_keys.toLocaleString(),
          icon: 'mdi-key',
          color: 'info',
        })
      }

      // Cache memory usage
      if (system_status.cache_memory_mb !== null) {
        statusItems.push({
          label: 'Cache Memory',
          value: `${system_status.cache_memory_mb.toFixed(2)} MB`,
          icon: 'mdi-memory',
          color: 'info',
        })
      }

      // Cache hits and misses
      if (system_status.cache_hits !== null && system_status.cache_misses !== null) {
        const total = system_status.cache_hits + system_status.cache_misses
        statusItems.push({
          label: 'Cache Operations',
          value: `${total.toLocaleString()} (${system_status.cache_hits.toLocaleString()} hits)`,
          icon: 'mdi-counter',
          color: 'primary',
        })
      }
    }

    // Add active users
    statusItems.push({
      label: 'Active Users',
      value: `${system_status.active_users}/${system_status.total_users}`,
      icon: 'mdi-account-group',
      color: 'primary',
    })

    // Add API version
    statusItems.push({
      label: 'API Version',
      value: system_status.api_version,
      icon: 'mdi-api',
      color: 'info',
    })

    return statusItems
  })

  // Storage — derived from uploads query
  const storageUsed = computed(() => {
    const uploads = uploadsQuery.data.value
    return uploads?.upload_dir_exists ? uploads.total_size_mb : 0
  })
  const storageTotal = computed(() => {
    const uploads = uploadsQuery.data.value
    return uploads?.upload_dir_exists ? 1000 : 100
  })
  const storagePercentage = computed(() =>
    Math.round((storageUsed.value / storageTotal.value) * 100),
  )

  // Computed
  const currentUser = computed(() => authStore.user)
  const isGuest = computed(() => authStore.isGuest)
  // Hide username for Guest users
  const userName = computed(() => (isGuest.value ? 'Guest' : currentUser.value?.username || 'User'))

  /**
   * Refresh dashboard statistics — invalidates both queries,
   * triggering immediate background refetch.
   */
  function refreshStats() {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  return {
    // State
    loading,
    error,

    // Data
    stats,
    quickActions,
    recentActivities,
    systemStatus,

    // Storage
    storageUsed,
    storageTotal,
    storagePercentage,

    // User
    currentUser,
    userName,

    // Actions
    refreshStats,
  }
}
