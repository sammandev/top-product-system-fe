import Aura from '@primeuix/themes/aura'
import Lara from '@primeuix/themes/lara'
import Material from '@primeuix/themes/material'
import Nora from '@primeuix/themes/nora'
import { definePreset, palette, updatePrimaryPalette, updateSurfacePalette, usePreset } from '@primeuix/themes'
import { ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ThemePresetName = 'aura' | 'lara' | 'material' | 'nora'
export type ThemePrimaryName =
  | 'preset'
  | 'emerald'
  | 'green'
  | 'lime'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose'
export type ThemeSurfaceName = 'preset' | 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone' | 'sand' | 'silver'
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

interface ResolvedPrimaryTone {
  accent: string
  accentStrong: string
  accentSoft: string
  ring: string
}

interface ResolvedSurfaceTone {
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
}

const STORAGE_KEY = 'app_theme_preferences'
const LEGACY_STORAGE_KEY = 'app_theme'

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  mode: 'system',
  preset: 'aura',
  primary: 'preset',
  surface: 'preset',
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
  { value: 'preset', label: 'Preset', description: 'Use the active preset accent colors.', icon: 'solar:dropper-bold-duotone', preview: '#334155' },
  { value: 'emerald', label: 'Emerald', description: 'Emerald accent scale.', icon: 'solar:dropper-bold-duotone', preview: '#10b981' },
  { value: 'green', label: 'Green', description: 'Green accent scale.', icon: 'solar:dropper-bold-duotone', preview: '#22c55e' },
  { value: 'lime', label: 'Lime', description: 'Lime accent scale.', icon: 'solar:dropper-bold-duotone', preview: '#84cc16' },
  { value: 'orange', label: 'Orange', description: 'Orange accent scale.', icon: 'solar:dropper-bold-duotone', preview: '#f97316' },
  { value: 'amber', label: 'Amber', description: 'Warm amber accent scale.', icon: 'solar:dropper-bold-duotone', preview: '#f59e0b' },
  { value: 'yellow', label: 'Yellow', description: 'Yellow accent scale.', icon: 'solar:dropper-bold-duotone', preview: '#eab308' },
  { value: 'teal', label: 'Teal', description: 'Teal accent scale.', icon: 'solar:dropper-bold-duotone', preview: '#14b8a6' },
  { value: 'cyan', label: 'Cyan', description: 'Cool cyan accent scale.', icon: 'solar:dropper-bold-duotone', preview: '#06b6d4' },
  { value: 'sky', label: 'Sky', description: 'Sky accent scale.', icon: 'solar:dropper-bold-duotone', preview: '#0ea5e9' },
  { value: 'blue', label: 'Blue', description: 'Blue accent scale.', icon: 'solar:dropper-bold-duotone', preview: '#3b82f6' },
  { value: 'indigo', label: 'Indigo', description: 'Indigo accent scale.', icon: 'solar:dropper-bold-duotone', preview: '#6366f1' },
  { value: 'violet', label: 'Violet', description: 'Violet accent scale.', icon: 'solar:dropper-bold-duotone', preview: '#8b5cf6' },
  { value: 'purple', label: 'Purple', description: 'Purple accent scale.', icon: 'solar:dropper-bold-duotone', preview: '#a855f7' },
  { value: 'fuchsia', label: 'Fuchsia', description: 'Fuchsia accent scale.', icon: 'solar:dropper-bold-duotone', preview: '#d946ef' },
  { value: 'pink', label: 'Pink', description: 'Pink accent scale.', icon: 'solar:dropper-bold-duotone', preview: '#ec4899' },
  { value: 'rose', label: 'Rose', description: 'Rose accent scale.', icon: 'solar:dropper-bold-duotone', preview: '#f43f5e' },
]

