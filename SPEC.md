# Photo Mission Board · 설계 문서 (SPEC)

> 팀별 참여형 콜라주 이벤트 웹 앱. 여러 팀이 미션 사진을 올려 하나의 콜라주 결과물을 만든다.
> Vision Trip / 사내 워크샵 같은 행사용. Padlet 대체.

---

## 1. 개요

### 1.1 목표
- 행사 운영자가 모바일에서 이벤트를 만들고, 팀별 QR을 발급해 배포한다.
- 각 팀은 QR로 들어와 미리 정해진 슬롯(장소별 정원)에 사진을 채운다.
- 모든 슬롯이 채워지면 큰 콜라주로 export. 원본 사진은 ZIP으로 별도 다운로드.

### 1.2 핵심 가치
- **모바일 우선** — 운영자도 현장에서 휴대폰으로 모든 걸 처리한다 (PC 불필요).
- **팀별 분리** — 한 팀의 사진은 그 팀만 본다. 마지막에 공개 보드에서 일제히 공개.
- **시각적 결과물** — 단순 사진 게시판이 아니라, 빈 칸이 채워져 가는 하나의 큰 콜라주.

### 1.3 비대상
- 다국어 (v1은 한국어만)
- 결제·구독 모델
- 채팅 / 댓글 / 좋아요
- 오프라인 모드 (캐시만 일부)

---

## 2. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 빌드 | Vite | dev 서버 빠름 |
| 프레임워크 | React 18 + TypeScript | |
| 스타일 | Tailwind CSS | mockups.html과 동일한 디자인 토큰 사용 |
| 라우팅 | react-router-dom v6 | |
| 백엔드 | Firebase (Auth + Firestore + Storage + Hosting) | 별도 프로젝트로 생성 |
| 인증 | Firebase Auth · Google Provider (운영자) + 익명 토큰 (팀원) | |
| 실시간 | Firestore `onSnapshot` | |
| 알림 | Firebase Cloud Messaging (FCM) + PWA | v1.5 |
| 이미지 처리 | HTML5 Canvas (콜라주 합성), face-api.js (셀카 자동 크롭, v1.5) | |
| QR 생성 | `qrcode` npm 패키지 | 클라이언트 측 |
| ZIP 생성 | JSZip | 클라이언트 측 |
| 배포 | Firebase Hosting | `firebase deploy` 한 방 |

### 2.1 디렉토리 구조

```
photo-mission-board/
├── mockups.html              ← 디자인 참고
├── SPEC.md / PHASES.md / PROMPT.md / README.md
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── lib/
│   │   ├── firebase.ts       ← Firebase 초기화
│   │   ├── auth.ts           ← Google + 익명 토큰
│   │   ├── types.ts          ← TS 타입 정의
│   │   ├── firestore.ts      ← Firestore 헬퍼
│   │   ├── storage.ts        ← Storage 업로드/다운로드
│   │   ├── crop.ts           ← 크롭 메타데이터 → 캔버스
│   │   ├── collage.ts        ← 콜라주 PNG 생성
│   │   └── qr.ts             ← QR 생성/공유
│   ├── pages/                ← 라우트 페이지
│   ├── components/           ← 공통 컴포넌트
│   └── hooks/                ← React Hooks
├── public/
│   ├── index.html
│   └── (PWA 매니페스트, 아이콘)
├── firestore.rules           ← Firestore 보안 규칙
├── storage.rules             ← Storage 보안 규칙
├── firebase.json             ← Firebase 프로젝트 설정
├── .env.example              ← Firebase 키 템플릿
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.ts
```

---

## 3. 사용자 역할

| 역할 | 인증 방식 | 권한 |
|---|---|---|
| **운영자 (Operator)** | Google 로그인 | 본인 이벤트 CRUD, 검수, Export |
| **팀원 (Team Member)** | URL 토큰 (QR로 전달) | 자기 팀 슬롯 read/write, 다른 팀 데이터 안 보임 |
| **공개 화면 (Public)** | 익명 read-only | 공개 보드 페이지만 |

---

## 4. 데이터 모델

### 4.1 Firestore 컬렉션 구조

```
users/{uid}                                  // Google 로그인한 운영자
events/{eventId}                             // 이벤트
events/{eventId}/teams/{teamId}              // 팀
events/{eventId}/slots/{slotId}              // 슬롯 (팀 × 장소 × 인덱스)
events/{eventId}/photos/{photoId}            // 사진 (슬롯에 올라온 모든 사진)
events/{eventId}/selfies/{selfieId}          // 셀카 (팀 정체성용)
events/{eventId}/notifications/{notifId}     // 운영자 푸시용 (v1.5)
```

