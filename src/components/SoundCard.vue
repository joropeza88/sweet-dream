<template>
  <article class="rounded-[24px] border px-4 py-4 shadow-card backdrop-blur-xl transition" :class="sound.enabled ? 'border-white/60 bg-white/65' : 'border-white/30 bg-white/35'">
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm" :class="sound.enabled ? 'bg-mist-900 text-white' : 'bg-white/75 text-mist-800'">{{ sound.icon }}</div>
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-base font-semibold text-mist-900">{{ sound.name }}</h3>
            <span class="rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.14em]" :class="sound.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-mist-100 text-mist-600'">{{ statusLabel }}</span>
          </div>
          <p class="mt-1 text-xs text-mist-600">{{ sound.kind === 'long' ? 'Ciclo con transición suave' : 'Llamadas naturales aleatorias' }}</p>
        </div>
      </div>
      <button type="button" role="switch" :aria-checked="sound.enabled" :aria-label="`${sound.enabled ? 'Desactivar' : 'Activar'} ${sound.name}`" class="relative h-8 w-14 shrink-0 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mist-900" :class="sound.enabled ? 'bg-mist-900' : 'bg-white/80'" @click="$emit('toggle')">
        <span class="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition" :class="sound.enabled ? 'left-7' : 'left-1'"></span>
      </button>
    </div>

    <div class="pt-4">
      <RangeSlider label="Volumen máximo" :model-value="sound.volume" :min="0" :max="1" :step="0.01" :value-label="Math.round(sound.volume * 100) + '%'" @update:model-value="(value) => $emit('set-volume', value)" />
      <details class="mt-3 rounded-xl bg-mist-100/60 px-3 py-2 text-sm text-mist-700">
        <summary class="cursor-pointer select-none font-medium">{{ delayLabel }} · {{ sound.delay.toFixed(1) }}s</summary>
        <p class="mt-2 text-xs text-mist-600">{{ delayHelp }}</p>
        <div class="mt-3"><RangeSlider :label="delayLabel" :model-value="sound.delay" :min="0" :max="12" :step="0.1" :value-label="sound.delay.toFixed(1) + 's'" @update:model-value="(value) => $emit('set-delay', value)" /></div>
      </details>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import RangeSlider from '@/components/RangeSlider.vue'
import type { SoundState } from '@/types/sound'

const props = defineProps<{ sound: SoundState }>()
const statusLabel = computed(() => !props.sound.enabled ? 'Desactivado' : props.sound.status === 'waiting' ? 'En pausa' : 'Reproduciendo')
const delayLabel = computed(() => props.sound.kind === 'long' ? 'Pausa entre ciclos' : 'Intervalo máximo')
const delayHelp = computed(() => props.sound.kind === 'long' ? 'Espera fija después de cada reproducción.' : 'Espera aleatoria de hasta el valor indicado.')

defineEmits<{
  (event: 'toggle'): void
  (event: 'set-volume', value: number): void
  (event: 'set-delay', value: number): void
}>()
</script>