export const THEME_SURFACE_OPTIONS: ThemeOption<ThemeSurfaceName>[] = [
  { value: 'preset', label: 'Preset', description: 'Use the active preset surface tokens.', icon: 'solar:pallete-2-bold-duotone', preview: '#334155' },
  { value: 'slate', label: 'Slate', description: 'Cool blue-grey surfaces.', icon: 'solar:pallete-2-bold-duotone', preview: '#64748b' },
  { value: 'gray', label: 'Gray', description: 'Balanced gray surfaces.', icon: 'solar:pallete-2-bold-duotone', preview: '#6b7280' },
  { value: 'zinc', label: 'Zinc', description: 'Neutral graphite surfaces.', icon: 'solar:pallete-2-bold-duotone', preview: '#71717a' },
  { value: 'neutral', label: 'Neutral', description: 'Pure neutral surfaces.', icon: 'solar:pallete-2-bold-duotone', preview: '#737373' },
  { value: 'stone', label: 'Stone', description: 'Warm neutral surfaces.', icon: 'solar:pallete-2-bold-duotone', preview: '#78716c' },
  { value: 'sand', label: 'Sand', description: 'Soft sand surfaces.', icon: 'solar:pallete-2-bold-duotone', preview: '#b8a58d' },
  { value: 'silver', label: 'Silver', description: 'Cool silver surfaces.', icon: 'solar:pallete-2-bold-duotone', preview: '#94a3b8' },
]

