$sourceDir = $PSScriptRoot
$targetDirs = @(
    "$HOME\.claude\skills",
    "$HOME\.gemini\skills",
    "$HOME\.copilot\skills",
    "$HOME\.gemini\antigravity\skills",
    "$HOME\.agent\skills"
)

# 排除与 skill 无关的文件和目录
$excludeDirs = @("node_modules", "output", "test-output", "test-output-archive", "test-output-live-v2", ".git", ".auth", "csdn-output")
$excludeFiles = @(".gitignore", "*.html", "sync-skills.ps1")

# 获取所有包含 SKILL.md 的有效技能目录
# 获取所有包含 SKILL.md 的技能目录，以及必要的资源目录（如 guidance）
$skillDirs = Get-ChildItem -Path $sourceDir -Directory | Where-Object { 
    (Test-Path (Join-Path $_.FullName "SKILL.md")) -or 
    ($_.Name -eq "guidance")
}

Write-Host "开始同步技能..." -ForegroundColor Cyan

foreach ($target in $targetDirs) {
    if (-not (Test-Path $target)) {
        Write-Host "创建目录: $target" -ForegroundColor DarkGray
        New-Item -ItemType Directory -Force -Path $target | Out-Null
    }

    foreach ($skillDir in $skillDirs) {
        $destPath = Join-Path $target $skillDir.Name
        Write-Host "  -> 同步 [$($skillDir.Name)] 至 $target" -ForegroundColor Green

        # 构建 robocopy 参数
        # /E: 包含所有子目录(含空)， /IT/IS/UPDATE 可以直接覆盖更新，
        # /R:0 /W:0 遇到错误不重试、不等待
        # /NJH /NJS /NDL /NC /NS: 精简或隐藏输出
        $roboArgs = @(
            $skillDir.FullName,
            $destPath,
            "/E", "/IS", "/IT",
            "/R:0", "/W:0",
            "/NJH", "/NJS", "/NDL", "/NC", "/NS",
            "/XD"
        ) + $excludeDirs + @("/XF") + $excludeFiles

        # 捕获并忽略 robocopy 的退出代码（robocopy < 8 均表示复制成功或无变化）
        & robocopy $roboArgs | Out-Null
    }
}

Write-Host "所有技能同步完成！" -ForegroundColor Cyan