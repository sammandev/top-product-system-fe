<template>
  <div class="relative isolate min-h-screen overflow-y-auto bg-app-canvas text-app-ink">
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(15,118,110,0.06),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(100,116,139,0.05),transparent_50%)]" />

    <div class="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8 lg:py-8">
      <aside class="flex flex-col justify-between gap-8 rounded-xl border border-app-border bg-app-panel p-6 shadow-none backdrop-blur xl:p-10">
        <div class="space-y-6">
          <div class="space-y-4">
            <p class="text-xs font-semibold text-app-accent">
              {{ appName }}
            </p>
            <h1 class="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              {{ title }}
            </h1>
            <p class="max-w-2xl text-sm leading-7 text-app-muted sm:text-base">
              {{ description }}
            </p>
          </div>

          <slot name="hero" />
        </div>

        <div class="text-xs text-app-muted">
          {{ currentYear }} {{ appName }}
        </div>
      </aside>

      <main class="flex items-center justify-center lg:py-6">
        <section class="w-full max-w-xl rounded-xl border border-app-border bg-app-panel-strong p-6 shadow-none backdrop-blur xl:p-8">
          <div class="mb-6 flex items-start justify-between gap-4 border-b border-app-border pb-5">
            <div>
              <p class="text-xs font-semibold text-app-accent">
                {{ panelEyebrow }}
              </p>
              <p class="mt-2 text-sm leading-6 text-app-muted">
                {{ panelDescription }}
              </p>
            </div>
            <slot name="panelBadge" />
          </div>

          <slot />

          <div class="mt-8 border-t border-app-border pt-4 text-xs text-app-muted">
            {{ currentYear }} {{ appName }}
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  appName: string
  eyebrow?: string
  title: string
  description: string
  panelEyebrow: string
  panelDescription: string
}

defineProps<Props>()

const currentYear = new Date().getFullYear()
</script>