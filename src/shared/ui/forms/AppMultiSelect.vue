<template>
  <div class="app-multi-select" :class="{ 'app-multi-select--open': isOpen, 'app-multi-select--disabled': disabled }"
    ref="rootRef">
    <button type="button" class="app-multi-select__trigger" :disabled="disabled" @click="toggle"
      @keydown.escape.prevent="close">
      <span class="app-multi-select__value" :class="{ 'app-multi-select__value--placeholder': modelValue.length === 0 }">
        {{ displayText }}
      </span>
      <Icon class="app-multi-select__chevron" icon="solar:alt-arrow-down-linear" />
    </button>

    <Teleport to="body">
      <div v-if="isOpen" ref="dropdownRef" class="app-multi-select__dropdown" :style="dropdownStyle">
        <div v-if="searchable" class="app-multi-select__search">
          <Icon class="app-multi-select__search-icon" icon="solar:magnifer-linear" />
          <input ref="searchInputRef" v-model="searchQuery" class="app-multi-select__search-input"
            placeholder="Search..." type="text" @keydown.escape.prevent="close" />
        </div>
        <div class="app-multi-select__toolbar">
          <button type="button" class="app-multi-select__toolbar-btn" @click="selectAll">Select all</button>
          <button type="button" class="app-multi-select__toolbar-btn" @click="clearAll">Clear all</button>
          <span class="app-multi-select__toolbar-count">{{ modelValue.length }} selected</span>
        </div>
        <div class="app-multi-select__options" ref="optionsRef">
          <button v-for="option in filteredOptions" :key="String(option.value)" type="button"
            class="app-multi-select__option" :class="{ 'app-multi-select__option--selected': isSelected(option) }"
            @click="toggleOption(option)">
            <span class="app-multi-select__checkbox"
              :class="{ 'app-multi-select__checkbox--checked': isSelected(option) }">
              <Icon v-if="isSelected(option)" icon="solar:check-read-linear" />
            </span>
            <span class="app-multi-select__option-label">{{ option.label }}</span>
          </button>
          <div v-if="filteredOptions.length === 0" class="app-multi-select__empty">
            No results found
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { SelectOption } from './AppSelect.vue'

const props = withDefaults(
  defineProps<{
    modelValue: (string | number)[]
    options: SelectOption[]
    placeholder?: string
    searchable?: boolean
    disabled?: boolean
  }>(),
  {
    placeholder: 'Select...',
    searchable: true,
    disabled: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: (string | number)[]): void
  (event: 'change', value: (string | number)[]): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const optionsRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const searchQuery = ref('')
const dropdownStyle = ref<Record<string, string>>({})

const displayText = computed(() => {
  if (props.modelValue.length === 0) return props.placeholder
  if (props.modelValue.length === 1) {
    const found = props.options.find((o) => o.value === props.modelValue[0])
    return found?.label ?? String(props.modelValue[0])
  }
  return `${props.modelValue.length} selected`
})

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options
  const q = searchQuery.value.toLowerCase()
  return props.options.filter((o) => o.label.toLowerCase().includes(q))
})

const selectedSet = computed(() => new Set(props.modelValue))

function isSelected(option: SelectOption) {
  return selectedSet.value.has(option.value as string | number)
}

function toggle() {
  if (isOpen.value) close()
  else open()
}

function open() {
  if (props.disabled) return
  isOpen.value = true
  searchQuery.value = ''
  nextTick(() => {
    positionDropdown()
    searchInputRef.value?.focus()
  })
}

function close() {
  isOpen.value = false
  searchQuery.value = ''
}

function toggleOption(option: SelectOption) {
  const val = option.value as string | number
  const current = [...props.modelValue]
  const idx = current.indexOf(val)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(val)
  }
  emit('update:modelValue', current)
  emit('change', current)
}

function selectAll() {
  const allValues = filteredOptions.value.map((o) => o.value as string | number)
  const merged = new Set([...props.modelValue, ...allValues])
  const result = Array.from(merged)
  emit('update:modelValue', result)
  emit('change', result)
}

