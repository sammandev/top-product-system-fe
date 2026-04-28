<template>
  <div class="grid place-items-center min-h-screen p-6 bg-app-canvas">
    <div class="text-center max-w-sm">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-app-warning-soft text-app-warning text-2xl mb-4">
        <Icon icon="solar:danger-triangle-bold-duotone" />
      </div>
      <h1 class="m-0 text-5xl font-bold text-app-ink leading-none">404</h1>
      <p class="mt-2 text-lg font-semibold text-app-ink">Page not found</p>
      <p class="mt-2 text-sm text-app-muted leading-normal">The page you're looking for doesn't exist or may have been moved.</p>
      <div class="flex gap-3 justify-center mt-6">
        <RouterLink class="notfound-btn notfound-btn--primary" to="/dashboard">
          Go to Dashboard
        </RouterLink>
        <RouterLink class="notfound-btn notfound-btn--secondary" to="/login">
          Back to Login
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.notfound-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s;
}

.notfound-btn--primary {
  background: var(--app-accent);
  color: #fff;
}

.notfound-btn--primary:hover {
  background: var(--app-accent-strong);
}

.notfound-btn--secondary {
  border: 1px solid var(--app-border);
  background: transparent;
  color: var(--app-ink);
}

.notfound-btn--secondary:hover {
  border-color: var(--app-accent);
}
</style>
