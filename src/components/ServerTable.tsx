import { BaseTable, type TableColumn } from "@common/components/BaseTable";
import { useThemeStore } from "@common/stores/themeStore";
import { useMemo } from "react";
import type { Server } from "../types/server";
import { stateReasons, timeAgo, serverTitle } from "../utils/format";
import { HoverCard } from "./HoverCard";
import { stateColor, StateBadge } from "./StateBadge";
import { Meter } from "./Meter";

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
      {
        key: "state", label: "상태",
        // 경고·위험이면 배지에 마우스를 올렸을 때 사유 카드 (상세 화면과 같은 규칙)
        render: (s) => {
          const bad = s.state === "warning" || s.state === "danger";
          const color = stateColor(theme, s.state);
          const card = bad ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, marginBottom: 6, color }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color }} />
                {s.state === "danger" ? "위험" : "경고"} 사유
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                {stateReasons(s).map((r) => (
                  <li key={r} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                    <span style={{ color, flex: "none" }}>•</span><span>{r}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : undefined;
          return <HoverCard content={card}><StateBadge server={s} /></HoverCard>;
        },
      },
      {
        key: "hostname", label: "이름",
        render: (s) => <b style={{ fontWeight: 500 }} title={s.hostname ?? undefined}>{serverTitle(s)}{s.name && s.hostname && s.hostname !== s.name ? <span style={{ ...muted, fontWeight: 400 }}> {s.hostname}</span> : null}</b>,
        cellStyle: { textAlign: "left" },
      },
      { key: "ip", label: "IP", render: (s) => <span style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}>{s.ip}</span> },
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
