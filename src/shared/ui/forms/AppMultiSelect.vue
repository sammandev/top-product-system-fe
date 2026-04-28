<template>
  <MultiSelect
    v-bind="attrs"
    :modelValue="props.modelValue"
    :options="props.options"
    :placeholder="props.placeholder"
    :filter="props.searchable"
    :disabled="props.disabled"
    :maxSelectedLabels="1"
    selectedItemsLabel="{0} selected"
    optionLabel="label"
    optionValue="value"
    appendTo="body"
    class="app-multi-select w-full"
    @update:modelValue="handleUpdate"
    @change="handleChange"
  />
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'
import MultiSelect from 'primevue/multiselect'
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
</style>
