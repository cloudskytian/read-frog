export interface YoutubeCaptionTrack {
  languageCode: string
  baseUrl: string
  vssId?: string
  kind?: string
  name?: {
    simpleText: string
  }
  isTranslatable?: boolean
}

export interface YoutubeTimedText {
  tStartMs: number
  dDurationMs: number
  aAppend: number
  segs: {
    utf8: string
    tOffsetMs: number
  }[]
}

export interface YoutubeSubtitleResponse {
  events: YoutubeTimedText[]
}

export interface YoutubeSubtitle {
  start: number
  end: number
  text: string
  translation?: string
}
