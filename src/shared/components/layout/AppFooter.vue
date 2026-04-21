<template>
  <v-footer app color="surface" class="app-shell-footer" :height="height" elevation="0">
    <div class="app-shell-footer__inner">
      <span class="app-shell-footer__name">{{ appName }}</span>

      <div class="app-shell-footer__meta">
        <span class="app-shell-footer__version">v{{ appVersion }}</span>
        <span class="app-shell-footer__separator" />
        <span class="app-shell-footer__copyright">© {{ currentYear }}</span>
      </div>
    </div>
  </v-footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineProps<{
  appName: string
  appVersion: string
  appDescription: string
  height: number
}>()

const currentYear = computed(() => new Date().getFullYear())
</script>

<style scoped>
.app-shell-footer {
  border-top: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) + 0.04));
  background: rgb(var(--v-theme-surface));
}

.app-shell-footer__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  height: 100%;
  padding: 0 14px;
}

.app-shell-footer__name,
.app-shell-footer__version {
  font-size: 0.74rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.app-shell-footer__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.app-shell-footer__copyright {
  font-size: 0.72rem;
  color: rgba(var(--v-theme-on-surface), 0.56);
}

.app-shell-footer__separator {
  width: 1px;
  height: 14px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
}

@media (max-width: 699px) {
  .app-shell-footer__inner {
    padding-inline: 10px;
  }
}
</style>
