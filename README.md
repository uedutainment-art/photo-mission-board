# Photo Mission Board

## Firebase Functions

참가 코드 검증과 그룹당 1표 제한은 `functions/`의 callable functions가 담당한다. Firebase 프로젝트는 Functions 배포가 가능한 Blaze 요금제여야 하며, 루트 배포 전에 `cd functions && npm install`을 한 번 실행한다. 전체 배포는 `firebase deploy --only functions,firestore:rules,storage,hosting`으로 진행한다. 참가자 클라이언트가 Firestore에 콘테스트 투표를 직접 쓰는 경로는 보안 규칙에서 차단한다.

> 팀별 참여형 콜라주 이벤트 웹 앱. 여러 팀이 미션 사진을 올려 하나의 콜라주를 만든다.

회사 워크샵, Vision Trip, 사내 행사 등에서 사용. Padlet 대체.

---

## 폴더 구성

```
photo-mission-board/
├── mockups.html       ← 화면 디자인 갤러리 (브라우저에서 열기)
├── SPEC.md            ← 설계 문서 (모든 결정 정리)
├── PHASES.md          ← 단계별 구현 계획
├── PROMPT.md          ← Claude Code / Codex Antigravity용 프롬프트
├── README.md          ← 이 파일
└── (코드는 여기 아래)
    ├── src/
    ├── package.json
    ├── firebase.json
    └── ...
```

---

## 빠른 시작 (요약)

1. **Firebase 새 프로젝트 만들기** (5분) — 아래 단계 참고
2. **이 폴더에서 코딩 에이전트 (Claude Code 등) 실행** → "PROMPT.md 읽고 진행해"
3. **에이전트가 Phase 단위로 만들어 줌** — 끝날 때마다 OK 확인
4. **로컬 실행** → `npm run dev`
5. **배포** → `firebase deploy`

---

## 1. Firebase 프로젝트 만들기

> 기존 다른 프로젝트와 **분리된 새 Firebase 프로젝트**를 만드세요. 데이터·인증·요금이 모두 따로 관리됩니다.

### 1.1 프로젝트 생성
1. https://console.firebase.google.com 접속
2. **"프로젝트 추가"** 클릭
3. 프로젝트 이름: `photo-mission-board-prod` (또는 원하는 이름)
4. Google Analytics는 선택사항 (꺼도 됨)

### 1.2 웹 앱 등록
1. 프로젝트 개요 → **`</>`** 아이콘 클릭 (웹 앱)
2. 앱 닉네임: `Photo Mission Board Web`
3. **Hosting 설정도 같이 체크** (나중에 배포에 사용)
4. 등록 후 나오는 **`firebaseConfig` 6개 키** 복사:
   - `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`

### 1.3 Authentication 설정
1. 좌측 메뉴 → **Authentication** → 시작하기
2. **Sign-in method** 탭:
   - **Google** 활성화 (운영자 로그인용)
   - **Anonymous** 활성화 (팀원 입장용)

### 1.4 Firestore 데이터베이스
1. 좌측 메뉴 → **Firestore Database** → 데이터베이스 만들기
2. 위치: **`asia-northeast3 (Seoul)`** 권장 (국내 사용자 빠름)
3. 모드: **프로덕션 모드** (보안 규칙은 나중에 적용)

### 1.5 Storage
1. 좌측 메뉴 → **Storage** → 시작하기
2. 위치: Firestore와 동일하게 (`asia-northeast3`)

### 1.6 (선택) Cloud Messaging
v1.5에서 푸시 알림을 쓸 때 필요. 일단 건너뛰어도 됨. 실제 행사에서 푸시 알림을 쓰려면 Firebase Console > Project settings > Cloud Messaging > Web Push certificates에서 Generate key pair를 눌러 VAPID 키를 발급한 뒤, Public key를 `.env`의 `VITE_FIREBASE_VAPID_KEY`에 넣고 다시 빌드/배포한다.

배포 전에는 Google Cloud Console > APIs & Services > Credentials에서 Firebase Web API Key의 Application restrictions를 Websites로 바꾸고, HTTP referrers에 운영 도메인(`https://photo-mission-board-prod.web.app/*`, 필요 시 Firebase Hosting 커스텀 도메인)과 로컬 개발 주소(`http://localhost:5173/*`, `http://127.0.0.1:5173/*`)만 허용한다. API restrictions는 Firebase Auth/Identity Toolkit 등 현재 앱에서 실제로 쓰는 API로 제한한다.

---

## 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 만들고 위에서 받은 키를 붙여넣기:

```bash
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=photo-mission-board-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=photo-mission-board-prod
VITE_FIREBASE_STORAGE_BUCKET=photo-mission-board-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abc123def456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXX
VITE_FIREBASE_VAPID_KEY=...

# 배포 후 변경
VITE_PUBLIC_HOST=http://localhost:5173
```

`.env`는 절대 git에 커밋하지 않습니다 (`.gitignore`에 포함되어 있어야 함).
`.env.example`은 키 이름만 있는 템플릿으로 커밋해서 다음 사람도 알 수 있게.

---

## 3. 코딩 에이전트로 만들기

