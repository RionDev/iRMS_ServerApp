import { useThemeStore } from "@common/stores/themeStore";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

export interface ComboOption {
  value: string;
  /** 오른쪽에 흐리게 붙는 설명 (기본 포트, 호스트 이름 등) */
  hint?: string;
}

interface ComboInputProps {
  value: string;
  onChange: (v: string) => void;
  options: ComboOption[];
  placeholder?: string;
  style?: CSSProperties;
}

/**
 * 직접 입력도 되고 선택지에서 고를 수도 있는 칸 (브라우저 기본 datalist 대신).
 * 칸을 누르면 지금 값과 상관없이 선택지 전체가 뜨고, 글자를 치면 그 글자가 든 것만 남긴다.
 */
export function ComboInput({ value, onChange, options, placeholder, style }: ComboInputProps) {
  const { theme } = useThemeStore();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(false);
  const [active, setActive] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const q = value.trim().toLowerCase();
  const filtered = typed && q ? options.filter((o) => o.value.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)) : options;

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => input.current && setRect(input.current.getBoundingClientRect());
    place();
    // 모달 안에서 스크롤해도 칸을 따라가게
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => { window.removeEventListener("scroll", place, true); window.removeEventListener("resize", place); };
  }, [open]);

  const show = () => { setTyped(false); setActive(-1); setOpen(true); };
  const pick = (v: string) => { onChange(v); setOpen(false); };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (!open) show(); else setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && open && active >= 0 && filtered[active]) { e.preventDefault(); pick(filtered[active].value); }
    else if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); }
  };

  const below = rect ? window.innerHeight - rect.bottom > 220 || rect.top < 220 : true;

  return (
    <>
      <input
        ref={input}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={show}
        onClick={() => { if (!open) show(); }}
        onBlur={() => setOpen(false)}
        onChange={(e) => { onChange(e.target.value); setTyped(true); setActive(-1); setOpen(true); }}
        onKeyDown={onKeyDown}
        style={style}
      />
      {open && rect && filtered.length > 0 && createPortal(
        <ul
          role="listbox"
          style={{
            position: "fixed", left: rect.left, width: Math.max(rect.width, 180), zIndex: 2000,
            ...(below ? { top: rect.bottom + 4 } : { bottom: window.innerHeight - rect.top + 4 }),
            maxHeight: 220, overflowY: "auto", margin: 0, padding: 4, listStyle: "none",
            backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.md, boxShadow: "0 10px 24px rgba(15,23,42,0.14), 0 2px 6px rgba(15,23,42,0.08)",
            fontFamily: theme.fontFamily, fontSize: theme.fontSize.base, boxSizing: "border-box",
          }}
        >
          {filtered.map((o, i) => {
            const selected = o.value.toLowerCase() === q;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={selected}
                // blur 보다 먼저 고르게 mousedown 에서 처리
                onMouseDown={(e) => { e.preventDefault(); pick(o.value); }}
                onMouseEnter={() => setActive(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: theme.radius.sm, cursor: "pointer",
                  backgroundColor: i === active ? theme.colors.surfaceMuted : "transparent",
                  color: selected ? theme.colors.primary : theme.colors.text, fontWeight: selected ? 600 : 400,
                }}
              >
                <span style={{ width: 12, flex: "none", color: theme.colors.primary }}>{selected ? "✓" : ""}</span>
                <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.value}</span>
                {o.hint && <span style={{ flex: "none", color: theme.colors.textMuted, fontSize: theme.fontSize.sm, fontWeight: 400 }}>{o.hint}</span>}
              </li>
            );
          })}
        </ul>,
        document.body,
      )}
    </>
  );
}
