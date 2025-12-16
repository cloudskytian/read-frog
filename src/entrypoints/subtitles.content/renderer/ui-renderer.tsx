import { Provider as JotaiProvider } from 'jotai'
import ReactDOM from 'react-dom/client'
import themeCSS from '@/assets/styles/theme.css?inline'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { REACT_SHADOW_HOST_CLASS } from '@/utils/constants/dom-labels'
import { ShadowWrapperContext } from '@/utils/react-shadow-host/create-shadow-host'
import { ShadowHostBuilder } from '@/utils/react-shadow-host/shadow-host-builder'
import { subtitlesStore } from '../atoms'
import { SubtitlesContainer } from '../ui/subtitles-container'

async function waitForVideoContainer(containerSelector: string): Promise<Element> {
  return new Promise<Element>((resolve) => {
    const tryFind = () => {
      const container = document.querySelector(containerSelector)
      if (container) {
        resolve(container)
        return true
      }
      return false
    }

    if (tryFind())
      return

    const observer = new MutationObserver(() => {
      if (tryFind()) {
        observer.disconnect()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  })
}

export async function mountSubtitlesUI(containerSelector: string): Promise<void> {
  const videoContainer = await waitForVideoContainer(containerSelector)

  const parentEl = videoContainer as HTMLElement
  const computedStyle = window.getComputedStyle(parentEl)
  if (computedStyle.position === 'static') {
    parentEl.style.position = 'relative'
  }

  const shadowHost = document.createElement('div')
  shadowHost.classList.add(REACT_SHADOW_HOST_CLASS)
  shadowHost.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
  `

  const shadowRoot = shadowHost.attachShadow({ mode: 'open' })
  const hostBuilder = new ShadowHostBuilder(shadowRoot, {
    position: 'block',
    cssContent: [themeCSS],
    inheritStyles: false,
    style: {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
    },
  })
  const reactContainer = hostBuilder.build()

  const reactRoot = ReactDOM.createRoot(reactContainer)

  ;(shadowHost as any).__reactShadowContainerCleanup = () => {
    reactRoot?.unmount()
    hostBuilder.cleanup()
  }

  parentEl.appendChild(shadowHost)

  const app = (
    <JotaiProvider store={subtitlesStore}>
      <ShadowWrapperContext value={reactContainer}>
        <ThemeProvider container={reactContainer}>
          <SubtitlesContainer />
        </ThemeProvider>
      </ShadowWrapperContext>
    </JotaiProvider>
  )

  reactRoot.render(app)
}
