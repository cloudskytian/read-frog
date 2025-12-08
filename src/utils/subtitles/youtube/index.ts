import type { SubtitleFetcher } from './fetchers'
import type { YoutubeSubtitle } from './types'
import { SubtitleProcessor } from '@/utils/subtitles/processor'
import { renderSubtitleToggleButton } from '../subtitles-toggle-button'
import { XhrInterceptFetcher } from './fetchers'
import { SubtitleRenderer } from './subtitle-renderer'

export class YoutubeAdapter {
  VIDEO_SELECTOR = 'video.html5-main-video'
  RIGHT_CONTROLS_SELECTOR = '.ytp-right-controls'
  YOUTUBE_CAPTION_WINDOW_SELECTOR = '.ytp-caption-window-container'
  HIDE_NATIVE_STYLE_ID = 'read-frog-hide-yt-native-captions'

  private videoElement: HTMLVideoElement | null = null
  private videoId: string = ''
  private originalSubtitles: YoutubeSubtitle[] = []
  private optimizedSubtitles: YoutubeSubtitle[] = []
  private subtitlesRenderer: SubtitleRenderer | null = null
  private subtitlesFetcher: SubtitleFetcher
  private isYoutubeSubtitlesEnabled: boolean = false
  private subtitleProcessor = new SubtitleProcessor()

  constructor() {
    this.subtitlesFetcher = new XhrInterceptFetcher()
  }

  initialize() {
    this.videoElement = document.querySelector(this.VIDEO_SELECTOR)
    this.videoId = this.fetchVideoId()
    this.subtitleProcessor.setVideoId(this.videoId)
    this.subtitlesFetcher.initialize()
    this.startSubtitleRenderer()
    this.listenUrlChange()
    this.renderTranslateButton()
  }

  private listenUrlChange() {
    window.addEventListener('extension:URLChange', (e: any) => {
      const { from, to } = e.detail
      const fromUrl = new URL(from, window.location.origin)
      const toUrl = new URL(to, window.location.origin)
      const fromVideoId = fromUrl.searchParams.get('v')
      const toVideoId = toUrl.searchParams.get('v')

      if (fromVideoId !== toVideoId && toVideoId) {
        this.reset()
      }
    })
  }

  private fetchVideoId(): string {
    const url = new URL(window.location.href)
    return url.searchParams.get('v') ?? ''
  }

  reset() {
    if (this.subtitlesRenderer) {
      this.subtitlesRenderer.resetState()
      this.subtitlesRenderer.stop()
      this.subtitlesRenderer = null
    }
    this.originalSubtitles = []
    this.optimizedSubtitles = []
    this.subtitlesFetcher.cleanup()
    this.removeHideStyle()
    this.videoElement = document.querySelector(this.VIDEO_SELECTOR)
    this.videoId = this.fetchVideoId()
    this.subtitleProcessor.setVideoId(this.videoId)
  }

  cleanup() {
    this.subtitlesFetcher.cleanup()
    if (this.subtitlesRenderer) {
      this.subtitlesRenderer.stop()
    }
    this.removeHideStyle()
  }

  private renderTranslateButton() {
    const rightControls = document.querySelector(this.RIGHT_CONTROLS_SELECTOR)
    if (!rightControls)
      return

    const toggleButton = renderSubtitleToggleButton(
      enabled => this.toggleSubtitles(enabled),
      () => this.startTranslate(),
    )
    rightControls.insertBefore(toggleButton, rightControls.firstChild)
  }

  private toggleSubtitles(enabled: boolean) {
    if (enabled) {
      this.subtitlesRenderer?.show()
      this.hideYoutubeSubtitles()
    }
    else {
      this.subtitlesRenderer?.hide()
      this.showYoutubeSubtitles()
    }
  }

  private hideYoutubeSubtitles() {
    this.isYoutubeSubtitlesEnabled = true
    this.injectHideStyle()
  }

  private showYoutubeSubtitles() {
    if (this.isYoutubeSubtitlesEnabled) {
      this.removeHideStyle()
      this.isYoutubeSubtitlesEnabled = false
    }
  }

  private injectHideStyle() {
    if (document.getElementById(this.HIDE_NATIVE_STYLE_ID)) {
      return
    }
    const style = document.createElement('style')
    style.id = this.HIDE_NATIVE_STYLE_ID
    style.textContent = `
      ${this.YOUTUBE_CAPTION_WINDOW_SELECTOR},
      ${this.YOUTUBE_CAPTION_WINDOW_SELECTOR} * {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
      }
    `
    document.head.appendChild(style)
  }

  private removeHideStyle() {
    const style = document.getElementById(this.HIDE_NATIVE_STYLE_ID)
    if (style) {
      style.remove()
    }
  }

  private async startTranslate() {
    try {
      if (this.originalSubtitles.length > 0) {
        await this.processSubtitles()
        return
      }
      this.subtitlesRenderer?.setState('fetching')
      this.originalSubtitles = await this.subtitlesFetcher.fetch(this.videoId)

      if (this.originalSubtitles.length === 0) {
        this.subtitlesRenderer?.setState('fetch_failed')
        return
      }

      const sourceLanguage = this.subtitlesFetcher.getSourceLanguage()
      this.subtitleProcessor.setSourceLanguage(sourceLanguage)

      this.subtitlesRenderer?.setState('fetch_success')
      await this.processSubtitles()
    }
    catch (error) {
      if (error instanceof Error) {
        this.subtitlesRenderer?.setState('error', { message: error.message, error })
      }
      else {
        const err = new Error(String(error))
        this.subtitlesRenderer?.setState('error', { message: String(error), error: err })
      }
    }
  }

  private async processSubtitles() {
    this.subtitlesRenderer?.setState('processing')

    this.optimizedSubtitles = await this.subtitleProcessor.process(
      this.originalSubtitles,
      {
        onProgress: (_progress, _message) => {
          // 可以在这里更新进度显示
          // console.warn(`[SubtitleProcessor] Progress: ${progress}% - ${message}`)
        },
      },
    )

    if (this.subtitlesRenderer) {
      this.subtitlesRenderer.addSubtitles(this.optimizedSubtitles)
    }

    this.subtitlesRenderer?.setState('completed')
  }

  private startSubtitleRenderer() {
    if (!this.videoElement) {
      return
    }

    if (this.subtitlesRenderer) {
      this.subtitlesRenderer.stop()
    }
    this.subtitlesRenderer = new SubtitleRenderer(this.videoElement)
    this.subtitlesRenderer.start([])
    // 初始时隐藏自定义字幕
    this.subtitlesRenderer.hide()
  }
}
