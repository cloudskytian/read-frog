import { useState } from 'react'
import ReactDOM from 'react-dom/client'
import logo from '@/assets/icons/original/read-frog.png'

interface SubtitleToggleButtonProps {
  onToggle: (enabled: boolean) => void
  onTranslate: () => void
}

function SubtitleToggleButton({ onToggle, onTranslate }: SubtitleToggleButtonProps) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [hasStartedTranslation, setHasStartedTranslation] = useState(false)

  const handleClick = () => {
    if (!hasStartedTranslation) {
      setHasStartedTranslation(true)
      setIsEnabled(true)
      onTranslate()
      onToggle(true)
    }
    else {
      const newState = !isEnabled
      setIsEnabled(newState)
      onToggle(newState)
    }
  }

  return (
    <button
      type="button"
      title={hasStartedTranslation ? (isEnabled ? 'Hide Subtitles' : 'Show Subtitles') : 'Start Subtitle Translation'}
      aria-label="Subtitle Translation Toggle"
      onClick={handleClick}
      style={{
        width: '48px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
    >
      <img
        src={logo}
        alt="Subtitle Toggle"
        style={{
          width: '32px',
          height: '32px',
          opacity: isEnabled ? 1 : 0.5,
          transition: 'opacity 200ms ease',
          objectFit: 'contain',
          display: 'block',
        }}
      />
      {hasStartedTranslation && (
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            width: '6px',
            height: '6px',
            borderRadius: '9999px',
            transition: 'background-color 200ms ease',
            backgroundColor: isEnabled ? '#3ea6ff' : '#4b5563',
          }}
        />
      )}
    </button>
  )
}

const TRANSLATE_BUTTON_CONTAINER_ID = 'read-frog-subtitle-translate-button-container'

export function renderSubtitleToggleButton(
  onToggle: (enabled: boolean) => void,
  onTranslate: () => void,
): HTMLDivElement {
  const existingContainer = document.querySelector<HTMLDivElement>(`#${TRANSLATE_BUTTON_CONTAINER_ID}`)

  if (existingContainer) {
    return existingContainer
  }

  const container = document.createElement('div')
  container.id = TRANSLATE_BUTTON_CONTAINER_ID
  container.className = 'inline-block'

  const root = ReactDOM.createRoot(container)
  root.render(
    <SubtitleToggleButton onToggle={onToggle} onTranslate={onTranslate} />,
  )

  return container
}
