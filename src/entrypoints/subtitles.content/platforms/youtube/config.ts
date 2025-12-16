import type { PlatformConfig } from '../../types'

export const youtubeConfig: PlatformConfig = {
  selectors: {
    video: 'video.html5-main-video',
    playerContainer: '.html5-video-player',
    controlsBar: '.ytp-right-controls',
    nativeSubtitles: '.ytp-caption-window-container',
  },

  navigation: {
    event: 'yt-navigate-finish',
    getVideoId: () => {
      const params = new URLSearchParams(window.location.search)
      return params.get('v')
    },
  },
}
