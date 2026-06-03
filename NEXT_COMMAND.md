# 다음 작업: 참가자 진행 강화 + 비상 연락 + 행사 직전 폴리시

설계 근거: `LIVE_TEST_REPORT.md` (이미 폴더에 있음).
사용자 요구 추가 반영:
- 운영팀에는 **문자(SMS) 우선**, 전화는 긴급일 때만
- 각 팀 **팀장 1명 필수 입력**
- 운영자도 **각 팀 연락처를 즉시 접근** 가능
- **자주 묻는 질문** 정적 안내 포함

진행 방식: 섹션 1부터 순서대로 처리. **각 섹션 한 커밋씩**, 마지막에 `npm run lint` + `npm run build` 통과 확인. SPEC.md / CONTEXT.md 도 §17 (연락처) 로 갱신.

일정 빠듯하면 **묶음 1 (섹션 1~7) 만 먼저** 처리해도 행사 운영 가능. 묶음 2 (섹션 8~11) 는 LT 폴리시 + 문서 갱신.

---

## 1. 데이터 모델 (src/lib/types.ts)

**MissionEvent 에 추가 (필수)**
```ts
organizer: {
  name: string;       // "김운영"
  role?: string;      // "행사 진행 담당"
  phone: string;      // sanitize 후 저장
  contactPreference?: "sms-first" | "call-first";  // 기본 "sms-first"
};
showLeaderboard?: boolean;  // 기본 true
```

**Team 에 추가 (필수)**
```ts
leader: {
  name: string;       // "박팀장"
  role?: string;      // "1팀 모임 안내"
  phone: string;
};
```

**전화번호 헬퍼 — `src/lib/phone.ts` 신설**
- `sanitizePhone(input: string): string` — 숫자 + `+` + `0` 만 보존
- `formatPhone(phone: string): string` — 010-1234-5678 식 포맷
- `telHref(phone: string): string` — `tel:` URI
- `smsHref(phone: string, body?: string): string` — `sms:` URI, body 는 URL encode

---

## 2. 이벤트 생성 마법사 — 운영팀 연락처 (필수)

`src/pages/EventCreate.tsx` STEP 1 의 "이벤트" 섹션 아래에 **"운영팀 연락처"** 섹션 추가:
- 이름 * (placeholder "예: 김운영")
- 역할 (placeholder "예: 행사 진행 담당")
- 전화번호 * (placeholder "010-1234-5678")
- 문자 우선 / 전화 우선 토글 (기본 "문자 우선")

STEP 1 다음 버튼 검증에 `organizer.name` + `organizer.phone` 비어있으면 disabled.

---

## 3. 팀별 팀장 입력 — 필수, 마법사 신규 단계

기존 STEP 2 (장소·분배) 와 STEP 3 (미리보기) 사이에 **STEP 3 "팀장 등록"** 신설 → 총 **4단계 마법사**. 진행 바 dot 3개 → 4개.

설계:
- 헤더: "팀장 N명을 알려주세요"
- 팀 수만큼 행. 각 행: `[팀명 (1팀, 2팀...)] [이름 * ] [전화 *]`
- 모든 팀의 이름 + 전화가 채워져야 다음 단계 활성

`src/lib/createEvent.ts` 수정:
- 입력 인자에 `leaders: Array<{ teamIndex: number; name: string; phone: string }>` 추가
- batch write 에서 각 team 문서에 `leader` 같이 저장

---

## 4. 팀장 정보 사후 편집 (운영자)

`src/pages/EventTeams.tsx` (팀 QR 관리) 각 팀 카드에:
- 팀장 이름 + 전화 한 줄 표시
- 우측 ⋮ 또는 [편집] 버튼 → 인라인 폼 또는 작은 모달로 수정
- 헬퍼: `updateTeamLeader(eventId, teamId, leader)` — `src/lib/createEvent.ts` 또는 신규 `src/lib/teams.ts`

