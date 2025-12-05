import type { ConflictData } from '@/utils/google-drive/sync'
import { i18n } from '#imports'
import { Icon } from '@iconify/react'
import { useAtomValue } from 'jotai'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/shadcn/button'
import { lastSyncTimeAtom } from '@/utils/atoms/last-sync-time'
import { ConfigConflictError, syncConfig } from '@/utils/google-drive/sync'
import { logger } from '@/utils/logger'
import { ConfigCard } from '../../../components/config-card'
import { ConflictResolutionDialog } from './components/conflict-resolution-dialog'

export function GoogleDriveSyncCard() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [conflictData, setConflictData] = useState<ConflictData | null>(null)
  const lastSyncTime = useAtomValue(lastSyncTimeAtom)

  const handleSync = async () => {
    setIsSyncing(true)

    try {
      await syncConfig()
      toast.success(i18n.t('options.config.sync.googleDrive.syncSuccess'))
    }
    catch (error) {
      if (error instanceof ConfigConflictError) {
        logger.info('Conflict detected, opening resolution dialog')
        setConflictData(error.data)
      }
      else {
        logger.error('Google Drive sync error from UI', error)
        toast.error(i18n.t('options.config.sync.googleDrive.syncError'))
      }
    }
    finally {
      setIsSyncing(false)
    }
  }

  const formatLastSyncTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <>
      <ConfigCard
        title={i18n.t('options.config.sync.googleDrive.title')}
        description={i18n.t('options.config.sync.googleDrive.description')}
      >
        <div className="w-full flex flex-col items-end gap-2">
          <Button
            onClick={handleSync}
            disabled={isSyncing}
          >
            <Icon icon="logos:google-drive" className="size-4" />
            {isSyncing
              ? i18n.t('options.config.sync.googleDrive.syncing')
              : i18n.t('options.config.sync.googleDrive.sync')}
          </Button>
          {lastSyncTime && (
            <span className="text-xs text-muted-foreground">
              {i18n.t('options.config.sync.googleDrive.lastSyncTime')}
              :
              {' '}
              {formatLastSyncTime(lastSyncTime)}
            </span>
          )}
        </div>
      </ConfigCard>

      {conflictData && (
        <ConflictResolutionDialog
          conflictData={conflictData}
          onResolved={() => {
            setConflictData(null)
            toast.success(i18n.t('options.config.sync.googleDrive.syncSuccess'))
          }}
          onCancelled={() => {
            setConflictData(null)
            toast.error(i18n.t('options.config.sync.googleDrive.syncError'))
          }}
        />
      )}
    </>
  )
}