const PRIMEVUE_PRESETS = {
  aura: definePreset(Aura, {
    components: {
      select: {
        root: {
          borderRadius: '{border.radius.xl}',
          shadow: '0 10px 30px -18px rgba(15, 23, 42, 0.28)',
        },
        overlay: {
          borderRadius: '{border.radius.xl}',
          shadow: '0 24px 48px -30px rgba(15, 23, 42, 0.35)',
        },
        option: {
          borderRadius: '{border.radius.md}',
        },
      },
      multiselect: {
        root: {
          borderRadius: '{border.radius.xl}',
          shadow: '0 10px 30px -18px rgba(15, 23, 42, 0.28)',
        },
        overlay: {
          borderRadius: '{border.radius.xl}',
          shadow: '0 24px 48px -30px rgba(15, 23, 42, 0.35)',
        },
        option: {
          borderRadius: '{border.radius.md}',
        },
        chip: {
          borderRadius: '999px',
        },
      },
      dialog: {
        root: {
          borderRadius: '{border.radius.xl}',
          shadow: '0 30px 60px -35px rgba(15, 23, 42, 0.4)',
        },
        title: {
          fontWeight: '700',
        },
      },
      tabs: {
        tab: {
          padding: '1rem 1.25rem',
          activeColor: '{primary.color}',
          activeBorderColor: '{primary.color}',
        },
        activeBar: {
          height: '2px',
          bottom: '-1px',
        },
      },
    },
  }),
  lara: definePreset(Lara, {
    components: {
      select: {
        root: {
          borderRadius: '{border.radius.xl}',
          shadow: 'none',
        },
        overlay: {
          borderRadius: '{border.radius.xl}',
          shadow: '0 18px 42px -30px rgba(15, 23, 42, 0.22)',
        },
        option: {
          borderRadius: '{border.radius.lg}',
        },
      },
      multiselect: {
        root: {
          borderRadius: '{border.radius.xl}',
          shadow: 'none',
        },
        overlay: {
          borderRadius: '{border.radius.xl}',
          shadow: '0 18px 42px -30px rgba(15, 23, 42, 0.22)',
        },
        option: {
          borderRadius: '{border.radius.lg}',
        },
        chip: {
          borderRadius: '999px',
        },
      },
      dialog: {
        root: {
          borderRadius: '{border.radius.xl}',
          shadow: '0 20px 44px -28px rgba(15, 23, 42, 0.24)',
        },
        title: {
          fontWeight: '700',
        },
      },
      tabs: {
        tab: {
          borderWidth: '2px 0 0 0',
          activeBorderColor: '{primary.color}',
          activeColor: '{primary.color}',
          padding: '0.95rem 1.25rem',
        },
        activeBar: {
          height: '0',
        },
        colorScheme: {
          light: {
            tab: {
              background: '{surface.50}',
              hoverBackground: '{surface.100}',
              activeBackground: '{surface.0}',
            },
          },
          dark: {
            tab: {
              background: '{surface.800}',
              hoverBackground: '{surface.700}',
              activeBackground: '{surface.900}',
            },
          },
        },
      },
    },
  }),
  material: definePreset(Material, {
    components: {
      select: {
        root: {
          borderRadius: '{border.radius.none}',
          shadow: 'none',
        },
        option: {
          borderRadius: '{border.radius.none}',
          padding: '0.75rem 1rem',
        },
      },
      multiselect: {
        root: {
          borderRadius: '{border.radius.none}',
          shadow: 'none',
        },
        option: {
          borderRadius: '{border.radius.none}',
          padding: '0.75rem 1rem',
        },
        chip: {
          borderRadius: '{border.radius.sm}',
        },
      },
      dialog: {
        root: {
          borderRadius: '{border.radius.sm}',
          shadow: '0 24px 48px -28px rgba(0, 0, 0, 0.35)',
        },
        title: {
          fontWeight: '700',
        },
      },
      tabs: {
        tab: {
          borderWidth: '0 0 2px 0',
          margin: '0 0 -1px 0',
          fontWeight: '700',
          activeBorderColor: '{primary.color}',
          activeColor: '{primary.color}',
        },
        activeBar: {
          height: '2px',
          bottom: '-1px',
        },
      },
    },
  }),
  nora: definePreset(Nora, {
    components: {
      select: {
        root: {
          borderRadius: '{border.radius.xs}',
          borderColor: '{surface.400}',
          shadow: 'none',
        },
        overlay: {
          borderRadius: '{border.radius.xs}',
          borderColor: '{surface.500}',
          shadow: '0 16px 30px -24px rgba(15, 23, 42, 0.28)',
        },
        option: {
          borderRadius: '0',
          padding: '0.625rem 0.875rem',
        },
      },
      multiselect: {
        root: {
          borderRadius: '{border.radius.xs}',
          borderColor: '{surface.400}',
          shadow: 'none',
        },
        overlay: {
          borderRadius: '{border.radius.xs}',
          borderColor: '{surface.500}',
          shadow: '0 16px 30px -24px rgba(15, 23, 42, 0.28)',
        },
        option: {
          borderRadius: '0',
          padding: '0.625rem 0.875rem',
        },
        chip: {
          borderRadius: '{border.radius.xs}',
        },
      },
      dialog: {
        root: {
          borderRadius: '{border.radius.xs}',
          borderColor: '{surface.400}',
          shadow: '0 24px 48px -32px rgba(15, 23, 42, 0.32)',
        },
        title: {
          fontWeight: '700',
        },
      },
      tabs: {
        tab: {
          activeBackground: '{primary.color}',
          activeColor: '{primary.contrast.color}',
          activeBorderColor: '{primary.color}',
          padding: '0.95rem 1.1rem',
          fontWeight: '700',
        },
        activeBar: {
          height: '0',
          background: 'transparent',
        },
        colorScheme: {
          light: {
            tab: {
              background: '{surface.50}',
              hoverBackground: '{surface.100}',
              activeBackground: '{primary.color}',
            },
          },
          dark: {
            tab: {
              background: '{surface.800}',
              hoverBackground: '{surface.700}',
              activeBackground: '{primary.color}',
            },
          },
        },
      },
    },
  }),
} as const

const PRIMARY_PALETTE_SOURCES: Record<Exclude<ThemePrimaryName, 'preset'>, string> = {
  emerald: '{emerald}',
  green: '{green}',
  lime: '{lime}',
  orange: '{orange}',
  amber: '{amber}',
  yellow: '{yellow}',
  teal: '{teal}',
  cyan: '{cyan}',
  sky: '{sky}',
  blue: '{blue}',
  indigo: '{indigo}',
  violet: '{violet}',
  purple: '{purple}',
  fuchsia: '{fuchsia}',
  pink: '{pink}',
  rose: '{rose}',
}

