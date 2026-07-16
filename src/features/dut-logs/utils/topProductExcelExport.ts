import ExcelJS from 'exceljs'
import type { CsvTestItemData } from '../composables/useIplasApi'
import type {
  CompareItemEnhanced,
  CompareResponseEnhanced,
  TestLogParseResponseEnhanced,
} from '../composables/useTestLogUpload'
import type { RecordScoreResult } from '@/features/dut/types/scoring.types'

export type TopProductExcelCell = string | number | null | undefined

export interface TopProductExcelItem {
  testItem: string
  ucl: TopProductExcelCell
  lcl: TopProductExcelCell
  target: TopProductExcelCell
  weight: TopProductExcelCell
  value: TopProductExcelCell
  deviation: TopProductExcelCell
  score: TopProductExcelCell
}

export interface TopProductExcelRecord {
  isn: string
  project: TopProductExcelCell
  tsp: TopProductExcelCell
  deviceId: TopProductExcelCell
  errorCode: TopProductExcelCell
  errorName: TopProductExcelCell
  type: TopProductExcelCell
  testStartTime: TopProductExcelCell
  testEndTime: TopProductExcelCell
  station: string
  overallScore: number | null
  items: TopProductExcelItem[]
  sourceOrder?: number
}

export function createTopProductExcelRecordFromIplas(
  record: CsvTestItemData,
  scoredRecord?: RecordScoreResult,
  sourceOrder?: number,
): TopProductExcelRecord {
  const items = (record.TestItem || []).map((item) => {
    const itemScore = scoredRecord?.testItemScores.find(
      (score) => score.testItemName.toLowerCase() === item.NAME.toLowerCase(),
    )

    return {
      testItem: item.NAME,
      ucl: item.UCL ? Number(item.UCL) : null,
      lcl: item.LCL ? Number(item.LCL) : null,
      target: itemScore?.target ?? null,
      weight: itemScore?.weight ?? 1,
      value: item.VALUE,
      deviation: itemScore?.deviation ?? null,
      score: itemScore ? itemScore.score * 10 : null,
    }
  })

  return {
    isn: record.ISN || record.DeviceId || 'UNKNOWN',
    project: record.Project || '',
    tsp: record.TSP || record.station || '',
    deviceId: record.DeviceId || '',
    errorCode: record.ErrorCode || record['Test Status'] || '',
    errorName: record.ErrorName || 'N/A',
    type: 'ONLINE',
    testStartTime: record['Test Start Time'] || '',
    testEndTime: record['Test end Time'] || '',
    station: record.TSP || record.station || 'Results',
    overallScore: scoredRecord ? scoredRecord.overallScore * 10 : null,
    items,
    sourceOrder,
  }
}

export function createTopProductExcelRecordsFromComparison(
  compareResult: CompareResponseEnhanced,
  items: CompareItemEnhanced[],
  selectedIsns?: string[],
): TopProductExcelRecord[] {
  const selectedIsnSet = selectedIsns?.length ? new Set(selectedIsns) : null

  return compareResult.file_summaries
    .map((summary, sourceOrder): TopProductExcelRecord | null => {
      const isn = summary.isn
      if (!isn || (selectedIsnSet && !selectedIsnSet.has(isn))) return null

      const recordItems: TopProductExcelItem[] = []
      items.forEach((item) => {
        const perIsn = item.per_isn_data.find((data) => data.isn === isn)
        if (!perIsn) return

        recordItems.push({
          testItem: item.test_item,
          ucl: item.usl,
          lcl: item.lsl,
          target: perIsn.score_breakdown?.target ?? item.baseline,
          weight: perIsn.score_breakdown?.weight ?? 1,
          value: perIsn.value,
          deviation: perIsn.score_breakdown?.deviation ?? perIsn.deviation,
          score: perIsn.score,
        })
      })

      return {
        isn,
        project: '',
        tsp: summary.metadata.station || 'Results',
        deviceId: summary.metadata.device || '',
        errorCode: summary.metadata.result || '',
        errorName: 'N/A',
        type: 'ONLINE',
        testStartTime: summary.metadata.test_date || '',
        testEndTime: summary.metadata.test_date || '',
        station: summary.metadata.station || 'Results',
        overallScore: summary.avg_score,
        sourceOrder,
        items: recordItems,
      }
    })
    .filter((record): record is TopProductExcelRecord => record !== null)
}

