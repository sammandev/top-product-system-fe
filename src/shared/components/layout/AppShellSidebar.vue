<template>
  <v-navigation-drawer
    :model-value="modelValue"
    @update:model-value="(value) => $emit('update:modelValue', value)"
    app
    color="surface"
    elevation="0"
    class="app-shell-sidebar"
    :temporary="isMobile"
    :rail="isCollapsed"
    :expand-on-hover="!isMobile && rail && modelValue"
    :width="sidebarWidth"
    :rail-width="sidebarRailWidth"
  >
    <div class="app-shell-sidebar__topband" />

    <div class="app-shell-sidebar__header" :class="{ 'is-collapsed': isCollapsed }">
      <div class="app-shell-sidebar__brand-wrap">
        <div class="app-shell-sidebar__brand-mark">
          <v-icon size="22">mdi-atom-variant</v-icon>
        </div>

        <div v-if="!isCollapsed" class="app-shell-sidebar__brand-copy">
          <span class="app-shell-sidebar__brand-title">{{ appName }}</span>
          <span class="app-shell-sidebar__brand-subtitle">Enterprise analysis workspace</span>
        </div>
      </div>

      <div class="app-shell-sidebar__controls">
        <v-tooltip v-if="isCollapsed" text="Expand navigation">
          <template #activator="{ props }">
            <v-btn v-bind="props" icon variant="text" size="small" @click="$emit('update:rail', false)">
              <v-icon>mdi-arrow-expand-right</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-btn
          v-if="isMobile"
          icon
          variant="text"
          size="small"
          class="app-shell-sidebar__close"
          @click="$emit('update:modelValue', false)"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
    </div>

    <div v-if="!isCollapsed" class="app-shell-sidebar__search">
      <v-text-field
        :model-value="searchQuery"
        density="compact"
        hide-details
        clearable
        rounded="xl"
        prepend-inner-icon="mdi-magnify"
        placeholder="Search workspace menu"
        @update:model-value="(value) => $emit('update:searchQuery', value ?? '')"
      />

      <div class="app-shell-sidebar__status" :class="`tone-${menuStatusTone}`">
        <div class="app-shell-sidebar__status-copy">
          <span class="app-shell-sidebar__status-label">{{ menuStatusLabel }}</span>
          <span class="app-shell-sidebar__status-detail">{{ menuStatusDetail }}</span>
        </div>

        <v-btn
          icon
          variant="text"
          size="small"
          :loading="menuLoading"
          class="app-shell-sidebar__status-action"
          @click="$emit('refresh-menus')"
        >
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </div>
    </div>

    <div v-else class="app-shell-sidebar__rail-actions">
      <v-tooltip text="Search menu">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon variant="text" size="small" @click="handleExpandForSearch">
            <v-icon>mdi-magnify</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip :text="menuStatusLabel">
        <template #activator="{ props }">
          <v-badge dot :color="menuStatusTone" offset-x="6" offset-y="6">
            <v-btn v-bind="props" icon variant="text" size="small" @click="$emit('refresh-menus')">
              <v-icon>mdi-shield-check-outline</v-icon>
            </v-btn>
          </v-badge>
        </template>
      </v-tooltip>
    </div>

    <v-list density="compact" nav class="app-shell-sidebar__menu">
      <section v-for="section in sections" :key="section.key" class="app-shell-sidebar__section">
        <div v-if="!isCollapsed" class="app-shell-sidebar__section-head">
          <span class="app-shell-sidebar__section-label">{{ section.label }}</span>
          <span class="app-shell-sidebar__section-caption">{{ section.caption }}</span>
        </div>

        <template v-for="item in section.items" :key="item.path || item.title">
          <v-list-group v-if="item.children" fluid :value="item.title">
            <template #activator="{ props }">
              <v-list-item
                v-bind="props"
                :prepend-icon="item.icon"
                :title="item.title"
                rounded="xl"
                color="primary"
                class="app-shell-sidebar__item"
                :active="isChildActive(item)"
              />
            </template>

            <v-list-item
              v-for="child in item.children"
              :key="child.path || child.title"
              :prepend-icon="child.icon"
              :title="child.title"
              :to="child.path"
              rounded="xl"
              color="primary"
              class="app-shell-sidebar__child"
              @click="handleNavigate"
            />
          </v-list-group>

          <v-list-item
            v-else
            :prepend-icon="item.icon"
            :title="item.title"
            :to="item.path"
            rounded="xl"
            color="primary"
            class="app-shell-sidebar__item"
            @click="handleNavigate"
          />
        </template>
      </section>
    </v-list>

    <template #append>
      <div class="app-shell-sidebar__footer" :class="{ 'is-collapsed': isCollapsed }">
        <div v-if="!isCollapsed" class="app-shell-sidebar__account-card">
          <div class="app-shell-sidebar__account-copy">
            <span class="app-shell-sidebar__account-name">{{ displayName }}</span>
            <span class="app-shell-sidebar__account-subtitle">{{ accessLabel }}</span>
          </div>

          <v-chip
            :color="isGuest ? 'warning' : usingFallbackMenus ? 'warning' : 'success'"
            size="small"
            variant="tonal"
          >
            {{ isGuest ? 'Guest' : usingFallbackMenus ? 'Fallback' : 'Ready' }}
          </v-chip>
        </div>

        <div class="app-shell-sidebar__footer-actions">
          <v-btn
            :icon="isCollapsed ? 'mdi-logout' : undefined"
            :prepend-icon="!isCollapsed ? 'mdi-logout' : undefined"
            :block="!isCollapsed"
            :variant="isCollapsed ? 'text' : 'tonal'"
            color="error"
            rounded="xl"
            @click="$emit('logout')"
          >
            <span v-if="!isCollapsed">Logout</span>
          </v-btn>

          <v-btn
            v-if="canToggleRail"
            :icon="isCollapsed ? 'mdi-arrow-expand-right' : 'mdi-arrow-collapse-left'"
            variant="text"
            rounded="xl"
            @click="$emit('update:rail', !rail)"
          />
        </div>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ShellMenuItem, ShellMenuSection } from '@/shared/composables'

