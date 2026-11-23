import { AppLayout } from "@common/components/AppLayout";
import { BaseTable, type TableColumn } from "@common/components/BaseTable";
import { TableBlock } from "@common/components/TableBlock";
import { TableEmptyState } from "@common/components/TableEmptyState";
import { useAppAccess } from "@common/hooks/useAuth";
import { useThemeStore } from "@common/stores/themeStore";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StateBadge } from "../components/StateBadge";
import { SERVER_APP } from "../features";
import { serverNavItems } from "../navigation";
import { getAllServers } from "../services/serverService";
import type { Server } from "../types/server";
import { TEAM_NAME } from "../utils/format";

interface GroupRow {
  idx: number;
  name: string;
  count: number;
  bad: number;
  offline: number;
  unreported: number;
}

/**
 * 목업 "그룹 관리": 서버를 팀(그룹)별로 묶어 상태를 본다.
 * 그룹은 users 의 팀과 같은 teams 테이블(엔진·분석)이라 여기서 추가·삭제하지 않고, 서버의 그룹은 서버 상세 → 정보 수정에서 바꾼다.
 */
export function GroupPage() {
  useAppAccess(SERVER_APP);
  const { theme } = useThemeStore();
  const nav = useNavigate();
  const [servers, setServers] = useState<Server[] | null>(null);

  useEffect(() => {
    let mounted = true;
    getAllServers().then((s) => mounted && setServers(s)).catch(() => mounted && setServers([]));
    return () => { mounted = false; };
  }, []);

  const rows = useMemo<GroupRow[]>(() => {
    if (!servers) return [];
    const groups: Record<number, GroupRow> = {};
    const nameOf = (t: number) => (t === 0 ? "미지정" : TEAM_NAME[t] ?? String(t));
    for (const s of servers) {
      const t = s.teams ?? 0;
      groups[t] ??= { idx: t, name: nameOf(t), count: 0, bad: 0, offline: 0, unreported: 0 };
      const g = groups[t];
      g.count++;
      if (s.state === "warning" || s.state === "danger") g.bad++;
      if (s.state === "offline") g.offline++;
      if (s.state === "unreported") g.unreported++;
    }
    return Object.values(groups).sort((a, b) => (a.idx || 99) - (b.idx || 99));
  }, [servers]);

  const columns: TableColumn<GroupRow>[] = [
    { key: "name", label: "그룹", render: (g) => <b style={{ fontWeight: 500 }}>{g.name}</b>, cellStyle: { textAlign: "left" } },
    { key: "count", label: "서버 수" },
    { key: "bad", label: "경고·위험", render: (g) => g.bad ? <StateBadge state="warning" label={`${g.bad}대`} /> : <span style={{ color: theme.colors.textMuted }}>0</span> },
    { key: "offline", label: "오프라인", render: (g) => g.offline ? <StateBadge state="offline" label={`${g.offline}대`} /> : <span style={{ color: theme.colors.textMuted }}>0</span> },
    { key: "unreported", label: "미수신", render: (g) => g.unreported ? <StateBadge state="unreported" label={`${g.unreported}대`} /> : <span style={{ color: theme.colors.textMuted }}>0</span> },
  ];

  return (
    <AppLayout title="그룹 관리" appName="서버" sidebarItems={serverNavItems} version={__APP_VERSION__}>
      <p style={{ margin: "0 0 12px", color: theme.colors.textMuted, fontSize: theme.fontSize.base }}>
        서버는 담당 팀(그룹)으로 묶입니다. 그룹을 클릭하면 그 그룹의 서버 목록으로 갑니다. 서버의 그룹은 서버 상세 → 정보 수정에서 바꿉니다.
      </p>
      <TableBlock style={{ flex: "none" }}>
        <BaseTable items={rows} columns={columns} onRowClick={(g) => nav(`/?teams=${g.idx}`)} rowKey={(g) => g.idx} />
        {servers === null && <TableEmptyState>로딩 중...</TableEmptyState>}
        {servers !== null && rows.length === 0 && <TableEmptyState>서버가 없습니다.</TableEmptyState>}
      </TableBlock>
    </AppLayout>
  );
}
