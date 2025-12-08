import type { SubtitleFragment } from './helper'

export interface SegmentedSubtitle {
  text: string
  start: number
  end: number
}

const PRE_MERGE_GAP = 250
const ABSOLUTE_MAX_GAP = 5000
const HARD_LIMIT_CHARS = 300
const DEFAULT_LANGUAGE = 'en'

function isCJK(char: string): boolean {
  if (!char)
    return false
  return /[\u4E00-\u9FA5\u3040-\u30FF\uAC00-\uD7AF]/.test(char)
}

function endsWithPeriod(text: string): boolean {
  return /[.!?。！？]$/.test(text.trim())
}

function preMergeFragments(fragments: SubtitleFragment[]): SubtitleFragment[] {
  if (fragments.length === 0)
    return []

  const merged: SubtitleFragment[] = [{ ...fragments[0] }]

  for (let i = 1; i < fragments.length; i++) {
    const prev = merged[merged.length - 1]
    const curr = fragments[i]

    const gap = curr.start - prev.end

    if (gap < PRE_MERGE_GAP && !endsWithPeriod(prev.text)) {
      const lastChar = prev.text.slice(-1)
      const nextChar = curr.text[0]
      const spacer = (isCJK(lastChar) && isCJK(nextChar)) ? '' : ' '

      prev.text += spacer + curr.text
      prev.end = curr.end
    }
    else {
      merged.push({ ...curr })
    }
  }

  return merged
}

export function segmentSubtitles(
  fragments: SubtitleFragment[],
  language: string = DEFAULT_LANGUAGE,
): SegmentedSubtitle[] {
  const mergedFragments = preMergeFragments(fragments)
  const subtitles: SegmentedSubtitle[] = []
  const segmenter = new Intl.Segmenter(language, { granularity: 'sentence' })

  let bufferText = ''
  let bufferStart: number | null = null
  let bufferEnd: number | null = null

  const flushBuffer = () => {
    const trimmed = bufferText.trim()
    if (trimmed && bufferStart !== null && bufferEnd !== null) {
      subtitles.push({
        text: trimmed,
        start: bufferStart,
        end: bufferEnd,
      })
      bufferText = ''
      bufferStart = null
      bufferEnd = null
    }
  }

  mergedFragments.forEach((fragment) => {
    const { text, start, end } = fragment

    if (bufferEnd !== null) {
      const gap = start - bufferEnd
      if (gap > ABSOLUTE_MAX_GAP) {
        flushBuffer()
      }
    }

    if (bufferStart === null) {
      bufferStart = start
    }

    if (bufferText.length > 0) {
      const lastChar = bufferText.slice(-1)
      const nextChar = text[0]
      let shouldAddSpace = true

      if (isCJK(lastChar) && isCJK(nextChar)) {
        shouldAddSpace = false
      }
      if (/^[.,?!]/.test(nextChar)) {
        shouldAddSpace = false
      }

      if (shouldAddSpace) {
        bufferText += ' '
      }
    }

    bufferText += text
    bufferEnd = end

    const segments = Array.from(segmenter.segment(bufferText.trim()))

    if (segments.length > 1) {
      while (segments.length > 1) {
        const confirmedSentence = segments.shift()!
        const sentenceText = confirmedSentence.segment.trim()

        if (sentenceText && bufferStart !== null && bufferEnd !== null) {
          subtitles.push({
            text: sentenceText,
            start: bufferStart,
            end: bufferEnd,
          })
        }

        bufferText = segments.map(s => s.segment).join('')
        bufferStart = bufferEnd
      }
    }

    if (bufferText.length > HARD_LIMIT_CHARS) {
      flushBuffer()
    }
  })

  flushBuffer()

  return subtitles
}
