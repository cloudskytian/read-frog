import { memo, use } from 'react'
import { StateMessage } from './state-message'
import { SubtitlesContext } from './subtitles-context'
import { SubtitlesView } from './subtitles-view'

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
