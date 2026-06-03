# 다음 작업: 이벤트 생성 마법사 / 장소 / 팀장 등록 UX 개선

사용자가 실제 휴대폰으로 입장 + 마법사 사용하면서 발견된 3가지 UX 개선.
모든 작업 후 `npm run lint` + `npm run build` 통과 확인.

---

## 1. 행사 일정 — 자유 텍스트 → 달력 picker

**파일**: `src/pages/EventCreate.tsx`

**현재**: 텍스트 input + placeholder `예: 2026.06.21 (토)`

**변경**:
- `<input type="date">` 사용 — 모바일/데스크톱 모두 네이티브 picker 지원
- 내부 state: ISO 형식 `YYYY-MM-DD`
- 저장 시: `events.scheduledAt` 필드를 ISO 문자열로 (또는 Firestore Timestamp 로 변환)
- 표시 시: 한국어 포맷 `2026.06.21 (토)` 로 변환하는 헬퍼
  - `src/lib/formatDate.ts` 신설: `formatKoreanDate(iso: string): string`
  - 요일 한 글자 (월~일) 자동 계산
- 마법사 STEP 4 미리보기, EventOverview, EventTeams 등 표시되는 곳 모두 헬퍼 사용
- `events.scheduledAt` 필드를 `src/lib/types.ts` 의 `MissionEvent` 에 추가 (optional, 기존 이벤트와 호환)

**검증**: date input 이 placeholder 처럼 동작 — 비어있을 때 회색 안내 텍스트.

---

## 2. 장소 대표 이미지 — 파일 업로드 + 드래그앤드롭

**파일**: `src/components/PlaceEditModal.tsx`, 그리고 `src/lib/storage.ts` 의 헬퍼

**현재**: "대표 이미지 URL" 텍스트 입력만

**변경**:
- 상단에 큰 업로드 영역 (점선 보더, 안에 "이미지를 끌어다 놓거나 클릭" 안내)
- 클릭 시 `<input type="file" accept="image/*">` 트리거
- 드래그앤드롭 이벤트 핸들러:
  - `onDragEnter` / `onDragOver`: 영역 강조 (보더 색 변경)
  - `onDrop`: 파일 받아서 업로드
- 업로드 흐름:
  1. `uploadImage(file, \`events/${eventId}/places/${placeId}\`)` — 1024 썸네일 + 원본 둘 다 (Storage)
  2. 진행 중 spinner + "업로드 중" 라벨
  3. 완료 후 `place.coverUrl` 에 thumbnail URL 자동 채움
  4. URL 입력 칸은 그대로 유지 (외부 URL 도 입력 가능, 둘 중 하나)