### 4.2 문서 스키마

#### users
```ts
{
  uid: string                  // Firebase Auth UID
  displayName: string
  email: string
  photoURL?: string
  createdAt: Timestamp
}
```

#### events
```ts
{
  ownerId: string              // users.uid
  title: string                // "2026 Vision Trip"
  subtitle?: string            // 기존 이벤트 호환용 보조 문구
  scheduledAt?: string         // ISO date "2026-06-21"; formatKoreanDate로 "2026.06.21 (일)" 표시
  status: 'draft' | 'live' | 'completed' | 'archived'
  grid: { rows: number; cols: number }   // 예: { rows: 10, cols: 10 }
  teamCount: number            // 예: 10
  perTeamCount: number         // 그리드 / 팀수 (자동 계산)
  places: Place[]              // 인라인 배열 (보통 3-10개)
  selfieMode: 'individual' | 'group' | 'none'
  layoutMode: 'random' | 'team' | 'manual'
  publicViewMode?: 'board'       // v1.5에서 team/zoom 모드 확장
  layoutLockedAt?: Timestamp   // Export 잠금 시점
  createdAt: Timestamp
  updatedAt: Timestamp
  startedAt?: Timestamp        // 첫 사진 업로드 시각 (이때부터 구조 변경 잠금)
  closedAt?: Timestamp
  retentionUntil?: Timestamp   // 원본 사진 자동 삭제 예정일 (closedAt + 60일)
}

interface Place {
  id: string                   // 짧은 ID
  name: string                 // "경포 해변"
  description?: string
  verifyHint?: string          // "모든 팀원 함께"
  coverUrl?: string            // 운영자가 업로드한 대표 이미지
  coverStoragePath?: string
  mapPlatform?: 'naver' | 'kakao' | 'google'
  mapUrl?: string
  perTeamCount: number         // 이 장소에 팀이 올릴 사진 수
}
```

#### teams
```ts
{
  eventId: string
  index: number                // 1, 2, 3... 정렬용
  name: string                 // "1팀"
  displayName: string          // "바다팀"
  color: string                // hex
  token: string                // URL safe random, 32+ chars
  status: 'idle' | 'joined' | 'active' | 'completed'
  joinedMembers: TeamMember[]  // 셀카 올린 사람들
  uploadedCount: number        // 캐시: 업로드된 사진 수
  completedAt?: Timestamp
}

interface TeamMember {
  uploaderId: string           // 클라이언트 생성 UUID (localStorage)
  displayName?: string         // 본인이 입력 (선택)
  selfieUrl?: string
  joinedAt: Timestamp
}
```

#### slots
```ts
{
  eventId: string
  teamId: string
  placeId: string
  indexInPlace: number         // 같은 장소 안에서의 순번 (0, 1, 2...)
  globalIndex: number          // 전체 보드에서의 위치 (0 ~ total-1)
  representativePhotoId?: string
  submissionCount: number      // 캐시
  reviewStatus: 'unchecked' | 'checked'
  checkedAt?: Timestamp
  createdAt: Timestamp
}
```

#### photos
```ts
{
  eventId: string
  teamId: string
  slotId: string
  uploaderId: string
  uploaderName?: string
  originalPath: string         // Storage 경로
  thumbPath: string
  originalUrl: string          // 다운로드 URL (캐시)
  thumbUrl: string
  cropMeta: { x: number; y: number; scale: number }  // 0~1 정규화
  isRepresentative: boolean    // 대표 여부 (서버에서 단일성 보장)
  width: number
  height: number
  bytes: number
  uploadedAt: Timestamp
}
```

#### selfies
```ts
{
  eventId: string
  teamId: string
  uploaderId: string
  uploaderName?: string
  originalPath: string
  thumbPath: string
  originalUrl: string
  thumbUrl: string
  cropMeta: { x: number; y: number; scale: number }
  faceDetected?: { x: number; y: number; w: number; h: number }  // v1.5
  uploadedAt: Timestamp
}
```

### 4.3 Storage 경로 규약

```
events/{eventId}/cover/{placeId}.jpg               // 장소 대표 이미지
events/{eventId}/cover/{placeId}-thumb.jpg
events/{eventId}/photos/{photoId}.jpg              // 미션 사진 원본
events/{eventId}/photos/{photoId}-thumb.jpg
events/{eventId}/selfies/{selfieId}.jpg            // 셀카 원본
events/{eventId}/selfies/{selfieId}-thumb.jpg
events/{eventId}/exports/collage-{ISO}.png         // 콜라주 PNG
events/{eventId}/exports/originals-{ISO}.zip       // 원본 ZIP
```

