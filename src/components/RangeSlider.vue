<template>
  <label class="block">
    <div class="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-mist-600">
      <span>{{ label }}</span>
      <span>{{ valueLabel }}</span>
    </div>
    <input
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      type="range"
      class="range-slider"
      @input="onInput"
    />
  </label>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
  modelValue: number
  min: number
  max: number
  step: number
  valueLabel: string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: number): void
}>()

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', Number(target.value))
}
</script>
