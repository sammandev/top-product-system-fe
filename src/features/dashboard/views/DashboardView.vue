<template>
  <DefaultLayout>
    <!-- Welcome Section -->
    <div class="mb-6 d-flex justify-space-between align-center">
      <div>
        <h1 class="text-h4 font-weight-bold mb-2">Welcome back, {{ userName }}!</h1>
        <p v-if="error" class="text-error text-caption">{{ error }}</p>
      </div>
      <v-btn :loading="loading" :disabled="loading" color="primary" variant="tonal" prepend-icon="mdi-refresh"
        @click="refreshStats">
        Refresh
      </v-btn>
    </div>

    <!-- Loading Overlay -->
    <v-overlay :model-value="loading && !stats.length" contained class="align-center justify-center">
      <v-progress-circular indeterminate size="64" color="primary" />
    </v-overlay>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col v-for="stat in stats" :key="stat.title" cols="12" sm="6" md="3">
        <v-card :color="stat.color" variant="tonal" hover :ripple="false" class="stat-card">
          <v-card-text>
            <div class="d-flex justify-space-between align-start mb-4">
              <div>
                <p class="text-caption text-medium-emphasis mb-1">{{ stat.title }}</p>
                <h2 class="text-h4 font-weight-bold">{{ stat.value }}</h2>
                <p class="text-caption mt-1" :class="stat.trend >= 0 ? 'text-success' : 'text-error'">
                  <v-icon size="small">{{ stat.trend >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>
                  {{ Math.abs(stat.trend).toFixed(1) }}% activity rate
                </p>
              </div>
              <v-avatar :color="stat.color" size="48" variant="flat">
                <v-icon size="28">{{ stat.icon }}</v-icon>
              </v-avatar>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Quick Actions -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card class="quick-actions-card">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-lightning-bolt</v-icon>
            Quick Actions
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col v-for="action in quickActions" :key="action.title" cols="12" sm="6" md="4">
                <v-card :color="action.color" variant="tonal" hover class="action-card" :to="action.path">
                  <v-card-text class="text-center pa-6">
                    <v-avatar :color="action.color" size="56" class="mb-3">
                      <v-icon size="32">{{ action.icon }}</v-icon>
                    </v-avatar>
                    <h3 class="text-h6 mb-2">{{ action.title }}</h3>
                    <p class="text-caption text-medium-emphasis">{{ action.subtitle }}</p>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Recent Activity & Charts -->
    <v-row>
      <!-- Recent Activity -->
      <v-col cols="12" md="7">
        <v-card class="activity-card">
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-history</v-icon>
              Recent Activity
            </div>
            <v-btn variant="text" size="small" color="primary" to="/activity">View All</v-btn>
          </v-card-title>
          <v-card-text>
            <v-timeline side="end" density="compact" truncate-line="both">
              <v-timeline-item v-for="(activity, index) in recentActivities" :key="index" :dot-color="activity.color"
                size="small">
                <template #icon>
                  <v-icon size="x-small">{{ activity.icon }}</v-icon>
                </template>
                <div class="d-flex justify-space-between align-center">
                  <div>
                    <p class="font-weight-medium mb-1">{{ activity.title }}</p>
                    <p class="text-caption text-medium-emphasis">{{ activity.description }}</p>
                  </div>
                  <p class="text-caption text-medium-emphasis">{{ activity.time }}</p>
                </div>
              </v-timeline-item>
            </v-timeline>
          </v-card-text>
        </v-card>
      </v-col> <!-- System Status -->
      <v-col cols="12" md="5">
        <v-card class="status-card mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-information</v-icon>
            System Status
          </v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item v-for="status in systemStatus" :key="status.label" class="px-0">
                <template #prepend>
                  <v-icon :color="status.color" size="small">{{ status.icon }}</v-icon>
                </template>
                <v-list-item-title>{{ status.label }}</v-list-item-title>
                <template #append>
                  <v-chip :color="status.color" size="small" variant="flat">
                    {{ status.value }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- Storage Card -->
        <!-- <v-card class="storage-card">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-harddisk</v-icon>
            Storage Usage
          </v-card-title>
          <v-card-text>
            <div class="text-center mb-4">
              <h2 class="text-h3 font-weight-bold">{{ storageUsed }}GB</h2>
              <p class="text-caption text-medium-emphasis">of {{ storageTotal }}GB used</p>
            </div>
            <v-progress-linear :model-value="storagePercentage" :color="storagePercentage > 80 ? 'error' : 'primary'"
              height="8" rounded />
            <p class="text-caption text-center mt-2 text-medium-emphasis">{{ storagePercentage }}% capacity</p>
          </v-card-text>
        </v-card> -->
      </v-col>
    </v-row>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { useDashboard } from '../composables'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const {
  loading,
  error,
  stats,
  quickActions,
  recentActivities,
  systemStatus,
  storageUsed,
  storageTotal,
  storagePercentage,
  userName,
  refreshStats
} = useDashboard()
</script>

<style scoped>
.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  height: 100%;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.action-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  height: 100%;
}

.action-card:hover {
  transform: translateY(-4px);
}

.quick-actions-card,
.activity-card,
.status-card,
.storage-card {
  height: 100%;
}

:deep(.v-timeline-item__body) {
  padding-inline-start: 16px !important;
}

/* Responsive adjustments */
@media (max-width: 599px) {

  /* Disable hover effects on mobile */
  .stat-card:hover,
  .action-card:hover {
    transform: none;
  }

  /* Adjust typography on mobile */
  .text-h4 {
    font-size: 1.5rem !important;
  }

  .text-h6 {
    font-size: 1.125rem !important;
  }
}

:deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
}

:deep(.v-list) {
  flex: 1;
}
</style>
