<template>
  <AppPanel
    eyebrow="Analysis Charts"
    title="Score Visualization"
    description="Distribution, trend, and top-product comparison all rendered through the shared ECharts path."
    tone="cool"
    split-header
  >
    <template #header-aside>
      <span v-if="hasData" class="score-visualization__badge">
        {{ items.length }} product{{ items.length === 1 ? '' : 's' }}
      </span>
    </template>

    <div v-if="!hasData" class="score-visualization__empty">
      <strong>No data available for visualization.</strong>
      <p>Run an analysis to see the score charts.</p>
    </div>

    <AppTabs v-else v-model="selectedChart" :items="chartItems">
      <template #panel-distribution>
        <VChart :option="distributionOption" class="score-visualization__chart" autoresize />
      </template>

      <template #panel-trend>
        <VChart :option="trendOption" class="score-visualization__chart" autoresize />
      </template>

      <template #panel-comparison>
        <VChart :option="comparisonOption" class="score-visualization__chart" autoresize />
      </template>
    </AppTabs>
  </AppPanel>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { computed, ref } from 'vue'
import type { TopProduct } from '@/core/types'
import { AppPanel, AppTabs, VChart } from '@/shared/ui'

interface ChartTabItem {
  value: ChartKey
  label: string
  icon: string
}

interface Props {
  items: TopProduct[]
}

const props = defineProps<Props>()
const items = computed(() => props.items)

type ChartKey = 'distribution' | 'trend' | 'comparison'

const selectedChart = ref<ChartKey>('distribution')
const chartItems: ChartTabItem[] = [
  { value: 'distribution', label: 'Distribution', icon: 'mdi-chart-bar' },
  { value: 'trend', label: 'Trend', icon: 'mdi-chart-line' },
  { value: 'comparison', label: 'Comparison', icon: 'mdi-chart-scatter-plot' },
]
const distributionColors = ['#4CAF50', '#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#F44336']

const hasData = computed(() => items.value.length > 0)

const scoreRanges = computed(() => {
  const ranges = {
    '90-100': 0,
    '80-90': 0,
    '70-80': 0,
    '60-70': 0,
    '50-60': 0,
    '<50': 0,
  }

  items.value.forEach((item) => {
    const score = item.overall_data_score
    if (score >= 90) ranges['90-100']++
    else if (score >= 80) ranges['80-90']++
    else if (score >= 70) ranges['70-80']++
    else if (score >= 60) ranges['60-70']++
    else if (score >= 50) ranges['50-60']++
    else ranges['<50']++
  })

  return ranges
})

const sortedByDate = computed(() => {
  return [...items.value].sort((a, b) => {
    return new Date(a.test_date).getTime() - new Date(b.test_date).getTime()
  })
})

const distributionOption = computed<EChartsOption>(() => {
  return {
    title: {
      text: 'Score Distribution',
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
        return `${data.name}<br/>Count: <strong>${data.value}</strong> products`
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: Object.keys(scoreRanges.value),
      axisLabel: {
        rotate: 0,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Count',
      minInterval: 1,
    },
    series: [
      {
        name: 'Products',
        type: 'bar',
        data: Object.values(scoreRanges.value),
        itemStyle: {
          // biome-ignore lint/suspicious/noExplicitAny: ECharts itemStyle color callback params require dynamic property access
          color: (params: any) => {
            return distributionColors[params.dataIndex] || '#2196F3'
          },
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}',
        },
      },
    ],
  }
})

const trendOption = computed<EChartsOption>(() => {
  const dates = sortedByDate.value.map((item) =>
    new Date(item.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  )
  const scores = sortedByDate.value.map((item) => item.overall_data_score)

  // Calculate moving average
  const movingAvg = scores.map((_, idx) => {
    const start = Math.max(0, idx - 2)
    const end = Math.min(scores.length, idx + 3)
    const subset = scores.slice(start, end)
    return subset.reduce((a, b) => a + b, 0) / subset.length
  })

  return {
    title: {
      text: 'Score Trend Over Time',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal',
      },
    },
    tooltip: {
      trigger: 'axis',
      // biome-ignore lint/suspicious/noExplicitAny: ECharts tooltip formatter params require dynamic property access
      formatter: (params: any) => {
        let result = `${params[0].name}<br/>`
        // biome-ignore lint/suspicious/noExplicitAny: ECharts tooltip formatter item requires dynamic property access
        params.forEach((item: any) => {
          result += `${item.marker}${item.seriesName}: <strong>${item.value.toFixed(2)}%</strong><br/>`
        })
        return result
      },
    },
    legend: {
      data: ['Actual Score', 'Moving Average'],
      bottom: 10,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Score (%)',
      min: 0,
      max: 100,
    },
    series: [
      {
        name: 'Actual Score',
        type: 'line',
        data: scores,
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2,
        },
        itemStyle: {
          color: '#2196F3',
        },
      },
      {
        name: 'Moving Average',
        type: 'line',
        data: movingAvg,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          width: 2,
          type: 'dashed',
        },
        itemStyle: {
          color: '#FF9800',
        },
      },
    ],
  }
})

const comparisonOption = computed<EChartsOption>(() => {
  const topProducts = [...items.value]
    .sort((a, b) => b.overall_data_score - a.overall_data_score)
    .slice(0, 10)

  return {
    title: {
      text: 'Top 10 Products Comparison',
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
        return `${data.name}<br/>Score: <strong>${data.value.toFixed(2)}%</strong>`
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: 'Score (%)',
      max: 100,
    },
    yAxis: {
      type: 'category',
      data: topProducts.map((item) => item.isn),
      axisLabel: {
        fontSize: 10,
      },
    },
    series: [
      {
        name: 'Score',
        type: 'bar',
        data: topProducts.map((item) => item.overall_data_score),
        itemStyle: {
          // biome-ignore lint/suspicious/noExplicitAny: ECharts itemStyle color callback params require dynamic property access
          color: (params: any) => {
            const score = params.value
            if (score >= 90) return '#4CAF50'
            if (score >= 80) return '#8BC34A'
            if (score >= 70) return '#2196F3'
            if (score >= 60) return '#FF9800'
            return '#F44336'
          },
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%',
        },
      },
    ],
  }
})
</script>

<style scoped>
.score-visualization__chart {
  width: 100%;
  height: 26rem;
  min-height: 26rem;
}

.score-visualization__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 6rem;
  padding: 0.5rem 0.85rem;
  border-radius: 999px;
  background: rgba(40, 96, 163, 0.12);
  color: var(--app-accent);
  font-size: 0.82rem;
  font-weight: 700;
}

.score-visualization__empty {
  display: grid;
  gap: 0.45rem;
  padding: 1.25rem;
  border: 1px dashed var(--app-border);
  border-radius: 1rem;
  background: rgba(255, 250, 246, 0.72);
  text-align: center;
}

.score-visualization__empty strong {
  color: var(--app-ink);
}

.score-visualization__empty p {
  margin: 0;
  color: var(--app-muted);
}
</style>
