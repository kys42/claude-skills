---
name: blog_post
description: 블로그 포스트를 유저와 협업으로 작성합니다. 주제를 받아 기획→작성→저장까지 인터랙티브하게 진행.
disable-model-invocation: false
argument-hint: [주제/제목] [--type devlog|tech|retro] [--draft] [--outline] [--deploy [파일명]]
allowed-tools: Read, Write, Edit, Bash(date), Bash(pwd), Bash(uuidgen), Bash(ls *), Bash(wc *), Bash(git *), Bash(mkdir *), Bash(cp *), Bash(npm run *), AskUserQuestion
---

# Blog Post — 블로그 글쓰기 & 배포

유저와 AI가 함께 블로그 포스트를 쓰거나, 작성된 글을 배포하는 스킬.

---

## 모드 판별

`$ARGUMENTS`와 대화 맥락에서 모드를 판별한다:

| 모드 | 트리거 | 읽는 가이드 |
|------|--------|-------------|
| **Write** | 주제/제목이 있거나, 글쓰기 의도 | `style-guide.md` + `type-{타입}.md` + `frontmatter-ref.md` |
| **Deploy** | `--deploy`, "배포", "게시", "올려", "publish" 등 | `deploy-guide.md` + `frontmatter-ref.md` |

애매하면 유저에게 "글 쓸 건지, 배포할 건지" 확인.

---

## Write 모드

### 핵심 원칙: 먼저 파악하고, 초안 만들고, 그 다음에 물어봐라

**질문부터 하지 않는다.** AI가 할 수 있는 건 AI가 먼저 한다:

1. 현재 세션 대화 내용을 분석한다
2. 프로젝트 코드/커밋/문서를 읽어서 보충한다
3. 그 정보로 초안(아웃라인 또는 본문)을 직접 만든다
4. **만든 초안을 보여주고** 피드백을 받는다

"핵심 메시지가 뭡니까?" 같은 질문 금지. 대화에서 뽑아내거나 코드에서 유추해서 초안에 반영한 뒤, "이렇게 잡았는데 맞아?" 식으로 확인받는다.

**질문은 AI가 정말 추론 불가능한 것만:**
- 유저의 개인적 감상/판단 (예: "아쉬운 점은 뭐였어?")
- 공개 범위나 민감도 (예: "이 내부 구조를 공개해도 돼?")
- 세션/프로젝트에 전혀 단서가 없는 것

### 가이드 파일

본문 작성 전에 반드시 Read:
- `~/.claude/skills/blog_post/style-guide.md` — 톤, 보이스, 구조 규칙
- `~/.claude/skills/blog_post/type-devlog.md` — devlog 템플릿
- `~/.claude/skills/blog_post/type-tech.md` — 기술해설 템플릿
- `~/.claude/skills/blog_post/type-retro.md` — 회고 템플릿
- `~/.claude/skills/blog_post/frontmatter-ref.md` — frontmatter 스키마

### 인수 파싱

| 인수 | 설명 |
|------|------|
| 첫 번째 (자유 텍스트) | 주제 또는 제목 |
| `--type <devlog\|tech\|retro>` | 글 타입 지정 (없으면 맥락에서 추론) |
| `--draft` | draft 상태로 생성 |
| `--outline` | 아웃라인까지만 만들고 본문 작성 전 확인 |

인수가 비어있으면 현재 세션 대화에서 주제를 추론한다. 추론 불가하면 그때 물어본다.

### Phase 1: 리서치 & 초안

#### 1-1. 맥락 수집 (AI가 알아서)

- **세션 대화**: 지금까지 대화에서 다룬 주제, 결정사항, 작업 내용
- **프로젝트 상태**: 필요하면 git log, 변경 파일, 코드를 읽어서 보충
- **글 타입**: 주제와 맥락으로 devlog/tech/retro 중 적절한 걸 판단
  - 개발 과정 이야기 → devlog
  - 특정 기술/개념 설명 → tech
  - 기간/프로젝트 돌아보기 → retro

#### 1-2. 가이드 읽기

1. `~/.claude/skills/blog_post/style-guide.md`
2. 해당 타입 가이드 (`type-devlog.md` / `type-tech.md` / `type-retro.md`)

#### 1-3. 아웃라인 초안 만들기

