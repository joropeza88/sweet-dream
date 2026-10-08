import type { SoundDefinition, SoundPlaybackStatus, SoundState } from '@/types/sound'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const STOP_FADE_SECONDS = 0.2

type AudioGraph = {
  source: MediaElementAudioSourceNode
  userGain: GainNode
  envelopeGain: GainNode
}

type PendingWait = {
  timeout: number
  resolve: () => void
}

class AudioManager {
  private elements = new Map<string, HTMLAudioElement>()
  private definitions = new Map<string, SoundDefinition>()
  private playback = new Map<string, SoundState>()
  private graphs = new Map<string, AudioGraph>()
  private generations = new Map<string, number>()
  private waitTimers = new Map<string, PendingWait>()
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private compressor: DynamicsCompressorNode | null = null
  private unlocked = false
  private activeIds = new Set<string>()
  private activityListener?: (soundId: string, status: SoundPlaybackStatus) => void
  private preloadPromise: Promise<void> | null = null

  registerSounds(definitions: SoundDefinition[]) {
    definitions.forEach((definition) => {
      this.definitions.set(definition.id, definition)
      if (this.elements.has(definition.id)) return

      const element = new Audio(definition.audioSrc)
      element.loop = false
      element.volume = 1
      element.preload = 'metadata'
      element.playsInline = true
      element.addEventListener('playing', () => this.syncMediaSession())
      element.addEventListener('pause', () => this.syncMediaSession())
      this.elements.set(definition.id, element)
      this.generations.set(definition.id, 0)
    })
    this.syncMediaSession()
  }

  setActivityListener(listener: (soundId: string, status: SoundPlaybackStatus) => void) {
    this.activityListener = listener
  }

  async unlock() {
    this.connectAudioGraph()
    const resumePromise = this.resumeAudioContext()
    const attempts = Array.from(this.elements.values()).map(async (element) => {
      try {
        element.muted = true
        element.currentTime = 0
        await element.play()
        element.pause()
        element.currentTime = 0
      } catch {
        // El siguiente toque para activar una pista volverá a intentarlo.
      } finally {
        element.muted = false
      }
    })
    await Promise.allSettled([...attempts, resumePromise])
    this.unlocked = true
  }

  async updatePlayback(sound: SoundState) {
    this.playback.set(sound.id, { ...sound })
    this.setUserVolume(sound.id, sound.volume)
    this.invalidate(sound.id)

    if (!sound.enabled) {
      this.stop(sound.id)
      return
    }

    this.activeIds.add(sound.id)
    const generation = this.currentGeneration(sound.id)
    await this.resumeAudioContext()
    void this.runCycle(sound.id, generation)
    this.syncMediaSession()
  }

  updateVolume(soundId: string, volume: number) {
    const state = this.playback.get(soundId)
    if (state) state.volume = clamp(volume, 0, 1)
    this.setUserVolume(soundId, volume)
  }

  updateDelay(soundId: string, delay: number) {
    const state = this.playback.get(soundId)
    if (state) state.delay = Math.max(0, delay)
  }

