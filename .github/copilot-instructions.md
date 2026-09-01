# Token Conservation Rules
- Be concise. Skip conversational filler, apologies, and restating the prompt.
- When suggesting changes, provide only the relevant snippet or unified diff rather than rewriting entire files.
- Favor brief inline explanations over lengthy markdown essays.

# Frontend Project Rules

## Project context

- This repository is the Vue 3 SPA for AST Tools.
- Use the package manager declared in `package.json`: pnpm 11. Do not use npm or yarn.
- The main application is under `src`; feature behavior belongs under `src/features`, cross-cutting code under `src/core`, and reusable UI under `src/shared`.
- The UI integrates with the FastAPI backend and intranet DUT/iPLAS services.

## Working rules

- Use Vue Composition API with `<script setup>` and strict TypeScript. Preserve existing props, emits, route contracts, API payloads, and store behavior when changing presentation.
- Prefer existing shared primitives such as `AppPanel`, `AppDialog`, `AppDataGrid`, `AppTabs`, `AppSelect`, and `AppMultiSelect` over new one-off shells.
- Use PrimeVue, Tailwind CSS v4, the existing `--app-*` theme tokens, and Iconify according to nearby code. Do not reintroduce Vuetify or direct `<v-...>` components without an explicit migration decision.
- Avoid hardcoded color utilities (e.g. `bg-black`, `bg-gray-900`); always use `--app-*` theme variables or semantic Tailwind classes so components adapt cleanly between light and dark modes.
- For sticky/frozen table columns and dialog surfaces, ensure solid background token styles (`bg-[var(--app-bg-surface)]` or equivalent) to prevent hover bleed-through.
- Standardize form controls and action triggers to 44px (`h-11`) touch-friendly height across analysis forms. Step counter badges must use `inline-flex items-center justify-center rounded-full` for centered alignment.
- Use virtualization or pagination for large test-item, device, and ISN lists in dialogs to prevent modal render lag.
- Keep server state in the existing TanStack Query/API patterns and client state in the existing Pinia stores. Do not place bearer tokens in query keys, URLs, logs, or rendered content.
- Keep table and dialog overflow inside their containers. Check narrow desktop and mobile layouts when changing dense DUT, analysis, admin, or data-grid surfaces.
- A local frontend change is not present on the deployed site until it is deployed. Do not treat a live server as proof that local source changed.
- Do not change deployment environment files or server addresses unless the task explicitly requests deployment work.

## Validation

Run the narrowest relevant checks first, then broaden when practical:

- `pnpm exec vue-tsc -b --noEmit`
- `pnpm exec biome check --write <touched-path>`
- `pnpm exec biome lint <touched-path>`
- `pnpm run test:run`
- `pnpm run test:coverage`
- `pnpm run build`
- `pnpm run test:e2e` for route or browser-flow changes

On Windows, use `pnpm.cmd` if command resolution requires it. If Vite or pnpm behaves differently because of the workspace path, validate from a temporary path without special characters and record that limitation rather than rewriting unrelated files.

Report the exact command and result. End substantial work with `State`, `Changed`, `Validation`, `Known issue`, and `Next action` so a new session can continue without rediscovering context.