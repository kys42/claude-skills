# LangGraph 5-Layer 에이전트 프로젝트 생성 가이드

## 이 스킬의 리소스

- **`scripts/scaffold.sh`**: Step 0 완료 후 실행 → 디렉토리 구조 + 빈 파일 자동 생성
- **`examples/`**: 각 파일 작성 시 참조할 구체적 예시 (고객 지원 봇 도메인)
  - `examples/config.py` — AppConfig 예시
  - `examples/state.py` — AgentState 예시
  - `examples/orchestrator_prompt.py` — 오케스트레이터 프롬프트 예시
  - `examples/chat_agent_prompt.py` — 에이전트 프롬프트 예시

---

## 아키텍처 개요

```
INPUT(1) → AGENT(2) → TOOL(3) ↔ CONTEXT(4)
                 ↓
             ACTION(5)
```

| 레이어 | 역할 | 핵심 파일 |
|--------|------|-----------|
| 1. INPUT | 입력 정규화 → 초기 AgentState 생성 | `layers/input_layer.py`, `models/input_models.py` |
| 2. AGENT | 오케스트레이터 라우팅 + 서브에이전트 LLM 실행 | `layers/agent_layer.py`, `prompts/` |
| 3. TOOL | `@tool` 함수 실행 (context 조회 / action 요청) | `layers/tool_layer.py` |
| 4. CONTEXT | MemoryDB / DataDB / VectorDB 싱글톤 | `layers/context_layer.py` |
| 5. ACTION | 구조화된 결과 조립 + 앱 액션 처리 | `layers/action_layer.py` |

**핵심 패턴:**
- OrchestratorAgent: 규칙 기반 + LLM 하이브리드 라우팅
- BaseSubAgent: Lazy LLM init → `bind_tools` → 도구 루프 (최대 5회)
- 모듈 레벨 싱글톤: `agent = MyAgent()` 를 모듈에서 한 번만 생성
- `MemorySaver`: LangGraph thread_id 체크포인트 (요청마다 새 thread_id로 누적 방지)
- `LayerLogger`: 5레이어 구분 × 3단계 레벨 (highlight / info / debug)

---

## Step 0: 사전 질문 (8가지)

사용자에게 반드시 아래 8가지 정보를 먼저 확인한다.

1. **프로젝트명** (snake_case) — 예: `my_agent`, `support_bot`
2. **생성 경로** — 예: `~/projects/` (절대 경로 권장)
3. **서비스 도메인 설명** — 어떤 서비스/앱을 위한 에이전트인지 한두 줄 설명
4. **초기 서브에이전트 목록** — 이름(PascalCase) + 한줄 역할
   예: `ChatAgent: 일반 대화`, `TaskAgent: 특정 작업 처리`
5. **초기 도구 목록** — Context 도구(데이터 조회)와 Action 도구(앱 동작) 구분
   예: `[Context] get_user_data, search_docs` / `[Action] send_notification, create_record`
6. **LLM 프로바이더** — `Gemini` / `OpenAI` / `Anthropic` 중 선택
7. **Context Layer 구성**:
   - MemoryDB (단기 슬라이딩 윈도우 + 장기 User Summary) — **기본 포함**
   - DataDB (도메인 데이터 조회) — 필요 여부
   - VectorDB (RAG 키워드/벡터 검색) — 필요 여부
8. **웹 서버 포함 여부** — FastAPI + SSE 스트리밍 서버 생성 (Yes/No)

---

## Step 0.5: scaffold.sh 실행

Step 0 답변을 받은 직후, 아래 스크립트를 실행하여 디렉토리 구조를 먼저 생성한다.

```bash
bash ~/.claude/skills/create_5layer_agent/scripts/scaffold.sh {project_name} {target_dir}
```

- `{project_name}`: Step 0의 1번 답변
- `{target_dir}`: Step 0의 2번 답변 (경로)
- 웹 서버 No인 경우: `web/server.py`는 생성되지만 내용을 비워두어도 됨

---

## Step 1: pyproject.toml

**프로바이더별 의존성 분기** (scaffold.sh가 생성한 pyproject.toml을 수정):

