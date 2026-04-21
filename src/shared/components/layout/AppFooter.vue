<template>
  <v-footer app color="surface" class="app-shell-footer" :height="height" elevation="0">
    <div class="app-shell-footer__inner">
      <div class="app-shell-footer__identity">
        <div class="app-shell-footer__badge">
          <v-icon size="16">mdi-atom-variant</v-icon>
        </div>

        <div class="app-shell-footer__copy">
          <span class="app-shell-footer__name">{{ appName }}</span>
          <span class="app-shell-footer__description">{{ appDescription }}</span>
        </div>
      </div>

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
  background:
    linear-gradient(180deg, rgba(var(--v-theme-surface), 0.98), rgba(var(--v-theme-background), 0.95));
}

.app-shell-footer__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  height: 100%;
  padding: 0 20px;
}

.app-shell-footer__identity,
.app-shell-footer__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.app-shell-footer__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
}

.app-shell-footer__copy {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.app-shell-footer__name,
.app-shell-footer__version {
  font-size: 0.78rem;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.app-shell-footer__description,
.app-shell-footer__copyright {
  font-size: 0.76rem;
  color: rgba(var(--v-theme-on-surface), 0.56);
}

.app-shell-footer__separator {
  width: 1px;
  height: 14px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
}

@media (max-width: 699px) {
  .app-shell-footer__inner {
    padding-inline: 12px;
  }

  .app-shell-footer__copy {
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
  }

  .app-shell-footer__description {
    display: none;
  }
}
</style>
