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
