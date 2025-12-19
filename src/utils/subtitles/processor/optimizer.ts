import type { SubtitlesFragment } from '../types'
import { MAX_GAP_MS } from '@/utils/constants/subtitles'

const MAX_SENTENCE_LENGTH = 80
const SPLIT_WORDS = [
  ' and ',
  ' or ',
  ' but ',
  ' so ',
  ' because ',
  ' if ',
  ' when ',
  ' while ',
  ' although ',
  ' though ',
  ' unless ',
  ' until ',
  ' after ',
  ' before ',
  ' since ',
  ' that ',
  ' which ',
  ' who ',
  ' where ',
  ' what ',
]

interface FragmentPosition {
  index: number
  start: number
  end: number
  fragment: SubtitlesFragment
}

interface FragmentRangeResult {
  start: number
  end: number
  usedIndices: number[]
}

function isCJKChar(char: string): boolean {
  if (!char || char.length === 0) {
    return false
  }

  const code = char.charCodeAt(0)

  return (
    // zh
    (code >= 0x4E00 && code <= 0x9FFF)
    // jp
    || (code >= 0x3040 && code <= 0x309F)
    // ja
    || (code >= 0x30A0 && code <= 0x30FF)
    // ko
    || (code >= 0xAC00 && code <= 0xD7AF)
    // ext-a
    || (code >= 0x3400 && code <= 0x4DBF)
    // compat
    || (code >= 0xF900 && code <= 0xFAFF)
  )
}

function needsSpaceBetween(textBefore: string, textAfter: string): boolean {
  if (!textBefore || !textAfter) {
    return false
  }

  if (/\s$/.test(textBefore) || /^\s/.test(textAfter)) {
    return false
  }

  const lastChar = textBefore[textBefore.length - 1]
  const firstChar = textAfter[0]

  if (isCJKChar(lastChar) && isCJKChar(firstChar)) {
    return false
  }

  return true
}

function hasPunctuation(text: string): boolean {
  return /[.!?,;:。？！；：、]/.test(text)
}

function forceSplitLongSentence(text: string): string[] {
  if (text.length <= MAX_SENTENCE_LENGTH || hasPunctuation(text)) {
    return [text]
  }

  // Find the best split point (closest to middle, at a split word)
  const midPoint = text.length / 2
  let bestSplitIndex = -1
  let bestDistance = Infinity

  for (const word of SPLIT_WORDS) {
    let searchStart = 0
    while (true) {
      const index = text.indexOf(word, searchStart)
      if (index === -1)
        break

      const distance = Math.abs(index - midPoint)
      if (distance < bestDistance) {
        bestDistance = distance
        bestSplitIndex = index
      }
      searchStart = index + 1
    }
  }

  if (bestSplitIndex === -1) {
    return [text]
  }

  const firstPart = text.substring(0, bestSplitIndex).trim()
  const secondPart = text.substring(bestSplitIndex).trim()

  if (!firstPart || !secondPart) {
    return [text]
  }

  // Recursively split if parts are still too long
  const firstParts = forceSplitLongSentence(firstPart)
  const secondParts = forceSplitLongSentence(secondPart)

  return [...firstParts, ...secondParts]
}