### 4.4 자동 계산 / 파생 데이터
- `events.perTeamCount` = `grid.rows * grid.cols / teamCount`
- 장소 분배 합계는 클라이언트가 검증: `sum(places.perTeamCount) === events.perTeamCount`
- 슬롯 자동 생성: 이벤트 생성 시 `teamCount × perTeamCount`개 slot 문서를 일괄 생성

---

## 5. 라우팅

| URL | 누가 보는가 | 인증 |
|---|---|---|
| `/` | 운영자 시작 / 로그인 | unauth |
| `/events` | 내 이벤트 목록 | Google |
| `/events/new` | 이벤트 생성 마법사 | Google |
| `/events/:eventId` | 이벤트 운영자 (탭 4개) | Google + owner |
| `/events/:eventId/teams` | 팀 QR 관리 | Google + owner |
| `/events/:eventId/board` | 라이브 보드 | Google + owner |
| `/events/:eventId/review` | 슬롯 검수 | Google + owner |
| `/events/:eventId/export` | Export | Google + owner |
| `/events/:eventId/public` | 공개 보드 (빔프로젝터용) | 익명 Auth 자동 |
| `/t/:teamToken` | 팀 입장 | 토큰만 |
| `/t/:teamToken/selfie` | 셀카 단계 | 토큰만 |
| `/t/:teamToken/places` | 장소 목록 | 토큰만 |
| `/t/:teamToken/places/:placeId` | 장소 상세 / 업로드 | 토큰만 |
| `/share/:eventId` | 종료된 이벤트 공유 링크 | 누구나 read |

---

## 6. 화면 별 상세

> 시각적 디자인은 `mockups.html` SCENE 1~10 참고.
> 여기엔 동작 / 데이터 / 인터랙션만 정리.

### 6.1 운영자 로그인 (`/`)
- "Google로 로그인" 버튼
- 로그인 후 `/events`로 리다이렉트
- 비운영자가 들어오면 "팀원이라면 QR 스캔" 안내

### 6.2 이벤트 목록 (`/events`)
- `events` 컬렉션에서 `ownerId == auth.uid` 필터
- 탭: 진행중 (`status: 'live'`) / 예정 (`status: 'draft'`) / 종료 (`status: 'completed'`)
- "새 이벤트 만들기" → `/events/new`

### 6.3 이벤트 생성 (`/events/new`) — 3단계 마법사

**STEP 1 · 기본 정보**
- 입력: title, subtitle (선택), `grid.rows`, `grid.cols`, `teamCount`
- 자동 계산: `perTeamCount = rows*cols/teamCount` 표시
- 검증: `rows*cols % teamCount === 0` 아니면 다음 비활성

**STEP 2 · 장소 분배**
- 장소 카드 리스트 + "장소 추가" 버튼
- 장소 편집 모달 (SCENE 2):
  - 필수: name, perTeamCount
  - 선택: description, verifyHint, coverUrl (Storage 업로드), mapPlatform + mapUrl
- 합계 검증: `sum(places.perTeamCount) === perTeamCount` 아니면 다음 비활성

**STEP 3 · 미리보기 / 확정**
- 1팀 분배 색띠
- 빈 콜라주 그리드 미리보기
- "이벤트 만들기" 클릭 → `events` 문서 + `teamCount`개 `teams` + `teamCount * perTeamCount`개 `slots` 일괄 생성 (배치 쓰기)
- 팀 토큰 자동 생성 (랜덤 32자)

### 6.4 팀 QR 관리 (`/events/:eventId/teams`)
- 팀별 카드 + 미니 QR
- 액션: QR 풀스크린 보기 / URL 복사 / 카톡 공유 / 이미지 저장
- "모든 팀 QR PDF로" → 클라이언트에서 jsPDF로 A4 시트 생성
- QR URL: `https://{host}/t/{teamToken}`

### 6.5 팀 입장 (`/t/:teamToken`)
1. 토큰으로 `teams` collectionGroup 쿼리 (또는 `eventId/teamId` 매핑 캐시)
2. 토큰 검증 후 localStorage에 `{ eventId, teamId, uploaderId }` 저장
3. 첫 입장이면 익명 Auth signIn → uploaderId = anon UID
4. 환영 화면 (SCENE 3 / SCENE 5)
5. `selfieMode`에 따라:
   - `individual`: `/selfie`로 이동 (강제)
   - `group`: 팀 단체 사진 1장 (강제)
   - `none`: 바로 `/places`

