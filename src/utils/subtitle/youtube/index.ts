import type { YoutubeSubtitle } from './types'
import { isLLMTranslateProviderConfig } from '@/types/config/provider'
import { getConfigFromStorage } from '@/utils/config/config'
import { getProviderConfigById } from '@/utils/config/helpers'
import { generateArticleSummary } from '@/utils/content/summary'
import { logger } from '@/utils/logger'
import { getTranslateModelById } from '@/utils/providers/model'
import { SubtitleProcessor } from '@/utils/subtitle/processor'
import { prepareSubtitleFragments } from '@/utils/subtitle/processor/helper'
import { renderTranslateButton } from '../render-translate-button'
import { fetchVideoId, fetchYoutubeSubtitles } from './fetch-subtitles'
import { SubtitleRenderer } from './subtitle-renderer'

export class YoutubeAdapter {
  VIDEO_SELECTOR = 'video.html5-main-video'
  RIGHT_CONTROLS_SELECTOR = '.ytp-right-controls'

  private videoElement: HTMLVideoElement | null = null
  private videoId: string = ''
  private fullTranscriptText: string = ''
  private originalSubtitles: YoutubeSubtitle[] = []
  private optimizedSubtitles: YoutubeSubtitle[] = []
  private subtitleRenderer: SubtitleRenderer | null = null

  initialize() {
    this.videoElement = document.querySelector(this.VIDEO_SELECTOR)
    this.videoId = fetchVideoId()
    this.renderTranslateButton()
  }

  private renderTranslateButton() {
    const rightControls = document.querySelector(this.RIGHT_CONTROLS_SELECTOR)
    if (!rightControls)
      return

    const subtitleTranslateButton = renderTranslateButton()
    subtitleTranslateButton.addEventListener('click', () => this.startTranslate())
    rightControls.insertBefore(subtitleTranslateButton, rightControls.firstChild)
  }

  private async startTranslate() {
    try {
      this.originalSubtitles = await fetchYoutubeSubtitles()
      this.extractFullTranscriptText()
      this.startSubtitleRenderer()
      await this.optimizeSubtitlesWithAI()
    }
    catch (error) {
      this.emitError(error as Error)
    }
  }

  private extractFullTranscriptText() {
    this.fullTranscriptText = this.originalSubtitles.map(subtitle => subtitle.text).join('')
    logger.log('[YoutubeAdapter] Full transcript extracted', {
      length: this.fullTranscriptText.length,
    })
  }

  private async generateSummary() {
    const config = await getConfigFromStorage()
    if (!config)
      return ''

    const title = document.title || ''

    const providerId = config.translate.providerId
    const providerConfig = getProviderConfigById(config.providersConfig, providerId)

    if (!providerConfig || !isLLMTranslateProviderConfig(providerConfig))
      return ''

    return await generateArticleSummary(title, this.fullTranscriptText, providerConfig)
  }

  private async optimizeSubtitlesWithAI() {
    const config = await getConfigFromStorage()
    if (!config) {
      logger.warn('[YoutubeAdapter] No config found, skipping optimization')
      this.optimizedSubtitles = this.originalSubtitles
      return
    }

    const providerId = config.translate.providerId
    const providerConfig = getProviderConfigById(config.providersConfig, providerId)

    if (!providerConfig || !isLLMTranslateProviderConfig(providerConfig)) {
      logger.warn('[YoutubeAdapter] No LLM provider config found, skipping optimization')
      this.optimizedSubtitles = this.originalSubtitles
      return
    }

    try {
      // 准备 SubtitleFragment 格式
      const fragments = prepareSubtitleFragments(
        this.originalSubtitles.map(sub => ({
          text: sub.text,
          start: sub.start,
          end: sub.end,
        })),
      )

      // 从 providerConfig 获取模型实例
      const model = await getTranslateModelById(providerConfig.id)

      // 创建 SubtitleProcessor 实例
      const processor = new SubtitleProcessor({
        model,
        batchSize: 200, // 写死 batch size
        overlapSize: 15, // 写死 overlap size
      })

      logger.info('[YoutubeAdapter] Starting subtitle processing...', {
        totalFragments: fragments.length,
        batchSize: 200,
        overlapSize: 15,
      })

      // 处理字幕
      const processedSentences = await processor.process(fragments, {
        onProgress: (current, total) => {
          logger.info(`[YoutubeAdapter] Processing batch ${current}/${total}`)
        },
        onUpdate: (sentences) => {
          // 实时更新：将新处理的句子转换为 YoutubeSubtitle 格式并回调
          const lastSentence = sentences[sentences.length - 1]
          if (lastSentence) {
            const subtitle: YoutubeSubtitle = {
              text: lastSentence.english,
              start: lastSentence.startTime,
              end: lastSentence.endTime,
              translation: lastSentence.translation,
            }
            this.optimizedSubtitles.push(subtitle)
            logger.log('[YoutubeAdapter] Added subtitle to optimizedSubtitles cache', subtitle)
            this.subtitleRenderer?.addSubtitle(subtitle)
          }
        },
      })

      logger.info('[YoutubeAdapter] Processing complete', {
        original: this.originalSubtitles.length,
        optimized: processedSentences.length,
      })
    }
    catch (error) {
      logger.error('[YoutubeAdapter] Processing failed:', error)
      this.optimizedSubtitles = this.originalSubtitles
    }
  }

  private startSubtitleRenderer() {
    if (!this.videoElement) {
      logger.error('[YoutubeAdapter] Video element not found')
      return
    }

    if (this.subtitleRenderer) {
      this.subtitleRenderer.stop()
    }
    this.subtitleRenderer = new SubtitleRenderer(this.videoElement)
    this.subtitleRenderer.start([])
  }

  private emitError(error: Error): void {
    logger.error(`[YoutubeSubtitle] ${error.message}`)
  }
}
