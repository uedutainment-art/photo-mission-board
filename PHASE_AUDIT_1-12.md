# Photo Mission Board · Phase 1~12 점검 보고서

작성일: 2026-05-28 (Phase 12 추가 갱신)
점검 범위: PHASES.md 의 Phase 1 ~ Phase 12 (Phase 13+ 제외)
검증 방법: 파일 존재 확인 → 소스 직접 리뷰 → `tsc --noEmit` 타입 체크 + `git log` 커밋 확인

## 직전 보고 후 추가로 적용된 안정성 패치 3건 (커밋 기준)

- `f733acb fix: atomize representative photo selection` — 이전 보고서 결론 2번 처리
- `077d5ea fix: tolerate individual zip download failures` — 결론 3번 처리
- `1539d8f fix: preload face model on selfie page` — 결론 4번 처리

---

## 결과 요약

| Phase | 평가 | 완성도 | 비고 |
|-------|------|--------|------|
| 1. 스캐폴딩 + Firebase     | ✅ | 100% | 의존성, 라우터 뼈대, 타입, 환경변수 모두 정상 |
| 2. 로그인 + 이벤트 목록    | ✅ | 100% | RequireAuth 리다이렉트, users/{uid} 자동 생성, onSnapshot 구독 정상 |
| 3. 이벤트 생성 마법사      | ✅ | 95%  | batch write, 자동 색/이름/토큰 정상. 토큰 분포 편향 1건 |
| 4. 팀 QR 발급 + 공유       | ✅ | 95%  | Web Share / PNG / 클립보드 모두 동작. UI 피드백 미세 개선 권장 |
| 5. 팀 입장 + 셀카          | ✅ | 95%  | signInAnonymously, 1024 썸네일, selfieMode 분기 모두 구현 |
| 6. 슬롯 + 사진 업로드      | ✅ | 95%  | TeamPlaceDetail.tsx 397줄 정상 완성, transaction 기반. 첫 대표 경쟁상태 주의 |
| 7. 운영자 Live             | ✅ | 95%  | Overview/Board/Review 완성. manual 모드 v1 비활성 처리 OK |
| 8. Export                  | ✅ | 100% | 메인 사진 콜라주 cropMeta 인자 추가 완료(`7fc5bdc`). ZIP per-file try/catch 적용(`077d5ea`) |
| 9. 공개 보드               | ✅ | 100% | 풀스크린, fadeIn 0.6s, publicViewMode 실시간 반영 |
| 10. 보안 규칙 + 배포       | ✅ | 100% | firestore.rules / storage.rules 가 SPEC §8 과 정확히 일치. Phase 12 에서 fcmTokens 권한 1건 추가. Hosting + rules 실제 배포 보고됨 |
| 11. face-api.js 자동 크롭  | ✅ | 100% | face.ts, 모델, selfies.ts 통합, SelfieBanner/셀카 콜라주 cropMeta 적용 완료. TeamSelfie 마운트 시 모델 사전 로딩까지 패치(`1539d8f`) |
| 12. PWA + 푸시 알림        | ✅ | 90%  | manifest, service-worker(앱 셸 + onBackgroundMessage + notificationclick), messaging.ts(권한·토큰·해시·저장), NotificationSettings UI, fcmTokens rules 모두 정상. **Cloud Function 발송 트리거는 명시적으로 미구현(잔여 작업으로 보고됨)** |

`tsc --noEmit` 결과(Phase 12 추가 후 재실행): **종료코드 0 (에러 없음)**
빌드: `npm run build` 통과(보고). `dist/` 에 `manifest.json` / `service-worker.js` / `icons/` / `models/` / `index.html` / `assets/` 모두 출력 확인.

---

## 발견된 이슈

### 🔴 우선순위 높음 (수정 권장)

1. **Phase 8 · 메인 사진 콜라주가 `cropMeta` 를 무시함**
   - 위치: `src/lib/collage.ts:121` `createCollagePng()`
   - 증상: `drawImageCover(context, image, x, y, cellWidth, cellHeight)` 호출에 7번째 인자(`cropMeta`)가 빠져 있음. 새로 만든 `src/lib/crop.ts`의 `drawImageCover()`는 이미 cropMeta를 지원하는데(line 24-54), 메인 콜라주만 적용 누락.
   - 한편 셀카 콜라주(`collage.ts:168`)는 `selfie.cropMeta` 를 정상 전달 → Phase 11 결과 반영됨.
   - 수정: `drawImageCover(context, image, x, y, cellWidth, cellHeight, photo.cropMeta);` 한 줄만 추가하면 됨.

