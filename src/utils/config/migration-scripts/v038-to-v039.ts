/**
 * Migration script from v038 to v039
 * Add 'videoSubtitles' field as top-level config
 *
 * Before (v038):
 *   { translate: { ... }, ... }
 *
 * After (v039):
 *   { translate: { ... }, videoSubtitles: { enabled }, ... }
 */

export function migrate(oldConfig: any): any {
  return {
    ...oldConfig,
    videoSubtitles: {
      enabled: false,
    },
  }
}
