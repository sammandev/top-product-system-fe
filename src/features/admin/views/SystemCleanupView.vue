<template>
    <DefaultLayout>
        <!-- Page Header -->
        <div class="mb-6">
            <div class="d-flex align-center mb-2">
                <v-icon size="40" color="warning" class="mr-3">mdi-delete-sweep</v-icon>
                <div>
                    <h1 class="text-h4 mb-2">System Cleanup</h1>
                    <p class="text-medium-emphasis mb-0">
                        Manage temporary uploaded files and cleanup old data
                    </p>
                </div>
            </div>
        </div>

        <!-- Error Alert -->
        <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">
            {{ error }}
        </v-alert>

        <!-- Success Alert -->
        <v-alert v-if="successMessage" type="success" variant="tonal" closable class="mb-4"
            @click:close="successMessage = ''">
            <div class="d-flex align-center">
                <v-icon start>mdi-check-circle</v-icon>
                {{ successMessage }}
            </div>
        </v-alert>

        <!-- Warning Alert -->
        <v-alert type="warning" variant="tonal" class="mb-4">
            <v-alert-title>Admin Only</v-alert-title>
            This page is for administrators only. Cleanup operations will remove temporary uploaded files that exceed
            the specified time-to-live (TTL) period.
        </v-alert>

        <!-- Cleanup Configuration -->
        <v-card class="mb-4">
            <v-card-title>
                <v-icon start>mdi-cog</v-icon>
                Cleanup Configuration
            </v-card-title>
            <v-card-text>
                <v-row>
                    <v-col cols="12" md="6">
                        <v-text-field v-model="adminKey" label="Admin Key" type="password" variant="outlined"
                            density="comfortable" prepend-inner-icon="mdi-key" :error-messages="adminKeyError"
                            hint="Required: Admin authorization key" persistent-hint @update:model-value="adminKeyError = ''" />
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-text-field v-model.number="ttl" label="Time to Live (seconds)" type="number" variant="outlined"
                            density="comfortable" prepend-inner-icon="mdi-clock-outline"
                            hint="Files older than this will be removed (default: 3600 = 1 hour)" persistent-hint />
                    </v-col>
                </v-row>

                <v-row class="mt-4">
                    <v-col cols="12">
                        <v-btn color="warning" size="large" :loading="processing" :disabled="!canProcess"
                            prepend-icon="mdi-delete-sweep" @click="handleCleanup">
                            Execute Cleanup
                        </v-btn>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <!-- Cleanup Results -->
        <v-card v-if="cleanupResult" class="mb-4">
            <v-card-title>
                <v-icon start color="success">mdi-check-circle</v-icon>
                Cleanup Results
            </v-card-title>
            <v-card-text>
                <v-row>
                    <v-col cols="12" md="6">
                        <v-list density="compact">
                            <v-list-item>
                                <template #prepend>
                                    <v-icon color="success">mdi-file-remove</v-icon>
                                </template>
                                <v-list-item-title>Files Removed</v-list-item-title>
                                <v-list-item-subtitle>
                                    <v-chip color="success" variant="tonal" size="small">
                                        {{ cleanupResult.removed.length }}
                                    </v-chip>
                                </v-list-item-subtitle>
                            </v-list-item>
                        </v-list>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-list density="compact">
                            <v-list-item>
                                <template #prepend>
                                    <v-icon color="info">mdi-clock-outline</v-icon>
                                </template>
                                <v-list-item-title>TTL Applied</v-list-item-title>
                                <v-list-item-subtitle>{{ ttl }} seconds ({{ formatTTL(ttl) }})</v-list-item-subtitle>
                            </v-list-item>
                        </v-list>
                    </v-col>
                </v-row>

                <!-- List of Removed Files -->
                <v-divider class="my-4" />

                <div v-if="cleanupResult.removed.length > 0">
                    <h3 class="text-h6 mb-3">Removed Files:</h3>
                    <v-list density="compact" class="bg-grey-lighten-4">
                        <v-list-item v-for="(fileId, index) in cleanupResult.removed" :key="index">
                            <template #prepend>
                                <v-icon size="small" color="grey">mdi-file-document-outline</v-icon>
                            </template>
                            <v-list-item-title class="text-caption font-mono">{{ fileId }}</v-list-item-title>
                        </v-list-item>
                    </v-list>
                </div>

                <v-alert v-else type="info" variant="tonal" density="compact" class="mt-2">
                    No files were removed. All uploaded files are within the TTL period.
                </v-alert>
            </v-card-text>
        </v-card>

        <!-- Information Panel -->
        <v-card>
            <v-card-title class="bg-info">
                <v-icon start color="white">mdi-information</v-icon>
                <span class="text-white">Information</span>
            </v-card-title>
            <v-card-text>
                <h3 class="text-h6 mb-3">About Cleanup Operations:</h3>

                <v-timeline density="compact" side="end" class="mb-4">
                    <v-timeline-item dot-color="primary" size="small">
                        <div class="text-subtitle-2 mb-1">What Gets Cleaned</div>
                        <div class="text-caption text-medium-emphasis">
                            Temporary files uploaded via <code>/api/upload-preview</code> that exceed the TTL period
                        </div>
                    </v-timeline-item>

                    <v-timeline-item dot-color="primary" size="small">
                        <div class="text-subtitle-2 mb-1">Default TTL</div>
                        <div class="text-caption text-medium-emphasis">
                            3600 seconds (1 hour) - files older than this are eligible for removal
                        </div>
                    </v-timeline-item>

                    <v-timeline-item dot-color="primary" size="small">
                        <div class="text-subtitle-2 mb-1">Custom TTL</div>
                        <div class="text-caption text-medium-emphasis">
                            You can specify a custom TTL to cleanup files older than a specific duration
                        </div>
                    </v-timeline-item>

                    <v-timeline-item dot-color="warning" size="small">
                        <div class="text-subtitle-2 mb-1">Admin Authorization</div>
                        <div class="text-caption text-medium-emphasis">
                            Requires valid admin key (ASTPARSER_ADMIN_KEY environment variable)
                        </div>
                    </v-timeline-item>
                </v-timeline>

                <v-divider class="my-4" />

                <h3 class="text-h6 mb-3">Common TTL Values:</h3>

                <v-list density="compact" class="bg-transparent">
                    <v-list-item>
                        <template #prepend>
                            <v-icon size="small">mdi-clock-fast</v-icon>
                        </template>
                        <v-list-item-title class="text-caption">5 minutes = 300 seconds</v-list-item-title>
                    </v-list-item>
                    <v-list-item>
                        <template #prepend>
                            <v-icon size="small">mdi-clock</v-icon>
                        </template>
                        <v-list-item-title class="text-caption">1 hour = 3600 seconds (default)</v-list-item-title>
                    </v-list-item>
                    <v-list-item>
                        <template #prepend>
                            <v-icon size="small">mdi-clock-time-four</v-icon>
                        </template>
                        <v-list-item-title class="text-caption">6 hours = 21600 seconds</v-list-item-title>
                    </v-list-item>
                    <v-list-item>
                        <template #prepend>
                            <v-icon size="small">mdi-calendar-clock</v-icon>
                        </template>
                        <v-list-item-title class="text-caption">24 hours = 86400 seconds</v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-card-text>
        </v-card>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { parsingApi } from '@/features/parsing/api/parsing.api'
