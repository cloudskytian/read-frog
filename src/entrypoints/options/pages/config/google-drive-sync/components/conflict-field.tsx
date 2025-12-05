import type { FieldConflict } from '@/utils/google-drive/conflict-merge'
import { i18n } from '#imports'
import { Icon } from '@iconify/react'
import { Button } from '@/components/shadcn/button'

interface ConflictFieldProps {
  fieldKey: string
  conflict: FieldConflict
  resolution?: 'local' | 'remote'
  onSelectLocal: () => void
  onSelectRemote: () => void
  onReset: () => void
  level: number
  isArray: boolean
}

export function ConflictField({
  fieldKey,
  conflict,
  resolution,
  onSelectLocal,
  onSelectRemote,
  onReset,
  level,
  isArray,
}: ConflictFieldProps) {
  const indent = level * 16

  const formatValue = (value: unknown): string => {
    if (value === null)
      return 'null'
    if (value === undefined)
      return 'undefined'
    if (typeof value === 'string')
      return `"${value}"`
    if (typeof value === 'object')
      return JSON.stringify(value, null, 2)
    return String(value)
  }

  const bgColor = resolution === 'local'
    ? 'bg-green-100/50 dark:bg-green-900/30'
    : resolution === 'remote'
      ? 'bg-blue-100/50 dark:bg-blue-900/30'
      : 'bg-orange-100/50 dark:bg-orange-900/30'

  const borderColor = resolution === 'local'
    ? 'border-l-4 border-l-green-500'
    : resolution === 'remote'
      ? 'border-l-4 border-l-blue-500'
      : 'border-l-4 border-l-orange-500'

  return (
    <div className={`${bgColor} ${borderColor} my-1`}>
      <div className="flex items-center py-1" style={{ paddingLeft: indent }}>
        <Icon icon="mdi:alert" className="size-4 text-orange-500 dark:text-orange-400 shrink-0 mr-2" />
        <span className="text-orange-600 dark:text-orange-300 text-xs font-semibold">{i18n.t('options.config.sync.googleDrive.conflict.conflictPrompt')}</span>

        {resolution && (
          <div className="flex py-1" style={{ paddingLeft: indent + 20 }}>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              onClick={onReset}
            >
              <Icon icon="mdi:undo" className="size-3 mr-1" />
              {i18n.t('options.config.sync.googleDrive.conflict.reset')}
            </Button>
          </div>
        )}
      </div>

      <div
        className={`flex items-center cursor-pointer hover:bg-green-200/50 dark:hover:bg-green-900/50 py-1 ${resolution === 'local' ? 'bg-green-200/60 dark:bg-green-900/40' : ''}`}
        style={{ paddingLeft: indent + 20 }}
        onClick={onSelectLocal}
      >
        <span className="text-green-600 dark:text-green-400 text-xs px-2 py-0.5 bg-green-200/60 dark:bg-green-900/50 rounded mr-2 shrink-0">{i18n.t('options.config.sync.googleDrive.conflict.localLatest')}</span>
        {!isArray && (
          <span className="text-green-600 dark:text-green-400">
            "
            {fieldKey}
            "
          </span>
        )}
        {!isArray && <span className="text-slate-500 dark:text-slate-500 mx-1">:</span>}
        <span className="text-slate-700 dark:text-slate-300">{formatValue(conflict.localValue)}</span>
        {resolution === 'local' && (
          <Icon icon="mdi:check-circle" className="size-4 text-green-600 dark:text-green-400 ml-2" />
        )}
      </div>

      <div
        className={`flex items-center cursor-pointer hover:bg-blue-200/50 dark:hover:bg-blue-900/50 py-1 ${resolution === 'remote' ? 'bg-blue-200/60 dark:bg-blue-900/40' : ''}`}
        style={{ paddingLeft: indent + 20 }}
        onClick={onSelectRemote}
      >
        <span className="text-blue-600 dark:text-blue-400 text-xs px-2 py-0.5 bg-blue-200/60 dark:bg-blue-900/50 rounded mr-2 shrink-0">{i18n.t('options.config.sync.googleDrive.conflict.remoteLatest')}</span>
        {!isArray && (
          <span className="text-blue-600 dark:text-blue-400">
            "
            {fieldKey}
            "
          </span>
        )}
        {!isArray && <span className="text-slate-500 dark:text-slate-500 mx-1">:</span>}
        <span className="text-slate-700 dark:text-slate-300">{formatValue(conflict.remoteValue)}</span>
        {resolution === 'remote' && (
          <Icon icon="mdi:check-circle" className="size-4 text-blue-600 dark:text-blue-400 ml-2" />
        )}
      </div>

    </div>
  )
}
