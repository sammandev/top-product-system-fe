/**
 * iPLAS Stream Reader
 *
 * Handles streaming NDJSON data from the backend and sinking it
 * directly to IndexedDB for memory-efficient large dataset handling.
 *
 * Key Features:
 * - Stream race condition prevention via runId gating
 * - Single global AbortController for stream cancellation
 * - Batch writes to IndexedDB (100 records per transaction)
 * - Progress callbacks for UI updates
 */

import {
  clearAllRecords,
  generateRecordId,
  getDb,
  type IplasDbRecord,
  putRecordsBatch,
} from '../db/iplasDb'
import type { CompactCsvTestItemData } from './iplasProxyApi'

// ============================================================================
// Types
// ============================================================================

/**
 * Stream metadata from the first line of NDJSON response
 */
export interface StreamMetadata {
  totalRecords: number
  filtered: boolean
  cached: boolean
  possiblyTruncated?: boolean
  chunksFetched?: number
  totalChunks?: number
}

/**
 * Request parameters for streaming
 */
export interface StreamRequest {
  site: string
  project: string
  station: string
  device_id: string
  begin_time: string
  end_time: string
  test_status: 'ALL' | 'PASS' | 'FAIL'
  token?: string
}

/**
 * Progress callback parameters
 */
export interface StreamProgress {
  recordsProcessed: number
  recordsWritten: number
  totalEstimated: number
  bytesReceived: number
  isComplete: boolean
  error?: Error
}

/**
 * Options for the stream-to-disk operation
 */
export interface StreamToDiskOptions {
  /** Request parameters */
  request: StreamRequest
  /** Called periodically with progress updates */
  onProgress?: (progress: StreamProgress) => void
  /** Called when metadata is received (first line) */
  onMetadata?: (metadata: StreamMetadata) => void
  /** Called when stream completes successfully */
  onComplete?: (totalRecords: number) => void
  /** Called on error */
  onError?: (error: Error) => void
  /** Batch size for IndexedDB writes (default: 100) */
  batchSize?: number
  /** Progress update interval in records (default: 100) */
  progressInterval?: number
}

// ============================================================================
// Global State (for race condition prevention)
// ============================================================================

/** Global AbortController for the current stream */
let currentController: AbortController | null = null

/** Monotonic run ID for gating writes (prevents stale writes) */
let currentRunId = 0

// ============================================================================
// Main Streaming Function
// ============================================================================

/**
 * Fetch NDJSON stream and sink directly to IndexedDB
 *
 * This function:
 * 1. Aborts any existing stream (single stream at a time)
 * 2. Clears existing data (hard reset for cache invalidation)
 * 3. Streams NDJSON from backend
 * 4. Batches records and writes to IndexedDB
 * 5. Provides progress callbacks for UI updates
 *
 * Race condition handling:
 * - Each stream has a unique runId (epoch timestamp)
 * - Writes check if runId matches before committing
 * - If a new stream starts, old writes are silently dropped
 *
 * @param options - Streaming options
 * @returns Number of records written, or 0 if aborted
 */
