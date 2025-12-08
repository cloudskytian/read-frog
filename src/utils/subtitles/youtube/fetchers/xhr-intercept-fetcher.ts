import type { YoutubeSubtitle, YoutubeSubtitleResponse, YoutubeTimedText } from '../types'
import type { SubtitleFetcher } from './types'
import { logger } from '@/utils/logger'

export class XhrInterceptFetcher implements SubtitleFetcher {
  private checkInterval: NodeJS.Timeout | null = null
  private subtitles: YoutubeSubtitle[] = []
  private sourceLanguage: string = 'en'
  private isInitialized = false
  private messageListener: ((event: MessageEvent) => void) | null = null

  initialize(): void {
    if (this.isInitialized) {
      return
    }

    this.isInitialized = true
    this.setupMessageListener()
  }

  async fetch(): Promise<YoutubeSubtitle[]> {
    if (this.subtitles.length > 0) {
      logger.log('[XhrInterceptFetcher] Subtitles already fetched', this.subtitles)
      return this.subtitles
    }

    this.startAutoClickSubtitleButton()

    return new Promise<YoutubeSubtitle[]>((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.subtitles.length > 0) {
          clearInterval(checkInterval)
          resolve(this.subtitles)
        }
      }, 100)

      setTimeout(() => {
        clearInterval(checkInterval)
        if (this.subtitles.length === 0) {
          logger.warn('[XhrInterceptFetcher] 获取字幕超时')
          resolve([])
        }
      }, 15000)
    })
  }

  cleanup(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    this.subtitles = []
  }

  private setupMessageListener() {
    this.messageListener = (event: MessageEvent) => {
      if (event.source !== window)
        return

      if (event.data.type === 'WXT_YT_SUBTITLE_INTERCEPT') {
        this.handleInterceptedSubtitle(event.data)
      }
    }

    window.addEventListener('message', this.messageListener)
  }

  private handleInterceptedSubtitle(data: { payload: string, lang: string, url: string }) {
    const parsedSubtitles = this.parseInterceptedSubtitle(data.payload)

    if (parsedSubtitles.length > 0) {
      this.subtitles = parsedSubtitles
      this.sourceLanguage = data.lang || 'en'
      this.stopAutoClick()
    }
  }

  getSourceLanguage(): string {
    return this.sourceLanguage
  }

  private startAutoClickSubtitleButton() {
    this.tryClickSubtitleButton()

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    let attempts = 0
    this.checkInterval = setInterval(() => {
      this.tryClickSubtitleButton()
      attempts++

      if (attempts > 15) {
        this.stopAutoClick()
        logger.warn('[XhrInterceptFetcher] 字幕按钮点击超时')
      }
    }, 1000)
  }

  private stopAutoClick() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  private parseSubtitleData(events: YoutubeTimedText[] = []): YoutubeSubtitle[] {
    const result: YoutubeSubtitle[] = []

    for (const event of events) {
      if (!event.segs)
        continue

      const baseStartMs = event.tStartMs

      for (let i = 0; i < event.segs.length; i++) {
        const seg = event.segs[i]
        let text = seg.utf8

        if (text) {
          text = text.replace(/\n/g, ' ').replace(/>>/g, '').trim()
        }

        if (!text)
          continue

        const offsetMs = seg.tOffsetMs || 0
        const startTime = baseStartMs + offsetMs

        let endTime: number
        if (i + 1 < event.segs.length) {
          const nextOffset = event.segs[i + 1].tOffsetMs || 0
          endTime = baseStartMs + nextOffset
        }
        else {
          const durationMs = event.dDurationMs || 0
          endTime = durationMs > 0 ? startTime + (durationMs - offsetMs) : startTime + 300
        }

        result.push({
          text,
          start: startTime,
          end: endTime,
        })
      }
    }

    return result
  }

  private parseInterceptedSubtitle(payload: string): YoutubeSubtitle[] {
    try {
      const subtitleResponse: YoutubeSubtitleResponse = JSON.parse(payload)
      return this.parseSubtitleData(subtitleResponse.events)
    }
    catch (error) {
      console.error('[YouTube Subtitle] 解析字幕失败:', error)
      return []
    }
  }

  private tryClickSubtitleButton() {
    const ccButton = document.querySelector('.ytp-subtitles-button')

    if (ccButton instanceof HTMLElement) {
      const isPressed = ccButton.getAttribute('aria-pressed') === 'true'
      !isPressed && ccButton.click()
    }
  }
}
