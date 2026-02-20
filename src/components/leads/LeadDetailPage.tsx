import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Mail, Phone, Globe, MapPin, Linkedin, ExternalLink, Building2, Brain, User, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { CrmTopBar } from '../crm/CrmTopBar';
import { LeadStatusBadge } from './shared/LeadStatusBadge';
import { LeadScoreBadge } from './shared/LeadScoreBadge';
import { QualificationActions } from './shared/QualificationActions';
import { useLeads } from '../../hooks/useLeads';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';
import { Skeleton, SkeletonPanel } from '../ui/Skeleton';
import { staggerContainer, fadeInUp } from '../crm/shared/motionVariants';
import { useAuth } from '../auth/AuthContext';
import { ROLE_HIERARCHY, type Role } from '../../auth/permissions';
import type { StoredLead } from '../../db/interfaces';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<StoredLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const { getById, updateLead, deleteLead, qualifyLead, rejectLead, convertLead } = useLeads();
  const { confirm, ConfirmDialogElement } = useConfirmDialog();
  const { user } = useAuth();
  const role = (user?.role || 'sales_rep') as Role;
  const canDelete = ROLE_HIERARCHY[role] >= 2; // sales_manager+

  const loadLead = async () => {
    if (!id) return;
    const data = await getById(id);
    setLead(data);
    if (data) setNotes(data.notes);
    setLoading(false);
  };

  useEffect(() => { loadLead(); }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    const confirmed = await confirm({
      title: 'Delete Lead',
      message: `Are you sure you want to delete "${lead?.companyName}"? This action cannot be undone.`,
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    try {
      await deleteLead(id);
      toast.success('Lead deleted');
      navigate('/leads');
    } catch {
      toast.error('Failed to delete lead. You may not have permission.');
    }
  };

  const handleQualify = async () => {
    if (!id) return;
    await qualifyLead(id);
    toast.success('Lead qualified');
    loadLead();
  };

  const handleReject = async (reason: string) => {
    if (!id) return;
    await rejectLead(id, reason);
    toast.success('Lead rejected');
    loadLead();
  };

  const handleConvert = async () => {
    if (!lead) return;
    try {
      const { companyId } = await convertLead(lead);
      toast.success('Lead converted to CRM');
      loadLead();
    } catch (err) {
      toast.error('Failed to convert lead');
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;
    await updateLead(id, { notes });
    setEditingNotes(false);
    toast.success('Notes saved');
    loadLead();
  };

  const handleScoreChange = async (score: number) => {
    if (!id) return;
    await updateLead(id, { buyProbability: score });
    toast.success('Score updated');
    loadLead();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
        <div className="max-w-7xl mx-auto p-4 space-y-4">
          <CrmTopBar />
          <div className="flex items-center gap-3">
            <Skeleton className="w-20 h-9 rounded-lg" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 space-y-4"><SkeletonPanel /><SkeletonPanel /></div>
            <div className="lg:col-span-2 space-y-4"><SkeletonPanel /><SkeletonPanel /></div>
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
        <div className="max-w-7xl mx-auto p-4 space-y-4">
          <CrmTopBar />
          <div className="glass rounded-xl p-12 text-center text-surface-500">Lead not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
      <motion.div
        className="max-w-7xl mx-auto p-4 space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeInUp}><CrmTopBar /></motion.div>

        {/* Header */}
        <motion.div variants={fadeInUp} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/leads')}>Back</Button>
            <div>
              <h1 className="text-2xl font-bold text-surface-100">{lead.companyName}</h1>
              {lead.tradingName && <p className="text-surface-500 text-sm">{lead.tradingName}</p>}
            </div>
            <LeadStatusBadge status={lead.qualificationStatus} />
          </div>
          {canDelete && <Button variant="danger" icon={Trash2} onClick={handleDelete}>Delete</Button>}
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left column — 3 of 5 */}
          <motion.div variants={fadeInUp} className="lg:col-span-3 space-y-4">
            {/* Company Info Card */}
            <div className="glass rounded-xl p-5">
              <h3 className="text-sm font-semibold text-surface-200 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Company Information
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="Industry" value={lead.industry} />
                <InfoRow label="Company Size" value={lead.companySize} />
                <InfoRow label="Revenue Estimate" value={lead.annualRevenueEstimate} />
                <InfoRow label="Province" value={lead.province} icon={<MapPin className="w-3 h-3" />} />
                <InfoRow label="City" value={lead.city} />
                <InfoRow label="Country" value={lead.country} />
                {lead.address && <div className="col-span-2"><InfoRow label="Address" value={lead.address} /></div>}
                {lead.website && (
                  <div className="col-span-2">
                    <span className="text-surface-500 text-xs">Website</span>
                    <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1">
                      <Globe className="w-3 h-3" />{lead.website}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Decision Maker Card */}
            <div className="glass rounded-xl p-5">
              <h3 className="text-sm font-semibold text-surface-200 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Decision Maker
              </h3>
              <div className="space-y-2">
                <p className="text-surface-100 font-medium">
                  {lead.decisionMakerName}
                  {lead.decisionMakerTitle && <span className="text-surface-500 font-normal"> — {lead.decisionMakerTitle}</span>}
                </p>
                <div className="flex flex-col gap-2 mt-2">
                  {lead.decisionMakerEmail && (
                    <a href={`mailto:${lead.decisionMakerEmail}`} className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4" />{lead.decisionMakerEmail}
                    </a>
                  )}
                  {lead.decisionMakerPhone && (
                    <a href={`tel:${lead.decisionMakerPhone}`} className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-2">
                      <Phone className="w-4 h-4" />{lead.decisionMakerPhone}
                    </a>
                  )}
                  {lead.decisionMakerLinkedin && (
                    <a href={lead.decisionMakerLinkedin} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-2">
                      <Linkedin className="w-4 h-4" />LinkedIn Profile
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* AI Intelligence Card */}
            <div className="glass rounded-xl p-5">
              <h3 className="text-sm font-semibold text-surface-200 mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4" /> AI Intelligence
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-400">Source</span>
                  <span className="text-surface-200 capitalize">{lead.sourceName.replace('_', ' ')}</span>
                </div>
                {lead.sourceUrl && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-surface-400">Source URL</span>
                    <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 text-xs flex items-center gap-1 truncate max-w-[200px]">
                      {lead.sourceUrl}<ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}
                {lead.aiConfidence > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-surface-400">AI Confidence</span>
                      <span className="text-surface-200">{lead.aiConfidence}%</span>
                    </div>
                    <div className="w-full bg-surface-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          lead.aiConfidence >= 70 ? 'bg-green-500' : lead.aiConfidence >= 40 ? 'bg-amber-500' : 'bg-surface-500'
                        }`}
                        style={{ width: `${lead.aiConfidence}%` }}
                      />
                    </div>
                  </div>
                )}
                {lead.aiReasoning && (
                  <div>
                    <span className="text-surface-400 text-xs">Reasoning</span>
                    <p className="text-surface-300 text-sm mt-1 italic">&ldquo;{lead.aiReasoning}&rdquo;</p>
                  </div>
                )}
                {lead.scrapedAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-surface-400">Scraped At</span>
                    <span className="text-surface-500 text-xs">{new Date(lead.scrapedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right column — 2 of 5 */}
          <motion.div variants={fadeInUp} className="lg:col-span-2 space-y-4">
            {/* Score */}
            <div className="glass rounded-xl p-4">
              <h3 className="text-sm font-semibold text-surface-200 mb-3">Buy Probability</h3>
              <LeadScoreBadge buyProbability={lead.buyProbability} aiConfidence={lead.aiConfidence} />
              <div className="mt-3">
                <label className="text-xs text-surface-500">Override Score</label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={lead.buyProbability}
                  onChange={(e) => handleScoreChange(Number(e.target.value))}
                  className="w-full mt-1"
                />
                <div className="flex justify-between text-xs text-surface-600">
                  <span>1</span><span>5</span><span>10</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <QualificationActions
              lead={lead}
              onQualify={handleQualify}
              onReject={handleReject}
              onConvert={handleConvert}
            />

            {/* Conversion Info */}
            {lead.qualificationStatus === 'converted' && lead.convertedCompanyId && (
              <div className="glass rounded-xl p-4">
                <h3 className="text-sm font-semibold text-green-400 mb-2">Converted</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate(`/customers/${lead.convertedCompanyId}`)}
                    className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />View Company in CRM
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  {lead.convertedContactId && (
                    <button
                      onClick={() => navigate(`/customers/${lead.convertedCompanyId}`)}
                      className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />View Contact in CRM
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-surface-200">Notes</h3>
                {!editingNotes && (
                  <button onClick={() => setEditingNotes(true)} className="text-xs text-brand-400 hover:text-brand-300">Edit</button>
                )}
              </div>
              {editingNotes ? (
                <div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input w-full h-24 resize-none text-sm"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="ghost" onClick={() => { setEditingNotes(false); setNotes(lead.notes); }}>Cancel</Button>
                    <Button variant="primary" onClick={handleSaveNotes}>Save</Button>
                  </div>
                </div>
              ) : (
                <p className="text-surface-400 text-sm whitespace-pre-wrap">
                  {lead.notes || 'No notes yet.'}
                </p>
              )}
            </div>

            {/* Tags */}
            {lead.tags.length > 0 && (
              <div className="glass rounded-xl p-4">
                <h3 className="text-sm font-semibold text-surface-200 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {lead.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-surface-700/50 text-surface-300">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
      {ConfirmDialogElement}
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-surface-500 text-xs">{label}</span>
      <p className="text-surface-200 flex items-center gap-1">{icon}{value}</p>
    </div>
  );
}
