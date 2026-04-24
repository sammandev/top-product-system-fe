<template>
    <DefaultLayout>
        <section class="system-cleanup-page">
        <div class="system-cleanup-header mb-6">
            <div class="system-cleanup-header__copy">
                <div class="system-cleanup-header__icon">
                    <Icon icon="mdi:delete-sweep" class="system-cleanup-header__icon-glyph" />
                </div>
                <div>
                    <h1 class="system-cleanup-header__title">System Cleanup</h1>
                    <p class="system-cleanup-header__subtitle">
                        Remove expired temporary uploads and keep preview storage under control.
                    </p>
                </div>
            </div>
        </div>

        <div v-if="error" class="system-cleanup-notice system-cleanup-notice--error mb-4">
            <div>
                <strong>Cleanup failed</strong>
                <p>{{ error }}</p>
            </div>
            <button type="button" @click="error = ''">Dismiss</button>
        </div>

        <div v-if="successMessage" class="system-cleanup-notice system-cleanup-notice--success mb-4">
            <div>
                <strong>Cleanup completed</strong>
                <p>{{ successMessage }}</p>
            </div>
            <button type="button" @click="successMessage = ''">Dismiss</button>
        </div>

        <div class="system-cleanup-notice system-cleanup-notice--warning mb-4">
            <div>
                <strong>Admin only</strong>
                <p>
                    Cleanup removes temporary uploaded files that exceed the selected TTL window. Use it when preview storage needs to be pruned without touching current work.
                </p>
            </div>
        </div>

        <div class="system-cleanup-layout">
            <section class="system-cleanup-panel system-cleanup-layout__main">
                <div class="system-cleanup-panel__header">
                    <div>
                        <p class="system-cleanup-panel__eyebrow">Cleanup Run</p>
                        <h2>Configuration</h2>
                        <p>Authorize the operation, choose the retention window, then remove stale preview uploads.</p>
                    </div>
                    <Icon icon="mdi:cog" class="system-cleanup-panel__icon" />
                </div>

                <form class="system-cleanup-form" @submit.prevent="handleCleanup">
                    <label class="system-cleanup-field">
                        <span>Admin Key</span>
                        <input v-model="adminKey" type="password" autocomplete="current-password" placeholder="Enter admin authorization key" @input="adminKeyError = ''">
                        <small>Required. Must match the backend admin cleanup key.</small>
                        <small v-if="adminKeyError" class="system-cleanup-field__error">{{ adminKeyError }}</small>
                    </label>

                    <label class="system-cleanup-field">
                        <span>Time To Live (Seconds)</span>
                        <input v-model.number="ttl" type="number" min="1" step="1" placeholder="3600">
                        <small>Uploads older than this value are eligible for removal.</small>
                    </label>

                    <div class="system-cleanup-presets">
                        <button v-for="preset in ttlPresets" :key="preset.value" type="button" class="system-cleanup-preset"
                            :class="{ 'system-cleanup-preset--active': ttl === preset.value }" @click="ttl = preset.value">
                            <strong>{{ preset.label }}</strong>
                            <span>{{ preset.value }}s</span>
                        </button>
                    </div>

                    <div class="system-cleanup-summary-card">
                        <div>
                            <span>Current TTL</span>
                            <strong>{{ ttl }} seconds</strong>
                        </div>
                        <div>
                            <span>Readable Window</span>
                            <strong>{{ formatTTL(ttl) }}</strong>
                        </div>
                    </div>

                    <div class="system-cleanup-actions">
                        <button type="submit" class="system-cleanup-button system-cleanup-button--warning"
                            :disabled="!canProcess">
                            <Icon icon="mdi:delete-sweep" class="system-cleanup-button__icon" />
                            <span>{{ processing ? 'Executing Cleanup...' : 'Execute Cleanup' }}</span>
                        </button>
                    </div>
                </form>
            </section>

            <section class="system-cleanup-layout__side">
                <div v-if="cleanupResult" class="system-cleanup-panel system-cleanup-panel--success">
                    <div class="system-cleanup-panel__header system-cleanup-panel__header--compact">
                        <div>
                            <p class="system-cleanup-panel__eyebrow">Result</p>
                            <h2>Cleanup Results</h2>
                        </div>
                        <Icon icon="mdi:check-circle" class="system-cleanup-panel__icon system-cleanup-panel__icon--success" />
                    </div>

                    <div class="system-cleanup-result-grid">
                        <article class="system-cleanup-result-card">
                            <span>Files Removed</span>
                            <strong>{{ cleanupResult.removed.length }}</strong>
                        </article>
                        <article class="system-cleanup-result-card">
                            <span>TTL Applied</span>
                            <strong>{{ formatTTL(ttl) }}</strong>
                        </article>
                    </div>

                    <div v-if="cleanupResult.removed.length > 0" class="system-cleanup-file-list">
                        <div class="system-cleanup-file-list__title">Removed file IDs</div>
                        <ul>
                            <li v-for="fileId in cleanupResult.removed" :key="fileId" class="font-mono">{{ fileId }}</li>
                        </ul>
                    </div>

                    <div v-else class="system-cleanup-inline-note">
                        <strong>No files removed</strong>
                        <p>All tracked uploads are still inside the active TTL window.</p>
                    </div>
                </div>

                <div v-else class="system-cleanup-panel system-cleanup-panel--cool">
                    <div class="system-cleanup-panel__header">
                        <div>
                            <p class="system-cleanup-panel__eyebrow">Playbook</p>
                            <h2>When To Run Cleanup</h2>
                            <p>Use cleanup after heavy preview sessions or before maintenance windows.</p>
                        </div>
                        <Icon icon="mdi:information" class="system-cleanup-panel__icon" />
                    </div>

                    <ol class="system-cleanup-steps">
                        <li>
                            <strong>Enter the admin key.</strong>
                            <span>The backend rejects cleanup without valid admin authorization.</span>
                        </li>
                        <li>
                            <strong>Choose a TTL window.</strong>
                            <span>Shorter TTL values remove more uploads. Longer values are safer for active users.</span>
                        </li>
                        <li>
                            <strong>Run the sweep once.</strong>
                            <span>Use the result list to verify which upload IDs were actually removed.</span>
                        </li>
                    </ol>
                </div>
            </section>
        </div>

        <section class="system-cleanup-panel system-cleanup-panel--info mt-4">
            <div class="system-cleanup-panel__header">
                <div>
                    <p class="system-cleanup-panel__eyebrow">Reference</p>
                    <h2>Cleanup Rules</h2>
                    <p>These operations only target temporary preview uploads created through the parsing workflow.</p>
                </div>
                <Icon icon="mdi:shield-check" class="system-cleanup-panel__icon" />
            </div>

            <div class="system-cleanup-reference-grid">
                <article class="system-cleanup-reference-card">
                    <span>Scope</span>
                    <p>Temporary files uploaded through <code>/api/upload-preview</code>.</p>
                </article>
                <article class="system-cleanup-reference-card">
                    <span>Default Window</span>
                    <p>3600 seconds, or roughly 1 hour.</p>
                </article>
                <article class="system-cleanup-reference-card">
                    <span>Authorization</span>
                    <p>Requires the backend admin cleanup key to be present and valid.</p>
                </article>
            </div>

            <div class="system-cleanup-ttl-list">
                <div class="system-cleanup-file-list__title">Common TTL values</div>
                <div class="system-cleanup-ttl-grid">
                    <article v-for="preset in ttlPresets" :key="`ttl-${preset.value}`" class="system-cleanup-ttl-card">
                        <strong>{{ preset.label }}</strong>
                        <span>{{ preset.value }} seconds</span>
                    </article>
                </div>
            </div>
        </section>
        </section>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
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

