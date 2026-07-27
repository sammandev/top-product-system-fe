<template>
  <AppToastHost />
  <router-view />
</template>

<script setup lang="ts">
import AppToastHost from '@/shared/ui/toast/AppToastHost.vue'
</script>

<style>
@layer base {
  #app {
    min-height: 100vh;
  }
}
</style>
