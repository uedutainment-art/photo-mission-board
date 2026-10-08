# Photo Mission Board · 현재 상황 핸드오프

> 이 문서 하나만 새 채팅에 붙여 넣으면 어디까지 왔는지 그대로 이어갈 수 있도록 정리한 스냅샷.
> 마지막 갱신: 2026-10-09 (투표권 단위와 본부 미투표 팀 확인 추가)

---

## 한 줄 요약

**Vite + React + TypeScript + Firebase로 만든 팀별 콜라주 이벤트 웹 앱.** 단독 행사와 외부 행사 연결형 모두 지원하는 TRIP! 동행 보드로 확장 중. 자동 콜라주 / 사진 수집 모드, 참가자별·팀별 1표 투표와 본부 미투표 팀 확인까지 코드에 반영.

---

## 폴더 위치

`/Users/uedutainment_dev/Dev/photo-mission-board`

핵심 문서:
- `mockups.html` — 10개 SCENE 시각 디자인 (브라우저에서 옆에 띄워두고 참고)
- `SPEC.md` — 설계 본문 (데이터 모델 / 라우팅 / 보안 / 화면별 동작). Phase 12에서 푸시·PWA 5줄 추가됨
- `PHASES.md` — Phase 0~17 단계별 실행 계획
- `PROMPT.md` — Claude Code 부트스트랩 프롬프트
- `README.md` — Firebase 새 프로젝트 셋업 + 배포 가이드 (Phase 12 갱신: VAPID 키 발급 + API Key 제한 절차 추가)
- `PHASE_AUDIT_1-12.md` — Phase 1~12 코드 점검 결과 (untracked, 참고용)

코드 (15개 페이지 + 8개 컴포넌트 + 15개 lib + 6개 hook):
- `src/lib/` — firebase, auth, types, createEvent, storage, upload, selfies, qr, qrSheetPdf, teamSession, collage, crop, zip, download, live, face, messaging, pwa
- `src/pages/` — Login, Events, EventCreate, EventTeams, TeamQRDetail, TeamEntry, TeamSelfie, TeamPlaces, TeamPlaceDetail, EventOverview, EventBoard, EventReview, EventExport, PublicBoard, ShareEvent, NotFound
- `src/components/` — RequireAuth, AccountBar, PlaceEditModal, SelfieBanner, StubPageLayout, BoardCell, OperatorTabNav, PublicHeader, PublicFooter, NotificationSettings
- `src/hooks/` — useAuth(in auth.ts), useEvents, useEventTeams, useSelfies, useTeamSession, useTeamMission, useEventLive

PWA 산출물:
- `public/manifest.json`, `public/service-worker.js`, `public/icons/{icon,maskable-icon}.svg`
- `public/models/tiny_face_detector_model-*` (face-api.js)

---

## Firebase 프로젝트

- **프로젝트 ID**: `photo-mission-board-prod`
- **콘솔**: https://console.firebase.google.com/project/photo-mission-board-prod
- 활성화된 서비스:
  - Authentication (Google + Anonymous)
  - Firestore Database (asia-northeast3 / 프로덕션 모드, **보안 규칙 SPEC §8 그대로 배포 완료**)
  - Storage (asia-northeast3, 15MB + image/zip MIME 제한)
  - Hosting (`firebase deploy` 완료, dist/ 배포됨)
  - (선택) Cloud Messaging — VAPID 키 발급 전까지 Firebase 기본 키로 시도
- 키는 `.env`에 들어있음 (git에 안 올라감)
- 공개 호스트: `VITE_PUBLIC_HOST=https://photo-mission-board-prod.web.app`

---

## Phase 진행 상태

