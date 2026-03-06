import type { Getter, Setter } from "jotai"
import type { Config } from "@/types/config/config"
import { browser } from "#imports"
import { atom } from "jotai"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { matchDomainPattern } from "@/utils/url"
import { getActiveTabUrl } from "@/utils/utils"

type SiteControlConfig = Config["siteControl"]

// Atom to track if current site is in patterns
export const isCurrentSiteInWhitelistAtom = atom<boolean>(false)
export const isCurrentSiteInBlacklistAtom = atom<boolean>(false)

function getPatternsKey(config: SiteControlConfig) {
  return config.mode === "blacklist"
    ? "blacklistPatterns" as const
    : "whitelistPatterns" as const
}

// Async atom to initialize the site control state
export const initSiteControlAtomsAtom = atom(
  null,
  async (get, set) => {
    const siteControlConfig = get(configFieldsAtomMap.siteControl)
    const activeTabUrl = await getActiveTabUrl()

    if (activeTabUrl) {
      const inWhitelist = siteControlConfig.whitelistPatterns.some(p => matchDomainPattern(activeTabUrl, p))
      const inBlacklist = siteControlConfig.blacklistPatterns.some(p => matchDomainPattern(activeTabUrl, p))
      set(isCurrentSiteInWhitelistAtom, inWhitelist)
      set(isCurrentSiteInBlacklistAtom, inBlacklist)
    }
    else {
      set(isCurrentSiteInWhitelistAtom, false)
      set(isCurrentSiteInBlacklistAtom, false)
    }
  },
)

async function toggleSiteInPatterns(get: Getter, set: Setter, checked: boolean) {
  const siteControlConfig = get(configFieldsAtomMap.siteControl)
  const activeTabUrl = await getActiveTabUrl()

  if (!activeTabUrl)
    return

  const patternsKey = getPatternsKey(siteControlConfig)
  const currentPatterns = siteControlConfig[patternsKey]
  const hostname = new URL(activeTabUrl).hostname

  if (checked) {
    if (!currentPatterns.some(pattern => matchDomainPattern(activeTabUrl, pattern))) {
      await set(configFieldsAtomMap.siteControl, {
        ...siteControlConfig,
        [patternsKey]: [...currentPatterns, hostname],
      })
    }
  }
  else {
    const filteredPatterns = currentPatterns.filter(pattern =>
      !matchDomainPattern(activeTabUrl, pattern),
    )
    await set(configFieldsAtomMap.siteControl, {
      ...siteControlConfig,
      [patternsKey]: filteredPatterns,
    })
  }

  const [currentTab] = await browser.tabs.query({ active: true, currentWindow: true })
  if (currentTab.id) {
    void browser.tabs.reload(currentTab.id)
  }
}

// Atom to toggle current site in whitelist patterns
export const toggleCurrentSiteInWhitelistAtom = atom(
  null,
  async (get, set, checked: boolean) => {
    await toggleSiteInPatterns(get, set, checked)
    set(isCurrentSiteInWhitelistAtom, checked)
  },
)

// Atom to toggle current site in blacklist patterns
export const toggleCurrentSiteInBlacklistAtom = atom(
  null,
  async (get, set, checked: boolean) => {
    await toggleSiteInPatterns(get, set, checked)
    set(isCurrentSiteInBlacklistAtom, checked)
  },
)
