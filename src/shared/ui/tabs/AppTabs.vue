<template>
  <Tabs
    v-bind="attrs"
    :value="modelValue"
    class="app-tabs"
    @update:value="onTabChange"
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
        <!-- Render a panel on first activation, then keep it mounted (hidden via v-show). -->
        <slot v-if="visitedValues.has(item.value)" :name="panelSlotName(item.value)" :item="item" />
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
import { reactive, useAttrs, watch } from 'vue'

defineOptions({ inheritAttrs: false })

interface AppTabItem {
  value: string | number
  label: string
  icon?: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number
    items: readonly AppTabItem[]
    variant?: 'underline' | 'segmented'
  }>(),
  {
    variant: 'underline',
  },
)

const emit = defineEmits<(event: 'update:modelValue', value: string | number) => void>()

const attrs = useAttrs()

const visitedValues = reactive(new Set<string | number>())

watch(
  () => props.modelValue,
  (value) => {
    visitedValues.add(value)
  },
  { immediate: true },
)

// Forget visited panels whose tab no longer exists (e.g. dynamic per-result tabs).
watch(
  () => props.items,
  (items) => {
    const values = new Set(items.map((item) => item.value))
    for (const value of visitedValues) {
      if (value !== props.modelValue && !values.has(value)) visitedValues.delete(value)
    }
  },
)

function onTabChange(value: string | number) {
  // PrimeVue switches its internal value immediately, even if the parent ignores the update.
  visitedValues.add(value)
  emit('update:modelValue', value)
}

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