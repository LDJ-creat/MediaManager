"""
fetcher.py — RSS 抓取与预处理模块

抓取所有RSS源，过滤时间窗口，标准化文章条目。
"""

import asyncio
import hashlib
import re
from datetime import datetime, timezone, timedelta
from typing import Any

import aiohttp
import feedparser
from dateutil import parser as dateparser


def _parse_pub_date(entry: Any) -> datetime | None:
    """解析RSS条目的发布时间，返回 UTC datetime 或 None"""
    for attr in ("published", "updated", "created"):
        raw = getattr(entry, attr, None)
        if raw:
            try:
                dt = dateparser.parse(raw)
                if dt and dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc)
            except Exception:
                continue
    return None


def _truncate_summary(text: str, max_chars: int = 300) -> str:
    """截取纯文本摘要，去除HTML标签，限制长度"""
    # 去除HTML标签
    clean = re.sub(r"<[^>]+>", "", text or "")
    # 折叠空白
    clean = re.sub(r"\s+", " ", clean).strip()
    if len(clean) > max_chars:
        clean = clean[:max_chars] + "…"
    return clean


def _make_id(url: str) -> str:
    """基于URL生成8位唯一ID"""
    return hashlib.sha256(url.encode()).hexdigest()[:8]


async def _fetch_one(
    session: aiohttp.ClientSession,
    source: dict,
    time_window_hours: int,
    max_per_source: int,
) -> list[dict]:
    """抓取单个RSS源，返回标准化条目列表"""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=time_window_hours)
    results = []

    try:
        async with session.get(
            source["url"], timeout=aiohttp.ClientTimeout(total=15)
        ) as resp:
            if resp.status != 200:
                print(f"[WARN] {source['name']} 返回 HTTP {resp.status}")
                return []
            content = await resp.read()
    except Exception as e:
        print(f"[WARN] {source['name']} 抓取失败: {e}")
        return []

    feed = feedparser.parse(content)
    seen_urls: set[str] = set()  # 源内URL去重

    for entry in feed.entries:
        url = getattr(entry, "link", "") or getattr(entry, "id", "")
        if not url or url in seen_urls:
            continue

        pub_dt = _parse_pub_date(entry)
        if pub_dt and pub_dt < cutoff:
            continue  # 超出时间窗口

        summary_raw = (
            getattr(entry, "summary", "")
            or getattr(entry, "description", "")
            or getattr(entry, "content", [{}])[0].get("value", "")
        )
        summary = _truncate_summary(summary_raw)

        results.append(
            {
                "id": _make_id(url),
                "title": getattr(entry, "title", "").strip(),
                "summary": summary,
                "url": url,
                "pub_date": pub_dt.isoformat() if pub_dt else "",
                "source": source["name"],
                "source_hint": source.get("source_hint", ""),
                "source_weight": source.get("weight", 1.0),
            }
        )
        seen_urls.add(url)

        if len(results) >= max_per_source:
            break

    print(f"[INFO] {source['name']}: 获取 {len(results)} 条")
    return results


async def fetch_all(
    sources: list[dict],
    time_window_hours: int = 48,
    max_per_source: int = 5,
    global_max: int = 40,
) -> list[dict]:
    """并发抓取所有RSS源，合并去重后返回"""
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; NewsSkillBot/1.0; +https://github.com)"
    }
    async with aiohttp.ClientSession(headers=headers) as session:
        tasks = [
            _fetch_one(session, src, time_window_hours, max_per_source)
            for src in sources
        ]
        all_results = await asyncio.gather(*tasks)

    # 展平并全局URL去重
    seen_global: set[str] = set()
    merged: list[dict] = []
    for items in all_results:
        for item in items:
            if item["url"] not in seen_global:
                merged.append(item)
                seen_global.add(item["url"])

    # 按发布时间降序，取全局上限
    merged.sort(key=lambda x: x.get("pub_date", ""), reverse=True)
    merged = merged[:global_max]

    print(f"[INFO] 合计获取 {len(merged)} 条（全局去重后）")
    return merged
