import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CsvTestItemData } from '@/features/dut-logs/api/iplasApi'
import { useIplasApi } from '@/features/dut-logs/composables/useIplasApi'
import AppMultiSelect from '@/shared/ui/forms/AppMultiSelect.vue'
import IplasDataContent from './IplasDataContent.vue'
import IplasIsnSearchContent from './IplasIsnSearchContent.vue'
import IplasTestItemsFullscreenDialog from './IplasTestItemsFullscreenDialog.vue'
import TopProductIplasDetailsDialog from './TopProductIplasDetailsDialog.vue'
import TopProductIplasRanking from './TopProductIplasRanking.vue'
import TopProductsByIplasDataTab from './TopProductsByIplasDataTab.vue'

vi.mock('@/features/dut-logs/composables/useIplasApi', async () => {
  const { ref } = await import('vue')
  const state = {
    loading: ref(false),
    loadingStations: ref(false),
    loadingTestItems: ref(false),
    loadingIsnSearch: ref(false),
    downloading: ref(false),
    error: ref(null),
    possiblyTruncated: ref(false),
    stations: ref([]),
    testItemData: ref([]),
    compactTestItemData: ref([]),
    uniqueSites: ref([]),
    projectsBySite: ref({}),
    fetchSiteProjects: vi.fn().mockResolvedValue(undefined),
    fetchStations: vi.fn(),
    fetchDeviceIds: vi.fn(),
    fetchRecordTestItems: vi.fn(),
    downloadAttachments: vi.fn(),
    downloadCsvLogs: vi.fn(),
    batchDownloadLogs: vi.fn(),
    clearTestItemData: vi.fn(),
    searchByIsn: vi.fn(),
    searchByIsnBatch: vi.fn(),
    clearIsnSearchData: vi.fn(),
  }
  return { useIplasApi: () => state }
})

vi.mock('@/features/dut-logs/composables/useIplasQueries', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/dut-logs/composables/useIplasQueries')>()),
  fetchIplasStationsFromIsnQuery: vi.fn().mockResolvedValue([]),
  fetchIplasStationsFromIsnBatchQuery: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/features/dut-logs/composables/useIplasSettings', async () => {
  const { ref } = await import('vue')
  return { useIplasSettings: () => ({ apiToken: ref('test-token') }) }
})

vi.mock('@/features/dut-logs/api/iplasProxyApi', () => ({
  iplasProxyApi: {
    getServerTime: vi.fn().mockResolvedValue({ server_time: '2026-11-05T10:00:00Z' }),
  },
}))

vi.mock('@/shared/composables/useTabPersistence', async () => {
  const { ref } = await import('vue')
  return { useTabPersistence: () => ref('station') }
})

vi.mock('@/shared/composables/useNotification', () => ({
  useNotification: () => ({ showError: vi.fn(), showInfo: vi.fn(), showSuccess: vi.fn() }),
}))

enableAutoUnmount(afterEach)

function createRecord(deviceId: string, station = 'WIFI_25G'): CsvTestItemData {
  return {
    Site: 'Sample site',
    Project: 'Sample project',
    station,
    TSP: station,
    Model: '',
    MO: '',
    Line: 'Line 1',
    ISN: `ISN-${deviceId}`,
    DeviceId: deviceId,
    'Test Status': deviceId === 'DEVICE-02' ? 'FAIL' : 'PASS',
    'Test Start Time': '2026-11-05T10:00:00',
    'Test end Time': '2026-11-05T10:01:00',
    ErrorCode: deviceId === 'DEVICE-02' ? 'FAIL' : 'PASS',
    ErrorName: '',
    TestItem: [],
  }
}

