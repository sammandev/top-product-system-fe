<template>
  <DefaultLayout>
    <v-container fluid class="py-6">
      <!-- Page Header -->
      <div class="d-flex align-center mb-4">
        <v-icon class="mr-2" size="28">mdi-cog</v-icon>
        <h1 class="text-h5 font-weight-bold">App Configuration</h1>
      </div>

      <!-- Tabs -->
      <v-card elevation="2">
        <v-tabs v-model="activeTab" color="primary" show-arrows>
          <v-tab value="general" prepend-icon="mdi-application">General</v-tab>
          <v-tab value="branding" prepend-icon="mdi-palette">Branding</v-tab>
          <v-tab v-if="authStore.isSuperAdmin" value="iplas" prepend-icon="mdi-server-network">
            iPLAS Tokens
          </v-tab>
          <v-tab v-if="authStore.isSuperAdmin" value="sfistsp" prepend-icon="mdi-api">
            SFISTSP
          </v-tab>
          <v-tab v-if="authStore.isSuperAdmin" value="guest" prepend-icon="mdi-account-question">
            Guest Access
          </v-tab>
        </v-tabs>

        <v-divider />

        <v-tabs-window v-model="activeTab">
          <!-- ==================== General Tab ==================== -->
          <v-tabs-window-item value="general">
            <v-card-text>
              <v-row>
                <v-col cols="12" md="8">
                  <v-alert type="info" density="compact" class="mb-4">
                    Update the application name, version, description and browser tab title.
                  </v-alert>

                  <v-form ref="generalFormRef" v-model="generalFormValid" @submit.prevent="handleGeneralSave">
                    <v-text-field v-model="generalForm.name" label="Application Name" :rules="[rules.required]"
                      prepend-inner-icon="mdi-application" variant="outlined" class="mb-3" />

                    <v-text-field v-model="generalForm.version" label="Application Version" :rules="[rules.required]"
                      prepend-inner-icon="mdi-tag" variant="outlined" class="mb-3" />

                    <v-textarea v-model="generalForm.description" label="Description" prepend-inner-icon="mdi-text-long"
                      variant="outlined" rows="3" auto-grow class="mb-3" />

                    <v-text-field v-model="generalForm.tab_title" label="Browser Tab Title" prepend-inner-icon="mdi-tab"
                      variant="outlined" class="mb-3" hint="Text shown in the browser tab. Leave empty for default."
                      persistent-hint />

                    <v-alert v-if="generalError" type="error" density="compact" class="mb-3">
                      {{ generalError }}
                    </v-alert>

                    <div class="d-flex flex-wrap gap-2">
                      <v-btn color="primary" :loading="generalLoading" :disabled="!generalFormValid" type="submit">
                        <v-icon start>mdi-content-save</v-icon>
                        Save Changes
                      </v-btn>
                      <v-btn variant="outlined" :disabled="generalLoading" @click="resetGeneralForm">
                        Reset
                      </v-btn>
                    </div>
                  </v-form>
                </v-col>

                <v-col cols="12" md="4">
                  <v-card variant="tonal" class="pa-4">
                    <div class="text-overline mb-1">Preview</div>
                    <div class="text-subtitle-1 font-weight-bold">
                      {{ generalForm.name || appName }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      v{{ generalForm.version || appVersion }}
                    </div>
                    <p class="text-body-2 mt-3">
                      {{ generalForm.description || appDescription }}
                    </p>
                    <v-divider class="my-3" />
                    <div class="text-caption text-medium-emphasis" v-if="lastUpdated">
                      Last updated: {{ lastUpdated }}
                    </div>
                    <div class="text-caption text-medium-emphasis" v-if="updatedBy">
                      Updated by: {{ updatedBy }}
                    </div>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
          </v-tabs-window-item>

          <!-- ==================== Branding Tab ==================== -->
          <v-tabs-window-item value="branding">
            <v-card-text>
              <v-alert type="info" density="compact" class="mb-4">
                Upload a custom favicon for the browser tab. Supported formats: ICO, PNG, SVG
                (max 1 MB).
              </v-alert>

              <v-row>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 mb-2">Current Favicon</div>
                  <div class="d-flex align-center ga-4 mb-4">
                    <v-avatar size="48" rounded="sm" color="grey-lighten-3">
                      <v-img v-if="currentFaviconUrl" :src="currentFaviconUrl" />
                      <v-icon v-else>mdi-image-off</v-icon>
                    </v-avatar>
                    <div>
                      <div class="text-body-2">
                        {{ currentFaviconUrl ? 'Custom favicon set' : 'Using default favicon' }}
                      </div>
                      <v-btn v-if="currentFaviconUrl" variant="text" color="error" size="small" class="mt-1"
                        :loading="faviconLoading" @click="handleDeleteFavicon">
                        <v-icon start size="small">mdi-delete</v-icon>
                        Remove
                      </v-btn>
                    </div>
                  </div>

                  <v-file-input v-model="faviconFile" label="Upload Favicon" accept=".ico,.png,.svg"
                    prepend-icon="mdi-image" variant="outlined" :rules="[rules.faviconSize]"
                    hint="Max 1 MB. ICO, PNG, or SVG" persistent-hint />

                  <v-btn color="primary" class="mt-3" :loading="faviconLoading"
                    :disabled="!faviconFile || faviconFile.length === 0" @click="handleUploadFavicon">
                    <v-icon start>mdi-upload</v-icon>
                    Upload Favicon
                  </v-btn>

                  <v-alert v-if="faviconError" type="error" density="compact" class="mt-3">
                    {{ faviconError }}
                  </v-alert>
                  <v-alert v-if="faviconSuccess" type="success" density="compact" class="mt-3">
                    {{ faviconSuccess }}
                  </v-alert>
                </v-col>
              </v-row>
            </v-card-text>
          </v-tabs-window-item>

          <!-- ==================== iPLAS Tokens Tab ==================== -->
          <v-tabs-window-item v-if="authStore.isSuperAdmin" value="iplas">
            <v-card-text>
              <div class="d-flex align-center justify-space-between mb-4">
                <v-alert type="info" density="compact" class="flex-grow-1 mr-4">
                  Manage iPLAS API tokens per site. Only one token per site can be active at a time.
                  Active tokens override environment variable configuration.
                </v-alert>
                <v-btn color="primary" @click="openIplasDialog()">
                  <v-icon start>mdi-plus</v-icon>
                  Add Token
                </v-btn>
              </div>

              <v-data-table :headers="iplasHeaders" :items="iplasTokens" :loading="iplasLoading" class="elevation-1"
                density="comfortable" items-per-page="10">
                <template #item.is_active="{ item }">
                  <v-chip :color="item.is_active ? 'success' : 'grey'" size="small" label>
                    {{ item.is_active ? 'Active' : 'Inactive' }}
                  </v-chip>
                </template>
                <template #item.token_masked="{ item }">
                  <code class="text-caption">{{ item.token_masked }}</code>
                </template>
                <template #item.updated_at="{ item }">
                  {{ formatDate(item.updated_at) }}
                </template>
                <template #item.actions="{ item }">
                  <div class="d-flex ga-1">
                    <v-btn v-if="!item.is_active" icon size="x-small" variant="text" color="success" title="Activate"
                      @click="handleActivateIplas(item.id)">
                      <v-icon size="small">mdi-check-circle</v-icon>
                    </v-btn>
                    <v-btn icon size="x-small" variant="text" color="primary" title="Edit"
                      @click="openIplasDialog(item)">
                      <v-icon size="small">mdi-pencil</v-icon>
                    </v-btn>
                    <v-btn icon size="x-small" variant="text" color="error" title="Delete"
                      @click="confirmDeleteIplas(item)">
                      <v-icon size="small">mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </template>
              </v-data-table>

              <v-alert v-if="iplasError" type="error" density="compact" class="mt-3">
                {{ iplasError }}
              </v-alert>
            </v-card-text>
          </v-tabs-window-item>

          <!-- ==================== SFISTSP Tab ==================== -->
          <v-tabs-window-item v-if="authStore.isSuperAdmin" value="sfistsp">
            <v-card-text>
              <div class="d-flex align-center justify-space-between mb-4">
                <v-alert type="info" density="compact" class="flex-grow-1 mr-4">
                  Manage SFISTSP API configuration. Only one config can be active at a time.
                  Active config overrides environment variables.
                </v-alert>
                <v-btn color="primary" @click="openSfistspDialog()">
                  <v-icon start>mdi-plus</v-icon>
                  Add Config
                </v-btn>
              </div>

              <v-data-table :headers="sfistspHeaders" :items="sfistspConfigs" :loading="sfistspLoading"
                class="elevation-1" density="comfortable" items-per-page="10">
                <template #item.is_active="{ item }">
                  <v-chip :color="item.is_active ? 'success' : 'grey'" size="small" label>
                    {{ item.is_active ? 'Active' : 'Inactive' }}
                  </v-chip>
                </template>
                <template #item.password_masked="{ item }">
                  <code class="text-caption">{{ item.password_masked }}</code>
                </template>
                <template #item.updated_at="{ item }">
                  {{ formatDate(item.updated_at) }}
                </template>
                <template #item.actions="{ item }">
                  <div class="d-flex ga-1">
                    <v-btn v-if="!item.is_active" icon size="x-small" variant="text" color="success" title="Activate"
                      @click="handleActivateSfistsp(item.id)">
                      <v-icon size="small">mdi-check-circle</v-icon>
                    </v-btn>
                    <v-btn icon size="x-small" variant="text" color="primary" title="Edit"
                      @click="openSfistspDialog(item)">
                      <v-icon size="small">mdi-pencil</v-icon>
                    </v-btn>
                    <v-btn icon size="x-small" variant="text" color="error" title="Delete"
                      @click="confirmDeleteSfistsp(item)">
                      <v-icon size="small">mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </template>
              </v-data-table>

              <v-alert v-if="sfistspError" type="error" density="compact" class="mt-3">
                {{ sfistspError }}
              </v-alert>
            </v-card-text>
          </v-tabs-window-item>

          <!-- ==================== Guest Access Tab ==================== -->
          <v-tabs-window-item v-if="authStore.isSuperAdmin" value="guest">
            <v-card-text>
              <div class="d-flex align-center justify-space-between mb-4">
                <v-alert type="info" density="compact" class="flex-grow-1 mr-4">
                  Manage guest login credentials. Only one credential can be active at a time.
                  Active credentials are used for the "Continue as Guest" button on the login page.
                </v-alert>
                <v-btn color="primary" @click="openGuestDialog()">
                  <v-icon start>mdi-plus</v-icon>
                  Add Credential
                </v-btn>
              </div>

              <v-data-table :headers="guestHeaders" :items="guestCredentials" :loading="guestLoading"
                class="elevation-1" density="comfortable" items-per-page="10">
                <template #item.is_active="{ item }">
                  <v-chip :color="item.is_active ? 'success' : 'grey'" size="small" label>
                    {{ item.is_active ? 'Active' : 'Inactive' }}
                  </v-chip>
                </template>
                <template #item.username_masked="{ item }">
                  <code class="text-caption">{{ item.username_masked }}</code>
                </template>
                <template #item.updated_at="{ item }">
                  {{ formatDate(item.updated_at) }}
                </template>
                <template #item.actions="{ item }">
                  <div class="d-flex ga-1">
                    <v-btn v-if="!item.is_active" icon size="x-small" variant="text" color="success" title="Activate"
                      @click="handleActivateGuest(item.id)">
                      <v-icon size="small">mdi-check-circle</v-icon>
                    </v-btn>
                    <v-btn icon size="x-small" variant="text" color="primary" title="Edit"
                      @click="openGuestDialog(item)">
                      <v-icon size="small">mdi-pencil</v-icon>
                    </v-btn>
                    <v-btn icon size="x-small" variant="text" color="error" title="Delete"
                      @click="confirmDeleteGuest(item)">
                      <v-icon size="small">mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </template>
              </v-data-table>

              <v-alert v-if="guestError" type="error" density="compact" class="mt-3">
                {{ guestError }}
              </v-alert>
            </v-card-text>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-card>

      <!-- ==================== iPLAS Token Dialog ==================== -->
      <v-dialog v-model="iplasDialogOpen" max-width="560" persistent>
        <v-card class="app-dialog">
          <div class="app-dialog-header">
            <v-card-title>{{ iplasEditId ? 'Edit' : 'Add' }} iPLAS Token</v-card-title>
          </div>
          <div class="app-dialog-body">
            <v-card-text>
            <v-form ref="iplasFormRef" v-model="iplasFormValid">
              <v-select v-model="iplasForm.site" label="Site" :items="IPLAS_SITE_OPTIONS" :rules="[rules.required]"
                variant="outlined" class="mb-3" />

              <v-text-field v-model="iplasForm.base_url" label="Base URL" :rules="[rules.required]" variant="outlined"
                class="mb-3" placeholder="http://10.176.33.89" />

              <v-text-field v-model="iplasForm.token_value" label="Token Value"
                :rules="iplasEditId ? [] : [rules.required]" variant="outlined" class="mb-3"
                :placeholder="iplasEditId ? '(leave blank to keep current)' : ''" />

              <v-text-field v-model="iplasForm.label" label="Label (optional)" variant="outlined" class="mb-3" />

              <v-switch v-model="iplasForm.is_active" label="Active" color="success" hide-details class="mb-3" />
            </v-form>
            </v-card-text>
          </div>
          <div class="app-dialog-footer">
            <v-card-actions>
              <v-spacer />
              <v-btn variant="text" @click="iplasDialogOpen = false">Cancel</v-btn>
              <v-btn color="primary" :loading="iplasLoading" :disabled="!iplasFormValid" @click="handleSaveIplas">
                Save
              </v-btn>
            </v-card-actions>
          </div>
        </v-card>
      </v-dialog>

      <!-- ==================== SFISTSP Config Dialog ==================== -->
      <v-dialog v-model="sfistspDialogOpen" max-width="560" persistent>
        <v-card class="app-dialog">
          <div class="app-dialog-header">
            <v-card-title>{{ sfistspEditId ? 'Edit' : 'Add' }} SFISTSP Config</v-card-title>
          </div>
          <div class="app-dialog-body">
            <v-card-text>
            <v-form ref="sfistspFormRef" v-model="sfistspFormValid">
              <v-text-field v-model="sfistspForm.base_url" label="Base URL" :rules="[rules.required]" variant="outlined"
                class="mb-3" placeholder="https://sfistsp.example.com" />

              <v-text-field v-model="sfistspForm.program_id" label="Program ID" :rules="[rules.required]"
                variant="outlined" class="mb-3" />

              <v-text-field v-model="sfistspForm.program_password" label="Program Password"
                :rules="sfistspEditId ? [] : [rules.required]" variant="outlined" class="mb-3"
                :type="showSfistspPassword ? 'text' : 'password'"
                :append-inner-icon="showSfistspPassword ? 'mdi-eye-off' : 'mdi-eye'"
                :placeholder="sfistspEditId ? '(leave blank to keep current)' : ''"
                @click:append-inner="showSfistspPassword = !showSfistspPassword" />

              <v-text-field v-model.number="sfistspForm.timeout" label="Timeout (seconds)" type="number"
                variant="outlined" class="mb-3" hint="Default: 30 seconds" persistent-hint />

              <v-text-field v-model="sfistspForm.label" label="Label (optional)" variant="outlined" class="mb-3" />

              <v-switch v-model="sfistspForm.is_active" label="Active" color="success" hide-details class="mb-3" />
            </v-form>
            </v-card-text>
          </div>
          <div class="app-dialog-footer">
            <v-card-actions>
              <v-spacer />
              <v-btn variant="text" @click="sfistspDialogOpen = false">Cancel</v-btn>
              <v-btn color="primary" :loading="sfistspLoading" :disabled="!sfistspFormValid" @click="handleSaveSfistsp">
                Save
              </v-btn>
            </v-card-actions>
          </div>
        </v-card>
      </v-dialog>

      <!-- ==================== Guest Credential Dialog ==================== -->
      <v-dialog v-model="guestDialogOpen" max-width="560" persistent>
        <v-card class="app-dialog">
          <div class="app-dialog-header">
            <v-card-title>{{ guestEditId ? 'Edit' : 'Add' }} Guest Credential</v-card-title>
          </div>
          <div class="app-dialog-body">
            <v-card-text>
            <v-form ref="guestFormRef" v-model="guestFormValid">
              <v-text-field v-model="guestForm.username" label="Username" :rules="guestEditId ? [] : [rules.required]"
                variant="outlined" class="mb-3" :placeholder="guestEditId ? '(leave blank to keep current)' : ''" />

              <v-text-field v-model="guestForm.password" label="Password" :rules="guestEditId ? [] : [rules.required]"
                variant="outlined" class="mb-3" :type="showGuestPassword ? 'text' : 'password'"
                :append-inner-icon="showGuestPassword ? 'mdi-eye-off' : 'mdi-eye'"
                :placeholder="guestEditId ? '(leave blank to keep current)' : ''"
                @click:append-inner="showGuestPassword = !showGuestPassword" />

              <v-text-field v-model="guestForm.label" label="Label (optional)" variant="outlined" class="mb-3" />

              <v-switch v-model="guestForm.is_active" label="Active" color="success" hide-details class="mb-3" />
            </v-form>
            </v-card-text>
          </div>
          <div class="app-dialog-footer">
            <v-card-actions>
              <v-spacer />
              <v-btn variant="text" @click="guestDialogOpen = false">Cancel</v-btn>
              <v-btn color="primary" :loading="guestLoading" :disabled="!guestFormValid" @click="handleSaveGuest">
                Save
              </v-btn>
            </v-card-actions>
          </div>
        </v-card>
      </v-dialog>

      <!-- ==================== Delete Confirmation Dialog ==================== -->
      <v-dialog v-model="deleteDialogOpen" max-width="420">
        <v-card class="app-dialog">
          <div class="app-dialog-header">
            <v-card-title>Confirm Delete</v-card-title>
          </div>
          <div class="app-dialog-body">
            <v-card-text>
            Are you sure you want to delete this {{ deleteTarget.type }}?
            This action cannot be undone.
            </v-card-text>
          </div>
          <div class="app-dialog-footer">
            <v-card-actions>
              <v-spacer />
              <v-btn variant="text" @click="deleteDialogOpen = false">Cancel</v-btn>
              <v-btn color="error" :loading="deleteLoading" @click="handleConfirmDelete">
                Delete
              </v-btn>
            </v-card-actions>
          </div>
        </v-card>
      </v-dialog>

      <!-- Snackbar -->
      <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="bottom right">
        {{ snackbar.text }}
      </v-snackbar>
    </v-container>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { appConfigApi } from '@/core/api/appConfigApi'
import { useAppConfigStore } from '@/core/stores/appConfig.store'
import type {
  GuestCredential,
  IplasToken,
  SfistspConfigItem,
} from '@/core/types'
import { useAuthStore } from '@/features/auth/stores'
import { useTabPersistence } from '@/shared/composables/useTabPersistence'
import { getApiErrorDetail } from '@/shared/utils'

// ============================================================================
// Stores & Tab Persistence
// ============================================================================

const appConfigStore = useAppConfigStore()
const authStore = useAuthStore()
const activeTab = useTabPersistence<string>('tab', 'general')

const { appName, appVersion, appDescription, config } = storeToRefs(appConfigStore)

// ============================================================================
// Constants
// ============================================================================

const IPLAS_SITE_OPTIONS = ['PTB', 'PSZ', 'PXD', 'PVN', 'PTY']

const rules = {
  required: (value: string) => !!value || 'Required field',
  faviconSize: (files: File[] | undefined) => {
    if (!files || files.length === 0) return true
    const file = files[0]
    if (!file) return true
    return file.size <= 1_048_576 || 'File must be under 1 MB'
  },
}

// ============================================================================
// Snackbar
// ============================================================================

const snackbar = reactive({ show: false, text: '', color: 'success' })
function showSnackbar(text: string, color = 'success') {
  snackbar.text = text
  snackbar.color = color
  snackbar.show = true
}

// ============================================================================
// General Tab
// ============================================================================

const generalFormRef = ref()
const generalFormValid = ref(false)
const generalLoading = ref(false)
const generalError = ref<string | null>(null)

const generalForm = reactive({
  name: '',
  version: '',
  description: '',
  tab_title: '',
})

const lastUpdated = computed(() => config.value?.updated_at || '')
const updatedBy = computed(() => config.value?.updated_by || '')

function populateGeneralForm() {
  generalForm.name = config.value?.name || appName.value
  generalForm.version = config.value?.version || appVersion.value
  generalForm.description = config.value?.description || appDescription.value
  generalForm.tab_title = config.value?.tab_title || ''
}

async function handleGeneralSave() {
  if (!generalFormValid.value) return
  generalLoading.value = true
  generalError.value = null
  try {
    await appConfigStore.updateConfig({
      name: generalForm.name.trim(),
      version: generalForm.version.trim(),
      description: generalForm.description?.trim() || '',
      tab_title: generalForm.tab_title?.trim() || null,
    })
    populateGeneralForm()
    generalFormRef.value?.resetValidation?.()
    showSnackbar('Configuration saved')
  } catch (err: unknown) {
    generalError.value = getApiErrorDetail(err, 'Failed to save configuration')
  } finally {
    generalLoading.value = false
  }
}

function resetGeneralForm() {
  populateGeneralForm()
  generalFormRef.value?.resetValidation?.()
}

// ============================================================================
// Branding Tab (Favicon)
// ============================================================================

const faviconFile = ref<File[]>()
const faviconLoading = ref(false)
const faviconError = ref<string | null>(null)
const faviconSuccess = ref<string | null>(null)

const currentFaviconUrl = computed(() => config.value?.favicon_url || null)

async function handleUploadFavicon() {
  if (!faviconFile.value || faviconFile.value.length === 0) return
  const file = faviconFile.value[0]
  if (!file) return
  faviconLoading.value = true
  faviconError.value = null
  faviconSuccess.value = null
  try {
    const data = await appConfigApi.uploadFavicon(file)
    appConfigStore.config = { ...appConfigStore.config, ...data }
    faviconFile.value = undefined
    faviconSuccess.value = 'Favicon uploaded successfully'
    showSnackbar('Favicon uploaded')
  } catch (err: unknown) {
    faviconError.value = getApiErrorDetail(err, 'Failed to upload favicon')
  } finally {
    faviconLoading.value = false
  }
}

async function handleDeleteFavicon() {
  faviconLoading.value = true
  faviconError.value = null
  faviconSuccess.value = null
  try {
    await appConfigApi.deleteFavicon()
    if (appConfigStore.config) {
      appConfigStore.config = { ...appConfigStore.config, favicon_url: null }
    }
    showSnackbar('Favicon removed')
  } catch (err: unknown) {
    faviconError.value = getApiErrorDetail(err, 'Failed to delete favicon')
  } finally {
    faviconLoading.value = false
  }
}

// ============================================================================
// iPLAS Tokens Tab
// ============================================================================

const iplasTokens = ref<IplasToken[]>([])
const iplasLoading = ref(false)
const iplasError = ref<string | null>(null)
const iplasDialogOpen = ref(false)
const iplasFormRef = ref()
const iplasFormValid = ref(false)
const iplasEditId = ref<number | null>(null)

const iplasForm = reactive({
  site: '',
  base_url: '',
  token_value: '',
  label: '',
  is_active: true,
})

const iplasHeaders = [
  { title: 'Site', key: 'site', width: '80px' },
  { title: 'Base URL', key: 'base_url' },
  { title: 'Token', key: 'token_masked' },
  { title: 'Label', key: 'label' },
  { title: 'Status', key: 'is_active', width: '100px' },
  { title: 'Updated', key: 'updated_at', width: '160px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '120px' },
]

async function fetchIplasTokens() {
  iplasLoading.value = true
  iplasError.value = null
  try {
    const resp = await appConfigApi.getIplasTokens()
    iplasTokens.value = resp.tokens
  } catch (err: unknown) {
    iplasError.value = getApiErrorDetail(err, 'Failed to load iPLAS tokens')
  } finally {
    iplasLoading.value = false
  }
}

function openIplasDialog(item?: IplasToken) {
  if (item) {
    iplasEditId.value = item.id
    iplasForm.site = item.site
    iplasForm.base_url = item.base_url
    iplasForm.token_value = ''
    iplasForm.label = item.label || ''
    iplasForm.is_active = item.is_active
  } else {
    iplasEditId.value = null
    iplasForm.site = ''
    iplasForm.base_url = ''
    iplasForm.token_value = ''
    iplasForm.label = ''
    iplasForm.is_active = true
  }
  iplasDialogOpen.value = true
}

async function handleSaveIplas() {
  if (!iplasFormValid.value) return
  iplasLoading.value = true
  try {
    if (iplasEditId.value) {
      const payload: Record<string, unknown> = {}
      if (iplasForm.site) payload.site = iplasForm.site
      if (iplasForm.base_url) payload.base_url = iplasForm.base_url
      if (iplasForm.token_value) payload.token_value = iplasForm.token_value
      payload.label = iplasForm.label || null
      payload.is_active = iplasForm.is_active
      await appConfigApi.updateIplasToken(iplasEditId.value, payload)
      showSnackbar('Token updated')
    } else {
      await appConfigApi.createIplasToken({
        site: iplasForm.site,
        base_url: iplasForm.base_url,
        token_value: iplasForm.token_value,
        label: iplasForm.label || null,
        is_active: iplasForm.is_active,
      })
      showSnackbar('Token created')
    }
    iplasDialogOpen.value = false
    await fetchIplasTokens()
  } catch (err: unknown) {
    iplasError.value = getApiErrorDetail(err, 'Failed to save token')
  } finally {
    iplasLoading.value = false
  }
}

async function handleActivateIplas(id: number) {
  iplasLoading.value = true
  try {
    await appConfigApi.activateIplasToken(id)
    showSnackbar('Token activated')
    await fetchIplasTokens()
  } catch (err: unknown) {
    iplasError.value = getApiErrorDetail(err, 'Failed to activate token')
  } finally {
    iplasLoading.value = false
  }
}

// ============================================================================
// SFISTSP Config Tab
// ============================================================================

const sfistspConfigs = ref<SfistspConfigItem[]>([])
const sfistspLoading = ref(false)
const sfistspError = ref<string | null>(null)
const sfistspDialogOpen = ref(false)
const sfistspFormRef = ref()
const sfistspFormValid = ref(false)
const sfistspEditId = ref<number | null>(null)
const showSfistspPassword = ref(false)

const sfistspForm = reactive({
  base_url: '',
  program_id: '',
  program_password: '',
  timeout: 30,
  label: '',
  is_active: true,
})

const sfistspHeaders = [
  { title: 'Base URL', key: 'base_url' },
  { title: 'Program ID', key: 'program_id' },
  { title: 'Password', key: 'password_masked', width: '140px' },
  { title: 'Timeout', key: 'timeout', width: '90px' },
  { title: 'Label', key: 'label' },
  { title: 'Status', key: 'is_active', width: '100px' },
  { title: 'Updated', key: 'updated_at', width: '160px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '120px' },
]

async function fetchSfistspConfigs() {
  sfistspLoading.value = true
  sfistspError.value = null
  try {
    const resp = await appConfigApi.getSfistspConfigs()
    sfistspConfigs.value = resp.configs
  } catch (err: unknown) {
    sfistspError.value = getApiErrorDetail(err, 'Failed to load SFISTSP configs')
  } finally {
    sfistspLoading.value = false
  }
}

function openSfistspDialog(item?: SfistspConfigItem) {
  showSfistspPassword.value = false
  if (item) {
    sfistspEditId.value = item.id
    sfistspForm.base_url = item.base_url
    sfistspForm.program_id = item.program_id
    sfistspForm.program_password = ''
    sfistspForm.timeout = item.timeout
    sfistspForm.label = item.label || ''
    sfistspForm.is_active = item.is_active
  } else {
    sfistspEditId.value = null
    sfistspForm.base_url = ''
    sfistspForm.program_id = ''
    sfistspForm.program_password = ''
    sfistspForm.timeout = 30
    sfistspForm.label = ''
    sfistspForm.is_active = true
  }
  sfistspDialogOpen.value = true
}

async function handleSaveSfistsp() {
  if (!sfistspFormValid.value) return
  sfistspLoading.value = true
  try {
    if (sfistspEditId.value) {
      const payload: Record<string, unknown> = {}
      if (sfistspForm.base_url) payload.base_url = sfistspForm.base_url
      if (sfistspForm.program_id) payload.program_id = sfistspForm.program_id
      if (sfistspForm.program_password) payload.program_password = sfistspForm.program_password
      payload.timeout = sfistspForm.timeout
      payload.label = sfistspForm.label || null
      payload.is_active = sfistspForm.is_active
      await appConfigApi.updateSfistspConfig(sfistspEditId.value, payload)
      showSnackbar('Config updated')
    } else {
      await appConfigApi.createSfistspConfig({
        base_url: sfistspForm.base_url,
        program_id: sfistspForm.program_id,
        program_password: sfistspForm.program_password,
        timeout: sfistspForm.timeout,
        label: sfistspForm.label || null,
        is_active: sfistspForm.is_active,
      })
      showSnackbar('Config created')
    }
    sfistspDialogOpen.value = false
    await fetchSfistspConfigs()
  } catch (err: unknown) {
    sfistspError.value = getApiErrorDetail(err, 'Failed to save config')
  } finally {
    sfistspLoading.value = false
  }
}

async function handleActivateSfistsp(id: number) {
  sfistspLoading.value = true
  try {
    await appConfigApi.activateSfistspConfig(id)
    showSnackbar('Config activated')
    await fetchSfistspConfigs()
  } catch (err: unknown) {
    sfistspError.value = getApiErrorDetail(err, 'Failed to activate config')
  } finally {
    sfistspLoading.value = false
  }
}

// ============================================================================
// Guest Credentials Tab
// ============================================================================

const guestCredentials = ref<GuestCredential[]>([])
const guestLoading = ref(false)
const guestError = ref<string | null>(null)
const guestDialogOpen = ref(false)
const guestFormRef = ref()
const guestFormValid = ref(false)
const guestEditId = ref<number | null>(null)
const showGuestPassword = ref(false)

const guestForm = reactive({
  username: '',
  password: '',
  label: '',
  is_active: true,
})

const guestHeaders = [
  { title: 'Username', key: 'username_masked' },
  { title: 'Label', key: 'label' },
  { title: 'Status', key: 'is_active', width: '100px' },
  { title: 'Updated', key: 'updated_at', width: '160px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '120px' },
]

async function fetchGuestCredentials() {
  guestLoading.value = true
  guestError.value = null
  try {
    const resp = await appConfigApi.getGuestCredentials()
    guestCredentials.value = resp.credentials
  } catch (err: unknown) {
    guestError.value = getApiErrorDetail(err, 'Failed to load guest credentials')
  } finally {
    guestLoading.value = false
  }
}

function openGuestDialog(item?: GuestCredential) {
  showGuestPassword.value = false
  if (item) {
    guestEditId.value = item.id
    guestForm.username = ''
    guestForm.password = ''
    guestForm.label = item.label || ''
    guestForm.is_active = item.is_active
  } else {
    guestEditId.value = null
    guestForm.username = ''
    guestForm.password = ''
    guestForm.label = ''
    guestForm.is_active = true
  }
  guestDialogOpen.value = true
}

async function handleSaveGuest() {
  if (!guestFormValid.value) return
  guestLoading.value = true
  try {
    if (guestEditId.value) {
      const payload: Record<string, unknown> = {}
      if (guestForm.username) payload.username = guestForm.username
      if (guestForm.password) payload.password = guestForm.password
      payload.label = guestForm.label || null
      payload.is_active = guestForm.is_active
      await appConfigApi.updateGuestCredential(guestEditId.value, payload)
      showSnackbar('Credential updated')
    } else {
      await appConfigApi.createGuestCredential({
        username: guestForm.username,
        password: guestForm.password,
        label: guestForm.label || null,
        is_active: guestForm.is_active,
      })
      showSnackbar('Credential created')
    }
    guestDialogOpen.value = false
    await fetchGuestCredentials()
  } catch (err: unknown) {
    guestError.value = getApiErrorDetail(err, 'Failed to save credential')
  } finally {
    guestLoading.value = false
  }
}

async function handleActivateGuest(id: number) {
  guestLoading.value = true
  try {
    await appConfigApi.activateGuestCredential(id)
    showSnackbar('Credential activated')
    await fetchGuestCredentials()
  } catch (err: unknown) {
    guestError.value = getApiErrorDetail(err, 'Failed to activate credential')
  } finally {
    guestLoading.value = false
  }
}

// ============================================================================
// Delete Confirmation (shared)
// ============================================================================

const deleteDialogOpen = ref(false)
const deleteLoading = ref(false)
const deleteTarget = reactive<{ type: string; id: number | null }>({ type: '', id: null })

function confirmDeleteIplas(item: IplasToken) {
  deleteTarget.type = 'iPLAS token'
  deleteTarget.id = item.id
  deleteDialogOpen.value = true
}

function confirmDeleteSfistsp(item: SfistspConfigItem) {
  deleteTarget.type = 'SFISTSP config'
  deleteTarget.id = item.id
  deleteDialogOpen.value = true
}

function confirmDeleteGuest(item: GuestCredential) {
  deleteTarget.type = 'guest credential'
  deleteTarget.id = item.id
  deleteDialogOpen.value = true
}

async function handleConfirmDelete() {
  if (!deleteTarget.id) return
  deleteLoading.value = true
  try {
    if (deleteTarget.type === 'iPLAS token') {
      await appConfigApi.deleteIplasToken(deleteTarget.id)
      await fetchIplasTokens()
    } else if (deleteTarget.type === 'SFISTSP config') {
      await appConfigApi.deleteSfistspConfig(deleteTarget.id)
      await fetchSfistspConfigs()
    } else if (deleteTarget.type === 'guest credential') {
      await appConfigApi.deleteGuestCredential(deleteTarget.id)
      await fetchGuestCredentials()
    }
    showSnackbar(`${deleteTarget.type} deleted`)
    deleteDialogOpen.value = false
  } catch (err: unknown) {
    showSnackbar(getApiErrorDetail(err, 'Delete failed'), 'error')
  } finally {
    deleteLoading.value = false
  }
}

// ============================================================================
// Utilities
// ============================================================================

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

// ============================================================================
// Tab change watcher — lazy-load data per section
// ============================================================================

watch(activeTab, (tab) => {
  if (tab === 'iplas' && iplasTokens.value.length === 0) fetchIplasTokens()
  if (tab === 'sfistsp' && sfistspConfigs.value.length === 0) fetchSfistspConfigs()
  if (tab === 'guest' && guestCredentials.value.length === 0) fetchGuestCredentials()
}, { immediate: true })

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(async () => {
  await appConfigStore.fetchConfig()
  populateGeneralForm()
})
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}
</style>