function clearAll() {
  const filteredValues = new Set(filteredOptions.value.map((o) => o.value as string | number))
  const remaining = props.modelValue.filter((v) => !filteredValues.has(v))
  emit('update:modelValue', remaining)
  emit('change', remaining)
}

function positionDropdown() {
  if (!rootRef.value) return
  const rect = rootRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const dropUp = spaceBelow < 240 && rect.top > spaceBelow

  dropdownStyle.value = {
    position: 'fixed',
    left: `${rect.left}px`,
    width: `${Math.max(rect.width, 200)}px`,
    zIndex: '9999',
    ...(dropUp
      ? { bottom: `${window.innerHeight - rect.top + 4}px` }
      : { top: `${rect.bottom + 4}px` }),
  }
}

function handleClickOutside(e: MouseEvent) {
  if (!isOpen.value) return
  const target = e.target as Node
  if (rootRef.value?.contains(target)) return
  if (dropdownRef.value?.contains(target)) return
  close()
}

function handleScroll() {
  if (isOpen.value) positionDropdown()
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  window.addEventListener('scroll', handleScroll, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  window.removeEventListener('scroll', handleScroll, true)
})
</script>

<style scoped>
.app-multi-select {
  position: relative;
  display: inline-flex;
  width: 100%;
}

.app-multi-select--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.app-multi-select__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  padding: 0.4375rem 0.625rem;
  border: 1px solid var(--app-border);
  border-radius: 0.375rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  font-size: 0.8125rem;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s;
  text-align: left;
  min-height: 2rem;
}

.app-multi-select__trigger:hover {
  border-color: var(--app-accent);
}

.app-multi-select--open .app-multi-select__trigger {
  border-color: var(--app-accent);
}

.app-multi-select__value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-multi-select__value--placeholder {
  color: var(--app-muted);
}

.app-multi-select__chevron {
  font-size: 0.75rem;
  color: var(--app-muted);
  flex-shrink: 0;
  transition: transform 0.15s;
}

.app-multi-select--open .app-multi-select__chevron {
  transform: rotate(180deg);
}
</style>

<style>
/* Teleported dropdown — cannot be scoped */
.app-multi-select__dropdown {
  border: 1px solid var(--app-border);
  border-radius: 0.5rem;
  background: var(--app-panel-strong);
  box-shadow: none;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 20rem;
}

.app-multi-select__search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-bottom: 1px solid var(--app-border);
  flex-shrink: 0;
}

.app-multi-select__search-icon {
  font-size: 0.875rem;
  color: var(--app-muted);
  flex-shrink: 0;
}

.app-multi-select__search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  color: var(--app-ink);
  outline: none;
  font-family: inherit;
}

.app-multi-select__search-input::placeholder {
  color: var(--app-muted);
}

.app-multi-select__toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border-bottom: 1px solid var(--app-border);
  flex-shrink: 0;
}

.app-multi-select__toolbar-btn {
  border: none;
  background: transparent;
  color: var(--app-accent);
  font-size: 0.75rem;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
}

.app-multi-select__toolbar-btn:hover {
  text-decoration: underline;
}

.app-multi-select__toolbar-count {
  margin-left: auto;
  font-size: 0.6875rem;
  color: var(--app-muted);
}

.app-multi-select__options {
  overflow-y: auto;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: rgba(120, 120, 120, 0.3) transparent;
}

.app-multi-select__option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.375rem 0.625rem;
  border: none;
  background: transparent;
  color: var(--app-ink);
  font-size: 0.8125rem;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}

.app-multi-select__option:hover {
  background: var(--app-accent-soft);
}

.app-multi-select__option--selected {
  color: var(--app-accent);
  font-weight: 500;
}

.app-multi-select__checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border: 1.5px solid var(--app-border);
  border-radius: 0.25rem;
  flex-shrink: 0;
  font-size: 0.625rem;
  transition: border-color 0.15s, background 0.15s;
}

.app-multi-select__checkbox--checked {
  border-color: var(--app-accent);
  background: var(--app-accent);
  color: #fff;
}

.app-multi-select__option-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-multi-select__empty {
  padding: 1rem;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--app-muted);
}
</style>
