import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Logo, IconLoader } from '../components/Icons';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-[340px]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo className="w-16 h-16" />
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-white tracking-wide">BOARDERSWATCH</h1>
          <p className="text-text-muted text-[11px] mt-1.5 tracking-[0.2em] uppercase">Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-surface-1 border border-border rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-white/5 border border-white/10 text-white/60 px-3 py-2.5 rounded-lg text-[13px]">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[12px] text-text-muted mb-1.5 tracking-wider uppercase">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm placeholder-text-muted/50 focus:border-white/20 transition"
                placeholder="Enter username"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[12px] text-text-muted mb-1.5 tracking-wider uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm placeholder-text-muted/50 focus:border-white/20 transition"
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-white text-black font-medium rounded-lg text-sm hover:bg-white/90 disabled:opacity-40 transition flex items-center justify-center gap-2 mt-1"
            >
              {loading && <IconLoader className="w-3.5 h-3.5 animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-border text-center">
            <p className="text-[11px] text-text-muted/60 tracking-wider">admin / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
