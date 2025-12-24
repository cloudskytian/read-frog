import type { TranslationBatch } from './atoms'
import type { PlatformConfig } from '@/entrypoints/subtitles.content/platforms'
import type { SubtitlesFetcher } from '@/utils/subtitles/fetchers/types'
import type { SubtitlesFragment } from '@/utils/subtitles/types'
import { i18n } from '#imports'
import { toast } from 'sonner'
import { HIDE_NATIVE_CAPTIONS_STYLE_ID, NAVIGATION_HANDLER_DELAY, PRELOAD_AHEAD_MS, TRANSLATE_BUTTON_CONTAINER_ID } from '@/utils/constants/subtitles'
import { waitForElement } from '@/utils/dom/wait-for-element'
import { ToastSubtitlesError } from '@/utils/subtitles/errors'
import { createBatches, findNextBatchToTranslate, updateBatchState } from '@/utils/subtitles/processor/batch-strategy'
import { translateSubtitles } from '@/utils/subtitles/processor/translator'
import { currentTranslatingBatchIdAtom, subtitlesStore, translationBatchesAtom } from './atoms'
import { renderSubtitlesTranslateButton } from './renderer/render-translate-button'
import { SubtitlesScheduler } from './subtitles-scheduler'

export class UniversalVideoAdapter {
  private config: PlatformConfig
  private subtitlesScheduler: SubtitlesScheduler | null = null
  private subtitlesFetcher: SubtitlesFetcher

  private originalSubtitles: SubtitlesFragment[] = []
  private isNativeSubtitlesHidden = false
  private cachedVideoId: string | null = null

  constructor({
    config,
    subtitlesFetcher,
  }: {
    config: PlatformConfig
    subtitlesFetcher: SubtitlesFetcher
  }) {
    this.config = config
    this.subtitlesFetcher = subtitlesFetcher
  }

  initialize() {
    this.subtitlesFetcher.initialize()
    void this.initializeScheduler()
    void this.renderTranslateButton()
    this.setupNavigationListener()
  }

  private resetSubtitlesData() {
    this.subtitlesScheduler?.reset()
    this.stopBatchMonitoring()
    subtitlesStore.set(translationBatchesAtom, [])
    subtitlesStore.set(currentTranslatingBatchIdAtom, null)
    this.originalSubtitles = []
    this.subtitlesFetcher.cleanup()
  }

  private resetForNavigation() {
    this.destroyScheduler()
    this.originalSubtitles = []
    this.cachedVideoId = null
    this.subtitlesFetcher.cleanup()
    this.showNativeSubtitles()
  }

  private destroyScheduler() {
    this.subtitlesScheduler?.reset()
    this.subtitlesScheduler?.stop()
    this.subtitlesScheduler = null
  }

  private async initializeScheduler() {
    const video = await waitForElement(
      this.config.selectors.video,
      el => !!el.closest(this.config.selectors.playerContainer),
    ) as HTMLVideoElement | null

    if (!video) {
      toast.error(i18n.t('subtitles.errors.videoNotFound'))
      return
    }

    this.subtitlesScheduler = new SubtitlesScheduler({ videoElement: video })
    this.subtitlesScheduler.start()
    this.subtitlesScheduler.hide()
  }

  private setupNavigationListener() {
    const { navigation } = this.config

    if (navigation.event) {
      const navigationListener = () => {
        setTimeout(() => {
          this.handleNavigation()
        }, NAVIGATION_HANDLER_DELAY)
      }

      window.addEventListener(navigation.event, navigationListener)
    }
  }

  private handleNavigation() {
    const currentVideoId = this.config.navigation.getVideoId?.()
    if (currentVideoId && this.cachedVideoId && currentVideoId !== this.cachedVideoId) {
      this.resetForNavigation()
      void this.initializeScheduler()
      void this.renderTranslateButton()
    }
  }

  private async renderTranslateButton() {
    const controlsBar = await waitForElement(this.config.selectors.controlsBar)
    if (!controlsBar) {
      toast.error(i18n.t('subtitles.errors.controlsBarNotFound'))
      return
    }

    const existingButton = controlsBar.querySelector(`#${TRANSLATE_BUTTON_CONTAINER_ID}`)
    existingButton?.remove()

    const toggleButton = renderSubtitlesTranslateButton(
      enabled => this.handleToggleSubtitles(enabled),
    )

    controlsBar.insertBefore(toggleButton, controlsBar.firstChild)
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

    const style = document.getElementById(HIDE_NATIVE_CAPTIONS_STYLE_ID)
    style?.remove()
    this.isNativeSubtitlesHidden = false
  }

