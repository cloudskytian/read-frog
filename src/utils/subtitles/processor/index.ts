import type { SubtitlesFragment } from '../types'
import type { Config } from '@/types/config/config'
import type { ProviderConfig } from '@/types/config/provider'
import { isLLMTranslateProviderConfig } from '@/types/config/provider'
import { getProviderConfigById } from '@/utils/config/helpers'
import { getLocalConfig } from '@/utils/config/storage'
import { Sha256Hex } from '@/utils/hash'
import { buildHashComponents, getOrFetchArticleData } from '@/utils/host/translate/translate-text'
import { sendMessage } from '@/utils/message'
import { optimizeSubtitles } from './optimizer'

export class SubtitlesProcessor {
  private sourceLanguage: string = ''
  private kind: string = ''
  private currentSubtitles: SubtitlesFragment[] = []

  private enableContext: boolean = false
  private articleTitle: string = ''
  private subtitlesTextContent: string = ''

  setSourceLanguage(language: string) {
    this.sourceLanguage = language
  }

  setKind(kind: string) {
    this.kind = kind
  }

  private async initializeContextConfig(
    config: Config,
    providerConfig?: ProviderConfig,
  ): Promise<void> {
    this.enableContext = !!config?.translate.enableAIContentAware
    this.articleTitle = ''
    this.subtitlesTextContent = ''

    if (providerConfig && isLLMTranslateProviderConfig(providerConfig) && this.enableContext) {
      const articleData = await getOrFetchArticleData(this.enableContext)
      if (articleData) {
        this.articleTitle = articleData.title
      }
      if (this.currentSubtitles.length > 0) {
        this.subtitlesTextContent = this.currentSubtitles.map(s => s.text).join('\n')
      }
    }
  }

  async process(fragments: SubtitlesFragment[]): Promise<SubtitlesFragment[]> {
    const config = await getLocalConfig()
    if (!config) {
      return this.fallbackToOriginal(fragments)
    }

    const { providerConfig, langConfig } = await this.getTranslationConfig(config)

    if (this.kind === 'asr') {
      this.currentSubtitles = optimizeSubtitles(fragments, this.sourceLanguage)
    }
    else {
      this.currentSubtitles = fragments
    }

    if (this.currentSubtitles.length === 0) {
      return this.fallbackToOriginal(fragments)
    }

    await this.initializeContextConfig(config, providerConfig)

    const translationPromises = this.currentSubtitles.map(subtitle =>
      this.translateSubtitle(subtitle.text, langConfig, providerConfig),
    )

    const translations = await Promise.all(translationPromises)

    this.currentSubtitles = this.currentSubtitles.map((subtitle, index) => ({
      ...subtitle,
      translation: translations[index],
    }))

    return this.currentSubtitles
  }

  private async translateSubtitle(
    text: string,
    langConfig: Config['language'],
    providerConfig?: ProviderConfig,
  ): Promise<string> {
    if (!providerConfig) {
      return ''
    }

    const hashComponents = await buildHashComponents(
      text,
      providerConfig,
      { sourceCode: langConfig.sourceCode, targetCode: langConfig.targetCode },
      this.enableContext,
      { title: this.articleTitle, textContent: this.subtitlesTextContent },
    )

    return await sendMessage('enqueueTranslateRequest', {
      text,
      langConfig,
      providerConfig,
      scheduleAt: Date.now(),
      hash: Sha256Hex(...hashComponents),
      articleTitle: this.articleTitle,
      articleTextContent: this.subtitlesTextContent,
    })
  }

  private async getTranslationConfig(config: Config) {
    const providerId = config.translate.providerId
    const providerConfig = getProviderConfigById(config.providersConfig, providerId)

    return {
      providerConfig,
      langConfig: config.language,
    }
  }

  private fallbackToOriginal(fragments: SubtitlesFragment[]): SubtitlesFragment[] {
    return fragments.map(fragment => ({
      ...fragment,
      translation: '',
    }))
  }
}
