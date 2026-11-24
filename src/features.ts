/**
 * 서버 앱 기능 키 — BE resource_service src/features.py 와 같은 값.
 * 화면은 useFeatures(SERVER_APP).can(키) 로 메뉴·버튼을 숨기고, 실제 차단은 BE 가 한다.
 */
export const SERVER_APP = "/server";

export const ServerFeature = {
  VIEW: "server_view",
  CREDENTIALS: "server_credentials",
  MANAGE: "server_manage",
  /** 열람·변경 기록 메뉴 (기본 ADMIN) */
  AUDIT: "server_audit",
} as const;
