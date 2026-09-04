import type { IplasIsnSearchRecord, IplasIsnTestItem } from '@/features/dut-logs/api/iplasProxyApi'

function normalizeLookupValue(value: string): string {
  return value.trim().toLowerCase()
}

export function getIplasRecordsForIsn(
  recordsByIsn: Map<string, IplasIsnSearchRecord[]>,
  isn: string,
): IplasIsnSearchRecord[] {
  const directMatch = recordsByIsn.get(isn)
  if (directMatch) return directMatch

  const normalizedIsn = normalizeLookupValue(isn)
  for (const [key, records] of recordsByIsn) {
    if (normalizeLookupValue(key) === normalizedIsn) return records
  }

  return []
}

export function resolveIplasStationRecord(
  records: IplasIsnSearchRecord[],
  selectedStation: string | null,
): IplasIsnSearchRecord | undefined {
  if (!selectedStation) return records[0]

  const normalizedStation = normalizeLookupValue(selectedStation)
  return records.find(
    (record) =>
      normalizeLookupValue(record.display_station_name || '') === normalizedStation ||
      normalizeLookupValue(record.station_name || '') === normalizedStation,
  )
}

export function findIplasTestItem(
  record: IplasIsnSearchRecord,
  testItemName: string,
): IplasIsnTestItem | undefined {
  const normalizedName = normalizeLookupValue(testItemName)
  return (record.test_item || []).find(
    (item) => normalizeLookupValue(item.NAME) === normalizedName,
  )
}

export function findIplasItemForIsn(
  records: IplasIsnSearchRecord[],
  testItemName: string,
  selectedStation: string | null,
  preferredStation?: string | null,
): IplasIsnTestItem | undefined {
  if (!records || records.length === 0) return undefined

  if (selectedStation) {
    const stationRecord = resolveIplasStationRecord(records, selectedStation)
    return stationRecord ? findIplasTestItem(stationRecord, testItemName) : undefined
  }

  // Auto mode
  // 1. Try preferred station (e.g. matching uploaded log station)
  if (preferredStation) {
    const matchingRecord = resolveIplasStationRecord(records, preferredStation)
    if (matchingRecord) {
      const item = findIplasTestItem(matchingRecord, testItemName)
      if (item) return item
    }
  }

  // 2. Search across all station records for this ISN
  for (const record of records) {
    const item = findIplasTestItem(record, testItemName)
    if (item) return item
  }

  return undefined
}
