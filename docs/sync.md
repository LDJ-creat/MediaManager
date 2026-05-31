# Skill 与工作流同步

MediaManager 在 monorepo 内维护两类「源文件」，并通过脚本同步到 CLI 发布包与各 Agent 入口目录。**只改源文件，再跑同步命令**；不要手改镜像目录，否则会在下次构建时被覆盖。

## 总览

| 类型 | Canonical 源 | 同步脚本 | 何时触发 |
|------|--------------|----------|----------|
| **Skills** | `skills/` | `packages/runtime/scripts/copy-skills.mjs` | `npm run build`（runtime 构建阶段） |
| **Skills → 本机 Agent** | `skills/` | `sync-skills.ps1` / `sync-skills.sh` | 手动；monorepo 内 `media skill install` 成功后自动调用 |
| **Workflows / Commands** | `skills/media-manager/references/workflows/` | `scripts/sync-workflows.mjs` | `npm run build`；或 `npm run sync:workflows` |

```text
skills/                          ← Skill 唯一入仓源
├── media-manager/
│   └── references/workflows/    ← Workflow 唯一入仓源
│       ├── *.md
│       └── _sync.manifest.json

        │ copy-skills.mjs                │ sync-workflows.mjs
        ▼                                ▼
packages/runtime/skills/          .agents/workflows/
（npm 包内置 bundle）              .cursor/commands/
                                   .claude/commands/
                                   .github/instructions/

        │ sync-skills.ps1|.sh
        ▼
~/.cursor/skills/  ~/.claude/skills/  ~/.agents/skills/  …
```

---

## Skill 同步

### 策略

1. **入仓源**：repo 根目录 `skills/`。每个子目录含 `SKILL.md` 即为一个 Skill。
2. **CLI 发布包**：构建 `@dsmlll/media-manager-runtime` 时，`copy-skills.mjs` 将 `skills/` 复制到 `packages/runtime/skills/`，随 npm 包发布。Mode B 用户安装的 CLI 读取该 bundle。
3. **Mode A 本地开发**：`getBundledSkillsDir()` 在 monorepo 内**优先读 repo 根 `skills/`**，不依赖 `packages/runtime/skills/` 是否最新；但**发布 npm 前**必须 `npm run build`，否则 global 安装用户会拿到旧 bundle。
4. **本机 Agent Skills 目录**：与 CLI bundle 独立；通过 `sync-skills` 或 `media skill install` 同步到用户主目录下的 Agent skills 路径。

### 复制规则（`copy-skills.mjs`）

- 递归复制 `skills/` → `packages/runtime/skills/`
- **跳过目录**：`node_modules`、`.auth`、`.chrome-cdp-profile`、`data`、`output`、各类 `*-output` / `test-output*` 等运行时产物

### 本机 Agent 同步（`sync-skills.ps1` / `sync-skills.sh`）

将 repo `skills/` 下每个含 `SKILL.md` 的子目录，同步到：

- `~/.cursor/skills`
- `~/.agents/skills`
- `~/.claude/skills`
- `~/.codex/skills`
- `~/.gemini/skills`
- `~/.copilot/skills`
- `~/.gemini/antigravity/skills`

另将 `skills/media-manager/references/guidance/` 同步为各 Agent 目录下的 `guidance/`（模板副本，非工作区 personalization）。

在 monorepo 根目录执行：

```powershell
# Windows
.\sync-skills.ps1
```

```bash
# macOS / Linux
./sync-skills.sh
```

在 monorepo 内运行 `media skill install` 且安装成功后，CLI 会自动检测并执行上述脚本（见 `packages/cli/src/skills.ts`）。

Mode B 用户也可通过 `npx skills add LDJ-creat/MediaManager --skill * -g`（即 `media skill install`）从 GitHub 拉取 Skills，不依赖本地 `sync-skills`。

Skill 与工作流同步策略见 [docs/sync.md](sync.md)。

### Skill 维护清单

1. 修改 `skills/{skill-name}/` 下的源文件
2. 若需验证 npm 包内容：`npm run build -w @dsmlll/media-manager-runtime`（或完整 `npm run build`）
3. 若需更新本机 Cursor/Claude 等 Agent： `./sync-skills.ps1` 或 `media skill install`
4. 提交 PR 时只提交 `skills/` 变更；`packages/runtime/skills/` 由 CI/本地 build 生成，通常随 release 流程更新

---

## Workflow / Command 同步

### 策略

