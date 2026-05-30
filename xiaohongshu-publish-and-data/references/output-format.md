# Output Format

## Result files

Each run of `post-note.ts` writes two files into the output directory:

- `xhs-post-result-YYYYMMDD-HHMMSS.json`
- `xhs-post-result-YYYYMMDD-HHMMSS.md`

Default output directory:

- `./xhs-output`
- override with `--output <dir>`
- or configure `default_output_dir` in EXTEND.md

## JSON shape

```json
{
  "generatedAt": "2026-05-30T12:00:00.000Z",
  "mode": "publish",
  "title": "Agent踩坑总结",
  "note": "正文内容...",
  "tags": ["AI工具", "程序员"],
  "imagePaths": ["D:/path/cover.png"],
  "finalUrl": "https://creator.xiaohongshu.com/publish/success?...",
  "success": true,
  "message": "Xiaohongshu note published",
  "warnings": [],
  "capturedResponses": []
}
```

## Interpretation rules

- Treat `success: true` and either `POST .../web_api/sns/v2/note` in `capturedResponses` or a success URL as pass signals.
- Read `warnings` for click method (`accessibility-cdp`), tag fill, or title truncation notices.
- On failure, check `screenshotPath` in `scripts/xhs-output/` (CDP runs keep the Chrome window visible).
