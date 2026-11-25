import { useThemeStore } from "@common/stores/themeStore";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface HoverCardProps {
  /** 마우스를 올릴 대상 */
  children: ReactNode;
  /** 띄울 내용. 없으면 카드 없이 children 만 */
  content?: ReactNode;
}

/**
 * 마우스를 올리면 대상 밑에 뜨는 카드 (브라우저 기본 title 말풍선 대신).
 * 표·모달의 overflow 에 잘리지 않게 body 에 붙이고, 화면 밖으로 나가면 위로·안쪽으로 옮긴다.
 */
export function HoverCard({ children, content }: HoverCardProps) {
  const { theme } = useThemeStore();
  const anchor = useRef<HTMLSpanElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor.current || !card.current) { setPos(null); return; }
    const a = anchor.current.getBoundingClientRect();
    const c = card.current.getBoundingClientRect();
    const gap = 8;
    let top = a.bottom + gap;
    if (top + c.height > window.innerHeight - 8) top = a.top - gap - c.height;
    const left = Math.min(Math.max(8, a.left + a.width / 2 - c.width / 2), window.innerWidth - c.width - 8);
    setPos({ top, left });
  }, [open]);

  if (!content) return <>{children}</>;
  return (
    <span ref={anchor} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} style={{ display: "inline-flex" }}>
      {children}
      {open && createPortal(
        <div
          ref={card}
          role="tooltip"
          style={{
            position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? -9999, zIndex: 2000,
            maxWidth: 320, padding: "10px 12px", borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surface, color: theme.colors.text,
            border: `1px solid ${theme.colors.border}`,
            boxShadow: "0 10px 24px rgba(15,23,42,0.14), 0 2px 6px rgba(15,23,42,0.08)",
            fontFamily: theme.fontFamily, fontSize: theme.fontSize.sm, lineHeight: 1.5,
            pointerEvents: "none", textAlign: "left",
            opacity: pos ? 1 : 0, transition: "opacity 120ms ease",
          }}
        >
          {content}
        </div>,
        document.body,
      )}
    </span>
  );
}
