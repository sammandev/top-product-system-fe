<template>
  <PublicScaffold
    :app-name="appName"
    eyebrow="Fallback"
    title="The route map stops here"
    description="This page is already on the new scaffold, which makes it a safe place to validate the migration shell before the authenticated application moves over."
    panel-eyebrow="404"
    panel-description="The address you requested does not match an active route in the frontend router."
  >
    <template #hero>
      <div class="rounded-[1.6rem] border border-[var(--app-border)] bg-white/70 p-5 shadow-[var(--app-shadow-soft)]">
        <div class="flex items-center gap-4">
          <div class="rounded-[1.4rem] bg-[rgba(165,101,71,0.14)] p-4 text-4xl text-[rgb(141,87,62)]">
            <Icon icon="solar:danger-triangle-bold-duotone" />
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--app-muted)]">Response</p>
            <p class="mt-1 text-base text-[var(--app-ink)]">No matching route was found.</p>
          </div>
        </div>
      </div>
    </template>

    <div class="space-y-6">
      <div class="rounded-[1.4rem] border border-[var(--app-border)] bg-white/75 p-5 shadow-[var(--app-shadow-soft)]">
        <p class="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[var(--app-muted)]">Next best move</p>
        <p class="mt-3 text-sm leading-7 text-[var(--app-muted)]">
          Return to the dashboard if you are signed in, or go back to login if you reached this page from an expired or malformed link.
        </p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <RouterLink
          class="rounded-full bg-[var(--app-accent)] px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.22em] text-white shadow-[var(--app-shadow-soft)] transition hover:bg-[var(--app-accent-strong)]"
          to="/dashboard"
        >
          Go to Dashboard
        </RouterLink>
        <RouterLink
          class="rounded-full border border-[var(--app-border)] bg-white/70 px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-ink)] shadow-[var(--app-shadow-soft)] transition hover:border-[var(--app-accent)]"
          to="/login"
        >
          Back to Login
        </RouterLink>
      </div>
    </div>
  </PublicScaffold>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import PublicScaffold from '@/shared/ui/public-shell/PublicScaffold.vue'
import { useAppConfigStore } from '@/core/stores/appConfig.store'

const appConfigStore = useAppConfigStore()
const { appName } = storeToRefs(appConfigStore)
</script>
