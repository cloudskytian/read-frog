import type { ProcessedSentence, ProcessOptions, ProcessorConfig, SubtitleFragment } from './helper'
import type { SegmentedSubtitle } from './segmenter'
import type { Config } from '@/types/config/config'
import type { ProviderConfig } from '@/types/config/provider'
import { isLLMTranslateProviderConfig } from '@/types/config/provider'
import { getConfigFromStorage } from '@/utils/config/config'
import { getProviderConfigById } from '@/utils/config/helpers'
import { Sha256Hex } from '@/utils/hash'
import { sendMessage } from '@/utils/message'
import { subtitleCache } from './cache'
import { validateFragmentsContinuity } from './helper'
import { segmentSubtitles } from './segmenter'

export class SubtitleProcessor {
  private videoId: string = ''
  private videoTitle: string = ''
  private sourceLanguage: string = 'en'
  private currentSubtitles: SegmentedSubtitle[] = []

  constructor(_config: ProcessorConfig = {}) {}

  setVideoId(videoId: string) {
    this.videoId = videoId
  }

  setVideoTitle(title: string) {
    this.videoTitle = title
  }

  setSourceLanguage(language: string) {
    this.sourceLanguage = language
  }

  async process(
    fragments: SubtitleFragment[],
    options: ProcessOptions = {},
  ): Promise<ProcessedSentence[]> {
    const { onProgress, signal } = options

    const validation = validateFragmentsContinuity(fragments)
    if (!validation.isValid) {
      throw new Error(`Fragment validation failed: ${validation.errors.join('; ')}`)
    }

    const config = await getConfigFromStorage()
    if (!config) {
      return this.fallbackToOriginal(fragments)
    }

    const { providerConfig, langConfig } = await this.getTranslationConfig(config)
    if (!providerConfig) {
      return this.fallbackToOriginal(fragments)
    }

    const cacheKey = `${langConfig.sourceCode}-${langConfig.targetCode}`
    if (this.videoId) {
      const cached = subtitleCache.get(this.videoId, cacheKey)
      if (cached) {
        onProgress?.(100, 'Loaded from cache')
        return cached as ProcessedSentence[]
      }
    }

    onProgress?.(10, 'Segmenting subtitles...')
    this.currentSubtitles = segmentSubtitles(fragments, this.sourceLanguage)

    if (this.currentSubtitles.length === 0) {
      return this.fallbackToOriginal(fragments)
    }

    onProgress?.(20, 'Translating...')
    const translationPromises = this.currentSubtitles.map((subtitle) => {
      if (signal?.aborted) {
        throw new Error('Translation aborted')
      }

      return this.translateSubtitle(subtitle.text, langConfig, providerConfig)
    })

    const translations = await Promise.all(translationPromises)

    const translatedSubtitles: ProcessedSentence[] = this.currentSubtitles.map((subtitle, index) => ({
      text: subtitle.text,
      translation: translations[index],
      start: subtitle.start,
      end: subtitle.end,
    }))

    if (this.videoId) {
      subtitleCache.set(this.videoId, cacheKey, translatedSubtitles)
    }

    this.currentSubtitles = []

    onProgress?.(100, 'Processing complete')
    return translatedSubtitles
  }

  async clearCache() {
    if (this.videoId) {
      try {
        const config = await getConfigFromStorage()
        if (config) {
          const cacheKey = `${config.language.sourceCode}-${config.language.targetCode}`
          subtitleCache.clear(this.videoId, cacheKey)
        }
      }
      catch {}
    }
  }

  private async translateSubtitle(
    text: string,
    langConfig: Config['language'],
    providerConfig: ProviderConfig,
  ): Promise<string> {
    const articleTitle = this.videoTitle || this.videoId || 'Video Subtitles'
    let articleTextContent: string | undefined
    let enableContext = false

    try {
      const config = await getConfigFromStorage()
      enableContext = !!config?.translate.enableAIContentAware
      if (enableContext && this.currentSubtitles.length > 0) {
        articleTextContent = this.currentSubtitles.map(s => s.text).join('\n')
      }
    }
    catch {}

    const hash = Sha256Hex(
      text,
      langConfig.sourceCode,
      langConfig.targetCode,
      providerConfig.id,
      enableContext ? 'ctx-on' : 'ctx-off',
    )

    try {
      const result = await sendMessage('enqueueTranslateRequest', {
        text,
        langConfig,
        providerConfig,
        scheduleAt: Date.now(),
        hash,
        articleTitle,
        articleTextContent,
      })
      return result || ''
    }
    catch (error) {
      console.warn('[SubtitleProcessor] Translation failed for subtitle:', text.substring(0, 50), error)
      return ''
    }
  }

  private async getTranslationConfig(config: Config) {
    const providerId = config.translate.providerId
    const providerConfig = getProviderConfigById(config.providersConfig, providerId)

    if (!providerConfig || !isLLMTranslateProviderConfig(providerConfig)) {
      return { providerConfig: null, langConfig: config.language }
    }

    return {
      providerConfig,
      langConfig: config.language,
    }
  }

  private fallbackToOriginal(fragments: SubtitleFragment[]): ProcessedSentence[] {
    return fragments.map(fragment => ({
      ...fragment,
      translation: '',
    }))
  }
}
