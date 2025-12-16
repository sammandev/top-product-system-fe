<template>
    <v-card>
        <v-card-title class="d-flex align-center">
            <v-icon start>mdi-chart-bar</v-icon>
            Score Visualization
        </v-card-title>

        <v-card-text>
            <!-- Chart Type Selector -->
            <v-tabs v-model="selectedChart" class="mb-4">
                <v-tab value="distribution">
                    <v-icon start>mdi-chart-bar</v-icon>
                    Distribution
                </v-tab>
                <v-tab value="trend">
                    <v-icon start>mdi-chart-line</v-icon>
                    Trend
                </v-tab>
                <v-tab value="comparison">
                    <v-icon start>mdi-chart-scatter-plot</v-icon>
                    Comparison
                </v-tab>
            </v-tabs>

            <!-- Chart Container -->
            <v-window v-model="selectedChart">
                <!-- Score Distribution Chart -->
                <v-window-item value="distribution">
                    <div ref="distributionChartRef" class="chart-container" />
                </v-window-item>

                <!-- Score Trend Chart -->
                <v-window-item value="trend">
                    <div ref="trendChartRef" class="chart-container" />
                </v-window-item>

                <!-- Score Comparison Chart -->
                <v-window-item value="comparison">
                    <div ref="comparisonChartRef" class="chart-container" />
                </v-window-item>
            </v-window>

            <!-- No Data Alert -->
            <v-alert v-if="!hasData" type="info" variant="tonal" density="compact" class="mt-4">
                <template #prepend>
                    <v-icon>mdi-information</v-icon>
                </template>
                <div class="text-caption">
                    No data available for visualization. Run an analysis to see charts.
                </div>
            </v-alert>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import type { TopProduct } from '@/core/types'

// Props
interface Props {
    items: TopProduct[]
}

const props = defineProps<Props>()

// State
const selectedChart = ref<'distribution' | 'trend' | 'comparison'>('distribution')
const distributionChartRef = ref<HTMLElement | null>(null)
const trendChartRef = ref<HTMLElement | null>(null)
const comparisonChartRef = ref<HTMLElement | null>(null)

let distributionChart: echarts.ECharts | null = null
let trendChart: echarts.ECharts | null = null
let comparisonChart: echarts.ECharts | null = null

// Computed
const hasData = computed(() => props.items.length > 0)

