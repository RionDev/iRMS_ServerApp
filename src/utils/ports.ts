/**
 * servers.ports 는 자유 입력 TEXT 이지만 화면은 "용도 | 포트" 쌍으로 다룬다.
 * 저장 형식: "HTTP:80, HTTPS:443, SSH:22222" (용도:포트, 콤마 구분). 용도 없이 숫자만 적힌 옛 값("80, 443")도 읽는다.
 */
export interface PortEntry {
  purpose: string;
  /** 포트 하나 또는 여러 개 — 저장은 "20+21", 입력은 "20 21" "20,21" "20/21" 전부 받는다 */
  port: string;
}

/** 잘 알려진 용도 ↔ 포트. 용도를 치면 포트가, 포트를 치면 용도가 채워진다 (상대 칸이 비었을 때만) */
export const KNOWN_PORTS: { purpose: string; port: string }[] = [
  { purpose: "FTP", port: "20+21" }, { purpose: "SSH", port: "22" }, { purpose: "Telnet", port: "23" }, { purpose: "SMTP", port: "25" },
  { purpose: "DNS", port: "53" }, { purpose: "HTTP", port: "80" }, { purpose: "HTTPS", port: "443" }, { purpose: "SMB", port: "445" },
  { purpose: "NFS", port: "2049" }, { purpose: "MySQL", port: "3306" }, { purpose: "RDP", port: "3389" }, { purpose: "SVN", port: "3690" },
  { purpose: "VNC", port: "5900" }, { purpose: "PostgreSQL", port: "5432" },
];
export const portForPurpose = (purpose: string): string | undefined => KNOWN_PORTS.find((k) => k.purpose.toLowerCase() === purpose.trim().toLowerCase())?.port;
export const purposeForPort = (port: string): string | undefined => { const n = normalizePort(port); return n ? KNOWN_PORTS.find((k) => k.port === n)?.purpose : undefined; };

/** "20 21" "20,21" "20/21" "20+21" → "20+21". 범위(1000-2000)·/tcp 는 그대로 둔다 */
export function normalizePort(raw: string): string {
  return raw.trim().split(/[\s,+/]+(?!tcp|udp)/i).map((t) => t.trim()).filter(Boolean).join("+");
}
/** 화면 표시: "20+21" → "20 · 21" */
export const displayPort = (port: string) => port.split("+").join(" · ");

export function parsePorts(raw: string | null | undefined): PortEntry[] {
  if (!raw) return [];
  return raw
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const m = t.match(/^(.*?)[\s:|]+([0-9]+(?:-[0-9]+)?(?:\/(?:tcp|udp))?(?:\+[0-9]+(?:-[0-9]+)?)*)$/i);
      if (m) return { purpose: m[1].trim(), port: m[2] };
      if (/^[0-9]+(-[0-9]+)?(\/(tcp|udp))?(\+[0-9]+(-[0-9]+)?)*$/i.test(t)) return { purpose: "", port: t };
      return { purpose: t, port: "" };
    });
}

export function formatPorts(entries: PortEntry[]): string {
  return entries
    .map((e) => ({ purpose: e.purpose.trim().replace(/[,:]/g, " "), port: normalizePort(e.port) }))
    .filter((e) => e.purpose || e.port)
    .map((e) => (e.purpose && e.port ? `${e.purpose}:${e.port}` : e.purpose || e.port))
    .join(", ");
}
