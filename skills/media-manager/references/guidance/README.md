# Guidance 模板（Canonical）

**本目录是唯一入仓的 guidance 模板源**，随 `@dsmlll/media-manager-runtime` 打包。

| 用途 | 路径 |
|------|------|
| 修改默认模板（提 PR） | **本目录** `skills/media-manager/references/guidance/` |
| 日常写作个性化指南 | 工作区 `$WORKSPACE/guidance/`（Mode A 在 repo 根 `guidance/`，**已 gitignore**） |

`media setup` / `ensureWorkspaceLayout` 会将**缺失**的模板文件复制到工作区 `guidance/`，**不会覆盖**你已有的修改或新增文件（如场景 SOP、复盘沉淀）。

## 三层生命周期

| 层级 | 路径（工作区内） | 何时加载 |
|------|------------------|----------|
| 写作期 | `writing/`、`topic-selection/` | `article-writer` |
| 发布期 | `publishing/platform/` | 发布前 |
| 复盘归档 | `analytics/platform/` | 复盘归档 |

## 内容族

| 内容族 | 写作期加载 |
|--------|------------|
| longform（微信/CSDN/掘金） | `general.md` + `longform.md` |
| xhs（小红书） | `general.md` + `platform/xiaohongshu.md` |

详见 [`platform-families.md`](../platform-families.md)。

## 个性化指南

可在工作区 `guidance/writing/` 下**自由新增**文件（如 `podcast_interview_sop.md`）。`article-writer` 在匹配场景时会额外加载；这些文件仅存在于工作区，不会进入 git。
