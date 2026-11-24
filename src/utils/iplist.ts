/**
 * allowed_ips / outbound_ips 는 TEXT 한 칸이지만 화면은 "IP | 설명" 줄로 다룬다.
 * 저장 형식: "192.168.100.0/24:사내망, 192.168.110.71:사무실 PC" (IP:설명, 콤마 구분). 설명 없는 옛 값("1.2.3.4, 5.6.7.8")도 읽는다.
 */
export interface IpEntry {
  ip: string;
  note: string;
}

export function parseIpList(raw: string | null | undefined): IpEntry[] {
  if (!raw) return [];
  return raw
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const i = t.indexOf(":");
      if (i > 0) return { ip: t.slice(0, i).trim(), note: t.slice(i + 1).trim() };
      const m = t.match(/^(\S+)\s+(.+)$/);
      if (m) return { ip: m[1], note: m[2] };
      return { ip: t, note: "" };
    });
}

export function formatIpList(entries: IpEntry[]): string {
  return entries
    .map((e) => ({ ip: e.ip.trim().replace(/[,:]/g, ""), note: e.note.trim().replace(/,/g, " ") }))
    .filter((e) => e.ip)
    .map((e) => (e.note ? `${e.ip}:${e.note}` : e.ip))
    .join(", ");
}