describe('Regular Mode result filters', () => {
  it('uses searchable checkbox dropdowns for ISN, status, and device and preserves per-station selection and status filters', async () => {
    useIplasApi().testItemData.value = [
      createRecord('DEVICE-01'),
      createRecord('DEVICE-02'),
      createRecord('DEVICE-03', 'OTHER'),
    ]
    const wrapper = shallowMount(IplasDataContent, {
      global: {
        stubs: {
          IplasRecordTable: {
            name: 'IplasRecordTable',
            props: ['items'],
            template: '<div />',
          },
          AppPanel: { template: '<div><slot /></div>' },
          AppTabs: {
            name: 'AppTabs',
            props: ['modelValue', 'items'],
            template: '<div><slot :name="\'panel-\' + modelValue" /></div>',
          },
        },
      },
    })
    await flushPromises()

    expect(wrapper.find('.iplas-result-summary-card').exists()).toBe(false)
    expect(wrapper.find('input[type="search"]').exists()).toBe(false)
    const filter = (label: string) =>
      wrapper
        .findAllComponents(AppMultiSelect)
        .find((select) => select.attributes('aria-label') === label)
    const isns = filter('Search Records')
    const status = filter('Status')
    const devices = filter('Device Filter')
    if (!isns || !status || !devices) throw new Error('Missing Regular Mode filter')

    for (const select of [isns, status, devices]) {
      expect(select.props('searchable')).toBe(true)
    }
    expect(isns.props('options')).toEqual([
      { label: 'ISN-DEVICE-01', value: 'ISN-DEVICE-01' },
      { label: 'ISN-DEVICE-02', value: 'ISN-DEVICE-02' },
    ])
    expect(status.props('options')).toEqual([
      { label: 'PASS', value: 'PASS' },
      { label: 'FAIL', value: 'FAIL' },
    ])
    expect(devices.props('options')).toEqual([
      { label: 'DEVICE-01', value: 'DEVICE-01' },
      { label: 'DEVICE-02', value: 'DEVICE-02' },
    ])

    const table = () => wrapper.findComponent({ name: 'IplasRecordTable' })
    expect(table().props('items')).toHaveLength(2)
    expect(wrapper.get('.iplas-record-filters__header').text()).toContain('Filter station records')
    expect(wrapper.get('.iplas-record-filters__counts').text()).toContain('2 device IDs')
    expect(wrapper.get('.iplas-record-filters__counts').text()).toContain('2 records')
    expect(isns.props('selectMatchesOnEnter')).toBe(true)
    expect(devices.props('selectMatchesOnEnter')).toBe(true)
    devices.vm.$emit('update:modelValue', ['DEVICE-02'])
    await wrapper.vm.$nextTick()
    expect(table().props('items')).toEqual([createRecord('DEVICE-02')])

    status.vm.$emit('update:modelValue', ['PASS'])
    await wrapper.vm.$nextTick()
    expect(table().props('items')).toHaveLength(0)
    status.vm.$emit('update:modelValue', ['PASS', 'FAIL'])
    await wrapper.vm.$nextTick()
    expect(table().props('items')).toHaveLength(1)
    status.vm.$emit('update:modelValue', [])
    await wrapper.vm.$nextTick()

    const stationTabs = wrapper.findAllComponents({ name: 'AppTabs' })[1]
    expect(stationTabs).toBeDefined()
    stationTabs?.vm.$emit('update:modelValue', 'station-1')
    await wrapper.vm.$nextTick()
    expect(devices.props('modelValue')).toEqual([])
    expect(table().props('items')).toEqual([createRecord('DEVICE-03', 'OTHER')])

    stationTabs?.vm.$emit('update:modelValue', 'station-0')
    await wrapper.vm.$nextTick()
    expect(devices.props('modelValue')).toEqual(['DEVICE-02'])
    expect(table().props('items')).toHaveLength(1)

    devices.vm.$emit('update:modelValue', [])
    await wrapper.vm.$nextTick()
    expect(table().props('items')).toHaveLength(2)

    isns.vm.$emit('update:modelValue', ['ISN-DEVICE-01'])
    await wrapper.vm.$nextTick()
    expect(table().props('items')).toEqual([createRecord('DEVICE-01')])
  })

  it('downloads TXT with the raw station and CSV with TSP, preserving the original end time', async () => {
    const api = useIplasApi()
    vi.mocked(api.downloadAttachments).mockClear()
    vi.mocked(api.downloadCsvLogs).mockClear()
    const record = {
      ...createRecord('DEVICE-01', 'NFT_TEST'),
      TSP: 'NFT TEST',
      'Test end Time': '2026-11-05T10:01:00.123',
    }
    api.testItemData.value = [record]
    const wrapper = shallowMount(IplasDataContent, {
      global: {
        stubs: {
          IplasRecordTable: { name: 'IplasRecordTable', template: '<div />' },
          AppPanel: { template: '<div><slot /></div>' },
          AppTabs: {
            props: ['modelValue'],
            template: '<div><slot :name="\'panel-\' + modelValue" /></div>',
          },
        },
      },
    })
    await flushPromises()
    wrapper.findComponent({ name: 'IplasRecordTable' }).vm.$emit('row-click', record)
    await flushPromises()
    wrapper.findComponent(TopProductIplasDetailsDialog).vm.$emit('download')
    await flushPromises()
    expect(api.downloadAttachments).toHaveBeenCalledWith('Sample site', 'Sample project', [
      {
        isn: 'ISN-DEVICE-01',
        deviceid: 'DEVICE-01',
        station: 'NFT_TEST',
        time: '2026/11/05 10:01:00',
      },
    ])
    expect(api.downloadCsvLogs).toHaveBeenCalledWith([
      {
        site: 'Sample site',
        project: 'Sample project',
        station: 'NFT TEST',
        line: 'Line 1',
        model: 'ALL',
        deviceid: 'DEVICE-01',
        isn: 'ISN-DEVICE-01',
        test_end_time: '2026/11/05 10:01:00.123',
        data_source: 0,
      },
    ])
  })
})

