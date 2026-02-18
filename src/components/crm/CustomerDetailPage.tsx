import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { CrmTopBar } from './CrmTopBar';
import { CompanyInfoCard } from './detail/CompanyInfoCard';
import { ContactsList } from './detail/ContactsList';
import { ActivityTimeline } from './detail/ActivityTimeline';
import { AddActivityForm } from './detail/AddActivityForm';
import { LinkedQuotes } from './detail/LinkedQuotes';
import { useCompanies } from '../../hooks/useCompanies';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';
import { Skeleton, SkeletonPanel } from '../ui/Skeleton';
import { staggerContainer, fadeInUp } from './shared/motionVariants';
import type { StoredCompany } from '../../db/interfaces';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<StoredCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const { getById, deleteCompany } = useCompanies();
  const { confirm, ConfirmDialogElement } = useConfirmDialog();

  const loadCompany = async () => {
    if (!id) return;
    const data = await getById(id);
    setCompany(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCompany();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    const confirmed = await confirm({
      title: 'Delete Company',
      message: `Are you sure you want to delete "${company?.name}"? This action cannot be undone.`,
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    await deleteCompany(id);
    toast.success('Company deleted');
    navigate('/customers');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
        <div className="max-w-7xl mx-auto p-4 space-y-4">
          <CrmTopBar />
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-20 h-9 rounded-lg" />
              <Skeleton className="h-8 w-48" />
            </div>
            <Skeleton className="w-24 h-9 rounded-lg" />
          </div>
          {/* Two-column skeleton matching the real layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <SkeletonPanel />
              <SkeletonPanel />
            </div>
            <div className="lg:col-span-3 space-y-4">
              <SkeletonPanel />
              <SkeletonPanel />
              <SkeletonPanel />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
        <div className="max-w-7xl mx-auto p-4 space-y-4">
          <CrmTopBar />
          <div className="glass rounded-xl p-12 text-center text-surface-500">Company not found</div>
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
        <motion.div variants={fadeInUp}>
          <CrmTopBar />
        </motion.div>

        {/* Header */}
        <motion.div variants={fadeInUp} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/customers')}>Back</Button>
            <h1 className="text-2xl font-bold text-surface-100">{company.name}</h1>
          </div>
          <Button variant="danger" icon={Trash2} onClick={handleDelete}>Delete</Button>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left column */}
          <motion.div variants={fadeInUp} className="lg:col-span-2 space-y-4">
            <CompanyInfoCard company={company} onUpdate={loadCompany} />
            <ContactsList companyId={company.id} />
          </motion.div>

          {/* Right column */}
          <motion.div variants={fadeInUp} className="lg:col-span-3 space-y-4">
            <AddActivityForm
              companyId={company.id}
              onSaved={() => setActivityRefreshKey((k) => k + 1)}
            />
            <ActivityTimeline companyId={company.id} refreshKey={activityRefreshKey} />
            <LinkedQuotes companyId={company.id} />
          </motion.div>
        </div>
      </motion.div>
      {ConfirmDialogElement}
    </div>
  );
}
