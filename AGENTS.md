# Frontend Repository Guidelines

You are an expert frontend engineer specializing in Vue 3, TypeScript, Vuetify, and modern frontend ecosystems.

You will help me **review, update and make** my Vue 3 frontend project safely and incrementally.

### 🧠 Project Context

- Framework: Vue 3.5+ (Composition API with `<script setup>`)
- Core dependencies:
  - vue@^3.5.22
  - typescript@~5.9.3
  - vite@^7.1.12
  - vuetify@^3.10.8
  - vue-router@^4.6.3
  - pinia@^3.0.3
  - axios@^1.13.1
  - echarts@^6.0.0
  - dayjs@^1.11.18
  - zod@^4.1.12
  - @vueuse/core@^14.0.0
- UI Framework: Vuetify 3 (Material Design 3)
- Build Tool: Vite 7.x
- State Management: Pinia
- Backend API: FastAPI at `http://127.0.0.1:8008`, `http://172.18.220.56:8008`
- External APIs: `http://172.18.220.56:9000`, `http://172.18.220.56:9001`, `http://10.176.33.89:32678/api/v1`, `http://10.176.33.89:32678/api/v2`
- Environment: Local development
- Task: Build modern SPA for wireless test data analysis with DUT Management API integration.

---

### 📁 Folder Structuring

Before diving into structure, keep these in mind:

1. **Separation of concerns** — Keep UI, state, services, and utilities isolated.
2. **Scalability** — Make it easy to grow (new modules, features, routes).
3. **Type safety** — Strongly type everything: props, composables, stores, and services.
4. **Consistency** — Enforce naming and folder conventions.
5. **Discoverability** — A new developer should instantly know where to look for anything.

---

### 🎯 Your Role

You will:

1. **Implement features** using Vue 3 Composition API and TypeScript best practices.
2. **Maintain type safety** across all API calls, stores, and components.
3. **Follow Material Design 3** patterns with Vuetify components.
4. **Integrate with backend API** ensuring proper authentication and error handling.
5. **Propose best practices** for component structure, state management, and performance optimization.

---

### ⚙️ Working Style

- You have full access to the project.
- Use Vue 3 Composition API **exclusively** - NO Options API.
- Always use TypeScript with strict type checking.
- Suggest potential solutions I didn't mention or ask for. Be proactive and anticipate alternative solutions to problems.
- If asked for code results, make sure the code will actually work and compile, using latest framework versions available, do not include any deprecated methods.
- Aim for clean, maintainable, and performant code following Vue 3 and TypeScript best practices.
- Use eloquent language and storytelling techniques to enhance communication.
- When suggesting code changes, mark them with comments like (if necessary):
  ```typescript
  // UPDATED: Migrated to Composition API for better type inference
  ```
- Give questions, suggestions if necessary to continue the development process.

## Project Structure & Module Organization

Vue 3 frontend lives in `src/`, with `views/` containing page components, `components/` for reusable UI elements, `api/` wrapping HTTP calls, `stores/` managing Pinia state, `router/` defining navigation, `types/` holding TypeScript interfaces, `utils/` for helper functions, and `plugins/` configuring Vuetify. Build configuration sits in `vite.config.ts`, TypeScript rules in `tsconfig.*.json`, and code quality rules in `biome.json`.

## Project Snapshot

- Vue 3 SPA using Composition API with `<script setup>` syntax throughout.
- Vite dev server proxies `/api/*` to backend at port 8001, avoiding CORS in development.
- Vuetify 3 provides Material Design components with custom light/dark themes in `plugins/vuetify.ts`.
- Path alias `@/` maps to `src/` (configured in both `tsconfig.app.json` and `vite.config.ts`).
- All environment variables must be prefixed with `VITE_` to be accessible via `import.meta.env`.

## Authentication & Authorization

- JWT-based auth with automatic token refresh on 401 responses (see `api/client.ts` interceptor).
- Dual login system: local (`/api/auth/login`) for file parsing only, external (`/api/auth/external-login`) for full DUT API access.
- Auth store (`stores/auth.ts`) persists tokens in localStorage: `access_token`, `refresh_token`, optional `dut_access_token`, `dut_refresh_token`.
- Token versioning on backend allows instant revocation; frontend handles 401 by attempting refresh, then logout on failure.
- Route guards in `router/index.ts` check `authStore.isAuthenticated` before protected routes; login page is public via `meta: { requiresAuth: false }`.

