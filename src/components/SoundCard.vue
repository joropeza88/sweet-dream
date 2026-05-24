<template>
  <article
    class="group rounded-[28px] border px-5 py-5 shadow-card backdrop-blur-xl transition duration-300"
    :class="
      sound.enabled
        ? 'border-white/60 bg-white/65'
        : 'border-white/30 bg-white/35 hover:border-white/50 hover:bg-white/45'
    "
  >
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-center gap-4">
        <div
          class="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow-sm transition"
          :class="sound.enabled ? 'bg-mist-900 text-white' : 'bg-white/75 text-mist-800'"
        >
          <span class="animate-shimmer">{{ sound.icon }}</span>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-semibold text-mist-900">{{ sound.name }}</h2>
            <span
              class="rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em]"
              :class="
                sound.enabled
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-mist-100 text-mist-600'
              "
            >
              {{ sound.enabled ? (sound.isPending ? 'Delay' : 'Activo') : 'Off' }}
            </span>
          </div>
          <p class="mt-1 text-sm text-mist-600">
            {{ sound.category ?? 'ambiental' }}
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        :aria-checked="sound.enabled"
        class="relative h-8 w-14 rounded-full transition"
        :class="sound.enabled ? 'bg-mist-900' : 'bg-white/80'"
        @click="$emit('toggle')"
      >
        <span
          class="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition"
          :class="sound.enabled ? 'left-7' : 'left-1'"
        ></span>
      </button>
    </div>

    <div
      class="grid overflow-hidden transition-all duration-300"
      :class="sound.enabled ? 'mt-5 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-80'"
    >
      <div class="min-h-0 space-y-4">
        <RangeSlider
          label="Volumen"
          :model-value="sound.volume"
          :min="0"
          :max="1"
          :step="0.01"
          :value-label="Math.round(sound.volume * 100) + '%'"
          @update:model-value="(value) => $emit('set-volume', value)"
        />

        <RangeSlider
          label="Delay"
          :model-value="sound.delay"
          :min="0"
          :max="12"
          :step="0.1"
          :value-label="sound.delay.toFixed(1) + 's'"
          @update:model-value="(value) => $emit('set-delay', value)"
        />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import RangeSlider from '@/components/RangeSlider.vue'
import type { SoundState } from '@/types/sound'

defineProps<{
  sound: SoundState
}>()

defineEmits<{
  (event: 'toggle'): void
  (event: 'set-volume', value: number): void
  (event: 'set-delay', value: number): void
}>()
</script>
