# Photo Mission Board · 단계별 실행 계획 (PHASES)

## Phase 18 · 범용 행사 모듈 + 사진 콘테스트

- 행사 프리셋과 참가 단위 명칭 설정
- 공통 QR 행사 홈과 안내·신청곡·사진·기록 모듈
- 서버 검증 참가 코드와 참가 세션
- 참가 단위별 대표사진 1장, 제목, 교체, 관리자 숨김
- 그룹당 1표 서버 강제, 자기 그룹 투표 금지
- 접수·투표·결과 독립 상태
- 미투표 확인, 초기화, 동점 수동 확정, 상위 3개 결과 공개
- 원본 ZIP과 집계 CSV

> 각 단계 끝에서 작동 확인 가능. 단계가 끝나면 사용자에게 "이 단계 끝났습니다. 다음으로 갈까요?" 알리고 사용자 OK 후 진행.

---

## Phase 0 · 사전 준비 (운영자가 직접)

> 이 단계는 사람이 해야 함. 코딩 에이전트는 README.md 안내를 따르도록 가이드.

1. Firebase Console에서 **새 프로젝트 생성** — 기존 photo-mission-board와 분리된 별도 프로젝트
2. **웹 앱 등록** — 키 6개 발급 (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)
3. **Authentication > Sign-in method**: Google + Anonymous 활성화
4. **Firestore Database** 생성 (asia-northeast3 또는 us-central1) — Production 모드, 일단 모든 read/write 허용
5. **Storage** 생성 — 같은 리전, 기본 규칙
6. (선택) **Cloud Messaging** 활성화 (v1.5에 필요)
7. (선택) **Hosting** 활성화 — 배포용

키들을 `.env`에 복사하고 `npm run dev`로 첫 실행.

**완료 조건**: `firebase` 객체가 콘솔 에러 없이 초기화되고, 홈페이지가 뜸.

---

## Phase 1 · 스캐폴딩 + Firebase 연결

**목표**: 빈 React 앱 + Firebase 초기화 + 라우팅 뼈대 + Tailwind 디자인 토큰.

**산출물**:
- `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`
- `src/main.tsx`, `src/App.tsx` (라우터 뼈대)
- `src/lib/firebase.ts` (초기화)
- `src/lib/types.ts` (SPEC §4.2의 타입을 TS로)
- `src/index.css` (Tailwind base + 디자인 토큰 변수)
- `.env.example`, `.gitignore`, `index.html`
- 모든 라우트 stub 페이지 (텍스트만 "Login Page", "Events Page" 식)

**확인 명령**:
```bash
npm install
npm run dev
```
브라우저 열어서 `/`, `/events`, `/t/test123` 등 라우트 모두 텍스트로 응답해야 함.

**커밋 메시지**: `chore: scaffold Vite + React + Firebase + routing`

---

## Phase 2 · 운영자 Google 로그인 + 이벤트 목록

**목표**: 로그인 → 이벤트 목록 빈 상태 → "새 이벤트 만들기" 버튼 (다음 phase에서 구현).

**산출물**:
- `src/lib/auth.ts` — Google sign in, signOut, useAuth hook
- `src/pages/Login.tsx` — SCENE 7 디자인 (mockups.html 참고)
- `src/pages/Events.tsx` — 빈 상태 / 카드 목록
- `src/components/AccountBar.tsx`
- `src/hooks/useEvents.ts` — 본인 이벤트 onSnapshot 구독
- 라우팅: 비로그인 시 `/events` 접근하면 `/`로 리다이렉트

**Firestore**: 첫 로그인 시 `users/{uid}` 문서 자동 생성.

**확인**: Google 로그인 → /events에 빈 카드 + "새 이벤트 만들기" 버튼. 새로고침해도 로그인 유지.

---

## Phase 3 · 이벤트 생성 마법사 + 슬롯 자동 생성

**목표**: SCENE 1의 3단계 마법사 + SCENE 2의 장소 편집 모달 + 이벤트/팀/슬롯 일괄 생성.

**산출물**:
- `src/pages/EventCreate.tsx` — STEP 1/2/3 마법사
- `src/components/PlaceEditModal.tsx` — 풀스크린 모달
- `src/lib/createEvent.ts` — Firestore batch write:
  - `events/{eventId}` 문서
  - `events/{eventId}/teams/{teamId}` × teamCount (랜덤 토큰 포함)
  - `events/{eventId}/slots/{slotId}` × (teamCount × perTeamCount)
