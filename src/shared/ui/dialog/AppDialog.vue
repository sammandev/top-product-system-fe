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
:deep(.app-dialog) {
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel-strong);
  box-shadow: none;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

:deep(.p-dialog-mask) {
  padding: 1rem;
}

:deep(.p-dialog-mask:has(.app-dialog--fullscreen)) {
  padding: 0;
  align-items: stretch;
}

:deep(.app-dialog .p-dialog-header) {
  border-bottom: 1px solid color-mix(in srgb, var(--app-info-strong) 60%, transparent);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--app-info-strong) 72%, var(--app-info)) 0%,
      var(--app-info) 100%
    );
  color: #fff;
  flex-shrink: 0;
  padding: 0;
}

:deep(.app-dialog .p-dialog-content) {
  padding: 1rem 1.125rem 1.125rem;
  color: var(--app-ink);
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(120, 120, 120, 0.3) transparent;
}

:deep(.app-dialog .p-dialog-footer) {
  border-top: 1px solid var(--app-border);
  background: var(--app-panel-strong);
  flex-shrink: 0;
  padding: 0;
}

:deep(.app-dialog.app-dialog--fullscreen) {
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

:deep(.app-dialog.app-dialog--fullscreen .p-dialog-content) {
  padding: 1rem 1.25rem 1.25rem;
}

:deep(.app-dialog.app-dialog--fullscreen .p-dialog-header),
:deep(.app-dialog.app-dialog--fullscreen .p-dialog-footer) {
  border-color: color-mix(in srgb, var(--app-border) 82%, transparent);
}

:deep(.app-dialog.app-dialog--fullscreen.app-dialog--sticky-header .p-dialog-header) {
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
  min-height: 3.35rem;
  padding: 0.72rem 1rem;
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
  font-size: 1.16rem;
  font-weight: 700;
  line-height: 1.15;
  color: inherit;
}

.app-dialog__description {
  margin: 0;
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.8rem;
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
  border-color: rgba(255, 255, 255, 0.82) !important;
  background: rgba(248, 250, 252, 0.96) !important;
  color: var(--app-info-strong) !important;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.14), 0 8px 18px rgba(2, 132, 199, 0.14);
}

.app-dialog__header-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 0.65rem;
  background: rgba(248, 250, 252, 0.96);
  color: var(--app-info-strong);
  font-size: 1rem;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.14), 0 8px 18px rgba(2, 132, 199, 0.14);
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s, transform 0.15s;
}

.app-dialog__header-btn svg {
  width: 1rem;
  height: 1rem;
}

.app-dialog__header-btn:hover {
  background: #fff;
  color: var(--app-info-strong);
  border-color: #fff;
  transform: translateY(-1px);
}

.app-dialog__header-btn--close:hover {
  color: var(--app-danger);
  border-color: rgba(255, 255, 255, 0.92);
  background: #fff;
}

:deep(.app-dialog .p-dialog-header .app-dialog__header-left h1),
:deep(.app-dialog .p-dialog-header .app-dialog__header-left h2),
:deep(.app-dialog .p-dialog-header .app-dialog__header-left h3) {
  margin: 0;
  color: inherit;
  font-size: 1.16rem;
  line-height: 1.15;
}

:deep(.app-dialog .p-dialog-header .app-dialog__header-left svg) {
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
    min-height: 3rem;
    padding: 0.68rem 0.9rem;
  }

  .app-dialog__title {
    font-size: 1.08rem;
  }

  .app-dialog__footer {
    padding: 0.85rem 1rem;
  }
}
</style>