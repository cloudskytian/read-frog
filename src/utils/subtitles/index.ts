import { YoutubeAdapter } from './youtube'

type SubtitlePlatform = 'youtube'

const SUBTITLE_MANAGER_MAP = {
  youtube: YoutubeAdapter,
}

export function registerSubtitleManager(platform: SubtitlePlatform) {
  const SubtitleManager = SUBTITLE_MANAGER_MAP[platform]
  return new SubtitleManager()
}
