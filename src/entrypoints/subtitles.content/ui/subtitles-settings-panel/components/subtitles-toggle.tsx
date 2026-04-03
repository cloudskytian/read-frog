import { i18n } from "#imports"
import { Label } from "@/components/ui/base-ui/label"
import { Switch } from "@/components/ui/base-ui/switch"
import { APP_NAME } from "@/utils/constants/app"

interface SubtitlesToggleProps {
  isVisible: boolean
  onToggleSubtitles: (enabled: boolean) => void
}

export function SubtitlesToggle({ isVisible, onToggleSubtitles }: SubtitlesToggleProps) {
  const title = `${APP_NAME} ${i18n.t("options.videoSubtitles.title")}`
  const switchId = "read-frog-subtitles-toggle"

  return (
    <div className="flex items-center gap-3 rounded-[14px] px-2 py-1.5 transition-colors hover:bg-white/[0.045]">
      <Label
        htmlFor={switchId}
        className="min-w-0 flex-1 cursor-pointer rounded-md px-2 py-1 text-left text-white/96 transition-colors hover:text-white"
      >
        <div className="text-[13px] leading-5 font-semibold text-white/96">
          {title}
        </div>
      </Label>

      <Switch
        id={switchId}
        checked={isVisible}
        onCheckedChange={checked => onToggleSubtitles(checked)}
        aria-label={title}
        className="data-checked:bg-[#d8a94b] data-unchecked:bg-white/14 border-white/12 shadow-none"
      />
    </div>
  )
}
