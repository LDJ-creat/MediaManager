# Article Posting

## Supported input

- Markdown file path via `--file`
- optional frontmatter keys: `title`, `summary`, `abstract`, `excerpt`, `category`, `categories`, `tags`, `original`

CLI values override frontmatter values.

## Current publish flow

1. Open the CSDN Markdown editor page at https://editor.csdn.net/md/?not_checkout=1&spm=1015.2103.3001.8066.
2. Dismiss onboarding overlays if they are visible.
3. Fill title in the top title input.
4. Fill Markdown body directly into the left Markdown editor area.
5. Click the bottom-right “发布文章” button to open the publish dialog.
6. In the publish dialog, try to fill summary/original flag, select tags, and upload cover image if provided.
7. Click “保存为草稿” to save the draft.
8. Capture related XHR/fetch responses and write result summary files.

## Important behavior

- Markdown is sent directly to the CSDN editor. No Markdown to HTML conversion is used.
- The current implementation targets the dedicated Markdown editor rather than the older rich-text creation page.
- The script saves drafts only and does not support automatic formal publishing.
- Tags / cover / original flag are filled in the publish dialog when the UI provides those fields.
- If category cannot be matched because CSDN changed the UI, the script keeps going and records warnings in the output result.

## Minimal recommended metadata

- title
- summary when available
- one category when the account requires it
- tags when the account requires them during manual publish
- original/repost flag when the publish dialog asks for it during manual publish

## Suggested first validation

1. Run in `--headful` mode.
2. Confirm title and Markdown body are placed correctly.
3. Confirm tags/cover (if provided) are applied in the publish dialog.
4. Confirm the draft is actually visible in the draft box.
