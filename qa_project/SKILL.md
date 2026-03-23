---
name: qa_project
description: 범용 프로젝트 QA 자동화. 구조 파악 → 기능 목록 정리 → agent-browser/API 실제 테스트 → 리포트 작성 → GitHub 이슈 등록. 어떤 웹 프로젝트에서든 사용 가능.
disable-model-invocation: false
argument-hint: [qa_major | qa_detail <영역>] — 전체 점검 또는 특정 영역 상세 QA
allowed-tools: Read, Write, Edit, Bash(*), Agent, Glob, Grep
---

# QA Project — 범용 프로젝트 품질 검증 자동화

어떤 웹 프로젝트에서든 사용 가능한 QA 자동화 스킬.
프로젝트 구조를 자동 파악하고, 실제 브라우저/API 테스트를 수행하며, 리포트와 이슈를 자동 생성한다.

## 명령어 라우팅

`$ARGUMENTS`를 파싱하여 모드 분기:

| 명령어 | 설명 |
|--------|------|
| `qa_major` | 전체 프로젝트 주요 기능 빠른 점검 |
| `qa_detail <영역>` | 특정 영역 심층 QA |
| (없음) | 도움말 출력 |

영역은 프로젝트에 따라 자동 감지. 일반적 예시:
`landing`, `auth`, `dashboard`, `api`, `forms`, `search`, `i18n`, `mobile`, `a11y`, `performance`

---

## 5단계 워크플로우

### Phase 1: 프로젝트 구조 파악

프로젝트에 대한 가정 없이 자동 감지한다.

1. **스택 감지:**
   - `package.json` → Node/React/Next/Vue/Svelte 등
   - `requirements.txt` / `pyproject.toml` → Python/Django/Flask/FastAPI
   - `Cargo.toml` → Rust
   - `go.mod` → Go
   - 기타 설정 파일로 프레임워크 판별

2. **서버 감지 & 시작:**
   - 일반적 포트 확인: `lsof -i :3000`, `:8000`, `:8080`, `:5173` 등
   - 서버 미실행 시 `package.json`의 `dev` 스크립트 또는 감지된 실행 명령어로 시작 시도
   - 서버 URL 결정 (기본 `http://localhost:3000`, 프로젝트에 맞게 조정)

3. **라우트/페이지 구조:**
   - Next.js: `app/` 또는 `pages/` 하위 구조
   - React Router: `src/routes/` 또는 라우터 설정 파일
   - Vue: `src/views/` 또는 `src/pages/`
   - API 라우트: `api/` 하위 엔드포인트 목록

4. **환경 제한사항:**
   - `.env` / `.env.local` 존재 여부
   - DB 파일/연결 가능 여부
   - 외부 API 키 필요 여부
   - 제한사항을 리포트에 명시

### Phase 2: 기능 목록 정리

1. `docs/qa/` 디렉토리 확인/생성
2. 이전 QA 리포트 있으면 읽어서 회귀 테스트 항목 파악
3. 프로젝트 구조에서 테스트 대상 자동 추출:
   - 각 페이지/라우트 → UI 테스트 항목
   - 각 API 엔드포인트 → API 테스트 항목
   - 인터랙티브 요소 (폼, 버튼, 모달 등) → 인터랙션 테스트
4. **qa_major**: 카테고리별 핵심 1~3개만 선정
5. **qa_detail**: 지정 영역의 모든 케이스 (정상 + 엣지 + 에러)

### Phase 3: 테스트 실행

#### 3a. 브라우저 테스트

`agent-browser` CLI로 실제 브라우저 테스트:

```bash
# 항상 전용 세션, 스크린샷 디렉토리 생성
mkdir -p /tmp/qa
agent-browser --session qa open <url>
agent-browser --session qa wait --load networkidle
agent-browser --session qa snapshot -i        # ref 확인
agent-browser --session qa screenshot /tmp/qa/<name>.png
agent-browser --session qa close              # 완료 후 반드시 닫기
```

**테스트 패턴들:**

페이지 로드:
```bash
agent-browser --session qa open <url>
agent-browser --session qa wait --load networkidle
agent-browser --session qa get title
agent-browser --session qa screenshot /tmp/qa/page-load.png
```

인터랙션:
```bash
agent-browser --session qa snapshot -i
agent-browser --session qa click @eN
agent-browser --session qa wait --load networkidle
agent-browser --session qa snapshot -i  # 결과 확인
```

