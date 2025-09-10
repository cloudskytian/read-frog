import type { TranslatePromptObj } from '@/types/config/translate'
import { i18n } from '#imports'
import { Icon } from '@iconify/react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/tooltip'
import { useAtom, useAtomValue } from 'jotai'
import { isLLMTranslateProvider } from '@/types/config/provider'
import { configFields } from '@/utils/atoms/config'
import { translateProviderConfigAtom } from '@/utils/atoms/provider'
import { DEFAULT_TRANSLATE_PROMPT_ID } from '@/utils/constants/prompt'

function name(prompt: TranslatePromptObj) {
  return prompt.id === DEFAULT_TRANSLATE_PROMPT_ID ? i18n.t('options.translation.personalizedPrompts.default') : prompt.name
}

export default function TranslatePromptSelector() {
  const translateProviderConfig = useAtomValue(translateProviderConfigAtom)
  const [translateConfig, setTranslateConfig] = useAtom(configFields.translate)

  if (!translateProviderConfig?.provider || !isLLMTranslateProvider(translateProviderConfig?.provider))
    return null

  const promptsConfig = translateConfig.promptsConfig
  const { patterns = [], prompt } = promptsConfig

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[13px] font-medium flex items-center gap-1.5">
        {i18n.t('translatePrompt.title')}
        <Tooltip>
          <TooltipTrigger asChild>
            <Icon icon="tabler:help" className="size-3 text-blue-300 dark:text-blue-700/70" />
          </TooltipTrigger>
          <TooltipContent className="w-36">
            <p>
              {i18n.t('translatePrompt.description')}
            </p>
          </TooltipContent>
        </Tooltip>
      </span>
      <Select
        value={prompt}
        onValueChange={(value) => {
          setTranslateConfig({
            promptsConfig: {
              ...promptsConfig,
              prompt: value,
            },
          })
        }}
      >
        <SelectTrigger className="bg-input/50 hover:bg-input !h-7 w-31 cursor-pointer pr-1.5 pl-2.5 outline-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {patterns.map(prompt => (
              <SelectItem key={prompt.id} value={prompt.id}>
                { name(prompt) }
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
