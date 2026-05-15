# SSE 프로토콜 규격

## 이벤트 형식

```
event: {type}
data: {json}

```

줄 끝에 빈 줄 2개(`\n\n`)로 이벤트 구분.

## 이벤트 7종

| event | data 스키마 | 방향 | 용도 |
|-------|-----------|------|------|
| `text` | `{content: string}` | 서버→프론트 | 텍스트 토큰 스트리밍 |
| `card` | `{type: string, ...}` | 서버→프론트 | 리치 콘텐츠 카드 |
| `action` | `{type: string, ...}` | 서버→프론트 | 프론트 UI 제어 |
| `status` | `{message: string, tool: string}` | 서버→프론트 | 도구 실행 상태 |
| `suggestions` | `{items: string[]}` | 서버→프론트 | 후속 질문 제안 |
| `done` | `{}` | 서버→프론트 | 스트림 종료 |
| `error` | `{message: string}` | 서버→프론트 | 에러 |

## 이벤트 순서 (전형적)

```
: ping                    ← keepalive (선택)

event: status             ← 도구 호출 시작
data: {"message":"🔍 검색중...","tool":"search"}

event: card               ← 검색 결과 카드
data: {"type":"item_card","title":"..."}

event: text               ← 텍스트 응답 시작
data: {"content":"3개 찾았어요! "}

event: text
data: {"content":"특히 첫 번째가 "}

event: text
data: {"content":"추천이에요."}

event: suggestions
data: {"items":["더 찾아볼까?","다른 주제는?"]}

event: done
data: {}
```

## 서버 구현 (Python)

```python
import json

def sse_event(event: str, data) -> str:
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"

def sse_text(content: str) -> str:
    return sse_event("text", {"content": content})

def sse_card(card_data: dict) -> str:
    return sse_event("card", card_data)

def sse_action(action_data: dict) -> str:
    return sse_event("action", action_data)

def sse_status(tool_name: str) -> str:
    msg = TOOL_STATUS.get(tool_name, f"⚙️ {tool_name} 실행중...")
    return sse_event("status", {"message": msg, "tool": tool_name})

def sse_done() -> str:
    return sse_event("done", {})

def sse_error(message: str) -> str:
    return sse_event("error", {"message": message})
```

## 프론트 파서 (TypeScript)

```typescript
type StreamHandlers = {
  onText: (content: string) => void;
  onCard: (card: any) => void;
  onAction: (action: any) => void;
  onStatus?: (message: string, tool: string) => void;
  onSuggestions: (items: string[]) => void;
  onDone: () => void;
  onError: (error: { message: string }) => void;
};

async function parseSSEStream(response: Response, handlers: StreamHandlers) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = 'text';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        switch (currentEvent) {
          case 'text': handlers.onText(data.content); break;
          case 'card': handlers.onCard(data); break;
          case 'action': handlers.onAction(data); break;
          case 'status': handlers.onStatus?.(data.message, data.tool); break;
          case 'suggestions': handlers.onSuggestions(data.items); break;
          case 'done': handlers.onDone(); return;
          case 'error': handlers.onError(data); return;
        }
        currentEvent = 'text';
      }
    }
  }
  handlers.onDone();
}
```

## 주의사항

- `text` 이벤트는 토큰 단위로 쪼개서 보낸다 (스트리밍 느낌)
- `card`와 `action`은 완전한 JSON 한 번에 보낸다
- `done`이 와야 스트림이 끝난 것. `done` 없이 연결이 끊기면 에러
- `status`는 선택 — 없으면 프론트에서 기본 "생각하는 중..." 표시
- `suggestions`는 마지막 텍스트 이후, `done` 직전에 보내는 게 자연스럽다
