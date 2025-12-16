/**
 * Loading State Composable
 * 
 * Manages loading states for async operations with automatic error handling
 */

import { ref } from 'vue'

/**
 * Loading state composable
 * 
 * @example
 * ```ts
 * const { loading, error, execute } = useLoading()
 * 
 * const fetchData = async () => {
 *   const data = await api.getData()
 *   return data
 * }
 * 
 * const data = await execute(fetchData)
 * // loading is automatically set to true during execution
 * // error is set if operation fails
 * ```
 */
export function useLoading() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function execute<T>(
    operation: () => Promise<T>,
    errorMessage = 'An error occurred'
  ): Promise<T | null> {
    loading.value = true
    error.value = null

    try {
      const result = await operation()
      return result
    } catch (err: any) {
      error.value = err.response?.data?.detail || err.message || errorMessage
      return null
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  function reset() {
    loading.value = false
    error.value = null
  }

  return {
    loading,
    error,
    execute,
    clearError,
    reset
  }
}
