# Output Format

This skill writes all artifacts into the directory given by --output.

If --output is omitted, the script uses default_output_dir from EXTEND.md, or ./wechat-data-output when no override is configured.

When running from get-wechat-data/scripts, these are common examples:

- --output ../output-auto-token -> artifacts land in get-wechat-data/output-auto-token
- no --output -> artifacts land in get-wechat-data/scripts/wechat-data-output

## File layout

Each fetch run creates:

- wechat-analytics-YYYYMMDD-HHMMSS.json
- wechat-analytics-YYYYMMDD-HHMMSS.md
- raw-YYYYMMDD-HHMMSS/ when --save-raw is enabled

## JSON structure

Top-level fields:

- generatedAt: ISO timestamp for the fetch run
- page: content | user | both
- start, end: optional date filters
- outputDir: resolved absolute output directory
- records: deduplicated raw page capture results
- normalized: compact business-facing analytics
- metrics: curated compatibility metrics derived from normalized

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

## records

records preserve raw captures for inspection and parser maintenance.

Each item includes:

- pageType
- targetUrl
- finalUrl
- resolvedToken when discovered automatically
- pageTitle
- bodyPreview
- responses
- fallbackState when present

## Markdown report

The Markdown report is a reader-friendly summary of the same run.

Current sections:

- Page Summary
- Content Summary
- User Summary
- Content Daily Trend
- User Daily Trend
- Content Articles
- Curated Metrics

## Practical guidance

- Use the Markdown file for human review and quick sharing.
- Use the JSON file for automation or downstream transformation.
- Use raw-* only for debugging, schema inspection, or parser updates.