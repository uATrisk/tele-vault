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

  // Remembered keys feedback
  const [clearedDeviceFeedback, setClearedDeviceFeedback] = useState(false);

  // Change passphrase state
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
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
      alert('Snapshot creation failed. Please ensure the Telegram bot has permissions.');
    } finally {
      setSnapshotLoading(false);
    }
  };

  const handleClearRememberedKey = async () => {
    await idb.clearRememberedKey();
    setClearedDeviceFeedback(true);
    setTimeout(() => setClearedDeviceFeedback(false), 3000);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[4px] animate-in fade-in duration-150 select-none"
    >
      <div className="w-full max-w-2xl bg-surface border border-divider/40 rounded-2xl sm:rounded-dialog shadow-dialog flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150 text-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-divider/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <Icon name="settings" size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-text-primary">Vault Settings</h2>
              <p className="text-[11px] text-text-secondary hidden sm:block">Security, Telegram diagnostics, and encryption</p>
            </div>
          </div>
          <IconButton size="sm" aria-label="Close settings" onClick={onClose}>
            <Icon name="close" size={18} />
          </IconButton>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-6 border-b border-divider/30 text-xs font-medium shrink-0 overflow-x-auto scrollbar-none">
          {[
            { id: 'general' as const, label: 'General & Security', icon: 'shield' as const },
            { id: 'doctor' as const, label: 'Telegram Health', icon: 'cloud' as const },
            { id: 'stats' as const, label: 'Storage & Backup', icon: 'archive' as const },
            { id: 'passphrase' as const, label: 'Change Passphrase', icon: 'lock' as const }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-accent text-accent font-semibold'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-divider'
              }`}
            >
              <Icon name={tab.icon} size={15} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-sm">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Auto-Lock Card */}
              <div className="p-4 sm:p-5 rounded-xl bg-card border border-divider/30 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Auto-Lock Inactivity Timer</h3>
                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                      Automatically purges decrypted master keys from browser memory after inactivity.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-accent/10 text-accent shrink-0">
                    {autoLockMinutes}m active
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {[5, 15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => onSetAutoLockMinutes(mins)}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-all text-center ${
                        autoLockMinutes === mins
                          ? 'border-accent bg-accent/15 text-accent font-semibold shadow-xs ring-1 ring-accent'
                          : 'border-divider/50 text-text-secondary hover:bg-hover hover:text-text-primary'
                      }`}
                    >
                      {mins} minutes
                    </button>
                  ))}
                </div>
              </div>

              {/* Session Actions Card */}
              <div className="p-4 sm:p-5 rounded-xl bg-card border border-divider/30 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Session &amp; Device Security</h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Manage active device keys and vault lock status.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="tonal" icon={<Icon name="lock" size={16} />} onClick={onLock}>
                    Lock Vault Now
                  </Button>
                  <Button
                    variant="text"
                    onClick={handleClearRememberedKey}
                    className="border border-divider/40 hover:bg-hover"
                  >
                    Clear Remembered Device
                  </Button>
                  <Button
                    variant="danger"
                    icon={<Icon name="logout" size={16} />}
                    onClick={onLogout}
                  >
                    Log Out
                  </Button>
                </div>

                {clearedDeviceFeedback && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2 animate-in fade-in">
                    <Icon name="check_circle" size={16} />
                    <span>Remembered device key cleared. Future sessions will require passphrase.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TELEGRAM DOCTOR */}
          {activeTab === 'doctor' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Telegram Bot &amp; Channel Diagnostics</h3>
                  <p className="text-xs text-text-secondary mt-0.5">Automated pre-flight security checks against Telegram Bot API</p>
                </div>
                <Button size="sm" variant="tonal" onClick={loadDoctor} disabled={loadingDoctor}>
                  <Icon name="refresh" size={14} className={loadingDoctor ? 'animate-spin' : ''} />
                  <span>Re-check</span>
                </Button>
              </div>

              {loadingDoctor ? (
                <div className="p-10 text-center text-text-secondary space-y-3 bg-card rounded-xl border border-divider/30">
                  <Icon name="refresh" size={28} className="animate-spin mx-auto text-accent" />
                  <p className="text-xs font-medium">Running diagnostics against Telegram channel...</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {doctorReport?.checks.map((chk) => (
                    <div
                      key={chk.name}
                      className="p-3.5 rounded-xl bg-card border border-divider/30 flex items-start gap-3.5 text-xs transition-colors hover:border-divider/60"
                    >
                      {chk.status === 'pass' && (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                          <Icon name="check_circle" size={16} />
                        </div>
                      )}
                      {chk.status === 'warn' && (
                        <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
                          <Icon name="warning" size={16} />
                        </div>
                      )}
                      {chk.status === 'fail' && (
                        <div className="w-6 h-6 rounded-full bg-danger/10 flex items-center justify-center text-danger shrink-0 mt-0.5">
                          <Icon name="cancel" size={16} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-text-primary capitalize">{chk.name.replace(/_/g, ' ')}</p>
                          <span
                            className={`px-2 py-0.2 rounded text-[10px] font-semibold uppercase ${
                              chk.status === 'pass'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : chk.status === 'warn'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-danger/10 text-danger'
                            }`}
                          >
                            {chk.status}
                          </span>
                        </div>
                        <p className="text-text-secondary mt-1 leading-relaxed">{chk.detail}</p>
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
                <h3 className="text-sm font-semibold text-text-primary">Vault Storage Overview</h3>
                {loadingStats ? (
                  <p className="text-xs text-text-secondary">Loading statistics...</p>
                ) : stats ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-card border border-divider/30 text-center space-y-1">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center mx-auto mb-2">
                        <Icon name="file" size={18} />
                      </div>
                      <div className="text-xl font-bold text-text-primary">{stats.itemCount}</div>
                      <div className="text-xs text-text-secondary">Total Media Files</div>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-divider/30 text-center space-y-1">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                        <Icon name="cloud_done" size={18} />
                      </div>
                      <div className="text-xl font-bold text-text-primary">{formatBytes(stats.totalBytes)}</div>
                      <div className="text-xs text-text-secondary">Encrypted Storage</div>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-divider/30 text-center space-y-1">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-2">
                        <Icon name="archive" size={18} />
                      </div>
                      <div className="text-xl font-bold text-text-primary">{stats.totalChunks}</div>
                      <div className="text-xs text-text-secondary">Telegram Chunks</div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Disaster Recovery Snapshot Card */}
              <div className="p-4 sm:p-5 rounded-xl bg-card border border-divider/30 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-text-primary">Disaster Recovery Snapshot</h4>
                  <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                    Builds an encrypted library snapshot manifest and pins it to your private Telegram storage channel. Allows full library recovery even if local device cache is purged.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCreateSnapshot}
                    disabled={snapshotLoading}
                    icon={snapshotLoading ? <Icon name="refresh" size={14} className="animate-spin" /> : undefined}
                  >
                    {snapshotLoading ? 'Creating Snapshot...' : 'Pin Snapshot in Telegram'}
                  </Button>
                  {snapshotSuccess && (
                    <span className="text-xs text-emerald-500 font-medium flex items-center gap-1.5 animate-in fade-in">
                      <Icon name="check_circle" size={16} /> Pinned successfully to channel!
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CHANGE PASSPHRASE */}
          {activeTab === 'passphrase' && (
            <form onSubmit={handleChangePassphrase} className="space-y-4">
              <div className="p-4 rounded-xl bg-card border border-divider/30 space-y-1">
                <h3 className="text-sm font-semibold text-text-primary">Re-wrap Master Key</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Update your master passphrase without re-encrypting or re-uploading your files.
                </p>
              </div>

              {passphraseError && (
                <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
                  <Icon name="error" size={16} className="shrink-0" />
                  <span>{passphraseError}</span>
                </div>
              )}
              {passphraseSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
                  <Icon name="check_circle" size={16} className="shrink-0" />
                  <span>Passphrase updated successfully!</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text-secondary">
                  New Master Passphrase
                </label>
                <div className="relative">
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    value={newPassphrase}
                    onChange={(e) => setNewPassphrase(e.target.value)}
                    placeholder="Min 14 characters or 5 words"
                    className="w-full bg-card border border-divider/50 rounded-lg px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary focus:outline-none"
                    aria-label={showPassphrase ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPassphrase ? 'visibility_off' : 'visibility'} size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text-secondary">
                  Confirm New Passphrase
                </label>
                <div className="relative">
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    value={confirmPassphrase}
                    onChange={(e) => setConfirmPassphrase(e.target.value)}
                    placeholder="Re-type new passphrase"
                    className="w-full bg-card border border-divider/50 rounded-lg px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent pr-10"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={passphraseLoading || !newPassphrase}
                  icon={passphraseLoading ? <Icon name="refresh" size={14} className="animate-spin" /> : undefined}
                >
                  {passphraseLoading ? 'Re-wrapping Keys...' : 'Update Passphrase'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
