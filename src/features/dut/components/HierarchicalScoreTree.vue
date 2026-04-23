<template>
  <section class="hierarchical-score-tree">
    <header class="hierarchical-score-tree__header">
      <div class="hierarchical-score-tree__header-copy">
        <span class="hierarchical-score-tree__header-icon">
          <Icon icon="mdi:file-tree" />
        </span>
        <div>
          <p class="hierarchical-score-tree__eyebrow">Hierarchical Path</p>
          <h3>Hierarchical Scores</h3>
        </div>
      </div>

      <div class="hierarchical-score-tree__header-actions">
        <button type="button" class="hierarchical-score-tree__button hierarchical-score-tree__button--ghost"
          @click="expandAll">
          <Icon icon="mdi:arrow-expand-vertical" />
          <span>Expand All</span>
        </button>
        <button type="button" class="hierarchical-score-tree__button hierarchical-score-tree__button--ghost"
          @click="collapseAll">
          <Icon icon="mdi:arrow-collapse-vertical" />
          <span>Collapse All</span>
        </button>
      </div>
    </header>

    <section v-if="overallGroupScores" class="hierarchical-score-tree__summary-card">
      <p class="hierarchical-score-tree__section-title">Overall Subgroup Averages</p>
      <div class="hierarchical-score-tree__summary-row">
        <span v-for="(score, subgroup) in overallGroupScores" :key="subgroup" class="hierarchical-score-tree__pill"
          :class="scoreToneClass(score)">
          {{ subgroup }}: {{ score.toFixed(2) }}
        </span>
      </div>
    </section>

    <div v-if="!groupScores || Object.keys(groupScores).length === 0" class="hierarchical-score-tree__empty-state">
      No hierarchical scores available.
    </div>

    <div v-else class="hierarchical-score-tree__tree">
      <div v-for="(groupData, groupKey) in groupScores" :key="groupKey" class="tree-node group-node">
        <button type="button" class="tree-node__header" @click="toggleGroup(String(groupKey))">
          <Icon :icon="expandedGroups.has(String(groupKey)) ? 'mdi:chevron-down' : 'mdi:chevron-right'" />
          <span class="node-label">{{ groupKey }}</span>
          <span class="tree-node__badges">
            <span class="hierarchical-score-tree__pill" :class="scoreToneClass(getGroupScore(groupData))">
              Bayesian: {{ getGroupScore(groupData).toFixed(2) }}
            </span>
            <span v-if="getGroupAvgScore(groupData) > 0" class="hierarchical-score-tree__pill hierarchical-score-tree__pill--info">
              Avg: {{ getGroupAvgScore(groupData).toFixed(2) }}
            </span>
          </span>
        </button>

        <div v-if="expandedGroups.has(String(groupKey))" class="tree-children">
          <div v-for="(subgroupData, subgroupKey) in getSubgroups(groupData)" :key="subgroupKey" class="tree-node subgroup-node">
            <button type="button" class="tree-node__header" @click="toggleSubgroup(String(groupKey), String(subgroupKey))">
              <Icon :icon="expandedSubgroups.has(`${groupKey}.${subgroupKey}`) ? 'mdi:chevron-down' : 'mdi:chevron-right'" />
              <span class="node-label">{{ subgroupKey }}</span>
              <span class="tree-node__badges">
                <span class="hierarchical-score-tree__pill" :class="scoreToneClass(getSubgroupScore(subgroupData))">
                  Bayes: {{ getSubgroupScore(subgroupData).toFixed(2) }}
                </span>
                <span v-if="getSubgroupAvgScore(subgroupData) > 0" class="hierarchical-score-tree__pill hierarchical-score-tree__pill--info">
                  Avg: {{ getSubgroupAvgScore(subgroupData).toFixed(2) }}
                </span>
              </span>
            </button>

            <div v-if="expandedSubgroups.has(`${groupKey}.${subgroupKey}`)" class="tree-children">
              <div v-for="(antennaData, antennaKey) in getAntennas(subgroupData)" :key="antennaKey" class="tree-node antenna-node">
                <button type="button" class="tree-node__header" @click="toggleAntenna(String(groupKey), String(subgroupKey), String(antennaKey))">
                  <Icon :icon="expandedAntennas.has(`${groupKey}.${subgroupKey}.${antennaKey}`) ? 'mdi:chevron-down' : 'mdi:chevron-right'" />
                  <span class="node-label">{{ antennaKey }}</span>
                  <span class="tree-node__badges">
                    <span class="hierarchical-score-tree__pill" :class="scoreToneClass(getAntennaScore(antennaData))">
                      Bayes: {{ getAntennaScore(antennaData).toFixed(2) }}
                    </span>
                    <span v-if="getAntennaAvgScore(antennaData) > 0" class="hierarchical-score-tree__pill hierarchical-score-tree__pill--info">
                      Avg: {{ getAntennaAvgScore(antennaData).toFixed(2) }}
                    </span>
                  </span>
                </button>

                <div v-if="expandedAntennas.has(`${groupKey}.${subgroupKey}.${antennaKey}`)" class="tree-children">
                  <div v-for="(scoreData, categoryKey) in getCategories(antennaData)" :key="categoryKey" class="tree-node category-node">
                    <div class="tree-node__header tree-node__header--leaf">
                      <Icon icon="mdi:circle-small" class="tree-node__leaf-icon" />
                      <span class="node-label">{{ categoryKey }}</span>
                      <span class="tree-node__badges">
                        <span class="hierarchical-score-tree__pill" :class="scoreToneClass(getCategoryBayesScore(scoreData))">
                          Bayes: {{ getCategoryBayesScore(scoreData).toFixed(2) }}
                        </span>
                        <span v-if="getCategoryAvgScore(scoreData) > 0" class="hierarchical-score-tree__pill hierarchical-score-tree__pill--info">
                          Avg: {{ getCategoryAvgScore(scoreData).toFixed(2) }}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
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

