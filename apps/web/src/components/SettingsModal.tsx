import React, { useState, useEffect } from 'react';
import { VaultHeader, rewrapVault } from '@televault/crypto';
import { api, ApiStatsResponse, ApiDoctorResponse } from '../api';
import { idb } from '../db';
import { Icon } from './ui/Icon';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { formatBytes } from '../utils/folderTree';

interface SettingsModalProps {
  header: VaultHeader;
  masterKey: CryptoKey;
  onClose: () => void;
  onLock: () => void;
  onLogout: () => void;
  autoLockMinutes: number;
  onSetAutoLockMinutes: (mins: number) => void;
  onVaultUpdated: (newHeader: VaultHeader) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  header,
  masterKey,
  onClose,
  onLock,
  onLogout,
  autoLockMinutes,
  onSetAutoLockMinutes,
  onVaultUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'doctor' | 'stats' | 'passphrase'>('general');

  // Stats state
  const [stats, setStats] = useState<ApiStatsResponse['stats'] | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Doctor state
  const [doctorReport, setDoctorReport] = useState<ApiDoctorResponse['report'] | null>(null);
  const [loadingDoctor, setLoadingDoctor] = useState(false);

  // Snapshot backup state
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);

  // Change passphrase state
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [passphraseLoading, setPassphraseLoading] = useState(false);
  const [passphraseError, setPassphraseError] = useState<string | null>(null);
  const [passphraseSuccess, setPassphraseSuccess] = useState(false);

  // Load stats
  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await api.getStats();
      setStats(res.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Load doctor
  const loadDoctor = async () => {
    setLoadingDoctor(true);
    try {
      const res = await api.getDoctor();
      setDoctorReport(res.report);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDoctor(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'stats') loadStats();
    if (activeTab === 'doctor') loadDoctor();
  }, [activeTab]);

  const handleCreateSnapshot = async () => {
    setSnapshotLoading(true);
    setSnapshotSuccess(false);
    try {
      await api.createSnapshot();
      setSnapshotSuccess(true);
      setTimeout(() => setSnapshotSuccess(false), 4000);
    } catch (err) {
      alert('Snapshot creation failed');
    } finally {
      setSnapshotLoading(false);
    }
  };

  const handleChangePassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassphraseError(null);
    setPassphraseSuccess(false);

    if (newPassphrase.length < 14 && newPassphrase.trim().split(/\s+/).length < 5) {
      setPassphraseError('Passphrase must be at least 14 characters or 5 words.');
      return;
    }
    if (newPassphrase !== confirmPassphrase) {
      setPassphraseError('Passphrases do not match.');
      return;
    }

    setPassphraseLoading(true);
    try {
      let rawMK: Uint8Array;
      try {
        const rawBuf = await crypto.subtle.exportKey('raw', masterKey);
        rawMK = new Uint8Array(rawBuf);
      } catch {
        throw new Error('Active master key is non-extractable. Re-enter current passphrase to rewrap.');
      }

      const updatedHeader = await rewrapVault(rawMK, newPassphrase, header);
      const res = await api.rewrapVault(updatedHeader, header.rev);
      if (!res.ok) {
        throw new Error(res.error || 'Failed to update vault header on server');
      }
      onVaultUpdated({ ...updatedHeader, rev: res.rev || updatedHeader.rev + 1 });
      setPassphraseSuccess(true);
      setNewPassphrase('');
      setConfirmPassphrase('');
    } catch (err: any) {
      setPassphraseError(err.message || 'Failed to change passphrase');
    } finally {
      setPassphraseLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150 select-none"
    >
      <div className="w-full max-w-2xl bg-surface border border-divider/40 rounded-dialog shadow-dialog flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150 text-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-divider/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <Icon name="settings" size={20} />
            </div>
            <h2 className="text-lg font-medium text-text-primary">Settings</h2>
          </div>
          <IconButton size="sm" aria-label="Close settings" onClick={onClose}>
            <Icon name="close" size={18} />
          </IconButton>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-divider/30 text-xs font-medium shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            General &amp; Security
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('doctor')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              activeTab === 'doctor'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Telegram Diagnostics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              activeTab === 'stats'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Storage &amp; Backup
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('passphrase')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              activeTab === 'passphrase'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Change Passphrase
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-primary">Auto-Lock Timer</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Automatically clears encryption keys from browser memory after inactivity.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[5, 15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => onSetAutoLockMinutes(mins)}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                        autoLockMinutes === mins
                          ? 'border-accent bg-accent/10 text-accent font-semibold'
                          : 'border-divider text-text-secondary hover:bg-hover'
                      }`}
                    >
                      {mins} minutes
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-divider/30">
                <h3 className="text-sm font-semibold text-text-primary">Session Actions</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="tonal" icon={<Icon name="lock" size={16} />} onClick={onLock}>
                    Lock Vault Now
                  </Button>
                  <Button
                    variant="text"
                    onClick={async () => {
                      await idb.clearRememberedKey();
                      alert('Cleared remembered device keys.');
                    }}
                  >
                    Clear Remembered Device
                  </Button>
                  <Button
                    variant="danger"
                    onClick={onLogout}
                  >
                    Disconnect Token
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TELEGRAM DOCTOR */}
          {activeTab === 'doctor' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Channel &amp; Bot Health</h3>
                  <p className="text-xs text-text-secondary">Pre-flight checks against Telegram Bot API</p>
                </div>
                <Button size="sm" variant="tonal" onClick={loadDoctor} disabled={loadingDoctor}>
                  <Icon name="refresh" size={14} className={loadingDoctor ? 'animate-spin' : ''} />
                  <span>Re-check</span>
                </Button>
              </div>

              {loadingDoctor ? (
                <div className="p-8 text-center text-text-secondary space-y-2">
                  <Icon name="refresh" size={24} className="animate-spin mx-auto text-accent" />
                  <p className="text-xs">Running diagnostics...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {doctorReport?.checks.map((chk) => (
                    <div
                      key={chk.name}
                      className="p-3.5 rounded-xl bg-card border border-divider/30 flex items-start gap-3 text-xs"
                    >
                      {chk.status === 'pass' && (
                        <Icon name="check_circle" size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                      )}
                      {chk.status === 'warn' && (
                        <Icon name="warning" size={18} className="text-amber-500 shrink-0 mt-0.5" />
                      )}
                      {chk.status === 'fail' && (
                        <Icon name="cancel" size={18} className="text-danger shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-semibold text-text-primary capitalize">{chk.name.replace(/_/g, ' ')}</p>
                        <p className="text-text-secondary mt-0.5">{chk.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STORAGE & STATS */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-primary">Storage Usage</h3>
                {loadingStats ? (
                  <p className="text-xs text-text-secondary">Loading statistics...</p>
                ) : stats ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-card border border-divider/30 text-center">
                      <div className="text-xl font-bold text-text-primary">{stats.itemCount}</div>
                      <div className="text-xs text-text-secondary mt-0.5">Total Media Files</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-card border border-divider/30 text-center">
                      <div className="text-xl font-bold text-text-primary">{formatBytes(stats.totalBytes)}</div>
                      <div className="text-xs text-text-secondary mt-0.5">Encrypted Media</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-card border border-divider/30 text-center">
                      <div className="text-xl font-bold text-text-primary">{stats.totalChunks}</div>
                      <div className="text-xs text-text-secondary mt-0.5">Telegram Chunks</div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="p-4 rounded-xl bg-card border border-divider/30 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-text-primary">Disaster Recovery Snapshot</h4>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Builds an encrypted snapshot manifest and pins it to your private Telegram channel.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCreateSnapshot}
                    disabled={snapshotLoading}
                  >
                    {snapshotLoading ? 'Creating Snapshot...' : 'Pin Snapshot in Telegram'}
                  </Button>
                  {snapshotSuccess && (
                    <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                      <Icon name="check" size={14} /> Pinned successfully!
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CHANGE PASSPHRASE */}
          {activeTab === 'passphrase' && (
            <form onSubmit={handleChangePassphrase} className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Re-wrap Master Key</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Change your master passphrase without re-encrypting your files.
                </p>
              </div>

              {passphraseError && (
                <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs">
                  {passphraseError}
                </div>
              )}
              {passphraseSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs">
                  Passphrase updated successfully!
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  New Master Passphrase
                </label>
                <input
                  type="password"
                  value={newPassphrase}
                  onChange={(e) => setNewPassphrase(e.target.value)}
                  placeholder="Min 14 characters or 5 words"
                  className="w-full bg-surface border border-divider rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Confirm New Passphrase
                </label>
                <input
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="Re-type new passphrase"
                  className="w-full bg-surface border border-divider rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={passphraseLoading || !newPassphrase}
              >
                {passphraseLoading ? 'Re-wrapping Keys...' : 'Update Passphrase'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