| Phase | 내용 | 상태 | 커밋 |
|---|---|---|---|
| 0 | Firebase 프로젝트 셋업 (수동) | ✓ 완료 | — |
| 1 | Vite + React + TS + Tailwind 스캐폴딩, 라우팅, Firebase 연결 | ✓ 완료 | — |
| 2 | Google 로그인, users/{uid} 자동 생성, 이벤트 목록 | ✓ 완료 | — |
| 3 | 이벤트 생성 3단계 마법사 + 장소 편집 모달 + 슬롯 자동 생성 | ✓ 완료 | — |
| 4 | 팀 QR 발급, 공유 (URL/이미지/카톡) | ✓ 완료 | — |
| 5 | 팀 입장(/t/:token), 셀카 단계 (individual / group / none) | ✓ 완료 | — |
| 6 | 사진 업로드 + 대표 선택 + Firestore transaction | ✓ 완료 | + `f733acb` (atomize repr.) |
| 7 | 운영자 Live (Overview / 보드 / 검수) | ✓ 완료 | — |
| 8 | Export (콜라주 PNG + 원본 ZIP + 셀카 모음) | ✓ 완료 | + `7fc5bdc` (cropMeta) + `077d5ea` (zip per-file try) |
| 9 | 공개 보드 (빔프로젝터 풀스크린) | ✓ 완료 | `ff86985` |
| 10 | Firestore/Storage 보안 규칙 + Firebase Hosting 배포 | ✓ 완료 | `a245a08` |
| 11 | face-api.js 셀카 자동 크롭 | ✓ 완료 | `3273f21` + `1539d8f` (preload) |
| 12 | 푸시 알림 (FCM 토큰) + PWA (manifest + SW) | ✓ 코드 완료 | `7d4a82c` + `f964d75` (PROD 가드) |
| 13 | 공개 보드 추가 모드 + 줌아웃 피날레 | ☐ 미진행 | — |
| 14 | 운영자 검수 크롭 슬라이더 | ☐ 미진행 | — |
| 15 | A4 QR PDF | ✓ 완료 | `44a2935` |
| 16 | 영구 공유 링크 (`/share/:eventId`) | ☐ 미진행 (라우트 stub만 존재) | — |
| 17 | 데이터 보관 Cloud Function (행사 종료 60일 후 원본 자동 삭제) | ☐ 미진행 | — |
| 17.5 | 마법사/장소/팀장 UX 개선 | ✓ 완료 | — |
| (신규) | 참가자 진행 강화 + 비상 연락 | ✓ 완료 | — |
| (신규) | 행사 유형 + 결과물 모드 + 투표 MVP | ✓ 완료 | — |
| (신규) | 투표권 단위 + 본부 미투표 팀 확인 | ✓ 완료 | — |
| (잔) | Phase 12 Cloud Function 발송 트리거 | ☐ 미진행 | — |

---

## 행사 직전 남은 작업 (운영자가 직접 콘솔에서)

**필수**

1. **Firebase Console > Project settings > Cloud Messaging > Web Push certificates** 에서 Generate key pair → Public key 를 `.env` 의 `VITE_FIREBASE_VAPID_KEY=...` 에 입력 → `npm run build && firebase deploy` 다시. 없어도 동작은 하지만 안정성 차이 큼.
2. **Google Cloud Console > APIs & Services > Credentials** 에서 Firebase Web API Key 의 Application restrictions 를 Websites 로 바꾸고 HTTP referrers 에 운영 도메인 + 로컬 개발 주소만 허용. service-worker.js 에 평문 노출된 키 도난 영향 차단. (README 1.6 절에 상세 절차)

**행사 운영 전 한 번 더 확인**

3. `.env` 의 `VITE_PUBLIC_HOST` 가 운영 도메인(`https://photo-mission-board-prod.web.app`)인지 확인 — QR URL 이 이 도메인을 가리킨다.
4. Authentication > Settings > Authorized domains 에 운영 도메인 + localhost 만 남았는지.
5. 실제 휴대폰 2대로 QR 스캔 → 셀카 → 사진 업로드 → 운영자 보드 실시간 반영, 공개 보드 페이드인까지 한 번씩 돌려보기.

---

## 핵심 결정사항 (이미 정해진 것)

### 데이터 / 모델
- **이벤트 구조**: `grid (rows × cols)` × `teamCount` × `places[]` (장소마다 perTeamCount). `rows*cols / teamCount` 가 정수여야 하고, 장소 perTeamCount 합 = 팀당 정원
- **슬롯**: 이벤트 생성 시 `teamCount × perTeamCount` 개를 batch write 로 일괄 생성
- **사진**: 한 슬롯에 여러 장 가능, `isRepresentative: true` 는 항상 1개 (transaction 으로 보장). 첫 사진 자동 대표도 트랜잭션 안에서 결정 (`f733acb`)
- **셀카**: 슬롯과 별개 컬렉션 `selfies`, 팀의 `joinedMembers` 배열에도 추가
- **크롭**: 원본은 안 자르고 `cropMeta { x, y, scale }` 만 저장. 화면 표시(CSS) 와 콜라주(canvas) 양쪽에서 일관 적용
- **얼굴 크롭**: face-api.js TinyFaceDetector 로 셀카 업로드 시 자동 박스 → cropMeta 계산. 다중 얼굴(단체샷)은 박스 합쳐서 커버리지 0.68 / 단일 0.46

