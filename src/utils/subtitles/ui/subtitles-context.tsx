import type { StateData, SubtitlesFragment } from '@/utils/subtitles/types'
import { createContext } from 'react'

export interface SubtitlesContextValue {
  subtitle: SubtitlesFragment | null
  stateData: StateData | null
  isVisible: boolean
}

export const SubtitlesContext = createContext<SubtitlesContextValue>({
  subtitle: null,
  stateData: null,
  isVisible: false,
})
