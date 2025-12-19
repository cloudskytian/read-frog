import type { SubtitlesFragment } from '../../types'
import type { YoutubeTimedText } from './types'

/**
 * Parse ASR scrolling subtitle format
 * 1. Skip separators (aAppend: 1)
 * 2. Merge segs for each event
 * 3. Filter special tags
 */
export function parseScrollingAsrSubtitles(events: YoutubeTimedText[]): SubtitlesFragment[] {
  const result: SubtitlesFragment[] = []

  for (const event of events) {
    // Skip separators
    if (event.aAppend === 1)
      continue
    if (!event.segs || event.segs.length === 0)
      continue

    // Merge all segs text
    const text = event.segs.map(s => s.utf8 || '').join('').trim()

    // Filter special tags (e.g. [Music], [Applause])
    if (text.startsWith('[') && text.endsWith(']'))
      continue
    if (!text)
      continue

    // Fix previous fragment's end time to avoid overlap
    const last = result[result.length - 1]
    if (last && last.end > event.tStartMs) {
      last.end = event.tStartMs
    }

    result.push({
      text,
      start: event.tStartMs,
      end: event.tStartMs + (event.dDurationMs || 0),
    })
  }

  return result
}