const scoreRanges = computed(() => {
    const ranges = {
        '90-100': 0,
        '80-90': 0,
        '70-80': 0,
        '60-70': 0,
        '50-60': 0,
        '<50': 0
    }

    props.items.forEach(item => {
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
    return [...props.items].sort((a, b) => {
        return new Date(a.test_date).getTime() - new Date(b.test_date).getTime()
    })
})

// Methods
function initDistributionChart() {
    if (!distributionChartRef.value) return

    distributionChart = echarts.init(distributionChartRef.value)

    const option: EChartsOption = {
        title: {
            text: 'Score Distribution',
            left: 'center',
            textStyle: {
                fontSize: 16,
                fontWeight: 'normal'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: (params: any) => {
                const data = params[0]
                return `${data.name}<br/>Count: <strong>${data.value}</strong> products`
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: Object.keys(scoreRanges.value),
            axisLabel: {
                rotate: 0
            }
        },
        yAxis: {
            type: 'value',
            name: 'Count',
            minInterval: 1
        },
        series: [
            {
                name: 'Products',
                type: 'bar',
                data: Object.values(scoreRanges.value),
                itemStyle: {
                    color: (params: any) => {
                        const colors = ['#4CAF50', '#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#F44336']
                        return colors[params.dataIndex] || '#2196F3'
                    }
                },
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}'
                }
            }
        ]
    }

    distributionChart.setOption(option)
}

function initTrendChart() {
    if (!trendChartRef.value) return

    trendChart = echarts.init(trendChartRef.value)

    const dates = sortedByDate.value.map(item =>
        new Date(item.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )
    const scores = sortedByDate.value.map(item => item.overall_data_score)

    // Calculate moving average
    const movingAvg = scores.map((_, idx) => {
        const start = Math.max(0, idx - 2)
        const end = Math.min(scores.length, idx + 3)
        const subset = scores.slice(start, end)
        return subset.reduce((a, b) => a + b, 0) / subset.length
    })

    const option: EChartsOption = {
        title: {
            text: 'Score Trend Over Time',
            left: 'center',
            textStyle: {
                fontSize: 16,
                fontWeight: 'normal'
            }
        },
        tooltip: {
            trigger: 'axis',
            formatter: (params: any) => {
                let result = `${params[0].name}<br/>`
                params.forEach((item: any) => {
                    result += `${item.marker}${item.seriesName}: <strong>${item.value.toFixed(2)}%</strong><br/>`
                })
                return result
            }
        },
        legend: {
            data: ['Actual Score', 'Moving Average'],
            bottom: 10
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: dates,
            axisLabel: {
                rotate: 45
            }
        },
        yAxis: {
            type: 'value',
            name: 'Score (%)',
            min: 0,
            max: 100
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
                    width: 2
                },
                itemStyle: {
                    color: '#2196F3'
                }
            },
            {
                name: 'Moving Average',
                type: 'line',
                data: movingAvg,
                smooth: true,
                symbol: 'none',
                lineStyle: {
                    width: 2,
                    type: 'dashed'
                },
                itemStyle: {
                    color: '#FF9800'
                }
            }
        ]
    }

    trendChart.setOption(option)
}

function initComparisonChart() {
    if (!comparisonChartRef.value) return

    comparisonChart = echarts.init(comparisonChartRef.value)

    // Get top 10 products for comparison
    const topProducts = [...props.items]
        .sort((a, b) => b.overall_data_score - a.overall_data_score)
        .slice(0, 10)

    const option: EChartsOption = {
        title: {
            text: 'Top 10 Products Comparison',
            left: 'center',
            textStyle: {
                fontSize: 16,
                fontWeight: 'normal'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: (params: any) => {
                const data = params[0]
                return `${data.name}<br/>Score: <strong>${data.value.toFixed(2)}%</strong>`
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            name: 'Score (%)',
            max: 100
        },
        yAxis: {
            type: 'category',
            data: topProducts.map(item => item.isn),
            axisLabel: {
                fontSize: 10
            }
        },
        series: [
            {
                name: 'Score',
                type: 'bar',
                data: topProducts.map(item => item.overall_data_score),
                itemStyle: {
                    color: (params: any) => {
                        const score = params.value
                        if (score >= 90) return '#4CAF50'
                        if (score >= 80) return '#8BC34A'
                        if (score >= 70) return '#2196F3'
                        if (score >= 60) return '#FF9800'
                        return '#F44336'
                    }
                },
                label: {
                    show: true,
                    position: 'right',
                    formatter: '{c}%'
                }
            }
        ]
    }

    comparisonChart.setOption(option)
}

function initAllCharts() {
    if (!hasData.value) return

    nextTick(() => {
        initDistributionChart()
        initTrendChart()
        initComparisonChart()
    })
}

function resizeCharts() {
    distributionChart?.resize()
    trendChart?.resize()
    comparisonChart?.resize()
}

function disposeCharts() {
    distributionChart?.dispose()
    trendChart?.dispose()
    comparisonChart?.dispose()
    distributionChart = null
    trendChart = null
    comparisonChart = null
}

// Watch for data changes
watch(() => props.items, () => {
    disposeCharts()
    initAllCharts()
}, { deep: true })

// Watch for chart changes
watch(selectedChart, () => {
    nextTick(() => {
        resizeCharts()
    })
})

// Lifecycle
onMounted(() => {
    initAllCharts()
    window.addEventListener('resize', resizeCharts)
})

onUnmounted(() => {
    window.removeEventListener('resize', resizeCharts)
    disposeCharts()
})
</script>

<style scoped>
.chart-container {
    width: 100%;
    height: 400px;
    min-height: 400px;
}

:deep(.v-window__container) {
    min-height: 400px;
}
</style>
