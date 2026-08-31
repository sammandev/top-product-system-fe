import { describe, expect, it } from 'vitest'
import type { IplasIsnSearchRecord } from '@/features/dut-logs/api/iplasProxyApi'
import {
  findIplasTestItem,
  getIplasRecordsForIsn,
  resolveIplasStationRecord,
} from '../iplasComparison'

function record(station: string): IplasIsnSearchRecord {
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
    test_item: [{ NAME: ' WiFi_TX_POW ', STATUS: 'PASS', VALUE: '18.2', UCL: '20' }],
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
})