수집한 정보를 바탕으로 **직접** 아웃라인 작성:
- 제목 초안
- TL;DR (3~5개 불릿)
- 메타 섹션 초안 (타입별 — devlog면 목표/Human/AI 등)
- 섹션 목록 + 각 섹션 핵심 포인트 1줄씩

#### 1-4. 유저에게 보여주기

아웃라인을 보여주면서:
- "이렇게 잡았는데 빠진 거나 방향 다른 거 있으면 말해줘"
- AI가 추론 못한 부분만 질문

`--outline` 플래그면 여기서 멈추고 유저 지시 대기.

### Phase 2: 본문 작성

#### 2-1. 본문 작성

- style-guide 톤/구조 규칙 적용
- 타입별 가이드 구조 적용
- 메타 섹션을 TL;DR 다음에 배치
- 세션 대화와 프로젝트 정보를 근거로 구체적 내용 채움

#### 2-2. 유저 확인

본문 전체를 보여주고 피드백. 여러 라운드 가능.

### Phase 3: 저장 & 마무리

#### 3-1. 파일 준비

1. `uuidgen`으로 UUID 생성 (소문자 변환)
2. 현재 날짜: `date +%Y-%m-%d`
3. 제목에서 kebab-case 슬러그 생성
4. `~/.claude/skills/blog_post/frontmatter-ref.md` Read해서 frontmatter 조립

#### 3-2. 파일 저장

```
~/blog/posting/YYYY-MM-DD-{slug}.md
```

- `mkdir -p ~/blog/posting/` 보장
- frontmatter + 본문을 합쳐서 Write

#### 3-3. 결과 요약

- 파일 경로
- 제목 / 슬러그
- 단어 수 (`wc -w`)
- 예상 읽기 시간 (단어수 / 200, 올림, 최소 1분)
- draft 여부

#### 3-4. 다음 액션 제안

- **수정**: 추가 수정 요청
- **배포**: Deploy 모드로 전환 (아래)
- **나중에**: ~/blog/posting/에만 보관

---

## Deploy 모드

### 가이드 읽기

반드시 Read:
- `~/.claude/skills/blog_post/deploy-guide.md` — 배포 경로별 상세 가이드
- `~/.claude/skills/blog_post/frontmatter-ref.md` — frontmatter 검증용

### 인수 파싱

| 인수 | 설명 |
|------|------|
| `--deploy` | Deploy 모드 진입 |
| 파일명 (선택) | 특정 파일 지정. 없으면 ~/blog/posting/ 목록에서 선택 |

### 플로우

`deploy-guide.md`의 절차를 따른다. **기본은 PR 기반 배포:**

1. **대상 확인** — 어떤 파일을, 어떤 경로로 배포할지
2. **Frontmatter 검증** — 스키마 맞는지, 파일명 규칙 맞는지
3. **클린 브랜치 생성** — `git stash` → `git checkout -b publish/{slug} origin/dev`
4. **파일 복사 & 커밋** — 블로그 파일만 추가, 커밋, 푸시
5. **PR 생성** — `gh pr create --base dev`
6. **머지** — 유저 확인 후 `gh pr merge --merge --delete-branch`
7. **복귀** — `git checkout dev && git stash pop`
8. **배포 확인** — Preview URL 안내

> 로컬 dev에 다른 작업이 쌓여있어도 블로그만 깔끔하게 배포 가능.

---

## 사용 예시

```bash
# 글쓰기 (Write 모드)
/blog_post Ralph 자율루프 개발기
/blog_post Astro Content Collections 가이드 --type tech
/blog_post 홈페이지 리뉴얼 개발기 03 --type devlog --outline
/blog_post 3월 회고 --draft

# 배포 (Deploy 모드)
/blog_post --deploy
/blog_post --deploy 2026-03-22-qa-skill-devlog.md
/blog_post 올려줘    # "올려" 키워드로 Deploy 모드 진입
/blog_post 게시해    # "게시" 키워드로 Deploy 모드 진입
```

---

## 주의사항

- **질문 최소화**: AI가 파악 가능한 건 파악하고 초안에 반영. 질문은 추론 불가한 것만.
- 가이드 파일을 매번 Read (업데이트 반영).
- git push는 유저가 명시적으로 요청할 때만 실행.
- 프로덕션(`main`) 직접 push 금지 — 항상 `dev` 브랜치.
