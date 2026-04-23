<template>
  <IplasSettingsDialog :model-value="modelValue" @update:modelValue="$emit('update:modelValue', $event)" />
</template>

<script setup lang="ts">
import IplasSettingsDialog from './IplasSettingsDialog.vue'

defineProps<{
  modelValue: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>
