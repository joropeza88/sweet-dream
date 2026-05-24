import type { SoundDefinition, SoundState } from '@/types/sound'

class AudioManager {
  private elements = new Map<string, HTMLAudioElement>()
  private pendingTimers = new Map<string, number>()
  private registered = new Map<string, SoundDefinition>()
  private unlocked = false
  private activeIds = new Set<string>()
  private activityListener?: (soundId: string, event: 'playing' | 'paused' | 'pending') => void

  registerSounds(definitions: SoundDefinition[]) {
    definitions.forEach((definition) => {
      this.registered.set(definition.id, definition)

      if (this.elements.has(definition.id)) {
        return
      }

      const element = new Audio(definition.audioSrc)
      element.loop = definition.loop
      element.volume = definition.defaultVolume
      element.preload = 'metadata'
      element.playsInline = true
      element.addEventListener('playing', () => {
        this.activityListener?.(definition.id, 'playing')
        this.syncMediaSession()
      })
      element.addEventListener('pause', () => {
        this.activityListener?.(definition.id, 'paused')
        this.syncMediaSession()
      })
      this.elements.set(definition.id, element)
    })

    this.syncMediaSession()
  }

  setActivityListener(listener: (soundId: string, event: 'playing' | 'paused' | 'pending') => void) {
    this.activityListener = listener
  }

  async unlock() {
    const attempts = Array.from(this.elements.values()).map(async (element) => {
      try {
        element.muted = true
        element.currentTime = 0
        await element.play()
        element.pause()
        element.currentTime = 0
      } catch {
        return
      } finally {
        element.muted = false
      }
    })

    await Promise.allSettled(attempts)
    this.unlocked = true
  }

  async updatePlayback(sound: SoundState) {
    const element = this.elements.get(sound.id)

    if (!element) {
      return
    }

    element.loop = sound.loop
    element.volume = sound.volume

    if (!sound.enabled) {
      this.stop(sound.id)
      return
    }

    this.cancelTimer(sound.id)
    this.activeIds.add(sound.id)
    element.load()

    if (sound.delay > 0) {
      this.activityListener?.(sound.id, 'pending')
      const timer = window.setTimeout(() => {
        void this.playElement(sound.id)
      }, sound.delay * 1000)

      this.pendingTimers.set(sound.id, timer)
      this.syncMediaSession()
      return
    }

    await this.playElement(sound.id)
  }

  updateVolume(soundId: string, volume: number) {
    const element = this.elements.get(soundId)

    if (element) {
      element.volume = volume
    }
  }

  stop(soundId: string) {
    this.cancelTimer(soundId)

    const element = this.elements.get(soundId)
    if (element) {
      element.pause()
      element.currentTime = 0
    }

    this.activeIds.delete(soundId)
    this.syncMediaSession()
  }

  stopAll() {
    Array.from(this.registered.keys()).forEach((soundId) => this.stop(soundId))
  }

  get unlockedByUser() {
    return this.unlocked
  }

  dispose() {
    this.stopAll()
    this.elements.forEach((element) => {
      element.src = ''
    })
    this.elements.clear()
    this.registered.clear()
  }

  private async playElement(soundId: string) {
    const element = this.elements.get(soundId)

    if (!element) {
      return
    }

    this.cancelTimer(soundId)
    this.activeIds.add(soundId)

    try {
      await element.play()
    } catch {
      this.activeIds.delete(soundId)
      this.activityListener?.(soundId, 'paused')
    }

    this.syncMediaSession()
  }

  private cancelTimer(soundId: string) {
    const timer = this.pendingTimers.get(soundId)
    if (timer) {
      window.clearTimeout(timer)
      this.pendingTimers.delete(soundId)
    }
  }

  private syncMediaSession() {
    if (!('mediaSession' in navigator)) {
      return
    }

    const activeSoundIds = Array.from(this.activeIds)
    const activeSounds = activeSoundIds
      .map((id) => this.registered.get(id)?.name)
      .filter((value): value is string => Boolean(value))
    const isActuallyPlaying = activeSoundIds.some((id) => {
      const element = this.elements.get(id)
      return element ? !element.paused : false
    })

    navigator.mediaSession.metadata = new MediaMetadata({
      title: activeSounds.length ? 'Sweet Dream en reproducción' : 'Sweet Dream',
      artist: activeSounds.length ? activeSounds.join(' • ') : 'Sonidos ambientales',
      album: 'Relax mix',
      artwork: [
        { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
      ],
    })

    navigator.mediaSession.playbackState = isActuallyPlaying ? 'playing' : 'paused'
    navigator.mediaSession.setActionHandler('play', async () => {
      const elements = Array.from(this.activeIds)
        .map((soundId) => this.elements.get(soundId))
        .filter((value): value is HTMLAudioElement => Boolean(value))

      await Promise.all(elements.map((element) => element.play()))
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      this.activeIds.forEach((soundId) => {
        const element = this.elements.get(soundId)
        element?.pause()
      })
    })
  }
}

export const audioManager = new AudioManager()
