import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CsvTestItemData } from '@/features/dut-logs/composables/useIplasApi'
import { useIplasApi } from '@/features/dut-logs/composables/useIplasApi'
import { useScoring } from '../composables/useScoring'
import type { StationConfig } from './StationSelectionDialog.vue'
import TopProductIplasRanking from './TopProductIplasRanking.vue'
import TopProductIplasStationContent from './TopProductIplasStationContent.vue'

vi.mock('@/features/dut-logs/composables/useIplasApi', async () => {
  const { ref, shallowRef } = await import('vue')
  const testItemData = shallowRef<CsvTestItemData[]>([])
  const compactTestItemData = shallowRef([])
  const stationSearchCacheMetadata = ref(null)

  const state = {
    loading: ref(false),
    loadingStations: ref(false),
    loadingTestItems: ref(false),
    error: ref<string | null>(null),
    stationSearchCacheMetadata,
    stations: ref([
      { display_station_name: 'WIFI_2G', station_name: 'WIFI_2G_TSP', order: 1, data_source: 0 },
      { display_station_name: 'WIFI_5G', station_name: 'WIFI_5G_TSP', order: 2, data_source: 0 },
    ]),
    testItemData,
    compactTestItemData,
    uniqueSites: ref(['PTB']),
    projectsBySite: ref({ PTB: ['PRJ1'] }),
    fetchSiteProjects: vi.fn().mockResolvedValue([{ site: 'PTB', project: 'PRJ1' }]),
    fetchStations: vi.fn().mockResolvedValue([]),
    fetchDeviceIds: vi.fn().mockResolvedValue(['DEV-1', 'DEV-2', 'DEV-3']),
    fetchTestItemsFull: vi.fn(),
    fetchTestItemNamesCached: vi.fn(),
    fetchTestItemsFiltered: vi.fn(),
    fetchTestItemsBatch: vi.fn(),
    downloadAttachments: vi.fn(),
    downloadCsvLogs: vi.fn(),
    clearTestItemData: vi.fn(() => {
      testItemData.value = []
      compactTestItemData.value = []
      stationSearchCacheMetadata.value = null
    }),
  }
  return { useIplasApi: () => state }
})

vi.mock('../composables/useScoring', async () => {
  const { ref, shallowRef } = await import('vue')
  const scoredRecords = shallowRef<unknown[]>([])
  const state = {
    initializeConfigs: vi.fn(),
    calculateScores: vi.fn(),
    scoredRecords,
    updateConfig: vi.fn(),
    setScoringType: vi.fn(),
    error: ref<string | null>(null),
  }
  return { useScoring: () => state }
})

vi.mock('@/features/dut-logs/api/iplasProxyApi', () => ({
  iplasProxyApi: {
    getServerTime: vi.fn().mockResolvedValue({ server_time: '2026-11-05T10:00:00Z' }),
  },
}))

vi.mock('@/shared/composables/useNotification', () => ({
  useNotification: () => ({ showError: vi.fn(), showInfo: vi.fn(), showSuccess: vi.fn() }),
}))

enableAutoUnmount(afterEach)

interface ScoringInputRecord {
  ISN: string
  DeviceId: string
  station: string
  'Test Start Time'?: string
  'Test end Time'?: string
}

interface StationContentVm {
  selectedSite: string | null
  selectedProject: string | null
  startTime: string
  isSearching: boolean
  recordScores: Record<string, number>
  fetchTestItems: () => Promise<void>
  handleStationSelectionConfirm: (configs: Record<string, StationConfig>) => void
  handleStationConfigSave: (config: StationConfig) => Promise<void>
  removeStationConfig: (displayName: string) => void
}

function getVm(wrapper: { vm: unknown }): StationContentVm {
  return wrapper.vm as StationContentVm
}

function makeRecord(station: string, deviceId: string, isn: string): CsvTestItemData {
  return {
    Site: 'PTB',
    Project: 'PRJ1',
    station,
    TSP: station,
    Model: 'M1',
    MO: 'MO1',
    Line: 'L1',
    ISN: isn,
    DeviceId: deviceId,
    'Test Status': 'PASS',
    'Test Start Time': '2026-11-05 10:00:00',
    'Test end Time': '2026-11-05 10:01:00',
    ErrorCode: '0',
    ErrorName: '',
    TestItem: [{ NAME: 'TX_POW', STATUS: 'PASS', VALUE: '20', UCL: '25', LCL: '15', CYCLE: '' }],
  }
}

type BatchResult = Awaited<
  ReturnType<ReturnType<typeof useIplasApi>['fetchTestItemsBatch']>
>[number]

