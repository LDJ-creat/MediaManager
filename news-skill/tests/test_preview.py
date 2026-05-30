"""
test_preview.py — 验证脚本：测试RSS抓取和配置解析
"""
import sys
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from fetch_digest import load_sources_config, load_prompts
import fetcher

def test_config():
    print("=== 测试配置加载 ===")
    sources, params = load_sources_config()
    print(f"RSS源数量: {len(sources)}")
    for s in sources:
        print(f"  [{s['name']}] hint={s['source_hint']} weight={s['weight']}")
    print(f"\n全局参数: {params}")

def test_prompts():
    print("\n=== 测试Prompt加载 ===")
    coarse, summary = load_prompts()
    print(f"粗筛Prompt长度: {len(coarse)} 字符")
    print(f"摘要Prompt长度: {len(summary)} 字符")
    print("粗筛Prompt前120字:", coarse[:120])

async def test_fetch():
    print("\n=== 测试RSS抓取（2个源）===")
    sources = [
        {"name": "GitHub", "url": "https://github.blog/feed/", "source_hint": "开发与工程", "weight": 1.1},
        {"name": "Karpathy", "url": "https://api.xgo.ing/rss/user/edf707b5c0b248579085f66d7a3c5524", "source_hint": "AI前沿", "weight": 1.2},
    ]
    items = await fetcher.fetch_all(sources, 48, 5, 20)
    print(f"获取条目数: {len(items)}")
    for item in items[:3]:
        print(f"  [{item['source']}] {item['title'][:60]}")
        print(f"    url[:70]: {item['url'][:70]}")
        print(f"    summary[:80]: {item['summary'][:80]}")

if __name__ == "__main__":
    test_config()
    test_prompts()
    asyncio.run(test_fetch())
    print("\n所有验证通过！")