```toml
[project]
name = "{project_name}"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = [
  "pydantic>=2.5,<3",
  "python-dotenv>=1.0,<2",
  "typing-extensions>=4.9,<5",
  "langgraph>=0.2,<1",
  "langchain-core>=0.3,<2",
  # [CUSTOMIZE] 선택한 프로바이더 한 줄만 활성화
  "langchain-google-genai>=2.0,<5",   # Gemini
  # "langchain-openai>=0.2,<2",       # OpenAI
  # "langchain-anthropic>=0.2,<2",    # Anthropic
  # 웹 서버 Yes인 경우 아래 추가:
  # "fastapi>=0.110,<1",
  # "uvicorn[standard]>=0.27,<1",
  # "python-multipart>=0.0.9,<1",
]

[tool.uv]
managed = true
```

---

## Step 2: config.py + logging_config.py

**참조**: `~/.claude/skills/create_5layer_agent/examples/config.py`

**config.py 핵심 구조:**

```python
import os
from dataclasses import dataclass, field
from dotenv import load_dotenv
load_dotenv()

@dataclass
class AppConfig:
    # [CUSTOMIZE] 모델명을 선택한 프로바이더에 맞게 조정
    ROUTER_MODEL: str = "gemini-2.5-flash"   # Gemini
    # ROUTER_MODEL: str = "gpt-4o-mini"      # OpenAI
    # ROUTER_MODEL: str = "claude-haiku-4-5" # Anthropic
    AGENT_MODEL: str = "gemini-2.5-flash"
    TEMPERATURE: float = 0.3
    THINKING_BUDGET: int = 0
    SHORT_TERM_WINDOW: int = 10
    DEFAULT_USER_ID: int = 1
    # [CUSTOMIZE] 도메인별 추가 설정

config = AppConfig()
```

**logging_config.py** — LayerLogger 패턴 (`get_logger(layer_name)` 반환):

- 5레이어 색상 구분 (INPUT/AGENT/TOOL/CONTEXT/ACTION)
- `highlight`: Agent Activity 패널 + 파일/터미널
- `info`: Layer Pipeline + 파일/터미널
- `debug`: 파일/터미널만
- `register_live_queue` / `unregister_live_queue` / `_push_live`: SSE 실시간 로그용

```python
class LayerLogger:
    def log(self, message, level="info", component=None, parent=None): ...
    def highlight(self, msg, component=None, parent=None): ...
    def info(self, msg, component=None, parent=None): ...
    def debug(self, msg, component=None, parent=None): ...
    def get_logs(self) -> list[dict]: ...

def get_logger(layer_name: str) -> LayerLogger: ...
```

로그 엔트리 형식: `{"layer", "message", "level", "timestamp", "component"(선택), "parent"(선택)}`

---

## Step 3: models/ (Pydantic 모델)

**models/input_models.py:**

```python
from typing import Literal, Optional
from pydantic import BaseModel

class UnifiedInput(BaseModel):
    input_type: Literal["chat", "event"]  # [CUSTOMIZE] 입력 유형 확장
    user_id: int = 1
    message: str = ""
    event_data: Optional[dict] = None
    # [CUSTOMIZE] 추가 필드 (예: image_data, metadata)
```

---

## Step 4: layers/context_layer.py (Layer 4)

```python
from config import config

class MemoryDB:
    """단기(슬라이딩 윈도우) + 장기(User Summary) 대화 메모리."""
    def __init__(self):
        self._short: dict = {}   # user_id → list[{"role", "content"}]
        self._long:  dict = {}   # user_id → str

    def add_conversation(self, user_id, role, content): ...
    def get_recent_conversations(self, user_id, limit=10) -> list: ...
    def get_user_summary(self, user_id) -> str: ...
    def update_user_summary(self, user_id, summary): ...

class DataDB:
    """도메인 데이터 조회 — [CUSTOMIZE] 실제 DB/API 연동."""
    def get_data(self, user_id, **kwargs) -> dict:
        return {}  # TODO: 실제 데이터 소스 연동

class VectorDB:
    """RAG 검색 — [CUSTOMIZE] 실제 벡터 DB 연동."""
    def search(self, query, top_k=3) -> list:
        return []  # TODO: 실제 벡터 검색 로직

# 모듈 레벨 싱글톤
memory_db = MemoryDB()
data_db = DataDB()     # DataDB 불필요 시 제거
vector_db = VectorDB() # VectorDB 불필요 시 제거
```

