<template>
  <div class="app-form-field" :class="{ 'app-form-field--full': full }">
    <label class="app-form-field__label" :for="fieldId">
      {{ label }}
      <span v-if="required" class="app-form-field__required" aria-hidden="true">*</span>
      <span v-else-if="showOptional" class="app-form-field__optional">optional</span>
    </label>

    <slot :id="fieldId" :described-by="describedBy" />

    <p v-if="error" :id="`${fieldId}-error`" class="app-form-field__error" role="alert">{{ error }}</p>
    <p v-else-if="hint" :id="`${fieldId}-hint`" class="app-form-field__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    hint?: string
    error?: string
    required?: boolean
    showOptional?: boolean
    full?: boolean
    fieldId?: string
  }>(),
  {
    hint: '',
    error: '',
    required: false,
    showOptional: false,
    full: false,
    fieldId: '',
  },
)

const generatedId = useId()
const fieldId = computed(() => props.fieldId || generatedId)
const describedBy = computed(() => {
  if (props.error) return `${fieldId.value}-error`
  if (props.hint) return `${fieldId.value}-hint`
  return undefined
})
</script>

<style scoped>
.app-form-field {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.app-form-field--full {
  grid-column: 1 / -1;
}

.app-form-field__label {
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
  color: var(--app-ink);
  font-size: 0.8rem;
  font-weight: 600;
}

.app-form-field__required {
  color: var(--app-danger);
}

.app-form-field__optional {
  color: var(--app-muted);
  font-size: 0.72rem;
  font-weight: 500;
}

.app-form-field__hint {
  margin: 0;
  color: var(--app-muted);
  font-size: 0.74rem;
  line-height: 1.4;
}

.app-form-field__error {
  margin: 0;
  color: var(--app-danger);
  font-size: 0.74rem;
  line-height: 1.4;
}
</style>