const SURFACE_PALETTE_SOURCES: Record<Exclude<ThemeSurfaceName, 'preset'>, string> = {
  slate: '{slate}',
  gray: '{gray}',
  zinc: '{zinc}',
  neutral: '{neutral}',
  stone: '{stone}',
  sand: '#bea78d',
  silver: '#94a3b8',
}

const PRIMARY_PALETTES = Object.fromEntries(
  Object.entries(PRIMARY_PALETTE_SOURCES).map(([name, source]) => [name, palette(source) as Record<string, string>]),
) as Record<Exclude<ThemePrimaryName, 'preset'>, Record<string, string>>

const SURFACE_PALETTES = Object.fromEntries(
  Object.entries(SURFACE_PALETTE_SOURCES).map(([name, source]) => {
    const tones = palette(source) as Record<string, string>

    return [
      name,
      {
        light: { 0: '#ffffff', ...tones },
        dark: { 0: '#ffffff', ...tones },
      },
    ]
  }),
) as unknown as Record<Exclude<ThemeSurfaceName, 'preset'>, { light: Record<string, string>; dark: Record<string, string> }>

function resolvePrimaryTone(preference: ThemePrimaryName, mode: ResolvedThemeMode): ResolvedPrimaryTone {
  if (preference === 'preset') {
    return {
      accent: `var(--p-primary-color, ${mode === 'dark' ? '#34d399' : '#047857'})`,
      accentStrong: mode === 'dark'
        ? 'color-mix(in srgb, var(--p-primary-color, #34d399) 72%, white)'
        : 'color-mix(in srgb, var(--p-primary-color, #047857) 86%, black)',
      accentSoft: `color-mix(in srgb, var(--p-primary-color, ${mode === 'dark' ? '#34d399' : '#047857'}) 16%, transparent)`,
      ring: `var(--p-primary-color, ${mode === 'dark' ? '#34d399' : '#047857'})`,
    }
  }

  const resolvedPalette = PRIMARY_PALETTES[preference]

  return mode === 'dark'
    ? {
        accent: resolvedPalette['400']!,
        accentStrong: resolvedPalette['300']!,
        accentSoft: `color-mix(in srgb, ${resolvedPalette['500']!} 24%, transparent)`,
        ring: resolvedPalette['300']!,
      }
    : {
        accent: resolvedPalette['700']!,
        accentStrong: resolvedPalette['800']!,
        accentSoft: resolvedPalette['100']!,
        ring: resolvedPalette['500']!,
      }
}

