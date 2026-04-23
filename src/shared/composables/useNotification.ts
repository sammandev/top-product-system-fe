/**
 * Notification Composable
 *
 * Provides a simple interface for displaying toast notifications
 * using the PrimeVue toast service.
 */

import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'

export interface NotificationOptions {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  timeout?: number
  position?: 'top' | 'bottom'
  closable?: boolean
}

type NotificationType = NonNullable<NotificationOptions['type']>
type NotificationPosition = NonNullable<NotificationOptions['position']>

interface NormalizedNotificationOptions {
  message: string
  type: NotificationType
  timeout: number
  position: NotificationPosition
  closable: boolean
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
  const toast = useToast()
  const severityMap: Record<NotificationType, 'success' | 'error' | 'warn' | 'info'> = {
    success: 'success',
    error: 'error',
    warning: 'warn',
    info: 'info',
  }

  function show(options: NotificationOptions) {
    const normalized: NormalizedNotificationOptions = {
      message: options.message,
      type: 'info',
      timeout: 3000,
      position: 'bottom',
      closable: true,
      ...options,
    }

    notification.value = normalized
    isVisible.value = true

    toast.add({
      severity: severityMap[normalized.type],
      summary: normalized.type.toUpperCase(),
      detail: normalized.message,
      life: normalized.timeout,
      closable: normalized.closable,
      group: normalized.position === 'top' ? 'app-top' : 'app-bottom',
    })
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
    hide,
  }
}
