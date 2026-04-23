<template>
  <div class="relative isolate min-h-screen overflow-y-auto bg-[var(--app-canvas)] text-[var(--app-ink)]">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,88,71,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(165,101,71,0.14),transparent_30%)]" />
    <div
      class="absolute inset-0 opacity-60"
      style="background-image: linear-gradient(rgba(24, 18, 13, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(24, 18, 13, 0.04) 1px, transparent 1px); background-size: 32px 32px;"
    />

    <div class="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8 lg:py-8">
      <aside class="flex flex-col justify-between gap-8 rounded-[2rem] border border-[var(--app-border)] bg-[color:var(--app-panel)] p-6 shadow-[var(--app-shadow)] backdrop-blur xl:p-10">
        <div class="space-y-8">
          <div class="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-white/70 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--app-muted)]">
            {{ eyebrow }}
          </div>

          <div class="space-y-4">
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--app-muted)]">
              {{ appName }}
            </p>
            <h1 class="font-[var(--app-display)] text-4xl leading-none sm:text-5xl lg:text-6xl">
              {{ title }}
            </h1>
            <p class="max-w-2xl text-sm leading-7 text-[var(--app-muted)] sm:text-base">
              {{ description }}
            </p>
          </div>

          <slot name="hero" />
        </div>

        <div class="grid gap-4 border-t border-[var(--app-border)] pt-6 text-sm text-[var(--app-muted)] sm:grid-cols-2">
          <div>
            <div class="text-[0.65rem] font-semibold uppercase tracking-[0.24em]">Runtime</div>
            <div class="mt-2 text-base text-[var(--app-ink)]">Incremental migration scaffold</div>
          </div>
          <div>
            <div class="text-[0.65rem] font-semibold uppercase tracking-[0.24em]">Coverage</div>
            <div class="mt-2 text-base text-[var(--app-ink)]">Public routes are now running on the scaffold-first shell.</div>
          </div>
        </div>
      </aside>

      <main class="flex items-center justify-center lg:py-6">
        <section class="w-full max-w-xl rounded-[2rem] border border-[var(--app-border)] bg-[color:var(--app-panel-strong)] p-6 shadow-[var(--app-shadow-soft)] backdrop-blur xl:p-8">
          <div class="mb-6 flex items-start justify-between gap-4 border-b border-[var(--app-border)] pb-5">
            <div>
              <p class="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[var(--app-muted)]">
                {{ panelEyebrow }}
              </p>
              <p class="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                {{ panelDescription }}
              </p>
            </div>
            <slot name="panelBadge" />
          </div>

          <slot />

          <div class="mt-8 border-t border-[var(--app-border)] pt-4 text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">
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
  eyebrow: string
  title: string
  description: string
  panelEyebrow: string
  panelDescription: string
}

defineProps<Props>()

const currentYear = new Date().getFullYear()
</script>