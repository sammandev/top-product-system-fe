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
  return record.test_item.find((item) => normalizeLookupValue(item.NAME) === normalizedName)
}
