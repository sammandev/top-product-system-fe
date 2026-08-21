<template>
  <AppFormDialog
    :model-value="modelValue"
    :title="title"
    :description="description"
    size="sm"
    tone="danger"
    :submit-label="confirmLabel"
    :busy-label="busyLabel"
    :busy="busy"
    :submit-disabled="!canConfirm"
    :error="error"
    persistent
    @update:model-value="handleVisibility"
    @submit="$emit('confirm')"
    @cancel="$emit('cancel')"
  >
    <p class="app-confirm-dialog__warning">
      <Icon icon="solar:danger-triangle-bold" aria-hidden="true" />
      <span><slot>This action cannot be undone.</slot></span>
    </p>

    <div v-if="target" class="app-confirm-dialog__target">
      <span class="app-confirm-dialog__target-label">{{ targetLabel }}</span>
      <strong class="app-confirm-dialog__target-value">{{ target }}</strong>
    </div>

    <label v-if="requireTyped" class="app-confirm-dialog__field">
      <span class="app-confirm-dialog__field-label">
        Type <code>{{ typedPhrase }}</code> to confirm
      </span>
      <input
        :value="typedValue"
        :disabled="busy"
        :placeholder="typedPhrase"
        autocomplete="off"
        class="app-confirm-dialog__input"
        type="text"
        @input="$emit('update:typedValue', ($event.target as HTMLInputElement).value)"
      />
    </label>
  </AppFormDialog>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import AppFormDialog from './AppFormDialog.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    description?: string
    target?: string
    targetLabel?: string
    confirmLabel?: string
    busyLabel?: string
    busy?: boolean
    error?: string
    requireTyped?: boolean
    typedPhrase?: string
    typedValue?: string
  }>(),
  {
    description: '',
    target: '',
    targetLabel: 'Target',
    confirmLabel: 'Delete',
    busyLabel: 'Deleting…',
    busy: false,
    error: '',
    requireTyped: false,
    typedPhrase: 'DELETE',
    typedValue: '',
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'update:typedValue', value: string): void
  (event: 'confirm'): void
  (event: 'cancel'): void
}>()

const canConfirm = computed(
  () => !props.requireTyped || props.typedValue.trim().toUpperCase() === props.typedPhrase.toUpperCase(),
)

function handleVisibility(value: boolean) {
  emit('update:modelValue', value)
}
</script>

<style scoped>
.app-confirm-dialog__warning {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  margin: 0;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--app-danger-line);
  border-radius: 0.75rem;
  background: var(--app-danger-soft);
  color: var(--app-danger);
  font-size: 0.82rem;
  line-height: 1.5;
}

.app-confirm-dialog__warning svg {
  flex-shrink: 0;
  width: 1.05rem;
  height: 1.05rem;
  margin-top: 0.1rem;
}

.app-confirm-dialog__target {
  display: grid;
  gap: 0.2rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-surface);
}

.app-confirm-dialog__target-label {
  color: var(--app-muted);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.app-confirm-dialog__target-value {
  color: var(--app-ink);
  font-size: 0.92rem;
  overflow-wrap: anywhere;
}

.app-confirm-dialog__field {
  display: grid;
  gap: 0.35rem;
}

.app-confirm-dialog__field-label {
  color: var(--app-muted);
  font-size: 0.78rem;
}

.app-confirm-dialog__field-label code {
  padding: 0.05rem 0.3rem;
  border-radius: 0.3rem;
  background: var(--app-canvas-strong);
  color: var(--app-ink);
  font-weight: 700;
}

.app-confirm-dialog__input {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--app-border);
  border-radius: 0.65rem;
  background: var(--app-panel);
  color: var(--app-ink);
  font-size: 0.86rem;
}

.app-confirm-dialog__input:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 1px;
}
</style>
