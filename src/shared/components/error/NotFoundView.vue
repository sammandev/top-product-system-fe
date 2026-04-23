<template>
  <PublicScaffold
    :app-name="appName"
    title="Page not found"
    description="The page you're looking for doesn't exist or may have been moved."
    panel-eyebrow="404"
    panel-description="This address does not match any active route."
  >
    <template #hero>
      <div class="rounded-[1.25rem] border border-[var(--app-border)] bg-white/70 p-5 shadow-[var(--app-shadow-soft)]">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[0.75rem] bg-[var(--app-warning-soft)] text-2xl text-[var(--app-warning)]">
            <Icon icon="solar:danger-triangle-bold-duotone" />
          </div>
          <div>
            <p class="text-sm font-semibold text-[var(--app-ink)]">No matching route</p>
            <p class="mt-1 text-sm text-[var(--app-muted)]">Check the URL and try again.</p>
          </div>
        </div>
      </div>
    </template>

    <div class="space-y-6">
      <p class="text-sm leading-7 text-[var(--app-muted)]">
        Return to the dashboard if you are signed in, or go back to login if you reached this page from an expired or malformed link.
      </p>

      <div class="grid gap-3 sm:grid-cols-2">
        <RouterLink
          class="rounded-[0.75rem] bg-[var(--app-accent)] px-5 py-3 text-center text-sm font-semibold text-white shadow-[var(--app-shadow-soft)] transition hover:bg-[var(--app-accent-strong)]"
          to="/dashboard"
        >
          Go to Dashboard
        </RouterLink>
        <RouterLink
          class="rounded-[0.75rem] border border-[var(--app-border)] bg-white/70 px-5 py-3 text-center text-sm font-semibold text-[var(--app-ink)] shadow-[var(--app-shadow-soft)] transition hover:border-[var(--app-accent)]"
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
