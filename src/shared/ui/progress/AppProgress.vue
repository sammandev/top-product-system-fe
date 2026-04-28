<template>
  <section v-bind="attrs" class="grid gap-[0.4rem]">
    <div class="relative overflow-hidden h-2 rounded-full app-progress__track">
      <div class="h-full rounded-[inherit] app-progress__bar" :style="{ width: `${displayWidth}%` }" />
    </div>
    <span v-if="showLabel" class="text-app-muted text-[0.78rem] font-semibold">{{ Math.round(clampedValue) }}%</span>
  </section>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    value: number
    minVisible?: number
    showLabel?: boolean
  }>(),
  {
    minVisible: 8,
    showLabel: true,
  },
)

const attrs = useAttrs()

const clampedValue = computed(() => Math.min(Math.max(props.value, 0), 100))
const displayWidth = computed(() => Math.max(clampedValue.value, props.minVisible))
</script>

<style scoped>
.app-progress__track {
  /* TODO: needs --app-accent-tint-10 token in tokens.css */
  background: rgba(15, 118, 110, 0.1);
}

.app-progress__bar {
  background: linear-gradient(90deg, var(--app-accent), rgba(45, 212, 191, 0.8));
  transition: width 0.2s ease;
}
</style>
