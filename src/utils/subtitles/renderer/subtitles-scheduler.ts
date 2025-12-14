import type { StateData, SubtitlesFragment, SubtitlesState } from '../types'
import { SubtitlesViewManager } from './view-manager'

const COMPLETED_STATE_HIDE_DELAY = 500

export class SubtitlesScheduler {
  private videoElement: HTMLVideoElement
  private videoContainerElement: Element
  private subtitles: SubtitlesFragment[] = []
  private subtitlesViewManager: SubtitlesViewManager | null = null
  private currentIndex = -1
  private isActive = false
  private currentState: StateData = {
    state: 'idle',
  }

  private hideStateTimeout: NodeJS.Timeout | null = null

  constructor(
    { videoElement, videoContainerElement }: { videoElement: HTMLVideoElement, videoContainerElement: Element },
  ) {
    this.videoElement = videoElement
    this.videoContainerElement = videoContainerElement
  }

  start() {
    this.isActive = true

    this.subtitlesViewManager = new SubtitlesViewManager(this.videoContainerElement)
    this.subtitlesViewManager.mount()

    this.attachListeners()
  }

  supplementSubtitles(subtitles: SubtitlesFragment[]) {
    if (subtitles.length === 0) {
      return
    }

    this.subtitles.push(...subtitles)
    this.currentIndex = -1
  }

  stop() {
    this.isActive = false
    this.subtitlesViewManager?.unmount()
    this.subtitlesViewManager = null
    this.detachListeners()
    this.clearHideStateTimeout()
  }

  show() {
    this.subtitlesViewManager?.show()
  }

  hide() {
    this.subtitlesViewManager?.hide()
  }

  setState(state: SubtitlesState, data?: Partial<Omit<StateData, 'state'>>) {
    this.currentState = {
      state,
      message: data?.message,
    }

    this.clearHideStateTimeout()

    if (state !== 'idle') {
      this.subtitlesViewManager?.show()
    }

    this.updateSubtitlesView()

    if (state === 'completed') {
      this.hideStateTimeout = setTimeout(
        () => {
          this.setState('idle')
        },
        COMPLETED_STATE_HIDE_DELAY,
      )
    }
  }

  reset() {
    this.setState('idle')
    this.subtitles = []
    this.currentIndex = -1
  }

  private attachListeners() {
    this.videoElement.addEventListener('timeupdate', this.handleTimeUpdate)
    this.videoElement.addEventListener('seeking', this.handleSeeking)
  }

  private detachListeners() {
    this.videoElement.removeEventListener('timeupdate', this.handleTimeUpdate)
    this.videoElement.removeEventListener('seeking', this.handleSeeking)
  }

  private handleTimeUpdate = () => {
    if (!this.isActive)
      return

    const currentTime = this.videoElement.currentTime
    this.updateSubtitles(currentTime)
  }

  private handleSeeking = () => {
    if (!this.isActive)
      return

    const currentTime = this.videoElement.currentTime
    this.updateSubtitles(currentTime)
  }

  private updateSubtitles(currentTime: number) {
    const timeMs = currentTime * 1000
    const subtitle = this.subtitles.find(sub => sub.start <= timeMs && sub.end >= timeMs)

    let hasChanged = false

    if (subtitle) {
      const index = this.subtitles.indexOf(subtitle)
      if (index !== this.currentIndex) {
        this.currentIndex = index
        hasChanged = true
      }
    }
    else {
      if (this.currentIndex !== -1) {
        this.currentIndex = -1
        hasChanged = true
      }
    }

    if (hasChanged) {
      this.updateSubtitlesView()
    }
  }

  private updateSubtitlesView() {
    if (!this.subtitlesViewManager) {
      return
    }

    const currentSubtitles = this.currentIndex >= 0 ? this.subtitles[this.currentIndex] : null
    const stateData = this.currentState.state !== 'idle' ? this.currentState : null

    this.subtitlesViewManager.render(currentSubtitles, stateData)
  }

  private clearHideStateTimeout() {
    if (this.hideStateTimeout) {
      clearTimeout(this.hideStateTimeout)
      this.hideStateTimeout = null
    }
  }
}
