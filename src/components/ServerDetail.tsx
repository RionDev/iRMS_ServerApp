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
  getServerHardware,
  getServerMetrics,
} from "../services/serverService";
import type { MetricPoint, Server, ServerCredential, ServerEvent, ServerHardware, ServerHistory } from "../types/server";
import { driftLabel, formatDateTime, hoursLabel, sizeLabel, stateReasons, timeAgo, uptimeLabel, serverTitle } from "../utils/format";
import { InstallGuide } from "./InstallGuide";
import { displayPort, parsePorts } from "../utils/ports";
import { parseIpList } from "../utils/iplist";
import { Meter } from "./Meter";
import { Sparkline } from "./Sparkline";
import { StateBadge, stateColor } from "./StateBadge";
import { StorageTable } from "./StorageTable";

interface ServerDetailProps {
  server: Server;
  onClose: () => void;
  onEdit: (s: Server) => void;
  onAfterDelete: () => void;
  /** 접속 정보 모달이 열려 있는 동안 true — 목록 자동 새로고침을 멈추기 위해 */
  onModalChange?: (open: boolean) => void;
}

/**
 * 목업 drawer: 헤더(배지+호스트명+액션) → dl(IP·그룹·OS·사양·가동 시간·에이전트·마지막 수신)
 *   → 현재 자원 미터 → CPU 최근 30분 → 감시 서비스 → 디스크 S.M.A.R.T / RAID → 최근 이벤트(에이전트) → 장비 이력(사람이 적는 기록)
 */
