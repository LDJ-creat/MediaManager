# Output Format

## Publish result files

Each run of `post-note.ts` writes two files into the output directory:

- `xhs-post-result-YYYYMMDD-HHMMSS.json`
- `xhs-post-result-YYYYMMDD-HHMMSS.md`

## Analytics result files

Each run of `fetch-analytics.ts` writes:

- `xhs-analytics-YYYYMMDD-HHMMSS.json` (default and sufficient for analyze-operation)
- optional raw crawl records under `raw-YYYYMMDD-HHMMSS/note-manager.json` when `--save-raw` is explicitly set

Default output directory:

- `{skill-root}/xhs-output` (e.g. `xiaohongshu-publish-and-data/xhs-output/`)
- override with `--output <dir>`
- or configure `default_output_dir` in EXTEND.md (resolved relative to skill root)

## Publish JSON shape

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
- On failure, check `screenshotPath` in `{skill-root}/xhs-output/` (CDP runs keep the Chrome window visible).

## Analytics JSON shape

```json
{
  "generatedAt": "2026-05-30T12:00:00.000Z",
  "limit": 10,
  "outputDir": "./xhs-output",
  "report": {
    "limit": 10,
    "overview": {
      "noteCount": 4,
      "viewCount": 105,
      "commentCount": 1,
      "likeCount": 2,
      "collectCount": 5,
      "shareCount": 0
    },
    "notes": [
      {
        "noteId": "69bb723e0000000021006a54",
        "title": "手搓的看视频学习神器，硬核升级2.0！🚀",
        "url": "https://www.xiaohongshu.com/explore/69bb723e0000000021006a54?xsec_token=...",
        "publishTime": "2026-03-19 11:49",
        "noteType": "normal",
        "sticky": true,
        "metrics": {
          "viewCount": 12,
          "commentCount": 0,
          "likeCount": 0,
          "collectCount": 0,
          "shareCount": 0
        }
      }
    ]
  }
}
```

Field mapping from creator API:

| Report field | API field |
|---|---|
| viewCount | view_count |
| commentCount | comments_count |
| likeCount | likes |
| collectCount | collected_count |
| shareCount | shared_count |
