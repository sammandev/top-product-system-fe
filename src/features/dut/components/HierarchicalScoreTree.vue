<template>
    <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
            <span>
                <v-icon class="mr-2">mdi-file-tree</v-icon>
                Hierarchical Scores
            </span>

            <div>
                <v-btn size="small" variant="text" @click="expandAll">
                    <v-icon start>mdi-arrow-expand-vertical</v-icon>
                    Expand All
                </v-btn>
                <v-btn size="small" variant="text" @click="collapseAll">
                    <v-icon start>mdi-arrow-collapse-vertical</v-icon>
                    Collapse All
                </v-btn>
            </div>
        </v-card-title>

        <v-card-text>
            <!-- Overall Group Scores Summary -->
            <v-alert v-if="overallGroupScores" density="compact" variant="tonal" color="primary" class="mb-4">
                <div class="text-subtitle-2 mb-2">Overall Subgroup Averages</div>
                <v-chip-group>
                    <v-chip v-for="(score, subgroup) in overallGroupScores" :key="subgroup"
                        :color="getScoreColor(score)" size="small">
                        {{ subgroup }}: {{ score.toFixed(2) }}
                    </v-chip>
                </v-chip-group>
            </v-alert>

            <!-- Empty State -->
            <v-alert v-if="!groupScores || Object.keys(groupScores).length === 0" type="info" variant="tonal">
                No hierarchical scores available
            </v-alert>

            <!-- Tree View -->
            <div v-else class="tree-container">
                <!-- Group Level -->
                <div v-for="(groupData, groupKey) in groupScores" :key="groupKey" class="tree-node group-node">
                    <div class="node-header" @click="toggleGroup(String(groupKey))">
                        <v-icon size="small" class="mr-2">
                            {{ expandedGroups.has(String(groupKey)) ? 'mdi-chevron-down' : 'mdi-chevron-right' }}
                        </v-icon>
                        <span class="node-label">{{ groupKey }}</span>
                        <v-spacer />
                        <v-chip :color="getScoreColor(getGroupScore(groupData))" size="small" class="ml-2">
                            Bayesian: {{ getGroupScore(groupData).toFixed(2) }}
                        </v-chip>
                        <v-chip v-if="getGroupAvgScore(groupData) > 0" color="info" size="small" variant="outlined" class="ml-1">
                            Avg: {{ getGroupAvgScore(groupData).toFixed(2) }}
                        </v-chip>
                    </div>

                    <!-- Subgroup Level -->
                    <v-expand-transition>
                        <div v-if="expandedGroups.has(String(groupKey))" class="tree-children">
                            <div v-for="(subgroupData, subgroupKey) in getSubgroups(groupData)" :key="subgroupKey"
                                class="tree-node subgroup-node">
                                <div class="node-header" @click="toggleSubgroup(String(groupKey), String(subgroupKey))">
                                    <v-icon size="small" class="mr-2">
                                        {{ expandedSubgroups.has(`${groupKey}.${subgroupKey}`) ? 'mdi-chevron-down' :
                                            'mdi-chevron-right' }}
                                    </v-icon>
                                    <span class="node-label">{{ subgroupKey }}</span>
                                    <v-spacer />
                                    <v-chip :color="getScoreColor(getSubgroupScore(subgroupData))" size="x-small"
                                        class="ml-2">
                                        Bayes: {{ getSubgroupScore(subgroupData).toFixed(2) }}
                                    </v-chip>
                                    <v-chip v-if="getSubgroupAvgScore(subgroupData) > 0" color="info" size="x-small" variant="outlined" class="ml-1">
                                        Avg: {{ getSubgroupAvgScore(subgroupData).toFixed(2) }}
                                    </v-chip>
                                </div>

                                <!-- Antenna Level -->
                                <v-expand-transition>
                                    <div v-if="expandedSubgroups.has(`${groupKey}.${subgroupKey}`)"
                                        class="tree-children">
                                        <div v-for="(antennaData, antennaKey) in getAntennas(subgroupData)"
                                            :key="antennaKey" class="tree-node antenna-node">
                                            <div class="node-header"
                                                @click="toggleAntenna(String(groupKey), String(subgroupKey), String(antennaKey))">
                                                <v-icon size="small" class="mr-2">
                                                    {{ expandedAntennas.has(`${groupKey}.${subgroupKey}.${antennaKey}`)
                                                        ? 'mdi-chevron-down' : 'mdi-chevron-right' }}
                                                </v-icon>
                                                <span class="node-label">{{ antennaKey }}</span>
                                                <v-spacer />
                                                <v-chip :color="getScoreColor(getAntennaScore(antennaData))"
                                                    size="x-small" variant="tonal" class="ml-2">
                                                    Bayes: {{ getAntennaScore(antennaData).toFixed(2) }}
                                                </v-chip>
                                                <v-chip v-if="getAntennaAvgScore(antennaData) > 0" color="info" size="x-small" variant="outlined" class="ml-1">
                                                    Avg: {{ getAntennaAvgScore(antennaData).toFixed(2) }}
                                                </v-chip>
                                            </div>

                                            <!-- Category Level (Leaf Nodes) -->
                                            <v-expand-transition>
                                                <div v-if="expandedAntennas.has(`${groupKey}.${subgroupKey}.${antennaKey}`)"
                                                    class="tree-children">
                                                    <div v-for="(scoreData, categoryKey) in getCategories(antennaData)"
                                                        :key="categoryKey" class="tree-node category-node">
                                                        <div class="node-header leaf-node">
                                                            <v-icon size="small" class="mr-2 text-medium-emphasis">
                                                                mdi-circle-small
                                                            </v-icon>
                                                            <span class="node-label">{{ categoryKey }}</span>
                                                            <v-spacer />
                                                            <v-chip :color="getScoreColor(getCategoryBayesScore(scoreData))" size="x-small"
                                                                variant="flat">
                                                                Bayes: {{ getCategoryBayesScore(scoreData).toFixed(2) }}
                                                            </v-chip>
                                                            <v-chip v-if="getCategoryAvgScore(scoreData) > 0" color="info" size="x-small" variant="outlined" class="ml-1">
                                                                Avg: {{ getCategoryAvgScore(scoreData).toFixed(2) }}
                                                            </v-chip>
                                                        </div>
                                                    </div>
                                                </div>
                                            </v-expand-transition>
                                        </div>
                                    </div>
                                </v-expand-transition>
                            </div>
                        </div>
                    </v-expand-transition>
                </div>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { type PropType, ref } from 'vue'
