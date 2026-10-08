export type SoundKind = 'long' | 'short'
export type SoundPlaybackStatus = 'idle' | 'playing' | 'waiting'

export interface SoundDefinition {
  id: string
  name: string
  icon: string
  audioSrc: string
  defaultVolume: number
  defaultDelay: number
  kind: SoundKind
  fadeDuration: number
  category?: string
}

export interface SoundState extends SoundDefinition {
  enabled: boolean
  volume: number
  delay: number
  isPending: boolean
  status: SoundPlaybackStatus
}
