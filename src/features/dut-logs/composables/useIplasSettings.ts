/**
 * iPLAS Settings Composable
 *
 * Manages iPLAS API configuration including server selection and access tokens.
 * Supports two modes:
 * - "system": Uses admin-configured tokens from the database (read-only for users)
 * - "custom": Users provide their own IP addresses and tokens (localStorage-backed)
 */

import { computed, ref, watch } from 'vue'
import { appConfigApi } from '@/core/api/appConfigApi'
import type { IplasToken } from '@/core/types'

/** Settings mode: system (admin DB tokens) or custom (user-provided) */
export type IplasSettingsMode = 'system' | 'custom'

// iPLAS Server configuration
export interface IplasServerConfig {
  id: string
  name: string
  baseIp: string
  port: number
  token: string
}

// Get default server configurations from environment variables
function getDefaultServers(): IplasServerConfig[] {
  const port = Number(import.meta.env.VITE_IPLAS_API_PORT) || 32678

  return [
    {
      id: 'PTB',
      name: 'PTB',
      baseIp: (import.meta.env.VITE_IPLAS_API_PTB_BASE_URL || 'http://10.176.33.89').replace(
        /^https?:\/\//,
        '',
      ),
      port,
      token: import.meta.env.VITE_IPLAS_API_TOKEN_PTB || '',
    },
    {
      id: 'PSZ',
      name: 'PSZ',
      baseIp: (import.meta.env.VITE_IPLAS_API_PSZ_BASE_URL || 'http://172.24.255.25').replace(
        /^https?:\/\//,
        '',
      ),
      port,
      token: import.meta.env.VITE_IPLAS_API_TOKEN_PSZ || '',
    },
    {
      id: 'PXD',
      name: 'PXD',
      baseIp: (import.meta.env.VITE_IPLAS_API_PXD_BASE_URL || 'http://172.18.212.129').replace(
        /^https?:\/\//,
        '',
      ),
      port,
      token: import.meta.env.VITE_IPLAS_API_TOKEN_PXD || '',
    },
    {
      id: 'PVN',
      name: 'PVN',
      baseIp: (import.meta.env.VITE_IPLAS_API_PVN_BASE_URL || 'http://10.177.240.150').replace(
        /^https?:\/\//,
        '',
      ),
      port,
      token: import.meta.env.VITE_IPLAS_API_TOKEN_PVN || '',
    },
    {
      id: 'PTY',
      name: 'PTY',
      baseIp: (import.meta.env.VITE_IPLAS_API_PTY_BASE_URL || 'http://172.18.212.129').replace(
        /^https?:\/\//,
        '',
      ),
      port,
      token: import.meta.env.VITE_IPLAS_API_TOKEN_PTY || '',
    },
  ]
}

// Storage key for persisting settings
const STORAGE_KEY = 'iplas_settings'

// Module-level state (singleton pattern)
const servers = ref<IplasServerConfig[]>([])
const selectedServerId = ref<string>('PTB')
const settingsMode = ref<IplasSettingsMode>('system')
const systemTokens = ref<IplasToken[]>([])
const systemTokensLoading = ref(false)
const systemTokensLoaded = ref(false)
const isInitialized = ref(false)

/**
 * Load settings from localStorage
 * Merges stored settings with env defaults, prioritizing env tokens if stored token is empty
 */
function loadSettings(): void {
  const defaultServers = getDefaultServers()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      const storedServers = (parsed.servers as IplasServerConfig[]) || []

      // Restore settings mode (default to 'system' if not present)
      settingsMode.value = parsed.settingsMode === 'custom' ? 'custom' : 'system'

      // Merge stored settings with defaults, using env token if stored token is empty
      servers.value = defaultServers.map((defaultServer) => {
        const storedServer = storedServers.find((s) => s.id === defaultServer.id)
        if (storedServer) {
          return {
            ...defaultServer,
            baseIp: storedServer.baseIp || defaultServer.baseIp,
            port: storedServer.port || defaultServer.port,
            // Use stored token only if it's not empty, otherwise use env token
            token: storedServer.token || defaultServer.token,
          }
        }
        return defaultServer
      })
      selectedServerId.value = parsed.selectedServerId || 'PTB'
    } else {
      // Initialize with defaults from environment
      servers.value = [...defaultServers]
      selectedServerId.value = 'PTB'
      settingsMode.value = 'system'
    }
  } catch (error) {
    console.error('Failed to load iPLAS settings:', error)
    servers.value = [...defaultServers]
    selectedServerId.value = 'PTB'
    settingsMode.value = 'system'
  }
  isInitialized.value = true
}

