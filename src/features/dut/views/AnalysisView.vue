<template>
  <DefaultLayout>
    <h1 class="text-h4 mb-6">
      <v-icon color="primary" class="mr-2">mdi-chart-line</v-icon>
      Multi-DUT Analysis
    </h1>

    <v-card>
      <v-card-text>
        <p class="text-body-1 text-medium-emphasis mb-0">
          Perform comprehensive analysis across multiple DUTs (Devices Under Test) to identify patterns,
          trends, and performance metrics.
        </p>
      </v-card-text>
    </v-card>

    <v-alert type="info" class="mt-4" density="compact">
      <small>This feature requires external login access.</small>
    </v-alert>
  </DefaultLayout>
</template>

<script setup lang="ts">
import DefaultLayout from '@/layouts/DefaultLayout.vue'
</script>