function resolveSurfaceTone(preference: ThemeSurfaceName, mode: ResolvedThemeMode): ResolvedSurfaceTone {
  if (preference === 'preset') {
    return mode === 'dark'
      ? {
          canvas: 'var(--p-surface-950, #09090b)',
          canvasStrong: 'var(--p-surface-900, #18181b)',
          panel: 'var(--p-surface-900, #18181b)',
          panelStrong: 'var(--p-surface-900, #18181b)',
          ink: 'var(--p-text-color, #f4f4f5)',
          muted: 'var(--p-text-muted-color, #a1a1aa)',
          border: 'var(--p-content-border-color, var(--p-surface-700, #3f3f46))',
          shadow: 'none',
          shadowSoft: 'none',
          shellBg: 'color-mix(in srgb, var(--p-primary-color, #34d399) 5%, var(--p-surface-950, #09090b))',
          shellHeader: 'var(--p-surface-900, #18181b)',
          shellSidebar: 'color-mix(in srgb, var(--p-primary-color, #34d399) 7%, var(--p-surface-900, #18181b))',
        }
      : {
          canvas: 'var(--p-surface-50, #fafafa)',
          canvasStrong: 'var(--p-surface-100, #f4f4f5)',
          panel: 'var(--p-surface-0, #ffffff)',
          panelStrong: 'var(--p-surface-0, #ffffff)',
          ink: 'var(--p-text-color, #18181b)',
          muted: 'var(--p-text-muted-color, #71717a)',
          border: 'var(--p-content-border-color, var(--p-surface-200, #e4e4e7))',
          shadow: 'none',
          shadowSoft: 'none',
          shellBg: 'color-mix(in srgb, var(--p-primary-color, #047857) 4%, var(--p-surface-50, #fafafa))',
          shellHeader: 'var(--p-surface-0, #ffffff)',
          shellSidebar: 'color-mix(in srgb, var(--p-primary-color, #047857) 6%, var(--p-surface-100, #f4f4f5))',
        }
  }

  const resolvedPalette = SURFACE_PALETTES[preference][mode]
  const isLight = mode === 'light'

  return {
    canvas: resolvedPalette[isLight ? '50' : '950']!,
    canvasStrong: resolvedPalette[isLight ? '100' : '900']!,
    panel: (isLight ? resolvedPalette['0'] : resolvedPalette['900'])!,
    panelStrong: (isLight ? resolvedPalette['0'] : resolvedPalette['900'])!,
    ink: resolvedPalette[isLight ? '950' : '50']!,
    muted: resolvedPalette[isLight ? '600' : '300']!,
    border: resolvedPalette[isLight ? '200' : '700']!,
    shadow: 'none',
    shadowSoft: 'none',
    shellBg: resolvedPalette[isLight ? '50' : '950']!,
    shellHeader: (isLight ? resolvedPalette['0'] : resolvedPalette['900'])!,
    shellSidebar: resolvedPalette[isLight ? '100' : '900']!,
  }
}

const DANGER_TONES: Record<ResolvedThemeMode, { danger: string; dangerSoft: string; dangerLine: string }> = {
  dark: {
    danger: '#fda4af',
    dangerSoft: '#7f1d1d',
    dangerLine: '#fecdd3',
  },
  light: {
    danger: '#a33d2d',
    dangerSoft: '#fee2e2',
    dangerLine: '#a33d2d',
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
      soft: '#164e63',
      line: '#a5f3fc',
    },
    success: {
      solid: '#4ade80',
      strong: '#86efac',
      soft: '#14532d',
      line: '#86efac',
    },
    warning: {
      solid: '#fbbf24',
      strong: '#fcd34d',
      soft: '#78350f',
      line: '#fcd34d',
    },
  },
  light: {
    info: {
      solid: '#0e7490',
      strong: '#155e75',
      soft: '#cffafe',
      line: '#155e75',
    },
    success: {
      solid: '#15803d',
      strong: '#166534',
      soft: '#dcfce7',
      line: '#166534',
    },
    warning: {
      solid: '#b45309',
      strong: '#92400e',
      soft: '#fef3c7',
      line: '#92400e',
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
  const primaryTone = resolvePrimaryTone(preferences.primary, resolvedMode)
  const surfaceTone = resolveSurfaceTone(preferences.surface, resolvedMode)
  const dangerTone = DANGER_TONES[resolvedMode]
  const semanticTone = SEMANTIC_TONES[resolvedMode]

  const variables = {
    '--app-canvas': surfaceTone.canvas,
    '--app-canvas-strong': surfaceTone.canvasStrong,
    '--app-panel': surfaceTone.panel,
    '--app-panel-strong': surfaceTone.panelStrong,
    '--app-surface': surfaceTone.canvas,
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

  usePreset(PRIMEVUE_PRESETS[normalizedPreferences.preset])

  if (normalizedPreferences.primary !== 'preset') {
    updatePrimaryPalette(PRIMARY_PALETTES[normalizedPreferences.primary])
  }

  if (normalizedPreferences.surface !== 'preset') {
    updateSurfacePalette(SURFACE_PALETTES[normalizedPreferences.surface] as never)
  }

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