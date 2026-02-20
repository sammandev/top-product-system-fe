import type ExcelJS from 'exceljs'

type ExcelCell = string | number | boolean | null | undefined

function normalizeCell(value: unknown): ExcelCell {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  return JSON.stringify(value)
}

export function addSheetFromRows(workbook: ExcelJS.Workbook, sheetName: string, rows: unknown[][]) {
  const worksheet = workbook.addWorksheet(sheetName)
  rows.forEach((row) => {
    worksheet.addRow(row.map(normalizeCell))
  })
  return worksheet
}

export function addSheetFromObjects(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  items: Record<string, unknown>[],
) {
  const worksheet = workbook.addWorksheet(sheetName)
  if (items.length === 0) {
    return worksheet
  }

  const headers = Object.keys(items[0] ?? {})
  worksheet.addRow(headers)
  items.forEach((item) => {
    worksheet.addRow(headers.map((header) => normalizeCell(item[header])))
  })
  return worksheet
}

export async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
