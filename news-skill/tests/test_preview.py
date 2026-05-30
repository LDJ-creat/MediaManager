"""
test_preview.py — 验证脚本：测试 RSS 抓取和配置解析
"""
import asyncio
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

import fetch_digest_config
import fetcher
from fetch_digest_config import load_config, load_sources_config


def test_load_config():
    print("=== 测试配置加载 ===")
    config = load_config()
    sources, params = load_sources_config()

    assert len(sources) == 11, f"期望 11 个 RSS 源，实际 {len(sources)}"
    assert len(config["categories"]) == 4, "期望 4 个板块定义"

    expected_params = {
        "TOP_PICKS_COUNT",
        "MAX_PER_SOURCE",
        "GLOBAL_MAX",
        "TIME_WINDOW_HOURS",
        "DEDUP_RETENTION_DAYS",
        "BASE_THRESHOLD",
    }
    assert expected_params.issubset(params.keys()), f"缺少参数: {expected_params - params.keys()}"

    print(f"RSS源数量: {len(sources)}")
    for source in sources:
        print(f"  [{source['name']}] hint={source['source_hint']} weight={source['weight']}")
    print(f"\n全局参数: {params}")
    print(f"板块数量: {len(config['categories'])}")


def test_invalid_config():
    print("\n=== 测试无效配置校验 ===")
    original_file = fetch_digest_config.SOURCES_FILE
    backup = original_file.read_text(encoding="utf-8")

    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            suffix=".json",
            delete=False,
        ) as tmp:
            json.dump({"sources": [{"name": "Bad"}]}, tmp)
            tmp_path = Path(tmp.name)

        fetch_digest_config.SOURCES_FILE = tmp_path
        try:
            load_config()
            raise AssertionError("无效配置应抛出 ValueError")
        except ValueError as exc:
            assert "url" in str(exc).lower() or "缺少" in str(exc)
            print(f"校验通过，捕获错误: {exc}")
    finally:
        fetch_digest_config.SOURCES_FILE = original_file
        if "tmp_path" in locals():
            tmp_path.unlink(missing_ok=True)


async def test_fetch():
    print("\n=== 测试RSS抓取（2个源）===")
    sources = [
        {"name": "GitHub", "url": "https://github.blog/feed/", "source_hint": "开发与工程", "weight": 1.1},
        {
            "name": "Karpathy",
            "url": "https://api.xgo.ing/rss/user/edf707b5c0b248579085f66d7a3c5524",
            "source_hint": "AI前沿",
            "weight": 1.2,
        },
    ]
    items = await fetcher.fetch_all(sources, 48, 5, 20)
    print(f"获取条目数: {len(items)}")
    for item in items[:3]:
        print(f"  [{item['source']}] {item['title'][:60]}")
        print(f"    url[:70]: {item['url'][:70]}")
        print(f"    summary[:80]: {item['summary'][:80]}")


if __name__ == "__main__":
    test_load_config()
    test_invalid_config()
    asyncio.run(test_fetch())
    print("\n所有验证通过！")
