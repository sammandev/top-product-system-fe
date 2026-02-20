import type { AxiosProgressEvent } from 'axios'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:7070'

export interface AnalyzeMultiDutParams {
  mc2File: File
  specFile: File
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
}

export interface AnalyzePreviewData {
  totalDuts: number
  totalTestItems: number
  passCount: number
  failCount: number
  marginPassCount: number
  marginFailCount: number
  dutLabels: string[]
  testItemsPreview: string[]
  analysisDate: string
}

/**
 * Analyze multi-DUT MC2 data with spec file
 * Downloads resulting XLSX file with analysis results
 */
export async function analyzeMultiDut(params: AnalyzeMultiDutParams): Promise<Blob> {
  const formData = new FormData()
  formData.append('mc2_file', params.mc2File)
  formData.append('spec_file', params.specFile)

  const response = await axios.post(`${API_BASE_URL}/api/analyze-multi-dut`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    responseType: 'blob',
    onUploadProgress: params.onUploadProgress,
    timeout: 300000, // 5 minutes for large files
  })

  return response.data
}

/**
 * Get preview/summary of analysis before downloading full results
 * Note: This endpoint doesn't exist in backend yet, but can be added for better UX
 * For now, we'll skip preview and go straight to analysis
 */
export async function getAnalysisPreview(
  _mc2File: File,
  _specFile: File,
): Promise<AnalyzePreviewData> {
  // TODO: Backend implementation needed
  // This is a placeholder for future enhancement
  throw new Error('Preview endpoint not yet implemented')
}

/**
 * Download generated XLSX file with proper filename
 */
export function downloadAnalysisResult(blob: Blob, originalFilename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url

  // Extract base name and add _Compiled suffix
  const baseName = originalFilename.replace(/\.(csv|xlsx)$/i, '')
  a.download = `${baseName}_Compiled.xlsx`

  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Validate MC2 file format (client-side basic check)
 */
export function validateMc2File(file: File): { valid: boolean; error?: string } {
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
 * Validate spec file format (client-side basic check)
 */
export function validateSpecFile(file: File): { valid: boolean; error?: string } {
  const validExtensions = ['.json', '.ini']
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

  if (!validExtensions.includes(extension)) {
    return {
      valid: false,
      error: 'Invalid file format. Please upload a JSON or INI file.',
    }
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB.',
    }
  }

  return { valid: true }
}
