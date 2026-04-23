<template>
  <TopProductIplasStationContent v-bind="$attrs">
    <slot />
  </TopProductIplasStationContent>
</template>

<script setup lang="ts">
import TopProductIplasStationContent from './TopProductIplasStationContent.vue'

defineOptions({
  inheritAttrs: false,
})
</script>