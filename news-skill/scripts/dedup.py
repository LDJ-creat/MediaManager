"""
dedup.py — 跨天去重管理模块

维护 seen_urls.json，确保已收录的文章不在后续日报中重复出现。
文件结构：{"YYYY-MM-DD": ["url1", "url2", ...], ...}
自动清理超过 DEDUP_RETENTION_DAYS 天的记录。
"""

import json
import os
from datetime import date, timedelta


def _load(seen_file: str) -> dict[str, list[str]]:
    """加载 seen_urls.json，不存在则返回空字典"""
    if not os.path.exists(seen_file):
        return {}
    try:
        with open(seen_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def _save(data: dict[str, list[str]], seen_file: str) -> None:
    """保存 seen_urls.json"""
    os.makedirs(os.path.dirname(seen_file), exist_ok=True)
    with open(seen_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def filter_seen(items: list[dict], seen_file: str) -> list[dict]:
    """
    从 items 中过滤掉已在历史日报中出现过的 URL。
    返回未见过的文章列表。
    """
    seen_data = _load(seen_file)
    all_seen_urls: set[str] = set()
    for urls in seen_data.values():
        all_seen_urls.update(urls)

    before = len(items)
    filtered = [item for item in items if item["url"] not in all_seen_urls]
    after = len(filtered)

    if before - after > 0:
        print(f"[INFO] 跨天去重：过滤掉 {before - after} 条已收录文章，剩余 {after} 条")
    return filtered


def mark_as_seen(
    urls: list[str],
    seen_file: str,
    retention_days: int = 7,
    today: str | None = None,
) -> None:
    """
    将本次收录的 URL 写入 seen_urls.json，并清理超过 retention_days 的旧记录。
    """
    if not urls:
        return

    today_str = today or date.today().isoformat()
    seen_data = _load(seen_file)

    # 追加今天的记录（合并，避免多次调用重复）
    existing = set(seen_data.get(today_str, []))
    existing.update(urls)
    seen_data[today_str] = list(existing)

    # 清理过期记录
    cutoff = date.today() - timedelta(days=retention_days)
    seen_data = {
        k: v
        for k, v in seen_data.items()
        if k >= cutoff.isoformat()
    }

    _save(seen_data, seen_file)
    print(f"[INFO] 已记录 {len(urls)} 条 URL 到去重文件（{today_str}）")
