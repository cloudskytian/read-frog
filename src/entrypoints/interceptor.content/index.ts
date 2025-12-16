import { defineContentScript } from '#imports'
import { injectXhrInterceptor } from './inject-xhr-interceptor'

export default defineContentScript({
  matches: ['*://*.youtube.com/watch/*'],
  world: 'MAIN',
  runAt: 'document_start',
  async main() {
    void injectXhrInterceptor()
  },
})
