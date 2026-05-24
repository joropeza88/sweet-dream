<template>
  <AppLayout>
    <transition name="app-fade" mode="out-in">
      <section
        v-if="isPreloading"
        key="loading"
        class="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      >
        <div class="w-full max-w-sm rounded-[32px] border border-white/45 bg-white/55 p-8 shadow-card backdrop-blur-2xl">
          <p class="text-xs uppercase tracking-[0.28em] text-mist-600">Sweet Dream</p>
          <h1 class="mt-4 font-serif text-4xl text-mist-900">Cargando paisajes sonoros</h1>
          <p class="mt-3 text-sm leading-6 text-mist-700">
            Precargando audio para una reproducción más fluida al empezar.
          </p>

          <div class="mt-8">
            <div class="h-3 overflow-hidden rounded-full bg-white/70">
              <div class="loading-bar h-full rounded-full" :style="{ width: `${progressPercentage}%` }"></div>
            </div>
            <p class="mt-3 text-xs uppercase tracking-[0.22em] text-mist-600">
              {{ preloadedCount }} / {{ totalSounds }} sonidos
            </p>
          </div>
        </div>
      </section>

      <HomeView v-else key="home" />
    </transition>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import AppLayout from '@/layouts/AppLayout.vue'
import HomeView from '@/views/HomeView.vue'
import { useSoundscapeStore } from '@/stores/soundscape'

const store = useSoundscapeStore()
const { isPreloading, preloadedCount, totalSounds, preloadProgress } = storeToRefs(store)

const progressPercentage = computed(() => Math.round(preloadProgress.value * 100))

onMounted(() => {
  void store.preloadResources()
})
</script>