### 6.6 셀카 단계 (`/t/:teamToken/selfie`)
- 다른 팀원이 올린 셀카가 실시간으로 그리드에 채워짐
- 본인이 아직 안 올렸으면 큰 "셀카 올리기" 버튼
- 올린 사람만 "장소 미션으로 →" 버튼 활성
- 셀카는 `selfies` 컬렉션에 저장, `teams.joinedMembers`에 추가
- 자동 1:1 크롭 (v1) / face-api.js 자동 중심 잡기 (v1.5)

### 6.7 슬롯 목록 (`/t/:teamToken/places`)
- 큰 셀카 배너 (팀 정체성)
- 미션 진행률 카드
- 함께 있는 팀원 아바타
- 장소 카드 리스트 — 진행 dots (★/●/○) + 정원 표시
- 카드 탭 → 장소 상세

### 6.8 장소 상세 / 업로드 (`/t/:teamToken/places/:placeId`)
- 큰 배너 (장소 cover) + 정보 카드 + 지도 버튼
- 진행 상황: 필요 N장 · 올라옴 M장 · 대표 1장
- 사진 그리드 (2열)
  - 대표는 ★ 표시
  - ☆ 탭 → 대표 변경 (Firestore transaction으로 단일성 보장)
  - 사진 탭 → 풀스크린 미리보기 + 삭제 (본인 업로드만)
- 카메라 / 갤러리 업로드 버튼
- 슬롯 정원을 넘게 올려도 OK (대표 1장만 콜라주에 들어감)

### 6.9 운영자 Live Overview (`/events/:eventId`)
- 4 stat 타일 (진행률, 미확인, 총 제출, 활동 팀)
- 팀별 진행률 바
- 최근 업로드 stream (가장 최근 5-10건)
- 하단 탭 (Overview / 보드 / 검수 / Export)

### 6.10 라이브 보드 (`/events/:eventId/board`)
- 레이아웃 토글: 랜덤 셔플 / 팀별 그룹 / 미확인 강조
- 보드 그리드 (`grid.rows × grid.cols`)
- 셀: 채움(썸네일) / 빈 칸 / 미확인(노란 점)
- 다시 셔플 / 미확인 슬롯 → 검수 바로가기

### 6.11 슬롯 검수 (`/events/:eventId/review`)
- 슬롯 카드: 팀명 · 장소명 · 정원
- 사진 그리드 — 운영자가 ★ 변경 가능
- 사진 메뉴: 삭제 / 다운로드 / 회전
- "확인 완료" 토글 → 자동으로 다음 미확인 슬롯

### 6.12 Export (`/events/:eventId/export`)
- 라이브 콜라주 미리보기 (계속 업데이트)
- 레이아웃 토글 + "이 배치로 잠금"
- 잠금 후 다운로드 활성:
  - **콜라주 PNG** — 클라이언트 캔버스 합성, 2400×2400
  - **원본 ZIP** — JSZip, 팀별 폴더 (`1팀_바다/{place}-{idx}.jpg`)
  - **팀 셀카 모음 PNG** — 10팀 셀카 콜라주 합성
- 보관 정책 안내 카드

### 6.13 공개 보드 (`/events/:eventId/public`)
- 풀스크린 검은 배경
- 헤더: 이벤트 제목 + LIVE 표시
- 보드 (rows × cols)
- 푸터: 팀 수 / 진행률 / 슬롯 채움
- 화면 진입 시 익명 Auth를 자동 준비해 라이브/드래프트 이벤트 read를 허용한다. 사용자는 별도 로그인 UI를 보지 않는다.
- 컨트롤은 운영자 폰에서 (Firestore의 `events.publicViewMode` 필드로 동기화)
  - `viewMode: 'board' | 'team-{teamId}' | 'zoom-out-finale'`

---

## 7. 핵심 인터랙션 / 알고리즘

### 7.1 셀카 자동 그리드
팀에 등록된 셀카 수 N에 따라:
```
N=1 → 1x1
N=2-3 → 1x2, 1x3
N=4 → 2x2
N=5-6 → 3x2
N=7-9 → 3x3
N=10 → 5x2
N>10 → ceil(sqrt(N)) × ceil(N/cols)
```
업로드되지 않은 칸은 어두운 팀 컬러 배경.

