<template>
  <AppPanel
    eyebrow="Category View"
    title="Category Heatmap"
    description="Inspect antenna and category performance across the selected scoring group."
    tone="cool"
    split-header
  >
    <template #header-aside>
      <span v-if="selectedGroup" class="category-heatmap__group-pill">{{ selectedGroup }}</span>
    </template>

    <label v-if="availableGroups.length > 1" class="category-heatmap__field">
      <span>Group</span>
      <AppSelect v-model="selectedGroup" :options="groupSelectOptions" />
    </label>

    <div v-if="!heatmapData || heatmapData.data.length === 0" class="category-heatmap__empty">
      <strong>No category data available for the heatmap.</strong>
      <p>Select a group with populated category scores to render the chart.</p>
    </div>

    <VChart
      v-else
      :option="chartOption"
      :style="{ height: `${chartHeight}px`, width: '100%' }"
      autoresize
    />
  </AppPanel>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { computed, type PropType, ref, watch } from 'vue'
import type { GroupScores } from '@/core/types'
import { AppPanel, AppSelect, VChart } from '@/shared/ui'

const props = defineProps({
  groupScores: {
    type: Object as PropType<GroupScores>,
    required: true,
  },
})

const selectedGroup = ref<string>('')

interface HeatmapData {
  data: Array<[number, number, number]>
  antennas: string[]
  categories: string[]
}

const availableGroups = computed(() => {
  return Object.keys(props.groupScores || {})
})

const groupSelectOptions = computed(() =>
  availableGroups.value.map((group) => ({
    label: group,
    value: group,
  })),
)

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
.category-heatmap__field {
  display: grid;
  gap: 0.45rem;
  max-width: 18rem;
}

.category-heatmap__field span {
  color: var(--app-muted);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.category-heatmap__select {
  min-height: 2.9rem;
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  padding: 0.75rem 0.9rem;
}

.category-heatmap__group-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 0.85rem;
  border-radius: 999px;
  background: rgba(40, 96, 163, 0.12);
  color: var(--app-accent);
  font-size: 0.82rem;
  font-weight: 700;
}

.category-heatmap__empty {
  display: grid;
  gap: 0.45rem;
  padding: 1.25rem;
  border: 1px dashed var(--app-border);
  border-radius: 1rem;
  background: rgba(255, 250, 246, 0.72);
  text-align: center;
}

.category-heatmap__empty strong {
  color: var(--app-ink);
}

.category-heatmap__empty p {
  margin: 0;
  color: var(--app-muted);
}
</style>
