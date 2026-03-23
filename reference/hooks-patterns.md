# Hooks 활용 패턴

## Hooks란?

Claude Code의 도구 호출 전/후에 자동으로 실행되는 셸 명령.
`settings.json`에서 설정.

## 설정 위치

```
~/.claude/settings.json          # 글로벌
<project>/.claude/settings.json  # 프로젝트별
```

## 기본 구조

```json
{
  "hooks": {
    "<event>": [
      {
        "matcher": "<패턴>",
        "command": "<실행할 명령>"
      }
    ]
  }
}
```

## Hook 이벤트 종류

| 이벤트 | 시점 |
|--------|------|
| `PreToolUse` | 도구 실행 전 |
| `PostToolUse` | 도구 실행 후 |
| `Notification` | 알림 발생 시 |
| `Stop` | Claude 응답 완료 시 |
| `SubagentStop` | 서브에이전트 완료 시 |

## 활용 패턴

### 1. 명령어 프록시 (RTK 패턴)
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "command": "rtk hook pre-tool-use"
      }
    ]
  }
}
```
Bash 명령을 가로채서 토큰 최적화된 출력으로 변환.

### 2. 자동 포맷팅
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "prettier --write \"$CLAUDE_FILE_PATH\" 2>/dev/null || true"
      }
    ]
  }
}
```

### 3. 작업 완료 알림
```json
{
  "hooks": {
    "Stop": [
      {
        "command": "osascript -e 'display notification \"Claude 작업 완료\" with title \"Claude Code\"'"
      }
    ]
  }
}
```

### 4. 위험 명령 차단
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "command": "echo \"$CLAUDE_TOOL_INPUT\" | grep -q 'rm -rf /' && echo 'BLOCK: 위험한 명령' && exit 1 || exit 0"
      }
    ]
  }
}
```

### 5. 자동 린트 체크
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "command": "eslint \"$CLAUDE_FILE_PATH\" --fix 2>/dev/null || true"
      }
    ]
  }
}
```

## Hook 환경변수

| 변수 | 설명 |
|------|------|
| `CLAUDE_TOOL_NAME` | 실행된 도구 이름 |
| `CLAUDE_TOOL_INPUT` | 도구 입력 (JSON) |
| `CLAUDE_FILE_PATH` | 대상 파일 경로 (해당 시) |
| `CLAUDE_SESSION_ID` | 현재 세션 ID |

## Hook에서 stdin으로 받는 데이터

Hook 명령은 stdin으로 JSON 데이터를 받음:
```json
{
  "tool_name": "Bash",
  "tool_input": { "command": "git status" },
  "session_id": "..."
}
```

## 팁

- Hook이 exit 1을 반환하면 도구 실행이 차단됨 (PreToolUse)
- Hook의 stdout은 Claude에게 피드백으로 전달됨
- 오래 걸리는 Hook은 Claude 응답 속도를 늦춤
- `settings.json` 변경 후 Claude 재시작 필요 없음 (자동 반영)