1. **Canonical 源**：`skills/media-manager/references/workflows/*.md`（不含 `_` 前缀文件）
2. **镜像目标**（构建时自动生成，勿手改）：

| 目录 | 文件名 | 格式 |
|------|--------|------|
| `.agents/workflows/` | `{id}.md` | 正文（路径已改写） |
| `.cursor/commands/` | `{id}.md` | YAML `description` + 正文 |
| `.claude/commands/` | `{id}.md` | 同上 |
| `.github/instructions/` | `{id}.instructions.md` | 同上 |

3. **Manifest**：`skills/media-manager/references/workflows/_sync.manifest.json` 为每个 workflow 提供 Agent 命令/frontmatter 用的 `description`。新增工作流时必须在此登记，否则 `sync-workflows.mjs` 会跳过并告警。

当前工作流 ID：

- `daily-digest`
- `write-and-publish`
- `publish-only`
- `analyze-operation`

### 路径改写

镜像目录位于 repo 根下两层，脚本会将 canonical 正文中的相对路径改写为可点击的 repo 路径，例如：

- `](../platform-families.md)` → `](../../skills/media-manager/references/platform-families.md)`
- `` `skills/...` `` → `` `../../skills/...` ``
- 工作流之间的链接如 `[publish-only](publish-only.md)` 在镜像目录内保持不变（同目录多文件）

### 命令

```bash
# 仅同步 workflow 镜像
npm run sync:workflows

# 完整构建（含 runtime skills 复制 + workflow 镜像 + CLI 编译）
npm run build
```

脚本路径：`scripts/sync-workflows.mjs`。

### Workflow 维护清单

1. 只编辑 `skills/media-manager/references/workflows/{id}.md`
2. 新工作流：新增 `{id}.md` 并在 `_sync.manifest.json` 的 `workflows` 数组中添加 `{ "id", "description" }`
3. 运行 `npm run sync:workflows` 或 `npm run build`
4. 将生成的 `.agents/`、`.cursor/commands/`、`.claude/commands/`、`.github/instructions/` 变更一并提交

**不要**直接编辑镜像文件；下次 `npm run build` 会覆盖。

---

## `npm run build` 顺序

根目录 `package.json` 中 build 依次执行：

1. `@dsmlll/media-manager-core` — TypeScript 编译
2. `@dsmlll/media-manager-platform-common` — TypeScript 编译
3. `@dsmlll/media-manager-runtime` — TypeScript 编译 + **`copy-skills.mjs`**
4. **`scripts/sync-workflows.mjs`** — workflow/command 镜像
5. `@dsmlll/media-manager-cli` — TypeScript 编译

因此一次 `npm run build` 会同时刷新 **runtime Skill bundle** 与 **Agent workflow/command 镜像**。

---

## 与其他目录的关系

| 路径 | 是否自动同步 | 说明 |
|------|--------------|------|
| `guidance/`（repo 根，gitignore） | 否 | 工作区个性化指南；`media setup` 从模板 seed |
| `skills/media-manager/references/guidance/` | 部分 | Skill 模板源；经 `sync-skills` 复制到 Agent 目录；经 `guidance-seed` 复制到工作区 |
| `packages/cli/`、`packages/core/` | 不适用 | TypeScript 源码，非 Skill/Workflow 镜像 |
| `.agents/workflows/` 等 | 是 | 由 `sync-workflows.mjs` 生成 |

---

## 常见问题

**Q：改了 `skills/` 但 global CLI 行为没变？**  
A：Mode A 开发时 CLI 应直接读 repo `skills/`。若测试的是已发布的 global 包，需重新 `npm run build` 并发布/重装 CLI，或在本 monorepo 内用 `npm run media`。

**Q：改了 workflow 但 Cursor 命令没更新？**  
A：运行 `npm run sync:workflows` 并确认改的是 `skills/media-manager/references/workflows/`，不是 `.cursor/commands/`。

**Q：`sync-skills` 和 `copy-skills` 有什么区别？**  
A：`copy-skills` 面向 **npm 包内置 bundle**；`sync-skills` 面向 **开发者本机 Agent 目录**。二者源都是 repo `skills/`，目标不同。

**Q：能否只同步某一个 Skill 或某一个 Workflow？**  
A：当前脚本为全量同步。单 Skill 可手动 robocopy/rsync 对应子目录；Workflow 暂无单项开关，可临时只保留 manifest 中需要的条目（不推荐）。

---

相关文档：[install.md](install.md) · [workspace.md](workspace.md) · [cli-contract.md](cli-contract.md)
