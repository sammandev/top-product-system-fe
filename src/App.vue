<template>
  <AppToastHost />
  <router-view />
</template>

<script setup lang="ts">
import { AppToastHost } from '@/shared'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  min-height: 100vh;
}
</style>