it('downloads both logs from the Top Products details dialog instead of doing nothing', async () => {
  const api = useIplasApi()
  vi.mocked(api.downloadAttachments).mockClear()
  vi.mocked(api.downloadCsvLogs).mockClear()
  const wrapper = shallowMount(TopProductsByIplasDataTab, {
    global: {
      stubs: { AppTabs: { template: '<div><slot name="panel-station" /></div>' } },
    },
  })
  wrapper.findComponent({ name: 'TopProductIplasStationContent' }).vm.$emit('show-details', {
    isn: 'SAMPLE-ISN',
    deviceId: 'DEVICE-01',
    stationName: 'NFT_TEST',
    displayStationName: 'NFT TEST',
    site: 'Sample site',
    project: 'Sample project',
    line: 'Line 1',
    model: 'Sample model',
    testEndTime: '2026-11-05T10:01:00',
  })
  await wrapper.vm.$nextTick()
  wrapper.findComponent(TopProductIplasDetailsDialog).vm.$emit('download')
  await flushPromises()
  expect(api.downloadAttachments).toHaveBeenCalledWith('Sample site', 'Sample project', [
    { isn: 'SAMPLE-ISN', deviceid: 'DEVICE-01', station: 'NFT_TEST', time: '2026/11/05 10:01:00' },
  ])
  expect(api.downloadCsvLogs).toHaveBeenCalledWith([
    expect.objectContaining({
      station: 'NFT TEST',
      model: 'Sample model',
      test_end_time: '2026/11/05 10:01:00.000',
    }),
  ])
})

it('shows per-station record counts beside device IDs without the records-shown subtitle', async () => {
  const wrapper = shallowMount(TopProductIplasRanking, {
    props: {
      records: [
        createRecord('DEVICE-01'),
        createRecord('DEVICE-02'),
        createRecord('DEVICE-03', 'OTHER'),
      ],
    },
    global: {
      stubs: {
        AppPanel: { template: '<div><slot /></div>' },
        AppTabs: {
          props: ['modelValue', 'items'],
          template: '<div><slot v-for="item in items" :name="\'panel-\' + item.value" /></div>',
        },
      },
    },
  })
  await wrapper.vm.$nextTick()
  const header = wrapper.findAll('.ranking-filter-header')[0]
  expect(header?.text()).not.toContain('records shown')
  expect(header?.findAll('.ranking-pill').map((pill) => pill.text())).toEqual([
    '2 device IDs',
    '2 records',
  ])
})

it('downloads ISN details using API-facing station for TXT and internal station for CSV', async () => {
  const api = useIplasApi()
  vi.mocked(api.downloadAttachments).mockClear()
  vi.mocked(api.downloadCsvLogs).mockClear()
  vi.mocked(api.searchByIsn).mockResolvedValue([
    {
      site: 'PTB',
      project: 'Sample project',
      isn: 'SAMPLE-ISN',
      station_name: 'NFT TEST',
      display_station_name: 'NFT_TEST',
      device_id: 'DEVICE-01',
      error_code: 'PASS',
      test_status: 'PASS',
      line: 'Line 1',
      test_start_time: '2026-11-05 02:00:00%:z',
      test_end_time: '2026-11-05 02:01:00%:z',
      test_item: [],
    },
  ])
  const wrapper = shallowMount(IplasIsnSearchContent, {
    global: {
      stubs: {
        AppPanel: { template: '<div><slot /></div>' },
        AppTabs: {
          props: ['items'],
          template: '<div><slot v-for="item in items" :name="\'panel-\' + item.value" /></div>',
        },
      },
    },
  })
  await wrapper.get('input[type="checkbox"]').setValue(false)
  await wrapper.get('#iplas-isn-multiple-input').setValue('SAMPLE-ISN ')
  const search = wrapper.findAll('button').find((button) => button.text() === 'Search')
  if (!search) throw new Error('Missing ISN Search action')
  await search.trigger('click')
  await flushPromises()
  const details = wrapper.findAll('button').find((button) => button.text() === 'Details')
  if (!details) throw new Error('Missing ISN Details action')
  await details.trigger('click')
  wrapper.findComponent(IplasTestItemsFullscreenDialog).vm.$emit('download')
  await flushPromises()
  expect(api.downloadAttachments).toHaveBeenCalledWith('PTB', 'Sample project', [
    { isn: 'SAMPLE-ISN', deviceid: 'DEVICE-01', station: 'NFT_TEST', time: '2026/11/05 10:01:00' },
  ])
  expect(api.downloadCsvLogs).toHaveBeenCalledWith([
    expect.objectContaining({ station: 'NFT TEST', test_end_time: '2026/11/05 10:01:00.000' }),
  ])
})
