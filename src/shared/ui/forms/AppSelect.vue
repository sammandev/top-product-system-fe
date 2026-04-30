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
    emptyMessage="No results found"
    emptyFilterMessage="No results found"
    optionLabel="label"
    optionValue="value"
    appendTo="body"
    resetFilterOnHide
    class="app-select w-full"
    @update:modelValue="handleUpdate"
    @change="handleChange"
  />
</template>

<script setup lang="ts">
import Select from 'primevue/select'
import { useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

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

const attrs = useAttrs()

function handleUpdate(value: string | number | boolean | null) {
  emit('update:modelValue', value)
}

function handleChange(event: { value: string | number | boolean | null }) {
  emit('change', event.value)
}
</script>

<style scoped>
.app-select {
  width: 100%;
}
</style>
