import type { SidebarItem } from "@common/components/AppLayout";
import { useFeatures } from "@common/hooks/useFeatures";
import { SERVER_APP, ServerFeature } from "./features";

const icon = (paths: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: paths }} />
);

const serverIcon = icon('<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>');
const cpuIcon = icon('<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>');

/** nav: 서버 목록 · 에이전트 */
const logIcon = icon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>');

export const serverNavItems: SidebarItem[] = [
  { label: "서버 목록", to: "/", icon: serverIcon },
  { label: "에이전트", to: "/agents", icon: cpuIcon },
];

/** 열람 기록 메뉴는 기능 권한(server_audit, 기본 ADMIN)이 있을 때만 보인다 */
export function useServerNavItems(): SidebarItem[] {
  const { can } = useFeatures(SERVER_APP);
  return can(ServerFeature.AUDIT) ? [...serverNavItems, { label: "열람 기록", to: "/audit", icon: logIcon }] : serverNavItems;
}
