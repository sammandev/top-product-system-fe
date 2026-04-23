<template>
  <div
    v-bind="attrs"
    class="app-file-picker"
    :class="{
      'app-file-picker--invalid': invalidState,
      'app-file-picker--drag': dragActive,
      'app-file-picker--disabled': disabled,
    }"
  >
    <label v-if="label" class="app-file-picker__label">{{ label }}</label>

    <input
      ref="inputRef"
      :accept="accept"
      :disabled="disabled"
      :multiple="multiple"
      class="app-file-picker__input"
      type="file"
      @change="onInputChange"
    >

    <div
      class="app-file-picker__surface"
      :tabindex="disabled ? -1 : 0"
      :aria-disabled="disabled"
      role="button"
      @click="openPicker"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="dragActive = false"
      @drop.prevent="onDrop"
      @keydown.enter.prevent="openPicker"
      @keydown.space.prevent="openPicker"
    >
      <div class="app-file-picker__summary">
        <span class="app-file-picker__icon">
          <Icon icon="mdi:tray-arrow-up" />
        </span>

        <div class="app-file-picker__copy">
          <p class="app-file-picker__title">{{ selectionTitle }}</p>
          <p class="app-file-picker__hint">{{ selectionHint }}</p>
        </div>
      </div>

      <div class="app-file-picker__actions">
        <Button size="small" severity="secondary" type="button" @click.stop="openPicker">
          Browse
        </Button>

        <Button
          v-if="clearable && hasSelection"
          text
          size="small"
          severity="secondary"
          type="button"
          @click.stop="clearSelection"
        >
          Clear
        </Button>
      </div>
    </div>

    <p v-if="invalidState" class="app-file-picker__message app-file-picker__message--error">
      {{ resolvedInvalidMessage }}
    </p>

    <p v-else-if="helperText" class="app-file-picker__message">
      {{ helperText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import Button from 'primevue/button'
import { computed, ref, useAttrs, watch } from 'vue'

defineOptions({ inheritAttrs: false })

type FilePickerValue = File | File[] | null

const props = withDefaults(
  defineProps<{
    modelValue?: FilePickerValue
    label?: string
    accept?: string
    multiple?: boolean
    disabled?: boolean
    helperText?: string
    placeholder?: string
    invalid?: boolean
    invalidMessage?: string
    clearable?: boolean
    maxFileSizeMb?: number | null
  }>(),
  {
    modelValue: null,
    label: 'Select file',
    accept: '',
    multiple: false,
    disabled: false,
    helperText: '',
    placeholder: 'Drop a file here or browse from disk.',
    invalid: false,
    invalidMessage: '',
    clearable: true,
    maxFileSizeMb: null,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: FilePickerValue): void
  (event: 'select', value: FilePickerValue): void
  (event: 'clear'): void
  (event: 'invalid', value: string): void
}>()

const attrs = useAttrs()
const inputRef = ref<HTMLInputElement | null>(null)
const dragActive = ref(false)
const localInvalidMessage = ref('')

const selectedFiles = computed(() => {
  if (!props.modelValue) {
    return [] as File[]
  }

  return Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue]
})

const hasSelection = computed(() => selectedFiles.value.length > 0)
const invalidState = computed(() => props.invalid || Boolean(localInvalidMessage.value))
const resolvedInvalidMessage = computed(
  () => props.invalidMessage || localInvalidMessage.value || 'Selected file is invalid.',
)
const selectionTitle = computed(() => {
  const firstFile = selectedFiles.value[0]

  if (!hasSelection.value) {
    return props.label
  }

  if (selectedFiles.value.length === 1 && firstFile) {
    return firstFile.name
  }

  return `${selectedFiles.value.length} files selected`
})
const selectionHint = computed(() => {
  if (!hasSelection.value) {
    return props.placeholder
  }

  const totalSize = selectedFiles.value.reduce((sum, file) => sum + file.size, 0)
  return `${selectedFiles.value.length === 1 ? formatBytes(totalSize) : `${selectedFiles.value.length} files`} - ${formatBytes(totalSize)}`
})

watch(selectedFiles, (files) => {
  if (!files.length && inputRef.value) {
    inputRef.value.value = ''
  }
})

function openPicker() {
  if (props.disabled) {
    return
  }

  inputRef.value?.click()
}

function onInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  commitSelection(target.files ? Array.from(target.files) : [])
}

function onDragOver() {
  if (props.disabled) {
    return
  }

  dragActive.value = true
}

function onDrop(event: DragEvent) {
  dragActive.value = false

  if (props.disabled) {
    return
  }

  commitSelection(event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [])
}

function clearSelection() {
  localInvalidMessage.value = ''

  if (inputRef.value) {
    inputRef.value.value = ''
  }

  emit('update:modelValue', props.multiple ? [] : null)
  emit('clear')
}

function commitSelection(files: File[]) {
  if (!files.length) {
    clearSelection()
    return
  }

  const normalizedFiles = props.multiple ? files : files.slice(0, 1)

  if (props.maxFileSizeMb !== null) {
    const maxBytes = props.maxFileSizeMb * 1024 * 1024
    const tooLarge = normalizedFiles.find((file) => file.size > maxBytes)

    if (tooLarge) {
      localInvalidMessage.value = `${tooLarge.name} exceeds the ${props.maxFileSizeMb} MB limit.`
      emit('invalid', localInvalidMessage.value)
      return
    }
  }

  localInvalidMessage.value = ''
  const singleFile = normalizedFiles[0] ?? null
  const value: FilePickerValue = props.multiple ? normalizedFiles : singleFile

  emit('update:modelValue', value)
  emit('select', value)
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
</script>

<style scoped>
.app-file-picker {
  display: grid;
  gap: 0.65rem;
}

.app-file-picker__label {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--app-muted);
}

.app-file-picker__input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.app-file-picker__surface {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.1rem;
  border: 1px dashed rgba(20, 88, 71, 0.28);
  border-radius: 1.25rem;
  background: rgba(255, 251, 247, 0.84);
  box-shadow: var(--app-shadow-soft);
  cursor: pointer;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.app-file-picker__surface:focus-visible {
  outline: 2px solid var(--app-ring);
  outline-offset: 2px;
}

.app-file-picker__summary {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.9rem;
}

.app-file-picker__icon {
  display: grid;
  width: 2.6rem;
  height: 2.6rem;
  place-items: center;
  border-radius: 999px;
  background: rgba(20, 88, 71, 0.12);
  color: var(--app-accent);
  font-size: 1.2rem;
  flex-shrink: 0;
}

.app-file-picker__copy {
  min-width: 0;
}

.app-file-picker__title,
.app-file-picker__hint,
.app-file-picker__message {
  margin: 0;
}

.app-file-picker__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: var(--app-ink);
}

.app-file-picker__hint,
.app-file-picker__message {
  font-size: 0.9rem;
  color: var(--app-muted);
}

.app-file-picker__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.app-file-picker--drag .app-file-picker__surface {
  border-color: var(--app-accent);
  transform: translateY(-1px);
}

.app-file-picker--invalid .app-file-picker__surface {
  border-color: rgba(163, 61, 45, 0.42);
  background: rgba(163, 61, 45, 0.06);
}

.app-file-picker__message--error {
  color: var(--app-danger);
}

.app-file-picker--disabled .app-file-picker__surface {
  cursor: not-allowed;
  opacity: 0.68;
}

@media (max-width: 640px) {
  .app-file-picker__surface {
    flex-direction: column;
    align-items: stretch;
  }

  .app-file-picker__actions {
    justify-content: flex-start;
  }
}
</style>