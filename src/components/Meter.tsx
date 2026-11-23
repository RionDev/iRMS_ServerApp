import { useThemeStore } from "@common/stores/themeStore";

interface MeterProps {
  value: number | null | undefined;
  /** 경고 임계 (기본 75 — BE CPU/MEM 과 동일) */
  warn?: number;
  /** 위험 임계 (기본 90) */
  danger?: number;
  width?: number | string;
}

/** 목업 .meter: 트랙 + 채움 + 숫자. 값이 없으면 "-" */
export function Meter({ value, warn = 75, danger = 90, width = 96 }: MeterProps) {
  const { theme } = useThemeStore();
  if (value == null) return <span style={{ color: theme.colors.textMuted }}>-</span>;
  const v = Math.max(0, Math.min(100, value));
  const color = v >= danger ? theme.colors.danger : v >= warn ? theme.colors.warning : theme.colors.primary;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", width }}>
      <span
        style={{
          flex: 1,
          height: "6px",
          borderRadius: "3px",
          backgroundColor: theme.colors.surfaceMuted,
          overflow: "hidden",
        }}
      >
        <span style={{ display: "block", height: "100%", width: `${v}%`, backgroundColor: color, borderRadius: "3px" }} />
      </span>
      <span style={{ fontSize: theme.fontSize.sm, minWidth: "34px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {Math.round(v)}%
      </span>
    </span>
  );
}
