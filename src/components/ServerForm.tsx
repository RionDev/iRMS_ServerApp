import { Button } from "@common/components/Button";
import { Input } from "@common/components/Input";
import { Modal } from "@common/components/Modal";
import { useThemeStore } from "@common/stores/themeStore";
import { useEffect, useState } from "react";
import { formatPorts, parsePorts, type PortEntry } from "../utils/ports";
import type { Server, ServerWriteRequest } from "../types/server";

interface ServerFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** 있으면 수정, 없으면 등록 */
  server?: Server | null;
  onSubmit: (data: ServerWriteRequest) => Promise<void>;
}

/**
 * 목업 "서버 등록" 모달. 에이전트가 먼저 보고한 서버는 자동 등록되므로
 * 등록은 에이전트를 설치할 수 없는 장비(NAS 등)용이고, 수정은 자동 등록된 서버의 담당자·용도 보완용이다.
 */
export function ServerForm({ isOpen, onClose, server, onSubmit }: ServerFormProps) {
  const { theme } = useThemeStore();
  const [ip, setIp] = useState("");
  const [purpose, setPurpose] = useState("");
  const [manager, setManager] = useState("");
  const [ports, setPorts] = useState<PortEntry[]>([]);
  const [allowedIps, setAllowedIps] = useState("");
  const [outboundIps, setOutboundIps] = useState("");
  const [location, setLocation] = useState("");
  const [access, setAccess] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("2");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIp(server?.ip ?? "");
    setPurpose(server?.purpose ?? "");
    setManager(server?.manager ?? "");
    setPorts(server?.ports ? parsePorts(server.ports) : []);
    setAllowedIps(server?.allowed_ips ?? "");
    setOutboundIps(server?.outbound_ips ?? "");
    setLocation(server?.location ?? "");
    setAccess(server?.access ?? "");
    setAccount(server?.account ?? "");
    setPassword("");
    setDescription(server?.description ?? "");
    setStatus(String(server?.status ?? 2));
  }, [isOpen, server]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: ServerWriteRequest = {
      purpose: purpose || undefined,
      manager: manager || undefined,
      ports: formatPorts(ports) || undefined,
      allowed_ips: allowedIps || undefined,
      outbound_ips: outboundIps || undefined,
      location: location || undefined,
      access: access || undefined,
      account: account || undefined,
      description: description || undefined,
      status: Number(status),
    };
    if (password) data.password = password;
    if (!server) data.ip = ip.trim();
    setSaving(true);
    try { await onSubmit(data); } finally { setSaving(false); }
  };

  const selectStyle: React.CSSProperties = {
    width: "100%", padding: "8px", borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.border}`,
    fontFamily: theme.fontFamily, fontSize: theme.fontSize.base, color: theme.colors.text, backgroundColor: theme.colors.surface, boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: "4px" };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={server ? "서버 정보 수정" : "서버 등록"}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {server ? (
          <div><span style={labelStyle}>IP</span><span style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{server.ip}</span></div>
        ) : (
          <Input label="IP" value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.100.x" required />
        )}
        <Input label="용도" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="예: 빌드 서버" />
        <Input label="담당자" value={manager} onChange={(e) => setManager(e.target.value)} placeholder="이름" />
        <Input label="설치 위치" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="예: Server Room" />
        <Input label="접속 방법" value={access} onChange={(e) => setAccess(e.target.value)} placeholder="SSH, RDP, VNC…" />
        <div>
          <label style={labelStyle}>사용 포트 (용도 | 포트)</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {ports.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <input value={p.purpose} onChange={(e) => setPorts(ports.map((x, k) => (k === i ? { ...x, purpose: e.target.value } : x)))} placeholder="용도 (HTTP, SSH, SVN …)" style={{ ...selectStyle, flex: 2 }} />
                <span style={{ color: theme.colors.textMuted }}>|</span>
                <input value={p.port} onChange={(e) => setPorts(ports.map((x, k) => (k === i ? { ...x, port: e.target.value } : x)))} placeholder="포트" inputMode="numeric" style={{ ...selectStyle, flex: 1, fontFamily: "ui-monospace, Menlo, monospace" }} />
                <button type="button" onClick={() => setPorts(ports.filter((_, k) => k !== i))} title="삭제" style={{ border: "none", background: "none", color: theme.colors.textMuted, cursor: "pointer", fontSize: theme.fontSize.base }}>✕</button>
              </div>
            ))}
            <button type="button" onClick={() => setPorts([...ports, { purpose: "", port: "" }])} style={{ alignSelf: "flex-start", border: `1px dashed ${theme.colors.border}`, background: "none", color: theme.colors.textMuted, borderRadius: theme.radius.sm, padding: "4px 10px", cursor: "pointer", fontFamily: theme.fontFamily, fontSize: theme.fontSize.sm }}>+ 포트 추가</button>
          </div>
        </div>
        <Input label="접근 허용 IP (이 서버로 들어올 수 있는 IP)" value={allowedIps} onChange={(e) => setAllowedIps(e.target.value)} placeholder="예: 192.168.100.0/24, 192.168.110.5" />
        <Input label="허용된 외부 IP (이 서버가 나가는 외부 IP)" value={outboundIps} onChange={(e) => setOutboundIps(e.target.value)} placeholder="예: 1.2.3.4 (업데이트 서버)" />
        <Input label="계정" value={account} onChange={(e) => setAccount(e.target.value)} autoComplete="off" />
        <Input label={server ? "비밀번호 (바꿀 때만 입력)" : "비밀번호"} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        <Input label="설명" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="용도 메모" />
        <div>
          <label style={labelStyle}>상태</label>
          <select style={selectStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="2">활성</option>
            <option value="3">비활성</option>
          </select>
        </div>
        {!server && (
          <p style={{ margin: 0, fontSize: theme.fontSize.sm, color: theme.colors.textMuted }}>
            에이전트를 설치하면 자동으로 등록되므로, 직접 등록은 에이전트를 설치할 수 없는 장비(NAS·스위치 등)에만 쓰세요.
          </p>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
          <Button type="button" variant="secondary" onClick={onClose}>취소</Button>
          <Button type="submit" disabled={saving}>{server ? "저장" : "등록"}</Button>
        </div>
      </form>
    </Modal>
  );
}