---

## Step 5: layers/tool_layer.py (Layer 3)

```python
import json
from langchain_core.tools import tool
from logging_config import get_logger
from layers.context_layer import memory_db, data_db, vector_db

_logger = get_logger("TOOL")

# ── Context 도구 (데이터 조회용) ──────────────────────────────
@tool
def get_user_data(user_id: int) -> dict:
    """유저 기본 정보를 조회합니다.
    Args:
        user_id: 유저 ID
    """
    result = data_db.get_data(user_id)
    _logger.highlight(f"  → {result}")
    return result

@tool
def get_conversation_memory(user_id: int, limit: int = 5) -> dict:
    """유저 최근 대화 기록을 조회합니다.
    Args:
        user_id: 유저 ID
        limit: 최근 대화 수
    """
    raw = memory_db.get_recent_conversations(user_id, limit)
    _logger.highlight(f"  → {len(raw)}개 대화")
    return {"conversations": raw}

@tool
def search_knowledge(query: str) -> list:
    """지식베이스를 검색합니다.
    Args:
        query: 검색 쿼리
    """
    results = vector_db.search(query, top_k=3)
    _logger.highlight(f"  → {len(results)}개 결과")
    return results

# ── Action 도구 (앱 동작 요청용) ─────────────────────────────
@tool
def request_action(action_type: str, params: dict) -> str:
    """앱 액션을 요청합니다.
    Args:
        action_type: 액션 유형 (예: push_notification, show_popup, create_record)
        params: 액션 파라미터
    """
    _action_logger = get_logger("ACTION")
    msg = f"[Action 호출] {action_type} - {json.dumps(params, ensure_ascii=False)}"
    _action_logger.highlight(f"request_action: {action_type}", component=action_type)
    return msg

# [CUSTOMIZE] 도메인별 도구 추가 후 반드시 TOOLS_LIST에 등록
TOOLS_LIST = [get_user_data, get_conversation_memory, search_knowledge, request_action]
TOOLS_BY_NAME = {t.name: t for t in TOOLS_LIST}
```

---

## Step 6: layers/input_layer.py (Layer 1)

```python
from logging_config import get_logger
from models.input_models import UnifiedInput

class InputProcessor:
    def __init__(self):
        self.logger = get_logger("INPUT")

    def process(self, unified_input: UnifiedInput) -> dict:
        self.logger.log(f"입력 수신: type={unified_input.input_type}, user_id={unified_input.user_id}")
        return {
            "input_type": unified_input.input_type,
            "user_message": unified_input.message or "",
            "event_data": unified_input.event_data,
            "user_id": unified_input.user_id,
            # [CUSTOMIZE] 추가 입력 필드
            "messages": [],
            "route_to": None,
            "conversation_memory": [],
            "user_summary": None,
            "actions": [],
            "final_response": "",
            "layer_logs": self.logger.get_logs(),
            "error": None,
        }
```

---

## Step 7: layers/action_layer.py (Layer 5)

```python
import json
from logging_config import get_logger

class ActionProcessor:
    def __init__(self):
        self.logger = get_logger("ACTION")

    def process(self, actions: list) -> list:
        """ToolMessage에서 추출한 액션을 구조화된 형태로 변환."""
        results = []
        for action in actions:
            action_type = action.get("type", "unknown")
            params = action.get("params", {})
            # [CUSTOMIZE] 서비스별 액션 타입 구조화 로직 추가
            self.logger.log(f"액션 처리: {action_type}")
            results.append({"type": action_type, "params": params})
        return results
```

---

## Step 8: prompts/ (프롬프트 관리)

**참조**:
- `~/.claude/skills/create_5layer_agent/examples/orchestrator_prompt.py`
- `~/.claude/skills/create_5layer_agent/examples/chat_agent_prompt.py`

