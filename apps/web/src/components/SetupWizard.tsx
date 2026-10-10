import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  ArrowRight,
  RefreshCw,
  Lock,
  Key
} from 'lucide-react';
import { createVault, base32Encode, formatRecoveryKey, randomBytes, VaultHeader } from '@televault/crypto';
import { api, ApiDoctorResponse } from '../api';

interface SetupWizardProps {
  onSetupComplete: (masterKey: CryptoKey, header: VaultHeader) => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onSetupComplete }) => {
  const [step, setStep] = useState<'doctor' | 'passphrase' | 'recovery' | 'creating'>('doctor');

  // Doctor state
  const [doctorLoading, setDoctorLoading] = useState(true);
  const [doctorReport, setDoctorReport] = useState<ApiDoctorResponse['report'] | null>(null);
  const [doctorError, setDoctorError] = useState<string | null>(null);

  // Passphrase state
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');

  // Recovery Key state
  const [rawRecoveryKey] = useState(() => randomBytes(32));
  const [recoveryKeyFormatted, setRecoveryKeyFormatted] = useState('');
  const [confirmedLastChars, setConfirmedLastChars] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const b32 = base32Encode(rawRecoveryKey);
    setRecoveryKeyFormatted(formatRecoveryKey(b32));
  }, [rawRecoveryKey]);

  const loadDoctor = async () => {
    setDoctorLoading(true);
    setDoctorError(null);
    try {
      const res = await api.getDoctor();
      setDoctorReport(res.report);
    } catch (err: any) {
      setDoctorError(err.message || 'Failed to run Telegram Doctor checks');
    } finally {
      setDoctorLoading(false);
    }
  };

  useEffect(() => {
    loadDoctor();
  }, []);

  // Passphrase strength calculation
  const calculateStrength = (pass: string): { score: number; label: string; color: string } => {
    if (!pass) return { score: 0, label: 'Empty', color: 'bg-gray-700' };
    const words = pass.trim().split(/\s+/).length;
    let score = 0;
    if (pass.length >= 14 || words >= 5) score += 50;
    if (pass.length >= 20 || words >= 6) score += 25;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score += 15;
    if (/[^A-Za-z0-9]/.test(pass)) score += 10;

    if (score < 50) return { score, label: 'Too Weak (min 14 chars)', color: 'bg-red-500' };
    if (score < 75) return { score, label: 'Moderate', color: 'bg-yellow-500' };
    return { score, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = calculateStrength(passphrase);
  const isPassphraseValid =
    (passphrase.length >= 14 || passphrase.trim().split(/\s+/).length >= 5) &&
    passphrase === confirmPassphrase;

  // Expected last 8 characters of recovery key (excluding hyphen)
  const cleanRk = recoveryKeyFormatted.replace(/-/g, '');
  const expectedLast8 = cleanRk.slice(-8);
  const isRecoveryConfirmed =
    confirmedLastChars.toUpperCase().replace(/[\s-]/g, '') === expectedLast8;

  const handleCopyRecoveryKey = () => {
    navigator.clipboard.writeText(recoveryKeyFormatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCreateVault = async () => {
    setStep('creating');
    setError(null);
    try {
      // 1. Create vault header
      const { header, masterKey } = await createVault(passphrase, 600_000, rawRecoveryKey);

      // 2. Commit vault to backend
      const res = await api.initVault(header);
      if (!res.ok) {
        throw new Error(res.error || 'Failed to save vault header on server');
      }

      onSetupComplete(masterKey, header);
    } catch (err: any) {
      setError(err.message || 'Vault creation failed');
      setStep('recovery');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center px-4 py-8">
      <div className="max-w-xl w-full bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">First-Run Vault Setup</h2>
              <p className="text-xs text-gray-400">Zero-knowledge end-to-end encryption</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <span
              className={`w-3 h-1.5 rounded-full ${step === 'doctor' ? 'bg-emerald-500' : 'bg-gray-700'}`}
            />
            <span
              className={`w-3 h-1.5 rounded-full ${step === 'passphrase' ? 'bg-emerald-500' : 'bg-gray-700'}`}
            />
            <span
              className={`w-3 h-1.5 rounded-full ${step === 'recovery' || step === 'creating' ? 'bg-emerald-500' : 'bg-gray-700'}`}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: DOCTOR CHECK */}
        {step === 'doctor' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-white mb-1">
                Storage &amp; Privacy Diagnostics
              </h3>
              <p className="text-xs text-gray-400">
                Verifying Telegram bot connectivity, channel privacy, and administrator rights.
              </p>
            </div>

            {doctorLoading ? (
              <div className="p-12 text-center text-gray-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-400" />
                <p className="text-sm">Running diagnostic checks...</p>
              </div>
            ) : doctorError ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <p className="font-semibold mb-1">Doctor Check Failed to Run</p>
                <p className="text-xs">{doctorError}</p>
                <button
                  onClick={loadDoctor}
                  className="mt-4 px-4 py-2 bg-red-600/30 hover:bg-red-600/50 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Retry Diagnostics
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {doctorReport?.checks.map((chk) => (
                  <div
                    key={chk.name}
                    className="p-3.5 rounded-xl bg-gray-950/60 border border-gray-800 flex items-start gap-3 text-sm"
                  >
                    {chk.status === 'pass' && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    )}
                    {chk.status === 'warn' && (
                      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    )}
                    {chk.status === 'fail' && (
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium text-gray-200 capitalize">
                        {chk.name.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{chk.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 flex justify-between items-center">
              <button
                onClick={loadDoctor}
                disabled={doctorLoading}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-run Checks
              </button>

              <button
                onClick={() => setStep('passphrase')}
                disabled={!doctorReport?.ok}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition flex items-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PASSPHRASE */}
        {step === 'passphrase' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-white mb-1">
                Choose your Master Passphrase
              </h3>
              <p className="text-xs text-gray-400">
                Your passphrase derives the encryption key in your browser. It is NEVER sent to the server.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
              <span>
                <strong>Zero Knowledge Warning:</strong> If you lose both your passphrase and recovery key, your files are unrecoverable by design.
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Master Passphrase (min 14 characters or 5 words)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="e.g. correct horse battery staple purple sunset"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>

                {/* Strength Meter */}
                <div className="mt-2.5">
                  <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${Math.max(5, strength.score)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-gray-400 mt-1">
                    <span>Strength: {strength.label}</span>
                    <span>{passphrase.length} chars</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Confirm Master Passphrase
                </label>
                <input
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="Re-type passphrase"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button
                onClick={() => setStep('doctor')}
                className="text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={() => setStep('recovery')}
                disabled={!isPassphraseValid}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition flex items-center gap-2 cursor-pointer"
              >
                <span>Continue to Recovery Key</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: RECOVERY KEY & FORCED CONFIRMATION */}
        {step === 'recovery' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-white mb-1">
                Your 52-Character Recovery Key
              </h3>
              <p className="text-xs text-gray-400">
                Shown ONLY ONCE. Store this offline or in a password manager. It allows recovering your library if you forget your passphrase.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-950 border border-gray-800">
              <div className="font-mono text-xs sm:text-sm text-emerald-400 tracking-wider break-all text-center select-all p-2 bg-gray-900/50 rounded-lg border border-gray-800/80">
                {recoveryKeyFormatted}
              </div>
              <button
                onClick={handleCopyRecoveryKey}
                className="mt-3 w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Recovery Key'}</span>
              </button>
            </div>

            {/* Forced Confirmation */}
            <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800/80 space-y-2">
              <label className="block text-xs font-medium text-gray-300">
                Confirm: Re-type the <strong>last 8 characters</strong> of your recovery key:
              </label>
              <input
                type="text"
                value={confirmedLastChars}
                onChange={(e) => setConfirmedLastChars(e.target.value.toUpperCase())}
                placeholder={`Last 8 chars (e.g. ${expectedLast8})`}
                maxLength={9}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <p className="text-[11px] text-gray-500">
                Required to ensure you have accurately copied and preserved your recovery key.
              </p>
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button
                onClick={() => setStep('passphrase')}
                className="text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleCreateVault}
                disabled={!isRecoveryConfirmed}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition flex items-center gap-2 cursor-pointer"
              >
                <span>Initialize Vault</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: INITIALIZING */}
        {step === 'creating' && (
          <div className="py-12 text-center text-gray-300 space-y-4">
            <RefreshCw className="w-10 h-10 animate-spin mx-auto text-emerald-400" />
            <h3 className="text-base font-semibold text-white">Deriving Keys &amp; Initializing Vault</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Running PBKDF2 (600,000 iterations) and generating AES-256-GCM wrappers in WebCrypto...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
