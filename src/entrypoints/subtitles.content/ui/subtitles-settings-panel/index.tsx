import type { ControlsConfig } from "@/entrypoints/subtitles.content/platforms"
import { useAtomValue } from "jotai"
import { subtitlesVisibleAtom } from "../../atoms"
import { SubtitlesSettingsPanelShell } from "./components/subtitles-settings-panel-shell"
import { SubtitlesToggle } from "./components/subtitles-toggle"

interface SubtitlesSettingsPanelProps {
  controlsConfig?: ControlsConfig
  onToggleSubtitles: (enabled: boolean) => void
}

export function SubtitlesSettingsPanel({ controlsConfig, onToggleSubtitles }: SubtitlesSettingsPanelProps) {
  const isVisible = useAtomValue(subtitlesVisibleAtom)

  return (
    <SubtitlesSettingsPanelShell controlsConfig={controlsConfig}>
      <SubtitlesToggle
        isVisible={isVisible}
        onToggleSubtitles={onToggleSubtitles}
      />
    </SubtitlesSettingsPanelShell>
  )
}
