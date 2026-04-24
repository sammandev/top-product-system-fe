import Aura from '@primeuix/themes/aura'
import Lara from '@primeuix/themes/lara'
import Material from '@primeuix/themes/material'
import Nora from '@primeuix/themes/nora'
import { updatePrimaryPalette, updateSurfacePalette, usePreset } from '@primeuix/themes'
import { ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ThemePresetName = 'aura' | 'lara' | 'material' | 'nora'
export type ThemePrimaryName = 'amber' | 'cyan' | 'emerald' | 'rose'
export type ThemeSurfaceName = 'slate' | 'stone' | 'zinc'
export type ResolvedThemeMode = Exclude<ThemeMode, 'system'>

export interface ThemePreferences {
  mode: ThemeMode
  preset: ThemePresetName
  primary: ThemePrimaryName
  surface: ThemeSurfaceName
}

interface ThemeOption<T extends string> {
  value: T
  label: string
  description: string
  icon: string
  preview: string
}

interface ThemeControllerBridge {
  change: (themeName: string) => void
}

const STORAGE_KEY = 'app_theme_preferences'
const LEGACY_STORAGE_KEY = 'app_theme'

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  mode: 'system',
  preset: 'aura',
  primary: 'emerald',
  surface: 'zinc',
}

export const THEME_MODE_OPTIONS: ThemeOption<ThemeMode>[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Use the manual light palette.',
    icon: 'solar:sun-2-bold-duotone',
    preview: 'linear-gradient(135deg, #fff7ed 0%, #fde68a 100%)',
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Use the manual dark palette.',
    icon: 'solar:moon-stars-bold-duotone',
    preview: 'linear-gradient(135deg, #111827 0%, #0f766e 100%)',
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follow the operating system.',
    icon: 'solar:monitor-bold-duotone',
    preview: 'linear-gradient(135deg, #f8fafc 0%, #0f172a 100%)',
  },
]

export const THEME_PRESET_OPTIONS: ThemeOption<ThemePresetName>[] = [
  {
    value: 'aura',
    label: 'Aura',
    description: 'Default PrimeVue balance.',
    icon: 'solar:stars-bold-duotone',
    preview: 'linear-gradient(135deg, #d1fae5 0%, #60a5fa 100%)',
  },
  {
    value: 'lara',
    label: 'Lara',
    description: 'Soft and rounded surfaces.',
    icon: 'solar:leaf-bold-duotone',
    preview: 'linear-gradient(135deg, #fef3c7 0%, #fdba74 100%)',
  },
  {
    value: 'material',
    label: 'Material',
    description: 'Sharper Material rhythm.',
    icon: 'solar:widget-4-bold-duotone',
    preview: 'linear-gradient(135deg, #dbeafe 0%, #818cf8 100%)',
  },
  {
    value: 'nora',
    label: 'Nora',
    description: 'Higher-contrast neutral base.',
    icon: 'solar:palette-round-bold-duotone',
    preview: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)',
  },
]

export const THEME_PRIMARY_OPTIONS: ThemeOption<ThemePrimaryName>[] = [
  {
    value: 'emerald',
    label: 'Emerald',
    description: 'Green accent scale.',
    icon: 'solar:dropper-bold-duotone',
    preview: '#10b981',
  },
  {
    value: 'amber',
    label: 'Amber',
    description: 'Warm amber accent scale.',
    icon: 'solar:dropper-bold-duotone',
    preview: '#f59e0b',
  },
  {
    value: 'cyan',
    label: 'Cyan',
    description: 'Cool cyan accent scale.',
    icon: 'solar:dropper-bold-duotone',
    preview: '#06b6d4',
  },
  {
    value: 'rose',
    label: 'Rose',
    description: 'Rose accent scale.',
    icon: 'solar:dropper-bold-duotone',
    preview: '#f43f5e',
  },
]