- 자동 색상 할당: teams.color = 미리 정해둔 팔레트에서 순환
- 자동 이름: "1팀", "2팀" ... (displayName은 운영자가 나중에 수정 가능)

**검증**: STEP별 다음 버튼 비활성 조건 모두 동작.

**확인**: 마법사 완료 후 Firestore에 데이터 정확히 생성, /events/:eventId 페이지에 stub 표시.

---

## Phase 4 · 팀 QR 발급 + 공유

**목표**: SCENE 8 — 팀 QR 관리, 한 팀 QR 풀스크린, 공유 액션, A4 인쇄 시트.

**산출물**:
- `src/pages/EventTeams.tsx` — 팀 목록 + 미니 QR
- `src/pages/TeamQRDetail.tsx` — 한 팀 QR 풀스크린
- `src/lib/qr.ts` — `qrcode` 패키지 wrapper
- 카톡 공유: Web Share API (`navigator.share`)
- 이미지 저장: QR을 canvas로 그려서 PNG 다운로드
- URL 복사: clipboard API
- A4 시트: jsPDF로 PDF 생성 (v1.5로 미뤄도 됨; v1엔 "준비 중" 표시)

**QR URL**: `${VITE_PUBLIC_HOST}/t/${team.token}`

**확인**: 휴대폰으로 QR 스캔하면 (다음 phase에서 구현될) `/t/:token` 페이지로 이동.

---

## Phase 5 · 팀 입장 + 셀카 단계

**목표**: SCENE 3 입장 화면 + SCENE 5 셀카 배너 + 셀카 업로드.

**산출물**:
- `src/pages/TeamEntry.tsx` — `/t/:teamToken`
  - URL에서 토큰 받음
  - `signInAnonymously` 실행 (uploaderId 발급)
  - `teams` collectionGroup query로 토큰 매칭
  - localStorage에 `{ eventId, teamId, uploaderId }` 저장
  - 환영 화면 표시
- `src/pages/TeamSelfie.tsx` — `/t/:teamToken/selfie`
  - 셀카 배너 그리드 (자동 사이즈)
  - 본인이 안 올렸으면 "셀카 올리기" 버튼
  - 이미 올렸으면 "장소 미션으로 →"
- `src/lib/storage.ts` — Storage 업로드 헬퍼:
  - `uploadImage(file, path)` → 원본 + 1024px 썸네일 생성 (브라우저 canvas)
  - return `{ originalUrl, thumbUrl, originalPath, thumbPath, width, height, bytes }`
- 셀카 등록: `selfies` 문서 + `teams.joinedMembers`에 푸시 (FieldValue.arrayUnion)

**`selfieMode` 분기**:
- `individual`: 모든 팀원이 각자 1장 → 셀카 페이지 강제
- `group`: 첫 팀원이 단체사진 1장 → 셀카 1장으로 갈음
- `none`: 셀카 페이지 스킵, 바로 `/places`

**확인**: 휴대폰 2대로 같은 QR 스캔 → 각자 셀카 올리면 두 사람 다 셀카 배너에 즉시 보임.

---

## Phase 6 · 슬롯 목록 + 사진 업로드 + 대표 선택

**목표**: SCENE 3 (장소 상세) — 가장 자주 쓰이는 화면.

**산출물**:
- `src/pages/TeamPlaces.tsx` — `/t/:teamToken/places`
  - 팀 셀카 배너 (재사용)
  - 미션 진행률
  - 함께 있는 팀원 아바타
  - 장소 카드 (진행 dots: 대표는 별, 일반은 검정, 빈 점은 회색)
- `src/pages/TeamPlaceDetail.tsx` — `/t/:teamToken/places/:placeId`
  - 장소 배너 + 정보 + 지도 버튼
  - 진행 상황 카드
  - 사진 그리드 (대표 ★, 업로더 이름)
  - 카메라 / 갤러리 업로드 버튼
- `src/lib/upload.ts` — 사진 업로드 흐름:
  1. 클라이언트에서 1:1 자동 중앙 크롭 메타 계산 (cropMeta 초기값)
  2. 1024×1024 썸네일 canvas 생성 → Storage 업로드
  3. 원본도 별도 업로드
  4. `photos` 문서 생성 (slotId 매핑)
  5. `slots.submissionCount` 증가 (transaction)
  6. 슬롯에 대표가 없으면 자동으로 첫 사진을 대표로
- 카메라 직접 호출: `<input type="file" accept="image/*" capture="environment">`
- 대표 변경: ☆ 탭 → Firestore transaction (기존 대표 false, 새 대표 true, slot.representativePhotoId 갱신)
- 사진 삭제: 본인 업로드만. 대표 삭제 시 다음 사진(가장 최근) 자동 승격

