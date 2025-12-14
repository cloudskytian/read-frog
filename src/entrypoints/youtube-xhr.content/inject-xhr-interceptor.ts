function getCurrentVideoId(): string | null {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('v')
}

async function handleSubtitleLoad(
  xhr: XMLHttpRequest,
  interceptedUrl: URL,
  originalUrlString: string,
) {
  const responseText = xhr.responseText
  if (!responseText) {
    return
  }

  const lang = interceptedUrl.searchParams.get('lang') || 'unknown'
  const kind = interceptedUrl.searchParams.get('kind') || ''

  window.postMessage(
    {
      type: 'WXT_YT_SUBTITLE_INTERCEPT',
      payload: responseText,
      lang,
      kind,
      url: originalUrlString,
    },
    '*',
  )
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

    if (!urlString.includes('api/timedtext')) {
      return originalOpen.call(this, method, url, async ?? true, username, password)
    }

    const fullUrl = urlString.startsWith('http') ? urlString : window.location.origin + urlString
    const interceptedUrl = new URL(fullUrl)
    const requestVideoId = interceptedUrl.searchParams.get('v')
    const currentVideoId = getCurrentVideoId()

    if (requestVideoId !== currentVideoId) {
      return originalOpen.call(this, method, url, async ?? true, username, password)
    }

    this.addEventListener('load', function (this: XMLHttpRequest) {
      void handleSubtitleLoad(this, interceptedUrl, urlString)
    }, { once: true })

    this.addEventListener('error', function (this: XMLHttpRequest) {
      window.postMessage(
        {
          type: 'WXT_YT_SUBTITLE_INTERCEPT',
          error: true,
          status: this.status || 0,
        },
        '*',
      )
    }, { once: true })

    this.addEventListener('loadend', function (this: XMLHttpRequest) {
      if (this.status !== 200) {
        window.postMessage(
          {
            type: 'WXT_YT_SUBTITLE_INTERCEPT',
            error: true,
            status: this.status || 0,
          },
          '*',
        )
      }
    }, { once: true })

    return originalOpen.call(this, method, url, async ?? true, username, password)
  }
}
