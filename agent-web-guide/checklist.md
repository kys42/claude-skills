# 새 서비스에 에이전트 채팅 붙이기 — 체크리스트

## Phase 0: 서비스 분석

- [ ] 서비스의 기존 API 목록 정리 (REST/GraphQL)
- [ ] 에이전트가 조회할 수 있는 데이터 식별 (상품, 글, 유저 정보 등)
- [ ] 에이전트가 제어할 수 있는 UI 동작 식별 (페이지 이동, 모달, 테마 등)
- [ ] 사용자가 에이전트에게 물을 것 같은 질문 목록 작성

## Phase 1: 프로토콜 설계

- [ ] SSE 이벤트 타입 확정 (기본 7종 그대로 or 커스텀 추가)
- [ ] 도구 3분류 정리:
  - [ ] Data Query 도구 목록 (어떤 API를 호출할지)
  - [ ] Action 도구 목록 (어떤 UI를 제어할지)
  - [ ] Display 도구 목록 (어떤 카드를 보여줄지)
- [ ] 카드 타입 설계 (도메인 카드 + custom_card + link_buttons)
- [ ] 액션 타입 설계 (navigate + 서비스 커스텀)
- [ ] 상태 메시지 매핑 (도구별 "🔍 검색중..." 등)

## Phase 2: 에이전트 서버

- [ ] 프로젝트 구조 생성:
  ```
  agent-server/
  ├── main.py       # FastAPI, POST /chat, GET /health
  ├── agent.py      # LLM 루프, 시스템 프롬프트, 세션
  ├── tools.py      # 도구 정의 + API 호출
  ├── sse.py        # SSE 이벤트 포맷터
  └── config.py     # 환경변수
  ```
- [ ] LLM SDK 선택 (google-genai, anthropic, openai 등)
- [ ] 도구 정의 (LLM의 function calling 형식에 맞게)
- [ ] `ACTION_TOOLS` set 정의 (Action/Display 도구 분류)
- [ ] 에이전트 루프 구현 (LLM → tool_use → 실행 → 반복)
- [ ] SSE 스트리밍 응답 (StreamingResponse + AsyncGenerator)
- [ ] 세션 관리 (인메모리 dict, MAX_HISTORY, trim 로직)
- [ ] 에러 핸들링 (타임아웃, API 실패, 세션 깨짐 복구)
- [ ] 시스템 프롬프트 작성 (prompt-template.md 참조)
- [ ] CORS 설정
- [ ] API Key 인증 (프로덕션)
- [ ] 로깅 (요청, 도구 호출, 응답, 에러)

## Phase 3: 프론트엔드

- [ ] 타입 정의 (`AgentAction`, `RichContent`, `StreamEvent`)
- [ ] SSE 스트림 파서 (sse-protocol.md 참조)
- [ ] 액션 디스패처 (action-system.md 참조)
- [ ] 채팅 클라이언트 (sessionId 관리, context 전송, AbortController)
- [ ] 채팅 UI 컴포넌트:
  - [ ] ChatShell (상태 관리, SSE 연동)
  - [ ] ChatWindow (메시지 렌더링)
  - [ ] ChatRichContent (카드 렌더러)
  - [ ] 도메인 카드 컴포넌트 (상품 카드, 아이템 카드 등)
- [ ] 마크다운 렌더링 (스트리밍 중 plain → done 후 마크다운)
- [ ] 상태 메시지 표시 (status 이벤트 → typing indicator)
- [ ] 대화 세션 유지 (sessionStorage)
- [ ] 예시 질문 (페이지별)

## Phase 4: 프록시

- [ ] 프록시 엔드포인트 생성 (같은 도메인)
- [ ] `AGENT_SERVER_URL` env로 에이전트 서버 연결
- [ ] API Key 주입 (서버 사이드에서 — 브라우저 노출 방지)
- [ ] mock fallback (에이전트 서버 없을 때)
- [ ] SSE 스트림 포워딩

## Phase 5: 배포

- [ ] 에이전트 서버 배포 (Railway, Fly.io, Cloud Run 등)
- [ ] 환경변수 설정:
  - 에이전트 서버: LLM API Key, 서비스 API URL, API Key
  - 프론트 프록시: AGENT_SERVER_URL, AGENT_API_KEY
- [ ] 헬스체크 확인 (`/health`)
- [ ] E2E 테스트 (채팅 → 도구 → 카드/액션)

## Phase 6: 튜닝

- [ ] 시스템 프롬프트 반복 테스트 (도구 사용 빈도, 답변 품질)
- [ ] 도구 description 개선 (LLM이 적절히 호출하도록)
- [ ] 후처리 방어 로직 (LLM이 규칙 무시할 때 — 텍스트 링크 → 카드 변환 등)
- [ ] 에러 메시지 UX
- [ ] 로딩/타이핑 상태 UX
- [ ] 모바일 반응형

## 흔한 함정

- **CORS**: 프론트에서 에이전트 서버 직접 호출 → Chrome Private Network Access 차단. 반드시 프록시.
- **IPv6**: macOS Chrome이 `localhost`를 IPv6로 resolve. 서버는 `--host "::"` 바인딩.
- **LLM이 도구 안 씀**: description 강화, CRITICAL 섹션 반복, 후처리 방어.
- **스트리밍 마크다운 깨짐**: 스트리밍 중 plain text, done 후 렌더링 전환.
- **세션 히스토리 깨짐**: function_call↔function_response 쌍을 유지하며 trim.
- **thinking 모델 (Gemini 3 등)**: thought_signature 보존 필수 — 원본 part를 그대로 히스토리에.
