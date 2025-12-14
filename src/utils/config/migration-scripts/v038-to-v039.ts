/**
 * Migration script from v038 to v039
 * Renames 'youtubeSubtitles' field to 'subtitles' in translate config
 *
 * Before (v038):
 *   { translate: { ... }, ... }
 *
 * After (v039):
 *   { translate: { ..., subtitles: { enabled } }, ... }
 */

export function migrate(oldConfig: any): any {
  const oldTranslateConfig = oldConfig.translate || {}

  return {
    ...oldConfig,
    translate: {
      ...oldTranslateConfig,
      videoSubtitles: {
        enabled: true,
      },
    },
  }
}
