<#
卸载脚本：uninstall-skills.ps1
说明：删除由 sync-skills.ps1 安装到目标目录的技能目录。
用法示例：
  .\uninstall-skills.ps1            # 交互确认后执行
  .\uninstall-skills.ps1 -Force    # 直接执行，无需交互
  .\uninstall-skills.ps1 -WhatIf   # 仅显示将要删除的目录（模拟）
#>

[CmdletBinding()]
param(
    [switch]$Force,
    [switch]$WhatIf
)

$sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetDirs = @(
    "$HOME\\.claude\\skills",
    "$HOME\\.gemini\\skills",
    "$HOME\\.copilot\\skills",
    "$HOME\\.gemini\\antigravity\\skills",
    "$HOME\\.agent\\skills"
)

# 与 sync-skills.ps1 保持一致的排除项（仅用于列举来源时的过滤）
$excludeDirs = @("node_modules", "output", "test-output", "test-output-archive", "test-output-live-v2", ".git", ".auth", "csdn-output")
$excludeFiles = @(".gitignore", "*.html", "sync-skills.ps1")

# 获取当前工作区中被视为 "技能" 的目录名称（含 guidance）
$skillDirs = Get-ChildItem -Path $sourceDir -Directory | Where-Object {
    (Test-Path (Join-Path $_.FullName "SKILL.md")) -or ($_.Name -eq "guidance")
} | Select-Object -ExpandProperty Name

if (-not $skillDirs) {
    Write-Host "未在源目录中发现任何技能目录，退出。" -ForegroundColor Yellow
    exit 0
}

Write-Host "检测到以下技能（将尝试从目标目录中移除）：" -ForegroundColor Cyan
$skillDirs | ForEach-Object { Write-Host "  - $_" }

if (-not $Force) {
    $confirm = Read-Host "确认要从所有目标路径中删除这些技能目录吗？输入 Y 确认"
    if ($confirm -ne 'Y' -and $confirm -ne 'y') {
        Write-Host "已取消操作。" -ForegroundColor Yellow
        exit 0
    }
}

foreach ($target in $targetDirs) {
    if (-not (Test-Path $target)) {
        Write-Host "目标路径不存在，跳过: $target" -ForegroundColor DarkGray
        continue
    }

    foreach ($skill in $skillDirs) {
        $destPath = Join-Path $target $skill
        if (Test-Path $destPath) {
            if ($WhatIf) {
                Write-Host "(WhatIf) 将移除: $destPath" -ForegroundColor Yellow
            }
            else {
                Write-Host "移除: $destPath" -ForegroundColor Green
                try {
                    Remove-Item -LiteralPath $destPath -Recurse -Force -ErrorAction Stop -WhatIf:$false
                    Write-Host "已移除: $destPath" -ForegroundColor Cyan
                }
                catch {
                    Write-Host "删除失败: $destPath — $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        }
        else {
            Write-Host "未找到: $destPath" -ForegroundColor DarkGray
        }
    }
}

Write-Host "卸载操作完成。" -ForegroundColor Cyan
