import React, { useState } from 'react';
import { unlockVault, unlockVaultWithRecoveryKey, VaultHeader } from '@televault/crypto';
import { idb } from '../db';
import { Icon } from './ui/Icon';
import { Button } from './ui/Button';
import { BrandLogo } from './ui/BrandLogo';

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
  const [showPassphrase, setShowPassphrase] = useState(false);
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
    <div className="min-h-screen bg-page flex flex-col justify-center items-center px-4 select-none">
      <div className="max-w-md w-full bg-surface border border-divider/40 rounded-dialog p-8 shadow-dialog animate-in zoom-in-95 duration-150">
        <div className="flex justify-center mb-5">
          <BrandLogo size={56} className="transition-transform duration-300 hover:scale-105" />
        </div>

        <h1 className="text-2xl font-medium text-center text-text-primary mb-1 tracking-tight">Unlock TeleVault</h1>
        <p className="text-text-secondary text-center text-sm mb-6">
          {useRecovery
            ? 'Enter your 52-character recovery key to regain access.'
            : 'Enter your master passphrase to decrypt your library.'}
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-3 text-danger text-sm">
            <Icon name="error" size={20} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-4">
          {!useRecovery ? (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Master Passphrase
              </label>
              <div className="relative">
                <input
                  type={showPassphrase ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter your passphrase"
                  autoFocus
                  required
                  className="w-full bg-surface border border-divider rounded-xl pl-4 pr-11 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent text-sm transition"
                />
                <button
                  type="button"
                  aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  <Icon name={showPassphrase ? 'visibility_off' : 'visibility'} size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Recovery Key (52 characters)
              </label>
              <textarea
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-..."
                rows={3}
                required
                className="w-full bg-surface border border-divider rounded-xl p-3 text-text-primary font-mono placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent text-xs resize-none"
              />
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-text-secondary">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="rounded border-divider text-accent focus:ring-0 w-4 h-4"
              />
              <span>Remember on this device for 7 days</span>
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading || (!useRecovery && !passphrase) || (useRecovery && !recoveryKey)}
            className="w-full mt-2"
          >
            {loading ? 'Decrypting...' : 'Unlock Vault'}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-divider/40 flex justify-between items-center text-xs">
          <button
            type="button"
            onClick={() => {
              setUseRecovery(!useRecovery);
              setError(null);
            }}
            className="text-accent hover:underline cursor-pointer font-medium"
          >
            {useRecovery ? '← Back to Passphrase' : 'Forgot passphrase? Use Recovery Key'}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="text-text-secondary hover:text-text-primary cursor-pointer"
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};
