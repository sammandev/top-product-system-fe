<template>
    <DefaultLayout>
        <div class="pa-trend-header">
            <div class="pa-trend-header__copy">
                <div class="pa-trend-header__icon">
                    <Icon icon="mdi:chart-line-variant" />
                </div>
                <div>
                    <p class="pa-trend-header__eyebrow">DUT Workspace</p>
                    <h1>PA Trend Analysis</h1>
                    <p>Analyze PA trends across DUTs and stations in auto, dex, and differential modes.</p>
                </div>
            </div>

            <button v-if="hasResults" type="button" class="pa-trend-button pa-trend-button--primary"
                @click="handleExport">
                <Icon icon="mdi:download-outline" />
                <span>Export Results</span>
            </button>
        </div>

        <div v-if="!hasDUTAccess" class="pa-trend-notice pa-trend-notice--warning">
            <div>
                <strong>External login required</strong>
                <p>This feature requires external DUT access before analysis can run.</p>
            </div>
        </div>

        <section class="pa-trend-panel pa-trend-panel--filters">
            <div class="pa-trend-panel__header">
                <div>
                    <p class="pa-trend-panel__eyebrow">Scope</p>
                    <h2>Analysis</h2>
                </div>
            </div>

            <form class="pa-trend-form" @submit.prevent="handleAnalyze">
                <div class="pa-trend-grid pa-trend-grid--two">
                    <label class="pa-trend-field">
                        <span>DUT ISNs</span>
                        <div class="pa-trend-token-entry">
                            <input v-model="pendingDutInput" type="text" autocomplete="off"
                                placeholder="Type values, then press Enter or comma"
                                @keydown="handleTokenKeydown($event, 'dut')" @blur="commitPendingTokens('dut')">
                            <button type="button" @click="commitPendingTokens('dut')">Add</button>
                        </div>
                        <small>Enter, comma, space, or paste a list.</small>
                        <div class="pa-trend-token-list">
                            <button v-for="dutIsn in selectedDutIsns" :key="dutIsn" type="button" class="pa-trend-token"
                                @click="removeToken('dut', dutIsn)">
                                <span>{{ dutIsn }}</span>
                                <Icon icon="mdi:close" />
                            </button>
                        </div>
                    </label>

                    <label class="pa-trend-field">
                        <span>Station IDs</span>
                        <div class="pa-trend-token-entry">
                            <input v-model="pendingStationInput" type="text" autocomplete="off"
                                placeholder="Type values, then press Enter or comma"
                                @keydown="handleTokenKeydown($event, 'station')" @blur="commitPendingTokens('station')">
                            <button type="button" @click="commitPendingTokens('station')">Add</button>
                        </div>
                        <small>Enter, comma, space, or paste a list.</small>
                        <div class="pa-trend-token-list">
                            <button v-for="stationId in selectedStationIds" :key="stationId" type="button"
                                class="pa-trend-token pa-trend-token--cool" @click="removeToken('station', stationId)">
                                <span>{{ stationId }}</span>
                                <Icon icon="mdi:close" />
                            </button>
                        </div>
                    </label>
                </div>

                <div class="pa-trend-grid pa-trend-grid--three">
                    <label class="pa-trend-field">
                        <span>Site Identifier</span>
                        <input v-model="siteIdentifier" type="text" autocomplete="off"
                            placeholder="Optional site filter">
                    </label>

                    <label class="pa-trend-field">
                        <span>Model Identifier</span>
                        <input v-model="modelIdentifier" type="text" autocomplete="off"
                            placeholder="Optional model filter">
                    </label>

                    <label class="pa-trend-field">
                        <span>SROM Filter</span>
                        <select v-model="sromFilter">
                            <option v-for="option in sromFilterOptions" :key="option.value" :value="option.value">
                                {{ option.title }}
                            </option>
                        </select>
                    </label>
                </div>

                <div class="pa-trend-grid pa-trend-grid--two">
                    <label class="pa-trend-field">
                        <span>Start Time</span>
                        <input v-model="startTime" type="datetime-local">
                    </label>

                    <label class="pa-trend-field">
                        <span>End Time</span>
                        <input v-model="endTime" type="datetime-local">
                    </label>
                </div>

                <div class="pa-trend-inline-summary">
                    <span>{{ selectedDutIsns.length }} DUT{{ selectedDutIsns.length === 1 ? '' : 's' }}</span>
                    <span>{{ selectedStationIds.length }} station{{ selectedStationIds.length === 1 ? '' : 's' }}</span>
                    <span>{{sromFilterOptions.find((option) => option.value === sromFilter)?.title || 'All'}}
                        SROMs</span>
                </div>

                <div class="pa-trend-button-row">
                    <button type="submit" class="pa-trend-button pa-trend-button--primary"
                        :disabled="!canAnalyze || dutStore.paTrendLoading">
                        <Icon icon="mdi:chart-line" />
                        <span>{{ dutStore.paTrendLoading ? 'Analyzing...' : 'Analyze' }}</span>
                    </button>
                    <button type="button" class="pa-trend-button pa-trend-button--ghost"
                        :disabled="dutStore.paTrendLoading" @click="handleReset">
                        <Icon icon="mdi:refresh" />
                        <span>Reset</span>
                    </button>
                </div>
            </form>
        </section>

        <div v-if="dutStore.paTrendError" class="pa-trend-notice pa-trend-notice--error">
            <div>
                <strong>PA trend analysis failed</strong>
                <p>{{ dutStore.paTrendError }}</p>
            </div>
            <button type="button" @click="dutStore.paTrendError = null">Dismiss</button>
        </div>

        <AppTabs v-model="activeTab" :items="tabItems" scrollable class="pa-trend-tabs">
            <template #panel-auto>
                <PATrendResultsCard :data="dutStore.paTrendAutoData" :loading="dutStore.paTrendLoading"
                    title="Auto Trend Results" type="auto" />
            </template>

            <template #panel-dex>
                <PATrendResultsCard :data="dutStore.paTrendDexData" :loading="dutStore.paTrendLoading"
                    title="Dex Trend Results" type="dex" />
            </template>

            <template #panel-diff>
                <PATrendResultsCard :data="dutStore.paDiffData" :loading="dutStore.paTrendLoading"
                    title="Differential Results" type="diff" />
            </template>
        </AppTabs>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import type { PATrendRequest } from '@/core/types'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { useTabPersistence } from '@/shared/composables/useTabPersistence'
