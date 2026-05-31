#!/bin/bash

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_ROOT="$SOURCE_DIR/skills"

TARGET_DIRS=(
    "$HOME/.cursor/skills"
    "$HOME/.agents/skills"
    "$HOME/.claude/skills"
    "$HOME/.codex/skills"
    "$HOME/.gemini/skills"
    "$HOME/.copilot/skills"
    "$HOME/.gemini/antigravity/skills"
    "$HOME/.agent/skills"
)

EXCLUDES=(
    "node_modules"
    "output"
    "test-output"
    ".git"
    ".auth"
    "csdn-output"
    "xhs-output"
)

EXCLUDE_ARGS=()
for item in "${EXCLUDES[@]}"; do
    EXCLUDE_ARGS+=("--exclude=$item")
done

echo -e "\033[0;36m开始同步技能...\033[0m"

for target in "${TARGET_DIRS[@]}"; do
    mkdir -p "$target"

    if [ -d "$SKILLS_ROOT" ]; then
        for dir_path in "$SKILLS_ROOT"/*/; do
            [ -d "$dir_path" ] || continue
            dir_name=$(basename "$dir_path")
            if [ -f "${dir_path}SKILL.md" ]; then
                echo -e "  -> 同步 [\033[0;32m$dir_name\033[0m] 至 $target"
                rsync -a "${EXCLUDE_ARGS[@]}" "$dir_path" "$target/$dir_name/"
            fi
        done
    fi

    if [ -d "$SOURCE_DIR/guidance" ]; then
        echo -e "  -> 同步 [\033[0;32m guidance \033[0m] 至 $target"
        rsync -a "${EXCLUDE_ARGS[@]}" "$SOURCE_DIR/guidance/" "$target/guidance/"
    fi
done

echo -e "\033[0;36m所有技能同步完成！\033[0m"