---

## 5. 운영자 화면 — 각 팀 연락처 즉시 접근

세 곳에 동일 패턴 `[전화]` `[문자]` 아이콘 두 개. 클릭 시 `tel:` / `sms:` 바로 호출.

5a. `src/pages/EventOverview.tsx` — 팀별 진행률 카드 행 우측에 phone 아이콘 + message 아이콘
5b. `src/pages/EventTeams.tsx` — 각 팀 카드 기존 액션 (복사/공유/풀스크린) 옆에 phone + message 추가
5c. `src/pages/EventReview.tsx` — 검수 슬롯 헤더에 그 슬롯 소속 팀장 연락처

SMS 본문 정적 prefill: `"안녕하세요, [이벤트 제목] 운영팀입니다."`

---

## 6. 참가자 진행 화면 강화 (TeamPlaces)

`src/pages/TeamPlaces.tsx` 를 다음 구조로 재정렬:

(1) **헤더**: 팀 라벨 (getTeamLabel helper) + 우측 phone-call 아이콘 → 도움 시트 열기
(2) **메인 진행 박스** (프라이머리 컬러 배경, 흰 글자):
    - 큰 숫자 `[완료] / [전체]` + `[남은 수] 개 남음` 뱃지
    - 진행 바
    - `events.showLeaderboard === true` 일 때만 "전체 N팀 중 X등 · 평균보다 ~" 한 줄
(3) **함께 있어요** row (현재 SelfieBanner 와 합쳐도 됨)
(4) **장소별 진행 카드** — 3가지 상태:
    - 완료: 좌측 초록 띠 + ★● dots + "완료" 라벨
    - 진행 중: 좌측 파란 띠(테두리 강조) + 채움 dots + "[N장 더!]" 액션 라벨
    - 시작 전: 좌측 회색 띠 + 빈 dots + "시작 전" 라벨
    카드 전체 클릭 → `TeamPlaceDetail` 로 이동
(5) **하단 "도움이 필요해요" 카드** — 작은 카드, 탭하면 도움 시트

---

## 7. 도움 시트 (HelpSheet)

`src/components/HelpSheet.tsx` 신설. 풀스크린 모달 또는 bottom sheet. 열고 닫기 상태는 TeamPlaces / TeamPlaceDetail / TeamSelfie 공통 사용 가능.

**7a. 행사 운영팀 카드**
- 운영자 이름 + 역할
- **메인 CTA = 문자 보내기** (강조 컬러, 큰 버튼) — 위쪽
- **보조 CTA = 전화 (긴급)** (테두리만, 작은 버튼) — 아래쪽 + 옆에 "* 정말 급할 때만" 한 줄
- SMS 본문 prefill: `"[1팀 한강조] 도움이 필요합니다. "`

**7b. 우리 팀 팀장 카드**
- 팀장 이름 + 역할
- **전화 / 문자 동등 비중** (같은 크기, 가로 두 버튼) — 가족·팀원이라 부담 적음
- SMS 본문 prefill: 빈 문자열

**7c. 자주 묻는 질문 (정적 v1)**

각 항목 details/접기 토글. 펼치면 안내 텍스트.

- **QR 스캔이 안 돼요** → "휴대폰 기본 카메라 앱으로 다시 스캔해 보세요. 그래도 안 되면 운영팀에게 카톡으로 받은 링크를 직접 눌러주세요."
- **장소를 못 찾았어요** → "장소 카드의 [지도로 위치 보기] 를 눌러 네이버/카카오 지도로 이동할 수 있어요. 그래도 안 보이면 운영팀에 문자해 주세요."
- **사진이 안 올라가요** → "잠시 후 다시 시도하거나 새로고침 후 재업로드. 같은 문제가 반복되면 운영팀에 문자해 주세요."
- **팀이 잘못 들어왔어요** → "운영팀에 문자로 알려주세요. 운영팀에서 정리해 드립니다."
- **셀카를 다시 찍고 싶어요** → "현재 운영팀에서만 변경 가능합니다. 운영팀에 문자로 요청해 주세요." (v1.5 에서 사용자 직접 변경 가능)

