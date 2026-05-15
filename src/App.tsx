import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { register, unregister, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import './App.css';

import { Sound, PlayingInstance } from './types';
import Titlebar from './components/Titlebar';
import Toolbar from './components/Toolbar';
import SoundGrid from './components/SoundGrid';
import SoundList from './components/SoundList';
import Sidebar from './components/Sidebar';
import AddSoundModal from './components/AddSoundModal';
import SettingsPanel from './components/SettingsPanel';
import StatusBar from './components/StatusBar';
import DriverSetupModal from './components/DriverSetupModal';

export type ViewMode = 'grid' | 'list';
export type PlayMode = 'both' | 'speakers' | 'mic';

export default function App() {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [playingInstances, setPlayingInstances] = useState<PlayingInstance[]>([]);
  const [pausedInstances, setPausedInstances] = useState<Set<string>>(new Set());
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
  const [errorToast, setErrorToast] = useState<string | null>(null);

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
      setPlayingInstances(prev => prev.filter(p => p.instanceId !== id));
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
    return () => {
      unlistenStarted.then(fn => fn());
      unlistenStopped.then(fn => fn());
      unlistenPaused.then(fn => fn());
      unlistenResumed.then(fn => fn());
      unlistenError.then(fn => fn());
    };
  }, []);

  // Register hotkeys — always start fresh to prevent handler stacking
  useEffect(() => {
    let alive = true;
    (async () => {
      await unregisterAll().catch(() => {});
      if (!alive) return;
      for (const sound of sounds) {
        if (!alive || !sound.hotkey) continue;
        try { await register(sound.hotkey, () => playSound(sound)); } catch (_) {}
      }
    })();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sounds.map(s => s.hotkey).join(',')]);

  // Sync master volume
  useEffect(() => {
    invoke('set_master_volume', { volume: masterVolume });
  }, [masterVolume]);

  const playSound = useCallback(async (sound: Sound) => {
    try {
      await invoke('play_sound', { soundId: sound.id, path: sound.path, volume: sound.volume });
    } catch (err) {
      console.error('Failed to play:', err);
    }
  }, []);

  const stopSound = useCallback(async (instanceId: string) => {
    try { await invoke('stop_sound', { instanceId }); } catch (err) { console.error(err); }
  }, []);

  const pauseSound = useCallback(async (instanceId: string) => {
    try { await invoke('pause_sound', { instanceId }); } catch (err) { console.error(err); }
  }, []);

  const resumeSound = useCallback(async (instanceId: string) => {
    try { await invoke('resume_sound', { instanceId }); } catch (err) { console.error(err); }
  }, []);

  const stopAll = useCallback(async () => {
    try { await invoke('stop_all_sounds'); } catch (err) { console.error(err); }
  }, []);

  // Previous / next sound navigation
  const filteredSounds = sounds.filter(s => {
    if (activeCategory === '__none__') return !s.category;
    if (activeCategory) return s.category === activeCategory;
    return true;
  }).filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

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
      try { await unregister(existing.hotkey); } catch (_) {}
    }
    // Registration is handled by the hotkey effect — don't register here to avoid duplicates
    const updated = existing
      ? sounds.map(s => (s.id === sound.id ? sound : s))
      : [...sounds, sound];
    saveSounds(updated);
  }, [sounds, saveSounds]);

  const handleDeleteSound = useCallback(async (id: string) => {
    const sound = sounds.find(s => s.id === id);
    if (sound?.hotkey) { try { await unregister(sound.hotkey); } catch (_) {} }
    saveSounds(sounds.filter(s => s.id !== id));
  }, [sounds, saveSounds]);

  const handleSetCategory = useCallback(async (ids: string[], category: string | null) => {
    const updated = sounds.map(s => ids.includes(s.id) ? { ...s, category } : s);
    saveSounds(updated);
  }, [sounds, saveSounds]);

  const handleRenameCategory = useCallback(async (oldName: string, newName: string) => {
    const updated = sounds.map(s => s.category === oldName ? { ...s, category: newName } : s);
    saveSounds(updated);
  }, [sounds, saveSounds]);

  const handleDeleteCategory = useCallback(async (catName: string) => {
    const updated = sounds.map(s => s.category === catName ? { ...s, category: null } : s);
    saveSounds(updated);
  }, [sounds, saveSounds]);

  const handleDropFiles = useCallback((paths: string[]) => {
    setDropPath(paths[0]);
    setEditingSound(null);
    setShowAddModal(true);
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
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Titlebar />
      <Toolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddSound={() => { setDropPath(undefined); setEditingSound(null); setShowAddModal(true); }}
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
        currentlyPlaying={currentlyPlaying ?? null}
        isPaused={isPausedMain}
        onPauseResume={togglePauseResume}
        onPrev={playPrev}
        onNext={playNext}
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
            onAddSound={() => { setDropPath(undefined); setEditingSound(null); setShowAddModal(true); }}
            onFileDrop={(path) => { handleDropFiles([path]); }}
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
      {showSettings && (
        <SettingsPanel
          availableDevices={availableDevices}
          selectedDevices={userDevices}
          masterVolume={masterVolume}
          onDeviceToggle={handleDeviceToggle}
          onMasterVolumeChange={setMasterVolume}
          onClose={() => setShowSettings(false)}
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
    </div>
  );
}
