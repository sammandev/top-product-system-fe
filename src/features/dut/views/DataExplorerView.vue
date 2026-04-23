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
                        <p>
                            Search and download DUT test data from iPLAS or internal sources while the heavier
                            child workflows migrate underneath a shared scaffold-era route shell.
                        </p>
                    </div>
                </div>
            </header>

            <AppTabs v-model="activeTab" :items="tabItems">
                <template #panel-iplas>
                    <section class="data-explorer-pane">
                        <IplasDataContent v-if="activeTab === 'iplas'" />
                    </section>
                </template>

                <template #panel-internal>
                    <section class="data-explorer-pane">
                        <div class="data-explorer-notice">
                            <div>
                                <strong>Internal data snapshot</strong>
                                <p>
                                    Internal data is reshaped so the route can display all relevant station data for
                                    the provided ISN. It may lag behind iPLAS recency.
                                </p>
                            </div>
                        </div>
                        <InternalDataContent v-if="activeTab === 'internal'" />
                    </section>
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
    gap: 1.5rem;
}

.data-explorer-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
}

.data-explorer-header__copy {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
}

.data-explorer-header__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3.2rem;
    height: 3.2rem;
    border-radius: 1rem;
    background: linear-gradient(135deg, rgba(20, 88, 71, 0.16), rgba(161, 104, 57, 0.16));
    color: #145847;
    font-size: 1.5rem;
}

.data-explorer-header__eyebrow {
    margin: 0 0 0.35rem;
    color: var(--app-accent);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.data-explorer-header h1 {
    margin: 0;
    color: var(--app-ink);
}

.data-explorer-header p,
.data-explorer-notice p {
    margin: 0.35rem 0 0;
    color: var(--app-muted);
    line-height: 1.6;
}

.data-explorer-pane {
    display: grid;
    gap: 1rem;
}

.data-explorer-notice {
    display: flex;
    gap: 1rem;
    border: 1px solid rgba(36, 116, 184, 0.18);
    border-radius: 1.2rem;
    padding: 1rem 1.1rem;
    background: rgba(240, 249, 255, 0.92);
}

.data-explorer-notice strong {
    color: #1d4f91;
}

@media (max-width: 720px) {
    .data-explorer-header,
    .data-explorer-header__copy {
        flex-direction: column;
    }
}
</style>
