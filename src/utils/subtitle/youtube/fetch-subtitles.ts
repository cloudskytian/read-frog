import type { YoutubePlayerInfo, YoutubePlayerRequestBody, YoutubePlayerRequestHeader, YoutubeSubtitle, YoutubeSubtitleResponse, YoutubeTimedText } from './types'

export function fetchVideoId(): string {
  const url = new URL(window.location.href)
  return url.searchParams.get('v') ?? ''
}

export async function fetchYoutubeSubtitles(): Promise<YoutubeSubtitle[]> {
  const playerInfo = await fetchYoutubePlayerInfo()

  if (isBlocked(playerInfo)) {
    throw new Error('Request blocked')
  }

  const timedText = await fetchTimedText(playerInfo)

  return parseSubtitleDataWithLineBreaks(timedText)
}

async function fetchYoutubeWatchInfo() {
  const videoId = fetchVideoId()
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
  const videoPageResponse = await fetch(videoUrl, {
    credentials: 'include',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  })

  const html = await videoPageResponse.text()

  const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)
  const clientVersionMatch = html.match(/"INNERTUBE_CONTEXT_CLIENT_VERSION":"([^"]+)"/)
  const visitorDataMatch = html.match(/"VISITOR_DATA":"([^"]+)"/)
  const sessionTokenMatch = html.match(/"XSRF_TOKEN":"([^"]+)"/)
  const delegatedSessionIdMatch = html.match(/"DELEGATED_SESSION_ID":"([^"]+)"/)
  const sessionIndexMatch = html.match(/"SESSION_INDEX":"([^"]+)"/)

  if (!apiKeyMatch)
    throw new Error('No API key')

  const apiKey = apiKeyMatch[1]
  const clientVersion = clientVersionMatch ? clientVersionMatch[1] : '2.20241128.01.00'
  const visitorData = visitorDataMatch ? visitorDataMatch[1] : null
  const sessionToken = sessionTokenMatch ? sessionTokenMatch[1] : null
  const delegatedSessionId = delegatedSessionIdMatch ? delegatedSessionIdMatch[1] : null
  const sessionIndex = sessionIndexMatch ? sessionIndexMatch[1] : null

  return {
    apiKey,
    clientVersion,
    visitorData,
    sessionToken,
    delegatedSessionId,
    sessionIndex,
  }
}

async function fetchYoutubePlayerInfo(): Promise<YoutubePlayerInfo> {
  const videoId = fetchVideoId()

  const { apiKey, clientVersion, visitorData, sessionToken, delegatedSessionId, sessionIndex } = await fetchYoutubeWatchInfo()

  const endpoint = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`

  const requestBody: YoutubePlayerRequestBody = {
    context: {
      client: {
        clientName: 'WEB',
        clientVersion,
        hl: 'en',
        gl: 'US',
      },
    },
    videoId,
  }

  if (visitorData) {
    requestBody.context.client.visitorData = visitorData
  }

  if (delegatedSessionId) {
    requestBody.context.user = {
      onBehalfOfUser: delegatedSessionId,
    }
  }

  const headers: YoutubePlayerRequestHeader = {
    'Content-Type': 'application/json',
    'X-YouTube-Client-Name': '1',
    'X-YouTube-Client-Version': clientVersion,
  }

  if (sessionToken) {
    headers['X-Goog-AuthUser'] = sessionIndex || '0'
    headers['X-Goog-PageId'] = sessionToken
  }

  const playerResponse = await fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(requestBody),
  })

  if (!playerResponse.ok) {
    throw new Error(`HTTP ${playerResponse.status}`)
  }

  const playerInfo: YoutubePlayerInfo = await playerResponse.json()
  return playerInfo
}

async function fetchTimedText(playerInfo: YoutubePlayerInfo) {
  const captionTracks = playerInfo?.captions?.playerCaptionsTracklistRenderer?.captionTracks

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error('No captions')
  }

  const selectedTrack = captionTracks[0]

  const url = `${selectedTrack.baseUrl}&fmt=json3`

  const subtitleResponse = await fetch(url, {
    credentials: 'include',
  })

  const subtitleData: YoutubeSubtitleResponse = await subtitleResponse.json()

  return subtitleData.events
}

function isBlocked(playerInfo: YoutubePlayerInfo) {
  if (playerInfo?.error)
    return true

  // ['LOGIN_REQUIRED', 'UNPLAYABLE', 'ERROR']
  return playerInfo?.playabilityStatus?.status !== 'OK'
}

function parseSubtitleDataWithLineBreaks(events: YoutubeTimedText[] = []) {
  const result = []
  let lines = []
  let currentStart = null

  for (const event of events) {
    if (!event.segs)
      continue

    const text = event.segs.map(seg => seg.utf8).join('')

    if (event.aAppend === 1 && text === '\n') {
      continue
    }

    if (event.aAppend === 1) {
      if (lines.length > 0) {
        lines[lines.length - 1] += text
      }
      continue
    }

    if (lines.length > 0 && currentStart !== null) {
      const endTime = event.tStartMs / 1000
      result.push({
        text: lines.join('\n').trim(),
        start: currentStart,
        end: endTime,
      })
      lines = []
    }

    lines.push(text)
    currentStart = event.tStartMs / 1000
  }

  if (lines.length > 0 && currentStart !== null) {
    const lastEvent = events.filter(event => event.segs).pop()
    if (!lastEvent)
      return result
    const endTime = (lastEvent?.tStartMs + (lastEvent?.dDurationMs || 0)) / 1000
    result.push({
      text: lines.join('\n').trim(),
      start: currentStart,
      end: endTime,
    })
  }

  return result
}
