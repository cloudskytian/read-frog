/**
 * Migration script from v038 to v039
 * Add 'videoSubtitles' field  in translate config
 *
 * Before (v038):
 *   { translate: { ... }, ... }
 *
 * After (v039):
 *   { translate: { ..., videoSubtitles: { enabled } }, ... }
 */

export function migrate(oldConfig: any): any {
  const oldTranslateConfig = oldConfig.translate || {}

  return {
    ...oldConfig,
    translate: {
      ...oldTranslateConfig,
      videoSubtitles: {
        enabled: false,
      },
    },
  }
}
