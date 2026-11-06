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
    stubs: { AppDialog: { template: '<div><slot /></div>' } },
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
})
