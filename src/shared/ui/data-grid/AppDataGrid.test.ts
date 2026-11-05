// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import AppDataGrid from './AppDataGrid.vue'

describe('AppDataGrid virtual scrolling', () => {
  const columns = [{ header: 'Name', field: 'name' }]

  function createRows(count: number) {
    return Array.from({ length: count }, (_, index) => ({ id: index, name: `Row ${index}` }))
  }

  function mountGrid(props: Record<string, unknown>) {
    return mount(AppDataGrid, {
      props: { columns, rows: [], dataKey: 'id', ...props },
      global: {
        plugins: [[PrimeVue, { license: 'test-license' }]],
        // Only DataTable props are asserted; rendering hundreds of rows made these tests time out under load.
        stubs: {
          DataTable: defineComponent({
            name: 'DataTable',
            props: {
              virtualScrollerOptions: { type: Object, default: null },
              scrollable: { type: Boolean, default: false },
            },
            template: '<div />',
          }),
        },
      },
    })
  }

  function virtualOptions(props: Record<string, unknown>) {
    return mountGrid(props).findComponent({ name: 'DataTable' }).props('virtualScrollerOptions')
  }

  it('virtualizes large non-paginated grids with a bounded scroll height', () => {
    expect(virtualOptions({ rows: createRows(300), scrollHeight: '20rem' })).toEqual({
      itemSize: 40,
    })
  })

  it.each([
    { name: 'paginated', props: { rows: createRows(300), scrollHeight: '20rem', paginator: true } },
    { name: 'lazy', props: { rows: createRows(300), scrollHeight: '20rem', lazy: true } },
    { name: 'small', props: { rows: createRows(50), scrollHeight: '20rem' } },
    { name: 'flex height', props: { rows: createRows(300) } },
    {
      name: 'disabled',
      props: { rows: createRows(300), scrollHeight: '20rem', virtualScroll: false },
    },
  ])('keeps regular rendering for $name grids', ({ props }) => {
    // undefined falls back to PrimeVue's default (null), i.e. virtual scrolling stays off.
    expect(virtualOptions(props)).toBeNull()
  })

  it('supports explicit opt-in', () => {
    const table = mountGrid({
      rows: createRows(10),
      scrollable: false,
      scrollHeight: '20rem',
      virtualScroll: true,
      virtualItemSize: 32,
    }).findComponent({ name: 'DataTable' })

    expect(table.props('virtualScrollerOptions')).toEqual({ itemSize: 32 })
    expect(table.props('scrollable')).toBe(true)
  })
})
