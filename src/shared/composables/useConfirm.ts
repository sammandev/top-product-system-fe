/**
 * Confirmation Dialog Composable
 * 
 * Provides a simple interface for displaying confirmation dialogs
 */

import { ref } from 'vue'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'danger' | 'info'
}

const isOpen = ref(false)
const options = ref<ConfirmOptions>({
  title: 'Confirm Action',
  message: 'Are you sure?',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  type: 'warning'
})

let resolvePromise: ((value: boolean) => void) | null = null

/**
 * Confirmation dialog composable
 * 
 * @example
 * ```ts
 * const { confirm } = useConfirm()
 * 
 * const result = await confirm({
 *   title: 'Delete File',
 *   message: 'Are you sure you want to delete this file?',
 *   type: 'danger'
 * })
 * 
 * if (result) {
 *   // User confirmed
 *   await deleteFile()
 * }
 * ```
 */
export function useConfirm() {
  function confirm(confirmOptions: ConfirmOptions): Promise<boolean> {
    options.value = {
      title: 'Confirm Action',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      type: 'warning',
      ...confirmOptions
    }

    isOpen.value = true

    return new Promise((resolve) => {
      resolvePromise = resolve
    })
  }

  function handleConfirm() {
    isOpen.value = false
    if (resolvePromise) {
      resolvePromise(true)
      resolvePromise = null
    }
  }

  function handleCancel() {
    isOpen.value = false
    if (resolvePromise) {
      resolvePromise(false)
      resolvePromise = null
    }
  }

  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleCancel
  }
}
