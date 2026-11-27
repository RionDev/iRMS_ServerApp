/**
 * allowed_ips / outbound_ips 는 TEXT 한 칸이지만 화면은 "IP | 설명" 줄로 다룬다.
 * 저장 형식: "192.168.100.0/24 | 사내망, https://ccol.krcert.or.kr:8443 | 외부 수집" (주소 | 설명, 콤마 구분). 옛 "IP:설명" 과 설명 없는 값도 읽는다.
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
      // 새 형식 "주소 | 설명" — 주소에 포트 콜론(host:8443)이나 https:// 가 들어갈 수 있어 구분자를 |로
      const bar = t.indexOf("|");
      if (bar > 0) return { ip: t.slice(0, bar).trim(), note: t.slice(bar + 1).trim() };
      // 옛 형식 "주소:설명" (옛 저장은 주소에 콜론이 없었음) — "://" 가 있으면 콜론은 주소의 일부
      const i = t.includes("://") ? -1 : t.indexOf(":");
      if (i > 0) return { ip: t.slice(0, i).trim(), note: t.slice(i + 1).trim() };
      const m = t.match(/^(\S+)\s+(.+)$/);
      if (m) return { ip: m[1], note: m[2] };
      return { ip: t, note: "" };
    });
}

export function formatIpList(entries: IpEntry[]): string {
  return entries
    .map((e) => ({ ip: e.ip.trim().replace(/[,|]/g, ""), note: e.note.trim().replace(/[,|]/g, " ") }))
    .filter((e) => e.ip)
    .map((e) => (e.note ? `${e.ip} | ${e.note}` : e.ip))
    .join(", ");
}
