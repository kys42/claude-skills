---
name: ralph_manager
description: Ralph 자율 개발 루프 관리 스킬. 프로젝트 초기화, PRD 생성, 루프 스크립트 생성, 진행 상황 확인, 결과 리뷰를 지원합니다.
disable-model-invocation: false
argument-hint: <command> [args] — init | plan <feature> | prompt | run [N] | status | review | reset
allowed-tools: Read, Write, Edit, Bash(date), Bash(pwd), Bash(ls *), Bash(cat *), Bash(mkdir *), Bash(cp *), Bash(chmod *), Bash(git *), Bash(jq *), Bash(wc *), Bash(head *), Bash(tail *)
---

# Ralph Manager — 자율 개발 루프 관리

Claude Code에서 Ralph(자율 반복 개발 루프)를 셋업하고 관리하는 스킬.

## 명령어 라우팅

`$ARGUMENTS`를 파싱하여 아래 서브커맨드로 분기한다:

| 명령어 | 설명 |
|--------|------|
| `init` | 현재 프로젝트에 `.ralph/` 디렉토리 및 기본 파일 생성 |
| `plan <feature>` | 대화형으로 PRD(prd.json) 생성 |
| `prompt` | PROMPT.md 생성/업데이트 (프로젝트 맞춤) |
| `run [N]` | ralph.sh 루프 스크립트 생성 및 실행 가이드 (N=최대 반복 횟수, 기본 10) |
| `status` | prd.json 진행 상황 + progress.md 요약 출력 |
| `review` | Ralph 실행 결과물 코드 리뷰 |
| `reset` | fix_plan.md를 코드베이스 기반으로 재생성 |
| (없음) | 도움말 출력 |

---

## 1. `init` — 프로젝트 초기화

### 수행 절차

1. 현재 워크스페이스 경로 확인
2. `.ralph/` 디렉토리 존재 여부 확인
3. 없으면 다음 구조 생성:

```
.ralph/
├── PROMPT.md          # 루프 프롬프트 (빈 템플릿)
├── AGENT.md           # 에이전트 지시사항 (ralph CLI 필수 파일)
├── prd.json           # PRD 태스크 목록 (빈 배열)
├── progress.md        # 루프 간 학습 누적 로그
├── fix_plan.md        # 구체적 구현 태스크
├── specs/             # 상세 스펙 문서 디렉토리
└── ralph.sh           # 루프 실행 bash 스크립트 (독립 실행용)
```

또한 프로젝트 루트에 `.ralphrc` 파일 생성 (ralph CLI 설정):
```
.ralphrc                 # MAX_CALLS_PER_HOUR, CLAUDE_TIMEOUT_MINUTES, CLAUDE_ALLOWED_TOOLS
```

**주의: `.ralph/AGENT.md`와 `.ralphrc`는 ralph CLI(`~/.ralph/ralph_loop.sh`)의 integrity check 필수 파일.** 이 두 파일이 없으면 `ralph --monitor` 실행 시 `Ralph integrity check failed - critical files missing` 에러로 즉시 종료됨.

4. `.gitignore`에 Ralph 로그/상태 파일 ignore 규칙 추가 (이미 있으면 스킵):
   ```
   # Ralph autonomous dev loop (logs, session state)
   .ralph/logs/
   .ralph/.*
   .ralph/progress.json
   .ralph/status.json
   .ralph/live.log
   .superset/
   ```
   **추적 유지 대상**: `PROMPT.md`, `prd.json`, `progress.md`, `AGENT.md`, `ralph.sh`는 ignore하지 않음
5. 프로젝트의 기존 빌드/테스트 명령어를 자동 감지:
   - `package.json` → npm/pnpm scripts 확인
   - `Makefile` → make targets 확인
   - `pyproject.toml` → pytest 등 확인
6. 감지된 정보를 기반으로 `.ralph/PROMPT.md` 템플릿에 빌드/테스트 명령어 사전 설정

### PROMPT.md 기본 템플릿

