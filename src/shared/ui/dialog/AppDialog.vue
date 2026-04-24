<template>
  <Dialog
    v-bind="attrs"
    :visible="resolvedVisible"
    :modal="modal"
    :dismissableMask="!persistent && dismissableMask"
    :closable="false"
    :closeOnEscape="!persistent && closeOnEscape"
    :draggable="draggable"
    :maximizable="false"
    :style="dialogStyle"
    :breakpoints="breakpoints"
    class="app-dialog"
    @update:visible="handleVisibleUpdate"
    @show="emit('show')"
    @hide="emit('hide')"
  >
    <template #header>
      <div class="app-dialog__header">
        <div class="app-dialog__header-left">
          <slot v-if="$slots.header" name="header" />
          <div v-else-if="title || description" class="app-dialog__header-copy">
            <h2 v-if="title" class="app-dialog__title">{{ title }}</h2>
            <p v-if="description" class="app-dialog__description">{{ description }}</p>
          </div>
        </div>
        <div class="app-dialog__header-actions">
          <slot name="header-actions" />
          <button
            v-if="fullscreenable"
            type="button"
            class="app-dialog__header-btn"
            :title="internalFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
            @click="toggleFullscreen"
          >
            <Icon :icon="internalFullscreen ? 'solar:quit-full-screen-square-linear' : 'solar:full-screen-square-linear'" />
          </button>
          <button
            v-if="!persistent"
            type="button"
            class="app-dialog__header-btn app-dialog__header-btn--close"
            title="Close"
            @click="handleClose"
          >
            <Icon icon="solar:close-circle-linear" />
          </button>
        </div>
      </div>
    </template>

    <div class="app-dialog__body">
      <slot />
    </div>

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref, useAttrs } from 'vue'
import Dialog from 'primevue/dialog'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    visible?: boolean
    title?: string
    description?: string
    width?: string
    fullscreenWidth?: string
    breakpoints?: Record<string, string>
    modal?: boolean
    persistent?: boolean
    dismissableMask?: boolean
    closable?: boolean
    closeOnEscape?: boolean
    draggable?: boolean
    maximizable?: boolean
    fullscreenable?: boolean
  }>(),
  {
    title: '',
    description: '',
    width: 'min(92vw, 42rem)',
    fullscreenWidth: '98vw',
    breakpoints: () => ({ '960px': '86vw', '640px': '94vw' }),
    modal: true,
    persistent: false,
    dismissableMask: true,
    closable: true,
    closeOnEscape: true,
    draggable: false,
    maximizable: false,
    fullscreenable: false,
  },
)

void props

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'update:visible', value: boolean): void
  (event: 'show'): void
  (event: 'hide'): void
}>()

const attrs = useAttrs()

const internalFullscreen = defineModel<boolean>('fullscreen', { default: false })

const resolvedVisible = computed(() => props.modelValue ?? props.visible ?? false)

const dialogStyle = computed(() => ({
  width: internalFullscreen.value ? props.fullscreenWidth : props.width,
}))

function handleVisibleUpdate(value: boolean) {
  emit('update:modelValue', value)
  emit('update:visible', value)
}

function handleClose() {
  emit('update:modelValue', false)
  emit('update:visible', false)
}

function toggleFullscreen() {
  internalFullscreen.value = !internalFullscreen.value
}
</script>

<style scoped>
.app-dialog :deep(.p-dialog) {
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel-strong);
  box-shadow: var(--app-shadow);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.app-dialog :deep(.p-dialog-header) {
  border-bottom: 1px solid var(--app-border);
  background: var(--app-panel-strong);
  flex-shrink: 0;
  padding: 0;
}

.app-dialog :deep(.p-dialog-content) {
  padding-top: 1rem;
  color: var(--app-ink);
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(120, 120, 120, 0.3) transparent;
}

.app-dialog :deep(.p-dialog-footer) {
  border-top: 1px solid var(--app-border);
  background: var(--app-panel-strong);
  flex-shrink: 0;
}

/* Header layout */
.app-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
}

.app-dialog__header-left {
  flex: 1;
  min-width: 0;
}

.app-dialog__header-copy {
  display: grid;
  gap: 0.125rem;
}

.app-dialog__title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--app-ink);
}

.app-dialog__description {
  margin: 0;
  color: var(--app-muted);
  font-size: 0.8125rem;
  line-height: 1.4;
}

.app-dialog__header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.app-dialog__header-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--app-border);
  border-radius: 0.375rem;
  background: transparent;
  color: var(--app-muted);
  font-size: 1.125rem;
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}

.app-dialog__header-btn:hover {
  background: var(--app-panel);
  color: var(--app-ink);
  border-color: var(--app-accent);
}

.app-dialog__header-btn--close:hover {
  color: var(--app-danger);
  border-color: var(--app-danger);
  background: rgba(163, 61, 45, 0.08);
}

.app-dialog__body {
  display: grid;
  gap: 1rem;
}
</style>