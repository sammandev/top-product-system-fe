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
                            Group Score: {{ getGroupScore(groupData).toFixed(2) }}
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
                                        {{ subgroupKey }} Score: {{ getSubgroupScore(subgroupData).toFixed(2) }}
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
                                                    {{ antennaKey }} Score: {{ getAntennaScore(antennaData).toFixed(2)
                                                    }}
                                                </v-chip>
                                            </div>

                                            <!-- Category Level (Leaf Nodes) -->
                                            <v-expand-transition>
                                                <div v-if="expandedAntennas.has(`${groupKey}.${subgroupKey}.${antennaKey}`)"
                                                    class="tree-children">
                                                    <div v-for="(score, categoryKey) in getCategories(antennaData)"
                                                        :key="categoryKey" class="tree-node category-node">
                                                        <div class="node-header leaf-node">
                                                            <v-icon size="small" class="mr-2 text-medium-emphasis">
                                                                mdi-circle-small
                                                            </v-icon>
                                                            <span class="node-label">{{ categoryKey }}</span>
                                                            <v-spacer />
                                                            <v-chip :color="getScoreColor(score)" size="x-small"
                                                                variant="flat">
                                                                {{ score.toFixed(2) }}
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
import { ref, type PropType } from 'vue'
import type { GroupScores, OverallGroupScores } from '@/core/types'

// Props
const props = defineProps({
    groupScores: {
        type: Object as PropType<GroupScores>,
        required: true
    },
    overallGroupScores: {
        type: Object as PropType<OverallGroupScores | null>,
        default: null
    }
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

    Object.keys(props.groupScores).forEach(groupKey => {
        expandedGroups.value.add(groupKey)

        const subgroups = getSubgroups(props.groupScores[groupKey])
        Object.keys(subgroups).forEach(subgroupKey => {
            expandedSubgroups.value.add(`${groupKey}.${subgroupKey}`)

            const antennas = getAntennas(subgroups[subgroupKey])
            Object.keys(antennas).forEach(antennaKey => {
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

function getGroupScore(groupData: any): number {
    return typeof groupData.group_score === 'number' ? groupData.group_score : 0
}

function getSubgroups(groupData: any): Record<string, any> {
    const subgroups: Record<string, any> = {}
    Object.keys(groupData).forEach(key => {
        if (key !== 'group_score' && typeof groupData[key] === 'object') {
            subgroups[key] = groupData[key]
        }
    })
    return subgroups
}

function getSubgroupScore(subgroupData: any): number {
    // Find the score key (e.g., "tx_group_score", "rx_group_score")
    const scoreKey = Object.keys(subgroupData).find(key => key.includes('_group_score'))
    return scoreKey && typeof subgroupData[scoreKey] === 'number' ? subgroupData[scoreKey] : 0
}

function getAntennas(subgroupData: any): Record<string, any> {
    const antennas: Record<string, any> = {}
    Object.keys(subgroupData).forEach(key => {
        if (!key.includes('_group_score') && typeof subgroupData[key] === 'object') {
            antennas[key] = subgroupData[key]
        }
    })
    return antennas
}

function getAntennaScore(antennaData: any): number {
    // Find the antenna score key (e.g., "tx1_score", "rx2_score")
    const scoreKey = Object.keys(antennaData).find(key => key.includes('_score'))
    return scoreKey && typeof antennaData[scoreKey] === 'number' ? antennaData[scoreKey] : 0
}

function getCategories(antennaData: any): Record<string, number> {
    const categories: Record<string, number> = {}
    Object.keys(antennaData).forEach(key => {
        if (!key.includes('_score') && typeof antennaData[key] === 'number') {
            categories[key] = antennaData[key]
        }
    })
    return categories
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
