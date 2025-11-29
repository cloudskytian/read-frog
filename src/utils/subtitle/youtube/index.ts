import type { YoutubeSubtitle } from './types'
import { logger } from '@/utils/logger'
import { renderTranslateButton } from '../render-translate-button'
import { fetchVideoId, fetchYoutubeSubtitles } from './fetch-subtitles'

export class YoutubeAdapter {
  VIDEO_SELECTOR = 'video.html5-main-video'
  RIGHT_CONTROLS_SELECTOR = '.ytp-right-controls'

  private videoElement: HTMLVideoElement | null = null
  private videoId: string = ''
  private fullTranscriptText: string = ''
  private originalSubtitles: YoutubeSubtitle[] = []

  initialize() {
    this.videoElement = document.querySelector(this.VIDEO_SELECTOR)
    this.videoId = fetchVideoId()
    this.renderTranslateButton()
  }

  private renderTranslateButton() {
    const rightControls = document.querySelector(this.RIGHT_CONTROLS_SELECTOR)
    if (!rightControls)
      return

    const subtitleTranslateButton = renderTranslateButton()
    subtitleTranslateButton.addEventListener('click', () => this.startTranslate())
    rightControls.insertBefore(subtitleTranslateButton, rightControls.firstChild)
  }

  private async startTranslate() {
    this.originalSubtitles = await fetchYoutubeSubtitles()
    this.extractFullTranscriptText()
  }

  private extractFullTranscriptText() {
    this.fullTranscriptText = this.originalSubtitles.map(subtitle => subtitle.text).join('\n')

    logger.log('originalSubtitles', this.originalSubtitles)
    logger.log('fullTranscriptText', this.fullTranscriptText)
  }

  private emitError(error: Error): void {
    logger.error(`[YoutubeSubtitle] ${error.message}`)
  }
}