폼 입력:
```bash
agent-browser --session qa snapshot -i
agent-browser --session qa fill @eN "test input"
agent-browser --session qa click @eM  # submit
agent-browser --session qa wait --load networkidle
```

모바일:
```bash
agent-browser --session qa set viewport 320 568
agent-browser --session qa screenshot /tmp/qa/mobile-320.png
agent-browser --session qa set viewport 375 812
agent-browser --session qa screenshot /tmp/qa/mobile-375.png
agent-browser --session qa set viewport 430 932
agent-browser --session qa screenshot /tmp/qa/mobile-430.png
```

풀 페이지:
```bash
agent-browser --session qa screenshot --full /tmp/qa/full-page.png
```

**주의:**
- 페이지 이동 후 반드시 `wait --load networkidle` + 재 snapshot
- `--session qa` 항상 사용 (다른 앱 세션과 격리)
- 테스트 끝나면 `agent-browser --session qa close`

#### 3b. API 테스트

```bash
# 상태 코드 확인
curl -s -o /dev/null -w "%{http_code}" <url>

# JSON 응답 확인
curl -s <url> | jq '.'

# POST 요청
curl -s -X POST <url> -H "Content-Type: application/json" -d '<body>'

# 에러 핸들링 확인
curl -s -X POST <url> -H "Content-Type: application/json" -d '{"invalid":"data"}'
```

#### 3c. 재사용 스크립트

반복 사용되는 테스트를 `docs/qa/scripts/`에 스크립트로 저장:

- 파일명은 `test-<대상>.sh` 형식
- 실행 가능하게 `chmod +x`
- 결과를 stdout으로 출력, exit code로 성공/실패 표시
- 기존 스크립트가 있으면 재사용

```bash
#!/bin/bash
# docs/qa/scripts/test-api-health.sh
# 모든 API 엔드포인트 상태 코드 확인

BASE_URL="${1:-http://localhost:3000}"
PASS=0; FAIL=0

check() {
  local method=$1 url=$2 expected=$3 body=$4
  if [ -n "$body" ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$body")
  else
    code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url")
  fi
  if [ "$code" = "$expected" ]; then
    echo "PASS [$code] $method $url"
    ((PASS++))
  else
    echo "FAIL [$code, expected $expected] $method $url"
    ((FAIL++))
  fi
}

# 여기에 프로젝트별 엔드포인트 추가
check GET "$BASE_URL" 200
# check POST "$BASE_URL/api/example" 200 '{"key":"value"}'

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit $FAIL
```

### Phase 4: 리포트 작성

`docs/qa/qa-report-YYYY-MM-DD[-영역].md`에 결과 정리.
하루에 여러 번 실행 시 `-2`, `-3` 접미사 추가.

```markdown
# QA Report — [프로젝트명]

**날짜:** YYYY-MM-DD
**모드:** qa_major | qa_detail <영역>
**테스트 환경:** OS, 브라우저, 서버 URL
**제한사항:** DB 미연결, API 키 없음 등

---

## 테스트 요약
| 구분 | 수량 |
|------|------|
| 전체 | N |
| PASS | N |
| FAIL | N |
| WARN | N |
| 미테스트 | N |

## [카테고리별 상세]

| # | 테스트 | 결과 | 비고 |
|---|--------|------|------|
| 1.1 | ... | PASS/FAIL/WARN | ... |

## 이슈 요약

### CRITICAL
| ID | 이슈 | 영향 | 원인 추정 |

### HIGH / MEDIUM / LOW
...

## 개선 제안
1. ...

## 추가 테스트 필요
- [ ] ...

## 스크린샷
- `/tmp/qa/xxx.png` — 설명
```

### Phase 5: GitHub 이슈 등록

CRITICAL과 HIGH 이슈를 `gh issue create`로 등록.

```bash
gh issue create \
  --title "[QA] BUG-NNN: 이슈 제목" \
  --body "$(cat <<'EOF'
## 재현 경로
1. ...

## 예상 동작
...

## 실제 동작
...

## 환경
- ...

**QA Report:** docs/qa/qa-report-YYYY-MM-DD.md
EOF
)" \
  --label "bug,qa"
```

- `gh` 미설치/미인증 시 → 리포트 "등록 대기" 섹션에 이슈 내용 기록
- MEDIUM/LOW → 리포트에만 기록, 이슈 미등록 (사용자 요청 시 등록)

### Phase 6: 후속 액션 제안

QA 완료 후, 발견된 이슈의 심각도와 수량에 따라 사용자에게 다음 선택지를 제시한다:

