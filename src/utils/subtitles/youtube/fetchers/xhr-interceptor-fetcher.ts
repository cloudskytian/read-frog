import type { YoutubeSubtitleResponse, YoutubeTimedText } from '../types'
import type { SubtitlesFetcher } from './types'
import type { SubtitlesFragment } from '@/utils/subtitles/types'
import { i18n } from '#imports'

const errorMessageMap: Record<number, string> = {
  429: i18n.t('subtitles.errors.http429'),
  404: i18n.t('subtitles.errors.http404'),
  403: i18n.t('subtitles.errors.http403'),
  500: i18n.t('subtitles.errors.http500'),
}

export class XhrInterceptFetcher implements SubtitlesFetcher {
  private subtitles: SubtitlesFragment[] = []
  private sourceLanguage: string = ''
  private kind: string = ''
  private messageListener: ((event: MessageEvent) => void) | null = null
  private fetchError: Error | null = null

  initialize(): void {
    this.setupMessageListener()
  }

  getSourceLanguage(): string {
    return this.sourceLanguage
  }

  getKind(): string {
    return this.kind
  }

  async fetch(): Promise<SubtitlesFragment[]> {
    if (this.subtitles.length > 0) {
      return this.subtitles
    }

    this.tryClickSubtitleButton()

    return new Promise<SubtitlesFragment[]>((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.fetchError) {
          clearInterval(checkInterval)
          reject(this.fetchError)
          return
        }

        if (this.subtitles.length > 0) {
          clearInterval(checkInterval)
          resolve(this.subtitles)
        }
      }, 100)

      setTimeout(() => {
        clearInterval(checkInterval)
        if (!this.subtitles.length && !this.fetchError) {
          reject(new Error('Fetch subtitles timeout'))
        }
      }, 5000)
    })
  }

  cleanup(): void {
    this.subtitles = []
    this.fetchError = null
  }

  private setupMessageListener() {
    this.messageListener = (event: MessageEvent) => {
      if (event.source !== window)
        return

      if (event.data.type === 'WXT_YT_SUBTITLE_INTERCEPT') {
        this.cleanup()
        this.handleInterceptedSubtitle(event.data)
      }
    }

    window.addEventListener('message', this.messageListener)
  }

  private handleInterceptedSubtitle(data: {
    payload?: string
    lang?: string
    kind?: string
    url?: string
    error?: boolean
    status?: number
  }) {
    if (data.error) {
      const errorMsg = errorMessageMap[data.status || 0] || `HTTP Error: ${data.status || 'Unknown'}`
      this.fetchError = new Error(errorMsg)
      return
    }

    if (!data.payload || !data.lang) {
      return
    }

    const subtitleResponse: YoutubeSubtitleResponse = JSON.parse(data.payload)
    this.subtitles = this.cleanOriginalSubtitles(subtitleResponse.events)

    this.sourceLanguage = data.lang
    this.kind = data.kind || ''
  }

  private cleanOriginalSubtitles(events: YoutubeTimedText[] = []): SubtitlesFragment[] {
    const segments: SubtitlesFragment[] = []
    let buffer: SubtitlesFragment | null = { text: '', start: 0, end: 0 }

    events.forEach(({ segs = [], tStartMs = 0, dDurationMs = 0 }) => {
      segs.forEach(({ utf8 = '', tOffsetMs = 0 }, j) => {
        const text = utf8.trim().replace(/\s+/g, ' ').replace(/>>/g, ' ')
        const start = tStartMs + tOffsetMs

        if (buffer) {
          if (!buffer.end || buffer.end > start) {
            buffer.end = start
          }
          segments.push(buffer)
          buffer = null
        }

        buffer = {
          text,
          start,
          end: 0,
        }

        if (j === segs.length - 1) {
          buffer.end = tStartMs + dDurationMs
        }
      })
    })

    segments.push(buffer)
    return segments
  }

  private tryClickSubtitleButton() {
    const ccButton = document.querySelector('.ytp-subtitles-button')
    if (!(ccButton instanceof HTMLElement))
      return

    const isPressed = ccButton.getAttribute('aria-pressed') === 'true'
    if (isPressed) {
      ccButton.click()
      ccButton.click()
    }
    else {
      ccButton.click()
    }
  }
}
