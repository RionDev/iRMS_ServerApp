import { Button } from "@common/components/Button";
import { Modal } from "@common/components/Modal";
import { useThemeStore } from "@common/stores/themeStore";
import { useState } from "react";
import { INSTALL_STEPS } from "../utils/install";

interface InstallGuideProps {
  /** 상단에 붙일 한 줄 (예: 방금 등록한 IP 안내) */
  intro?: React.ReactNode;
}

/** OS 별 설치 명령 + 각각 복사 버튼. 모달 본문과 드로어 안쪽 양쪽에서 쓴다 */
export function InstallGuide({ intro }: InstallGuideProps) {
  const { theme } = useThemeStore();
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500); } catch { /* 클립보드 거부 */ }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {intro && <p style={{ margin: 0, fontSize: theme.fontSize.base }}>{intro}</p>}
      {INSTALL_STEPS.map((s) => (
        <div key={s.os} style={{ border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.sm, padding: "10px 12px", backgroundColor: theme.colors.surface }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <b style={{ fontSize: theme.fontSize.base }}>{s.os}</b>
            <Button variant="secondary" onClick={() => copy(s.os, s.cmd)} style={{ padding: "4px 10px", fontSize: theme.fontSize.sm }}>{copied === s.os ? "복사됨" : "복사"}</Button>
          </div>
          <div style={{ fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: "6px" }}>{s.note}</div>
          <pre style={{ margin: 0, padding: "8px 10px", borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceMuted, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: theme.fontSize.sm, color: theme.colors.text }}>{s.cmd}</pre>
        </div>
      ))}
      <p style={{ margin: 0, fontSize: theme.fontSize.sm, color: theme.colors.textMuted }}>사전 등록은 필요 없습니다. 첫 보고에서 자동 등록되고, 그 뒤 "정보 수정"에서 소속 팀·용도·접속 정보를 채웁니다.</p>
    </div>
  );
}

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  intro?: React.ReactNode;
}

export function InstallGuideModal({ isOpen, onClose, intro }: InstallGuideModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="에이전트(argus) 설치 명령" maxWidth={680}>
      <InstallGuide intro={intro} />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
        <Button onClick={onClose}>확인</Button>
      </div>
    </Modal>
  );
}