function batchSuccess(record: CsvTestItemData): BatchResult {
  return {
    device_id: record.DeviceId,
    response: {
      data: [record],
      total_records: 1,
      returned_records: 1,
      filtered: false,
      cached: false,
    },
    error: null,
    status_code: null,
  }
}

function batchFailure(deviceId: string, message: string): BatchResult {
  return { device_id: deviceId, response: null, error: message, status_code: 502 }
}

function appendRecords(records: CsvTestItemData[]): void {
  const api = useIplasApi()
  api.testItemData.value = [...api.testItemData.value, ...records]
}

describe('TopProductIplasStationContent performance optimizations', () => {
  beforeEach(() => {
    const api = useIplasApi()
    const scoring = useScoring()
    api.testItemData.value = []
    api.error.value = null
    scoring.scoredRecords.value = []
    vi.clearAllMocks()
  })

  it('fetches selected device IDs in concurrent batches instead of one by one, and uses ALL when deviceIds is empty', async () => {
    const api = useIplasApi()
    const scoring = useScoring()

    let inFlight = 0
    let maxInFlight = 0

    vi.mocked(api.fetchTestItemsBatch).mockImplementation(
      async (_site, _project, station, deviceIds) => {
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        await new Promise((resolve) => setTimeout(resolve, 30))
        const records = deviceIds.map((deviceId) =>
          makeRecord(station, deviceId, `ISN-${station}-${deviceId}`),
        )
        appendRecords(records)
        inFlight -= 1
        return records.map(batchSuccess)
      },
    )
    vi.mocked(api.fetchTestItemsFull).mockImplementation(
      async (_site, _project, station, deviceId) => {
        const rec = makeRecord(station, deviceId, `ISN-${station}-${deviceId}`)
        appendRecords([rec])
        return [rec]
      },
    )

    vi.mocked(scoring.calculateScores).mockImplementation(async (records: unknown[]) => {
      scoring.scoredRecords.value = (records as ScoringInputRecord[]).map((r) => ({
        isn: r.ISN,
        deviceId: r.DeviceId,
        station: r.station,
        testStartTime: r['Test Start Time'] ?? '',
        testStatus: 'PASS',
        overallScore: 0.9,
        valueItemsScore: 0.9,
        binItemsScore: 1.0,
        totalItems: 1,
        scoredItems: 1,
        failedItems: 0,
        testItemScores: [],
      }))
    })

    const wrapper = shallowMount(TopProductIplasStationContent)
    await flushPromises()
    const vm = getVm(wrapper)

    // Set project
    vm.selectedSite = 'PTB'
    vm.selectedProject = 'PRJ1'

    const configs: Record<string, StationConfig> = {
      WIFI_2G: {
        displayName: 'WIFI_2G',
        stationName: 'WIFI_2G_TSP',
        deviceIds: ['DEV-1', 'DEV-2', 'DEV-3'],
        testStatus: 'ALL',
      },
    }

    vm.handleStationSelectionConfirm(configs)
    await vi.waitFor(() => expect(api.testItemData.value).toHaveLength(3), { timeout: 2000 })
    await flushPromises()

    expect(api.fetchTestItemsFull).not.toHaveBeenCalled()
    expect(api.fetchTestItemsBatch).toHaveBeenCalledTimes(1)
    expect(api.fetchTestItemsBatch).toHaveBeenCalledWith(
      'PTB',
      'PRJ1',
      'WIFI_2G',
      ['DEV-1', 'DEV-2', 'DEV-3'],
      expect.any(Date),
      expect.any(Date),
      'ALL',
      undefined,
      undefined,
    )

    // Many devices are split into batches of 5 that run concurrently.
    vi.clearAllMocks()
    const manyDevices = Array.from({ length: 12 }, (_, index) => `DEV-${index + 10}`)
    vm.handleStationSelectionConfirm({
      WIFI_2G: { ...configs.WIFI_2G, deviceIds: manyDevices } as StationConfig,
    })
    await vi.waitFor(() => expect(api.testItemData.value).toHaveLength(12), { timeout: 2000 })
    await flushPromises()

    expect(vi.mocked(api.fetchTestItemsBatch).mock.calls.map((call) => call[3])).toEqual([
      manyDevices.slice(0, 5),
      manyDevices.slice(5, 10),
      manyDevices.slice(10),
    ])
    expect(maxInFlight).toBeGreaterThan(1)
    expect(api.testItemData.value).toHaveLength(12)

    // When deviceIds is empty ("All"), it should request 'ALL' directly without calling fetchDeviceIds
    vi.clearAllMocks()
    vm.handleStationSelectionConfirm({
      WIFI_5G: {
        displayName: 'WIFI_5G',
        stationName: 'WIFI_5G_TSP',
        deviceIds: [],
        testStatus: 'ALL',
      },
    })
    await new Promise((resolve) => setTimeout(resolve, 60))
    await flushPromises()

    expect(api.fetchDeviceIds).not.toHaveBeenCalled()
    expect(api.fetchTestItemsFull).toHaveBeenCalledTimes(1)
    expect(api.fetchTestItemsFull).toHaveBeenCalledWith(
      'PTB',
      'PRJ1',
      'WIFI_5G',
      'ALL',
      expect.any(Date),
      expect.any(Date),
      'ALL',
    )
  })

  it('preserves already-fetched station data and calculated scores when adding another station', async () => {
    const api = useIplasApi()
    const scoring = useScoring()

    vi.mocked(api.fetchTestItemsFull).mockImplementation(
      async (_site, _project, station, deviceId) => {
        const rec = makeRecord(station, deviceId, `ISN-${station}-${deviceId}`)
        api.testItemData.value = [...api.testItemData.value, rec]
        return [rec]
      },
    )

    vi.mocked(scoring.calculateScores).mockImplementation(async (records: unknown[]) => {
      scoring.scoredRecords.value = (records as ScoringInputRecord[]).map((r) => ({
        isn: r.ISN,
        deviceId: r.DeviceId,
        station: r.station,
        testStartTime: r['Test Start Time'] ?? '',
        testStatus: 'PASS',
        overallScore: r.station === 'WIFI_2G' ? 0.85 : 0.95,
        valueItemsScore: r.station === 'WIFI_2G' ? 0.85 : 0.95,
        binItemsScore: 1.0,
        totalItems: 1,
        scoredItems: 1,
        failedItems: 0,
        testItemScores: [],
      }))
    })

    const wrapper = shallowMount(TopProductIplasStationContent)
    await flushPromises()
    const vm = getVm(wrapper)

    vm.selectedSite = 'PTB'
    vm.selectedProject = 'PRJ1'

    // Step 1: Search and score Station 1 (WIFI_2G)
    await vm.handleStationConfigSave({
      displayName: 'WIFI_2G',
      stationName: 'WIFI_2G_TSP',
      deviceIds: ['DEV-1'],
      testStatus: 'ALL',
    } satisfies StationConfig)
    await flushPromises()

    expect(api.fetchTestItemsFull).toHaveBeenCalledTimes(1)
    expect(scoring.calculateScores).toHaveBeenCalledTimes(1)
    expect(vm.recordScores['ISN-WIFI_2G-DEV-1_WIFI_2G_2026-11-05 10:01:00']).toBe(0.85)

    vi.mocked(api.fetchTestItemsFull).mockClear()
    vi.mocked(scoring.calculateScores).mockClear()

    // Step 2: Add Station 2 (WIFI_5G) without changing Station 1
    await vm.handleStationConfigSave({
      displayName: 'WIFI_5G',
      stationName: 'WIFI_5G_TSP',
      deviceIds: ['DEV-2'],
      testStatus: 'ALL',
    } satisfies StationConfig)
    await flushPromises()

    // Should ONLY fetch WIFI_5G, NOT re-fetch WIFI_2G
    expect(api.fetchTestItemsFull).toHaveBeenCalledTimes(1)
    expect(api.fetchTestItemsFull).toHaveBeenCalledWith(
      'PTB',
      'PRJ1',
      'WIFI_5G',
      'DEV-2',
      expect.any(Date),
      expect.any(Date),
      'ALL',
    )

    // Should ONLY score WIFI_5G records, NOT re-score WIFI_2G records
    expect(scoring.calculateScores).toHaveBeenCalledTimes(1)
    const scoredBatch = (vi.mocked(scoring.calculateScores).mock.calls[0]?.[0] ??
      []) as ScoringInputRecord[]
    expect(scoredBatch).toHaveLength(1)
    expect(scoredBatch[0]?.station).toBe('WIFI_5G')

    // Both stations' records and scores must be present
    expect(api.testItemData.value.map((r) => r.station)).toEqual(['WIFI_2G', 'WIFI_5G'])
    expect(vm.recordScores).toEqual({
      'ISN-WIFI_2G-DEV-1_WIFI_2G_2026-11-05 10:01:00': 0.85,
      'ISN-WIFI_5G-DEV-2_WIFI_5G_2026-11-05 10:01:00': 0.95,
    })

    // Step 3: Removing WIFI_2G prunes only WIFI_2G records and scores without re-querying WIFI_5G
    vm.removeStationConfig('WIFI_2G')
    expect(api.testItemData.value.map((r) => r.station)).toEqual(['WIFI_5G'])
    expect(vm.recordScores).toEqual({
      'ISN-WIFI_5G-DEV-2_WIFI_5G_2026-11-05 10:01:00': 0.95,
    })
  })

  it('keeps the fetched signature tied to the search dates and prevents overlapping searches', async () => {
    const api = useIplasApi()
    let requestCount = 0
    let releaseFirstRequest: (() => void) | undefined
    const firstRequest = new Promise<void>((resolve) => {
      releaseFirstRequest = resolve
    })

    vi.mocked(api.fetchTestItemsFull).mockImplementation(
      async (_site, _project, station, deviceId) => {
        requestCount += 1
        if (requestCount === 1) {
          await firstRequest
        }
        const record = makeRecord(station, deviceId, `ISN-${requestCount}`)
        api.testItemData.value = [...api.testItemData.value, record]
        return [record]
      },
    )

    const wrapper = shallowMount(TopProductIplasStationContent, {
      global: {
        stubs: { AppPanel: { template: '<div><slot name="header-aside" /><slot /></div>' } },
      },
    })
    await flushPromises()
    const vm = getVm(wrapper)
    vm.handleStationSelectionConfirm({
      WIFI_2G: {
        displayName: 'WIFI_2G',
        stationName: 'WIFI_2G_TSP',
        deviceIds: ['DEV-1'],
        testStatus: 'ALL',
      },
    })
    vm.selectedSite = 'PTB'
    vm.selectedProject = 'PRJ1'

    await flushPromises()
    const searchButton = wrapper.get('button.top-product-iplas-station-button--primary')
    expect(searchButton.attributes('disabled')).toBeUndefined()
    const initialStartTime = vm.startTime
    const firstSearch = vm.fetchTestItems()
    await flushPromises()
    expect(vm.isSearching).toBe(true)
    expect(searchButton.attributes('disabled')).toBeDefined()
    expect(requestCount).toBe(1)
    expect(vi.mocked(api.fetchTestItemsFull).mock.calls[0]?.[4]).toEqual(new Date(initialStartTime))

    vm.startTime = '2026-11-04T00:00'
    await vm.fetchTestItems()
    expect(requestCount).toBe(1)

    releaseFirstRequest?.()
    await firstSearch
    expect(vm.isSearching).toBe(false)

    await vm.fetchTestItems()
    expect(requestCount).toBe(2)
    expect(vi.mocked(api.fetchTestItemsFull).mock.calls[1]?.[4]).toEqual(new Date(vm.startTime))
    await flushPromises()
    expect(searchButton.attributes('disabled')).toBeUndefined()
  })

  it('fetches a saved station configuration after an in-flight search finishes', async () => {
    const api = useIplasApi()
    const scoring = useScoring()
    let releaseFirstRequest: (() => void) | undefined
    const firstRequest = new Promise<void>((resolve) => {
      releaseFirstRequest = resolve
    })

    vi.mocked(api.fetchTestItemsFull).mockImplementation(
      async (_site, _project, station, deviceId) => {
        if (deviceId === 'DEV-1') {
          await firstRequest
        }
        const record = makeRecord(station, deviceId, `ISN-${deviceId}`)
        api.testItemData.value = [...api.testItemData.value, record]
        return [record]
      },
    )

    const wrapper = shallowMount(TopProductIplasStationContent)
    await flushPromises()
    const vm = getVm(wrapper)
    vm.handleStationSelectionConfirm({
      WIFI_2G: {
        displayName: 'WIFI_2G',
        stationName: 'WIFI_2G_TSP',
        deviceIds: ['DEV-1'],
        testStatus: 'ALL',
      },
    })
    vm.selectedSite = 'PTB'
    vm.selectedProject = 'PRJ1'

    const firstSearch = vm.fetchTestItems()
    await flushPromises()
    const saveConfig = vm.handleStationConfigSave({
      displayName: 'WIFI_2G',
      stationName: 'WIFI_2G_TSP',
      deviceIds: ['DEV-2'],
      testStatus: 'ALL',
    })
    await flushPromises()
    expect(api.fetchTestItemsFull).toHaveBeenCalledTimes(1)

    releaseFirstRequest?.()
    await Promise.all([firstSearch, saveConfig])

    expect(api.fetchTestItemsFull).toHaveBeenCalledTimes(2)
    expect(vi.mocked(api.fetchTestItemsFull).mock.calls[1]?.[3]).toBe('DEV-2')
    expect(api.testItemData.value.map((record) => record.DeviceId)).toEqual(['DEV-2'])
    expect(scoring.calculateScores).toHaveBeenCalledTimes(1)
    expect(vi.mocked(scoring.calculateScores).mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({ DeviceId: 'DEV-2' }),
    ])
  })

  it('serializes multiple station saves and fetches the latest configuration', async () => {
    const api = useIplasApi()
    let releaseFirst: (() => void) | undefined
    let releaseSecond: (() => void) | undefined
    const firstRequest = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const secondRequest = new Promise<void>((resolve) => {
      releaseSecond = resolve
    })
    vi.mocked(api.fetchTestItemsFull).mockImplementation(
      async (_site, _project, station, deviceId) => {
        if (deviceId === 'DEV-1') await firstRequest
        if (deviceId === 'DEV-2') await secondRequest
        const record = makeRecord(station, deviceId, `ISN-${deviceId}`)
        api.testItemData.value = [...api.testItemData.value, record]
        return [record]
      },
    )

    const wrapper = shallowMount(TopProductIplasStationContent)
    await flushPromises()
    const vm = getVm(wrapper)
    const config = {
      displayName: 'WIFI_2G',
      stationName: 'WIFI_2G_TSP',
      deviceIds: ['DEV-1'],
      testStatus: 'ALL' as const,
    }
    vm.handleStationSelectionConfirm({ WIFI_2G: config })
    vm.selectedSite = 'PTB'
    vm.selectedProject = 'PRJ1'

    const search = vm.fetchTestItems()
    await flushPromises()
    const firstSave = vm.handleStationConfigSave({ ...config, deviceIds: ['DEV-2'] })
    releaseFirst?.()
    await search
    await flushPromises()
    const callsAfterFirstSearch = vi
      .mocked(api.fetchTestItemsFull)
      .mock.calls.map((call) => call[3])

    const secondSave = vm.handleStationConfigSave({ ...config, deviceIds: ['DEV-3'] })
    await flushPromises()
    const callsBeforeSecondRelease = vi
      .mocked(api.fetchTestItemsFull)
      .mock.calls.map((call) => call[3])
    releaseSecond?.()
    await Promise.all([firstSave, secondSave])

    expect(callsAfterFirstSearch).toEqual(['DEV-1', 'DEV-2'])
    expect(callsBeforeSecondRelease).toEqual(['DEV-1', 'DEV-2'])
    expect(vi.mocked(api.fetchTestItemsFull).mock.calls.map((call) => call[3])).toEqual([
      'DEV-1',
      'DEV-2',
      'DEV-3',
    ])
    expect(api.testItemData.value.map((record) => record.DeviceId)).toEqual(['DEV-3'])
  })

  it('fetches a saved configuration even when the previous search fails', async () => {
    const api = useIplasApi()
    const failure = new Error('device request failed')
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    let releaseFirst: (() => void) | undefined
    const firstRequest = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    vi.mocked(api.fetchTestItemsFull).mockImplementation(
      async (_site, _project, station, deviceId) => {
        if (deviceId === 'DEV-1') {
          await firstRequest
          throw failure
        }
        const record = makeRecord(station, deviceId, `ISN-${deviceId}`)
        api.testItemData.value = [...api.testItemData.value, record]
        return [record]
      },
    )

    try {
      const wrapper = shallowMount(TopProductIplasStationContent)
      await flushPromises()
      const vm = getVm(wrapper)
      const config = {
        displayName: 'WIFI_2G',
        stationName: 'WIFI_2G_TSP',
        deviceIds: ['DEV-1'],
        testStatus: 'ALL' as const,
      }
      vm.handleStationSelectionConfirm({ WIFI_2G: config })
      vm.selectedSite = 'PTB'
      vm.selectedProject = 'PRJ1'

      const search = vm.fetchTestItems().catch((error: unknown) => error)
      await flushPromises()
      const save = vm.handleStationConfigSave({ ...config, deviceIds: ['DEV-2'] })
      releaseFirst?.()
      expect(await search).toBe(failure)
      await save

      expect(errorLog).toHaveBeenCalledWith('Previous station search failed:', failure)
      expect(vi.mocked(api.fetchTestItemsFull).mock.calls.map((call) => call[3])).toEqual([
        'DEV-1',
        'DEV-2',
      ])
      expect(api.testItemData.value.map((record) => record.DeviceId)).toEqual(['DEV-2'])
    } finally {
      errorLog.mockRestore()
    }
  })

  it('keeps the search locked until all requests settle after one request fails', async () => {
    const api = useIplasApi()
    const failure = new Error('device request failed')
    let releaseSecondRequest: (() => void) | undefined
    const secondRequest = new Promise<void>((resolve) => {
      releaseSecondRequest = resolve
    })
    vi.mocked(api.fetchTestItemsFull).mockImplementation(
      async (_site, _project, station, deviceId) => {
        if (deviceId === 'DEV-1') throw failure
        await secondRequest
        const record = makeRecord(station, deviceId, `ISN-${deviceId}`)
        api.testItemData.value = [...api.testItemData.value, record]
        return [record]
      },
    )

    const wrapper = shallowMount(TopProductIplasStationContent)
    await flushPromises()
    const vm = getVm(wrapper)
    vm.handleStationSelectionConfirm({
      WIFI_2G: {
        displayName: 'WIFI_2G',
        stationName: 'WIFI_2G_TSP',
        deviceIds: ['DEV-1'],
        testStatus: 'ALL',
      },
      WIFI_5G: {
        displayName: 'WIFI_5G',
        stationName: 'WIFI_5G_TSP',
        deviceIds: ['DEV-2'],
        testStatus: 'ALL',
      },
    })
    vm.selectedSite = 'PTB'
    vm.selectedProject = 'PRJ1'

    const firstSearch = vm.fetchTestItems().catch((error: unknown) => error)
    await flushPromises()
    const searchingWhileSecondRequestPending = vm.isSearching
    const overlappingSearch = vm.fetchTestItems().catch((error: unknown) => error)
    await flushPromises()
    const callsBeforeRelease = vi.mocked(api.fetchTestItemsFull).mock.calls.length
    releaseSecondRequest?.()
    const [firstResult] = await Promise.all([firstSearch, overlappingSearch])

    expect(firstResult).toBe(failure)
    expect(searchingWhileSecondRequestPending).toBe(true)
    expect(callsBeforeRelease).toBe(2)
    expect(vm.isSearching).toBe(false)
  })

  it('discards removed station results even when another device request fails', async () => {
    const api = useIplasApi()
    const failure = new Error('device request failed')
    let releaseSecondRequest: (() => void) | undefined
    const secondRequest = new Promise<void>((resolve) => {
      releaseSecondRequest = resolve
    })
    vi.mocked(api.fetchTestItemsFull).mockImplementation(
      async (_site, _project, station, deviceId) => {
        if (deviceId === 'DEV-1') throw failure
        await secondRequest
        const record = makeRecord(station, deviceId, `ISN-${deviceId}`)
        api.testItemData.value = [...api.testItemData.value, record]
        return [record]
      },
    )

    const wrapper = shallowMount(TopProductIplasStationContent)
    await flushPromises()
    const vm = getVm(wrapper)
    vm.handleStationSelectionConfirm({
      WIFI_2G: {
        displayName: 'WIFI_2G',
        stationName: 'WIFI_2G_TSP',
        deviceIds: ['DEV-1'],
        testStatus: 'ALL',
      },
      WIFI_5G: {
        displayName: 'WIFI_5G',
        stationName: 'WIFI_5G_TSP',
        deviceIds: ['DEV-2'],
        testStatus: 'ALL',
      },
    })
    vm.selectedSite = 'PTB'
    vm.selectedProject = 'PRJ1'

    const search = vm.fetchTestItems().catch((error: unknown) => error)
    await flushPromises()
    vm.removeStationConfig('WIFI_5G')
    releaseSecondRequest?.()

    expect(await search).toBe(failure)
    expect(api.testItemData.value).toEqual([])
  })

  it.each(['station removed', 'site changed'])(
    'discards in-flight results when %s',
    async (change) => {
      const api = useIplasApi()
      let releaseRequest: (() => void) | undefined
      const request = new Promise<void>((resolve) => {
        releaseRequest = resolve
      })
      vi.mocked(api.fetchTestItemsFull).mockImplementation(
        async (_site, _project, station, deviceId) => {
          await request
          const record = makeRecord(station, deviceId, `ISN-${deviceId}`)
          api.testItemData.value = [...api.testItemData.value, record]
          return [record]
        },
      )

      const wrapper = shallowMount(TopProductIplasStationContent)
      await flushPromises()
      const vm = getVm(wrapper)
      vm.handleStationSelectionConfirm({
        WIFI_2G: {
          displayName: 'WIFI_2G',
          stationName: 'WIFI_2G_TSP',
          deviceIds: ['DEV-1'],
          testStatus: 'ALL',
        },
      })
      vm.selectedSite = 'PTB'
      vm.selectedProject = 'PRJ1'

      const search = vm.fetchTestItems()
      await flushPromises()
      if (change === 'station removed') {
        vm.removeStationConfig('WIFI_2G')
      } else {
        vm.selectedSite = 'TY'
        vm.selectedProject = 'PRJ2'
      }
      releaseRequest?.()
      await search

      expect(api.testItemData.value).toEqual([])
      expect(api.error.value).toBeNull()
    },
  )

  it('retries only failed devices after a partial batch failure and refetches all when config changes', async () => {
    const api = useIplasApi()
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(api.fetchTestItemsBatch).mockImplementation(
      async (_site, _project, station, deviceIds) => {
        const results = deviceIds.map((deviceId) =>
          deviceId === 'DEV-2' && vi.mocked(api.fetchTestItemsBatch).mock.calls.length === 1
            ? batchFailure(deviceId, 'iPLAS upstream failed')
            : batchSuccess(makeRecord(station, deviceId, `ISN-${deviceId}`)),
        )
        appendRecords(
          results.flatMap((result) => (result.response?.data ?? []) as CsvTestItemData[]),
        )
        return results
      },
    )
    vi.mocked(api.fetchTestItemsFull).mockImplementation(
      async (_site, _project, station, deviceId) => {
        const record = makeRecord(station, deviceId, `ISN-${deviceId}`)
        appendRecords([record])
        return [record]
      },
    )

    try {
      const wrapper = shallowMount(TopProductIplasStationContent)
      await flushPromises()
      const vm = getVm(wrapper)
      const config: StationConfig = {
        displayName: 'WIFI_2G',
        stationName: 'WIFI_2G_TSP',
        deviceIds: ['DEV-1', 'DEV-2', 'DEV-3'],
        testStatus: 'ALL',
      }
      vm.handleStationSelectionConfirm({ WIFI_2G: config })
      vm.selectedSite = 'PTB'
      vm.selectedProject = 'PRJ1'

      const firstError = await vm.fetchTestItems().catch((error: unknown) => error)
      expect(String(firstError)).toContain('DEV-2: iPLAS upstream failed')
      expect(api.error.value).toContain('DEV-2: iPLAS upstream failed')
      expect(api.testItemData.value.map((record) => record.DeviceId)).toEqual(['DEV-1', 'DEV-3'])

      await vm.fetchTestItems()
      expect(api.fetchTestItemsBatch).toHaveBeenCalledTimes(1)
      expect(api.fetchTestItemsFull).toHaveBeenCalledTimes(1)
      expect(vi.mocked(api.fetchTestItemsFull).mock.calls[0]?.[3]).toBe('DEV-2')
      expect(api.testItemData.value.map((record) => record.DeviceId)).toEqual([
        'DEV-1',
        'DEV-3',
        'DEV-2',
      ])

      await vm.fetchTestItems()
      expect(api.fetchTestItemsBatch).toHaveBeenCalledTimes(1)
      expect(api.fetchTestItemsFull).toHaveBeenCalledTimes(1)

      await vm.handleStationConfigSave({ ...config, testStatus: 'PASS' })
      await flushPromises()
      expect(api.fetchTestItemsBatch).toHaveBeenCalledTimes(2)
      expect(vi.mocked(api.fetchTestItemsBatch).mock.calls[1]?.slice(3, 7)).toEqual([
        ['DEV-1', 'DEV-2', 'DEV-3'],
        expect.any(Date),
        expect.any(Date),
        'PASS',
      ])
      expect(api.testItemData.value.map((record) => record.DeviceId)).toEqual([
        'DEV-1',
        'DEV-2',
        'DEV-3',
      ])
    } finally {
      errorLog.mockRestore()
    }
  })

  it('keeps finished device rows visible and shows device progress while other devices load', async () => {
    const api = useIplasApi()
    let releaseLastDevice: (() => void) | undefined
    const lastDevice = new Promise<void>((resolve) => {
      releaseLastDevice = resolve
    })
    vi.mocked(api.fetchTestItemsBatch).mockImplementation(
      async (_site, _project, station, deviceIds) => {
        const records = deviceIds.map((deviceId) =>
          makeRecord(station, deviceId, `ISN-${deviceId}`),
        )
        appendRecords(records)
        return records.map(batchSuccess)
      },
    )
    vi.mocked(api.fetchTestItemsFull).mockImplementation(
      async (_site, _project, station, deviceId) => {
        await lastDevice
        const record = makeRecord(station, deviceId, `ISN-${deviceId}`)
        appendRecords([record])
        return [record]
      },
    )

    const wrapper = shallowMount(TopProductIplasStationContent, {
      global: {
        stubs: { AppPanel: { template: '<div><slot name="header-aside" /><slot /></div>' } },
      },
    })
    await flushPromises()
    const vm = getVm(wrapper)
    vm.handleStationSelectionConfirm({
      WIFI_2G: {
        displayName: 'WIFI_2G',
        stationName: 'WIFI_2G_TSP',
        deviceIds: ['DEV-1', 'DEV-2', 'DEV-3', 'DEV-4', 'DEV-5', 'DEV-6'],
        testStatus: 'ALL',
      },
    })
    vm.selectedSite = 'PTB'
    vm.selectedProject = 'PRJ1'

    api.loadingTestItems.value = true
    try {
      const search = vm.fetchTestItems()
      await flushPromises()

      const ranking = wrapper.findComponent(TopProductIplasRanking)
      expect(ranking.exists()).toBe(true)
      expect(ranking.props('loading')).toBe(true)
      expect(ranking.props('showRowsWhileLoading')).toBe(true)
      expect(ranking.props('records')).toHaveLength(5)
      expect(wrapper.get('[data-testid="device-fetch-progress"]').text()).toContain(
        '5 of 6 device requests complete',
      )

      releaseLastDevice?.()
      await search
      await flushPromises()
      expect(api.testItemData.value).toHaveLength(6)
      expect(wrapper.find('[data-testid="device-fetch-progress"]').exists()).toBe(false)
    } finally {
      api.loadingTestItems.value = false
    }
  })

  it('does not refetch or rescore a multi-device station when another station is added', async () => {
    const api = useIplasApi()
    const scoring = useScoring()
    vi.mocked(api.fetchTestItemsBatch).mockImplementation(
      async (_site, _project, station, deviceIds) => {
        const records = deviceIds.map((deviceId) =>
          makeRecord(station, deviceId, `ISN-${station}-${deviceId}`),
        )
        appendRecords(records)
        return records.map(batchSuccess)
      },
    )
    vi.mocked(api.fetchTestItemsFull).mockImplementation(
      async (_site, _project, station, deviceId) => {
        const record = makeRecord(station, deviceId, `ISN-${station}-${deviceId}`)
        appendRecords([record])
        return [record]
      },
    )
    vi.mocked(scoring.calculateScores).mockImplementation(async (records: unknown[]) => {
      scoring.scoredRecords.value = (records as ScoringInputRecord[]).map((r) => ({
        isn: r.ISN,
        deviceId: r.DeviceId,
        station: r.station,
        testStartTime: r['Test Start Time'] ?? '',
        testStatus: 'PASS',
        overallScore: r.station === 'WIFI_2G' ? 0.85 : 0.95,
        valueItemsScore: r.station === 'WIFI_2G' ? 0.85 : 0.95,
        binItemsScore: 1.0,
        totalItems: 1,
        scoredItems: 1,
        failedItems: 0,
        testItemScores: [],
      }))
    })

    const wrapper = shallowMount(TopProductIplasStationContent)
    await flushPromises()
    const vm = getVm(wrapper)
    vm.selectedSite = 'PTB'
    vm.selectedProject = 'PRJ1'

    await vm.handleStationConfigSave({
      displayName: 'WIFI_2G',
      stationName: 'WIFI_2G_TSP',
      deviceIds: ['DEV-1', 'DEV-2'],
      testStatus: 'ALL',
    })
    await flushPromises()
    expect(api.fetchTestItemsBatch).toHaveBeenCalledTimes(1)
    expect(scoring.calculateScores).toHaveBeenCalledTimes(1)
    vi.mocked(api.fetchTestItemsBatch).mockClear()
    vi.mocked(scoring.calculateScores).mockClear()

    await vm.handleStationConfigSave({
      displayName: 'WIFI_5G',
      stationName: 'WIFI_5G_TSP',
      deviceIds: ['DEV-3'],
      testStatus: 'ALL',
    })
    await flushPromises()

    expect(api.fetchTestItemsBatch).not.toHaveBeenCalled()
    expect(api.fetchTestItemsFull).toHaveBeenCalledTimes(1)
    expect(vi.mocked(api.fetchTestItemsFull).mock.calls[0]?.[2]).toBe('WIFI_5G')
    expect(scoring.calculateScores).toHaveBeenCalledTimes(1)
    const scoredBatch = (vi.mocked(scoring.calculateScores).mock.calls[0]?.[0] ??
      []) as ScoringInputRecord[]
    expect(scoredBatch.map((record) => record.station)).toEqual(['WIFI_5G'])
    expect(vm.recordScores).toEqual({
      'ISN-WIFI_2G-DEV-1_WIFI_2G_2026-11-05 10:01:00': 0.85,
      'ISN-WIFI_2G-DEV-2_WIFI_2G_2026-11-05 10:01:00': 0.85,
      'ISN-WIFI_5G-DEV-3_WIFI_5G_2026-11-05 10:01:00': 0.95,
    })
  })
})
