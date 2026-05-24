<template>
  <header class="mb-6 rounded-[28px] border border-white/35 bg-white/35 px-5 py-5 shadow-glow backdrop-blur-xl">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="font-display text-3xl leading-none text-mist-900">Sweet Dream</p>
        <p class="mt-2 max-w-56 text-sm text-mist-700">
          Mezcla paisajes sonoros suaves y deja el iPhone o Android reproduciendo en segundo plano.
        </p>
      </div>

      <button
        type="button"
        class="rounded-full border border-mist-300/80 bg-white/70 px-4 py-2 text-sm font-medium text-mist-800 transition hover:bg-white"
        @click="$emit('stop-all')"
      >
        Detener todo
      </button>
    </div>

    <div class="mt-5 flex items-center justify-between rounded-2xl bg-mist-900/90 px-4 py-3 text-white">
      <div>
        <p class="text-xs uppercase tracking-[0.24em] text-white/60">Activos</p>
        <p class="mt-1 text-2xl font-semibold">{{ activeCount }}</p>
      </div>
      <div class="text-right">
        <p class="text-xs uppercase tracking-[0.24em] text-white/60">Volumen total</p>
        <p class="mt-1 text-lg font-medium">{{ totalVolumeLabel }}</p>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  activeCount: number
  totalVolumeLabel: string
}>()

defineEmits<{
  (event: 'stop-all'): void
}>()
</script>
