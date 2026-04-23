<template>
  <AppPanel
    eyebrow="Score Summary"
    title="Subgroup Comparison"
    description="Compare subgroup performance on a single ECharts rendering path."
    tone="cool"
  >
    <div v-if="!overallGroupScores || Object.keys(overallGroupScores).length === 0" class="subgroup-chart__empty">
      <strong>No subgroup scores available.</strong>
      <p>Run the analysis first to generate subgroup comparison data.</p>
    </div>

    <VChart v-else :option="chartOption" class="subgroup-chart__chart" autoresize />
  </AppPanel>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { computed, type PropType } from 'vue'
import type { OverallGroupScores } from '@/core/types'
import { AppPanel, VChart } from '@/shared/ui'

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
.subgroup-chart__chart {
  width: 100%;
  height: 25rem;
  min-height: 25rem;
}

.subgroup-chart__empty {
  display: grid;
  gap: 0.45rem;
  padding: 1.25rem;
  border: 1px dashed var(--app-border);
  border-radius: 1rem;
  background: rgba(255, 250, 246, 0.72);
  text-align: center;
}

.subgroup-chart__empty strong {
  color: var(--app-ink);
}

.subgroup-chart__empty p {
  margin: 0;
  color: var(--app-muted);
}
</style>