```markdown
# Ralph Loop Prompt

## 프로젝트
- 이름: [auto-detect from package.json or directory name]
- 스택: [auto-detect]

## 매 루프에서 수행할 작업
1. `.ralph/prd.json`을 읽고 `passes: false`인 최고 우선순위 스토리를 선택
2. 해당 스토리를 완전히 구현 (placeholder 금지)
3. 구현 전 기존 코드를 충분히 검색 — "없다고 가정"하지 마라
4. 빌드 & 테스트 실행: [auto-detected commands]
5. 통과하면:
   - prd.json에서 해당 스토리의 `passes`를 `true`로 업데이트
   - git add & commit (스토리 ID + 제목 포함)
   - `.ralph/progress.md`에 이번 루프 작업 내용과 배운 점 추가
   - **후속 태스크 추가**: 방금 완료한 작업에서 추가 개선이 필요하거나, 디테일하게 못 다룬 부분, 엣지 케이스, 관련 영역의 일관성 문제 등이 보이면 prd.json에 후속 스토리를 즉시 추가한다
6. 실패하면:
   - 에러를 분석하고 수정 시도
   - 수정 후 다시 빌드 & 테스트
7. **모든 스토리가 완료되어도 멈추지 마라** — 아래 "자율 확장" 절차로 이어간다

## 자율 확장 (모든 스토리 완료 시)
모든 `passes: false` 스토리가 없으면:
1. 코드베이스를 전체 탐색
2. 버그, UX 개선점, 누락 기능, 테스트 갭, 성능 문제, TODO/FIXME를 찾는다
3. 발견한 항목을 새 스토리(다음 번호)로 prd.json에 추가
4. 추가한 스토리 중 최고 우선순위를 즉시 구현 시작
5. 반복

## 규칙
- 한 루프에 한 스토리만 처리
- DO NOT IMPLEMENT PLACEHOLDER — FULL IMPLEMENTATIONS ONLY
- 코드가 이미 존재하는지 충분히 검색하라
- 테스트가 깨지면 다음 스토리로 넘어가지 마라
- **절대 멈추지 마라** — 스토리가 없으면 새로 만들어서 계속 개선하라
```

### prd.json 초기 구조

```json
{
  "branchName": "",
  "userStories": []
}
```

### ralph.sh 기본 스크립트

```bash
#!/bin/bash
# Ralph Loop Runner
# Usage: .ralph/ralph.sh [max_iterations]

MAX_ITER=${1:-10}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=== Ralph Loop Starting (max $MAX_ITER iterations) ==="
echo "Project: $PROJECT_DIR"
echo "PRD: .ralph/prd.json"
echo ""

for i in $(seq 1 $MAX_ITER); do
  echo ""
  echo "=========================================="
  echo "  Ralph Loop $i / $MAX_ITER"
  echo "  $(date '+%Y-%m-%d %H:%M:%S')"
  echo "=========================================="
  echo ""

  # Check if all stories pass
  REMAINING=$(cat .ralph/prd.json | jq '[.userStories[] | select(.passes == false)] | length')
  if [ "$REMAINING" = "0" ]; then
    echo "All stories complete! Exiting."
    break
  fi
  echo "Remaining stories: $REMAINING"

  # Run Claude Code with the prompt
  claude --print "$(cat .ralph/PROMPT.md)" \
    --allowedTools "Write,Read,Edit,Bash(npm *),Bash(pnpm *),Bash(git add *),Bash(git commit *),Bash(git status),Bash(npx *)"

  EXIT_CODE=$?
  echo "Loop $i exit code: $EXIT_CODE"

  # Brief pause between iterations
  sleep 2
done

echo ""
echo "=== Ralph Loop Complete ==="
echo "Completed $i iterations"

# Final status
DONE=$(cat .ralph/prd.json | jq '[.userStories[] | select(.passes == true)] | length')
TOTAL=$(cat .ralph/prd.json | jq '[.userStories[]] | length')
echo "Stories: $DONE / $TOTAL complete"
```

스크립트 생성 후 `chmod +x .ralph/ralph.sh` 실행.

### AGENT.md 기본 내용

```markdown
# Agent Instructions

You are Ralph, an autonomous development loop agent working on [project-name].
Follow the instructions in PROMPT.md exactly.
```

### .ralphrc 기본 내용 (프로젝트 루트에 생성)

