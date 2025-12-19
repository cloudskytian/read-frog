import { defineContentScript } from '#imports'
import { getLocalConfig } from '@/utils/config/storage'
import { setupYoutubeSubtitles } from './platforms/youtube'
import { youtubeConfig } from './platforms/youtube/config'
import { mountSubtitlesUI } from './renderer/mount-subtitles-ui'

declare global {
  interface Window {
    __READ_FROG_SUBTITLES_INJECTED__?: boolean
  }
}

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  cssInjectionMode: 'manifest',
  async main() {
    if (window.__READ_FROG_SUBTITLES_INJECTED__)
      return
    window.__READ_FROG_SUBTITLES_INJECTED__ = true

    if (!window.location.href.includes('youtube.com/watch')) {
      return
    }

    const config = await getLocalConfig()
    if (!config?.betaExperience.enabled || !config?.translate.videoSubtitles?.enabled) {
      return
    }

    setupYoutubeSubtitles()

    void mountSubtitlesUI(youtubeConfig.selectors.playerContainer)
  },
})
