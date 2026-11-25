import { SearchBar } from "@common/components/SearchBar";
import { SearchInput } from "@common/components/SearchInput";
import { SearchSelect } from "@common/components/SearchSelect";
import { useThemeStore } from "@common/stores/themeStore";
import { useState } from "react";
import type { ServerListQuery, ServerState } from "../types/server";
import { STATE_LABEL } from "../utils/format";

export type ServerFilters = ServerListQuery;

interface ServerSearchBarProps {
  onSearch: (filters: ServerFilters) => void;
  state: ServerState | "";
  onStateChange: (s: ServerState | "") => void;
  /** 검색바 오른쪽 끝에 붙는 버튼들 (새로고침·서버 등록) */
  actions?: React.ReactNode;
}

const CHIP_STATES: (ServerState | "")[] = ["", "ok", "warning", "danger", "offline", "unreported"];

/** OS + 호스트명/IP 검색 → 아래 상태 칩 */
export function ServerSearchBar({ onSearch, state, onStateChange, actions }: ServerSearchBarProps) {
  const { theme } = useThemeStore();
  const [os, setOs] = useState("");
  const [q, setQ] = useState("");

  const build = (): ServerFilters => {
    const f: ServerFilters = {};
    if (os.trim()) f.os = os.trim();
    if (q.trim()) f.q = q.trim();
    return f;
  };

  return (
    <div>
      <SearchBar
        onSearch={() => onSearch(build())}
        onReset={() => { setOs(""); setQ(""); onSearch({}); }}
      >
        <SearchInput placeholder="OS (예: Ubuntu, Windows)" value={os} onChange={(e) => setOs(e.target.value)} aria-label="OS" style={{ width: "180px" }} />
        <SearchInput placeholder="이름, 호스트명, IP, 용도로 검색" value={q} onChange={(e) => setQ(e.target.value)} aria-label="검색" style={{ flex: 1 }} />
      </SearchBar>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "8px" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          {CHIP_STATES.map((s) => {
            const on = state === s;
            return (
              <button
                key={s || "all"}
                type="button"
                onClick={() => onStateChange(s)}
                style={{
                  padding: "4px 12px",
                  borderRadius: "999px",
                  border: `1px solid ${on ? theme.colors.primary : theme.colors.border}`,
                  backgroundColor: on ? theme.colors.primary : theme.colors.surface,
                  color: on ? theme.colors.primaryText : theme.colors.text,
                  fontSize: theme.fontSize.sm,
                  fontFamily: theme.fontFamily,
                  cursor: "pointer",
                }}
              >
                {s ? STATE_LABEL[s] : "전체"}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>{actions}</div>
      </div>
    </div>
  );
}
