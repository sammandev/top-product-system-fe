# AST Tools Frontend

Modern Vue 3 single-page application (SPA) for wireless test data analysis, file parsing, and DUT (Device Under Test) management. Built with TypeScript, Vite, PrimeVue, and Tailwind CSS v4.

[![Vue.js](https://img.shields.io/badge/Vue.js-3.5+-4FC08D.svg?logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![PrimeVue](https://img.shields.io/badge/PrimeVue-4.5+-10B981.svg)](https://primevue.org/)

---

## 📑 Table of Contents

- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Setup & Installation](#-setup--installation)
- [Development](#-development)
- [Testing](#-testing)
- [Configuration](#-configuration)
- [Authentication](#-authentication)
- [API Usage](#-api-usage)
- [Routes](#-routes)
- [UI Components](#-ui-components)
- [Code Style & Formatting](#-code-style--formatting)
- [Troubleshooting](#-troubleshooting)
- [Development Guidelines](#-development-guidelines)
- [Contributing](#-contributing)

---

## 🚀 Tech Stack

### Core Framework
- **Vue 3.5.30** — Progressive JavaScript framework with Composition API (`<script setup>`)
- **TypeScript 5.9.3** — Type-safe JavaScript with strict mode enabled
- **Vite 7.3.1** — Next-generation frontend build tool with HMR

### UI & Styling
- **PrimeVue 4.5.5** — Component foundation with four built-in presets (Aura, Material, Lara, Nora)
- **@primeuix/themes 2.0.3** — Runtime theme presets, `usePreset()`, palette integration
- **@iconify/vue 5.0.0** — Icon system used across navigation and result states
- **Tailwind CSS 4.2.3** + **tailwindcss-primeui 0.6.1** — Utility-first styling with PrimeVue token bridge
- **Sass 1.98.0** — CSS preprocessor for custom styling where needed

### State & Routing
- **Vue Router 4.6.4** — Official routing solution with navigation guards
- **Pinia 3.0.4** — Official state management with TypeScript support

### HTTP & Data
- **Axios 1.13.6** — HTTP client with request/response interceptors and automatic token refresh
- **@tanstack/vue-query 5.99.2** — Server state management
- **Day.js 1.11.20** — Lightweight date manipulation
- **Zod 4.3.6** — Schema validation and type inference
- **vee-validate 4.15.1** — Form validation composables

### Visualization & Utilities
- **ECharts 6.0.0** + **vue-echarts 8.0.1** — Professional data visualization
- **VueUse 14.2.1** — Essential Vue composition utilities (`@vueuse/core`, `@vueuse/motion 3.0.3`)
- **KaTeX 0.16.40** — Fast LaTeX math rendering
- **lodash-es 4.17.23** — Tree-shakeable utility functions
- **idb 8.0.3** — IndexedDB wrapper for client-side storage

### Document & Excel Processing
- **ExcelJS 4.4.0** — Excel file creation and manipulation
- **jsPDF 4.2.1** + **jspdf-autotable 5.0.7** — PDF generation with tables
- **JSZip 3.10.1** — ZIP file handling

### Monitoring
- **@sentry/vue 10.45.0** — Error monitoring and performance tracing

### Testing
- **Vitest 4.1.0** — Unit testing framework (Vite-native)
  - **@vitest/ui 4.1.0** — Interactive test UI
  - **@vitest/coverage-v8 4.1.0** — Coverage reporting with V8
- **Playwright 1.58.2** — End-to-end testing across browsers
- **@vue/test-utils 2.4.6** — Official Vue component testing utilities
- **Happy-DOM 20.8.4** — Lightweight DOM implementation for unit tests
- **MSW 2.12.14** — Mock Service Worker for API mocking in tests

### Code Quality
- **Biome 2.4.8** — Fast, unified linter and formatter (replaces ESLint + Prettier)

### Build & Package Management
- **pnpm 10.32.1** — Fast, disk space efficient package manager (required)

---

## ✨ Features

### Authentication & Authorization
- **Dual Login System**: Local database authentication and external DUT API authentication
- **JWT Token Management**: Automatic token refresh on 401 responses
- **Token Versioning**: Instant token revocation capability
- **Secure Storage**: Tokens stored in localStorage with automatic cleanup
- **Guest Access**: Limited read-only mode for unauthenticated users

### File Processing
- **CSV/Excel Parsing**: Upload and parse wireless test data files
- **Format Comparison**: Compare MasterControl vs DVT format files
- **Data Visualization**: Interactive charts and tables for test results
- **Export Functionality**: Download processed data as XLSX

### DUT Management Integration
- **Site/Model/Station Navigation**: Hierarchical DUT data browsing
- **Top Products Analysis**: Score-based product ranking with date ranges
  - **Standard Analysis**: Fast analysis without PA trend data
  - **PA Trends Analysis**: Includes Power Amplifier trend measurements with adjusted power calculations
  - **Hierarchical Analysis**: 4-level breakdown (Group → Subgroup → Antenna → Category)
- **Multi-DUT Comparison**: Analyze multiple devices simultaneously
- **Real-time Data**: Direct integration with intranet DUT API
- **Flexible Identifiers**: Every `site_*`, `model_*`, `station_*` parameter accepts numeric ID or descriptive string

### User Experience
- **Responsive Design**: Mobile, tablet, and desktop layouts
- **Adaptive Theming**: 4 PrimeVue presets × 4 primary colors × 3 surface palettes × 3 modes (light/dark/system)
- **Custom `--app-*` Token System**: Runtime CSS variable theming independent of Tailwind's dark: variants

---

## 📁 Project Structure

```
src/
├── app/                        # App bootstrap, providers, and styles
│   ├── providers/
│   │   ├── primevue.ts         # PrimeVue plugin config (preset, cssLayer, darkModeSelector)
│   │   ├── query-client.ts     # TanStack Query QueryClient setup
│   │   └── index.ts            # Aggregated provider installer
│   └── styles/
│       ├── index.css           # Main stylesheet: @theme inline, tokens, Tailwind layers
│       └── tokens.css          # --app-* CSS custom property definitions
├── assets/
│   └── main.css                # Global utility classes and scrollbar styles
├── core/                       # Cross-cutting application concerns
│   ├── api/                    # Axios instance and interceptors
│   ├── config/                 # App-wide configuration constants
│   ├── plugins/                # Core plugin exports
│   ├── router/                 # Route definitions and navigation guards
│   ├── stores/                 # Cross-feature Pinia stores
│   └── types/                  # Core TypeScript types
├── features/                   # Feature modules (primary code location)
│   ├── auth/                   # Authentication
│   │   ├── views/              # LoginView.vue
│   │   ├── stores/             # Auth Pinia store
│   │   └── composables/        # useAuth, login helpers
│   ├── comparison/             # File comparison feature
│   ├── dashboard/              # Dashboard feature
│   ├── dut/                    # DUT management (Top Products, Analysis)
│   │   ├── api/                # dutTopProduct.api.ts, dutStation.api.ts
│   │   ├── components/         # TopProductsByISNTab, TopProductISNResults, etc.
│   │   ├── stores/             # DUT Pinia store
│   │   ├── types/              # dutTopProduct.types.ts (ScoreBreakdown, etc.)
│   │   └── views/              # TopProductsView.vue
│   └── parsing/                # File parsing feature
├── layouts/
│   └── DefaultLayout.vue       # Main app shell (sidebar + topbar + content)
├── shared/                     # Cross-feature shared resources
│   ├── components/             # Shared presentational components
│   ├── composables/            # useThemeState, useDrawerState, useAuth, etc.
│   ├── constants/              # Shared constants
│   ├── ui/                     # Shared UI primitives
│   │   ├── data-grid/          # AppDataGrid
│   │   ├── charts/             # Chart wrappers
│   │   ├── dialog/             # AppDialog
│   │   ├── forms/              # AppSelect and form primitives
│   │   ├── panel/              # AppPanel
│   │   ├── progress/           # AppProgress
│   │   ├── tabs/               # AppTabs
│   │   └── toast/              # Toast wrappers
│   └── utils/                  # Utility functions
├── test/
│   ├── setup.ts                # Vitest global setup
│   └── utils.ts                # Shared mount helpers (includes QueryClient wrapper)
├── types/
│   └── api.ts                  # API response/request type definitions
├── App.vue                     # Root component
└── main.ts                     # Application entry point
```

### Architecture Notes

- **Feature-First**: New code belongs in `features/`. Each feature owns its views, stores, composables, and types.
- **Shared UI Primitives**: `AppPanel`, `AppDialog`, `AppDataGrid`, `AppTabs`, `AppProgress`, `AppSelect` in `shared/ui/` cover repeated app surfaces.
- **Styling Approach**: Tailwind v4 utilities for structure/layout; `var(--app-*)` CSS tokens for all colors. The `@theme inline` block in `index.css` bridges the two systems.
- **TanStack Query**: `QueryClient` is registered and available. Data fetching currently uses Pinia stores + Axios directly; migration to `useQuery`/`useMutation` is a planned improvement.

---

## 🔧 Prerequisites

- **Node.js 22+** (LTS recommended)
- **pnpm 10+** (required)
- **Backend API** running at `http://127.0.0.1:8001`
- **Git** for version control

### Recommended Tools

- **VS Code** with extensions:
  - Vue - Official (Volar)
  - TypeScript Vue Plugin (Volar)
  - Biome (`biomejs.biome`)
  - EditorConfig

---

## 🛠️ Setup & Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd top-product-system-fe
```

### 2. Install Dependencies

```bash
corepack enable
pnpm install
```

### 3. Configure Environment

Create `.env.local` for local development:

```env
VITE_API_BASE_URL=http://127.0.0.1:8001
VITE_APP_TITLE=AST Tools
```

### 4. Start Backend API

```bash
cd ../top-product-system-be
make dev   # starts backend at http://127.0.0.1:8001
```

### 5. Start Development Server

```bash
pnpm dev
```

Application available at `http://localhost:3000`.

---

## 🚀 Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with HMR |
| `pnpm build` | Type-check + build for production |
| `pnpm preview` | Preview production build locally |
| `pnpm lint` | Run Biome lint checks |
| `pnpm lint:fix` | Apply Biome auto-fixes |
| `pnpm format` | Check formatting with Biome |
| `pnpm format:fix` | Apply Biome format fixes |
| `pnpm type-check` | TypeScript validation (`vue-tsc --noEmit`) |
| `pnpm test` | Run unit tests in watch mode |
| `pnpm test:run` | Run unit tests once |
| `pnpm test:ui` | Interactive test UI |
| `pnpm test:coverage` | Unit tests with V8 coverage |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm test:e2e:ui` | E2E tests with interactive UI |

### Development Workflow

```bash
# Terminal 1: Backend
cd top-product-system-be && make dev

# Terminal 2: Frontend
cd top-product-system-fe && pnpm dev
```

### Build for Production

```bash
pnpm type-check && pnpm build
# Output: dist/
pnpm preview
```

---

## 🧪 Testing

### Unit Tests

**Framework**: Vitest 4.1.0 + @vue/test-utils 2.4.6 + Happy-DOM

```bash
pnpm test:run                                              # all tests
pnpm test:run src/features/auth/stores/__tests__/         # specific file
pnpm test:coverage                                        # with V8 coverage
pnpm test:ui                                              # interactive UI
```

**Coverage**:

| Suite | Tests | Status |
|-------|-------|--------|
| Auth Store | 26 | ✅ |
| Error Interceptor | 21 | ✅ |
| useAuth Composable | 18 | ✅ |
| **Total** | **65** | ✅ |

### E2E Tests

**Framework**: Playwright 1.58.2 (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari)

**Prerequisites**: backend running + test user exists.

```bash
# Create test user
cd top-product-system-be
uv run python scripts/create_user.py --username testuser --password testpassword
```

```bash
pnpm test:e2e                                 # all browsers
pnpm test:e2e -- --project=chromium           # single browser
pnpm test:e2e -- -g "login"                   # by test title
pnpm test:e2e:ui                              # interactive
npx playwright show-report                    # HTML report
```

**Test structure**:
```
e2e/
├── auth.spec.ts         # 24 authentication flow tests
├── navigation.spec.ts   # 30+ navigation and guard tests
└── helpers.ts           # shared utilities
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8001` | Backend API base URL |
| `VITE_APP_TITLE` | `AST Tools` | Application name shown in UI |

Files: `.env`, `.env.development`, `.env.production`, `.env.local` (gitignored).

### API Proxy

`vite.config.ts` proxies `/api/*` to `VITE_API_BASE_URL` to avoid CORS in development.

---

## 🔐 Authentication

JWT-based dual-auth system with automatic token refresh:

```typescript
import { useAuthStore } from '@/features/auth/stores'

const authStore = useAuthStore()

await authStore.login({ username, password })   // local login
if (authStore.isAuthenticated) { /* ... */ }
authStore.logout()
```

Token refresh is handled automatically in the Axios response interceptor (`src/core/api/`). On 401, the interceptor refreshes the token and retries the original request.

---

## 📡 API Usage

```typescript
import { dutTopProductApi } from '@/features/dut/api/dutTopProduct.api'

// Standard analysis
const results = await dutTopProductApi.analyze({ dut_isns, stations })

// PA Trends analysis (parallel ISN processing, 300s cache)
const paTrends = await dutTopProductApi.analyzeWithPATrends({
  dut_isns: ['DM2520270073965'],
  stations: ['Wireless_Test_6G'],
  site_identifier: 'PTB',
  model_identifier: 'HH5K',
})

// Hierarchical analysis
const hierarchical = await dutTopProductApi.analyzeHierarchical({ dut_isns, stations })
```

**Store-based pattern** (preferred in components):

```typescript
const dutStore = useDUTStore()
await dutStore.fetchSites()
console.log(dutStore.sites)
```

---

## 🧭 Routes

| Path | View | Access |
|------|------|--------|
| `/login` | LoginView | Public |
| `/dashboard` | DashboardView | Authenticated |
| `/parsing` | ParseView | User+ |
| `/parsing/download-format` | DownloadFormatView | User+ |
| `/compare` | CompareView | User+ |
| `/compare/dvt-mc2` | DVTCompareView | User+ |
| `/dut/top-products/analysis` | TopProductsView | Guest+ |
| `/dut/top-products/data` | TopProductDatabaseView | User+ |
| `/dut/data-explorer` | DataExplorerView | Guest+ |
| `/admin/*` | Admin views | Admin+ |

Route guards enforce authentication and role checks via `meta.requiresAuth`.

---

## 🎨 UI Components

Shared primitives in `src/shared/ui/`:

| Component | Purpose |
|-----------|---------|
| `AppPanel` | Titled section card with optional tone (warm/cool/success) |
| `AppDialog` | Modal wrapper around PrimeVue Dialog |
| `AppDataGrid` | Table with sorting, pagination, and column config |
| `AppTabs` | Tab interface with lazy slot loading |
| `AppProgress` | Themed progress bar with label |
| `AppSelect` | Custom dropdown with Teleport-based overlay |

Usage:

```vue
<AppPanel title="Results" eyebrow="Analysis" tone="cool">
  <AppDataGrid :columns="columns" :rows="rows" />
</AppPanel>
```

### Theming

The app uses a `--app-*` CSS token system layered over PrimeVue's `--p-*` preset tokens:

- **Mode**: Light / Dark / System — toggled via `.app-dark` class on `<html>`
- **Preset**: Aura / Material / Lara / Nora — switched at runtime via `usePreset()`
- **Primary color** and **surface palette** — updated via `updatePrimaryPalette()` / `updateSurfacePalette()`
- **Tailwind dark: variant** — aligned to `.app-dark` via `@variant dark` in `index.css`

---

## 📝 Code Style & Formatting

**Linter + Formatter: [Biome](https://biomejs.dev/)** (single tool, replaces ESLint + Prettier)

```bash
pnpm lint          # check lint issues
pnpm lint:fix      # auto-fix lint
pnpm format        # check formatting
pnpm format:fix    # auto-format
```

### TypeScript Guidelines

- Strict mode enabled — no implicit `any`
- Use `interface` for object shapes, `type` for unions/intersections
- `const` over `let`, never `var`
- Optional chaining and nullish coalescing preferred

### Vue Component Style

Always use Composition API with `<script setup lang="ts">`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props { title: string }
const props = defineProps<Props>()
const count = ref(0)
const label = computed(() => `${props.title}: ${count.value}`)
</script>
```

### Path Aliases

Always use `@/` for absolute imports:

```typescript
// ✅
import { useAuthStore } from '@/features/auth/stores'

// ❌
import { useAuthStore } from '../../../features/auth/stores'
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `AppPanel.vue`, `TopProductsView.vue` |
| Composables | `use` prefix | `useAuth`, `useThemeState` |
| Stores | camelCase | `authStore`, `dutStore` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL`, `MAX_FILE_SIZE` |
| Types/Interfaces | PascalCase | `User`, `ScoreBreakdown` |

---

## 🎯 Development Guidelines

### Feature Structure

New features go in `src/features/<feature-name>/`:

```
src/features/my-feature/
├── views/          # Route-level page components
├── components/     # Feature-specific components
├── stores/         # Pinia store
├── composables/    # Composable logic
├── api/            # API call functions
└── types/          # TypeScript types
```

### Adding a Route

```typescript
// src/core/router/index.ts
{
  path: '/my-feature',
  component: () => import('@/features/my-feature/views/MyFeatureView.vue'),
  meta: { requiresAuth: true }
}
```

### Data Fetching Patterns

**Current pattern** (Pinia store + Axios):
```typescript
const dutStore = useDUTStore()
await dutStore.fetchSites()
```

**Planned pattern** (TanStack Query — `@tanstack/vue-query` is installed):
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['sites'],
  queryFn: () => dutApi.getSites(),
})
```

Migrate toward `useQuery`/`useMutation` when touching data-fetching composables.

### Scaffold UI Best Practices

Use shared primitives for standard surfaces:

```vue
<AppPanel title="Results">
  <AppDataGrid :columns="cols" :rows="rows" />
</AppPanel>
```

Use native elements for local interactions — don't wrap a `<button>` in a PrimeVue component if a plain button works.

---

## 🐛 Troubleshooting

### Port in use

```typescript
// vite.config.ts
server: { port: 3001 }
```

### Backend not reachable

1. Verify backend is running at `http://127.0.0.1:8001`
2. Check `.env.local` has correct `VITE_API_BASE_URL`
3. Inspect proxy config in `vite.config.ts`

### Module resolution errors

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### TypeScript errors

```bash
pnpm type-check
# In VS Code: Command Palette → "TypeScript: Restart TS Server"
```

### Vite cache stale

```bash
rm -rf node_modules/.vite
pnpm dev
```

### Test failures

```bash
pnpm exec vitest --clearCache    # clear Vitest cache
npx playwright install           # reinstall Playwright browsers
```

### Windows-specific

- Use PowerShell or Git Bash
- Ensure line endings are LF: `git config core.autocrlf input`
- Path alias issues: verify `tsconfig.app.json` has `"@/*": ["./src/*"]`

---

## 🤝 Contributing

### Before Submitting a PR

- `pnpm type-check` — no TypeScript errors
- `pnpm lint` — no Biome errors
- `pnpm test:run` — all unit tests passing
- `pnpm test:e2e -- --project=chromium` — critical E2E tests passing
- Update README if adding or changing features

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(dut): add station filter to top products view
fix(auth): handle expired refresh token edge case
docs(readme): update tech stack versions
test(auth): add token refresh retry coverage
refactor(panel): migrate AppPanel to Tailwind utilities
```

---

## 📚 Official Documentation

- [Vue 3](https://vuejs.org/)
- [PrimeVue](https://primevue.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Pinia](https://pinia.vuejs.org/)
- [Vue Router](https://router.vuejs.org/)
- [TanStack Query (Vue)](https://tanstack.com/query/latest/docs/framework/vue/overview)
- [VueUse](https://vueuse.org/)
- [Biome](https://biomejs.dev/)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)

---

**Built with Vue 3 + TypeScript + Vite + PrimeVue + Tailwind CSS v4**
