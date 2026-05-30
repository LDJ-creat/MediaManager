# Article Posting

This skill writes Markdown articles into the Juejin editor and saves them to drafts only.

## Input rules

Supported input:

- Markdown file path via --file
- optional frontmatter fields: title, tags, cover, coverImage, featureImage, image, column, visibility
- optional CLI overrides: --title, --cover, --tags, --column, --visibility

Resolution priority:

1. CLI arguments
2. Frontmatter
3. EXTEND.md defaults
4. Skill defaults

## Recommended command

```bash
npx tsx post-article.ts --file ./article.md --state ../.auth/storageState.json --draft --headful
```

## Behavior notes

- the script fills title and body directly in the Juejin editor
- it tries to apply tags, column, cover, and visibility when matching controls are found
- UI controls can change over time, so optional metadata is best-effort rather than guaranteed
- the script saves the article into drafts and does not attempt final publish
- if you pass --publish by habit, the script warns and ignores it

## Best practice

- verify login first with check-login.ts
- use --headful the first time you run post-article.ts
- keep title and tags explicit in frontmatter or CLI if you want deterministic output

## Example frontmatter

```md
---
title: 一篇用于掘金发布的文章
tags:
  - 掘金
  - TypeScript
cover: ./assets/cover.png
column: 我的专栏
visibility: 公开
---

# 一篇用于掘金发布的文章

正文内容。
```

## Boundary

- this skill does not generate cover images
- this skill does not perform final publish
- this skill does not schedule future publishing
- this skill does not manage multiple drafts or batch import