### 🟡 우선순위 중간 (v1.5 또는 안정성 개선)

2. **Phase 3 · 토큰 분포 편향 (modulo bias)**
   - 위치: `src/lib/createEvent.ts:62-67` `randomToken()`
   - 증상: `Uint32Array` 값을 `% 62` 로 인덱싱 → 일부 문자가 다른 문자보다 약 0.000001% 더 자주 등장. 32자 길이에서 실질적 충돌 위험은 매우 낮지만 표준 안티패턴.
   - 해결: rejection sampling 또는 `crypto.randomUUID()` 활용.

3. **Phase 6 · 첫 사진 자동 대표 지정의 경쟁 상태**
   - 위치: `src/lib/upload.ts` `uploadMissionPhoto()` 안의 `isRepresentative = !representativePhotoId` 결정 로직
   - 증상: 두 명이 동일 슬롯에 거의 동시 업로드 시, 두 사진 모두 `isRepresentative: true` 가 될 수 있음. Firestore 트랜잭션 안에서 슬롯의 `representativePhotoId` 가 비었는지 확인하고 그 트랜잭션 내에서 set 해야 함.
   - 해결: 슬롯 read → photo 생성 → slot.representativePhotoId 갱신을 하나의 `runTransaction` 으로 묶기.

4. **Phase 5 · 동일 토큰 동시 진입 시 다른 uploaderId 발급 가능**
   - 위치: `src/hooks/useTeamSession.ts` (또는 `lib/teamSession.ts`) 의 익명 로그인 흐름
   - 증상: 한 사람이 두 탭으로 같은 QR을 동시에 열면 `signInAnonymously` 가 두 번 호출되어 다른 uploader 로 기록될 가능성. UX 문제(같은 사람이 두 번 카운트). v1 에서는 드문 케이스.

5. **Phase 8 · 원본 ZIP 다운로드 CORS / 재시도 부재**
   - 위치: `src/lib/zip.ts`
   - 증상: Firebase Storage 원본 URL을 fetch → ZIP 추가. 큰 ZIP 생성 도중 한 장이라도 fetch 실패 시 전체 중단. 재시도 / 부분 실패 처리 없음.
   - 해결: per-file `try/catch` + 실패 목록 사용자에게 표시 + 부분 ZIP 다운로드 허용.

### 🟢 우선순위 낮음 (UX 디테일)

6. **Phase 4 · URL 복사 후 토스트가 자동 사라지지 않음** — `setNotice` 에 setTimeout 추가 권장.
7. **Phase 2 · `useEvents.ts` 가 에러 원본을 콘솔/모니터링에 로깅하지 않음** — `console.error` 추가 권장.
8. **Phase 3 · 대표 이미지(Place coverUrl) 가 URL 입력 전용** — Storage 업로드 UI 는 SPEC상 운영자 권한 필요. v2 보강 항목.

---

## Phase별 산출물 체크리스트

### Phase 1
- ✅ package.json / vite.config.ts / tsconfig.json / tailwind.config.ts / postcss.config.js
- ✅ src/main.tsx / src/App.tsx (18개 라우트)
- ✅ src/lib/firebase.ts (requiredEnv 검증)
- ✅ src/lib/types.ts (SPEC §4.2 매핑)
- ✅ src/index.css (디자인 토큰)
- ✅ .env.example / .gitignore / index.html

### Phase 2
- ✅ src/lib/auth.ts (Google sign in + useAuth + ensureUserDocument)
- ✅ src/pages/Login.tsx (에러 케이스 다수 처리)
- ✅ src/pages/Events.tsx (필터: live/draft/completed)
- ✅ src/components/AccountBar.tsx / RequireAuth.tsx
- ✅ src/hooks/useEvents.ts (ownerId 매칭 onSnapshot)

### Phase 3
- ✅ src/pages/EventCreate.tsx (STEP 1/2/3, 비활성 조건)
- ✅ src/components/PlaceEditModal.tsx
- ✅ src/lib/createEvent.ts (batch write: events + teams + slots)
- ✅ 자동 색상(TEAM_COLORS) + 자동 이름("N팀") + 랜덤 토큰