const ttlPresets = [
    { label: '5 min', value: 300 },
    { label: '1 hour', value: 3600 },
    { label: '6 hours', value: 21600 },
    { label: '24 hours', value: 86400 },
]

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
.system-cleanup-page {
    --system-cleanup-warning: var(--app-warning);
    --system-cleanup-warning-soft: var(--app-warning-soft);
    --system-cleanup-warning-line: var(--app-warning-line);
    --system-cleanup-info-soft: var(--app-info-soft);
    --system-cleanup-success-soft: var(--app-success-soft);
    --system-cleanup-success-line: var(--app-success-line);
    --system-cleanup-danger: var(--app-danger);
    --system-cleanup-danger-soft: var(--app-danger-soft);
    --system-cleanup-danger-line: var(--app-danger-line);
}

.font-mono {
    font-family: 'Courier New', monospace;
}

.system-cleanup-header__copy {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.system-cleanup-header__icon {
    display: grid;
    place-items: center;
    width: 3.4rem;
    height: 3.4rem;
    border-radius: 1.1rem;
    background: linear-gradient(135deg, var(--system-cleanup-warning-soft), var(--system-cleanup-danger-soft));
    color: var(--system-cleanup-warning);
    box-shadow: var(--app-shadow-soft);
}

.system-cleanup-header__icon-glyph {
    font-size: 2rem;
}

.system-cleanup-header__title {
    margin: 0 0 0.5rem;
    font-size: clamp(2rem, 3vw, 2.4rem);
    line-height: 1.08;
}

.system-cleanup-header__subtitle {
    margin: 0;
    color: var(--app-muted);
    line-height: 1.55;
}

.system-cleanup-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(20rem, 0.85fr);
    gap: 1rem;
}

