import { i18n } from '#imports'
import { deepmerge } from 'deepmerge-ts'
import { useAtom } from 'jotai'
import { BetaBadge } from '@/components/badges/beta-badge'
import { Field, FieldContent, FieldLabel } from '@/components/shadcn/field'
import { Hint } from '@/components/shadcn/hint'
import { Switch } from '@/components/shadcn/switch'
import { configFieldsAtomMap } from '@/utils/atoms/config'
import { ConfigCard } from '../../components/config-card'

export function VideoSubtitles() {
  const [translateConfig, setTranslateConfig] = useAtom(configFieldsAtomMap.translate)

  return (
    <ConfigCard
      title={(
        <>
          {i18n.t('options.translation.videoSubtitles.title')}
          {' '}
          <BetaBadge className="align-middle" />
        </>
      )}
      description={i18n.t('options.translation.videoSubtitles.description')}
    >
      <Field orientation="horizontal">
        <FieldContent className="self-center">
          <FieldLabel htmlFor="video-subtitles-toggle">
            {i18n.t('options.translation.videoSubtitles.enable')}
            <Hint content={i18n.t('options.translation.videoSubtitles.enableDescription')} />
          </FieldLabel>
        </FieldContent>
        <Switch
          id="video-subtitles-toggle"
          checked={translateConfig.videoSubtitles?.enabled ?? false}
          onCheckedChange={(checked) => {
            void setTranslateConfig(
              deepmerge(translateConfig, {
                videoSubtitles: {
                  enabled: checked,
                },
              }),
            )
          }}
        />
      </Field>
    </ConfigCard>
  )
}
