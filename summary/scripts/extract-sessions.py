#!/usr/bin/env python3
"""
Claude Code 세션 로그 추출기.

history.jsonl에서 지정 날짜(범위)의 세션을 찾고,
각 세션 JSONL에서 user/assistant 텍스트 + tool 사용 요약을 추출한다.

Usage:
  python3 extract-sessions.py today                # 오늘
  python3 extract-sessions.py yesterday             # 어제
  python3 extract-sessions.py week                  # 이번 주 (월~오늘)
  python3 extract-sessions.py 2026-03-24            # 특정 날짜
  python3 extract-sessions.py 2026-03-20 2026-03-24 # 날짜 범위
  위 모든 옵션에 --split 추가 가능 (프로젝트별 파일 분할)
"""

import json
import sys
import os
import re
from datetime import datetime, date, timedelta
from pathlib import Path

CLAUDE_DIR = Path.home() / ".claude"
HISTORY_FILE = CLAUDE_DIR / "history.jsonl"
PROJECTS_DIR = CLAUDE_DIR / "projects"

MAX_USER_TEXT_PER_MSG = 500
MAX_ASSISTANT_TEXT_PER_MSG = 300
MAX_TOOL_RECORDS_PER_SESSION = 50


def encode_project_path(project_path: str) -> str:
    """프로젝트 경로를 Claude 프로젝트 디렉토리명으로 변환."""
    return project_path.replace("/", "-").replace(".", "-").replace("_", "-")


def resolve_dates(args: list[str]) -> tuple[list[str], bool]:
    """인수를 파싱하여 (날짜 리스트, split 여부) 반환."""
    split_mode = "--split" in args
    date_args = [a for a in args if a != "--split"]

    today = date.today()

    if not date_args or date_args[0] == "today":
        return [today.isoformat()], split_mode

    if date_args[0] == "yesterday":
        return [(today - timedelta(days=1)).isoformat()], split_mode

    if date_args[0] == "week":
        # 이번 주 월요일부터 오늘까지
        monday = today - timedelta(days=today.weekday())
        dates = []
        d = monday
        while d <= today:
            dates.append(d.isoformat())
            d += timedelta(days=1)
        return dates, split_mode

    if date_args[0] == "month":
        first = today.replace(day=1)
        dates = []
        d = first
        while d <= today:
            dates.append(d.isoformat())
            d += timedelta(days=1)
        return dates, split_mode

    # YYYY-MM-DD 형식 체크
    date_pattern = re.compile(r"^\d{4}-\d{2}-\d{2}$")

    if len(date_args) == 1 and date_pattern.match(date_args[0]):
        return [date_args[0]], split_mode

    if len(date_args) == 2 and all(date_pattern.match(a) for a in date_args):
        start = date.fromisoformat(date_args[0])
        end = date.fromisoformat(date_args[1])
        dates = []
        d = start
        while d <= end:
            dates.append(d.isoformat())
            d += timedelta(days=1)
        return dates, split_mode

    # 못 파싱하면 오늘
    return [today.isoformat()], split_mode


