import { useAtomValue } from 'jotai'
import { memo } from 'react'
import { subtitlesDisplayAtom } from '../atoms'
import { StateMessage } from './state-message'
import { SubtitlesView } from './subtitles-view'

export const SubtitlesContainer = memo(() => {
  const { subtitle, stateData, isVisible } = useAtomValue(subtitlesDisplayAtom)

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