Claude Code, Codex Antigravity 등 코딩 에이전트를 이 폴더에서 실행:

```bash
cd /Users/uedutainment_dev/Dev/photo-mission-board
claude  # Claude Code 실행 예시
```

첫 명령으로:

```
이 폴더의 PROMPT.md를 읽고 그대로 진행해.
```

에이전트가:
1. SPEC.md, mockups.html을 먼저 정독
2. Phase 1 계획을 보고
3. "OK"하면 Phase 1 코드 작성
4. Phase 끝나면 다시 보고 → OK → Phase 2 ...

**한 phase씩 검토하면서 진행하세요.** 디자인이 mockups.html과 너무 다르거나 의도와 안 맞으면 즉시 피드백.

---

## 4. 로컬 실행 (에이전트가 Phase 1 끝낸 후)

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:5173 접속. 운영자 페이지 보일 것.

팀원 페이지 테스트는 같은 브라우저에서 새 탭으로 `/t/<token>` 직접 들어가거나, 휴대폰으로 같은 와이파이의 PC IP로 접속.

---

## 5. 배포 (전체 phase 완료 후)

### 5.1 Firebase CLI 설치
```bash
npm install -g firebase-tools
firebase login
```

### 5.2 프로젝트 연결
```bash
firebase use --add
# 위에서 만든 Firebase 프로젝트 선택
```

### 5.3 배포
```bash
npm run build
firebase deploy
```

배포 완료 후 `https://<project-id>.web.app` URL이 출력됨.

`.env`의 `VITE_PUBLIC_HOST`를 이 URL로 바꾸고 한 번 더 배포:
```bash
firebase deploy --only hosting
```

이제 QR이 운영 URL로 발급됨.

---

## 6. Firestore / Storage 보안 규칙

`firestore.rules`와 `storage.rules`는 Phase 10에서 작성됨. 배포는:

```bash
firebase deploy --only firestore:rules,storage:rules
```

원본 ZIP처럼 브라우저에서 Storage 파일을 직접 묶는 기능은 버킷 CORS 설정도 필요함:

```bash
gsutil cors set storage.cors.json gs://photo-mission-board-prod.firebasestorage.app
```

---

## 7. 운영 사용법

### 운영자 (이벤트 만드는 사람)
1. 배포된 URL에 접속 → Google 로그인
2. "새 이벤트 만들기" → 3단계 마법사
3. 팀 QR 관리에서 각 팀 QR을 카톡으로 보내거나 A4 시트로 인쇄
4. 행사 진행 중엔 Live 보드에서 진행 확인
5. 행사 끝나면 Export에서 콜라주 PNG + 원본 ZIP 다운로드
6. **원본 ZIP은 60일 안에 받아 따로 보관** (시스템에선 60일 후 자동 삭제)

### 팀원 (사진 올리는 사람)
1. 운영자에게 받은 QR을 카메라로 스캔 또는 카톡 메시지의 링크 탭
2. 자동으로 팀 페이지 진입 (별도 로그인 없음)
3. 셀카 단계 → 미션 장소별 사진 업로드 → 대표 1장 선택

---

## 8. 자주 묻는 질문

### Firebase 무료 한도 안에서 쓸 수 있나요?
대부분의 행사 규모(10팀 × 100장 사진 × 5MB ≈ 5GB)는 Firebase 무료 한도(Spark 플랜) 안에서 가능합니다. 다만:
- Cloud Function 사용 (자동 삭제, 푸시 알림 등 v1.5)은 **Blaze 플랜 (종량제)** 필요
- 사진이 5GB 이상이면 Storage 추가 요금 (1GB당 월 $0.026)

### 사진이 안 보여요
- 인터넷 연결 확인
- 브라우저 캐시 비우기
- Firebase Storage CORS 설정 확인

### 행사 종료 후 결과를 두고두고 보고 싶어요
- 콜라주 PNG와 썸네일은 영구 보관 → `/share/:eventId` (v1.5)에서 누구나 접근 가능
- 원본 사진은 60일 후 자동 삭제 → ZIP을 받아 직접 보관

### 다른 사람도 이 시스템을 쓰려면?
- 자기 Firebase 프로젝트 만들어서 연결하면 됨
- 이 코드를 fork해서 본인이 배포하는 방식
- v2에 멀티 테넌트 (여러 운영자 공유) 검토

---

## 9. 문서 색인

| 문서 | 누가 읽나 | 언제 |
|---|---|---|
| README.md | 사용자 (이벤트 운영자) | 처음 설치할 때 |
| PROMPT.md | 코딩 에이전트 | 코드 작성 시작할 때 |
| SPEC.md | 코딩 에이전트 + 개발자 | 설계 결정 확인할 때 |
| PHASES.md | 코딩 에이전트 | 구현 순서 따를 때 |
| mockups.html | 모두 | 시각적 디자인 참고할 때 |

---

## 10. 라이선스

이 프로젝트는 사용자 본인의 행사 운영을 위한 도구로 자유롭게 사용·수정할 수 있습니다. 외부 배포 시엔 별도 문의.

---

**문제나 개선 아이디어가 생기면 SPEC.md 또는 mockups.html에 SCENE을 추가하면서 정리하세요.**
