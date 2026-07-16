import { describe, expect, it } from 'vitest'
import type { RecordScoreResult } from '@/features/dut/types/scoring.types'
import {
  buildTopProductWorkbook,
  createTopProductExcelRecordFromIplas,
  createTopProductExcelRecordsFromComparison,
  createTopProductExcelRecordFromUploadLog,
  type TopProductExcelRecord,
} from './topProductExcelExport'

const makeRecord = (overrides: Partial<TopProductExcelRecord>): TopProductExcelRecord => ({
  isn: 'DUT-1',
  project: 'Project',
  tsp: 'Station-1',
  deviceId: 'Device-1',
  errorCode: 'PASS',
  errorName: '',
  type: 'ONLINE',
  testStartTime: '2026-04-01 08:00:00',
  testEndTime: '2026-04-01 08:01:00',
  station: 'Station-1',
  overallScore: 8,
  sourceOrder: 0,
  items: [
    {
      testItem: 'Voltage',
      ucl: 12,
      lcl: 8,
      target: 10,
      weight: 1,
      value: '10',
      deviation: 0,
      score: 8,
    },
  ],
  ...overrides,
})

describe('top product Excel export', () => {
  it('orders DUT groups by descending score and keeps stable ties and nulls last', async () => {
    const workbook = buildTopProductWorkbook([
      makeRecord({ isn: 'DUT-TIE-B', overallScore: 8, sourceOrder: 1 }),
      makeRecord({ isn: 'DUT-NULL', overallScore: null, sourceOrder: 2 }),
      makeRecord({ isn: 'DUT-HIGH', overallScore: 9, sourceOrder: 3 }),
      makeRecord({ isn: 'DUT-TIE-A', overallScore: 8, sourceOrder: 0 }),
    ])

    const sheet = workbook.worksheets[0]!
    expect(sheet.name).toBe('Station-1')
    expect(sheet.getCell('A10').value).toBe('TEST ITEM')
    expect(sheet.getCell('E10').value).toBe('Weight')
    expect(sheet.getCell('F10').value).toBe('VALUE')
    expect(sheet.getCell('F1').value).toBe('DUT-HIGH')
    expect(sheet.getCell('I1').value).toBe('DUT-TIE-A')
    expect(sheet.getCell('L1').value).toBe('DUT-TIE-B')
    expect(sheet.getCell('O1').value).toBe('DUT-NULL')
    expect(sheet.getCell('F12').value).toBe(9)
    expect(sheet.views[0]).toMatchObject({ state: 'frozen', xSplit: 5, ySplit: 10, topLeftCell: 'F11' })
  })

  it('preserves target, weight, deviation, score, and iPLAS score conversion', () => {
    const record = {
      Site: 'Site',
      Project: 'Project',
      station: 'Station-1',
      TSP: 'TSP-1',
      Model: 'Model',
      MO: 'MO',
      Line: 'Line',
      ISN: 'DUT-1',
      DeviceId: 'Device-1',
      'Test Status': 'PASS',
      'Test Start Time': '2026-04-01 08:00:00',
      'Test end Time': '2026-04-01 08:01:00',
      ErrorCode: '',
      ErrorName: '',
      TestItem: [{ NAME: 'Voltage', STATUS: 'PASS', VALUE: '10.2', UCL: '12', LCL: '8' }],
    }
    const scoredRecord: RecordScoreResult = {
      isn: 'DUT-1',
      deviceId: 'Device-1',
      station: 'Station-1',
      testStartTime: '2026-04-01 08:00:00',
      testStatus: 'PASS',
      overallScore: 0.91,
      valueItemsScore: 0.91,
      binItemsScore: null,
      totalItems: 1,
      scoredItems: 1,
      failedItems: 0,
      testItemScores: [
        {
          testItemName: 'Voltage',
          value: 10.2,
          ucl: 12,
          lcl: 8,
          status: 'PASS',
          scoringType: 'symmetrical',
          score: 0.87,
          deviation: 0.2,
          weight: 2,
          target: 10,
        },
      ],
    }

    const normalized = createTopProductExcelRecordFromIplas(record, scoredRecord)
    expect(normalized.overallScore).toBe(9.1)
    expect(normalized.items[0]).toMatchObject({
      target: 10,
      weight: 2,
      deviation: 0.2,
      score: 8.7,
    })
  })

  it('exports only selected comparison ISNs and filtered item records', () => {
    const compareResult = {
      total_files: 2,
      total_value_items: 2,
      total_non_value_items: 0,
      file_summaries: [
        {
          filename: 'a.txt',
          isn: 'DUT-A',
          metadata: {
            test_date: '2026-04-01',
            device: 'D1',
            station: 'Station-1',
            script_version: null,
            duration_seconds: 1,
            sfis_status: 'PASS',
            result: 'PASS',
            counter: null,
          },
          parsed_count: 2,
          avg_score: 8,
        },
        {
          filename: 'b.txt',
          isn: 'DUT-B',
          metadata: {
            test_date: '2026-04-01',
            device: 'D2',
            station: 'Station-1',
            script_version: null,
            duration_seconds: 1,
            sfis_status: 'PASS',
            result: 'PASS',
            counter: null,
          },
          parsed_count: 2,
          avg_score: 7,
        },
      ],
      comparison_value_items: [
        {
          test_item: 'Included',
          usl: 12,
          lsl: 8,
          baseline: 10,
          avg_deviation: 0,
          avg_score: 8,
          median_score: 8,
          matched_criteria: true,
          per_isn_data: [
            {
              isn: 'DUT-A',
              value: '10',
              is_value_type: true,
              numeric_value: 10,
              is_hex: false,
              hex_decimal: null,
              deviation: 0,
              score: 8,
              score_breakdown: { target: 10, weight: 2, deviation: 0 },
            },
          ],
        },
        {
          test_item: 'Excluded',
          usl: 12,
          lsl: 8,
          baseline: 10,
          avg_deviation: 0,
          avg_score: 8,
          median_score: 8,
          matched_criteria: true,
          per_isn_data: [],
        },
      ],
      comparison_non_value_items: [],
    }

    const includedItem = compareResult.comparison_value_items[0]!
    const records = createTopProductExcelRecordsFromComparison(
      compareResult,
      [includedItem],
      ['DUT-A'],
    )

    expect(records).toHaveLength(1)
    const exportedRecord = records[0]!
    expect(exportedRecord.isn).toBe('DUT-A')
    expect(exportedRecord.items).toHaveLength(1)
    expect(exportedRecord.items[0]).toMatchObject({ target: 10, weight: 2, deviation: 0, score: 8 })
  })

  it('uses scope-filtered Upload Log item fields in a single record', () => {
    const parseResult = {
      filename: 'upload.txt',
      isn: 'DUT-UPLOAD',
      station: 'Station-1',
      metadata: {
        test_date: '2026-04-01',
        device: 'Device-1',
        station: 'Station-1',
        script_version: null,
        duration_seconds: 1,
        sfis_status: 'PASS',
        result: 'PASS',
        counter: null,
      },
      parsed_count: 1,
      parsed_items_enhanced: [
        {
          test_item: 'Included',
          usl: 12,
          lsl: 8,
          value: '10',
          is_value_type: true,
          numeric_value: 10,
          is_hex: false,
          hex_decimal: null,
          matched_criteria: true,
          target: 10,
          score: 9,
          score_breakdown: { target: 10, weight: 3, deviation: 0 },
        },
      ],
      value_type_count: 1,
      non_value_type_count: 0,
      hex_value_count: 0,
      avg_score: 9,
      median_score: 9,
    }

    const record = createTopProductExcelRecordFromUploadLog(parseResult)
    expect(record.items).toHaveLength(1)
    expect(record.items[0]).toMatchObject({ target: 10, weight: 3, deviation: 0, score: 9 })
  })
})