# Claude Code Skills

개인적으로 만들어서 사용하는 Claude Code 커스텀 스킬들을 저장하는 레포입니다.

슬래시 커맨드(`/skill-name`)로 호출하여 반복 작업을 자동화합니다.

## Skills

### Custom (직접 제작)

| Skill | 설명 | 사용법 |
|-------|------|--------|
| **[✨ almighty](almighty/SKILL.md)** | 핵심 의도와 프로젝트 맥락을 읽고, 함께 하면 좋은 개선을 먼저 제안하며 결과까지 책임지는 올마이티 모드 | `/almighty` · Codex: `$almighty` |
| **blog_post** | 블로그 포스트 협업 작성. 기획 → 작성 → 저장까지 인터랙티브 진행 | `/blog_post <제목>` |
| **create_5layer_agent** | LangGraph 5-Layer 에이전트 프로젝트 스캐폴딩 | `/create_5layer_agent` |
| **qa_project** | 범용 프로젝트 QA 자동화. 구조 파악 → 테스트 → 리포트 → 이슈 등록 | `/qa_project qa_major` |
| **ralph_manager** | 자율 개발 루프(Ralph) 관리. 초기화, PRD, 실행, 리뷰 | `/ralph_manager init` |
| **update_note** | 세션 작업 내용을 `update_note.md`에 기록하고 git commit 제안 | `/update_note` |
| **work-manager** | 개발 워크플로우 매니저. 이슈 → 브랜치 → 구현 → 테스트 → PR → 리뷰 → 머지까지 자동화 | `/work-manager` |
| **summary** | Claude Code 작업 내용 요약. 오늘, 어제, 이번 주, 특정 날짜 등 지원 | `/summary` |
| **agent-web-guide** | 웹 서비스에 AI 에이전트 채팅 붙이기. SSE 스트리밍, 도구 설계, 액션 시스템 아키텍처 가이드 | `/agent-web-guide` |
| **reference** | Claude Code 활용 팁, 훅 패턴, MCP 서버, 프롬프트 엔지니어링 레퍼런스 | 직접 참조 |

### ✨ Almighty 사용 예시

```text
$almighty 프로젝트 관리 기능을 제대로 완성해줘. 기존 흐름과 연결해서 같이 개선하면 좋은 부분도 먼저 제안해줘.
```

Claude Code에서는 `/almighty`로 호출합니다. 사용자 의도와 프로젝트 전체 맥락을 살펴 핵심 기능·연결 개선을 제안하고, 승인된 범위에서 구현과 검증까지 책임집니다. 작업 규모에 따라 가벼운 서브에이전트로 다른 적용 후보를 탐색하며, 사실과 완료 주장은 근거로 확인합니다.

### Ported (외부에서 가져온 것)

| Skill | 원본 | 설명 | 사용법 |
|-------|------|------|--------|
| **agent-browser** | [Vercel](https://github.com/vercel/agent-browser) | 브라우저 자동화 CLI. 웹 탐색, 폼 작성, 스크린샷, 데이터 추출 등 | `agent-browser open <url>` |

## Setup

`~/.claude/skills/` 디렉토리에 클론하면 Claude Code가 자동으로 인식합니다.

```bash
git clone <repo-url> ~/.claude/skills
```

## Structure

```
skills/
├── agent-browser/     # 브라우저 자동화 (Vercel)
├── almighty/          # ✨ 주도적인 제안과 완성도 높은 실행
├── blog_post/         # 블로그 작성
├── create_5layer_agent/ # LangGraph 에이전트 생성
├── qa_project/        # QA 자동화
├── ralph_manager/     # 자율 개발 루프
├── reference/         # 레퍼런스 문서 모음
├── agent-web-guide/   # 에이전트-웹 통합 가이드
├── summary/           # 작업 요약
├── update_note/       # 세션 기록
└── work-manager/      # 개발 워크플로우 매니저
```

각 스킬 디렉토리의 `SKILL.md`에 상세 사용법이 있습니다.

## License

MIT