.system-cleanup-layout__side {
    display: grid;
    gap: 1rem;
}

.system-cleanup-panel {
    display: grid;
    gap: 1rem;
    border: 1px solid var(--app-border);
    border-radius: 0.75rem;
    padding: 1.2rem;
    background:
        radial-gradient(circle at top right, var(--system-cleanup-warning-soft), transparent 34%),
        var(--app-panel-strong);
    box-shadow: var(--app-shadow-soft);
}

.system-cleanup-panel--success {
    background:
        radial-gradient(circle at top right, var(--system-cleanup-success-soft), transparent 34%),
        var(--app-panel-strong);
}

.system-cleanup-panel--cool,
.system-cleanup-panel--info {
    background:
        radial-gradient(circle at top right, var(--system-cleanup-info-soft), transparent 34%),
        var(--app-panel-strong);
}

.system-cleanup-panel__header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
}

.system-cleanup-panel__header--compact {
    align-items: center;
}

.system-cleanup-panel__icon {
    font-size: 1.75rem;
    color: var(--app-ink);
}

.system-cleanup-panel__icon--success {
    color: var(--system-cleanup-warning);
}

.system-cleanup-panel__eyebrow {
    margin: 0;
    color: var(--app-accent);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: none;
}

.system-cleanup-panel__header h2 {
    margin: 0.2rem 0 0;
    color: var(--app-ink);
    font-size: 1.1rem;
}

.system-cleanup-panel__header p {
    margin: 0.35rem 0 0;
    color: var(--app-muted);
    line-height: 1.55;
}

.system-cleanup-form,
.system-cleanup-reference-grid,
.system-cleanup-result-grid,
.system-cleanup-ttl-grid {
    display: grid;
    gap: 0.9rem;
}

.system-cleanup-reference-grid,
.system-cleanup-result-grid,
.system-cleanup-ttl-grid {
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
}

.system-cleanup-field {
    display: grid;
    gap: 0.45rem;
}

.system-cleanup-field > span,
.system-cleanup-result-card span,
.system-cleanup-reference-card span,
.system-cleanup-file-list__title {
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: none;
    color: var(--app-muted);
}

.system-cleanup-field input {
    width: 100%;
    border: 1px solid var(--app-border);
    border-radius: 1rem;
    background: var(--app-panel-strong);
    color: var(--app-ink);
    box-shadow: var(--app-shadow-soft);
    padding: 0.85rem 0.95rem;
}

.system-cleanup-field input:focus {
    outline: none;
    border-color: var(--app-accent);
    box-shadow: 0 0 0 4px var(--app-ring);
}

.system-cleanup-field small,
.system-cleanup-inline-note p,
.system-cleanup-reference-card p,
.system-cleanup-result-card strong + p,
.system-cleanup-steps span,
.system-cleanup-ttl-card span,
.system-cleanup-file-list li {
    color: var(--app-muted);
    line-height: 1.55;
}