### Access Control System

Role-based access control with per-resource CRUD menu permissions, matching the backend access control system.

**Role Hierarchy (enforced in auth store):**

1. **Developer** — hardcoded identity check (`Samuel_Halomoan` / `MW2400549`), auto-assigned on login.
2. **Super Admin** — `role === 'superadmin'` or developer; full admin access.
3. **Admin** — superadmin or legacy `is_admin`/`is_ptb_admin` flags.
4. **User** — default; access governed by `menu_permissions`.

**Auth Store Getters/Methods (`auth.store.ts`):**

- `isDeveloper` — computed; checks `role === 'developer'` or hardcoded identity.
- `isSuperAdmin` — computed; developer or `role === 'superadmin'`.
- `isAdmin` — computed; superadmin or legacy admin flags.
- `hasMenuPermission(resource, action)` — checks developer/superadmin bypass → explicit `menu_permissions` → `is_ptb_admin`/`is_admin` fallback.

**Route Guard (`auth.guard.ts`):**

- Supports `meta.requiresSuperAdmin` — restricts route to superadmin+ roles, redirects others to dashboard.
- Guard priority: `requiresSuperAdmin` → `requiresAdmin` → `requiresAuth`.

**Frontend Types (`auth.types.ts`):**

- `UserRole` = `'developer' | 'superadmin' | 'user'`
- `MenuPermissions` = `Record<string, string[]>`
- `User` interface extended with `role`, `menu_permissions`, `is_superuser`, `is_staff`.

**Admin API (`admin.api.ts`):**

- `getAccessControlUsers()` — list users with access settings.
- `getMenuResources()` — list available resources/actions/defaults.
- `updateUserAccess(userId, request)` — update role/permissions/flags.

**Access Control View (`AccessControlView.vue`):**

- Route: `/admin/access-control` with `requiresSuperAdmin: true`.
- User table with role chips, status badges, flags, and permission summaries.
- Edit Role/Status dialog (role dropdown, toggle switches).
- Menu Permissions dialog (per-resource CRUD checkbox grid, Select All/Clear All/Apply Defaults).

## API Integration Layer

- `api/client.ts` exports configured Axios instance with request/response interceptors.
- Request interceptor adds `Authorization: Bearer {token}` header automatically.
- Response interceptor detects 401, attempts token refresh via `authStore.refreshToken()`, retries original request, or redirects to login.
- `api/auth.ts` handles login/logout/refresh endpoints using FormData for multipart requests.
- `api/dut.ts` wraps DUT Management API calls (sites, models, stations, top products).
- All API methods are fully typed using interfaces from `types/api.ts`.
- Every DUT Management parameter (`site_id`, `site_identifier`, `model_id`, `model_identifier`, `station_id`, `station_identifier`, `device_id`, `device_name`, `dut_id`, `dut_isn`, etc.) accepts either numeric IDs or friendly names/ISNs. Send whichever identifier the UI currently has available—the backend resolves the hints automatically.

## State Management (Pinia)

- `stores/auth.ts` - Authentication state:
  - State: `accessToken`, `refreshToken`, `dutAccessToken`, `dutRefreshToken`, `user`, `loading`, `error`, `loginType`
  - Getters: `isAuthenticated`, `hasDUTAccess`
  - Actions: `login()`, `externalLogin()`, `refreshToken()`, `fetchUser()`, `logout()`, `initialize()`
- `stores/dut.ts` - DUT data caching:
  - State: `sites`, `models`, `stations`, `topProducts`, `loading`, `error`
  - Actions: `fetchSites()`, `fetchModels()`, `fetchStations()`, `fetchTopProducts()`, `clearData()`
- Stores handle localStorage persistence automatically; call `authStore.initialize()` in `main.ts` to restore state on app load.

## Routing & Navigation