- 이미 이미지가 있으면 미리보기 + "교체" / "삭제" 버튼
- 파일 크기 검증: 15MB 이하 (Storage rules 와 일치)
- 파일 타입 검증: image/* 만

**검증**: 휴대폰에서도 동작 (`<input type="file" capture="environment">` 추가는 v2)

**보안**: Storage rules 의 `events/{eventId}/{allPaths=**}` 가 이미 image/* 허용하므로 변경 불필요.

---

## 3. 팀장 등록 — 마법사 STEP 제거 + EventTeams 강조

### 3a. 마법사 4단계 → 3단계 복귀

**파일**: `src/pages/EventCreate.tsx`, `src/lib/createEvent.ts`

**현재**: STEP 1 (기본+운영팀) → STEP 2 (장소) → STEP 3 (팀장) → STEP 4 (미리보기)

**변경**: STEP 3 (팀장) 완전 제거 → STEP 1 → 2 → 3 (미리보기). 진행 바 dot 4 → 3.

- `EventCreate.tsx` 에서 `teamLeaders` state, "팀장 N명을 알려주세요" UI 모두 제거
- `createEvent.ts` 의 `CreateEventInput` 에서 `leaders` 필드 optional 로 (또는 기본 빈 배열)
  - `cleanLeader` 호출 부분 빈 leaders 일 때 skip
  - batch write 에서 `team.leader` 필드 자체를 안 넣음 (없는 상태로 생성)
- `src/lib/types.ts` 의 `Team.leader` 를 **optional** 로 변경 (`leader?: TeamLeader`)

### 3b. EventTeams 페이지에서 팀장 등록 강조

**파일**: `src/pages/EventTeams.tsx`

**현재**: 각 팀 카드에 팀장 편집 ⋮ 메뉴 또는 인라인 폼 (이미 구현됨)

**변경**:
- 팀장 정보가 없을 때 카드 상단에 **노란 안내 띠** + "팀장 등록하기" 버튼 (강조)
  - 색: bg-amber-50 + border-amber-200 + text-amber-800
  - 아이콘: lucide-react `UserPlus` 또는 `AlertCircle`
- "팀장 등록하기" 버튼 클릭 → 인라인 폼 또는 작은 모달 펼침 (이름, 역할, 전화번호 입력)
- 저장 후 띠 사라지고 팀장 카드로 전환
- 이미 등록된 팀장은 현재처럼 이름 + 전화 표시 (좌측 아이콘은 `User`)
- 한눈에 보이게: 등록된 팀장은 카드 우측에 작은 초록 dot, 미등록은 노란 dot

### 3c. EventOverview 팀별 진행률에 팀장 이름

**파일**: `src/pages/EventOverview.tsx`

**현재**: 팀 이름 + 진행률 % + [전화][문자] 아이콘

**변경**: 팀 이름 옆 또는 아래에 작은 글자로 팀장 이름 ("· 박팀장"). 없으면 회색으로 "팀장 미등록" 표시 + 클릭 시 EventTeams 로 이동.

### 3d. 도움 시트의 팀장 카드 graceful degradation

**파일**: `src/components/HelpSheet.tsx`

**현재**: `team.leader` 가 있을 때만 팀장 카드 표시 (이미 구현되어 있을 가능성)

**변경 확인**: `team.leader` 없으면 팀장 카드를 안 보여주고 운영팀 카드만 남기는지 검증. 그리고 도움 시트 상단에 "팀장이 등록되어 있으면 함께 표시됩니다" 같은 안내 X — 그냥 운영팀 카드만 깔끔하게.

---

## 4. SPEC.md / CONTEXT.md 갱신

- `SPEC.md §17.2` 입력 흐름에서 STEP 3 (팀장) 제거 반영. 팀장 등록은 EventTeams 페이지로 옮김
- `SPEC.md` 에 §17.5 추가: 장소 이미지 업로드 + 드래그앤드롭
- `SPEC.md` 에 행사 일정 ISO + 한국어 포맷 헬퍼 한 줄
- `CONTEXT.md` 핸드오프 노트에 "Phase 17.5: 마법사/장소/팀장 UX 개선" 한 줄 추가

---

## 검증

- `npm run lint`
- `npm run build`
- 새 이벤트 생성:
  - 날짜 picker 작동 확인
  - 장소 추가 시 파일 업로드 + 드래그앤드롭 시도
  - 3단계 마법사로 끝나는지 (4단계 아님)
- 이벤트 생성 직후 EventTeams 페이지:
  - 팀장 미등록 상태에서 노란 안내 띠 + "팀장 등록하기" 버튼 보이는지
  - 클릭해서 등록하면 띠 사라지고 카드로 전환
  - EventOverview 가서 팀 이름 옆에 팀장 이름 표시되는지
- 기존 이벤트 (organizer/leader 없는 것) 호환:
  - EventOverview 에서 에러 안 남
  - 도움 시트 graceful degradation
- 휴대폰 1팀 QR 진입:
  - firestore indexes 배포 완료 후 정상 동작 확인
  - 도움 시트 열어서 운영팀 카드 동작