**확인**: 한 팀에서 여러 폰으로 동시 업로드, 실시간으로 다른 폰에서 보임. 대표 변경 즉시 반영.

---

## Phase 7 · 운영자 Live (Overview / 보드 / 검수)

**목표**: SCENE 4 — Overview / Live 보드 / 슬롯 검수.

**산출물**:
- `src/pages/EventOverview.tsx` — `/events/:eventId`
  - 4 stat 타일
  - 팀별 진행률
  - 최근 업로드 stream
  - 하단 탭 네비게이션
- `src/pages/EventBoard.tsx` — `/events/:eventId/board`
  - 레이아웃 토글
  - 보드 그리드 (slots × photos 조인)
  - 미확인 슬롯 노란 점
- `src/pages/EventReview.tsx` — `/events/:eventId/review`
  - 슬롯 단위 진입 (URL 쿼리 `?slot=...`)
  - 사진 그리드 + ★ 변경
  - "확인 완료" 토글 → 다음 미확인 자동 이동
- `src/components/BoardCell.tsx` — 셀 컴포넌트 (썸네일/빈/미확인 상태)
- `src/hooks/useEventLive.ts` — 이벤트 + 슬롯 + 사진 모두 구독

**레이아웃 모드**:
- random: 시드 기반 셔플
- team: 팀 순서대로 정렬 (1팀 첫 줄, 2팀 둘째 줄...)
- manual: v1엔 비활성 ("v2 예정")

**확인**: 다른 폰에서 사진 올리면 운영자 보드에 즉시 반영. 검수 토글 작동.

---

## Phase 8 · Export (콜라주 PNG + 원본 ZIP + 셀카 모음)

**목표**: SCENE 9 — Export 메인 + 보관 안내.

**산출물**:
- `src/pages/EventExport.tsx` — `/events/:eventId/export`
  - 라이브 콜라주 미리보기
  - 레이아웃 토글 + 다시 셔플
  - "이 배치로 잠금" 토글 (events.layoutLockedAt 기록)
  - 다운로드 카드 3개
- `src/lib/collage.ts` — 콜라주 PNG 생성:
  - 모든 슬롯의 대표 photoId 수집
  - 레이아웃 순서대로 정렬
  - 2400×2400 canvas에 각 셀(240×240) drawImage with cropMeta
  - `canvas.toBlob('image/png')` → File saver로 다운로드
- `src/lib/zip.ts` — JSZip으로 원본 ZIP:
  - 팀별 폴더 + 장소별 하위 폴더
  - 셀카는 `{팀}/selfies/{member}.jpg`
  - 사진은 원본 URL fetch → ZIP 추가
- 셀카 모음 PNG: 10팀 셀카 콜라주 (각 팀 셀카 배너를 격자로)

**진행 표시**: ZIP 생성은 5초~분 단위. progress bar 필수.

**확인**: 잠금 후 PNG/ZIP 다운로드 성공, 파일 열어보고 콜라주 / 폴더 구조 확인.

---

## Phase 9 · 공개 보드 (빔프로젝터)

**목표**: SCENE 10 — 공개 보드 + 운영자 컨트롤.

**산출물**:
- `src/pages/PublicBoard.tsx` — `/events/:eventId/public`
  - 풀스크린 검은 배경
  - 헤더 (제목 + LIVE)
  - 보드 그리드 (events.publicViewMode 따라 모드 변경)
  - 푸터 (팀 수 / 진행률 / 채움)
- `src/components/PublicHeader.tsx`, `PublicFooter.tsx`
- 운영자 컨트롤은 EventBoard에 추가:
  - "공개 보드 열기" 버튼 → 새 탭으로 `/events/:eventId/public`
  - "뷰 모드 변경" 카드 → `events.publicViewMode` 업데이트
- v1엔 `viewMode: 'board'` 단일 모드만. (다른 모드는 v1.5)

**자동 새 사진 페이드인**: 새 photo가 들어오면 해당 셀에 `animation: fadeIn 0.6s ease-out`.

**확인**: 공개 보드 페이지를 다른 창에서 열고, 메인 창에서 사진 올리면 양쪽 동시 업데이트.

---

## Phase 10 · 보안 규칙 + 배포

**목표**: Firestore/Storage 규칙 적용 + Firebase Hosting 배포.

