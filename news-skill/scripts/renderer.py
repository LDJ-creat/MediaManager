"""
renderer.py — Markdown 日报渲染模块

将筛选后的文章列表渲染为结构化的 Markdown 日报，
包含今日精选置顶 + 各板块分类展示。
"""

import os
from datetime import date


# 板块显示配置：板块ID → (显示名, 图标)
CATEGORY_DISPLAY = {
    "AI前沿":    ("AI 前沿",    "🤖"),
    "开发与工程": ("开发与工程",  "🛠️"),
    "大厂动态":  ("大厂动态",   "🏭"),
    "产品与行业": ("产品与行业",  "📦"),
}

# 板块显示顺序
CATEGORY_ORDER = ["AI前沿", "开发与工程", "大厂动态", "产品与行业"]


def _format_article(item: dict, index: int | None = None) -> str:
    """渲染单篇文章为 Markdown 块"""
    title = item.get("chinese_title") or item.get("title", "（无标题）")
    source = item.get("source", "")
    score = item.get("score", 0)
    summary = item.get("summary_zh") or item.get("summary", "")
    url = item.get("url", "#")

    prefix = f"### {index}. " if index is not None else "### "

    lines = [
        f"{prefix}{title}",
        f"**来源**：{source} ｜ **评分**：{score:.1f}",
        "",
        summary,
        "",
        f"🔗 [阅读原文]({url})",
    ]
    return "\n".join(lines)


def render(
    items: list[dict],
    threshold: float,
    top_picks_count: int = 3,
    report_date: str | None = None,
) -> str:
    """
    渲染完整 Markdown 日报。

    Args:
        items: 已经过 LLM 精读摘要的文章列表
        threshold: 本次使用的评分阈值
        top_picks_count: 今日精选数量
        report_date: 日报日期字符串（YYYY-MM-DD），默认今天

    Returns:
        完整的 Markdown 字符串
    """
    today = report_date or date.today().isoformat()
    total = len(items)

    # 按评分降序排序
    sorted_items = sorted(items, key=lambda x: x.get("score", 0), reverse=True)

    # ── 头部 ──────────────────────────────────────────────
    lines = [
        f"# 📰 每日科技资讯 · {today}",
        "",
        f"> 📊 **今日概览**：筛选通过 **{total}** 条 ｜ 评分阈值 **{threshold:.1f}** 分",
        "",
        "---",
        "",
    ]

    # ── 今日精选 ──────────────────────────────────────────
    top_picks = sorted_items[:top_picks_count]
    lines += [
        "## 💎 今日精选",
        "",
        "> 综合评分最高，强烈推荐阅读",
        "",
    ]
    for i, item in enumerate(top_picks, 1):
        lines.append(_format_article(item, index=i))
        lines.append("")

    lines += ["---", ""]

    # ── 各板块 ────────────────────────────────────────────
    # 按板块分组
    by_category: dict[str, list[dict]] = {cat: [] for cat in CATEGORY_ORDER}
    for item in items:
        cat = item.get("category", "产品与行业")
        # 容错：未知分类归入最近的有效分类
        if cat not in by_category:
            cat = "产品与行业"
        by_category[cat].append(item)

    for cat_id in CATEGORY_ORDER:
        cat_items = by_category.get(cat_id, [])
        if not cat_items:
            continue  # 跳过空板块
        display_name, icon = CATEGORY_DISPLAY[cat_id]
        lines += [f"## {icon} {display_name}", ""]

        # 板块内按评分降序
        cat_items.sort(key=lambda x: x.get("score", 0), reverse=True)
        for item in cat_items:
            lines.append(_format_article(item))
            lines.append("")

    # ── 尾部 ──────────────────────────────────────────────
    lines += [
        "---",
        "",
        f"*由 news-skill 自动生成 · {today}*",
    ]

    return "\n".join(lines)


def save(markdown: str, output_dir: str, report_date: str | None = None) -> str:
    """
    将 Markdown 日报写入文件。

    Returns:
        写入的文件绝对路径
    """
    today = report_date or date.today().isoformat()
    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, f"{today}.md")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(markdown)

    print(f"[INFO] 日报已写入：{filepath}")
    return filepath
