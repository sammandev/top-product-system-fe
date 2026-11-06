import { enableAutoUnmount, shallowMount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppDataGrid from '@/shared/ui/data-grid/AppDataGrid.vue'
import AppSelect from '@/shared/ui/forms/AppSelect.vue'
import IplasTestItemsFullscreenDialog, {
  type NormalizedRecord,
} from './IplasTestItemsFullscreenDialog.vue'
import TopProductIplasDetailsDialog from './TopProductIplasDetailsDialog.vue'

vi.mock('@/shared/composables/useNotification', () => ({
  useNotification: () => ({ showInfo: vi.fn() }),
}))

enableAutoUnmount(afterEach)

const record: NormalizedRecord = {
  isn: 'SAMPLE-ISN',
  deviceId: 'DEVICE-01',
  stationName: 'WIFI_25G',
  displayStationName: 'WIFI_25G',
  site: 'Sample site',
  project: 'Sample project',
  line: 'Line 1',
  errorCode: 'PASS',
  errorName: '',
  testStatus: 'PASS',
  testStartTime: '2026-11-05T10:00:00',
  testEndTime: '2026-11-05T10:01:00',
  testItems: [
    { NAME: 'Signal strength', STATUS: 'PASS', VALUE: '-45', UCL: '-20', LCL: '-80' },
    { NAME: 'Connection', STATUS: 'PASS', VALUE: 'PASS', UCL: '', LCL: '' },
  ],
}

const options = {
  props: { modelValue: true, record },
  global: {
    stubs: {
      AppDialog: { template: '<div><slot name="header-actions" /><slot /></div>' },
    },
  },
}

describe.each([
  {
    name: 'Station Search',
    mountDialog: () => shallowMount(TopProductIplasDetailsDialog, options),
  },
  {
    name: 'ISN Search',
    mountDialog: () => shallowMount(IplasTestItemsFullscreenDialog, options),
  },
])('$name Test Items Details', ({ mountDialog }) => {
  it('shows record metadata with named copy actions', () => {
    const wrapper = mountDialog()
    expect(wrapper.get('[aria-label="Copy DUT ISN"]').text()).toContain(record.isn)
    expect(wrapper.get('[aria-label="Copy Device ID"]').text()).toContain(record.deviceId)
    expect(wrapper.text()).toContain(record.displayStationName)
    expect(wrapper.text()).toContain(record.site)
    expect(wrapper.text()).toContain(record.project)
  })

  it('keeps test item search and Data Type filtering functional', async () => {
    const wrapper = mountDialog()
    const grid = wrapper.findComponent(AppDataGrid)
    expect(grid.props('rows')).toHaveLength(2)

    await wrapper.get('input[type="search"]').setValue('Signal')
    expect(grid.props('rows')).toHaveLength(1)

    await wrapper.get('input[type="search"]').setValue('')
    const dataType = wrapper
      .findAllComponents(AppSelect)
      .find((select) => select.attributes('aria-label') === 'Data Type')
    expect(dataType).toBeDefined()
    dataType?.vm.$emit('update:modelValue', 'bin')
    await wrapper.vm.$nextTick()
    expect(grid.props('rows')).toHaveLength(1)

    dataType?.vm.$emit('update:modelValue', 'all')
    await wrapper.vm.$nextTick()
    expect(grid.props('rows')).toHaveLength(2)
  })

  it('emits downloads and disables the button while downloading', async () => {
    const wrapper = mountDialog()
    const button = wrapper.get('button[title="Download"]')
    await button.trigger('click')
    expect(wrapper.emitted('download')).toHaveLength(1)
    await wrapper.setProps({ downloading: true })
    expect(wrapper.get('button[title="Downloading..."]').attributes('disabled')).toBeDefined()
  })
})

it('retains specification limits in overall score contributions, including zero and missing limits', async () => {
  const wrapper = shallowMount(TopProductIplasDetailsDialog, {
    ...options,
    props: {
      modelValue: true,
      record: {
        ...record,
        overallScore: 0.8,
        testItems: record.testItems.map((item, index) => ({
          ...item,
          score: index === 0 ? 0.8 : 1,
          UCL: index === 0 ? '0' : '',
        })),
      },
    },
  })
  await wrapper.get('.summary-stat-button').trigger('click')
  const grid = wrapper.find('.score-contributors-section').findComponent(AppDataGrid)
  expect(grid.props('rows')).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'Signal strength', ucl: '0', lcl: '-80' }),
      expect.objectContaining({ name: 'Connection', ucl: '', lcl: '' }),
    ]),
  )
})

it('keeps ISN test-item filters together without a Clear Filters action', async () => {
  const wrapper = shallowMount(IplasTestItemsFullscreenDialog, options)
  await wrapper.get('input[type="search"]').setValue('Signal')
  const filters = wrapper.get('.fullscreen-dialog__filters')
  expect(filters.findAll('label')).toHaveLength(3)
  expect(filters.text()).not.toContain('Clear Filters')
})
