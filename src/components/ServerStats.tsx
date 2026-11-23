import { useThemeStore } from "@common/stores/themeStore";
import { useEffect, useState } from "react";
import { getServerSummary } from "../services/serverService";
import type { ServerSummary } from "../types/server";

interface ServerStatsProps {
  reloadKey?: number;
}

/** 목업 .stats: 전체 / 정상 / 경고·위험 / 오프라인 카드 + 미수신(IP 는 있지만 보고 없는 서버) */
export function ServerStats({ reloadKey }: ServerStatsProps) {
  const { theme } = useThemeStore();
  const [s, setS] = useState<ServerSummary | null>(null);

  useEffect(() => {
    let mounted = true;
    getServerSummary().then((d) => mounted && setS(d)).catch(() => mounted && setS(null));
    return () => { mounted = false; };
  }, [reloadKey]);

  const cards: { label: string; value: number | null; color: string }[] = [
    { label: "전체 서버", value: s?.total ?? null, color: theme.colors.primary },
    { label: "정상", value: s?.ok ?? null, color: theme.colors.success },
    { label: "경고 · 위험", value: s ? s.warning + s.danger : null, color: theme.colors.warning },
    { label: "오프라인", value: s?.offline ?? null, color: theme.colors.danger },
    { label: "미수신", value: s?.unreported ?? null, color: theme.colors.textMuted },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cards.length}, 1fr)`, gap: "16px", marginBottom: "16px" }}>
      {cards.map((c) => (
        <div
          key={c.label}
          style={{
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.md,
            boxShadow: theme.shadow.card,
            padding: "14px 18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: theme.colors.textMuted, fontSize: theme.fontSize.sm }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: c.color }} />
            {c.label}
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, marginTop: "6px", color: theme.colors.text }}>
            {c.value ?? "-"}
          </div>
        </div>
      ))}
    </div>
  );
}
