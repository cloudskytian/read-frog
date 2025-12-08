import type { SegmentedSubtitle } from './segmenter'

export interface CacheEntry {
  subtitles: SegmentedSubtitle[]
  timestamp: number
  targetLanguage: string
}

export class SubtitleCache {
  private cache = new Map<string, CacheEntry>()
  private maxAge: number

  constructor(maxAge: number = 1000 * 60 * 60) {
    this.maxAge = maxAge
  }

  generateKey(videoId: string, targetLanguage: string): string {
    return `${videoId}:${targetLanguage}`
  }

  get(videoId: string, targetLanguage: string): SegmentedSubtitle[] | null {
    const key = this.generateKey(videoId, targetLanguage)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key)
      return null
    }

    return entry.subtitles
  }

  set(videoId: string, targetLanguage: string, subtitles: SegmentedSubtitle[]): void {
    const key = this.generateKey(videoId, targetLanguage)
    this.cache.set(key, {
      subtitles,
      timestamp: Date.now(),
      targetLanguage,
    })
  }

  clear(videoId: string, targetLanguage: string): void {
    const key = this.generateKey(videoId, targetLanguage)
    this.cache.delete(key)
  }

  clearAll(): void {
    this.cache.clear()
  }

  clearExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key)
      }
    }
  }
}

export const subtitleCache = new SubtitleCache()
