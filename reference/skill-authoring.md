# Custom Skill 작성 가이드

## 스킬 구조

```
~/.claude/skills/<skill-name>/
├── skill.md          # 스킬 정의 (필수)
└── (기타 참고 파일)
```

## skill.md 기본 템플릿

```markdown
---
description: 스킬 설명. 트리거 조건을 여기에 명시.
user_invocable: true          # /skill-name 으로 호출 가능
---

# 스킬 이름

## 동작 설명
이 스킬은 ...을 수행합니다.

## 단계
1. ...
2. ...

## 규칙
- ...
```

## 핵심 필드

| 필드 | 설명 |
|------|------|
| `description` | 트리거 판단에 사용됨. 구체적으로 작성 |
| `user_invocable` | true면 `/명령어`로 직접 호출 가능 |

## Description 작성 팁

description이 스킬 트리거의 핵심. 두 가지를 명확히:

1. **언제 트리거**: "Use when the user asks to...", "Triggers when..."
2. **언제 트리거하지 않을 것**: "DO NOT TRIGGER when..."

```yaml
# 좋은 예
description: >
  블로그 포스트 작성. 주제를 받아 기획→작성→저장까지 진행.
  Triggers: "블로그 써줘", "포스트 작성해줘"
  DO NOT trigger for: 단순 문서 작성, README 생성

# 나쁜 예
description: 글을 씁니다
```

## 스킬 본문 작성 패턴

### 인터랙티브 스킬
```markdown
## 단계
1. 사용자에게 [X]를 물어봄
2. 응답을 기반으로 [Y] 생성
3. 사용자 확인 후 저장
```

### 자동화 스킬
```markdown
## 동작
1. [X] 파일들을 분석
2. [Y] 규칙에 따라 변환
3. 결과를 [Z]에 저장
```

### 도구 조합 스킬
```markdown
## 사용하는 도구
- Agent(Explore): 코드베이스 탐색
- Bash: 빌드/테스트 실행
- Edit: 코드 수정

## 워크플로우
1. Explore로 관련 파일 찾기
2. Read로 파일 내용 확인
3. Edit로 수정 적용
4. Bash로 테스트 실행
```

## 스킬에서 다른 스킬 호출

skill.md 본문에서 다른 스킬을 참조하여 체이닝 가능:
```markdown
## 완료 후
- `/update_note` 스킬을 실행하여 변경사항 기록
```

## 스킬 배포 위치

| 위치 | 범위 |
|------|------|
| `~/.claude/skills/` | 모든 프로젝트에서 사용 |
| `<project>/.claude/skills/` | 해당 프로젝트에서만 사용 |

## 팁

- skill.md는 마크다운이지만, Claude에게 주는 **프롬프트**로 생각할 것
- 너무 길면 컨텍스트를 낭비하므로 핵심만 간결하게
- `@파일명`으로 외부 파일 참조 가능
- 스킬 내에서 AskUserQuestion으로 사용자 입력을 받을 수 있음
