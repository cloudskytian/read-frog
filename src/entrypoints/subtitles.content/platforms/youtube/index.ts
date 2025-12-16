import { YoutubeInterceptFetcher } from '@/utils/subtitles/fetchers'
import { SubtitlesProcessor } from '@/utils/subtitles/processor'
import { UniversalVideoAdapter } from '../../universal-adapter'
import { youtubeConfig } from './config'

export function setupYoutubeSubtitles() {
  const subtitlesFetcher = new YoutubeInterceptFetcher()
  const subtitlesProcessor = new SubtitlesProcessor()

  const adapter = new UniversalVideoAdapter({
    config: youtubeConfig,
    subtitlesFetcher,
    subtitlesProcessor,
  })

  adapter.initialize()
}
