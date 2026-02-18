import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ArrowLeft, LogOut, User } from 'lucide-react';

const AdminTopBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="bg-surface-700/50 backdrop-blur-xl border-b border-surface-600/50">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-surface-800/40 hover:bg-surface-700/50 border border-surface-700/50 rounded-lg text-surface-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <h1 className="text-2xl font-bold text-surface-100">
            Admin Panel
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-surface-100/80">
            <User className="w-5 h-5" />
            <span>{user?.fullName}</span>
            <span className="text-xs bg-brand-600/30 px-2 py-1 rounded">
              {user?.role.toUpperCase()}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 rounded-lg text-red-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminTopBar;
