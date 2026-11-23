import type { SidebarItem } from "@common/components/AppLayout";

const icon = (paths: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: paths }} />
);

const serverIcon = icon('<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>');
const folderIcon = icon('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>');
const cpuIcon = icon('<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>');

/** 목업 nav: 서버 목록 · 그룹 관리 · 에이전트 */
export const serverNavItems: SidebarItem[] = [
  { label: "서버 목록", to: "/", icon: serverIcon },
  { label: "그룹 관리", to: "/groups", icon: folderIcon },
  { label: "에이전트", to: "/agents", icon: cpuIcon },
];
