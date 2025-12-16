<template>
    <v-card>
        <v-card-title class="d-flex align-center">
            <v-icon start>mdi-calendar-range</v-icon>
            Date Range Selection
        </v-card-title>

        <v-card-text>
            <!-- Preset Buttons -->
            <div class="d-flex gap-2 mb-4">
                <v-btn size="small" variant="tonal" prepend-icon="mdi-calendar-today" @click="setToday">
                    Today
                </v-btn>
                <v-btn size="small" variant="tonal" prepend-icon="mdi-calendar-week" @click="setLast7Days">
                    Last 7 Days
                </v-btn>
                <v-btn size="small" variant="tonal" prepend-icon="mdi-calendar-month" @click="setLast30Days">
                    Last 30 Days
                </v-btn>
                <v-btn v-if="startDate || endDate" size="small" variant="text" prepend-icon="mdi-close"
                    @click="clearDates">
                    Clear
                </v-btn>
            </div>

            <v-row>
                <!-- Start Date -->
                <v-col cols="12" md="6">
                    <v-text-field v-model="startDate" label="Start Date" type="date" variant="outlined"
                        density="comfortable" prepend-inner-icon="mdi-calendar-start" :max="maxStartDate"
                        :error-messages="startDateError" @update:model-value="handleStartDateChange" />
                </v-col>

                <!-- End Date -->
                <v-col cols="12" md="6">
                    <v-text-field v-model="endDate" label="End Date" type="date" variant="outlined"
                        density="comfortable" prepend-inner-icon="mdi-calendar-end" :min="minEndDate" :max="today"
                        :error-messages="endDateError" @update:model-value="handleEndDateChange" />
                </v-col>
            </v-row>

            <!-- Date Range Info -->
            <v-alert v-if="isValidRange" type="success" variant="tonal" density="compact" class="mt-2">
                <template #prepend>
                    <v-icon>mdi-check-circle</v-icon>
                </template>
                <div class="text-caption">
                    <strong>{{ rangeDays }} day{{ rangeDays !== 1 ? 's' : '' }}</strong> selected
                    ({{ formatDate(startDate) }} to {{ formatDate(endDate) }})
                </div>
            </v-alert>

            <!-- Validation Alert -->
            <v-alert v-else-if="showValidation && (!startDate || !endDate)" type="warning" variant="tonal"
                density="compact" class="mt-2">
                <template #prepend>
                    <v-icon>mdi-alert</v-icon>
                </template>
                <div class="text-caption">
                    Please select both start and end dates
                </div>
            </v-alert>

            <!-- Range Exceeded Warning -->
            <v-alert v-else-if="rangeExceeded" type="error" variant="tonal" density="compact" class="mt-2">
                <template #prepend>
                    <v-icon>mdi-alert-circle</v-icon>
                </template>
                <div class="text-caption">
                    Date range cannot exceed {{ maxDays }} days. Current range: {{ rangeDays }} days.
                </div>
            </v-alert>

            <!-- Invalid Range Warning -->
            <v-alert v-else-if="startDate && endDate && !isValidRange" type="error" variant="tonal" density="compact"
                class="mt-2">
                <template #prepend>
                    <v-icon>mdi-alert-circle</v-icon>
                </template>
                <div class="text-caption">
                    End date must be after start date
                </div>
            </v-alert>

            <!-- Hint -->
            <div class="text-caption text-medium-emphasis mt-2">
                Maximum date range: {{ maxDays }} days
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'

// Props
interface Props {
    modelValue: {
        startDate: string
        endDate: string
    }
    maxDays?: number
    showValidation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    maxDays: 7,
    showValidation: false
})

// Emits
interface Emits {
    (e: 'update:modelValue', value: { startDate: string; endDate: string }): void
    (e: 'change', value: { startDate: string; endDate: string; valid: boolean }): void
}

const emit = defineEmits<Emits>()