import AppTabs from '@/shared/ui/tabs/AppTabs.vue'
import PATrendResultsCard from '../components/PATrendResultsCard.vue'
import { useDUTStore } from '../stores/dut.store'

type TokenField = 'dut' | 'station'

const dutStore = useDUTStore()
const authStore = useAuthStore()

const selectedDutIsns = ref<string[]>([])
const selectedStationIds = ref<string[]>([])
const siteIdentifier = ref('')
const modelIdentifier = ref('')
const sromFilter = ref<'all' | 'old' | 'new'>('all')
const startTime = ref('')
const endTime = ref('')
const pendingDutInput = ref('')
const pendingStationInput = ref('')

const activeTab = useTabPersistence<'auto' | 'dex' | 'diff'>('tab', 'auto')

const tabItems = [
    { value: 'auto', label: 'Auto Trend', icon: 'mdi:auto-mode' },
    { value: 'dex', label: 'Dex Trend', icon: 'mdi:gesture-tap' },
    { value: 'diff', label: 'Differential', icon: 'mdi:delta' },
]

const sromFilterOptions = [
    { title: 'All', value: 'all' },
    { title: 'Old', value: 'old' },
    { title: 'New', value: 'new' },
]

const hasDUTAccess = computed(() => authStore.hasDUTAccess)
const canAnalyze = computed(() => {
    return hasDUTAccess.value && selectedDutIsns.value.length > 0 && selectedStationIds.value.length > 0
})
const hasResults = computed(() => {
    if (activeTab.value === 'auto') return dutStore.paTrendAutoData.length > 0
    if (activeTab.value === 'dex') return dutStore.paTrendDexData.length > 0
    if (activeTab.value === 'diff') return dutStore.paDiffData.length > 0
    return false
})

