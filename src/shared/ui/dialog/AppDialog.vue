<template>
  <Dialog
    v-bind="attrs"
    :visible="resolvedVisible"
    :modal="modal"
    :dismissableMask="dismissableMask"
    :closable="false"
    :closeOnEscape="closeOnEscape"
    :draggable="draggable"
    :maximizable="false"
    :style="dialogStyle"
    :contentStyle="dialogContentStyle"
    :breakpoints="breakpoints"
    :class="['app-dialog', { 'app-dialog--fullscreen': internalFullscreen, 'app-dialog--sticky-header': stickyHeader }]"
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
            v-if="closable"
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

    <template v-if="showFooter && ($slots.footer || closable)" #footer>
      <div class="app-dialog__footer">
        <slot v-if="$slots.footer" name="footer" />
        <button v-else type="button" class="app-dialog__footer-button" @click="handleClose">
          Close
        </button>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, useAttrs } from 'vue'
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
    showFooter?: boolean
    stickyHeader?: boolean
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
    showFooter: true,
    stickyHeader: false,
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
  width: internalFullscreen.value ? '100vw' : props.width,
  height: internalFullscreen.value ? '100dvh' : undefined,
  maxHeight: internalFullscreen.value ? '100dvh' : undefined,
  margin: internalFullscreen.value ? '0' : undefined,
}))

const dialogContentStyle = computed(() => ({
  paddingTop: internalFullscreen.value ? '0.875rem' : '1rem',
}))

function handleVisibleUpdate(value: boolean) {
  if (!value) {
    internalFullscreen.value = false
  }

  emit('update:modelValue', value)
  emit('update:visible', value)
}

function handleClose() {
  internalFullscreen.value = false
  emit('update:modelValue', false)
  emit('update:visible', false)
}

function toggleFullscreen() {
  internalFullscreen.value = !internalFullscreen.value
}
</script>

<style>
.app-dialog {
  overflow: hidden;
  border: 1px solid var(--app-border);
  background: var(--app-panel-strong);
  box-shadow: none;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.p-dialog-mask {
  padding: 1rem;
}

.p-dialog-mask:has(.app-dialog--fullscreen) {
  padding: 0;
  align-items: stretch;
}

.app-dialog .p-dialog-header {
  border-bottom: 1px solid var(--app-border);
  background: var(--app-panel-strong);
  color: var(--app-ink);
  flex-shrink: 0;
  padding: 0;
}

.app-dialog .p-dialog-content {
  padding: 1rem 1.125rem 1.125rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--app-muted) var(--app-panel-strong);
}

.app-dialog .p-dialog-footer {
  border-top: 1px solid var(--app-border);
  background: var(--app-panel-strong);
  flex-shrink: 0;
  padding: 0;
}

.app-dialog.app-dialog--fullscreen {
  width: 100vw !important;
  max-width: 100vw !important;
  min-width: 100vw !important;
  height: 100dvh;
  max-height: 100dvh;
  margin: 0;
  inset: 0;
  border-width: 0;
  border-radius: 0;
}

.app-dialog.app-dialog--fullscreen .p-dialog-content {
  padding: 1rem 1.25rem 1.25rem;
}

.app-dialog.app-dialog--fullscreen .p-dialog-header,
.app-dialog.app-dialog--fullscreen .p-dialog-footer {
  border-color: var(--app-border);
}

.app-dialog.app-dialog--fullscreen.app-dialog--sticky-header .p-dialog-header {
  position: sticky;
  top: 0;
  z-index: 12;
}

/* Header layout */
.app-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  width: 100%;
  min-height: 1rem;
  padding: 0.5rem 0.5rem;
}

.app-dialog__header-left {
  flex: 1;
  min-width: 0;
}

.app-dialog__header-copy {
  display: grid;
  gap: 0.3rem;
}

.app-dialog__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
  color: inherit;
}

.app-dialog__description {
  margin: 0;
  color: var(--app-muted);
  font-size: 0.76rem;
  line-height: 1.4;
}

.app-dialog__header-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.app-dialog__header-actions > * {
  flex-shrink: 0;
}

.app-dialog__header-actions > button:not(.app-dialog__header-btn) {
  border-color: var(--app-border) !important;
  background: var(--app-panel-strong) !important;
  color: var(--app-ink) !important;
  box-shadow: none !important;
}

.app-dialog__header-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.95rem;
  height: 1.95rem;
  border: 1px solid var(--app-border);
  border-radius: 0.65rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  font-size: 0.95rem;
  box-shadow: none;
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s, transform 0.15s;
}

.app-dialog__header-btn svg {
  width: 1rem;
  height: 1rem;
}

.app-dialog__header-btn:hover {
  background: var(--app-panel);
  color: var(--app-ink);
  border-color: var(--app-accent);
  transform: translateY(-1px);
}

.app-dialog__header-btn--close:hover {
  color: var(--app-danger);
  border-color: var(--app-danger-line);
  background: var(--app-danger-soft);
}

.app-dialog .p-dialog-header .app-dialog__header-left h1,
.app-dialog .p-dialog-header .app-dialog__header-left h2,
.app-dialog .p-dialog-header .app-dialog__header-left h3 {
  margin: 0;
  color: inherit;
  font-size: 1.28rem;
  line-height: 1.1;
}

.app-dialog .p-dialog-header .app-dialog__header-left svg {
  color: currentColor;
}

.app-dialog__body {
  display: grid;
  gap: 1rem;
  min-height: 0;
}

.app-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0.9rem 1.125rem;
}

.app-dialog__footer-button {
  min-height: 2.75rem;
  padding: 0.7rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: 0.8rem;
  background: var(--app-panel);
  color: var(--app-ink);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.app-dialog__footer-button:hover {
  border-color: var(--app-accent);
  background: var(--app-canvas);
}

@media (max-width: 640px) {
  .app-dialog__header {
    min-height: 2.65rem;
    padding: 0.42rem 0.8rem;
  }

  .app-dialog__title {
    font-size: 1.18rem;
  }

  .app-dialog__footer {
    padding: 0.85rem 1rem;
  }
}
</style>