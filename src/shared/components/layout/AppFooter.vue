<template>
  <v-footer color="surface" class="border-t py-2" :elevation="0">
    <v-container fluid class="pa-2">
      <v-row align="center" justify="space-between" no-gutters>
        <v-col cols="12" md="4" class="text-center text-md-left py-1">
          <div class="d-flex align-center justify-center justify-md-start">
            <v-icon size="small" class="mr-2">mdi-test-tube</v-icon>
            <span class="text-caption font-weight-medium">{{ appName }}</span>
            <v-chip size="x-small" color="primary" class="ml-2" density="compact">v{{ appVersion }}</v-chip>
          </div>
        </v-col>

        <v-col cols="12" md="4" class="text-center py-1">
          <div class="text-caption text-medium-emphasis">
            © {{ currentYear }} {{ appName }}. All rights reserved.
          </div>
        </v-col>

        <v-col cols="12" md="4" class="text-center text-md-right py-1">
          <v-btn
            v-for="link in footerLinks"
            :key="link.title"
            :href="link.href"
            :icon="link.icon"
            size="x-small"
            variant="text"
            density="compact"
            class="mx-1"
            :title="link.title"
          />
        </v-col>
      </v-row>
    </v-container>
  </v-footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppConfigStore } from '@/core/stores/appConfig.store'

const currentYear = computed(() => new Date().getFullYear())
const appConfigStore = useAppConfigStore()
const { appName, appVersion } = storeToRefs(appConfigStore)

const footerLinks = [
  {
    title: 'Documentation',
    icon: 'mdi-book-open-variant',
    href: '#'
  },
  {
    title: 'Support',
    icon: 'mdi-help-circle',
    href: '#'
  },
  {
    title: 'GitHub',
    icon: 'mdi-github',
    href: '#'
  },
  {
    title: 'Settings',
    icon: 'mdi-cog',
    href: '#'
  }
]
</script>

<style scoped>
.border-t {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
