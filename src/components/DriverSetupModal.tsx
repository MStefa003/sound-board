import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Download, RotateCcw, CheckCircle, AlertCircle, Loader } from 'lucide-react';

type Step = 'prompt' | 'installing' | 'done' | 'rebooting' | 'error';

interface DriverSetupModalProps {
  onSkip: () => void;
}

export default function DriverSetupModal({ onSkip }: DriverSetupModalProps) {
  const [step, setStep] = useState<Step>('prompt');
  const [errorMsg, setErrorMsg] = useState('');

  const handleInstall = async () => {
    setStep('installing');
    try {
      await invoke('install_vbcable');
      setStep('done');
    } catch (e) {
      setErrorMsg(String(e));
      setStep('error');
    }
  };

  const handleReboot = async () => {
    setStep('rebooting');
    try {
      await invoke('reboot_system');
    } catch (e) {
      setErrorMsg(String(e));
      setStep('error');
    }
  };

  return (
    <div
      className="modal-backdrop fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <div
        className="modal-content flex flex-col"
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          width: 420,
          overflow: 'hidden',
        }}
      >
        {/* Header stripe */}
        <div style={{ height: 3, background: 'var(--accent)' }} />

        <div className="flex flex-col gap-5 p-7">
          {/* Icon + title */}
          <div className="flex items-start gap-4">
            <div
              style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: 'var(--surface-2)', border: '1px solid var(--border-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {step === 'installing' || step === 'rebooting' ? (
                <Loader size={20} style={{ color: 'var(--text-3)', animation: 'spin 1s linear infinite' }} />
              ) : step === 'done' ? (
                <CheckCircle size={20} style={{ color: 'var(--green)' }} />
              ) : step === 'error' ? (
                <AlertCircle size={20} style={{ color: 'var(--danger)' }} />
              ) : (
                <Download size={20} style={{ color: 'var(--text-2)' }} />
              )}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
                {step === 'prompt'     && 'VB-Audio Virtual Cable not found'}
                {step === 'installing' && 'Launching installer…'}
                {step === 'done'       && 'Installer launched — restart required'}
                {step === 'rebooting'  && 'Restarting in 5 seconds…'}
                {step === 'error'      && 'Something went wrong'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
                {step === 'prompt' && (
                  <>
                    SoundPad routes audio through your mic using VB-Audio Virtual Cable.
                    It is <strong style={{ color: 'var(--text-2)' }}>free</strong> and only takes a minute to install.
                  </>
                )}
                {step === 'installing' && 'A UAC prompt will appear — click Yes to allow the driver to install. After setup completes come back here.'}
                {step === 'done'       && 'The driver was installed successfully. You must restart your PC before the virtual cable device appears in SoundPad.'}
                {step === 'rebooting'  && 'Your PC will restart shortly. SoundPad will be ready after you log back in.'}
                {step === 'error'      && errorMsg}
              </p>
            </div>
          </div>

          {/* Step detail */}
          {step === 'prompt' && (
            <div
              style={{
                background: 'var(--bg)', border: '1px solid var(--border-dim)',
                borderRadius: 9, padding: '12px 14px',
              }}
            >
              <p style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                What happens
              </p>
              {[
                '1. Download VB-Audio Virtual Cable (~5 MB)',
                '2. Windows will ask for permission (UAC prompt)',
                '3. Driver installs — restart required',
                '4. Select "CABLE Input" as output in SoundPad settings',
                '5. In Discord, set "CABLE Output" as your microphone',
              ].map((line, i) => (
                <p key={i} style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>{line}</p>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-2 justify-end">
            {step === 'prompt' && (
              <>
                <button className="sp-btn sp-btn-ghost" onClick={onSkip} style={{ fontSize: 12 }}>
                  Skip for now
                </button>
                <button className="sp-btn sp-btn-primary" onClick={handleInstall} style={{ fontSize: 12, gap: 6 }}>
                  <Download size={13} />
                  Install VB-Cable
                </button>
              </>
            )}

            {step === 'installing' && (
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Complete the installer window, then click below…
              </p>
            )}

            {step === 'installing' && (
              <button className="sp-btn sp-btn-primary" onClick={() => setStep('done')} style={{ fontSize: 12 }}>
                Installation Complete
              </button>
            )}

            {step === 'done' && (
              <>
                <button className="sp-btn sp-btn-ghost" onClick={onSkip} style={{ fontSize: 12 }}>
                  Restart Later
                </button>
                <button
                  className="sp-btn sp-btn-primary"
                  onClick={handleReboot}
                  style={{ fontSize: 12, gap: 6 }}
                >
                  <RotateCcw size={13} />
                  Restart Now
                </button>
              </>
            )}

            {step === 'error' && (
              <>
                <button className="sp-btn sp-btn-ghost" onClick={onSkip} style={{ fontSize: 12 }}>
                  Close
                </button>
                <button className="sp-btn sp-btn-primary" onClick={() => setStep('prompt')} style={{ fontSize: 12 }}>
                  Try Again
                </button>
              </>
            )}

            {step === 'rebooting' && (
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Saving your work…</p>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

