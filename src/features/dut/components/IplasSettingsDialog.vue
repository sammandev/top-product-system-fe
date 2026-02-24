<template>
  <v-dialog :model-value="modelValue" max-width="700" persistent
    @update:model-value="$emit('update:modelValue', $event)">
    <v-card class="app-dialog">
      <!-- Sticky Header -->
      <div class="app-dialog-header">
        <v-card-title class="d-flex align-center pa-4">
          <v-icon class="mr-2">mdi-cog</v-icon>
          iPLAS API Settings
        </v-card-title>
      </div>

      <!-- Scrollable Body -->
      <v-card-text class="app-dialog-body pa-4">
        <!-- Settings Mode Toggle -->
        <div class="text-subtitle-2 mb-2">
          <v-icon size="small" class="mr-1">mdi-toggle-switch</v-icon>
          Settings Mode
        </div>
        <v-btn-toggle v-model="localSettingsMode" mandatory color="primary" variant="outlined" density="compact"
          class="mb-5" divided>
          <v-btn value="system" prepend-icon="mdi-shield-check" size="small">
            Use System Settings
          </v-btn>
          <v-btn value="custom" prepend-icon="mdi-pencil" size="small">
            Customize Settings
          </v-btn>
        </v-btn-toggle>

        <!-- System mode info -->
        <v-alert v-if="localSettingsMode === 'system'" type="info" variant="tonal" density="compact" class="mb-4">
          <div class="text-caption">
            Using admin-configured server settings. IP addresses and tokens are managed by the
            system administrator.
          </div>
        </v-alert>

        <!-- Site Selection -->
        <div class="text-subtitle-2 mb-2">
          <v-icon size="small" class="mr-1">mdi-server</v-icon>
          Select iPLAS Site
        </div>
        <v-chip-group v-model="localSelectedServerId" mandatory selected-class="text-primary" column class="mb-4">
          <v-chip v-for="server in servers" :key="server.id" :value="server.id" variant="outlined" filter>
            {{ server.name }}
          </v-chip>
        </v-chip-group>

        <!-- Server Configuration for selected site -->
        <template v-if="currentServer">
          <div class="text-subtitle-2 mb-3">
            <v-icon size="small" class="mr-1">mdi-tune</v-icon>
            {{ currentServer.name }} Configuration
          </div>

          <v-row dense>
            <v-col cols="12">
              <v-text-field :model-value="displayBaseIp" @update:model-value="localBaseIp = $event ?? ''"
                label="Server IP Address" variant="outlined" density="comfortable"
                prepend-inner-icon="mdi-ip-network" hint="e.g., 10.176.33.89" persistent-hint
                :readonly="localSettingsMode === 'system'" :bg-color="localSettingsMode === 'system' ? 'grey-lighten-4' : undefined" />
            </v-col>
          </v-row>

          <v-row dense class="mt-2">
            <v-col cols="12">
              <v-textarea :model-value="displayToken" @update:model-value="localToken = $event ?? ''"
                label="Access Token" variant="outlined" density="comfortable" prepend-inner-icon="mdi-key" rows="2"
                auto-grow :readonly="localSettingsMode === 'system'"
                :bg-color="localSettingsMode === 'system' ? 'grey-lighten-4' : undefined">
                <template v-if="localSettingsMode === 'custom'" #message>
                  <span class="text-warning">
                    <v-icon size="x-small" class="mr-1">mdi-information</v-icon>
                    Please generate and use your own iPLAS token to access the iPLAS server.
                  </span>
                </template>
              </v-textarea>
            </v-col>
          </v-row>

          <!-- System token status -->
          <v-alert v-if="localSettingsMode === 'system'" :type="currentSystemToken ? 'success' : 'warning'"
            variant="tonal" density="compact" class="mt-2">
            <div class="text-caption">
              <template v-if="currentSystemToken">
                <v-icon size="x-small" class="mr-1">mdi-check-circle</v-icon>
                System token configured
                <span v-if="currentSystemToken.label"> &mdash; {{ currentSystemToken.label }}</span>
                <span v-if="currentSystemToken.updated_by" class="ml-1 text-medium-emphasis">
                  (by {{ currentSystemToken.updated_by }})
                </span>
              </template>
              <template v-else>
                <v-icon size="x-small" class="mr-1">mdi-alert</v-icon>
                No active system token configured for {{ currentServer.name }}.
                Contact your administrator.
              </template>
            </div>
          </v-alert>
        </template>
      </v-card-text>

      <!-- Sticky Footer -->
      <div class="app-dialog-footer">
        <v-card-actions class="pa-4">
          <v-btn v-if="localSettingsMode === 'custom'" color="warning" variant="outlined" size="small"
            @click="handleReset">
            Reset to Defaults
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="handleCancel">
            Cancel
          </v-btn>
          <v-btn color="primary" variant="flat" @click="handleSave">
            Save Settings
          </v-btn>
        </v-card-actions>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useIplasSettings, type IplasSettingsMode } from '@/features/dut-logs/composables/useIplasSettings'

