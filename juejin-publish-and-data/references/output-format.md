# Output Format

This skill writes fetch artifacts into the directory given by --output.

If --output is omitted, the script uses default_output_dir from EXTEND.md, or ./juejin-data-output when no override is configured.

## File layout

Each fetch run creates:

- juejin-analytics-YYYYMMDD-HHMMSS.json
- raw-YYYYMMDD-HHMMSS/ when --save-raw is enabled

## JSON structure

Top-level fields:

- generatedAt: ISO timestamp for the fetch run
- page: content | follower | both
- start, end: optional date filters
- outputDir: resolved absolute output directory
- rawDir: optional raw payload directory path
- normalized: compact business-facing analytics

## normalized.content

- overview
  - articleCount
  - displayCount
  - viewCount
  - diggCount
  - commentCount
  - collectCount

- articles
  - articleId
  - articleUrl
  - title
  - briefContent when available
  - publishTime when available
  - displayCount
  - viewCount
  - diggCount
  - commentCount
  - collectCount
  - shareCount
  - recent7Days[]
    - date
    - displayCount
    - viewCount
    - diggCount
    - commentCount
    - collectCount
    - shareCount

Notes:

- only the latest 5 articles are included
- articleUrl uses the stable format https://juejin.cn/post/<articleId>
- publishTime is converted from raw timestamp into a human-readable string

## normalized.follower

- totalFollowers when available
- activeFollowers when available
- netFollowers when available
- newFollowers when available
- lostFollowers when available
- dateRows[]
  - date
  - totalFollowers when available
  - activeFollowers when available
  - newFollowers
  - lostFollowers
  - netFollowers
- distribution when the page exposes demographic or distribution objects

## Practical guidance

- Use the JSON file as the primary artifact for LLM analysis or downstream automation.
- Use rawDir only for debugging, schema inspection, or parser updates.
- Use raw-* only for debugging, schema inspection, or parser updates.