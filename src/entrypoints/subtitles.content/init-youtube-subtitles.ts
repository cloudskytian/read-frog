import { setupYoutubeSubtitles } from './platforms/youtube'
import { youtubeConfig } from './platforms/youtube/config'
import { mountSubtitlesUI } from './renderer/mount-subtitles-ui'

export function initYoutubeSubtitles() {
  let initialized = false

  const tryInit = () => {
    if (!window.location.href.includes('youtube.com/watch')) {
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

  window.addEventListener('yt-navigate-finish', tryInit)
}
