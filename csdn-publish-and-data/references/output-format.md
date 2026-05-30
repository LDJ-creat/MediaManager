# Output Format

This skill writes all artifacts into the directory given by `--output`.

If `--output` is omitted, the script uses `default_output_dir` from EXTEND.md, or `./csdn-output` when no override is configured.

## Analytics files

Each fetch run creates:

- csdn-analytics-YYYYMMDD-HHMMSS.json
- csdn-analytics-YYYYMMDD-HHMMSS.md
- raw-YYYYMMDD-HHMMSS/ only when `--save-raw` is explicitly enabled

### Analytics JSON structure

- generatedAt
- report
  - range (start, end)
  - overview (articleCount, viewCount, diggCount, commentCount, collectCount, etc.)
  - articles[]
    - articleId, title, url
    - summary (publishTime, viewCount, diggCount, commentCount, favoriteCount, ...)
    - recent7Days[] (daily stats per article)

## Post files

Each draft-save run creates:

- csdn-post-result-YYYYMMDD-HHMMSS.json
- csdn-post-result-YYYYMMDD-HHMMSS.md

### Post JSON structure

- generatedAt
- mode
- title
- summary
- category
- tags
- original
- finalUrl
- articleId
- articleUrl
- success
- message
- warnings
- capturedResponses

Current mode is always `draft`.

## Practical guidance

- Use Markdown outputs for human review.
- Use JSON outputs for automation and downstream processing.
- Use raw artifacts only for debugging parser or selector drift.