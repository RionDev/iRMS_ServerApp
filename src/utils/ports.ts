/**
 * servers.ports 는 자유 입력 TEXT 이지만 화면은 "용도 | 포트" 쌍으로 다룬다.
 * 저장 형식: "HTTP:80, HTTPS:443, SSH:22222" (용도:포트, 콤마 구분). 용도 없이 숫자만 적힌 옛 값("80, 443")도 읽는다.
 */
export interface PortEntry {
  purpose: string;
  port: string;
}

export function parsePorts(raw: string | null | undefined): PortEntry[] {
  if (!raw) return [];
  return raw
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const m = t.match(/^(.*?)[\s:|]+([0-9]+(?:-[0-9]+)?(?:\/(?:tcp|udp))?)$/i);
      if (m) return { purpose: m[1].trim(), port: m[2] };
      if (/^[0-9]+(-[0-9]+)?(\/(tcp|udp))?$/i.test(t)) return { purpose: "", port: t };
      return { purpose: t, port: "" };
    });
}

export function formatPorts(entries: PortEntry[]): string {
  return entries
    .map((e) => ({ purpose: e.purpose.trim().replace(/[,:]/g, " "), port: e.port.trim() }))
    .filter((e) => e.purpose || e.port)
    .map((e) => (e.purpose && e.port ? `${e.purpose}:${e.port}` : e.purpose || e.port))
    .join(", ");
}