### 인증
- **운영자**: Firebase Auth + Google Provider
- **팀원**: Anonymous Auth + 팀 토큰(32자 랜덤). QR URL 에 토큰 내장
- **푸시**: 운영자 본인 기기에 FCM 토큰 발급 → `users/{uid}/fcmTokens/{sha256hash}` 저장. rules 는 본인만 read/write
- v1 은 토큰 unguessability 의존 (약한 보안). 강화는 v2 에 Cloud Function 으로

### UX
- **모바일 우선** 디자인 (340px 폰 프레임)
- **셀카 모드 3가지**: individual / group / none — 운영자가 이벤트 생성 시 선택
- **셀카 강제** (none 모드 제외) — 셀카 안 올린 사람은 미션 단계로 못 감
- **셀카 콜라주**: 인원 수에 따라 자동 그리드 (4명 2×2, 6명 3×2, 10명 5×2…)
- **레이아웃 모드**: random (기본) / team / manual (v2)
- **행사 사용 방식**: standalone / attached. 외부 행사에 붙일 때는 `externalEvent`에 행사명, 링크, 브랜드를 선택 저장
- **결과물 방식**: collage / collection. collage는 팀 수에 맞춰 칸 수를 자동 보정 제안하고, collection은 콜라주 검증 없이 장소별 사진 수집과 ZIP/순위를 중심으로 운영
- **투표**: 행사 후 Export 화면에서 open/closed 전환. 참가자 사진 상세에서 대상 조건에 맞는 사진에 투표하고, Export에서 TOP 순위를 확인
- **검수**: 슬롯 단위 "확인됨/미확인" 토글
- **Export**: 클라이언트 캔버스 합성으로 PNG + JSZip 으로 원본 ZIP (per-file try/catch 적용)
- **A4 QR PDF**: 팀 수에 따른 적응형 그리드, jsPDF 동적 import

### PWA
- manifest + maskable 아이콘
- service-worker: 앱 셸 캐시 + navigation fallback + FCM background message + notificationclick(URL 매칭 후 focus/openWindow)
- registerPwaShell() 은 `import.meta.env.PROD` 가드 적용 → dev 모드 HMR 충돌 없음

### 데이터 보관
- 원본 사진: 행사 종료 후 **60일 자동 삭제** (Phase 17 Cloud Function — 미구현)
- 썸네일 + 콜라주 PNG: 영구
- 운영자에게 ZIP 을 받아 따로 보관하도록 안내

---

## 아직 결정 안 된 / 열려있는 이슈

### 1. 디자인 V2 → 🟢 결정 완료 (2026-05-28)

**D 톤 (현재 슬레이트 베이스 + 디테일 강화) 로 확정.** 폰트는 Pretendard/Noto Sans KR 유지. 컬러 토큰 `src/index.css` 그대로. A(축제) / B(빈티지) / C(다크) 는 제외.

행사 직전엔 현재 코드 그대로 진행. 행사 후 점진 강화 항목 (백로그):
- 팀 컬러를 헤더 전체 배경으로 확장
- 미션 카드 사진을 풀블리드 레이아웃으로
- 마이크로 카피 친근하게 ("안녕하세요", "지금 어디서 찍을까요?", "함께 있어요")
- 모션 시그니처 한 곳 (Export 잠금 또는 사진 업로드 reveal 0.6~0.8s)
- 위치/맥락 정보 한 줄 추가 ("지하철 5호선 종각역 4번 출구" 식)

세부 의사결정 근거 + 5가지 강화 항목 상세는 `DESIGN_REFERENCES.md` 상단 "결정" 섹션 참고.

### 2. v1.5 잔여 Phase 우선순위
실제 행사 한 번 돌려본 뒤 결정하면 좋음.
- Phase 12 잔여 (Cloud Function 발송 트리거) — Blaze 플랜 필요, "운영자에게 새 업로드 알림" UX 효과 큼
- Phase 17 (자동 삭제 Function) — Blaze 플랜 필요, 행사 60일 후 자동
- Phase 13 (공개 보드 추가 모드) — 빔프로젝터 운영 풍부도. 줌아웃 피날레 인상적
- Phase 14 (검수 크롭 슬라이더) — 콜라주 품질 개선
- Phase 16 (영구 공유 링크) — 행사 후 공유 가치 큼, 라우트 stub 만 존재

---

## 코드 점검 결과 요약 (Phase 1~12, 자세히는 PHASE_AUDIT_1-12.md)

**전반적으로 매우 좋음.** SPEC 충실, 엣지 케이스 처리, transaction 적절 사용. `tsc --noEmit` 통과. 초기 점검에서 발견된 우선순위 높은 4건은 모두 패치 커밋으로 반영됨 (cropMeta / 첫 대표 트랜잭션 / zip per-file try / face 모델 preload).

