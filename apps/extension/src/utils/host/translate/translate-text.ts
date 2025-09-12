import type { Config } from '@/types/config/config'
import type { ProviderConfig } from '@/types/config/provider'
import { i18n } from '#imports'
import { ISO6393_TO_6391, LANG_CODE_TO_EN_NAME, LANG_CODE_TO_LOCALE_NAME } from '@repo/definitions'
import { toast } from 'sonner'
import { isAPIProviderConfig, isLLMTranslateProviderConfig, isNonAPIProvider, isPureAPIProvider, isPureTranslateProvider } from '@/types/config/provider'
import { getProviderConfigByName } from '@/utils/config/helpers'
import { logger } from '@/utils/logger'
import { globalConfig } from '../../config/config'
import { Sha256Hex } from '../../hash'
import { sendMessage } from '../../message'
import { aiTranslate } from './api/ai'
import { deeplxTranslate } from './api/deeplx'
import { googleTranslate } from './api/google'
import { microsoftTranslate } from './api/microsoft'

export async function translateText(text: string) {
  if (!globalConfig) {
    throw new Error('No global config when translate text')
  }
  const providerName = globalConfig.translate.providerName
  const providerConfig = getProviderConfigByName(globalConfig.providersConfig, providerName)

  if (!providerConfig) {
    throw new Error(`No provider config for ${providerName} when translate text`)
  }

  const langConfig = globalConfig.language

  return await sendMessage('enqueueTranslateRequest', {
    text,
    langConfig,
    providerConfig,
    scheduleAt: Date.now(),
    hash: Sha256Hex(text, JSON.stringify(providerConfig)),
  })
}

export async function executeTranslate(text: string, langConfig: Config['language'], providerConfig: ProviderConfig, options?: { forceBackgroundFetch?: boolean }) {
  const cleanText = text.replace(/\u200B/g, '').trim()
  if (cleanText === '') {
    return ''
  }

  const { provider } = providerConfig
  let translatedText = ''

  if (isNonAPIProvider(provider)) {
    const sourceLang = langConfig.sourceCode === 'auto' ? 'auto' : (ISO6393_TO_6391[langConfig.sourceCode] ?? 'auto')
    const targetLang = ISO6393_TO_6391[langConfig.targetCode]
    if (!targetLang) {
      throw new Error(`Invalid target language code: ${langConfig.targetCode}`)
    }
    if (provider === 'google') {
      translatedText = await googleTranslate(text, sourceLang, targetLang)
    }
    else if (provider === 'microsoft') {
      translatedText = await microsoftTranslate(text, sourceLang, targetLang)
    }
  }
  else if (isPureAPIProvider(provider)) {
    const sourceLang = langConfig.sourceCode === 'auto' ? 'auto' : (ISO6393_TO_6391[langConfig.sourceCode] ?? 'auto')
    const targetLang = ISO6393_TO_6391[langConfig.targetCode]
    if (!targetLang) {
      throw new Error(`Invalid target language code: ${langConfig.targetCode}`)
    }
    if (provider === 'deeplx') {
      translatedText = await deeplxTranslate(text, sourceLang, targetLang, providerConfig, options)
    }
  }
  else if (isLLMTranslateProviderConfig(providerConfig)) {
    const targetLangName = LANG_CODE_TO_EN_NAME[langConfig.targetCode]
    translatedText = await aiTranslate(text, targetLangName, providerConfig)
  }
  else {
    throw new Error(`Unknown provider: ${provider}`)
  }

  return translatedText.trim()
}

export function validateTranslationConfig(config: Pick<Config, 'providersConfig' | 'translate' | 'language'>): boolean {
  const { providersConfig, translate: translateConfig, language: languageConfig } = config
  const providerConfig = getProviderConfigByName(providersConfig, translateConfig.providerName)
  if (!providerConfig) {
    return false
  }
  const { provider } = providerConfig

  // check if the source language is the same as the target language
  if (isPureTranslateProvider(provider)) {
    if (languageConfig.sourceCode === languageConfig.targetCode) {
      toast.error(i18n.t('translation.sameLanguage'))
      logger.info('validateTranslationConfig: returning false (same language)')
      return false
    }
    else if (languageConfig.sourceCode === 'auto' && languageConfig.detectedCode === languageConfig.targetCode) {
      toast.warning(i18n.t('translation.autoModeSameLanguage', [
        LANG_CODE_TO_LOCALE_NAME[languageConfig.detectedCode] ?? languageConfig.detectedCode,
      ]))
    }
  }

  // check if the API key is configured
  if (isAPIProviderConfig(providerConfig) && providerConfig.apiKey === undefined) {
    toast.error(i18n.t('noAPIKeyConfig.warning'))
    logger.info('validateTranslationConfig: returning false (no API key)')
    return false
  }

  return true
}