```bash
# Ralph configuration
MAX_CALLS_PER_HOUR=100
CLAUDE_TIMEOUT_MINUTES=30
CLAUDE_ALLOWED_TOOLS="Write,Read,Edit,Glob,Grep,Bash(npm *),Bash(npx *),Bash(pnpm *),Bash(git *),Bash(ls *),Bash(cat *),Bash(mkdir *),Bash(rm *),Bash(mv *),Bash(cp *),Bash(chmod *),Bash(wc *),Bash(head *),Bash(tail *),Bash(find *),Bash(grep *),Bash(node *),Bash(jq *)"
```

CLAUDE_ALLOWED_TOOLS는 프로젝트 스택에 맞게 자동 감지하여 설정:
- Python 프로젝트: 기본 + `Bash(pip *)`, `Bash(pytest *)`, `Bash(ruff *)`, `Bash(python *)`
- Node 프로젝트: 기본 + `Bash(npm *)`, `Bash(npx *)`, `Bash(pnpm *)`
- 공통 (반드시 포함): `Write,Read,Edit,Glob,Grep,Bash(git *)`, 파일 조작(`mkdir,rm,mv,cp,chmod`), 조회(`ls,cat,head,tail,wc,find,grep,jq`)
- ⚠️ `Bash(git add *)` 같은 서브커맨드 단위 제한은 Claude가 예상 외 명령을 쓸 때 permission denied → circuit breaker trip의 원인이 됨. `Bash(git *)`처럼 와일드카드로 설정 권장

### init 완료 후 출력

생성된 파일 목록과 다음 단계 안내:
- "PRD를 만들려면: `/ralph_manager plan <기능 설명>`"
- "프롬프트를 커스터마이즈하려면: `/ralph_manager prompt`"

---

## 2. `plan <feature>` — PRD 생성

### 수행 절차

1. `$ARGUMENTS`에서 `plan` 이후의 텍스트를 feature 설명으로 추출
2. 현재 프로젝트 구조를 빠르게 파악:
   - 주요 디렉토리 구조 (1-2 depth)
   - package.json의 dependencies
   - 기존 `.ralph/prd.json` 내용 (있으면)
3. feature 설명을 기반으로 **구조화된 PRD를 즉시 생성** (질문하지 않음):
   - 기능을 가능한 작은 단위의 user story로 분해
   - 각 story는 하나의 컨텍스트 윈도우에서 완성 가능한 크기
   - 명확한 acceptance criteria 포함
   - 구현 순서대로 priority 부여
4. `.ralph/prd.json`에 저장
5. `branchName`은 feature 설명에서 자동 생성 (예: `feat/user-auth`)
6. 기존 prd.json이 있으면 **덮어쓸지 병합할지** 내용을 보고 판단 (기존 완료된 스토리가 있으면 보존)

### PRD 항목 구조

```json
{
  "id": "US-001",
  "title": "짧은 제목",
  "category": "카테고리",
  "priority": 1,
  "description": "구체적 설명",
  "steps": ["구현 단계 1", "구현 단계 2"],
  "acceptanceCriteria": ["검증 기준 1", "검증 기준 2"],
  "passes": false
}
```

### 분해 원칙

- "대시보드 만들기" → DB 스키마, API 엔드포인트, 컴포넌트 각각 별도 스토리
- 각 스토리는 독립적으로 빌드 + 테스트 통과 가능해야 함
- 의존성이 있으면 priority로 순서 보장
- 스토리당 steps는 3-7개가 적정

---

## 3. `prompt` — PROMPT.md 생성/업데이트

### 수행 절차

1. 프로젝트 분석:
   - `package.json` (scripts, dependencies)
   - `tsconfig.json` / `pyproject.toml` 등 설정 파일
   - 기존 `CLAUDE.md` 내용
   - `.ralph/prd.json` 내용
2. 분석 결과로 `.ralph/PROMPT.md`를 프로젝트에 맞게 생성/업데이트:
   - 정확한 빌드/테스트/린트 명령어 반영
   - 프로젝트 스택에 맞는 코딩 규칙 반영
   - 현재 PRD 태스크에 맞는 지시사항
3. PROMPT.md는 **150줄 이하**로 유지 (길면 Claude가 무시)

---

## 4. `run [N]` — 실행 가이드

### 수행 절차

