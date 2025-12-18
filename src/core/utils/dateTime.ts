/**
 * Date and Time Utility Functions
 * 
 * Provides timezone-aware date formatting and conversion utilities.
 * All dates from backend are assumed to be in UTC and will be converted to user's local timezone.
 */

/**
 * Format a UTC date string/Date object to user's local timezone
 * @param utcDate - Date string (ISO 8601) or Date object from backend (assumed UTC)
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string in user's local timezone
 */
export function formatDateToLocal(
  utcDate: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!utcDate) return 'N/A'

  try {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', utcDate)
      return 'Invalid Date'
    }

    // Default formatting options (show date and time)
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      ...options
    }

    // Format using user's locale and timezone
    return new Intl.DateTimeFormat(navigator.language, defaultOptions).format(date)
  } catch (error) {
    console.error('Error formatting date:', error, utcDate)
    return 'Error'
  }
}

/**
 * Format date for display in tables (compact format)
 * Example: "2025-12-18 14:30:25"
 */
export function formatDateTimeCompact(utcDate: string | Date | null | undefined): string {
  if (!utcDate) return 'N/A'

  try {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch (error) {
    console.error('Error formatting date:', error, utcDate)
    return 'Error'
  }
}

/**
 * Format date only (no time)
 * Example: "2025-12-18" or "12/18/2025" depending on locale
 */
export function formatDateOnly(utcDate: string | Date | null | undefined): string {
  return formatDateToLocal(utcDate, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * Format time only (no date)
 * Example: "14:30:25"
 */
export function formatTimeOnly(utcDate: string | Date | null | undefined): string {
  return formatDateToLocal(utcDate, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

/**
 * Format date with timezone indicator
 * Example: "2025-12-18 14:30:25 (GMT+8)"
 */
export function formatDateWithTimezone(utcDate: string | Date | null | undefined): string {
  if (!utcDate) return 'N/A'

  try {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }

    const formatted = formatDateTimeCompact(date)
    const offset = -date.getTimezoneOffset()
    const sign = offset >= 0 ? '+' : '-'
    const hours = Math.floor(Math.abs(offset) / 60)
    const minutes = Math.abs(offset) % 60
    const tz = `GMT${sign}${hours}${minutes > 0 ? ':' + String(minutes).padStart(2, '0') : ''}`

    return `${formatted} (${tz})`
  } catch (error) {
    console.error('Error formatting date with timezone:', error, utcDate)
    return 'Error'
  }
}

/**
 * Get relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(utcDate: string | Date | null | undefined): string {
  if (!utcDate) return 'N/A'

  try {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) {
      return 'just now'
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    } else {
      return formatDateOnly(date)
    }
  } catch (error) {
    console.error('Error formatting relative time:', error, utcDate)
    return 'Error'
  }
}

/**
 * Convert UTC date string to local Date object
 */
export function utcToLocal(utcDate: string | Date): Date {
  return typeof utcDate === 'string' ? new Date(utcDate) : utcDate
}

/**
 * Get user's timezone name
 * Example: "Asia/Shanghai", "America/New_York"
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Get user's timezone offset in minutes
 * Example: -480 for GMT+8
 */
export function getTimezoneOffset(): number {
  return -new Date().getTimezoneOffset()
}
