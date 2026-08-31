<template>
  <Select
    v-bind="attrs"
    :modelValue="props.modelValue"
    :options="props.options"
    :placeholder="props.placeholder"
    :filter="props.searchable"
    :filterPlaceholder="props.searchable ? 'Search...' : undefined"
    :autoFilterFocus="props.searchable"
    :disabled="props.disabled"
    :showClear="props.modelValue.length > 0"
    multiple
    emptyMessage="No results found"
    emptyFilterMessage="No results found"
    optionLabel="label"
    optionValue="value"
    appendTo="body"
    resetFilterOnHide
    class="app-multi-select w-full"
    @update:modelValue="handleUpdate"
    @change="handleChange"
  >
    <template #value="{ value, placeholder: valuePlaceholder }">
      <span :class="{ 'app-multi-select__placeholder': !Array.isArray(value) || value.length === 0 }">
        {{ formatSelectedValue(value, valuePlaceholder) }}
      </span>
    </template>
    <template #option="{ option, selected }">
      <span class="app-multi-select__option">
        <span class="app-multi-select__checkbox" :class="{ 'is-selected': selected }" aria-hidden="true" />
        <span>{{ option.label }}</span>
      </span>
    </template>
  </Select>
</template>

<script setup lang="ts">
import Select from 'primevue/select'
import { useAttrs } from 'vue'
import type { SelectOption } from './AppSelect.vue'

defineOptions({ inheritAttrs: false })

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

const attrs = useAttrs()

function formatSelectedValue(value: unknown, valuePlaceholder: string): string {
  if (!Array.isArray(value) || value.length === 0) return valuePlaceholder
  if (value.length > 1) return `${value.length} selected`
  const selected = props.options.find((option) => option.value === value[0])
  return selected?.label || String(value[0])
}

function handleUpdate(value: (string | number)[]) {
  emit('update:modelValue', value)
}

function handleChange(event: { value: (string | number)[] }) {
  emit('change', event.value)
}
</script>

<style scoped>
.app-multi-select {
  width: 100%;
}

.app-multi-select__placeholder {
  color: var(--app-muted);
}

.app-multi-select__option {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.app-multi-select__checkbox {
  display: grid;
  place-items: center;
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
  border: 1px solid var(--app-border);
  border-radius: 0.25rem;
  background: var(--app-panel-strong);
  color: var(--app-panel);
  font-size: 0.78rem;
  font-weight: 800;
}

.app-multi-select__checkbox.is-selected {
  border-color: var(--app-accent);
  background: var(--app-accent);
}

.app-multi-select__checkbox.is-selected::after {
  width: 0.28rem;
  height: 0.52rem;
  border-right: 2px solid var(--app-panel);
  border-bottom: 2px solid var(--app-panel);
  content: "";
  transform: rotate(45deg) translate(-1px, -1px);
}
</style>
