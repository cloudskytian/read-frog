import { YoutubeAdapter } from './youtube'

const SUBTITLE_MANAGER_MAP = {
  youtube: YoutubeAdapter,
}

export function registerSubtitlesManager() {
  if (!window.location.hostname.includes('youtube.com')) {
    return
  }

  const SubtitleManager = SUBTITLE_MANAGER_MAP.youtube
  const subtitleManager = new SubtitleManager()
  subtitleManager.initialize()
}
