import { AppLayout } from "@common/components/AppLayout";
import { BaseTable, type TableColumn } from "@common/components/BaseTable";
import { Button } from "@common/components/Button";
import { TableBlock } from "@common/components/TableBlock";
import { TableEmptyState } from "@common/components/TableEmptyState";
import { useAppAccess } from "@common/hooks/useAuth";
import { useThemeStore } from "@common/stores/themeStore";
import { useEffect, useMemo, useState } from "react";
import { StateBadge } from "../components/StateBadge";
import { SERVER_APP } from "../features";
import { serverNavItems } from "../navigation";
import { getAllServers } from "../services/serverService";
import type { Server } from "../types/server";
import { driftLabel, timeAgo } from "../utils/format";

const INSTALL_GUIDE = `# Linux / macOS / Unix
cd resource_monitor/posix && ./check.sh && ./install.sh && ./test.sh

# Windows (관리자 PowerShell)
cd resource_monitor\\win32
powershell -ExecutionPolicy Bypass -File install.ps1
powershell -ExecutionPolicy Bypass -File test.ps1`;

/** 목업 "에이전트": 서버별 에이전트 버전 · 마지막 수신. 최신 버전은 보고된 버전 중 가장 높은 것 */
export function AgentPage() {
  useAppAccess(SERVER_APP);
  const { theme } = useThemeStore();
  const [servers, setServers] = useState<Server[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    getAllServers().then((s) => mounted && setServers(s)).catch(() => mounted && setServers([]));
    return () => { mounted = false; };
  }, []);

  const latest = useMemo(() => {
    const vs = (servers ?? []).map((s) => s.agent_version).filter((v): v is string => !!v);
    return vs.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0] ?? null;
  }, [servers]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(INSTALL_GUIDE); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* 클립보드 거부 */ }
  };

  const muted = { color: theme.colors.textMuted };
  const columns: TableColumn<Server>[] = [
    { key: "hostname", label: "호스트명", render: (s) => s.hostname ?? s.purpose ?? <span style={muted}>-</span>, cellStyle: { textAlign: "left" } },
    { key: "ip", label: "IP", render: (s) => <span style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}>{s.ip}</span> },
    { key: "os", label: "OS", render: (s) => s.os ?? <span style={muted}>-</span> },
    {
      key: "agent_version", label: "에이전트 버전",
      render: (s) => {
        if (s.state === "unreported") return <StateBadge server={s} />;
        if (s.state === "offline") return <StateBadge state="offline" label="응답 없음" />;
        if (!s.agent_version) return <StateBadge state="warning" label="구버전 (버전 미보고)" />;
        return latest && s.agent_version !== latest
          ? <span>{s.agent_version} <StateBadge state="warning" label="업데이트 필요" /></span>
          : <span>{s.agent_version}</span>;
      },
    },
    { key: "time_drift_sec", label: "서버 시계", render: (s) => <span style={s.time_drift_sec != null && Math.abs(s.time_drift_sec) > 60 ? { color: theme.colors.warning } : muted}>{driftLabel(s.time_drift_sec)}</span> },
    { key: "updated_at", label: "마지막 수신", render: (s) => <span style={muted}>{s.first_seen_at ? timeAgo(s.updated_at) : "-"}</span> },
  ];

  return (
    <AppLayout title="에이전트" appName="서버" sidebarItems={serverNavItems} version={__APP_VERSION__} contentMaxWidth="1400px">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "8px" }}>
        <span style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.base }}>
          각 서버에 설치된 resource_monitor 에이전트 상태{latest && ` · 최신 버전 ${latest}`}
        </span>
        <Button variant="secondary" onClick={copy}>{copied ? "복사됨" : "설치 명령 복사"}</Button>
      </div>
      <TableBlock style={{ flex: "none" }}>
        <BaseTable items={servers ?? []} columns={columns} rowKey={(s) => s.idx} />
        {servers === null && <TableEmptyState>로딩 중...</TableEmptyState>}
        {servers !== null && servers.length === 0 && <TableEmptyState>서버가 없습니다.</TableEmptyState>}
      </TableBlock>
    </AppLayout>
  );
}