export async function fetchAndSinkToDB(options: StreamToDiskOptions): Promise<number> {
  const {
    request,
    onProgress,
    onMetadata,
    onComplete,
    onError,
    batchSize = 100,
    progressInterval = 100,
  } = options

  // Abort any existing stream
  abortCurrentStream()

  // Create new AbortController and runId
  currentController = new AbortController()
  currentRunId = Date.now()
  const thisRunId = currentRunId

  // Initialize database
  await getDb()

  // Clear existing data (hard reset)
  await clearAllRecords()

  // Build request URL
  const baseUrl = import.meta.env.VITE_API_URL || ''
  const url = `${baseUrl}/api/iplas/csv-test-items/stream`

  // Progress tracking
  let recordsProcessed = 0
  let recordsWritten = 0
  let totalEstimated = 0
  let bytesReceived = 0

  // Batch buffer
  const batch: IplasDbRecord[] = []

  /**
   * Flush batch to IndexedDB
   * Checks runId before writing to prevent stale writes
   */
  async function flushBatch(): Promise<void> {
    if (batch.length === 0) return

    // Check if we're still the current run
    if (thisRunId !== currentRunId) {
      console.log(`[StreamReader] Dropping ${batch.length} records (stale runId)`)
      batch.length = 0
      return
    }

    const toWrite = [...batch]
    batch.length = 0

    try {
      const written = await putRecordsBatch(toWrite, thisRunId)
      recordsWritten += written
    } catch (err) {
      console.error('[StreamReader] Batch write failed:', err)
      throw err
    }
  }

  /**
   * Convert compact API record to IndexedDB record
   */
  function toDbRecord(apiRecord: CompactCsvTestItemData): IplasDbRecord {
    // Calculate duration from start and end times if available
    let testDuration: number | undefined
    const startTime = apiRecord['Test Start Time']
    const endTime = apiRecord['Test end Time']
    if (startTime && endTime) {
      try {
        const start = new Date(startTime).getTime()
        const end = new Date(endTime).getTime()
        testDuration = Math.floor((end - start) / 1000) // seconds
      } catch {
        // Ignore parse errors
      }
    }

    return {
      id: generateRecordId(apiRecord.ISN, apiRecord['Test Start Time']),
      ISN: apiRecord.ISN,
      TestStartTime: apiRecord['Test Start Time'],
      TestEndTime: apiRecord['Test end Time'],
      TestStatus: apiRecord['Test Status'] as 'PASS' | 'FAIL',
      Station: apiRecord.station, // Use this for API calls
      TSP: apiRecord.TSP, // Display station name (do NOT use for API calls)
      DeviceId: apiRecord.DeviceId,
      Site: apiRecord.Site || request.site,
      Project: apiRecord.Project || request.project,
      ErrorCode: apiRecord.ErrorCode,
      ErrorName: apiRecord.ErrorName,
      Slot: undefined, // Not in CompactCsvTestItemData
      TestDuration: testDuration,
      runId: thisRunId,
    }
  }

  /**
   * Report progress to callback
   */
  function reportProgress(isComplete = false, error?: Error): void {
    onProgress?.({
      recordsProcessed,
      recordsWritten,
      totalEstimated,
      bytesReceived,
      isComplete,
      error,
    })
  }

  try {
    // Make the streaming request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: currentController.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('No response body for streaming')
    }

    // Set up stream reader
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    // Read stream
    while (true) {
      // Check if aborted before reading
      if (thisRunId !== currentRunId) {
        console.log('[StreamReader] Stream superseded by new run, stopping')
        break
      }

      const { done, value } = await reader.read()

      if (done) {
        // Flush remaining batch
        await flushBatch()
        break
      }

      // Track bytes received
      bytesReceived += value.byteLength

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true })

      // Process complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        try {
          const parsed = JSON.parse(trimmedLine)

          // Check for metadata line (first line)
          if (parsed._metadata) {
            // Check if this is an error response
            if (parsed._error) {
              const errorMessage = parsed.error_message || 'Unknown server error'
              const errorCode = parsed.error_code || 500
              console.error(`[StreamReader] Server error: ${errorCode} - ${errorMessage}`)
              const serverError = new Error(`Server error (${errorCode}): ${errorMessage}`)
              onError?.(serverError)
              reportProgress(true, serverError)
              return 0
            }

            const metadata: StreamMetadata = {
              totalRecords: parsed.total_records,
              filtered: parsed.filtered,
              cached: parsed.cached,
              possiblyTruncated: parsed.possibly_truncated,
              chunksFetched: parsed.chunks_fetched,
              totalChunks: parsed.total_chunks,
            }
            totalEstimated = metadata.totalRecords
            onMetadata?.(metadata)
            continue
          }

          // Process data record
          const dbRecord = toDbRecord(parsed as CompactCsvTestItemData)
          batch.push(dbRecord)
          recordsProcessed++

          // Flush batch when full
          if (batch.length >= batchSize) {
            await flushBatch()
          }

          // Report progress periodically
          if (recordsProcessed % progressInterval === 0) {
            reportProgress()
          }
        } catch (_parseError) {
          console.warn('[StreamReader] Failed to parse line:', trimmedLine)
        }
      }
    }

    // Process any remaining buffer content
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim())
        if (!parsed._metadata) {
          const dbRecord = toDbRecord(parsed as CompactCsvTestItemData)
          batch.push(dbRecord)
          recordsProcessed++
          await flushBatch()
        }
      } catch {
        // Ignore incomplete final line
      }
    }

    // Final progress report
    reportProgress(true)

    // Success callback
    if (thisRunId === currentRunId) {
      onComplete?.(recordsWritten)
    }

    return recordsWritten
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.log('[StreamReader] Stream aborted by user')
        reportProgress(true)
        return 0
      }

      console.error('[StreamReader] Stream error:', error)
      onError?.(error)
      reportProgress(true, error)
    }

    throw error
  } finally {
    // Clear controller if this was the current run
    if (thisRunId === currentRunId) {
      currentController = null
    }
  }
}

// ============================================================================
// Control Functions
// ============================================================================

/**
 * Abort the current stream
 *
 * Safe to call even if no stream is active.
 */
export function abortCurrentStream(): void {
  if (currentController) {
    currentController.abort()
    currentController = null
    console.log('[StreamReader] Stream aborted')
  }
}

/**
 * Check if a stream is currently active
 */
export function isStreaming(): boolean {
  return currentController !== null
}

/**
 * Get the current run ID
 *
 * Useful for debugging and testing.
 */
export function getCurrentRunId(): number {
  return currentRunId
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse stream metadata from a JSON line
 *
 * @param line - Raw JSON line
 * @returns Metadata if line is metadata, null otherwise
 */
export function parseStreamMetadata(line: string): StreamMetadata | null {
  try {
    const parsed = JSON.parse(line)
    if (parsed._metadata) {
      return {
        totalRecords: parsed.total_records,
        filtered: parsed.filtered,
        cached: parsed.cached,
        possiblyTruncated: parsed.possibly_truncated,
        chunksFetched: parsed.chunks_fetched,
        totalChunks: parsed.total_chunks,
      }
    }
  } catch {
    // Not valid JSON
  }
  return null
}
