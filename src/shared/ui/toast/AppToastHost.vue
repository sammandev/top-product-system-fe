<template>
  <Toast group="app-top" position="top-right" />
  <Toast group="app-bottom" position="bottom-right" />
</template>

<script setup lang="ts">
import Toast from 'primevue/toast'
</script>

<style scoped>
:deep(.p-toast) {
  max-width: min(92vw, 28rem);
}
</style>