function parseTokenList(value: string): string[] {
    return value
        .split(/[\n,\s]+/)
        .map((entry) => entry.trim())
        .filter(Boolean)
}

function uniqueTokens(values: string[]): string[] {
    return [...new Set(values)]
}

function commitPendingTokens(field: TokenField) {
    const source = field === 'dut' ? pendingDutInput : pendingStationInput
    const nextTokens = parseTokenList(source.value)

    if (nextTokens.length === 0) {
        source.value = ''
        return
    }

    if (field === 'dut') {
        selectedDutIsns.value = uniqueTokens([...selectedDutIsns.value, ...nextTokens])
        pendingDutInput.value = ''
        return
    }

    selectedStationIds.value = uniqueTokens([...selectedStationIds.value, ...nextTokens])
    pendingStationInput.value = ''
}

function removeToken(field: TokenField, value: string) {
    if (field === 'dut') {
        selectedDutIsns.value = selectedDutIsns.value.filter((entry) => entry !== value)
        return
    }

    selectedStationIds.value = selectedStationIds.value.filter((entry) => entry !== value)
}

function handleTokenKeydown(event: KeyboardEvent, field: TokenField) {
    if (event.key !== 'Enter' && event.key !== ',') {
        return
    }

    event.preventDefault()
    commitPendingTokens(field)
}

async function handleAnalyze() {
    commitPendingTokens('dut')
    commitPendingTokens('station')

    if (!canAnalyze.value) {
        return
    }

    const params: PATrendRequest = {
        dut_isn: [...selectedDutIsns.value],
        station_id: selectedStationIds.value.map(String),
        srom_filter: sromFilter.value,
    }

    if (siteIdentifier.value.trim()) {
        params.site_identifier = siteIdentifier.value.trim()
    }
    if (modelIdentifier.value.trim()) {
        params.model_identifier = modelIdentifier.value.trim()
    }
    if (startTime.value) {
        params.start_time = startTime.value
    }
    if (endTime.value) {
        params.end_time = endTime.value
    }

    try {
        if (activeTab.value === 'auto') {
            await dutStore.fetchPATrendAuto(params)
        } else if (activeTab.value === 'dex') {
            await dutStore.fetchPATrendDex(params)
        } else {
            await dutStore.fetchPATrendDiff(params)
        }
    } catch (error) {
        console.error('Failed to fetch PA trend data:', error)
    }
}

function handleReset() {
    selectedDutIsns.value = []
    selectedStationIds.value = []
    siteIdentifier.value = ''
    modelIdentifier.value = ''
    sromFilter.value = 'all'
    startTime.value = ''
    endTime.value = ''
    pendingDutInput.value = ''
    pendingStationInput.value = ''
    dutStore.clearPATrendData()
}

function handleExport() {
    console.log('Export functionality to be implemented')
}
</script>

<style scoped>
.pa-trend-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
}

.pa-trend-header__copy {
    display: flex;
    gap: 0.85rem;
    align-items: flex-start;
}

.pa-trend-header__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.7rem;
    height: 2.7rem;
    border-radius: 0.75rem;
    background: var(--app-panel-strong);
    color: var(--app-info);
    font-size: 1.3rem;
}

.pa-trend-header__eyebrow,
.pa-trend-panel__eyebrow {
    margin: 0 0 0.35rem;
    font-size: 0.72rem;
    letter-spacing: 0;
    text-transform: none;
    color: var(--app-accent);
    font-weight: 700;
}

.pa-trend-header h1,
.pa-trend-panel h2 {
    margin: 0;
    color: var(--app-ink);
}

.pa-trend-header h1 {
    font-size: clamp(1.8rem, 2.5vw, 2.35rem);
}

.pa-trend-header p:last-child {
    max-width: 48rem;
    margin: 0.45rem 0 0;
    color: var(--app-muted);
    line-height: 1.5;
}

