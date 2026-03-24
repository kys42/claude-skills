---
name: summary
description: Claude Code 작업 내용을 요약합니다. 오늘, 어제, 이번 주, 특정 날짜 등 다양한 기간을 지원합니다.
disable-model-invocation: false
argument-hint: today | yesterday | week | YYYY-MM-DD [save]
allowed-tools: Bash(python3 *), Bash(git log *), Bash(mkdir *), Read, Write, Edit, Task
---

# Summary — 작업 요약

Claude Code로 수행한 작업을 전체 프로젝트/세션에 걸쳐 요약합니다.

## 사용법

- `/summary` 또는 `/summary today` — 오늘 작업 요약
- `/summary yesterday` — 어제 작업 요약
- `/summary week` — 이번 주 (월~오늘) 작업 요약
- `/summary month` — 이번 달 (1일~오늘) 작업 요약
- `/summary 2026-03-23` — 특정 날짜
- `/summary 2026-03-20 2026-03-24` — 날짜 범위
- 위 모든 옵션 뒤에 `save` 추가 → 파일로 저장

## 실행 절차

### Step 1. 인수 파싱

`$ARGUMENTS`를 파싱:
- 날짜 키워드 또는 YYYY-MM-DD 추출 (없으면 today)
- "save" 키워드 → 저장 모드 활성화
- 날짜 키워드: today, yesterday, week, month, YYYY-MM-DD, YYYY-MM-DD YYYY-MM-DD

### Step 2. 세션 로그 추출

```bash
python3 ~/.claude/skills/summary/scripts/extract-sessions.py {날짜인수}
```

날짜 인수 예시: `today`, `yesterday`, `week`, `month`, `2026-03-24`, `2026-03-20 2026-03-24`

결과 JSON의 `projects` 키에서 프로젝트 수를 확인.

### Step 3. 크기 분기 처리

#### 소규모 (프로젝트 3개 이하)

추출된 JSON을 직접 읽고 요약. Step 4로 진행.

#### 대규모 (프로젝트 4개 이상)

1. `--split` 옵션으로 재실행:
   ```bash
   python3 ~/.claude/skills/summary/scripts/extract-sessions.py {날짜인수} --split
   ```
   → `/tmp/claude-summary/{range}/` 에 프로젝트별 JSON 파일 생성

2. 각 프로젝트 파일을 **Task tool (model=haiku)**로 병렬 위임:
   - 프롬프트: "아래 파일({파일경로})을 Read tool로 읽고, 해당 프로젝트의 작업을 한글로 간결하게 요약해라. 형식: 개발/개선한 기능(불릿, 기능명+설명), 기타 작업(리뷰/테스트/환경설정 등). 파일명 나열보다 어떤 기능을 만들었는지 중심으로 서술. 마크다운으로 출력."
   - subagent_type: "general-purpose"

3. 서브에이전트 결과를 수집하여 통합

### Step 4. Git 로그 수집

각 프로젝트 경로에 대해:

```bash
cd {project_path} && git log --since="{시작날짜} 00:00" --until="{종료날짜} 23:59:59" --oneline --all 2>/dev/null || true
```

### Step 5. 최종 요약 생성

#### 단일 날짜 형식:
```markdown
# Summary — {DATE}

## {프로젝트명}
### 개발/개선한 기능
- **{기능명}**: {무엇을 왜 만들었는지, 어떤 문제를 해결했는지 1-2문장}
- **{기능명}**: {설명}

### 기타 작업
- {코드 리뷰, 테스트, 환경 설정, 조사 등 기능 개발 외 작업}

### 커밋 내역
- {hash} {message}

---
## 오늘의 핵심 요약
> {전체 프로젝트를 관통하는 하루 작업의 핵심을 2-3문장으로. 가장 중요한 성과, 진행 방향, 주의사항 등}

## 요약 통계
- 총 프로젝트: N개, 총 세션: N개
- 작업 시간대: HH:MM ~ HH:MM
```

#### 날짜 범위 형식 (week, month 등):
```markdown
# Summary — {시작일} ~ {종료일}

## 기간 개요
- 총 N일 작업, M개 프로젝트

## {프로젝트명}
### 개발/개선한 기능
- **{기능명}** ({날짜}): {무엇을 만들었는지, 왜 필요했는지}
- **{기능명}** ({날짜}): {설명}

### 기타 작업
- {날짜}: {리뷰, 테스트, 환경 설정 등}

### 커밋 내역
- {hash} {message}

---
## 주간/기간 요약
- 주요 성과: {1-2문장}
- 미완료/진행중: {있다면}
```

### 요약 작성 가이드라인

1. **기능 중심으로 서술** — "어떤 파일을 수정했는지"가 아니라 "어떤 기능을 개발/개선했는지"를 중심으로 쓸 것. 파일명은 꼭 필요한 경우에만 언급
2. **사용자 입력에서 의도를 파악**하여 "무엇을 했는지" 서술
3. **도구 사용 패턴에서 작업 유형 추론** (Write/Edit 다수 → 구현, Read/Grep 다수 → 탐색/분석 등)
4. **한글 작성**, 코드/파일명/커맨드는 원문 유지
5. **간결하게** — 세션별 1-3문장
6. 반복 요청(오타 수정, 재시도 등)은 하나로 합침
7. 날짜 범위일 경우 날짜별 흐름을 시간순으로 정리
8. 코드 리뷰, 테스트, 환경 설정, 조사 등은 "기타 작업"으로 분리

### Step 6. 저장 (save 모드)

save 모드 활성화 시:
- 단일 날짜: `~/.claude/daily-logs/{DATE}.md`
- 날짜 범위: `~/.claude/daily-logs/{시작일}_to_{종료일}.md`
- 디렉토리 없으면 생성
- 기존 파일 있으면 덮어쓸지 확인

save 미활성화 시:
- 화면 출력 후 "파일로 저장하려면 `/summary {같은인수} save`를 실행하세요" 안내
