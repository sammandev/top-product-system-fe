<template>
  <section v-bind="attrs" class="app-progress">
    <div class="app-progress__track">
      <div class="app-progress__bar" :style="{ width: `${displayWidth}%` }" />
    </div>
    <span v-if="showLabel">{{ Math.round(clampedValue) }}%</span>
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
.app-progress {
  display: grid;
  gap: 0.4rem;
}

.app-progress__track {
  position: relative;
  overflow: hidden;
  height: 0.5rem;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.1);
}

.app-progress__bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--app-accent), rgba(45, 212, 191, 0.8));
  transition: width 0.2s ease;
}

.app-progress span {
  color: var(--app-muted);
  font-size: 0.78rem;
  font-weight: 600;
}
</style>