// Props & Emits
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// Settings
const {
  servers,
  selectedServerId,
  settingsMode,
  systemTokens,
  systemTokensLoaded,
  updateServer,
  resetToDefaults,
  loadSystemTokens,
} = useIplasSettings()

// Local state for the dialog
const localSelectedServerId = ref(selectedServerId.value)
const localSettingsMode = ref<IplasSettingsMode>(settingsMode.value)
const localBaseIp = ref('')
const localToken = ref('')

// Current server object based on local selection
const currentServer = computed(() => {
  return servers.value.find((s) => s.id === localSelectedServerId.value)
})

// Current system token for the selected site
const currentSystemToken = computed(() => {
  return systemTokens.value.find(
    (t) => t.site === localSelectedServerId.value && t.is_active,
  )
})

// Display values: system mode shows system values, custom mode shows editable values
const displayBaseIp = computed(() => {
  if (localSettingsMode.value === 'system') {
    if (currentSystemToken.value) {
      // Extract IP from base_url (strip protocol)
      return currentSystemToken.value.base_url.replace(/^https?:\/\//, '')
    }
    return currentServer.value?.baseIp ?? ''
  }
  return localBaseIp.value
})

const displayToken = computed(() => {
  if (localSettingsMode.value === 'system') {
    return currentSystemToken.value?.token_masked ?? 'Not configured'
  }
  return localToken.value
})

// Initialize local editable fields for the current server
function initLocalFields(): void {
  const server = servers.value.find((s) => s.id === localSelectedServerId.value)
  localBaseIp.value = server?.baseIp ?? ''
  localToken.value = server?.token ?? ''
}

// Watch for dialog open
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      localSelectedServerId.value = selectedServerId.value
      localSettingsMode.value = settingsMode.value
      initLocalFields()
      // Load system tokens if not yet loaded
      if (!systemTokensLoaded.value) {
        await loadSystemTokens()
      }
    }
  },
  { immediate: true },
)

// When user switches selected site, refresh local editable fields
watch(localSelectedServerId, () => {
  initLocalFields()
})

function handleSave(): void {
  // Save settings mode
  settingsMode.value = localSettingsMode.value
  // Save selected server
  selectedServerId.value = localSelectedServerId.value

  // In custom mode, save the edited server config
  if (localSettingsMode.value === 'custom') {
    updateServer(localSelectedServerId.value, {
      baseIp: localBaseIp.value,
      token: localToken.value,
    })
  }

  emit('update:modelValue', false)
}

function handleCancel(): void {
  localSelectedServerId.value = selectedServerId.value
  localSettingsMode.value = settingsMode.value
  initLocalFields()
  emit('update:modelValue', false)
}

function handleReset(): void {
  resetToDefaults()
  localSelectedServerId.value = 'PTB'
  localSettingsMode.value = 'system'
  initLocalFields()
}
</script>
