import React from 'react'
import themeCSS from '@/assets/styles/theme.css?inline'
import { createReactShadowHost } from '@/utils/react-shadow-host/create-shadow-host'
import { SubtitleToggleButton } from '../ui/subtitles-translate-button'

export const SUBTITLES_TRANSLATE_BUTTON_CONTAINER_ID = 'read-frog-subtitles-translate-button-container'

const wrapperCSS = `
  :host {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    height: 100%;
    margin: 0;
    padding: 0;
  }
  .light, .dark {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
  }
`

export function renderSubtitlesTranslateButton(
  onToggle: (enabled: boolean) => void,
  onTranslate: () => void,
): HTMLDivElement {
  const existingContainer = document.querySelector<HTMLDivElement>(`#${SUBTITLES_TRANSLATE_BUTTON_CONTAINER_ID}`)

  if (existingContainer) {
    return existingContainer
  }

  const component = React.createElement(SubtitleToggleButton, {
    onToggle,
    onTranslate,
  })

  const shadowHost = createReactShadowHost(component, {
    position: 'inline',
    inheritStyles: false,
    cssContent: [themeCSS, wrapperCSS],
  }) as HTMLDivElement

  shadowHost.id = SUBTITLES_TRANSLATE_BUTTON_CONTAINER_ID

  return shadowHost
}
