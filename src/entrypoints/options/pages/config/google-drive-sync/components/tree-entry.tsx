import type React from 'react'
import type { FieldConflict } from '@/utils/google-drive/conflict-merge'
import { i18n } from '#imports'
import { Icon } from '@iconify/react'
import { ConflictField } from './conflict-field'

interface TreeEntryProps {
  entryKey: string
  value: any
  currentPath: string[]
  pathKey: string
  indent: number
  closeBracketIndent: number
  conflictMap: Map<string, FieldConflict>
  resolutions: Record<string, 'local' | 'remote'>
  isCollapsed: boolean
  onToggleCollapsed: (pathKey: string) => void
  onSelectLocal: (pathKey: string) => void
  onSelectRemote: (pathKey: string) => void
  onReset: (pathKey: string) => void
  isArray: boolean
  level: number
  JsonTreeViewInternal: React.ComponentType<{
    data: any
    conflictMap: Map<string, FieldConflict>
    resolutions: Record<string, 'local' | 'remote'>
    onSelectLocal: (pathKey: string) => void
    onSelectRemote: (pathKey: string) => void
    onReset: (pathKey: string) => void
    path: string[]
    level: number
  }>
}

export function TreeEntry({
  entryKey,
  value,
  currentPath,
  pathKey,
  indent,
  closeBracketIndent,
  conflictMap,
  resolutions,
  isCollapsed,
  onToggleCollapsed,
  onSelectLocal,
  onSelectRemote,
  onReset,
  isArray,
  level,
  JsonTreeViewInternal,
}: TreeEntryProps) {
  const conflict = conflictMap.get(pathKey)
  const resolution = resolutions[pathKey]
  const hasChildren = value !== null && typeof value === 'object'
  const childCount = hasChildren ? (Array.isArray(value) ? value.length : Object.keys(value).length) : 0
  const hasConflictInChildren = hasChildren && Array.from(conflictMap.keys()).some(k => k.startsWith(`${pathKey}.`))

  if (conflict) {
    return (
      <ConflictField
        key={pathKey}
        fieldKey={entryKey}
        conflict={conflict}
        resolution={resolution}
        onSelectLocal={() => onSelectLocal(pathKey)}
        onSelectRemote={() => onSelectRemote(pathKey)}
        onReset={() => onReset(pathKey)}
        level={level}
        isArray={isArray}
      />
    )
  }

  return (
    <div key={pathKey}>
      <div
        className="flex items-center hover:bg-slate-100/50 dark:hover:bg-slate-800/50 py-0.5"
        style={{ paddingLeft: indent }}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={() => onToggleCollapsed(pathKey)}
            className="w-4 h-4 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mr-1"
          >
            <Icon icon={isCollapsed ? 'mdi:chevron-right' : 'mdi:chevron-down'} className="size-3" />
          </button>
        )}
        {!hasChildren && <div className="w-5" />}

        {!isArray && (
          <span className="text-blue-600 dark:text-blue-400">
            "
            {entryKey}
            "
          </span>
        )}
        {!isArray && <span className="text-slate-500 dark:text-slate-500 mx-1">:</span>}

        {hasChildren
          ? (
              <span className="text-slate-500 dark:text-slate-500">
                {isCollapsed
                  ? (
                      <>
                        {Array.isArray(value) ? '[' : '{'}
                        <span className="text-slate-400 dark:text-slate-600 mx-1">
                          {childCount}
                          {' '}
                          {childCount === 1 ? i18n.t('options.config.sync.googleDrive.conflict.item') : i18n.t('options.config.sync.googleDrive.conflict.items')}
                        </span>
                        {Array.isArray(value) ? ']' : '}'}
                        {hasConflictInChildren && (
                          <span className="ml-2 text-orange-500 dark:text-orange-400 text-xs">{i18n.t('options.config.sync.googleDrive.conflict.hasConflictInChildren')}</span>
                        )}
                      </>
                    )
                  : (Array.isArray(value) ? '[' : '{')}
              </span>
            )
          : (
              <span className="text-slate-700 dark:text-slate-300">
                {typeof value === 'string' ? `"${value}"` : String(value)}
                <span className="text-slate-400 dark:text-slate-600">,</span>
              </span>
            )}
      </div>

      {hasChildren && !isCollapsed && (
        <>
          <JsonTreeViewInternal
            data={value}
            conflictMap={conflictMap}
            resolutions={resolutions}
            onSelectLocal={onSelectLocal}
            onSelectRemote={onSelectRemote}
            onReset={onReset}
            path={currentPath}
            level={level + 1}
          />
          <div className="text-slate-500 dark:text-slate-500" style={{ paddingLeft: closeBracketIndent }}>
            {Array.isArray(value) ? ']' : '}'}
            <span className="text-slate-400 dark:text-slate-600">,</span>
          </div>
        </>
      )}
    </div>
  )
}
