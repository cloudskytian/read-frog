import type { SubtitlesFragment } from '../types'
import type { SubtitlesFetcher } from './fetchers'
import { SubtitlesProcessor } from '../processor'
import { SubtitlesScheduler } from '../renderer/subtitles-scheduler'
import { renderSubtitlesTranslateButton, SUBTITLES_TRANSLATE_BUTTON_CONTAINER_ID } from '../renderer/translate-button'
import { XhrInterceptFetcher } from './fetchers'

const VIDEO_SELECTOR = 'video.html5-main-video'
const PLAYER_CONTAINER_SELECTOR = '.html5-video-player'
const RIGHT_CONTROLS_SELECTOR = '.ytp-right-controls'
const CAPTION_WINDOW_SELECTOR = '.ytp-caption-window-container'
const HIDE_NATIVE_STYLE_ID = 'read-frog-hide-yt-native-captions'
const BUTTON_RENDER_TIMEOUT = 10000

export class YoutubeAdapter {
  private videoElement: HTMLVideoElement | null = null
  private subtitlesScheduler: SubtitlesScheduler | null = null
  private subtitlesFetcher: SubtitlesFetcher
  private subtitlesProcessor: SubtitlesProcessor

  private originalSubtitles: SubtitlesFragment[] = []
  private isNativeSubtitlesHidden = false
  private cachedVideoId: string | null = null

  constructor() {
    this.subtitlesFetcher = new XhrInterceptFetcher()
    this.subtitlesProcessor = new SubtitlesProcessor()
  }

  initialize() {
    this.videoElement = document.querySelector(VIDEO_SELECTOR)
    this.subtitlesFetcher.initialize()
    this.initializeScheduler()
    this.renderTranslateButton()
    this.setupNavigationListener()
  }

  private resetSubtitlesData() {
    this.subtitlesScheduler?.reset()
    this.originalSubtitles = []
    this.subtitlesFetcher.cleanup()
  }

  private resetForNavigation() {
    this.destroyScheduler()
    this.originalSubtitles = []
    this.cachedVideoId = null
    this.subtitlesFetcher.cleanup()
    this.showNativeSubtitles()
    this.videoElement = document.querySelector(VIDEO_SELECTOR)
  }

  private destroyScheduler() {
    this.subtitlesScheduler?.reset()
    this.subtitlesScheduler?.stop()
    this.subtitlesScheduler = null
  }

  private initializeScheduler() {
    if (!this.videoElement) {
      return
    }

    const playerContainer = this.videoElement.closest(PLAYER_CONTAINER_SELECTOR)
    if (!playerContainer) {
      console.warn('[YoutubeAdapter] Failed to find player container element')
      return
    }

    this.subtitlesScheduler = new SubtitlesScheduler({
      videoElement: this.videoElement,
      videoContainerElement: playerContainer,
    })

    this.subtitlesScheduler.start()
    this.subtitlesScheduler.hide()
  }

  private setupNavigationListener() {
    const navigationListener = () => {
      setTimeout(() => {
        const currentVideoId = new URL(window.location.href).searchParams.get('v')
        if (currentVideoId && this.cachedVideoId && currentVideoId !== this.cachedVideoId) {
          this.resetForNavigation()
          this.initializeScheduler()
          this.renderTranslateButton()
        }
      }, 1000)
    }

    window.addEventListener('yt-navigate-finish', navigationListener)
  }

  private renderTranslateButton() {
    const tryRenderButton = () => {
      const rightControls = document.querySelector(RIGHT_CONTROLS_SELECTOR)
      if (!rightControls) {
        return false
      }

      const existingButton = rightControls.querySelector(`#${SUBTITLES_TRANSLATE_BUTTON_CONTAINER_ID}`)
      existingButton?.remove()

      const toggleButton = renderSubtitlesTranslateButton(
        enabled => this.handleToggleSubtitles(enabled),
      )

      rightControls.insertBefore(toggleButton, rightControls.firstChild)
      return true
    }

    if (tryRenderButton()) {
      return
    }

    const observer = new MutationObserver(() => {
      if (tryRenderButton()) {
        observer.disconnect()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    setTimeout(() => {
      observer.disconnect()
    }, BUTTON_RENDER_TIMEOUT)
  }

  private handleToggleSubtitles(enabled: boolean) {
    if (enabled) {
      this.subtitlesScheduler?.start()
      this.subtitlesScheduler?.show()
      this.hideNativeSubtitles()
      void this.startTranslation()
    }
    else {
      this.subtitlesScheduler?.hide()
      this.showNativeSubtitles()
      this.resetSubtitlesData()
    }
  }

  private showNativeSubtitles() {
    if (!this.isNativeSubtitlesHidden) {
      return
    }

    const style = document.getElementById(HIDE_NATIVE_STYLE_ID)
    if (style) {
      style.remove()
    }
    this.isNativeSubtitlesHidden = false
  }

  private hideNativeSubtitles() {
    if (this.isNativeSubtitlesHidden) {
      return
    }

    if (document.getElementById(HIDE_NATIVE_STYLE_ID)) {
      this.isNativeSubtitlesHidden = true
      return
    }

    const style = document.createElement('style')
    style.id = HIDE_NATIVE_STYLE_ID
    style.textContent = `
      ${CAPTION_WINDOW_SELECTOR},
      ${CAPTION_WINDOW_SELECTOR} * {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
      }
    `
    document.head.appendChild(style)
    this.isNativeSubtitlesHidden = true
  }

  private async startTranslation() {
    try {
      const currentVideoId = new URL(window.location.href).searchParams.get('v')
      this.cachedVideoId = currentVideoId
      this.subtitlesScheduler?.setState('fetching')

      this.originalSubtitles = await this.subtitlesFetcher.fetch()

      this.subtitlesScheduler?.setState('fetchSuccess')

      if (this.originalSubtitles.length === 0) {
        this.subtitlesScheduler?.setState('error', { message: 'No subtitles found' })
        return
      }

      const sourceLanguage = this.subtitlesFetcher.getSourceLanguage()
      const kind = this.subtitlesFetcher.getKind()
      this.subtitlesProcessor.setSourceLanguage(sourceLanguage)
      this.subtitlesProcessor.setKind(kind)

      await this.processSubtitles()
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.subtitlesScheduler?.setState('error', { message: errorMessage })
    }
  }

  private async processSubtitles() {
    this.subtitlesScheduler?.setState('processing')

    const optimizedSubtitles = await this.subtitlesProcessor.process(this.originalSubtitles)
    if (this.subtitlesScheduler) {
      this.subtitlesScheduler.supplementSubtitles(optimizedSubtitles)
    }

    this.subtitlesScheduler?.setState('completed')
  }
}
