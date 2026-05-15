import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { X, Volume2, Monitor, Mic, Info, RefreshCw } from "lucide-react";

interface SettingsPanelProps {
  availableDevices: string[];
  selectedDevices: string[];
  masterVolume: number;
  onDeviceToggle: (device: string) => void;
  onMasterVolumeChange: (v: number) => void;
  onClose: () => void;
}

type NavId = "volume" | "devices" | "routing" | "updates" | "about";

interface NavItem {
  id: NavId;
  label: string;
  icon: React.ElementType<{ size?: number; style?: React.CSSProperties }>;
  group: string;
}

const NAV: NavItem[] = [
  { id: "volume",  label: "Volume",         icon: Volume2,   group: "Audio"   },
  { id: "devices", label: "Output Devices", icon: Monitor,   group: "Audio"   },
  { id: "routing", label: "Mic Routing",    icon: Mic,       group: "Routing" },
  { id: "updates", label: "Updates",        icon: RefreshCw, group: "Info"    },
  { id: "about",   label: "About",          icon: Info,      group: "Info"    },
];

type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "up-to-date" | "error";

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={on}
      style={{
        position: "relative", width: 38, height: 22, borderRadius: 11, flexShrink: 0,
        background: on ? "var(--accent)" : "var(--surface-2)",
        border: `1px solid ${on ? "rgba(91,156,246,0.5)" : "var(--border)"}`,
        cursor: "pointer", transition: "background 0.2s, border-color 0.2s", padding: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: on ? 18 : 3,
        width: 14, height: 14, borderRadius: "50%",
        background: on ? "#fff" : "var(--text-3)",
        transition: "left 0.2s, background 0.2s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
      }} />
    </button>
  );
}