### Phase 4
- ✅ src/pages/EventTeams.tsx
- ✅ src/pages/TeamQRDetail.tsx
- ✅ src/lib/qr.ts (qrcode wrapper)
- ✅ Web Share / Clipboard / PNG 다운로드
- ⏳ A4 PDF — "준비 중" (v1 규격 일치)

### Phase 5
- ✅ src/pages/TeamEntry.tsx (signInAnonymously + collectionGroup)
- ✅ src/pages/TeamSelfie.tsx (capture="user")
- ✅ src/lib/storage.ts (원본 + 1024px 썸네일)
- ✅ src/lib/selfies.ts / src/hooks/useSelfies.ts
- ✅ src/lib/teamSession.ts / src/hooks/useTeamSession.ts (localStorage 저장)
- ✅ selfieMode 분기 (individual / group / none)
- ✅ joinedMembers FieldValue.arrayUnion

### Phase 6
- ✅ src/pages/TeamPlaces.tsx (★/●/○ dots)
- ✅ src/pages/TeamPlaceDetail.tsx (397줄, 완성)
- ✅ src/lib/upload.ts (트랜잭션: photo + slot.submissionCount + 자동 대표)
- ✅ src/hooks/useTeamMission.ts
- ✅ 카메라 capture="environment"
- ✅ 대표 변경(setRepresentativePhoto 트랜잭션), 사진 삭제(본인 + 자동 승격)

### Phase 7
- ✅ src/pages/EventOverview.tsx (4 stat + 진행률 + 최근 6개)
- ✅ src/pages/EventBoard.tsx (random/team/unchecked 토글, 미확인 노란 점)
- ✅ src/pages/EventReview.tsx (?slot, ★ 변경, 다음 미확인 자동 이동)
- ✅ src/components/BoardCell.tsx / OperatorTabNav.tsx
- ✅ src/hooks/useEventLive.ts (5개 onSnapshot 구독)
- ✅ src/lib/live.ts
- ✅ manual 모드 v1 비활성 처리

### Phase 8
- ✅ src/pages/EventExport.tsx (미리보기 / 셔플 / 잠금 / 다운로드 카드 3개)
- ⚠️ src/lib/collage.ts — 메인 사진 콜라주만 cropMeta 미적용 (셀카 콜라주는 적용됨)
- ✅ src/lib/crop.ts (cropMeta 지원 drawImageCover + getCropObjectStyle 유틸 신설)
- ✅ src/lib/zip.ts (팀/장소 폴더 구조, progress)
- ✅ src/lib/download.ts
- ✅ 셀카 모음 PNG
- ✅ events.layoutLockedAt 기록