### 7.2 대표 사진 단일성
한 슬롯에 `isRepresentative: true`는 항상 1개.
Firestore transaction:
```ts
runTransaction(db, async (tx) => {
  // 기존 대표 사진의 isRepresentative를 false로
  // 새 사진의 isRepresentative를 true로
  // slot.representativePhotoId 업데이트
});
```

### 7.3 콜라주 PNG 합성 (클라이언트)
1. 모든 슬롯 데이터 fetch (대표 사진 thumbUrl + cropMeta)
2. 레이아웃 모드에 따라 슬롯 순서 결정:
   - `random`: 시드 기반 셔플 (events.layoutSeed)
   - `team`: 팀 순 → 슬롯 순
3. HTML5 Canvas 2400×2400 생성
4. 각 셀에 이미지 그리기 (cropMeta 적용)
5. `canvas.toBlob('image/png')` → 다운로드
6. (선택) Storage에 업로드해서 공유 링크 발급

### 7.4 원본 ZIP 생성
1. 모든 사진 (대표 + 비대표) Storage URL fetch
2. JSZip으로 폴더 구조: `{팀명}/{장소명}/{order}.jpg`
3. 셀카는 `{팀명}/selfies/{member}.jpg`
4. ZIP blob → 다운로드

### 7.5 토큰 검증 (팀 입장)
- 토큰은 32자 random base62
- 클라이언트가 `/t/:token`으로 들어오면 익명 Auth signIn (`signInAnonymously`)
- 그 다음 `teams` collectionGroup 쿼리: `where('token', '==', token)`
- 매칭되면 localStorage에 `{ eventId, teamId, uploaderId }` 저장
- 이후 모든 쓰기에 이 컨텍스트 동봉
- Firestore Rules에서 토큰 검증은 불가능 → unguessability + Anonymous Auth 조합으로 보호

### 7.6 실시간 동기화
- `onSnapshot` 구독 단위:
  - 운영자 보드: `slots` 전체 + `photos` collectionGroup (where eventId)
  - 운영자 Overview: `events` 단일 + `teams` 컬렉션
  - 팀 페이지: 자기 팀 `slots` + `photos` (where teamId)
  - 공개 보드: `slots` 전체 + `events.publicViewMode`

---

## 8. 보안 (Firestore Rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isEventOwner(eventId) {
      return signedIn()
        && get(/databases/$(database)/documents/events/$(eventId)).data.ownerId == request.auth.uid;
    }

    function isEventOwnerAfter(eventId) {
      return signedIn()
        && getAfter(/databases/$(database)/documents/events/$(eventId)).data.ownerId == request.auth.uid;
    }

    function isCompletedEvent(eventId) {
      return get(/databases/$(database)/documents/events/$(eventId)).data.status == 'completed';
    }

    function changedOnly(keys) {
      return request.resource.data.diff(resource.data).changedKeys().hasOnly(keys);
    }

    // 사용자: 본인만 read/write
    match /users/{uid} {
      allow read, write: if signedIn() && request.auth.uid == uid;

      match /fcmTokens/{tokenId} {
        allow read, write: if signedIn() && request.auth.uid == uid;
      }
    }

    // 이벤트: owner만 write. 비인증 공개 read는 completed 이벤트만 허용.
    match /events/{eventId} {
      allow get: if signedIn()
                 || resource.data.status == 'completed';
      allow list: if (signedIn() && resource.data.ownerId == request.auth.uid)
                  || resource.data.status == 'completed';
      allow create: if signedIn()
                    && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if isEventOwner(eventId);

      // 팀
      match /teams/{teamId} {
        allow read: if signedIn();
        allow create: if isEventOwnerAfter(eventId);
        allow delete: if isEventOwner(eventId);
        allow update: if isEventOwner(eventId)
                      || (signedIn() && changedOnly(['joinedMembers', 'status']));
      }

      // 슬롯
      match /slots/{slotId} {
        allow read: if signedIn()
                    || isCompletedEvent(eventId);
        // 운영자는 이벤트 생성 시 슬롯 create, 진행 중 검수 update 가능
        allow create: if isEventOwnerAfter(eventId);
        allow delete: if isEventOwner(eventId);
        allow update: if isEventOwner(eventId)
                      || (signedIn() && changedOnly(['submissionCount', 'representativePhotoId']));
        // 팀원은 사진 업로드/대표 선택 트랜잭션을 통해 submissionCount와 대표 사진만 변경
      }

      // 사진
      match /photos/{photoId} {
        allow read: if signedIn()
                    || isCompletedEvent(eventId);
        // 익명 사용자도 create 가능 (토큰은 클라이언트가 검증)
        allow create: if signedIn()
                      && request.resource.data.eventId == eventId;
        // 대표 변경은 팀원이 가능, 삭제는 본인 업로드만 또는 운영자
        allow update: if signedIn()
                      && (changedOnly(['isRepresentative'])
                          || resource.data.uploaderId == request.auth.uid
                          || isEventOwner(eventId));
        allow delete: if signedIn()
                      && (resource.data.uploaderId == request.auth.uid
                          || isEventOwner(eventId));
      }

      // 셀카도 동일
      match /selfies/{selfieId} {
        allow read: if signedIn()
                    || isCompletedEvent(eventId);
        allow create: if signedIn()
                      && request.resource.data.eventId == eventId;
        allow update, delete: if signedIn()
                              && (resource.data.uploaderId == request.auth.uid
                                  || isEventOwner(eventId));
      }
    }
  }
}
```

> **참고**: v1은 토큰 unguessability에 의존하는 "약한 보안". 토큰이 새지 않으면 안전.
> v2엔 Cloud Function으로 토큰 → Custom Token 발급해서 정식 인증 강화.

> **공유 링크**: `/share/:eventId`의 비인증 read는 `events.status == 'completed'`일 때만 열린다. 팀 토큰이 포함된 `teams` 문서는 공개 공유 페이지에서 읽지 않는다.

### 8.1 Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function signedIn() {
      return request.auth != null;
    }

    function validUpload() {
      return request.resource != null
        && request.resource.size < 15 * 1024 * 1024
        && request.resource.contentType.matches('image/.*|application/zip');
    }

    match /events/{eventId}/{allPaths=**} {
      allow read: if true;
      allow create, update: if signedIn() && validUpload();
      allow delete: if signedIn();
    }
  }
}
```

