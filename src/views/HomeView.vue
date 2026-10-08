<template>
  <section class="flex flex-1 flex-col">
    <AppHeader
      :active-count="activeCount"
      :master-volume="masterVolume"
      :master-volume-label="masterVolumeLabel"
      @stop-all="store.stopAll"
      @set-master-volume="store.setMasterVolume"
    />

    <p v-if="!unlockRequested" class="mb-5 px-1 text-xs leading-5 text-mist-600">
      Al activar un sonido, Safari y Android usarán ese primer toque para habilitar el audio.
    </p>

    <section class="space-y-3">
      <h2 class="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-mist-600">Ambientes</h2>
      <SoundCard v-for="sound in ambientSounds" :key="sound.id" :sound="sound" @toggle="store.toggleSound(sound.id)" @set-volume="(value) => store.setVolume(sound.id, value)" @set-delay="(value) => store.setDelay(sound.id, value)" />
    </section>

    <section class="mt-6 space-y-3">
      <h2 class="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-mist-600">Fauna y clima</h2>
      <SoundCard v-for="sound in faunaSounds" :key="sound.id" :sound="sound" @toggle="store.toggleSound(sound.id)" @set-volume="(value) => store.setVolume(sound.id, value)" @set-delay="(value) => store.setDelay(sound.id, value)" />
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import AppHeader from '@/components/AppHeader.vue'
import SoundCard from '@/components/SoundCard.vue'
import { useSoundscapeStore } from '@/stores/soundscape'

const store = useSoundscapeStore()
const { sounds, activeCount, masterVolume, unlockRequested } = storeToRefs(store)
const masterVolumeLabel = computed(() => `${Math.round(masterVolume.value * 100)}%`)
const ambientSounds = computed(() => sounds.value.filter((sound) => sound.kind === 'long'))
const faunaSounds = computed(() => sounds.value.filter((sound) => sound.kind === 'short'))
</script>
