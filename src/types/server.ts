/** BE resource-service 응답 타입 (src/schemas.py 와 1:1) */

export type ServerState = "ok" | "warning" | "danger" | "offline" | "unreported";
export type UnreportedReason = "no_agent" | "down" | "unknown";

export interface Server {
  idx: number;
  ip: string;
  location: string | null;
  ports: string | null;
  allowed_ips: string | null;
  outbound_ips: string | null;
  /** teams.idx (1=ENGINE, 2=ANALYST) */
  teams: number | null;
  purpose: string | null;
  access: string | null;
  account: string | null;
  description: string | null;
  /** 1=승인대기 2=활성 3=비활성 */
  status: number;
  created_at: string;

  state: ServerState;
  online: boolean;
  unreported_reason: UnreportedReason | null;

  os: string | null;
  hostname: string | null;
  arch: string | null;
  agent_version: string | null;
  cpu: string | null;
  memory: string | null;
  disk_total: string | null;
  disks: string | null;
  services: string | null;
  raid: string | null;
  uptime_sec: number | null;
  cpu_pct: number | null;
  mem_pct: number | null;
  disk_used_pct: number | null;
  disk_avail_gb: number | null;
  time_drift_sec: number | null;
  smart_health: string | null;
  raid_health: string | null;
  first_seen_at: string | null;
  ping_ok: boolean | null;
  ping_at: string | null;
  updated_at: string | null;
}

export interface ServerSummary {
  total: number;
  ok: number;
  warning: number;
  danger: number;
  offline: number;
  unreported: number;
}

export interface MetricPoint {
  ts: string;
  cpu_pct: number | null;
  mem_pct: number | null;
  disk_used_pct: number | null;
  disk_avail_gb: number | null;
  drift_sec: number | null;
}

export interface ServerDisk {
  device: string;
  model: string | null;
  serial: string | null;
  health: string | null;
  power_on_hours: number | null;
  reallocated_sectors: number | null;
  pending_sectors: number | null;
  temperature_c: number | null;
  wearout_pct: number | null;
  updated_at: string;
}

export interface ServerRaid {
  controller: string;
  model: string | null;
  health: string;
  rebuild_pct: number | null;
  /** VD/PD 목록 JSON 문자열 */
  detail: string | null;
  updated_at: string;
}

export interface ServerHardware {
  disks: ServerDisk[];
  raid: ServerRaid[];
}

export interface ServerEvent {
  idx: number;
  event_type: string;
  detail: string;
  event_at: string;
  created_at: string;
}

export interface ServerListQuery {
  state?: ServerState;
  q?: string;
  os?: string;
}

export interface ServerWriteRequest {
  ip?: string;
  location?: string;
  ports?: string;
  allowed_ips?: string;
  outbound_ips?: string;
  teams?: number | null;
  purpose?: string;
  access?: string;
  account?: string;
  password?: string;
  description?: string;
  status?: number;
}
