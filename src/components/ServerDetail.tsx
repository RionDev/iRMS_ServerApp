import { Button } from "@common/components/Button";
import { Modal } from "@common/components/Modal";
import { Input } from "@common/components/Input";
import { useFeatures } from "@common/hooks/useFeatures";
import { useThemeStore } from "@common/stores/themeStore";
import { useEffect, useState, type ReactNode } from "react";
import { SERVER_APP, ServerFeature } from "../features";
import {
  deleteServer,
  getServerCredentials,
  getServerEvents,
  getServerHistory,
  addServerHistory,
  deleteServerHistory,
  getServerHardware,
  getServerMetrics,
} from "../services/serverService";
import type { MetricPoint, Server, ServerEvent, ServerHardware, ServerHistory } from "../types/server";
import { driftLabel, formatDateTime, hoursLabel, timeAgo, uptimeLabel } from "../utils/format";
import { InstallGuide } from "./InstallGuide";
import { parsePorts } from "../utils/ports";
import { Meter } from "./Meter";
import { Sparkline } from "./Sparkline";
import { StateBadge, stateColor } from "./StateBadge";

interface ServerDetailProps {
  server: Server;
  onClose: () => void;
  onEdit: (s: Server) => void;
  onAfterDelete: () => void;
}

/**
 * 목업 drawer: 헤더(배지+호스트명+액션) → dl(IP·그룹·OS·사양·가동 시간·에이전트·마지막 수신)
 *   → 현재 자원 미터 → CPU 최근 30분 → 감시 서비스 → 디스크 S.M.A.R.T / RAID → 최근 이벤트(에이전트) → 장비 이력(사람이 적는 기록)
 */
