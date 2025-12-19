export interface YoutubeTimedTextSeg {
  utf8: string
  tOffsetMs?: number
  pPenId?: number
  acAsrConf?: number
}

export interface YoutubeTimedText {
  tStartMs: number
  dDurationMs: number
  aAppend?: number
  segs?: YoutubeTimedTextSeg[]
  wpWinPosId?: number
  wsWinStyleId?: number
  wWinId?: number
}

export interface YoutubeSubtitleResponse {
  events: YoutubeTimedText[]
  pens?: Array<{
    szPenSize?: number
    fcForeColor?: number
    foForeAlpha?: number
    [key: string]: unknown
  }>
}
