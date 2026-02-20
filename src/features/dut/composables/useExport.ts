import type { TopProduct } from '@/core/types'

interface ExportOptions {
  filename?: string
  format?: 'csv' | 'json'
  includeDetails?: boolean
}

/**
 * Composable for exporting top products data
 */
export function useExport() {
  /**
   * Convert data to CSV format
   */
  function toCSV(data: TopProduct[], includeDetails: boolean = false): string {
    if (data.length === 0) {
      return ''
    }

    const lines: string[] = []

    if (includeDetails) {
      // Detailed export with measurement data
      const headers = [
        'ISN',
        'Device',
        'Station',
        'Test Date',
        'Overall Score',
        'Test Item',
        'Actual',
        'Expected',
        'LSL',
        'USL',
        'Item Score',
      ]
      lines.push(headers.join(','))

      data.forEach((product) => {
        const baseInfo = [
          escapeCsvValue(product.isn),
          escapeCsvValue(product.device),
          escapeCsvValue(product.station_name),
          escapeCsvValue(product.test_date),
          product.overall_data_score.toFixed(2),
        ]

        if (product.latest_data && product.latest_data.length > 0) {
          product.latest_data.forEach((measurement) => {
            const row = [
              ...baseInfo,
              escapeCsvValue(measurement.test_item),
              measurement.actual.toString(),
              measurement.expected?.toString() ?? '',
              measurement.lsl?.toString() ?? '',
              measurement.usl?.toString() ?? '',
              measurement.score.toFixed(2),
            ]
            lines.push(row.join(','))
          })
        } else {
          // No measurement data, just add the product info
          lines.push([...baseInfo, '', '', '', '', '', ''].join(','))
        }
      })
    } else {
      // Summary export (main table only)
      const headers = ['ISN', 'Device', 'Station', 'Test Date', 'Overall Score']
      lines.push(headers.join(','))

      data.forEach((product) => {
        const row = [
          escapeCsvValue(product.isn),
          escapeCsvValue(product.device),
          escapeCsvValue(product.station_name),
          escapeCsvValue(product.test_date),
          product.overall_data_score.toFixed(2),
        ]
        lines.push(row.join(','))
      })
    }

    return lines.join('\n')
  }

  /**
   * Convert data to JSON format
   */
  function toJSON(data: TopProduct[]): string {
    return JSON.stringify(data, null, 2)
  }

  /**
   * Escape CSV value to handle commas, quotes, and newlines
   */
  function escapeCsvValue(value: string | number): string {
    const strValue = String(value)
    if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
      return `"${strValue.replace(/"/g, '""')}"`
    }
    return strValue
  }

  /**
   * Download data as a file
   */
  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Export top products data
   */
  function exportData(data: TopProduct[], options: ExportOptions = {}): void {
    const {
      filename = `top_products_${new Date().toISOString().split('T')[0]}`,
      format = 'csv',
      includeDetails = true,
    } = options

    if (data.length === 0) {
      console.warn('No data to export')
      return
    }

    let content: string
    let mimeType: string
    let extension: string

    if (format === 'csv') {
      content = toCSV(data, includeDetails)
      mimeType = 'text/csv;charset=utf-8;'
      extension = 'csv'
    } else {
      content = toJSON(data)
      mimeType = 'application/json;charset=utf-8;'
      extension = 'json'
    }

    downloadFile(content, `${filename}.${extension}`, mimeType)
  }

  /**
   * Generate filename based on station and date
   */
  function generateFilename(stationName: string, startDate: string, endDate: string): string {
    const sanitizedStation = stationName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const dateRange = `${startDate}_to_${endDate}`
    return `top_products_${sanitizedStation}_${dateRange}`
  }

  return {
    exportData,
    generateFilename,
    toCSV,
    toJSON,
  }
}
