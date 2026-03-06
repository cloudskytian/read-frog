import { i18n } from "#imports"
import { useAtomValue, useSetAtom } from "jotai"
import { Activity } from "react"
import { Switch } from "@/components/ui/base-ui/switch"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { isIgnoreTabAtom } from "../atoms/ignore"
import { isCurrentSiteInBlacklistAtom, isCurrentSiteInWhitelistAtom, toggleCurrentSiteInBlacklistAtom, toggleCurrentSiteInWhitelistAtom } from "../atoms/site-control"

export function SiteControlToggle() {
  const isCurrentSiteInWhitelist = useAtomValue(isCurrentSiteInWhitelistAtom)
  const toggleCurrentSiteInWhitelist = useSetAtom(toggleCurrentSiteInWhitelistAtom)
  const isCurrentSiteInBlacklist = useAtomValue(isCurrentSiteInBlacklistAtom)
  const toggleCurrentSiteInBlacklist = useSetAtom(toggleCurrentSiteInBlacklistAtom)
  const isIgnoreTab = useAtomValue(isIgnoreTabAtom)
  const { mode } = useAtomValue(configFieldsAtomMap.siteControl)

  return (
    <>
      <Activity mode={mode === "whitelist" ? "visible" : "hidden"}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium">
            {i18n.t("popup.addToWhitelist")}
          </span>
          <Switch
            checked={isCurrentSiteInWhitelist}
            onCheckedChange={toggleCurrentSiteInWhitelist}
            disabled={isIgnoreTab}
          />
        </div>
      </Activity>
      <Activity mode={mode === "blacklist" ? "visible" : "hidden"}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium">
            {i18n.t("popup.addToBlacklist")}
          </span>
          <Switch
            checked={isCurrentSiteInBlacklist}
            onCheckedChange={toggleCurrentSiteInBlacklist}
            disabled={isIgnoreTab}
          />
        </div>
      </Activity>
    </>
  )
}
