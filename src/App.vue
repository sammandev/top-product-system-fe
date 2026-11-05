<template>
  <AppToastHost />
  <router-view v-slot="{ Component }">
    <KeepAlive :include="cachedRouteViews" :max="MAX_CACHED_ROUTE_VIEWS">
      <component :is="Component" />
    </KeepAlive>
  </router-view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import AppToastHost from '@/shared/ui/toast/AppToastHost.vue'

// SFC names inferred from filenames. Views whose data must be fresh on every visit
// (e.g. TopProductDatabaseView, DashboardView) are intentionally not cached.
const CACHED_ROUTE_VIEWS = ['DataExplorerView', 'TopProductsView', 'AnalysisView', 'PATrendView']
const MAX_CACHED_ROUTE_VIEWS = 5

const authStore = useAuthStore()
// An empty include on logout prunes cached pages so the next user never sees prior data.
const cachedRouteViews = computed(() => (authStore.isAuthenticated ? CACHED_ROUTE_VIEWS : []))
</script>

<style>
@layer base {
  #app {
    min-height: 100vh;
  }
}
</style>
