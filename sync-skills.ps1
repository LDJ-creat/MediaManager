$sourceDir = $PSScriptRoot
$skillsRoot = Join-Path $sourceDir "skills"
$targetDirs = @(
    "$HOME\.cursor\skills",
    "$HOME\.agents\skills",
    "$HOME\.claude\skills",
    "$HOME\.codex\skills",
    "$HOME\.gemini\skills",
    "$HOME\.copilot\skills",
    "$HOME\.gemini\antigravity\skills",
)

$excludeDirs = @("node_modules", "output", "test-output", "test-output-archive", "test-output-live-v2", ".git", ".auth", "csdn-output", "xhs-output")
$excludeFiles = @(".gitignore", "*.html", "sync-skills.ps1")

$guidanceTemplate = Join-Path $sourceDir "skills\media-manager\references\guidance"

$skillDirs = @()
if (Test-Path $skillsRoot) {
    $skillDirs += Get-ChildItem -Path $skillsRoot -Directory | Where-Object {
        Test-Path (Join-Path $_.FullName "SKILL.md")
    }
}

Write-Host "开始同步技能..." -ForegroundColor Cyan

foreach ($target in $targetDirs) {
    if (-not (Test-Path $target)) {
        New-Item -ItemType Directory -Force -Path $target | Out-Null
    }

    foreach ($skillDir in $skillDirs) {
        $destPath = Join-Path $target $skillDir.Name
        Write-Host "  -> 同步 [$($skillDir.Name)] 至 $target" -ForegroundColor Green

        $roboArgs = @(
            $skillDir.FullName,
            $destPath,
            "/E", "/IS", "/IT",
            "/R:0", "/W:0",
            "/NJH", "/NJS", "/NDL", "/NC", "/NS",
            "/XD"
        ) + $excludeDirs + @("/XF") + $excludeFiles

        & robocopy @roboArgs | Out-Null
    }

    if (Test-Path $guidanceTemplate) {
        $guidanceDest = Join-Path $target "guidance"
        Write-Host "  -> 同步 [guidance templates] 至 $target" -ForegroundColor Green
        $roboArgs = @(
            $guidanceTemplate,
            $guidanceDest,
            "/E", "/IS", "/IT",
            "/R:0", "/W:0",
            "/NJH", "/NJS", "/NDL", "/NC", "/NS",
            "/XD"
        ) + $excludeDirs + @("/XF") + $excludeFiles
        & robocopy @roboArgs | Out-Null
    }
}

Write-Host "所有技能同步完成！" -ForegroundColor Cyan