1. `.ralph/` 디렉토리 존재 확인 (없으면 init 먼저 하라고 안내)
2. `.ralph/prd.json`에 미완료 스토리가 있는지 확인
3. **필수 파일 확인**: `.ralph/AGENT.md`와 `.ralphrc`가 존재하는지 체크 (없으면 생성)
4. `.ralph/ralph.sh` 스크립트가 최신 상태인지 확인, 필요시 업데이트
5. 실행 방법 안내 출력:

```
== Ralph 실행 방법 ==

방법 1: ralph CLI (권장 — tmux 3분할 모니터링)
  ralph --monitor --live --calls 100 --timeout 30

  주요 옵션:
    --monitor         tmux 3분할 (루프 | Claude 출력 | 상태)
    --live            Claude 실시간 출력 표시
    --calls N         시간당 최대 호출 수 (기본 100)
    --timeout N       루프당 타임아웃 분 (기본 15)
    --verbose         상세 로그

  ⚠️  필수 파일 누락 시 "integrity check failed" 에러 발생:
      - .ralph/AGENT.md
      - .ralphrc (프로젝트 루트)
      이 파일들은 /ralph_manager init이 자동 생성함

  ⚠️  Circuit Breaker — 자동 안전장치:
      Ralph CLI는 루프 실행 중 permission denied, 반복 실패, 비정상 종료를
      감지하면 circuit breaker를 열어(OPEN) 루프를 자동 중단한다.
      이후 재실행 시 "Circuit breaker has opened - execution halted" 에러로
      즉시 종료됨.

      주요 트립 원인:
        - Permission denied: .ralphrc의 CLAUDE_ALLOWED_TOOLS에 누락된 도구
          (예: Bash(mkdir *), Bash(awk *), Bash(find *) 등)
        - 루프 1회만 돌고 비정상 종료
        - Claude Code 응답 파싱 실패

      해결 명령어:
        ralph --reset-circuit          # circuit breaker를 CLOSED로 리셋
        ralph --circuit-status         # 현재 circuit breaker 상태 확인
        ralph --auto-reset-circuit     # 쿨다운 무시하고 자동 리셋 후 시작

      Permission denied 반복 시 .ralphrc CLAUDE_ALLOWED_TOOLS를 넉넉하게 설정:
        CLAUDE_ALLOWED_TOOLS="Write,Read,Edit,Glob,Grep,Bash(npm *),Bash(npx *),Bash(git *),Bash(ls *),Bash(cat *),Bash(mkdir *),Bash(rm *),Bash(mv *),Bash(cp *),Bash(chmod *),Bash(wc *),Bash(head *),Bash(tail *),Bash(find *),Bash(grep *),Bash(node *),Bash(jq *)"

방법 2: 독립 스크립트 (ralph CLI 없이)
  .ralph/ralph.sh [최대반복횟수]
  .ralph/ralph.sh 15        # 15회 반복
  .ralph/ralph.sh            # 무한 모드 (기본)

방법 3: 백그라운드/tmux 수동
  nohup .ralph/ralph.sh > .ralph/ralph.log 2>&1 &
  tmux new -s ralph '.ralph/ralph.sh'

진행 상황 확인:
  /ralph_manager status

tmux 세션 재연결:
  tmux attach -t <세션명>    # tmux ls로 세션명 확인

현재 미완료 스토리: N개
```

6. N이 지정되면 ralph.sh의 기본값을 해당 값으로 업데이트

---

## 5. `status` — 진행 상황 확인

### 수행 절차

1. `.ralph/prd.json` 읽기
2. 다음 정보 출력:
   - 전체 스토리 수 / 완료 수 / 미완료 수
   - 카테고리별 진행률
   - 다음 처리할 스토리 (최고 우선순위 미완료)
   - 각 스토리의 상태를 테이블로 표시
3. `.ralph/progress.md` 읽기
   - 최근 3개 루프의 기록 요약
   - 반복되는 이슈가 있으면 경고
4. git log에서 Ralph 관련 커밋 수 확인

### 출력 형식

```
== Ralph Status ==

Branch: feat/user-auth
Progress: 4/7 stories complete (57%)

| ID     | Title              | Priority | Status |
|--------|--------------------|----------|--------|
| US-001 | 이메일 로그인      | 1        | DONE   |
| US-002 | OAuth 연동         | 2        | DONE   |
| US-003 | 토큰 리프레시      | 3        | DONE   |
| US-004 | 비밀번호 리셋      | 4        | DONE   |
| US-005 | 회원가입 폼        | 5        | NEXT   |
| US-006 | 프로필 페이지      | 6        | -      |
| US-007 | 세션 관리          | 7        | -      |

Recent Progress (last 3 loops):
- Loop 12: US-004 완료, bcrypt 해싱 이슈 해결
- Loop 11: US-003 완료
- Loop 10: US-002 완료, OAuth redirect URI 설정 필요

Ralph commits: 12
```

