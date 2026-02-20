<template>
    <v-card>
        <v-card-title>
            <v-icon class="mr-2">mdi-grid</v-icon>
            Category Heatmap
        </v-card-title>

        <v-card-subtitle v-if="selectedGroup">
            Group: {{ selectedGroup }}
        </v-card-subtitle>

        <v-card-text>
            <!-- Group Selector -->
            <v-select v-if="availableGroups.length > 1" v-model="selectedGroup" :items="availableGroups"
                label="Select Group" prepend-inner-icon="mdi-layers" density="compact" class="mb-4" />

            <!-- Empty State -->
            <div v-if="!heatmapData || heatmapData.data.length === 0" class="text-center py-8">
                <v-icon size="64" color="grey">mdi-grid-off</v-icon>
                <p class="text-body-1 text-medium-emphasis mt-4">
                    No category data available for heatmap
                </p>
            </div>

            <!-- Heatmap Chart -->
            <v-chart v-else :option="chartOption" :style="{ height: `${chartHeight}px`, width: '100%' }" autoresize />
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { computed, type PropType, ref, watch } from 'vue'
import type { GroupScores } from '@/core/types'

// Props
const props = defineProps({
  groupScores: {
    type: Object as PropType<GroupScores>,
    required: true,
  },
})

// State
const selectedGroup = ref<string>('')

// Define heatmap data type
interface HeatmapData {
  data: Array<[number, number, number]>
  antennas: string[]
  categories: string[]
}

// Computed
const availableGroups = computed(() => {
  return Object.keys(props.groupScores || {})
})

const heatmapData = computed<HeatmapData | null>(() => {
  if (!props.groupScores || !selectedGroup.value) return null

  const groupData = props.groupScores[selectedGroup.value]
  if (!groupData) return null

  const data: Array<[number, number, number]> = []
  const antennaNames: string[] = []
  const categoryNames: string[] = []
  const categorySet = new Set<string>()

  // Collect all antennas and categories
  Object.keys(groupData).forEach((subgroupKey) => {
    if (subgroupKey === 'final_group_score' || subgroupKey === 'group_avg_score') return

    const subgroupData = groupData[subgroupKey]
    if (typeof subgroupData !== 'object') return

    Object.keys(subgroupData).forEach((antennaKey) => {
      if (antennaKey.endsWith('_group_score') || antennaKey.endsWith('_avg_score')) return

      const antennaData = subgroupData[antennaKey]
      if (typeof antennaData !== 'object') return

      // Add antenna name if not already added
      const antennaName = `${subgroupKey}_${antennaKey}`
      if (!antennaNames.includes(antennaName)) {
        antennaNames.push(antennaName)
      }

      // Collect categories
      Object.keys(antennaData).forEach((categoryKey) => {
        if (
          !categoryKey.endsWith('_score') &&
          !categoryKey.endsWith('_group_score') &&
          !categoryKey.endsWith('_avg_score')
        ) {
          const categoryValue = antennaData[categoryKey]
          // Category is now an object with category_bayes_score and category_avg_score
          if (typeof categoryValue === 'object' || typeof categoryValue === 'number') {
            categorySet.add(categoryKey)
          }
        }
      })
    })
  })

  const categoryNamesArray = Array.from(categorySet)
  categoryNames.push(...categoryNamesArray)

  // Build heatmap data [categoryIndex, antennaIndex, score]
  antennaNames.forEach((antennaName, antennaIndex) => {
    const parts = antennaName.split('_', 2)
    if (parts.length < 2) return

    const subgroup = parts[0]
    const antenna = parts[1]
    if (!subgroup || !antenna) return

    const subgroupData = groupData[subgroup]
    if (!subgroupData || typeof subgroupData !== 'object') return

    const antennaData = subgroupData[antenna as keyof typeof subgroupData]
    if (!antennaData || typeof antennaData !== 'object') return

    categoryNames.forEach((category, categoryIndex) => {
      const categoryData = (antennaData as Record<string, unknown>)[category]
      let score: number | undefined

      // Handle both old format (number) and new format (object with bayes/avg scores)
      if (typeof categoryData === 'number') {
        score = categoryData
      } else if (
        typeof categoryData === 'object' &&
        categoryData !== null &&
        'category_bayes_score' in categoryData
      ) {
        score = (categoryData as Record<string, number>).category_bayes_score
      }

      if (typeof score === 'number') {
        data.push([categoryIndex, antennaIndex, score])
      }
    })
  })

  return {
    data,
    antennas: antennaNames,
    categories: categoryNames,
  }
})

const chartHeight = computed(() => {
  const antennaCount = heatmapData.value?.antennas?.length || 0
  return Math.max(300, antennaCount * 40 + 100)
})

const chartOption = computed<EChartsOption>(() => {
  if (!heatmapData.value || heatmapData.value.data.length === 0) {
    return {}
  }

  const { data, antennas, categories } = heatmapData.value

  return {
    title: {
      text: 'Antenna × Category Performance',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal',
      },
    },
    tooltip: {
      position: 'top',
      // biome-ignore lint/suspicious/noExplicitAny: ECharts tooltip formatter params require dynamic property access
      formatter: (params: any) => {
        const [categoryIdx, antennaIdx, score] = params.data
        return `${antennas[antennaIdx]}<br/>${categories[categoryIdx]}: ${score.toFixed(2)}`
      },
    },
    grid: {
      left: '15%',
      right: '5%',
      bottom: '15%',
      top: '10%',
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: categories,
      splitArea: {
        show: true,
      },
      axisLabel: {
        interval: 0,
        rotate: 45,
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'category',
      data: antennas,
      splitArea: {
        show: true,
      },
      axisLabel: {
        fontSize: 11,
      },
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: ['#F44336', '#FFC107', '#2196F3', '#4CAF50'], // red -> yellow -> blue -> green
      },
      text: ['High', 'Low'],
      textStyle: {
        fontSize: 11,
      },
    },
    series: [
      {
        name: 'Score',
        type: 'heatmap',
        data: data,
        label: {
          show: true,
          // biome-ignore lint/suspicious/noExplicitAny: ECharts label formatter params require dynamic property access
          formatter: (params: any) => params.data[2].toFixed(1),
          fontSize: 10,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  }
})

// Watch for group changes
watch(
  availableGroups,
  (groups) => {
    if (groups.length > 0 && !selectedGroup.value && groups[0]) {
      selectedGroup.value = groups[0]
    }
  },
  { immediate: true },
)
</script>

<style scoped>
</style>
