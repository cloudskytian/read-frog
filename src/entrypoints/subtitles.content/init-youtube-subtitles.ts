import { YOUTUBE_NAVIGATE_EVENT, YOUTUBE_WATCH_URL_PATTERN } from '@/utils/constants/subtitles'
import { setupYoutubeSubtitles } from './platforms/youtube'
import { youtubeConfig } from './platforms/youtube/config'
import { mountSubtitlesUI } from './renderer/mount-subtitles-ui'

export function initYoutubeSubtitles() {
  let initialized = false

  const tryInit = () => {
    if (!window.location.href.includes(YOUTUBE_WATCH_URL_PATTERN)) {
      return
    }
    if (initialized) {
      return
    }
    initialized = true
    setupYoutubeSubtitles()
    void mountSubtitlesUI(youtubeConfig.selectors.playerContainer)
  }

  tryInit()

  window.addEventListener(YOUTUBE_NAVIGATE_EVENT, tryInit)
}
