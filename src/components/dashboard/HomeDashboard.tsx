import { motion } from 'framer-motion';
import { CrmTopBar } from '../crm/CrmTopBar';
import { WelcomeHeader } from './widgets/WelcomeHeader';
import { QuickActionsWidget } from './widgets/QuickActionsWidget';
import { PendingApprovalsWidget } from './widgets/PendingApprovalsWidget';
import { QuoteStatsWidget } from './widgets/QuoteStatsWidget';
import { MyQuotesWidget } from './widgets/MyQuotesWidget';
import { PipelineWidget } from './widgets/PipelineWidget';
import { RecentActivityWidget } from './widgets/RecentActivityWidget';
import { TeamOverviewWidget } from './widgets/TeamOverviewWidget';
import { SystemHealthWidget } from './widgets/SystemHealthWidget';
import { LeadStatsWidget } from './widgets/LeadStatsWidget';
import { useAuth } from '../auth/AuthContext';
import { ROLE_HIERARCHY, type Role } from '../../auth/permissions';
import { staggerContainer } from '../crm/shared/motionVariants';

export default function HomeDashboard() {
  const { user } = useAuth();
  const role = (user?.role || 'sales_rep') as Role;
  const roleLevel = ROLE_HIERARCHY[role] || 0;
  const isManager = roleLevel >= 2; // sales_manager, local_leader, ceo, system_admin
  const isAdmin = role === 'system_admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
      <motion.div
        className="max-w-7xl mx-auto p-4 space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Top Bar */}
        <CrmTopBar />

        {/* Welcome + Quick Actions */}
        <WelcomeHeader user={user} />
        <QuickActionsWidget role={role} />

        {/* APPROVALS - prominent for Manager/CEO/Admin */}
        {isManager && <PendingApprovalsWidget />}

        {/* QUOTE STATS - clickable cards */}
        <QuoteStatsWidget userOnly={!isManager} />

        {/* MY QUOTES - for all roles */}
        <MyQuotesWidget />

        {/* LEAD STATS */}
        <LeadStatsWidget />

        {/* PIPELINE + ACTIVITY */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PipelineWidget />
          <RecentActivityWidget />
        </div>

        {/* TEAM OVERVIEW - Manager+ */}
        {isManager && <TeamOverviewWidget />}

        {/* SYSTEM HEALTH - Admin only */}
        {isAdmin && <SystemHealthWidget />}
      </motion.div>
    </div>
  );
}