**prompts/common_guide.py** — COMMON_GUIDE.md 로더:

```python
from pathlib import Path

def _load_common_guide() -> str:
    guide_path = Path(__file__).with_name("COMMON_GUIDE.md")
    try:
        return guide_path.read_text(encoding="utf-8").strip()
    except OSError:
        return "- Context 도구는 텍스트 생성 전에 먼저 호출한다.\n- Action 도구는 응답 완성 후 호출한다."

COMMON_GUIDE = _load_common_guide()
```

**프롬프트 결합 패턴** — 모든 에이전트 프롬프트는 마지막에 COMMON_GUIDE를 concat:
```python
{AGENT_NAME}_SYSTEM_PROMPT = """...""" + "\n\n" + COMMON_GUIDE
```

**orchestrator_prompt.py 필수 요소:**
1. 서비스 설명 + 라우팅 기준 (에이전트별 케이스 + 예문)
2. `{input_type}`, `{user_message}`, `{event_data}` 파라미터 플레이스홀더
3. 마지막 줄: `반드시 "A", "B", ... 중 하나만 출력하세요. 다른 텍스트는 절대 포함하지 마세요.`

---

## Step 9: layers/agent_layer.py (Layer 2) — 핵심

```python
import json
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage

# [CUSTOMIZE] LLM 프로바이더 선택
from langchain_google_genai import ChatGoogleGenerativeAI   # Gemini
# from langchain_openai import ChatOpenAI                  # OpenAI
# from langchain_anthropic import ChatAnthropic            # Anthropic

from config import config
from graph.state import AgentState
from layers.tool_layer import TOOLS_LIST
from logging_config import get_logger
from prompts.orchestrator_prompt import ORCHESTRATOR_SYSTEM_PROMPT
from prompts.chat_agent_prompt import CHAT_AGENT_SYSTEM_PROMPT
# [CUSTOMIZE] 에이전트별 프롬프트 import 추가


class OrchestratorAgent:
    def __init__(self):
        self._llm = None
        self.logger = get_logger("AGENT")

    @property
    def llm(self):
        if self._llm is None:
            self._llm = ChatGoogleGenerativeAI(model=config.ROUTER_MODEL, temperature=0.0)
        return self._llm

    def route(self, state: AgentState) -> str:
        self.logger.info(f"오케스트레이터: input_type={state['input_type']}")

        # [CUSTOMIZE] 규칙 기반 라우팅 (LLM 호출 없이 빠른 분기)
        # if state["input_type"] == "event":
        #     return "task"

        prompt = ORCHESTRATOR_SYSTEM_PROMPT.format(
            input_type=state["input_type"],
            user_message=state.get("user_message", ""),
            event_data=str(state.get("event_data", "없음")),
        )
        resp = self.llm.invoke([
            SystemMessage(content=prompt),
            HumanMessage(content=state.get("user_message", "") or "메시지 없음"),
        ])
        content = resp.content
        if isinstance(content, list):
            content = " ".join(p.get("text","") if isinstance(p,dict) else str(p) for p in content).strip()
        route = content.strip().lower()
        valid = ["chat", "task"]  # [CUSTOMIZE] 유효 라우팅 키 목록
        if route not in valid:
            route = valid[0]
        self.logger.info(f"→ {route} (LLM 판단)")
        return route


class BaseSubAgent:
    def __init__(self, system_prompt: str, name: str):
        self._llm = None
        self.system_prompt = system_prompt
        self.name = name
        self.logger = get_logger("AGENT")

    @property
    def llm(self):
        if self._llm is None:
            llm = ChatGoogleGenerativeAI(model=config.AGENT_MODEL, temperature=config.TEMPERATURE)
            self._llm = llm.bind_tools(TOOLS_LIST)
        return self._llm

    def _build_user_message(self, state: AgentState) -> str:
        uid = state.get("user_id", 1)
        summary = state.get("user_summary") or ""
        recent = state.get("conversation_memory") or []
        parts = [f"[현재 유저: user_id={uid}]"]
        if summary:
            parts.append(f"\n[유저 요약]\n{summary}")
        if recent:
            lines = [("U: " if c.get("role")=="user" else "A: ") + str(c.get("content",""))[:120]
                     for c in recent[-4:]]
            parts.append("\n[최근 대화]\n" + "\n".join(lines))
        parts.append("")
        if state["input_type"] == "event":
            return "\n".join(parts) + f"\n[이벤트] {json.dumps(state.get('event_data',{}), ensure_ascii=False)}"
        return "\n".join(parts) + f"\n{state.get('user_message', '')}"

    def run(self, state: AgentState) -> dict:
        # ⚠️ component=self.name 반드시 전달 (UI 파이프라인 카드 활성화)
        self.logger.highlight(f"{self.name} 실행", component=self.name)
        messages = [SystemMessage(content=self.system_prompt)]
        existing = state.get("messages") or []
        if existing:
            if not isinstance(existing[0], HumanMessage):
                messages.append(HumanMessage(content=self._build_user_message(state)))
            messages.extend(existing)
        else:
            messages.append(HumanMessage(content=self._build_user_message(state)))
        response = self.llm.invoke(messages)
        tc = getattr(response, "tool_calls", []) or []
        self.logger.info(f"{self.name} 응답 (tool_calls: {len(tc)}개)")
        return {
            "messages": [response],
            "layer_logs": state.get("layer_logs", []) + self.logger.get_logs(),
        }


# [CUSTOMIZE] 서브에이전트 추가 (BaseSubAgent 상속)
class ChatAgent(BaseSubAgent):
    def __init__(self):
        super().__init__(CHAT_AGENT_SYSTEM_PROMPT, "ChatAgent")

# 커스텀 run() 필요 시:
# class TaskAgent(BaseSubAgent):
#     def __init__(self):
#         super().__init__(TASK_AGENT_SYSTEM_PROMPT, "TaskAgent")
#     def run(self, state):
#         self.logger.highlight(f"{self.name} 실행", component=self.name)  # ← component= 필수!
#         ...

# ── 모듈 레벨 싱글톤 ─────────────────────────────────────────
orchestrator = OrchestratorAgent()
chat_agent = ChatAgent()
# [CUSTOMIZE] 에이전트 추가 시 인스턴스 생성
```

