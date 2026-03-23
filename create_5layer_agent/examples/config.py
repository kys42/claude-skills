# 예시 도메인: 고객 지원 봇 (customer_support_bot)
# 이 파일은 5-Layer 프로젝트의 config.py 작성 예시입니다.
# [CUSTOMIZE] 표시된 부분을 서비스 도메인에 맞게 수정하세요.

import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()


@dataclass
class AppConfig:
    # ── LLM 설정 ────────────────────────────────────────────
    # [CUSTOMIZE] 선택한 LLM 프로바이더/모델명으로 교체
    ROUTER_MODEL: str = "gemini-2.5-flash"    # 오케스트레이터용 (빠른 모델 권장)
    AGENT_MODEL: str = "gemini-2.5-flash"     # 서브에이전트용
    # OpenAI: "gpt-4o-mini" / "gpt-4o"
    # Anthropic: "claude-haiku-4-5" / "claude-sonnet-4-5"

    TEMPERATURE: float = 0.3
    THINKING_BUDGET: int = 0    # Gemini thinking budget (0=비활성, 양수=활성)

    # ── 메모리 설정 ──────────────────────────────────────────
    SHORT_TERM_WINDOW: int = 10   # 단기 메모리 유지 턴 수 (단방향 메시지 기준)
    DEFAULT_USER_ID: int = 1

    # ── 도메인별 추가 설정 ────────────────────────────────────
    # [CUSTOMIZE] 서비스에 필요한 설정 추가
    # 예: MAX_RESPONSE_LENGTH: int = 500
    # 예: SUPPORT_CATEGORIES: list = field(default_factory=lambda: ["billing", "tech", "general"])


config = AppConfig()
