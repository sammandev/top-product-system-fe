// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@primeuix/themes', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@primeuix/themes')>()),
  usePreset: vi.fn(),
  updatePrimaryPalette: vi.fn(),
  updateSurfacePalette: vi.fn(),
}))

async function loadModules() {
  vi.resetModules()
  const themes = await import('@primeuix/themes')
  const themeState = await import('./useThemeState')
  return { themes, themeState }
}

describe('useThemeState PrimeVue presets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies the bundled default preset synchronously', async () => {
    const { themes, themeState } = await loadModules()

    themeState.applyPrimeVueThemePreferences({
      ...themeState.DEFAULT_THEME_PREFERENCES,
      preset: 'aura',
    })

    expect(themes.usePreset).toHaveBeenCalledTimes(1)
    expect(themes.usePreset).toHaveBeenCalledWith(
      themeState.getPrimeVuePreset({
        ...themeState.DEFAULT_THEME_PREFERENCES,
        preset: 'aura',
      }),
    )
  })

  it('applies palettes immediately and the lazy preset once it loads', async () => {
    const { themes, themeState } = await loadModules()
    const preferences = {
      ...themeState.DEFAULT_THEME_PREFERENCES,
      preset: 'nora' as const,
      primary: 'emerald' as const,
    }

    themeState.applyPrimeVueThemePreferences(preferences)

    expect(themes.updatePrimaryPalette).toHaveBeenCalledTimes(1)
    expect(themes.usePreset).not.toHaveBeenCalled()

    const noraPreset = await themeState.loadPrimeVuePreset('nora')
    await vi.waitFor(() => expect(themes.usePreset).toHaveBeenCalledWith(noraPreset))
    expect(themeState.getPrimeVuePreset(preferences)).toBe(noraPreset)
  })

  it('does not apply a lazy preset that was superseded before loading', async () => {
    const { themes, themeState } = await loadModules()
    const auraPreset = themeState.getPrimeVuePreset({
      ...themeState.DEFAULT_THEME_PREFERENCES,
      preset: 'aura',
    })

    themeState.applyPrimeVueThemePreferences({
      ...themeState.DEFAULT_THEME_PREFERENCES,
      preset: 'material',
    })
    themeState.applyPrimeVueThemePreferences({
      ...themeState.DEFAULT_THEME_PREFERENCES,
      preset: 'aura',
    })

    await themeState.loadPrimeVuePreset('material')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(themes.usePreset).toHaveBeenCalledTimes(1)
    expect(themes.usePreset).toHaveBeenCalledWith(auraPreset)
  })

  it('falls back to the default preset until a persisted lazy preset is loaded', async () => {
    const { themeState } = await loadModules()
    const auraPreset = themeState.getPrimeVuePreset({
      ...themeState.DEFAULT_THEME_PREFERENCES,
      preset: 'aura',
    })
    const laraPreferences = { ...themeState.DEFAULT_THEME_PREFERENCES, preset: 'lara' as const }

    expect(themeState.getPrimeVuePreset(laraPreferences)).toBe(auraPreset)

    const laraPreset = await themeState.loadPrimeVuePreset('lara')
    expect(laraPreset).not.toBe(auraPreset)
    expect(themeState.getPrimeVuePreset(laraPreferences)).toBe(laraPreset)
  })
})