import { getApiErrorDetail, getErrorMessage, getErrorStatus } from '@/shared/utils'

// State
const adminKey = ref('')
const adminKeyError = ref('')
const ttl = ref(3600) // Default: 1 hour
const processing = ref(false)
const error = ref('')
const successMessage = ref('')
const cleanupResult = ref<{ removed: string[] } | null>(null)

// Computed
const canProcess = computed(() => {
  return adminKey.value.trim().length > 0 && !processing.value
})

// Methods
function formatTTL(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''}`
  } else {
    const days = Math.floor(seconds / 86400)
    return `${days} day${days > 1 ? 's' : ''}`
  }
}

async function handleCleanup() {
  if (!canProcess.value) return

  // Validate admin key
  if (!adminKey.value.trim()) {
    adminKeyError.value = 'Admin key is required'
    return
  }

  processing.value = true
  error.value = ''
  successMessage.value = ''
  cleanupResult.value = null

  try {
    const formData = new FormData()
    formData.append('admin_key', adminKey.value.trim())
    if (ttl.value && ttl.value > 0) {
      formData.append('ttl', ttl.value.toString())
    }

    const result = await parsingApi.cleanupUploads(formData)
    cleanupResult.value = result

    if (result.removed.length > 0) {
      successMessage.value = `Successfully removed ${result.removed.length} file${result.removed.length > 1 ? 's' : ''}`
    } else {
      successMessage.value = 'Cleanup completed. No files needed to be removed.'
    }
  } catch (err: unknown) {
    console.error('Cleanup failed:', err)
    if (getErrorStatus(err) === 403) {
      error.value = 'Invalid admin key. Please check your credentials.'
      adminKeyError.value = 'Invalid admin key'
    } else {
      error.value = getApiErrorDetail(err) || getErrorMessage(err) || 'Cleanup operation failed'
    }
  } finally {
    processing.value = false
  }
}
</script>

<style scoped>
.font-mono {
    font-family: 'Courier New', monospace;
}
</style>
