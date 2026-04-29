<template>
  <DefaultLayout>
    <section class="app-config-page">
      <div class="app-config-header">
        <div class="app-config-header__copy">
          <div class="app-config-header__icon">
            <Icon icon="mdi:cog-outline" />
          </div>
          <div>
            <p class="app-config-header__eyebrow">Admin Control Center</p>
            <h1>App Configuration</h1>
            <p>
              Maintain logo, environment overrides, and guest access from one tabbed admin workspace.
            </p>
          </div>
        </div>
      </div>

      <AppTabs v-model="activeTab" :items="configTabs" scrollable>
          <template #panel-general>
            <div class="app-config-tab-content app-config-tab-content--split">
              <section class="app-config-panel app-config-panel--form">
                <div class="app-config-panel__header">
                  <div>
                    <p class="app-config-panel__eyebrow">Core Metadata</p>
                    <h2>Application Identity</h2>
                  </div>
                </div>

                <div class="app-config-notice app-config-notice--info">
                  <strong>What this changes</strong>
                  <p>Update the application name, version, description, and browser tab title.</p>
                </div>

                <form class="app-config-form" @submit.prevent="handleGeneralSave">
                  <label class="app-config-field">
                    <span>Application Name</span>
                    <input v-model="generalForm.name" type="text" autocomplete="off" placeholder="Top Product System">
                  </label>

                  <label class="app-config-field">
                    <span>Application Version</span>
                    <input v-model="generalForm.version" type="text" autocomplete="off" placeholder="1.0.0">
                  </label>

                  <label class="app-config-field">
                    <span>Description</span>
                    <textarea v-model="generalForm.description" rows="4"
                      placeholder="Short description shown across the app." />
                  </label>

                  <label class="app-config-field">
                    <span>Browser Tab Title</span>
                    <input v-model="generalForm.tab_title" type="text" autocomplete="off"
                      placeholder="Top Product System">
                    <small>Leave empty to use the default app name in the browser tab.</small>
                  </label>

                  <div v-if="generalError" class="app-config-notice app-config-notice--error">
                    <strong>Save failed</strong>
                    <p>{{ generalError }}</p>
                  </div>

                  <div class="app-config-button-row">
                    <button type="submit" class="app-config-button app-config-button--primary"
                      :disabled="generalLoading || !generalFormValid">
                      <Icon icon="mdi:content-save-outline" />
                      <span>{{ generalLoading ? 'Saving...' : 'Save Changes' }}</span>
                    </button>
                    <button type="button" class="app-config-button app-config-button--ghost" :disabled="generalLoading"
                      @click="resetGeneralForm">
                      <Icon icon="mdi:restore" />
                      <span>Reset</span>
                    </button>
                  </div>
                </form>
              </section>

              <aside class="app-config-panel app-config-panel--preview">
                <div class="app-config-panel__header">
                  <div>
                    <p class="app-config-panel__eyebrow">Preview</p>
                    <h2>Current Presentation</h2>
                  </div>
                </div>

                <div class="app-config-preview-card">
                  <span class="app-config-preview-card__label">Application</span>
                  <strong>{{ generalForm.name || appName }}</strong>
                  <small>v{{ generalForm.version || appVersion }}</small>
                  <p>{{ generalForm.description || appDescription }}</p>
                </div>

                <dl class="app-config-meta-list">
                  <div>
                    <dt>Browser tab</dt>
                    <dd>{{ generalForm.tab_title || appName }}</dd>
                  </div>
                  <div v-if="lastUpdated">
                    <dt>Last updated</dt>
                    <dd>{{ lastUpdated }}</dd>
                  </div>
                  <div v-if="updatedBy">
                    <dt>Updated by</dt>
                    <dd>{{ updatedBy }}</dd>
                  </div>
                </dl>
              </aside>
            </div>
          </template>

          <template #panel-branding>
            <div class="app-config-tab-content">
              <section class="app-config-panel">
                <div class="app-config-panel__header">
                  <div>
                    <p class="app-config-panel__eyebrow">Branding</p>
                    <h2>Browser Favicon</h2>
                  </div>
                </div>

                <div class="app-config-notice app-config-notice--info">
                  <strong>Upload guidance</strong>
                  <p>Supported formats: ICO, PNG, SVG. Maximum file size: 1 MB.</p>
                </div>

                <div class="app-config-branding-grid">
                  <div class="app-config-branding-card">
                    <span class="app-config-branding-card__label">Current favicon</span>
                    <div class="app-config-favicon-preview">
                      <img v-if="currentFaviconUrl" :src="currentFaviconUrl" alt="Current favicon">
                      <div v-else class="app-config-favicon-preview__empty">
                        <Icon icon="mdi:image-off-outline" />
                      </div>
                    </div>
                    <p>
                      {{ currentFaviconUrl ? 'Custom favicon is active.' : 'Default favicon is currently in use.' }}
                    </p>

                    <button v-if="currentFaviconUrl" type="button" class="app-config-button app-config-button--danger"
                      :disabled="faviconLoading" @click="handleDeleteFavicon">
                      <Icon icon="mdi:delete-outline" />
                      <span>{{ faviconLoading ? 'Removing...' : 'Remove Favicon' }}</span>
                    </button>
                  </div>

                  <div class="app-config-branding-upload">
                    <AppFilePicker v-model="faviconFile" label="Upload favicon" accept=".ico,.png,.svg"
                      helper-text="Max 1 MB. ICO, PNG, or SVG." :disabled="faviconLoading" :maxFileSizeMb="1" />

                    <div class="app-config-button-row">
                      <button type="button" class="app-config-button app-config-button--primary"
                        :disabled="faviconLoading || !selectedFaviconFile" @click="handleUploadFavicon">
                        <Icon icon="mdi:upload-outline" />
                        <span>{{ faviconLoading ? 'Uploading...' : 'Upload Favicon' }}</span>
                      </button>
                    </div>

                    <div v-if="faviconError" class="app-config-notice app-config-notice--error">
                      <strong>Upload failed</strong>
                      <p>{{ faviconError }}</p>
                    </div>

                    <div v-if="faviconSuccess" class="app-config-notice app-config-notice--success">
                      <strong>Branding updated</strong>
                      <p>{{ faviconSuccess }}</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </template>

          <template #panel-iplas>
            <div class="app-config-tab-content">
              <section class="app-config-panel">
                <div class="app-config-panel__header app-config-panel__header--actions">
                  <div>
                    <p class="app-config-panel__eyebrow">External Overrides</p>
                    <h2>iPLAS Tokens</h2>
                  </div>

                  <button type="button" class="app-config-button app-config-button--primary" @click="openIplasDialog()">
                    <Icon icon="mdi:plus" />
                    <span>Add Token</span>
                  </button>
                </div>

                <div class="app-config-notice app-config-notice--info">
                  <strong>Activation rules</strong>
                  <p>
                    Only one token per site can be active at a time. Active tokens override
                    environment variable configuration.
                  </p>
                </div>

                <AppDataGrid :columns="iplasGridColumns" :rows="iplasTokens" :loading="iplasLoading" paginator
                  :rowsPerPage="10" dataKey="id">
                  <template #cell-is_active="{ data }">
                    <span class="app-config-chip" :class="data.is_active ? 'is-success' : 'is-muted'">
                      {{ data.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </template>

                  <template #cell-token_masked="{ data }">
                    <code class="app-config-code">{{ data.token_masked }}</code>
                  </template>

                  <template #cell-updated_at="{ data }">
                    {{ formatDate(data.updated_at) }}
                  </template>

                  <template #cell-actions="{ data }">
                    <div class="app-config-actions">
                      <button v-if="!data.is_active" type="button" title="Activate token"
                        @click="handleActivateIplas(data.id)">
                        <Icon icon="mdi:check-circle-outline" />
                      </button>
                      <button type="button" title="Edit token" @click="openIplasDialog(data)">
                        <Icon icon="mdi:pencil-outline" />
                      </button>
                      <button type="button" class="is-danger" title="Delete token" @click="confirmDeleteIplas(data)">
                        <Icon icon="mdi:delete-outline" />
                      </button>
                    </div>
                  </template>

                  <template #empty>
                    <div class="app-config-empty-state">
                      <strong>No iPLAS tokens configured.</strong>
                      <p>Create the first site override to activate managed credentials.</p>
                    </div>
                  </template>
                </AppDataGrid>

                <div v-if="iplasError" class="app-config-notice app-config-notice--error">
                  <strong>iPLAS update failed</strong>
                  <p>{{ iplasError }}</p>
                </div>
              </section>
            </div>
          </template>

          <template #panel-sfistsp>
            <div class="app-config-tab-content">
              <section class="app-config-panel">
                <div class="app-config-panel__header app-config-panel__header--actions">
                  <div>
                    <p class="app-config-panel__eyebrow">External Overrides</p>
                    <h2>SFISTSP Configurations</h2>
                  </div>

                  <button type="button" class="app-config-button app-config-button--primary"
                    @click="openSfistspDialog()">
                    <Icon icon="mdi:plus" />
                    <span>Add Config</span>
                  </button>
                </div>

                <div class="app-config-notice app-config-notice--info">
                  <strong>Activation rules</strong>
                  <p>
                    Only one configuration can be active at a time. Active records override
                    environment variables.
                  </p>
                </div>

                <AppDataGrid :columns="sfistspGridColumns" :rows="sfistspConfigs" :loading="sfistspLoading" paginator
                  :rowsPerPage="10" dataKey="id">
                  <template #cell-is_active="{ data }">
                    <span class="app-config-chip" :class="data.is_active ? 'is-success' : 'is-muted'">
                      {{ data.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </template>

                  <template #cell-password_masked="{ data }">
                    <code class="app-config-code">{{ data.password_masked }}</code>
                  </template>

                  <template #cell-timeout="{ data }">
                    {{ data.timeout }}s
                  </template>

                  <template #cell-updated_at="{ data }">
                    {{ formatDate(data.updated_at) }}
                  </template>

                  <template #cell-actions="{ data }">
                    <div class="app-config-actions">
                      <button v-if="!data.is_active" type="button" title="Activate config"
                        @click="handleActivateSfistsp(data.id)">
                        <Icon icon="mdi:check-circle-outline" />
                      </button>
                      <button type="button" title="Edit config" @click="openSfistspDialog(data)">
                        <Icon icon="mdi:pencil-outline" />
                      </button>
                      <button type="button" class="is-danger" title="Delete config" @click="confirmDeleteSfistsp(data)">
                        <Icon icon="mdi:delete-outline" />
                      </button>
                    </div>
                  </template>

                  <template #empty>
                    <div class="app-config-empty-state">
                      <strong>No SFISTSP configurations available.</strong>
                      <p>Add the first configuration when you need an override-managed connection.</p>
                    </div>
                  </template>
                </AppDataGrid>

                <div v-if="sfistspError" class="app-config-notice app-config-notice--error">
                  <strong>SFISTSP update failed</strong>
                  <p>{{ sfistspError }}</p>
                </div>
              </section>
            </div>
          </template>

          <template #panel-guest>
            <div class="app-config-tab-content">
              <section class="app-config-panel">
                <div class="app-config-panel__header app-config-panel__header--actions">
                  <div>
                    <p class="app-config-panel__eyebrow">Access Overrides</p>
                    <h2>Guest Credentials</h2>
                  </div>

                  <button type="button" class="app-config-button app-config-button--primary" @click="openGuestDialog()">
                    <Icon icon="mdi:plus" />
                    <span>Add Guest Account</span>
                  </button>
                </div>

                <div class="app-config-notice app-config-notice--info">
                  <strong>Activation rules</strong>
                  <p>
                    Only one guest credential can be active at a time. Use guest accounts for
                    temporary or kiosk-style access.
                  </p>
                </div>

                <AppDataGrid :columns="guestGridColumns" :rows="guestCredentials" :loading="guestLoading" paginator
                  :rowsPerPage="10" dataKey="id">
                  <template #cell-is_active="{ data }">
                    <span class="app-config-chip" :class="data.is_active ? 'is-success' : 'is-muted'">
                      {{ data.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </template>

                  <template #cell-username_masked="{ data }">
                    <code class="app-config-code">{{ data.username_masked }}</code>
                  </template>

                  <template #cell-updated_at="{ data }">
                    {{ formatDate(data.updated_at) }}
                  </template>

                  <template #cell-actions="{ data }">
                    <div class="app-config-actions">
                      <button v-if="!data.is_active" type="button" title="Activate credential"
                        @click="handleActivateGuest(data.id)">
                        <Icon icon="mdi:check-circle-outline" />
                      </button>
                      <button type="button" title="Edit credential" @click="openGuestDialog(data)">
                        <Icon icon="mdi:pencil-outline" />
                      </button>
                      <button type="button" class="is-danger" title="Delete credential"
                        @click="confirmDeleteGuest(data)">
                        <Icon icon="mdi:delete-outline" />
                      </button>
                    </div>
                  </template>

                  <template #empty>
                    <div class="app-config-empty-state">
                      <strong>No guest credentials configured.</strong>
                      <p>Create a managed guest account when external users need temporary access.</p>
                    </div>
                  </template>
                </AppDataGrid>

                <div v-if="guestError" class="app-config-notice app-config-notice--error">
                  <strong>Guest credential update failed</strong>
                  <p>{{ guestError }}</p>
                </div>
              </section>
            </div>
          </template>
        </AppTabs>

      <AppDialog v-model="iplasDialogOpen" :title="iplasDialogTitle" width="36rem">
        <form class="app-config-dialog-form" @submit.prevent="handleSaveIplas">
          <div class="app-config-field-grid">
            <label class="app-config-field">
              <span>Site</span>
              <input v-model="iplasForm.site" type="text" autocomplete="off" placeholder="PLANT-01">
            </label>

            <label class="app-config-field">
              <span>Base URL</span>
              <input v-model="iplasForm.base_url" type="url" autocomplete="off"
                placeholder="https://iplas.internal.example">
            </label>
          </div>

          <label class="app-config-field">
            <span>Label</span>
            <input v-model="iplasForm.label" type="text" autocomplete="off" placeholder="Optional display label">
          </label>

          <label class="app-config-field">
            <span>Token Value</span>
            <textarea v-model="iplasForm.token_value" rows="5"
              :placeholder="editingIplasId ? 'Leave blank to keep the current token value.' : 'Paste the API token'" />
          </label>

          <div v-if="iplasFormError" class="app-config-notice app-config-notice--error">
            <strong>Save failed</strong>
            <p>{{ iplasFormError }}</p>
          </div>

          <div class="app-config-dialog-footer">
            <button type="button" class="app-config-button app-config-button--ghost" @click="closeIplasDialog">
              Cancel
            </button>
            <button type="submit" class="app-config-button app-config-button--primary" :disabled="iplasSaving">
              {{ iplasSaving ? 'Saving...' : 'Save Token' }}
            </button>
          </div>
        </form>
      </AppDialog>

      <AppDialog v-model="sfistspDialogOpen" :title="sfistspDialogTitle" width="38rem">
        <form class="app-config-dialog-form" @submit.prevent="handleSaveSfistsp">
          <div class="app-config-field-grid">
            <label class="app-config-field">
              <span>Base URL</span>
              <input v-model="sfistspForm.base_url" type="url" autocomplete="off"
                placeholder="https://sfistsp.internal.example">
            </label>

            <label class="app-config-field">
              <span>Program ID</span>
              <input v-model="sfistspForm.program_id" type="text" autocomplete="off" placeholder="program-id">
            </label>
          </div>

          <div class="app-config-field-grid">
            <label class="app-config-field">
              <span>Program Password</span>
              <div class="app-config-password-field">
                <input v-model="sfistspForm.program_password" :type="showSfistspPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  :placeholder="editingSfistspId ? 'Leave blank to keep the current password.' : 'Enter password'">
                <button type="button" @click="showSfistspPassword = !showSfistspPassword">
                  <Icon :icon="showSfistspPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" />
                </button>
              </div>
            </label>

            <label class="app-config-field">
              <span>Timeout (seconds)</span>
              <input v-model="sfistspForm.timeout" type="number" min="1" step="1" autocomplete="off"
                placeholder="30">
            </label>
          </div>

          <label class="app-config-field">
            <span>Label</span>
            <input v-model="sfistspForm.label" type="text" autocomplete="off" placeholder="Optional display label">
          </label>

          <div v-if="sfistspFormError" class="app-config-notice app-config-notice--error">
            <strong>Save failed</strong>
            <p>{{ sfistspFormError }}</p>
          </div>

          <div class="app-config-dialog-footer">
            <button type="button" class="app-config-button app-config-button--ghost" @click="closeSfistspDialog">
              Cancel
            </button>
            <button type="submit" class="app-config-button app-config-button--primary" :disabled="sfistspSaving">
              {{ sfistspSaving ? 'Saving...' : 'Save Config' }}
            </button>
          </div>
        </form>
      </AppDialog>

      <AppDialog v-model="guestDialogOpen" :title="guestDialogTitle" width="38rem">
        <form class="app-config-dialog-form" @submit.prevent="handleSaveGuest">
          <div class="app-config-field-grid">
            <label class="app-config-field">
              <span>Username</span>
              <input v-model="guestForm.username" type="text" autocomplete="off"
                :placeholder="editingGuestId ? 'Leave blank to keep the current username.' : 'guest-user'">
            </label>

            <label class="app-config-field">
              <span>Password</span>
              <div class="app-config-password-field">
                <input v-model="guestForm.password" :type="showGuestPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  :placeholder="editingGuestId ? 'Leave blank to keep the current password.' : 'Enter password'">
                <button type="button" @click="showGuestPassword = !showGuestPassword">
                  <Icon :icon="showGuestPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" />
                </button>
              </div>
            </label>
          </div>

          <label class="app-config-field">
            <span>Label</span>
            <input v-model="guestForm.label" type="text" autocomplete="off" placeholder="Optional display label">
          </label>

          <div v-if="guestFormError" class="app-config-notice app-config-notice--error">
            <strong>Save failed</strong>
            <p>{{ guestFormError }}</p>
          </div>

          <div class="app-config-dialog-footer">
            <button type="button" class="app-config-button app-config-button--ghost" @click="closeGuestDialog">
              Cancel
            </button>
            <button type="submit" class="app-config-button app-config-button--primary" :disabled="guestSaving">
              {{ guestSaving ? 'Saving...' : 'Save Guest' }}
            </button>
          </div>
        </form>
      </AppDialog>

      <AppDialog v-model="deleteDialogOpen" :title="deleteDialogTitle" width="30rem">
        <div class="app-config-dialog-form">
          <div class="app-config-notice app-config-notice--warning">
            <strong>Destructive action</strong>
            <p>{{ deleteDialogMessage }}</p>
          </div>

          <div class="app-config-dialog-footer">
            <button type="button" class="app-config-button app-config-button--ghost" @click="closeDeleteDialog">
              Cancel
            </button>
            <button type="button" class="app-config-button app-config-button--danger" :disabled="deleteLoading"
              @click="handleConfirmDelete">
              {{ deleteLoading ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </AppDialog>
    </section>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { appConfigApi } from '@/core/api/appConfigApi'
import { queryKeys } from '@/core/query'
import { useAppConfigStore } from '@/core/stores/appConfig.store'
import type {
  AppConfigUpdateRequest,
  GuestCredential,
  GuestCredentialCreateRequest,
  GuestCredentialUpdateRequest,
  IplasToken,
  IplasTokenCreateRequest,
  IplasTokenUpdateRequest,
  SfistspConfigCreateRequest,
  SfistspConfigItem,
  SfistspConfigUpdateRequest,
} from '@/core/types'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { useNotification } from '@/shared/composables/useNotification'
import { useTabPersistence } from '@/shared/composables/useTabPersistence'
import AppDataGrid from '@/shared/ui/data-grid/AppDataGrid.vue'
import AppDialog from '@/shared/ui/dialog/AppDialog.vue'
import AppFilePicker from '@/shared/ui/forms/AppFilePicker.vue'
import AppTabs from '@/shared/ui/tabs/AppTabs.vue'

type ConfigTab = 'general' | 'branding' | 'iplas' | 'sfistsp' | 'guest'
type DeleteTarget = 'iplas' | 'sfistsp' | 'guest' | null

type IplasFormState = {
  site: string
  base_url: string
  token_value: string
  label: string
}

type SfistspFormState = {
  base_url: string
  program_id: string
  program_password: string
  timeout: string
  label: string
}

type GuestFormState = {
  username: string
  password: string
  label: string
}

const activeTab = useTabPersistence<ConfigTab>('tab', 'general')
const configTabs: Array<{ label: string; value: ConfigTab }> = [
  { label: 'General', value: 'general' },
  { label: 'Branding', value: 'branding' },
  { label: 'iPLAS', value: 'iplas' },
  { label: 'SFISTSP', value: 'sfistsp' },
  { label: 'Guest', value: 'guest' },
]

const notify = useNotification()
const appConfigStore = useAppConfigStore()
const authStore = useAuthStore()
const queryClient = useQueryClient()
const { config } = storeToRefs(appConfigStore)

const generalLoading = ref(false)
const generalError = ref('')
const generalForm = reactive<AppConfigUpdateRequest>({
  name: '',
  version: '',
  description: '',
  tab_title: '',
})

const faviconLoading = ref(false)
const faviconError = ref('')
const faviconSuccess = ref('')
const faviconFile = ref<File | File[] | null>(null)

const iplasError = ref('')
const iplasTokens = ref<IplasToken[]>([])
const iplasDialogOpen = ref(false)
const iplasSaving = ref(false)
const iplasFormError = ref('')
const editingIplasId = ref<number | null>(null)
const iplasForm = reactive<IplasFormState>({
  site: '',
  base_url: '',
  token_value: '',
  label: '',
})

const sfistspError = ref('')
const sfistspConfigs = ref<SfistspConfigItem[]>([])
const sfistspDialogOpen = ref(false)
const sfistspSaving = ref(false)
const sfistspFormError = ref('')
const editingSfistspId = ref<number | null>(null)
const sfistspForm = reactive<SfistspFormState>({
  base_url: '',
  program_id: '',
  program_password: '',
  timeout: '30',
  label: '',
})
const showSfistspPassword = ref(false)

const guestError = ref('')
const guestCredentials = ref<GuestCredential[]>([])
const guestDialogOpen = ref(false)
const guestSaving = ref(false)
const guestFormError = ref('')
const editingGuestId = ref<number | null>(null)
const guestForm = reactive<GuestFormState>({
  username: '',
  password: '',
  label: '',
})
const showGuestPassword = ref(false)

const deleteDialogOpen = ref(false)
const deleteLoading = ref(false)
const deleteTarget = ref<DeleteTarget>(null)
const deleteTargetId = ref<number | null>(null)
const deleteTargetLabel = ref('')

const iplasGridColumns = [
  { key: 'site', field: 'site', header: 'Site' },
  { key: 'label', field: 'label', header: 'Label' },
  { key: 'token_masked', field: 'token_masked', header: 'Token' },
  { key: 'is_active', field: 'is_active', header: 'Status' },
  { key: 'updated_at', field: 'updated_at', header: 'Updated' },
  { key: 'actions', field: 'actions', header: 'Actions', sortable: false },
]

const sfistspGridColumns = [
  { key: 'base_url', field: 'base_url', header: 'Base URL' },
  { key: 'program_id', field: 'program_id', header: 'Program ID' },
  { key: 'label', field: 'label', header: 'Label' },
  { key: 'password_masked', field: 'password_masked', header: 'Password' },
  { key: 'timeout', field: 'timeout', header: 'Timeout' },
  { key: 'is_active', field: 'is_active', header: 'Status' },
  { key: 'updated_at', field: 'updated_at', header: 'Updated' },
  { key: 'actions', field: 'actions', header: 'Actions', sortable: false },
]

const guestGridColumns = [
  { key: 'username_masked', field: 'username_masked', header: 'Username' },
  { key: 'label', field: 'label', header: 'Label' },
  { key: 'is_active', field: 'is_active', header: 'Status' },
  { key: 'updated_at', field: 'updated_at', header: 'Updated' },
  { key: 'actions', field: 'actions', header: 'Actions', sortable: false },
]

const iplasTokensQuery = useQuery({
  queryKey: queryKeys.appConfig.iplasTokens(),
  queryFn: appConfigApi.getIplasTokens,
  enabled: computed(() => activeTab.value === 'iplas'),
})

const sfistspConfigsQuery = useQuery({
  queryKey: queryKeys.appConfig.sfistspConfigs(),
  queryFn: appConfigApi.getSfistspConfigs,
  enabled: computed(() => activeTab.value === 'sfistsp'),
})

const guestCredentialsQuery = useQuery({
  queryKey: queryKeys.appConfig.guestCredentials(),
  queryFn: appConfigApi.getGuestCredentials,
  enabled: computed(() => activeTab.value === 'guest'),
})

const iplasLoading = computed(() => iplasTokensQuery.isFetching.value)
const sfistspLoading = computed(() => sfistspConfigsQuery.isFetching.value)
const guestLoading = computed(() => guestCredentialsQuery.isFetching.value)

const appName = computed(() => config.value?.name || 'Top Product System')
const appVersion = computed(() => config.value?.version || '')
const appDescription = computed(() => config.value?.description || 'No description configured yet.')
const lastUpdated = computed(() => formatDate(config.value?.updated_at || null))
const updatedBy = computed(() => config.value?.updated_by || authStore.user?.username || '')

const generalFormValid = computed(() => {
  return Boolean(generalForm.name?.trim() && generalForm.version?.trim())
})

const selectedFaviconFile = computed<File | null>(() => {
  if (Array.isArray(faviconFile.value)) {
    return faviconFile.value[0] ?? null
  }
  return faviconFile.value instanceof File ? faviconFile.value : null
})

const currentFaviconUrl = computed(() => {
  return config.value?.favicon_url || ''
})

const iplasDialogTitle = computed(() => {
  return editingIplasId.value ? 'Edit iPLAS Token' : 'Add iPLAS Token'
})

const sfistspDialogTitle = computed(() => {
  return editingSfistspId.value ? 'Edit SFISTSP Configuration' : 'Add SFISTSP Configuration'
})

const guestDialogTitle = computed(() => {
  return editingGuestId.value ? 'Edit Guest Credential' : 'Add Guest Credential'
})

const deleteDialogTitle = computed(() => {
  if (deleteTarget.value === 'iplas') return 'Delete iPLAS Token'
  if (deleteTarget.value === 'sfistsp') return 'Delete SFISTSP Configuration'
  if (deleteTarget.value === 'guest') return 'Delete Guest Credential'
  return 'Delete Configuration'
})

const deleteDialogMessage = computed(() => {
  if (!deleteTarget.value) return 'This action cannot be undone.'

  const label = deleteTargetLabel.value || 'this configuration'
  if (deleteTarget.value === 'iplas') {
    return `Delete the iPLAS token for ${label}? This action cannot be undone.`
  }
  if (deleteTarget.value === 'sfistsp') {
    return `Delete the SFISTSP configuration for ${label}? This action cannot be undone.`
  }
  return `Delete the guest credential for ${label}? This action cannot be undone.`
})

function populateGeneralForm() {
  generalForm.name = config.value?.name || ''
  generalForm.version = config.value?.version || ''
  generalForm.description = config.value?.description || ''
  generalForm.tab_title = config.value?.tab_title || ''
}

function resetGeneralForm() {
  generalError.value = ''
  populateGeneralForm()
}

async function handleGeneralSave() {
  generalError.value = ''
  generalLoading.value = true

  try {
    const payload: AppConfigUpdateRequest = {
      name: generalForm.name.trim(),
      version: generalForm.version.trim(),
      description: generalForm.description?.trim() || '',
      tab_title: generalForm.tab_title?.trim() || '',
    }

    const updatedConfig = await appConfigApi.update(payload)
    appConfigStore.config = updatedConfig
    await queryClient.invalidateQueries({ queryKey: queryKeys.appConfig.general() })
    populateGeneralForm()
    showSnackbar('Application configuration updated successfully.', 'success')
  } catch (error) {
    generalError.value = getErrorMessage(error, 'Failed to update application configuration.')
  } finally {
    generalLoading.value = false
  }
}

async function handleUploadFavicon() {
  const file = selectedFaviconFile.value
  if (!file) {
    faviconError.value = 'Select a favicon file before uploading.'
    return
  }

  faviconLoading.value = true
  faviconError.value = ''
  faviconSuccess.value = ''

  try {
    const response = await appConfigApi.uploadFavicon(file)
    appConfigStore.config = {
      ...(appConfigStore.config || {}),
      favicon_url: response.favicon_url,
    }
    await queryClient.invalidateQueries({ queryKey: queryKeys.appConfig.general() })
    faviconFile.value = null
    faviconSuccess.value = 'Favicon uploaded successfully.'
    showSnackbar('Favicon uploaded successfully.', 'success')
  } catch (error) {
    faviconError.value = getErrorMessage(error, 'Failed to upload favicon.')
  } finally {
    faviconLoading.value = false
  }
}

async function handleDeleteFavicon() {
  faviconLoading.value = true
  faviconError.value = ''
  faviconSuccess.value = ''

  try {
    await appConfigApi.deleteFavicon()
    appConfigStore.config = {
      ...(appConfigStore.config || {}),
      favicon_url: null,
    }
    await queryClient.invalidateQueries({ queryKey: queryKeys.appConfig.general() })
    faviconSuccess.value = 'Favicon removed successfully.'
    showSnackbar('Favicon removed successfully.', 'success')
  } catch (error) {
    faviconError.value = getErrorMessage(error, 'Failed to remove favicon.')
  } finally {
    faviconLoading.value = false
  }
}

async function fetchIplasTokens() {
  iplasError.value = ''
  const result = await iplasTokensQuery.refetch()
  if (result.error) {
    iplasError.value = getErrorMessage(result.error, 'Failed to load iPLAS tokens.')
  }
}

function openIplasDialog(token?: IplasToken) {
  iplasFormError.value = ''
  editingIplasId.value = token?.id || null
  iplasForm.site = token?.site || ''
  iplasForm.base_url = token?.base_url || ''
  iplasForm.token_value = ''
  iplasForm.label = token?.label || ''
  iplasDialogOpen.value = true
}

function closeIplasDialog() {
  iplasDialogOpen.value = false
  editingIplasId.value = null
  iplasForm.site = ''
  iplasForm.base_url = ''
  iplasForm.token_value = ''
  iplasForm.label = ''
  iplasFormError.value = ''
}

async function handleSaveIplas() {
  if (!iplasForm.site?.trim()) {
    iplasFormError.value = 'Site is required.'
    return
  }

  if (!iplasForm.base_url?.trim()) {
    iplasFormError.value = 'Base URL is required.'
    return
  }

  if (!editingIplasId.value && !iplasForm.token_value?.trim()) {
    iplasFormError.value = 'Token value is required.'
    return
  }

  iplasSaving.value = true
  iplasFormError.value = ''

  try {
    if (editingIplasId.value) {
      const payload: IplasTokenUpdateRequest = {
        site: iplasForm.site.trim(),
        base_url: iplasForm.base_url.trim(),
        token_value: iplasForm.token_value?.trim() || undefined,
        label: iplasForm.label.trim() || null,
      }
      await appConfigApi.updateIplasToken(editingIplasId.value, payload)
      showSnackbar('iPLAS token updated successfully.', 'success')
    } else {
      const payload: IplasTokenCreateRequest = {
        site: iplasForm.site.trim(),
        base_url: iplasForm.base_url.trim(),
        token_value: iplasForm.token_value?.trim() || '',
        label: iplasForm.label.trim() || null,
      }
      await appConfigApi.createIplasToken(payload)
      showSnackbar('iPLAS token created successfully.', 'success')
    }

    closeIplasDialog()
    await queryClient.invalidateQueries({ queryKey: queryKeys.appConfig.iplasTokens() })
  } catch (error) {
    iplasFormError.value = getErrorMessage(error, 'Failed to save iPLAS token.')
  } finally {
    iplasSaving.value = false
  }
}

async function handleActivateIplas(id: number) {
  try {
    await appConfigApi.activateIplasToken(id)
    showSnackbar('iPLAS token activated.', 'success')
    await queryClient.invalidateQueries({ queryKey: queryKeys.appConfig.iplasTokens() })
  } catch (error) {
    iplasError.value = getErrorMessage(error, 'Failed to activate iPLAS token.')
  }
}

function confirmDeleteIplas(token: IplasToken) {
  deleteTarget.value = 'iplas'
  deleteTargetId.value = token.id
  deleteTargetLabel.value = token.site
  deleteDialogOpen.value = true
}

async function fetchSfistspConfigs() {
  sfistspError.value = ''
  const result = await sfistspConfigsQuery.refetch()
  if (result.error) {
    sfistspError.value = getErrorMessage(result.error, 'Failed to load SFISTSP configurations.')
  }
}

function openSfistspDialog(configItem?: SfistspConfigItem) {
  sfistspFormError.value = ''
  editingSfistspId.value = configItem?.id || null
  sfistspForm.base_url = configItem?.base_url || ''
  sfistspForm.program_id = configItem?.program_id || ''
  sfistspForm.program_password = ''
  sfistspForm.timeout = String(configItem?.timeout ?? 30)
  sfistspForm.label = configItem?.label || ''
  showSfistspPassword.value = false
  sfistspDialogOpen.value = true
}

function closeSfistspDialog() {
  sfistspDialogOpen.value = false
  editingSfistspId.value = null
  sfistspForm.base_url = ''
  sfistspForm.program_id = ''
  sfistspForm.program_password = ''
  sfistspForm.timeout = '30'
  sfistspForm.label = ''
  sfistspFormError.value = ''
  showSfistspPassword.value = false
}

async function handleSaveSfistsp() {
  if (!sfistspForm.base_url?.trim()) {
    sfistspFormError.value = 'Base URL is required.'
    return
  }

  if (!sfistspForm.program_id?.trim()) {
    sfistspFormError.value = 'Program ID is required.'
    return
  }

  if (!editingSfistspId.value && !sfistspForm.program_password?.trim()) {
    sfistspFormError.value = 'Program password is required.'
    return
  }

  const timeoutValue = Number.parseInt(sfistspForm.timeout, 10)
  if (Number.isNaN(timeoutValue) || timeoutValue <= 0) {
    sfistspFormError.value = 'Timeout must be greater than zero.'
    return
  }

  sfistspSaving.value = true
  sfistspFormError.value = ''

  try {
    if (editingSfistspId.value) {
      const payload: SfistspConfigUpdateRequest = {
        base_url: sfistspForm.base_url.trim(),
        program_id: sfistspForm.program_id.trim(),
        program_password: sfistspForm.program_password?.trim() || undefined,
        timeout: timeoutValue,
        label: sfistspForm.label.trim() || null,
      }
      await appConfigApi.updateSfistspConfig(editingSfistspId.value, payload)
      showSnackbar('SFISTSP configuration updated successfully.', 'success')
    } else {
      const payload: SfistspConfigCreateRequest = {
        base_url: sfistspForm.base_url.trim(),
        program_id: sfistspForm.program_id.trim(),
        program_password: sfistspForm.program_password?.trim() || '',
        timeout: timeoutValue,
        label: sfistspForm.label.trim() || null,
      }
      await appConfigApi.createSfistspConfig(payload)
      showSnackbar('SFISTSP configuration created successfully.', 'success')
    }

    closeSfistspDialog()
    await queryClient.invalidateQueries({ queryKey: queryKeys.appConfig.sfistspConfigs() })
  } catch (error) {
    sfistspFormError.value = getErrorMessage(error, 'Failed to save SFISTSP configuration.')
  } finally {
    sfistspSaving.value = false
  }
}

async function handleActivateSfistsp(id: number) {
  try {
    await appConfigApi.activateSfistspConfig(id)
    showSnackbar('SFISTSP configuration activated.', 'success')
    await queryClient.invalidateQueries({ queryKey: queryKeys.appConfig.sfistspConfigs() })
  } catch (error) {
    sfistspError.value = getErrorMessage(error, 'Failed to activate SFISTSP configuration.')
  }
}

function confirmDeleteSfistsp(configItem: SfistspConfigItem) {
  deleteTarget.value = 'sfistsp'
  deleteTargetId.value = configItem.id
  deleteTargetLabel.value = configItem.label || configItem.program_id
  deleteDialogOpen.value = true
}

async function fetchGuestCredentials() {
  guestError.value = ''
  const result = await guestCredentialsQuery.refetch()
  if (result.error) {
    guestError.value = getErrorMessage(result.error, 'Failed to load guest credentials.')
  }
}

function openGuestDialog(credential?: GuestCredential) {
  guestFormError.value = ''
  editingGuestId.value = credential?.id || null
  guestForm.username = ''
  guestForm.password = ''
  guestForm.label = credential?.label || ''
  showGuestPassword.value = false
  guestDialogOpen.value = true
}

function closeGuestDialog() {
  guestDialogOpen.value = false
  editingGuestId.value = null
  guestForm.username = ''
  guestForm.password = ''
  guestForm.label = ''
  guestFormError.value = ''
  showGuestPassword.value = false
}

async function handleSaveGuest() {
  if (!editingGuestId.value && !guestForm.username?.trim()) {
    guestFormError.value = 'Username is required.'
    return
  }

  if (!editingGuestId.value && !guestForm.password?.trim()) {
    guestFormError.value = 'Password is required.'
    return
  }

  guestSaving.value = true
  guestFormError.value = ''

  try {
    if (editingGuestId.value) {
      const payload: GuestCredentialUpdateRequest = {
        username: guestForm.username?.trim() || undefined,
        password: guestForm.password?.trim() || undefined,
        label: guestForm.label.trim() || null,
      }
      await appConfigApi.updateGuestCredential(editingGuestId.value, payload)
      showSnackbar('Guest credential updated successfully.', 'success')
    } else {
      const payload: GuestCredentialCreateRequest = {
        username: guestForm.username.trim(),
        password: guestForm.password?.trim() || '',
        label: guestForm.label.trim() || null,
      }
      await appConfigApi.createGuestCredential(payload)
      showSnackbar('Guest credential created successfully.', 'success')
    }

    closeGuestDialog()
    await queryClient.invalidateQueries({ queryKey: queryKeys.appConfig.guestCredentials() })
  } catch (error) {
    guestFormError.value = getErrorMessage(error, 'Failed to save guest credential.')
  } finally {
    guestSaving.value = false
  }
}

async function handleActivateGuest(id: number) {
  try {
    await appConfigApi.activateGuestCredential(id)
    showSnackbar('Guest credential activated.', 'success')
    await queryClient.invalidateQueries({ queryKey: queryKeys.appConfig.guestCredentials() })
  } catch (error) {
    guestError.value = getErrorMessage(error, 'Failed to activate guest credential.')
  }
}

function confirmDeleteGuest(credential: GuestCredential) {
  deleteTarget.value = 'guest'
  deleteTargetId.value = credential.id
  deleteTargetLabel.value = credential.label || credential.username_masked
  deleteDialogOpen.value = true
}

function closeDeleteDialog() {
  deleteDialogOpen.value = false
  deleteTarget.value = null
  deleteTargetId.value = null
  deleteTargetLabel.value = ''
}

async function handleConfirmDelete() {
  if (!deleteTarget.value || !deleteTargetId.value) {
    return
  }

  deleteLoading.value = true

  try {
    if (deleteTarget.value === 'iplas') {
      await appConfigApi.deleteIplasToken(deleteTargetId.value)
      showSnackbar('iPLAS token deleted.', 'success')
      await queryClient.invalidateQueries({ queryKey: queryKeys.appConfig.iplasTokens() })
    }

    if (deleteTarget.value === 'sfistsp') {
      await appConfigApi.deleteSfistspConfig(deleteTargetId.value)
      showSnackbar('SFISTSP configuration deleted.', 'success')
      await queryClient.invalidateQueries({ queryKey: queryKeys.appConfig.sfistspConfigs() })
    }

    if (deleteTarget.value === 'guest') {
      await appConfigApi.deleteGuestCredential(deleteTargetId.value)
      showSnackbar('Guest credential deleted.', 'success')
      await queryClient.invalidateQueries({ queryKey: queryKeys.appConfig.guestCredentials() })
    }

    closeDeleteDialog()
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to delete configuration.')

    if (deleteTarget.value === 'iplas') iplasError.value = message
    if (deleteTarget.value === 'sfistsp') sfistspError.value = message
    if (deleteTarget.value === 'guest') guestError.value = message
  } finally {
    deleteLoading.value = false
  }
}

function showSnackbar(message: string, type: 'success' | 'error' = 'success') {
  if (type === 'success') {
    notify.showSuccess(message)
  } else {
    notify.showError(message)
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'object' && error && 'response' in error) {
    const maybeResponse = error as {
      response?: { data?: { detail?: string | { message?: string } } }
    }
    const detail = maybeResponse.response?.data?.detail

    if (typeof detail === 'string') {
      return detail
    }

    if (detail && typeof detail === 'object' && 'message' in detail) {
      return String(detail.message || fallback)
    }
  }

  return fallback
}

function formatDate(value: string | null | undefined) {
  if (!value) return ''

  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

watch(
  () => iplasTokensQuery.data.value,
  (response) => {
    if (response) {
      iplasTokens.value = response.tokens
    }
  },
  { immediate: true },
)

watch(
  () => sfistspConfigsQuery.data.value,
  (response) => {
    if (response) {
      sfistspConfigs.value = response.configs
    }
  },
  { immediate: true },
)

watch(
  () => guestCredentialsQuery.data.value,
  (response) => {
    if (response) {
      guestCredentials.value = response.credentials
    }
  },
  { immediate: true },
)

watch(
  activeTab,
  async (tabValue) => {
    if (tabValue === 'iplas' && iplasTokens.value.length === 0 && !iplasLoading.value) {
      await fetchIplasTokens()
    }

    if (tabValue === 'sfistsp' && sfistspConfigs.value.length === 0 && !sfistspLoading.value) {
      await fetchSfistspConfigs()
    }

    if (tabValue === 'guest' && guestCredentials.value.length === 0 && !guestLoading.value) {
      await fetchGuestCredentials()
    }
  },
  { immediate: true },
)

onMounted(async () => {
  await appConfigStore.fetchConfig()
  populateGeneralForm()
})
</script>

<style scoped>
.app-config-page {
  --app-config-accent: var(--app-accent);
  --app-config-accent-strong: var(--app-accent-strong);
  --app-config-accent-soft: var(--app-accent-soft);
  --app-config-accent-line: var(--app-ring);
  --app-config-info: var(--app-info);
  --app-config-info-soft: var(--app-info-soft);
  --app-config-info-line: var(--app-info-line);
  --app-config-success: var(--app-success);
  --app-config-success-soft: var(--app-success-soft);
  --app-config-success-line: var(--app-success-line);
  --app-config-warning: var(--app-warning);
  --app-config-warning-soft: var(--app-warning-soft);
  --app-config-warning-line: var(--app-warning-line);
  --app-config-danger: var(--app-danger);
  --app-config-danger-soft: var(--app-danger-soft);
  --app-config-danger-line: var(--app-danger-line);
}

.app-config-header {
  margin-bottom: 1.5rem;
}

.app-config-header__copy {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.app-config-header__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, var(--app-config-accent), var(--app-config-info));
  color: white;
  font-size: 1.4rem;
  box-shadow: 0 18px 32px var(--app-config-accent-soft);
}

.app-config-header__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  letter-spacing: 0;
  text-transform: none;
  color: var(--app-config-accent);
  font-weight: 700;
}

.app-config-header h1 {
  margin: 0;
  font-size: clamp(1.8rem, 2.5vw, 2.35rem);
  font-weight: 700;
  color: var(--app-ink);
}

.app-config-header p:last-child {
  max-width: 44rem;
  margin: 0.45rem 0 0;
  color: var(--app-muted);
  line-height: 1.6;
}

.app-config-tab-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.app-config-tab-content--split {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(18rem, 1fr);
  align-items: start;
}

.app-config-panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  border: 1px solid var(--app-border);
  border-radius: 1.25rem;
  background: linear-gradient(180deg, var(--app-panel-strong), var(--app-panel));
}

.app-config-panel--preview {
  position: sticky;
  top: 1rem;
}

.app-config-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.app-config-panel__header--actions {
  flex-wrap: wrap;
}

.app-config-panel__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  letter-spacing: 0;
  text-transform: none;
  color: var(--app-config-accent);
  font-weight: 700;
}

.app-config-panel h2 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--app-ink);
}

.app-config-form,
.app-config-dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.app-config-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.app-config-field span {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--app-ink);
}

.app-config-field small {
  color: var(--app-muted);
  line-height: 1.45;
}

.app-config-field input,
.app-config-field textarea {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  padding: 0.78rem 0.95rem;
  font: inherit;
  color: var(--app-ink);
  background: var(--app-panel-strong);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.app-config-field input:focus,
.app-config-field textarea:focus {
  outline: none;
  border-color: var(--app-config-accent);
  box-shadow: 0 0 0 4px var(--app-config-accent-soft);
}

.app-config-field textarea {
  resize: vertical;
  min-height: 8rem;
}

.app-config-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.app-config-password-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  padding: 0 0.35rem 0 0;
  background: var(--app-panel-strong);
}

.app-config-password-field input {
  border: 0;
  box-shadow: none;
}

.app-config-password-field button {
  border: 0;
  background: transparent;
  color: var(--app-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
}

.app-config-password-field:focus-within {
  border-color: var(--app-config-accent);
  box-shadow: 0 0 0 4px var(--app-config-accent-soft);
}

.app-config-password-field:focus-within input {
  box-shadow: none;
}

.app-config-notice {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.95rem 1rem;
  border-radius: 1rem;
  border: 1px solid transparent;
}

.app-config-notice strong {
  color: inherit;
}

.app-config-notice p {
  margin: 0;
  line-height: 1.55;
}

.app-config-notice--info {
  background: var(--app-config-info-soft);
  border-color: var(--app-config-info-line);
  color: var(--app-ink);
}

.app-config-notice--success {
  background: var(--app-config-success-soft);
  border-color: var(--app-config-success-line);
  color: var(--app-config-success);
}

.app-config-notice--error {
  background: var(--app-config-danger-soft);
  border-color: var(--app-config-danger-line);
  color: var(--app-config-danger);
}

.app-config-notice--warning {
  background: var(--app-config-warning-soft);
  border-color: var(--app-config-warning-line);
  color: var(--app-config-warning);
}

.app-config-button-row,
.app-config-dialog-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: flex-end;
}

.app-config-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding: 0.7rem 1rem;
  border: 1px solid transparent;
  border-radius: 0.9rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.app-config-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.app-config-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.app-config-button--primary {
  background: linear-gradient(135deg, var(--app-config-accent), var(--app-config-info));
  box-shadow: 0 18px 28px var(--app-config-accent-soft);
  color: white;
}

.app-config-button--ghost {
  background: var(--app-panel-strong);
  border-color: var(--app-border);
  color: var(--app-ink);
}

.app-config-button--danger {
  background: var(--app-config-danger-soft);
  border-color: var(--app-config-danger-line);
  color: var(--app-config-danger);
}

.app-config-preview-card {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1rem 1.25rem;
  border-radius: 1rem;
  background: linear-gradient(145deg, var(--app-config-accent-strong), var(--app-config-info));
  color: white;
}

.app-config-preview-card__label,
.app-config-branding-card__label {
  font-size: 0.75rem;
  letter-spacing: 0;
  text-transform: none;
  color: rgb(226 232 240 / 0.72);
}

.app-config-preview-card strong {
  font-size: 1.2rem;
}

.app-config-preview-card small,
.app-config-preview-card p {
  margin: 0;
  color: rgb(226 232 240 / 0.84);
}

.app-config-meta-list {
  display: grid;
  gap: 0.85rem;
  margin: 0;
}

.app-config-meta-list div {
  padding-top: 0.85rem;
  border-top: 1px solid var(--app-border);
}

.app-config-meta-list dt {
  margin-bottom: 0.25rem;
  font-size: 0.78rem;
  letter-spacing: 0;
  text-transform: none;
  color: var(--app-muted);
}

.app-config-meta-list dd {
  margin: 0;
  font-weight: 600;
  color: var(--app-ink);
}

.app-config-branding-grid {
  display: grid;
  grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr);
  gap: 1rem;
}

.app-config-branding-card,
.app-config-branding-upload {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 1rem;
  background: var(--app-panel);
  border: 1px solid var(--app-border);
}

.app-config-branding-card p {
  margin: 0;
  color: var(--app-muted);
}

.app-config-favicon-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  border-radius: 1rem;
  background: var(--app-panel-strong);
  border: 1px solid var(--app-border);
  overflow: hidden;
}