.pa-trend-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 2.75rem;
    padding: 0.75rem 1rem;
    border-radius: 0.9rem;
    border: 1px solid transparent;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease;
}

.pa-trend-button:disabled {
    opacity: 0.65;
    cursor: not-allowed;
}

.pa-trend-button--primary {
    background: var(--app-accent);
    border-color: var(--app-accent);
    color: var(--app-canvas);
}

.pa-trend-button--ghost {
    background: var(--app-panel);
    border-color: var(--app-border);
    color: var(--app-ink);
}

.pa-trend-notice,
.pa-trend-panel {
    border: 1px solid var(--app-border);
    border-radius: 0.85rem;
    background: var(--app-panel);
}

.pa-trend-notice {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    padding: 1rem 1.1rem;
    margin-bottom: 1rem;
}

.pa-trend-notice p {
    margin: 0.25rem 0 0;
    line-height: 1.55;
}

.pa-trend-notice button {
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
}

.pa-trend-notice--warning {
    border-color: var(--app-warning-line);
    background: var(--app-warning-soft);
    color: var(--app-warning);
}

.pa-trend-notice--error {
    background: var(--app-danger-soft);
    border-color: var(--app-danger-line);
    color: var(--app-danger);
}

.pa-trend-panel {
    padding: 1rem;
    margin-bottom: 1rem;
}

.pa-trend-form,
.pa-trend-field {
    display: flex;
    flex-direction: column;
}

.pa-trend-form {
    gap: 1rem;
}

.pa-trend-grid {
    display: grid;
    gap: 1rem;
}

.pa-trend-grid--two {
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
}

.pa-trend-grid--three {
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
}

.pa-trend-field {
    gap: 0.45rem;
}

.pa-trend-field span {
    font-weight: 600;
    color: #0f172a;
}

.pa-trend-field input,
.pa-trend-field select {
    width: 100%;
    border: 1px solid #cbd5e1;
    border-radius: 0.75rem;
    padding: 0.72rem 0.82rem;
    font: inherit;
    color: #0f172a;
    background: white;
}

.pa-trend-field input:focus,
.pa-trend-field select:focus {
    outline: none;
    border-color: #0f766e;
    box-shadow: 0 0 0 4px rgb(15 118 110 / 0.12);
}

.pa-trend-field small {
    color: #64748b;
    line-height: 1.45;
}

.pa-trend-token-entry {
    display: flex;
    gap: 0.65rem;
}

.pa-trend-token-entry button {
    min-width: 4.5rem;
    border: 1px solid #cbd5e1;
    border-radius: 0.75rem;
    background: white;
    color: #0f172a;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
}

.pa-trend-token-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    min-height: 1.5rem;
}

.pa-trend-token {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.38rem 0.7rem;
    border-radius: 999px;
    border: 1px solid rgb(15 118 110 / 0.18);
    background: rgb(15 118 110 / 0.08);
    color: #0f766e;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
}

.pa-trend-token--cool {
    border-color: rgb(14 165 233 / 0.18);
    background: rgb(14 165 233 / 0.09);
    color: #0c4a6e;
}

.pa-trend-inline-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
}

.pa-trend-inline-summary span {
    display: inline-flex;
    align-items: center;
    padding: 0.35rem 0.65rem;
    border-radius: 999px;
    background: #f1f5f9;
    color: #475569;
    font-size: 0.82rem;
    font-weight: 600;
}

.pa-trend-button-row {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.pa-trend-tabs {
    min-width: 0;
}

@media (max-width: 920px) {

    .pa-trend-grid--two,
    .pa-trend-grid--three {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 720px) {

    .pa-trend-header,
    .pa-trend-header__copy,
    .pa-trend-token-entry,
    .pa-trend-button-row {
        flex-direction: column;
    }

    .pa-trend-button,
    .pa-trend-token-entry button {
        width: 100%;
    }

    .pa-trend-panel {
        padding: 1rem;
    }
}
</style>