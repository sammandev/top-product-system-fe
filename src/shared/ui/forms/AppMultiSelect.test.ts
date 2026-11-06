// @vitest-environment happy-dom

import { enableAutoUnmount, mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import Select from 'primevue/select'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppMultiSelect from './AppMultiSelect.vue'

enableAutoUnmount(afterEach)

describe('AppMultiSelect', () => {
  const options = [
    { label: 'Alpha', value: 'alpha' },
    { label: 'Beta', value: 'beta' },
  ]

  function mountSelect(modelValue: string[] = []) {
    return mount(AppMultiSelect, {
      props: { modelValue, options },
      global: {
        plugins: [[PrimeVue, { license: 'test-license' }]],
      },
    })
  }

  it('uses the PrimeVue v5 Select multiple API and forwards values', async () => {
    const wrapper = mountSelect()
    const select = wrapper.findComponent(Select)

    expect(select.props('multiple')).toBe(true)
    expect(select.props('checkmark')).toBe(false)

    select.vm.$emit('update:modelValue', ['alpha', 'beta'])
    select.vm.$emit('change', { value: ['alpha', 'beta'] })
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['alpha', 'beta']])
    expect(wrapper.emitted('change')?.[0]).toEqual([['alpha', 'beta']])
  })

  it.each([
    { value: [], expected: 'Select...' },
    { value: ['alpha'], expected: 'Alpha' },
    { value: ['alpha', 'beta'], expected: '2 selected' },
    { value: ['unknown'], expected: 'unknown' },
  ])('formats selected value $value', ({ value, expected }) => {
    expect(mountSelect(value).text()).toContain(expected)
  })

  it('applies all matching options with Enter when enabled, without checkbox clicks', async () => {
    const wrapper = mount(AppMultiSelect, {
      props: {
        modelValue: ['beta'],
        options: [
          { label: 'Alpha 1', value: 'alpha-1' },
          { label: 'Alpha 2', value: 'alpha-2' },
          { label: 'Beta', value: 'beta' },
        ],
        selectMatchesOnEnter: true,
        appendTo: 'self',
      },
      global: { plugins: [[PrimeVue, { license: 'test-license' }]] },
    })
    await wrapper.get('[role="combobox"]').trigger('click')
    const search = wrapper.get('[role="searchbox"]')
    await search.setValue('alpha')
    await search.trigger('keydown', { key: 'Enter', code: 'Enter' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['alpha-1', 'alpha-2']])
    expect(wrapper.emitted('change')?.at(-1)).toEqual([['alpha-1', 'alpha-2']])
    await vi.waitFor(() =>
      expect(wrapper.get('[role="combobox"]').attributes('aria-expanded')).toBe('false'),
    )
  })
})
