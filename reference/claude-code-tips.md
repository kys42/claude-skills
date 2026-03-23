# Claude Code 사용 팁 & 테크닉

## 기본 명령어

```bash
claude                    # 대화형 모드
claude "prompt"           # 원샷 모드
claude -p "prompt"        # 파이프/스크립트용 (print mode)
cat file | claude "설명해줘"  # stdin 파이프
```

## 유용한 플래그

```bash
claude --model opus       # 모델 지정
claude --resume           # 마지막 대화 이어하기
claude --continue         # 마지막 대화 이어하기 (새 턴)
claude -p --output-format json  # JSON 출력
claude --verbose          # 디버그 모드
```

## 대화 내 슬래시 명령

| 명령 | 설명 |
|------|------|
| `/help` | 도움말 |
| `/clear` | 대화 초기화 |
| `/compact` | 컨텍스트 압축 |
| `/model` | 모델 변경 |
| `/fast` | 빠른 모드 토글 (같은 모델, 빠른 출력) |
| `/cost` | 현재 세션 비용 |
| `/permissions` | 권한 설정 |
| `/memory` | 메모리 편집 |

## CLAUDE.md 계층 구조

```
~/.claude/CLAUDE.md              # 글로벌 (모든 프로젝트)
<project-root>/CLAUDE.md         # 프로젝트 루트
<project-root>/src/CLAUDE.md     # 하위 디렉토리별
.claude/CLAUDE.md                # .claude 폴더 내
```

- 상위 → 하위 순서로 로드, 모두 적용됨
- `@파일명` 으로 다른 파일 참조 가능 (예: `@RTK.md`)

## 컨텍스트 관리 테크닉

- **긴 작업 시**: `/compact`로 주기적으로 컨텍스트 압축
- **파일 참조**: CLAUDE.md에서 `@파일명`으로 항상 로드할 파일 지정
- **Task 활용**: 복잡한 작업은 TaskCreate로 진행 상황 추적
- **Agent 활용**: 독립적인 탐색/검색은 서브에이전트에 위임

## 권한 설정 (settings.json)

```json
{
  "permissions": {
    "allow": ["Bash(npm run *)", "Read", "Write"],
    "deny": ["Bash(rm -rf *)"]
  }
}
```

## 멀티 클로드 패턴

```bash
# 터미널 1: 메인 작업
claude

# 터미널 2: 테스트/검증
claude "이 PR의 테스트를 실행하고 결과를 알려줘"

# 스크립트에서 병렬 실행
claude -p "파일A 분석" &
claude -p "파일B 분석" &
wait
```

## 디버깅

- `claude --verbose`: 내부 동작 확인
- `/cost`: 토큰 사용량 확인
- `CLAUDE_DEBUG=1 claude`: 상세 디버그 로그
