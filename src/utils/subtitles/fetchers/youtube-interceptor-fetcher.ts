import type { SubtitlesFetcher } from './types'
import type { SubtitlesFragment } from '@/utils/subtitles/types'
import { i18n } from '#imports'

type XhrInterceptFetcherErrorStatus = 429 | 404 | 403 | 500

interface YoutubeTimedText {
  tStartMs: number
  dDurationMs: number
  aAppend: number
  segs: {
    utf8: string
    tOffsetMs: number
  }[]
}

interface YoutubeSubtitleResponse {
  events: YoutubeTimedText[]
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
        if (this.subtitles.length === 0 && !this.fetchError) {
          reject(new Error('Fetch subtitles timeout'))
        }
      }, 5000)
    })
  }

  cleanup(): void {
    this.resetFetchState()
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener)
    }
  }

  private resetFetchState() {
    this.subtitles = []
    this.fetchError = null
  }

  private setupMessageListener() {
    this.messageListener = (event: MessageEvent) => {
      if (event.source !== window)
        return

      if (event.data.type === 'WXT_YT_SUBTITLE_INTERCEPT') {
        this.resetFetchState()
        this.handleInterceptedSubtitle(event.data)
      }
    }

    window.addEventListener('message', this.messageListener)
  }

  private showError(status: XhrInterceptFetcherErrorStatus) {
    const errorMessage = i18n.t(`subtitles.errors.http${status}`)
    this.fetchError = new Error(errorMessage)
  }

  private handleInterceptedSubtitle(data: {
    payload?: string
    lang?: string
    kind?: string
    url?: string
    errorStatus?: XhrInterceptFetcherErrorStatus
  }) {
    if (data.errorStatus) {
      this.showError(data.errorStatus)
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
    let buffer: SubtitlesFragment | null = null

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

    if (buffer) {
      segments.push(buffer)
    }
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
