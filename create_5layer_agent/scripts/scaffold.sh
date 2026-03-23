#!/bin/bash
# LangGraph 5-Layer 에이전트 프로젝트 스캐폴딩 스크립트
# Usage: bash scaffold.sh <project_name> [target_dir]

set -e

PROJECT_NAME=${1:-my_agent}
TARGET_DIR=${2:-.}
ROOT="$TARGET_DIR/$PROJECT_NAME"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🏗️  5-Layer Agent 스캐폴딩: $ROOT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "$ROOT" ]; then
    echo "⚠️  '$ROOT' 디렉토리가 이미 존재합니다. 덮어쓰지 않고 없는 파일만 생성합니다."
fi

# ── 디렉토리 생성 ────────────────────────────────────────────
mkdir -p "$ROOT"/{layers,graph,models,prompts,web,logs}

# ── __init__.py 생성 ─────────────────────────────────────────
for d in "" layers graph models prompts web; do
    f="$ROOT/$d/__init__.py"
    [ -f "$f" ] || touch "$f"
done

# ── 빈 파일 생성 ─────────────────────────────────────────────
STUBS=(
    "pyproject.toml"
    ".env"
    "config.py"
    "logging_config.py"
    "layers/input_layer.py"
    "layers/agent_layer.py"
    "layers/tool_layer.py"
    "layers/context_layer.py"
    "layers/action_layer.py"
    "models/input_models.py"
    "models/output_models.py"
    "prompts/orchestrator_prompt.py"
    "prompts/common_guide.py"
    "graph/state.py"
    "graph/edges.py"
    "graph/nodes.py"
    "graph/builder.py"
    "web/server.py"
)

for f in "${STUBS[@]}"; do
    target="$ROOT/$f"
    [ -f "$target" ] || touch "$target"
done

# ── COMMON_GUIDE.md 기본 내용 ────────────────────────────────
cat > "$ROOT/prompts/COMMON_GUIDE.md" << 'EOF'
## 공통 운영 가이드

- Context 도구(데이터 조회)는 텍스트 생성 전에 우선 호출한다.
- Action 도구는 텍스트 응답 완성 후 마지막에 호출한다.
- Action 도구 결과 수신 후에는 짧은 확인 메시지만 출력하고 종료한다.
- 도구 호출은 최대 5회까지 허용한다.
EOF

# ── pyproject.toml 기본 뼈대 ─────────────────────────────────
cat > "$ROOT/pyproject.toml" << EOF
[project]
name = "${PROJECT_NAME}"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = [
  "pydantic>=2.5,<3",
  "python-dotenv>=1.0,<2",
  "typing-extensions>=4.9,<5",
  "langgraph>=0.2,<1",
  "langchain-core>=0.3,<2",
  # LLM 프로바이더 (하나만 활성화):
  # "langchain-google-genai>=2.0,<5",
  # "langchain-openai>=0.2,<2",
  # "langchain-anthropic>=0.2,<2",
]

[tool.uv]
managed = true
EOF

# ── .env 기본 뼈대 ───────────────────────────────────────────
cat > "$ROOT/.env" << 'EOF'
# LLM API 키 (사용하는 프로바이더의 키만 입력)
# GOOGLE_API_KEY=...
# OPENAI_API_KEY=...
# ANTHROPIC_API_KEY=...

# 기타 환경 변수
# DB_URL=...
EOF

echo ""
echo "✅ 스캐폴딩 완료!"
echo ""
echo "생성된 구조:"
find "$ROOT" -not -path "*/__pycache__/*" -not -name "*.pyc" | sort | \
    sed "s|$ROOT||" | sed 's|^/||' | grep -v "^$" | \
    awk '{depth=gsub("/","/",$0); for(i=0;i<depth;i++) printf "  "; print "├── " $0}'
echo ""
echo "다음 단계:"
echo "  1. cd $ROOT"
echo "  2. pyproject.toml 에서 LLM 프로바이더 의존성 활성화"
echo "  3. uv sync"
echo "  4. Claude Code에서 각 파일 코드 작성 (SKILL.md Step 2~11 참조)"
