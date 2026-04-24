<template>
  <div class="notfound-page">
    <div class="notfound-card">
      <div class="notfound-icon">
        <Icon icon="solar:danger-triangle-bold-duotone" />
      </div>
      <h1 class="notfound-code">404</h1>
      <p class="notfound-title">Page not found</p>
      <p class="notfound-desc">The page you're looking for doesn't exist or may have been moved.</p>
      <div class="notfound-actions">
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
.notfound-page {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 1.5rem;
  background: var(--app-canvas);
}

.notfound-card {
  text-align: center;
  max-width: 24rem;
}

.notfound-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  background: var(--app-warning-soft);
  color: var(--app-warning);
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.notfound-code {
  margin: 0;
  font-size: 3rem;
  font-weight: 700;
  color: var(--app-ink);
  line-height: 1;
}

.notfound-title {
  margin: 0.5rem 0 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--app-ink);
}

.notfound-desc {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  color: var(--app-muted);
  line-height: 1.5;
}

.notfound-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 1.5rem;
}

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