function scoreToneClass(score: number): string {
  const tone = getScoreColor(score)
  if (tone === 'success') return 'hierarchical-score-tree__pill--success'
  if (tone === 'info') return 'hierarchical-score-tree__pill--info'
  if (tone === 'warning') return 'hierarchical-score-tree__pill--warning'
  return 'hierarchical-score-tree__pill--error'
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
.hierarchical-score-tree {
  border: 1px solid var(--app-border);
  border-radius: 1.25rem;
  background:
    radial-gradient(circle at top left, rgba(40, 96, 163, 0.1), transparent 32%),
    var(--app-panel);
  padding: 1rem;
  display: grid;
  gap: 1rem;
}

.hierarchical-score-tree__header,
.hierarchical-score-tree__header-copy,
.hierarchical-score-tree__header-actions,
.tree-node__header,
.tree-node__badges,
.hierarchical-score-tree__summary-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.hierarchical-score-tree__header {
  justify-content: space-between;
}

.hierarchical-score-tree__header-copy {
  gap: 0.85rem;
}

.hierarchical-score-tree__header-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 999px;
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.hierarchical-score-tree__eyebrow,
.hierarchical-score-tree__section-title {
  margin: 0;
  color: var(--app-muted);
}

.hierarchical-score-tree__eyebrow {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hierarchical-score-tree__header h3 {
  margin: 0.2rem 0 0;
}

.hierarchical-score-tree__button,
.tree-node__header {
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-ink);
}

.hierarchical-score-tree__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 999px;
  cursor: pointer;
  padding: 0.7rem 0.95rem;
  font-weight: 700;
}

.hierarchical-score-tree__button--ghost {
  color: #4f5d6d;
}

.hierarchical-score-tree__summary-card,
.hierarchical-score-tree__empty-state {
  border-radius: 1rem;
  padding: 0.95rem 1rem;
}

.hierarchical-score-tree__summary-card {
  background: rgba(40, 96, 163, 0.08);
}

.hierarchical-score-tree__summary-row {
  flex-wrap: wrap;
  margin-top: 0.75rem;
}

.hierarchical-score-tree__empty-state {
  background: rgba(40, 96, 163, 0.08);
  color: #1f4e86;
}

.hierarchical-score-tree__tree {
  display: grid;
  gap: 0.55rem;
  font-family: Consolas, 'Courier New', monospace;
}

.tree-node {
  display: grid;
  gap: 0.4rem;
}

.tree-children {
  margin-left: 1.2rem;
  border-left: 2px solid rgba(40, 96, 163, 0.14);
  padding-left: 0.9rem;
  display: grid;
  gap: 0.4rem;
}

.tree-node__header {
  width: 100%;
  padding: 0.75rem 0.9rem;
  border-radius: 1rem;
  text-align: left;
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
}

.tree-node__header:hover {
  transform: translateY(-1px);
  border-color: rgba(40, 96, 163, 0.18);
}

.tree-node__header--leaf {
  cursor: default;
}

.tree-node__header--leaf:hover {
  transform: none;
}

.node-label {
  color: var(--app-ink);
  font-weight: 600;
}

.group-node .node-label {
  font-size: 1rem;
}

.subgroup-node .node-label {
  font-size: 0.95rem;
}

.antenna-node .node-label {
  font-size: 0.9rem;
}

.category-node .node-label {
  font-size: 0.85rem;
  font-weight: 500;
}

.tree-node__badges {
  margin-left: auto;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.tree-node__leaf-icon {
  color: var(--app-muted);
}

.hierarchical-score-tree__pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.28rem 0.68rem;
  font-size: 0.76rem;
  font-weight: 700;
}

.hierarchical-score-tree__pill--success {
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.hierarchical-score-tree__pill--info {
  background: rgba(40, 96, 163, 0.12);
  color: #1f4e86;
}

.hierarchical-score-tree__pill--warning {
  background: rgba(184, 118, 38, 0.16);
  color: #8f5314;
}

.hierarchical-score-tree__pill--error {
  background: rgba(189, 64, 64, 0.14);
  color: #8f2020;
}

@media (max-width: 900px) {
  .hierarchical-score-tree__header,
  .tree-node__header {
    flex-direction: column;
    align-items: stretch;
  }

  .tree-node__badges {
    margin-left: 0;
    justify-content: flex-start;
  }
}
</style>
