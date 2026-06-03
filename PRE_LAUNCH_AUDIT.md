# Photo Mission Board · 행사 전 깊은 점검 보고서

작성일: 2026-05-28
점검 방법: 운영자 입장 + 참가자 입장 양쪽 코드 흐름 전체 추적 + 라이브 일부 확인
한 줄 평: **이미 처리된 부분이 많아 견고. 하지만 행사 직전 반드시 손봐야 할 🔴 3건 + 행사 중 불편 🟡 6건 + 추천 기능 ✨ 5건.**

---

## 정리된 fix 항목 (이미 적용 — 안심해도 됨)

| 항목 | 상태 |
|------|------|
| LT-1 Anonymous Auth 활성화 | ✅ 콘솔에서 활성화 완료 |
| LT-2 팀 라벨 헬퍼 `getTeamLabel` 통합 | ✅ 8개 파일에서 정상 사용 |
| LT-3 이벤트 생성 직후 `/teams` 자동 이동 + Overview CTA | ✅ 적용 |
| LT-7 검수 마지막 미확인 후 `/board` 자동 이동 | ✅ `EventReview.tsx:92-105` 적용 |
| LT-8 Export 잠금 후 셔플 안내 | ✅ `EventExport.tsx:217` "잠금 해제 후 셔플" 안내문 |
| LT-9 firestore.rules collectionGroup matcher | ✅ 어제 추가 + Section 10 커밋으로 git 동기화 |
| Phase 16 영구 공유 링크 코드 | ✅ ShareEvent + useSharedEvent + rules 모두 적용 |
| 비상 연락 (HelpSheet) | ✅ TeamPlaces / TeamSelfie / TeamPlaceDetail 3 곳에서 통합 |
| 운영팀 + 팀장 필수 입력 (4단계 마법사) | ✅ EventCreate.tsx STEP 3 신설 |
| 운영자 화면 [전화][문자] 빠른 접근 | ✅ EventOverview / EventTeams / EventReview 3 곳 |
| VAPID 키 발급 + `.env` + 배포 | ✅ 어제 처리 |
| Collection Group Index 정의 | ✅ `firestore.indexes.json` + `firebase.json` 연결 (배포 대기) |

---

## 🔴 행사 직전 반드시 처리 (3건)

### A. Firestore Collection Group Index 배포 (5초)

오늘 새로 발견됐고 코드도 준비됨. 사용자 콘솔 작업 + 1줄.

**증거**: 라이브 진입 시 빨간 박스 *"The query requires a COLLECTION_GROUP_ASC index for collection teams and field token"*

**조치**:
```
cd /Users/uedutainment_dev/Dev/photo-mission-board
firebase deploy --only firestore:indexes
```
또는 그 빨간 박스의 링크를 클릭해서 콘솔에서 자동 생성. 둘 다 됩니다. **하지 않으면 모든 참가자 QR 진입 실패**.

### B. 행사 종료 = `status: 'completed'` 전환 UI 부재

**증거**: 코드 전체에 운영자가 status 를 바꿀 수 있는 UI 가 없음. `grep` 으로 확인. `Events.tsx:22` 의 statusText 는 단순 표시 로직.

**영향**:
- 행사 후 운영자가 Export 까지 마쳐도 `/share/:eventId` 가 *"종료된 이벤트만 공유 링크로 볼 수 있습니다"* 로 막힘
- Phase 16 영구 공유 링크 기능 자체가 사용 불가능한 상태
- 운영자가 Firebase Console 에서 직접 Firestore 문서 수정해야 share 활성화 가능 — 비현실적

**조치**: EventExport 페이지 또는 EventOverview 헤더에 **"행사 종료"** 토글 버튼 추가.
```ts
// updateDoc(doc(db, "events", eventId), {
//   status: "completed",
//   closedAt: serverTimestamp()
// })
```
종료 후 `/share/:eventId` 링크 자동 표시 + 카톡 공유 버튼.

### C. 새 사진 알림 (운영자) — 수동 새로고침 외 인지 방법 없음

**증거**: `messaging.ts` 가 VAPID 등록 + FCM 토큰 저장은 되지만, **Cloud Function 발송 트리거가 아직 미구현**. 운영자가 새 사진을 알려면 브라우저를 계속 열어두고 `useEventLive` 의 onSnapshot 으로 실시간 반영을 보는 수밖에 없음.

**영향**:
- 운영자가 브라우저 다른 탭 보거나 잠시 자리 비울 때 깜깜
- 미확인 슬롯이 쌓여도 모름

**조치 (선택)**:
- 행사 직전 빠른 해결: 운영자가 화면 1대를 항상 Overview 또는 Board 에 켜둠. 행사 운영 일반 패턴이라 가능.
- v1.7: Cloud Function 으로 photos onCreate → 운영자 fcmTokens → admin.send. Blaze ✓ 이므로 가능. 한 사이클 추가 작업.

**판단**: 행사 한 번은 운영자가 브라우저 켜두는 패턴으로 진행. Cloud Function 은 행사 후.

---