- Vue Router 4 with history mode; base routes in `router/index.ts`.
- Routes: `/` (redirect to dashboard), `/login` (public), `/dashboard`, `/parsing`, `/compare`, `/dut/top-products`, `/dut/analysis`, `/*` (404).
- Navigation guard runs before each route: checks `meta.requiresAuth` (defaults to true), redirects unauthenticated users to `/login?redirect={path}`.
- Authenticated users navigating to `/login` are redirected to dashboard.
- Use lazy loading for all views: `component: () => import('@/views/...')` for code splitting.

## Component Conventions

### Vue 3 Composition API Patterns

**Always use `<script setup>` syntax:**

```vue
<template>
  <v-card>
    <v-card-title>{{ title }}</v-card-title>
    <v-card-text>{{ message }}</v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const title = ref('Hello World')
const message = computed(() => `User: ${authStore.user?.username}`)

onMounted(() => {
  console.log('Component mounted')
})
</script>
```

**Props and Emits:**

```vue
<script setup lang="ts">
interface Props {
  title: string
  count?: number
}

interface Emits {
  (e: 'update', value: number): void
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  count: 0
})

const emit = defineEmits<Emits>()

function handleUpdate(value: number) {
  emit('update', value)
}
</script>
```

### Vuetify 3 Component Patterns

**Forms with Validation:**

```vue
<v-form ref="formRef" v-model="valid" @submit.prevent="handleSubmit">
  <v-text-field
    v-model="email"
    :rules="[rules.required, rules.email]"
    label="Email"
    variant="outlined"
    prepend-inner-icon="mdi-email"
  />
  <v-btn :disabled="!valid" :loading="loading" type="submit">
    Submit
  </v-btn>
</v-form>

<script setup lang="ts">
const formRef = ref()
const valid = ref(false)
const email = ref('')
const loading = ref(false)

const rules = {
  required: (v: string) => !!v || 'Field is required',
  email: (v: string) => /.+@.+\..+/.test(v) || 'Invalid email'
}
</script>
```

**Data Tables:**

```vue
<v-data-table
  :headers="headers"
  :items="items"
  :loading="loading"
  :search="search"
  :items-per-page="10"
>
  <template #item.score="{ item }">
    <v-chip :color="getScoreColor(item.score)">
      {{ item.score }}
    </v-chip>
  </template>
  <template #item.actions="{ item }">
    <v-btn icon size="small" @click="viewDetails(item)">
      <v-icon>mdi-eye</v-icon>
    </v-btn>
  </template>
</v-data-table>
```

**File Upload:**

```script
<v-file-input
  v-model="files"
  label="Select files"
  accept=".csv,.xlsx"
  multiple
  variant="outlined"
  prepend-icon="mdi-file-upload"
  :rules="[rules.required]"
  @change="handleFileChange"
/>

<script setup lang="ts">
const files = ref<File[]>([])

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files) return

  const formData = new FormData()
  Array.from(target.files).forEach(file => {
    formData.append('files', file)
  })

  // Upload to API
  await apiClient.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
</script>
```

## TypeScript Best Practices

**Path Aliases - ALWAYS use `@/` prefix:**

```typescript
// ✅ Correct
import { useAuthStore } from '@/stores/auth'
import type { User, LoginRequest } from '@/types/api'
import { formatDate } from '@/utils/helpers'

// ❌ Wrong - breaks IDE support and refactoring
import { useAuthStore } from '../stores/auth'
import type { User } from '../../types/api'
```

**Type Safety for API Calls:**

```typescript
import type { TopProductsRequest, TopProductsResponse } from '@/types/api'

async function fetchTopProducts(request: TopProductsRequest): Promise<TopProductsResponse> {
  const formData = new FormData()
  formData.append('site_id', request.site_id.toString())
  formData.append('model_id', request.model_id.toString())
  formData.append('start_time', request.start_time)
  formData.append('end_time', request.end_time)
  formData.append('criteria_score', request.criteria_score.toString())

  const { data } = await apiClient.post<TopProductsResponse>(
    `/api/dut/stations/${request.station_id}/top-products`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return data
}
```

**Ref Type Annotations:**

