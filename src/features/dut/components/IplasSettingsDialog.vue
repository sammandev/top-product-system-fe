<template>
  <AppDialog
    :model-value="modelValue"
    width="min(96vw, 44rem)"
    persistent
    :closable="false"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="iplas-settings-dialog__header">
        <div class="iplas-settings-dialog__header-copy">
          <p class="iplas-settings-dialog__eyebrow">Connection Settings</p>
          <h2>iPLAS API Settings</h2>
          <span>Choose whether this workflow follows the system-managed token or a local override for the selected site.</span>
        </div>
        <button type="button" class="iplas-settings-dialog__icon-button" @click="handleCancel">
          Close
        </button>
      </div>
    </template>

    <div class="iplas-settings-dialog__stack">
      <section class="iplas-settings-dialog__section">
        <div class="iplas-settings-dialog__section-copy">
          <strong>Settings Mode</strong>
          <span>Switch between centrally managed tokens and a custom local override for this browser session.</span>
        </div>
        <div class="iplas-settings-dialog__chip-row">
          <button
            type="button"
            class="iplas-settings-dialog__toggle-chip"
            :class="{ 'is-active': localSettingsMode === 'system' }"
            @click="localSettingsMode = 'system'"
          >
            Use System Settings
          </button>
          <button
            type="button"
            class="iplas-settings-dialog__toggle-chip"
            :class="{ 'is-active': localSettingsMode === 'custom' }"
            @click="localSettingsMode = 'custom'"
          >
            Customize Settings
          </button>
        </div>
        <div v-if="localSettingsMode === 'system'" class="iplas-settings-dialog__notice iplas-settings-dialog__notice--info">
          iPLAS default system tokens are managed by the system administrator.
        </div>
      </section>

      <section class="iplas-settings-dialog__section">
        <div class="iplas-settings-dialog__section-copy">
          <strong>Select iPLAS Site</strong>
          <span>Choose the site endpoint whose base IP and token configuration you want to review.</span>
        </div>
        <div class="iplas-settings-dialog__chip-row">
          <button
            v-for="server in servers"
            :key="server.id"
            type="button"
            class="iplas-settings-dialog__site-chip"
            :class="{ 'is-active': localSelectedServerId === server.id }"
            @click="localSelectedServerId = server.id"
          >
            {{ server.name }}
          </button>
        </div>
      </section>

      <section v-if="currentServer" class="iplas-settings-dialog__section iplas-settings-dialog__section--panel">
        <div class="iplas-settings-dialog__section-copy">
          <strong>{{ currentServer.name }} Configuration</strong>
          <span>Review the live address and token that will be used by the iPLAS requests for this site.</span>
        </div>

        <label class="iplas-settings-dialog__field">
          <span>Server IP Address</span>
          <input
            :value="displayBaseIp"
            type="text"
            placeholder="e.g. 10.176.33.89"
            :readonly="localSettingsMode === 'system'"
            :class="{ 'is-readonly': localSettingsMode === 'system' }"
            @input="localBaseIp = ($event.target as HTMLInputElement).value"
          />
          <small>Update the raw host or IP only when custom settings are enabled.</small>
        </label>

        <label class="iplas-settings-dialog__field">
          <span>Access Token</span>
          <textarea
            :value="displayToken"
            rows="3"
            :readonly="localSettingsMode === 'system'"
            :class="{ 'is-readonly': localSettingsMode === 'system' }"
            @input="localToken = ($event.target as HTMLTextAreaElement).value"
          />
          <small v-if="localSettingsMode === 'custom'">Please generate and use your own iPLAS token to access the iPLAS server.</small>
        </label>

        <div
          v-if="localSettingsMode === 'system'"
          class="iplas-settings-dialog__notice"
          :class="currentSystemToken ? 'iplas-settings-dialog__notice--success' : 'iplas-settings-dialog__notice--warning'"
        >
          <template v-if="currentSystemToken">
            System token configured.
          </template>
          <template v-else>
            No active system token configured for {{ currentServer.name }}. Contact the administrator.
          </template>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="iplas-settings-dialog__footer">
        <button
          v-if="localSettingsMode === 'custom'"
          type="button"
          class="iplas-settings-dialog__button iplas-settings-dialog__button--ghost"
          @click="handleReset"
        >
          Reset to Defaults
        </button>
        <div class="iplas-settings-dialog__footer-spacer"></div>
        <button type="button" class="iplas-settings-dialog__button iplas-settings-dialog__button--ghost" @click="handleCancel">
          Cancel
        </button>
        <button type="button" class="iplas-settings-dialog__button iplas-settings-dialog__button--primary" @click="handleSave">
          Save Settings
        </button>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useIplasSettings, type IplasSettingsMode } from '@/features/dut-logs/composables/useIplasSettings'
