<template>
  <section
    v-bind="attrs"
    class="grid gap-3.5 rounded-[0.625rem] p-4 bg-app-panel-strong"
    :class="[`app-panel--${tone}`]"
  >
    <div
      v-if="hasHeader"
      class="flex justify-between gap-4"
      :class="compactHeader || splitHeader ? 'items-center' : 'items-start'"
    >
      <div class="grid gap-[0.35rem]">
        <p v-if="eyebrow" class="m-0 text-app-accent text-[0.8125rem] font-semibold tracking-normal normal-case">{{ eyebrow }}</p>
        <h2 v-if="title" class="m-0 text-app-ink text-lg font-semibold">{{ title }}</h2>
        <p v-if="description" class="m-0 text-app-muted leading-[1.45]">{{ description }}</p>
      </div>

      <div v-if="$slots['header-aside']" class="flex flex-wrap justify-end gap-[0.6rem] items-center">
        <slot name="header-aside" />
      </div>
    </div>

    <div class="grid gap-4">
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
.app-panel--warm {
  background: linear-gradient(180deg, color-mix(in srgb, var(--app-info) 3%, transparent), color-mix(in srgb, var(--app-info) 1.5%, transparent)), var(--app-panel-strong);
}

.app-panel--cool {
  background: linear-gradient(180deg, rgba(6, 182, 212, 0.035), rgba(6, 182, 212, 0.02)), var(--app-panel-strong);
}

.app-panel--success {
  background: linear-gradient(180deg, rgba(34, 197, 94, 0.035), rgba(34, 197, 94, 0.02)), var(--app-panel-strong);
}
</style>
