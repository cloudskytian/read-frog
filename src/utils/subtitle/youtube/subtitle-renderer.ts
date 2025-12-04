import type { YoutubeSubtitle } from './types'
import { logger } from '@/utils/logger'

export class SubtitleRenderer {
  private videoElement: HTMLVideoElement
  private subtitles: YoutubeSubtitle[] = []
  private containerElement: HTMLDivElement | null = null
  private translationContainer: HTMLDivElement | null = null
  private subtitleContainer: HTMLDivElement | null = null
  private originalSubtitlesContainer: HTMLDivElement | null = null
  private currentIndex = -1
  private isActive = false

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement
  }

  start(subtitles?: YoutubeSubtitle[]) {
    if (subtitles) {
      this.subtitles = subtitles
    }
    this.isActive = true
    this.createContainer()
    this.attachListeners()
    logger.log('[SubtitleRenderer] Started with', this.subtitles.length, 'subtitles')
  }

  addSubtitle(subtitle: YoutubeSubtitle) {
    this.subtitles.push(subtitle)
    this.subtitles.sort((a, b) => a.start - b.start)

    logger.log('[SubtitleRenderer] Added subtitle to renderer:', {
      index: this.subtitles.length,
      start: subtitle.start.toFixed(2),
      end: subtitle.end.toFixed(2),
      text: subtitle.text.substring(0, 50) + (subtitle.text.length > 50 ? '...' : ''),
    })

    this.currentIndex = -1
  }

  stop() {
    this.isActive = false
    this.removeContainer()
    this.detachListeners()
    logger.log('[SubtitleRenderer] Stopped')
  }

  private createContainer() {
    if (this.containerElement)
      return

    this.containerElement = document.createElement('div')
    this.containerElement.className = 'read-frog-subtitle-container'
    this.containerElement.style.cssText = `
      position: absolute;
      bottom: 60px;
      left: 0;
      right: 0;
      text-align: center;
      justify-content: center;
      display: flex;
      flex-direction: column;
      pointer-events: none;
      z-index: 100;
      width: 100%;
      font-family: "YouTube Noto", Roboto, "Arial Unicode Ms", Arial, Helvetica, Verdana, "PT Sans Caption", sans-serif;
    `

    const playerContainer = this.videoElement.closest('.html5-video-player')
    if (playerContainer) {
      playerContainer.appendChild(this.containerElement)
    }
  }

  private removeContainer() {
    if (this.containerElement) {
      this.containerElement.remove()
      this.containerElement = null
    }
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
    const subtitle = this.findSubtitleAtTime(currentTime)

    if (subtitle) {
      const index = this.subtitles.indexOf(subtitle)
      if (index !== this.currentIndex) {
        this.currentIndex = index
        this.renderSubtitle(subtitle)
        logger.log('[SubtitleRenderer] Updated subtitle display at', currentTime.toFixed(2), 's:', subtitle.text.substring(0, 50))
      }
    }
    else {
      if (this.currentIndex !== -1) {
        this.currentIndex = -1
        this.clearSubtitle()
      }
    }
  }

  private findSubtitleAtTime(time: number): YoutubeSubtitle | null {
    return this.subtitles.find(sub => sub.start <= time && sub.end >= time) || null
  }

  private renderSubtitle(subtitle: YoutubeSubtitle) {
    if (!this.containerElement)
      return

    const originalLines = subtitle.text.split('\n')
    const translationLines = subtitle.translation ? subtitle.translation.split('\n') : []

    const html = originalLines
      .map((line, index) => {
        const translation = translationLines[index] || ''
        this.renderTranslation(translation)
        this.renderOriginal(line)
        this.createSubtitleContainer()
        if (this.translationContainer) {
          this.subtitleContainer?.appendChild(this.translationContainer)
        }
        if (this.originalSubtitlesContainer) {
          this.subtitleContainer?.appendChild(this.originalSubtitlesContainer)
        }
        return this.subtitleContainer
      })
      .join('')

    this.containerElement.innerHTML = html
  }

  private renderTranslation(translation: string) {
    if (!this.translationContainer) {
      this.translationContainer = document.createElement('div')
      this.translationContainer.style.cssText = `
        font-size: 24px;
        padding: 2px 4px;
        line-height: 1.4;
        margin: 0 2px;
      `
    }
    this.translationContainer.innerHTML = this.escapeHtml(translation)
  }

  private renderOriginal(original: string) {
    if (!this.originalSubtitlesContainer) {
      this.originalSubtitlesContainer = document.createElement('div')
      this.originalSubtitlesContainer.style.cssText = `
        font-size: 24px;
        padding: 2px 4px;
        line-height: 1.4;
        margin: 0 2px;
      `
    }
    this.originalSubtitlesContainer.innerHTML = this.escapeHtml(original)
  }

  private createSubtitleContainer() {
    if (!this.subtitleContainer) {
      this.subtitleContainer = document.createElement('div')
      this.subtitleContainer.style.cssText = `
        width: fit-content;
        margin: 4px 0;
        background-color: rgba(8, 8, 8, 0.75);
        color: rgb(255, 255, 255);
      `
    }
    this.subtitleContainer.innerHTML = ''
  }

  private clearSubtitle() {
    if (this.containerElement) {
      this.containerElement.innerHTML = ''
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}