export function ServerDetail({ server: s, onClose, onEdit, onAfterDelete }: ServerDetailProps) {
  const { theme } = useThemeStore();
  const { can } = useFeatures(SERVER_APP);
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [hw, setHw] = useState<ServerHardware | null>(null);
  const [events, setEvents] = useState<ServerEvent[]>([]);
  const [history, setHistory] = useState<ServerHistory[]>([]);
  const [histDate, setHistDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [histText, setHistText] = useState("");
  const [histBusy, setHistBusy] = useState(false);
  const loadHistory = () => getServerHistory(s.idx, 20).then((p) => setHistory(p.items)).catch(() => setHistory([]));
  const [credOpen, setCredOpen] = useState(false);
  const [myPw, setMyPw] = useState("");
  const [cred, setCred] = useState<{ account: string | null; password: string | null } | null>(null);
  const [credBusy, setCredBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    setMetrics([]); setHw(null); setEvents([]); setCred(null); setHistory([]); setHistText("");
    getServerHistory(s.idx, 20).then((p) => mounted && setHistory(p.items)).catch(() => {});
    getServerMetrics(s.idx, 30).then((p) => mounted && setMetrics(p)).catch(() => {});
    getServerHardware(s.idx).then((h) => mounted && setHw(h)).catch(() => {});
    getServerEvents(s.idx, 5).then((p) => mounted && setEvents(p.items)).catch(() => {});
    return () => { mounted = false; };
  }, [s.idx, s.updated_at]);

  const secTitle = (t: string, extra?: ReactNode) => (
    <p style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "18px 0 8px", fontSize: theme.fontSize.sm, fontWeight: 700, color: theme.colors.textMuted, letterSpacing: ".02em" }}>
      <span>{t}</span>{extra}
    </p>
  );
  const dl = (rows: [string, ReactNode][]) => (
    <dl style={{ display: "grid", gridTemplateColumns: "96px 1fr", rowGap: "8px", columnGap: "12px", margin: 0, fontSize: theme.fontSize.base }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <dt style={{ color: theme.colors.textMuted }}>{k}</dt>
          <dd style={{ margin: 0, color: theme.colors.text, overflowWrap: "anywhere" }}>{v ?? "-"}</dd>
        </div>
      ))}
    </dl>
  );
  const mono: React.CSSProperties = { fontFamily: "ui-monospace, Menlo, Consolas, monospace" };
  const rowLine: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${theme.colors.surfaceMuted}`, fontSize: theme.fontSize.base, gap: "8px" };
  const healthColor = (h: string | null) => {
    const v = (h ?? "").toLowerCase();
    if (v === "passed" || v === "ok") return theme.colors.success;
    if (v === "failed" || v === "degraded") return theme.colors.danger;
    if (v === "rebuilding" || v === "warn") return theme.colors.warning;
    return theme.colors.textMuted;
  };

  const handleDelete = async () => {
    if (!confirm(`${s.ip} 서버를 삭제할까요? 이력·디스크·이벤트가 함께 지워집니다.`)) return;
    try { await deleteServer(s.idx); onAfterDelete(); onClose(); } catch { /* interceptor alert */ }
  };

  const handleHistAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!histText.trim()) return;
    setHistBusy(true);
    try { await addServerHistory(s.idx, histDate, histText.trim()); setHistText(""); await loadHistory(); }
    catch { alert("이력 추가에 실패했습니다."); }
    finally { setHistBusy(false); }
  };
  const handleHistDelete = async (h: ServerHistory) => {
    if (!confirm(`이 기록을 삭제할까요?\n${h.happened_at} ${h.content}`)) return;
    try { await deleteServerHistory(s.idx, h.idx); await loadHistory(); } catch { alert("삭제에 실패했습니다."); }
  };
  const handleCred = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredBusy(true);
    try { setCred(await getServerCredentials(s.idx, myPw)); setMyPw(""); } catch { /* interceptor alert */ } finally { setCredBusy(false); }
  };

  const spec = [s.cpu, s.memory].filter(Boolean).join(" · ") || null;
  const driftWarn = s.time_drift_sec != null && Math.abs(s.time_drift_sec) > 60;

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
        <div>
          <StateBadge server={s} />
          <h2 style={{ margin: "8px 0 0", fontSize: theme.fontSize.xxl, color: theme.colors.text }}>{s.hostname ?? s.purpose ?? s.ip}</h2>
        </div>
        <Button variant="secondary" onClick={onClose}>닫기</Button>
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        {can(ServerFeature.CREDENTIALS) && s.can_view_credentials && <Button variant="secondary" onClick={() => setCredOpen(true)}>접속 정보</Button>}
        {can(ServerFeature.MANAGE) && <Button variant="secondary" onClick={() => onEdit(s)}>정보 수정</Button>}
        {can(ServerFeature.MANAGE) && <Button variant="secondary" onClick={handleDelete} style={{ color: theme.colors.danger }}>삭제</Button>}
      </div>

      {s.state === "unreported" && (
        <div style={{ margin: "0 0 12px", padding: "10px 12px", borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceMuted, fontSize: theme.fontSize.sm, color: theme.colors.text }}>
          <InstallGuide intro="에이전트(argus) 보고가 아직 없습니다. 서버가 꺼져 있거나 에이전트가 설치되지 않은 상태입니다. 켜져 있다면 아래 순서로 설치하세요." />
        </div>
      )}
      {!s.purpose && !s.manager && (
        <p style={{ margin: "0 0 12px", fontSize: theme.fontSize.sm, color: theme.colors.warning }}>
          용도·담당자가 비어 있습니다. "정보 수정"에서 채우세요.
        </p>
      )}

      {dl([
        ["IP", <span style={mono}>{s.ip}</span>],
        ["용도", s.purpose],
        ["담당자", s.manager],
        ["메모", s.description ? <span style={{ whiteSpace: "pre-wrap" }}>{s.description}</span> : null],
        ["OS", s.os ? `${s.os}${s.arch ? ` (${s.arch})` : ""}` : null],
        ["사양", spec],
        ["디스크", s.disk_total ? `${s.disk_total} 중 ${s.disks ?? "-"} 남음` : null],
        ["가동 시간", uptimeLabel(s.uptime_sec)],
        ["서버 시계", <span style={{ color: driftWarn ? theme.colors.warning : undefined }}>{driftLabel(s.time_drift_sec)}</span>],
        ["에이전트", s.agent_version ?? (s.first_seen_at ? "구버전" : "미설치")],
        ["장비 식별자", s.hw_generation > 1
          ? <span>{s.machine_id ?? "-"} <span style={{ color: theme.colors.warning }}>· {s.hw_generation}번째 장비 (교체 {formatDateTime(s.hw_changed_at)})</span></span>
          : (s.machine_id ? <span style={mono} title="에이전트가 읽은 하드웨어 시리얼. 같은 IP 에 다른 시리얼이 오면 장비 교체로 본다">{s.machine_id}</span> : null)],
        ["마지막 수신", s.first_seen_at ? `${timeAgo(s.updated_at)} (${formatDateTime(s.updated_at)})` : "-"],
        ["접속", [s.access, s.location].filter(Boolean).join(" · ") || null],
        ["사용 포트", s.ports ? (
          <table style={{ borderCollapse: "collapse", fontSize: theme.fontSize.sm }}><tbody>
            {parsePorts(s.ports).map((p, i) => (
              <tr key={i}>
                <td style={{ padding: "1px 10px 1px 0", color: theme.colors.textMuted }}>{p.purpose || "-"}</td>
                <td style={{ padding: "1px 0", ...mono }}>{p.port}</td>
              </tr>
            ))}
          </tbody></table>
        ) : null],
        ["접근 허용 IP", s.allowed_ips ? <span style={{ ...mono, whiteSpace: "pre-wrap" }}>{s.allowed_ips.split(/,\s*/).join("\n")}</span> : null],
        ["허용된 외부 IP", s.outbound_ips ? <span style={{ ...mono, whiteSpace: "pre-wrap" }}>{s.outbound_ips.split(/,\s*/).join("\n")}</span> : null],
      ])}

      {secTitle("현재 자원")}
      {[["CPU", s.cpu_pct, 75, 90], ["메모리", s.mem_pct, 75, 90], ["디스크", s.disk_used_pct, 80, 90]].map(([k, v, w, d]) => (
        <div key={k as string} style={{ display: "grid", gridTemplateColumns: "60px 1fr", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.base }}>{k as string}</span>
          <Meter value={s.online || k === "디스크" ? (v as number | null) : null} warn={w as number} danger={d as number} width="100%" />
        </div>
      ))}

      {secTitle("CPU 최근 30분", s.hw_generation > 1 ? <span style={{ fontWeight: 400 }}>현재 장비만 · 교체 전 이력은 DB 보관</span> : undefined)}
      <Sparkline values={metrics.map((p) => p.cpu_pct)} />

      {secTitle(s.os?.startsWith("VMware") ? "VM" : "감시 서비스", s.service_list.length > 0 ? <span style={{ fontWeight: 400 }}>{s.service_list.length}개{s.services_stopped > 0 ? ` · 중지 ${s.services_stopped}` : ""}</span> : undefined)}
      {s.service_list.length === 0 ? (
        <p style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.sm, margin: 0 }}>{s.first_seen_at ? "지정된 감시 서비스 없음 — 서버 config.env 의 SERVICES 에 이름[:포트] 를 적으면 여기 표시된다" : "-"}</p>
      ) : s.service_list.map((v) => (
        <div key={v.name} style={rowLine}>
          <span style={mono}>{v.name}</span>
          <StateBadge state={s.online ? (v.state === "running" ? "ok" : "danger") : "unreported"} label={!s.online ? "알 수 없음" : v.state === "running" ? "실행 중" : "중지"} />
        </div>
      ))}

      {secTitle("디스크 S.M.A.R.T", hw && hw.disks.length > 0 ? <span style={{ fontWeight: 400 }}>{timeAgo(hw.disks[0].updated_at)}</span> : undefined)}
      {!hw || hw.disks.length === 0 ? (
        <p style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.sm, margin: 0 }}>
          {s.smart_health === "none" || !s.first_seen_at ? "수집 대상 아님 (VM·RAID 뒤 디스크·Unix)" : "아직 수집 전"}
        </p>
      ) : hw.disks.map((d) => (
        <div key={d.device} style={rowLine}>
          <span style={{ minWidth: 0 }}>
            <span style={mono}>{d.device}</span>
            {d.model && <span style={{ color: theme.colors.textMuted }}> · {d.model}</span>}
            <div style={{ fontSize: theme.fontSize.sm, color: theme.colors.textMuted }}>
              {[
                d.power_on_hours != null && `가동 ${hoursLabel(d.power_on_hours)}`,
                d.reallocated_sectors != null && `재할당 ${d.reallocated_sectors}`,
                d.pending_sectors != null && `대기 ${d.pending_sectors}`,
                d.temperature_c != null && `${d.temperature_c}°C`,
                d.wearout_pct != null && `마모 ${d.wearout_pct}%`,
              ].filter(Boolean).join(" · ")}
            </div>
          </span>
          <span style={{ color: healthColor(d.health), fontWeight: 600, fontSize: theme.fontSize.sm, whiteSpace: "nowrap" }}>{d.health ?? "-"}</span>
        </div>
      ))}

      {secTitle("RAID")}
      {!hw || hw.raid.length === 0 ? (
        <p style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.sm, margin: 0 }}>{s.raid && s.raid !== "N/A" ? `레벨 ${s.raid} · 상태 수집 전` : "RAID 없음"}</p>
      ) : hw.raid.map((r) => (
        <div key={r.controller} style={rowLine}>
          <span>
            <span style={mono}>{r.controller}</span>
            {r.model && <span style={{ color: theme.colors.textMuted }}> · {r.model}</span>}
            {s.raid && s.raid !== "N/A" && <span style={{ color: theme.colors.textMuted }}> · {s.raid}</span>}
          </span>
          <span style={{ color: healthColor(r.health), fontWeight: 600, fontSize: theme.fontSize.sm, whiteSpace: "nowrap" }}>
            {r.health}{r.rebuild_pct != null ? ` ${r.rebuild_pct}%` : ""}
          </span>
        </div>
      ))}

      {secTitle("최근 이벤트")}
      {events.length === 0 ? (
        <p style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.sm, margin: 0 }}>비정상 종료 이벤트 없음</p>
      ) : events.map((e) => (
        <div key={e.idx} style={rowLine}>
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ color: e.event_type === "hardware_replaced" ? theme.colors.warning : stateColor(theme, "danger"), fontWeight: 600 }}>{e.event_type === "hardware_replaced" ? "장비 교체" : e.event_type}</span>
            <span style={{ color: theme.colors.textMuted }}> {e.detail}</span>
          </span>
          <span style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.sm, whiteSpace: "nowrap" }}>{formatDateTime(e.event_at)}</span>
        </div>
      ))}

      {secTitle("장비 이력", <span style={{ fontWeight: 400 }}>IP 변경 · 부품 교체 · 설정 변경 같은 기록</span>)}
      {can(ServerFeature.MANAGE) && (
        <form onSubmit={handleHistAdd} style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "8px" }}>
          <input type="date" value={histDate} onChange={(e) => setHistDate(e.target.value)} required style={{ padding: "6px 8px", borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.border}`, fontFamily: theme.fontFamily, fontSize: theme.fontSize.sm, color: theme.colors.text, backgroundColor: theme.colors.surface }} />
          <input value={histText} onChange={(e) => setHistText(e.target.value)} placeholder="예: HDD 2번 교체 (WD 4TB)" maxLength={2000} style={{ flex: 1, padding: "6px 8px", borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.border}`, fontFamily: theme.fontFamily, fontSize: theme.fontSize.sm, color: theme.colors.text, backgroundColor: theme.colors.surface }} />
          <Button type="submit" variant="secondary" disabled={histBusy || !histText.trim()} style={{ padding: "6px 12px", fontSize: theme.fontSize.sm }}>추가</Button>
        </form>
      )}
      {history.length === 0 ? (
        <p style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.sm, margin: 0 }}>기록 없음</p>
      ) : history.map((h) => (
        <div key={h.idx} style={rowLine}>
          <span style={{ minWidth: 0 }}>
            <span style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginRight: "8px", whiteSpace: "nowrap" }}>{h.happened_at}</span>
            <span>{h.content}</span>
            <span style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.sm }}> — {h.author}</span>
          </span>
          {can(ServerFeature.MANAGE) && <button type="button" onClick={() => handleHistDelete(h)} title="삭제" style={{ border: "none", background: "none", color: theme.colors.textMuted, cursor: "pointer", fontSize: theme.fontSize.sm, whiteSpace: "nowrap" }}>삭제</button>}
        </div>
      ))}

      <Modal isOpen={credOpen} onClose={() => { setCredOpen(false); setCred(null); setMyPw(""); }} title="접속 정보">
        {cred ? (
          dl([["계정", <span style={mono}>{cred.account ?? "-"}</span>], ["비밀번호", <span style={mono}>{cred.password ?? "-"}</span>], ["접속", s.access]])
        ) : (
          <form onSubmit={handleCred}>
            <p style={{ margin: "0 0 12px", fontSize: theme.fontSize.sm, color: theme.colors.textMuted }}>본인 비밀번호로 다시 인증합니다. 조회는 감사 로그에 남습니다.</p>
            <Input label="내 비밀번호" type="password" value={myPw} onChange={(e) => setMyPw(e.target.value)} autoComplete="current-password" autoFocus />
            <div style={{ display: "flex", justifyContent: "flex-end" }}><Button type="submit" disabled={credBusy || !myPw}>확인</Button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}
