#!/usr/bin/env python3
"""Offline quality audit for recently generated production stories; no AI calls."""

import json
import os
import re
import sqlite3
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


DB_PATH = os.getenv("YOUGAME_DB_PATH", "/root/my_game/data/game.db")
REPORT_DIR = Path(os.getenv("YOUGAME_QUALITY_REPORT_DIR", "/root/my_game/data/quality_reports"))
REPORT_DIR.mkdir(parents=True, exist_ok=True)


def words(value: str) -> set[str]:
    return set(re.findall(r"[a-zа-яё]{4,}", (value or "").lower()))


def similar(left: str, right: str) -> float:
    a, b = words(left), words(right)
    return len(a & b) / max(1, len(a | b)) if a and b else 0.0


conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
chapters = conn.execute(
    """SELECT id,session_id,chapter_number,scene_text,choices_json,state_snapshot_json,created_at
       FROM game_chapters ORDER BY created_at DESC LIMIT 500"""
).fetchall()
sessions = conn.execute(
    """SELECT id,user_id,title,status,created_at FROM game_sessions
       WHERE status!='deleted' ORDER BY created_at DESC LIMIT 300"""
).fetchall()
conn.close()

issues = []
choice_counts = Counter()
for row in chapters:
    scene = (row["scene_text"] or "").strip()
    try:
        choices = json.loads(row["choices_json"] or "[]")
    except json.JSONDecodeError:
        choices = []
        issues.append({"kind": "invalid_choices_json", "chapter_id": row["id"]})
    regular = [item for item in choices if isinstance(item, dict) and item.get("id") != "custom"]
    choice_counts[len(regular)] += 1
    if len(scene) < 280:
        issues.append({"kind": "short_scene", "chapter_id": row["id"], "length": len(scene)})
    if scene[-1:] in {",", ";", ":", "-", "—", "("}:
        issues.append({"kind": "cut_sentence", "chapter_id": row["id"]})
    if any(len(str(item.get("text") or "")) > 150 for item in regular):
        issues.append({"kind": "long_choice", "chapter_id": row["id"]})
    if any(re.search(r"инвентар|использовать предмет|use (an )?item", str(item.get("text") or ""), re.I) for item in regular):
        issues.append({"kind": "inventory_in_choice", "chapter_id": row["id"]})
    for index, left in enumerate(regular):
        if any(similar(str(left.get("text") or ""), str(right.get("text") or "")) >= 0.6 for right in regular[index + 1:]):
            issues.append({"kind": "similar_choices", "chapter_id": row["id"]})
            break

title_groups = Counter((row["user_id"], (row["title"] or "").strip().lower()) for row in sessions if row["title"])
duplicate_titles = [
    {"user_id": user_id, "title": title, "count": count}
    for (user_id, title), count in title_groups.items()
    if count > 1
]

now = datetime.now(timezone.utc)
report = {
    "generated_at": now.isoformat(),
    "chapters_checked": len(chapters),
    "sessions_checked": len(sessions),
    "choice_count_distribution": dict(sorted(choice_counts.items())),
    "issue_counts": dict(Counter(item["kind"] for item in issues)),
    "issues": issues[:200],
    "duplicate_titles_per_user": duplicate_titles,
    "manual_review_sample": [dict(row) for row in chapters[:20]],
}
target = REPORT_DIR / f"quality-{now:%Y%m%d-%H%M%S}.json"
target.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
latest = REPORT_DIR / "latest.json"
latest.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(target)
