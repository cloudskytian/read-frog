export interface PlatformConfig {
  selectors: {
    video: string
    playerContainer: string
    controlsBar: string
    nativeSubtitles: string
  }

  navigation: {
    event?: string
    getVideoId?: () => string | null
  }
}

export interface SubtitlesFragment {
  text: string
  start: number
  end: number
  translation?: string
}

export interface StateData {
  state: SubtitlesStateType
  message?: string
}

export type SubtitlesStateType
  = | 'idle'
    | 'fetching'
    | 'fetchSuccess'
    | 'fetchFailed'
    | 'processing'
    | 'completed'
    | 'error'
