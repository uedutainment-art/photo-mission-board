# Claude Code / Codex Antigravity 부트스트랩 프롬프트

> 이 파일 자체를 코딩 에이전트에게 복사·붙여넣기 하거나, 에이전트에게 "이 폴더의 PROMPT.md를 읽고 그대로 진행해줘"라고 지시.

---

## 너의 임무

이 폴더는 `Photo Mission Board`라는 웹 앱의 **설계 단계까지 끝난** 신규 프로젝트다. 코드는 아직 한 줄도 없고, 너가 처음부터 구현해야 한다.

**Photo Mission Board란**: 회사 워크샵·Vision Trip 같은 행사에서, 여러 팀이 사진을 올려 하나의 큰 콜라주 결과물을 만드는 시스템. Padlet 대체.

---

## 시작 전에 반드시 할 일 (순서대로)

1. **`SPEC.md`를 처음부터 끝까지 정독한다.** 기술 스택, 데이터 모델, 보안 규칙, 사용자 흐름 모두 여기 정리됨.
2. **`mockups.html`을 브라우저에서 띄워두고 옆에 놓는다.** SCENE 1~10을 모두 훑어 시각적 디자인을 파악한다. 색, 폰트 사이즈, 카드 둥근 모서리, 그라데이션 등 디자인 토큰을 코드에 그대로 반영.
3. **`PHASES.md`를 읽는다.** 작업은 무조건 Phase 순서대로. 한 phase 끝나면 사용자에게 보고하고 OK 받은 다음에 다음 phase로 간다.

---

## 절대 지키는 규칙

### 1. 한 phase씩만 한다
- 한 번에 여러 phase를 미리 만들지 않는다.
- 한 phase 끝 → 빌드 통과 확인 → 사용자에게 "Phase N 끝났습니다" 보고 → 사용자 "OK" → 다음 phase.
- 사용자 응답 없이 다음으로 가지 않는다.

### 2. 결정이 모호하면 멈추고 묻는다
- SPEC.md와 mockups.html을 봤는데도 답이 안 나오면 구현을 멈추고 사용자에게 묻는다.
- 임의 결정은 금지. 만약 임의 결정이 필요했다면 그 사실을 명시하고 "이렇게 했는데 괜찮을지" 확인.

### 3. SPEC.md / mockups.html과 다르게 만들지 않는다
- 더 좋은 방법이 보이면, 먼저 SPEC.md를 업데이트 제안 → 사용자 OK → 코드 작성.
- 디자인은 mockups.html을 픽셀 단위로 정확히 따르진 않아도 되지만, **컴포넌트 구조 / 색 / 간격 / 카드 둥근 모서리 정도는 매우 유사**해야 한다.

### 4. 디자인 토큰 일관성
- Tailwind config에 SPEC §15의 토큰을 정확히 등록.
- mockups.html의 클래스 이름을 그대로 따르지 않아도 되지만, 시각적 결과물은 같아야 한다.

### 5. TypeScript strict
- `tsconfig.json`은 strict 모드.
- 타입 없는 `any` 사용 금지. 어쩔 수 없으면 주석으로 이유 명시.

### 6. 한국어 UI / 영어 식별자
- UI 텍스트는 모두 한국어 (mockups.html과 동일)
- 코드 식별자 (함수명, 변수명, 파일명)는 영어

### 7. 작은 커밋
- 각 phase가 끝나면 `feat(phase-N): ...` 식으로 커밋.
- 큰 phase 안에서도 작동하는 중간 지점이 있으면 sub-commit.

### 8. 보안 규칙 빠뜨리지 않기
- `firestore.rules`와 `storage.rules`는 Phase 10에서 작성하지만, **Phase 2부터 모든 Firestore 호출이 규칙에 통과할지 머릿속으로 검증**.
- 클라이언트가 직접 Firestore 데이터를 수정할 때 권한 결정이 명확해야 함.

### 9. 모바일 우선
- 모든 페이지는 모바일 (390-430px 폭) 기준으로 먼저 설계.
- 데스크탑은 자연스럽게 넓어지면 됨. 데스크탑 전용 레이아웃은 v2.

### 10. Firebase는 별도 프로젝트
- 사용자는 기존 photo-mission-board와는 분리된 **새 Firebase 프로젝트**를 만들 예정.
- README.md에 새 Firebase 프로젝트 설정 가이드 작성 필수.

