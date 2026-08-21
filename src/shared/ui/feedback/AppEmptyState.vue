<template>
  <div class="app-empty-state" :class="`app-empty-state--${tone}`">
    <span class="app-empty-state__icon">
      <Icon :icon="icon" aria-hidden="true" />
    </span>
    <p class="app-empty-state__title">{{ title }}</p>
    <p v-if="description" class="app-empty-state__description">{{ description }}</p>
    <div v-if="$slots.action" class="app-empty-state__action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

withDefaults(
  defineProps<{
    title: string
    description?: string
    icon?: string
    tone?: 'default' | 'danger'
  }>(),
  {
    description: '',
    icon: 'solar:inbox-linear',
    tone: 'default',
  },
)
</script>

<style scoped>
.app-empty-state {
  display: grid;
  justify-items: center;
  gap: 0.4rem;
  padding: 2.25rem 1rem;
  text-align: center;
}

.app-empty-state__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  margin-bottom: 0.2rem;
  border-radius: 0.9rem;
  background: var(--app-canvas-strong);
  color: var(--app-muted);
}

.app-empty-state--danger .app-empty-state__icon {
  background: var(--app-danger-soft);
  color: var(--app-danger);
}

.app-empty-state__icon svg {
  width: 1.4rem;
  height: 1.4rem;
}

.app-empty-state__title {
  margin: 0;
  color: var(--app-ink);
  font-size: 0.92rem;
  font-weight: 600;
}

.app-empty-state__description {
  margin: 0;
  max-width: 32rem;
  color: var(--app-muted);
  font-size: 0.8rem;
  line-height: 1.5;
}

.app-empty-state__action {
  margin-top: 0.5rem;
}
</style>
