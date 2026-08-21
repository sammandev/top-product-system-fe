/**
 * Route chunk prefetching.
 *
 * Every route is code-split, so the first navigation to a view pays for a
 * network round trip before anything renders. Warming the chunk while the user
 * is still deciding (hover/focus on a nav item, or browser idle time) removes
 * that delay from the click.
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

type IdleCallback = (callback: () => void, options?: { timeout?: number }) => number

export function prefetchRoutesWhenIdle(paths: (string | undefined | null)[]): void {
  const run = () => {
    for (const path of paths) prefetchRoute(path)
  }

  const idle = (window as unknown as { requestIdleCallback?: IdleCallback }).requestIdleCallback
  if (idle) {
    idle(run, { timeout: 4000 })
    return
  }
  setTimeout(run, 1500)
}
