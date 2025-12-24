import type { StateData, SubtitlesFragment, SubtitlesState } from '@/utils/subtitles/types'
import { atom, createStore } from 'jotai'

export const subtitlesStore = createStore()

// Batch translation types
export type BatchState = Extract<SubtitlesState, 'idle' | 'processing' | 'completed' | 'error'>

export interface TranslationBatch {
  id: number
  startMs: number
  endMs: number
  state: BatchState
  fragments: SubtitlesFragment[]
}

// Batch translation atoms
export const translationBatchesAtom = atom<TranslationBatch[]>([])
export const currentTranslatingBatchIdAtom = atom<number | null>(null)

export const translationProgressAtom = atom((get) => {
  const batches = get(translationBatchesAtom)
  if (batches.length === 0)
    return { completed: 0, total: 0 }
  const completed = batches.filter(b => b.state === 'completed').length
  return { completed, total: batches.length }
})

export const currentSubtitleAtom = atom<SubtitlesFragment | null>(null)

export const subtitlesStateAtom = atom<StateData | null>(null)

export const subtitlesVisibleAtom = atom<boolean>(false)

export const subtitlesDisplayAtom = atom((get) => {
  const subtitle = get(currentSubtitleAtom)
  const stateData = get(subtitlesStateAtom)
  const isVisible = get(subtitlesVisibleAtom)

  return {
    subtitle,
    stateData,
    isVisible,
  }
})
