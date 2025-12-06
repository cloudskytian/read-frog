import type { CSSProperties } from 'react'
import type { FieldConflict } from '@/utils/google-drive/conflict-merge'
import { i18n } from '#imports'
import { Icon } from '@iconify/react'
import { Button } from '@/components/shadcn/button'
import { formatValue } from './utils'

type Resolution = 'local' | 'remote'

interface ConflictFieldProps {
  fieldKey: string
  conflict: FieldConflict
  resolution?: Resolution
  onSelectLocal: () => void
  onSelectRemote: () => void
  onReset: () => void
  indent: number
  isArray: boolean
}

const STYLE_MAP = {
  local: {
    bg: 'bg-green-100/50 dark:bg-green-900/30',
    border: 'border-l-green-500',
    text: 'text-green-600 dark:text-green-400',
    hover: 'hover:bg-green-200/50 dark:hover:bg-green-900/50',
    selected: 'bg-green-200/60 dark:bg-green-900/40',
    badge: 'bg-green-200/60 dark:bg-green-900/50',
    label: 'options.config.sync.googleDrive.conflict.localLatest',
  },
  remote: {
    bg: 'bg-blue-100/50 dark:bg-blue-900/30',
    border: 'border-l-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    hover: 'hover:bg-blue-200/50 dark:hover:bg-blue-900/50',
    selected: 'bg-blue-200/60 dark:bg-blue-900/40',
    badge: 'bg-blue-200/60 dark:bg-blue-900/50',
    label: 'options.config.sync.googleDrive.conflict.remoteLatest',
  },
  unresolved: {
    bg: 'bg-orange-100/50 dark:bg-orange-900/30',
    border: 'border-l-orange-500',
  },
} as const

interface OptionRowProps {
  type: Resolution
  value: unknown
  isSelected: boolean
  fieldKey: string
  isArray: boolean
  onClick: () => void
}

function OptionRow({ type, value, isSelected, fieldKey, isArray, onClick }: OptionRowProps) {
  const style = STYLE_MAP[type]
  return (
    <div
      className={`flex items-center cursor-pointer ${style.hover} py-1 ps-(--indent) ${isSelected ? style.selected : ''}`}
      onClick={onClick}
    >
      <span className={`${style.text} text-xs px-2 py-0.5 ${style.badge} rounded mr-2 shrink-0`}>
        {i18n.t(style.label)}
      </span>
      {!isArray && (
        <span className={style.text}>
          "
          {fieldKey}
          "
        </span>
      )}
      {!isArray && <span className="text-slate-500 dark:text-slate-500 mx-1">:</span>}
      <span className="text-slate-700 dark:text-slate-300">{formatValue(value)}</span>
      {isSelected && <Icon icon="mdi:check-circle" className={`size-4 ${style.text} ml-2`} />}
    </div>
  )
}

export function ConflictField({
  fieldKey,
  conflict,
  resolution,
  onSelectLocal,
  onSelectRemote,
  onReset,
  isArray,
  indent,
}: ConflictFieldProps) {
  const containerStyle = resolution ? STYLE_MAP[resolution] : STYLE_MAP.unresolved

  return (
    <div
      className={`${containerStyle.bg} border-l-4 ${containerStyle.border} my-1`}
      style={{ '--indent': `${indent}px` } as CSSProperties}
    >
      <div className="flex items-center py-1 ps-(--indent)">
        <Icon icon="mdi:alert" className="size-4 text-orange-500 dark:text-orange-400 shrink-0 mr-2" />
        <span className="text-orange-600 dark:text-orange-300 text-xs font-semibold">
          {i18n.t('options.config.sync.googleDrive.conflict.conflictPrompt')}
        </span>
        {resolution && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 ml-2"
            onClick={onReset}
          >
            <Icon icon="mdi:undo" className="size-3 mr-1" />
            {i18n.t('options.config.sync.googleDrive.conflict.reset')}
          </Button>
        )}
      </div>

      <OptionRow
        type="local"
        value={conflict.localValue}
        isSelected={resolution === 'local'}
        fieldKey={fieldKey}
        isArray={isArray}
        onClick={onSelectLocal}
      />
      <OptionRow
        type="remote"
        value={conflict.remoteValue}
        isSelected={resolution === 'remote'}
        fieldKey={fieldKey}
        isArray={isArray}
        onClick={onSelectRemote}
      />
    </div>
  )
}
