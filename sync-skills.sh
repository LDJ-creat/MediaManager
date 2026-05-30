#!/bin/bash

# 获取脚本所在目录 (等同于 $PSScriptRoot)
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 定义目标目录
TARGET_DIRS=(
    "$HOME/.claude/skills"
    "$HOME/.gemini/skills"
    "$HOME/.copilot/skills"
    "$HOME/.gemini/antigravity/skills"
    "$HOME/.agent/skills"
)

# 定义排除项
EXCLUDES=(
    "node_modules"
    "output"
    "test-output"
    "test-output-archive"
    "test-output-live-v2"
    ".git"
    ".auth"
    "csdn-output"
    ".gitignore"
    "*.html"
    "sync-skills.ps1"
    "sync-skills.sh"
)

# 构建 rsync 排除参数
EXCLUDE_ARGS=()
for item in "${EXCLUDES[@]}"; do
    EXCLUDE_ARGS+=("--exclude=$item")
done

echo -e "\033[0;36m开始同步技能...\033[0m"

# 遍历目标目录
for target in "${TARGET_DIRS[@]}"; do
    # 创建目标目录（如果不存在）
    mkdir -p "$target"

    # 遍历源目录下的文件夹
    for dir_path in "$SOURCE_DIR"/*/; do
        [ -d "$dir_path" ] || continue
        dir_name=$(basename "$dir_path")

        # 检查是否包含 SKILL.md 或者名称为 guidance
        if [ -f "${dir_path}SKILL.md" ] || [ "$dir_name" == "guidance" ]; then
            echo -e "  -> 同步 [\033[0;32m$dir_name\033[0m] 至 $target"
            
            # 使用 rsync 进行同步
            # -a: 归档模式 (包含递归、保留权限等)
            rsync -a "${EXCLUDE_ARGS[@]}" "$dir_path" "$target/$dir_name/"
        fi
    done
done

echo -e "\033[0;36m所有技能同步完成！\033[0m"
