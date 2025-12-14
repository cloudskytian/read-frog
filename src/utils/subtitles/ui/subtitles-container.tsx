import type { StateData, SubtitlesFragment, SubtitlesState } from '@/utils/subtitles/types'
import { i18n } from '#imports'
import { createContext, memo, use } from 'react'
import { StateMessage } from './state-message'
import { SubtitlesView } from './subtitles-view'

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

export const STATE_CONFIG: Record<SubtitlesState, { color: string, getText: () => string }> = {
  idle: {
    color: 'oklch(100% 0 0)',
    getText: () => i18n.t('subtitles.state.idle'),
  },
  fetching: {
    color: 'oklch(70% 0.19 250)',
    getText: () => i18n.t('subtitles.state.fetching'),
  },
  fetchSuccess: {
    color: 'oklch(70% 0.17 165)',
    getText: () => i18n.t('subtitles.state.fetchSuccess'),
  },
  fetchFailed: {
    color: 'oklch(63% 0.24 25)',
    getText: () => i18n.t('subtitles.state.fetchFailed'),
  },
  processing: {
    color: 'oklch(70% 0.19 250)',
    getText: () => i18n.t('subtitles.state.processing'),
  },
  completed: {
    color: 'oklch(70% 0.17 165)',
    getText: () => i18n.t('subtitles.state.completed'),
  },
  error: {
    color: 'oklch(63% 0.24 25)',
    getText: () => i18n.t('subtitles.state.error'),
  },
}

export const SubtitlesContainer = memo(() => {
  const { subtitle, stateData, isVisible } = use(SubtitlesContext)!
  if (!isVisible) {
    return null
  }

  if (stateData && stateData.state !== 'idle') {
    return <StateMessage />
  }

  if (subtitle) {
    return <SubtitlesView />
  }

  return null
})
