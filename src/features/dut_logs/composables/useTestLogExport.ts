/**
 * Composable for exporting test log results to various formats
 */

import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { TestLogParseResponseEnhanced, CompareResponseEnhanced } from './useTestLogUpload'
import { sortTestItems } from '../utils/sorting'

export function useTestLogExport() {
  /**
   * Export results to Excel format
   */
  const exportToExcel = async (
    data: TestLogParseResponseEnhanced | CompareResponseEnhanced,
    mode: 'PARSING' | 'COMPARE'
  ) => {
    try {
      const workbook = XLSX.utils.book_new()

      if (mode === 'PARSING') {
        const parseData = data as TestLogParseResponseEnhanced

        // Metadata sheet
        const metadataData = [
          ['Filename', parseData.filename],
          ['ISN', parseData.isn || 'N/A'],
          ['Station', parseData.station],
          ['Test Date', parseData.metadata.test_date || 'N/A'],
          ['Device', parseData.metadata.device || 'N/A'],
          ['Script Version', parseData.metadata.script_version || 'N/A'],
          ['Duration (seconds)', parseData.metadata.duration_seconds || 'N/A'],
          ['SFIS Status', parseData.metadata.sfis_status || 'N/A'],
          ['Result', parseData.metadata.result || 'N/A'],
          ['Counter', parseData.metadata.counter || 'N/A'],
          [''],
          ['Statistics'],
          ['Total Items', parseData.parsed_count],
          ['Value Type Count', parseData.value_type_count],
          ['Non-Value Type Count', parseData.non_value_type_count],
          ['Hex Value Count', parseData.hex_value_count],
          ['Average Score', parseData.avg_score?.toFixed(2) || 'N/A'],
          ['Median Score', parseData.median_score?.toFixed(2) || 'N/A']
        ]
        const metadataSheet = XLSX.utils.aoa_to_sheet(metadataData)
        XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata')

        // Test Items sheet
        const itemsData = [
          ['Test Item', 'USL', 'LSL', 'Value', 'Type', 'Score', 'Criteria Match', 'Numeric Value', 'Hex Decimal']
        ]

        parseData.parsed_items_enhanced.forEach(item => {
          itemsData.push([
            item.test_item,
            item.usl?.toString() || '',
            item.lsl?.toString() || '',
            item.value,
            item.is_hex ? 'Hex' : item.is_value_type ? 'Value' : 'Non-Value',
            item.score?.toFixed(2) || '',
            item.matched_criteria ? 'Yes' : 'No',
            item.numeric_value?.toString() || '',
            item.hex_decimal?.toString() || ''
          ])
        })

        const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData)
        XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Test Items')

      } else {
        // COMPARE mode
        const compareData = data as CompareResponseEnhanced

        // Summary sheet
        const summaryData = [
          ['Total Files', compareData.total_files],
          ['Total Value Items', compareData.total_value_items],
          ['Total Non-Value Items', compareData.total_non_value_items]
        ]
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

        // Value Items sheet
        if (compareData.comparison_value_items.length > 0) {
          const firstValueItem = compareData.comparison_value_items[0]
          if (!firstValueItem) return

          // Sort items using custom test item ordering
          const sortedItems = sortTestItems(compareData.comparison_value_items)

          const valueHeaders = ['Test Item', 'USL', 'LSL', 'Target']

          // Measurement columns
          firstValueItem.per_isn_data.forEach((isn) => {
            valueHeaders.push(`Meas. ${isn.isn || 'N/A'}`)
          })
          valueHeaders.push('Max. Meas.', 'Min. Meas.')

          // Deviation columns
          firstValueItem.per_isn_data.forEach((isn) => {
            valueHeaders.push(`Dev. ${isn.isn || 'N/A'}`)
          })
          valueHeaders.push('Max. Deviation', 'Avg. Deviation')

          // Score columns
          firstValueItem.per_isn_data.forEach((isn) => {
            valueHeaders.push(`Score ${isn.isn || 'N/A'}`)
          })
          valueHeaders.push('Avg. Score')

          const valueData = [valueHeaders]

          sortedItems.forEach(item => {
            const row: any[] = [
              item.test_item,
              item.usl?.toString() || '',
              item.lsl?.toString() || '',
              item.baseline?.toFixed(2) || ''
            ]

            // Measurements
            const measurements = item.per_isn_data.map(isn => isn.numeric_value ?? 0)
            item.per_isn_data.forEach(isn => {
              row.push(isn.value)
            })
            const maxMeas = measurements.length > 0 ? Math.max(...measurements).toFixed(2) : ''
            const minMeas = measurements.length > 0 ? Math.min(...measurements).toFixed(2) : ''
            row.push(maxMeas, minMeas)

            // Deviations
            const deviations = item.per_isn_data.map(isn => Math.abs(isn.deviation ?? 0))
            item.per_isn_data.forEach(isn => {
              row.push(isn.deviation?.toFixed(2) || '')
            })
            const maxDev = deviations.length > 0 ? Math.max(...deviations).toFixed(2) : ''
            row.push(maxDev, item.avg_deviation?.toFixed(2) || '')

            // Scores
            item.per_isn_data.forEach(isn => {
              row.push(isn.score?.toFixed(2) || '')
            })
            row.push(item.avg_score?.toFixed(2) || '')

            valueData.push(row)
          })

          const valueSheet = XLSX.utils.aoa_to_sheet(valueData)
          XLSX.utils.book_append_sheet(workbook, valueSheet, 'Value Items')
        }

        // Non-Value Items sheet
        if (compareData.comparison_non_value_items.length > 0) {
          const firstNonValueItem = compareData.comparison_non_value_items[0]
          if (!firstNonValueItem) return

          // Sort items using custom test item ordering
          const sortedItems = sortTestItems(compareData.comparison_non_value_items)

          const nonValueHeaders = ['Test Item']
          firstNonValueItem.per_isn_data.forEach((isn) => {
            nonValueHeaders.push(isn.isn || 'N/A')
          })

          const nonValueData = [nonValueHeaders]

          sortedItems.forEach(item => {
            const row: string[] = [item.test_item]
            item.per_isn_data.forEach(isn => {
              row.push(isn.value)
            })
            nonValueData.push(row)
          })

          const nonValueSheet = XLSX.utils.aoa_to_sheet(nonValueData)
          XLSX.utils.book_append_sheet(workbook, nonValueSheet, 'Non-Value Items')
        }
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const filename = `test_log_${mode.toLowerCase()}_${timestamp}.xlsx`

      // Write file
      XLSX.writeFile(workbook, filename)

    } catch (error) {
      console.error('Excel export error:', error)
      throw new Error('Failed to export to Excel')
    }
  }

  /**
   * Export results to PDF format
   */
  const exportToPDF = async (
    data: TestLogParseResponseEnhanced | CompareResponseEnhanced,
    mode: 'PARSING' | 'COMPARE'
  ) => {
    try {
      const doc = new jsPDF()
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)

      if (mode === 'PARSING') {
        const parseData = data as TestLogParseResponseEnhanced

        // Title
        doc.setFontSize(16)
        doc.text('Test Log Parsing Results', 14, 15)

        // Metadata
        doc.setFontSize(10)
        let yPos = 25

        doc.text('Metadata:', 14, yPos)
        yPos += 7

        const metadataText = [
          `Filename: ${parseData.filename}`,
          `ISN: ${parseData.isn || 'N/A'}`,
          `Station: ${parseData.station}`,
          `Test Date: ${parseData.metadata.test_date || 'N/A'}`,
          `Device: ${parseData.metadata.device || 'N/A'}`,
          `Result: ${parseData.metadata.result || 'N/A'}`,
          `Duration: ${parseData.metadata.duration_seconds || 'N/A'} seconds`
        ]

        metadataText.forEach(line => {
          doc.text(line, 14, yPos)
          yPos += 5
        })

        yPos += 5

        // Statistics
        doc.text('Statistics:', 14, yPos)
        yPos += 7

        const statsText = [
          `Total Items: ${parseData.parsed_count}`,
          `Value Items: ${parseData.value_type_count}`,
          `Non-Value Items: ${parseData.non_value_type_count}`,
          `Hex Values: ${parseData.hex_value_count}`,
          `Avg Score: ${parseData.avg_score?.toFixed(2) || 'N/A'}`,
          `Median Score: ${parseData.median_score?.toFixed(2) || 'N/A'}`
        ]

        statsText.forEach(line => {
          doc.text(line, 14, yPos)
          yPos += 5
        })

        // Test Items Table
        doc.addPage()
        doc.setFontSize(12)
        doc.text('Test Items', 14, 15)

        const tableData = parseData.parsed_items_enhanced.map(item => [
          item.test_item,
          item.usl?.toString() || '',
          item.lsl?.toString() || '',
          item.value,
          item.is_hex ? 'Hex' : item.is_value_type ? 'Value' : 'Non-Value',
          item.score?.toFixed(2) || ''
        ])

        autoTable(doc, {
          startY: 20,
          head: [['Test Item', 'USL', 'LSL', 'Value', 'Type', 'Score']],
          body: tableData,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 133, 244] }
        })

      } else {
        // COMPARE mode
        const compareData = data as CompareResponseEnhanced

        // Title
        doc.setFontSize(16)
        doc.text('Test Log Comparison Results', 14, 15)

        // Summary
        doc.setFontSize(10)
        let yPos = 25

        doc.text(`Total Files: ${compareData.total_files}`, 14, yPos)
        yPos += 7
        doc.text(`Total Value Items: ${compareData.total_value_items}`, 14, yPos)
        yPos += 7
        doc.text(`Total Non-Value Items: ${compareData.total_non_value_items}`, 14, yPos)

        // Value Items Table
        if (compareData.comparison_value_items.length > 0) {
          doc.addPage()
          doc.setFontSize(12)
          doc.text('Value Items Comparison', 14, 15)

          const firstItem = compareData.comparison_value_items[0]!
          const headers = ['Test Item', 'Baseline']
          firstItem.per_isn_data.forEach((isn, index) => {
            headers.push(`ISN${index + 1} Val`)
            headers.push(`Dev`)
            headers.push(`Score`)
          })

          const tableData = compareData.comparison_value_items.map(item => {
            const row: any[] = [
              item.test_item,
              item.baseline?.toFixed(2) || ''
            ]

            item.per_isn_data.forEach(isn => {
              row.push(isn.value)
              row.push(isn.deviation?.toFixed(2) || '')
              row.push(isn.score?.toFixed(2) || '')
            })

            return row
          })

          autoTable(doc, {
            startY: 20,
            head: [headers],
            body: tableData,
            styles: { fontSize: 7 },
            headStyles: { fillColor: [66, 133, 244] }
          })
        }

        // Non-Value Items Table
        if (compareData.comparison_non_value_items.length > 0) {
          doc.addPage()
          doc.setFontSize(12)
          doc.text('Non-Value Items Comparison', 14, 15)

          const firstItem = compareData.comparison_non_value_items[0]!
          const headers = ['Test Item']
          firstItem.per_isn_data.forEach((isn, index) => {
            headers.push(`ISN${index + 1}`)
          })

          const tableData = compareData.comparison_non_value_items.map(item => {
            const row: string[] = [item.test_item]
            item.per_isn_data.forEach(isn => {
              row.push(isn.value)
            })
            return row
          })

          autoTable(doc, {
            startY: 20,
            head: [headers],
            body: tableData,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [76, 175, 80] }
          })
        }
      }

      // Save PDF
      const filename = `test_log_${mode.toLowerCase()}_${timestamp}.pdf`
      doc.save(filename)

    } catch (error) {
      console.error('PDF export error:', error)
      throw new Error('Failed to export to PDF')
    }
  }

  /**
   * Copy results to clipboard
   */
  const copyToClipboard = async (
    data: TestLogParseResponseEnhanced | CompareResponseEnhanced,
    mode: 'PARSING' | 'COMPARE'
  ) => {
    try {
      let tsvContent = ''

      if (mode === 'PARSING') {
        const parseData = data as TestLogParseResponseEnhanced

        // Headers
        tsvContent += 'Test Item\tUSL\tLSL\tValue\tType\tScore\tCriteria Match\n'

        // Data rows
        parseData.parsed_items_enhanced.forEach(item => {
          const type = item.is_hex ? 'Hex' : item.is_value_type ? 'Value' : 'Non-Value'
          const score = item.score?.toFixed(2) || ''
          const criteriaMatch = item.matched_criteria ? 'Yes' : 'No'

          tsvContent += `${item.test_item}\t${item.usl || ''}\t${item.lsl || ''}\t${item.value}\t${type}\t${score}\t${criteriaMatch}\n`
        })

      } else {
        // COMPARE mode
        const compareData = data as CompareResponseEnhanced

        if (compareData.comparison_value_items.length > 0) {
          const firstItem = compareData.comparison_value_items[0]
          if (!firstItem) return

          // Sort items using custom test item ordering
          const sortedItems = sortTestItems(compareData.comparison_value_items)

          // Headers: Test Item | USL | LSL | Target | Meas. DM... | Meas. DM... | ... | Max. Meas. | Min. Meas. | Dev. DM... | Dev. DM... | ... | Max. Deviation | Avg. Deviation | Score DM... | Score DM... | ... | Avg. Score
          tsvContent += 'Test Item\tUSL\tLSL\tTarget'

          // Measurement columns
          firstItem.per_isn_data.forEach((isn) => {
            tsvContent += `\tMeas. ${isn.isn || 'N/A'}`
          })
          tsvContent += '\tMax. Meas.\tMin. Meas.'

          // Deviation columns
          firstItem.per_isn_data.forEach((isn) => {
            tsvContent += `\tDev. ${isn.isn || 'N/A'}`
          })
          tsvContent += '\tMax. Deviation\tAvg. Deviation'

          // Score columns
          firstItem.per_isn_data.forEach((isn) => {
            tsvContent += `\tScore ${isn.isn || 'N/A'}`
          })
          tsvContent += '\tAvg. Score\n'          // Data rows
          sortedItems.forEach(item => {
            tsvContent += `${item.test_item}\t${item.usl || ''}\t${item.lsl || ''}\t${item.baseline?.toFixed(2) || ''}`

            // Measurements
            const measurements = item.per_isn_data.map(isn => isn.numeric_value ?? 0)
            item.per_isn_data.forEach(isn => {
              tsvContent += `\t${isn.value}`
            })
            const maxMeas = measurements.length > 0 ? Math.max(...measurements) : 0
            const minMeas = measurements.length > 0 ? Math.min(...measurements) : 0
            tsvContent += `\t${maxMeas.toFixed(2)}\t${minMeas.toFixed(2)}`

            // Deviations
            const deviations = item.per_isn_data.map(isn => Math.abs(isn.deviation ?? 0))
            item.per_isn_data.forEach(isn => {
              tsvContent += `\t${formatDeviation(isn.deviation)}`
            })
            const maxDev = deviations.length > 0 ? Math.max(...deviations) : 0
            tsvContent += `\t${maxDev.toFixed(2)}\t${formatDeviation(item.avg_deviation)}`

            // Scores
            item.per_isn_data.forEach(isn => {
              tsvContent += `\t${isn.score?.toFixed(2) || ''}`
            })
            tsvContent += `\t${item.avg_score?.toFixed(2) || ''}\n`
          })

          // Add separator
          tsvContent += '\n\nNon-Value Items:\n'
        }
        if (compareData.comparison_non_value_items.length > 0) {
          const firstItem = compareData.comparison_non_value_items[0]
          if (!firstItem) return

          // Sort items using custom test item ordering
          const sortedItems = sortTestItems(compareData.comparison_non_value_items)

          // Headers for non-value items
          tsvContent += 'Test Item'
          firstItem.per_isn_data.forEach((isn) => {
            tsvContent += `\t${isn.isn || 'N/A'}`
          })
          tsvContent += '\n'

          // Data rows
          sortedItems.forEach(item => {
            tsvContent += item.test_item
            item.per_isn_data.forEach(isn => {
              tsvContent += `\t${isn.value}`
            })
            tsvContent += '\n'
          })
        }
      }

      // Helper function for deviation formatting
      // Helper function for deviation formatting
      function formatDeviation(deviation: number | null): string {
        if (deviation === null) return ''
        const sign = deviation > 0 ? '+' : ''
        return `${sign}${deviation.toFixed(2)}`
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(tsvContent)

      // Show success notification (optional - could emit event instead)
      console.log('Data copied to clipboard successfully')

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

