/** 에이전트(argus) 설치 안내 — 서버 등록 직후·미수신 서버 상세·에이전트 화면에서 같은 문구를 쓴다 */
export const INSTALL_GUIDE = `# Linux / macOS / Unix  (argus 폴더를 서버로 복사한 뒤)
cd argus/posix && chmod +x *.sh && ./check.sh && ./install.sh && ./test.sh

# Windows (관리자 PowerShell)
cd argus\\win32
powershell -ExecutionPolicy Bypass -File install.ps1
powershell -ExecutionPolicy Bypass -File test.ps1

# config.env 의 API_URL / API_KEY 를 먼저 확인할 것. 사전 등록은 필요 없다 — 첫 보고에서 자동 등록된다.`;
