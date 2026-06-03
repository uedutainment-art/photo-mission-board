# Photo Mission Board · 라이브 테스트 + 코드 워크스루 결과

작성일: 2026-05-28
방법: Claude in Chrome 으로 배포본(https://photo-mission-board-prod.web.app) 라이브 테스트 + 코드 경로 워크스루
한 줄 평: **전반적으로 견고. 단, 행사 운영 전 반드시 처리해야 할 1건 + 그 외 의미 있는 UX/안정성 개선 7~8건.**

---

## 라이브 테스트 진행 요약

| 단계 | 결과 |
|------|------|
| 사이트 첫 로딩 (`/`) | ✅ 정상, 로그인 화면 + 카피 자연스러움 |
| Google 로그인 | ✅ 정상 (uedutainment@gmail.com 로 진입) |
| 이벤트 목록 (`/events`) | ✅ 빈 상태 UI 친근함. AccountBar / 프로필 이미지 정상 |
| 이벤트 생성 마법사 STEP 1 | ✅ 실시간 슬롯 계산 (`2×2 = 4칸 ÷ 2팀 = 2장`) 매우 명료 |
| 이벤트 생성 마법사 STEP 2 | ✅ 장소 편집 풀스크린 모달, 팀당 분배 합계 0/2 → 2/2 ✓ 시각화 |
| 이벤트 생성 마법사 STEP 3 | ✅ "한 팀의 2장 구조" 색띠 + 최종 보드 미리보기 |
| 이벤트 생성 실행 | ✅ Firestore batch write 성공, `/events/:id` Overview 로 자동 이동 |
| Live Overview | ✅ 4 stat 타일 / 팀별 진행률 / 최근 업로드 빈 상태 모두 정상. ❗ "1팀 1팀" 라벨 깨짐 |
| 팀 QR 관리 (`/events/:id/teams`) | ✅ 직접 URL 진입은 정상. ❌ 하지만 Overview/Board/Review/Export 어느 탭에도 진입 동선 없음 |
| 팀 QR 풀스크린 (`/events/:id/teams/:teamId`) | ✅ QR + URL + 카톡 공유 + 이미지 저장 + URL 복사 + "팀원 전원에게 공유" 카드 |
| 참가자 QR 진입 (`/t/:token`) | 🔴 **"Firebase Anonymous 로그인이 꺼져 있습니다" 빨간 박스 표시 → 진입 불가** |
| 참가자 이후 흐름 | ⏸ Anonymous Auth 차단으로 라이브 테스트 중단, 코드 워크스루로 대체 |
| PWA 헬스 | ✅ /manifest.json 200, /service-worker.js 200 + active, /icons/icon.svg 200 |

---

## 발견 사항 — 우선순위별

### 🔴 행사 운영 차단 가능 (반드시 조치)

#### LT-1. Firebase Console 에서 Anonymous Auth provider 가 꺼져 있음
- **증거**: 참가자 QR 진입 시 `/t/:teamToken` 화면에 빨간 박스로 *"Firebase Anonymous 로그인이 꺼져 있습니다. Authentication 설정을 확인해주세요."* 표시 (`src/hooks/useTeamSession.ts` 의 catch 처리). PublicBoard (`src/pages/PublicBoard.tsx`) 도 이번 Phase 16 변경으로 `ensureUploaderUser()` 사전 호출에 의존 → 같은 이슈로 깨짐.
- **영향**: 참가자가 QR 스캔해도 입장 자체 불가. 공개 보드도 인증 실패.
- **조치 (운영자, 콘솔 작업, 30초)**: Firebase Console → Authentication → Sign-in method → Anonymous → **사용 설정** → 저장. 이후 새로고침으로 정상 동작.
- **추가 권장**: README Phase 0 / CONTEXT.md 에 "Anonymous 활성화 여부를 행사 직전에 콘솔에서 직접 재확인" 한 줄 추가. 사람이 한 번 더 보게 함.

---

### 🟡 행사 중 또는 직후 만져야 할 것

#### LT-2. 팀 라벨이 `name + displayName` 두 값을 모두 표시 → "1팀 1팀" / "1팀 · 1팀"
- **증거**: 라이브 화면에서 직접 확인. 코드 3 군데에서 동일 버그.
  - `src/pages/EventOverview.tsx:112` → `{team.name} {team.displayName}` ("1팀 1팀")
  - `src/pages/TeamPlaces.tsx:117` → `${context.team.name} · ${context.team.displayName}` (참가자 헤더 "1팀 · 1팀")
  - `src/pages/TeamEntry.tsx:77` → `{context.team.name} · {context.team.displayName}` (참가자 환영 화면 "1팀 · 1팀")
- **원인**: `createEvent.ts` 가 `name` 과 `displayName` 둘 다 `${teamIndex}팀` 으로 초기화. 운영자가 `displayName` 따로 입력하지 않는 한 항상 중복.
- **올바른 패턴**: 이미 3 군데에 같은 로직이 helper 로 존재함.
  - `src/pages/TeamQRDetail.tsx:14-17` `getTeamLabel`
  - `src/pages/EventTeams.tsx:49` `getTeamLabel`
  - `src/lib/qrSheetPdf.ts:52-55` `getQrSheetTeamLabel`
  - 모두: `team.displayName && team.displayName !== team.name ? "${name} · ${displayName}" : team.name`
- **조치**: `src/lib/teamLabel.ts` 같은 공통 헬퍼 1개로 빼고, 위 6개 모두 그쪽 사용. 이게 행사 첫인상에 가장 크게 영향. **참가자 환영 화면이 "1팀 · 1팀" 으로 떠 있는 게 가장 어색**.

#### LT-3. 운영자 Overview/보드/검수/Export 어디에도 "팀 QR 발급/관리" 진입 동선 없음
- **증거**: `src/components/OperatorTabNav.tsx` 의 4 탭에 teams 없음. `src/App.tsx:49-54` 에는 라우트 존재. 라이브에서 Overview → 다음 단계 가야 하는데 URL 직접 입력 외엔 길이 없음.
- **영향**: 운영자가 이벤트 만든 직후 "이제 팀에게 QR 보내야 하는데?" 단계에서 막힘. URL 외워서 입력해야 함.
- **조치 후보**:
  - (a) `OperatorTabNav` 에 `팀 QR` 탭 추가 (5개 탭, 모바일 폭 빠듯)
  - (b) Overview 페이지에 "팀 QR 관리" CTA 카드 1개 추가 (가장 자연스러움)
  - (c) 이벤트 생성 직후 → `/events/:id/teams` 로 자동 이동 (운영자 의도와 일치)
  - **(c) → (b) 조합 추천**: 처음 만들면 QR 페이지로 자동 이동, 나중에 Overview 에서 카드로 재진입.

#### LT-4. Anonymous Auth 세션 손실 시 본인 사진 인식 불가
- **증거**: `src/lib/teamSession.ts:51-58` `ensureUploaderUser()` 는 `auth.currentUser` 가 없으면 새로 익명 로그인 → 새 uid. 일반 시나리오에서는 Firebase 가 IndexedDB persistence 로 같은 uid 유지하지만, **시크릿 모드 / 브라우저 데이터 청소 / 디바이스 변경** 시엔 손실.
- **영향**: 손실 후 같은 토큰으로 재진입하면 본인이 올린 사진의 ★ 변경 / 삭제 버튼이 사라짐 (`isMine` false). 단, Firestore rules 는 별도 검증이라 권한 문제 직접 발생 X. UX 만 어색.
- **조치 (낮은 우선)**: 행사 안내문에 "동일 브라우저 유지" 한 줄. 코드 차원으론 v2 의 Cloud Function 토큰 흐름에서 자연스럽게 해결.

#### LT-5. 첫 사진 업로드 중 네트워크 끊김 → Storage orphan 파일
- **증거**: `src/lib/upload.ts:117-139` `uploadMissionPhoto()` 흐름. Storage 업로드(원본+썸네일) 후 Firestore 트랜잭션 실패시 Storage 파일이 남음. 같은 슬롯 재업로드 시 새 파일 또 만들고 이전은 orphan.
- **영향**: Storage 용량 누적. 행사당 수십 MB. 가시적 문제 X.
- **조치**: 트랜잭션 catch 에서 `deleteObject(originalRef)`, `deleteObject(thumbRef)` cleanup. 또는 v1.7 Cloud Function 정리 작업 추가.

#### LT-6. 모든 슬롯이 채워진 상태에서 추가 업로드 시 마지막 슬롯 덮어쓰기
- **증거**: `src/lib/upload.ts:82-86` `chooseTargetSlot()` 가 "빈 슬롯 → 적게 채워진 슬롯" 순으로 고름. 모든 슬롯이 가득 차도 fallback 으로 한 슬롯 선택 → 그 슬롯의 추가 사진으로 들어감. 대표가 덮이진 않음(기존 대표 유지)이지만, 사용자 의도와 모호.
- **조치**: `placeSlots.every(s => s.submissionCount >= someLimit)` 체크하고 "이 장소는 이미 모두 채워졌어요" 토스트 + 업로드 차단. 또는 명시적 "보너스 사진" 정책.

#### LT-7. 검수 (`/events/:id/review`) 마지막 미확인 슬롯 처리 후 같은 자리 머무름
- **증거**: `src/pages/EventReview.tsx:78-81` `moveNextUnchecked()` 가 다음 unchecked 없으면 `selectedSlot` 자신을 다시 선택 → "다음 미확인" 버튼이 동작 안 한 것처럼 보임. (무한 루프는 아님, 그냥 무동작)
- **조치**: `nextUnchecked` 가 없으면 "모든 슬롯 검수 완료" 토스트 + Board 또는 Overview 로 자동 복귀.

#### LT-8. 셔플 / 잠금 토글의 UX 모호 (Export)
- **증거**: `src/pages/EventExport.tsx:216-234`. 잠금된 상태에서 "다시 셔플" 버튼이 disable 처리 안 됨. 사용자가 누를 수 있는데 효과 모호.
- **조치**: `events.layoutLockedAt` 있을 때 셔플 버튼 disabled + "잠금 해제 후 셔플 가능" 툴팁.

---

### 🟢 작은 UX / 폴리시 (행사 후 점진 개선)

- **푸시 알림 카드 영구 노출**: `/events` 화면에 "Web Push 키가 없어서 Firebase 기본 키로 시도합니다" 가 매번 노출. VAPID 키 발급 후엔 자동으로 사라지지만, 발급 전엔 매번 거슬림. dismiss 가능하게.
- **`uploaderName` 공백 입력 처리**: `src/lib/selfies.ts` `cleanName?.trim()` 이 있으나 공백만 입력하면 빈 문자열. placeholder 를 "이름 선택사항" 으로 명시.
- **face-api 로딩 실패 시 사용자 안내 없음**: `src/lib/face.ts:131-133` 가 조용히 center crop 으로 폴백. 토스트 한 줄이면 검수자가 알기 쉬움.
- **`/share/:eventId` 에러 메시지 한 줄 통일**: `src/hooks/useSharedEvent.ts:79-86` 에서 status !== 'completed' 와 존재 안 함을 같은 메시지로 처리. 보안적으론 좋음(존재 여부 미노출). 단 운영자 본인이 자기 draft 이벤트로 잘못 들어갔을 때 혼란 가능.
- **이벤트 status 자동 전환 미구현**: draft → live → completed 자동 전환 로직 없음. 운영자가 수동으로 status 바꿀 UI 도 없음. Phase 16 의 `/share` 가 작동하려면 누군가 `events.status = 'completed'` 를 만들어야 함. → 행사 종료 토글 버튼 (Export 페이지나 Overview 헤더) 추가 필요.

---

## 라이브 + 코드 워크스루로 확인한 정상 동작 (긍정 평가)

- 마법사 3단계 진행 바, 실시간 슬롯 계산, 분배 합계 0/2 → 2/2 시각화 — 매우 깔끔
- placeholder 카피가 행사 맥락 풍부 ("예: 2026 Vision Trip", "예: 경포 해변", "예: 모든 팀원 함께 / 입장권 인증")
- 장소 편집 풀스크린 모달 — 저장 버튼 처음 disabled → 이름 채우면 활성. 좋은 가드
- 이벤트 만들기 직전 안내문 "팀 2개와 슬롯 4칸이 자동 생성되고, 각 팀에 랜덤 토큰이 발급됩니다" — 사용자 마음 준비
- 팀 QR 관리 화면의 카드: QR 미니 + 입장 카운터(`아직 아무도 입장 안 함 · 0/2`) + 복사·공유·풀스크린 아이콘
- 팀 QR 풀스크린의 *"팀원 전원에게 공유 — 이 QR 을 스캔한 모든 사람이 1팀 멤버로 입장합니다"* 안내 카드 — 운영자가 안심
- Firebase 익명 Auth 비활성 시 화면이 빈 흰 화면이 아니라 **빨간 박스 + 명확한 안내** 로 즉시 알려줌 — 설계 매우 좋음
- PWA 산출물 (manifest, service-worker, icons) 모두 200 응답 + Service Worker 활성

---

## 행사 직전 체크리스트 (이 보고서 → 액션 변환)

### 콘솔 작업 (직접)

1. ☐ **Firebase Console → Authentication → Sign-in method → Anonymous 활성화** ← LT-1, 가장 시급
2. ☐ Firebase Console → Project settings → Cloud Messaging → Web Push certificates → Generate key pair → `.env` 의 `VITE_FIREBASE_VAPID_KEY` 입력 → 재배포 (선택, 푸시 알림 안 쓰면 skip)
3. ☐ Google Cloud Console → Credentials → Firebase Web API Key Application restrictions → HTTP referrers 화이트리스트 (운영 도메인 + localhost)
4. ☐ Firebase Console → Authentication → Authorized domains 에 운영 도메인 + localhost 만 남았는지 재확인

### 코드 수정 (Claude Code 에 보낼 명령)

5. ☐ LT-2: 팀 라벨 헬퍼 공통화 + 6개 호출 지점 정리 (`src/lib/teamLabel.ts` 신설)
6. ☐ LT-3: 이벤트 생성 직후 `/events/:id/teams` 로 자동 이동 + Overview 페이지에 "팀 QR 관리" CTA 카드
7. ☐ LT-7: 검수 마지막 미확인 후 "검수 완료" 토스트 + Board 복귀
8. ☐ LT-8: 잠금 상태에서 셔플 버튼 disabled
9. ☐ 자잘: 푸시 알림 카드 dismiss, face-api 실패 토스트, share 에러 메시지 톤 다운

### 실제 휴대폰 테스트

10. ☐ 1번 콘솔 작업 후, 휴대폰 2대로 같은 이벤트의 다른 팀 QR 스캔 → 셀카 + 사진 업로드 → 운영자 노트북에서 Live 보드 실시간 반영 확인 → Export 콜라주 PNG / ZIP 다운로드 → 공개 보드 새 창에서 fadeIn 모션 확인

---

## 정리된 명령어 (Claude Code 에 한 번에 보낼 수 있는 형태)

```
LIVE_TEST_REPORT.md 의 🔴/🟡 항목 중 LT-2, LT-3, LT-7, LT-8 을 처리해줘:

LT-2: src/lib/teamLabel.ts 신설해서 displayName !== name 일 때만 ` · ` 추가하는 helper getTeamLabel(team) 으로 통일. EventOverview.tsx:112 / TeamPlaces.tsx:117 / TeamEntry.tsx:77 / TeamQRDetail.tsx / EventTeams.tsx / qrSheetPdf.ts 6 군데 모두 새 헬퍼로 치환.

LT-3: 이벤트 생성 직후 (src/pages/EventCreate.tsx 의 createEvent 성공 콜백) navigate 대상을 /events/:id 가 아니라 /events/:id/teams 로. + EventOverview.tsx 헤더 또는 stat 타일 옆에 "팀 QR 관리" CTA 카드 추가 (lucide-react QrCode 아이콘).

LT-7: EventReview.tsx 의 moveNextUnchecked 가 nextUnchecked 없을 때 setNotice("모든 슬롯 검수 완료") 후 navigate('/events/:id/board') 로 복귀.

LT-8: EventExport.tsx 의 셔플 버튼에 disabled={Boolean(event.layoutLockedAt)} 추가 + title 또는 옆에 "잠금 해제 후 셔플" 안내.

각 항목 한 커밋씩, 마지막에 npm run lint 통과 확인.
```
