import { i18n } from '#imports'
import { Checkbox } from '@repo/ui/components/checkbox'
import { Input } from '@repo/ui/components/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/select'
import { useAtom, useAtomValue } from 'jotai'
import ReadProviderSelector from '@/components/provider/read-provider-selector'
import { READ_PROVIDER_MODELS } from '@/types/config/provider'
import { readProviderConfigAtom, updateLLMProviderConfig } from '@/utils/atoms/provider'
import { ConfigCard } from '../../components/config-card'
import { FieldWithLabel } from '../../components/field-with-label'
import { SetApiKeyWarning } from '../../components/set-api-key-warning'

export function ReadConfig() {
  return (
    <ConfigCard title={i18n.t('options.general.readConfig.title')} description={i18n.t('options.general.readConfig.description')}>
      <div className="flex flex-col gap-4">
        <ReadProviderSelectorField />
        <ReadModelSelector />
      </div>
    </ConfigCard>
  )
}

function ReadProviderSelectorField() {
  const readProviderConfig = useAtomValue(readProviderConfigAtom)

  return (
    <FieldWithLabel
      id="readProvider"
      label={(
        <div className="flex gap-2">
          {i18n.t('options.general.readConfig.provider')}
          {!readProviderConfig.apiKey && <SetApiKeyWarning />}
        </div>
      )}
    >
      <ReadProviderSelector className="w-full" />
    </FieldWithLabel>
  )
}

function ReadModelSelector() {
  const [readProviderConfig, setReadProviderConfig] = useAtom(readProviderConfigAtom)
  const provider = readProviderConfig.provider
  const modelConfig = readProviderConfig.models.read

  return (
    <FieldWithLabel id="readModel" label={i18n.t('options.general.readConfig.model.title')}>
      {modelConfig.isCustomModel
        ? (
            <Input
              value={modelConfig.customModel ?? ''}
              onChange={e =>
                setReadProviderConfig(
                  updateLLMProviderConfig(readProviderConfig, {
                    models: {
                      read: {
                        customModel: e.target.value === '' ? null : e.target.value,
                      },
                    },
                  }),
                )}
            />
          )
        : (
            <Select
              value={modelConfig.model}
              onValueChange={value =>
                setReadProviderConfig(
                  updateLLMProviderConfig(readProviderConfig, {
                    models: {
                      read: {
                        model: value as any,
                      },
                    },
                  }),
                )}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {READ_PROVIDER_MODELS[provider].map(model => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
      <div className="mt-0.5 flex items-center space-x-2">
        <Checkbox
          id={`isCustomModel-read-${provider}`}
          checked={modelConfig.isCustomModel}
          onCheckedChange={(checked) => {
            if (checked === false) {
              setReadProviderConfig(
                updateLLMProviderConfig(readProviderConfig, {
                  models: {
                    read: {
                      customModel: null,
                      isCustomModel: false,
                    },
                  },
                }),
              )
            }
            else {
              setReadProviderConfig(
                updateLLMProviderConfig(readProviderConfig, {
                  models: {
                    read: {
                      customModel: modelConfig.model,
                      isCustomModel: true,
                    },
                  },
                }),
              )
            }
          }}
        />
        <label
          htmlFor={`isCustomModel-read-${provider}`}
          className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          {i18n.t('options.general.readConfig.model.enterCustomModel')}
        </label>
      </div>
    </FieldWithLabel>
  )
}