### Phase 9
- ✅ src/pages/PublicBoard.tsx (풀스크린 #000, 동적 그리드)
- ✅ src/components/PublicHeader.tsx / PublicFooter.tsx
- ✅ EventBoard 에 "공개 보드 열기" 버튼 + publicViewMode 카드
- ✅ fadeIn 0.6s ease-out (public-cell-fade)
- ✅ v1 viewMode: 'board' 단일 모드

### Phase 10
- ✅ firestore.rules — SPEC §8 그대로 (signedIn / isEventOwner(After) / changedOnly 헬퍼)
- ✅ storage.rules — 15MB 제한, image/* 또는 application/zip MIME 검사
- ✅ firebase.json — hosting(dist) / firestore / storage 모두 한 프로젝트
- ✅ .firebaserc — default 프로젝트 `photo-mission-board-prod`
- ✅ dist/ — 빌드 산출물 존재 (index.html + assets/ + models/)
- ⏳ 실제 `firebase deploy` 실행 여부는 외부에서 확인해야 함 (코드 점검 범위 밖)

### Phase 11
- ✅ src/lib/face.ts (138줄) — 동적 import 로 face-api.js + @tensorflow/tfjs 로딩, 모델 캐싱(`faceApiPromise`), `tinyFaceDetector` 사용, Object URL 정리, 실패 시 CENTER_CROP 폴백
- ✅ public/models/tiny_face_detector_model-{shard1,weights_manifest.json} 배포 (dist/models/ 에도 복사)
- ✅ src/lib/selfies.ts 가 `detectSelfieFaceCrop` 과 `uploadImage` 를 `Promise.all` 로 병렬 실행
- ✅ `selfies` 문서에 `cropMeta` 와 (감지 시) `faceDetected: {x,y,w,h}` 저장
- ✅ src/lib/types.ts 에 `FaceDetectionBox` 인터페이스 + `Selfie.faceDetected?` 필드
- ✅ src/components/SelfieBanner.tsx 가 `getCropObjectStyle(cropMeta)` 로 CSS object-position + scale transform 적용
- ✅ src/lib/collage.ts 의 셀카 콜라주가 `drawImageCover(..., selfie.cropMeta)` 로 cropMeta 사용
- ✅ 다중 얼굴 처리: `mergeFaceBoxes()` 로 단체샷 박스 합치고, faceCount > 1 이면 targetCoverage 0.68 / maxScale 1.5 (단일 0.46 / 2.2)
- ✅ 인풋사이즈 416, scoreThreshold 0.35 — 모바일 폰에서도 합리적 속도

---

## Phase 11 신규 발견 이슈

- 🟡 **`@tensorflow/tfjs` 버전 `^1.7.0`** — face-api.js 0.22.x 와의 호환을 위한 의도된 선택일 가능성 높지만, 현재 tfjs 최신은 4.x 라서 보안/성능 업데이트가 없음. 묶음 크기도 큰 편. v1.5 의 다른 ML 작업이 늘어나면 face-api 포크(tfjs 4.x 호환)로 교체 검토.
- 🟢 **얼굴 감지 실패 vs 사용자에게 알림 없음** — 현재는 조용히 center crop 으로 폴백. UX 상 좋은 default 지만, "얼굴을 못 찾아 자동 중앙 크롭으로 저장됨" 토스트가 있으면 운영자가 검수 단계에서 확인하기 쉬움.

---

## Phase 12 산출물 체크리스트

- ✅ `public/manifest.json` — name/short_name/description/start_url/scope/display/orientation/background/theme/icons 모두 정상
- ✅ `public/icons/icon.svg` + `public/icons/maskable-icon.svg` (purpose 분리)
- ✅ `index.html` — `<link rel="manifest">`, theme-color, apple-touch-icon 메타 추가
- ✅ `public/service-worker.js` — 앱 셸 캐시(install/activate/fetch), navigation fallback, FCM `onBackgroundMessage` + `notificationclick`(URL 매칭 후 focus/openWindow)
- ✅ `src/lib/pwa.ts` — `registerAppServiceWorker()` 와 `registerPwaShell()`(load 시점 등록)
- ✅ `src/main.tsx` 가 `registerPwaShell()` 호출
- ✅ `src/lib/messaging.ts` — `getPushReadiness`(보안 컨텍스트/Notification API/SW/VAPID 검사), `requestAndSaveFcmToken`(권한 → SW 등록 → getToken → SHA-256 해시 → setDoc), `listenForForegroundMessages`
- ✅ `src/components/NotificationSettings.tsx` — Bell/BellOff 상태, "켜기" 버튼 빈도 제어(disabled 조건), VAPID 미설정 경고, 포그라운드 메시지 토스트
- ✅ `src/pages/Events.tsx` 가 `NotificationSettings` 렌더링
- ✅ Firestore rules — `match /users/{uid}/fcmTokens/{tokenId}` 본인 한정 read/write 추가
- ✅ `.env.example` 에 `VITE_FIREBASE_VAPID_KEY=` 라인 추가
- ⏳ Cloud Function 발송 트리거(잔여) — Firestore 트리거에서 운영자 fcmTokens 조회 후 admin SDK send. 행사 운영 직전이라 일단 보류 가능

---

## Phase 12 신규 발견 이슈

### 🔴 보안/배포 직결

1. **service-worker.js 에 Firebase config 가 하드코딩된 채 커밋됨**
   - 위치: `public/service-worker.js:7-15` — `apiKey`, `appId`, `messagingSenderId` 등 7개 필드 평문 노출.
   - 영향: 이 파일은 `dist/` 로 배포되어 누구나 GET 가능. Firebase Web API 키는 본디 공개 토큰이지만, CONTEXT.md 가 ".env 는 절대 git X" 라고 언급한 정책과 충돌. 더 큰 문제는 **service-worker.js 가 Vite 의 환경변수 치환을 받지 못해서**, 키를 옮기려면 빌드 타임 템플릿 처리(예: vite-plugin-pwa 또는 빌드 후 sed)로 주입해야 한다는 점.
   - 대응:
     - 단기: 그대로 둬도 동작은 함(Web API 키는 공개 가능). 다만 `Authentication > Settings > Authorized domains` 에 `localhost` 와 배포 도메인만 남기고, **API Key 제한**(HTTP referrer)을 콘솔에서 설정해 두면 키 도난 시 영향 차단.
     - 중기: 빌드 시 `service-worker.js` 를 템플릿으로 처리해 환경별로 다른 키를 주입.

### 🟡 동작 안정성

2. **`getToken` 호출이 try/catch 없이 진행됨**
   - 위치: `src/lib/messaging.ts:95-98`.
   - 증상: VAPID 키가 잘못됐거나 service-worker 가 활성화 직전이면 throw → `requestAndSaveFcmToken` 전체가 unhandled rejection. NotificationSettings 의 `try/catch` 가 잡지만, "FCM 토큰을 저장하지 못했습니다" 라는 모호한 메시지로 변환됨. `getToken` 결과별 에러 코드(`messaging/permission-blocked`, `messaging/token-subscribe-failed` 등)를 분류해 UX 메시지를 분기하면 좋음.

3. **service-worker fetch 핸들러가 `cache.put(request, response.clone())` 직후 같은 `response` 를 반환**
   - 위치: `public/service-worker.js:54-69`.
   - 미세 이슈: 대부분의 브라우저에서 정상 동작하나, 일부 환경에서는 `clone()` 전에 `response.ok` 분기로 인해 race condition 가능. 영향 매우 작음.

4. **FCM 토큰이 갱신될 때 이전 토큰 정리 미흡**
   - 위치: `setDoc(..., {merge:true})` 하나만 호출.
   - 영향: 같은 기기에서 토큰이 회전(rotation)되면 이전 `tokenHash` 문서가 잔류. Cloud Function 발송 시 죽은 토큰으로 보내 `messaging/registration-token-not-registered` 가 누적될 수 있음. 추후 Cloud Function 에서 발송 실패 시 자동 삭제하는 흐름이 권장됨.

### 🟢 사소

5. **NotificationSettings 가 `getPushReadiness` 를 `useEffect` 안에서만 호출하고 결과를 캐싱하지 않음** — Events 페이지 마운트 때마다 재실행. 영향 작음.
6. **`registerPwaShell()` 이 `import.meta.env.PROD` 가드 없이 항상 등록** — dev 모드에서도 SW 등록 → HMR 충돌 가능. Vite + React 환경에선 `registerPwaShell()` 을 `if (import.meta.env.PROD)` 로 감싸는 패턴이 권장됨.

---

## 결론

Phase 1~12 의 핵심 기능이 모두 구현되어 있고 TypeScript 타입 체크도 통과합니다. 행사 운영 관점에서 다음 두 가지가 남아 있습니다.

**행사 직전에 처리할 만한 짧은 작업:**

1. **Firebase 콘솔에서 Web Push VAPID 키 발급 → `.env` 에 `VITE_FIREBASE_VAPID_KEY=...` 입력** — Claude Code 가 이미 안내한 그대로. 없어도 동작은 하나 안정성 차이 큼.
2. **Firebase Console > API Key 제한 (HTTP referrer)** — service-worker.js 에 평문 노출된 키 도난 영향 차단.
3. **`registerPwaShell()` 을 `if (import.meta.env.PROD)` 로 감싸기** — dev 모드 SW 충돌 예방.

**v1.5 잔여 (Phase 12 후속):**

4. **Cloud Function 발송 트리거** — Firestore 트리거(`photos` / `selfies` onCreate, `teams.joinedMembers` onUpdate)에서 운영자 `users/{uid}/fcmTokens/*` 토큰을 읽어 admin SDK 로 send. 발송 실패 시 토큰 자동 삭제. (Blaze 플랜 필요)

토큰 분포 편향, URL 복사 토스트, 익명 로그인 동시성, tfjs 1.x 의존성, SW config 하드코딩(중기) 은 v2 로 미뤄도 안전합니다.