/**
 * Save settings to localStorage
 */
function saveSettings(): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        servers: servers.value,
        selectedServerId: selectedServerId.value,
        settingsMode: settingsMode.value,
      }),
    )
  } catch (error) {
    console.error('Failed to save iPLAS settings:', error)
  }
}

// Watch for changes and auto-save
watch(
  [servers, selectedServerId, settingsMode],
  () => {
    if (isInitialized.value) {
      saveSettings()
    }
  },
  { deep: true },
)

/**
 * Composable for iPLAS settings
 */
export function useIplasSettings() {
  // Initialize on first use
  if (!isInitialized.value) {
    loadSettings()
  }

  // Computed: whether using system settings
  const isSystemMode = computed(() => settingsMode.value === 'system')

  // Computed
  const selectedServer = computed(() => {
    return servers.value.find((s) => s.id === selectedServerId.value) || servers.value[0]
  })

  // UPDATED: Get system token info for the selected server (if available)
  const selectedSystemToken = computed<IplasToken | undefined>(() => {
    return systemTokens.value.find(
      (t) => t.site === selectedServerId.value && t.is_active,
    )
  })

  const v1ApiBaseUrl = computed(() => {
    const server = selectedServer.value
    if (!server) {
      // biome-ignore lint/style/noNonNullAssertion: getDefaultServers() always returns a non-empty array
      const defaults = getDefaultServers()[0]!
      return `http://${defaults.baseIp}:${defaults.port}/api/v1`
    }
    return `http://${server.baseIp}:${server.port}/api/v1`
  })

  const v2ApiBaseUrl = computed(() => {
    const server = selectedServer.value
    if (!server) {
      // biome-ignore lint/style/noNonNullAssertion: getDefaultServers() always returns a non-empty array
      const defaults = getDefaultServers()[0]!
      return `http://${defaults.baseIp}:${defaults.port}/api/v2`
    }
    return `http://${server.baseIp}:${server.port}/api/v2`
  })

  // UPDATED: In system mode, return empty token so backend uses its DB-configured token
  const apiToken = computed(() => {
    if (isSystemMode.value) {
      return ''
    }
    return selectedServer.value?.token || ''
  })

  /**
   * Load system tokens from admin-configured database via API
   */
  async function loadSystemTokens(): Promise<void> {
    if (systemTokensLoading.value) return
    systemTokensLoading.value = true
    try {
      const response = await appConfigApi.getIplasTokens()
      systemTokens.value = response.tokens
      systemTokensLoaded.value = true
    } catch (error) {
      console.error('Failed to load system iPLAS tokens:', error)
      systemTokens.value = []
    } finally {
      systemTokensLoading.value = false
    }
  }

  /**
   * Update a server configuration
   */
  function updateServer(
    serverId: string,
    updates: { baseIp?: string; port?: number; token?: string },
  ): void {
    const index = servers.value.findIndex((s) => s.id === serverId)
    if (index !== -1) {
      // biome-ignore lint/style/noNonNullAssertion: Guarded by index !== -1 check
      const current = servers.value[index]!
      servers.value[index] = {
        id: current.id,
        name: current.name,
        baseIp: updates.baseIp ?? current.baseIp,
        port: updates.port ?? current.port,
        token: updates.token ?? current.token,
      }
    }
  }

  /**
   * Select a server
   */
  function selectServer(serverId: string): void {
    if (servers.value.some((s) => s.id === serverId)) {
      selectedServerId.value = serverId
    }
  }

  /**
   * Reset all settings to defaults
   */
  function resetToDefaults(): void {
    servers.value = getDefaultServers()
    selectedServerId.value = 'PTB'
    settingsMode.value = 'system'
  }

  /**
   * Get all servers
   */
  function getServers(): IplasServerConfig[] {
    return servers.value
  }

  return {
    // State
    servers,
    selectedServerId,
    settingsMode,
    systemTokens,
    systemTokensLoading,
    systemTokensLoaded,

    // Computed
    selectedServer,
    selectedSystemToken,
    isSystemMode,
    v1ApiBaseUrl,
    v2ApiBaseUrl,
    apiToken,

    // Methods
    updateServer,
    selectServer,
    resetToDefaults,
    getServers,
    loadSystemTokens,
  }
}