export function optimizeSubtitles(
  fragments: SubtitlesFragment[],
  language: string,
): SubtitlesFragment[] {
  if (fragments.length === 0)
    return []

  const segmenter = new Intl.Segmenter(language, { granularity: 'sentence' })
  const result: SubtitlesFragment[] = []

  let textBuffer = ''
  let fragmentIndices: number[] = []
  let lastEndTime = fragments[0].start

  for (let i = 0; i < fragments.length; i++) {
    const fragment = fragments[i]
    const gap = fragment.start - lastEndTime

    if (gap > MAX_GAP_MS && textBuffer.trim()) {
      flushBuffer(textBuffer, fragmentIndices, fragments, segmenter, result)
      textBuffer = ''
      fragmentIndices = []
    }

    if (textBuffer) {
      const needsSeparator = needsSpaceBetween(textBuffer, fragment.text)
      textBuffer += needsSeparator ? ` ${fragment.text}` : fragment.text
    }
    else {
      textBuffer = fragment.text
    }
    fragmentIndices.push(i)

    lastEndTime = fragment.end

    const sentences = Array.from(segmenter.segment(textBuffer.trim()))
      .map(s => s.segment.trim())
      .filter(s => s.length > 0)

    if (sentences.length > 1) {
      const firstSentence = sentences[0]
      const firstSentenceEnd = textBuffer.indexOf(firstSentence) + firstSentence.length

      const { start, end, usedIndices } = findFragmentRange(
        0,
        firstSentenceEnd,
        fragmentIndices,
        fragments,
      )

      // Force split long sentences without punctuation
      const splitParts = forceSplitLongSentence(firstSentence)

      if (splitParts.length === 1) {
        result.push({
          text: firstSentence,
          start: Math.round(start),
          end: Math.round(end),
        })
      }
      else {
        const totalLength = splitParts.reduce((sum, part) => sum + part.length, 0)
        const duration = end - start
        let currentStart = start

        for (const part of splitParts) {
          const partDuration = (part.length / totalLength) * duration
          const partEnd = currentStart + partDuration

          result.push({
            text: part,
            start: Math.round(currentStart),
            end: Math.round(partEnd),
          })

          currentStart = partEnd
        }
      }

      const remainingText = textBuffer.substring(firstSentenceEnd).trim()
      textBuffer = remainingText
      fragmentIndices = fragmentIndices.filter(idx => !usedIndices.includes(idx))
    }

    if (i === fragments.length - 1 && textBuffer.trim()) {
      flushBuffer(textBuffer, fragmentIndices, fragments, segmenter, result)
    }
  }

  return result
}

function flushBuffer(
  textBuffer: string,
  fragmentIndices: number[],
  fragments: SubtitlesFragment[],
  segmenter: Intl.Segmenter,
  result: SubtitlesFragment[],
): void {
  const sentences = Array.from(segmenter.segment(textBuffer.trim()))
    .map(s => s.segment.trim())
    .filter(s => s.length > 0)

  let processedLength = 0

  for (const sentence of sentences) {
    const sentenceStart = textBuffer.indexOf(sentence, processedLength)
    const sentenceEnd = sentenceStart + sentence.length

    const { start, end } = findFragmentRange(
      sentenceStart,
      sentenceEnd,
      fragmentIndices,
      fragments,
    )

    // Force split long sentences without punctuation
    const splitParts = forceSplitLongSentence(sentence)

    if (splitParts.length === 1) {
      result.push({
        text: sentence,
        start: Math.round(start),
        end: Math.round(end),
      })
    }
    else {
      // Distribute time proportionally based on text length
      const totalLength = splitParts.reduce((sum, part) => sum + part.length, 0)
      const duration = end - start
      let currentStart = start

      for (const part of splitParts) {
        const partDuration = (part.length / totalLength) * duration
        const partEnd = currentStart + partDuration

        result.push({
          text: part,
          start: Math.round(currentStart),
          end: Math.round(partEnd),
        })

        currentStart = partEnd
      }
    }

    processedLength = sentenceEnd
  }
}

function findFragmentRange(
  startPos: number,
  endPos: number,
  fragmentIndices: number[],
  fragments: SubtitlesFragment[],
): FragmentRangeResult {
  if (fragmentIndices.length === 0) {
    return { start: 0, end: 0, usedIndices: [] }
  }

  const fragmentPositions: FragmentPosition[] = []
  let reconstructedText = ''

  for (let i = 0; i < fragmentIndices.length; i++) {
    const idx = fragmentIndices[i]
    const fragment = fragments[idx]

    const fragStart = reconstructedText.length

    if (reconstructedText) {
      const needsSeparator = needsSpaceBetween(reconstructedText, fragment.text)
      reconstructedText += needsSeparator ? ` ${fragment.text}` : fragment.text
    }
    else {
      reconstructedText = fragment.text
    }

    const fragEnd = reconstructedText.length

    fragmentPositions.push({
      index: idx,
      start: fragStart,
      end: fragEnd,
      fragment,
    })
  }

  const usedFragments = fragmentPositions.filter((fp) => {
    return fp.end > startPos && fp.start < endPos
  })

  if (usedFragments.length === 0) {
    const firstIdx = fragmentIndices[0]
    return {
      start: fragments[firstIdx].start,
      end: fragments[firstIdx].end,
      usedIndices: [firstIdx],
    }
  }

  const firstFragment = usedFragments[0].fragment
  const lastFragment = usedFragments[usedFragments.length - 1].fragment

  return {
    start: firstFragment.start,
    end: lastFragment.end,
    usedIndices: usedFragments.map(f => f.index),
  }
}
