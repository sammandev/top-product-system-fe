// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import Tabs from 'primevue/tabs'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import AppTabs from './AppTabs.vue'

describe('AppTabs', () => {
  const items = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
    { value: 'c', label: 'C' },
  ]

  function mountTabs(modelValue = 'a') {
    return mount(AppTabs, {
      props: { modelValue, items },
      slots: {
        'panel-a': () => h('p', { class: 'panel-a' }, 'Panel A'),
        'panel-b': () => h('p', { class: 'panel-b' }, 'Panel B'),
        'panel-c': () => h('p', { class: 'panel-c' }, 'Panel C'),
      },
      global: {
        plugins: [[PrimeVue, { license: 'test-license' }]],
      },
    })
  }

  it('renders only the active panel initially', () => {
    const wrapper = mountTabs()

    expect(wrapper.find('.panel-a').exists()).toBe(true)
    expect(wrapper.find('.panel-b').exists()).toBe(false)
    expect(wrapper.find('.panel-c').exists()).toBe(false)
  })

  it('keeps visited panels mounted after switching away', async () => {
    const wrapper = mountTabs()

    await wrapper.setProps({ modelValue: 'b' })
    expect(wrapper.find('.panel-b').exists()).toBe(true)
    expect(wrapper.find('.panel-a').exists()).toBe(true)

    await wrapper.setProps({ modelValue: 'a' })
    expect(wrapper.find('.panel-b').exists()).toBe(true)
    expect(wrapper.find('.panel-c').exists()).toBe(false)
  })

  it('renders a panel selected through the tab list and forwards the change', async () => {
    const wrapper = mountTabs()

    wrapper.findComponent(Tabs).vm.$emit('update:value', 'c')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['c'])
    expect(wrapper.find('.panel-c').exists()).toBe(true)
  })
})
