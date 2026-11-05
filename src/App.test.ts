import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, reactive } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'

const authState = vi.hoisted(() => ({ value: null as { isAuthenticated: boolean } | null }))

vi.mock('@/features/auth/stores/auth.store', () => ({
  useAuthStore: () => authState.value,
}))
vi.mock('@/shared/ui/toast/AppToastHost.vue', () => ({
  default: { render: () => null },
}))

describe('App route caching', () => {
  it('reuses cached pages while signed in and discards them after logout', async () => {
    authState.value = reactive({ isAuthenticated: true })
    let explorerMounts = 0
    const DataExplorerView = defineComponent({
      name: 'DataExplorerView',
      mounted() {
        explorerMounts += 1
      },
      render: () => h('div', 'explorer'),
    })
    const LoginView = defineComponent({ name: 'LoginView', render: () => h('div', 'login') })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/explorer', component: DataExplorerView },
        { path: '/login', component: LoginView },
      ],
    })

    await router.push('/explorer')
    mount(App, { global: { plugins: [router] } })
    await flushPromises()

    await router.push('/login')
    await router.push('/explorer')
    await flushPromises()
    expect(explorerMounts).toBe(1)

    await router.push('/login')
    authState.value.isAuthenticated = false
    await flushPromises()
    authState.value.isAuthenticated = true
    await router.push('/explorer')
    await flushPromises()
    expect(explorerMounts).toBe(2)
  })
})
