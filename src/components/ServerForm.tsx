import { Button } from "@common/components/Button";
import { Input } from "@common/components/Input";
import { Modal } from "@common/components/Modal";
import { useThemeStore } from "@common/stores/themeStore";
import { useEffect, useState } from "react";
import { formatPorts, parsePorts, type PortEntry } from "../utils/ports";
import { formatIpList, parseIpList, type IpEntry } from "../utils/iplist";
import type { ServerAccountInput, ServerHistory } from "../types/server";
import { addServerHistory, deleteServerHistory, getAllServers, getServerHistory } from "../services/serverService";
import type { Server, ServerWriteRequest } from "../types/server";

interface ServerFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** 있으면 수정, 없으면 등록 */
  server?: Server | null;
  /** 저장 결과(등록이면 새 서버)를 돌려주면 장비 이력 추가에 쓴다 */
  onSubmit: (data: ServerWriteRequest) => Promise<Server | void>;
}

/**
 * 목업 "서버 등록" 모달. 에이전트가 먼저 보고한 서버는 자동 등록되므로
 * 등록은 에이전트를 설치할 수 없는 장비(NAS 등)용이고, 수정은 자동 등록된 서버의 담당자·용도 보완용이다.
 */
/** 접속 방식 → 기본 포트. 포트 칸이 비어 있을 때만 채운다 */
const DEFAULT_PORT: Record<string, string> = { ssh: "22", ftp: "21", telnet: "23", http: "80", https: "443" };
const SERVER_ROOM = "Server Room";

