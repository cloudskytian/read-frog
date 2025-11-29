import logo from '@/assets/icons/original/read-frog.png'

const TRANSLATE_BUTTON_CONTAINER_SELECTOR = 'read-frog-subtitle-translate-button-container'

export function renderTranslateButton() {
  const existingButton = document.querySelector<HTMLButtonElement>(`#${TRANSLATE_BUTTON_CONTAINER_SELECTOR}`)

  if (existingButton)
    return existingButton

  const subtitleTranslateButton = document.createElement('button')
  subtitleTranslateButton.id = TRANSLATE_BUTTON_CONTAINER_SELECTOR
  subtitleTranslateButton.className = 'ytp-button'
  subtitleTranslateButton.title = 'Subtitle Translation'
  subtitleTranslateButton.setAttribute('aria-label', 'Subtitle Translation')
  subtitleTranslateButton.style.width = '48px'
  subtitleTranslateButton.style.height = '100%'
  subtitleTranslateButton.style.display = 'flex'
  subtitleTranslateButton.style.alignItems = 'center'
  subtitleTranslateButton.style.justifyContent = 'center'

  const img = document.createElement('img')

  img.src = logo
  img.style.objectFit = 'contain'
  img.style.width = '32px'
  img.style.height = '32px'
  img.style.display = 'flex'
  img.style.alignItems = 'center'
  img.style.justifyContent = 'center'

  subtitleTranslateButton.appendChild(img)

  return subtitleTranslateButton
}