## 🟡 행사 중 불편 (6건)

### D. 셀카 업로드 / 사진 업로드 실패 시 복구 모호

**증거**: `TeamSelfie.tsx:43-67`, `TeamPlaceDetail.tsx:74-102`. 업로드 실패 시 에러 토스트만 표시되고 자동 재시도 없음. HelpSheet 의 FAQ "사진이 안 올라가요" 도 "잠시 후 다시 시도하거나 새로고침 후 재업로드" 라는 모호한 안내.

**조치 (v1.5)**: 업로드 실패 시 "다시 시도" 버튼 명시 + 3초 후 자동 재시도 1회. "새로고침" 안내문을 "페이지를 새로고침한 후 같은 사진을 다시 선택하세요" 로 구체화.

### E. face-api.js 로딩 실패 시 사용자 무감지

**증거**: `src/lib/face.ts:131-136` 가 실패 시 `console.warn` 만 함. 사용자는 셀카가 자동 중앙 크롭(0.5, 0.5)으로 보임에도 모름.

**조치**: 폴백 시 한 줄 토스트 *"얼굴 인식을 못 했어서 자동 중앙 크롭으로 저장합니다. 운영자가 검수 단계에서 조정합니다."* (한 번만 표시, 닫기 가능)

### F. 그룹 셀카 모드의 누가/언제 올려야 하나 불명확

**증거**: `TeamSelfie.tsx:29-33` 의 `groupPhotoReady` 체크. `SelfieBanner.tsx:94-96` 의 빈 셀이 "대기 중" 으로만 표시. 팀원 중 한 명이 단체 사진을 올려야 함을 명확히 안내하지 않음.

**조치**: 그룹 모드일 때 헤더에 *"팀원 한 명이 단체 사진 1장만 올리면 됩니다"* 노란 띠. 셀카 올린 사람의 이름 표시.

### G. 도움 시트의 운영팀 vs 팀장 위계 모호

**증거**: `HelpSheet.tsx:69-92` 에서 운영팀 카드의 SMS 우선 / 전화 보조는 강조됐지만, 팀장 카드(:98+) 와 시각적으로 동등. 참가자가 "팀장 먼저? 운영팀 먼저?" 헷갈림.

**조치**: 두 가지 중 하나
- (a) 도움 시트 상단에 한 줄: *"가까운 팀장에게 먼저 물어보고, 답 없으면 운영팀에 SMS"*
- (b) 운영팀 카드에 옅은 배경색 강조 + "가장 빠른 길" 작은 뱃지

### H. 진행 막힌 팀이 한눈에 안 보임 (운영자 Overview)

**증거**: `EventOverview.tsx:119-165` 의 팀별 진행률이 % 순서 무관 정렬. 4팀 진행률 [100, 83, 33, 0] 일 때 "0% 팀이 어디 막혔는가" 즉시 안 보임 (스크롤 + 시각 비교 필요).

**조치 (간단)**: 팀 카드 정렬을 "마지막 활동 시각 오래된 순" 또는 "진행률 낮은 순" 으로 자동. 또는 "진행 중 / 막힘 / 완료" 필터 토글 1개.

### I. 미확인 슬롯 카운트 드릴다운 부재

**증거**: `EventOverview` 미확인 슬롯 카운트는 표시되지만, 어느 팀의 어느 슬롯인지 클릭으로 못 감. Review 탭으로 가서 직접 찾아야 함.

**조치**: 미확인 슬롯 stat 타일을 클릭 가능하게 → `/review?next=unchecked` 로 직진.

---

## 🟢 사소 / 행사 후 점진 (8건)

- **사진 삭제 시 대표 자동 변경 안내 없음** (`upload.ts:174-212`) — "대표 사진을 삭제합니다. 다음 사진이 자동으로 대표가 됩니다." 확인 모달
- **SelfieBanner 이름 폰트 작음** (`SelfieBanner.tsx:89` `text-[10px]`) — `text-xs` 로 키우거나 호버 팝업
- **업로드 중 로더 명확성** — 버튼에 `Loader2` 아이콘 + "업로드 중" 라벨
- **참가자 이름 매번 재입력** (`TeamPlaceDetail.tsx:46`, `TeamSelfie.tsx:22`) — `sessionStorage` 에 캐시
- **모든 미션 완료 후 만족감/축하 없음** (`TeamPlaces.tsx`) — 100% 도달 시 confetti 모션 + "완성!" 배지 한 번
- **EventOverview 진행률 0% 팀 시각 강조 없음** — 진행률 막대 색을 점진 (회색 → 노랑 → 초록)
- **STEP 3 (팀장 등록) 일괄 입력 부담** — 큰 행사(10+ 팀) 시 폼이 길어짐. CSV 붙여넣기 또는 "전체 동일 운영팀 번호 적용" 토글
- **이벤트 삭제/아카이브 UI 없음** — 운영자가 테스트 이벤트 정리 못 함. 행사 후 cleanup 시 불편

---

## ✨ 추천 기능 (가치 높음)

### ✨1. 행사 종료 토글 + 자동 공유 링크 (= 위 🔴 B)