.app-config-favicon-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.app-config-favicon-preview__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: var(--app-muted);
}

.app-config-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.35rem;
}

.app-config-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  cursor: pointer;
}

.app-config-actions button.is-danger {
  color: var(--app-config-danger);
  border-color: var(--app-config-danger-line);
  background: var(--app-config-danger-soft);
}

.app-config-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 5.5rem;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.app-config-chip.is-success {
  background: var(--app-config-success-soft);
  color: var(--app-config-success);
}

.app-config-chip.is-muted {
  background: var(--app-canvas-strong);
  color: var(--app-muted);
}

.app-config-code {
  font-size: 0.8rem;
  font-family: 'Consolas', 'Monaco', monospace;
}

.app-config-empty-state {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
  color: var(--app-muted);
}

.app-config-empty-state p {
  margin: 0;
}

@media (max-width: 1100px) {

  .app-config-tab-content--split,
  .app-config-branding-grid,
  .app-config-field-grid {
    grid-template-columns: 1fr;
  }

  .app-config-panel--preview {
    position: static;
  }
}

@media (max-width: 720px) {
  .app-config-header__copy {
    flex-direction: column;
  }

  .app-config-panel {
    padding: 1rem;
  }

  .app-config-panel__header,
  .app-config-button-row,
  .app-config-dialog-footer {
    align-items: stretch;
  }

  .app-config-button {
    width: 100%;
  }

  .app-config-actions {
    justify-content: flex-start;
  }
}
</style>
