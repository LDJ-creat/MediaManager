"""
fetch_digest_config.py — 公共配置加载模块

供 fetch_rss.py 和 mark_seen.py 共用。
从 references/sources.md 解析 RSS 源列表和全局参数。
"""

from pathlib import Path


SKILL_ROOT = Path(__file__).parent.parent
SOURCES_FILE = SKILL_ROOT / "references" / "sources.md"


def load_sources_config() -> tuple[list[dict], dict]:
    """从 references/sources.md 解析 RSS 源列表和全局参数"""
    text = SOURCES_FILE.read_text(encoding="utf-8")

    sources = []
    in_sources_table = False
    in_params_table = False
    params = {}

    for line in text.splitlines():
        line = line.strip()

        # 检测表格起始
        if "| 名称 |" in line:
            in_sources_table = True
            in_params_table = False
            continue
        if "| 参数 |" in line:
            in_params_table = True
            in_sources_table = False
            continue

        # 跳过分隔行
        if "----" in line:
            continue

        # 解析 RSS 源表格
        if in_sources_table and line.startswith("|"):
            parts = [p.strip() for p in line.split("|")[1:-1]]
            if len(parts) >= 4:
                try:
                    sources.append({
                        "name": parts[0],
                        "url": parts[1],
                        "source_hint": parts[2],
                        "weight": float(parts[3]),
                    })
                except ValueError:
                    pass
            elif not line.startswith("|"):
                in_sources_table = False

        # 解析全局参数表格
        elif in_params_table and line.startswith("|"):
            parts = [p.strip() for p in line.split("|")[1:-1]]
            if len(parts) >= 2:
                key, val = parts[0], parts[1]
                try:
                    params[key] = float(val) if "." in val else int(val)
                except ValueError:
                    pass
            elif not line.startswith("|"):
                in_params_table = False

    return sources, params
