/**
 * Notification Composable
 * 
 * Provides a simple interface for displaying toast notifications
 * using Vuetify's snackbar system
 */

import { ref } from 'vue'

export interface NotificationOptions {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  timeout?: number
  position?: 'top' | 'bottom'
  closable?: boolean
}

const notification = ref<NotificationOptions | null>(null)
const isVisible = ref(false)

/**
 * Display notification composable
 * 
 * @example
 * ```ts
 * const { showSuccess, showError, showWarning, showInfo } = useNotification()
 * 
 * showSuccess('File uploaded successfully!')
 * showError('Failed to process file')
 * showWarning('This action cannot be undone')
 * showInfo('Processing in progress...')
 * ```
 */
export function useNotification() {
  function show(options: NotificationOptions) {
    notification.value = {
      type: 'info',
      timeout: 3000,
      position: 'bottom',
      closable: true,
      ...options
    }
    isVisible.value = true
  }

  function showSuccess(message: string, timeout = 3000) {
    show({ message, type: 'success', timeout })
  }

  function showError(message: string, timeout = 5000) {
    show({ message, type: 'error', timeout })
  }

  function showWarning(message: string, timeout = 4000) {
    show({ message, type: 'warning', timeout })
  }

  function showInfo(message: string, timeout = 3000) {
    show({ message, type: 'info', timeout })
  }

  function hide() {
    isVisible.value = false
  }

  return {
    notification,
    isVisible,
    show,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hide
  }
}
