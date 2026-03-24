#!/bin/bash
# work-manager 자동 상태 감지 스크립트
# 사용법: detect-status.sh [project-path]

TARGET="${1:-.}"
cd "$TARGET" 2>/dev/null || { echo "ERROR: 경로를 찾을 수 없습니다: $TARGET"; exit 1; }
git rev-parse --is-inside-work-tree &>/dev/null || { echo "ERROR: git 저장소가 아닙니다: $TARGET"; exit 1; }

BRANCH=$(git branch --show-current)
REPO=$(basename "$(git rev-parse --show-toplevel)")

echo "=== Work Manager 상태 감지 ==="
echo "repo: $REPO"
echo "path: $(pwd)"
echo "branch: $BRANCH"
echo ""

# 변경 상태
echo "--- 변경 상태 ---"
git status --short
echo ""

# 최근 커밋
echo "--- 최근 커밋 5개 ---"
git log --oneline -5 2>/dev/null
echo ""

# 현재 브랜치의 열린 PR
echo "--- 열린 PR (현재 브랜치) ---"
gh pr list --head "$BRANCH" --state open --json number,title,url --template '{{range .}}#{{.number}} {{.title}} {{.url}}{{"\n"}}{{end}}' 2>/dev/null || echo "(gh CLI 없음 또는 인증 안됨)"
echo ""

# 나에게 할당된 열린 이슈
echo "--- 열린 이슈 (내 할당) ---"
gh issue list --assignee @me --state open -L 5 --json number,title --template '{{range .}}#{{.number}} {{.title}}{{"\n"}}{{end}}' 2>/dev/null || echo "(gh CLI 없음 또는 인증 안됨)"
echo ""

# 리모트 동기화
echo "--- 리모트 동기화 ---"
UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null)
if [ -n "$UPSTREAM" ]; then
  AHEAD=$(git rev-list --count "$UPSTREAM"..HEAD 2>/dev/null)
  BEHIND=$(git rev-list --count HEAD.."$UPSTREAM" 2>/dev/null)
  echo "upstream: $UPSTREAM (ahead: $AHEAD, behind: $BEHIND)"
else
  echo "upstream: 없음"
fi