export function ServerForm({ isOpen, onClose, server, onSubmit }: ServerFormProps) {
  const { theme } = useThemeStore();
  const [ip, setIp] = useState("");
  const [purpose, setPurpose] = useState("");
  const [manager, setManager] = useState("");
  const [ports, setPorts] = useState<PortEntry[]>([]);
  const [allowedIps, setAllowedIps] = useState<IpEntry[]>([]);
  const [outboundIps, setOutboundIps] = useState<IpEntry[]>([]);
  const [location, setLocation] = useState("");
  const [accounts, setAccounts] = useState<ServerAccountInput[]>([]);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("2");
  const [saving, setSaving] = useState(false);
  /** 장비 이력 줄 — idx 있으면 기존, 없으면 새로 적은 줄. 저장 때 추가·삭제 API 를 각각 부른다 */
  /** 설치 위치 선택지 — "Server Room" + 등록된 서버들이 이미 쓰는 위치 값 (새 값을 저장하면 다음부터 선택지에 뜬다).
   *  값이 서버 IP 면(그 서버 위의 VM) 그 서버 이름을 설명으로 붙인다 */
  const [locationOptions, setLocationOptions] = useState<{ value: string; label?: string }[]>([]);
  const [history, setHistory] = useState<{ idx?: number; happened_at: string; content: string }[]>([]);
  const [removedHistory, setRemovedHistory] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setIp(server?.ip ?? "");
    setPurpose(server?.purpose ?? "");
    setManager(server?.manager ?? "");
    setPorts(server?.ports ? parsePorts(server.ports) : []);
    setAllowedIps(parseIpList(server?.allowed_ips));
    setOutboundIps(parseIpList(server?.outbound_ips));
    setLocation(server?.location ?? "");
    setAccounts((server?.accounts ?? []).map((a) => ({ access: a.access, port: a.port ?? "", account: a.account ?? "", password: "" })));
    setDescription(server?.description ?? "");
    setStatus(String(server?.status ?? 2));
    setHistory([]); setRemovedHistory([]);
    getAllServers()
      .then((all) => {
        const byIp = new Map(all.map((x) => [x.ip, x]));
        const values = [...new Set(all.map((x) => (x.location ?? "").trim()).filter((v) => v && v !== SERVER_ROOM))]
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        setLocationOptions(values.map((v) => { const h = byIp.get(v); return { value: v, label: h ? (h.hostname ?? h.purpose ?? undefined) : undefined }; }));
      })
      .catch(() => setLocationOptions([]));
    if (server) getServerHistory(server.idx, 100).then((p) => setHistory(p.items.map((h: ServerHistory) => ({ idx: h.idx, happened_at: h.happened_at, content: h.content })))).catch(() => {});
  }, [isOpen, server]);

  // 비운 칸: 원래 값이 있었으면 "" 로 보내 지운다 (undefined 는 BE 가 '안 바꿈' 으로 처리해 안 지워졌음)
  const clr = (v: string, orig: string | null | undefined) => v || (orig ? "" : undefined);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: ServerWriteRequest = {
      purpose: clr(purpose, server?.purpose),
      manager: clr(manager, server?.manager),
      ports: clr(formatPorts(ports), server?.ports),
      allowed_ips: clr(formatIpList(allowedIps), server?.allowed_ips),
      outbound_ips: clr(formatIpList(outboundIps), server?.outbound_ips),
      accounts: accounts.filter((a) => a.access.trim()).map((a) => ({ access: a.access.trim(), port: a.port?.trim() || undefined, account: a.account?.trim() || undefined, password: a.password || undefined })),
      location: clr(location, server?.location),
      description: clr(description, server?.description),
      status: Number(status),
    };
    if (!server) data.ip = ip.trim();
    setSaving(true);
    try {
      const target = await onSubmit(data);
      // 장비 이력: 지운 기존 줄 삭제, 새로 적은 줄 추가 (서버 idx 가 필요하므로 저장 뒤)
      const idx = server?.idx ?? target?.idx;
      if (idx != null) {
        for (const hid of removedHistory) await deleteServerHistory(idx, hid).catch(() => {});
        for (const h of history) if (h.idx == null && h.content.trim() && h.happened_at) await addServerHistory(idx, h.happened_at, h.content.trim()).catch(() => {});
      }
    } finally { setSaving(false); }
  };

  const selectStyle: React.CSSProperties = {
    width: "100%", padding: "8px", borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.border}`,
    fontFamily: theme.fontFamily, fontSize: theme.fontSize.base, color: theme.colors.text, backgroundColor: theme.colors.surface, boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: "4px" };
  const monoStyle: React.CSSProperties = { fontFamily: "ui-monospace, Menlo, Consolas, monospace" };
  const xBtn: React.CSSProperties = { border: "none", background: "none", color: theme.colors.textMuted, cursor: "pointer", fontSize: theme.fontSize.base };
  const addBtn: React.CSSProperties = { alignSelf: "flex-start", border: `1px dashed ${theme.colors.border}`, background: "none", color: theme.colors.textMuted, borderRadius: theme.radius.sm, padding: "4px 10px", cursor: "pointer", fontFamily: theme.fontFamily, fontSize: theme.fontSize.sm };
  /** "IP | 설명" 줄 편집기 (접근 허용 IP · 허용된 외부 IP 공용) */
  const ipRows = (label: string, rows: IpEntry[], setRows: (r: IpEntry[]) => void, phIp: string, phNote: string) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 12px 1fr 20px", gap: "6px", alignItems: "center" }}>
            <input value={r.ip} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, ip: e.target.value } : x)))} placeholder={phIp} style={{ ...selectStyle, ...monoStyle }} />
            <span style={{ color: theme.colors.textMuted, textAlign: "center" }}>|</span>
            <input value={r.note} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, note: e.target.value } : x)))} placeholder={phNote} style={selectStyle} />
            <button type="button" onClick={() => setRows(rows.filter((_, k) => k !== i))} title="삭제" style={xBtn}>✕</button>
          </div>
        ))}
        <button type="button" onClick={() => setRows([...rows, { ip: "", note: "" }])} style={addBtn}>+ IP 추가</button>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={server ? "서버 정보 수정" : "서버 등록"}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {server ? (
          <Input label="IP (변경 불가)" value={server.ip} readOnly disabled />
        ) : (
          <Input label="IP" value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.100.x" required />
        )}
        <Input label="용도" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="예: 빌드 서버" />
        <Input label="담당자" value={manager} onChange={(e) => setManager(e.target.value)} placeholder="이름" />
        <Input label="설치 위치" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Server Room 또는 호스트 IP" list="locations" />
        <datalist id="locations">
          <option value={SERVER_ROOM} />
          {locationOptions.map((o) => <option key={o.value} value={o.value} label={o.label} />)}
        </datalist>
        <div>
          <label style={labelStyle}>접속 계정 — 방법 | 포트 | 계정 | 비밀번호 (한 서버에 여러 줄){server ? ". 비밀번호는 바꿀 때만 입력" : ""}</label>
          <datalist id="access-methods"><option value="SSH" /><option value="RDP" /><option value="VNC" /><option value="Web" /><option value="HTTP" /><option value="HTTPS" /><option value="Telnet" /><option value="FTP" /><option value="iDRAC" /></datalist>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {accounts.map((a, i) => {
              const set = (patch: Partial<ServerAccountInput>) => setAccounts(accounts.map((x, k) => (k === i ? { ...x, ...patch } : x)));
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "110px 80px 1fr 1fr 20px", gap: "6px", alignItems: "center" }}>
                  <input value={a.access} list="access-methods" onChange={(e) => { const access = e.target.value; const p = DEFAULT_PORT[access.trim().toLowerCase()]; set(p && !a.port?.trim() ? { access, port: p } : { access }); }} placeholder="SSH, RDP …" style={selectStyle} />
                  <input value={a.port ?? ""} onChange={(e) => set({ port: e.target.value })} placeholder="포트" inputMode="numeric" style={{ ...selectStyle, ...monoStyle }} />
                  <input value={a.account ?? ""} onChange={(e) => set({ account: e.target.value })} placeholder="계정" autoComplete="off" style={{ ...selectStyle, ...monoStyle }} />
                  <input value={a.password ?? ""} type="password" onChange={(e) => set({ password: e.target.value })} placeholder={server ? "(유지)" : "비밀번호"} autoComplete="new-password" style={{ ...selectStyle, ...monoStyle }} />
                  <button type="button" onClick={() => setAccounts(accounts.filter((_, k) => k !== i))} title="삭제" style={xBtn}>✕</button>
                </div>
              );
            })}
            <button type="button" onClick={() => setAccounts([...accounts, { access: "", port: "", account: "", password: "" }])} style={addBtn}>+ 계정 추가</button>
          </div>
        </div>
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
        {ipRows("접근 허용 IP (이 서버로 들어올 수 있는 IP) — IP | 설명", allowedIps, setAllowedIps, "192.168.100.0/24", "사내망")}
        {ipRows("허용된 외부 IP (이 서버가 나가는 외부 IP) — IP | 설명", outboundIps, setOutboundIps, "1.2.3.4", "업데이트 서버")}
        <div>
          <label style={labelStyle}>장비 이력 — 날짜 | 내용 (작성자는 저장 시 로그인 이름)</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {history.map((h, i) => (
              <div key={h.idx ?? `n${i}`} style={{ display: "grid", gridTemplateColumns: "140px 1fr 20px", gap: "6px", alignItems: "center" }}>
                <input type="date" value={h.happened_at} disabled={h.idx != null} onChange={(e) => setHistory(history.map((x, k) => (k === i ? { ...x, happened_at: e.target.value } : x)))} style={{ ...selectStyle, ...monoStyle }} />
                <input value={h.content} disabled={h.idx != null} onChange={(e) => setHistory(history.map((x, k) => (k === i ? { ...x, content: e.target.value } : x)))} placeholder="예: HDD 2번 교체 (WD 4TB)" maxLength={2000} style={selectStyle} />
                <button type="button" onClick={() => { if (h.idx != null) setRemovedHistory([...removedHistory, h.idx]); setHistory(history.filter((_, k) => k !== i)); }} title="삭제" style={xBtn}>✕</button>
              </div>
            ))}
            <button type="button" onClick={() => setHistory([...history, { happened_at: new Date().toISOString().slice(0, 10), content: "" }])} style={addBtn}>+ 이력 추가</button>
          </div>
        </div>
        <div>
          <label style={labelStyle}>메모</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="엑셀의 etc 란. 자유 메모" style={{ ...selectStyle, resize: "vertical" }} />
        </div>
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
