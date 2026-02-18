import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const isCloud = (import.meta.env.VITE_APP_MODE || 'local') !== 'local';

const LoginPage = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(emailOrUsername, password);

    if (success) {
      navigate('/');
    } else {
      setError(isCloud ? 'Invalid email or password' : 'Invalid username or password');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900 dot-grid">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass rounded-2xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-surface-100 mb-2">
            Bisedge Quotation System
          </h1>
          <p className="text-surface-400">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              {isCloud ? 'Email' : 'Username'}
            </label>
            <input
              type={isCloud ? 'email' : 'text'}
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              className="input w-full py-3"
              placeholder={isCloud ? 'Enter email' : 'Enter username'}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full py-3"
              placeholder="Enter password"
              required
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="bg-danger/20 border border-danger/50 text-red-200 px-4 py-3 rounded-lg"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </motion.button>
        </form>

        {import.meta.env.DEV && (
          <div className="mt-6 text-center text-sm text-surface-500">
            Dev mode active
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default LoginPage;
