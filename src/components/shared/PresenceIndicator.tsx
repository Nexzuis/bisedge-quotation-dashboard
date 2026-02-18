/**
 * Presence Indicator Component
 *
 * Shows who is currently viewing a quote in real-time.
 * Displays user avatars and names.
 */

import { Eye, Users } from 'lucide-react';
import { usePresence } from '../../hooks/usePresence';

interface PresenceIndicatorProps {
  quoteId: string;
  compact?: boolean;
}

export function PresenceIndicator({ quoteId, compact = false }: PresenceIndicatorProps) {
  const { viewers, viewerCount } = usePresence(quoteId);

  if (viewerCount === 0) {
    return null;
  }

  if (compact) {
    return (
      <div
        className="flex items-center gap-1.5 text-xs text-surface-500"
        title={viewers.map((v) => v.userName).join(', ')}
      >
        <Eye className="w-3 h-3" />
        <span>{viewerCount}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
      <Users className="w-4 h-4 text-blue-600" />
      <div className="text-sm">
        {viewerCount === 1 ? (
          <span className="text-blue-700">
            <strong>{viewers[0].userName}</strong> is viewing
          </span>
        ) : viewerCount === 2 ? (
          <span className="text-blue-700">
            <strong>{viewers[0].userName}</strong> and{' '}
            <strong>{viewers[1].userName}</strong> are viewing
          </span>
        ) : (
          <span className="text-blue-700">
            <strong>{viewers[0].userName}</strong> and{' '}
            <strong>{viewerCount - 1} others</strong> are viewing
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Avatar stack for presence (compact display)
 */
export function PresenceAvatars({ quoteId }: { quoteId: string }) {
  const { viewers } = usePresence(quoteId);

  if (viewers.length === 0) {
    return null;
  }

  return (
    <div className="flex -space-x-2" title={viewers.map((v) => v.userName).join(', ')}>
      {viewers.slice(0, 3).map((viewer, index) => (
        <div
          key={viewer.userId}
          className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium"
          style={{ zIndex: viewers.length - index }}
        >
          {viewer.userName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)}
        </div>
      ))}
      {viewers.length > 3 && (
        <div
          className="w-8 h-8 rounded-full bg-surface-300 border-2 border-white flex items-center justify-center text-surface-700 text-xs font-medium"
          style={{ zIndex: 0 }}
        >
          +{viewers.length - 3}
        </div>
      )}
    </div>
  );
}
