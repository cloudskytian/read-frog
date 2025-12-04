import type { YoutubeSubtitle, YoutubeSubtitleResponse, YoutubeTimedText } from './types'

export function fetchVideoId(): string {
  const url = new URL(window.location.href)
  return url.searchParams.get('v') ?? ''
}

/**
 * 运行在 Main World (页面上下文) 的注入脚本
 * Hook XHR 的 open 方法来监听 timedtext
 */
function mainWorldInterceptor() {
  const originalOpen = XMLHttpRequest.prototype.open

  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) {
    // 筛选目标接口：api/timedtext
    const urlString = typeof url === 'string' ? url : url.toString()
    if (urlString.includes('api/timedtext')) {
      // 在 open 阶段直接挂载 load 监听器到当前 XHR 实例
      this.addEventListener('load', function (this: XMLHttpRequest) {
        try {
          const responseText = this.responseText

          if (responseText) {
            // 尝试构建 URL 对象以提取参数
            let lang = 'unknown'
            try {
              // 处理相对路径的情况
              const fullUrl = urlString.startsWith('http') ? urlString : window.location.origin + urlString
              const urlObj = new URL(fullUrl)
              lang = urlObj.searchParams.get('lang') || 'unknown'
            }
            catch {
              // URL 解析失败，使用默认值
            }

            // 发送给 Content Script
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
          console.error('[XHR Inject] 解析字幕失败:', err)
        }
      })
    }

    // 执行原始 open 方法
    return originalOpen.call(this, method, url, async ?? true, username, password)
  }

}

/**
 * 解析字幕数据，保留换行符逻辑
 */
function parseSubtitleData(events: YoutubeTimedText[] = []): YoutubeSubtitle[] {
  const result: YoutubeSubtitle[] = []

  for (const event of events) {
    if (!event.segs)
      continue

    const eventStartMs = event.tStartMs

    for (const seg of event.segs) {
      // 跳过换行符
      if (seg.utf8 === '\n')
        continue

      const startTime = eventStartMs + (seg.tOffsetMs || 0)
      // 计算结束时间(如果有下一个seg,用下一个的开始时间;否则用event的结束时间)
      const nextSegIndex = event.segs.indexOf(seg) + 1
      let endTime = eventStartMs + (event.dDurationMs || 0)

      if (nextSegIndex < event.segs.length) {
        const nextSeg = event.segs[nextSegIndex]
        endTime = (eventStartMs + (nextSeg.tOffsetMs || 0))
      }
      else {
        endTime = (eventStartMs + (event.dDurationMs || 0))
      }

      result.push({
        text: seg.utf8,
        start: startTime,
        end: endTime,
      })
    }
  }

  return result
}

/**
 * 字幕管理器类
 */
class YouTubeSubtitleManager {
  private subtitleResolvers: Array<(data: YoutubeSubtitle[]) => void> = []
  private checkInterval: NodeJS.Timeout | null = null
  private isInitialized = false

  /**
   * 初始化：注入拦截器并开始监听
   */
  public init() {
    if (this.isInitialized) {
      return
    }

    this.isInitialized = true
    this.injectScript()
    this.startMessageListener()

    // 稍微延迟一点启动点击检查，让页面元素先渲染
    const timeoutId = setTimeout(() => {
      this.startAutoClicker()
      this.setupUrlObserver()
    }, 1000)
    // 保持引用以防需要清理
    void timeoutId
  }

  /**
   * 等待字幕数据
   */
  public waitForSubtitles(): Promise<YoutubeSubtitle[]> {
    return new Promise((resolve) => {
      this.subtitleResolvers.push(resolve)
    })
  }

  /**
   * 1. 将 mainWorldInterceptor 函数序列化并注入到页面头部
   */
  private injectScript() {
    const script = document.createElement('script')
    const scriptContent = mainWorldInterceptor.toString()
    script.textContent = `(${scriptContent})();`
    // 插入到 documentElement (html标签) 确保最早执行
    const target = document.head || document.documentElement
    target.appendChild(script)
    script.remove()
  }

  /**
   * 2. 监听来自 Main World 的消息
   */
  private startMessageListener() {
    window.addEventListener('message', (event) => {
      if (event.source !== window)
        return

      if (event.data.type === 'WXT_YT_SUBTITLE_INTERCEPT') {
        this.handleSubtitleData(event.data)
      }
    })
  }

  /**
   * 处理接收到的字幕数据
   */
  private handleSubtitleData(data: { payload: string, lang: string, url: string }) {
    console.log('🔥 捕获到字幕数据 (XHR):', data.lang)

    try {
      // 解析 JSON 数据
      const subtitleResponse: YoutubeSubtitleResponse = JSON.parse(data.payload)

      // 转换为 YoutubeSubtitle 格式
      const subtitles = parseSubtitleData(subtitleResponse.events)

      console.log('[YouTube Subtitle] 解析字幕成功:', subtitles.length)

      // 解决所有等待的 Promise
      this.subtitleResolvers.forEach(resolve => resolve(subtitles))
      this.subtitleResolvers = []
    }
    catch (error) {
      console.error('[YouTube Subtitle] 解析字幕失败:', error)
    }
  }

  /**
   * 3. 智能点击逻辑
   */
  private tryClickSubtitleButton() {
    const ccButton = document.querySelector('.ytp-subtitles-button') as HTMLElement

    if (ccButton) {
      // 获取按钮状态：true=已开启，false=已关闭
      const isPressed = ccButton.getAttribute('aria-pressed') === 'true'

      if (!isPressed) {
        console.log('[WXT] 检测到字幕未开启，模拟点击...')
        ccButton.click()
      }
      else {
        // 如果已经开启了，拦截器会自动捕获 YouTube 自动发出的请求
        console.log('[WXT] 字幕已默认开启，等待拦截自动请求...')
      }
    }
  }

  /**
   * 启动循环检查
   */
  private startAutoClicker() {
    this.tryClickSubtitleButton()

    if (this.checkInterval)
      clearInterval(this.checkInterval)

    let attempts = 0
    this.checkInterval = setInterval(() => {
      this.tryClickSubtitleButton()
      attempts++
      // 检查次数稍微多一点，适应慢网速
      if (attempts > 15) {
        if (this.checkInterval)
          clearInterval(this.checkInterval)
      }
    }, 1000)
  }

  /**
   * 4. 处理 YouTube 单页应用 (SPA) 跳转
   */
  private setupUrlObserver() {
    let lastUrl = location.href

    const observer = new MutationObserver(() => {
      const url = location.href
      if (url !== lastUrl) {
        lastUrl = url
        console.log('[WXT] 页面跳转检测，重置字幕检查...')
        this.startAutoClicker()
      }
    })

    observer.observe(document, { subtree: true, childList: true })
  }
}

// 创建全局单例
let globalSubtitleManager: YouTubeSubtitleManager | null = null

/**
 * 初始化字幕拦截器
 * 应该在 content script 启动时尽早调用
 */
export function initSubtitleInterceptor() {
  if (!globalSubtitleManager) {
    globalSubtitleManager = new YouTubeSubtitleManager()
    globalSubtitleManager.init()
  }
}

/**
 * 获取 YouTube 字幕
 * 使用拦截注入的方式，等待 XHR 请求被拦截
 */
export async function fetchYoutubeSubtitles(): Promise<YoutubeSubtitle[]> {
  // 确保拦截器已初始化
  if (!globalSubtitleManager) {
    initSubtitleInterceptor()
  }

  // 等待字幕数据
  return globalSubtitleManager!.waitForSubtitles()
}
