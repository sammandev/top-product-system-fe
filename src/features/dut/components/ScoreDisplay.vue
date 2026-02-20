<template>
    <!-- Circular Progress Variant -->
    <v-progress-circular v-if="variant === 'circular'" :model-value="scorePercent" :color="scoreColor" :size="size"
        :width="width">
        <template #default>
            <span :class="['font-weight-bold', textSizeClass]">{{ formattedScore }}</span>
        </template>
    </v-progress-circular>

    <!-- Chip Variant -->
    <v-chip v-else-if="variant === 'chip'" :color="scoreColor" :size="chipSize" variant="tonal">
        <v-icon v-if="showIcon" start :size="iconSize">{{ scoreIcon }}</v-icon>
        {{ formattedScore }}
    </v-chip>

    <!-- Bar Variant -->
    <div v-else-if="variant === 'bar'" class="score-bar d-flex align-center">
        <v-progress-linear :model-value="scorePercent" :color="scoreColor" :height="barHeight" rounded
            class="flex-grow-1" />
        <span :class="['ml-2', 'font-weight-medium', textSizeClass]">{{ formattedScore }}</span>
    </div>

    <!-- Text Variant -->
    <span v-else :class="['font-weight-bold', `text-${scoreColor}`, textSizeClass]">
        <v-icon v-if="showIcon" :size="iconSize" class="mr-1">{{ scoreIcon }}</v-icon>
        {{ formattedScore }}
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ScoreDisplayVariant = 'circular' | 'chip' | 'bar' | 'text'
type ScoreDisplaySize = 'x-small' | 'small' | 'default' | 'large'

interface Props {
  score: number // Score value between 0 and 1 (internal), displayed as 0-10 scale
  variant?: ScoreDisplayVariant
  size?: ScoreDisplaySize
  showIcon?: boolean
  showPercent?: boolean // If true shows as 0-10 scale, if false shows raw decimal
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'chip',
  size: 'default',
  showIcon: false,
  showPercent: true,
})

// Score display multiplier (convert 0-1 to 0-10)
const SCORE_MULTIPLIER = 10

// Computed values
const scorePercent = computed(() => props.score * 100)

const scoreColor = computed(() => {
  if (props.score >= 0.9) return 'success'
  if (props.score >= 0.7) return 'info'
  if (props.score >= 0.5) return 'warning'
  return 'error'
})

const scoreIcon = computed(() => {
  if (props.score >= 0.9) return 'mdi-check-circle'
  if (props.score >= 0.7) return 'mdi-check'
  if (props.score >= 0.5) return 'mdi-alert'
  return 'mdi-close-circle'
})

const formattedScore = computed(() => {
  if (props.showPercent) {
    // Display as 0-10 scale with 2 decimal places
    return (props.score * SCORE_MULTIPLIER).toFixed(2)
  }
  return props.score.toFixed(2)
})

// Size computations for circular variant
const size = computed(() => {
  switch (props.size) {
    case 'x-small':
      return 32
    case 'small':
      return 40
    case 'large':
      return 64
    default:
      return 48
  }
})

const width = computed(() => {
  switch (props.size) {
    case 'x-small':
      return 3
    case 'small':
      return 4
    case 'large':
      return 6
    default:
      return 5
  }
})

// Size for chip variant
const chipSize = computed(() => {
  switch (props.size) {
    case 'x-small':
      return 'x-small'
    case 'small':
      return 'small'
    case 'large':
      return 'large'
    default:
      return 'default'
  }
})

// Size for icon
const iconSize = computed(() => {
  switch (props.size) {
    case 'x-small':
      return 'x-small'
    case 'small':
      return 'small'
    case 'large':
      return 'default'
    default:
      return 'small'
  }
})

// Text size class
const textSizeClass = computed(() => {
  switch (props.size) {
    case 'x-small':
      return 'text-caption'
    case 'small':
      return 'text-body-2'
    case 'large':
      return 'text-h6'
    default:
      return 'text-body-1'
  }
})

// Bar height
const barHeight = computed(() => {
  switch (props.size) {
    case 'x-small':
      return 4
    case 'small':
      return 6
    case 'large':
      return 12
    default:
      return 8
  }
})
</script>

<style scoped>
.score-bar {
    min-width: 100px;
}
</style>
