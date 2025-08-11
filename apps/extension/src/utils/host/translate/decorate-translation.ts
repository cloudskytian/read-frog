import type { TranslationNodeStyle } from '@/types/config/provider'
import { camelCase } from 'case-anything'
import { translationNodeStyleSchema } from '@/types/config/provider'
import { globalConfig } from '@/utils/config/config'
import { BLOCK_CONTENT_CLASS, INLINE_CONTENT_CLASS, NOTRANSLATE_CLASS } from '@/utils/constants/dom-labels'
import { CUSTOM_TRANSLATION_NODE_ATTRIBUTE, DEFAULT_TRANSLATION_NODE_STYLE } from '@/utils/constants/translation-node-style'

const customTranslationNodeAttribute = camelCase(CUSTOM_TRANSLATION_NODE_ATTRIBUTE)

export function decorateTranslationNode(translatedNode: HTMLElement, translationNodeStyle?: TranslationNodeStyle, nodeType?: 'inline' | 'block') {
  if (!translatedNode)
    return

  if (nodeType) {
    translatedNode.className = `${NOTRANSLATE_CLASS} ${nodeType === 'inline' ? INLINE_CONTENT_CLASS : BLOCK_CONTENT_CLASS}`
  }

  const customNodeStyle = translationNodeStyle ?? globalConfig?.translate.translationNodeStyle ?? DEFAULT_TRANSLATION_NODE_STYLE

  if (translationNodeStyleSchema.safeParse(customNodeStyle).error)
    return

  translatedNode.dataset[customTranslationNodeAttribute] = customNodeStyle
}
