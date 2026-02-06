import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// Extend dayjs with plugins
dayjs.extend(utc)
dayjs.extend(timezone)

// Get user's local timezone (detected automatically by browser)
export const USER_TIMEZONE = dayjs.tz.guess()

/**
 * Get timezone offset string (e.g., "UTC+7")
 */
export function getTimezoneOffset(tz: string = USER_TIMEZONE): string {
  const offset = dayjs().tz(tz).utcOffset() / 60
  const sign = offset >= 0 ? '+' : ''
  return `UTC${sign}${offset}`
}

/**
 * Format date to ISO string for API
 */
export function formatDateForAPI(date: Date | string): string {
  return dayjs(date).format('YYYY-MM-DDTHH:mm:ss[Z]')
}

/**
 * Format date for display with timezone conversion
 * Converts UTC timestamps from backend to user's local timezone
 * @param date - UTC date from backend
 * @param format - Format string (default: 'YYYY-MM-DD HH:mm:ss')
 * @param showTimezone - Whether to show timezone (default: false)
 * @param tz - Target timezone (default: user's local timezone)
 */
export function formatDate(
  date: Date | string | null | undefined,
  format = 'YYYY-MM-DD HH:mm:ss',
  showTimezone = false,
  tz: string = USER_TIMEZONE
): string {
  if (!date) return 'N/A'

  // Parse as UTC and convert to target timezone
  const formatted = dayjs.utc(date).tz(tz).format(format)

  if (showTimezone) {
    return `${formatted} (${getTimezoneOffset(tz)})`
  }
  return formatted
}

/**
 * Format date for display (simple, backward compatible)
 * Converts UTC to user's local timezone
 */
export function formatDateSimple(date: Date | string | null | undefined, format = 'YYYY-MM-DD HH:mm:ss'): string {
  if (!date) return 'N/A'
  // Parse as UTC and convert to local timezone
  return dayjs.utc(date).tz(USER_TIMEZONE).format(format)
}

/**
 * Format file size to human readable
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function (this: any, ...args: Parameters<T>) {
    const context = this

    if (timeout) clearTimeout(timeout)

    timeout = setTimeout(() => {
      func.apply(context, args)
    }, wait)
  }
}

/**
 * Download file from blob
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy:', err)
    return false
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Generate random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

/**
 * Sleep/delay utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.substring(0, length) + '...'
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number, decimals = 0): string {
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100 * 100) / 100
}

/**
 * Group array by key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key])
    if (!result[groupKey]) {
      result[groupKey] = []
    }
    result[groupKey].push(item)
    return result
  }, {} as Record<string, T[]>)
}

/**
 * Sort array by key
 */
export function sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]

    if (aVal < bVal) return order === 'asc' ? -1 : 1
    if (aVal > bVal) return order === 'asc' ? 1 : -1
    return 0
  })
}

/**
 * Check if object is empty
 */
export function isEmpty(obj: any): boolean {
  if (obj === null || obj === undefined) return true
  if (Array.isArray(obj)) return obj.length === 0
  if (typeof obj === 'object') return Object.keys(obj).length === 0
  return false
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Adjust iPLAS display time by deducting hours
 * iPLAS API returns times that are offset by 1 hour from actual local time
 * This function adjusts the display time by subtracting the specified hours
 * NOTE: Only use for display purposes, not for download timestamps
 * @param dateStr - Date string from iPLAS API (e.g., "2026-01-27 15:30:45")
 * @param hoursToDeduct - Number of hours to subtract (default: 1)
 * @returns Adjusted date string in same format, or original if parsing fails
 */
export function adjustIplasDisplayTime(dateStr: string | null | undefined, hoursToDeduct = 1): string {
  if (!dateStr) return '-'
  try {
    // Parse the date string
    const cleanedTime = dateStr.replace('T', ' ').replace('%:z', '').split('.')[0] || ''
    const date = new Date(cleanedTime.replace(' ', 'T'))
    if (isNaN(date.getTime())) return dateStr

    // Subtract hours
    date.setHours(date.getHours() - hoursToDeduct)

    // Format back to the same format
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${year}/${month}/${day}, ${hours}:${minutes}:${seconds}`
  } catch {
    return dateStr
  }
}

// ============================================================================
// iPLAS Status Normalization Utilities
// ============================================================================

/**
 * iPLAS API STATUS values can be:
 * - "PASS" or "1" for passing status
 * - "FAIL" or "0" for failing status
 * These helpers normalize status values for consistent handling.
 */

/**
 * Check if a STATUS value indicates a PASS result.
 * Handles both string formats: "PASS" and "1"
 * @param status - The STATUS value from iPLAS API
 * @returns true if the status indicates PASS
 */
export function isStatusPass(status: string | null | undefined): boolean {
  if (!status) return false
  const normalized = status.toUpperCase().trim()
  return normalized === 'PASS' || normalized === '1'
}

/**
 * Check if a STATUS value indicates a FAIL result.
 * Handles both string formats: "FAIL" and "0"
 * @param status - The STATUS value from iPLAS API
 * @returns true if the status indicates FAIL
 */
export function isStatusFail(status: string | null | undefined): boolean {
  if (!status) return false
  const normalized = status.toUpperCase().trim()
  return normalized === 'FAIL' || normalized === '0'
}

/**
 * Normalize a STATUS value to standard "PASS" or "FAIL" string.
 * @param status - The STATUS value from iPLAS API ("PASS", "FAIL", "1", "0")
 * @returns "PASS", "FAIL", or the original status if not recognized
 */
export function normalizeStatus(status: string | null | undefined): string {
  if (!status) return status ?? ''
  const normalized = status.toUpperCase().trim()
  if (normalized === 'PASS' || normalized === '1') return 'PASS'
  if (normalized === 'FAIL' || normalized === '0') return 'FAIL'
  return status
}

/**
 * Get the appropriate color for a STATUS chip.
 * @param status - The STATUS value from iPLAS API
 * @returns 'success' for PASS, 'error' for FAIL, 'grey' for unknown
 */
export function getStatusColor(status: string | null | undefined): 'success' | 'error' | 'grey' {
  if (isStatusPass(status)) return 'success'
  if (isStatusFail(status)) return 'error'
  return 'grey'
}

/**
 * Get the display text for a STATUS value.
 * Normalizes "1" to "PASS" and "0" to "FAIL" for consistent display.
 * @param status - The STATUS value from iPLAS API
 * @returns "PASS", "FAIL", or the original status for display
 */
export function getStatusDisplayText(status: string | null | undefined): string {
  return normalizeStatus(status)
}