import type { GroupScores, OverallGroupScores } from '@/core/types'

// Props
const props = defineProps({
  groupScores: {
    type: Object as PropType<GroupScores>,
    required: true,
  },
  overallGroupScores: {
    type: Object as PropType<OverallGroupScores | null>,
    default: null,
  },
})

// State
const expandedGroups = ref<Set<string>>(new Set())
const expandedSubgroups = ref<Set<string>>(new Set())
const expandedAntennas = ref<Set<string>>(new Set())

// Methods
function toggleGroup(groupKey: string) {
  if (expandedGroups.value.has(groupKey)) {
    expandedGroups.value.delete(groupKey)
  } else {
    expandedGroups.value.add(groupKey)
  }
}

function toggleSubgroup(groupKey: string, subgroupKey: string) {
  const key = `${groupKey}.${subgroupKey}`
  if (expandedSubgroups.value.has(key)) {
    expandedSubgroups.value.delete(key)
  } else {
    expandedSubgroups.value.add(key)
  }
}

function toggleAntenna(groupKey: string, subgroupKey: string, antennaKey: string) {
  const key = `${groupKey}.${subgroupKey}.${antennaKey}`
  if (expandedAntennas.value.has(key)) {
    expandedAntennas.value.delete(key)
  } else {
    expandedAntennas.value.add(key)
  }
}

function expandAll() {
  if (!props.groupScores) return

  expandedGroups.value.clear()
  expandedSubgroups.value.clear()
  expandedAntennas.value.clear()

  Object.keys(props.groupScores).forEach((groupKey) => {
    expandedGroups.value.add(groupKey)

    const subgroups = getSubgroups(props.groupScores[groupKey])
    Object.keys(subgroups).forEach((subgroupKey) => {
      expandedSubgroups.value.add(`${groupKey}.${subgroupKey}`)

      const antennas = getAntennas(subgroups[subgroupKey])
      Object.keys(antennas).forEach((antennaKey) => {
        expandedAntennas.value.add(`${groupKey}.${subgroupKey}.${antennaKey}`)
      })
    })
  })
}

