/** BE resource-service 응답 타입 (src/schemas.py 와 1:1) */

export type ServerState = "ok" | "warning" | "danger" | "offline" | "unreported";

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
  /** 자유 태그 (빌드, 패턴수집 …) — 소속 팀과 별개 */
  tags: string[];
  access: string | null;
  account: string | null;
  description: string | null;
  /** 2=활성 3=비활성(폐기 서버 보관). 1=승인대기는 더 쓰지 않는다 */
  status: number;
  created_at: string;

  state: ServerState;
  online: boolean;
  /** 요청자가 계정 정보를 볼 수 있는지 — 서버 소속 팀의 LEAD 이상 또는 ADMIN (BE 판정) */
  can_view_credentials: boolean;

  os: string | null;
  hostname: string | null;
  arch: string | null;
  agent_version: string | null;
  /** 장비 식별자(시리얼). 바뀌면 BE 가 세대를 올린다 */
  machine_id: string | null;
  hw_generation: number;
  hw_changed_at: string | null;
  cpu: string | null;
  memory: string | null;
  disk_total: string | null;
  disks: string | null;
  services: string | null;
  /** services JSON 파싱 결과 (자동 시작 서비스·실행 여부, ESXi 는 VM) */
  service_list: { name: string; state: string }[];
  services_stopped: number;
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
  tag?: string;
}

export interface ServerWriteRequest {
  ip?: string;
  location?: string;
  ports?: string;
  allowed_ips?: string;
  outbound_ips?: string;
  teams?: number | null;
  purpose?: string;
  tags?: string[];
  access?: string;
  account?: string;
  password?: string;
  description?: string;
  status?: number;
}
