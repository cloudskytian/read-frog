export interface YoutubeCaptionTrack {
  languageCode: string
  baseUrl: string
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

export interface YoutubePlayerInfo {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: YoutubeCaptionTrack[]
    }
  }
  playabilityStatus?: {
    status: string
  }
  error?: {
    code: number
    message: string
  }
}

export interface YoutubePlayerRequestBody {
  context: {
    client: {
      clientName: string
      clientVersion: string
      hl: string
      gl: string
      visitorData?: string
    }
    user?: {
      onBehalfOfUser: string
    }
  }
  videoId: string
}

export type YoutubePlayerRequestHeader = {
  'Content-Type': string
  'X-YouTube-Client-Name': string
  'X-YouTube-Client-Version': string
  'X-Goog-AuthUser'?: string
  'X-Goog-PageId'?: string
} & Record<string, string>

export interface YoutubeSubtitle {
  start: number
  end: number
  text: string
}