행사 종료 한 번의 액션으로:
1. `events.status = 'completed'` 업데이트
2. `events.closedAt = serverTimestamp()` 기록
3. `/share/:eventId` 공유 카드 자동 표시 + 카톡/링크 복사 버튼
4. (선택) 모든 참가자에게 안내 SMS

**가치**: 매우 높음. Phase 16 의 실질 활용 + 행사 마무리 단계의 자연스러운 흐름.

### ✨2. 미션 완료 축하 모션 (참가자)

진행률 100% 도달 시:
- confetti 모션 0.8s
- "완성!" 배지 + 팀 컬러 강조
- "다른 팀의 사진도 보러 가기" → 공개 보드 링크

**가치**: 높음. 참가자가 "끝났다!" 만족감을 받는 마지막 순간. 행사 입소문 강화.

### ✨3. 운영자 팀 카드 미니 보드

EventOverview 의 팀 카드 클릭 시 작은 드로어:
- 그 팀의 미션 진행 dots
- 마지막 활동 시각
- 셀카 안 올린 멤버 ○명
- 빠른 [전화][문자] 버튼

**가치**: 높음. 운영자가 "어느 팀이 막혔나" 즉시 파악.

### ✨4. 사진 정리 모드 (참가자)

`TeamPlaceDetail` 우측 상단 **편집** 버튼 → 모드 전환:
- 다중 선택 + 일괄 삭제
- 대표 사진 한 번에 변경
- 사진 순서 드래그 변경

**가치**: 중상. 행사 중 사진 많이 올린 팀에게 유용. 행사 후 정리에도.

### ✨5. 운영팀 SMS 우선 시각 강조 (= 위 🟡 G 조치)

`HelpSheet.tsx` 운영팀 카드 배경 강조 + "가장 빠른 길" 뱃지.

**가치**: 중. 코드 1~2줄로 가능. 가성비 최고.

---

## Over-engineering 으로 행사 첫 회는 미루는 것

- ❌ 푸시 알림 발송 Cloud Function — 운영자가 화면 1 대 열어두는 패턴으로 행사 한 번은 OK. Blaze 결제 + 함수 작성 + 토큰 관리 cleanup 까지 한 사이클 따로
- ❌ 위치 기반 자동 장소 추천 — GPS 권한 / 배터리 / 정확도. 1차 행사에선 mapUrl 외부 링크로 충분
- ❌ 사진 캡션 / 이모지 반응 — 행사 시간 중 텍스트 입력 부담. 행사 후 회고 페이지 별도
- ❌ 다른 팀 사진 슬쩍 보기 — 경쟁 자극 양면성. 행사 후 공개 보드에서 한꺼번에 공개
- ❌ 빔 모드 카운트다운 / "다음 사진까지 N초" — 행사 첫 회는 단순 LIVE 헤더로 충분
- ❌ 사진 부적절 신고/숨김 — 정책 수립 필요. v2

---

## 행사 전 최종 우선순위

```
오늘 안에 (사용자 콘솔/터미널, 5~10분):
  A. firebase deploy --only firestore:indexes  → 참가자 진입 정상화
  C. 운영자 화면 1대 항상 켜두는 운영 패턴 합의

행사 1~2일 전 (Claude Code 명령 1건, 30~60분):
  B. 행사 종료 토글 + 자동 공유 링크 (✨1)
  E. face-api 폴백 토스트
  G. 도움 시트 운영팀 강조 (✨5)
  + 시간 여유 시 H. 진행 막힌 팀 정렬

행사 후 v1.7 사이클:
  Cloud Function 발송 트리거 (C 잔여)
  ✨2 축하 모션
  ✨3 운영자 팀 미니 보드
  ✨4 사진 정리 모드
  나머지 🟢 항목
```

---

## 진짜 마지막 — 사용자분 검증 체크리스트 (휴대폰 2대)

행사 전 풀 플로우 확인용 (Claude Code 작업 + index 배포 후):

1. ☐ 새 이벤트 생성 (4단계 마법사 끝까지 → 운영팀 + 팀장 입력 확인)
2. ☐ 팀 QR 자동 이동 → A4 PDF 다운로드
3. ☐ 휴대폰 1: 1팀 QR 스캔 → 환영 화면 → 셀카 → 미션 목록 → 한 장 업로드
4. ☐ 휴대폰 2: 2팀 QR 스캔 → 같은 흐름
5. ☐ 휴대폰 1: HelpSheet 열기 → 운영팀 SMS 버튼 → 메시지 앱 열림 확인
6. ☐ 운영자 노트북: Overview 에서 실시간 반영 + 팀별 [전화][문자] 작동
7. ☐ 검수 → 마지막 미확인 처리 후 Board 자동 이동
8. ☐ Export → 콜라주 PNG / 원본 ZIP / 셀카 모음 다운로드
9. ☐ 공개 보드 새 창 → 풀스크린 + fadeIn 모션
10. ☐ (행사 종료 토글 구현 후) status='completed' → `/share/:eventId` 정상 열림