  setMasterVolume(volume: number) {
    const next = clamp(volume, 0, 1)
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.setTargetAtTime(next, this.audioContext.currentTime, 0.02)
    }
  }

  stop(soundId: string) {
    this.invalidate(soundId)
    this.activeIds.delete(soundId)
    const element = this.elements.get(soundId)
    const graph = this.graphs.get(soundId)
    const context = this.audioContext
    if (graph && context) {
      graph.envelopeGain.gain.cancelScheduledValues(context.currentTime)
      graph.envelopeGain.gain.setValueAtTime(graph.envelopeGain.gain.value, context.currentTime)
      graph.envelopeGain.gain.linearRampToValueAtTime(0, context.currentTime + STOP_FADE_SECONDS)
      window.setTimeout(() => {
        if (!this.activeIds.has(soundId)) {
          element?.pause()
          if (element) element.currentTime = 0
        }
      }, STOP_FADE_SECONDS * 1000)
    } else if (element) {
      element.pause()
      element.currentTime = 0
    }
    this.activityListener?.(soundId, 'idle')
    this.syncMediaSession()
  }

  stopAll() {
    Array.from(this.elements.keys()).forEach((soundId) => this.stop(soundId))
  }

  get unlockedByUser() {
    return this.unlocked
  }

  dispose() {
    this.stopAll()
    this.graphs.forEach(({ source, userGain, envelopeGain }) => {
      source.disconnect()
      userGain.disconnect()
      envelopeGain.disconnect()
    })
    this.elements.forEach((element) => { element.src = '' })
    this.elements.clear()
    this.graphs.clear()
    this.definitions.clear()
    this.playback.clear()
  }

  preloadAll(onProgress?: (loaded: number, total: number) => void) {
    if (this.preloadPromise) return this.preloadPromise
    const entries = Array.from(this.elements.entries())
    let loaded = 0
    const markLoaded = () => onProgress?.(++loaded, entries.length)
    this.preloadPromise = Promise.allSettled(entries.map(([id, element]) => this.preloadElement(id, element, markLoaded)))
      .then(() => undefined)
    return this.preloadPromise
  }

  private async runCycle(soundId: string, generation: number) {
    const state = this.playback.get(soundId)
    if (!state || !this.isCurrent(soundId, generation)) return
    if (state.kind === 'long') await this.runLongCycle(soundId, generation)
    else await this.runShortCycle(soundId, generation)
  }

  private async runLongCycle(soundId: string, generation: number) {
    while (this.isCurrent(soundId, generation)) {
      const state = this.playback.get(soundId)
      const element = this.elements.get(soundId)
      if (!state || !element) return
      this.activityListener?.(soundId, 'playing')
      if (!(await this.playLongClip(soundId, generation))) return
      if (!this.isCurrent(soundId, generation)) return
      this.activityListener?.(soundId, 'waiting')
      if (!(await this.wait(soundId, generation, state.delay * 1000))) return
    }
  }

  private async runShortCycle(soundId: string, generation: number) {
    while (this.isCurrent(soundId, generation)) {
      const state = this.playback.get(soundId)
      if (!state) return
      this.activityListener?.(soundId, 'playing')
      if (!(await this.playShortClip(soundId, generation))) return
      if (!this.isCurrent(soundId, generation)) return
      this.activityListener?.(soundId, 'waiting')
      const delay = state.delay > 0 ? (0.25 + Math.random() * 0.75) * state.delay * 1000 : 0
      if (!(await this.wait(soundId, generation, delay))) return
    }
  }

  private async playLongClip(soundId: string, generation: number) {
    const element = this.elements.get(soundId)
    const state = this.playback.get(soundId)
    if (!element || !state) return false
    element.pause()
    element.currentTime = 0
    this.setEnvelope(soundId, 0)
    try { await element.play() } catch { return false }
    if (!this.isCurrent(soundId, generation)) return false
    const duration = await this.durationOf(element, soundId, generation)
    if (!this.isCurrent(soundId, generation)) return false
    const fade = Math.min(state.fadeDuration, duration / 2)
    this.scheduleLongEnvelope(soundId, duration, fade)
    return this.waitForEnd(soundId, generation, element)
  }

  private async playShortClip(soundId: string, generation: number) {
    const element = this.elements.get(soundId)
    if (!element) return false
    element.pause()
    element.currentTime = 0
    const relativeGain = this.randomDistanceGain()
    this.scheduleShortEnvelope(soundId, relativeGain)
    try { await element.play() } catch { return false }
    const duration = await this.durationOf(element, soundId, generation)
    if (!this.isCurrent(soundId, generation)) return false
    this.scheduleShortFadeOut(soundId, duration, element.currentTime)
    return this.waitForEnd(soundId, generation, element)
  }

  private randomDistanceGain() {
    const chance = Math.random()
    if (chance < 0.4) return 0.15 + Math.random() * 0.2
    if (chance < 0.8) return 0.35 + Math.random() * 0.35
    return 0.7 + Math.random() * 0.3
  }

  private scheduleLongEnvelope(soundId: string, duration: number, fade: number) {
    const graph = this.graphs.get(soundId)
    const context = this.audioContext
    if (!graph || !context) return
    const now = context.currentTime
    const gain = graph.envelopeGain.gain
    gain.cancelScheduledValues(now)
    gain.setValueAtTime(0, now)
    gain.linearRampToValueAtTime(1, now + fade)
    gain.setValueAtTime(1, now + Math.max(fade, duration - fade))
    gain.linearRampToValueAtTime(0, now + duration)
  }

  private scheduleShortEnvelope(soundId: string, relativeGain: number) {
    const graph = this.graphs.get(soundId)
    const context = this.audioContext
    if (!graph || !context) return
    const now = context.currentTime
    const gain = graph.envelopeGain.gain
    gain.cancelScheduledValues(now)
    gain.setValueAtTime(0, now)
    gain.linearRampToValueAtTime(relativeGain, now + 0.03)
  }

  private scheduleShortFadeOut(soundId: string, duration: number, elapsed: number) {
    const graph = this.graphs.get(soundId)
    const context = this.audioContext
    if (!graph || !context || !duration) return
    const now = context.currentTime
    const remaining = Math.max(0, duration - elapsed)
    const fade = Math.min(0.03, remaining / 2)
    const gain = graph.envelopeGain.gain
    gain.setValueAtTime(gain.value, now)
    gain.setValueAtTime(gain.value, now + Math.max(0, remaining - fade))
    gain.linearRampToValueAtTime(0, now + remaining)
  }

  private setUserVolume(soundId: string, volume: number) {
    const next = clamp(volume, 0, 1)
    const graph = this.graphs.get(soundId)
    if (graph && this.audioContext) {
      graph.userGain.gain.setTargetAtTime(next, this.audioContext.currentTime, 0.02)
      return
    }
    const element = this.elements.get(soundId)
    if (element) element.volume = next
  }

  private setEnvelope(soundId: string, value: number) {
    const graph = this.graphs.get(soundId)
    if (graph && this.audioContext) graph.envelopeGain.gain.setValueAtTime(value, this.audioContext.currentTime)
  }

  private connectAudioGraph() {
    const context = this.getOrCreateAudioContext()
    if (!context || !this.masterGain || !this.compressor) return
    this.elements.forEach((element, soundId) => {
      if (this.graphs.has(soundId)) return
      const source = context.createMediaElementSource(element)
      const userGain = context.createGain()
      const envelopeGain = context.createGain()
      source.connect(userGain)
      userGain.connect(envelopeGain)
      envelopeGain.connect(this.compressor)
      this.graphs.set(soundId, { source, userGain, envelopeGain })
      this.setUserVolume(soundId, this.playback.get(soundId)?.volume ?? this.definitions.get(soundId)?.defaultVolume ?? 1)
      this.setEnvelope(soundId, 0)
    })
  }

  private getOrCreateAudioContext() {
    if (this.audioContext) return this.audioContext
    if (typeof window === 'undefined' || !('AudioContext' in window)) return null
    const context = new window.AudioContext()
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -18
    compressor.knee.value = 12
    compressor.ratio.value = 4
    const masterGain = context.createGain()
    compressor.connect(masterGain)
    masterGain.connect(context.destination)
    this.audioContext = context
    this.compressor = compressor
    this.masterGain = masterGain
    return context
  }

  private async resumeAudioContext() {
    const context = this.audioContext
    if (!context || context.state === 'running') return
    try { await context.resume() } catch { /* Safari may require another gesture. */ }
  }

  private durationOf(element: HTMLAudioElement, soundId: string, generation: number) {
    if (Number.isFinite(element.duration) && element.duration > 0) return Promise.resolve(element.duration)
    return new Promise<number>((resolve) => {
      const finish = () => {
        element.removeEventListener('loadedmetadata', finish)
        resolve(Number.isFinite(element.duration) && element.duration > 0 ? element.duration : 0)
      }
      element.addEventListener('loadedmetadata', finish, { once: true })
      if (!this.isCurrent(soundId, generation)) finish()
    })
  }

  private waitForEnd(soundId: string, generation: number, element: HTMLAudioElement) {
    return new Promise<boolean>((resolve) => {
      const finish = () => {
        element.removeEventListener('ended', finish)
        element.removeEventListener('pause', finish)
        resolve(this.isCurrent(soundId, generation))
      }
      element.addEventListener('ended', finish, { once: true })
      element.addEventListener('pause', finish, { once: true })
    })
  }

  private wait(soundId: string, generation: number, milliseconds: number) {
    return new Promise<boolean>((resolve) => {
      const finish = () => resolve(this.isCurrent(soundId, generation))
      const timeout = window.setTimeout(() => {
        this.waitTimers.delete(soundId)
        finish()
      }, milliseconds)
      this.waitTimers.set(soundId, { timeout, resolve: finish })
    })
  }

  private invalidate(soundId: string) {
    this.generations.set(soundId, this.currentGeneration(soundId) + 1)
    const pendingWait = this.waitTimers.get(soundId)
    if (pendingWait) {
      window.clearTimeout(pendingWait.timeout)
      this.waitTimers.delete(soundId)
      pendingWait.resolve()
    }
  }

  private currentGeneration(soundId: string) { return this.generations.get(soundId) ?? 0 }
  private isCurrent(soundId: string, generation: number) {
    return this.activeIds.has(soundId) && this.currentGeneration(soundId) === generation
  }

  private preloadElement(soundId: string, element: HTMLAudioElement, onLoaded: () => void) {
    return new Promise<void>((resolve) => {
      let done = false
      const finish = () => {
        if (done) return
        done = true
        window.clearTimeout(timeout)
        element.removeEventListener('canplaythrough', finish)
        element.removeEventListener('loadeddata', finish)
        element.removeEventListener('error', finish)
        onLoaded()
        resolve()
      }
      const timeout = window.setTimeout(finish, 8000)
      element.preload = 'auto'
      element.load()
      if (element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) finish()
      else {
        element.addEventListener('canplaythrough', finish, { once: true })
        element.addEventListener('loadeddata', finish, { once: true })
        element.addEventListener('error', () => { console.warn(`No se pudo precargar el sonido "${soundId}"`); finish() }, { once: true })
      }
    })
  }

  private syncMediaSession() {
    if (!('mediaSession' in navigator)) return
    const names = Array.from(this.activeIds).map((id) => this.definitions.get(id)?.name).filter(Boolean)
    navigator.mediaSession.metadata = new MediaMetadata({
      title: names.length ? 'Sweet Dream en reproducción' : 'Sweet Dream',
      artist: names.length ? names.join(' • ') : 'Sonidos ambientales',
      album: 'Relax mix',
      artwork: [{ src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' }],
    })
    navigator.mediaSession.playbackState = names.length ? 'playing' : 'paused'
    navigator.mediaSession.setActionHandler('pause', () => this.stopAll())
  }
}

export const audioManager = new AudioManager()
