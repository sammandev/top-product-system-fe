<template>
    <div class="app-select" :class="{ 'app-select--open': isOpen, 'app-select--disabled': disabled }" ref="rootRef">
        <button type="button" class="app-select__trigger" :disabled="disabled" :title="selectedLabel || placeholder"
            @click="toggle" @keydown.down.prevent="open" @keydown.up.prevent="open" @keydown.escape.prevent="close">
            <span class="app-select__value" :class="{ 'app-select__value--placeholder': !hasValue }">
                {{ selectedLabel || placeholder }}
            </span>
            <Icon class="app-select__chevron" icon="solar:alt-arrow-down-linear" />
        </button>

        <Teleport to="body">
            <div v-if="isOpen" ref="dropdownRef" class="app-select__dropdown" :style="dropdownStyle">
                <div v-if="searchable" class="app-select__search">
                    <Icon class="app-select__search-icon" icon="solar:magnifer-linear" />
                    <input ref="searchInputRef" v-model="searchQuery" class="app-select__search-input"
                        placeholder="Search..." type="text" @keydown.escape.prevent="close"
                        @keydown.down.prevent="focusNext" @keydown.up.prevent="focusPrev"
                        @keydown.enter.prevent="selectFocused" />
                </div>
                <div class="app-select__options" ref="optionsRef">
                    <button v-for="(option, index) in filteredOptions" :key="String(option.value)" type="button"
                        class="app-select__option" :class="{
                            'app-select__option--selected': isSelected(option),
                            'app-select__option--focused': focusedIndex === index,
                        }" @click="select(option)" @mouseenter="focusedIndex = index">
                        <span class="app-select__option-label">{{ option.label }}</span>
                        <Icon v-if="isSelected(option)" class="app-select__option-check"
                            icon="solar:check-read-linear" />
                    </button>
                    <div v-if="filteredOptions.length === 0" class="app-select__empty">
                        No results found
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export interface SelectOption {
    value: string | number | boolean | null
    label: string
}

const props = withDefaults(
    defineProps<{
        modelValue?: string | number | boolean | null
        options: SelectOption[]
        placeholder?: string
        searchable?: boolean
        disabled?: boolean
    }>(),
    {
        modelValue: null,
        placeholder: 'Select...',
        searchable: true,
        disabled: false,
    },
)

const emit = defineEmits<{
    (event: 'update:modelValue', value: string | number | boolean | null): void
    (event: 'change', value: string | number | boolean | null): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const optionsRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const searchQuery = ref('')
const focusedIndex = ref(-1)
const dropdownStyle = ref<Record<string, string>>({})

const hasValue = computed(() => props.modelValue !== null && props.modelValue !== undefined && props.modelValue !== '')

const selectedLabel = computed(() => {
    const found = props.options.find((o) => o.value === props.modelValue)
    return found?.label ?? ''
})

const filteredOptions = computed(() => {
    if (!searchQuery.value) return props.options
    const q = searchQuery.value.toLowerCase()
    return props.options.filter((o) => o.label.toLowerCase().includes(q))
})

function isSelected(option: SelectOption) {
    return option.value === props.modelValue
}

function toggle() {
    if (isOpen.value) {
        close()
    } else {
        open()
    }
}

function open() {
    if (props.disabled) return
    isOpen.value = true
    searchQuery.value = ''
    focusedIndex.value = -1
    nextTick(() => {
        positionDropdown()
        searchInputRef.value?.focus()
    })
}

function close() {
    isOpen.value = false
    searchQuery.value = ''
    focusedIndex.value = -1
}

function select(option: SelectOption) {
    emit('update:modelValue', option.value)
    emit('change', option.value)
    close()
}

function focusNext() {
    if (focusedIndex.value < filteredOptions.value.length - 1) {
        focusedIndex.value++
        scrollToFocused()
    }
}

function focusPrev() {
    if (focusedIndex.value > 0) {
        focusedIndex.value--
        scrollToFocused()
    }
}

function selectFocused() {
    if (focusedIndex.value >= 0 && focusedIndex.value < filteredOptions.value.length) {
        const option = filteredOptions.value[focusedIndex.value]
        if (option) {
            select(option)
        }
    }
}

function scrollToFocused() {
    nextTick(() => {
        const container = optionsRef.value
        if (!container) return
        const focusedEl = container.children[focusedIndex.value] as HTMLElement
        if (focusedEl) {
            focusedEl.scrollIntoView({ block: 'nearest' })
        }
    })
}

function positionDropdown() {
    if (!rootRef.value) return
    const rect = rootRef.value.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const dropUp = spaceBelow < 240 && spaceAbove > spaceBelow

    dropdownStyle.value = {
        position: 'fixed',
        left: `${rect.left}px`,
        width: `${rect.width}px`,
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

watch(
    () => props.options,
    () => {
        if (isOpen.value) {
            focusedIndex.value = -1
        }
    },
)
</script>

<style scoped>
.app-select {
    position: relative;
    display: inline-flex;
    width: 100%;
}

.app-select--disabled {
    opacity: 0.5;
    pointer-events: none;
}

.app-select__trigger {
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

.app-select__trigger:hover {
    border-color: var(--app-accent);
}

.app-select--open .app-select__trigger {
    border-color: var(--app-accent);
}

.app-select__value {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.app-select__value--placeholder {
    color: var(--app-muted);
}

.app-select__chevron {
    font-size: 0.75rem;
    color: var(--app-muted);
    flex-shrink: 0;
    transition: transform 0.15s;
}

.app-select--open .app-select__chevron {
    transform: rotate(180deg);
}
</style>

<style>
/* Dropdown is teleported, cannot be scoped */
.app-select__dropdown {
    border: 1px solid var(--app-border);
    border-radius: 0.5rem;
    background: var(--app-panel-strong);
    box-shadow: none;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 18rem;
}

.app-select__search {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-bottom: 1px solid var(--app-border);
    flex-shrink: 0;
}

.app-select__search-icon {
    font-size: 0.875rem;
    color: var(--app-muted);
    flex-shrink: 0;
}

.app-select__search-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 0.8125rem;
    color: var(--app-ink);
    outline: none;
    font-family: inherit;
}

.app-select__search-input::placeholder {
    color: var(--app-muted);
}

.app-select__options {
    overflow-y: auto;
    flex: 1;
    scrollbar-width: thin;
    scrollbar-color: rgba(120, 120, 120, 0.3) transparent;
}

.app-select__option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    width: 100%;
    padding: 0.4375rem 0.625rem;
    border: none;
    background: transparent;
    color: var(--app-ink);
    font-size: 0.8125rem;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
}

.app-select__option:hover,
.app-select__option--focused {
    background: var(--app-accent-soft);
}

.app-select__option--selected {
    color: var(--app-accent);
    font-weight: 600;
}

.app-select__option-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.app-select__option-check {
    font-size: 0.875rem;
    color: var(--app-accent);
    flex-shrink: 0;
}

.app-select__empty {
    padding: 1rem;
    text-align: center;
    font-size: 0.8125rem;
    color: var(--app-muted);
}
</style>