---

## 9. 데이터 보관 정책

| 데이터 | 보관 기간 | 비고 |
|---|---|---|
| 원본 사진 (photos, selfies storage 원본) | 행사 종료 후 **60일** | Cloud Scheduler + Function으로 자동 삭제 |
| 썸네일 | 영구 | 작은 크기 |
| 콜라주 PNG (exports) | 영구 | 결과물 |
| Firestore 메타데이터 | 영구 | 사진 메타만 남음 |

- 운영자에게 행사 종료 시 "60일 안에 원본 ZIP을 받아 따로 보관해주세요" 안내
- 자동 삭제 Cloud Function 예: 매일 03:00에 `events where retentionUntil < now()` 쿼리 → Storage 원본 일괄 삭제 + photos의 `originalPath`/`originalUrl` 필드 클리어

---

## 10. 푸시 알림 (v1.5)

### 10.1 운영자에게
- 새 사진 업로드
- 팀 첫 입장
- 팀 모든 슬롯 완료
- 자동 슬라이드 시작 / 종료

### 10.2 구현
- PWA 매니페스트 + service worker
- Firebase Cloud Messaging
- 운영자가 알림 권한 허용 시 FCM 토큰 발급 → `users/{uid}/fcmTokens`에 저장
- Cloud Function이 사진 업로드 트리거에 반응해 운영자에게 send

---

## 11. v1 / v1.5 / v2 범위

### v1 (반드시 포함)
- 운영자 Google 로그인
- 이벤트 생성 3단계 마법사
- 장소 편집 풀스크린 모달
- 팀 자동 생성 + QR 발급
- 셀카 강제/단체사진/없음 모드
- 슬롯 목록 + 사진 업로드 + 대표 선택
- 자동 1:1 크롭 (`object-fit: cover`)
- 운영자 Live Overview / 보드 / 검수
- 레이아웃 토글 3가지 + 다시 셔플
- 슬롯 단위 검수 (확인됨/미확인)
- Export (콜라주 PNG + 원본 ZIP + 셀카 모음)
- 공개 보드 (전체 보드 뷰)
- Firestore 실시간 동기화
- 데이터 보관 60일 정책

### v1.5 (행사 한두 번 돌려보고 추가)
- face-api.js 셀카 자동 얼굴 크롭
- 푸시 알림 (PWA)
- 운영자 검수에서 크롭 슬라이더
- 공개 보드 추가 모드 (한 팀 클로즈업 / 자동 슬라이드 / 줌아웃 피날레)
- A4 QR 시트 PDF
- 종료 이벤트 영구 공유 링크 (`/share/:eventId`)

