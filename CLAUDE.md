# iRMS 서버 App

서버 모니터링 앱. 두 화면: 서버 목록 · 에이전트. (목업의 그룹 관리와 태그는 2026-11-23 실기 검토에서 뺐다 — 소속 팀 필터로 충분)

## 책임

- 서버 목록: 상태 카드(전체/정상/경고·위험/오프라인/미수신) → 검색바(소속 팀·OS·호스트명/IP/용도) → 상태 칩 → 표(상태·호스트명·IP·소속 팀·OS·CPU·메모리·디스크·마지막 수신). 60초마다 자동 새로고침
- 서버 상세(Drawer): 배지·호스트명·액션(접속 정보 — BE 의 `can_view_credentials`(서버 소속 팀 LEAD 이상·ADMIN) 일 때만 / 정보 수정 / 삭제) → 기본 정보 → 현재 자원 미터 → CPU 최근 30분 → 감시 서비스(서버 config.env SERVICES 에 지정한 프로세스의 실행/중지, ESXi 는 VM) → 디스크 S.M.A.R.T → RAID → 최근 이벤트(에이전트가 보낸 비정상 종료·장비 교체) → 장비 이력(사람이 적는 기록: 날짜·내용·작성자, `/history` API, 추가·삭제는 server_manage). 미수신 서버에는 설치 안내. 기본 정보의 "장비 식별자"는 에이전트가 읽은 하드웨어 시리얼
- 서버 등록·수정(Modal): 등록 직후 에이전트 설치 안내 모달(`utils/install.ts`)을 띄운다. 에이전트가 먼저 보고한 서버는 BE 가 바로 활성으로 자동 등록하므로 "정보 수정"으로 소속 팀·담당자·용도·접속 정보(접속 방법·사용 포트·접근 허용 IP·허용된 외부 IP)를 보완한다(팀이 비어 있으면 상세에 안내). 승인대기 단계는 없고, 비활성은 폐기 서버 보관용
- 에이전트: 서버별 에이전트 버전(최신 대비 "업데이트 필요")·서버 시계·마지막 수신, [설치 명령 보기] → OS 별(Linux/Unix · Windows · ESXi) 명령과 각각의 복사 버튼(`components/InstallGuide.tsx`, 내용은 `utils/install.ts`). 같은 모달을 서버 등록 직후와 미수신 서버 상세에도 쓴다

## 상태 표현 (BE `state` 그대로)

| state | 배지 | 뜻 |
| --- | --- | --- |
| ok / warning / danger | 정상 / 경고 / 위험 | 90초 안에 보고가 있고 임계값으로 판정 |
| offline | 오프라인 | 보고하다 끊김 (90초 초과) |
| unreported | 미수신 | IP 는 등록됐지만 보고가 한 번도 없음 (꺼져 있거나 에이전트 미설치). 별도 TCP/ICMP 확인 없음 |

미수신 배지는 점선 테두리. CPU·메모리 미터는 online 일 때만, 디스크는 마지막 값이라 항상 그린다.

## 구조

- `src/features.ts` — 기능 키 (BE resource_service `src/features.py` 와 동일)
- `src/types/server.ts` — BE 응답 타입, `src/services/serverService.ts` — API 호출 (`/api/resource/*`)
- `src/utils/format.ts` — 상태 라벨·팀 이름·"n초 전"·가동 시간·시계 차이 표기
- `src/components/` — StateBadge · Meter · Sparkline · ServerStats · ServerSearchBar · ServerTable · ServerDetail · ServerForm · InstallGuide
- `src/pages/` — ServerListPage · AgentPage, `src/navigation.tsx` — 사이드바

## 고유 규칙

- 독립 실행 시 Vite dev server 포트 3007 사용, 게이트웨이 경로 `/server/`
- 그룹(teams) 필터는 BE 목록 API 에 없어 FE 에서 거른다 (서버 수가 100 안팎)
- 이력(`/metrics`)은 시간 창 조회라 페이지네이션 대상이 아니다. 목록·이벤트는 cursor 페이지네이션

## 앱·기능 권한 (필수)

- 페이지 진입은 `useAppAccess("/server")`, **API 를 부르는 메뉴·버튼은 모두 `useFeatures("/server").can(<기능 키>)` 로 숨긴다**
- 역할(`user.role === ...`)로 직접 분기하지 않는다 — 직위·팀 제한은 관리자가 admin 앱 → 앱 상세 → 기능 권한에서 정한다
- 기능 키는 `src/features.ts` 에 두고 BE 서비스 `src/features.py` 와 같은 값을 쓴다. 새 기능이면 BE 에 먼저 추가한다
- FE 는 숨기기만 한다. 실제 차단은 BE `feature_dependency` 가 JWT·API 키 모두 같은 규칙으로 한다 (403). 상세: `common/docs/auth.md` "useFeatures"
