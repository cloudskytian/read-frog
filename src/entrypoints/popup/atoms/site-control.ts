import type { Config } from "@/types/config/config"
import { browser } from "#imports"
import { atom } from "jotai"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { matchDomainPattern } from "@/utils/url"
import { getActiveTabUrl } from "@/utils/utils"

type SiteControlConfig = Config["siteControl"]

// Atom to track if whitelist mode is enabled
export const isWhitelistModeAtom = atom<boolean>(false)

// Atom to track if blacklist mode is enabled
export const isBlacklistModeAtom = atom<boolean>(false)

// Atom to track if current site is in patterns
export const isCurrentSiteInWhitelistAtom = atom<boolean>(false)
export const isCurrentSiteInBlacklistAtom = atom<boolean>(false)

async function getIsInPatterns(siteControlConfig: SiteControlConfig) {
  const activeTabUrl = await getActiveTabUrl()
  if (!activeTabUrl)
    return false
  return siteControlConfig.patterns.some(pattern =>
    matchDomainPattern(activeTabUrl, pattern),
  )
}

// Async atom to initialize the site control state
export const initSiteControlAtomsAtom = atom(
  null,
  async (get, set) => {
    const siteControlConfig = get(configFieldsAtomMap.siteControl)
    const isInPatterns = await getIsInPatterns(siteControlConfig)
    set(isWhitelistModeAtom, siteControlConfig.mode === "whitelist")
    set(isBlacklistModeAtom, siteControlConfig.mode === "blacklist")
    set(isCurrentSiteInWhitelistAtom, isInPatterns)
    set(isCurrentSiteInBlacklistAtom, isInPatterns)
  },
)

async function toggleSiteInPatterns(get: any, set: any, checked: boolean) {
  const siteControlConfig = get(configFieldsAtomMap.siteControl)
  const activeTabUrl = await getActiveTabUrl()

  if (!activeTabUrl)
    return

  const currentPatterns = siteControlConfig.patterns
  const hostname = new URL(activeTabUrl).hostname

  if (checked) {
    if (!currentPatterns.some((pattern: string) => matchDomainPattern(activeTabUrl, pattern))) {
      void set(configFieldsAtomMap.siteControl, {
        ...siteControlConfig,
        patterns: [...currentPatterns, hostname],
      })
    }
  }
  else {
    const filteredPatterns = currentPatterns.filter((pattern: string) =>
      !matchDomainPattern(activeTabUrl, pattern),
    )
    void set(configFieldsAtomMap.siteControl, {
      ...siteControlConfig,
      patterns: filteredPatterns,
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
