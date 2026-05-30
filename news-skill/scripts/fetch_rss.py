"""
fetch_rss.py — RSS 数据抓取工具

输出：将文章列表以 JSON 格式打印到 stdout，同时保存到 data/latest_articles.json
用法：
    python scripts/fetch_rss.py               # 默认 48h 时间窗口
    python scripts/fetch_rss.py --hours 24    # 自定义时间窗口
    python scripts/fetch_rss.py --preview     # 仅显示条目数，不输出完整 JSON
    python scripts/fetch_rss.py --skip-dedup  # 跳过跨天去重（调试用）

此脚本不调用任何 LLM，只负责数据抓取和预处理。
分析、筛选、评分、翻译由调用此 Skill 的 LLM 完成。
"""

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
SKILL_ROOT = SCRIPTS_DIR.parent
sys.path.insert(0, str(SCRIPTS_DIR))

import fetcher
import dedup
from fetch_digest_config import load_sources_config

DATA_DIR = SKILL_ROOT / "data"
SEEN_URLS_FILE = str(DATA_DIR / "seen_urls.json")
LATEST_ARTICLES_FILE = str(DATA_DIR / "latest_articles.json")


def main():
    parser = argparse.ArgumentParser(
        description="抓取 RSS 文章并输出 JSON（供 LLM 分析使用）"
    )
    parser.add_argument("--hours", type=int, default=None, help="时间窗口（小时），默认读取 sources.md 配置")
    parser.add_argument("--preview", action="store_true", help="仅显示条目数摘要，不输出完整 JSON")
    parser.add_argument("--skip-dedup", action="store_true", help="跳过跨天去重")
    args = parser.parse_args()

    # 加载配置
    sources, params = load_sources_config()
    time_window = args.hours or int(params.get("TIME_WINDOW_HOURS", 48))
    max_per_source = int(params.get("MAX_PER_SOURCE", 5))
    global_max = int(params.get("GLOBAL_MAX", 40))

    print(f"[INFO] 加载 {len(sources)} 个 RSS 源，时间窗口 {time_window}h", file=sys.stderr)

    # 抓取文章
    items = asyncio.run(
        fetcher.fetch_all(sources, time_window, max_per_source, global_max)
    )

    # 跨天去重
    if not args.skip_dedup:
        items = dedup.filter_seen(items, SEEN_URLS_FILE)

    if args.preview:
        print(f"\n📊 预览结果：共 {len(items)} 条文章（去重后）", file=sys.stderr)
        for i, item in enumerate(items, 1):
            print(f"  {i:2d}. [{item['source']}] {item['title'][:65]}", file=sys.stderr)
        return

    # 保存到文件
    os.makedirs(str(DATA_DIR), exist_ok=True)
    with open(LATEST_ARTICLES_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    print(f"[INFO] {len(items)} 条文章已保存到 {LATEST_ARTICLES_FILE}", file=sys.stderr)
    print(f"[INFO] 正在输出 JSON...", file=sys.stderr)

    # 输出 JSON 到 stdout（供 LLM 读取）
    print(json.dumps(items, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
