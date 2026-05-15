---
name: agent-web-guide
description: "Agent-Web Integration Guide"
---

# Agent-Web Integration Guide

웹 서비스에 AI 에이전트 채팅을 붙일 때 사용하는 아키텍처 가이드.
SSE 스트리밍, 도구 설계, 프론트 액션 시스템, 시스템 프롬프트 구조를 범용 패턴으로 정리.

## 언제 쓰는가

- "이 서비스에 AI 채팅을 붙이고 싶다"
- "에이전트가 서비스 데이터를 조회하고 UI를 제어하게 하고 싶다"
- "LLM + 도구 + SSE 스트리밍 구조를 잡아야 한다"

## 전체 아키텍처

```
[프론트엔드 채팅 UI]
    │ POST /chat (same-origin)
    ▼
[Proxy Layer] ← 서비스 인프라 (CF Pages Function, Next.js API Route 등)
    │ 인증 주입, 요청 검증, SSE 포워딩
    │ 에이전트 서버 없으면 mock fallback
    ▼
[Agent Server] ← Python (FastAPI) / Node.js
    │ LLM 호출 (Gemini, Claude, GPT 등)
    │ function_calling → 도구 실행
    │ SSE 이벤트 스트리밍
    ▼
[Service API] ← 서비스의 기존 REST/GraphQL API
    데이터 조회 (검색, 목록, 상세)
```

### 핵심 원칙

1. **프론트는 에이전트를 직접 호출하지 않는다** — same-origin 프록시 경유 (CORS, 보안, API 키 보호)
2. **에이전트는 서비스 API를 도구로 호출한다** — 별도 DB 접근 없이 기존 API 재활용
3. **모든 응답은 SSE 스트림** — text + card + action이 하나의 스트림에 섞여서 온다
4. **도구는 3종류** — Data Query / Action / Display
5. **에이전트 서버 없이도 동작** — 프록시에 mock fallback 포함

## 상세 문서

| 문서 | 내용 | 언제 읽는지 |
|------|------|-----------|
| [sse-protocol.md](sse-protocol.md) | SSE 이벤트 7종 규격 | 프로토콜 설계 시 |
| [tool-design.md](tool-design.md) | 도구 3분류 + 정의 패턴 | 에이전트 도구 설계 시 |
| [action-system.md](action-system.md) | 프론트 액션 디스패처 | 프론트 연동 시 |
| [prompt-template.md](prompt-template.md) | 시스템 프롬프트 섹션 구조 | 에이전트 인스트럭션 작성 시 |
| [checklist.md](checklist.md) | 구현 체크리스트 | 새 서비스에 적용할 때 |

## 파일 구조 (새 서비스)

```
서비스 프로젝트/
├── agent-server/          # Python 에이전트 서버
│   ├── main.py            # FastAPI 앱, POST /chat
│   ├── agent.py           # LLM 루프, 시스템 프롬프트, 세션
│   ├── tools.py           # 도구 정의 + API 호출 래퍼
│   ├── sse.py             # SSE 이벤트 포맷터
│   └── config.py          # 환경변수
│
├── src/lib/agent/         # 프론트엔드 에이전트 라이브러리
│   ├── types.ts           # AgentAction, RichContent, StreamEvent
│   ├── stream-parser.ts   # SSE 스트림 파서
│   ├── action-dispatcher.ts # 액션 실행
│   └── client.ts          # 에이전트 서버 연결
│
├── src/components/chat/   # 채팅 UI 컴포넌트
│   ├── ChatShell.tsx       # 상태 관리, SSE 연동
│   ├── ChatWindow.tsx      # 메시지 렌더링
│   └── ChatRichContent.tsx # 카드 렌더러
│
└── functions/api/chat.ts  # 프록시 엔드포인트 (또는 API Route)
```

## 검증된 레퍼런스

ys-homepage 프로젝트에서 이 모든 패턴이 프로덕션 검증됨:
- 에이전트 서버: Gemini 3 Flash + function calling
- SSE 스트리밍: 텍스트 + 카드 + 액션 혼합
- 프론트: React + Tailwind
- 프록시: Cloudflare Pages Function
- 배포: Railway (에이전트) + CF Pages (프론트)