```
== QA 완료 — 다음 단계를 선택하세요 ==

1. 🔴 Critical 즉시 수정
   → 발견된 N개 CRITICAL 이슈를 지금 바로 수정합니다

2. 🟡 전체 이슈 개선
   → CRITICAL + HIGH + MEDIUM 이슈를 우선순위 순서대로 수정합니다

3. 📋 Ralph PRD에 등록
   → 발견된 이슈들을 .ralph/prd.json에 스토리로 추가하여
     Ralph 자율 루프로 수정하게 합니다
   → (Ralph 설정이 있는 프로젝트에서만 표시)

4. 📄 리포트만 저장
   → 수정 없이 리포트만 남깁니다 (이미 저장됨)

5. 🔁 추가 QA 진행
   → 다른 영역을 추가로 테스트합니다
     (예: /qa_project qa_detail mobile)
```

**선택지 표시 규칙:**
- CRITICAL 이슈가 0개면 선택지 1 생략
- `.ralph/prd.json` 또는 `.ralphrc`가 없으면 선택지 3 생략
- 이슈가 0개면 "이슈 없음 — 깨끗합니다!" 표시 후 선택지 4, 5만 제시

**선택지 3 (Ralph 등록) 동작:**
- 각 이슈를 prd.json 스토리 형식으로 변환:
  - CRITICAL → priority 가장 높게 (현재 max priority + 1부터)
  - HIGH → 그 다음
  - MEDIUM → 그 다음
- 스토리 ID는 기존 prd.json의 마지막 ID 이후 번호
- category는 `qa-fix`로 통일
- `passes: false`로 설정
- 사용자에게 "N개 스토리가 prd.json에 추가되었습니다. `ralph --monitor`로 실행하세요" 안내

---

## qa_major — 전체 빠른 점검

**목표:** 5~10분 안에 전체 훑기
**깊이:** 정상 케이스만, 카테고리별 핵심 1~3개

자동 감지된 페이지/API를 기반으로 체크리스트 자동 생성 후 순차 실행.

---

## qa_detail — 영역 심층 QA

**목표:** 지정 영역 완전 커버
**깊이:** 정상 + 엣지 + 에러 + 모바일 + 접근성

영역은 프로젝트 구조에서 자동 매핑:
- `landing` → 메인/홈 페이지
- `auth` → 로그인/회원가입/인증
- `api` → 모든 API 엔드포인트
- `forms` → 폼 입력/검증
- `i18n` → 다국어 지원
- `mobile` → 반응형 레이아웃 (320/375/430px)
- `a11y` → 접근성 (키보드, aria, 색상 대비)
- `performance` → Lighthouse, 번들 사이즈, Core Web Vitals
- 기타 → 프로젝트에서 감지된 페이지/기능 이름으로 매핑

---

## 도움말 (인수 없이 호출 시)

```
== QA Project ==

범용 프로젝트 품질 검증 자동화

사용법:
  /qa_project qa_major                전체 주요 기능 빠른 점검
  /qa_project qa_detail <영역>        특정 영역 심층 QA

영역 예시:
  landing, auth, dashboard, api, forms, search,
  i18n, mobile, a11y, performance, ...
  (프로젝트 구조에서 자동 감지)

워크플로우:
  1. 프로젝트 구조 자동 파악 (스택, 라우트, API)
  2. 테스트 대상 기능 목록 정리
  3. agent-browser + curl로 실제 테스트 실행
  4. docs/qa/qa-report-YYYY-MM-DD.md 리포트 작성
  5. CRITICAL/HIGH 이슈 GitHub 자동 등록

출력물:
  docs/qa/qa-report-*.md              테스트 리포트
  docs/qa/scripts/test-*.sh           재사용 가능한 테스트 스크립트
  /tmp/qa/                            스크린샷 증거
  GitHub Issues                       CRITICAL/HIGH 자동 등록
```

---

## 핵심 원칙

- **프로젝트 무관**: 어떤 웹 프로젝트에서든 구조를 자동 파악하여 동작
- **실제 동작 확인**: 코드 리딩이 아니라 브라우저/API 실제 호출로 검증
- **스크린샷 증거**: 모든 UI 테스트에 스크린샷 첨부
- **재현 가능**: `docs/qa/scripts/`에 스크립트화하여 반복 실행 가능
- **자동 이슈 등록**: 심각한 이슈는 바로 GitHub에 올려서 추적
- **회귀 테스트**: 이전 리포트 참조하여 수정된 이슈 재확인