function collapseAll() {
  expandedGroups.value.clear()
  expandedSubgroups.value.clear()
  expandedAntennas.value.clear()
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'success'
  if (score >= 70) return 'info'
  if (score >= 50) return 'warning'
  return 'error'
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic hierarchical scoring data from backend
function getGroupScore(groupData: any): number {
  return typeof groupData.final_group_score === 'number' ? groupData.final_group_score : 0
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic hierarchical scoring data from backend
function getGroupAvgScore(groupData: any): number {
  return typeof groupData.group_avg_score === 'number' ? groupData.group_avg_score : 0
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic hierarchical scoring tree with arbitrary nesting
function getSubgroups(groupData: any): Record<string, unknown> {
  const subgroups: Record<string, unknown> = {}
  Object.keys(groupData).forEach((key) => {
    if (
      key !== 'final_group_score' &&
      key !== 'group_avg_score' &&
      typeof groupData[key] === 'object'
    ) {
      subgroups[key] = groupData[key]
    }
  })
  return subgroups
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic hierarchical scoring data from backend
function getSubgroupScore(subgroupData: any): number {
  // Find the Bayesian score key (e.g., "tx_group_score", "rx_group_score")
  const scoreKey = Object.keys(subgroupData).find((key) => key.endsWith('_group_score'))
  return scoreKey && typeof subgroupData[scoreKey] === 'number' ? subgroupData[scoreKey] : 0
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic hierarchical scoring data from backend
function getSubgroupAvgScore(subgroupData: any): number {
  // Find the average score key (e.g., "tx_avg_score", "rx_avg_score")
  const scoreKey = Object.keys(subgroupData).find((key) => key.endsWith('_avg_score'))
  return scoreKey && typeof subgroupData[scoreKey] === 'number' ? subgroupData[scoreKey] : 0
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic hierarchical scoring tree with arbitrary nesting
function getAntennas(subgroupData: any): Record<string, unknown> {
  const antennas: Record<string, unknown> = {}
  Object.keys(subgroupData).forEach((key) => {
    if (
      !key.endsWith('_group_score') &&
      !key.endsWith('_avg_score') &&
      typeof subgroupData[key] === 'object'
    ) {
      antennas[key] = subgroupData[key]
    }
  })
  return antennas
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic hierarchical scoring data from backend
function getAntennaScore(antennaData: any): number {
  // Find the antenna Bayesian score key (e.g., "tx1_group_score", "rx2_group_score")
  const scoreKey = Object.keys(antennaData).find((key) => key.endsWith('_group_score'))
  return scoreKey && typeof antennaData[scoreKey] === 'number' ? antennaData[scoreKey] : 0
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic hierarchical scoring data from backend
function getAntennaAvgScore(antennaData: any): number {
  // Find the antenna average score key (e.g., "tx1_avg_score", "rx2_avg_score")
  const scoreKey = Object.keys(antennaData).find((key) => key.endsWith('_avg_score'))
  return scoreKey && typeof antennaData[scoreKey] === 'number' ? antennaData[scoreKey] : 0
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic hierarchical scoring tree with arbitrary nesting
function getCategories(antennaData: any): Record<string, unknown> {
  const categories: Record<string, unknown> = {}
  Object.keys(antennaData).forEach((key) => {
    if (
      !key.endsWith('_score') &&
      !key.endsWith('_group_score') &&
      !key.endsWith('_avg_score') &&
      typeof antennaData[key] === 'object'
    ) {
      categories[key] = antennaData[key]
    }
  })
  return categories
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic hierarchical scoring data from backend
function getCategoryBayesScore(scoreData: any): number {
  if (typeof scoreData === 'number') return scoreData
  return typeof scoreData.category_bayes_score === 'number' ? scoreData.category_bayes_score : 0
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic hierarchical scoring data from backend
function getCategoryAvgScore(scoreData: any): number {
  if (typeof scoreData === 'number') return 0
  return typeof scoreData.category_avg_score === 'number' ? scoreData.category_avg_score : 0
}
</script>

<style scoped>
.tree-container {
    font-family: monospace;
}

.tree-node {
    margin-bottom: 4px;
}

.tree-children {
    margin-left: 24px;
    border-left: 2px solid rgba(var(--v-border-color), 0.2);
    padding-left: 12px;
    margin-top: 4px;
}

.node-header {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.node-header:hover {
    background-color: rgba(var(--v-theme-primary), 0.05);
}

.leaf-node {
    cursor: default;
}

.leaf-node:hover {
    background-color: transparent;
}

.node-label {
    font-weight: 500;
    font-size: 0.9rem;
}

.group-node .node-label {
    font-size: 1rem;
    font-weight: 600;
}

.subgroup-node .node-label {
    font-size: 0.95rem;
    font-weight: 600;
}

.antenna-node .node-label {
    font-size: 0.9rem;
}

.category-node .node-label {
    font-size: 0.85rem;
    font-weight: 400;
}
</style>
