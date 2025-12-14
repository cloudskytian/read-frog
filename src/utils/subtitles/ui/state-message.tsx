import { memo, use } from 'react'
import { STATE_CONFIG, SubtitlesContext } from './subtitles-container'

export const StateMessage = memo(() => {
  const { stateData } = use(SubtitlesContext)!

  if (!stateData || stateData.state === 'idle') {
    return null
  }

  const { color, getText } = STATE_CONFIG[stateData.state]
  const message = stateData.message || getText()

  return (
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
      style={{
        fontFamily: '"YouTube Noto", Roboto, "Arial Unicode Ms", Arial, Helvetica, Verdana, "PT Sans Caption", sans-serif',
      }}
    >
      <div
        className="flex items-center justify-center px-3 py-2 rounded-md text-base font-medium whitespace-nowrap leading-tight backdrop-blur-sm bg-black/85 shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
        style={{ color }}
      >
        {message}
      </div>
    </div>
  )
})