---

## 6. `review` — 결과물 리뷰

### 수행 절차

1. Ralph 실행으로 생긴 변경사항 분석:
   - `git log`에서 Ralph 관련 커밋 식별
   - `git diff main...HEAD` (또는 base branch)로 전체 변경 확인
2. 코드 리뷰 수행:
   - 타입 안전성
   - 에러 핸들링
   - 중복 코드
   - placeholder나 TODO 잔재
   - 테스트 커버리지
   - 보안 이슈 (OWASP 기본)
3. 발견된 이슈를 심각도별로 분류:
   - CRITICAL: 즉시 수정 필요
   - WARNING: 수정 권장
   - INFO: 개선 가능
4. `.ralph/fix_plan.md`에 수정 필요 항목 추가

---

## 7. `reset` — fix_plan 재생성

### 수행 절차

1. 현재 코드베이스를 처음부터 분석
2. `.ralph/prd.json`의 스토리와 대조
3. 실제로 미완성인 항목, 버그, TODO를 식별
4. `.ralph/fix_plan.md`를 새로 생성
5. 기존 fix_plan.md는 `.ralph/fix_plan.md.bak`으로 백업

---

## 도움말 (인수 없이 호출 시)

인수 없이 `/ralph_manager`만 실행하면 다음 출력:

```
== Ralph Manager ==

자율 개발 루프 관리 스킬

명령어:
  /ralph_manager init              프로젝트 초기화 (.ralph/ 생성)
  /ralph_manager plan <feature>    PRD 생성
  /ralph_manager prompt            PROMPT.md 생성/업데이트
  /ralph_manager run [N]           루프 실행 가이드 (N=최대 반복)
  /ralph_manager status            진행 상황 확인
  /ralph_manager review            결과물 코드 리뷰
  /ralph_manager reset             fix_plan 재생성

워크플로우:
  1. /ralph_manager init           → 프로젝트 셋업
  2. /ralph_manager plan "기능"    → PRD 작성
  3. /ralph_manager prompt         → 프롬프트 최적화
  4. /ralph_manager run 15         → 실행 가이드
  5. .ralph/ralph.sh 15            → 터미널에서 실행
  6. /ralph_manager status         → 진행 확인
  7. /ralph_manager review         → 코드 리뷰

참고: docs/reference/ralph-guide.md
```

---

## 핵심 원칙 (모든 서브커맨드 공통)

- **질문하지 않고 실행**: 사용자 피드백 메모리에 따라 자율 실행
- **기존 코드 존중**: init/plan 시 기존 `.ralph/` 파일이 있으면 덮어쓰지 않고 병합 또는 백업
- **150줄 제한**: 생성하는 PROMPT.md는 항상 150줄 이하
- **프로젝트 맞춤**: package.json, tsconfig.json 등을 읽어서 빌드/테스트 명령어 자동 감지
- **안전 우선**: ralph.sh에 `--dangerously-skip-permissions` 절대 포함하지 않음

---

## 트러블슈팅

### tmux 인증 실패 ("Not logged in · Please run /login")
`--monitor` 모드는 tmux를 사용한다. tmux 서버가 claude 로그인 이전에 시작된 경우, 오래된 환경을 물고 있어서 인증 정보를 찾지 못한다.

**해결**: `tmux kill-server` 로 tmux 서버를 재시작한 뒤 ralph를 다시 실행.

### Rate limit 소진 (100/100)
인증 실패 등으로 빠르게 실패-재시도를 반복하면 호출 카운터만 소진된다.

**해결**: `.ralph/.call_count` 파일에 `0`을 써서 리셋.
```bash
printf "0" > .ralph/.call_count
```

### Circuit breaker 트립
연속 실패 시 circuit breaker가 OPEN 되어 루프가 중단된다.

**해결**:
```bash
ralph --reset-circuit
ralph --reset-session
```
