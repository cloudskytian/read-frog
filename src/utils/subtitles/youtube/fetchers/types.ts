import type { YoutubeSubtitle } from '../types'

export interface SubtitleFetcher {
  initialize: () => void
  fetch: (videoId: string) => Promise<YoutubeSubtitle[]>
  cleanup: () => void
  getSourceLanguage: () => string
}
