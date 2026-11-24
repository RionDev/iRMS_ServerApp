import { AppLayout } from "@common/components/AppLayout";
import { BaseTable, type TableColumn } from "@common/components/BaseTable";
import { Pagination } from "@common/components/Pagination";
import { SearchBar } from "@common/components/SearchBar";
import { SearchInput } from "@common/components/SearchInput";
import { SearchSelect } from "@common/components/SearchSelect";
import { TableBlock } from "@common/components/TableBlock";
import { TableEmptyState } from "@common/components/TableEmptyState";
import { useAppAccess } from "@common/hooks/useAuth";
import { useFeatures } from "@common/hooks/useFeatures";
import { useFixedPageSize, LAYOUT } from "@common/hooks/useFixedPageSize";
import { usePagedNav } from "@common/hooks/usePagedNav";
import { useThemeStore } from "@common/stores/themeStore";
import { useCallback, useState } from "react";
import { SERVER_APP, ServerFeature } from "../features";
import { useServerNavItems } from "../navigation";
import { getAudit } from "../services/serverService";
import type { AuditAction, AuditEntry, AuditQuery } from "../types/server";
import { AUDIT_ACTION_LABEL, formatDateTime } from "../utils/format";

const TABLE_ROW_H = 40;
const OVERHEAD = LAYOUT.HEADER_H + LAYOUT.FOOTER_H + LAYOUT.MAIN_PAD_Y + LAYOUT.SEARCHBAR_H + LAYOUT.SEARCHBAR_MARGIN + LAYOUT.PAGINATION_H + 48;

/** 열람 기록: 접속 정보 열람 · 서버 등록/수정/삭제 · 접속 계정 변경 · 장비 이력 변경 · 자동 등록. 기능 키 server_audit (기본 ADMIN) */
export function AuditPage() {
  useAppAccess(SERVER_APP);
  const { theme } = useThemeStore();
  const navItems = useServerNavItems();
  const { can, loaded } = useFeatures(SERVER_APP);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [who, setWho] = useState("");
  const [query, setQuery] = useState<AuditQuery>({});
  const pageSize = useFixedPageSize({ overhead: OVERHEAD, rowHeight: TABLE_ROW_H });
  const key = JSON.stringify(query);
  const fetcher = useCallback(
    (cursor: string | undefined, snapshotIdx: number | undefined, size: number) => getAudit(query, cursor, snapshotIdx, size),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  const nav = usePagedNav<AuditEntry>({ fetcher, size: pageSize, deps: [key] });

  const build = (): AuditQuery => {
    const f: AuditQuery = {};
    if (from) f.from = from;
    if (to) f.to = to;
    if (action) f.action = action as AuditAction;
    if (q.trim()) f.q = q.trim();
    if (who.trim()) f.who = who.trim();
    return f;
  };
  const mono: React.CSSProperties = { fontFamily: "ui-monospace, Menlo, Consolas, monospace" };
  const muted: React.CSSProperties = { color: theme.colors.textMuted };
  const columns: TableColumn<AuditEntry>[] = [
    { key: "created_at", label: "일시", render: (r) => <span style={mono}>{formatDateTime(r.created_at)}</span> },
    { key: "server", label: "서버", render: (r) => <span><span style={mono}>{r.server_ip ?? "-"}</span>{r.hostname && <span style={{ ...muted, marginLeft: "6px" }}>{r.hostname}</span>}{r.server_id == null && r.server_ip && <span style={{ ...muted, marginLeft: "6px", fontSize: theme.fontSize.sm }}>(삭제됨)</span>}</span>, cellStyle: { textAlign: "left" } },
    { key: "who", label: "누가", render: (r) => r.user_name ?? <span style={muted}>{r.changed_by == null ? "에이전트" : "-"}</span> },
    { key: "client_ip", label: "접속 IP", render: (r) => <span style={mono}>{r.client_ip ?? "-"}</span> },
    { key: "action", label: "행위", render: (r) => <span><b style={r.action === "credentials_view" ? { color: theme.colors.primary } : undefined}>{AUDIT_ACTION_LABEL[r.action] ?? r.action}</b>{r.content && !r.content.startsWith(AUDIT_ACTION_LABEL[r.action] ?? "\u0000") && <span style={{ ...muted, marginLeft: "8px" }}>{r.content}</span>}</span>, cellStyle: { textAlign: "left" } },
  ];

  return (
    <AppLayout title="열람 기록" appName="서버" sidebarItems={navItems} version={__APP_VERSION__} contentMaxWidth="1400px">
      {loaded && !can(ServerFeature.AUDIT) ? (
        <p style={{ color: theme.colors.textMuted }}>열람 기록을 볼 권한이 없습니다. (admin 앱 → 서버 → 기능 권한 "열람 기록 조회")</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "min(900px, calc(100vh - 180px))" }}>
          <SearchBar onSearch={() => setQuery(build())} onReset={() => { setFrom(""); setTo(""); setAction(""); setQ(""); setWho(""); setQuery({}); }}>
            <SearchInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="시작일" style={{ width: "150px" }} />
            <span style={muted}>~</span>
            <SearchInput type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="종료일" style={{ width: "150px" }} />
            <SearchSelect value={action} onChange={(e) => setAction(e.target.value)} aria-label="행위">
              <option value="">전체 행위</option>
              {Object.entries(AUDIT_ACTION_LABEL).filter(([k]) => k !== "other").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </SearchSelect>
            <SearchInput placeholder="서버 IP · 호스트명" value={q} onChange={(e) => setQ(e.target.value)} aria-label="서버" style={{ width: "200px" }} />
            <SearchInput placeholder="사람 이름" value={who} onChange={(e) => setWho(e.target.value)} aria-label="사람" style={{ width: "150px" }} />
          </SearchBar>
          <TableBlock>
            <BaseTable items={nav.items} columns={columns} rowKey={(r) => r.idx} />
            {nav.loading && nav.items.length === 0 && <TableEmptyState>로딩 중...</TableEmptyState>}
            {!nav.loading && nav.items.length === 0 && <TableEmptyState>기록이 없습니다.</TableEmptyState>}
            <div style={{ marginTop: "auto" }}>
              <Pagination page={nav.page} totalPages={nav.totalPages} total={nav.total} totalCapped={nav.totalCapped}
                hasPrev={nav.hasPrev} hasNext={nav.hasNext} onPrev={nav.prev} onNext={nav.next} loading={nav.loading} />
            </div>
          </TableBlock>
        </div>
      )}
    </AppLayout>
  );
}
