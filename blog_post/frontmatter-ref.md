# Frontmatter 레퍼런스

## 스키마 (src/content/config.ts)

### 필수 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `string` (UUID) | 포스트 고유 식별자. `uuidgen`으로 생성 |
| `title` | `string` | 포스트 제목 |
| `summary` | `string` | 짧은 설명 (블로그 목록, OG description에 사용) |
| `publishedAt` | `date` | 발행일 (YYYY-MM-DD) |

### 선택 필드

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `tags` | `string[]` | `[]` | 태그 배열 |
| `category` | `string` | - | 단일 카테고리 |
| `draft` | `boolean` | `false` | true면 프로덕션에서 제외 |
| `ai_generated` | `boolean` | `false` | true면 /blog/ai/ 채널 |
| `heroImage` | `string` | - | 히어로 이미지 경로 |
| `relatedProjects` | `string[]` | `[]` | 관련 프로젝트 ID |

## 템플릿

```yaml
---
id: "{UUID}"
title: "{제목}"
summary: "{1~2문장 요약}"
publishedAt: {YYYY-MM-DD}
tags: ["{태그1}", "{태그2}"]
category: "{카테고리}"
draft: false
---
```

## 기존 카테고리

| 카테고리 | 용도 |
|----------|------|
| `devlog` | 개발기, 시리즈 |
| `Engineering` | 아키텍처, 기술 해설 |
| `Meta` | 사이트 관련 메모 |
| `ai-digest` | AI 생성 다이제스트 |

## 태그 가이드

### 기존 태그 목록

`devlog`, `openclaw`, `architecture`, `design`, `agentops`, `cicd`, `cloudflare`, `ai`, `agent`, `skill`, `claude-code`, `blogging`, `automation`, `digest`, `reddit`, `notes`, `meta`, `retrospective`

### 태그 선정 규칙

- **4~6개**가 적당. 3개 이하는 너무 적고 7개 이상은 노이즈.
- **구체적으로**: `ai`보다 `claude-code`, `llm` 같이 특정 기술/도구를 지목한다.
- **다층적으로**: 아래 3가지 레이어에서 골고루 뽑는다.
  1. **주제/프로젝트**: `openclaw`, `ys-homepage` — 어떤 프로젝트에 대한 글인가
  2. **기술/도구**: `astro`, `cloudflare`, `claude-code`, `tailwind` — 어떤 기술을 다루는가
  3. **성격/형태**: `devlog`, `architecture`, `retrospective`, `automation` — 글의 성격
- **기존 태그 우선 사용**. 같은 의미면 새로 만들지 않는다.
- 에이전트 관련 글이면 `agent` 태그를 기본으로 넣는다.
- 새 태그가 필요하면 kebab-case, 영어 소문자로 만든다.

## 파일명 규칙

- 형식: `YYYY-MM-DD-kebab-case-slug.md`
- 예: `2026-03-22-openclaw-devlog-03-automation.md`
- URL: `/blog/2026-03-22-openclaw-devlog-03-automation/`
- trailing slash 필수

## UUID 생성

```bash
uuidgen
# 출력 예: 3A7F2B1C-9D4E-4F8A-B5C6-1E2D3F4A5B6C
```

소문자로 변환해서 사용 권장.
