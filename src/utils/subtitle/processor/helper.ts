export interface SubtitleFragment {
  originalKey: string
  text: string
  start: number
  end: number
  globalIndex: number
  [key: string]: any
}

export interface RawSubtitleFragment {
  text: string
  start: number
  end: number
  [key: string]: any
}

export interface ProcessedSentence {
  english: string
  translation: string
  keys: string[]
  startTime: number
  endTime: number
  lastSegIndex: number
  keySet: Set<string>
}

export interface ProcessorConfig {
  model?: string | any
  batchSize?: number
  overlapSize?: number
}

export interface ProcessOptions {
  onProgress?: (current: number, total: number) => void
  onUpdate?: (sentences: ProcessedSentence[]) => void
  signal?: AbortSignal
}

interface ChunkData {
  fragments: SubtitleFragment[]
  startIndex: number
  isLastBatch: boolean
}

interface ParsedSentence {
  english: string
  chinese: string
  ids: string[]
}

export const PROMPT_TEMPLATE = {
  SYSTEM: (currentBatch: number, totalBatches: number) => `You are a professional subtitle alignment and translation engine.
I'm giving you a batch of fragmented subtitle words (Batch ${currentBatch}/${totalBatches}).
Note: To ensure context continuity, this batch overlaps with the previous/next batch.

Tasks:
1. **Semantic Reconstruction**: Reconstruct complete English sentences.
2. **Translation**: Translate into Chinese.
3. **ID Tracking**: List the IDs.

Key Strategies:
- **Force line breaks at punctuation**: Must break at . ? ! ... or 。？！
- **Control sentence length**: Keep sentences concise.
- Try to complete truncated beginnings, make incomplete endings as complete as possible.

Output Format (plain text markers):
[EN] English...
[CN] Chinese...
[IDS] id1, id2`,
} as const

const MIN_OVERLAP_RATIO = 0.05

export function createOverlappingChunks(
  fragments: SubtitleFragment[],
  batchSize: number,
  overlapSize: number,
): ChunkData[] {
  const safeOverlap = Math.min(
    overlapSize,
    Math.max(0, Math.floor(batchSize * MIN_OVERLAP_RATIO)),
  )

  const stepSize = batchSize - safeOverlap

  if (stepSize <= 0) {
    return createOverlappingChunks(
      fragments,
      batchSize,
      Math.floor(batchSize * MIN_OVERLAP_RATIO),
    )
  }

  const chunks: ChunkData[] = []

  for (let i = 0; i < fragments.length; i += stepSize) {
    const chunkFragments = fragments.slice(i, i + batchSize)

    if (chunkFragments.length === 0)
      break

    chunks.push({
      fragments: chunkFragments,
      startIndex: i,
      isLastBatch: i + batchSize >= fragments.length,
    })

    if (i + batchSize >= fragments.length)
      break
  }

  return chunks
}

export function parseAIResponse(content: string): ParsedSentence[] {
  const sentences: ParsedSentence[] = []

  try {
    const sections = content.split('[EN]').filter(s => s.trim())

    for (const section of sections) {
      const cnSplit = section.split('[CN]')
      if (cnSplit.length < 2)
        continue

      const englishText = cnSplit[0].trim()
      const remainingText = cnSplit[1]

      const idsSplit = remainingText.split('[IDS]')
      if (idsSplit.length < 2)
        continue

      const chineseText = idsSplit[0].trim()
      const idsText = idsSplit[1].trim()

      const ids = idsText
        .split(/[,，、\s]+/)
        .map(id => id.trim())
        .filter(Boolean)

      if (englishText && ids.length > 0) {
        sentences.push({
          english: englishText,
          chinese: chineseText,
          ids,
        })
      }
    }
  }
  catch (error) {
    console.warn('解析 AI 响应时出现警告:', error)
  }

  return sentences
}

export function buildSentenceObject(
  parsed: ParsedSentence,
  fragments: SubtitleFragment[],
): ProcessedSentence | null {
  const { ids, english, chinese } = parsed

  if (!ids || ids.length === 0)
    return null

  const firstId = ids[0]
  const lastId = ids[ids.length - 1]

  const firstFragment = fragments.find(f => f.originalKey === firstId)
  const lastFragment = fragments.find(f => f.originalKey === lastId)

  if (!firstFragment || !lastFragment)
    return null

  return {
    english,
    translation: chinese,
    keys: ids,
    startTime: firstFragment.start,
    endTime: lastFragment.end,
    lastSegIndex: lastFragment.globalIndex,
    keySet: new Set(ids),
  }
}

export function isSentenceInSafeZone(
  sentence: ProcessedSentence | null,
  safeEndIndex: number,
  isLastBatch: boolean,
): boolean {
  if (!sentence)
    return false
  if (isLastBatch)
    return true
  return sentence.lastSegIndex < safeEndIndex
}

export function mergeWithOverlapHandling(
  accumulated: ProcessedSentence[],
  newSentence: ProcessedSentence,
): ProcessedSentence[] {
  if (accumulated.length === 0) {
    return [newSentence]
  }

  const lastSentence = accumulated[accumulated.length - 1]

  const overlapCount = newSentence.keys.filter(key =>
    lastSentence.keySet.has(key),
  ).length

  if (overlapCount > 0) {
    return [...accumulated.slice(0, -1), newSentence]
  }

  return [...accumulated, newSentence]
}

export function formatFragmentsForAI(fragments: SubtitleFragment[]): Array<{ id: string, t: string }> {
  return fragments.map(fragment => ({
    id: fragment.originalKey,
    t: fragment.text,
  }))
}

function generateRandomKey(index: number): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 10)
  return `${timestamp}_${index}_${random}`
}

export function prepareSubtitleFragments(rawFragments: RawSubtitleFragment[]): SubtitleFragment[] {
  return rawFragments.map((fragment, index) => ({
    ...fragment,
    originalKey: generateRandomKey(index),
    globalIndex: index,
  }))
}
