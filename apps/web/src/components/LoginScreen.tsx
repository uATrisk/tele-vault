import React, { useState } from 'react';
import { Shield, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../api';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.login(token.trim());
      if (res.ok) {
        onLoginSuccess();
      } else {
        setError(res.error || 'Invalid access token. Please check your token and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error while attempting to log in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-white mb-2">TeleVault</h1>
        <p className="text-gray-400 text-center text-sm mb-8">
          Enter your private Access Token to connect to your encrypted storage.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Access Token
            </label>
            <div className="relative">
              <KeyRound className="w-5 h-5 text-gray-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="tv_..."
                required
                className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Authenticate</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-800/80 text-center">
          <p className="text-xs text-gray-500">
            Self-hosted &amp; Zero-knowledge. Token is generated via <code className="text-gray-400">npm run setup</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
