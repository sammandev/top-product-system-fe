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
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import { useAttrs } from 'vue'

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
    variant?: 'underline' | 'segmented'
  }>(),
  {
    scrollable: false,
    variant: 'underline',
  },
)

const emit = defineEmits<(event: 'update:modelValue', value: string | number) => void>()

const attrs = useAttrs()

function normalizeIcon(icon: string) {
  return icon.startsWith('mdi-') ? `mdi:${icon.slice(4)}` : icon
}

function panelSlotName(value: string | number) {
  return `panel-${value}`
}
</script>

<style scoped>
.app-tabs {
  display: block;
}

.app-tabs :deep(.p-tabs) {
  display: grid;
  gap: 0.65rem;
}

.app-tabs :deep(.p-tablist) {
  margin: 0;
}

.app-tabs :deep(.p-tablist-tab-list) {
  gap: 0.4rem;
}

.app-tabs :deep(.p-tabpanels) {
  padding: 0.3rem 0 0;
}

.app-tabs :deep(.p-tabpanel) {
  padding: 0;
}

.app-tabs__tab-label {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}
</style>