---
name: primevue-styled
description: >-
  PrimeVue styled mode theming: design tokens, presets, and customization.

  Use this skill when working with PrimeVue component styling via the token
  system. Covers how to configure themes, customize colors, define or extend
  presets, and scope tokens to individual components.

  Common scenarios:
  - customizing PrimeVue's primary or surface color palette
  - creating or extending a preset with definePreset
  - overriding component-level tokens (e.g. card, button backgrounds)
  - configuring dark mode via darkModeSelector
  - scoping design tokens to a single component instance with the dt prop
  - accessing token values programmatically with $dt or palette
  - switching presets at runtime with usePreset
  - understanding the primitive → semantic → component token hierarchy
---

# PrimeVue Styled Mode Theming

PrimeVue's styled mode is built on a three-tier design token system. All
customization should go through tokens rather than CSS overrides.

## Token Hierarchy

```
Primitive tokens  →  Semantic tokens  →  Component tokens
(blue-500)            (primary.color)      (button.background)
```

- **Primitive**: raw color values, no context (`zinc.500`, `emerald.400`)
- **Semantic**: named by purpose (`primary.color`, `formField.hoverBorderColor`). Use `colorScheme.light` / `colorScheme.dark` sub-groups for scheme-aware values.
- **Component**: per-component overrides (`card.root.background`, `button.color`). Use sparingly — prefer semantic tokens.

Reserved keys that cannot be used as token names: `primitive`, `semantic`,
`components`, `directives`, `colorscheme`, `light`, `dark`, `common`, `root`,
`states`, `extend`.

## Initial Theme Setup

```js
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';

app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            prefix: 'p',                  // CSS var prefix: var(--p-primary-color)
            darkModeSelector: 'system',   // or '.app-dark' for toggle-based dark mode
            cssLayer: false               // set true to wrap styles in @layer primevue
        }
    }
});
```

Built-in presets: **Aura** (PrimeTek's own), **Material** (Google MD v2),
**Lara** (Bootstrap-based), **Nora** (enterprise).

## Defining a Custom Preset

Use `definePreset` to extend an existing preset. Always mirror the structure
(direct value vs `colorScheme`) of the original token you're overriding —
mismatched structure causes overrides to be silently ignored.

```js
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const MyPreset = definePreset(Aura, {
    // your overrides here
});

app.use(PrimeVue, { theme: { preset: MyPreset } });
```

## Common Customizations

### Primary color palette

```js
const MyPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{indigo.50}',
            100: '{indigo.100}',
            // ...
            950: '{indigo.950}'
        }
    }
});
```

### Surface palette (light + dark)

```js
const MyPreset = definePreset(Aura, {
    semantic: {
        colorScheme: {
            light: {
                surface: { 0: '#ffffff', 50: '{zinc.50}', /* ... */ 950: '{zinc.950}' }
            },
            dark: {
                surface: { 0: '#ffffff', 50: '{slate.50}', /* ... */ 950: '{slate.950}' }
            }
        }
    }
});
```

### Form field hover border

```js
const MyPreset = definePreset(Aura, {
    semantic: {
        colorScheme: {
            light:  { formField: { hoverBorderColor: '{primary.color}' } },
            dark:   { formField: { hoverBorderColor: '{primary.color}' } }
        }
    }
});
```

### Focus ring

```js
const MyPreset = definePreset(Aura, {
    semantic: {
        focusRing: { width: '2px', style: 'dashed', color: '{primary.color}', offset: '1px' }
    }
});
```

### Component-level override

```js
const MyPreset = definePreset(Aura, {
    components: {
        card: {
            colorScheme: {
                light: { root: { background: '{surface.0}', color: '{surface.700}' } },
                dark:  { root: { background: '{surface.900}', color: '{surface.0}' } }
            }
        }
    }
});
```

### Noir (surface-as-primary) variant

```js
const Noir = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{zinc.50}', /* ... */ 950: '{zinc.950}'
        },
        colorScheme: {
            light: {
                primary: { color: '{zinc.950}', inverseColor: '#ffffff', hoverColor: '{zinc.900}', activeColor: '{zinc.800}' },
                highlight: { background: '{zinc.950}', focusBackground: '{zinc.700}', color: '#ffffff', focusColor: '#ffffff' }
            },
            dark: {
                primary: { color: '{zinc.50}', inverseColor: '{zinc.950}', hoverColor: '{zinc.100}', activeColor: '{zinc.200}' },
                highlight: { background: 'rgba(250,250,250,.16)', focusBackground: 'rgba(250,250,250,.24)', color: 'rgba(255,255,255,.87)', focusColor: 'rgba(255,255,255,.87)' }
            }
        }
    }
});
```

## Extending the Token System

Add custom tokens and styles beyond the built-in set:

```js
const MyPreset = definePreset(Aura, {
    components: {
        button: {
            extend: {
                accent: { color: '#f59e0b', inverseColor: '#ffffff' }
            },
            css: ({ dt }) => `
.p-button-accent {
    background: ${dt('button.accent.color')};
    color: ${dt('button.accent.inverse.color')};
}
`
        }
    },
    extend: {
        my: { transition: { fast: '0.25s', normal: '0.5s', slow: '0.75s' } }
    }
});
```

## Scoped Tokens (per-instance)

Use the `dt` prop to override tokens on a single component instance.
Prefer this over `:deep()` CSS overrides.

```vue
<InputText :dt="{ background: '{surface.100}' }" />
```

## CSS Layer & Specificity

Enable `cssLayer: true` in theme options to wrap PrimeVue styles in
`@layer primevue`, giving your app's styles automatic precedence without `!important`.

Useful when a Reset CSS conflicts with PrimeVue:

```css
@layer reset, primevue;

@layer reset {
    button, input { /* reset rules */ }
}
```

## Runtime Token Updates

```js
import { usePreset, updatePreset, updatePrimaryPalette, updateSurfacePalette } from '@primeuix/themes';

// Replace entire preset
usePreset(MyPreset);

// Merge token changes into current preset
updatePreset({ semantic: { primary: { 500: '{indigo.500}' } } });

// Shorthand helpers
updatePrimaryPalette({ 50: '{indigo.50}', /* ... */ 950: '{indigo.950}' });
updateSurfacePalette({ light: { 50: '{zinc.50}' }, dark: { 50: '{slate.50}' } });
```

## Accessing Token Values Programmatically

```js
import { $dt, palette } from '@primeuix/themes';

// Get token metadata and resolved value
const primaryColor = $dt('primary.color');
// → { name: '--primary-color', variable: 'var(--p-primary-color)', value: { light: ..., dark: ... } }

// Generate 50–950 shades from a hex or existing token
const shades = palette('#10b981');
const blueCopy = palette('{blue}');
```

## Scale

PrimeVue uses `rem` units. Adjust global component size via the root font size:

```css
html { font-size: 14px; }
```

## CSS Modules

Enable `module` on a `<style>` block and use `$style` to apply classes.
Recommended to also enable `cssLayer: true` to keep specificity manageable.
