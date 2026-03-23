# 예시 도메인: 고객 지원 봇 (customer_support_bot)
# 이 파일은 graph/state.py 작성 예시입니다.
# AgentState는 LangGraph StateGraph 전체에서 공유되는 데이터 컨테이너입니다.

from typing import Annotated, Optional
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    # ── Layer 1: INPUT ───────────────────────────────────────
    # [CUSTOMIZE] input_type의 Literal을 서비스 입력 유형으로 확장
    input_type: str          # "chat" | "event" | ...
    user_message: str
    event_data: Optional[dict]
    user_id: int

    # ── Layer 2: AGENT ───────────────────────────────────────
    # messages: add_messages 리듀서로 자동 누적 (덮어쓰지 않음)
    messages: Annotated[list, add_messages]
    route_to: Optional[str]  # "chat" | "support" | ...  [CUSTOMIZE] 에이전트 키 목록

    # ── Layer 3+4: TOOL / CONTEXT ────────────────────────────
    conversation_memory: list        # MemoryDB에서 로드한 최근 대화
    user_summary: Optional[str]      # MemoryDB 장기 요약

    # [CUSTOMIZE] 도메인 데이터 필드 추가
    # 예: ticket_data: Optional[dict]   # 지원 티켓 정보
    # 예: knowledge_results: Optional[list]  # RAG 검색 결과

    # ── Layer 5: ACTION ──────────────────────────────────────
    actions: list
    actions_structured: Optional[list]  # format_response에서 구성

    # ── 시스템 ───────────────────────────────────────────────
    final_response: str
    layer_logs: list              # UI 표시용 LayerLogger 로그 누적
    error: Optional[str]
    _input_comp: Optional[str]    # 동적 INPUT 카드 컴포넌트명 (로깅용)
    _skipped_orchestrator: Optional[bool]  # 규칙 기반 직행 시 True
