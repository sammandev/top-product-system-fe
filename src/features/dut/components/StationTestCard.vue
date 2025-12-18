<template>
    <!-- Single data: show as card without expansion -->
    <v-card v-if="station.data.length === 1" variant="outlined">
        <v-card-title class="bg-secondary">
            <span class="font-weight-bold">{{ station.name }}</span>
        </v-card-title>
        <v-card-text class="pa-0">
            <!-- Test Records -->
            <v-row class="ma-0">
                <v-col v-for="record in station.data" :key="record.id" cols="12" class="pa-2">
                    <v-card variant="flat" class="h-100" :color="record.test_result !== 1 ? 'red-lighten-5' : ''">
                        <v-card-title class="text-subtitle-1">
                            {{ station.name }}
                        </v-card-title>
                            <v-card-text>
                                <v-list density="compact">
                                    <v-list-item>
                                        <template #prepend>
                                            <v-icon>mdi-chip</v-icon>
                                        </template>
                                        <v-list-item-title>Device</v-list-item-title>
                                        <v-list-item-subtitle>
                                            {{ record.device_id__name }}
                                        </v-list-item-subtitle>
                                    </v-list-item>

                                    <v-list-item>
                                        <template #prepend>
                                            <v-icon>mdi-barcode</v-icon>
                                        </template>
                                        <v-list-item-title>DUT ISN</v-list-item-title>
                                        <v-list-item-subtitle>
                                            {{ record.dut_id__isn }}
                                        </v-list-item-subtitle>
                                    </v-list-item>

                                    <v-list-item>
                                        <template #prepend>
                                            <v-icon :color="record.test_result === 1 ? 'success' : 'error'">
                                                {{ record.test_result === 1 ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                                            </v-icon>
                                        </template>
                                        <v-list-item-title>Status</v-list-item-title>
                                        <v-list-item-subtitle style="white-space: normal; word-break: break-word; text-overflow: clip; overflow-wrap: break-word;">
                                            <strong :class="record.test_result === 1 ? 'text-success' : 'text-error'">
                                                {{ record.test_result === 1 ? 'PASS' : record.error_item || 'FAIL' }}
                                            </strong>
                                        </v-list-item-subtitle>
                                    </v-list-item>

                                    <v-list-item>
                                        <template #prepend>
                                            <v-icon>mdi-timer-outline</v-icon>
                                        </template>
                                        <v-list-item-title>Duration</v-list-item-title>
                                        <v-list-item-subtitle>
                                            {{ record.test_duration }}s
                                        </v-list-item-subtitle>
                                    </v-list-item>

                                    <v-list-item>
                                        <template #prepend>
                                            <v-icon>mdi-calendar-clock</v-icon>
                                        </template>
                                        <v-list-item-title>Test Date</v-list-item-title>
                                        <v-list-item-subtitle>
                                            {{ formatDate(record.test_date) }}
                                        </v-list-item-subtitle>
                                    </v-list-item>
                                </v-list>
                            </v-card-text>

                            <v-card-actions>
                                <v-btn color="primary" variant="elevated" prepend-icon="mdi-download"
                                    :loading="downloadingRecordId === record.id"
                                    @click="$emit('download', { station, record })" block>
                                    Download Test Log
                                </v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-col>
            </v-row>
        </v-card-text>
    </v-card>

    <!-- Multiple data: show with expansion panel -->
    <v-expansion-panels v-else>
        <v-expansion-panel>
            <v-expansion-panel-title class="bg-secondary">
                <div class="d-flex align-center w-100">
                    <span class="font-weight-bold">{{ station.name }}</span>
                    <v-spacer />
                    <v-chip size="x-small" color="white" variant="outlined" class="mr-2">
                        {{ station.data.length }} record(s)
                    </v-chip>
                </div>
            </v-expansion-panel-title>

            <v-expansion-panel-text class="pa-0">
                <!-- Test Records -->
                <v-row class="ma-0">
                    <v-col v-for="(record, index) in station.data" :key="record.id" cols="12"
                        :sm="6" :md="6" :lg="4" class="pa-2">
                        <v-card variant="flat" class="h-100" :color="record.test_result !== 1 ? 'red-lighten-5' : ''">
                            <v-card-title class="text-subtitle-1">
                                Test Record #{{ index + 1 }}
                            </v-card-title>
                            <v-card-text>
                                <v-list density="compact">
                                    <v-list-item>
                                        <template #prepend>
                                            <v-icon>mdi-chip</v-icon>
                                        </template>
                                        <v-list-item-title>Device</v-list-item-title>
                                        <v-list-item-subtitle>
                                            {{ record.device_id__name }}
                                        </v-list-item-subtitle>
                                    </v-list-item>

                                    <v-list-item>
                                        <template #prepend>
                                            <v-icon>mdi-barcode</v-icon>
                                        </template>
                                        <v-list-item-title>DUT ISN</v-list-item-title>
                                        <v-list-item-subtitle>
                                            {{ record.dut_id__isn }}
                                        </v-list-item-subtitle>
                                    </v-list-item>

                                    <v-list-item>
                                        <template #prepend>
                                            <v-icon :color="record.test_result === 1 ? 'success' : 'error'">
                                                {{ record.test_result === 1 ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                                            </v-icon>
                                        </template>
                                        <v-list-item-title>Status</v-list-item-title>
                                        <v-list-item-subtitle style="white-space: normal; word-break: break-word; text-overflow: clip; overflow-wrap: break-word;">
                                            <strong :class="record.test_result === 1 ? 'text-success' : 'text-error'">
                                                {{ record.test_result === 1 ? 'PASS' : record.error_item || 'FAIL' }}
                                            </strong>
                                        </v-list-item-subtitle>
                                    </v-list-item>

                                    <v-list-item>
                                        <template #prepend>
                                            <v-icon>mdi-timer-outline</v-icon>
                                        </template>
                                        <v-list-item-title>Duration</v-list-item-title>
                                        <v-list-item-subtitle>
                                            {{ record.test_duration }}s
                                        </v-list-item-subtitle>
                                    </v-list-item>

                                    <v-list-item>
                                        <template #prepend>
                                            <v-icon>mdi-calendar-clock</v-icon>
                                        </template>
                                        <v-list-item-title>Test Date</v-list-item-title>
                                        <v-list-item-subtitle>
                                            {{ formatDate(record.test_date) }}
                                        </v-list-item-subtitle>
                                    </v-list-item>
                                </v-list>
                            </v-card-text>

                            <v-card-actions>
                                <v-btn color="primary" variant="elevated" prepend-icon="mdi-download"
                                    :loading="downloadingRecordId === record.id"
                                    @click="$emit('download', { station, record })" block>
                                    Download Test Log
                                </v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-col>
                </v-row>

                <!-- No Test Data -->
                <v-alert v-if="station.data.length === 0" type="info" variant="tonal" density="compact" class="ma-2">
                    No test records available for this station
                </v-alert>
            </v-expansion-panel-text>
        </v-expansion-panel>
    </v-expansion-panels>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

interface TestRecord {
    id: number
    test_date: string
    test_duration: number
    test_result: number
    error_item: string
    device_id: number
    device_id__name: string
    dut_id: number
    dut_id__isn: string
    site_name: string
}

interface Station {
    id: number
    name: string
    status: number
    order: number
    model_id: number
    site_name: string
    model_name: string
    data: TestRecord[]
    dut_isn: string
    dut_id: number
}

interface Props {
    station: Station
    downloadingRecordId?: number | null
}

interface Emits {
    (e: 'download', value: { station: Station; record: TestRecord }): void
}

defineProps<Props>()
defineEmits<Emits>()

const formatDate = (isoDate: string): string => {
    // Parse as UTC and convert to user's local timezone
    return dayjs.utc(isoDate).tz(dayjs.tz.guess()).format('YYYY-MM-DD HH:mm:ss')
}
</script>
