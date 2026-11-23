import { BaseTable, type TableColumn } from "@common/components/BaseTable";
import { useThemeStore } from "@common/stores/themeStore";
import { useMemo } from "react";
import type { Server } from "../types/server";
import { teamLabel, timeAgo } from "../utils/format";
import { Meter } from "./Meter";
import { StateBadge } from "./StateBadge";

interface ServerTableProps {
  servers: Server[];
  onSelect: (s: Server) => void;
}

/** 목업 서버 목록 컬럼: 상태 · 호스트명 · IP · 그룹 · OS · CPU · 메모리 · 디스크 · 마지막 수신 */
export function ServerTable({ servers, onSelect }: ServerTableProps) {
  const { theme } = useThemeStore();
  const muted = { color: theme.colors.textMuted };
  const columns = useMemo<TableColumn<Server>[]>(
    () => [
      { key: "state", label: "상태", render: (s) => <StateBadge server={s} /> },
      {
        key: "hostname", label: "호스트명",
        render: (s) => <b style={{ fontWeight: 500 }}>{s.hostname ?? s.purpose ?? <span style={muted}>-</span>}</b>,
        cellStyle: { textAlign: "left" },
      },
      { key: "ip", label: "IP", render: (s) => <span style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}>{s.ip}</span> },
      { key: "teams", label: "그룹", render: (s) => teamLabel(s.teams) },
      { key: "os", label: "OS", render: (s) => s.os ?? <span style={muted}>-</span> },
      { key: "cpu_pct", label: "CPU", render: (s) => s.online ? <Meter value={s.cpu_pct} /> : <span style={muted}>-</span> },
      { key: "mem_pct", label: "메모리", render: (s) => s.online ? <Meter value={s.mem_pct} /> : <span style={muted}>-</span> },
      { key: "disk_used_pct", label: "디스크", render: (s) => <Meter value={s.disk_used_pct} warn={80} danger={90} /> },
      { key: "updated_at", label: "마지막 수신", render: (s) => <span style={muted}>{s.first_seen_at ? timeAgo(s.updated_at) : "-"}</span> },
    ],
    [theme],
  );
  return <BaseTable items={servers} columns={columns} onRowClick={onSelect} rowKey={(s) => s.idx} />;
}
