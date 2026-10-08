<template>
  <header class="mb-5 rounded-[28px] border border-white/35 bg-white/35 px-5 py-4 shadow-glow backdrop-blur-xl">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="font-display text-3xl leading-none text-mist-900">Sweet Dream</p>
        <p class="mt-1 max-w-56 text-sm text-mist-700">Un humedal nocturno a tu ritmo.</p>
      </div>
      <button
        type="button"
        class="min-h-11 rounded-full border border-mist-300/80 bg-white/70 px-4 py-2 text-sm font-medium text-mist-800 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mist-900"
        @click="$emit('stop-all')"
      >
        Detener todo
      </button>
    </div>

    <div class="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-mist-900/90 px-4 py-3 text-white">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-white/60">Activos</p>
        <p class="mt-1 text-2xl font-semibold">{{ activeCount }}</p>
      </div>
      <div class="min-w-36 flex-1">
        <RangeSlider
          label="Volumen maestro"
          :model-value="masterVolume"
          :min="0"
          :max="1"
          :step="0.01"
          :value-label="masterVolumeLabel"
          dark
          @update:model-value="(value) => $emit('set-master-volume', value)"
        />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import RangeSlider from '@/components/RangeSlider.vue'

defineProps<{
  activeCount: number
  masterVolume: number
  masterVolumeLabel: string
}>()

defineEmits<{
  (event: 'stop-all'): void
  (event: 'set-master-volume', value: number): void
}>()
</script>