---

## 8. 행사 직전 LT 폴리시 (LIVE_TEST_REPORT.md 발견 항목)

**LT-2 — `src/lib/teamLabel.ts` 신설**
```ts
export function getTeamLabel(team: { name: string; displayName?: string }): string {
  return team.displayName && team.displayName !== team.name
    ? `${team.name} · ${team.displayName}`
    : team.name;
}
```
기존 중복 헬퍼 (`TeamQRDetail.tsx`, `EventTeams.tsx`, `qrSheetPdf.ts`) 모두 신규 헬퍼로 import 통일.
잘못된 호출 3 곳 수정:
- `EventOverview.tsx:112` → `getTeamLabel(team)`
- `TeamPlaces.tsx:117` → `getTeamLabel(context.team)`
- `TeamEntry.tsx:77` → `getTeamLabel(context.team)`

**LT-3 — 팀 QR 진입 동선**
- 이벤트 생성 성공 직후 `navigate` 대상을 `/events/:id` → `/events/:id/teams` 로 변경
- `EventOverview` 헤더 또는 stat 타일 옆에 "팀 QR 관리" CTA 카드 (lucide-react QrCode 아이콘) 1개

**LT-7 — 검수 마지막 미확인 처리**
- `EventReview.tsx` 의 `moveNextUnchecked` 에서 nextUnchecked 없으면 `setNotice("모든 슬롯 검수 완료")` 후 `navigate(\`/events/${eventId}/board\`)`

**LT-8 — Export 셔플/잠금**
- `EventExport.tsx` 의 셔플 버튼에 `disabled={Boolean(event.layoutLockedAt)}` 추가 + 옆에 "잠금 해제 후 셔플" 안내

---

## 9. SPEC.md / CONTEXT.md 갱신

**SPEC.md §17 추가**: 연락처와 도움 시트
- 17.1 데이터 모델 (events.organizer, teams.leader, showLeaderboard)
- 17.2 입력 흐름 (마법사 STEP 1, STEP 3)
- 17.3 도움 시트 (참가자: SMS 우선 / 팀장: 균등 / FAQ 5개)
- 17.4 운영자 측 빠른 접근 (Overview, Teams, Review 의 [전화][문자])

**CONTEXT.md Phase 진행 상태 표에 한 줄 추가**:
```
| (신규) | 참가자 진행 강화 + 비상 연락 | ✓ 완료 |
```

---

## 10. Firestore Rules 영향 검토

`events.organizer` / `teams.leader` 는 운영자만 write.
- 기존 `events update` / `teams update` 규칙이 `isEventOwner` 이면 충분
- 추가 변경 불필요. 검토만 진행하고 그대로 둠

---

## 11. 마이그레이션

기존 이벤트 (이미 만들어진 데이터) 는 organizer / leader 필드 없음.
- 클라이언트는 옵셔널 체이닝으로 안전 처리:
  - `events.organizer?.phone` 없으면 "도움이 필요해요" 카드 안 보임
  - `teams.leader` 없으면 도움 시트의 팀장 카드 숨김
- 새 이벤트만 채워지면 OK. graceful degradation

---

## 검증 (모든 섹션 후)

- `npm run lint`
- `npm run build`
- 새 이벤트 생성 → 운영팀 + 팀장 입력 → 팀 QR 발급 → 참가자 진입 → 도움 시트 열기 → 운영팀 SMS 가 메인 / 전화 보조 / 팀장은 균등 표시 시각 확인
- 기존 이벤트 (organizer 없는 것) 진입 → 도움 카드 숨김 / 에러 안 남
- 행사 끝나고 알려줘
