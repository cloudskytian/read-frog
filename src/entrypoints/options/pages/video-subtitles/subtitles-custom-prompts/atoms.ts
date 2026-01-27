import { createPromptAtoms } from '@/components/ui/prompt-configurator/create-atoms'
import { configFieldsAtomMap } from '@/utils/atoms/config'

export const promptAtoms = createPromptAtoms(configFieldsAtomMap.videoSubtitles)
