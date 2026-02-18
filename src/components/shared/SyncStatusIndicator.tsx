/**
 * Sync Status Indicator
 *
 * Shows real-time sync status in the UI:
 * - Online/Offline indicator
 * - Pending operations count
 * - Last synced timestamp
 * - Sync in progress spinner
 */

import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useSyncStatus } from '../sync/SyncQueue';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { toast } from 'sonner';

export function SyncStatusIndicator() {
  const { isOnline } = useOnlineStatus();
  const syncStatus = useSyncStatus();
  const [showDetails, setShowDetails] = useState(false);

  // Show toast when going offline/online
  useEffect(() => {
    if (!isOnline) {
      toast.info('Working offline', {
        description: 'Changes will sync when connection is restored',
        icon: <CloudOff className="w-4 h-4" />,
      });
    }
  }, [isOnline]);

  // Show toast when sync completes
  useEffect(() => {
    if (isOnline && !syncStatus.isSyncing && syncStatus.pendingOperations === 0 && syncStatus.lastSyncedAt) {
      const timeSinceSync = Date.now() - syncStatus.lastSyncedAt.getTime();
      if (timeSinceSync < 5000) {
        // Only show if synced in last 5 seconds
        toast.success('All changes synced', {
          description: 'Your data is backed up to the cloud',
          icon: <CheckCircle className="w-4 h-4" />,
        });
      }
    }
  }, [syncStatus.isSyncing, syncStatus.pendingOperations]);

  if (!isOnline) {
    return (
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors"
        title="Working offline - changes will sync when online"
      >
        <CloudOff className="w-4 h-4 text-yellow-500" />
        <span className="text-sm text-yellow-600 font-medium">Offline</span>
        {syncStatus.pendingOperations > 0 && (
          <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full">
            {syncStatus.pendingOperations}
          </span>
        )}
      </button>
    );
  }

  if (syncStatus.isSyncing) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
        <span className="text-sm text-blue-600 font-medium">Syncing...</span>
        {syncStatus.pendingOperations > 0 && (
          <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
            {syncStatus.pendingOperations}
          </span>
        )}
      </div>
    );
  }

  if (syncStatus.pendingOperations > 0) {
    return (
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
        title={`${syncStatus.pendingOperations} changes waiting to sync`}
      >
        <AlertCircle className="w-4 h-4 text-orange-500" />
        <span className="text-sm text-orange-600 font-medium">
          {syncStatus.pendingOperations} pending
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setShowDetails(!showDetails)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors"
      title={syncStatus.lastSyncedAt ? `Last synced: ${syncStatus.lastSyncedAt.toLocaleTimeString()}` : 'All changes synced'}
    >
      <Cloud className="w-4 h-4 text-green-500" />
      <span className="text-sm text-green-600 font-medium">Synced</span>
      <CheckCircle className="w-3 h-3 text-green-500" />
    </button>
  );
}
