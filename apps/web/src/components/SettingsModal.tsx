import React, { useState, useEffect } from 'react';
import { VaultHeader, rewrapVault } from '@televault/crypto';
import { api, ApiStatsResponse, ApiDoctorResponse } from '../api';
import { idb } from '../db';
import { Icon, IconName } from './ui/Icon';
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
  theme?: 'light' | 'dark' | 'system';
  onSetTheme?: (theme: 'light' | 'dark' | 'system') => void;
}

type SettingsTab = 'general' | 'doctor' | 'storage' | 'passphrase';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  header,
  masterKey,
  onClose,
  onLock,
  onLogout,
  autoLockMinutes,
  onSetAutoLockMinutes,
  onVaultUpdated,
  theme = 'system',
  onSetTheme
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

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
      console.error('Failed to load stats:', err);
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
      console.error('Failed to run doctor:', err);
    } finally {
      setLoadingDoctor(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'storage') loadStats();
    if (activeTab === 'doctor') loadDoctor();
  }, [activeTab]);

  const handleCreateSnapshot = async () => {
    setSnapshotLoading(true);
    setSnapshotSuccess(false);
    try {
      await api.createSnapshot();
      setSnapshotSuccess(true);
      setTimeout(() => setSnapshotSuccess(false), 4000);
    } catch {
      alert('Snapshot creation failed. Please verify Telegram bot admin permissions.');
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

  const navItems: Array<{ id: SettingsTab; label: string; icon: IconName }> = [
    { id: 'general', label: 'General & Security', icon: 'tune' },
    { id: 'doctor', label: 'Telegram Health', icon: 'shield' },
    { id: 'storage', label: 'Storage & Backup', icon: 'cloud_done' },
    { id: 'passphrase', label: 'Change Passphrase', icon: 'lock' }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150 select-none"
    >
      <div className="w-full max-w-3xl bg-surface border border-divider/40 rounded-[28px] shadow-[0_24px_48px_rgba(0,0,0,0.18)] flex flex-col h-[580px] max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150 text-text-primary">
        {/* Header - Google Drive Modal Bar */}
        <div className="flex items-center justify-between h-16 px-6 sm:px-7 border-b border-divider/30 shrink-0">
          <h2 id="settings-dialog-title" className="text-[22px] font-normal tracking-tight text-text-primary">
            Vault Settings
          </h2>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={onClose}
              className="px-5 font-medium rounded-full cursor-pointer"
            >
              Done
            </Button>
            <IconButton size="sm" aria-label="Close settings" onClick={onClose}>
              <Icon name="close" size={18} />
            </IconButton>
          </div>
        </div>

        {/* Main Responsive Container */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Responsive Nav: horizontal pills on mobile, vertical sidebar on desktop */}
          <nav
            aria-label="Settings categories"
            className="flex sm:flex-col shrink-0 border-b sm:border-b-0 sm:border-r border-divider/30 p-2 sm:p-3 bg-[#F8FAFD]/40 dark:bg-[#161718]/40 gap-1 sm:w-56 overflow-x-auto sm:overflow-x-visible scrollbar-none"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 sm:gap-3 px-3.5 sm:px-4 py-1.5 sm:py-2.5 rounded-full text-xs sm:text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF] font-semibold shadow-xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-[#1F1F1F]/[0.05] dark:hover:bg-[#E3E3E3]/[0.06]'
                  }`}
                >
                  <Icon
                    name={item.icon}
                    size={17}
                    className={
                      isActive
                        ? 'text-[#001D35] dark:text-[#C2E7FF] shrink-0'
                        : 'text-text-secondary shrink-0'
                    }
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Content Pane */}
          <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 space-y-7 divide-y divide-divider/25 text-sm">
            {/* TAB 1: GENERAL & SECURITY */}
            {activeTab === 'general' && (
              <>
                {/* 1. Appearance Row */}
                {onSetTheme && (
                  <div className="pt-0 space-y-3">
                    <div>
                      <h3 className="text-[14px] font-medium text-text-primary">Appearance</h3>
                      <p className="text-[12px] text-text-secondary mt-0.5">
                        Choose light, dark, or follow device system settings
                      </p>
                    </div>
                    <div className="inline-flex p-1 bg-[#F0F4F9] dark:bg-[#282A2C] rounded-full border border-divider/30 gap-1">
                      {[
                        { id: 'light' as const, label: 'Light', icon: 'light_mode' as const },
                        { id: 'dark' as const, label: 'Dark', icon: 'dark_mode' as const },
                        { id: 'system' as const, label: 'Device default', icon: 'settings' as const }
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => onSetTheme(t.id)}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                            theme === t.id
                              ? 'bg-surface text-text-primary font-semibold shadow-xs'
                              : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          <Icon name={t.icon} size={14} />
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Inactivity Auto-Lock Row */}
                <div className="pt-5 space-y-3">
                  <div>
                    <h3 className="text-[14px] font-medium text-text-primary">Auto-Lock Inactivity Timer</h3>
                    <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">
                      Automatically purges decrypted master keys from browser memory after inactivity
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {[5, 15, 30, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => onSetAutoLockMinutes(mins)}
                        className={`h-9 px-4 rounded-full border text-[13px] font-medium transition-all cursor-pointer ${
                          autoLockMinutes === mins
                            ? 'border-accent bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF] font-semibold shadow-xs'
                            : 'border-divider/60 text-text-secondary hover:bg-hover hover:text-text-primary'
                        }`}
                      >
                        {mins} minutes
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Remembered Device Row */}
                <div className="pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="max-w-md">
                    <h3 className="text-[14px] font-medium text-text-primary">Remembered device</h3>
                    <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">
                      Vault master key is cached in browser secure storage for seamless unlock on this device
                    </p>
                    {clearedDeviceFeedback && (
                      <p className="text-[11.5px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 animate-in fade-in">
                        <Icon name="check_circle" size={13} />
                        Remembered device key cleared. Future sessions will require passphrase.
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearRememberedKey}
                      className="text-xs font-medium cursor-pointer"
                    >
                      Clear Remembered Device
                    </Button>
                  </div>
                </div>

                {/* 4. Active Session Row */}
                <div className="pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="max-w-md">
                    <h3 className="text-[14px] font-medium text-text-primary">Active session</h3>
                    <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">
                      Lock your vault immediately or end current session
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onLock}
                      icon={<Icon name="lock" size={15} />}
                      className="text-xs font-medium cursor-pointer"
                    >
                      Lock Vault Now
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={onLogout}
                      icon={<Icon name="logout" size={15} />}
                      className="text-xs font-medium cursor-pointer"
                    >
                      Log Out
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: TELEGRAM HEALTH */}
            {activeTab === 'doctor' && (
              <div className="pt-0 space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h3 className="text-[14px] font-medium text-text-primary">Telegram Diagnostics</h3>
                    <p className="text-[12px] text-text-secondary mt-0.5">
                      Automated security checks for Telegram bot and private storage channel
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadDoctor}
                    disabled={loadingDoctor}
                    icon={<Icon name="refresh" size={14} className={loadingDoctor ? 'animate-spin' : ''} />}
                    className="text-xs font-medium cursor-pointer"
                  >
                    Re-check
                  </Button>
                </div>

                {loadingDoctor ? (
                  <div className="py-12 text-center text-text-secondary space-y-2">
                    <Icon name="refresh" size={24} className="animate-spin mx-auto text-accent" />
                    <p className="text-xs">Running diagnostics against Telegram channel...</p>
                  </div>
                ) : (
                  <div className="divide-y divide-divider/25 rounded-2xl border border-divider/40 overflow-hidden bg-surface">
                    {doctorReport?.checks.map((chk) => {
                      const isPass = chk.status === 'pass';
                      const isWarn = chk.status === 'warn';
                      return (
                        <div
                          key={chk.name}
                          className="p-3.5 flex items-start gap-3 text-xs transition-colors hover:bg-hover/40"
                        >
                          <div className="mt-0.5 shrink-0">
                            {isPass ? (
                              <Icon name="check_circle" size={17} className="text-emerald-500" />
                            ) : isWarn ? (
                              <Icon name="warning" size={17} className="text-amber-500" />
                            ) : (
                              <Icon name="cancel" size={17} className="text-danger" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-text-primary capitalize">
                                {chk.name.replace(/_/g, ' ')}
                              </span>
                              <span
                                className={`text-[11px] font-semibold uppercase ${
                                  isPass
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : isWarn
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-danger'
                                }`}
                              >
                                {chk.status}
                              </span>
                            </div>
                            <p className="text-text-secondary text-[11.5px] mt-0.5 leading-relaxed">
                              {chk.detail}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: STORAGE & BACKUP */}
            {activeTab === 'storage' && (
              <>
                {/* 1. Storage Bar Section (Google Drive signature layout) */}
                <div className="pt-0 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <h3 className="text-[14px] font-medium text-text-primary">Storage</h3>
                      <p className="text-[12px] text-text-secondary mt-0.5">
                        {loadingStats
                          ? 'Calculating storage...'
                          : `${formatBytes(stats?.totalBytes || 0)} used of Unlimited Telegram Cloud`}
                      </p>
                    </div>
                  </div>

                  {/* Horizontal storage progress bar */}
                  <div className="w-full h-2 rounded-full bg-[#E9EEF6] dark:bg-[#2A2B2D] overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-300 rounded-full"
                      style={{
                        width: stats?.totalBytes
                          ? `${Math.min(100, Math.max(3, (stats.totalBytes / (1024 * 1024 * 100)) * 100))}%`
                          : '0%'
                      }}
                    />
                  </div>

                  {/* Clean detail list */}
                  {!loadingStats && stats && (
                    <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                      <div className="p-3 rounded-xl bg-[#F8FAFD] dark:bg-[#161718] border border-divider/30">
                        <span className="text-text-secondary block text-[11px]">Media files</span>
                        <span className="font-semibold text-text-primary text-[14px]">{stats.itemCount}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F8FAFD] dark:bg-[#161718] border border-divider/30">
                        <span className="text-text-secondary block text-[11px]">Telegram chunks</span>
                        <span className="font-semibold text-text-primary text-[14px]">{stats.totalChunks}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F8FAFD] dark:bg-[#161718] border border-divider/30">
                        <span className="text-text-secondary block text-[11px]">Storage engine</span>
                        <span className="font-semibold text-text-primary text-[14px] truncate block">Telegram MTProto</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Disaster Recovery Snapshot */}
                <div className="pt-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="max-w-md">
                    <h3 className="text-[14px] font-medium text-text-primary">Disaster recovery snapshot</h3>
                    <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">
                      Builds an encrypted library snapshot manifest and pins it to your private Telegram storage channel. Allows full library recovery even if local device cache is purged.
                    </p>
                    {snapshotSuccess && (
                      <p className="text-[11.5px] text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1.5 animate-in fade-in">
                        <Icon name="check_circle" size={14} />
                        Snapshot manifest pinned to Telegram channel!
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleCreateSnapshot}
                      disabled={snapshotLoading}
                      icon={snapshotLoading ? <Icon name="refresh" size={14} className="animate-spin" /> : undefined}
                      className="text-xs font-medium cursor-pointer"
                    >
                      {snapshotLoading ? 'Creating Snapshot...' : 'Pin Snapshot in Telegram'}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* TAB 4: CHANGE PASSPHRASE */}
            {activeTab === 'passphrase' && (
              <>
                {/* 1. Change Passphrase Form */}
                <div className="pt-0 space-y-4">
                  <div>
                    <h3 className="text-[14px] font-medium text-text-primary">Re-wrap Master Key</h3>
                    <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">
                      Update your master passphrase without re-encrypting or re-uploading your files.
                    </p>
                  </div>

                  {passphraseError && (
                    <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
                      <Icon name="error" size={16} className="shrink-0" />
                      <span>{passphraseError}</span>
                    </div>
                  )}
                  {passphraseSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                      <Icon name="check_circle" size={16} className="shrink-0" />
                      <span>Passphrase updated successfully!</span>
                    </div>
                  )}

                  <form onSubmit={handleChangePassphrase} className="space-y-3.5 max-w-md">
                    <div className="space-y-1">
                      <label className="block text-[12px] font-medium text-text-secondary">
                        New Master Passphrase
                      </label>
                      <div className="relative">
                        <input
                          type={showPassphrase ? 'text' : 'password'}
                          value={newPassphrase}
                          onChange={(e) => setNewPassphrase(e.target.value)}
                          placeholder="Min 14 characters or 5 words"
                          className="w-full bg-surface border border-divider/60 rounded-xl px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassphrase(!showPassphrase)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary focus:outline-none cursor-pointer"
                          aria-label={showPassphrase ? 'Hide password' : 'Show password'}
                        >
                          <Icon name={showPassphrase ? 'visibility_off' : 'visibility'} size={17} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[12px] font-medium text-text-secondary">
                        Confirm New Passphrase
                      </label>
                      <input
                        type={showPassphrase ? 'text' : 'password'}
                        value={confirmPassphrase}
                        onChange={(e) => setConfirmPassphrase(e.target.value)}
                        placeholder="Re-type new passphrase"
                        className="w-full bg-surface border border-divider/60 rounded-xl px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                      />
                    </div>

                    <div className="pt-1">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={passphraseLoading || !newPassphrase}
                        icon={passphraseLoading ? <Icon name="refresh" size={14} className="animate-spin" /> : undefined}
                        className="text-xs font-medium cursor-pointer"
                      >
                        {passphraseLoading ? 'Re-wrapping Keys...' : 'Update Passphrase'}
                      </Button>
                    </div>
                  </form>
                </div>

                {/* 2. Zero-Knowledge Cryptographic Specs */}
                <div className="pt-5 space-y-3">
                  <div>
                    <h3 className="text-[14px] font-medium text-text-primary">Zero-knowledge cryptography</h3>
                    <p className="text-[12px] text-text-secondary mt-0.5">
                      TeleVault runs authenticated WebCrypto operations entirely inside your client browser
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-[#F8FAFD] dark:bg-[#161718] border border-divider/30">
                      <span className="text-text-secondary block text-[11px]">Symmetric cipher</span>
                      <span className="font-semibold text-text-primary">AES-256-GCM (Authenticated)</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F8FAFD] dark:bg-[#161718] border border-divider/30">
                      <span className="text-text-secondary block text-[11px]">Passphrase derivation</span>
                      <span className="font-semibold text-text-primary">PBKDF2-HMAC-SHA256 (600k rounds)</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F8FAFD] dark:bg-[#161718] border border-divider/30">
                      <span className="text-text-secondary block text-[11px]">Subkey isolation</span>
                      <span className="font-semibold text-text-primary">HKDF-SHA256 hierarchical</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F8FAFD] dark:bg-[#161718] border border-divider/30">
                      <span className="text-text-secondary block text-[11px]">Storage privacy</span>
                      <span className="font-semibold text-text-primary">Random-named opaque .bin blobs</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
