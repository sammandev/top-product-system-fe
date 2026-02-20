<template>
    <v-card>
        <v-card-title>
            <v-icon class="mr-2">mdi-chart-bar</v-icon>
            Subgroup Comparison
        </v-card-title>

        <v-card-text>
            <!-- Empty State -->
            <div v-if="!overallGroupScores || Object.keys(overallGroupScores).length === 0" class="text-center py-8">
                <v-icon size="64" color="grey">mdi-chart-bar-stacked</v-icon>
                <p class="text-body-1 text-medium-emphasis mt-4">
                    No subgroup scores available
                </p>
            </div>

            <!-- Chart -->
            <v-chart v-else :option="chartOption" :style="{ height: '400px', width: '100%' }" autoresize />
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { computed, type PropType } from 'vue'
import type { OverallGroupScores } from '@/core/types'

// Props
const props = defineProps({
  overallGroupScores: {
    type: Object as PropType<OverallGroupScores | null>,
    default: null,
  },
  title: {
    type: String,
    default: 'Overall Subgroup Performance',
  },
})

// Computed
const chartOption = computed<EChartsOption>(() => {
  if (!props.overallGroupScores) {
    return {}
  }

  const subgroups = Object.keys(props.overallGroupScores)
  const scores = Object.values(props.overallGroupScores)

  return {
    title: {
      text: props.title,
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      // biome-ignore lint/suspicious/noExplicitAny: ECharts tooltip formatter params require dynamic property access
      formatter: (params: any) => {
        const data = params[0]
        return `${data.name}<br/>Score: ${data.value.toFixed(2)}`
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: subgroups,
      axisLabel: {
        fontSize: 14,
        fontWeight: 'bold',
      },
    },
    yAxis: {
      type: 'value',
      name: 'Score',
      min: 0,
      max: 100,
      axisLabel: {
        formatter: '{value}',
      },
    },
    series: [
      {
        name: 'Score',
        type: 'bar',
        data: scores,
        itemStyle: {
          // biome-ignore lint/suspicious/noExplicitAny: ECharts itemStyle color callback params require dynamic property access
          color: (params: any) => {
            const score = params.value as number
            if (score >= 90) return '#4CAF50' // green
            if (score >= 70) return '#2196F3' // blue
            if (score >= 50) return '#FFC107' // yellow
            return '#F44336' // red
          },
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          // biome-ignore lint/suspicious/noExplicitAny: ECharts label formatter params require dynamic property access
          formatter: (params: any) => params.value.toFixed(2),
          fontSize: 12,
          fontWeight: 'bold',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
      },
    ],
  }
})
</script>

<style scoped>
</style>
