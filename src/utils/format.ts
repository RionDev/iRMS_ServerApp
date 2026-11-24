import type { Server, ServerState } from "../types/server";

/** 상태 → 표시 문구 (목업: 정상 / 경고 / 위험 / 오프라인 + 미수신) */
export const STATE_LABEL: Record<ServerState, string> = {
  ok: "정상",
  warning: "경고",
  danger: "위험",
  offline: "오프라인",
  unreported: "미수신",
};

/** 상태 라벨. 미수신 = IP 는 등록됐지만 에이전트 보고가 한 번도 없음 */
export function unreportedLabel(s: Server): string {
  return STATE_LABEL[s.state];
}

export const TEAM_NAME: Record<number, string> = { 1: "엔진", 2: "분석" };

export function teamLabel(teams: number | null): string {
  return teams == null ? "-" : (TEAM_NAME[teams] ?? String(teams));
}

/** "3초 전", "2시간 전" */
export function timeAgo(iso: string | null): string {
  if (!iso) return "-";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}초 전`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}시간 전`;
  return `${Math.round(hr / 24)}일 전`;
}

export function uptimeLabel(sec: number | null): string {
  if (sec == null) return "-";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  if (d > 0) return `${d}일 ${h}시간`;
  const m = Math.floor((sec % 3600) / 60);
  return `${h}시간 ${m}분`;
}

export function driftLabel(sec: number | null): string {
  if (sec == null) return "-";
  if (Math.abs(sec) < 2) return "일치";
  const a = Math.abs(sec);
  const txt = a >= 60 ? `${Math.round(a / 60)}분 ${a % 60}초` : `${a}초`;
  return sec > 0 ? `${txt} 빠름` : `${txt} 느림`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function hoursLabel(h: number | null): string {
  if (h == null) return "-";
  if (h >= 24 * 365) return `${(h / 8760).toFixed(1)}년`;
  if (h >= 24) return `${Math.round(h / 24)}일`;
  return `${h}시간`;
}

/** 열람 기록 행위 라벨 */
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  credentials_view: "접속 정보 열람",
  server_create: "서버 등록",
  server_update: "서버 수정",
  accounts_change: "접속 계정 변경",
  history_change: "장비 이력 변경",
  server_delete: "서버 삭제",
  auto_register: "자동 등록",
  other: "기타",
};

/** "185521.0GB" 같은 에이전트 문자열을 1TB 넘으면 TB 로 (181.2TB). 그 외는 그대로 */
export function sizeLabel(raw: string | null | undefined): string {
  if (!raw) return "-";
  const m = raw.match(/^([0-9.]+)\s*GB$/i);
  if (!m) return raw;
  const gb = Number(m[1]);
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)}TB`;
  return `${gb.toFixed(gb >= 100 ? 0 : 1)}GB`;
}

/** 상태가 경고·위험인 이유 — BE _state_expr 와 같은 규칙 (CPU·메모리 75/90, 디스크 80/90, S.M.A.R.T, RAID, 시계 60초, 감시 서비스) */
export function stateReasons(s: Server): string[] {
  const r: string[] = [];
  if (s.cpu_pct != null && s.cpu_pct >= 90) r.push(`CPU ${s.cpu_pct}% (위험 90 이상)`);
  else if (s.cpu_pct != null && s.cpu_pct >= 75) r.push(`CPU ${s.cpu_pct}% (경고 75 이상)`);
  if (s.mem_pct != null && s.mem_pct >= 90) r.push(`메모리 ${s.mem_pct}% (위험 90 이상)`);
  else if (s.mem_pct != null && s.mem_pct >= 75) r.push(`메모리 ${s.mem_pct}% (경고 75 이상)`);
  if (s.disk_used_pct != null && s.disk_used_pct >= 90) r.push(`디스크 ${s.disk_used_pct}% (위험 90 이상)`);
  else if (s.disk_used_pct != null && s.disk_used_pct >= 80) r.push(`디스크 ${s.disk_used_pct}% (경고 80 이상)`);
  if (s.smart_health === "failed") r.push("디스크 S.M.A.R.T FAILED (위험)");
  else if (s.smart_health === "warn") r.push("디스크 S.M.A.R.T 경고 — 재할당·대기 섹터가 있거나 SSD 마모 80% 이상인 디스크가 있음 (아래 표에서 주황색 줄)");
  if (s.mount_health === "danger") r.push("저장소 사용률 90% 이상인 마운트가 있음 (위험 — 아래 저장소 표에서 빨간 사용률)");
  else if (s.mount_health === "warn") r.push("저장소 사용률 80% 이상인 마운트가 있음 (경고 — 아래 저장소 표에서 주황 사용률)");
  if (s.raid_health === "degraded" || s.raid_health === "failed") r.push(`RAID ${s.raid_health} (위험)`);
  else if (s.raid_health === "rebuilding") r.push("RAID 리빌드 중 (경고)");
  if (s.time_drift_sec != null && Math.abs(s.time_drift_sec) > 60) r.push(`서버 시계 ${driftLabel(s.time_drift_sec)} (경고, 60초 초과)`);
  if (s.services_stopped > 0) r.push(`감시 서비스 ${s.services_stopped}개 중지 (경고)`);
  return r;
}