### v2 (확장 / 옵션)
- 참가자 크롭 드래그 UI (모바일)
- 콜라주 오버레이 텍스트/로고
- 다국어
- 결제 / 무료 한도
- 팀 채팅 / 댓글
- 사용자가 직접 만든 미션 템플릿

---

## 12. 엣지 케이스 / 제약

| 케이스 | 처리 |
|---|---|
| 그리드 100칸 × 팀 7명 = 14.28 → 안 나눠짐 | 마법사 검증, "팀 수가 그리드 약수여야 합니다" 에러 |
| 팀이 정원보다 많이 사진 올림 | OK. 대표 1장만 콜라주. 나머지 ZIP 보관 |
| 팀이 정원에 못 미침 | 콜라주에 빈 칸으로 남음 |
| 한 팀이 셀카 모드인데 셀카 안 올림 | 미션 화면 접근 차단. "셀카부터 올려주세요" |
| 운영자가 사진 삭제 | 삭제됨. 대표였으면 다른 사진 자동 승격 (가장 최근 업로드) |
| 인터넷 끊김 | Firestore offline persistence로 5분 캐시. 5분 이상 끊기면 상단 ⚠ 표시 |
| 동시 업로드 (한 팀에서 5명이 같은 슬롯에) | 모두 photos에 저장. 각자 별개 문서, 충돌 없음 |
| 운영자가 이벤트 중 구조 변경 | `events.startedAt`이 있으면 grid/teamCount/places.perTeamCount 잠금 |
| 큰 파일 업로드 실패 | 자동 재시도 3회, 그 후 사용자에게 "다시 시도" 버튼 |

---

## 13. 환경 변수 (.env)

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_FIREBASE_VAPID_KEY=

VITE_PUBLIC_HOST=https://photomission.app   # QR URL 생성용
```

`.env.example`에 키만 두고, 운영자가 본인 Firebase 프로젝트의 키로 채워 `.env`로 복사.

---

## 14. 개발 우선순위 (요약)

PHASES.md 참고. 큰 흐름:

1. **스캐폴딩** — Vite + React + TS + Tailwind + Firebase 연결
2. **운영자 로그인 + 이벤트 목록** — Google Auth, /events
3. **이벤트 생성 마법사** — 3단계 + 슬롯 자동 생성
4. **팀 QR + 입장** — QR 생성, /t/:token 라우트
5. **팀 셀카 + 슬롯 + 업로드** — 핵심 UX
6. **운영자 Live** — 보드, 검수
7. **Export** — 콜라주 PNG, ZIP
8. **공개 보드** — 빔프로젝터
9. **보안 규칙 / 배포**
10. **v1.5 — face-api, 푸시, 줌아웃 연출, PDF 등**

---

## 15. 디자인 토큰 (Tailwind)

mockups.html과 동일하게 유지:

- 배경: `#f1f5f9` (slate-100)
- 카드: `#ffffff`
- 다크 액센트: `#0f172a` (slate-900)
- 블루 액센트: `#2563eb` (blue-600)
- 성공: `#10b981` (emerald-500)
- 경고: `#f59e0b` (amber-500)
- 위험: `#ef4444` (red-500)
- 텍스트 보조: `#64748b` (slate-500)
- 보더: `#e2e8f0` (slate-200)
- 본문 폰트: system / `Noto Sans KR`

레이아웃: 모바일 우선, 큰 둥근 모서리 (16-24px), 카드 그림자 가볍게, 그라데이션 최소.

---

## 16. 영구 공유 링크 (`/share/:eventId`)

종료된 이벤트를 사내 공지나 메신저에 다시 공유하기 위한 read-only 공개 페이지. 사용자는 Google 로그인이나 팀 QR 없이 링크만으로 볼 수 있다.

### 16.1 공개 조건
- `events/{eventId}.status === 'completed'` 인 이벤트만 노출한다.
- `draft`, `live`, `archived` 이벤트는 페이지에서 "종료된 이벤트만 공유 링크로 볼 수 있습니다." 안내를 보여준다.
- Firestore Rules도 비인증 read를 completed 이벤트로 제한한다.

### 16.2 표시 데이터
- 이벤트 제목, subtitle, 완성률, 대표 사진 수, 셀카 수
- `slots` + `photos`의 `representativePhotoId`/`thumbUrl` 기반 최종 콜라주
- `selfies` 기반 셀카 모음
- `teams` 문서는 공개 페이지에서 읽지 않는다. 팀 토큰 노출을 피하기 위해 셀카 모음은 안전한 순번 라벨로 그룹핑한다.