**잔존 🟡 항목 (v1.5~v2 로 미뤄도 안전)**
- 토큰 분포 편향 (`crypto.getRandomValues % 62`) — rejection sampling 권장, 영향 매우 작음
- `@tensorflow/tfjs ^1.7.0` — face-api 호환 위한 의도된 선택, 향후 4.x 호환 포크 검토
- service-worker.js 에 Firebase config 하드코딩 — 단기 콘솔에서 API Key 제한으로 우회, 중기 빌드 타임 템플릿 처리
- FCM 토큰 갱신 시 이전 토큰 정리 미흡 — Cloud Function 도입 시 발송 실패 토큰 자동 삭제 추가

**Phase 15 신규**
- jsPDF 동적 import 깔끔, 미리보기/다운로드 캔버스 해상도 분리. 폰트 fallback 은 운영자 PC 환경 영향 받을 수 있으나 행사 1회용이라 OK.

---

## 워크플로우 (계속 이어갈 때)

1. **Cowork 채팅** (이 곳) — 디자인/스펙 정리, 결정사항 정리, mockups.html 업데이트, 코드 점검
2. **Claude Code** — 실제 코드 구현. PROMPT.md 따라 phase 단위로
3. **사용자** — phase 끝나면 OK 신호. 진행 상황은 "5까지 진행했음" 같은 짧은 메시지로 알림
4. **Cowork에서 코드 리뷰** — 사용자 요청 시 핵심 파일들 직접 읽어 SPEC 일치성 / 품질 확인

새 채팅에서 시작할 때 첫 메시지 권장:
```
이 폴더 (/Users/uedutainment_dev/Dev/photo-mission-board)의 CONTEXT.md를 먼저 읽고 상황 파악해줘. 그 다음 SPEC.md, mockups.html도 필요한 만큼 참고. 지금 [원하는 작업]을 하고 싶어.
```

---

## 테스트 방법 (로컬)

1. `npm run dev` (외부 접속 필요하면 `npm run dev -- --host`)
2. http://127.0.0.1:5173/ 일반 창에서 Google 로그인 → 이벤트 만들기
3. 시크릿 창에서 팀 URL (`/t/<token>`) 직접 입력 → 팀원 시뮬레이션
4. 양쪽 동시 확인 — 일반 창의 운영자 보드에 시크릿 창 사진이 실시간 반영

휴대폰으로 테스트:
1. `ipconfig getifaddr en0` 로 IP 확인
2. `.env` 의 `VITE_PUBLIC_HOST` 를 `http://<IP>:5173` 로 임시 변경
3. `npm run dev -- --host` 실행 후 휴대폰 브라우저에서 QR 스캔 또는 URL 직접 입력

> 푸시 알림은 `https://` 또는 `http://localhost` 컨텍스트에서만 동작. IP 주소로는 푸시 권한 못 받음.

---

## 다음 우선순위 (추천)

1. **행사 직전 콘솔 작업 2건** (위 "행사 직전 남은 작업" 1·2 번) — 5분 안에 끝남
2. **실제 휴대폰으로 한 번 풀 플로우 확인** — QR → 셀카 → 사진 → 보드 → Export 까지
3. **행사 한 번 돌려본 뒤 후속 Phase 결정** — Phase 16 (영구 공유 링크) 가 행사 직후 가치가 가장 클 가능성 높음
4. ~~디자인 V2 방향 결정~~ → ✓ D 톤으로 확정 (2026-05-28). 행사 후 점진 강화 항목은 `DESIGN_REFERENCES.md` 참고
5. Blaze 플랜 검토 → Phase 12 잔여(Cloud Function 발송) + Phase 17 (자동 삭제)

---

## 주의사항 / 함정

- 같은 파일을 두 에이전트가 동시 편집하면 충돌 — 한 명씩 작업
- `.env` 는 절대 git 커밋 X (`.gitignore` 에 포함되어 있음)
- service-worker.js 에 Firebase config 가 평문 — Web API 키는 본디 공개 토큰이지만 콘솔에서 HTTP referrer 제한 필수
- Phase 11 에서 `@tensorflow/tfjs ^1.7.0` 사용 — 매우 오래된 버전이지만 face-api 호환을 위함. 다른 ML 라이브러리 추가 시 충돌 주의
- 푸시 알림은 HTTPS (또는 localhost) 컨텍스트 필수
- Firebase 무료 한도 (Spark): Cloud Function 사용 불가 → Phase 12 잔여 / Phase 17 은 Blaze 플랜 필요
- `CONTEXT.md`, `PHASE_AUDIT_1-12.md` 는 현재 untracked. 필요하면 `.gitignore` 에 추가하거나 커밋
