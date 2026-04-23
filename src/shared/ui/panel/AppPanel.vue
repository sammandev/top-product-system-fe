<template>
  <section v-bind="attrs" class="app-panel" :class="[`app-panel--${tone}`]">
    <div v-if="hasHeader" class="app-panel__header" :class="{ 'app-panel__header--compact': compactHeader, 'app-panel__header--split': splitHeader }">
      <div class="app-panel__copy">
        <p v-if="eyebrow" class="app-panel__eyebrow">{{ eyebrow }}</p>
        <h2 v-if="title" class="app-panel__title">{{ title }}</h2>
        <p v-if="description" class="app-panel__description">{{ description }}</p>
      </div>

      <div v-if="$slots['header-aside']" class="app-panel__aside">
        <slot name="header-aside" />
      </div>
    </div>

    <div class="app-panel__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, useAttrs, useSlots } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    eyebrow?: string
    title?: string
    description?: string
    tone?: 'default' | 'warm' | 'cool' | 'success'
    compactHeader?: boolean
    splitHeader?: boolean
  }>(),
  {
    eyebrow: '',
    title: '',
    description: '',
    tone: 'default',
    compactHeader: false,
    splitHeader: false,
  },
)

const attrs = useAttrs()
const slots = useSlots()

const hasHeader = computed(
  () => Boolean(props.eyebrow || props.title || props.description || slots['header-aside']),
)
</script>

<style scoped>
.app-panel {
  display: grid;
  gap: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  padding: 1.2rem;
  background: var(--app-panel);
  box-shadow: var(--app-shadow-soft);
}

.app-panel--warm {
  background:
    radial-gradient(circle at top right, rgba(217, 119, 6, 0.06), transparent 34%),
    var(--app-panel);
}

.app-panel--cool {
  background:
    radial-gradient(circle at top right, rgba(2, 132, 199, 0.06), transparent 34%),
    var(--app-panel);
}

.app-panel--success {
  background:
    radial-gradient(circle at top right, rgba(22, 163, 74, 0.06), transparent 34%),
    var(--app-panel);
}

.app-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.app-panel__header--compact,
.app-panel__header--split {
  align-items: center;
}

.app-panel__copy {
  display: grid;
  gap: 0.35rem;
}

.app-panel__eyebrow {
  margin: 0;
  color: var(--app-accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.app-panel__title {
  margin: 0;
  color: var(--app-ink);
  font-size: 1.1rem;
}

.app-panel__description {
  margin: 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.app-panel__aside {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.6rem;
  align-items: center;
}

.app-panel__body {
  display: grid;
  gap: 1rem;
}
</style>