/**
 * Migration script from v046 to v047
 * Adds 'skipLanguages' and 'enableSkipLanguagesLLMDetection' to translate.page config
 *
 * Before (v046):
 *   { ..., translate: { page: { ... } } }
 *
 * After (v047):
 *   { ..., translate: { page: { ..., skipLanguages: [], enableSkipLanguagesLLMDetection: false } } }
 */

export function migrate(oldConfig: any): any {
  return {
    ...oldConfig,
    translate: {
      ...oldConfig.translate,
      page: {
        ...oldConfig.translate.page,
        skipLanguages: [],
        enableSkipLanguagesLLMDetection: false,
      },
    },
  }
}
