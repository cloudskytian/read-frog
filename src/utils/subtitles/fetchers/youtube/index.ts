import type { SubtitlesFragment } from '../../types'
import type { SubtitlesFetcher } from '../types'
import type { SubtitlesInterceptMessage, XhrInterceptFetcherErrorStatus, YoutubeTimedText } from './types'
import { i18n } from '#imports'
import { FETCH_CHECK_INTERVAL, FETCH_SUBTITLES_TIMEOUT } from '@/utils/constants/subtitles'
import { optimizeSubtitles } from '@/utils/subtitles/processor/optimizer'
import { detectFormat } from './format-detector'
import { parseKaraokeSubtitles, parseScrollingAsrSubtitles, parseStandardSubtitles } from './parser'
import { subtitlesInterceptMessageSchema, youtubeSubtitlesResponseSchema } from './types'

export class YoutubeSubtitlesFetcher implements SubtitlesFetcher {
  private subtitles: SubtitlesFragment[] = []
  private rawEvents: YoutubeTimedText[] = []
  private sourceLanguage: string = ''
  private messageListener: ((event: MessageEvent) => void) | null = null
  private fetchError: Error | null = null

  initialize(): void {
    this.setupMessageListener()
  }

  async fetch(): Promise<SubtitlesFragment[]> {
    if (this.subtitles.length > 0) {
      return this.subtitles
    }

    this.clickYoutubeSubtitleButton()

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
      }, FETCH_CHECK_INTERVAL)

      setTimeout(() => {
        clearInterval(checkInterval)
        if (this.subtitles.length === 0 && !this.fetchError) {
          reject(new Error('Fetch subtitles timeout'))
        }
      }, FETCH_SUBTITLES_TIMEOUT)
    })
  }

  cleanup(): void {
    this.subtitles = []
    this.rawEvents = []
    this.fetchError = null
  }

  private setupMessageListener() {
    this.messageListener = (event: MessageEvent) => {
      const parsed = subtitlesInterceptMessageSchema.safeParse(event.data)
      if (!parsed.success) {
        return
      }

      this.cleanup()
      this.handleInterceptedSubtitle(parsed.data)
    }

    window.addEventListener('message', this.messageListener)
  }

  private setFetchError(status: XhrInterceptFetcherErrorStatus) {
    const errorMessage = i18n.t(`subtitles.errors.http${status}`)
    this.fetchError = new Error(errorMessage)
  }

  private handleInterceptedSubtitle(data: SubtitlesInterceptMessage) {
    if (data.errorStatus) {
      this.setFetchError(data.errorStatus)
      return
    }

    if (!data.payload || !data.lang) {
      return
    }

    const parsed = youtubeSubtitlesResponseSchema.safeParse(JSON.parse(data.payload))
    if (!parsed.success) {
      this.fetchError = new Error(i18n.t('subtitles.errors.invalidResponse'))
      return
    }

    this.rawEvents = parsed.data.events
    this.sourceLanguage = data.lang

    this.subtitles = this.processRawEvents(this.rawEvents)
  }

  private processRawEvents(events: YoutubeTimedText[]): SubtitlesFragment[] {
    const format = detectFormat(events)

    switch (format) {
      case 'karaoke':
        return parseKaraokeSubtitles(events)
      case 'scrolling-asr':
      {
        const fragments = parseScrollingAsrSubtitles(events)
        return optimizeSubtitles(fragments, this.sourceLanguage)
      }
      default:
      {
        const fragments = parseStandardSubtitles(events)
        return optimizeSubtitles(fragments, this.sourceLanguage)
      }
    }
  }

  private clickYoutubeSubtitleButton() {
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
