/**
 * Route chunk prefetching.
 *
 * Warm route chunks when the user shows navigation intent. Avoid preloading
 * every route during idle time so unused views do not consume bandwidth.
 */

import router from './index'

const prefetched = new Set<string>()

function warmRecordComponents(candidate: unknown): void {
  if (typeof candidate !== 'function') return
  try {
    // Async route components are `() => import('...')` factories; SFC objects
    // are not functions, so anything callable here is a loader.
    void (candidate as () => unknown)()
  } catch {
    // A failed prefetch must never break navigation.
  }
}

export function prefetchRoute(path: string | undefined | null): void {
  if (!path || path === '/' || prefetched.has(path)) return
  prefetched.add(path)

  let resolved: ReturnType<typeof router.resolve>
  try {
    resolved = router.resolve(path)
  } catch {
    return
  }

  for (const record of resolved.matched) {
    for (const component of Object.values(record.components ?? {})) {
      warmRecordComponents(component)
    }
  }
}
