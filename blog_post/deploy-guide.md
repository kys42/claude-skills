# 블로그 배포 종합 가이드

## 콘텐츠 흐름 전체 그림

```
작성 경로 (5가지)                    배포
─────────────────────────────────────────────────
A. ~/blog/posting/*.md  ─── cp ──┐
B. 직접 src/content/blog/ 작성 ──┤
C. Notion DB ─── npm run notion:sync ──┤
D. Dashboard CRUD (/dashboard/posts/) ──── D1 DB (별도 경로)
E. 자동 임포트 스크립트 ─────────┤
                                 ↓
                    src/content/blog/*.md
                         ↓  git push origin dev
                    Cloudflare Pages 자동 빌드
                         ↓
                    Preview: dev.ys-homepage-3d8.pages.dev
                    Production: main 브랜치 머지 시
```

> **D. Dashboard CRUD**는 D1 DB에 저장되므로 Astro 정적 빌드와 별개 경로. 나머지는 전부 `src/content/blog/` → git push 흐름.

---

## 경로 A: ~/blog/posting 에서 배포

`/blog_post` 스킬로 작성한 글이 저장되는 스테이징 폴더.

### 1. 대상 파일 확인

```bash
ls ~/blog/posting/
```

유저가 특정 파일 지정하면 해당 파일만. 미지정 시 목록 보여주고 선택.

### 2. Frontmatter 검증

| 필드 | 검증 |
|------|------|
| `id` | UUID 형식 |
| `title` | 비어있지 않을 것 |
| `summary` | 비어있지 않을 것 |
| `publishedAt` | YYYY-MM-DD 형식 |
| `tags` | 배열 형태, 기존 태그와 비교 |
| `category` | 기존 카테고리 중 하나인지 (`devlog`, `Engineering`, `Meta`, `ai-digest`) |
| `draft` | 게시 의도면 `false`인지 확인 |

파일명: `YYYY-MM-DD-kebab-case-slug.md` 형식 + 기존 블로그에 같은 파일명 없는지.
검증 실패 시 자동 수정 제안.

### 3. 복사

```bash
cp ~/blog/posting/{파일명} {프로젝트}/src/content/blog/{파일명}
```

이미 같은 파일 있으면 유저에게 덮어쓸지 확인.

### 4. 게시 방법 선택 → [공통: 게시 & 배포](#공통-게시--배포) 참조

---

## 경로 B: 직접 작성 (MD/MDX)

### 스크립트로 초안 생성

```bash
./scripts/create-post.sh "포스트 제목" "요약 설명" "tag1,tag2"
```

→ `src/content/blog/YYYY-MM-DD-kebab-slug.md` 생성
→ **주의**: `id` (UUID) 필드를 자동 생성하지 않음. 수동 추가 필요 (`uuidgen`)

### 수동 생성

`src/content/blog/`에 직접 `.md` 파일 생성. frontmatter 스키마는 `frontmatter-ref.md` 참조.

### 게시 → [공통: 게시 & 배포](#공통-게시--배포) 참조

---

## 경로 C: Notion 싱크

### 사전 설정

1. Notion DB 필수 프로퍼티:
   - **Name** (title): 포스트 제목
   - **Slug** (rich_text): URL 슬러그 (kebab-case)
   - **Status** (select): `Published` / `Draft`

2. 권장 프로퍼티: PublishedAt (date), Tags (multi_select), Summary (rich_text), Category (select)

3. Config:
```bash
cp scripts/notion_sync.config.example.json scripts/notion_sync.config.json
# notion_sync.config.json 편집 — databaseId, properties 매핑
```

### 실행

```bash
export NOTION_API_KEY=secret_xxxxx
npm run notion:sync
```

Dry-run (미리보기):
```bash
npm run notion:sync -- --dry-run
```

### 특징

- **Idempotent**: `notionLastEditedTime` 추적, 변경된 페이지만 업데이트
- **지원 블록**: paragraph, heading, list, todo, code, quote, callout, divider, image, bookmark, table
- **Frontmatter 자동 생성**: Notion 페이지 ID → `id`, 프로퍼티 → frontmatter 필드
- **Summary fallback**: Summary 비어있으면 첫 번째 문단에서 자동 추출

### 싱크 후 게시

```bash
git add src/content/blog/
git commit -m "feat(blog): sync from Notion"
git push origin dev
```

---

## 경로 D: Dashboard CRUD

### 접속

- URL: `/dashboard/posts/`
- 인증: Cloudflare Access (프로덕션) 또는 `DASHBOARD_TOKEN` (개발)

