import type { FieldConflict } from '@/utils/google-drive/conflict-merge'
import { useMemo, useState } from 'react'
import { TreeEntry } from './tree-entry'

interface JsonTreeViewProps {
  data: any
  conflictMap: Map<string, FieldConflict>
  resolutions: Record<string, 'local' | 'remote'>
  onSelectLocal: (pathKey: string) => void
  onSelectRemote: (pathKey: string) => void
  onReset: (pathKey: string) => void
}

interface InternalProps extends JsonTreeViewProps {
  path: string[]
  level: number
}

export function JsonTreeView(props: JsonTreeViewProps) {
  return <JsonTreeViewInternal {...props} path={[]} level={0} />
}

function JsonTreeViewInternal({
  data,
  conflictMap,
  resolutions,
  onSelectLocal,
  onSelectRemote,
  onReset,
  path,
  level,
}: InternalProps) {
  const initialCollapsed = useMemo(() => {
    const collapsed: Record<string, boolean> = {}
    const entries = Array.isArray(data) ? data.map((v, i) => [String(i), v]) : Object.entries(data)

    for (const [key, value] of entries) {
      const pathKey = [...path, key].join('.')
      if (value !== null && typeof value === 'object') {
        const hasConflict = Array.from(conflictMap.keys()).some(cp =>
          cp === pathKey || cp.startsWith(`${pathKey}.`),
        )
        if (!hasConflict) {
          collapsed[pathKey] = true
        }
      }
    }
    return collapsed
  }, [data, conflictMap, path])

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(initialCollapsed)

  const indent = level * 16

  if (data === null || data === undefined) {
    return (
      <div className="font-mono text-sm text-slate-600 dark:text-slate-400" style={{ paddingLeft: indent }}>
        {String(data)}
      </div>
    )
  }

  if (typeof data !== 'object') {
    return (
      <div className="font-mono text-sm text-slate-700 dark:text-slate-300" style={{ paddingLeft: indent }}>
        {typeof data === 'string' ? `"${data}"` : String(data)}
      </div>
    )
  }

  const isArray = Array.isArray(data)
  const entries = isArray ? data.map((v, i) => [String(i), v]) : Object.entries(data)

  const entryIndent = level === 0 ? (level + 1) * 16 : indent
  const closeBracketIndent = level === 0 ? (level + 1) * 16 : indent
  const conflictFieldLevel = level === 0 ? level + 1 : level

  return (
    <div className="font-mono text-sm">
      {level === 0 && <div className="text-slate-500">{'{'}</div>}
      {entries.map(([key, value]) => {
        const currentPath = [...path, key]
        const pathKey = currentPath.join('.')

        return (
          <TreeEntry
            key={pathKey}
            entryKey={key}
            value={value}
            currentPath={currentPath}
            pathKey={pathKey}
            indent={entryIndent}
            closeBracketIndent={closeBracketIndent}
            conflictMap={conflictMap}
            resolutions={resolutions}
            isCollapsed={collapsed[pathKey]}
            onToggleCollapsed={pk => setCollapsed(prev => ({ ...prev, [pk]: !prev[pk] }))}
            onSelectLocal={onSelectLocal}
            onSelectRemote={onSelectRemote}
            onReset={onReset}
            isArray={isArray}
            level={conflictFieldLevel}
            JsonTreeViewInternal={JsonTreeViewInternal}
          />
        )
      })}
      {level === 0 && <div className="text-slate-500">{'}'}</div>}
    </div>
  )
}
