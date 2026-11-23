import type { Server, ServerState } from "../types/server";

/** 상태 → 표시 문구 (목업: 정상 / 경고 / 위험 / 오프라인 + 미수신) */
export const STATE_LABEL: Record<ServerState, string> = {
  ok: "정상",
  warning: "경고",
  danger: "위험",
  offline: "오프라인",
  unreported: "미수신",
};

/** 미수신 사유 — IP 는 등록됐지만 에이전트 보고가 없는 서버를 ping 결과로 나눈다 */
export function unreportedLabel(s: Server): string {
  if (s.state !== "unreported") return STATE_LABEL[s.state];
  if (s.unreported_reason === "no_agent") return "에이전트 없음";
  if (s.unreported_reason === "down") return "꺼짐";
  return "미수신";
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