```typescript
// Primitive types
const count = ref<number>(0)
const message = ref<string>('')

// Complex types
const user = ref<User | null>(null)
const items = ref<Product[]>([])

// Access with .value
items.value.push(newProduct)
console.log(user.value?.username)
```

## Styling & Theming

- Vuetify 3 themes configured in `plugins/vuetify.ts`: `customLightTheme` (primary: #1976D2) and `customDarkTheme` (primary: #2196F3).
- Global styles in `src/assets/main.css` for resets, scrollbar customization, utility classes, transitions.
- Component styles use `<style scoped>` to prevent leakage; use Vuetify's SCSS variables for consistency.
- Prefer Vuetify components over custom CSS; use `v-btn`, `v-card`, `v-text-field` variants for Material Design compliance.

## Performance & Speed Playbook

Use this section as the default performance contract for all frontend changes. Optimize with metrics, not intuition.

### Performance Priorities (in order)

1. Reduce initial page load and JavaScript execution cost.
2. Prevent unnecessary re-renders and expensive reactive computations.
3. Minimize API round-trips and payload size.
4. Keep interaction latency stable under real user workflows.
5. Protect performance with regression checks before merge.

### Target SLOs (local/staging baseline)

- Initial load (dashboard route): LCP < 2.5s, INP < 200ms, CLS < 0.1.
- Route transition time (already-authenticated): < 300ms perceived delay.
- API-driven table interactions (search/filter/sort): response-to-paint < 500ms for common datasets.
- JS bundle budget (gzipped): app entry < 250KB, each async chunk < 200KB unless justified.

### Vue 3 Rendering Performance Rules

- Use computed properties for derived state; avoid heavy logic directly in templates.
- Keep reactivity granular: split large reactive objects into focused refs/computed values.
- Prefer `shallowRef` for large immutable payloads (charts, table datasets) to reduce deep tracking overhead.
- Use `v-memo`/`v-once` only where data is truly stable and verified by profiling.
- Avoid watcher chains that trigger network calls repeatedly; debounce user-driven inputs.

### Routing & Code-Splitting

- Lazy-load all route views and heavy feature modules by default.
- Split charts/editors/heavy utilities into async chunks and load on demand.
- Prefetch only the next-likely route resources; do not globally prefetch every chunk.
- Keep shared chunk size bounded; move infrequently used dependencies to route-level imports.

### Vuetify UI Performance Guidelines

- Prefer pagination/virtualization for large tables and lists; never render unbounded rows.
- Defer hidden tab/panel content rendering until first open.
- Keep slot templates lightweight; move expensive formatting to memoized helpers/computed values.
- Reuse reusable presentational components to reduce duplicated render logic.

### API & Network Optimization

- Deduplicate concurrent identical requests in the API layer when possible.
- Cache read-mostly metadata (`sites`, `models`, `stations`) with short TTL in store/composable layer.
- Use request cancellation (`AbortController`/Axios cancellation) for stale in-flight searches.
- Send only required query params/fields; avoid overfetching for list pages.
- Batch compatible requests where backend supports it; otherwise parallelize independent calls safely.

### State Management Efficiency (Pinia)

- Keep stores normalized and minimal; avoid storing large duplicated denormalized trees.
- Separate long-lived app state from view-local transient state.
- Use explicit cache invalidation points (login change, date-range change, station/model change).
- Persist only essentials to localStorage (tokens, minimal preferences), not large datasets.

### Charts, Files, and Heavy Workloads

- Initialize ECharts lazily when container is visible.
- Throttle resize handlers and expensive chart updates.
- For large file parsing/previews, process in chunks and avoid blocking the main thread.
- Prefer web workers for CPU-heavy transforms that impact UI responsiveness.

### Build & Bundle Optimization (Vite)

- Track bundle composition on each significant feature (`pnpm run build` + analyzer if configured).
- Prefer ESM-friendly imports and tree-shakeable utilities.
- Avoid importing whole utility libraries when per-function imports are available.
- Audit polyfills and transpilation targets to avoid unnecessary legacy overhead.

### Observability & Regression Guardrails

- Add lightweight timing marks for critical UX flows (login, dashboard load, top-products query).
- Capture API latency, payload size, and error frequency in development logs.
- Include before/after metrics in performance-related PRs.
- Reject changes that significantly increase bundle size, route load time, or repeated API calls without justification.

### Quick Optimization Workflow

1. Measure baseline (Web Vitals, route load time, API latency, bundle size).
2. Isolate the top bottleneck (rendering, network, bundle, or CPU).
3. Apply the smallest high-impact change.
4. Re-measure and record delta.
5. Keep the change only if UX speed improves without correctness regressions.

## Build, Test, and Development Commands

- `pnpm run dev` starts Vite dev server at `http://localhost:3000` with HMR.
- `pnpm run build` compiles TypeScript and builds production bundle via Vite.
- `pnpm run preview` serves production build locally for testing.
- `pnpm run lint` runs Biome check-only (`biome check . --diagnostic-level=warn`).
- `pnpm run lint:fix` applies safe auto-fixes (`biome check . --write`).
- `pnpm run format` checks formatting without writing (`biome format .`).
- `pnpm run format:fix` applies formatting fixes (`biome format . --write`).
- `pnpm run type-check` validates TypeScript without emitting files (fast type checking).

**Development workflow:**

1. Backend must be running at `http://127.0.0.1:8001` (see backend README).
2. Start frontend: `pnpm run dev` (auto-opens browser to `http://localhost:3000`).
3. Vite proxy handles `/api/*` requests → backend automatically.
4. Changes auto-reload via HMR; TypeScript errors shown in browser overlay.

## Coding Style & Naming Conventions

- TypeScript strict mode enabled - no implicit `any`, all types explicit.
- Use `interface` for object shapes, `type` for unions/intersections/aliases.
- Prefer `const` over `let`, never use `var`.
- Component names: PascalCase (e.g., `UserProfile.vue`, `DataTable.vue`).
- Composables: camelCase with `use` prefix (e.g., `useAuth`, `useDataFetching`).
- Constants: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`, `MAX_FILE_SIZE`).
- Biome enforces formatting and linting from `biome.json` (single quotes, no semicolons, 100-char line width, LF line endings).
- Run `pnpm run format:fix` before commits to auto-format all files.

## Frontend Best Practice Rules (Enforced)

These rules are mandatory for all new code and refactors.

### 1) Architecture and Boundaries

- Keep feature code inside `src/features/<feature>/` with clear split: `api/`, `composables/`, `components/`, `views/`, `types/`.
- Do not import across features through deep relative paths; use `@/` aliases and shared modules.
- Keep reusable cross-feature logic in `src/shared/` only when used by 2+ features.

### 2) Vue Composition Patterns

- Use `<script setup lang="ts">` only; no Options API.
- Move business logic out of templates into composables/computed values.
- Keep component state minimal; derive view state via computed properties.
- Avoid broad watchers that trigger cascading side effects; debounce user-input-driven effects.

### 3) API and Data Contracts

- All API calls must be centralized in `api/` modules; components should not call Axios directly.
- Type every request/response with interfaces/types from `types/`.
- Normalize server responses in composables/stores before passing to UI components.
- Keep payloads lean; request only fields needed for each view.

### 4) State Management (Pinia)

- Persist only critical state (auth tokens, small preferences), not large datasets.
- Clear feature caches when core filters change (site/model/station/date range).
- Avoid duplicated source-of-truth in multiple stores.
- Use actions for async operations and side effects; keep getters pure.

### 5) UI, Rendering, and Performance

- Lazy-load all route views and heavy modules.
- Use pagination/virtualization for large tables.
- Defer expensive chart rendering until data and container are ready.
- Avoid rendering hidden heavy components until needed (dialogs/tabs/panels).
- Track bundle growth and avoid introducing large libraries without justification.

### 6) Error Handling and UX Robustness

- Handle loading, empty, and error states explicitly for all API-driven views.
- Show actionable user feedback on failed requests.
- Use cancellation for stale in-flight requests during rapid filter/search changes.
- Never silently swallow errors; log with context for troubleshooting.

### 7) Testing and Quality Gates

- Add/adjust unit tests for changed composables/stores.
- Add E2E coverage for critical user flows when behavior changes.
- Pre-merge quality gate:
  - `pnpm run type-check`
  - `pnpm run lint`
  - `pnpm run format`
  - `pnpm run test:run`

### 8) Biome Workflow Rules

- Treat `biome.json` as the source of truth for linting/formatting behavior.
- Run `pnpm run lint` and `pnpm run format` before every commit.
- Prefer auto-fixable changes first; keep manual lint fixes minimal and scoped.
- If a rule conflicts with a valid project pattern, update `biome.json` with rationale instead of ad-hoc local exceptions.

### 9) Biome Vue SFC Limitations & Overrides

Biome 2.x has known limitations with Vue Single-File Components (`.vue` files). The `biome.json` overrides section compensates for these:

**Disabled rules for `**/*.vue`:**
- `noUnusedVariables`, `noUnusedFunctionParameters`, `noUnusedImports` — Biome cannot analyze `<template>` references. All `<script setup>` top-level bindings are auto-exposed to the template, but Biome sees them as unused. **Never add `_` prefixes to silence these warnings** as this breaks template bindings.
- `noVueDuplicateKeys` — Has false positives when prop names match template attribute values (Biome bug).
- `useIterableCallbackReturn` — Crashes Biome's Vue SFC source mapper with assertion errors.

**Template patterns that can crash Biome:**
- Multi-line mustache interpolations: `{{ value\n }}` — always keep mustache content on a single line.
- Complex inline arrow functions in template attributes may trigger parser bugs.

**Error handling pattern:**
- All `catch` blocks use `catch (err: unknown)` (never `catch (err: any)`).
- Use shared utilities from `@/shared/utils/error`: `getErrorMessage(err)`, `getApiErrorDetail(err, fallback)`, `getErrorStatus(err)`.
- These helpers safely extract messages/status from unknown error types without type assertions.

**Utility scripts (in `scripts/`, excluded from Biome):**
- `fix-vue-underscores.mjs` — Removes incorrect `_` prefixes from Vue `<script setup>` bindings.
- `fix-catch-any.mjs` — Converts `catch (err: any)` to `catch (err: unknown)` with helper imports.
- `fix-multiline-mustache.mjs` — Collapses multi-line mustache interpolations to single lines.

## Testing Guidelines

**Unit Tests** (Vitest):
- **Coverage**: 65 tests, 100% passing
- **Framework**: Vitest + @vue/test-utils + Happy-DOM
- **Structure**: Tests in `src/stores/__tests__/`, `src/composables/__tests__/`
- **Test Categories**:
  - Auth Store: 26 tests (login, logout, token management, refresh)
  - Error Interceptor: 21 tests (401 handling, retry logic, token refresh)
  - useAuth Composable: 18 tests (authentication flows, error handling)
- **Commands**:
  ```bash
  pnpm run test:run              # Run all unit tests (single run)
  pnpm run test:coverage         # Generate coverage report
  pnpm run test                  # Watch mode for development
  pnpm run test:ui               # Interactive UI mode
  ```

**E2E Tests** (Playwright):
- **Coverage**: 43 tests, 58% passing (25/43)
- **Framework**: Playwright 1.56+ with 5 browsers
- **Structure**: Tests in `e2e/auth.spec.ts`, `e2e/navigation.spec.ts`
- **Test Categories**:
  - Authentication: 11 passing (local/external login, logout, validation, errors)
  - Navigation: 16 passing (route guards, redirects, menu navigation, 404)
- **Prerequisites**:
  - Backend running at `http://127.0.0.1:8001`
  - Test user created: `testuser` / `testpassword`
  - External login tests skipped (requires intranet)
- **Commands**:
  ```bash
  npm run test:e2e                        # All browsers
  npm run test:e2e -- --project=chromium  # Single browser
  npm run test:e2e -- --ui                # Interactive mode
  npm run test:e2e -- --debug             # Debug mode
  npx playwright show-report              # View HTML report
  ```
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari

**Test Development Workflow**:
1. Write unit tests first for stores, composables, utilities
2. Add E2E tests for critical user flows
3. Run tests locally before committing: `npm run test:unit && npm run test:e2e -- --project=chromium`
4. Review test reports in `test-results/` and `playwright-report/`

## Environment & Configuration

**Environment files:**

- `.env` - Default config loaded in all environments
- `.env.development` - Dev-only overrides
- `.env.production` - Production overrides
- `.env.local` - Local overrides (gitignored, never commit)

**Accessing env vars:**

```typescript
// All env vars must be prefixed with VITE_
const apiUrl = import.meta.env.VITE_API_BASE_URL
const appTitle = import.meta.env.VITE_APP_TITLE

// Type-safe approach
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

**Vite proxy configuration** (`vite.config.ts`):

```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8001',
      changeOrigin: true,
      secure: false
    }
  }
}
```

## Environment & Configuration

**Environment files:**
- `.env` - Default config loaded in all environments (VITE_API_BASE_URL, VITE_APP_TITLE)
- `.env.development` - Dev-only overrides (port 8001)
- `.env.production` - Production overrides (relative /api path)
- `.env.local` - Local overrides (gitignored, never commit)

**Current Configuration**:
```env
# .env
VITE_API_BASE_URL=http://127.0.0.1:8001
VITE_APP_TITLE=AST Parser

# .env.development
VITE_API_BASE_URL=http://127.0.0.1:8001
VITE_APP_TITLE=AST Parser - Development

# .env.production
VITE_API_BASE_URL=/api
VITE_APP_TITLE=AST Parser
```

**Accessing env vars:**
```typescript
// All env vars must be prefixed with VITE_
const apiUrl = import.meta.env.VITE_API_BASE_URL
const appTitle = import.meta.env.VITE_APP_TITLE

// Type-safe approach
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

**Vite proxy configuration** (`vite.config.ts`):
```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8001',
      changeOrigin: true,
      secure: false
    }
  }
}
```

1. **Backend not running**: Frontend requires backend at port 8001. Check `http://127.0.0.1:8001/swagger` accessibility.
2. **Path alias errors**: Always use `@/` imports. If TypeScript complains, restart TS server: Cmd/Ctrl+Shift+P → "TypeScript: Restart TS Server".
3. **FormData for uploads**: File uploads and login endpoints require `FormData`, not JSON. Set `Content-Type: multipart/form-data`.
4. **Store not initialized**: Call `authStore.initialize()` in `main.ts` before mounting app to restore auth state from localStorage.
5. **Vuetify icons missing**: Use MDI icon names with `mdi-` prefix: `<v-icon>mdi-account</v-icon>`. Install `@mdi/font` if icons don't show.
6. **Reactive arrays**: Use `.value` with refs: `const items = ref([])` → access as `items.value.push(item)`.
7. **Route guards**: Public routes need explicit `meta: { requiresAuth: false }` or guard will redirect to login.
8. **CORS errors**: Backend must include frontend origin in CORS config. Update `backend_fastapi/src/app/main.py` if adding new ports.
9. **Token refresh loops**: Ensure `originalRequest._retry` flag is set to prevent infinite retry loops on 401.
10. **Computed properties**: Use `computed(() => ...)` not functions for reactive derivations that should cache results.
11. **Duplicate files**: Always check for duplicate components in different directories (e.g., NotFoundView.vue was in both `src/views/` and `src/shared/components/error/`).
12. **Path resolution**: Biome may report markdown or generated-file diagnostics; keep `biome.json` include/ignore rules aligned with project folders.

## Integration with Backend

**Backend API structure** (see backend README):

- Authentication: `POST /api/auth/login`, `POST /api/auth/external-login`
- File parsing: `POST /api/upload-preview`, `POST /api/parse`
- File comparison: `POST /api/compare`
- DUT metadata: `GET /api/dut/sites`, `GET /api/dut/sites/{id}/models`, `GET /api/dut/models/{id}/stations`
- DUT analysis: `POST /api/dut/stations/{id}/top-products`, `POST /api/analyze-multi-dut`

**Request patterns:**

- All requests except login/refresh require `Authorization: Bearer {token}` header (handled by interceptor).
- File uploads use `FormData` with `Content-Type: multipart/form-data`.
- JSON requests use `Content-Type: application/json`.
- Backend returns Pydantic models; match TypeScript interfaces in `types/api.ts`.

**Error handling:**

```typescript
try {
  const data = await dutApi.getSites()
  // Handle success
} catch (error) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.detail || 'Request failed'
    console.error('API Error:', message)
    // Show error to user via snackbar/alert
  }
}
```

## Session History & Key Decisions

- Replaced Options API with Composition API throughout; all components use `<script setup>` for better TypeScript inference.
- Implemented dual authentication system: local login for file features, external login for DUT API access.
- Added automatic token refresh on 401 responses to prevent user interruption during long sessions.
- Configured Vite proxy to avoid CORS issues in development; production uses reverse proxy or direct backend calls.
- Chose Pinia over Vuex for better TypeScript support and simpler API.
- Added path alias `@/` → `src/` in both TypeScript and Vite configs for consistent imports.
- Created placeholder views for all routes with clear structure for future implementation.
- Set up Playwright E2E testing across 5 browsers
- Created detailed testing documentation
- Fixed legacy file duplication (removed unused NotFoundView.vue from src/views/)
- Achieved 58% E2E pass rate with CRITICAL tests passing
- Implemented Access Control / Super Admin Dashboard: `AccessControlView.vue` at `/admin/access-control` with `requiresSuperAdmin` route guard. Auth store extended with `isDeveloper`, `isSuperAdmin` getters and `hasMenuPermission()` method. Admin API extended with access control endpoints.

## How to Resume Work

1. Pull latest changes and `npm install`.
2. Ensure backend is running: `cd ../backend_fastapi && make dev`.
3. Start frontend: `npm run dev` (opens `http://localhost:3000`).
4. Test login with backend credentials.
5. Run tests: `npm run test:unit` (should show 65/65 passing).
6. Run E2E tests: `npm run test:e2e -- --project=chromium` (25/43 passing expected).
7. When implementing features, reference `IMPLEMENTATION_GUIDE.md` for code examples.
8. Keep TypeScript errors at zero; run `npm run type-check` before committing.
9. Update `types/api.ts` when backend schemas change.
10. Run `npm run lint && npm run format` before commits.

## Feature Implementation Priority

1. **Top Products Page** (`views/dut/TopProductsView.vue`):
   - Site/Model/Station cascade selectors (depends on previous selection)
   - Date range picker with 7-day validation
   - Scoring visuals must match the backend: standard rows use `score = 10 * min(|MeasuredValue|, |TargetValue|) / max(|MeasuredValue|, |TargetValue|)` with a USL/LSL-span fallback when either side approaches zero, PER uses the USL-driven `(USL - actual) / USL` ratio, and `FIXTURE_OR_DUT_PROBLEM_POW` uses `((1 - |MeasuredPower - TargetPower|) / TargetPower) * 10`. Out-of-spec rows still render but always show `0` for the score column.
   - `/api/dut/test-items/latest/batch` now returns structured `value_test_items` and `nonvalue_test_items` (each entry exposes `name`, `usl`, `lsl`, `status`) sourced strictly from `/api/dut/records/latest/*` and `/api/dut/records/nonvalue/latest/*`. Stop relying on the deprecated `test_items` array.
   - Criteria score input + optional criteria file upload
   - Results data table with scoring visualization
   - EVM/PER score charts using ECharts

2. **File Parsing Page** (`views/parsing/ParsingView.vue`):
   - Drag-and-drop file input with validation
   - Upload progress bar
   - Parsed data preview table
   - Download results as XLSX

3. **File Comparison Page** (`views/compare/CompareView.vue`):
   - Two-file upload (file1 vs file2)
   - Comparison type selector
   - Side-by-side diff view with highlighting
   - Export comparison results

4. **DUT Analysis Page** (`views/dut/AnalysisView.vue`):
   - Multi-DUT selection
   - Analysis parameters form
   - Performance charts and visualizations
   - Export functionality

See `IMPLEMENTATION_GUIDE.md` for detailed code examples for each feature.
