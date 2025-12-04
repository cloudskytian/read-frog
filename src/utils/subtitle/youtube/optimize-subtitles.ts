import type { YoutubeSubtitle } from './types'
import type { LLMTranslateProviderConfig } from '@/types/config/provider'
import { logger } from '@/utils/logger'
import { SubtitleProcessor } from '@/utils/subtitle/processor'
import { prepareSubtitleFragments } from '@/utils/subtitle/processor/helper'

export async function optimizeSubtitles(
  originalSubtitles: YoutubeSubtitle[],
  providerConfig: LLMTranslateProviderConfig,
  options?: {
    onSubtitle?: (subtitle: YoutubeSubtitle) => void
  },
): Promise<YoutubeSubtitle[]> {
  if (!originalSubtitles.length) {
    return []
  }

  try {
    const fragments = prepareSubtitleFragments(
      originalSubtitles.map(sub => ({
        text: sub.text,
        start: sub.start,
        end: sub.end,
      })),
    )

    const { models: { translate } } = providerConfig
    const model = translate.isCustomModel ? translate.customModel : translate.model

    const processor = new SubtitleProcessor({
      model: model || 'gpt-4o',
      batchSize: 200,
      overlapSize: 15,
    })

    const processedSentences = await processor.process(fragments, {
      onProgress: (current, total) => {
        logger.info(`[OptimizeSubtitles] Processing batch ${current}/${total}`)
      },
      onUpdate: (sentences) => {
        const lastSentence = sentences[sentences.length - 1]
        if (lastSentence && options?.onSubtitle) {
          const subtitle: YoutubeSubtitle = {
            text: lastSentence.english,
            start: lastSentence.startTime,
            end: lastSentence.endTime,
            translation: lastSentence.translation,
          }
          options.onSubtitle(subtitle)
        }
      },
    })

    const optimizedSubtitles: YoutubeSubtitle[] = processedSentences.map(sentence => ({
      text: sentence.english,
      start: sentence.startTime,
      end: sentence.endTime,
      translation: sentence.translation,
    }))

    return optimizedSubtitles
  }
  catch (error) {
    logger.error('[OptimizeSubtitles] Processing failed:', error)
    return originalSubtitles
  }
}
