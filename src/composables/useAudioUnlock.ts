import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSoundscapeStore } from '@/stores/soundscape'

export const useAudioUnlock = () => {
  const store = useSoundscapeStore()
  const { unlockRequested } = storeToRefs(store)

  const unlockLabel = computed(() =>
    unlockRequested.value ? 'Audio listo para fondo y pantalla bloqueada' : 'Toca para habilitar audio en iPhone/Android',
  )

  return {
    unlockRequested,
    unlockLabel,
    ensureUnlocked: store.ensureUnlocked,
  }
}
