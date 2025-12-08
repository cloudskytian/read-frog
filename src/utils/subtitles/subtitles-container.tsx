import type { Root } from 'react-dom/client'
import type { StateData, Subtitle } from './types'
import ReactDOM from 'react-dom/client'
import { SubtitleDisplay } from './subtitles-display'

function SubtitleContainerWrapper({ subtitle, stateData, isVisible, position }: {
  subtitle: Subtitle | null
  stateData: StateData | null
  isVisible: boolean
  position: 'subtitle' | 'center'
}) {
  const positionStyle = position === 'subtitle'
    ? { bottom: '60px', top: 'auto', transform: 'none' }
    : { top: '50%', transform: 'translateY(-50%)', bottom: 'auto' }

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        display: isVisible ? 'flex' : 'none',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 100,
        width: '100%',
        fontFamily: '"YouTube Noto", Roboto, "Arial Unicode Ms", Arial, Helvetica, Verdana, "PT Sans Caption", sans-serif',
        ...positionStyle,
      }}
    >
      <SubtitleDisplay subtitle={subtitle} stateData={stateData} />
    </div>
  )
}

export class SubtitleContainer {
  private containerElement: HTMLDivElement | null = null
  private reactRoot: Root | null = null
  private parentElement: Element
  private isVisible: boolean = true
  private position: 'subtitle' | 'center' = 'subtitle'
  private currentSubtitle: Subtitle | null = null
  private currentStateData: StateData | null = null

  constructor(parentElement: Element) {
    this.parentElement = parentElement
  }

  mount() {
    if (this.containerElement) {
      return
    }

    this.containerElement = document.createElement('div')
    this.parentElement.appendChild(this.containerElement)
    this.reactRoot = ReactDOM.createRoot(this.containerElement)
  }

  unmount() {
    if (this.reactRoot) {
      this.reactRoot.unmount()
      this.reactRoot = null
    }
    if (this.containerElement) {
      this.containerElement.remove()
      this.containerElement = null
    }
  }

  show() {
    this.isVisible = true
    this.forceUpdate()
  }

  hide() {
    this.isVisible = false
    this.forceUpdate()
  }

  setPositionToSubtitle() {
    this.position = 'subtitle'
    this.forceUpdate()
  }

  setPositionToCenter() {
    this.position = 'center'
    this.forceUpdate()
  }

  render(subtitle: Subtitle | null, stateData: StateData | null) {
    this.currentSubtitle = subtitle
    this.currentStateData = stateData

    if (!this.reactRoot) {
      return
    }

    const isErrorState = stateData?.state === 'error' || stateData?.state === 'fetch_failed'

    if (subtitle || isErrorState) {
      this.position = 'subtitle'
    }
    else if (stateData && stateData.state !== 'idle') {
      this.position = 'center'
    }

    this.forceUpdate()
  }

  private forceUpdate() {
    if (!this.reactRoot) {
      return
    }

    this.reactRoot.render(
      <SubtitleContainerWrapper
        subtitle={this.currentSubtitle}
        stateData={this.currentStateData}
        isVisible={this.isVisible}
        position={this.position}
      />,
    )
  }
}
