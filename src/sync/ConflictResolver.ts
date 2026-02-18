/**
 * Conflict Resolution Strategy
 *
 * Handles conflicts when the same quote is edited offline by multiple users.
 * Uses last-write-wins strategy with version checking.
 */

import type { QuoteState, UnitSlot, QuoteStatus } from '../types/quote';

export interface ConflictResolution {
  resolved: QuoteState;
  hadConflict: boolean;
  strategy: 'local-wins' | 'remote-wins' | 'merged';
  changes?: string[];
  droppedLocalSlots?: number[];
}

/**
 * Resolve conflict between local and remote versions of a quote
 */
export function resolveQuoteConflict(
  localQuote: QuoteState,
  remoteQuote: QuoteState
): ConflictResolution {
  console.log('⚠️  Conflict detected between local and remote quote versions');
  console.log('Local version:', localQuote.version, 'updated:', localQuote.updatedAt);
  console.log('Remote version:', remoteQuote.version, 'updated:', remoteQuote.updatedAt);

  // Compare timestamps
  const localTime = new Date(localQuote.updatedAt).getTime();
  const remoteTime = new Date(remoteQuote.updatedAt).getTime();

  // Strategy 1: Last-Write-Wins (simple)
  if (localTime > remoteTime) {
    console.log('✅ Resolution: Local is newer - using local version');
    return {
      resolved: {
        ...localQuote,
        version: Math.max(localQuote.version, remoteQuote.version) + 1,
      },
      hadConflict: true,
      strategy: 'local-wins',
      changes: ['Local version was newer, kept local changes'],
    };
  } else if (remoteTime > localTime) {
    console.log('✅ Resolution: Remote is newer - using remote version');
    return {
      resolved: {
        ...remoteQuote,
        version: remoteQuote.version + 1,
      },
      hadConflict: true,
      strategy: 'remote-wins',
      changes: ['Remote version was newer, discarded local changes'],
    };
  }

  // Strategy 2: Same timestamp - attempt smart merge
  console.log('🔀 Resolution: Same timestamp - attempting merge');

  const changes: string[] = [];

  // Base on remote (server is source of truth)
  const merged: QuoteState = { ...remoteQuote };

  // Merge customer info (take remote)
  if (localQuote.clientName !== remoteQuote.clientName) {
    changes.push(`Customer name: "${localQuote.clientName}" → "${remoteQuote.clientName}"`);
  }

  // Merge slots - combine unique units
  const { merged: mergedSlots, droppedLocalSlots } = mergeSlots(localQuote.slots, remoteQuote.slots);
  if (JSON.stringify(mergedSlots) !== JSON.stringify(remoteQuote.slots)) {
    merged.slots = mergedSlots;
    changes.push('Merged unit slots from both versions');
  }
  if (droppedLocalSlots.length > 0) {
    changes.push(`Local units in slots ${droppedLocalSlots.join(', ')} were overwritten by remote`);
  }

  // Take highest status progression
  const mergedStatus = mergeStatus(localQuote.status, remoteQuote.status);
  if (mergedStatus !== remoteQuote.status) {
    merged.status = mergedStatus;
    changes.push(`Status: ${remoteQuote.status} → ${mergedStatus}`);
  }

  // Take highest approval status
  const mergedApprovalStatus = mergeStatus(localQuote.approvalStatus, remoteQuote.approvalStatus);
  if (mergedApprovalStatus !== remoteQuote.approvalStatus) {
    merged.approvalStatus = mergedApprovalStatus;
    changes.push(`Approval: ${remoteQuote.approvalStatus} → ${mergedApprovalStatus}`);
  }

  // Increment version
  merged.version = Math.max(localQuote.version, remoteQuote.version) + 1;
  merged.updatedAt = new Date();

  console.log('✅ Resolution: Merged both versions', changes);

  return {
    resolved: merged,
    hadConflict: true,
    strategy: 'merged',
    changes,
    droppedLocalSlots,
  };
}

/**
 * Merge slots from two quote versions
 * Combines unique units, prefers filled slots over empty
 */
function mergeSlots(localSlots: UnitSlot[], remoteSlots: UnitSlot[]): { merged: UnitSlot[]; droppedLocalSlots: number[] } {
  const merged: UnitSlot[] = [...remoteSlots];
  const droppedLocalSlots: number[] = [];

  for (let i = 0; i < localSlots.length; i++) {
    const localSlot = localSlots[i];
    const remoteSlot = remoteSlots[i];

    // If local has a unit and remote is empty, use local
    if (!localSlot.isEmpty && remoteSlot.isEmpty) {
      merged[i] = localSlot;
    }

    // If both have units but different, prefer remote — track dropped local
    if (!localSlot.isEmpty && !remoteSlot.isEmpty && localSlot.modelCode !== remoteSlot.modelCode) {
      droppedLocalSlots.push(i);
    }
  }

  return { merged, droppedLocalSlots };
}

/**
 * Merge quote status - take the "furthest along" status
 */
function mergeStatus(status1: QuoteStatus, status2: QuoteStatus): QuoteStatus {
  const statusOrder: QuoteStatus[] = [
    'draft',
    'pending-approval',
    'approved',
    'sent-to-customer',
    'rejected',
    'expired',
  ];

  const index1 = statusOrder.indexOf(status1);
  const index2 = statusOrder.indexOf(status2);

  // Return the status that's further along in the workflow
  return index1 > index2 ? status1 : status2;
}

/**
 * Check if a quote has conflicts with remote version
 */
export async function detectConflict(
  localQuote: QuoteState,
  remoteVersion: number
): Promise<boolean> {
  return localQuote.version !== remoteVersion;
}

/**
 * Create a diff summary between two quotes
 */
export function createDiffSummary(
  localQuote: QuoteState,
  remoteQuote: QuoteState
): string[] {
  const diffs: string[] = [];

  // Customer changes
  if (localQuote.clientName !== remoteQuote.clientName) {
    diffs.push(`Customer: "${localQuote.clientName}" vs "${remoteQuote.clientName}"`);
  }

  // Pricing changes
  if (localQuote.customerROE !== remoteQuote.customerROE) {
    diffs.push(`ROE: ${localQuote.customerROE} vs ${remoteQuote.customerROE}`);
  }

  if (localQuote.discountPct !== remoteQuote.discountPct) {
    diffs.push(`Discount: ${localQuote.discountPct}% vs ${remoteQuote.discountPct}%`);
  }

  // Slot changes
  const localActiveSlots = localQuote.slots.filter((s) => !s.isEmpty).length;
  const remoteActiveSlots = remoteQuote.slots.filter((s) => !s.isEmpty).length;

  if (localActiveSlots !== remoteActiveSlots) {
    diffs.push(`Units: ${localActiveSlots} vs ${remoteActiveSlots}`);
  }

  // Status changes
  if (localQuote.status !== remoteQuote.status) {
    diffs.push(`Status: ${localQuote.status} vs ${remoteQuote.status}`);
  }

  if (localQuote.approvalStatus !== remoteQuote.approvalStatus) {
    diffs.push(`Approval: ${localQuote.approvalStatus} vs ${remoteQuote.approvalStatus}`);
  }

  return diffs;
}
