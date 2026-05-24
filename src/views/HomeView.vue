<template>
  <section class="flex flex-1 flex-col">
    <AppHeader
      :active-count="activeCount"
      :total-volume-label="totalVolumeLabel"
      @stop-all="store.stopAll"
    />

    <button
      type="button"
      class="mb-5 rounded-[24px] border border-white/40 bg-white/45 px-5 py-4 text-left shadow-card backdrop-blur-xl transition hover:bg-white/55"
      @click="ensureUnlocked"
    >
      <p class="text-xs uppercase tracking-[0.24em] text-mist-600">Compatibilidad iOS / Android</p>
      <p class="mt-2 text-sm text-mist-800">{{ unlockLabel }}</p>
      <p class="mt-1 text-xs text-mist-600">
        La primera interacción desbloquea la reproducción persistente en PWA y Safari.
      </p>
    </button>

    <div class="mb-5 grid grid-cols-2 gap-3">
      <div class="rounded-[24px] border border-white/35 bg-white/35 p-4 shadow-card backdrop-blur-xl">
        <p class="text-xs uppercase tracking-[0.24em] text-mist-600">Pendientes</p>
        <p class="mt-2 text-xl font-semibold text-mist-900">{{ pendingCount }}</p>
      </div>
      <div class="rounded-[24px] border border-white/35 bg-white/35 p-4 shadow-card backdrop-blur-xl">
        <p class="text-xs uppercase tracking-[0.24em] text-mist-600">Modo</p>
        <p class="mt-2 text-xl font-semibold text-mist-900">Loop</p>
      </div>
    </div>

    <div class="space-y-4">
      <SoundCard
        v-for="sound in sounds"
        :key="sound.id"
        :sound="sound"
        @toggle="store.toggleSound(sound.id)"
        @set-volume="(value) => store.setVolume(sound.id, value)"
        @set-delay="(value) => store.setDelay(sound.id, value)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import AppHeader from '@/components/AppHeader.vue'
import SoundCard from '@/components/SoundCard.vue'
import { useAudioUnlock } from '@/composables/useAudioUnlock'
import { useSoundscapeStore } from '@/stores/soundscape'

const store = useSoundscapeStore()
const { sounds, activeCount, pendingCount, totalVolume } = storeToRefs(store)
const { unlockLabel, ensureUnlocked } = useAudioUnlock()

const totalVolumeLabel = computed(() => `${Math.round(totalVolume.value * 100)}%`)
</script>
