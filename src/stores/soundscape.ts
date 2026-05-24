import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { soundDefinitions } from '@/data/sounds'
import { audioManager } from '@/services/audio/AudioManager'
import type { SoundState } from '@/types/sound'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const useSoundscapeStore = defineStore('soundscape', () => {
  const sounds = ref<SoundState[]>(
    soundDefinitions.map((sound) => ({
      ...sound,
      enabled: false,
      volume: sound.defaultVolume,
      delay: sound.defaultDelay,
      isPending: false,
    })),
  )

  const unlockRequested = ref(false)

  audioManager.registerSounds(soundDefinitions)
  audioManager.setActivityListener((soundId, event) => {
    const sound = findSound(soundId)

    if (!sound) {
      return
    }

    if (event === 'pending') {
      sound.isPending = true
      return
    }

    if (event === 'playing') {
      sound.isPending = false
      return
    }

    if (!sound.enabled) {
      sound.isPending = false
    }
  })

  const activeCount = computed(() => sounds.value.filter((sound) => sound.enabled).length)
  const pendingCount = computed(() => sounds.value.filter((sound) => sound.isPending).length)
  const totalVolume = computed(() =>
    sounds.value
      .filter((sound) => sound.enabled)
      .reduce((accumulator, sound) => accumulator + sound.volume, 0),
  )

  const findSound = (soundId: string) => sounds.value.find((sound) => sound.id === soundId)

  const ensureUnlocked = async () => {
    if (audioManager.unlockedByUser) {
      unlockRequested.value = true
      return true
    }

    try {
      await audioManager.unlock()
      unlockRequested.value = true
      return true
    } catch {
      return false
    }
  }

  const updateSound = async (soundId: string) => {
    const sound = findSound(soundId)

    if (!sound) {
      return
    }

    sound.isPending = sound.enabled && sound.delay > 0
    await audioManager.updatePlayback(sound)
  }

  const toggleSound = async (soundId: string, forceValue?: boolean) => {
    const sound = findSound(soundId)

    if (!sound) {
      return
    }

    const nextValue = forceValue ?? !sound.enabled
    if (nextValue && !unlockRequested.value) {
      const unlocked = await ensureUnlocked()
      if (!unlocked) {
        return
      }
    }

    sound.enabled = nextValue
    sound.isPending = nextValue && sound.delay > 0
    await updateSound(soundId)
  }

  const setVolume = (soundId: string, volume: number) => {
    const sound = findSound(soundId)

    if (!sound) {
      return
    }

    sound.volume = clamp(volume, 0, 1)
    audioManager.updateVolume(soundId, sound.volume)
  }

  const setDelay = async (soundId: string, delay: number) => {
    const sound = findSound(soundId)

    if (!sound) {
      return
    }

    sound.delay = clamp(delay, 0, 12)

    if (sound.enabled) {
      sound.isPending = sound.delay > 0
      await updateSound(soundId)
    }
  }

  const stopAll = () => {
    sounds.value.forEach((sound) => {
      sound.enabled = false
      sound.isPending = false
    })
    audioManager.stopAll()
  }

  return {
    sounds,
    activeCount,
    pendingCount,
    totalVolume,
    unlockRequested,
    ensureUnlocked,
    toggleSound,
    setVolume,
    setDelay,
    stopAll,
  }
})
