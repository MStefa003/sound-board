import { useEffect, useRef, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { register, unregister, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Download, X, Loader2 } from 'lucide-react';
import './App.css';

import { Sound, PlayingInstance, normalizeHotkey } from './types';
import Titlebar from './components/Titlebar';
import Toolbar from './components/Toolbar';
import SoundGrid from './components/SoundGrid';
import SoundList from './components/SoundList';
import Sidebar from './components/Sidebar';
import AddSoundModal from './components/AddSoundModal';
import DownloadModal from './components/DownloadModal';
import SettingsPanel from './components/SettingsPanel';
import StatusBar from './components/StatusBar';
import DriverSetupModal from './components/DriverSetupModal';
import PlaybackBar from './components/PlaybackBar';

export type ViewMode = 'grid' | 'list';
export type PlayMode = 'both' | 'speakers' | 'mic';

export default function App() {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const soundsRef = useRef<Sound[]>([]);
  soundsRef.current = sounds;
  const [stopHotkey, setStopHotkeyState] = useState<string>(() => localStorage.getItem('stop-hotkey') ?? '');
  const stopHotkeyRef = useRef(stopHotkey);
  stopHotkeyRef.current = stopHotkey;
  const [playingInstances, setPlayingInstances] = useState<PlayingInstance[]>([]);
  const [pausedInstances, setPausedInstances] = useState<Set<string>>(new Set());
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [availableDevices, setAvailableDevices] = useState<string[]>(['Default']);
  const [userDevices, setUserDevices] = useState<string[]>(['Default']);
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [playMode, setPlayMode] = useState<PlayMode>('both');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSound, setEditingSound] = useState<Sound | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [dropPath, setDropPath] = useState<string | undefined>(undefined);
  const [showDriverSetup, setShowDriverSetup] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  // Compute effective output devices based on play mode
  const effectiveDevices = useCallback((mode: PlayMode, configured: string[], all: string[]) => {
    if (mode === 'speakers') {
      const speakers = configured.filter(d => !d.toLowerCase().includes('cable'));
      return speakers.length > 0 ? speakers : ['Default'];
    }
    if (mode === 'mic') {
      const cable = all.filter(d => d.toLowerCase().includes('cable input'));
      return cable.length > 0 ? cable : configured;
    }
    return configured.length > 0 ? configured : ['Default'];
  }, []);

  // Sync effective devices to backend when playMode or userDevices changes
  useEffect(() => {
    const devs = effectiveDevices(playMode, userDevices, availableDevices);
    invoke('set_selected_devices', { devices: devs });
  }, [playMode, userDevices, availableDevices, effectiveDevices]);

  // Load initial data
  useEffect(() => {
    invoke<string[]>('get_audio_devices').then(setAvailableDevices);
    invoke<Sound[]>('load_sounds').then(setSounds);
    invoke<boolean>('check_vbcable_installed').then(installed => {
      if (!installed) setShowDriverSetup(true);
    });
  }, []);

  // Tauri audio event listeners
  useEffect(() => {
    const unlistenStarted = listen<{ instanceId: string; soundId: string }>('sound-started', e => {
      setPlayingInstances(prev => [
        ...prev,
        { instanceId: e.payload.instanceId, soundId: e.payload.soundId },
      ]);
    });
    const unlistenStopped = listen<string>('sound-stopped', e => {
      const id = e.payload;
      setPlayingInstances(prev => {
        const next = prev.filter(p => p.instanceId !== id);
        if (prev.length > 0 && prev[0].instanceId === id) setPlaybackPosition(0);
        return next;
      });
      setPausedInstances(prev => { const s = new Set(prev); s.delete(id); return s; });
    });
    const unlistenPaused = listen<string>('sound-paused', e => {
      setPausedInstances(prev => new Set([...prev, e.payload]));
    });
    const unlistenResumed = listen<string>('sound-resumed', e => {
      setPausedInstances(prev => { const s = new Set(prev); s.delete(e.payload); return s; });
    });
    const unlistenError = listen<{ error: string }>('sound-error', e => {
      setErrorToast(e.payload.error);
      setTimeout(() => setErrorToast(null), 5000);
    });
    const unlistenProgress = listen<{ instanceId: string; positionSecs: number }>('sound-progress', e => {
      setPlayingInstances(prev => {
        if (prev.length > 0 && prev[0].instanceId === e.payload.instanceId) {
          setPlaybackPosition(e.payload.positionSecs);
        }
        return prev;
      });
    });
    return () => {
      unlistenStarted.then(fn => fn());
      unlistenStopped.then(fn => fn());
      unlistenPaused.then(fn => fn());
      unlistenResumed.then(fn => fn());
      unlistenError.then(fn => fn());
      unlistenProgress.then(fn => fn());
    };
  }, []);

  const playSound = useCallback(async (sound: Sound) => {
    try {
      await invoke('stop_all_sounds');
      await invoke('play_sound', { soundId: sound.id, path: sound.path, volume: sound.volume });
    } catch (err) {
      console.error('Failed to play:', err);
    }
  }, []);

  const stopAll = useCallback(async () => {
    try { await invoke('stop_all_sounds'); } catch (err) { console.error(err); }
  }, []);

  // Register hotkeys — always start fresh to prevent handler stacking.
  // Each callback captures the sound's ID and looks up the current sound
  // in soundsRef so volume changes are reflected without needing re-registration.
  useEffect(() => {
    let alive = true;
    (async () => {
      await unregisterAll().catch(() => {});
      if (!alive) return;
      for (const sound of sounds) {
        if (!alive || !sound.hotkey) continue;
        const soundId = sound.id;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await register(normalizeHotkey(sound.hotkey), (evt: any) => {
            if (evt?.state === 'Released') return;
            const current = soundsRef.current.find(s => s.id === soundId);
            if (current) playSound(current);
          });
        } catch (_) {}
      }
      if (stopHotkey && alive) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await register(normalizeHotkey(stopHotkey), (evt: any) => {
            if (evt?.state === 'Released') return;
            stopAll();
          });
        } catch (_) {}
      }
    })();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sounds.map(s => s.hotkey).join(','), stopHotkey, playSound, stopAll]);

  // Sync master volume
  useEffect(() => {
    invoke('set_master_volume', { volume: masterVolume });
  }, [masterVolume]);

  // Check for updates on startup
  useEffect(() => {
    check().then(u => { if (u?.available) setPendingUpdate(u); }).catch(() => {});
  }, []);

  const handleInstallUpdate = async () => {
    if (!pendingUpdate) return;
    setIsInstalling(true);
    try {
      await pendingUpdate.downloadAndInstall();
      await relaunch();
    } catch { setIsInstalling(false); }
  };

  const stopSound = useCallback(async (instanceId: string) => {
    try { await invoke('stop_sound', { instanceId }); } catch (err) { console.error(err); }
  }, []);

  const pauseSound = useCallback(async (instanceId: string) => {
    try { await invoke('pause_sound', { instanceId }); } catch (err) { console.error(err); }
  }, []);

  const resumeSound = useCallback(async (instanceId: string) => {
    try { await invoke('resume_sound', { instanceId }); } catch (err) { console.error(err); }
  }, []);

  const seekSound = useCallback(async (instanceId: string, positionSecs: number) => {
    try { await invoke('seek_sound', { instanceId, positionSecs }); } catch (err) { console.error(err); }
  }, []);

  // Previous / next sound navigation
  const filteredSounds = sounds.filter(s => {
    if (activeCategory === '__none__') return !s.category;
    if (activeCategory) return s.category === activeCategory;
    return true;
  }).filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));

  const playPrev = useCallback(async () => {
    const playing = playingInstances[0];
    if (!playing) return;
    const idx = filteredSounds.findIndex(s => s.id === playing.soundId);
    if (idx > 0) {
      await stopAll();
      await playSound(filteredSounds[idx - 1]);
    }
  }, [playingInstances, filteredSounds, stopAll, playSound]);

  const playNext = useCallback(async () => {
    const playing = playingInstances[0];
    if (!playing) {
      if (filteredSounds.length > 0) await playSound(filteredSounds[0]);
      return;
    }
    const idx = filteredSounds.findIndex(s => s.id === playing.soundId);
    if (idx >= 0 && idx < filteredSounds.length - 1) {
      await stopAll();
      await playSound(filteredSounds[idx + 1]);
    }
  }, [playingInstances, filteredSounds, stopAll, playSound]);

  const togglePauseResume = useCallback(async () => {
    if (playingInstances.length === 0) return;
    const inst = playingInstances[0];
    if (pausedInstances.has(inst.instanceId)) {
      await resumeSound(inst.instanceId);
    } else {
      await pauseSound(inst.instanceId);
    }
  }, [playingInstances, pausedInstances, pauseSound, resumeSound]);

  const saveSounds = useCallback(async (newSounds: Sound[]) => {
    setSounds(newSounds);
    try { await invoke('save_sounds', { sounds: newSounds }); } catch (err) { console.error(err); }
  }, []);

  const handleSaveSound = useCallback(async (sound: Sound) => {
    const existing = sounds.find(s => s.id === sound.id);
    if (existing?.hotkey && existing.hotkey !== sound.hotkey) {
      try { await unregister(normalizeHotkey(existing.hotkey)); } catch (_) {}
    }
    // Registration is handled by the hotkey effect — don't register here to avoid duplicates
    const updated = existing
      ? sounds.map(s => (s.id === sound.id ? sound : s))
      : [...sounds, sound];
    saveSounds(updated);
  }, [sounds, saveSounds]);

  const handleDeleteSound = useCallback(async (id: string) => {
    const sound = sounds.find(s => s.id === id);
    if (sound?.hotkey) { try { await unregister(normalizeHotkey(sound.hotkey)); } catch (_) {} }
    saveSounds(sounds.filter(s => s.id !== id));
  }, [sounds, saveSounds]);

  const handleSetCategory = useCallback(async (ids: string[], category: string | null) => {
    const updated = sounds.map(s => ids.includes(s.id) ? { ...s, category } : s);
    saveSounds(updated);
  }, [sounds, saveSounds]);

  const handleToggleFavorite = useCallback((id: string) => {
    saveSounds(sounds.map(s => s.id === id ? { ...s, favorite: !s.favorite } : s));
  }, [sounds, saveSounds]);

  const handleShowInExplorer = useCallback(async (sound: Sound) => {
    try { await invoke('show_in_explorer', { path: sound.path }); } catch (err) { console.error(err); }
  }, []);

  const handleDownloadComplete = useCallback(async (filePath: string, title: string) => {
    let duration: number | null = null;
    try { duration = await invoke<number>('get_sound_duration', { path: filePath }); } catch {}
    const newSound: Sound = {
      id: crypto.randomUUID(),
      name: title,
      path: filePath,
      hotkey: null,
      volume: 1.0,
      color: 'grey',
      duration,
      category: null,
    };
    handleSaveSound(newSound);
  }, [handleSaveSound]);

  const handleRenameCategory = useCallback(async (oldName: string, newName: string) => {
    const updated = sounds.map(s => s.category === oldName ? { ...s, category: newName } : s);
    saveSounds(updated);
  }, [sounds, saveSounds]);

  const handleDeleteCategory = useCallback(async (catName: string) => {
    const updated = sounds.map(s => s.category === catName ? { ...s, category: null } : s);
    saveSounds(updated);
  }, [sounds, saveSounds]);

  const handleDropFiles = useCallback(async (paths: string[]) => {
    const newSounds: Sound[] = await Promise.all(paths.map(async (path) => {
      const base = path.replace(/\\/g, '/').split('/').pop() ?? path;
      const name = base.replace(/\.[^.]+$/, '');
      let duration: number | null = null;
      try { duration = await invoke<number>('get_sound_duration', { path }); } catch {}
      return {
        id: crypto.randomUUID(),
        name,
        path,
        hotkey: null,
        volume: 1.0,
        color: 'grey',
        duration,
        category: null,
      } satisfies Sound;
    }));
    setSounds(prev => {
      const updated = [...prev, ...newSounds];
      invoke('save_sounds', { sounds: updated }).catch(console.error);
      return updated;
    });
  }, []);

  // Keep a ref so the Tauri listener (registered once) always calls the latest version
  const handleDropFilesRef = useRef(handleDropFiles);
  handleDropFilesRef.current = handleDropFiles;

  // Tauri OS-level file drop (gives real file paths, unlike HTML5 File API)
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlisten = appWindow.onDragDropEvent(event => {
      if (event.payload.type === 'drop') {
        const audioExts = /\.(mp3|wav|ogg|flac|m4a|aac|opus|wma)$/i;
        const paths = (event.payload as { type: string; paths: string[] }).paths
          .filter(p => audioExts.test(p));
        if (paths.length > 0) handleDropFilesRef.current(paths);
      }
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  const handleDeviceToggle = (device: string) => {
    setUserDevices(prev =>
      prev.includes(device) ? prev.filter(d => d !== device) : [...prev, device]
    );
  };

  const currentlyPlaying = playingInstances[0]
    ? sounds.find(s => s.id === playingInstances[0].soundId)
    : null;
  const isPausedMain = playingInstances[0]
    ? pausedInstances.has(playingInstances[0].instanceId)
    : false;

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)' }} onContextMenu={e => e.preventDefault()}>
      <Titlebar
        hasPlaying={playingInstances.length > 0}
        currentlyPlaying={currentlyPlaying ?? null}
        isPaused={isPausedMain}
        playingCount={playingInstances.length}
        onPrev={playPrev}
        onPauseResume={togglePauseResume}
        onNext={playNext}
      />
      <PlaybackBar
        currentSound={currentlyPlaying ?? null}
        instanceId={playingInstances[0]?.instanceId ?? null}
        positionSecs={playbackPosition}
        isPaused={isPausedMain}
        onSeek={seekSound}
      />
      <Toolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddSound={() => { setDropPath(undefined); setEditingSound(null); setShowAddModal(true); }}
        onOpenDownload={() => setShowDownloadModal(true)}
        onStopAll={stopAll}
        onOpenSettings={() => setShowSettings(true)}
        playingCount={playingInstances.length}
        hasPlaying={playingInstances.length > 0}
        masterVolume={masterVolume}
        onMasterVolumeChange={setMasterVolume}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        playMode={playMode}
        onPlayModeChange={setPlayMode}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          sounds={sounds}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          onRenameCategory={handleRenameCategory}
          onDeleteCategory={handleDeleteCategory}
        />
        {viewMode === 'list' ? (
          <SoundList
            sounds={filteredSounds}
            playingInstances={playingInstances}
            pausedInstances={pausedInstances}
            searchQuery=""
            existingCategories={Array.from(new Set(sounds.map(s => s.category).filter((c): c is string => !!c)))}
            onPlay={playSound}
            onStop={stopSound}
            onPause={pauseSound}
            onResume={resumeSound}
            onDelete={handleDeleteSound}
            onEdit={s => { setEditingSound(s); setDropPath(undefined); setShowAddModal(true); }}
            onSetCategory={handleSetCategory}
            onToggleFavorite={handleToggleFavorite}
            onShowInExplorer={handleShowInExplorer}
          />
        ) : (
          <SoundGrid
            sounds={filteredSounds}
            playingInstances={playingInstances}
            searchQuery=""
            existingCategories={Array.from(new Set(sounds.map(s => s.category).filter((c): c is string => !!c)))}
            onPlay={playSound}
            onStop={stopSound}
            onDelete={handleDeleteSound}
            onEdit={s => { setEditingSound(s); setDropPath(undefined); setShowAddModal(true); }}
            onSetCategory={handleSetCategory}
            onToggleFavorite={handleToggleFavorite}
            onShowInExplorer={handleShowInExplorer}
            onAddSound={() => { setDropPath(undefined); setEditingSound(null); setShowAddModal(true); }}
            canReorder={!searchQuery && !activeCategory}
            onReorder={saveSounds}
          />
        )}
      </div>
      <StatusBar
        selectedDevices={effectiveDevices(playMode, userDevices, availableDevices)}
        playingCount={playingInstances.length}
        masterVolume={masterVolume}
        soundCount={sounds.length}
        playMode={playMode}
      />

      {showAddModal && (
        <AddSoundModal
          editingSound={editingSound}
          initialPath={dropPath}
          existingCategories={Array.from(new Set(sounds.map(s => s.category).filter((c): c is string => !!c)))}
          onClose={() => { setShowAddModal(false); setEditingSound(null); setDropPath(undefined); }}
          onAdd={(data) => {
            const id = editingSound ? editingSound.id : crypto.randomUUID();
            handleSaveSound({ ...data, id });
          }}
        />
      )}
      {showDownloadModal && (
        <DownloadModal
          onClose={() => setShowDownloadModal(false)}
          onDownloaded={handleDownloadComplete}
        />
      )}
      {showSettings && (
        <SettingsPanel
          availableDevices={availableDevices}
          selectedDevices={userDevices}
          masterVolume={masterVolume}
          onDeviceToggle={handleDeviceToggle}
          onMasterVolumeChange={setMasterVolume}
          onClose={() => setShowSettings(false)}
          stopHotkey={stopHotkey}
          onStopHotkeyChange={v => {
            setStopHotkeyState(v);
            if (v) localStorage.setItem('stop-hotkey', v);
            else localStorage.removeItem('stop-hotkey');
          }}
        />
      )}
      {showDriverSetup && (
        <DriverSetupModal onSkip={() => setShowDriverSetup(false)} />
      )}
      {errorToast && (
        <div
          style={{
            position: 'fixed', bottom: 42, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--surface-2)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 18px',
            fontSize: 12.5, color: 'var(--danger)', maxWidth: 420,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          ⚠ Audio error: {errorToast}
        </div>
      )}
      {pendingUpdate && (
        <div style={{
          position: 'fixed', bottom: 50, right: 16, zIndex: 1500,
          background: 'var(--surface-2)',
          border: '1px solid rgba(91,156,246,0.3)',
          borderRadius: 12, padding: '14px 16px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          display: 'flex', flexDirection: 'column', gap: 10,
          minWidth: 272,
          animation: 'sp-slide-in-right 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: 'rgba(91,156,246,0.15)', border: '1px solid rgba(91,156,246,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
            }}>
              <Download size={15} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Update available</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
                v{pendingUpdate.version} is ready to install
              </div>
            </div>
            <button
              className="sp-btn sp-btn-ghost"
              onClick={() => setPendingUpdate(null)}
              style={{ width: 22, height: 22, padding: 0, flexShrink: 0 }}
              disabled={isInstalling}
            >
              <X size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="sp-btn sp-btn-ghost"
              onClick={() => setPendingUpdate(null)}
              style={{ flex: 1 }}
              disabled={isInstalling}
            >
              Later
            </button>
            <button
              className="sp-btn sp-btn-accent"
              onClick={handleInstallUpdate}
              disabled={isInstalling}
              style={{ flex: 1, gap: 5 }}
            >
              {isInstalling
                ? <><Loader2 size={12} className="animate-spin" />Installing…</>
                : <><Download size={12} />Update now</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
