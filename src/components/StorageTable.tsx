import { useThemeStore } from "@common/stores/themeStore";
import type { ServerDisk, ServerHardware, ServerMount } from "../types/server";
import { hoursLabel, sizeLabel } from "../utils/format";

interface StorageTableProps {
  hw: ServerHardware | null;
  /** 보고가 한 번도 없는 서버면 안내만 */
  reported: boolean;
}

/** 한 줄 = 디스크 한 개. 로컬 디스크는 자기가 이루는 OS 장치의 마운트(df 줄)들을, 원격 마운트(NFS 등)는 볼륨 하나 = NAS 안 디스크 하나로 한 줄 */
export function StorageTable({ hw, reported }: StorageTableProps) {
  const { theme } = useThemeStore();
  const mono: React.CSSProperties = { fontFamily: "ui-monospace, Menlo, Consolas, monospace" };
  const muted: React.CSSProperties = { color: theme.colors.textMuted, fontSize: theme.fontSize.sm };
  if (!hw || (hw.mounts.length === 0 && hw.disks.length === 0)) {
    return <p style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.sm, margin: 0 }}>{reported ? "아직 수집 전 (설치 뒤 1~2분)" : "-"}</p>;
  }
  const localMounts = hw.mounts.filter((m) => m.device);
  const remoteMounts = hw.mounts.filter((m) => !m.device);
  // mounts.device 는 "sda" 또는 펌웨어 RAID·LVM 처럼 디스크 여러 개면 "sda+sdb"
  const onDev = (m: ServerMount, dev: string) => (m.device ?? "").split("+").includes(dev);
  // smartctl 이 속성 표를 못 받은 디스크(VM 가상 디스크, 컨트롤러 뒤) — health UNKNOWN 에 수명 값 전부 없음
  const noSmart = (d: ServerDisk) => (d.health == null || d.health.toUpperCase() === "UNKNOWN") && d.reallocated_sectors == null && d.pending_sectors == null && d.wearout_pct == null && d.power_on_hours == null;
  const mountsOf = (dev: string | null) => (dev ? localMounts.filter((m) => onDev(m, dev)) : []);
  // 디스크 행: hw.disks 전부. S.M.A.R.T 가 없는 로컬 장치(VM 등)는 마운트만으로 한 줄
  const disksByDev = new Map<string, ServerDisk[]>();
  for (const d of hw.disks) { const k = d.os_device ?? ""; disksByDev.set(k, [...(disksByDev.get(k) ?? []), d]); }
  const localDevsWithoutSmart = [...new Set(localMounts.flatMap((m) => (m.device ?? "").split("+")))].filter((dev) => dev && !disksByDev.has(dev));
  const raidOf = (d: ServerDisk) => { const r = hw.raid.find((x) => d.raid?.startsWith(x.controller)); return r; };
  const bad = (d: ServerDisk) => d.health === "FAILED" ? "danger" : ((d.reallocated_sectors ?? 0) > 0 || (d.pending_sectors ?? 0) > 0 || (d.wearout_pct ?? 0) >= 80) ? "warning" : null;
  const pctColor = (p: number | null) => p == null ? undefined : p >= 90 ? theme.colors.danger : p >= 80 ? theme.colors.warning : undefined;
  const bar = (p: number | null) => (
    <div style={{ height: "6px", width: "56px", marginLeft: "auto", marginTop: "3px", background: theme.colors.surfaceMuted, borderRadius: "3px", overflow: "hidden" }}>
      <i style={{ display: "block", height: "100%", width: `${Math.max(0, Math.min(100, p ?? 0))}%`, background: pctColor(p) ?? theme.colors.primary }} />
    </div>
  );
  const th: React.CSSProperties = { textAlign: "left", padding: "4px 8px", fontSize: theme.fontSize.sm, color: theme.colors.textMuted, fontWeight: 600, borderBottom: `1px solid ${theme.colors.border}`, whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "6px 8px", borderBottom: `1px solid ${theme.colors.surfaceMuted}`, verticalAlign: "top", fontSize: theme.fontSize.base, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  const r: React.CSSProperties = { textAlign: "right" };
  const mountCell = (ms: ServerMount[]) => ms.length === 0 ? <span style={muted}>-</span> : (
    <span>
      <span style={mono}>{ms.map((m) => m.path).join(" · ")}</span>
      <div style={{ ...muted, ...mono }}>{ms.map((m) => m.fs ?? "").join(" · ")}</div>
    </span>
  );
  const usageCell = (ms: ServerMount[]) => {
    const p = ms.length ? Math.max(...ms.map((m) => m.used_pct ?? 0)) : null;
    return <span><span style={{ color: pctColor(p) }}>{p == null ? "-" : `${p}%`}</span>{p != null && bar(p)}</span>;
  };
  const totalCell = (ms: ServerMount[], disk?: ServerDisk) => {
    if (disk?.raid) return <span style={mono}>{ms.length ? sizeLabel(`${ms.reduce((a, m) => a + (m.total_gb ?? 0), 0)}GB`) : "-"}</span>;
    const t = ms.reduce((a, m) => a + (m.total_gb ?? 0), 0);
    return <span style={mono}>{t ? sizeLabel(`${t}GB`) : "-"}</span>;
  };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <colgroup><col style={{ width: "18%" }} /><col style={{ width: "24%" }} /><col style={{ width: "11%" }} /><col style={{ width: "8%" }} /><col style={{ width: "10%" }} /><col style={{ width: "19%" }} /><col style={{ width: "10%" }} /></colgroup>
      <thead><tr><th style={th}>디스크</th><th style={th}>마운트 ← 파일시스템</th><th style={th}>RAID</th><th style={{ ...th, ...r }}>전체</th><th style={{ ...th, ...r }}>사용률</th><th style={{ ...th, ...r }}>수명 (S.M.A.R.T)</th><th style={th}>상태</th></tr></thead>
      <tbody>
        {hw.disks.map((d) => {
          const ms = mountsOf(d.os_device ?? null); const b = bad(d); const raid = raidOf(d);
          const rowBg = b === "danger" ? "rgba(185,28,28,.10)" : b === "warning" ? "rgba(180,83,9,.12)" : undefined;
          return (
            <tr key={d.device} style={{ backgroundColor: rowBg }} title={d.device}>
              <td style={td}><span style={mono}>{d.slot ?? d.device}</span> <span style={muted}>{d.model ?? ""}</span><div style={{ ...muted, ...mono }}>{d.serial ?? ""}</div></td>
              <td style={td}>{mountCell(ms)}</td>
              <td style={td}>{d.raid ? <span><span style={mono}>{d.raid.split(" ").slice(0, 2).join(" ")}</span><div style={muted}>{d.raid.split(" ")[2] ?? ""}{raid ? <> · <span style={{ color: raid.health === "ok" ? theme.colors.success : theme.colors.danger, fontWeight: 600 }}>{raid.health === "ok" ? "Optimal" : raid.health}{raid.rebuild_pct != null ? ` ${raid.rebuild_pct}%` : ""}</span></> : null}</div></span> : <span style={muted}>-</span>}</td>
              <td style={{ ...td, ...r }}>{totalCell(ms, d)}</td>
              <td style={{ ...td, ...r }}>{usageCell(ms)}</td>
              <td style={{ ...td, ...r }}>
                {noSmart(d) ? <span style={muted}>S.M.A.R.T 없음</span> : <>
                <span style={muted}>{d.power_on_hours != null ? `${hoursLabel(d.power_on_hours)} · ` : ""}</span>
                <span style={{ color: (d.reallocated_sectors ?? 0) > 0 ? theme.colors.warning : undefined, fontWeight: (d.reallocated_sectors ?? 0) > 0 ? 600 : undefined }}>재할당 {d.reallocated_sectors ?? "-"}</span>
                <span style={muted}> · 대기 {d.pending_sectors ?? "-"}{d.wearout_pct != null ? ` · 마모 ${d.wearout_pct}%` : ""}</span></>}
              </td>
              <td style={{ ...td, color: b === "danger" ? theme.colors.danger : b === "warning" ? theme.colors.warning : theme.colors.success, fontWeight: 600 }}>{b === "danger" ? "위험" : b === "warning" ? "경고" : noSmart(d) ? <span style={muted}>읽기 불가</span> : d.health ?? "-"}</td>
            </tr>
          );
        })}
        {localDevsWithoutSmart.map((dev) => {
          const ms = mountsOf(dev);
          return (
            <tr key={`dev-${dev}`}>
              <td style={td}><span style={mono}>{dev}</span><div style={muted}>S.M.A.R.T 없음 (VM·RAID 뒤·Unix)</div></td>
              <td style={td}>{mountCell(ms)}</td>
              <td style={td}><span style={muted}>-</span></td>
              <td style={{ ...td, ...r }}>{totalCell(ms)}</td>
              <td style={{ ...td, ...r }}>{usageCell(ms)}</td>
              <td style={{ ...td, ...r }}><span style={muted}>-</span></td>
              <td style={{ ...td, ...muted }}>로컬</td>
            </tr>
          );
        })}
        {remoteMounts.map((m) => {
          const host = (m.fs ?? "").split(":")[0];
          const vol = (m.fs ?? "").includes(":") ? (m.fs ?? "").split(":").slice(1).join(":").split("/").filter(Boolean).pop() : m.fs;
          return (
            <tr key={`rm-${m.path}`}>
              <td style={td}><span style={mono}>{host ? `NAS .${host.split(".").pop()}` : (m.fstype ?? "원격")}</span> <span style={muted}>{vol ?? ""}</span><div style={muted}>NAS 안 디스크</div></td>
              <td style={td}><span style={mono}>{m.path}</span><div style={{ ...muted, ...mono }}>{m.fs ?? ""}</div></td>
              <td style={td}><span style={muted}>-</span></td>
              <td style={{ ...td, ...r }}><span style={mono}>{sizeLabel(`${m.total_gb ?? 0}GB`)}</span></td>
              <td style={{ ...td, ...r }}>{usageCell([m])}</td>
              <td style={{ ...td, ...r }}><span style={muted}>-</span></td>
              <td style={{ ...td, ...muted }}>원격</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
