/**
 * Composable for exporting Top Products data to various formats
 */

import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { addSheetFromRows, downloadWorkbook } from '@/shared/utils/excel'

export interface TopProductExportItem {
  dut_isn: string
  project_name: string | null
  station_name: string
  device_name: string | null
  score: number | null
  test_date: string | null
  pass_count: number
  fail_count: number
  retest_count: number
  test_duration: number | null
  measurements?: Array<{
    test_item: string
    usl: number | null
    lsl: number | null
    actual_value: number | null
    deviation: number | null
  }>
}

export function useTopProductExport() {
  /**
   * Export single product to Excel
   */
  const exportToExcel = async (product: TopProductExportItem) => {
    try {
      const workbook = new ExcelJS.Workbook()

      // Product Overview Sheet
      const overviewData = [
        ['Product Information'],
        ['DUT ISN', product.dut_isn],
        ['Project', product.project_name || 'N/A'],
        ['Station', product.station_name],
        ['Device', product.device_name || 'N/A'],
        ['Test Date', product.test_date || 'N/A'],
        ['Test Duration (s)', product.test_duration?.toFixed(2) || 'N/A'],
        [''],
        ['Test Results'],
        ['Overall Score', product.score?.toFixed(2) || 'N/A'],
        ['Pass Count', product.pass_count],
        ['Fail Count', product.fail_count],
        ['Retest Count', product.retest_count],
      ]
      addSheetFromRows(workbook, 'Overview', overviewData)

      // Measurements Sheet (if available)
      if (product.measurements && product.measurements.length > 0) {
        const measurementsData = [
          ['Test Item', 'USL', 'LSL', 'Actual Value', 'Deviation', 'Status'],
        ]

        product.measurements.forEach((m) => {
          const withinLimits =
            (m.lsl === null || (m.actual_value !== null && m.actual_value >= m.lsl)) &&
            (m.usl === null || (m.actual_value !== null && m.actual_value <= m.usl))

          measurementsData.push([
            m.test_item,
            m.usl?.toString() || '',
            m.lsl?.toString() || '',
            m.actual_value?.toString() || '',
            m.deviation?.toFixed(2) || '',
            withinLimits ? 'PASS' : 'FAIL',
          ])
        })

        addSheetFromRows(workbook, 'Measurements', measurementsData)
      }

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const filename = `top_product_${product.dut_isn}_${timestamp}.xlsx`

      // Write file
      await downloadWorkbook(workbook, filename)
    } catch (error) {
      console.error('Excel export error:', error)
      throw new Error('Failed to export to Excel')
    }
  }

  /**
   * Export single product to PDF
   */
  const exportToPDF = async (product: TopProductExportItem) => {
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()

      // Title
      doc.setFontSize(16)
      doc.text('Top Product Report', pageWidth / 2, 20, { align: 'center' })

      // Product Information
      doc.setFontSize(12)
      doc.text('Product Information', 14, 35)

      const productInfo = [
        ['DUT ISN', product.dut_isn],
        ['Project', product.project_name || 'N/A'],
        ['Station', product.station_name],
        ['Device', product.device_name || 'N/A'],
        ['Test Date', product.test_date || 'N/A'],
        ['Test Duration (s)', product.test_duration?.toFixed(2) || 'N/A'],
      ]

      autoTable(doc, {
        startY: 40,
        head: [],
        body: productInfo,
        theme: 'grid',
        styles: { fontSize: 10 },
      })

      // Test Results
      // biome-ignore lint/suspicious/noExplicitAny: jsPDF-AutoTable plugin adds lastAutoTable property at runtime
      const finalY = (doc as any).lastAutoTable.finalY || 40
      doc.text('Test Results', 14, finalY + 10)

      const resultsInfo = [
        ['Overall Score', product.score?.toFixed(2) || 'N/A'],
        ['Pass Count', product.pass_count.toString()],
        ['Fail Count', product.fail_count.toString()],
        ['Retest Count', product.retest_count.toString()],
      ]

      autoTable(doc, {
        startY: finalY + 15,
        head: [],
        body: resultsInfo,
        theme: 'grid',
        styles: { fontSize: 10 },
      })

      // Measurements (if available)
      if (product.measurements && product.measurements.length > 0) {
        // biome-ignore lint/suspicious/noExplicitAny: jsPDF-AutoTable plugin adds lastAutoTable property at runtime
        const measurementsFinalY = (doc as any).lastAutoTable.finalY || 40
        doc.text('Measurements', 14, measurementsFinalY + 10)

        const measurementsData = product.measurements.map((m) => {
          const withinLimits =
            (m.lsl === null || (m.actual_value !== null && m.actual_value >= m.lsl)) &&
            (m.usl === null || (m.actual_value !== null && m.actual_value <= m.usl))

          return [
            m.test_item,
            m.usl?.toString() || '',
            m.lsl?.toString() || '',
            m.actual_value?.toString() || '',
            m.deviation?.toFixed(2) || '',
            withinLimits ? 'PASS' : 'FAIL',
          ]
        })

        autoTable(doc, {
          startY: measurementsFinalY + 15,
          head: [['Test Item', 'USL', 'LSL', 'Actual', 'Deviation', 'Status']],
          body: measurementsData,
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 139, 202] },
        })
      }

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const filename = `top_product_${product.dut_isn}_${timestamp}.pdf`

      // Save PDF
      doc.save(filename)
    } catch (error) {
      console.error('PDF export error:', error)
      throw new Error('Failed to export to PDF')
    }
  }

  /**
   * Copy product data to clipboard
   */
  const copyToClipboard = async (product: TopProductExportItem) => {
    try {
      let text = `Top Product Report\n\n`
      text += `Product Information:\n`
      text += `DUT ISN: ${product.dut_isn}\n`
      text += `Project: ${product.project_name || 'N/A'}\n`
      text += `Station: ${product.station_name}\n`
      text += `Device: ${product.device_name || 'N/A'}\n`
      text += `Test Date: ${product.test_date || 'N/A'}\n`
      text += `Test Duration: ${product.test_duration?.toFixed(2) || 'N/A'} seconds\n\n`

      text += `Test Results:\n`
      text += `Overall Score: ${product.score?.toFixed(2) || 'N/A'}\n`
      text += `Pass Count: ${product.pass_count}\n`
      text += `Fail Count: ${product.fail_count}\n`
      text += `Retest Count: ${product.retest_count}\n`

      if (product.measurements && product.measurements.length > 0) {
        text += `\nMeasurements:\n`
        text += `Test Item\tUSL\tLSL\tActual\tDeviation\tStatus\n`

        product.measurements.forEach((m) => {
          const withinLimits =
            (m.lsl === null || (m.actual_value !== null && m.actual_value >= m.lsl)) &&
            (m.usl === null || (m.actual_value !== null && m.actual_value <= m.usl))

          text += `${m.test_item}\t${m.usl || ''}\t${m.lsl || ''}\t${m.actual_value || ''}\t${m.deviation?.toFixed(2) || ''}\t${withinLimits ? 'PASS' : 'FAIL'}\n`
        })
      }

      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Clipboard copy error:', error)
      throw new Error('Failed to copy to clipboard')
    }
  }

  return {
    exportToExcel,
    exportToPDF,
    copyToClipboard,
  }
}
