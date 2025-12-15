import { XhrInterceptFetcher } from './fetchers'
import { SubtitlesProcessor } from './processor'
import { YoutubeAdapter } from './youtube'

const SUBTITLE_MANAGER_MAP = {
  youtube: YoutubeAdapter,
}

export function setupVideoSubtitles() {
  if (!window.location.hostname.includes('youtube.com')) {
    return
  }

  const SubtitleManager = SUBTITLE_MANAGER_MAP.youtube

  const subtitlesFetcher = new XhrInterceptFetcher()
  const subtitlesProcessor = new SubtitlesProcessor()

  const subtitleManager = new SubtitleManager({
    subtitlesFetcher,
    subtitlesProcessor,
  })

  subtitleManager.initialize()
}
