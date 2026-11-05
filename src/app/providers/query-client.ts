import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import type { App } from 'vue'
import { queryKeys } from '@/core/query'

function hasKeyPrefix(queryKey: readonly unknown[], prefix: readonly unknown[]): boolean {
  return prefix.every((part, index) => queryKey[index] === part)
}

export function createAppQueryClient() {
  const client = new QueryClient({
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

  // Admin iPLAS token edits invalidate the token list; drop iPLAS lookups fetched with old tokens.
  client.getQueryCache().subscribe((event) => {
    if (
      event.type === 'updated' &&
      event.action.type === 'invalidate' &&
      hasKeyPrefix(event.query.queryKey, queryKeys.appConfig.iplasTokens())
    ) {
      client.removeQueries({ queryKey: queryKeys.iplas.all })
    }
  })

  return client
}

export const queryClient = createAppQueryClient()

export function installQueryClient(app: App, client = queryClient) {
  app.use(VueQueryPlugin, {
    queryClient: client,
  })
}