export const THEME_SURFACE_OPTIONS: ThemeOption<ThemeSurfaceName>[] = [
  {
    value: 'stone',
    label: 'Stone',
    description: 'Warm neutral surfaces.',
    icon: 'solar:pallete-2-bold-duotone',
    preview: 'linear-gradient(135deg, #f5f5f4 0%, #d6d3d1 100%)',
  },
  {
    value: 'slate',
    label: 'Slate',
    description: 'Cool blue-grey surfaces.',
    icon: 'solar:pallete-2-bold-duotone',
    preview: 'linear-gradient(135deg, #e2e8f0 0%, #64748b 100%)',
  },
  {
    value: 'zinc',
    label: 'Zinc',
    description: 'Neutral graphite surfaces.',
    icon: 'solar:pallete-2-bold-duotone',
    preview: 'linear-gradient(135deg, #f4f4f5 0%, #71717a 100%)',
  },
]

const PRIMEVUE_PRESETS = {
  aura: Aura,
  lara: Lara,
  material: Material,
  nora: Nora,
} as const

const PRIMARY_PALETTES: Record<ThemePrimaryName, Record<string, string>> = {
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  cyan: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
    950: '#083344',
  },
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
  },
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
    950: '#4c0519',
  },
}

const SURFACE_PALETTES: Record<ThemeSurfaceName, { light: Record<string, string>; dark: Record<string, string> }> = {
  slate: {
    light: {
      0: '#ffffff',
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
    dark: {
      0: '#ffffff',
      50: '#f8fafc',
      100: '#e2e8f0',
      200: '#cbd5e1',
      300: '#94a3b8',
      400: '#64748b',
      500: '#475569',
      600: '#334155',
      700: '#1e293b',
      800: '#0f172a',
      900: '#020617',
      950: '#01040b',
    },
  },
  stone: {
    light: {
      0: '#ffffff',
      50: '#fafaf9',
      100: '#f5f5f4',
      200: '#e7e5e4',
      300: '#d6d3d1',
      400: '#a8a29e',
      500: '#78716c',
      600: '#57534e',
      700: '#44403c',
      800: '#292524',
      900: '#1c1917',
      950: '#0c0a09',
    },
    dark: {
      0: '#ffffff',
      50: '#fafaf9',
      100: '#f5f5f4',
      200: '#e7e5e4',
      300: '#d6d3d1',
      400: '#a8a29e',
      500: '#78716c',
      600: '#57534e',
      700: '#44403c',
      800: '#292524',
      900: '#1c1917',
      950: '#0c0a09',
    },
  },
  zinc: {
    light: {
      0: '#ffffff',
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b',
      950: '#09090b',
    },
    dark: {
      0: '#ffffff',
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b',
      950: '#09090b',
    },
  },
}

const PRIMARY_TONES: Record<ResolvedThemeMode, Record<ThemePrimaryName, {
  accent: string
  accentStrong: string
  accentSoft: string
  ring: string
}>> = {
  dark: {
    amber: {
      accent: '#fbbf24',
      accentStrong: '#fcd34d',
      accentSoft: 'rgba(251, 191, 36, 0.18)',
      ring: 'rgba(251, 191, 36, 0.34)',
    },
    cyan: {
      accent: '#22d3ee',
      accentStrong: '#67e8f9',
      accentSoft: 'rgba(34, 211, 238, 0.18)',
      ring: 'rgba(34, 211, 238, 0.34)',
    },
    emerald: {
      accent: '#34d399',
      accentStrong: '#6ee7b7',
      accentSoft: 'rgba(52, 211, 153, 0.18)',
      ring: 'rgba(52, 211, 153, 0.34)',
    },
    rose: {
      accent: '#fb7185',
      accentStrong: '#fda4af',
      accentSoft: 'rgba(251, 113, 133, 0.18)',
      ring: 'rgba(251, 113, 133, 0.32)',
    },
  },
  light: {
    amber: {
      accent: '#b45309',
      accentStrong: '#92400e',
      accentSoft: 'rgba(245, 158, 11, 0.16)',
      ring: 'rgba(245, 158, 11, 0.28)',
    },
    cyan: {
      accent: '#0e7490',
      accentStrong: '#155e75',
      accentSoft: 'rgba(6, 182, 212, 0.14)',
      ring: 'rgba(6, 182, 212, 0.28)',
    },
    emerald: {
      accent: '#047857',
      accentStrong: '#065f46',
      accentSoft: 'rgba(16, 185, 129, 0.14)',
      ring: 'rgba(16, 185, 129, 0.28)',
    },
    rose: {
      accent: '#be123c',
      accentStrong: '#9f1239',
      accentSoft: 'rgba(244, 63, 94, 0.14)',
      ring: 'rgba(244, 63, 94, 0.24)',
    },
  },
}

const SURFACE_TONES: Record<ResolvedThemeMode, Record<ThemeSurfaceName, {
  canvas: string
  canvasStrong: string
  panel: string
  panelStrong: string
  ink: string
  muted: string
  border: string
  shadow: string
  shadowSoft: string
  shellBg: string
  shellHeader: string
  shellSidebar: string
}>> = {
  dark: {
    slate: {
      canvas: '#08111d',
      canvasStrong: '#0f172a',
      panel: 'rgba(15, 23, 42, 0.78)',
      panelStrong: 'rgba(15, 23, 42, 0.92)',
      ink: '#e2e8f0',
      muted: '#94a3b8',
      border: 'rgba(226, 232, 240, 0.12)',
      shadow: '0 30px 72px rgba(2, 6, 23, 0.46)',
      shadowSoft: '0 14px 34px rgba(2, 6, 23, 0.28)',
      shellBg: '#09121f',
      shellHeader: 'rgba(9, 18, 31, 0.9)',
      shellSidebar: 'rgba(10, 18, 31, 0.96)',
    },
    stone: {
      canvas: '#141110',
      canvasStrong: '#1c1917',
      panel: 'rgba(28, 25, 23, 0.78)',
      panelStrong: 'rgba(28, 25, 23, 0.92)',
      ink: '#f5f5f4',
      muted: '#d6d3d1',
      border: 'rgba(245, 245, 244, 0.1)',
      shadow: '0 30px 72px rgba(12, 10, 9, 0.44)',
      shadowSoft: '0 14px 34px rgba(12, 10, 9, 0.26)',
      shellBg: '#12100f',
      shellHeader: 'rgba(18, 16, 15, 0.9)',
      shellSidebar: 'rgba(18, 16, 15, 0.95)',
    },
    zinc: {
      canvas: '#101012',
      canvasStrong: '#18181b',
      panel: 'rgba(24, 24, 27, 0.8)',
      panelStrong: 'rgba(24, 24, 27, 0.93)',
      ink: '#f4f4f5',
      muted: '#d4d4d8',
      border: 'rgba(244, 244, 245, 0.1)',
      shadow: '0 30px 72px rgba(9, 9, 11, 0.44)',
      shadowSoft: '0 14px 34px rgba(9, 9, 11, 0.26)',
      shellBg: '#0f0f11',
      shellHeader: 'rgba(15, 15, 17, 0.9)',
      shellSidebar: 'rgba(15, 15, 17, 0.95)',
    },
  },
  light: {
    slate: {
      canvas: '#edf4fb',
      canvasStrong: '#dbe7f3',
      panel: 'rgba(255, 255, 255, 0.8)',
      panelStrong: 'rgba(255, 255, 255, 0.94)',
      ink: '#0f172a',
      muted: '#64748b',
      border: 'rgba(15, 23, 42, 0.12)',
      shadow: '0 24px 64px rgba(15, 23, 42, 0.16)',
      shadowSoft: '0 12px 36px rgba(15, 23, 42, 0.08)',
      shellBg: '#e9f1fa',
      shellHeader: 'rgba(255, 255, 255, 0.84)',
      shellSidebar: 'rgba(241, 245, 249, 0.95)',
    },
    stone: {
      canvas: '#f2ede5',
      canvasStrong: '#e4d7c6',
      panel: 'rgba(255, 251, 247, 0.86)',
      panelStrong: 'rgba(255, 248, 240, 0.95)',
      ink: '#18120d',
      muted: '#685f56',
      border: 'rgba(24, 18, 13, 0.12)',
      shadow: '0 24px 64px rgba(63, 39, 14, 0.18)',
      shadowSoft: '0 12px 36px rgba(63, 39, 14, 0.08)',
      shellBg: '#efe6db',
      shellHeader: 'rgba(255, 249, 241, 0.84)',
      shellSidebar: 'rgba(250, 244, 236, 0.92)',
    },
    zinc: {
      canvas: '#f3f4f6',
      canvasStrong: '#e5e7eb',
      panel: 'rgba(255, 255, 255, 0.84)',
      panelStrong: 'rgba(255, 255, 255, 0.96)',
      ink: '#18181b',
      muted: '#52525b',
      border: 'rgba(24, 24, 27, 0.12)',
      shadow: '0 24px 64px rgba(24, 24, 27, 0.14)',
      shadowSoft: '0 12px 36px rgba(24, 24, 27, 0.07)',
      shellBg: '#efeff2',
      shellHeader: 'rgba(255, 255, 255, 0.84)',
      shellSidebar: 'rgba(244, 244, 245, 0.95)',
    },
  },
}

const DANGER_TONES: Record<ResolvedThemeMode, { danger: string; dangerSoft: string; dangerLine: string }> = {
  dark: {
    danger: '#fda4af',
    dangerSoft: 'rgba(251, 113, 133, 0.16)',
    dangerLine: 'rgba(251, 113, 133, 0.3)',
  },
  light: {
    danger: '#a33d2d',
    dangerSoft: 'rgba(163, 61, 45, 0.12)',
    dangerLine: 'rgba(163, 61, 45, 0.24)',
  },
}

const SEMANTIC_TONES: Record<ResolvedThemeMode, {
  info: { solid: string; strong: string; soft: string; line: string }
  success: { solid: string; strong: string; soft: string; line: string }
  warning: { solid: string; strong: string; soft: string; line: string }
}> = {
  dark: {
    info: {
      solid: '#67e8f9',
      strong: '#a5f3fc',
      soft: 'rgba(103, 232, 249, 0.18)',
      line: 'rgba(103, 232, 249, 0.34)',
    },
    success: {
      solid: '#4ade80',
      strong: '#86efac',
      soft: 'rgba(74, 222, 128, 0.18)',
      line: 'rgba(74, 222, 128, 0.34)',
    },
    warning: {
      solid: '#fbbf24',
      strong: '#fcd34d',
      soft: 'rgba(251, 191, 36, 0.18)',
      line: 'rgba(251, 191, 36, 0.34)',
    },
  },
  light: {
    info: {
      solid: '#0e7490',
      strong: '#155e75',
      soft: 'rgba(6, 182, 212, 0.14)',
      line: 'rgba(6, 182, 212, 0.28)',
    },
    success: {
      solid: '#15803d',
      strong: '#166534',
      soft: 'rgba(34, 197, 94, 0.12)',
      line: 'rgba(34, 197, 94, 0.22)',
    },
    warning: {
      solid: '#b45309',
      strong: '#92400e',
      soft: 'rgba(245, 158, 11, 0.12)',
      line: 'rgba(245, 158, 11, 0.24)',
    },
  },
}

const themePreferences = ref<ThemePreferences>({ ...DEFAULT_THEME_PREFERENCES })

function hasDom() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function hasStorage() {
  return hasDom() && typeof window.localStorage !== 'undefined'
}

function normalizeThemePreferences(value?: Partial<ThemePreferences> | null): ThemePreferences {
  const nextMode = value?.mode
  const nextPreset = value?.preset
  const nextPrimary = value?.primary
  const nextSurface = value?.surface

  return {
    mode: THEME_MODE_OPTIONS.some((option) => option.value === nextMode)
      ? (nextMode as ThemeMode)
      : DEFAULT_THEME_PREFERENCES.mode,
    preset: THEME_PRESET_OPTIONS.some((option) => option.value === nextPreset)
      ? (nextPreset as ThemePresetName)
      : DEFAULT_THEME_PREFERENCES.preset,
    primary: THEME_PRIMARY_OPTIONS.some((option) => option.value === nextPrimary)
      ? (nextPrimary as ThemePrimaryName)
      : DEFAULT_THEME_PREFERENCES.primary,
    surface: THEME_SURFACE_OPTIONS.some((option) => option.value === nextSurface)
      ? (nextSurface as ThemeSurfaceName)
      : DEFAULT_THEME_PREFERENCES.surface,
  }
}

function readLegacyThemePreference() {
  if (!hasStorage()) return null

  const legacyTheme = window.localStorage.getItem(LEGACY_STORAGE_KEY)
  if (legacyTheme === 'customDarkTheme') return { mode: 'dark' } satisfies Partial<ThemePreferences>
  if (legacyTheme === 'customLightTheme') return { mode: 'light' } satisfies Partial<ThemePreferences>
  return null
}

function persistThemePreferences(preferences: ThemePreferences) {
  if (!hasStorage()) return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to save theme preferences to localStorage:', error)
  }
}

