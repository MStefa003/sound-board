import { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { Download, X, CheckCircle, AlertCircle, Loader2, FolderOpen, RotateCcw } from 'lucide-react';

interface DownloadModalProps {
  onClose: () => void;
  onDownloaded: (filePath: string, title: string) => void;
}

type Status = 'idle' | 'downloading' | 'done' | 'error';

export default function DownloadModal({ onClose, onDownloaded }: DownloadModalProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [resultTitle, setResultTitle] = useState('');
  const [resultFilePath, setResultFilePath] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 60); }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text.trim());
      inputRef.current?.focus();
    } catch {}
  };

  const reset = () => {
    setUrl(''); setStatus('idle'); setMessage('');
    setResultTitle(''); setResultFilePath('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  useEffect(() => {
    const unProgress = listen<string>('download-progress', e => {
      setStatus('downloading');
      setMessage(e.payload);
    });
    const unComplete = listen<{ filePath: string; title: string }>('download-complete', e => {
      setStatus('done');
      setResultTitle(e.payload.title);
      setResultFilePath(e.payload.filePath);
      onDownloaded(e.payload.filePath, e.payload.title);
    });
    const unError = listen<string>('download-error', e => {
      setStatus('error');
      setMessage(e.payload);
    });
    return () => {
      unProgress.then(fn => fn());
      unComplete.then(fn => fn());
      unError.then(fn => fn());
    };
  }, [onDownloaded]);

  const handleDownload = async () => {
    const trimmed = url.trim();
    if (!trimmed || status === 'downloading') return;
    setStatus('downloading');
    setMessage('Starting…');
    try {
      await invoke('start_download', { url: trimmed });
    } catch (e) {
      setStatus('error');
      setMessage(String(e));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && status !== 'downloading') handleDownload();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.12s ease',
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 440,
          background: 'var(--surface-1)',
          borderRadius: 10,
          border: '1px solid var(--border)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.18s cubic-bezier(0.16,1,0.3,1)',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Download Audio</span>
          <button className="sp-btn sp-btn-ghost" onClick={onClose} style={{ width: 26, height: 26, padding: 0 }}>
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* URL input */}
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                ref={inputRef}
                className="sp-input"
                style={{ width: '100%', paddingRight: 30, boxSizing: 'border-box', fontSize: 12.5 }}
                placeholder="Paste a YouTube, SoundCloud, or other URL…"
                value={url}
                onChange={e => setUrl(e.target.value)}
                disabled={status === 'downloading'}
              />
              {!url && (
                <button
                  title="Paste"
                  onClick={handlePaste}
                  disabled={status === 'downloading'}
                  style={{
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-4)', padding: 3, display: 'flex', alignItems: 'center', borderRadius: 3,
                  }}
                >
                  <Download size={12} style={{ opacity: 0.6 }} />
                </button>
              )}
            </div>
            <button
              className="sp-btn sp-btn-accent"
              onClick={handleDownload}
              disabled={!url.trim() || status === 'downloading'}
              style={{ flexShrink: 0, gap: 5 }}
            >
              {status === 'downloading'
                ? <><Loader2 size={12} className="animate-spin" />Working…</>
                : <><Download size={12} />Get</>}
            </button>
          </div>

          {/* Hint */}
          {status === 'idle' && (
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-4)', lineHeight: 1.5 }}>
              Works with YouTube, SoundCloud, Twitter, TikTok, Twitch, and 1000+ other sites. Saved as MP3.
            </p>
          )}

          {/* Downloading */}
          {status === 'downloading' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Loader2 size={12} className="animate-spin" style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{message || 'Working…'}</span>
              </div>
              <div style={{ height: 2, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(90deg,transparent,var(--accent),transparent)',
                  animation: 'sp-shimmer 1.4s ease-in-out infinite',
                }} />
              </div>
            </div>
          )}

          {/* Done */}
          {status === 'done' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
              <CheckCircle size={13} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>"{resultTitle}"</span> added to your soundboard.
              </span>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
              <AlertCircle size={13} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: 'var(--danger)', lineHeight: 1.5, wordBreak: 'break-all' }}>{message}</span>
            </div>
          )}

          {/* Footer actions */}
          {(status === 'done' || status === 'error') && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {status === 'done' && (
                  <button className="sp-btn sp-btn-ghost" onClick={() => invoke('show_in_explorer', { path: resultFilePath })} style={{ gap: 5, fontSize: 11.5 }}>
                    <FolderOpen size={11} />Show in Explorer
                  </button>
                )}
                <button className="sp-btn sp-btn-ghost" onClick={reset} style={{ gap: 5, fontSize: 11.5 }}>
                  <RotateCcw size={11} />Download another
                </button>
              </div>
              <button className="sp-btn sp-btn-accent" onClick={onClose} style={{ fontSize: 12 }}>
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
