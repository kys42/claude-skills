# 도구 설계 가이드

## 도구 3분류

에이전트에게 주는 도구는 **실행 경로**에 따라 3가지로 나뉜다.

### 1. Data Query — 서비스 API 호출

서비스의 기존 API를 호출해서 데이터를 가져온다. 결과는 LLM에 돌아가서 답변에 활용.

```
에이전트 → search_items("keyword") → Service API → JSON → LLM → 텍스트 답변
```

예시: `search_content`, `list_items`, `get_detail`, `get_user_info`

### 2. Action — 프론트엔드 제어

API를 호출하지 않고, SSE `event: action`으로 프론트에 직접 전달. 브라우저가 실행.

```
에이전트 → navigate("/products/") → SSE event: action → 브라우저 페이지 이동
```

예시: `navigate`, `toggle_theme`, `open_modal`, `scroll_to`

### 3. Display — 카드 표시

SSE `event: card`로 프론트에 리치 콘텐츠를 표시. 에이전트가 "무엇을 보여줄지" 판단.

```
에이전트 → show_item("item-123") → SSE event: card → 프론트에서 카드 렌더링
```

예시: `show_content`, `show_link_buttons`, `show_product_card`

## 분류가 중요한 이유

```python
ACTION_TOOLS = {"navigate", "toggle_theme", "show_content", "show_link_buttons"}

for tool_call in function_calls:
    if tool_call.name in ACTION_TOOLS:
        yield sse_event(...)     # 프론트로 직접 전달
        result = {"status": "ok"}  # LLM에는 "성공" 알림만
    else:
        result = await call_api(tool_call)  # 실제 API 호출
        # result를 LLM에 돌려줌 → LLM이 답변에 활용
```

Data Query 결과는 LLM이 받아서 해석하지만, Action/Display 결과는 프론트가 받아서 실행한다.

## 도구 정의 패턴

### 이름 규칙
`verb_noun` 형식: `search_content`, `list_projects`, `get_detail`, `show_card`, `navigate`

### description이 핵심
LLM이 **언제** 이 도구를 쓸지 description으로 판단한다.

```python
# 나쁜 예
"description": "Get items"

# 좋은 예
"description": "Search blog posts and articles by keyword. Returns matching items with title, summary, and tags. Use when user asks about specific topics."
```

### 파라미터
- 필수(`required`)와 선택을 명확히 구분
- description에 가능한 값 예시 포함
- 타입 정확히 (`STRING`, `INTEGER`, `ARRAY`)

```python
{
    "name": "search_content",
    "description": "Search content by keyword. Returns matching items.",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Search keyword"},
            "type": {"type": "string", "description": "Filter: blog, news, product"},
            "limit": {"type": "integer", "description": "Max results (default 10)"}
        },
        "required": ["query"]
    }
}
```

## 자동 카드 vs 에이전트 판단

**자동 카드** (비추천): 검색 결과를 무조건 카드로 변환 → 관련 없는 것까지 다 보임

**에이전트 판단** (추천): 검색 결과는 LLM이 받고, 골라서 `show_content(slug)` 호출

```
search → 10건 결과 (에이전트만 봄)
에이전트 판단: "이 중 3개가 관련 있다"
show_content("item-1") → 카드
show_content("item-5") → 카드
show_content("item-8") → 카드
텍스트: "3개 찾았어요!"
```

## 상태 메시지 매핑

도구별로 사용자에게 보여줄 상태 메시지를 정의:

```python
TOOL_STATUS = {
    "search_content": "🔍 콘텐츠 찾는중...",
    "list_items": "📋 목록 가져오는중...",
    "get_detail": "📖 상세 읽는중...",
    "navigate": "🚀 이동중...",
}
```

## 에러 처리

도구 호출 실패는 LLM에 에러 결과를 돌려준다. LLM이 사용자에게 설명.

```python
try:
    result = await http_client.get(url, params=params)
    return result.json()
except TimeoutError:
    return {"error": f"Tool '{name}' timed out"}
except Exception as e:
    return {"error": f"Tool '{name}' failed: {str(e)}"}
```

LLM은 에러를 받으면 "데이터를 가져오지 못했어요" 같은 자연스러운 답변을 생성한다.
