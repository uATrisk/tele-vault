import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Shield,
  Activity,
  Database,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  LogOut,
  HardDriveDownload,
  ShieldCheck,
  Check
} from 'lucide-react';
import { VaultHeader, rewrapVault } from '@televault/crypto';
import { api, ApiStatsResponse, ApiDoctorResponse } from '../api';
import { idb } from '../db';

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
  const [rewrapLoading, setRewrapLoading] = useState(false);
  const [rewrapSuccess, setRewrapSuccess] = useState(false);
  const [rewrapError, setRewrapError] = useState<string | null>(null);

  // Load stats when stats tab opened
  useEffect(() => {
    if (activeTab === 'stats') {
      setLoadingStats(true);
      api.getStats()
        .then((res) => setStats(res.stats))
        .finally(() => setLoadingStats(false));
    }
    if (activeTab === 'doctor') {
      setLoadingDoctor(true);
      api.getDoctor()
        .then((res) => setDoctorReport(res.report))
        .finally(() => setLoadingDoctor(false));
    }
  }, [activeTab]);

  const handleCreateSnapshot = async () => {
    setSnapshotLoading(true);
    setSnapshotSuccess(false);
    try {
      await api.createSnapshot();
      setSnapshotSuccess(true);
      setTimeout(() => setSnapshotSuccess(false), 4000);
    } catch (err: any) {
      alert(`Snapshot failed: ${err.message}`);
    } finally {
      setSnapshotLoading(false);
    }
  };

  const handleRebuildThumbnails = async () => {
    await idb.clearThumbCache();
    alert('Local thumbnail cache cleared. Thumbnails will re-download dynamically.');
    window.location.reload();
  };

  const handleRewrapPassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassphrase.length < 14) {
      setRewrapError('Passphrase must be at least 14 characters');
      return;
    }
    if (newPassphrase !== confirmPassphrase) {
      setRewrapError('Passphrases do not match');
      return;
    }

    setRewrapLoading(true);
    setRewrapError(null);

    try {
      // Export MK from masterKey if extractable or pass raw MK
      // For rewrap, we export or use active masterKey
      let rawMK: Uint8Array;
      try {
        const rawBuf = await crypto.subtle.exportKey('raw', masterKey);
        rawMK = new Uint8Array(rawBuf);
      } catch {
        throw new Error('Active master key is non-extractable. Re-enter current passphrase to rewrap.');
      }

      const updatedHeader = await rewrapVault(rawMK, newPassphrase, header);
      const res = await api.rewrapVault(updatedHeader, header.rev);
      if (!res.ok) throw new Error(res.error || 'Failed to commit rewrapped header');

      setRewrapSuccess(true);
      onVaultUpdated(updatedHeader);
      setNewPassphrase('');
      setConfirmPassphrase('');
    } catch (err: any) {
      setRewrapError(err.message || 'Passphrase change failed');
    } finally {
      setRewrapLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Vault Settings</h3>
              <p className="text-[11px] text-gray-400">Revision {header.rev} &bull; v{header.v}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-800 py-3 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              activeTab === 'general' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            General &amp; Security
          </button>
          <button
            onClick={() => setActiveTab('doctor')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'doctor' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Telegram Doctor
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'stats' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" /> Storage Stats
          </button>
          <button
            onClick={() => setActiveTab('passphrase')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'passphrase' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" /> Change Passphrase
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 text-xs text-gray-300">
          {/* TAB: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Auto-Lock Settings */}
              <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white">Idle Auto-Lock Timer</h4>
                    <p className="text-[11px] text-gray-500">
                      Automatically wipe master keys from browser memory after inactivity.
                    </p>
                  </div>
                  <select
                    value={autoLockMinutes}
                    onChange={(e) => onSetAutoLockMinutes(Number(e.target.value))}
                    className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={0}>Disabled</option>
                  </select>
                </div>
              </div>

              {/* Maintenance Tools */}
              <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800 space-y-4">
                <h4 className="font-semibold text-white">Disaster Recovery &amp; Maintenance</h4>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-200">Disaster Recovery Snapshot</p>
                    <p className="text-[11px] text-gray-500">
                      Pack encrypted library index and pin head document in your Telegram channel.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateSnapshot}
                    disabled={snapshotLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {snapshotLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : snapshotSuccess ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <HardDriveDownload className="w-3.5 h-3.5" />
                    )}
                    <span>{snapshotSuccess ? 'Pinned!' : 'Back Up Now'}</span>
                  </button>
                </div>

                <div className="border-t border-gray-850 pt-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-200">Rebuild Thumbnails</p>
                    <p className="text-[11px] text-gray-500">
                      Clear local decrypted thumbnail cache and reload.
                    </p>
                  </div>
                  <button
                    onClick={handleRebuildThumbnails}
                    className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white cursor-pointer"
                  >
                    Clear Cache
                  </button>
                </div>
              </div>

              {/* Session Controls */}
              <div className="pt-2 flex justify-between items-center">
                <button
                  onClick={onLock}
                  className="px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-300 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" /> Lock Vault Now
                </button>

                <button
                  onClick={onLogout}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Disconnect Session
                </button>
              </div>
            </div>
          )}

          {/* TAB: DOCTOR */}
          {activeTab === 'doctor' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-gray-400">
                  Live diagnostics on bot permissions and private channel security.
                </p>
                <button
                  onClick={() => {
                    setLoadingDoctor(true);
                    api.getDoctor().then((res) => setDoctorReport(res.report)).finally(() => setLoadingDoctor(false));
                  }}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDoctor ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              {loadingDoctor ? (
                <div className="py-8 text-center text-gray-400">Running diagnostic checks...</div>
              ) : (
                <div className="space-y-2.5">
                  {doctorReport?.checks.map((chk) => (
                    <div
                      key={chk.name}
                      className="p-3 rounded-xl bg-gray-950 border border-gray-800 flex items-start gap-3"
                    >
                      {chk.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />}
                      {chk.status === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />}
                      {chk.status === 'fail' && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                      <div>
                        <p className="font-medium text-gray-200 capitalize">{chk.name.replace(/_/g, ' ')}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{chk.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: STATS */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              {loadingStats ? (
                <div className="py-8 text-center text-gray-400">Loading library stats...</div>
              ) : stats ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-gray-950 border border-gray-800">
                    <span className="text-gray-500 block text-[11px]">Total Items</span>
                    <span className="text-xl font-bold text-white">{stats.itemCount.toLocaleString()}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-950 border border-gray-800">
                    <span className="text-gray-500 block text-[11px]">Total Stored Data</span>
                    <span className="text-xl font-bold text-white">{(stats.totalBytes / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-950 border border-gray-800">
                    <span className="text-gray-500 block text-[11px]">Telegram Chunks</span>
                    <span className="text-xl font-bold text-white">{stats.totalChunks.toLocaleString()}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-950 border border-gray-800">
                    <span className="text-gray-500 block text-[11px]">Deleted Tombstones</span>
                    <span className="text-xl font-bold text-white">{stats.tombstonesCount.toLocaleString()}</span>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB: CHANGE PASSPHRASE */}
          {activeTab === 'passphrase' && (
            <form onSubmit={handleRewrapPassphrase} className="space-y-4 max-w-md">
              <p className="text-gray-400">
                Changing your passphrase re-wraps the Master Key in your browser and updates the vault header.
                <strong> None of your stored files need to be re-encrypted.</strong>
              </p>

              {rewrapError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                  {rewrapError}
                </div>
              )}

              {rewrapSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Passphrase changed successfully!
                </div>
              )}

              <div>
                <label className="block text-gray-300 mb-1">New Passphrase (min 14 chars)</label>
                <input
                  type="password"
                  value={newPassphrase}
                  onChange={(e) => setNewPassphrase(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white"
                  placeholder="New strong passphrase"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Confirm New Passphrase</label>
                <input
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white"
                  placeholder="Re-type new passphrase"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={rewrapLoading || newPassphrase.length < 14 || newPassphrase !== confirmPassphrase}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl font-medium cursor-pointer"
              >
                {rewrapLoading ? 'Re-wrapping Keys...' : 'Update Passphrase'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
