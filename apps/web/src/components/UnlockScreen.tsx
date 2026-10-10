import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { unlockVault, unlockVaultWithRecoveryKey, VaultHeader } from '@televault/crypto';
import { idb } from '../db';

interface UnlockScreenProps {
  header: VaultHeader;
  onUnlockSuccess: (masterKey: CryptoKey) => void;
  onLogout: () => void;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({
  header,
  onUnlockSuccess,
  onLogout
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Client-side rate-limit delay if repeated failures
    if (failedAttempts >= 3) {
      await new Promise((r) => setTimeout(r, 1500));
    }

    try {
      let masterKey: CryptoKey;

      if (useRecovery) {
        if (!recoveryKey.trim()) return;
        const res = await unlockVaultWithRecoveryKey(recoveryKey.trim(), header, false);
        masterKey = res.masterKey;
      } else {
        if (!passphrase) return;
        const res = await unlockVault(passphrase, header, false);
        masterKey = res.masterKey;
      }

      if (rememberDevice) {
        await idb.saveRememberedKey(masterKey, 7);
      }

      onUnlockSuccess(masterKey);
    } catch (err: any) {
      setFailedAttempts((prev) => prev + 1);
      setError(
        useRecovery
          ? 'Failed to unlock with recovery key: invalid key or corrupted header.'
          : 'Incorrect passphrase. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-white mb-1">Unlock TeleVault</h1>
        <p className="text-gray-400 text-center text-xs mb-8">
          {useRecovery
            ? 'Enter your 52-character recovery key to regain access.'
            : 'Enter your master passphrase to decrypt your library.'}
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-5">
          {!useRecovery ? (
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Master Passphrase
              </label>
              <div className="relative">
                <KeyRound className="w-5 h-5 text-gray-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter your passphrase"
                  autoFocus
                  required
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Recovery Key (52 characters)
              </label>
              <textarea
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-..."
                rows={3}
                required
                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs resize-none"
              />
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-400">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="rounded border-gray-700 bg-gray-950 text-emerald-500 focus:ring-0 w-4 h-4"
              />
              <span>Remember on this device for 7 days</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || (!useRecovery && !passphrase) || (useRecovery && !recoveryKey)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Unlock Vault</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-800/80 flex justify-between items-center text-xs">
          <button
            type="button"
            onClick={() => {
              setUseRecovery(!useRecovery);
              setError(null);
            }}
            className="text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
          >
            {useRecovery ? '← Back to Passphrase' : 'Forgot passphrase? Use Recovery Key'}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="text-gray-500 hover:text-gray-300 transition cursor-pointer"
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};
