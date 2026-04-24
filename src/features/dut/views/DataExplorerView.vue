<template>
    <DefaultLayout>
        <div class="data-explorer-shell">
            <header class="data-explorer-header">
                <div class="data-explorer-header__copy">
                    <div class="data-explorer-header__icon">
                        <Icon icon="mdi:database-search-outline" />
                    </div>
                    <div>
                        <p class="data-explorer-header__eyebrow">DUT Workspace</p>
                        <h1>Data Explorer</h1>
                        <p>Search and download DUT test data from iPLAS or internal sources.</p>
                    </div>
                </div>
            </header>

            <AppTabs v-model="activeTab" :items="tabItems" class="data-explorer-tabs">
                <template #panel-iplas>
                    <IplasDataContent v-if="activeTab === 'iplas'" />
                </template>

                <template #panel-internal>
                    <div class="data-explorer-pane">
                        <div class="data-explorer-notice">
                            <div>
                                <strong>Internal data snapshot</strong>
                                <p>Internal data may lag behind iPLAS recency.</p>
                            </div>
                        </div>
                        <InternalDataContent v-if="activeTab === 'internal'" />
                    </div>
                </template>
            </AppTabs>
        </div>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { defineAsyncComponent } from 'vue'
import { useTabPersistence } from '@/shared/composables/useTabPersistence'
import AppTabs from '@/shared/ui/tabs/AppTabs.vue'

const IplasDataContent = defineAsyncComponent(() => import('../components/IplasDataContent.vue'))
const InternalDataContent = defineAsyncComponent(
    () => import('../components/InternalDataContent.vue'),
)

const activeTab = useTabPersistence<'iplas' | 'internal'>('tab', 'iplas')

const tabItems = [
    { value: 'iplas', label: 'iPLAS Data', icon: 'mdi:cloud-download-outline' },
    { value: 'internal', label: 'Internal Data', icon: 'mdi:database-outline' },
]
</script>

<style scoped>
.data-explorer-shell {
    display: grid;
    gap: 1.25rem;
    min-width: 0;
}

.data-explorer-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
}

.data-explorer-header__copy {
    display: flex;
    gap: 0.85rem;
    align-items: flex-start;
}

.data-explorer-header__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.7rem;
    height: 2.7rem;
    border-radius: 0.75rem;
    background: var(--app-panel-strong);
    color: var(--app-info);
    font-size: 1.3rem;
}

.data-explorer-header__eyebrow {
    margin: 0 0 0.35rem;
    color: var(--app-accent);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: none;
}

.data-explorer-header h1 {
    margin: 0;
    color: var(--app-ink);
}

.data-explorer-header p,
.data-explorer-notice p {
    margin: 0.35rem 0 0;
    color: var(--app-muted);
    line-height: 1.5;
}

.data-explorer-pane {
    display: grid;
    gap: 1rem;
    min-width: 0;
}

.data-explorer-tabs {
    min-width: 0;
}

.data-explorer-notice {
    display: flex;
    gap: 1rem;
    border: 1px solid var(--app-info-line);
    border-radius: 0.7rem;
    padding: 0.9rem 1rem;
    background: var(--app-info-soft);
}

.data-explorer-notice strong {
    color: var(--app-info);
}

@media (max-width: 720px) {
    .data-explorer-header,
    .data-explorer-header__copy {
        flex-direction: column;
    }
}
</style>
