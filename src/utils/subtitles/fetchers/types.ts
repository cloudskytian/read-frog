import type { SubtitlesFragment } from '@/utils/subtitles/types'

export interface SubtitlesFetcher {
  initialize: () => void
  fetch: () => Promise<SubtitlesFragment[]>
  cleanup: () => void
  getSourceLanguage: () => string
  getKind: () => string
}
