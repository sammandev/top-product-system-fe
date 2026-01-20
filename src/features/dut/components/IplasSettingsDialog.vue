<template>
    <v-dialog :model-value="modelValue" max-width="700" persistent
        @update:model-value="$emit('update:modelValue', $event)">
        <v-card>
            <v-card-title class="d-flex align-center bg-primary">
                <v-icon class="mr-2">mdi-cog</v-icon>
                iPLAS API Settings
            </v-card-title>
            <v-card-text class="pt-4">
                <!-- Server Selection -->
                <v-select v-model="localSelectedServerId" :items="serverOptions" item-title="text" item-value="value"
                    label="iPLAS Server" variant="outlined" density="comfortable" prepend-inner-icon="mdi-server"
                    class="mb-4" hint="Select the iPLAS server to connect to" persistent-hint />

                <v-divider class="mb-4" />

                <!-- Server Configuration -->
                <div class="text-subtitle-2 mb-2">Server Configuration</div>
                <v-row>
                    <v-col cols="12">
                        <v-text-field v-model="editableBaseIp" label="Server IP Address" variant="outlined"
                            density="comfortable" prepend-inner-icon="mdi-ip-network" hint="e.g., 10.176.33.89"
                            persistent-hint />
                    </v-col>
                </v-row>

                <v-row class="mt-2">
                    <v-col cols="12">
                        <v-text-field v-model="editableToken" label="Access Token" variant="outlined"
                            density="comfortable" prepend-inner-icon="mdi-key"
                            :append-inner-icon="showToken ? 'mdi-eye-off' : 'mdi-eye'"
                            :type="showToken ? 'text' : 'password'"
                            persistent-hint @click:append-inner="showToken = !showToken">
                            <template #message>
                                <span class="text-warning">
                                    <v-icon size="x-small" class="mr-1">mdi-information</v-icon>
                                    This is the default token. Please generate and use your own iPLAS token to access the iPLAS server.
                                </span>
                            </template>
                        </v-text-field>
                    </v-col>
                </v-row>

                <!-- Server Info -->
                <v-alert type="info" variant="tonal" class="mt-4" density="compact">
                    <div class="text-caption">
                        <strong>Selected Server:</strong> {{ selectedServerName }} ({{ editableBaseIp }})
                    </div>
                </v-alert>
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
import { ref, computed, watch } from 'vue'
import { useIplasSettings } from '@/features/dut_logs/composables/useIplasSettings'

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
    selectedServer,
    updateServer,
    resetToDefaults
} = useIplasSettings()

// Local state
const showToken = ref(false)
const localSelectedServerId = ref(selectedServerId.value)
const editableBaseIp = ref('')
const editableToken = ref('')

// Server options for select
const serverOptions = computed(() => {
    return servers.value.map(s => ({
        text: `${s.name} - ${s.baseIp}`,
        value: s.id
    }))
})

const selectedServerName = computed(() => {
    const server = servers.value.find(s => s.id === localSelectedServerId.value)
    return server?.name || 'Unknown'
})

// Watch for server selection changes to update editable fields
watch(localSelectedServerId, (newId) => {
    const server = servers.value.find(s => s.id === newId)
    if (server) {
        editableBaseIp.value = server.baseIp
        editableToken.value = server.token
    }
}, { immediate: true })

// Watch for dialog open to reset editable fields
watch(() => props.modelValue, (isOpen) => {
    if (isOpen) {
        localSelectedServerId.value = selectedServerId.value
        const server = selectedServer.value
        if (server) {
            editableBaseIp.value = server.baseIp
            editableToken.value = server.token
        }
    }
})

function handleSave(): void {
    // Update the selected server ID
    selectedServerId.value = localSelectedServerId.value

    // Save current server settings
    updateServer(localSelectedServerId.value, {
        baseIp: editableBaseIp.value,
        token: editableToken.value
    })
    emit('update:modelValue', false)
    // Reload the page to apply new settings
    window.location.reload()
}

function handleCancel(): void {
    // Reset editable fields to current values
    localSelectedServerId.value = selectedServerId.value
    const server = selectedServer.value
    if (server) {
        editableBaseIp.value = server.baseIp
        editableToken.value = server.token
    }
    emit('update:modelValue', false)
}

function handleReset(): void {
    resetToDefaults()
    localSelectedServerId.value = selectedServerId.value
    const server = selectedServer.value
    if (server) {
        editableBaseIp.value = server.baseIp
        editableToken.value = server.token
    }
}
</script>
