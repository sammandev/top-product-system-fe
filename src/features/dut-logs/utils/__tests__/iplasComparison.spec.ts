import { describe, expect, it } from 'vitest'
import type { IplasIsnSearchRecord } from '@/features/dut-logs/api/iplasProxyApi'
import {
  findIplasItemForIsn,
  findIplasTestItem,
  getIplasRecordsForIsn,
  resolveIplasStationRecord,
} from '../iplasComparison'

function record(
  station: string,
  items: Array<{ NAME: string; STATUS: string; VALUE: string; UCL?: string; LCL?: string }> = [
    { NAME: ' WiFi_TX_POW ', STATUS: 'PASS', VALUE: '18.2', UCL: '20' },
  ],
): IplasIsnSearchRecord {
  return {
    site: 'PTB',
    project: 'MODEL-X',
    isn: 'ISN-1',
    station_name: station,
    error_code: '',
    test_status: 'PASS',
    line: '1',
    test_start_time: '2026-08-31T00:00:00Z',
    test_end_time: '2026-08-31T00:01:00Z',
    device_id: '614644',
    display_station_name: station,
    test_item: items,
  }
}

describe('iPLAS comparison lookup', () => {
  it('uses each ISN first record while station selection is Auto', () => {
    expect(resolveIplasStationRecord([record('RF_TEST')], null)?.station_name).toBe('RF_TEST')
    expect(resolveIplasStationRecord([record('FINAL_TEST')], null)?.station_name).toBe('FINAL_TEST')
  })

  it('matches ISN, station, and test-item values without case or whitespace sensitivity', () => {
    const stationRecord = record('RF_TEST')
    const records = getIplasRecordsForIsn(new Map([[' isn-1 ', [stationRecord]]]), 'ISN-1')
    const selected = resolveIplasStationRecord(records, 'rf_test')

    expect(selected).toBe(stationRecord)
    expect(findIplasTestItem(selected!, 'wifi_tx_pow')?.VALUE).toBe('18.2')
  })

  it('finds test item across multiple records in Auto mode using preferred station or fallback', () => {
    const fatRecord = record('FAT', [{ NAME: 'BOOT_CHECK', STATUS: 'PASS', VALUE: '1' }])
    const calRecord = record('2G_CAL', [
      { NAME: '2G_TX_POW_CH1', STATUS: 'PASS', VALUE: '19.5', UCL: '21', LCL: '18' },
    ])
    const records = [fatRecord, calRecord]

    // Preferred station matches 2G_CAL
    const item1 = findIplasItemForIsn(records, '2G_TX_POW_CH1', null, '2G_CAL')
    expect(item1?.VALUE).toBe('19.5')

    // No preferred station, but finds item across records
    const item2 = findIplasItemForIsn(records, '2G_TX_POW_CH1', null, null)
    expect(item2?.VALUE).toBe('19.5')

    // Selected station explicitly specified
    const item3 = findIplasItemForIsn(records, '2G_TX_POW_CH1', '2G_CAL')
    expect(item3?.VALUE).toBe('19.5')

    // Selected station that does not contain the item
    const item4 = findIplasItemForIsn(records, '2G_TX_POW_CH1', 'FAT')
    expect(item4).toBeUndefined()
  })
})
