import apiClient from "@common/services/apiClient";
import type { Page } from "@common/types/pagination";
import type {
  AuditEntry,
  AuditQuery,
  MetricPoint,
  Server,
  ServerCredential,
  ServerEvent,
  ServerHistory,
  ServerHardware,
  ServerListQuery,
  ServerSummary,
  ServerWriteRequest,
} from "../types/server";

const BASE = "/api/resource";

export async function getServers(
  query: ServerListQuery = {},
  cursor?: string,
  snapshotIdx?: number,
  size: number = 50,
): Promise<Page<Server>> {
  const res = await apiClient.get<Page<Server>>(`${BASE}/servers`, {
    params: { cursor, snapshot_idx: snapshotIdx, size, state: query.state, q: query.q, os: query.os },
  });
  return res.data;
}

/** 필터에 맞는 서버를 전부 모은다 (그룹·에이전트 화면용. 서버 수가 100 안팎이라 페이지를 끝까지 읽는다) */
export async function getAllServers(query: ServerListQuery = {}): Promise<Server[]> {
  const items: Server[] = [];
  let cursor: string | undefined;
  let snapshot: number | undefined;
  for (;;) {
    const page = await getServers(query, cursor, snapshot, 100);
    items.push(...page.items);
    snapshot = page.snapshot_idx;
    if (!page.has_more || !page.next_cursor) break;
    cursor = page.next_cursor;
  }
  return items;
}

export async function getServerSummary(): Promise<ServerSummary> {
  const res = await apiClient.get<ServerSummary>(`${BASE}/servers/summary`);
  return res.data;
}

export async function getServer(idx: number): Promise<Server> {
  const res = await apiClient.get<Server>(`${BASE}/servers/${idx}`);
  return res.data;
}

/** 기본은 현재 장비 세대의 이력만 (장비 교체 전 값은 generation 으로 따로) */
export async function getServerMetrics(idx: number, minutes = 30, generation?: number): Promise<MetricPoint[]> {
  const res = await apiClient.get<{ minutes: number; generation: number; points: MetricPoint[] }>(
    `${BASE}/servers/${idx}/metrics`,
    { params: { minutes, generation } },
  );
  return res.data.points;
}

export async function getServerHardware(idx: number): Promise<ServerHardware> {
  const res = await apiClient.get<ServerHardware>(`${BASE}/servers/${idx}/hardware`);
  return res.data;
}

export async function getServerEvents(idx: number, size = 10): Promise<Page<ServerEvent>> {
  const res = await apiClient.get<Page<ServerEvent>>(`${BASE}/servers/${idx}/events`, { params: { size } });
  return res.data;
}

export async function getAudit(query: AuditQuery, cursor?: string, snapshotIdx?: number, size = 50): Promise<Page<AuditEntry>> {
  const res = await apiClient.get<Page<AuditEntry>>(`${BASE}/audit`, { params: { cursor, snapshot_idx: snapshotIdx, size, ...query } });
  return res.data;
}

export async function getServerHistory(idx: number, size = 20): Promise<Page<ServerHistory>> {
  const res = await apiClient.get<Page<ServerHistory>>(`${BASE}/servers/${idx}/history`, { params: { size } });
  return res.data;
}

export async function addServerHistory(idx: number, happenedAt: string, content: string): Promise<ServerHistory> {
  const res = await apiClient.post<ServerHistory>(`${BASE}/servers/${idx}/history`, { happened_at: happenedAt, content });
  return res.data;
}

export async function deleteServerHistory(idx: number, historyIdx: number): Promise<void> {
  await apiClient.delete(`${BASE}/servers/${idx}/history/${historyIdx}`);
}

export async function createServer(data: ServerWriteRequest): Promise<Server> {
  const res = await apiClient.post<Server>(`${BASE}/servers`, data);
  return res.data;
}

export async function updateServer(idx: number, data: ServerWriteRequest): Promise<Server> {
  const res = await apiClient.put<Server>(`${BASE}/servers/${idx}`, data);
  return res.data;
}

export async function deleteServer(idx: number): Promise<void> {
  await apiClient.delete(`${BASE}/servers/${idx}`);
}

export async function getServerCredentials(idx: number, myPassword: string): Promise<ServerCredential[]> {
  const res = await apiClient.post<{ accounts: ServerCredential[] }>(`${BASE}/servers/${idx}/credentials`, { password: myPassword });
  return res.data.accounts;
}
