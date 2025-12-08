import type { StateData, SubtitleState } from '../types'
import type { YoutubeSubtitle } from './types'
import { logger } from '@/utils/logger'
import { SubtitleContainer } from '../subtitles-container'

export type { StateData, SubtitleState }

const ALLOWED_TRANSITIONS: Record<SubtitleState, SubtitleState[]> = {
  idle: ['fetching'],
  fetching: ['fetch_success', 'fetch_failed', 'error', 'idle'],
  fetch_success: ['processing', 'completed', 'error', 'idle'],
  fetch_failed: ['fetching', 'idle', 'error'],
  processing: ['completed', 'error', 'idle'],
  completed: ['idle', 'fetching'],
  error: ['idle', 'fetching'],
}

export class SubtitleRenderer {
  private videoElement: HTMLVideoElement
  private subtitles: YoutubeSubtitle[] = []
  private subtitleContainer: SubtitleContainer | null = null
  private currentIndex = -1
  private isActive = false
  private currentState: StateData = {
    state: 'idle',
    timestamp: Date.now(),
  }

  private hideStateTimeout: NodeJS.Timeout | null = null

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement
  }

  start(subtitles?: YoutubeSubtitle[]) {
    if (subtitles) {
      this.subtitles = subtitles
    }
    this.isActive = true

    const playerContainer = this.videoElement.closest('.html5-video-player')
    if (playerContainer) {
      this.subtitleContainer = new SubtitleContainer(playerContainer)
      this.subtitleContainer.mount()
    }

    this.attachListeners()
    logger.log('[SubtitleRenderer] Started with', this.subtitles.length, 'subtitles')
  }

  addSubtitle(subtitle: YoutubeSubtitle) {
    this.subtitles.push(subtitle)
    this.subtitles.sort((a, b) => a.start - b.start)
    this.currentIndex = -1
  }

  addSubtitles(subtitles: YoutubeSubtitle[]) {
    this.subtitles.push(...subtitles)
    this.subtitles.sort((a, b) => a.start - b.start)
    this.currentIndex = -1
  }

  stop() {
    this.isActive = false
    if (this.subtitleContainer) {
      this.subtitleContainer.unmount()
      this.subtitleContainer = null
    }
    this.detachListeners()
    this.clearHideStateTimeout()
  }

  show() {
    this.subtitleContainer?.show()
  }

  hide() {
    this.subtitleContainer?.hide()
  }

  setState(state: SubtitleState, data?: Partial<Omit<StateData, 'state' | 'timestamp'>>) {
    if (!this.canTransitionTo(state)) {
      console.warn(
        `[SubtitleRenderer] Invalid state transition: ${this.currentState.state} -> ${state}`,
      )
      return
    }

    this.currentState = {
      state,
      message: data?.message,
      progress: data?.progress,
      error: data?.error,
      timestamp: Date.now(),
    }

    this.clearHideStateTimeout()

    if (state !== 'idle') {
      this.subtitleContainer?.show()
    }

    this.updateDisplay()

    if (state === 'completed' || state === 'fetch_success') {
      this.hideStateTimeout = setTimeout(() => {
        this.setState('idle')
      }, 3000)
    }
  }

  resetState() {
    this.setState('idle')
  }

  getState(): SubtitleState {
    return this.currentState.state
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
    this.updateSubtitle(currentTime)
  }

  private handleSeeking = () => {
    if (!this.isActive)
      return

    const currentTime = this.videoElement.currentTime
    this.updateSubtitle(currentTime)
  }

  private updateSubtitle(currentTime: number) {
    const currentTimeMs = currentTime * 1000
    const subtitle = this.findSubtitleAtTime(currentTimeMs)

    if (subtitle) {
      const index = this.subtitles.indexOf(subtitle)
      if (index !== this.currentIndex) {
        this.currentIndex = index
        logger.log('[SubtitleRenderer] Updated subtitle display at', currentTime.toFixed(2), 's:', subtitle.text.substring(0, 50))
      }
    }
    else {
      if (this.currentIndex !== -1) {
        this.currentIndex = -1
      }
    }

    this.updateDisplay()
  }

  private updateDisplay() {
    if (!this.subtitleContainer) {
      return
    }

    const currentSubtitle = this.currentIndex >= 0 ? this.subtitles[this.currentIndex] : null
    const stateData = this.currentState.state !== 'idle' ? this.currentState : null

    this.subtitleContainer.render(currentSubtitle, stateData)
  }

  private findSubtitleAtTime(timeMs: number): YoutubeSubtitle | null {
    return this.subtitles.find(sub => sub.start <= timeMs && sub.end >= timeMs) || null
  }

  private canTransitionTo(newState: SubtitleState): boolean {
    const allowed = ALLOWED_TRANSITIONS[this.currentState.state]
    return allowed.includes(newState)
  }

  private clearHideStateTimeout() {
    if (this.hideStateTimeout) {
      clearTimeout(this.hideStateTimeout)
      this.hideStateTimeout = null
    }
  }
}
