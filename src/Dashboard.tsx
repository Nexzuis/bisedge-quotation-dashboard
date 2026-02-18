import { DashboardLayout } from './components/layout/DashboardLayout';
import { CrmTopBar } from './components/crm/CrmTopBar';

function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
      <div className="max-w-7xl mx-auto p-4">
        <CrmTopBar />
      </div>
      <DashboardLayout />
    </div>
  );
}

export default Dashboard;
