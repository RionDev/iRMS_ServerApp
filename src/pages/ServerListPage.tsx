import { AppLayout } from "@common/components/AppLayout";
import { TABLE_ROW_H, TABLE_THEAD_H } from "@common/components/BaseTable";
import { Button } from "@common/components/Button";
import { Drawer } from "@common/components/Drawer";
import { Pagination } from "@common/components/Pagination";
import { TableBlock } from "@common/components/TableBlock";
import { TableEmptyState } from "@common/components/TableEmptyState";
import { useAppAccess } from "@common/hooks/useAuth";
import { useFeatures } from "@common/hooks/useFeatures";
import { LAYOUT, useFixedPageSize } from "@common/hooks/useFixedPageSize";
import { usePagedNav } from "@common/hooks/usePagedNav";
import { useThemeStore } from "@common/stores/themeStore";
import { useCallback, useRef, useEffect, useMemo, useState } from "react";
import { ServerDetail } from "../components/ServerDetail";
import { ServerForm } from "../components/ServerForm";
import { ServerSearchBar, type ServerFilters } from "../components/ServerSearchBar";
import { ServerStats } from "../components/ServerStats";
import { ServerTable } from "../components/ServerTable";
import { SERVER_APP, ServerFeature } from "../features";
import { useServerNavItems } from "../navigation";
import { createServer, getServer, getServers, updateServer } from "../services/serverService";
import { InstallGuideModal } from "../components/InstallGuide";
import type { Server, ServerState, ServerWriteRequest } from "../types/server";

/** 통계 카드 행(≈76) + 칩 행(≈44) 을 overhead 에 더한다 */
const STATS_H = 76 + 16;
const CHIPS_H = 44;
const TABLEBLOCK_PAD_Y = 32;
const OVERHEAD =
  LAYOUT.HEADER_H + LAYOUT.FOOTER_H + LAYOUT.MAIN_PAD_Y + STATS_H + LAYOUT.SEARCHBAR_H + LAYOUT.SEARCHBAR_MARGIN +
  CHIPS_H + TABLEBLOCK_PAD_Y + TABLE_THEAD_H + LAYOUT.PAGINATION_H;

/** 자동 새로고침 주기 — 에이전트 보고 주기(60초)와 맞춘다 */
const REFRESH_MS = 60_000;

export function ServerListPage() {
  useAppAccess(SERVER_APP);
  const { theme } = useThemeStore();
  const navItems = useServerNavItems();
  const { can } = useFeatures(SERVER_APP);
  const [filters, setFilters] = useState<ServerFilters>({});
  const [state, setState] = useState<ServerState | "">("");
  const [selected, setSelected] = useState<Server | null>(null);
  const [editing, setEditing] = useState<Server | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);   // 드로어 안 접속 정보 모달
  const [reloadKey, setReloadKey] = useState(0);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [installFor, setInstallFor] = useState<Server | null>(null);   // 등록 직후 에이전트 설치 안내
  const pageSize = useFixedPageSize({ overhead: OVERHEAD, rowHeight: TABLE_ROW_H });
  const filterKey = JSON.stringify({ ...filters, state });

  const fetcher = useCallback(
    (cursor: string | undefined, snapshotIdx: number | undefined, size: number) =>
      getServers({ q: filters.q, os: filters.os, state: state || undefined }, cursor, snapshotIdx, size),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey],
  );
  const nav = usePagedNav<Server>({ fetcher, size: pageSize, deps: [filterKey] });

  const items = nav.items;

  // 자동 새로고침: 목록은 nav.refresh (기존 행 유지 → 깜빡임 없음), 카드·드로어는 reloadKey 로 다시 읽는다
  const refresh = useCallback(() => { void nav.refresh(); setReloadKey((k) => k + 1); setLastSync(new Date()); }, [nav.refresh]);
  // 정보 수정·접속 정보 모달이 열려 있는 동안은 건너뛴다 (입력 중 끊기거나 비밀번호를 다시 묻던 것). 닫으면 다음 주기부터
  const pauseRef = useRef(false);
  pauseRef.current = formOpen || detailModalOpen;
  useEffect(() => {
    const t = setInterval(() => { if (!pauseRef.current) refresh(); }, REFRESH_MS);
    return () => clearInterval(t);
  }, [refresh]);

  // 드로어가 열린 채 새로고침되면 선택 서버도 최신으로
  useEffect(() => {
    if (!selected) return;
    getServer(selected.idx).then(setSelected).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const submitForm = async (data: ServerWriteRequest): Promise<Server | void> => {
    try {
      let result: Server;
      if (editing) {
        result = await updateServer(editing.idx, data);
        setSelected(result);
        setFormOpen(false); setEditing(null); refresh();   // 같은 페이지 다시 읽기 + 드로어(이력 포함) 다시 읽기
      } else {
        result = await createServer(data);
        setInstallFor(result);
        setFormOpen(false); setEditing(null);
        nav.reset(); setReloadKey((k) => k + 1); setLastSync(new Date());   // 새 서버는 snapshot 밖이라 refresh 로는 안 보임 — 첫 페이지부터 새 snapshot 으로
      }
      return result;
    } catch { /* interceptor alert */ }
  };

  return (
    <AppLayout title="서버 목록" appName="서버" sidebarItems={navItems} version={__APP_VERSION__} contentMaxWidth="1400px">
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "min(900px, calc(100vh - 180px))" }}>
        <ServerStats reloadKey={reloadKey} />
        <ServerSearchBar
          onSearch={setFilters}
          state={state}
          onStateChange={setState}
          actions={
            <>
              <span style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.sm }}>갱신 {lastSync.toLocaleTimeString()}</span>
              <Button variant="secondary" onClick={refresh} disabled={nav.loading}>새로고침</Button>
              {can(ServerFeature.MANAGE) && <Button onClick={() => { setEditing(null); setFormOpen(true); }}>서버 등록</Button>}
            </>
          }
        />
        <TableBlock>
          <ServerTable servers={items} onSelect={setSelected} />
          {nav.loading && items.length === 0 && <TableEmptyState>로딩 중...</TableEmptyState>}
          {!nav.loading && items.length === 0 && <TableEmptyState>서버가 없습니다.</TableEmptyState>}
          <div style={{ marginTop: "auto" }}>
            <Pagination page={nav.page} totalPages={nav.totalPages} total={nav.total} totalCapped={nav.totalCapped}
              hasPrev={nav.hasPrev} hasNext={nav.hasNext} onPrev={nav.prev} onNext={nav.next} loading={nav.loading} />
          </div>
        </TableBlock>
      </div>

      <Drawer isOpen={selected !== null} onClose={() => setSelected(null)} width="900px">
        {selected && (
          <ServerDetail
            onModalChange={setDetailModalOpen}
            reloadKey={reloadKey}
            server={selected}
            onClose={() => setSelected(null)}
            onEdit={(s) => { setEditing(s); setFormOpen(true); }}
            onAfterDelete={refresh}
          />
        )}
      </Drawer>
      <InstallGuideModal
        isOpen={installFor !== null}
        onClose={() => setInstallFor(null)}
        intro={installFor && <span><b style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{installFor.ip}</b> 이(가) 등록되었습니다. 서버에 에이전트(argus)를 설치해야 상태가 올라옵니다. 설치 전까지는 "미수신"으로 표시됩니다.</span>}
      />
      <ServerForm isOpen={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} server={editing} onSubmit={submitForm} />
    </AppLayout>
  );
}
