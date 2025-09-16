import type { Config } from '@/types/config/config'
import { storage } from '#imports'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { getLLMTranslateProvidersConfig, getProviderConfigById } from '../config/helpers'
import { CONFIG_STORAGE_KEY } from '../constants/config'

interface ProviderFactoryMap {
  openai: typeof createOpenAI
  deepseek: typeof createDeepSeek
  gemini: typeof createGoogleGenerativeAI
}

const CREATE_AI_MAPPER: ProviderFactoryMap = {
  openai: createOpenAI,
  deepseek: createDeepSeek,
  gemini: createGoogleGenerativeAI,
}

async function getLanguageModelById(providerId: string, modelType: 'read' | 'translate') {
  const config = await storage.getItem<Config>(`local:${CONFIG_STORAGE_KEY}`)
  if (!config) {
    throw new Error('Config not found')
  }

  const LLMProvidersConfig = getLLMTranslateProvidersConfig(config.providersConfig)
  const providerConfig = getProviderConfigById(LLMProvidersConfig, providerId)
  if (!providerConfig) {
    throw new Error(`Provider ${providerId} not found`)
  }

  const provider = CREATE_AI_MAPPER[providerConfig.provider]({
    baseURL: providerConfig.baseURL,
    apiKey: providerConfig.apiKey,
  })

  const modelConfig = providerConfig.models[modelType]
  const modelId = modelConfig.isCustomModel
    ? modelConfig.customModel
    : modelConfig.model

  if (!modelId) {
    throw new Error(`Model is undefined for ${modelType}`)
  }

  return provider.languageModel(modelId)
}

export async function getTranslateModelById(providerId: string) {
  return getLanguageModelById(providerId, 'translate')
}

export async function getReadModelById(providerId: string) {
  return getLanguageModelById(providerId, 'read')
}
