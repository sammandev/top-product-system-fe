---
name: primevue-tailwind
description: >-
  Using Tailwind CSS alongside PrimeVue components.

  Use this skill when integrating Tailwind CSS with PrimeVue in either styled
  or unstyled mode. Covers plugin setup, semantic color utilities, CSS layer
  ordering, specificity overrides, animation utilities, and dark mode alignment
  between the two systems.

  Common scenarios:
  - setting up the tailwindcss-primeui plugin (v3 or v4)
  - using PrimeVue semantic colors as Tailwind utilities (bg-primary, text-muted-color, etc.)
  - resolving CSS specificity conflicts between Tailwind and PrimeVue
  - configuring @layer order so Tailwind utilities can override component styles
  - aligning Tailwind's dark variant with PrimeVue's darkModeSelector
  - using PrimeVue animation utility classes (animate-fadein, animate-scalein, etc.)
  - applying Tailwind utilities inside PrimeVue component internals via pass-through (Volt)
---

# PrimeVue + Tailwind CSS Integration

PrimeVue and Tailwind CSS serve complementary roles. Use PrimeVue for
accessible, feature-rich components and Tailwind for layout, spacing, and
custom styling around those components.

## Plugin Setup

The `tailwindcss-primeui` plugin provides first-class integration. Install it
once regardless of whether you use styled or unstyled mode.

### Tailwind v4

In your main CSS file:

```css
@import "tailwindcss";
@import "tailwindcss-primeui";
```

### Tailwind v3

In `tailwind.config.js`:

```js
module.exports = {
    plugins: [require('tailwindcss-primeui')]
};
```

## Semantic Color Utilities

The plugin exposes PrimeVue theme tokens as Tailwind utility classes.
All standard variants apply (`dark:`, `hover:`, `sm:`, etc.).

| Class | Description |
|---|---|
| `bg-primary` / `text-primary` | Default primary color |
| `bg-primary-emphasis` | Hovered primary background |
| `text-primary-contrast` | Text on primary backgrounds |
| `bg-highlight` / `bg-highlight-emphasis` | Highlight states |
| `bg-emphasis` | Hovered element background |
| `border-surface` | Content border color |
| `text-color` | Default text color |
| `text-muted-color` / `text-muted-color-emphasis` | Secondary text |
| `rounded-border` | Theme border radius |
| `primary-{50-950}` | Full primary palette |
| `surface-{0-950}` | Full surface palette |

```vue
<div class="rounded-border p-4 bg-primary hover:bg-primary-emphasis text-primary-contrast">
    primary button-like box
</div>

<div class="rounded-border p-4 border border-surface text-muted-color hover:text-color hover:bg-emphasis">
    surface card
</div>
```

## Dark Mode Alignment

If you use a custom `darkModeSelector` in PrimeVue (e.g. `.app-dark`), align
Tailwind's dark variant to the same selector so both systems switch together.

### Tailwind v4

```css
@variant dark (&:where(.app-dark, .app-dark *));
```

### Tailwind v3

```js
// tailwind.config.js
module.exports = {
    darkMode: ['selector', '.app-dark'],
    plugins: [require('tailwindcss-primeui')]
};
```

No changes needed if you use the default `darkModeSelector: 'system'`.

## CSS Layer Ordering (Specificity)

Tailwind utilities may not override PrimeVue component styles due to
specificity. The recommended fix is CSS layers.

### Tailwind v4

Ensure `primevue` layer is after `theme` and `base`, but before `utilities`.
No config change needed — just order your imports correctly.

### Tailwind v3

```css
/* Define layer order */
@layer theme, base, primevue, utilities;

/* Wrap PrimeVue in its layer */
@layer primevue {
    @import 'primevue/...';
}
```

### Last-resort: `!important` prefix

Use `!` prefix only when layers are not an option — it inflates bundle size
and reduces maintainability.

```vue
<InputText class="!bg-white/20 !border-0 !p-4" />
```

