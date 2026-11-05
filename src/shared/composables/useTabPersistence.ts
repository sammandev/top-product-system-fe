import { onActivated, onMounted, type Ref, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * Composable for persisting tab selection in URL query parameters
 * This allows tabs to be restored on page refresh or when navigating back
 *
 * @param tabKey - The query parameter name for this tab (e.g., 'tab', 'subTab')
 * @param defaultValue - The default tab value when not specified in URL
 * @returns A ref that syncs with URL query parameters
 */
export function useTabPersistence<T extends string | number>(
  tabKey: string,
  defaultValue: T,
): Ref<T> {
  const route = useRoute()
  const router = useRouter()
  // Views cached by <KeepAlive> stay alive on other routes; only react to this view's URL.
  const ownerPath = route.path

  // Initialize from URL or default
  const getInitialValue = (): T => {
    const urlValue = route.query[tabKey]
    if (urlValue !== undefined && urlValue !== null) {
      // Handle number type
      if (typeof defaultValue === 'number') {
        const numValue = parseInt(urlValue as string, 10)
        return (Number.isNaN(numValue) ? defaultValue : numValue) as T
      }
      return urlValue as T
    }
    return defaultValue
  }

  const tabValue = ref<T>(getInitialValue()) as Ref<T>

  // Watch for changes and update URL
  watch(tabValue, (newValue) => {
    const currentQuery = { ...route.query }

    // Only update if value is different from default or already in URL
    if (newValue !== defaultValue || currentQuery[tabKey] !== undefined) {
      if (newValue === defaultValue) {
        // Remove from URL if it's the default value
        delete currentQuery[tabKey]
      } else {
        currentQuery[tabKey] = String(newValue)
      }

      // Replace current route without adding to history for minor tab changes
      router.replace({ query: currentQuery }).catch(() => {
        // Ignore navigation duplicated errors
      })
    }
  })

  // Watch route changes (e.g., browser back/forward)
  watch(
    () => route.query[tabKey],
    (newValue) => {
      if (route.path !== ownerPath) return
      if (newValue !== undefined && newValue !== null) {
        if (typeof defaultValue === 'number') {
          const numValue = parseInt(newValue as string, 10)
          tabValue.value = (Number.isNaN(numValue) ? defaultValue : numValue) as T
        } else {
          tabValue.value = newValue as T
        }
      } else {
        tabValue.value = defaultValue
      }
    },
  )

  // Sync on mount in case route changed before component mounted
  function syncFromUrl() {
    const urlValue = route.query[tabKey]
    if (urlValue !== undefined && urlValue !== null) {
      if (typeof defaultValue === 'number') {
        const numValue = parseInt(urlValue as string, 10)
        tabValue.value = (Number.isNaN(numValue) ? defaultValue : numValue) as T
      } else {
        tabValue.value = urlValue as T
      }
    }
  }

  onMounted(syncFromUrl)
  // Re-read the URL when a KeepAlive-cached view is shown again (e.g. browser back/forward).
  onActivated(syncFromUrl)

  return tabValue
}

/**
 * Composable for persisting multiple related tabs in URL
 * Useful for pages with nested tabs (main tab + sub-tabs)
 *
 * @param config - Object mapping tab keys to their default values
 * @returns Object with refs for each tab that sync with URL
 */
export function useMultiTabPersistence<T extends Record<string, string | number>>(
  config: T,
): { [K in keyof T]: Ref<T[K]> } {
  const result: Partial<{ [K in keyof T]: Ref<T[K]> }> = {}

  for (const [key, defaultValue] of Object.entries(config)) {
    result[key as keyof T] = useTabPersistence(key, defaultValue) as Ref<T[keyof T]>
  }

  return result as { [K in keyof T]: Ref<T[K]> }
}
