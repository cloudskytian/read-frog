import type { StateData, SubtitlesFragment } from '@/utils/subtitles/types'
import React from 'react'
import ReactDOM from 'react-dom/client'
import themeCSS from '@/assets/styles/theme.css?inline'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { REACT_SHADOW_HOST_CLASS } from '@/utils/constants/dom-labels'
import { ShadowWrapperContext } from '@/utils/react-shadow-host/create-shadow-host'
import { ShadowHostBuilder } from '@/utils/react-shadow-host/shadow-host-builder'
import { SubtitlesContainer } from '../ui/subtitles-container'
import { SubtitlesContext } from '../ui/subtitles-context'

export class SubtitlesViewManager {
  private shadowHost: HTMLElement | null = null
  private reactRoot: ReactDOM.Root | null = null
  private reactContainer: HTMLElement | null = null
  private parentElement: Element
  private _isVisible: boolean = true
  private subtitlesFragment: SubtitlesFragment | null = null
  private stateData: StateData | null = null

  constructor(parentElement: Element) {
    this.parentElement = parentElement
  }

  get isVisible() {
    return this._isVisible
  }

  set isVisible(value: boolean) {
    this._isVisible = value
    this.update()
  }

  mount() {
    if (this.shadowHost) {
      return
    }

    const parentEl = this.parentElement as HTMLElement
    const computedStyle = window.getComputedStyle(parentEl)
    if (computedStyle.position === 'static') {
      parentEl.style.position = 'relative'
    }

    this.shadowHost = document.createElement('div')
    this.shadowHost.classList.add(REACT_SHADOW_HOST_CLASS)
    this.shadowHost.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `

    const shadowRoot = this.shadowHost.attachShadow({ mode: 'open' })
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
    this.reactContainer = hostBuilder.build()

    this.reactRoot = ReactDOM.createRoot(this.reactContainer)

    ;(this.shadowHost as any).__reactShadowContainerCleanup = () => {
      this.reactRoot?.unmount()
      hostBuilder.cleanup()
    }

    this.parentElement.appendChild(this.shadowHost)

    this.update()
  }

  unmount() {
    if (this.shadowHost) {
      (this.shadowHost as any).__reactShadowContainerCleanup?.()
      this.shadowHost.remove()
      this.shadowHost = null
      this.reactRoot = null
      this.reactContainer = null
    }
  }

  show() {
    this.isVisible = true
  }

  hide() {
    this.isVisible = false
  }

  render(subtitle: SubtitlesFragment | null, stateData: StateData | null) {
    this.subtitlesFragment = subtitle
    this.stateData = stateData
    this.update()
  }

  private update() {
    if (!this.reactRoot || !this.reactContainer) {
      return
    }

    const component = React.createElement(
      SubtitlesContext,
      {
        value: {
          subtitle: this.subtitlesFragment,
          stateData: this.stateData,
          isVisible: this._isVisible,
        },
      },
      React.createElement(SubtitlesContainer),
    )

    const wrappedComponent = (
      <ShadowWrapperContext value={this.reactContainer}>
        <ThemeProvider container={this.reactContainer}>
          {component}
        </ThemeProvider>
      </ShadowWrapperContext>
    )

    this.reactRoot.render(wrappedComponent)
  }
}
