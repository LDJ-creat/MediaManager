import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixtureDir = path.resolve(__dirname, "..", "test-fixtures");
fs.mkdirSync(fixtureDir, { recursive: true });

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
fs.writeFileSync(path.join(fixtureDir, "test.png"), png);

fs.writeFileSync(
  path.join(fixtureDir, "note.md"),
  `---
title: "测试标题"
tags:
  - AI工具
images:
  - ./test.png
---

测试正文内容
`,
  "utf-8",
);

console.log(`Fixtures written to ${fixtureDir}`);