---

## Step 10: graph/ (LangGraph 그래프)

**graph/state.py** — 참조: `~/.claude/skills/create_5layer_agent/examples/state.py`

```python
from typing import Annotated, Optional
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    input_type: str; user_message: str; event_data: Optional[dict]; user_id: int
    messages: Annotated[list, add_messages]
    route_to: Optional[str]   # [CUSTOMIZE] "chat" | "task" | ...
    conversation_memory: list; user_summary: Optional[str]
    actions: list; actions_structured: Optional[list]
    final_response: str; layer_logs: list; error: Optional[str]
    _input_comp: Optional[str]; _skipped_orchestrator: Optional[bool]
```

**graph/edges.py:**

```python
from langchain_core.messages import AIMessage, ToolMessage
from graph.state import AgentState
from logging_config import get_logger

MAX_TOOL_ITERATIONS = 5

def route_to_agent(state):
    mapping = {"chat": "chat_agent", "task": "task_agent"}  # [CUSTOMIZE] 확장
    return mapping.get(state.get("route_to", "chat"), "chat_agent")

def route_after_input(state):
    return route_to_agent(state) if state.get("_skipped_orchestrator") else "orchestrator"

def should_continue(state):
    msgs = state.get("messages", [])
    if not msgs or not isinstance(msgs[-1], AIMessage): return "format_response"
    tc = getattr(msgs[-1], "tool_calls", []) or []
    if not tc: return "format_response"
    tool_msgs = [m for m in msgs if isinstance(m, ToolMessage)]
    if (any(isinstance(m, AIMessage) and any(c.get("name")=="request_action"
        for c in (getattr(m,"tool_calls",[]) or [])) for m in msgs)
        and tool_msgs and "[Action 호출]" in (tool_msgs[-1].content or "")):
        return "format_response"
    if sum(1 for m in msgs if isinstance(m,AIMessage) and (getattr(m,"tool_calls",[]) or [])) > MAX_TOOL_ITERATIONS:
        return "format_response"
    return "tools"

def route_after_tools(state):
    msgs = state.get("messages", [])
    tool_msgs = [m for m in msgs if isinstance(m, ToolMessage)]
    if tool_msgs and "[Action 호출]" in (tool_msgs[-1].content or ""):
        return "format_response"
    return route_to_agent(state)
```

