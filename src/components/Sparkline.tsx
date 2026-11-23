import { useThemeStore } from "@common/stores/themeStore";

interface SparklineProps {
  values: (number | null)[];
  height?: number;
}

/** 목업 .spark: 막대 스파크라인 (최근 30분 CPU) */
export function Sparkline({ values, height = 48 }: SparklineProps) {
  const { theme } = useThemeStore();
  if (values.length === 0) {
    return <p style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.sm, margin: "4px 0 16px" }}>이력이 아직 없습니다</p>;
  }
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height, margin: "4px 0 16px" }}>
      {values.map((v, i) => (
        <i
          key={i}
          title={v == null ? "-" : `${v}%`}
          style={{
            flex: 1,
            height: `${Math.max(4, Math.min(100, v ?? 0))}%`,
            backgroundColor: theme.colors.primary,
            opacity: v == null ? 0.2 : 0.75,
            borderRadius: "2px 2px 0 0",
          }}
        />
      ))}
    </div>
  );
}
