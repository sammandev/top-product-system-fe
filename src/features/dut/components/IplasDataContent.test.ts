import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CsvTestItemData } from '@/features/dut-logs/api/iplasApi'
import { useIplasApi } from '@/features/dut-logs/composables/useIplasApi'
import AppMultiSelect from '@/shared/ui/forms/AppMultiSelect.vue'
import IplasDataContent from './IplasDataContent.vue'

vi.mock('@/features/dut-logs/composables/useIplasApi', async () => {
  const { ref } = await import('vue')
  const state = {
    loading: ref(false),
    loadingStations: ref(false),
    loadingTestItems: ref(false),
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
  }
  return { useIplasApi: () => state }
})

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
})