**산출물**:
- `firestore.rules` — SPEC §8 그대로
- `storage.rules` — SPEC §8.1
- `firebase.json` — Hosting + Firestore + Storage 모두 한 프로젝트에
- 배포: `firebase deploy`
- 도메인: Firebase가 발급한 `*.web.app` 또는 `*.firebaseapp.com`
  - 커스텀 도메인은 v2

**확인**: 배포된 URL에서 모든 기능 동작 + 콘솔 보안 에러 없음.

---

## Phase 11 (v1.5) · face-api.js 셀카 자동 크롭

**목표**: 셀카 업로드 시 얼굴 자동 인식 → 1:1 크롭 메타 계산.

**산출물**:
- `src/lib/face.ts` — face-api.js 모델 로드 + detect
- 셀카 업로드 직후:
  1. 클라이언트에서 face-api.js로 얼굴 박스 detect
  2. 박스 중심을 기준으로 1:1 크롭 메타 계산
  3. `selfies.cropMeta` + `selfies.faceDetected`에 저장
- 얼굴 못 찾으면 자동 중앙 크롭으로 폴백

**확인**: 얼굴이 한쪽 구석에 있는 셀카가 자동으로 얼굴 중심으로 보임.

---

## Phase 12 (v1.5) · 푸시 알림 + PWA

**목표**: 운영자에게 새 업로드/팀 입장 알림.

**산출물**:
- `public/manifest.json` (PWA)
- `public/service-worker.js`
- `src/lib/messaging.ts` — FCM 토큰 발급/저장
- Cloud Function (Node) — Firestore 트리거에 반응해 운영자에게 send
- 알림 권한 요청 UI

---

## Phase 13 (v1.5) · 공개 보드 추가 모드 + 줌아웃 피날레

- `viewMode: 'team-{id}'` — 한 팀 클로즈업
- `viewMode: 'zoom-out-finale'` — 4프레임 줌아웃 애니메이션 (SCENE 5 storyboard 참고)
- 자동 슬라이드 (10초마다 다음 팀)

---

## Phase 14 (v1.5) · 운영자 검수 크롭 슬라이더

- 검수 화면에서 사진 클릭 → cropMeta 슬라이더 (x, y, scale) → 저장

---

## Phase 15 (v1.5) · A4 QR 시트 PDF

- jsPDF로 모든 팀 QR을 A4 한 장에

---

## Phase 16 (v1.5) · 영구 공유 링크

- `/share/:eventId` 페이지 — 완성된 콜라주 보기 (read-only, 인증 불필요)
- 운영자가 종료한 이벤트만 노출

---

## Phase 17 (v1.5) · 데이터 보관 Cloud Function

- 매일 03:00 KST에 `events where retentionUntil < now()` 쿼리
- 해당 이벤트의 photos/selfies 원본 Storage 삭제
- `photos.originalUrl`, `originalPath` 클리어 (썸네일은 유지)

---

## Phase 18 · 행사 유형 + 결과물 모드 + 투표 MVP

- 단독 행사 / 외부 행사 연결형을 생성 마법사에서 선택
- 자동 콜라주 / 사진 수집 모드를 생성 마법사에서 선택
- 자동 콜라주는 팀 수를 유지한 채 칸 수 줄이기/늘리기 추천
- 사진 수집은 콜라주 약수 검증 없이 장소별 목표 사진 수로 생성
- 행사 후 투표 설정, 참가자 투표 버튼, Export 순위 카드
- `events/{eventId}/votes` Firestore rules 추가

---

## 빌드 / 검증 / 커밋 흐름 (모든 phase 공통)

각 phase 끝에서:

1. `npm run lint` 통과 (tsc --noEmit)
2. `npm run build` 통과
3. 핵심 UX 1-2개 수동 확인 (모바일 크롬 dev tool 또는 실제 휴대폰)
4. Git commit:
   ```
   feat(phase-N): <짧은 설명>
   - bullet 1
   - bullet 2
   ```
5. 사용자에게 보고: "Phase N 끝났습니다. 확인 부탁드립니다. 다음 phase로 갈까요?"
6. 사용자 OK 후 다음 phase 시작

---

## 막혔을 때

- SPEC.md, mockups.html을 다시 읽기
- 결정사항이 모호하면 사용자에게 물어보기 (구현 멈추고)
- 새 결정사항이 나오면 SPEC.md 업데이트 + 코드 변경 (둘 다)
- mockups.html과 실제 구현이 차이나면 우선 코드 동작에 맞춰 mockups.html 갱신 (단, 큰 차이는 사용자에게 확인)
