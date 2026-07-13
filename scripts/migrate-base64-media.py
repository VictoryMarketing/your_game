#!/usr/bin/env python3
"""Move legacy chapter data URLs from SQLite into the configured media store."""

import base64
import re

from app.db import db_cursor
from app.services.media_storage_service import store_media_bytes


DATA_URL = re.compile(r"^data:([^;,]+);base64,(.+)$", re.DOTALL)


def extension_for(mime: str, kind: str) -> str:
    mime = mime.lower()
    if "webp" in mime:
        return "webp"
    if "jpeg" in mime or "jpg" in mime:
        return "jpg"
    if "mpeg" in mime or "mp3" in mime:
        return "mp3"
    if "ogg" in mime:
        return "ogg"
    return "png" if kind == "images" else "mp3"


with db_cursor() as cur:
    cur.execute(
        """SELECT id,user_id,session_id,image_url,voice_url
           FROM game_chapters
           WHERE image_url LIKE 'data:%' OR voice_url LIKE 'data:%'"""
    )
    rows = [dict(row) for row in cur.fetchall()]

migrated = 0
for row in rows:
    updates = {}
    for column, kind in (("image_url", "images"), ("voice_url", "voice")):
        raw = row.get(column) or ""
        match = DATA_URL.match(raw)
        if not match:
            continue
        content = base64.b64decode(match.group(2), validate=True)
        if not content:
            continue
        updates[column] = store_media_bytes(
            kind=kind,
            user_id=str(row["user_id"]),
            session_id=str(row["session_id"]),
            chapter_id=str(row["id"]),
            extension=extension_for(match.group(1), kind),
            content=content,
        )
    if updates:
        with db_cursor() as cur:
            sets = ",".join(f"{column}=?" for column in updates)
            cur.execute(f"UPDATE game_chapters SET {sets} WHERE id=?", (*updates.values(), row["id"]))
        migrated += len(updates)

print(f"legacy-media-migrated={migrated}")