// State
const startDate = ref<string>(props.modelValue.startDate)
const endDate = ref<string>(props.modelValue.endDate)
const startDateError = ref<string>('')
const endDateError = ref<string>('')

// Computed
const today = computed(() => dayjs().format('YYYY-MM-DD'))

const maxStartDate = computed(() => {
    if (endDate.value) {
        return dayjs(endDate.value).format('YYYY-MM-DD')
    }
    return today.value
})

const minEndDate = computed(() => {
    if (startDate.value) {
        return dayjs(startDate.value).format('YYYY-MM-DD')
    }
    return ''
})

const rangeDays = computed(() => {
    if (!startDate.value || !endDate.value) return 0

    const start = dayjs(startDate.value)
    const end = dayjs(endDate.value)
    return end.diff(start, 'day') + 1 // Include both start and end days
})

const rangeExceeded = computed(() => {
    if (!startDate.value || !endDate.value) return false
    return rangeDays.value > props.maxDays
})

const isValidRange = computed(() => {
    if (!startDate.value || !endDate.value) return false

    const start = dayjs(startDate.value)
    const end = dayjs(endDate.value)

    // End date must be after or equal to start date
    if (end.isBefore(start)) return false

    // Range must not exceed max days
    if (rangeDays.value > props.maxDays) return false

    return true
})

// Methods
function setToday() {
    const todayStr = dayjs().format('YYYY-MM-DD')
    startDate.value = todayStr
    endDate.value = todayStr
    validateAndEmit()
}

function setLast7Days() {
    endDate.value = dayjs().format('YYYY-MM-DD')
    startDate.value = dayjs().subtract(6, 'day').format('YYYY-MM-DD') // 6 days ago + today = 7 days
    validateAndEmit()
}

function setLast30Days() {
    endDate.value = dayjs().format('YYYY-MM-DD')
    startDate.value = dayjs().subtract(29, 'day').format('YYYY-MM-DD') // 29 days ago + today = 30 days
    validateAndEmit()
}

function clearDates() {
    startDate.value = ''
    endDate.value = ''
    startDateError.value = ''
    endDateError.value = ''
    validateAndEmit()
}

function handleStartDateChange() {
    startDateError.value = ''

    // If end date is set and would exceed max range, adjust end date
    if (endDate.value) {
        const maxEnd = dayjs(startDate.value).add(props.maxDays - 1, 'day')
        if (dayjs(endDate.value).isAfter(maxEnd)) {
            endDate.value = maxEnd.format('YYYY-MM-DD')
        }
    }

    validateAndEmit()
}

function handleEndDateChange() {
    endDateError.value = ''

    // If start date is set and would exceed max range, adjust start date
    if (startDate.value) {
        const minStart = dayjs(endDate.value).subtract(props.maxDays - 1, 'day')
        if (dayjs(startDate.value).isBefore(minStart)) {
            startDate.value = minStart.format('YYYY-MM-DD')
        }
    }

    validateAndEmit()
}

function validateAndEmit() {
    // Clear previous errors
    startDateError.value = ''
    endDateError.value = ''

    // Validate
    if (startDate.value && endDate.value) {
        const start = dayjs(startDate.value)
        const end = dayjs(endDate.value)

        if (end.isBefore(start)) {
            endDateError.value = 'End date must be after start date'
        } else if (rangeDays.value > props.maxDays) {
            endDateError.value = `Range cannot exceed ${props.maxDays} days`
        }
    }

    // Emit update
    emit('update:modelValue', {
        startDate: startDate.value,
        endDate: endDate.value
    })

    // Emit detailed change event
    emit('change', {
        startDate: startDate.value,
        endDate: endDate.value,
        valid: isValidRange.value
    })
}

function formatDate(dateStr: string): string {
    if (!dateStr) return ''
    return dayjs(dateStr).format('MMM DD, YYYY')
}

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
    startDate.value = newValue.startDate
    endDate.value = newValue.endDate
}, { deep: true })
</script>

<style scoped>
.gap-2 {
    gap: 0.5rem;
}
</style>
