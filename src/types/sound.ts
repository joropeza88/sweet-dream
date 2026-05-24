export interface SoundDefinition {
  id: string
  name: string
  icon: string
  audioSrc: string
  defaultVolume: number
  defaultDelay: number
  loop: boolean
  category?: string
}

export interface SoundState extends SoundDefinition {
  enabled: boolean
  volume: number
  delay: number
  isPending: boolean
}
