<template>
  <v-app-bar app color="surface" elevation="0" :height="headerHeight" class="app-shell-header">
    <div class="app-shell-header__inner">
      <div class="app-shell-header__left">
        <v-btn
          icon
          variant="text"
          size="large"
          class="app-shell-header__nav"
          @click="$emit('toggle-drawer')"
        >
          <v-icon>mdi-menu</v-icon>
        </v-btn>

        <div class="app-shell-header__brand">
          <div class="app-shell-header__brand-mark">
            <v-icon size="20">mdi-atom-variant</v-icon>
          </div>

          <div v-if="$vuetify.display.smAndUp" class="app-shell-header__brand-copy">
            <span class="app-shell-header__brand-label">{{ appName }}</span>
            <span class="app-shell-header__brand-meta">v{{ appVersion }}</span>
          </div>
        </div>
      </div>

      <div class="app-shell-header__context">
        <div v-if="$vuetify.display.mdAndUp" class="app-shell-header__breadcrumb-row">
          <div class="app-shell-header__context-icon" :class="`tone-${pageAccent}`">
            <v-icon size="18">{{ pageIcon }}</v-icon>
          </div>

          <div class="app-shell-header__breadcrumbs">
            <template v-for="(crumb, index) in pageBreadcrumbs" :key="`${crumb.title}-${index}`">
              <span class="app-shell-header__breadcrumb" :class="{ 'is-current': index === pageBreadcrumbs.length - 1 }">
                {{ crumb.title }}
              </span>
              <v-icon v-if="index < pageBreadcrumbs.length - 1" size="14" class="app-shell-header__crumb-separator">
                mdi-chevron-right
              </v-icon>
            </template>
          </div>
        </div>

        <div class="app-shell-header__eyebrow">{{ pageEyebrow }}</div>
        <div class="app-shell-header__title-row">
          <h1 class="app-shell-header__title">{{ pageTitle }}</h1>
          <v-chip
            v-if="hasDutAccess && !isGuest && $vuetify.display.mdAndUp"
            size="small"
            color="success"
            variant="tonal"
            class="app-shell-header__dut-chip"
          >
            DUT connected
          </v-chip>
        </div>
        <p v-if="$vuetify.display.mdAndUp" class="app-shell-header__description">
          {{ pageDescription }}
        </p>
      </div>

      <div class="app-shell-header__actions">
        <v-btn icon variant="text" class="app-shell-header__icon-button" @click="$emit('toggle-theme')">
          <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
        </v-btn>

        <v-menu location="bottom end" offset="12">
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text" class="app-shell-header__account text-none">
              <v-avatar size="34" :color="isGuest ? 'warning' : 'primary'" class="mr-2">
                <v-icon size="18">{{ isGuest ? 'mdi-account-question' : 'mdi-account' }}</v-icon>
              </v-avatar>

              <div v-if="$vuetify.display.smAndUp" class="app-shell-header__account-copy">
                <span class="app-shell-header__account-name">{{ displayName }}</span>
                <span class="app-shell-header__account-role">{{ displayRole }}</span>
              </div>

              <v-icon size="18" class="ml-1">mdi-chevron-down</v-icon>
            </v-btn>
          </template>

          <v-card class="app-shell-header__menu-card" min-width="290" elevation="8">
            <v-list class="py-2">
              <v-list-item>
                <template #prepend>
                  <v-avatar :color="isGuest ? 'warning' : 'primary'" size="42">
                    <v-icon>{{ isGuest ? 'mdi-account-question' : 'mdi-account' }}</v-icon>
                  </v-avatar>
                </template>

                <v-list-item-title class="font-weight-bold">{{ displayName }}</v-list-item-title>
                <v-list-item-subtitle>{{ displayRole }}</v-list-item-subtitle>
              </v-list-item>

              <v-divider class="my-2" />

              <v-list-item
                prepend-icon="mdi-shield-check-outline"
                :title="isGuest ? 'Guest workspace' : 'Authenticated workspace'"
                :subtitle="hasDutAccess && !isGuest ? 'External DUT session is active' : 'Standard application access'"
              >
                <template #append>
                  <v-chip :color="hasDutAccess && !isGuest ? 'success' : 'secondary'" size="small" variant="tonal">
                    {{ hasDutAccess && !isGuest ? 'Ready' : 'Standard' }}
                  </v-chip>
                </template>
              </v-list-item>

              <template v-if="!isGuest">
                <v-list-item prepend-icon="mdi-account-cog-outline" title="Profile Settings" />
                <v-list-item prepend-icon="mdi-cog-outline" title="Preferences" />
              </template>

              <v-divider class="my-2" />

              <v-list-item prepend-icon="mdi-logout" title="Logout" @click="$emit('logout')" />
            </v-list>
          </v-card>
        </v-menu>
      </div>
    </div>
  </v-app-bar>
