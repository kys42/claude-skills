# Claude Code Skills

개인적으로 만들어서 사용하는 Claude Code 커스텀 스킬들을 저장하는 레포입니다.

슬래시 커맨드(`/skill-name`)로 호출하여 반복 작업을 자동화합니다.

## Skills

| Skill | 설명 | 사용법 |
|-------|------|--------|
| **agent-browser** | 브라우저 자동화 CLI. 웹 탐색, 폼 작성, 스크린샷, 데이터 추출 등 | `agent-browser open <url>` |
| **blog_post** | 블로그 포스트 협업 작성. 기획 → 작성 → 저장까지 인터랙티브 진행 | `/blog_post <제목>` |
| **create_5layer_agent** | LangGraph 5-Layer 에이전트 프로젝트 스캐폴딩 | `/create_5layer_agent` |
| **qa_project** | 범용 프로젝트 QA 자동화. 구조 파악 → 테스트 → 리포트 → 이슈 등록 | `/qa_project qa_major` |
| **ralph_manager** | 자율 개발 루프(Ralph) 관리. 초기화, PRD, 실행, 리뷰 | `/ralph_manager init` |
| **update_note** | 세션 작업 내용을 `update_note.md`에 기록하고 git commit 제안 | `/update_note` |
| **reference** | Claude Code 활용 팁, 훅 패턴, MCP 서버, 프롬프트 엔지니어링 레퍼런스 | 직접 참조 |

## Setup

`~/.claude/skills/` 디렉토리에 클론하면 Claude Code가 자동으로 인식합니다.

```bash
git clone <repo-url> ~/.claude/skills
```

## Structure

```
skills/
├── agent-browser/     # 브라우저 자동화
├── blog_post/         # 블로그 작성
├── create_5layer_agent/ # LangGraph 에이전트 생성
├── qa_project/        # QA 자동화
├── ralph_manager/     # 자율 개발 루프
├── reference/         # 레퍼런스 문서 모음
└── update_note/       # 세션 기록
```

각 스킬 디렉토리의 `SKILL.md`에 상세 사용법이 있습니다.

## License

MIT
