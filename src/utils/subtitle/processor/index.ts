import type { LanguageModel } from 'ai'
import type { ProcessedSentence, ProcessOptions, ProcessorConfig, SubtitleFragment } from './helper'
import { generateText } from 'ai'
import { buildSentenceObject, createOverlappingChunks, formatFragmentsForAI, isSentenceInSafeZone, mergeWithOverlapHandling, parseAIResponse, PROMPT_TEMPLATE } from './helper'

const DEFAULT_CONFIG = {
  MODEL: 'gpt-4o',
  BATCH_SIZE: 20,
  OVERLAP_SIZE: 15,
  MIN_OVERLAP_RATIO: 0.05,
  SAFE_ZONE_OFFSET: 5,
  RETRY_ATTEMPTS: 3,
  INITIAL_RETRY_DELAY: 1000,
  BATCH_DELAY: 500,
  MAX_CONCURRENT: 3, // 最大并发请求数
} as const

export class SubtitleProcessor {
  private model: string | LanguageModel
  private batchSize: number
  private overlapSize: number

  constructor(config: ProcessorConfig = {}) {
    this.model = config.model || DEFAULT_CONFIG.MODEL
    this.batchSize = config.batchSize || DEFAULT_CONFIG.BATCH_SIZE
    this.overlapSize = config.overlapSize || DEFAULT_CONFIG.OVERLAP_SIZE
  }

  updateConfig(newConfig: ProcessorConfig): void {
    if (newConfig.model !== undefined) {
      this.model = newConfig.model
    }
    if (newConfig.batchSize !== undefined) {
      this.batchSize = newConfig.batchSize
    }
    if (newConfig.overlapSize !== undefined) {
      this.overlapSize = Math.min(
        newConfig.overlapSize,
        Math.max(0, this.batchSize - 10),
      )
    }
  }

  async process(
    fragments: SubtitleFragment[],
    options: ProcessOptions = {},
  ): Promise<ProcessedSentence[]> {
    const { onProgress, onUpdate, signal } = options

    const chunks = createOverlappingChunks(
      fragments,
      this.batchSize,
      this.overlapSize,
    )

    // 存储所有批次的结果（使用 Map 保证按索引存储）
    const batchResultsMap = new Map<number, ProcessedSentence[]>()
    let completedCount = 0
    let lastProcessedIndex = -1 // 记录已处理到的最后一个连续索引

    // 并发处理批次
    const processBatch = async (chunkIndex: number) => {
      if (signal?.aborted) {
        throw new Error('ABORTED')
      }

      const chunk = chunks[chunkIndex]
      const safeEndIndex = chunk.startIndex + this.batchSize - DEFAULT_CONFIG.SAFE_ZONE_OFFSET

      const aiResponse = await this.callAI(
        chunk.fragments,
        chunkIndex + 1,
        chunks.length,
        signal,
      )

      const parsedSentences = parseAIResponse(aiResponse)
      const validSentences: ProcessedSentence[] = []

      for (const parsed of parsedSentences) {
        const sentence = buildSentenceObject(parsed, fragments)

        if (!isSentenceInSafeZone(sentence, safeEndIndex, chunk.isLastBatch)) {
          continue
        }

        if (sentence) {
          validSentences.push(sentence)
        }
      }

      return { sentences: validSentences, chunkIndex }
    }

    // 累积的已处理结果
    let processedSentences: ProcessedSentence[] = []

    // 使用并发控制处理所有批次
    for (let i = 0; i < chunks.length; i += DEFAULT_CONFIG.MAX_CONCURRENT) {
      if (signal?.aborted) {
        throw new Error('ABORTED')
      }

      // 取当前批次的并发任务
      const batchPromises = []
      for (let j = 0; j < DEFAULT_CONFIG.MAX_CONCURRENT && i + j < chunks.length; j++) {
        batchPromises.push(processBatch(i + j))
      }

      // 等待当前批次完成
      const results = await Promise.allSettled(batchPromises)

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { sentences, chunkIndex } = result.value
          batchResultsMap.set(chunkIndex, sentences)
          completedCount++
          onProgress?.(completedCount, chunks.length)
        }
        else {
          throw result.reason
        }
      }

      // ✅ 处理所有已完成且连续的批次
      while (batchResultsMap.has(lastProcessedIndex + 1)) {
        lastProcessedIndex++
        const sentences = batchResultsMap.get(lastProcessedIndex)!

        for (const sentence of sentences) {
          processedSentences = mergeWithOverlapHandling(processedSentences, sentence)
        }

        // 删除已处理的批次，释放内存
        batchResultsMap.delete(lastProcessedIndex)
      }

      // ✅ 实时更新已处理的结果
      if (onUpdate) {
        onUpdate([...processedSentences])
      }

      // 添加延迟（除了最后一批）
      if (i + DEFAULT_CONFIG.MAX_CONCURRENT < chunks.length) {
        await this.delay(DEFAULT_CONFIG.BATCH_DELAY)
      }
    }

    return processedSentences
  }

  private async callAI(
    fragments: SubtitleFragment[],
    currentBatch: number,
    totalBatches: number,
    signal?: AbortSignal,
  ): Promise<string> {
    const systemPrompt = PROMPT_TEMPLATE.SYSTEM(currentBatch, totalBatches)
    const userInput = JSON.stringify(formatFragmentsForAI(fragments))

    try {
      const { text } = await generateText({
        model: this.model as LanguageModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput },
        ],
        temperature: 0.1,
        abortSignal: signal,
      })

      return text
    }
    catch (error: any) {
      if (error.name === 'AbortError' || signal?.aborted) {
        throw new Error('ABORTED')
      }

      if (error.message?.includes('401') || error.message?.includes('403')) {
        throw new Error('AUTH_ERROR')
      }

      if (error.name === 'TypeError' && error.message?.includes('fetch')) {
        throw new Error('Network Error')
      }

      throw error
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
