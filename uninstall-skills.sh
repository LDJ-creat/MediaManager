#!/usr/bin/env bash
set -euo pipefail

usage(){
  cat <<EOF
用法：
  ./uninstall-skills.sh          # 交互确认后执行
  ./uninstall-skills.sh -f       # 直接执行，无需交互
  ./uninstall-skills.sh --whatif # 模拟（不删除）
  ./uninstall-skills.sh -h       # 显示帮助
EOF
}

force=false
whatif=false

while [ $# -gt 0 ]; do
  case "$1" in
    -f|--force) force=true; shift ;;
    --whatif|-n|--dry-run) whatif=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "未知参数: $1" >&2; usage; exit 2 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TARGET_DIRS=(
  "$HOME/.claude/skills"
  "$HOME/.gemini/skills"
  "$HOME/.copilot/skills"
  "$HOME/.gemini/antigravity/skills"
  "$HOME/.agent/skills"
)

# 与 PowerShell 脚本保持一致的排除项（仅用于源目录过滤，非删除时使用）
EXCLUDE_DIRS=("node_modules" "output" "test-output" "test-output-archive" "test-output-live-v2" ".git" ".auth" "csdn-output")
EXCLUDE_FILES=(".gitignore" "*.html" "sync-skills.ps1")

# 收集源目录中被视为技能的目录名（含 guidance）
mapfile -t dirs < <(find "$SCRIPT_DIR" -maxdepth 1 -mindepth 1 -type d -printf '%f\n' | sort)
skill_dirs=()
for d in "${dirs[@]}"; do
  if [ -f "$SCRIPT_DIR/$d/SKILL.md" ] || [ "$d" = "guidance" ]; then
    skill_dirs+=("$d")
  fi
done

if [ ${#skill_dirs[@]} -eq 0 ]; then
  echo "未在源目录中发现任何技能目录，退出。"
  exit 0
fi

echo "检测到以下技能（将尝试从目标目录中移除）："
for s in "${skill_dirs[@]}"; do
  echo "  - $s"
done

if [ "$force" != true ]; then
  read -r -p "确认要从所有目标路径中删除这些技能目录吗？输入 Y 确认: " ans
  if [ "$ans" != "Y" ] && [ "$ans" != "y" ]; then
    echo "已取消操作。"
    exit 0
  fi
fi

for target in "${TARGET_DIRS[@]}"; do
  if [ ! -d "$target" ]; then
    echo "目标路径不存在，跳过: $target"
    continue
  fi

  for s in "${skill_dirs[@]}"; do
    dest="$target/$s"
    if [ -e "$dest" ]; then
      if [ "$whatif" = true ]; then
        echo "(WhatIf) 将移除: $dest"
      else
        echo "移除: $dest"
        if rm -rf -- "$dest"; then
          echo "已移除: $dest"
        else
          echo "删除失败: $dest" >&2
        fi
      fi
    else
      echo "未找到: $dest"
    fi
  done
done

echo "卸载操作完成。"
