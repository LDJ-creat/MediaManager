"""
fetch_digest_config.py — 公共配置加载模块

供 fetch_rss.py、mark_seen.py、renderer.py 共用。
从 references/sources.json 加载 RSS 源列表、全局参数和板块定义。
"""

import json
import sys
from pathlib import Path


SKILL_ROOT = Path(__file__).parent.parent
SOURCES_FILE = SKILL_ROOT / "references" / "sources.json"

PARAM_TYPES: dict[str, type] = {
    "TOP_PICKS_COUNT": int,
    "MAX_PER_SOURCE": int,
    "GLOBAL_MAX": int,
    "TIME_WINDOW_HOURS": int,
    "DEDUP_RETENTION_DAYS": int,
    "BASE_THRESHOLD": float,
}

DEFAULT_CATEGORIES = [
    {"id": "AI前沿", "display_name": "AI 前沿", "icon": "🤖"},
    {"id": "开发与工程", "display_name": "开发与工程", "icon": "🛠️"},
    {"id": "大厂动态", "display_name": "大厂动态", "icon": "🏭"},
    {"id": "产品与行业", "display_name": "产品与行业", "icon": "📦"},
]


def _error(message: str) -> None:
    print(f"[ERROR] sources.json: {message}", file=sys.stderr)
    raise ValueError(message)


def _validate_sources(sources: object, category_ids: set[str]) -> list[dict]:
    if not isinstance(sources, list):
        _error('"sources" 必须是数组')
    if not sources:
        _error('"sources" 不能为空')

    validated: list[dict] = []
    for i, source in enumerate(sources):
        prefix = f"sources[{i}]"
        if not isinstance(source, dict):
            _error(f'{prefix} 必须是对象')

        name = source.get("name")
        url = source.get("url")
        if not isinstance(name, str) or not name.strip():
            _error(f'{prefix} 缺少必填字段 "name"')
        if not isinstance(url, str) or not url.strip():
            _error(f'{prefix} 缺少必填字段 "url"')

        source_hint = source.get("source_hint", "")
        if source_hint is None:
            source_hint = ""
        if not isinstance(source_hint, str):
            _error(f'{prefix} "source_hint" 必须是字符串')

        weight = source.get("weight", 1.0)
        if not isinstance(weight, (int, float)):
            _error(f'{prefix} "weight" 必须是数字')

        if category_ids and source_hint and source_hint not in category_ids:
            print(
                f'[WARN] {prefix} source_hint "{source_hint}" 不在 categories 定义中',
                file=sys.stderr,
            )

        validated.append(
            {
                "name": name.strip(),
                "url": url.strip(),
                "source_hint": source_hint,
                "weight": float(weight),
            }
        )

    return validated


def _validate_params(params: object) -> dict:
    if not isinstance(params, dict):
        _error('"params" 必须是对象')

    validated: dict = {}
    for key, expected_type in PARAM_TYPES.items():
        if key not in params:
            continue
        value = params[key]
        if expected_type is int and isinstance(value, bool):
            _error(f'params.{key} 必须是整数')
        if expected_type is int and not isinstance(value, int):
            _error(f'params.{key} 必须是整数')
        if expected_type is float and not isinstance(value, (int, float)):
            _error(f'params.{key} 必须是数字')
        validated[key] = expected_type(value)

    return validated


def _validate_categories(categories: object) -> list[dict]:
    if categories is None:
        return DEFAULT_CATEGORIES.copy()
    if not isinstance(categories, list):
        _error('"categories" 必须是数组')
    if not categories:
        _error('"categories" 不能为空')

    validated: list[dict] = []
    seen_ids: set[str] = set()
    for i, category in enumerate(categories):
        prefix = f"categories[{i}]"
        if not isinstance(category, dict):
            _error(f'{prefix} 必须是对象')

        cat_id = category.get("id")
        display_name = category.get("display_name")
        icon = category.get("icon")
        if not isinstance(cat_id, str) or not cat_id.strip():
            _error(f'{prefix} 缺少必填字段 "id"')
        if not isinstance(display_name, str) or not display_name.strip():
            _error(f'{prefix} 缺少必填字段 "display_name"')
        if not isinstance(icon, str) or not icon.strip():
            _error(f'{prefix} 缺少必填字段 "icon"')

        cat_id = cat_id.strip()
        if cat_id in seen_ids:
            _error(f'{prefix} id "{cat_id}" 重复')
        seen_ids.add(cat_id)

        validated.append(
            {
                "id": cat_id,
                "display_name": display_name.strip(),
                "icon": icon.strip(),
            }
        )

    return validated


def load_config() -> dict:
    """加载完整配置，含校验"""
    if not SOURCES_FILE.exists():
        _error(f"配置文件不存在: {SOURCES_FILE}")

    try:
        raw = json.loads(SOURCES_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        _error(f"JSON 格式错误: {exc}")

    if not isinstance(raw, dict):
        _error("根节点必须是 JSON 对象")

    categories = _validate_categories(raw.get("categories"))
    category_ids = {category["id"] for category in categories}
    sources = _validate_sources(raw.get("sources"), category_ids)
    params = _validate_params(raw.get("params", {}))

    return {
        "version": raw.get("version", 1),
        "sources": sources,
        "params": params,
        "categories": categories,
    }


def load_sources_config() -> tuple[list[dict], dict]:
    """加载 RSS 源列表和全局参数（兼容旧接口）"""
    config = load_config()
    return config["sources"], config["params"]
