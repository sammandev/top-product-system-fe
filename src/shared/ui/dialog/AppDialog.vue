<template>
  <Dialog
    v-bind="attrs"
    :visible="resolvedVisible"
    :modal="modal"
    :dismissableMask="!persistent && dismissableMask"
    :closable="!persistent && closable"
    :closeOnEscape="!persistent && closeOnEscape"
    :draggable="draggable"
    :maximizable="maximizable"
    :style="{ width }"
    :breakpoints="breakpoints"
    class="app-dialog"
    @update:visible="handleVisibleUpdate"
    @show="emit('show')"
    @hide="emit('hide')"
  >
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>

    <template v-else-if="title || description" #header>
      <div class="app-dialog__header-copy">
        <h2 v-if="title" class="app-dialog__title">{{ title }}</h2>
        <p v-if="description" class="app-dialog__description">{{ description }}</p>
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
    breakpoints?: Record<string, string>
    modal?: boolean
    persistent?: boolean
    dismissableMask?: boolean
    closable?: boolean
    closeOnEscape?: boolean
    draggable?: boolean
    maximizable?: boolean
  }>(),
  {
    title: '',
    description: '',
    width: 'min(92vw, 42rem)',
    breakpoints: () => ({ '960px': '86vw', '640px': '94vw' }),
    modal: true,
    persistent: false,
    dismissableMask: true,
    closable: true,
    closeOnEscape: true,
    draggable: false,
    maximizable: false,
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

const resolvedVisible = computed(() => props.modelValue ?? props.visible ?? false)

function handleVisibleUpdate(value: boolean) {
  emit('update:modelValue', value)
  emit('update:visible', value)
}
</script>

<style scoped>
.app-dialog :deep(.p-dialog) {
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel-strong);
  box-shadow: var(--app-shadow);
}

.app-dialog :deep(.p-dialog-header) {
  align-items: flex-start;
  border-bottom: 1px solid var(--app-border);
  background: linear-gradient(180deg, rgba(15, 118, 110, 0.06), rgba(15, 118, 110, 0.01));
}

.app-dialog :deep(.p-dialog-content) {
  padding-top: 1.25rem;
  color: var(--app-ink);
}

.app-dialog :deep(.p-dialog-footer) {
  border-top: 1px solid var(--app-border);
  background: var(--app-surface);
}

.app-dialog__header-copy {
  display: grid;
  gap: 0.35rem;
}

.app-dialog__title {
  margin: 0;
  font-family: var(--app-display);
  font-size: 1.45rem;
  font-weight: 700;
}

.app-dialog__description {
  margin: 0;
  color: var(--app-muted);
  font-size: 0.95rem;
  line-height: 1.55;
}

.app-dialog__body {
  display: grid;
  gap: 1rem;
}
</style>