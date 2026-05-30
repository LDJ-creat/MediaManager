# Output Format

This skill writes all artifacts into the directory given by --output.

If --output is omitted, the script uses default_output_dir from EXTEND.md, or ./wechat-data-output when no override is configured.

When running from get-wechat-data/scripts, these are common examples:

- --output ../output-auto-token -> artifacts land in get-wechat-data/output-auto-token
- no --output -> artifacts land in get-wechat-data/scripts/wechat-data-output

## File layout

Each fetch run creates:

- wechat-analytics-YYYYMMDD-HHMMSS.json (default and sufficient for analyze-operation)
- wechat-analytics-YYYYMMDD-HHMMSS.md
- raw-YYYYMMDD-HHMMSS/ only when --save-raw is explicitly enabled

## JSON structure

Top-level fields:

- generatedAt: ISO timestamp for the fetch run
- page: content | user | both
- start, end: optional date filters
- outputDir: resolved absolute output directory
- rawDir: optional path when --save-raw was used
- normalized: compact business-facing analytics

## normalized.content

- summary
  - read
  - like
  - share
  - collection
  - comment
- dailyTotals
  - date
  - readUv
  - shareUv
  - sourceUv when available
  - collectionUv when available
  - massPv when available
- articles
  - refDate
  - title
  - totalReadUv
  - readUvRatio

## normalized.user

- summary
  - newUser
  - cancelUser
  - netgainUser
  - cumulateUser
- dailyTotals
  - date
  - newUser
  - cancelUser
  - netgainUser
  - cumulateUser

## Raw captures (--save-raw)

When --save-raw is enabled, each page type is saved under raw-YYYYMMDD-HHMMSS/ as a separate JSON file (content.json, user.json). These files contain full crawl payloads for debugging and parser maintenance, including network responses and page snapshots. They may contain session tokens — do not commit to git.

## Markdown report

The Markdown report is a reader-friendly summary of the same run.

Current sections:

- Content Summary
- User Summary
- Content Daily Trend
- User Daily Trend
- Content Articles

## Practical guidance

- Use the Markdown file for human review and quick sharing.
- Use the JSON file for automation or downstream transformation.
- Use --save-raw only for debugging, schema inspection, or parser updates.