---

## 첫 응답에서 해야 할 것

너가 이 프롬프트를 처음 받으면, 코드를 한 줄도 작성하기 전에 다음을 보고한다:

1. **SPEC.md를 읽었다는 확인.** "SPEC.md 읽었습니다. 다음 요소를 확인했습니다: [tech stack 한 줄, 데이터 모델 한 줄, 보안 규칙 한 줄]."
2. **mockups.html 의 SCENE 1~10을 훑었다는 확인.** "mockups.html에서 [요약]을 봤습니다."
3. **현재 폴더 상태 확인.** ls / find로 폴더에 뭐가 있는지 출력.
4. **Phase 1 계획 요약 (3-5줄).** "Phase 1에서 X, Y, Z를 만들겠습니다. 이걸로 OK인가요?"
5. 사용자가 "OK"하면 Phase 1 시작.

---

## Phase 0 안내 (Firebase 설정)

Phase 1을 시작하기 전에 사용자에게 다음을 안내하고 완료를 기다린다:

> **Phase 0 — 사용자가 직접 해야 할 일:**
>
> 1. Firebase Console (console.firebase.google.com) 접속, 새 프로젝트 생성 (기존 photo-mission-board와 분리해서 이름 짓기 권장: 예 `photo-mission-board-prod`)
> 2. 웹 앱 등록 → 6개 키 받기
> 3. Authentication → Sign-in method → Google + Anonymous 활성화
> 4. Firestore Database 생성 (리전: asia-northeast3 권장)
> 5. Storage 생성
> 6. 키를 `.env` 파일에 붙여넣기 (저장 폴더는 프로젝트 루트)
>
> 끝나면 "Phase 0 끝났습니다"라고 말씀해주세요. 그러면 Phase 1 시작하겠습니다.

`.env.example` 파일은 Phase 1 산출물의 일부로 미리 만들어 두기.

---

## 자주 묻는 결정 (이건 묻지 말고 그대로 해라)

| 상황 | 결정 |
|---|---|
| 컴포넌트는 어디에? | `src/components/` (공통), `src/pages/` (라우트 페이지) |
| 상태 관리 라이브러리는? | 안 씀. React state + Firestore 구독으로 충분. Zustand·Redux·Jotai 모두 X |
| CSS 방법론은? | Tailwind utility class만. CSS Module / styled-components X |
| 폰트는? | 시스템 폰트 스택 + Noto Sans KR. Google Fonts CDN |
| 이미지 컴포넌트는? | `<img>` 태그 직접. Next의 Image 없음 |
| 라우팅은? | `react-router-dom@6`, BrowserRouter |
| date library는? | 안 씀. `Date.toLocaleString('ko-KR')` 정도로 충분 |
| 폼 라이브러리는? | 안 씀. 일반 controlled inputs |
| 아이콘은? | `lucide-react` |

---

## phase 진행 중 사용자에게 보고할 때 형식

```
## Phase N 완료 보고

**구현한 것**
- X 파일 만들고 Y 기능 구현
- ...

**작동 확인**
- npm run build 통과
- 모바일 viewport에서 [구체적인 인터랙션] 확인

**다음 단계 (Phase N+1) 미리보기**
- [한 줄 요약]

진행해도 될까요?
```

---

## 막혔을 때

- 일단 멈추고, 무엇이 막혔는지 정확히 보고한다.
- 추측으로 우회하지 않는다.
- "이런 케이스는 SPEC에 없는데 어떻게 할까요?" 식으로 묻는다.

---

## 핵심 파일 위치 요약

| 파일 | 역할 |
|---|---|
| `SPEC.md` | 모든 설계 결정 (가장 중요) |
| `PHASES.md` | 단계별 계획 |
| `PROMPT.md` | 이 파일 (작업 가이드) |
| `mockups.html` | 시각적 디자인 (브라우저 열어두기) |
| `README.md` | 운영자(사용자)용 설치/배포 가이드 |
| `.env.example` | Firebase 키 템플릿 |
| `firestore.rules` / `storage.rules` | 보안 규칙 |

---

이제 시작한다. **첫 응답은 SPEC/mockups 확인 보고 + Phase 1 계획 요약.**
