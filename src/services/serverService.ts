import apiClient from "@common/services/apiClient";
import type { Page } from "@common/types/pagination";
import type {
  MetricPoint,
  Server,
  ServerEvent,
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

export async function getServerMetrics(idx: number, minutes = 30): Promise<MetricPoint[]> {
  const res = await apiClient.get<{ minutes: number; points: MetricPoint[] }>(
    `${BASE}/servers/${idx}/metrics`,
    { params: { minutes } },
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

export async function getServerCredentials(
  idx: number,
  myPassword: string,
): Promise<{ account: string | null; password: string | null }> {
  const res = await apiClient.post<{ account: string | null; password: string | null }>(
    `${BASE}/servers/${idx}/credentials`,
    { password: myPassword },
  );
  return res.data;
}
