<template>
  <div class="not-found-layout">
    <v-main class="not-found-main d-flex flex-column">
      <v-container class="flex-grow-1 d-flex align-center justify-center text-center">
        <v-row justify="center" align="center">
          <v-col cols="12">
            <v-icon size="120" color="grey">mdi-alert-circle-outline</v-icon>
            <h1 class="text-h3 mt-4">404</h1>
            <p class="text-h6 mt-2">Page Not Found</p>
            <v-btn color="primary" class="mt-4" to="/dashboard">Go to Dashboard</v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-footer height="56" class="not-found-footer">
      <span>&copy; {{ currentYear }} {{ appName }}. All rights reserved.</span>
    </v-footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppConfigStore } from '@/core/stores/appConfig.store'

const currentYear = new Date().getFullYear()
const appConfigStore = useAppConfigStore()
const { appName } = storeToRefs(appConfigStore)
</script>

<style scoped>
.not-found-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.not-found-main {
  flex: 1 1 auto;
  padding: 48px 16px;
  overflow-y: auto;
  background-color: rgb(var(--v-theme-background));
}

.not-found-footer {
  flex: 0 0 auto;
  justify-content: center;
  gap: 8px;
  font-size: 0.875rem;
  padding-inline: 24px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity, 0.12));
}
</style>
