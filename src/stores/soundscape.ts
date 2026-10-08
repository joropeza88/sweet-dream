import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { soundDefinitions } from '@/data/sounds'
import { audioManager } from '@/services/audio/AudioManager'
import type { SoundState } from '@/types/sound'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const PREFERENCES_KEY = 'sweet-dream:preferences:v1'

type SavedPreferences = {
  masterVolume?: number
  sounds?: Record<string, Pick<SoundState, 'enabled' | 'volume' | 'delay'>>
}

const loadPreferences = (): SavedPreferences => {
  try {
    return JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}') as SavedPreferences
  } catch {
    return {}
  }
}

export const useSoundscapeStore = defineStore('soundscape', () => {
  const preferences = loadPreferences()
  const sounds = ref<SoundState[]>(
    soundDefinitions.map((sound) => ({
      ...sound,
      // Conservamos controles, pero no restauramos la reproducción: Safari
      // exige un gesto válido y un estado visual activo sin audio es confuso.
      enabled: false,
      volume: clamp(preferences.sounds?.[sound.id]?.volume ?? sound.defaultVolume, 0, 1),
      delay: clamp(preferences.sounds?.[sound.id]?.delay ?? sound.defaultDelay, 0, 12),
      isPending: false,
      status: 'idle',
    })),
  )

  const masterVolume = ref(clamp(preferences.masterVolume ?? 1, 0, 1))
  const unlockRequested = ref(false)
  const isPreloading = ref(true)
  const preloadedCount = ref(0)
  const totalSounds = ref(soundDefinitions.length)
  let preloadPromise: Promise<void> | null = null

  audioManager.registerSounds(soundDefinitions)
  audioManager.setActivityListener((soundId, status) => {
    const sound = findSound(soundId)

    if (!sound) {
      return
    }

    sound.status = status
    sound.isPending = status === 'waiting'
  })

  const activeCount = computed(() => sounds.value.filter((sound) => sound.enabled).length)
  const pendingCount = computed(() => sounds.value.filter((sound) => sound.isPending).length)
  const preloadProgress = computed(() =>
    totalSounds.value ? preloadedCount.value / totalSounds.value : 1,
  )

  const findSound = (soundId: string) => sounds.value.find((sound) => sound.id === soundId)

  const ensureUnlocked = async (soundId: string) => {
    if (audioManager.unlockedByUser) {
      unlockRequested.value = true
      return true
    }

    try {
      await audioManager.unlock(soundId)
      audioManager.setMasterVolume(masterVolume.value)
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

    sound.isPending = false
    await audioManager.updatePlayback(sound)
  }

  const toggleSound = async (soundId: string, forceValue?: boolean) => {
    const sound = findSound(soundId)

    if (!sound) {
      return
    }

    const nextValue = forceValue ?? !sound.enabled
    if (nextValue && !unlockRequested.value) {
      const unlocked = await ensureUnlocked(soundId)
      if (!unlocked) {
        return
      }
    }

    sound.enabled = nextValue
    sound.isPending = false
    sound.status = nextValue ? 'playing' : 'idle'
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
    audioManager.updateDelay(soundId, sound.delay)
  }

  const setMasterVolume = (volume: number) => {
    masterVolume.value = clamp(volume, 0, 1)
    audioManager.setMasterVolume(masterVolume.value)
  }

  const stopAll = () => {
    sounds.value.forEach((sound) => {
      sound.enabled = false
      sound.isPending = false
      sound.status = 'idle'
    })
    audioManager.stopAll()
  }

  const preloadResources = async () => {
    if (preloadPromise) {
      return preloadPromise
    }

    isPreloading.value = true
    preloadedCount.value = 0
    totalSounds.value = soundDefinitions.length

    preloadPromise = audioManager
      .preloadAll((loaded, total) => {
        preloadedCount.value = loaded
        totalSounds.value = total
      })
      .finally(() => {
        isPreloading.value = false
      })

    return preloadPromise
  }

  watch(
    [sounds, masterVolume],
    () => {
      const saved: SavedPreferences = {
        masterVolume: masterVolume.value,
        sounds: Object.fromEntries(sounds.value.map((sound) => [sound.id, {
          enabled: sound.enabled,
          volume: sound.volume,
          delay: sound.delay,
        }])),
      }
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(saved))
    },
    { deep: true },
  )

  return {
    sounds,
    activeCount,
    pendingCount,
    masterVolume,
    isPreloading,
    preloadedCount,
    totalSounds,
    preloadProgress,
    unlockRequested,
    ensureUnlocked,
    preloadResources,
    toggleSound,
    setVolume,
    setMasterVolume,
    setDelay,
    stopAll,
  }
})
