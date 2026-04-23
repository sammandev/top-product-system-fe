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

:deep(.p-toast-message) {
  border-radius: 1.25rem;
  border: 1px solid var(--app-border);
  background: var(--app-panel-strong);
  box-shadow: var(--app-shadow-soft);
}
</style>