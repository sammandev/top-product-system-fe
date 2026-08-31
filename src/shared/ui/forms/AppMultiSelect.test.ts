// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import Select from 'primevue/select'
import { describe, expect, it } from 'vitest'
import AppMultiSelect from './AppMultiSelect.vue'

describe('AppMultiSelect', () => {
  it('uses the PrimeVue v5 Select multiple API and forwards values', async () => {
    const wrapper = mount(AppMultiSelect, {
      props: {
        modelValue: [],
        options: [
          { label: 'Alpha', value: 'alpha' },
          { label: 'Beta', value: 'beta' },
        ],
      },
      global: {
        plugins: [[PrimeVue, { license: 'test-license' }]],
      },
    })
    const select = wrapper.findComponent(Select)

    expect(select.props('multiple')).toBe(true)
    expect(select.props('checkmark')).toBe(true)

    select.vm.$emit('update:modelValue', ['alpha', 'beta'])
    select.vm.$emit('change', { value: ['alpha', 'beta'] })
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['alpha', 'beta']])
    expect(wrapper.emitted('change')?.[0]).toEqual([['alpha', 'beta']])
  })
})