export function ServerDetail({ server: s, onClose, onEdit, onAfterDelete, onModalChange }: ServerDetailProps) {
  const { theme } = useThemeStore();
  const { can } = useFeatures(SERVER_APP);
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [hw, setHw] = useState<ServerHardware | null>(null);
  const [events, setEvents] = useState<ServerEvent[]>([]);
  const [history, setHistory] = useState<ServerHistory[]>([]);
  const [credOpen, setCredOpen] = useState(false);
  useEffect(() => { onModalChange?.(credOpen); return () => onModalChange?.(false); }, [credOpen, onModalChange]);
  const [myPw, setMyPw] = useState("");
  const [cred, setCred] = useState<ServerCredential[] | null>(null);
  const [credBusy, setCredBusy] = useState(false);
  const [credError, setCredError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setMetrics([]); setHw(null); setEvents([]); setCred(null); setHistory([]);
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
  const ipTable = (raw: string) => (
    <table style={{ borderCollapse: "collapse", fontSize: theme.fontSize.sm }}><tbody>
      {parseIpList(raw).map((e, i) => (
        <tr key={i}><td style={{ padding: "1px 10px 1px 0", ...mono }}>{e.ip}</td><td style={{ padding: "1px 0", color: theme.colors.textMuted }}>{e.note}</td></tr>
      ))}
    </tbody></table>
  );
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

  const handleCred = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredBusy(true);
    setCredError(null);
    try { setCred(await getServerCredentials(s.idx, myPw)); setMyPw(""); }
    catch (e) {
      // 403 = 본인 비밀번호 틀림 (BE 가 401 대신 403 을 준다 — 401 은 공용 클라이언트가 토큰 만료로 처리)
      const detail = (e as { response?: { status?: number; data?: { detail?: string } } }).response;
      setCredError(detail?.status === 403 ? (detail.data?.detail ?? "비밀번호가 올바르지 않습니다.") : "조회에 실패했습니다. 잠시 뒤 다시 시도하세요.");
    } finally { setCredBusy(false); }
  };

  const spec = [s.cpu, s.memory].filter(Boolean).join(" · ") || null;
  const driftWarn = s.time_drift_sec != null && Math.abs(s.time_drift_sec) > 60;

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
        <div>
          <StateBadge server={s} />
          <h2 style={{ margin: "8px 0 0", fontSize: theme.fontSize.xxl, color: theme.colors.text }}>{serverTitle(s)}{s.name && s.hostname && s.hostname !== s.name ? <span style={{ fontSize: theme.fontSize.base, fontWeight: 400, color: theme.colors.textMuted, marginLeft: "10px" }}>{s.hostname}</span> : null}</h2>
          {(s.state === "warning" || s.state === "danger") && (
            <ul style={{ margin: "6px 0 0", paddingLeft: "18px", fontSize: theme.fontSize.sm, color: stateColor(theme, s.state) }}>
              {stateReasons(s).map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
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
        ["디스크", s.disk_total ? `${sizeLabel(s.disk_total)} 중 ${sizeLabel(s.disks)} 남음${s.disk_used_pct != null ? ` (${s.disk_used_pct}% 사용)` : ""}` : null],
        ["가동 시간", uptimeLabel(s.uptime_sec)],
        ["서버 시계", <span style={{ color: driftWarn ? theme.colors.warning : undefined }}>{driftLabel(s.time_drift_sec)}</span>],
        ["에이전트", s.agent_version ?? (s.first_seen_at ? "구버전" : "미설치")],
        ["장비 식별자", s.hw_generation > 1
          ? <span>{s.machine_id ?? "-"} <span style={{ color: theme.colors.warning }}>· {s.hw_generation}번째 장비 (교체 {formatDateTime(s.hw_changed_at)})</span></span>
          : (s.machine_id ? <span style={mono} title="에이전트가 읽은 하드웨어 시리얼. 같은 IP 에 다른 시리얼이 오면 장비 교체로 본다">{s.machine_id}</span> : null)],
        ["마지막 수신", s.first_seen_at ? `${timeAgo(s.updated_at)} (${formatDateTime(s.updated_at)})` : "-"],
        ["접속", s.account_count > 0 ? (
          <span style={{ display: "inline-flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
            {s.access_methods.map((m) => <span key={m} style={{ padding: "1px 8px", borderRadius: "999px", border: `1px solid ${theme.colors.border}`, fontSize: theme.fontSize.sm }}>{m}</span>)}
            <span style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.sm }}>· 계정 {s.account_count}개{s.can_view_credentials ? " — [접속 정보] 에서" : ""}</span>
          </span>
        ) : null],
        ["설치 위치", s.location],
        ["사용 포트", s.ports ? (
          <table style={{ borderCollapse: "collapse", fontSize: theme.fontSize.sm }}><tbody>
            {parsePorts(s.ports).map((p, i) => (
              <tr key={i}>
                <td style={{ padding: "1px 10px 1px 0", color: theme.colors.textMuted }}>{p.purpose || "-"}</td>
                <td style={{ padding: "1px 0", ...mono }}>{displayPort(p.port)}</td>
              </tr>
            ))}
          </tbody></table>
        ) : null],
        ["접근 허용 IP", s.allowed_ips ? ipTable(s.allowed_ips) : null],
        ["허용된 외부 IP", s.outbound_ips ? ipTable(s.outbound_ips) : null],
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
          <span><span style={mono}>{v.name}</span>{v.desc ? <span style={{ color: theme.colors.textMuted, marginLeft: "8px" }}>— {v.desc}</span> : null}</span>
          <StateBadge state={s.online ? (v.state === "running" ? "ok" : v.state === "off" ? "offline" : "danger") : "unreported"} label={!s.online ? "알 수 없음" : v.state === "running" ? "실행 중" : v.state === "off" ? "꺼짐" : "중지"} />
        </div>
      ))}

      {secTitle("저장소", hw ? <span style={{ fontWeight: 400 }}>한 줄 = 디스크 한 개 · 로컬 {hw.disks.length || hw.mounts.filter((m) => m.device).length} · 원격 {hw.mounts.filter((m) => !m.device).length}{hw.mounts[0] ? ` · ${timeAgo(hw.mounts[0].updated_at)}` : ""}</span> : undefined)}
      <StorageTable hw={hw} reported={!!s.first_seen_at} />

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

      {secTitle("장비 이력", <span style={{ fontWeight: 400 }}>IP 변경 · 부품 교체 같은 기록{can(ServerFeature.MANAGE) ? " — 추가·삭제는 [정보 수정]" : ""}</span>)}
      {history.length === 0 ? (
        <p style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.sm, margin: 0 }}>기록 없음</p>
      ) : history.map((h) => (
        <div key={h.idx} style={rowLine}>
          <span style={{ minWidth: 0 }}>
            <span style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginRight: "8px", whiteSpace: "nowrap" }}>{h.happened_at}</span>
            <span>{h.content}</span>
          </span>
          <span style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.sm, whiteSpace: "nowrap" }}>{h.author}</span>
        </div>
      ))}

      <Modal isOpen={credOpen} onClose={() => { setCredOpen(false); setCred(null); setMyPw(""); setCredError(null); }} title="접속 정보">
        {cred ? (
          cred.length === 0 ? <p style={{ margin: 0, color: theme.colors.textMuted, fontSize: theme.fontSize.sm }}>등록된 계정이 없습니다. "정보 수정"에서 접속 계정을 추가하세요.</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: theme.fontSize.base }}>
              <thead><tr>{["방법", "포트", "계정", "비밀번호"].map((h) => <th key={h} style={{ textAlign: "left", padding: "4px 8px", fontSize: theme.fontSize.sm, color: theme.colors.textMuted, borderBottom: `1px solid ${theme.colors.border}` }}>{h}</th>)}</tr></thead>
              <tbody>{cred.map((c, i) => (
                <tr key={i}>
                  <td style={{ padding: "6px 8px" }}>{c.access}</td>
                  <td style={{ padding: "6px 8px", ...mono }}>{c.port ?? "-"}</td>
                  <td style={{ padding: "6px 8px", ...mono }}>{c.account ?? "-"}</td>
                  <td style={{ padding: "6px 8px", ...mono }}>{c.password ?? "-"}{c.password && <button type="button" title="복사" onClick={() => { navigator.clipboard.writeText(c.password ?? "").catch(() => {}); }} style={{ marginLeft: "6px", border: "none", background: "none", color: theme.colors.textMuted, cursor: "pointer" }}>⧉</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          )
        ) : (
          <form onSubmit={handleCred}>
            <p style={{ margin: "0 0 12px", fontSize: theme.fontSize.sm, color: theme.colors.textMuted }}>본인 비밀번호로 다시 인증합니다. 조회는 감사 로그에 남습니다.</p>
            <Input label="내 비밀번호" type="password" value={myPw} onChange={(e) => { setMyPw(e.target.value); setCredError(null); }} autoComplete="current-password" autoFocus error={credError ?? undefined} />
            <div style={{ display: "flex", justifyContent: "flex-end" }}><Button type="submit" disabled={credBusy || !myPw}>확인</Button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}
