import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import type { App } from 'vue'

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
      mutations: {
        retry: 0,
      },
    },
  })
}

export const queryClient = createAppQueryClient()

export function installQueryClient(app: App, client = queryClient) {
  app.use(VueQueryPlugin, {
    queryClient: client,
  })
}