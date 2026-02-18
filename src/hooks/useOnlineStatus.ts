/**
 * Online Status Hook
 *
 * Detects and tracks internet connectivity status.
 * Provides real-time updates when connection is lost or restored.
 */

import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    function handleOnline() {
      console.log('🌐 Connection restored - online');
      setIsOnline(true);

      // Track if we came back from offline (useful for triggering sync)
      if (!navigator.onLine) {
        setWasOffline(true);
      }
    }

    function handleOffline() {
      console.log('📡 Connection lost - offline');
      setIsOnline(false);
      setWasOffline(true);
    }

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    wasOffline,
    resetWasOffline: () => setWasOffline(false),
  };
}

/**
 * Hook to execute a callback when connection is restored
 */
export function useOnConnectionRestored(callback: () => void) {
  const { isOnline, wasOffline, resetWasOffline } = useOnlineStatus();

  useEffect(() => {
    if (isOnline && wasOffline) {
      console.log('🔄 Connection restored - triggering callback');
      callback();
      resetWasOffline();
    }
  }, [isOnline, wasOffline, callback, resetWasOffline]);

  return { isOnline };
}
