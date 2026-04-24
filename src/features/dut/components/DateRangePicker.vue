<template>
  <AppPanel
    eyebrow="Time Window"
    title="Date Range Selection"
    :description="`Choose a bounded range of up to ${maxDays} day${maxDays !== 1 ? 's' : ''} for the current query.`"
    tone="cool"
  >
    <div class="date-range-picker__preset-row">
      <button type="button" class="date-range-picker__button date-range-picker__button--ghost" @click="setToday">
        <Icon icon="mdi:calendar-today" />
        <span>Today</span>
      </button>
      <button type="button" class="date-range-picker__button date-range-picker__button--ghost" @click="setLast7Days">
        <Icon icon="mdi:calendar-week" />
        <span>Last 7 Days</span>
      </button>
      <button type="button" class="date-range-picker__button date-range-picker__button--ghost" @click="setLast30Days">
        <Icon icon="mdi:calendar-month" />
        <span>Last 30 Days</span>
      </button>
      <button v-if="startDate || endDate" type="button" class="date-range-picker__button date-range-picker__button--ghost" @click="clearDates">
        <Icon icon="mdi:close" />
        <span>Clear</span>
      </button>
    </div>

    <div class="date-range-picker__grid">
      <label class="date-range-picker__field">
        <span>Start Date</span>
        <input v-model="startDate" type="date" :max="maxStartDate" @input="handleStartDateChange">
        <small v-if="startDateError" class="date-range-picker__error">{{ startDateError }}</small>
      </label>

      <label class="date-range-picker__field">
        <span>End Date</span>
        <input v-model="endDate" type="date" :min="minEndDate" :max="today" @input="handleEndDateChange">
        <small v-if="endDateError" class="date-range-picker__error">{{ endDateError }}</small>
      </label>
    </div>

    <section v-if="isValidRange" class="date-range-picker__notice date-range-picker__notice--success">
      <strong>{{ rangeDays }} day{{ rangeDays !== 1 ? 's' : '' }}</strong>
      <span>{{ formatDate(startDate) }} to {{ formatDate(endDate) }}</span>
    </section>

    <section v-else-if="showValidation && (!startDate || !endDate)" class="date-range-picker__notice date-range-picker__notice--warning">
      Please select both start and end dates.
    </section>

    <section v-else-if="rangeExceeded" class="date-range-picker__notice date-range-picker__notice--danger">
      Date range cannot exceed {{ maxDays }} days. Current range: {{ rangeDays }} days.
    </section>

    <section v-else-if="startDate && endDate && !isValidRange" class="date-range-picker__notice date-range-picker__notice--danger">
      End date must be after start date.
    </section>

    <p class="date-range-picker__hint">Maximum date range: {{ maxDays }} days</p>
  </AppPanel>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import dayjs from 'dayjs'
import { computed, ref, watch } from 'vue'
import { AppPanel } from '@/shared'

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
  showValidation: false,
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
    endDate: endDate.value,
  })

  // Emit detailed change event
  emit('change', {
    startDate: startDate.value,
    endDate: endDate.value,
    valid: isValidRange.value,
  })
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return dayjs(dateStr).format('MMM DD, YYYY')
}

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    startDate.value = newValue.startDate
    endDate.value = newValue.endDate
  },
  { deep: true },
)
</script>

<style scoped>
.date-range-picker__preset-row,
.date-range-picker__grid,
.date-range-picker__button {
  display: flex;
}

.date-range-picker__preset-row {
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-bottom: 1rem;
}

.date-range-picker__grid {
  gap: 1rem;
}

.date-range-picker__field {
  display: grid;
  gap: 0.45rem;
  flex: 1;
}

.date-range-picker__field span,
.date-range-picker__hint {
  color: var(--app-muted);
}

.date-range-picker__field span {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.date-range-picker__field input {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.95rem;
  background: var(--app-panel);
  color: var(--app-ink);
  padding: 0.82rem 0.95rem;
}

.date-range-picker__field input:focus {
  outline: none;
  border-color: var(--app-accent);
  box-shadow: 0 0 0 4px var(--app-ring);
}

.date-range-picker__button {
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-panel);
  color: #4f5d6d;
  cursor: pointer;
  padding: 0.72rem 0.95rem;
  font-weight: 700;
}

.date-range-picker__button:hover {
  transform: translateY(-1px);
}

.date-range-picker__notice {
  border-radius: 1rem;
  padding: 0.85rem 1rem;
  display: grid;
  gap: 0.25rem;
  margin-top: 0.9rem;
}

.date-range-picker__notice--success {
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.date-range-picker__notice--warning {
  background: rgba(184, 118, 38, 0.16);
  color: #8f5314;
}

.date-range-picker__notice--danger {
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

.date-range-picker__error {
  color: #8f2020;
}

.date-range-picker__hint {
  margin: 0.9rem 0 0;
  font-size: 0.82rem;
}

@media (max-width: 720px) {
  .date-range-picker__grid {
    flex-direction: column;
  }
}
</style>
