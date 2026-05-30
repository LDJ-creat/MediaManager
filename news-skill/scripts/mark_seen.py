"""
mark_seen.py — 去重记录工具

读取 data/selected_urls.json（由 LLM 写入，包含本次纳入日报的文章 URL），
追加到 data/seen_urls.json，并自动清理 7 天前的旧记录。

用法：
    python scripts/mark_seen.py
    python scripts/mark_seen.py --date 2026-03-13   # 指定日期（默认今天）
    python scripts/mark_seen.py --status             # 查看去重记录摘要

data/selected_urls.json 格式（由 LLM 在生成日报后写入）：
    ["https://url1...", "https://url2...", ...]
"""

import argparse
import json
import sys
from datetime import date
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
SKILL_ROOT = SCRIPTS_DIR.parent
sys.path.insert(0, str(SCRIPTS_DIR))

import dedup
from fetch_digest_config import load_sources_config

DATA_DIR = SKILL_ROOT / "data"
SEEN_URLS_FILE = str(DATA_DIR / "seen_urls.json")
SELECTED_URLS_FILE = str(DATA_DIR / "selected_urls.json")


def show_status():
    """打印去重记录摘要"""
    try:
        with open(SEEN_URLS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        print("尚无去重记录（seen_urls.json 不存在或为空）")
        return

    print(f"去重记录共 {len(data)} 天：")
    for day, urls in sorted(data.items(), reverse=True):
        print(f"  {day}: {len(urls)} 条 URL")


def main():
    parser = argparse.ArgumentParser(description="更新跨天去重记录")
    parser.add_argument("--date", type=str, default=None, help="指定日期 YYYY-MM-DD（默认今天）")
    parser.add_argument("--status", action="store_true", help="查看去重记录摘要")
    args = parser.parse_args()

    if args.status:
        show_status()
        return

    # 读取 LLM 写入的已选 URL
    try:
        with open(SELECTED_URLS_FILE, "r", encoding="utf-8") as f:
            urls = json.load(f)
    except FileNotFoundError:
        print(f"[ERROR] 未找到 {SELECTED_URLS_FILE}", file=sys.stderr)
        print("请确保 LLM 已将本次纳入日报的文章 URL 写入此文件（JSON 数组格式）", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"[ERROR] {SELECTED_URLS_FILE} 格式错误: {e}", file=sys.stderr)
        sys.exit(1)

    if not isinstance(urls, list):
        print(f"[ERROR] selected_urls.json 必须是 JSON 数组", file=sys.stderr)
        sys.exit(1)

    # 加载 retention_days 配置
    _, params = load_sources_config()
    retention_days = int(params.get("DEDUP_RETENTION_DAYS", 7))

    today = args.date or date.today().isoformat()
    dedup.mark_as_seen(urls, SEEN_URLS_FILE, retention_days, today)

    print(f"✅ 已记录 {len(urls)} 条 URL（{today}），自动清理 {retention_days} 天前的旧记录")


if __name__ == "__main__":
    main()
