# 프론트엔드 액션 시스템

## 개념

에이전트가 `action` 도구를 호출하면 SSE `event: action`으로 프론트에 전달. 프론트의 **디스패처**가 액션 타입에 따라 DOM/이벤트를 조작.

## 범용 액션 타입

서비스 종류와 무관하게 쓸 수 있는 기본 액션:

```typescript
type AgentAction =
  | { type: 'navigate'; path: string }           // 페이지 이동
  | { type: 'scroll_to'; selector: string }      // 요소로 스크롤
  | { type: 'highlight'; selector: string }      // 요소 하이라이트 (3초)
  | { type: 'show_notification'; message: string } // 토스트 알림
  | { type: 'toggle_theme' }                     // 테마 전환
  | { type: 'open_modal'; modalId: string }      // 모달 열기
  // 서비스별 커스텀 액션 추가
```

## 디스패처 패턴

```typescript
function dispatchAgentAction(action: AgentAction): void {
  switch (action.type) {
    case 'navigate':
      window.location.assign(action.path);
      break;

    case 'scroll_to': {
      const el = document.querySelector(action.selector);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      break;
    }

    case 'highlight': {
      const el = document.querySelector(action.selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('agent-highlight');
        setTimeout(() => el.classList.remove('agent-highlight'), 3000);
      }
      break;
    }

    case 'toggle_theme': {
      const html = document.documentElement;
      const isDark = html.classList.contains('dark');
      html.classList.toggle('dark', !isDark);
      html.classList.toggle('light', isDark);
      try { localStorage.setItem('theme', isDark ? 'light' : 'dark'); } catch {}
      break;
    }

    case 'show_notification':
      // 서비스의 토스트 시스템 호출
      window.dispatchEvent(new CustomEvent('toast', {
        detail: { message: action.message }
      }));
      break;
  }
}
```

## 리치 카드 타입

카드는 `event: card`로 전달. 프론트에서 타입별로 렌더링.

### 범용 카드 타입

```typescript
type RichContent =
  // 도메인 카드 (서비스별 정의)
  | { type: 'item_card'; id: string; title: string; summary: string; ... }

  // 참조 카드 (id만 보내면 프론트가 API로 fetch)
  | { type: 'item_card_ref'; id: string }

  // 범용 카드 (어떤 서비스든 사용)
  | { type: 'custom_card'; title?: string; body?: string; buttons?: CardButton[] }
  | { type: 'link_buttons'; buttons: CardButton[] }
  | { type: 'tag_chips'; tags: string[]; clickable?: boolean }

type CardButton = {
  label: string;
  action: AgentAction | { type: 'link'; href: string };
};
```

### item_card vs item_card_ref

- **item_card**: 에이전트가 title, summary 등을 직접 포함. 추가 fetch 불필요.
- **item_card_ref**: id/slug만 보냄. 프론트가 서비스 API로 데이터 fetch → 렌더링. 에이전트 토큰 절약.

## 채팅 쉘 연동

```typescript
// 채팅 쉘에서 SSE 핸들러 연결
sendChatMessage(message, context, {
  onText: (content) => appendToMessage(content),
  onCard: (card) => addRichContent(card),
  onAction: (action) => dispatchAgentAction(action),
  onStatus: (msg) => setStatusMessage(msg),
  onDone: () => finishStreaming(),
  onError: (err) => showError(err.message),
});
```

## 마크다운 렌더링 주의

- **스트리밍 중**: plain text (`whitespace-pre-wrap`)
- **스트리밍 완료 (done)**: 마크다운 렌더링으로 전환
- 이유: 토큰 단위 스트리밍에서 불완전한 마크다운이 깨짐 (`*`가 닫히기 전 이탤릭 전환 등)

## 내부 링크 처리

에이전트가 텍스트에 마크다운 링크를 넣는 건 나쁜 UX. navigate 도구를 써야 한다.

방어적으로 — 텍스트의 내부 링크(`[text](/path)`)에 `data-navigate` 속성을 붙이고, 클릭 시 `window.location.assign`으로 SPA 이동:

```typescript
// 마크다운 렌더링 시
html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
  if (href.startsWith('/')) {
    return `<a href="${href}" data-navigate="${href}">${label}</a>`;
  }
  return `<a href="${href}" target="_blank">${label}</a>`;
});

// 클릭 핸들러
onClick={(e) => {
  const nav = (e.target as HTMLElement).closest('[data-navigate]');
  if (nav) { e.preventDefault(); window.location.assign(nav.dataset.navigate); }
}}
```