### 16.3 동작
- 모든 화면은 read-only이며 업로드, 대표 변경, 삭제, 다운로드 ZIP 같은 운영 액션은 없다.
- 대표 사진과 셀카는 저장된 `cropMeta`를 적용해 표시한다.
- Storage 이미지는 Firestore에 저장된 download URL을 사용한다.

---

## 17. 연락처와 도움 시트

행사 중 참가자와 운영자가 서로 빠르게 연락할 수 있도록 이벤트/팀 단위 연락처를 저장하고, 참가자 화면에는 도움 시트를 제공한다.

### 17.1 데이터 모델

- `events/{eventId}.organizer`: 운영팀 연락처. `name`, `phone` 필수, `role`, `contactPreference` 선택. 전화번호는 저장 직전 `sanitizePhone()` 으로 정리한다.
- `events/{eventId}.showLeaderboard`: 참가자 진행 화면의 순위/평균 문구 표시 여부. 기본값은 `true`.
- `events/{eventId}/teams/{teamId}.leader`: 팀장 연락처. 등록 후에는 `name`, `phone` 필수, `role` 선택. 새 이벤트는 팀장 없이 생성될 수 있으므로 UI는 옵셔널 체이닝으로 graceful degradation 한다.
- 표시는 `formatPhone()` 으로 `010-1234-5678` 형태를 우선 사용하고, 이동은 `telHref()` / `smsHref()` 헬퍼를 사용한다.

### 17.2 입력 흐름

- 이벤트 생성 마법사 STEP 1의 이벤트 섹션 아래에서 운영팀 이름, 역할, 전화번호, 문자 우선/전화 우선 선호를 입력한다. 이름과 전화번호가 비어 있으면 다음 단계로 갈 수 없다.
- 행사 일정은 STEP 1에서 `type="date"` picker로 입력하고 `events.scheduledAt`에 ISO 문자열로 저장한다. 표시는 `formatKoreanDate()`로 한국어 날짜 문자열을 만든다.
- 이벤트 생성 마법사는 총 3단계이다: STEP 1 기본 정보/운영팀 연락처, STEP 2 장소·분배, STEP 3 미리보기.
- 팀장 등록은 이벤트 생성 후 `/events/:eventId/teams`에서 진행한다. 미등록 팀은 노란 안내 띠와 “팀장 등록하기” 버튼으로 강조한다.
- 이벤트 생성 시 `createEvent()` 는 운영팀 전화번호를 sanitize해 `events` 문서에 저장하고, 팀장 정보는 사후 편집 시 `teams/{teamId}.leader`에 저장한다.

### 17.3 도움 시트

- 참가자 진행 화면, 장소 상세, 셀카 화면에서 연락처가 하나라도 있을 때 도움 시트를 열 수 있다.
- 행사 운영팀 카드의 메인 CTA는 문자 보내기이며, SMS 본문은 `[팀 라벨] 도움이 필요합니다. ` 로 prefill 한다. 전화는 보조 CTA이고 “정말 급할 때만” 안내를 붙인다.
- 우리 팀 팀장 카드의 전화/문자는 같은 비중으로 배치한다.
- FAQ v1은 QR 스캔, 장소 찾기, 사진 업로드, 팀 오입장, 셀카 재촬영 5개 항목을 접이식으로 제공한다.

### 17.4 운영자 측 빠른 접근

- Overview 팀별 진행률 행 우측에 팀장 전화/문자 아이콘을 노출한다.
- Teams QR 관리 카드에는 팀장 이름/전화 표시, 전화/문자 아이콘, 인라인 팀장 연락처 편집을 제공한다.
- Review 슬롯 헤더에는 해당 슬롯의 팀장 연락처와 전화/문자 아이콘을 노출한다.

### 17.5 장소 이미지 업로드

- 장소 편집 모달의 대표 이미지 영역은 클릭 업로드와 드래그앤드롭을 모두 지원한다.
- 업로드 파일은 `image/*`, 15MB 이하만 허용한다. 원본과 1024 썸네일을 Storage에 올리고, 장소의 `coverUrl`에는 썸네일 download URL을 저장한다.
- 외부 이미지 URL 입력도 유지한다. 사용자가 URL을 직접 입력하면 업로드된 `coverStoragePath`와 무관하게 해당 URL을 우선 사용한다.

---

> **이 문서가 정답이 아니라 약속이다.**
> 구현 중 더 좋은 방법이 보이면 SPEC을 업데이트하고 그에 맞춰 코드 변경.
> 큰 결정이 바뀌면 mockups.html에도 SCENE 업데이트.