import { AppDialog } from '@/shared/ui'

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

<style scoped>
.iplas-settings-dialog__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: start;
  width: 100%;
}

.iplas-settings-dialog__header-copy,
.iplas-settings-dialog__stack,
.iplas-settings-dialog__section,
.iplas-settings-dialog__section-copy,
.iplas-settings-dialog__field,
.iplas-settings-dialog__footer {
  display: grid;
  gap: 0.85rem;
}

.iplas-settings-dialog__eyebrow {
  margin: 0;
  color: var(--app-accent);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.iplas-settings-dialog__header-copy h2 {
  margin: 0;
  color: var(--app-ink);
  font-family: var(--app-display);
  font-size: 1.35rem;
}

.iplas-settings-dialog__header-copy span,
.iplas-settings-dialog__section-copy span,
.iplas-settings-dialog__field small,
.iplas-settings-dialog__notice {
  color: var(--app-muted);
  line-height: 1.55;
}

.iplas-settings-dialog__icon-button,
.iplas-settings-dialog__button,
.iplas-settings-dialog__toggle-chip,
.iplas-settings-dialog__site-chip {
  min-height: 2.7rem;
  border-radius: 0.95rem;
  border: 1px solid var(--app-border);
  background: rgba(255, 251, 247, 0.92);
  color: var(--app-ink);
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.iplas-settings-dialog__icon-button,
.iplas-settings-dialog__button {
  padding: 0.7rem 1rem;
}

.iplas-settings-dialog__toggle-chip,
.iplas-settings-dialog__site-chip {
  padding: 0.55rem 0.9rem;
}

.iplas-settings-dialog__icon-button:hover,
.iplas-settings-dialog__button:hover,
.iplas-settings-dialog__toggle-chip:hover,
.iplas-settings-dialog__site-chip:hover {
  transform: translateY(-1px);
}

.iplas-settings-dialog__button--primary,
.iplas-settings-dialog__toggle-chip.is-active,
.iplas-settings-dialog__site-chip.is-active {
  background: linear-gradient(135deg, #145847, #1b6c58);
  border-color: #145847;
  color: white;
}

.iplas-settings-dialog__button--ghost {
  background: rgba(255, 251, 247, 0.92);
}

.iplas-settings-dialog__chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.iplas-settings-dialog__section {
  padding: 1rem;
  border: 1px solid rgba(20, 88, 71, 0.12);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.72);
}

.iplas-settings-dialog__section--panel {
  background: linear-gradient(180deg, rgba(250, 252, 255, 0.92), rgba(255, 255, 255, 0.78));
}

.iplas-settings-dialog__section-copy strong,
.iplas-settings-dialog__field span {
  color: var(--app-ink);
}

.iplas-settings-dialog__field span {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.iplas-settings-dialog__field input,
.iplas-settings-dialog__field textarea {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.95rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  padding: 0.8rem 0.9rem;
  font: inherit;
}

.iplas-settings-dialog__field textarea {
  resize: vertical;
}

.iplas-settings-dialog__field .is-readonly {
  background: rgba(230, 235, 240, 0.7);
}

.iplas-settings-dialog__notice {
  padding: 0.9rem 1rem;
  border-radius: 0.95rem;
  border: 1px solid rgba(40, 96, 163, 0.14);
  background: rgba(40, 96, 163, 0.08);
}

.iplas-settings-dialog__notice--info {
  color: #1f4f89;
}

.iplas-settings-dialog__notice--success {
  border-color: rgba(20, 88, 71, 0.16);
  background: rgba(20, 88, 71, 0.08);
  color: #145847;
}

.iplas-settings-dialog__notice--warning {
  border-color: rgba(169, 102, 34, 0.18);
  background: rgba(169, 102, 34, 0.1);
  color: #88551c;
}

.iplas-settings-dialog__footer {
  width: 100%;
  grid-auto-flow: column;
  align-items: center;
}

.iplas-settings-dialog__footer-spacer {
  min-width: 1px;
}

@media (max-width: 680px) {
  .iplas-settings-dialog__header,
  .iplas-settings-dialog__footer {
    grid-template-columns: minmax(0, 1fr);
    grid-auto-flow: row;
  }
}
</style>
