import type { APIProviderTypes } from '@/types/config/provider'
import ProviderIcon from '@/components/provider-icon'
import { PROVIDER_GROUPS, PROVIDER_ITEMS, SPECIFIC_TUTORIAL_PROVIDER_TYPES } from '@/utils/constants/providers'
import { WEBSITE_URL } from '@/utils/constants/url'
import { isDarkMode } from '@/utils/tailwind'

export function ConfigHeader({ providerType }: { providerType: APIProviderTypes }) {
  const tutorialUrl = getHowToConfigureURL(providerType)

  return (
    <div className="flex items-start justify-between">
      <a href={PROVIDER_ITEMS[providerType].website} className="flex items-center gap-2" target="_blank" rel="noreferrer">
        <ProviderIcon
          logo={PROVIDER_ITEMS[providerType].logo(isDarkMode())}
          name={PROVIDER_ITEMS[providerType].name}
          size="base"
          className="group hover:cursor-pointer"
          textClassName="font-medium group-hover:text-link"
        />
      </a>
      {tutorialUrl && (
        <a href={tutorialUrl} className="text-xs text-link hover:opacity-90" target="_blank" rel="noreferrer">
          How to configure?
        </a>
      )}
    </div>
  )
}

function getHowToConfigureURL(providerType: APIProviderTypes): string | undefined {
  if (SPECIFIC_TUTORIAL_PROVIDER_TYPES.includes(providerType as any)) {
    return `${WEBSITE_URL}/tutorial/providers/${providerType}`
  }
  const groupSlug = getProviderGroupSlug(providerType)
  if (!groupSlug)
    return undefined

  return `${WEBSITE_URL}/tutorial/providers/${groupSlug}`
}

function getProviderGroupSlug(providerType: APIProviderTypes): string | undefined {
  for (const group of Object.values(PROVIDER_GROUPS)) {
    if ((group.types as readonly APIProviderTypes[]).includes(providerType)) {
      return group.tutorialSlug
    }
  }
  return undefined
}
