import type { StateData, Subtitle, SubtitleState } from './types'
import { i18n } from '#imports'

interface SubtitleDisplayProps {
  subtitle: Subtitle | null
  stateData: StateData | null
}

const STATE_COLORS: Record<SubtitleState, string> = {
  idle: '#fff',
  fetching: '#3ea6ff',
  fetch_success: '#10b981',
  fetch_failed: '#ef4444',
  processing: '#3ea6ff',
  completed: '#10b981',
  error: '#ef4444',
}

function getStateText(state: SubtitleState): string {
  switch (state) {
    case 'idle':
      return i18n.t('subtitle.state.idle')
    case 'fetching':
      return i18n.t('subtitle.state.fetching')
    case 'fetch_success':
      return i18n.t('subtitle.state.fetchSuccess')
    case 'fetch_failed':
      return i18n.t('subtitle.state.fetchFailed')
    case 'processing':
      return i18n.t('subtitle.state.processing')
    case 'completed':
      return i18n.t('subtitle.state.completed')
    case 'error':
      return i18n.t('subtitle.state.error')
  }
}

function SubtitleContent({ subtitle }: { subtitle: Subtitle }) {
  const originalLines = subtitle.text.split('\n').filter(line => line.trim())
  const translationLines = subtitle.translation
    ? subtitle.translation.split('\n').filter(line => line.trim())
    : []

  return (
    <>
      {originalLines.map((line, index) => {
        const translation = translationLines[index] || ''
        const key = `subtitle-line-${line.substring(0, 20)}-${translation.substring(0, 20)}`

        return (
          <div
            key={key}
            style={{
              width: 'fit-content',
              margin: '4px auto',
              background: 'rgba(0,0,0,0.75)',
              color: '#fff',
              padding: '6px 8px',
              borderRadius: '4px',
            }}
          >
            {translation && (
              <div style={{ fontSize: '24px', lineHeight: '1.2', marginBottom: '4px' }}>
                {translation}
              </div>
            )}
            <div
              style={{
                lineHeight: '1.3',
                fontSize: translation ? '18px' : '24px',
                opacity: translation ? 0.8 : 1,
              }}
            >
              {line}
            </div>
          </div>
        )
      })}
    </>
  )
}

function StateMessage({ stateData }: { stateData: StateData }) {
  const color = STATE_COLORS[stateData.state]
  const message = stateData.message || getStateText(stateData.state)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.85)',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 500,
        color,
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(10px)',
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}
    >
      <div>{message}</div>
    </div>
  )
}

export function SubtitleDisplay({ subtitle, stateData }: SubtitleDisplayProps) {
  if (stateData && stateData.state !== 'idle') {
    return (
      <div
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '24px',
          paddingBottom: '24px',
        }}
      >
        <StateMessage stateData={stateData} />
      </div>
    )
  }

  if (subtitle) {
    return (
      <div
        style={{
          display: 'flex',
          width: '100%',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: '24px',
        }}
      >
        <SubtitleContent subtitle={subtitle} />
      </div>
    )
  }

  return null
}
