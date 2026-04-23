<template>
  <IplasIsnSearchContent v-bind="$attrs">
    <slot />
  </IplasIsnSearchContent>
</template>

<script setup lang="ts">
import IplasIsnSearchContent from './IplasIsnSearchContent.vue'

defineOptions({
  inheritAttrs: false,
})
</script>