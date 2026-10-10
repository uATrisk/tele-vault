import React, { useState } from 'react';
import { api } from '../api';
import { Icon } from './ui/Icon';
import { Button } from './ui/Button';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [token, setToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen bg-page flex flex-col justify-center items-center px-4 select-none">
      <div className="max-w-md w-full bg-surface border border-divider/40 rounded-dialog p-8 shadow-dialog animate-in zoom-in-95 duration-150">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-inner">
            <Icon name="shield" size={28} />
          </div>
        </div>

        <h1 className="text-2xl font-medium text-center text-text-primary mb-2 tracking-tight">TeleVault</h1>
        <p className="text-text-secondary text-center text-sm mb-6">
          Enter your private Access Password to connect to your encrypted storage.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-3 text-danger text-sm">
            <Icon name="error" size={20} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Access Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your access password"
                required
                className="w-full bg-surface border border-divider rounded-xl pl-4 pr-11 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent text-sm transition"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading || !token.trim()}
            className="w-full mt-2"
          >
            {loading ? 'Connecting...' : 'Connect to Vault'}
          </Button>
        </form>
      </div>
    </div>
  );
};