export function resolveThemeMode(mode: ThemeMode): ResolvedThemeMode {
  if (mode !== 'system') return mode
  if (!hasDom() || !window.matchMedia('(prefers-color-scheme: dark)').matches) return 'light'
  return 'dark'
}

export function getStoredThemePreferences(): ThemePreferences {
  if (!hasStorage()) {
    themePreferences.value = { ...DEFAULT_THEME_PREFERENCES }
    return themePreferences.value
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)
    if (rawValue) {
      themePreferences.value = normalizeThemePreferences(JSON.parse(rawValue) as Partial<ThemePreferences>)
      return themePreferences.value
    }
  } catch (error) {
    console.warn('Failed to parse theme preferences from localStorage:', error)
  }

  themePreferences.value = normalizeThemePreferences(readLegacyThemePreference())
  return themePreferences.value
}

export function getPrimeVuePreset(preferences = getStoredThemePreferences()) {
  return PRIMEVUE_PRESETS[normalizeThemePreferences(preferences).preset]
}

function applyDocumentThemeVariables(preferences: ThemePreferences) {
  if (!hasDom()) {
    return resolveThemeMode(preferences.mode)
  }

  const resolvedMode = resolveThemeMode(preferences.mode)
  const root = document.documentElement
  const primaryTone = PRIMARY_TONES[resolvedMode][preferences.primary]
  const surfaceTone = SURFACE_TONES[resolvedMode][preferences.surface]
  const dangerTone = DANGER_TONES[resolvedMode]
  const semanticTone = SEMANTIC_TONES[resolvedMode]

  const variables = {
    '--app-canvas': surfaceTone.canvas,
    '--app-canvas-strong': surfaceTone.canvasStrong,
    '--app-panel': surfaceTone.panel,
    '--app-panel-strong': surfaceTone.panelStrong,
    '--app-ink': surfaceTone.ink,
    '--app-muted': surfaceTone.muted,
    '--app-accent': primaryTone.accent,
    '--app-accent-strong': primaryTone.accentStrong,
    '--app-accent-soft': primaryTone.accentSoft,
    '--app-border': surfaceTone.border,
    '--app-ring': primaryTone.ring,
    '--app-danger': dangerTone.danger,
    '--app-danger-soft': dangerTone.dangerSoft,
    '--app-danger-line': dangerTone.dangerLine,
    '--app-info': semanticTone.info.solid,
    '--app-info-strong': semanticTone.info.strong,
    '--app-info-soft': semanticTone.info.soft,
    '--app-info-line': semanticTone.info.line,
    '--app-success': semanticTone.success.solid,
    '--app-success-strong': semanticTone.success.strong,
    '--app-success-soft': semanticTone.success.soft,
    '--app-success-line': semanticTone.success.line,
    '--app-warning': semanticTone.warning.solid,
    '--app-warning-strong': semanticTone.warning.strong,
    '--app-warning-soft': semanticTone.warning.soft,
    '--app-warning-line': semanticTone.warning.line,
    '--app-shadow': surfaceTone.shadow,
    '--app-shadow-soft': surfaceTone.shadowSoft,
    '--app-shell-bg': surfaceTone.shellBg,
    '--app-shell-header': surfaceTone.shellHeader,
    '--app-shell-sidebar': surfaceTone.shellSidebar,
  }

  Object.entries(variables).forEach(([name, value]) => {
    root.style.setProperty(name, value)
  })

  root.dataset.appThemePreference = preferences.mode
  root.dataset.appMode = resolvedMode
  root.dataset.appPreset = preferences.preset
  root.dataset.appPrimary = preferences.primary
  root.dataset.appSurface = preferences.surface
  root.classList.toggle('app-dark', resolvedMode === 'dark')
  root.classList.toggle('app-light', resolvedMode === 'light')
  root.style.colorScheme = resolvedMode

  return resolvedMode
}

