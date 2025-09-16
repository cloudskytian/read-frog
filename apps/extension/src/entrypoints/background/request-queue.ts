import { DEFAULT_CONFIG } from '@/utils/constants/config'
import { db } from '@/utils/db/dexie/db'
import { executeTranslate } from '@/utils/host/translate/translate-text'
import { onMessage } from '@/utils/message'
import { RequestQueue } from '@/utils/request/request-queue'
import { ensureInitializedConfig } from './config'

export async function setUpRequestQueue() {
  const config = await ensureInitializedConfig()
  const { translate: { requestQueueConfig: { rate, capacity } } } = config ?? DEFAULT_CONFIG

  const requestQueue = new RequestQueue({
    rate,
    capacity,
    timeoutMs: 20_000,
    maxRetries: 2,
    baseRetryDelayMs: 1_000,
  })

  onMessage('enqueueTranslateRequest', async (message) => {
    const { data: { text, langConfig, providerConfig, scheduleAt, hash } } = message

    // Check cache first
    if (hash) {
      const cached = await db.translationCache.get(hash)
      if (cached) {
        return cached.translation
      }
    }

    // Create thunk based on type and params
    const thunk = () => executeTranslate(text, langConfig, providerConfig)
    const result = await requestQueue.enqueue(thunk, scheduleAt, hash)

    // Cache the translation result if successful
    if (result && hash) {
      await db.translationCache.put({
        key: hash,
        translation: result,
        createdAt: new Date(),
      })
    }

    return result
  })

  onMessage('setTranslateRequestQueueConfig', (message) => {
    const { data } = message
    requestQueue.setQueueOptions(data)
  })
}