**graph/nodes.py** — `process_input`, `run_orchestrator`, `run_{routing_key}_agent`, `execute_tools`, `format_response`, `run_memory_agent` 구현.
- `execute_tools`: `TOOLS_BY_NAME`으로 도구 호출, `ToolMessage` 생성
- `format_response`: 최종 AI 응답 추출 + MemoryDB 저장 + `actions_structured` 구성
- `run_memory_agent`: 대화 종료 후 LLM으로 User Summary 갱신

**graph/builder.py:**

```python
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from graph.state import AgentState
from graph.nodes import process_input, run_orchestrator, run_chat_agent, execute_tools, format_response, run_memory_agent
# [CUSTOMIZE] 에이전트 추가 시 import 확장
from graph.edges import route_to_agent, route_after_input, should_continue, route_after_tools

def build_graph():
    g = StateGraph(AgentState)
    g.add_node("process_input", process_input)
    g.add_node("orchestrator", run_orchestrator)
    g.add_node("chat_agent", run_chat_agent)
    # [CUSTOMIZE] g.add_node("{routing_key}_agent", run_{routing_key}_agent)
    g.add_node("tools", execute_tools)
    g.add_node("format_response", format_response)
    g.add_node("memory_agent", run_memory_agent)

    g.add_edge(START, "process_input")
    # [CUSTOMIZE] 에이전트 추가 시 모든 조건부 엣지의 목적지 딕셔너리 확장
    g.add_conditional_edges("process_input", route_after_input, {"chat_agent": "chat_agent", "orchestrator": "orchestrator"})
    g.add_conditional_edges("orchestrator", route_to_agent, {"chat_agent": "chat_agent"})
    for agent in ["chat_agent"]:  # [CUSTOMIZE] 리스트 확장
        g.add_conditional_edges(agent, should_continue, {"tools": "tools", "format_response": "format_response"})
    g.add_conditional_edges("tools", route_after_tools, {"chat_agent": "chat_agent", "format_response": "format_response"})
    g.add_edge("format_response", "memory_agent")
    g.add_edge("memory_agent", END)
    return g.compile(checkpointer=MemorySaver())

app_graph = build_graph()
```

---

## Step 11: web/server.py (Yes인 경우)

FastAPI + SSE 스트리밍 구조:

