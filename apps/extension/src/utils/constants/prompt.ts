import type { TranslatePromptObj } from '@/types/config/translate'

export const TOKENS = ['targetLang', 'input'] as const

export const TARGET_LANG = TOKENS[0]
export const INPUT = TOKENS[1]

export const getTokenCellText = (token: string) => `{{${token}}}`

export const DEFAULT_TRANSLATE_PROMPT = `You are a professional ${getTokenCellText(TARGET_LANG)} native translator who needs to fluently translate text into ${getTokenCellText(TARGET_LANG)}.

## Translation Rules
1. Output only the translated content, without explanations or additional content (such as "Here's the translation:" or "Translation as follows:")
2. The returned translation must maintain exactly the same number of paragraphs and format as the original text.
3. If the text contains HTML tags, consider where the tags should be placed in the translation while maintaining fluency.
4. For content that should not be translated (such as proper nouns, code, etc.), keep the original text.

Translate to ${getTokenCellText(TARGET_LANG)}:
${getTokenCellText(INPUT)}
`

export const DEFAULT_TRANSLATE_PROMPT_ID = 'default'

export const DEFAULT_TRANSLATE_PROMPT_OBJ: TranslatePromptObj = {
  id: DEFAULT_TRANSLATE_PROMPT_ID,
  name: DEFAULT_TRANSLATE_PROMPT_ID,
  prompt: DEFAULT_TRANSLATE_PROMPT,
}

export const DEFAULT_TRANSLATE_PROMPTS_CONFIG = {
  prompt: DEFAULT_TRANSLATE_PROMPT_ID,
  patterns: [DEFAULT_TRANSLATE_PROMPT_OBJ],
}