</template>

<script setup lang="ts">
import type { AppRouteBreadcrumbItem } from '@/core/router/route-meta'

defineProps<{
  appName: string
  appVersion: string
  pageTitle: string
  pageEyebrow: string
  pageDescription: string
  pageIcon: string
  pageAccent: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'
  pageBreadcrumbs: AppRouteBreadcrumbItem[]
  displayName: string
  displayRole: string
  isGuest: boolean
  hasDutAccess: boolean
  isDark: boolean
  headerHeight: number
}>()

defineEmits<{
  'toggle-drawer': []
  'toggle-theme': []
  logout: []
}>()
</script>

<style scoped>
.app-shell-header {
  border-bottom: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) + 0.04));
  background:
    linear-gradient(135deg, rgba(var(--v-theme-surface), 0.98), rgba(var(--v-theme-background), 0.92)),
    radial-gradient(circle at top left, rgba(var(--v-theme-primary), 0.11), transparent 34%);
  backdrop-filter: blur(18px);
}

.app-shell-header__inner {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  width: 100%;
  height: 100%;
  padding: 0 18px 0 10px;
}

.app-shell-header__left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.app-shell-header__nav,
.app-shell-header__icon-button {
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.app-shell-header__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.app-shell-header__brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background:
    linear-gradient(160deg, rgba(var(--v-theme-primary), 0.18), rgba(var(--v-theme-info), 0.14)),
    rgba(var(--v-theme-surface), 0.92);
  color: rgb(var(--v-theme-primary));
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-primary), 0.14);
}

.app-shell-header__brand-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-shell-header__brand-label {
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.1;
  color: rgba(var(--v-theme-on-surface), 0.9);
}

.app-shell-header__brand-meta {
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.52);
}

.app-shell-header__context {
  min-width: 0;
  overflow: hidden;
}

.app-shell-header__breadcrumb-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.app-shell-header__context-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 12px;
  flex-shrink: 0;
}

.app-shell-header__context-icon.tone-primary {
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
}

.app-shell-header__context-icon.tone-secondary {
  background: rgba(var(--v-theme-secondary), 0.12);
  color: rgb(var(--v-theme-secondary));
}

.app-shell-header__context-icon.tone-success {
  background: rgba(var(--v-theme-success), 0.14);
  color: rgb(var(--v-theme-success));
}

.app-shell-header__context-icon.tone-info {
  background: rgba(var(--v-theme-info), 0.14);
  color: rgb(var(--v-theme-info));
}

.app-shell-header__context-icon.tone-warning {
  background: rgba(var(--v-theme-warning), 0.16);
  color: rgba(var(--v-theme-on-warning), 0.92);
}

.app-shell-header__context-icon.tone-error {
  background: rgba(var(--v-theme-error), 0.14);
  color: rgb(var(--v-theme-error));
}

.app-shell-header__breadcrumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.52);
}

.app-shell-header__breadcrumb {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.78rem;
}

.app-shell-header__breadcrumb.is-current {
  color: rgba(var(--v-theme-on-surface), 0.8);
  font-weight: 600;
}

.app-shell-header__crumb-separator {
  flex-shrink: 0;
  color: rgba(var(--v-theme-on-surface), 0.34);
}

.app-shell-header__eyebrow {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-primary), 0.84);
}

.app-shell-header__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.app-shell-header__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: clamp(1.02rem, 1vw + 0.72rem, 1.35rem);
  line-height: 1.15;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.94);
}

.app-shell-header__description {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 4px;
  font-size: 0.82rem;
  color: rgba(var(--v-theme-on-surface), 0.58);
}

.app-shell-header__dut-chip {
  flex-shrink: 0;
  font-weight: 600;
}

.app-shell-header__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.app-shell-header__account {
  height: 46px;
  padding: 0 10px;
  border-radius: 18px;
  color: rgba(var(--v-theme-on-surface), 0.88);
  background: rgba(var(--v-theme-on-surface), 0.03);
  box-shadow: inset 0 0 0 1px rgba(var(--v-border-color), var(--v-border-opacity));
}

.app-shell-header__account-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  line-height: 1.05;
}

.app-shell-header__account-name {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.86rem;
  font-weight: 700;
}

.app-shell-header__account-role {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.72rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.app-shell-header__menu-card {
  border-radius: 20px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

@media (max-width: 959px) {
  .app-shell-header__inner {
    grid-template-columns: auto 1fr auto;
    gap: 12px;
    padding-inline: 8px 12px;
  }

  .app-shell-header__title {
    font-size: 1rem;
  }
}

@media (max-width: 599px) {
  .app-shell-header__context {
    min-width: 0;
  }

  .app-shell-header__eyebrow {
    font-size: 0.62rem;
  }

  .app-shell-header__brand-mark {
    width: 36px;
    height: 36px;
  }
}
</style>