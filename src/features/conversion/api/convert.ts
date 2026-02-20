import type { AxiosProgressEvent } from 'axios'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:7070'

export interface ConvertDvtParams {
  dvtFile: File
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
}

export interface BatchConvertResult {
  filename: string
  originalName: string
  blob: Blob
  success: boolean
  error?: string
}

/**
 * Convert single DVT file to MC2 format
 */
export async function convertDvtToMc2(params: ConvertDvtParams): Promise<Blob> {
  const formData = new FormData()
  formData.append('dvt_file', params.dvtFile)

  const response = await axios.post(`${API_BASE_URL}/api/convert-dvt-to-mc2`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    responseType: 'blob',
    onUploadProgress: params.onUploadProgress,
    timeout: 120000, // 2 minutes
  })

  return response.data
}

/**
 * Convert multiple DVT files to MC2 format (batch processing)
 */
export async function convertDvtToMc2Batch(
  files: File[],
  onProgress?: (fileIndex: number, fileName: string, progress: number) => void,
): Promise<BatchConvertResult[]> {
  const results: BatchConvertResult[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    if (!file) continue

    try {
      if (onProgress) {
        onProgress(i, file.name, 0)
      }

      const blob = await convertDvtToMc2({
        dvtFile: file,
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onProgress(i, file.name, percentage)
          }
        },
      })

      // Extract filename from response headers or generate from original
      const convertedFilename = extractMc2Filename(file.name)

      results.push({
        filename: convertedFilename,
        originalName: file.name,
        blob,
        success: true,
      })

      if (onProgress) {
        onProgress(i, file.name, 100)
      }
    } catch (error) {
      results.push({
        filename: '',
        originalName: file.name,
        blob: new Blob(),
        success: false,
        error: error instanceof Error ? error.message : 'Conversion failed',
      })
    }
  }

  return results
}

/**
 * Download converted MC2 file with proper filename
 */
export function downloadMc2Result(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename

  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Download multiple MC2 results
 */
export function downloadMultipleMc2Results(results: BatchConvertResult[]): void {
  results.forEach((result) => {
    if (result.success) {
      downloadMc2Result(result.blob, result.filename)
    }
  })
}

/**
 * Extract/generate MC2 filename from DVT filename
 * Pattern: WiFi_SN_{serial}_{bands}_MC2.csv
 */
function extractMc2Filename(dvtFilename: string): string {
  // Remove extension
  const baseName = dvtFilename.replace(/\.(csv|xlsx)$/i, '')

  // If it already looks like an MC2 filename, use it
  if (baseName.includes('_MC2')) {
    return `${baseName}.csv`
  }

  // Generate MC2 filename (backend determines actual serial/bands)
  return `${baseName}_MC2.csv`
}

/**
 * Validate DVT file format (client-side basic check)
 */
export function validateDvtFile(file: File): { valid: boolean; error?: string } {
  const validExtensions = ['.csv', '.xlsx']
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

  if (!validExtensions.includes(extension)) {
    return {
      valid: false,
      error: 'Invalid file format. Please upload a CSV or XLSX file.',
    }
  }

  // Check file size (max 50MB)
  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 50MB.',
    }
  }

  return { valid: true }
}

/**
 * Parse DVT file to extract metadata (serial, bands, etc.)
 * This is a client-side preview - actual parsing happens on backend
 */
export async function parseDvtFilePreview(file: File): Promise<{
  serialNumber?: string
  detectedBands: string[]
  rowCount: number
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const lines = content.split('\n').slice(0, 50) // Read first 50 lines

        // Try to find serial number (row 3, column 2 in DVT format)
        let serialNumber: string | undefined
        const serialPattern = /Serial Number[,\t]+([^\s,\t]+)/i
        for (const line of lines) {
          const match = line.match(serialPattern)
          if (match) {
            serialNumber = match[1]
            break
          }
        }

        // Detect bands from frequency values
        const bands = new Set<string>()
        const freqPattern = /\b(2\d{3}|5\d{3}|6\d{3})\b/g
        for (const line of lines) {
          const matches = line.match(freqPattern)
          if (matches) {
            matches.forEach((freq) => {
              const f = parseInt(freq, 10)
              if (f >= 2000 && f < 3000) bands.add('2.4GHz')
              else if (f >= 5000 && f < 5925) bands.add('5GHz')
              else if (f >= 5925 && f < 7125) bands.add('6GHz')
            })
          }
        }

        resolve({
          serialNumber,
          detectedBands: Array.from(bands),
          rowCount: lines.length,
        })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file.slice(0, 10000)) // Read first 10KB for preview
  })
}
