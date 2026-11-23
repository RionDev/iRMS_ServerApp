import { useThemeStore } from "@common/stores/themeStore";
import type { Theme } from "@common/styles/theme";
import type { Server, ServerState } from "../types/server";
import { STATE_LABEL, unreportedLabel } from "../utils/format";

/** 목업 .badge: 상태별 색 (정상=success, 경고=warning, 위험=danger, 오프라인·미수신=muted) */
export function stateColor(theme: Theme, state: ServerState): string {
  switch (state) {
    case "ok": return theme.colors.success;
    case "warning": return theme.colors.warning;
    case "danger": return theme.colors.danger;
    default: return theme.colors.textMuted;
  }
}

interface StateBadgeProps {
  server?: Server;
  state?: ServerState;
  label?: string;
}

export function StateBadge({ server, state, label }: StateBadgeProps) {
  const { theme } = useThemeStore();
  const st = server?.state ?? state ?? "unreported";
  const text = label ?? (server ? unreportedLabel(server) : STATE_LABEL[st]);
  const color = stateColor(theme, st);
  const dashed = st === "unreported";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "2px 10px",
        borderRadius: "999px",
        fontSize: theme.fontSize.sm,
        fontWeight: 500,
        color,
        border: `1px ${dashed ? "dashed" : "solid"} ${color}`,
        backgroundColor: `${color}1a`,
        whiteSpace: "nowrap",
        lineHeight: "18px",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: color }} />
      {text}
    </span>
  );
}
