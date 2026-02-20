/**
 * Shared error extraction utilities.
 *
 * Use these in catch blocks to safely extract error messages from `unknown` errors.
 * Supports plain Error objects, Axios error responses, and arbitrary payloads.
 */

/**
 * Extract a human-readable message from an unknown error.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return String(err)
}

/**
 * Extract the API error detail from an Axios-style error response.
 * Returns `response.data.detail` if present, otherwise falls back to the error message.
 */
export function getApiErrorDetail(err: unknown, fallback = 'An error occurred'): string {
  // Try Axios response.data.detail first
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: unknown }).response
    if (response && typeof response === 'object' && 'data' in response) {
      const data = (response as { data?: unknown }).data
      if (data && typeof data === 'object' && 'detail' in data) {
        const detail = (data as { detail?: unknown }).detail
        if (typeof detail === 'string') return detail
      }
    }
  }
  // Fall back to message
  const msg = getErrorMessage(err)
  return msg || fallback
}

/**
 * Get the HTTP status code from an Axios-style error, or null if unavailable.
 */
export function getErrorStatus(err: unknown): number | null {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: unknown }).response
    if (response && typeof response === 'object' && 'status' in response) {
      const status = (response as { status?: unknown }).status
      if (typeof status === 'number') return status
    }
  }
  return null
}
