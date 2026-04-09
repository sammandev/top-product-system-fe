/**
 * Environment Type Definitions
 * Type-safe environment variables
 */

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_URL?: string
  readonly VITE_APP_TITLE?: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_DUT_API_BASE_URL?: string
  readonly VITE_ENABLE_ANALYTICS?: string
  readonly VITE_GUEST_API_PASSWORD?: string
  readonly VITE_GUEST_API_USERNAME?: string
  readonly VITE_IPLAS_API_PORT?: string
  readonly VITE_IPLAS_API_PTB_BASE_URL?: string
  readonly VITE_IPLAS_API_PSZ_BASE_URL?: string
  readonly VITE_IPLAS_API_PXD_BASE_URL?: string
  readonly VITE_IPLAS_API_PVN_BASE_URL?: string
  readonly VITE_IPLAS_API_PTY_BASE_URL?: string
  readonly VITE_IPLAS_API_TIMEOUT?: string
  readonly VITE_IPLAS_API_TOKEN_PTB?: string
  readonly VITE_IPLAS_API_TOKEN_PSZ?: string
  readonly VITE_IPLAS_API_TOKEN_PXD?: string
  readonly VITE_IPLAS_API_TOKEN_PVN?: string
  readonly VITE_IPLAS_API_TOKEN_PTY?: string
  readonly VITE_IPLAS_V1_API_BASE_URL?: string
  readonly VITE_IPLAS_V2_API_BASE_URL?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