def find_sessions_for_dates(target_dates: set[str]) -> dict:
    """history.jsonl에서 target_dates에 해당하는 세션을 프로젝트별로 그룹화.

    Returns: {
        date_str: {
            project_path: {
                session_id: {
                    "inputs": [...],
                    "first_time": "HH:MM",
                    "last_time": "HH:MM"
                }
            }
        }
    }
    """
    result = {}
    if not HISTORY_FILE.exists():
        return result

    with open(HISTORY_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue

            ts = obj.get("timestamp", 0)
            if not ts:
                continue
            dt = datetime.fromtimestamp(ts / 1000)
            date_str = dt.strftime("%Y-%m-%d")
            if date_str not in target_dates:
                continue

            project = obj.get("project", "unknown")
            session_id = obj.get("sessionId", "")
            display = obj.get("display", "")
            time_str = dt.strftime("%H:%M")

            key = session_id if session_id else "__no_session__"

            by_date = result.setdefault(date_str, {})
            by_project = by_date.setdefault(project, {})
            by_project.setdefault(key, {
                "inputs": [],
                "first_time": time_str,
                "last_time": time_str,
            })
            entry = by_project[key]
            if display:
                entry["inputs"].append(display[:MAX_USER_TEXT_PER_MSG])
            entry["last_time"] = time_str

    return result


SKIP_PREFIXES = (
    "[Request interrupted",
    "Base directory for this skill:",
    "<command-message>",
    "This session is being continued from",
)


def _extract_text_from_content(content) -> str:
    """user message의 content에서 텍스트만 추출."""
    if isinstance(content, str):
        text = content.strip()
        if any(text.startswith(p) for p in SKIP_PREFIXES):
            return ""
        return text
    if isinstance(content, list):
        texts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                t = item.get("text", "").strip()
                if t and not any(t.startswith(p) for p in SKIP_PREFIXES):
                    texts.append(t)
        return " ".join(texts)
    return ""


def _record_tool_use(item: dict, result: dict):
    """tool_use 항목에서 도구명과 대상 파일을 기록."""
    name = item.get("name", "")
    inp = item.get("input", {})
    if not isinstance(inp, dict):
        inp = {}

    if name in ("Read", "Write", "Edit"):
        path = inp.get("file_path", inp.get("path", ""))
        if path:
            short = os.path.basename(path)
            result["tools_used"].append(f"{name}: {short}")
            if name in ("Write", "Edit"):
                result["files_modified"].add(path)
    elif name == "Bash":
        cmd = inp.get("command", "")[:80]
        if "git commit" in cmd or "git add" in cmd or "git push" in cmd:
            result["tools_used"].append(f"Bash(git): {cmd}")
        else:
            result["tools_used"].append(f"Bash: {cmd}")
    elif name == "Task":
        desc = inp.get("description", inp.get("prompt", ""))[:60]
        result["tools_used"].append(f"Task: {desc}")
    elif name in ("Glob", "Grep"):
        pass
    else:
        result["tools_used"].append(name)


def _parse_timestamp(ts) -> datetime | None:
    """다양한 형태의 timestamp를 datetime으로 변환."""
    if not ts:
        return None
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts / 1000)
    if isinstance(ts, str):
        try:
            return datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def extract_session_content(session_file: Path, target_dates: set[str]) -> dict:
    """세션 JSONL에서 target_dates에 해당하는 user/assistant 텍스트와 tool 사용을 추출."""
    result = {
        "user_messages": [],
        "assistant_messages": [],
        "tools_used": [],
        "files_modified": set(),
    }

    try:
        with open(session_file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue

                ts = obj.get("timestamp")
                dt = _parse_timestamp(ts)
                if dt is None:
                    continue
                if dt.strftime("%Y-%m-%d") not in target_dates:
                    continue

                msg_type = obj.get("type")

                if msg_type == "user":
                    content = obj.get("message", {}).get("content", "")
                    text = _extract_text_from_content(content)
                    if text:
                        result["user_messages"].append(text[:MAX_USER_TEXT_PER_MSG])

                elif msg_type == "assistant":
                    message = obj.get("message", {})
                    content = message.get("content", [])
                    if isinstance(content, list):
                        for item in content:
                            if not isinstance(item, dict):
                                continue
                            if item.get("type") == "text":
                                text = item.get("text", "").strip()
                                if text:
                                    result["assistant_messages"].append(
                                        text[:MAX_ASSISTANT_TEXT_PER_MSG]
                                    )
                            elif item.get("type") == "tool_use":
                                _record_tool_use(item, result)
    except (OSError, PermissionError):
        pass

    result["files_modified"] = sorted(result["files_modified"])

    if len(result["tools_used"]) > MAX_TOOL_RECORDS_PER_SESSION:
        count = len(result["tools_used"])
        result["tools_used"] = result["tools_used"][:MAX_TOOL_RECORDS_PER_SESSION]
        result["tools_used"].append(f"... 외 {count - MAX_TOOL_RECORDS_PER_SESSION}개")

    return result


def build_output(target_dates: list[str]) -> dict:
    """전체 출력 데이터를 구성."""
    date_set = set(target_dates)
    all_sessions = find_sessions_for_dates(date_set)

    if not all_sessions:
        return {
            "dates": target_dates,
            "range": f"{target_dates[0]}~{target_dates[-1]}" if len(target_dates) > 1 else target_dates[0],
            "projects": {},
            "summary": "해당 기간에 세션 기록이 없습니다.",
        }

    # 프로젝트별로 날짜를 합쳐서 집계
    merged_projects = {}
    for date_str, by_project in all_sessions.items():
        for project_path, session_map in by_project.items():
            if project_path not in merged_projects:
                merged_projects[project_path] = {}
            for sid, meta in session_map.items():
                if sid not in merged_projects[project_path]:
                    merged_projects[project_path][sid] = {
                        "inputs": [],
                        "first_time": meta["first_time"],
                        "last_time": meta["last_time"],
                        "date": date_str,
                    }
                entry = merged_projects[project_path][sid]
                entry["inputs"].extend(meta["inputs"])
                entry["last_time"] = meta["last_time"]

    output = {
        "dates": target_dates,
        "range": f"{target_dates[0]}~{target_dates[-1]}" if len(target_dates) > 1 else target_dates[0],
        "projects": {},
    }

    for project_path, session_map in merged_projects.items():
        project_name = project_path.rstrip("/").split("/")[-1] or "unknown"
        dir_name = encode_project_path(project_path)

        project_data = {"path": project_path, "sessions": {}}

        for session_id, meta in session_map.items():
            session_key = session_id[:8] if session_id != "__no_session__" else "__no_session__"

            session_data = {
                "date": meta.get("date", target_dates[0]),
                "time_range": f"{meta['first_time']}~{meta['last_time']}",
                "input_count": len(meta["inputs"]),
                "user_inputs_from_history": meta["inputs"][:10],
            }

            if session_id != "__no_session__":
                session_file = PROJECTS_DIR / dir_name / f"{session_id}.jsonl"
                if session_file.exists():
                    content = extract_session_content(session_file, date_set)
                    session_data.update(content)

            project_data["sessions"][session_key] = session_data

        output["projects"][project_name] = project_data

    return output


def main():
    args = sys.argv[1:]
    target_dates, split_mode = resolve_dates(args)

    output = build_output(target_dates)

    if split_mode:
        label = output["range"].replace("~", "_to_")
        split_dir = Path(f"/tmp/claude-summary/{label}")
        split_dir.mkdir(parents=True, exist_ok=True)

        files = []
        for project_name, project_data in output.get("projects", {}).items():
            safe_name = project_name.replace("/", "-").replace(" ", "-")
            file_path = split_dir / f"{safe_name}.json"
            single = {
                "dates": target_dates,
                "range": output["range"],
                "project_name": project_name,
                "data": project_data,
            }
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(single, f, ensure_ascii=False, indent=2)
            files.append(str(file_path))

        result = {
            "dates": target_dates,
            "range": output["range"],
            "mode": "split",
            "project_count": len(files),
            "files": files,
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
