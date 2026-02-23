<template>
    <v-card>
        <v-card-title class="bg-primary">
            <v-icon class="mr-2">mdi-table</v-icon>
            {{ title }}
        </v-card-title>

        <v-card-text>
            <!-- Loading State -->
            <div v-if="loading" class="text-center py-8">
                <v-progress-circular indeterminate color="primary" size="64" />
                <p class="text-medium-emphasis mt-4">Loading PA trend data...</p>
            </div>

            <!-- Empty State -->
            <div v-else-if="data.length === 0" class="text-center py-8">
                <v-icon size="64" color="grey-lighten-1">mdi-information-outline</v-icon>
                <p class="text-h6 text-medium-emphasis mt-4">No data available</p>
                <p class="text-caption">Set filters and click "Analyze" to fetch PA trend data.</p>
            </div>

            <!-- Results Table -->
            <div v-else>
                <!-- Summary Info -->
                <v-alert type="info" variant="tonal" class="mb-4">
                    <div class="d-flex justify-space-between align-center">
                        <div>
                            <strong>Total Records:</strong> {{ data.length }}
                        </div>
                        <div>
                            <strong>Total Trend Items:</strong> {{ totalTrendItems }}
                        </div>
                    </div>
                </v-alert>

                <!-- Expandable Data Table -->
                <v-data-table :headers="headers" :items="data" :items-per-page="10" item-value="isn" show-expand
                    density="comfortable">
                    <!-- ISN Column -->
                    <template #item.isn="{ item }">
                        <span class="font-weight-medium">{{ item.isn || 'N/A' }}</span>
                    </template>

                    <!-- Station ID Column -->
                    <template #item.station_id="{ item }">
                        <v-chip size="small" color="primary" variant="tonal">
                            {{ item.station_id }}
                        </v-chip>
                    </template>

                    <!-- Station Name Column -->
                    <template #item.station_name="{ item }">
                        {{ item.station_name }}
                    </template>

                    <!-- Device Column -->
                    <template #item.device="{ item }">
                        <span class="text-medium-emphasis">{{ item.device || 'N/A' }}</span>
                    </template>

                    <!-- Test Date Column -->
                    <template #item.test_date="{ item }">
                        <span v-if="item.test_date">
                            {{ formatDate(item.test_date) }}
                        </span>
                        <span v-else class="text-medium-emphasis">N/A</span>
                    </template>

                    <!-- Trend Items Count -->
                    <template #item.trend_items_count="{ item }">
                        <v-chip size="small" color="success" variant="tonal">
                            {{ getTrendItemsCount(item) }} items
                        </v-chip>
                    </template>

                    <!-- Expanded Row: Show Trend Items -->
                    <template #expanded-row="{ item }">
                        <tr>
                            <td :colspan="headers.length + 1">
                                <v-card variant="flat" class="ma-2">
                                    <v-card-title class="text-subtitle-2 bg-grey-lighten-4">
                                        <v-icon size="small" class="mr-2">mdi-list-box</v-icon>
                                        Trend Items Details
                                    </v-card-title>
                                    <v-card-text>
                                        <v-table density="compact">
                                            <thead>
                                                <tr>
                                                    <th>Test Item Name</th>
                                                    <th>MID</th>
                                                    <th>Mean</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr v-for="(trendItem, idx) in getTrendItems(item)" :key="idx">
                                                    <td class="font-weight-medium">{{ trendItem.test_item_name }}</td>
                                                    <td>
                                                        <span v-if="trendItem.mid !== null">{{ trendItem.mid }}</span>
                                                        <span v-else class="text-medium-emphasis">N/A</span>
                                                    </td>
                                                    <td>
                                                        <span v-if="trendItem.mean !== null">{{
                                                            trendItem.mean.toFixed(4) }}</span>
                                                        <span v-else class="text-medium-emphasis">N/A</span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </v-table>
                                    </v-card-text>
                                </v-card>
                            </td>
                        </tr>
                    </template>
                </v-data-table>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { computed } from 'vue'
import type { PADiffStationDataSchema, PATrendStationDataSchema } from '@/core/types'

dayjs.extend(utc)
dayjs.extend(timezone)

// Props
const props = defineProps<{
  data: PATrendStationDataSchema[] | PADiffStationDataSchema[]
  loading: boolean
  title: string
  type: 'auto' | 'dex' | 'diff'
}>()

// Headers for data table
const headers = [
  { title: 'ISN', key: 'isn', sortable: true },
  { title: 'Station ID', key: 'station_id', sortable: true },
  { title: 'Station Name', key: 'station_name', sortable: true },
  { title: 'Device', key: 'device', sortable: true },
  { title: 'Test Date', key: 'test_date', sortable: true },
  { title: 'Trend Items', key: 'trend_items_count', sortable: false },
]

// Computed
const totalTrendItems = computed(() => {
  return props.data.reduce((sum, item) => {
    return sum + getTrendItemsCount(item)
  }, 0)
})

// Helper Functions
function getTrendItems(item: PATrendStationDataSchema | PADiffStationDataSchema) {
  if ('trend_items' in item) {
    return item.trend_items
  } else if ('trend_diff_items' in item) {
    return item.trend_diff_items
  }
  return []
}

function getTrendItemsCount(item: PATrendStationDataSchema | PADiffStationDataSchema): number {
  return getTrendItems(item).length
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A'

  try {
    // Parse as UTC and convert to user's local timezone
    return dayjs.utc(dateString).tz(dayjs.tz.guess()).format('YYYY-MM-DD HH:mm:ss')
  } catch {
    return dateString
  }
}
</script>

<style scoped>
.v-data-table {
    background: transparent;
}
</style>
