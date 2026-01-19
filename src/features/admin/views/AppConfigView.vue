<template>
  <v-container fluid class="py-6">
    <v-row>
      <v-col cols="12" md="8">
        <v-card elevation="2">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-cog</v-icon>
            App Configuration
          </v-card-title>

          <v-card-text>
            <v-alert type="info" density="compact" class="mb-4">
              Update the application name, version, and description shown across the UI.
            </v-alert>

            <v-form ref="formRef" v-model="formValid" @submit.prevent="handleSave">
              <v-text-field
                v-model="form.name"
                label="Application Name"
                :rules="[rules.required]"
                prepend-inner-icon="mdi-application"
                variant="outlined"
                class="mb-3"
              />

              <v-text-field
                v-model="form.version"
                label="Application Version"
                :rules="[rules.required]"
                prepend-inner-icon="mdi-tag"
                variant="outlined"
                class="mb-3"
              />

              <v-textarea
                v-model="form.description"
                label="Description"
                prepend-inner-icon="mdi-text-long"
                variant="outlined"
                rows="3"
                auto-grow
                class="mb-3"
              />

              <v-alert v-if="error" type="error" density="compact" class="mb-3">
                {{ error }}
              </v-alert>

              <div class="d-flex flex-wrap gap-2">
                <v-btn color="primary" :loading="loading" :disabled="!formValid" type="submit">
                  <v-icon start>mdi-content-save</v-icon>
                  Save Changes
                </v-btn>
                <v-btn variant="outlined" :disabled="loading" @click="resetForm">
                  Reset
                </v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card elevation="2">
          <v-card-title>
            <v-icon class="mr-2">mdi-eye</v-icon>
            Preview
          </v-card-title>
          <v-card-text>
            <div class="text-subtitle-1 font-weight-bold">{{ form.name || appName }}</div>
            <div class="text-caption text-medium-emphasis">v{{ form.version || appVersion }}</div>
            <p class="text-body-2 mt-3">{{ form.description || appDescription }}</p>
            <v-divider class="my-3" />
            <div class="text-caption text-medium-emphasis" v-if="lastUpdated">
              Last updated: {{ lastUpdated }}
            </div>
            <div class="text-caption text-medium-emphasis" v-if="updatedBy">
              Updated by: {{ updatedBy }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppConfigStore } from '@/core/stores/appConfig.store'

const appConfigStore = useAppConfigStore()

const formRef = ref()
const formValid = ref(false)

const form = reactive({
  name: '',
  version: '',
  description: ''
})

const rules = {
  required: (value: string) => !!value || 'Required field'
}

const { appName, appVersion, appDescription, config } = storeToRefs(appConfigStore)
const loading = computed(() => appConfigStore.loading)
const error = computed(() => appConfigStore.error)
const lastUpdated = computed(() => config.value?.updated_at || '')
const updatedBy = computed(() => config.value?.updated_by || '')

function populateForm() {
  form.name = appConfigStore.config?.name || appName.value
  form.version = appConfigStore.config?.version || appVersion.value
  form.description = appConfigStore.config?.description || appDescription.value
}

async function handleSave() {
  if (!formValid.value) return
  await appConfigStore.updateConfig({
    name: form.name.trim(),
    version: form.version.trim(),
    description: form.description?.trim() || ''
  })
  populateForm()
  formRef.value?.resetValidation?.()
}

function resetForm() {
  populateForm()
  formRef.value?.resetValidation?.()
}

onMounted(async () => {
  await appConfigStore.fetchConfig()
  populateForm()
})
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}
</style>
