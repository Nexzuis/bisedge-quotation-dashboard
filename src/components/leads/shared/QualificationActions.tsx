import { useState } from 'react';
import { CheckCircle2, XCircle, ArrowRightCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StoredLead } from '../../../db/interfaces';
import { Button } from '../../ui/Button';

interface QualificationActionsProps {
  lead: StoredLead;
  onQualify: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onConvert: () => Promise<void>;
}

export function QualificationActions({ lead, onQualify, onReject, onConvert }: QualificationActionsProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState<'qualify' | 'reject' | 'convert' | null>(null);

  const handleQualify = async () => {
    setLoading('qualify');
    try {
      await onQualify();
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setLoading('reject');
    try {
      await onReject(rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
    } finally {
      setLoading(null);
    }
  };

  const handleConvert = async () => {
    setLoading('convert');
    try {
      await onConvert();
    } finally {
      setLoading(null);
    }
  };

  const isConverted = lead.qualificationStatus === 'converted';
  const isRejected = lead.qualificationStatus === 'rejected';
  const hasContactInfo = Boolean(lead.decisionMakerEmail && lead.decisionMakerPhone);
  const canQualify = ['new', 'reviewing', 'contacted'].includes(lead.qualificationStatus) && hasContactInfo;
  const canReject = ['new', 'reviewing', 'contacted', 'qualified'].includes(lead.qualificationStatus);
  const canConvert = lead.qualificationStatus === 'qualified';

  return (
    <div className="glass rounded-xl p-4">
      <h3 className="text-sm font-semibold text-surface-200 mb-3">Actions</h3>

      {isConverted && (
        <div className="text-green-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Converted to CRM
        </div>
      )}

      {isRejected && lead.rejectionReason && (
        <div className="text-red-400 text-sm mb-3">
          <span className="font-medium">Rejected:</span> {lead.rejectionReason}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {['new', 'reviewing', 'contacted'].includes(lead.qualificationStatus) && (
          <Button
            variant="primary"
            icon={CheckCircle2}
            onClick={handleQualify}
            loading={loading === 'qualify'}
            disabled={loading !== null || !hasContactInfo}
            title={!hasContactInfo ? 'Requires decision maker email and phone' : undefined}
          >
            Qualify
          </Button>
        )}
        {['new', 'reviewing', 'contacted'].includes(lead.qualificationStatus) && !hasContactInfo && (
          <p className="text-xs text-amber-400 w-full">Missing email or phone — cannot qualify</p>
        )}

        {canReject && (
          <Button
            variant="danger"
            icon={XCircle}
            onClick={() => setShowRejectModal(true)}
            disabled={loading !== null}
          >
            Reject
          </Button>
        )}

        {canConvert && (
          <Button
            variant="feature"
            icon={ArrowRightCircle}
            onClick={handleConvert}
            loading={loading === 'convert'}
            disabled={loading !== null}
          >
            Convert to CRM
          </Button>
        )}
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="glass rounded-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-surface-100 mb-4">Reject Lead</h3>
              <p className="text-surface-400 text-sm mb-3">
                Provide a reason for rejecting <strong className="text-surface-200">{lead.companyName}</strong>
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., No forklift need, wrong industry, duplicate..."
                className="input w-full h-24 resize-none text-sm mb-4"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowRejectModal(false)}>Cancel</Button>
                <Button
                  variant="danger"
                  onClick={handleReject}
                  loading={loading === 'reject'}
                  disabled={!rejectReason.trim() || loading !== null}
                >
                  Reject Lead
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
