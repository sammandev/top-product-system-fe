<template>
  <Tabs
    v-bind="attrs"
    :value="modelValue"
    :scrollable="scrollable"
    class="app-tabs"
    @update:value="emit('update:modelValue', $event)"
  >
    <TabList>
      <Tab
        v-for="item in items"
        :key="item.value"
        :disabled="item.disabled"
        :value="item.value"
      >
        <span class="app-tabs__tab-label">
          <Icon v-if="item.icon" :icon="normalizeIcon(item.icon)" />
          <span>{{ item.label }}</span>
        </span>
      </Tab>
    </TabList>

    <TabPanels>
      <TabPanel v-for="item in items" :key="item.value" :value="item.value">
        <slot :name="panelSlotName(item.value)" :item="item" />
      </TabPanel>
    </TabPanels>
  </Tabs>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useAttrs } from 'vue'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'

defineOptions({ inheritAttrs: false })

interface AppTabItem {
  value: string | number
  label: string
  icon?: string
  disabled?: boolean
}

withDefaults(
  defineProps<{
    modelValue: string | number
    items: readonly AppTabItem[]
    scrollable?: boolean
  }>(),
  {
    scrollable: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string | number): void
}>()

const attrs = useAttrs()

function normalizeIcon(icon: string) {
  return icon.startsWith('mdi-') ? `mdi:${icon.slice(4)}` : icon
}

function panelSlotName(value: string | number) {
  return `panel-${value}`
}
</script>

<style scoped>
.app-tabs :deep(.p-tablist-tab-list) {
  gap: 0.5rem;
  border-bottom: 1px solid var(--app-border);
  background: rgba(255, 250, 246, 0.9);
  padding: 0.8rem 0.8rem 0;
}

.app-tabs :deep(.p-tab) {
  border: 1px solid transparent;
  border-bottom: 0;
  border-radius: 1rem 1rem 0 0;
  background: transparent;
  color: var(--app-muted);
  font-weight: 600;
}

.app-tabs :deep(.p-tab-active) {
  border-color: var(--app-border);
  background: var(--app-panel-strong);
  color: var(--app-accent);
}

.app-tabs :deep(.p-tabpanels) {
  border-radius: 0 0 1.25rem 1.25rem;
  background: var(--app-panel-strong);
}

.app-tabs__tab-label {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}
</style>