  private hideNativeSubtitles() {
    if (this.isNativeSubtitlesHidden) {
      return
    }

    if (document.getElementById(HIDE_NATIVE_CAPTIONS_STYLE_ID)) {
      this.isNativeSubtitlesHidden = true
      return
    }

    const style = document.createElement('style')
    style.id = HIDE_NATIVE_CAPTIONS_STYLE_ID
    style.textContent = `
      ${this.config.selectors.nativeSubtitles},
      ${this.config.selectors.nativeSubtitles} * {
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
      const currentVideoId = this.config.navigation.getVideoId?.() ?? ''
      this.cachedVideoId = currentVideoId
      this.subtitlesScheduler?.setState('fetching')

      this.originalSubtitles = await this.subtitlesFetcher.fetch()

      this.subtitlesScheduler?.setState('fetchSuccess')

      if (this.originalSubtitles.length === 0) {
        this.subtitlesScheduler?.setState('error', { message: i18n.t('subtitles.errors.noSubtitlesFound') })
        return
      }

      await this.processSubtitles()
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      if (error instanceof ToastSubtitlesError) {
        toast.error(errorMessage)
      }
      else {
        this.subtitlesScheduler?.setState('error', { message: errorMessage })
      }
    }
  }

  private async processSubtitles() {
    try {
      this.subtitlesScheduler?.setState('processing')

      // Create batches from original subtitles
      const batches = createBatches(this.originalSubtitles)
      subtitlesStore.set(translationBatchesAtom, batches)

      // Translate first batch immediately
      if (batches.length > 0) {
        await this.translateBatch(batches[0])
      }

      // Start monitoring for subsequent batches
      this.startBatchMonitoring()

      this.subtitlesScheduler?.setState('completed')
    }
    catch {
      // Silent degradation: show original subtitles without translation
      this.subtitlesScheduler?.supplementSubtitles(
        this.originalSubtitles.map(f => ({ ...f, translation: '' })),
      )
      this.subtitlesScheduler?.setState('completed')
    }
  }

  private async translateBatch(batch: TranslationBatch) {
    // Update state to processing
    const batches = subtitlesStore.get(translationBatchesAtom)
    subtitlesStore.set(translationBatchesAtom, updateBatchState(batches, batch.id, 'processing'))
    subtitlesStore.set(currentTranslatingBatchIdAtom, batch.id)

    try {
      const translated = await translateSubtitles(batch.fragments)

      // Update state to completed
      const updatedBatches = subtitlesStore.get(translationBatchesAtom)
      subtitlesStore.set(translationBatchesAtom, updateBatchState(updatedBatches, batch.id, 'completed'))

      // Supply to scheduler
      this.subtitlesScheduler?.supplementSubtitles(translated)
    }
    catch {
      // Silent degradation
      const updatedBatches = subtitlesStore.get(translationBatchesAtom)
      subtitlesStore.set(translationBatchesAtom, updateBatchState(updatedBatches, batch.id, 'error'))

      // Supply original fragments as fallback
      this.subtitlesScheduler?.supplementSubtitles(
        batch.fragments.map(f => ({ ...f, translation: '' })),
      )
    }
    finally {
      subtitlesStore.set(currentTranslatingBatchIdAtom, null)
    }
  }

  // Event-driven batch monitoring (replaces interval polling)
  private handleBatchCheck = () => {
    const video = this.subtitlesScheduler?.getVideoElement()
    if (!video)
      return

    const currentTimeMs = video.currentTime * 1000
    const batches = subtitlesStore.get(translationBatchesAtom)
    const currentTranslating = subtitlesStore.get(currentTranslatingBatchIdAtom)

    // Skip if a batch is already being translated
    if (currentTranslating !== null)
      return

    // Find next batch to translate
    const nextBatch = findNextBatchToTranslate(batches, currentTimeMs, PRELOAD_AHEAD_MS)
    if (nextBatch) {
      void this.translateBatch(nextBatch)
    }
  }

  private startBatchMonitoring() {
    const video = this.subtitlesScheduler?.getVideoElement()
    if (!video)
      return

    // Listen to seeking event - triggered when user jumps
    video.addEventListener('seeking', this.handleBatchCheck)
    // Listen to timeupdate event - triggered during normal playback
    video.addEventListener('timeupdate', this.handleBatchCheck)
  }

  private stopBatchMonitoring() {
    const video = this.subtitlesScheduler?.getVideoElement()
    if (!video)
      return

    video.removeEventListener('seeking', this.handleBatchCheck)
    video.removeEventListener('timeupdate', this.handleBatchCheck)
  }
}
