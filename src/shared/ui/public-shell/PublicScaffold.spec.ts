import { describe, expect, it } from 'vitest'
import { mountWithScaffoldPlugins } from '@/test/utils'
import PublicScaffold from './PublicScaffold.vue'

describe('PublicScaffold', () => {
  it('renders the scaffold shell and slot content', () => {
    const wrapper = mountWithScaffoldPlugins(PublicScaffold, {
      props: {
        appName: 'AST Tools',
        eyebrow: 'Batch 1',
        title: 'Operational sign in',
        description: 'A migration-ready public shell.',
        panelEyebrow: 'Access',
        panelDescription: 'Use the new scaffold for public routes.',
      },
      slots: {
        hero: '<div data-testid="hero-slot">Hero content</div>',
        default: '<div data-testid="body-slot">Body content</div>',
      },
    })

    expect(wrapper.text()).toContain('Operational sign in')
    expect(wrapper.find('[data-testid="hero-slot"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="body-slot"]').exists()).toBe(true)
  })
})