export default function SettingsPanel({
  availableDevices, selectedDevices, masterVolume, onDeviceToggle, onMasterVolumeChange, onClose,
}: SettingsPanelProps) {
  const [activeId, setActiveId] = useState<NavId>("volume");
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateNotes, setUpdateNotes] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendingUpdate, setPendingUpdate] = useState<any>(null);

  const handleCheckUpdate = async () => {
    setUpdateStatus("checking");
    setUpdateError(null);
    try {
      const update = await check();
      if (update?.available) {
        setUpdateStatus("available");
        setUpdateVersion(update.version ?? null);
        setUpdateNotes(update.body ?? null);
        setPendingUpdate(update);
      } else {
        setUpdateStatus("up-to-date");
      }
    } catch (e) {
      setUpdateStatus("error");
      const msg = String(e);
      if (msg.includes("release") || msg.includes("JSON") || msg.includes("fetch") || msg.includes("404") || msg.includes("network")) {
        setUpdateError("No updates found. Make sure you're connected to the internet and a release has been published.");
      } else {
        setUpdateError("Could not check for updates. " + msg);
      }
    }
  };

  const handleDownloadAndInstall = async () => {
    if (!pendingUpdate) return;
    setUpdateStatus("downloading");
    try {
      await pendingUpdate.downloadAndInstall();
      setUpdateStatus("ready");
    } catch (e) {
      setUpdateStatus("error");
      setUpdateError(String(e));
    }
  };

  const cableDevice = availableDevices.find(d => d.toLowerCase().includes("cable input"));
  const cableEnabled = cableDevice ? selectedDevices.includes(cableDevice) : false;
  const cablePresent = !!cableDevice;
  const volPct = Math.round(masterVolume * 100);

  const handleCableToggle = () => {
    if (!cableDevice) return;
    onDeviceToggle(cableDevice);
    if (cableEnabled) invoke("stop_mic_passthrough").catch(console.error);
    else invoke("start_mic_passthrough").catch(console.error);
  };

  const groups = Array.from(new Set(NAV.map(n => n.group)));

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--surface-1)", border: "1px solid var(--border)",
        borderRadius: 12, width: 640, height: 500,
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
      }}>

        {/* ─── Top bar ─────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px 13px",
          borderBottom: "1px solid var(--border-dim)",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", letterSpacing: "-0.01em" }}>
            Settings
          </span>
          <button
            onClick={onClose}
            style={{
              width: 24, height: 24, borderRadius: 6, border: "none",
              background: "transparent", cursor: "pointer", color: "var(--text-3)",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.1s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text-1)"; e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.background = "transparent"; }}>
            <X size={13} />
          </button>
        </div>

        {/* ─── Body ────────────────────────────── */}
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

          {/* Left nav */}
          <div style={{
            width: 188, flexShrink: 0, overflowY: "auto",
            borderRight: "1px solid var(--border-dim)",
            padding: "8px 10px",
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            {groups.map(group => (
              <div key={group} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <p style={{
                  margin: 0, padding: "8px 8px 4px",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: "var(--text-4)",
                }}>
                  {group}
                </p>
                {NAV.filter(n => n.group === group).map(item => {
                  const active = activeId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveId(item.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 9,
                        padding: "7px 10px 7px 12px",
                        borderRadius: 7, border: "none", cursor: "pointer",
                        background: active ? "var(--accent-dim)" : "transparent",
                        color: active ? "var(--text-1)" : "var(--text-3)",
                        fontWeight: active ? 500 : 400,
                        fontSize: 12.5, textAlign: "left",
                        transition: "color 0.1s, background 0.1s",
                        position: "relative",
                      }}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-2)"; } }}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-3)"; } }}
                    >
                      {/* Active left accent bar */}
                      {active && (
                        <span style={{
                          position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                          width: 2, height: 20, borderRadius: "0 2px 2px 0",
                          background: "var(--accent)",
                        }} />
                      )}
                      <item.icon size={13} style={{ color: active ? "var(--accent)" : "currentColor", flexShrink: 0 }} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

            {activeId === "volume" && (
              <Section title="Master Volume" description="Controls the playback level for all sounds in the soundboard.">
                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ flex: 1, position: "relative", height: 20, display: "flex", alignItems: "center" }}>
                      {/* Filled track */}
                      <div style={{
                        position: "absolute", left: 0, height: 3,
                        width: `${Math.min(volPct / 2, 100)}%`,
                        background: "var(--accent-dim)", borderRadius: 10,
                        pointerEvents: "none", zIndex: 0,
                      }} />
                      <input
                        type="range" min="0" max="2" step="0.01" value={masterVolume}
                        onChange={e => onMasterVolumeChange(parseFloat(e.target.value))}
                        style={{ position: "relative", zIndex: 1 }}
                      />
                    </div>
                    <span style={{
                      fontSize: 12.5, color: "var(--text-2)",
                      fontVariantNumeric: "tabular-nums",
                      minWidth: 34, textAlign: "right",
                    }}>
                      {volPct}%
                    </span>
                  </div>

                  {masterVolume > 1 && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 12px", borderRadius: 7,
                      background: "rgba(234,179,8,0.05)",
                      border: "1px solid rgba(234,179,8,0.15)",
                    }}>
                      <span style={{ fontSize: 11, color: "#a07820" }}>
                        Boost above 100% may cause audio clipping.
                      </span>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[25, 50, 75, 100].map(pct => (
                      <button
                        key={pct}
                        onClick={() => onMasterVolumeChange(pct / 100)}
                        style={{
                          padding: "4px 11px", borderRadius: 5, border: "1px solid var(--border-dim)",
                          background: volPct === pct ? "var(--accent-dim)" : "transparent",
                          color: volPct === pct ? "var(--accent)" : "var(--text-3)",
                          fontSize: 11.5, cursor: "pointer", transition: "all 0.1s",
                        }}
                        onMouseEnter={e => { if (volPct !== pct) e.currentTarget.style.borderColor = "var(--border)"; }}
                        onMouseLeave={e => { if (volPct !== pct) e.currentTarget.style.borderColor = "var(--border-dim)"; }}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </Section>
            )}

            {activeId === "devices" && (
              <Section title="Output Devices" description="Select which audio outputs sounds will play through.">
                {availableDevices.length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>No audio devices found.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 400 }}>
                    {availableDevices.map(device => {
                      const checked = selectedDevices.includes(device);
                      const isCable = device.toLowerCase().includes("cable");
                      return (
                        <DeviceRow
                          key={device}
                          label={device}
                          checked={checked}
                          badge={isCable ? "Virtual" : undefined}
                          onClick={() => onDeviceToggle(device)}
                        />
                      );
                    })}
                  </div>
                )}
              </Section>
            )}

            {activeId === "routing" && (
              <Section title="Mic Routing" description="Route soundboard audio through a virtual microphone so others can hear it in voice calls.">
                <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 400 }}>

                  {/* Status indicator */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                      background: cablePresent ? "#22c55e" : "#f87171",
                      boxShadow: cablePresent ? "0 0 5px rgba(34,197,94,0.6)" : "none",
                    }} />
                    <span style={{ fontSize: 12, color: cablePresent ? "var(--text-3)" : "var(--danger)" }}>
                      {cablePresent ? "VB-Audio Virtual Cable detected" : "VB-Audio Virtual Cable not found — install it first"}
                    </span>
                  </div>

                  {/* Toggle row */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 14px", borderRadius: 8,
                    background: "var(--surface-2)", border: "1px solid var(--border)",
                    opacity: cablePresent ? 1 : 0.4,
                  }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--text-1)" }}>
                        Mic passthrough
                      </p>
                      <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "var(--text-3)", lineHeight: 1.5 }}>
                        Plays sounds into CABLE Input so Discord picks them up
                      </p>
                    </div>
                    <Toggle on={cableEnabled} onChange={handleCableToggle} />
                  </div>

                  {/* Setup steps */}
                  {cablePresent && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      <SetupStep
                        done={cablePresent}
                        label="VB-Audio Virtual Cable is installed"
                      />
                      <SetupStep
                        done={cableEnabled}
                        label="Mic passthrough is enabled above"
                      />
                      <SetupStep
                        done={false}
                        label={<>In Discord, go to <strong style={{ fontWeight: 600, color: "#555" }}>Settings → Voice & Video → Input Device</strong> and select <strong style={{ fontWeight: 600, color: "#555" }}>CABLE Output</strong></>}
                        pending
                      />
                    </div>
                  )}
                </div>
              </Section>
            )}

            {activeId === "updates" && (
              <Section title="Updates" description="Check for new versions of Soundpad. Release notes will appear here when an update is found.">
                <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 400 }}>

                  {/* Status row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                      onClick={handleCheckUpdate}
                      disabled={updateStatus === "checking" || updateStatus === "downloading"}
                      style={{
                        padding: "7px 16px", borderRadius: 7, border: "1px solid rgba(91,156,246,0.35)",
                        background: "var(--accent-dim)", color: "var(--accent)",
                        fontSize: 12.5, fontWeight: 500, cursor: "pointer",
                        opacity: (updateStatus === "checking" || updateStatus === "downloading") ? 0.5 : 1,
                        transition: "opacity 0.15s",
                      }}
                    >
                      {updateStatus === "checking" ? "Checking…" : updateStatus === "downloading" ? "Downloading…" : "Check for updates"}
                    </button>

                    {updateStatus === "up-to-date" && (
                      <span style={{ fontSize: 12.5, color: "var(--green)" }}>You're up to date</span>
                    )}
                    {updateStatus === "ready" && (
                      <span style={{ fontSize: 12, color: "#22c55e" }}>Installed — restarting…</span>
                    )}
                  </div>

                  {/* Error */}
                  {updateStatus === "error" && updateError && (
                    <div style={{
                      padding: "10px 14px", borderRadius: 7,
                      background: "rgba(248,113,113,0.05)",
                      border: "1px solid rgba(248,113,113,0.15)",
                    }}>
                      <p style={{ margin: 0, fontSize: 11.5, color: "var(--danger)", lineHeight: 1.5 }}>{updateError}</p>
                    </div>
                  )}

                  {/* Available */}
                  {(updateStatus === "available" || updateStatus === "downloading") && (
                    <div style={{
                      display: "flex", flexDirection: "column", gap: 12,
                      padding: "14px 16px", borderRadius: 8,
                        background: "rgba(91,156,246,0.06)",
                        border: "1px solid rgba(91,156,246,0.2)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-1)" }}>
                          v{updateVersion} available
                        </span>
                        <button
                          onClick={handleDownloadAndInstall}
                          disabled={updateStatus === "downloading"}
                          style={{
                            padding: "6px 14px", borderRadius: 6, border: "none",
                            background: "var(--accent)", color: "#fff",
                            fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                            opacity: updateStatus === "downloading" ? 0.6 : 1,
                            transition: "opacity 0.15s",
                          }}
                        >
                          {updateStatus === "downloading" ? "Downloading…" : "Update & restart"}
                        </button>
                      </div>

                      {updateNotes && (
                        <div style={{
                          borderTop: "1px solid var(--border-dim)",
                          paddingTop: 12,
                        }}>
                          <p style={{ margin: "0 0 8px", fontSize: 10.5, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Release notes</p>
                          <pre style={{
                            margin: 0, fontSize: 12, color: "var(--text-2)",
                            lineHeight: 1.65, whiteSpace: "pre-wrap", fontFamily: "inherit",
                          }}>{updateNotes}</pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ready to relaunch */}
                  {updateStatus === "ready" && (
                    <button
                      onClick={() => relaunch()}
                      style={{
                        padding: "9px 18px", borderRadius: 7, border: "none",
                        background: "var(--green)", color: "#fff",
                        fontSize: 13, fontWeight: 600, cursor: "pointer",
                        alignSelf: "flex-start",
                      }}
                    >
                      Restart now
                    </button>
                  )}
                </div>
              </Section>
            )}

            {activeId === "about" && (
              <Section title="About" description="Soundpad — a desktop soundboard for voice calls.">
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 380 }}>
                  {([
                    ["Built with", "Tauri + Rust + React"],
                    ["Audio engine", "rodio / cpal"],
                    ["Mic routing", "VB-Audio Virtual Cable"],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} style={{
                      display: "flex", alignItems: "baseline", justifyContent: "space-between",
                      padding: "9px 0",
                      borderBottom: "1px solid var(--border-dim)",
                    }}>
                      <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>{label}</span>
                      <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>{value}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ───────────────────────── */

function Section({ title, description, children }: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-1)", letterSpacing: "-0.01em" }}>
          {title}
        </h2>
        <p style={{ margin: "5px 0 0", fontSize: 12.5, color: "var(--text-3)", lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
      <div style={{ height: 1, background: "var(--border-dim)" }} />
      {children}
    </div>
  );
}

function DeviceRow({ label, checked, badge, onClick }: {
  label: string;
  checked: boolean;
  badge?: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 12px", borderRadius: 7, border: "none", cursor: "pointer",
        textAlign: "left", transition: "background 0.1s",
        background: checked ? "var(--accent-dim)" : hovered ? "rgba(255,255,255,0.03)" : "transparent",
        outline: checked ? "1px solid rgba(91,156,246,0.25)" : "1px solid transparent",
      }}
    >
      <div style={{
        width: 15, height: 15, borderRadius: 4, flexShrink: 0,
        border: `1px solid ${checked ? "var(--accent)" : "var(--border)"}`,
        background: checked ? "var(--accent)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "border-color 0.12s, background 0.12s",
      }}>
        {checked && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{
        fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        color: checked ? "var(--text-1)" : "var(--text-3)",
        transition: "color 0.1s",
      }}>
        {label}
      </span>
      {badge && (
        <span style={{
          fontSize: 10, letterSpacing: "0.03em", color: "var(--text-3)",
          fontWeight: 500, flexShrink: 0, padding: "2px 6px",
          borderRadius: 4, border: "1px solid var(--border-dim)",
          background: "var(--surface-2)",
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}

function SetupStep({ done, label, pending }: {
  done: boolean;
  label: React.ReactNode;
  pending?: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "8px 0",
      borderBottom: "1px solid var(--border-dim)",
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: "50%", flexShrink: 0, marginTop: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: done ? "rgba(34,197,94,0.1)" : pending ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${done ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
        fontSize: 9,
        color: done ? "var(--green)" : "var(--text-4)",
      }}>
        {done ? "✓" : "·"}
      </span>
      <span style={{ fontSize: 12, color: done ? "var(--text-3)" : "var(--text-2)", lineHeight: 1.6, flex: 1 }}>
        {label}
      </span>
    </div>
  );
}