.system-cleanup-field__error {
    color: var(--system-cleanup-danger);
    font-weight: 600;
}

.system-cleanup-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.system-cleanup-preset,
.system-cleanup-result-card,
.system-cleanup-reference-card,
.system-cleanup-ttl-card,
.system-cleanup-summary-card,
.system-cleanup-file-list,
.system-cleanup-inline-note,
.system-cleanup-notice {
    border: 1px solid var(--app-border);
    border-radius: 1rem;
    background: var(--app-panel-strong);
    box-shadow: var(--app-shadow-soft);
}

.system-cleanup-preset {
    display: grid;
    gap: 0.15rem;
    min-width: 7rem;
    padding: 0.8rem 0.9rem;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.system-cleanup-preset strong,
.system-cleanup-result-card strong,
.system-cleanup-reference-card p code,
.system-cleanup-steps strong,
.system-cleanup-inline-note strong,
.system-cleanup-ttl-card strong {
    color: var(--app-ink);
}

.system-cleanup-preset span,
.system-cleanup-ttl-card span {
    font-size: 0.82rem;
}

.system-cleanup-preset--active {
    border-color: var(--system-cleanup-warning);
    background: linear-gradient(180deg, var(--system-cleanup-warning-soft), var(--app-panel-strong));
    box-shadow: 0 0 0 4px var(--system-cleanup-warning-line);
    transform: translateY(-1px);
}

.system-cleanup-summary-card,
.system-cleanup-result-card,
.system-cleanup-reference-card,
.system-cleanup-ttl-card,
.system-cleanup-file-list,
.system-cleanup-inline-note,
.system-cleanup-notice {
    padding: 0.95rem 1rem;
}

.system-cleanup-summary-card {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 0.9rem;
}

.system-cleanup-summary-card > div,
.system-cleanup-result-card,
.system-cleanup-reference-card,
.system-cleanup-ttl-card {
    display: grid;
    gap: 0.25rem;
}

.system-cleanup-summary-card strong,
.system-cleanup-result-card strong {
    color: var(--app-ink);
}

.system-cleanup-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.system-cleanup-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    border: 0;
    border-radius: 999px;
    padding: 0.95rem 1.4rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.system-cleanup-button__icon {
    font-size: 1.1rem;
}

.system-cleanup-button--warning {
    background: linear-gradient(135deg, var(--system-cleanup-warning), var(--system-cleanup-danger));
    color: white;
    box-shadow: 0 18px 30px var(--system-cleanup-danger-soft);
}

.system-cleanup-button:hover:not(:disabled) {
    transform: translateY(-1px);
}

.system-cleanup-button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
}

.system-cleanup-file-list ul,
.system-cleanup-steps {
    display: grid;
    gap: 0.75rem;
    margin: 0;
}

.system-cleanup-file-list ul {
    padding-left: 1.1rem;
}

.system-cleanup-steps {
    padding-left: 1.25rem;
}

.system-cleanup-notice {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
}

.system-cleanup-notice p {
    margin: 0.25rem 0 0;
    color: var(--app-muted);
    line-height: 1.55;
}

.system-cleanup-notice--error {
    background: var(--system-cleanup-danger-soft);
    border-color: var(--system-cleanup-danger-line);
}

.system-cleanup-notice--success {
    background: var(--system-cleanup-success-soft);
    border-color: var(--system-cleanup-success-line);
}

.system-cleanup-notice--warning {
    background: var(--system-cleanup-warning-soft);
    border-color: var(--system-cleanup-warning-line);
}

.system-cleanup-notice button {
    border: 0;
    background: transparent;
    color: var(--app-accent);
    cursor: pointer;
    font-weight: 700;
}

@media (max-width: 960px) {
    .system-cleanup-layout,
    .system-cleanup-reference-grid,
    .system-cleanup-result-grid,
    .system-cleanup-ttl-grid {
        grid-template-columns: 1fr;
    }

    .system-cleanup-header__copy,
    .system-cleanup-panel__header,
    .system-cleanup-notice {
        align-items: flex-start;
    }

    .system-cleanup-header__copy {
        flex-direction: column;
    }
}
</style>
