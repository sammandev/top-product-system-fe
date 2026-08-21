<template>
  <AppDialog
    :model-value="modelValue"
    :title="title"
    :description="description"
    :width="resolvedWidth"
    :persistent="busy || persistent"
    :dismissable-mask="!busy && !persistent"
    :close-on-escape="!busy"
    :closable="!busy"
    @update:model-value="handleVisibility"
  >
    <form class="app-form-dialog" novalidate @submit.prevent="handleSubmit">
      <p v-if="error" class="app-form-dialog__error" role="alert">
        <Icon icon="solar:danger-triangle-bold" aria-hidden="true" />
        <span>{{ error }}</span>
      </p>

      <slot />

      <!-- Keeps Enter-to-submit working without showing a second button. -->
      <button class="app-form-dialog__submit-proxy" type="submit" tabindex="-1" aria-hidden="true"></button>
    </form>

    <template #footer>
      <div class="app-form-dialog__footer">
        <div class="app-form-dialog__footer-aside">
          <slot name="footer-aside" />
        </div>
        <div class="app-form-dialog__footer-actions">
          <button
            class="app-form-dialog__button app-form-dialog__button--ghost"
            :disabled="busy"
            type="button"
            @click="handleCancel"
          >
            {{ cancelLabel }}
          </button>
          <button
            class="app-form-dialog__button"
            :class="`app-form-dialog__button--${tone}`"
            :disabled="busy || submitDisabled"
            type="button"
            @click="handleSubmit"
          >
            <Icon v-if="busy" class="app-form-dialog__spinner" icon="solar:refresh-linear" aria-hidden="true" />
            {{ busy ? busyLabel : submitLabel }}
          </button>
        </div>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import AppDialog from './AppDialog.vue'

const SIZE_WIDTHS = {
  sm: 'min(92vw, 26rem)',
  md: 'min(92vw, 34rem)',
  lg: 'min(92vw, 46rem)',
  xl: 'min(94vw, 64rem)',
} as const

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    description?: string
    size?: keyof typeof SIZE_WIDTHS
    width?: string
    submitLabel?: string
    busyLabel?: string
    cancelLabel?: string
    tone?: 'primary' | 'danger'
    busy?: boolean
    submitDisabled?: boolean
    persistent?: boolean
    error?: string
  }>(),
  {
    description: '',
    size: 'md',
    width: '',
    submitLabel: 'Save',
    busyLabel: 'Saving…',
    cancelLabel: 'Cancel',
    tone: 'primary',
    busy: false,
    submitDisabled: false,
    persistent: false,
    error: '',
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'submit'): void
  (event: 'cancel'): void
}>()

const resolvedWidth = computed(() => props.width || SIZE_WIDTHS[props.size])

function handleVisibility(value: boolean) {
  if (props.busy) return
  emit('update:modelValue', value)
  if (!value) emit('cancel')
}

function handleCancel() {
  if (props.busy) return
  emit('update:modelValue', false)
  emit('cancel')
}

function handleSubmit() {
  if (props.busy || props.submitDisabled) return
  emit('submit')
}
</script>

<style scoped>
.app-form-dialog {
  display: grid;
  gap: 1rem;
}

.app-form-dialog__submit-proxy {
  display: none;
}

.app-form-dialog__error {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin: 0;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--app-danger-line);
  border-radius: 0.75rem;
  background: var(--app-danger-soft);
  color: var(--app-danger);
  font-size: 0.82rem;
  line-height: 1.45;
}

.app-form-dialog__error svg {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  margin-top: 0.1rem;
}

.app-form-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  /* AppDialog's footer wrapper already supplies the padding. */
  width: 100%;
}

.app-form-dialog__footer-aside {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  color: var(--app-muted);
  font-size: 0.78rem;
}

.app-form-dialog__footer-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}

.app-form-dialog__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-width: 6rem;
  padding: 0.5rem 0.95rem;
  border: 1px solid transparent;
  border-radius: 0.65rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s, opacity 0.15s;
}

.app-form-dialog__button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.app-form-dialog__button--ghost {
  border-color: var(--app-border);
  background: var(--app-panel-strong);
  color: var(--app-ink);
}

.app-form-dialog__button--ghost:not(:disabled):hover {
  border-color: var(--app-accent);
  color: var(--app-accent-strong);
}

.app-form-dialog__button--primary {
  background: var(--app-accent);
  color: #fff;
}

.app-form-dialog__button--primary:not(:disabled):hover {
  background: var(--app-accent-strong);
}

.app-form-dialog__button--danger {
  background: var(--app-danger);
  color: #fff;
}

.app-form-dialog__button--danger:not(:disabled):hover {
  filter: brightness(0.92);
}

.app-form-dialog__spinner {
  width: 0.95rem;
  height: 0.95rem;
  animation: app-form-dialog-spin 0.9s linear infinite;
}

@keyframes app-form-dialog-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .app-form-dialog__footer {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .app-form-dialog__footer-actions {
    margin-left: 0;
  }

  .app-form-dialog__button {
    flex: 1;
  }
}
</style>