export function createTopProductExcelRecordFromUploadLog(
  parseResult: TestLogParseResponseEnhanced,
  sourceItems: TestLogParseResponseEnhanced['parsed_items_enhanced'] = parseResult.parsed_items_enhanced,
  sourceOrder?: number,
): TopProductExcelRecord {
  return {
    isn: parseResult.isn || 'UNKNOWN',
    project: '',
    tsp: parseResult.station || 'Results',
    deviceId: parseResult.metadata.device || '',
    errorCode: parseResult.metadata.result || '',
    errorName: 'N/A',
    type: 'OFFLINE',
    testStartTime: parseResult.metadata.test_date || '',
    testEndTime: parseResult.metadata.test_date || '',
    station: parseResult.station || 'Results',
    overallScore: parseResult.avg_score,
    sourceOrder,
    items: sourceItems.map((item) => ({
      testItem: item.test_item,
      ucl: item.usl,
      lcl: item.lsl,
      target: item.score_breakdown?.target ?? item.target,
      weight: item.score_breakdown?.weight ?? 1,
      value: item.value,
      deviation: item.score_breakdown?.deviation ?? null,
      score: item.score,
    })),
  }
}

const metadataRows: Array<{
  label: string
  field: keyof Pick<
    TopProductExcelRecord,
    | 'isn'
    | 'project'
    | 'tsp'
    | 'deviceId'
    | 'errorCode'
    | 'errorName'
    | 'type'
    | 'testStartTime'
    | 'testEndTime'
  >
}> = [
  { label: 'ISN', field: 'isn' },
  { label: 'Project', field: 'project' },
  { label: 'TSP', field: 'tsp' },
  { label: 'DeviceId', field: 'deviceId' },
  { label: 'ErrorCode', field: 'errorCode' },
  { label: 'ErrorName', field: 'errorName' },
  { label: 'Type', field: 'type' },
  { label: 'Test Start Time', field: 'testStartTime' },
  { label: 'Test end Time', field: 'testEndTime' },
]

const border = {
  top: { style: 'thin' as const, color: { argb: 'FF000000' } },
  left: { style: 'thin' as const, color: { argb: 'FF000000' } },
  bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
  right: { style: 'thin' as const, color: { argb: 'FF000000' } },
}

const headerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFD9E1F2' } }
const scoreFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFD9D9D9' } }
const passFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFC6EFCE' } }
const failFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFC7CE' } }

function normalizeSheetName(name: string, usedNames: Set<string>): string {
  const baseName = (name || 'Results').replace(/[:\\/?*\[\]]/g, '_').slice(0, 31) || 'Results'
  let nextName = baseName
  let suffix = 2

  while (usedNames.has(nextName)) {
    const suffixText = `_${suffix}`
    nextName = `${baseName.slice(0, 31 - suffixText.length)}${suffixText}`
    suffix += 1
  }

  usedNames.add(nextName)
  return nextName
}

function compareRecords(a: TopProductExcelRecord, b: TopProductExcelRecord): number {
  const scoreA = a.overallScore
  const scoreB = b.overallScore

  if (scoreA === null && scoreB !== null) return 1
  if (scoreA !== null && scoreB === null) return -1
  if (scoreA !== null && scoreB !== null && scoreA !== scoreB) return scoreB - scoreA

  return (a.sourceOrder ?? 0) - (b.sourceOrder ?? 0)
}

function displayCell(value: TopProductExcelCell): string | number {
  return value === null || value === undefined ? '' : value
}

function styleRange(
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  startColumn: number,
  endColumn: number,
  style: { fill?: ExcelJS.Fill; font?: Partial<ExcelJS.Font>; alignment?: Partial<ExcelJS.Alignment> },
) {
  for (let column = startColumn; column <= endColumn; column += 1) {
    const cell = worksheet.getCell(rowNumber, column)
    cell.border = border
    if (style.fill) cell.fill = style.fill
    if (style.font) cell.font = style.font
    if (style.alignment) cell.alignment = style.alignment
  }
}

function getItemsByName(records: TopProductExcelRecord[]): TopProductExcelItem[] {
  const items = new Map<string, TopProductExcelItem>()

  records.forEach((record) => {
    record.items.forEach((item) => {
      if (!items.has(item.testItem)) items.set(item.testItem, item)
    })
  })

  return Array.from(items.values())
}

function findItem(record: TopProductExcelRecord, testItem: string): TopProductExcelItem | undefined {
  return record.items.find((item) => item.testItem === testItem)
}

function addSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  inputRecords: TopProductExcelRecord[],
) {
  const records = [...inputRecords].sort(compareRecords)
  const worksheet = workbook.addWorksheet(sheetName)
  const groupWidth = 3
  const fixedColumnCount = 5
  const lastColumn = fixedColumnCount + records.length * groupWidth
  const itemRows = getItemsByName(records)

  metadataRows.forEach(({ label, field }, index) => {
    const rowNumber = index + 1
    worksheet.getCell(rowNumber, 1).value = label
    worksheet.mergeCells(rowNumber, 1, rowNumber, fixedColumnCount)

    records.forEach((record, recordIndex) => {
      const startColumn = fixedColumnCount + recordIndex * groupWidth + 1
      worksheet.getCell(rowNumber, startColumn).value = displayCell(record[field])
      worksheet.mergeCells(rowNumber, startColumn, rowNumber, startColumn + groupWidth - 1)
      styleRange(worksheet, rowNumber, startColumn, startColumn + groupWidth - 1, {
        alignment: { horizontal: 'center', vertical: 'middle' },
      })
    })

    styleRange(worksheet, rowNumber, 1, fixedColumnCount, {
      font: { bold: rowNumber === 1 },
      alignment: { horizontal: 'center', vertical: 'middle' },
    })
  })

  const headerRow = metadataRows.length + 1
  const headers = ['TEST ITEM', 'UCL', 'LCL', 'Target', 'Weight']
  worksheet.getRow(headerRow).values = headers
  records.forEach((record, recordIndex) => {
    const startColumn = fixedColumnCount + recordIndex * groupWidth + 1
    worksheet.getCell(headerRow, startColumn).value = 'VALUE'
    worksheet.getCell(headerRow, startColumn + 1).value = 'DEV'
    worksheet.getCell(headerRow, startColumn + 2).value = 'SCORE'
  })
  styleRange(worksheet, headerRow, 1, lastColumn, {
    fill: headerFill,
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'middle' },
  })

  itemRows.forEach((item, itemIndex) => {
    const rowNumber = headerRow + itemIndex + 1
    worksheet.getCell(rowNumber, 1).value = item.testItem
    worksheet.getCell(rowNumber, 2).value = displayCell(item.ucl)
    worksheet.getCell(rowNumber, 3).value = displayCell(item.lcl)
    worksheet.getCell(rowNumber, 4).value = displayCell(item.target)
    worksheet.getCell(rowNumber, 5).value = displayCell(item.weight)

    records.forEach((record, recordIndex) => {
      const startColumn = fixedColumnCount + recordIndex * groupWidth + 1
      const recordItem = findItem(record, item.testItem)
      worksheet.getCell(rowNumber, startColumn).value = displayCell(recordItem?.value)
      worksheet.getCell(rowNumber, startColumn + 1).value = displayCell(recordItem?.deviation)
      worksheet.getCell(rowNumber, startColumn + 2).value = displayCell(recordItem?.score)
    })

    styleRange(worksheet, rowNumber, 1, lastColumn, {
      alignment: { horizontal: 'center', vertical: 'middle' },
    })
  })

  const overallRow = headerRow + itemRows.length + 1
  worksheet.getCell(overallRow, 1).value = 'Overall Score'
  worksheet.mergeCells(overallRow, 1, overallRow, fixedColumnCount)
  styleRange(worksheet, overallRow, 1, fixedColumnCount, {
    fill: scoreFill,
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'middle' },
  })

  records.forEach((record, recordIndex) => {
    const startColumn = fixedColumnCount + recordIndex * groupWidth + 1
    worksheet.getCell(overallRow, startColumn).value = displayCell(record.overallScore)
    worksheet.mergeCells(overallRow, startColumn, overallRow, startColumn + groupWidth - 1)
    const status = String(record.errorCode ?? '').toUpperCase()
    styleRange(worksheet, overallRow, startColumn, startColumn + groupWidth - 1, {
      fill: status && status !== 'PASS' && status !== '0' ? failFill : passFill,
      font: { bold: true },
      alignment: { horizontal: 'center', vertical: 'middle' },
    })
  })

  worksheet.getColumn(1).width = 36
  for (let column = 2; column <= 11; column += 1) worksheet.getColumn(column).width = 9.28515625
  for (let column = 12; column <= lastColumn; column += 1) worksheet.getColumn(column).width = 13.5703125
  worksheet.views = [{ state: 'frozen', xSplit: 5, ySplit: 10, topLeftCell: 'F11' }]
  worksheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: headerRow, column: Math.min(lastColumn, 11) },
  }

  return worksheet
}

export function buildTopProductWorkbook(records: TopProductExcelRecord[]): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  const recordsByStation = new Map<string, TopProductExcelRecord[]>()

  records.forEach((record, index) => {
    const station = record.station || 'Results'
    const stationRecords = recordsByStation.get(station) ?? []
    stationRecords.push({ ...record, sourceOrder: record.sourceOrder ?? index })
    recordsByStation.set(station, stationRecords)
  })

  const usedSheetNames = new Set<string>()
  recordsByStation.forEach((stationRecords, station) => {
    addSheet(workbook, normalizeSheetName(station, usedSheetNames), stationRecords)
  })

  if (records.length === 0) addSheet(workbook, 'Results', [])
  return workbook
}

export async function downloadTopProductWorkbook(
  workbook: ExcelJS.Workbook,
  filename: string,
): Promise<void> {
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