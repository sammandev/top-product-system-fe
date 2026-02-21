<template>
  <v-dialog :model-value="modelValue" max-width="800" persistent
    @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="d-flex align-center bg-primary">
        <v-icon class="mr-2">mdi-cog</v-icon>
        iPLAS API Settings
      </v-card-title>
      <v-card-text class="pt-4">
        <!-- Server Selection Tabs -->
        <v-tabs v-model="localSelectedServerId" color="primary" class="mb-4">
          <v-tab v-for="server in servers" :key="server.id" :value="server.id">
            <v-icon start size="small">mdi-server</v-icon>
            {{ server.name }}
          </v-tab>
        </v-tabs>

        <v-window v-model="localSelectedServerId">
          <v-window-item v-for="server in servers" :key="server.id" :value="server.id">
            <!-- Server Configuration -->
            <div class="text-subtitle-2 mb-3">
              <v-icon size="small" class="mr-1">mdi-tune</v-icon>
              {{ server.name }} Server Configuration
            </div>

            <v-row>
              <v-col cols="12">
                <v-text-field :model-value="getServerConfig(server.id).baseIp"
                  @update:model-value="setServerBaseIp(server.id, $event)" label="Server IP Address" variant="outlined"
                  density="comfortable" prepend-inner-icon="mdi-ip-network" hint="e.g., 10.176.33.89" persistent-hint />
              </v-col>
            </v-row>

            <v-row class="mt-3">
              <v-col cols="12">
                <v-textarea :model-value="getServerConfig(server.id).token"
                  @update:model-value="setServerToken(server.id, $event)" label="Access Token" variant="outlined"
                  density="comfortable" prepend-inner-icon="mdi-key" rows="3" auto-grow persistent-hint>
                  <template #message>
                    <span class="text-warning">
                      <v-icon size="x-small" class="mr-1">mdi-information</v-icon>
                      This is the default token. Please generate and use your own iPLAS token to
                      access the iPLAS server.
                    </span>
                  </template>
                </v-textarea>
              </v-col>
            </v-row>

            <!-- Server Info -->
            <v-alert type="info" variant="tonal" class="mt-4" density="compact">
              <div class="text-caption">
                <strong>Server:</strong> {{ server.name }} ({{ getServerConfig(server.id).baseIp }})
              </div>
            </v-alert>
          </v-window-item>
        </v-window>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-btn color="warning" variant="outlined" @click="handleReset">
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
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useIplasSettings } from '@/features/dut-logs/composables/useIplasSettings'

// Props & Emits
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// Settings
const { servers, selectedServerId, updateServer, resetToDefaults } = useIplasSettings()

// Local state
const localSelectedServerId = ref(selectedServerId.value)

// Editable configs for each server
const editableConfigs = reactive<Record<string, { baseIp: string; token: string }>>({})

// Initialize editable configs for all servers
function initEditableConfigs(): void {
  for (const server of servers.value) {
    editableConfigs[server.id] = {
      baseIp: server.baseIp,
      token: server.token,
    }
  }
}

// Safe getter for server config
function getServerConfig(serverId: string): { baseIp: string; token: string } {
  return editableConfigs[serverId] || { baseIp: '', token: '' }
}

// Setter for server base IP
function setServerBaseIp(serverId: string, value: string): void {
  if (!editableConfigs[serverId]) {
    editableConfigs[serverId] = { baseIp: '', token: '' }
  }
  editableConfigs[serverId].baseIp = value
}

// Setter for server token
function setServerToken(serverId: string, value: string): void {
  if (!editableConfigs[serverId]) {
    editableConfigs[serverId] = { baseIp: '', token: '' }
  }
  editableConfigs[serverId].token = value
}

// Watch for dialog open to reset editable fields
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      localSelectedServerId.value = selectedServerId.value
      initEditableConfigs()
    }
  },
  { immediate: true },
)

// Also initialize when servers change
watch(
  servers,
  () => {
    if (props.modelValue) {
      initEditableConfigs()
    }
  },
  { deep: true },
)

function handleSave(): void {
  // Update the selected server ID
  selectedServerId.value = localSelectedServerId.value

  // Save all server settings
  for (const server of servers.value) {
    const config = editableConfigs[server.id]
    if (config) {
      updateServer(server.id, {
        baseIp: config.baseIp,
        token: config.token,
      })
    }
  }

  emit('update:modelValue', false)
  // Reload the page to apply new settings
  window.location.reload()
}

function handleCancel(): void {
  // Reset editable fields to current values
  localSelectedServerId.value = selectedServerId.value
  initEditableConfigs()
  emit('update:modelValue', false)
}

function handleReset(): void {
  resetToDefaults()
  localSelectedServerId.value = 'PTB'
  initEditableConfigs()
}
</script>
