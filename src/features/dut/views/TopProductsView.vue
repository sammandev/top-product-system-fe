<template>
  <DefaultLayout>
    <div class="top-products-header">
      <div class="top-products-header__copy">
        <div class="top-products-header__icon">
          <Icon icon="mdi:trophy-outline" />
        </div>
        <div>
          <p class="top-products-header__eyebrow">DUT Workspace</p>
          <h1>Top Products Analysis</h1>
          <p>Run Top Products by iPLAS data, DUT ISN, or upload log from one workspace.</p>
        </div>
      </div>

      <button v-if="hasResults" type="button" class="top-products-button top-products-button--primary"
        @click="handleExport">
        <Icon icon="mdi:download-outline" />
        <span>Export Results</span>
      </button>
    </div>

    <div v-if="error" class="top-products-notice top-products-notice--error">
      <div>
        <strong>Top products error</strong>
        <p>{{ error }}</p>
      </div>
      <button type="button" @click="clearError">Dismiss</button>
    </div>

    <section class="top-products-shell">
      <AppTabs v-model="activeTab" :items="tabItems" scrollable>
        <template #panel-iplas-data>
          <section class="top-products-pane">
            <TopProductsByIplasDataTab v-if="activeTab === 'iplas-data'" />
          </section>
        </template>

        <template #panel-dut-isn>
          <section class="top-products-pane">
            <TopProductsByISNTab v-if="activeTab === 'dut-isn'" />
          </section>
        </template>

        <template #panel-upload-log>
          <section class="top-products-pane">
            <TopProductsByUploadLogTab v-if="activeTab === 'upload-log'" />
          </section>
        </template>
      </AppTabs>

    </section>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { useTabPersistence } from '@/shared/composables/useTabPersistence'
import AppTabs from '@/shared/ui/tabs/AppTabs.vue'

const TopProductsByIplasDataTab = defineAsyncComponent(
  () => import('../components/TopProductsByIplasDataTab.vue'),
)
const TopProductsByISNTab = defineAsyncComponent(() => import('../components/TopProductsByISNTab.vue'))
const TopProductsByUploadLogTab = defineAsyncComponent(
  () => import('@/features/dut-logs/components/TopProductsByUploadLogTab.vue'),
)

const activeTab = useTabPersistence<'iplas-data' | 'dut-isn' | 'upload-log'>('tab', 'iplas-data')
const error = ref<string>('')

const tabItems = [
  {
    value: 'iplas-data',
    label: 'By iPLAS Data',
    icon: 'mdi:database-search-outline',
  },
  {
    value: 'dut-isn',
    label: 'By DUT ISN',
    icon: 'mdi:barcode-scan',
  },
  {
    value: 'upload-log',
    label: 'By Upload Log',
    icon: 'mdi:upload-outline',
  },
]

const hasResults = computed(() => false) // TODO: Get from active tab

watch(
  activeTab,
  (value) => {
    if (value === 'iplas-data' || value === 'dut-isn' || value === 'upload-log') {
      return
    }

    activeTab.value = 'iplas-data'
  },
  { immediate: true },
)

function handleExport() {
  console.log('Export requested for tab:', activeTab.value)
}

function clearError() {
  error.value = ''
}
</script>

<style scoped>
.top-products-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.top-products-header__copy {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
}

.top-products-header__icon {
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

.top-products-header__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  letter-spacing: 0;
  text-transform: none;
  color: var(--app-accent);
  font-weight: 700;
}

.top-products-header h1 {
  margin: 0;
  font-size: clamp(1.8rem, 2.5vw, 2.35rem);
  color: var(--app-ink);
}

.top-products-header p:last-child {
  max-width: 48rem;
  margin: 0.45rem 0 0;
  color: var(--app-muted);
  line-height: 1.5;
}

.top-products-button {
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

.top-products-button--primary {
  background: var(--app-accent);
  border-color: var(--app-accent);
  color: var(--app-canvas);
}

.top-products-notice {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  padding: 1rem 1.1rem;
  border-radius: 1rem;
  border: 1px solid transparent;
  margin-bottom: 1rem;
}

.top-products-notice p {
  margin: 0.25rem 0 0;
  line-height: 1.55;
}

.top-products-notice button {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.top-products-notice--error {
  background: rgb(239 68 68 / 0.08);
  border-color: rgb(239 68 68 / 0.22);
  color: #991b1b;
}

.top-products-notice--warning {
  background: rgb(245 158 11 / 0.1);
  border-color: rgb(245 158 11 / 0.28);
  color: #92400e;
}

.top-products-shell {
  border: 1px solid #dbe4ee;
  border-radius: 0.75rem;
  background:
    radial-gradient(circle at top left, rgb(15 118 110 / 0.08), transparent 28%),
    #fff;
  overflow: hidden;
}

.top-products-pane {
  padding: 1.25rem;
}

@media (max-width: 720px) {

  .top-products-header,
  .top-products-header__copy {
    flex-direction: column;
  }

  .top-products-button {
    width: 100%;
  }

  .top-products-pane {
    padding: 1rem;
  }
}
</style>
