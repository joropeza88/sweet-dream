import type { SoundDefinition, SoundState } from '@/types/sound'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

class AudioManager {
  private elements = new Map<string, HTMLAudioElement>()
  private gainNodes = new Map<string, GainNode>()
  private sourceNodes = new Map<string, MediaElementAudioSourceNode>()
  private pendingTimers = new Map<string, number>()
  private registered = new Map<string, SoundDefinition>()
  private audioContext: AudioContext | null = null
  private unlocked = false
  private activeIds = new Set<string>()
  private activityListener?: (soundId: string, event: 'playing' | 'paused' | 'pending') => void
  private preloadPromise: Promise<void> | null = null

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
      this.ensureAudioRouting(definition.id, element)
      this.applyVolume(definition.id, definition.defaultVolume)
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
    await this.resumeAudioContext()

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
    this.applyVolume(sound.id, sound.volume)

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
    this.applyVolume(soundId, volume)
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
    this.sourceNodes.forEach((source) => source.disconnect())
    this.gainNodes.forEach((gain) => gain.disconnect())
    this.elements.forEach((element) => {
      element.src = ''
    })
    this.elements.clear()
    this.gainNodes.clear()
    this.sourceNodes.clear()
    this.registered.clear()
  }

  preloadAll(onProgress?: (loaded: number, total: number) => void) {
    if (this.preloadPromise) {
      return this.preloadPromise
    }

    const entries = Array.from(this.elements.entries())
    const total = entries.length
    let loaded = 0

    if (!total) {
      onProgress?.(0, 0)
      this.preloadPromise = Promise.resolve()
      return this.preloadPromise
    }

    const markLoaded = () => {
      loaded += 1
      onProgress?.(loaded, total)
    }

    this.preloadPromise = Promise.allSettled(
      entries.map(([soundId, element]) => this.preloadElement(soundId, element, markLoaded)),
    ).then(() => undefined)

    return this.preloadPromise
  }

  private async playElement(soundId: string) {
    const element = this.elements.get(soundId)

    if (!element) {
      return
    }

    this.cancelTimer(soundId)
    this.activeIds.add(soundId)

    try {
      await this.resumeAudioContext()
      await element.play()
    } catch {
      this.activeIds.delete(soundId)
      this.activityListener?.(soundId, 'paused')
    }

    this.syncMediaSession()
  }

  private ensureAudioRouting(soundId: string, element: HTMLAudioElement) {
    const context = this.getOrCreateAudioContext()

    if (!context || this.gainNodes.has(soundId)) {
      return
    }

    try {
      const source = context.createMediaElementSource(element)
      const gain = context.createGain()

      source.connect(gain)
      gain.connect(context.destination)

      this.sourceNodes.set(soundId, source)
      this.gainNodes.set(soundId, gain)
    } catch {
      this.sourceNodes.delete(soundId)
      this.gainNodes.delete(soundId)
    }
  }

  private applyVolume(soundId: string, volume: number) {
    const nextVolume = clamp(volume, 0, 1)
    const gain = this.gainNodes.get(soundId)

    if (gain) {
      gain.gain.value = nextVolume
      return
    }

    const element = this.elements.get(soundId)
    if (element) {
      element.volume = nextVolume
    }
  }

  private getOrCreateAudioContext() {
    if (this.audioContext) {
      return this.audioContext
    }

    if (typeof window === 'undefined' || !('AudioContext' in window)) {
      return null
    }

    this.audioContext = new window.AudioContext()
    return this.audioContext
  }

  private async resumeAudioContext() {
    const context = this.getOrCreateAudioContext()

    if (!context || context.state === 'running') {
      return
    }

    try {
      await context.resume()
    } catch {
      return
    }
  }

  private preloadElement(soundId: string, element: HTMLAudioElement, onLoaded: () => void) {
    return new Promise<void>((resolve) => {
      const finalize = () => {
        cleanup()
        onLoaded()
        resolve()
      }

      const cleanup = () => {
        window.clearTimeout(timeoutId)
        element.removeEventListener('canplaythrough', handleReady)
        element.removeEventListener('loadeddata', handleReady)
        element.removeEventListener('error', handleReady)
      }

      const handleReady = () => {
        finalize()
      }

      const timeoutId = window.setTimeout(() => {
        finalize()
      }, 8000)

      element.preload = 'auto'
      element.load()

      if (element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        finalize()
        return
      }

      element.addEventListener('canplaythrough', handleReady, { once: true })
      element.addEventListener('loadeddata', handleReady, { once: true })
      element.addEventListener('error', () => {
        console.warn(`No se pudo precargar el sonido "${soundId}"`)
        handleReady()
      }, { once: true })
    })
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