export function applyDocumentThemePreferences(preferences: ThemePreferences) {
  const normalizedPreferences = normalizeThemePreferences(preferences)
  themePreferences.value = normalizedPreferences
  return applyDocumentThemeVariables(normalizedPreferences)
}

export function applyPrimeVueThemePreferences(preferences: ThemePreferences) {
  const normalizedPreferences = normalizeThemePreferences(preferences)
  const resolvedMode = resolveThemeMode(normalizedPreferences.mode)

  usePreset(PRIMEVUE_PRESETS[normalizedPreferences.preset])
  updatePrimaryPalette(PRIMARY_PALETTES[normalizedPreferences.primary])
  updateSurfacePalette(SURFACE_PALETTES[normalizedPreferences.surface][resolvedMode])

  return normalizedPreferences
}

function applyThemeController(preferences: ThemePreferences, themeController?: ThemeControllerBridge) {
  if (!themeController) return

  const resolvedMode = resolveThemeMode(preferences.mode)
  themeController.change(resolvedMode === 'dark' ? 'customDarkTheme' : 'customLightTheme')
}

export function applyThemePreferences(
  preferences: ThemePreferences,
  options: { persist?: boolean; themeController?: ThemeControllerBridge } = {},
) {
  const normalizedPreferences = normalizeThemePreferences(preferences)
  const resolvedMode = applyDocumentThemePreferences(normalizedPreferences)

  applyPrimeVueThemePreferences(normalizedPreferences)
  applyThemeController(normalizedPreferences, options.themeController)

  if (options.persist !== false) {
    persistThemePreferences(normalizedPreferences)
  }

  return {
    preferences: normalizedPreferences,
    resolvedMode,
  }
}

export function useThemeState() {
  function loadThemePreferences() {
    return getStoredThemePreferences()
  }

  function setThemePreferences(
    nextPreferences: Partial<ThemePreferences>,
    options: { persist?: boolean; themeController?: ThemeControllerBridge } = {},
  ) {
    return applyThemePreferences(
      {
        ...themePreferences.value,
        ...nextPreferences,
      },
      options,
    ).preferences
  }

  function cycleThemeMode(options: { persist?: boolean; themeController?: ThemeControllerBridge } = {}) {
    const resolvedMode = resolveThemeMode(themePreferences.value.mode)
    const nextMode: ThemeMode = themePreferences.value.mode === 'light'
      ? 'dark'
      : themePreferences.value.mode === 'dark'
        ? 'light'
        : resolvedMode === 'dark'
          ? 'light'
          : 'dark'

    return setThemePreferences({ mode: nextMode }, options)
  }

  return {
    themePreferences,
    loadThemePreferences,
    setThemePreferences,
    cycleThemeMode,
    applyThemePreferences,
  }
}