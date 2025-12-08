function getCurrentVideoId(): string | null {
  try {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('v')
  }
  catch {
    return null
  }
}

function getPreferredSubtitleLang(): string | null {
  try {
    const ytInitialPlayerResponse = (window as any).ytInitialPlayerResponse
    if (!ytInitialPlayerResponse) {
      return null
    }

    const captions = ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer
    if (!captions) {
      return null
    }

    const captionTracks = captions.captionTracks || []

    const preferredTrack = captionTracks.find((track: any) => track.isTranslatable)
    if (preferredTrack?.languageCode) {
      return preferredTrack.languageCode
    }

    if (captionTracks.length > 0 && captionTracks[0].languageCode) {
      return captionTracks[0].languageCode
    }

    return null
  }
  catch (err) {
    console.error('[XHR Inject] 获取首选字幕语言失败:', err)
    return null
  }
}

async function fetchAsrSubtitle(originalUrl: string, currentVideoId: string): Promise<{ payload: string, lang: string } | null> {
  try {
    const fullUrl = originalUrl.startsWith('http') ? originalUrl : window.location.origin + originalUrl
    const urlObj = new URL(fullUrl)

    const hasKindAsr = urlObj.searchParams.get('kind') === 'asr'

    if (hasKindAsr) {
      return null
    }

    const preferredLang = getPreferredSubtitleLang()
    if (preferredLang) {
      urlObj.searchParams.set('lang', preferredLang)
    }

    urlObj.searchParams.set('kind', 'asr')
    urlObj.searchParams.set('v', currentVideoId)
    const asrUrl = urlObj.toString()

    const response = await fetch(asrUrl)
    if (!response.ok) {
      console.warn('[XHR Inject] ASR 字幕请求失败:', response.status)
      return null
    }

    const payload = await response.text()
    const lang = urlObj.searchParams.get('lang') || 'unknown'

    return { payload, lang }
  }
  catch (err) {
    console.error('[XHR Inject] 获取 ASR 字幕失败:', err)
    return null
  }
}

export function injectXhrInterceptor() {
  const originalOpen = XMLHttpRequest.prototype.open

  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) {
    const urlString = typeof url === 'string' ? url : url.toString()

    if (urlString.includes('api/timedtext')) {
      this.addEventListener('load', async function (this: XMLHttpRequest) {
        try {
          const responseText = this.responseText
          if (!responseText) {
            return
          }

          const fullUrl = urlString.startsWith('http') ? urlString : window.location.origin + urlString
          const urlObj = new URL(fullUrl)
          const requestVideoId = urlObj.searchParams.get('v')
          const currentVideoId = getCurrentVideoId()

          if (!currentVideoId) {
            console.warn('[XHR Inject] 无法获取当前视频 ID')
            return
          }

          if (requestVideoId !== currentVideoId) {
            return
          }

          const hasKindAsr = urlObj.searchParams.get('kind') === 'asr'

          if (hasKindAsr) {
            const lang = urlObj.searchParams.get('lang') || 'unknown'
            window.postMessage(
              {
                type: 'WXT_YT_SUBTITLE_INTERCEPT',
                payload: responseText,
                lang,
                url: urlString,
              },
              '*',
            )
            return
          }

          const asrResult = await fetchAsrSubtitle(urlString, currentVideoId)
          if (asrResult) {
            window.postMessage(
              {
                type: 'WXT_YT_SUBTITLE_INTERCEPT',
                payload: asrResult.payload,
                lang: asrResult.lang,
                url: urlString,
              },
              '*',
            )
          }
          else {
            console.warn('[XHR Inject] 无法获取 ASR 字幕，使用原始字幕')
            const lang = urlObj.searchParams.get('lang') || 'unknown'
            window.postMessage(
              {
                type: 'WXT_YT_SUBTITLE_INTERCEPT',
                payload: responseText,
                lang,
                url: urlString,
              },
              '*',
            )
          }
        }
        catch (err) {
          console.error('[XHR Inject] 处理字幕失败:', err)
        }
      })
    }

    return originalOpen.call(this, method, url, async ?? true, username, password)
  }
}
