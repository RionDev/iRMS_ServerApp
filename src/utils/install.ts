/** 에이전트(argus) 설치 안내 — OS 별로 나눠 각각 복사할 수 있게 한다. 서버 등록 직후·미수신 서버 상세·에이전트 화면에서 같은 것을 쓴다 */
export interface InstallStep {
  os: string;
  note: string;
  cmd: string;
}

export const INSTALL_STEPS: InstallStep[] = [
  {
    os: "Linux · macOS · Unix",
    note: "argus 폴더를 서버로 복사한 뒤 (config.env 의 API_URL · API_KEY · SERVICES 먼저 확인)",
    cmd: "cd argus/posix && chmod +x *.sh && ./check.sh && ./install.sh && ./test.sh",
  },
  {
    os: "Windows",
    note: "관리자 PowerShell 에서",
    cmd: "cd argus\\win32\npowershell -ExecutionPolicy Bypass -File install.ps1\npowershell -ExecutionPolicy Bypass -File test.ps1",
  },
  {
    os: "ESXi (수집기 .156 에서)",
    note: "esxi\\esxi.env 에 호스트|계정|비밀번호 한 줄씩 적은 뒤, 관리자 PowerShell 에서",
    cmd: "cd argus\\esxi\npowershell -ExecutionPolicy Bypass -File install.ps1\npowershell -ExecutionPolicy Bypass -File test.ps1",
  },
];

/** 한 덩어리 텍스트가 필요한 곳(전체 복사)용 */
export const INSTALL_GUIDE = INSTALL_STEPS.map((s) => `# ${s.os} — ${s.note}\n${s.cmd}`).join("\n\n")
  + "\n\n# 사전 등록은 필요 없다 — 첫 보고에서 자동 등록된다.";