const props = defineProps<{
  modelValue: boolean
  rail: boolean
  searchQuery: string
  sections: ShellMenuSection[]
  currentPath: string
  appName: string
  displayName: string
  accessLabel: string
  isGuest: boolean
  isMobile: boolean
  canToggleRail: boolean
  menuLoading: boolean
  menuStatusTone: 'success' | 'warning' | 'info'
  menuStatusLabel: string
  menuStatusDetail: string
  usingFallbackMenus: boolean
  sidebarWidth: number
  sidebarRailWidth: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:rail': [value: boolean]
  'update:searchQuery': [value: string]
  'refresh-menus': []
  logout: []
}>()

const isCollapsed = computed(() => !props.isMobile && props.rail)

function isChildActive(item: ShellMenuItem): boolean {
  return item.children?.some((child) => child.path === props.currentPath) ?? false
}

function handleNavigate() {
  if (props.isMobile) {
    emit('update:modelValue', false)
  }
}

function handleExpandForSearch() {
  emit('update:rail', false)
}
</script>

<style scoped>
.app-shell-sidebar {
  border-right: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) + 0.04));
  background:
    linear-gradient(180deg, rgba(var(--v-theme-surface), 0.98), rgba(var(--v-theme-background), 0.96)),
    radial-gradient(circle at top, rgba(var(--v-theme-primary), 0.12), transparent 32%);
}

.app-shell-sidebar__topband {
  height: 4px;
  background: linear-gradient(90deg, rgb(var(--v-theme-primary)), rgba(var(--v-theme-info), 0.72));
}

.app-shell-sidebar__header,
.app-shell-sidebar__search,
.app-shell-sidebar__footer {
  padding-inline: 14px;
}

.app-shell-sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 14px;
  padding-bottom: 12px;
}

.app-shell-sidebar__header.is-collapsed {
  justify-content: center;
  padding-inline: 8px;
}

.app-shell-sidebar__brand-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.app-shell-sidebar__brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 15px;
  background: linear-gradient(180deg, rgba(var(--v-theme-primary), 0.18), rgba(var(--v-theme-primary), 0.08));
  color: rgb(var(--v-theme-primary));
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-primary), 0.12);
}

.app-shell-sidebar__brand-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-shell-sidebar__brand-title {
  font-size: 0.94rem;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.9);
}

.app-shell-sidebar__brand-subtitle {
  font-size: 0.72rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.app-shell-sidebar__controls,
.app-shell-sidebar__rail-actions,
.app-shell-sidebar__footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-shell-sidebar__search {
  padding-bottom: 10px;
}

.app-shell-sidebar__status {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding: 12px 12px 12px 14px;
  border-radius: 18px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.app-shell-sidebar__status.tone-success {
  background: rgba(var(--v-theme-success), 0.08);
}

.app-shell-sidebar__status.tone-warning {
  background: rgba(var(--v-theme-warning), 0.12);
}

.app-shell-sidebar__status.tone-info {
  background: rgba(var(--v-theme-info), 0.08);
}

.app-shell-sidebar__status-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.app-shell-sidebar__status-label {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.app-shell-sidebar__status-detail {
  font-size: 0.76rem;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), 0.64);
}

.app-shell-sidebar__status-action {
  flex-shrink: 0;
}

.app-shell-sidebar__rail-actions {
  justify-content: center;
  padding: 6px 0 10px;
}

.app-shell-sidebar__menu {
  flex: 1;
  overflow-y: auto;
  padding: 6px 10px 14px;
}

.app-shell-sidebar__section + .app-shell-sidebar__section {
  margin-top: 14px;
}

.app-shell-sidebar__section-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 8px 8px;
}

.app-shell-sidebar__section-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-primary), 0.84);
}

.app-shell-sidebar__section-caption {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.app-shell-sidebar__item,
.app-shell-sidebar__child {
  margin-bottom: 6px;
}

:deep(.app-shell-sidebar .v-list-item) {
  min-height: 46px;
}

:deep(.app-shell-sidebar .v-list-item--active) {
  background: linear-gradient(90deg, rgba(var(--v-theme-primary), 0.16), rgba(var(--v-theme-primary), 0.06));
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-primary), 0.08);
}

:deep(.app-shell-sidebar .v-list-item-title) {
  font-size: 0.9rem;
  font-weight: 600;
}

.app-shell-sidebar__footer {
  padding-top: 12px;
  padding-bottom: 14px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface), 0.88);
}

.app-shell-sidebar__footer.is-collapsed {
  padding-inline: 8px;
}

.app-shell-sidebar__account-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(var(--v-theme-on-surface), 0.03);
  box-shadow: inset 0 0 0 1px rgba(var(--v-border-color), var(--v-border-opacity));
}

.app-shell-sidebar__account-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-shell-sidebar__account-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.88rem;
  font-weight: 700;
}

.app-shell-sidebar__account-subtitle {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.56);
}

.app-shell-sidebar__footer-actions {
  justify-content: space-between;
}

@media (max-width: 959px) {
  .app-shell-sidebar__header,
  .app-shell-sidebar__search,
  .app-shell-sidebar__footer {
    padding-inline: 12px;
  }

  .app-shell-sidebar__menu {
    padding-inline: 8px;
  }
}
</style>