---
applyTo: "src/**/*.{vue,ts,tsx,css,scss}"
---

# Frontend Source Rules

- Keep feature logic in its feature module and reuse shared UI primitives before adding another local panel, dialog, grid, tab, or form wrapper.
- Preserve existing props, emits, route parameters, API payloads, TanStack Query keys, Pinia state, and loading or error behavior when changing markup or styles.
- Use the established PrimeVue, Tailwind v4, `--app-*` token, and Iconify patterns. Keep surfaces flat and semantic colors tokenized so light and dark modes remain consistent.
- Do not reintroduce Vuetify or direct `<v-...>` components without an explicit migration task and a documented compatibility reason.
- Keep horizontal overflow inside data-grid, table, and dialog containers; verify responsive behavior at narrow and wide viewports for dense analysis screens.
- Keep route-level and heavy chart or export surfaces lazy when the surrounding feature already uses async component loading.
- For changed UI behavior, run the relevant Vitest test or Playwright flow when available, then run `pnpm exec vue-tsc -b --noEmit` and focused Biome lint.
