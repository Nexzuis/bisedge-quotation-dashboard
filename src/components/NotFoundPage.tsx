import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900 flex items-center justify-center p-8">
      <div className="glass rounded-xl p-8 max-w-md w-full text-center">
        <div className="text-6xl font-bold text-brand-500 mb-4">404</div>
        <h1 className="text-xl font-semibold text-surface-100 mb-2">
          Page Not Found
        </h1>
        <p className="text-surface-400 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/')}
          className="btn btn-primary px-6 py-2"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
