export type SubtitleState
  = | 'idle'
    | 'fetching'
    | 'fetch_success'
    | 'fetch_failed'
    | 'processing'
    | 'completed'
    | 'error'

export interface StateData {
  state: SubtitleState
  message?: string
  progress?: number
  error?: Error
  timestamp: number
}

export interface Subtitle {
  text: string
  start: number
  end: number
  translation?: string
}
