/** BE resource-service 응답 타입 (src/schemas.py 와 1:1) */

export type ServerState = "ok" | "warning" | "danger" | "offline" | "unreported";

export interface Server {
  idx: number;
  ip: string;
  /** 서버 이름 (사람이 붙임) — 없으면 호스트명을 보여 준다 */
  name: string | null;
  location: string | null;
  ports: string | null;
  allowed_ips: string | null;
  outbound_ips: string | null;
  /** teams.idx (1=ENGINE, 2=ANALYST) */
  teams: number | null;
  /** 담당자 (자유 입력) */
  manager: string | null;
  purpose: string | null;
  description: string | null;
  /** 접속 계정 (비밀번호 제외) — 수정 폼 채우기·상세 표시용 */
  accounts: ServerAccount[];
  /** 접속 방법 목록 (중복 제거) */
  access_methods: string[];
  account_count: number;
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
  service_list: { name: string; state: string; desc?: string | null }[];
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
  mount_health: string | null;
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

export interface ServerMount {
  path: string;
  fs: string | null;
  fstype: string | null;
  /** 올라탄 디스크 (sda). 원격이면 null — ServerDisk.os_device 와 연결 */
  device: string | null;
  total_gb: number | null;
  used_gb: number | null;
  used_pct: number | null;
  updated_at: string;
}

export interface ServerDisk {
  device: string;
  /** 물리 슬롯 (252:6) 또는 직결 장치명 */
  slot: string | null;
  /** 이 디스크가 이루는 OS 장치 (sda) */
  os_device: string | null;
  /** 소속 RAID (c0 VD239 RAID6) */
  raid: string | null;
  model: string | null;
  serial: string | null;
  health: string | null;
  power_on_hours: number | null;
  reallocated_sectors: number | null;
  pending_sectors: number | null;
  temperature_c: number | null;
  wearout_pct: number | null;
  /** 예비 섹터 사용률 % (100=제조사 고장 기준). SAS·구버전 에이전트는 null */
  spare_used_pct: number | null;
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
  mounts: ServerMount[];
}

export interface ServerAccount {
  idx: number;
  access: string;
  port: string | null;
  account: string | null;
  /** 비밀번호가 저장돼 있음 (값은 접속 정보에서만) */
  has_password?: boolean;
}

export interface ServerAccountInput {
  access: string;
  port?: string;
  account?: string;
  /** 비우면 수정 시 기존 비밀번호 유지 */
  password?: string;
  /** 폼 표시용 — 저장된 비밀번호가 있어 ●●●● 로 보여 줌 */
  has_password?: boolean;
}

export interface ServerCredential {
  access: string;
  port: string | null;
  account: string | null;
  password: string | null;
}

export type AuditAction = "credentials_view" | "server_create" | "server_update" | "accounts_change" | "history_change" | "server_delete" | "auto_register" | "other";

export interface AuditEntry {
  idx: number;
  server_id: number | null;
  server_ip: string | null;
  hostname: string | null;
  action: AuditAction;
  content: string;
  changed_by: number | null;
  user_name: string | null;
  client_ip: string | null;
  created_at: string;
}

export interface AuditQuery {
  from?: string;
  to?: string;
  action?: AuditAction;
  q?: string;
  who?: string;
}

export interface ServerHistory {
  idx: number;
  happened_at: string;
  content: string;
  author: string;
  created_at: string;
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
  name?: string;
  location?: string;
  ports?: string;
  allowed_ips?: string;
  outbound_ips?: string;
  purpose?: string;
  manager?: string;
  /** 접속 계정 전부 교체. 생략하면 그대로. password 빈 줄은 기존 값 유지 */
  accounts?: ServerAccountInput[];
  description?: string;
  status?: number;
}