개발 환경:
```
x-dashboard-token: <your-token>
# 또는
Authorization: Bearer <your-token>
```

### 기능

- 게시물 생성/수정/삭제
- 필터링: type (blog/scrap/ai), status (draft/published/archived), 제목 검색
- 페이지네이션: 20개/페이지

### 주의

Dashboard CRUD는 **D1 데이터베이스에 저장**. Astro 정적 빌드(`src/content/blog/`)와 **별개 경로**.
API 경유 동적 콘텐츠용.

---

## 경로 E: 자동 임포트 스크립트

### Reddit Daily Insights

```bash
npm run import:reddit-report
```

- 소스: `~/.openclaw/shared-workspace/memory/openclaw/reddit-report/`
- 출력: `src/content/blog/ai-digest-reddit-report-YYYY-MM-DD.md`
- 자동 설정: `ai_generated: true`, `category: "ai-digest"`, `draft: false`
- 날짜에서 deterministic UUID 생성 (SHA1 기반)

커스텀 경로:
```bash
tsx scripts/import-reddit-report.ts --src /path/to/reports --out ./src/content/blog/ --dry-run
```

### OpenClaw Scraps

```bash
npm run scraps:import       # 임포트
npm run scraps:validate     # 검증
```

### 임포트 후 게시

```bash
git add src/content/blog/
git commit -m "feat(blog): import {소스}"
git push origin dev
```

---

## 공통: 게시 & 배포

**기본 방식: PR 기반 배포** — 블로그 콘텐츠만 별도 브랜치로 분리해서 PR을 만든다.
로컬 dev에 다른 작업이 쌓여있어도 충돌 없이 깔끔하게 배포 가능.

### 방법 1: PR 기반 배포 (기본, 권장)

AI가 직접 실행하는 플로우:

```bash
# 1. origin/dev 기준으로 클린 브랜치 생성
git stash                          # 로컬 변경사항 보존
git checkout -b publish/{slug} origin/dev

# 2. 블로그 파일만 추가
cp ~/blog/posting/{파일명} src/content/blog/
# 또는 sync-posting.sh 사용
git add src/content/blog/{파일명}
# sync-posting.sh도 새로 추가됐으면 함께
git add scripts/sync-posting.sh

# 3. 커밋 & 푸시
git commit -m "feat(blog): publish {슬러그}"
git push origin publish/{slug}

# 4. PR 생성 & 머지
gh pr create --base dev --head publish/{slug} \
  --title "feat(blog): publish {제목}" \
  --body "블로그 포스트 게시"
gh pr merge --merge --delete-branch

# 5. 원래 브랜치로 복귀
git checkout dev
git stash pop
```

→ CF Pages 자동 빌드 → Preview URL에서 확인

### 방법 2: publish-post.sh 스크립트

```bash
./scripts/publish-post.sh src/content/blog/{파일명}
```

이 스크립트가 하는 일:
1. `draft: true` → `draft: false` 변경
2. `npm run build`로 빌드 검증
3. `publish/{slug}` 브랜치 생성
4. 커밋 & 푸시
5. `gh pr create` (base: `dev`)

자동 머지까지:
```bash
./scripts/publish-post.sh src/content/blog/{파일명} --auto-merge
```

### 방법 3: 나중에

`~/blog/posting/`에만 보관. 나중에 배포.

---

## 배포 후 확인

- Preview: `https://dev.ys-homepage-3d8.pages.dev/blog/{slug}/`
- Production: `main` 브랜치 머지 후 자동 배포
- URL trailing slash 필수 (`/blog/{slug}/`)

---

## 주의사항

- **PR 머지는 유저가 명시적으로 요청할 때만** (`gh pr merge` 실행 전 확인)
- 프로덕션(`main`) 직접 push 금지 — 항상 `dev` 브랜치
- 여러 파일 동시 배포 가능 (한 PR에 묶기)
- 브랜치명: `publish/{slug}` 또는 `publish/blog-sync-{날짜}`

---

## npm 스크립트 레퍼런스

| 스크립트 | 명령어 | 설명 |
|----------|--------|------|
| 로컬 개발 | `npm run dev` | Astro dev 서버 (draft 포함) |
| 빌드 | `npm run build` | Astro 빌드 + Pagefind |
| Notion 싱크 | `npm run notion:sync` | Notion DB → MD |
| Reddit 임포트 | `npm run import:reddit-report` | Reddit 다이제스트 임포트 |
| Scraps 임포트 | `npm run scraps:import` | OpenClaw scraps 임포트 |
| Scraps 검증 | `npm run scraps:validate` | scraps 유효성 검사 |