## Animation Utilities

The plugin adds animation utility classes for use with PrimeVue's
`StyleClass` and `AnimateOnScroll` directives.

### Preset animations

| Class | Animation |
|---|---|
| `animate-fadein` / `animate-fadeout` | Fade in/out (0.15s linear) |
| `animate-scalein` | Scale in (0.15s linear) |
| `animate-slidedown` / `animate-slideup` | Slide (0.45s ease) |
| `animate-fadeinleft` / `animate-fadeinright` | Directional fade in |
| `animate-zoomin` / `animate-zoomindown` | Zoom variants |
| `animate-flip` / `animate-flipup` | Flip variants |
| `animate-width` | Width animation |

### Composable animation modifiers

```vue
<div class="animate-fadein animate-once animate-duration-300 animate-ease-out">
```

**Duration**: `animate-duration-{0|75|100|200|300|400|500|700|1000|2000|3000}`
**Delay**: `animate-delay-{none|75|100|150|200|300|400|500|700|1000}`
**Iteration**: `animate-infinite` / `animate-once` / `animate-twice`
**Direction**: `animate-normal` / `animate-reverse` / `animate-alternate`
**Timing**: `animate-ease-linear` / `animate-ease-in` / `animate-ease-out` / `animate-ease-in-out`
**Fill**: `animate-fill-forwards` / `animate-fill-backwards` / `animate-fill-both`
**State**: `animate-running` / `animate-paused`

### Custom enter/leave animations

Build declarative enter/leave transitions using CSS variable modifiers:

```vue
<div class="animate-enter fade-in-50 zoom-in-95 slide-in-from-t-4">
<div class="animate-leave fade-out-50 zoom-out-95 slide-out-to-t-4">
```

| Group | Classes |
|---|---|
| Fade | `fade-in-{value}` / `fade-out-{value}` (opacity scale) |
| Zoom | `zoom-in-{value}` / `zoom-out-{value}` (scale values) |
| Spin | `spin-in-{value}` / `spin-out-{value}` (rotate values) |
| Slide | `slide-in-from-{t|b|l|r}-{value}` / `slide-out-to-{t|b|l|r}-{value}` |

All support arbitrary values: `fade-in-[15]`, `zoom-in-[0.8]`, `slide-in-from-b-[8px]`.

## Form Layout Example

```vue
<div class="flex flex-col gap-6 w-full sm:w-auto">
    <div class="flex flex-col sm:flex-row sm:items-center gap-6">
        <div class="flex-auto">
            <label class="block font-semibold mb-2">Firstname</label>
            <InputText class="w-full" />
        </div>
        <div class="flex-auto">
            <label class="block font-semibold mb-2">Lastname</label>
            <InputText class="w-full" />
        </div>
    </div>
</div>
```

## Headless / Pass-Through Example

Tailwind utilities can style PrimeVue component internals via `pt` (pass-through):

```vue
<Dialog
    v-model:visible="visible"
    pt:root:class="!border-0 !bg-transparent"
    pt:mask:class="backdrop-blur-sm"
>
    <template #container="{ closeCallback }">
        <div class="flex flex-col px-8 py-8 gap-6 rounded-2xl bg-primary-600">
            <!-- custom dialog content -->
        </div>
    </template>
</Dialog>
```

## Volt (Unstyled Mode + Tailwind)

Volt is an alternative if you want Tailwind to fully control component
internals instead of PrimeVue's design token system.

- Components live in your codebase (not `node_modules`) — full ownership
- Each Volt component wraps a PrimeVue unstyled counterpart and applies Tailwind via pass-through
- Maintenance: update PrimeVue version; Volt components don't require separate updates
- Trade-off: you maintain the component styles yourself

Use Volt when you want Tailwind-only styling throughout. Use styled mode +
`tailwindcss-primeui` when you want the default PrimeVue look with Tailwind
for layout and utilities.