```python
import asyncio, json, uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from logging_config import get_logger, register_live_queue, unregister_live_queue

app = FastAPI(title="{project_name}")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_AGENT_NODES = {"chat_agent"}  # [CUSTOMIZE] 에이전트 노드명 추가

class ChatRequest(BaseModel):
    user_id: int = 1
    message: str

@app.post("/api/chat")
async def chat(body: ChatRequest):
    async def generate():
        request_id = uuid.uuid4().hex
        log_queue = register_live_queue(request_id)
        try:
            from graph.builder import app_graph
            from models.input_models import UnifiedInput
            from layers.input_layer import InputProcessor
            inp = UnifiedInput(input_type="chat", user_id=body.user_id, message=body.message)
            initial_state = InputProcessor().process(inp)
            # 요청마다 새 thread_id → MemorySaver 메시지 누적 방지
            thread_id = f"user_{body.user_id}_{request_id}"
            final_state, final_parts = None, []
            _run_streamed = _run_tool_call = False

            async for event in app_graph.astream_events(
                initial_state, config={"configurable": {"thread_id": thread_id}}, version="v2"
            ):
                # 쌓인 로그 flush
                while True:
                    try:
                        entry = log_queue.get_nowait()
                        if "_action_preview" in entry:
                            yield f"data: {json.dumps({'type':'action_preview','action':entry['_action_preview']}, ensure_ascii=False)}\n\n"
                        else:
                            yield f"data: {json.dumps({'type':'log', **entry}, ensure_ascii=False)}\n\n"
                    except asyncio.QueueEmpty: break

                kind = event.get("event","")
                node = event.get("metadata",{}).get("langgraph_node","?")
                if kind == "on_chain_start" and node in _AGENT_NODES:
                    _run_streamed = _run_tool_call = False
                elif kind == "on_chat_model_stream" and node in _AGENT_NODES:
                    chunk = event.get("data",{}).get("chunk")
                    if not chunk or not getattr(chunk,"content",None): continue
                    if getattr(chunk,"tool_call_chunks",None):
                        if _run_streamed and not _run_tool_call:
                            final_parts = []
                            yield f"data: {json.dumps({'type':'clear_stream'}, ensure_ascii=False)}\n\n"
                        _run_tool_call = True; continue
                    if _run_tool_call: continue
                    content = chunk.content
                    text = content if isinstance(content,str) else "".join(
                        p.get("text","") for p in content if isinstance(p,dict) and p.get("type")=="text")
                    if text:
                        final_parts.append(text); _run_streamed = True
                        yield f"data: {json.dumps({'type':'token','content':text}, ensure_ascii=False)}\n\n"
                elif kind == "on_chain_end":
                    out = event.get("data",{}).get("output")
                    if isinstance(out,dict) and "final_response" in out: final_state = out

            if not final_state: final_state = {}
            done = {
                "final_response": final_state.get("final_response", "".join(final_parts)),
                "route_to": final_state.get("route_to",""),
                "layer_logs": final_state.get("layer_logs",[]),
                "actions_structured": final_state.get("actions_structured",[]),
            }
            yield f"data: {json.dumps({'type':'done','data':done}, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type':'done','data':{'final_response':f'오류: {e}','layer_logs':[],'actions_structured':[]}}, ensure_ascii=False)}\n\n"
        finally:
            unregister_live_queue(request_id)
    return StreamingResponse(generate(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn, os
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True, app_dir=os.path.dirname(__file__))
```

**SSE 이벤트 타입**: `token` (스트리밍 텍스트) / `log` (LayerLogger) / `action_preview` (request_action 즉시 미리보기) / `clear_stream` (도구 호출 시 이전 스트림 클리어) / `done` (최종 결과)

---

## Step 12: 검증

```bash
cd {project_name}

# 1. 의존성 설치
uv sync

# 2. 그래프 컴파일 확인
uv run python -c "from graph.builder import app_graph; print('✅ 그래프 컴파일 OK')"

# 3. 기본 실행 테스트
uv run python -c "
from graph.builder import app_graph
from models.input_models import UnifiedInput
from layers.input_layer import InputProcessor
inp = UnifiedInput(input_type='chat', user_id=1, message='안녕하세요')
state = InputProcessor().process(inp)
result = app_graph.invoke(state, config={'configurable': {'thread_id': 'test-1'}})
print('route_to:', result.get('route_to'))
print('응답:', result.get('final_response'))
"

# 4. 웹 서버 (Yes인 경우)
uv run python web/server.py
```

---

## 커스터마이즈 포인트 요약

| 포인트 | 위치 | 방법 |
|--------|------|------|
| LLM 프로바이더 변경 | `config.py`, `agent_layer.py` | import + 모델명 교체 |
| 에이전트 추가 | — | `/add_agent_to_5layer` 스킬 호출 |
| 도구 추가 | `tool_layer.py` | `@tool` 함수 + `TOOLS_LIST` 등록 |
| 규칙 라우팅 추가 | `agent_layer.py` | `OrchestratorAgent.route()` if/elif |
| Context DB 교체 | `context_layer.py` | 싱글톤 클래스 교체 |
| 입력 타입 추가 | `models/input_models.py` | `Literal` 확장 |
| Action 구조화 | `graph/nodes.py` `format_response()` | `actions_structured` 구성 로직 |
| User Summary 갱신 | `graph/nodes.py` `run_memory_agent()` | LLM 호출로 요약 업데이트 |
