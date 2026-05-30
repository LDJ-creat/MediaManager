import { render } from "../scripts/renderer.js";
import type { AnalyzedArticle } from "../scripts/types.js";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function makeArticle(overrides: Partial<AnalyzedArticle>): AnalyzedArticle {
  return {
    id: "abc12345",
    title: "Original Title",
    summary: "Original summary",
    url: "https://example.com/article",
    pub_date: "2026-05-30T00:00:00.000Z",
    source: "TestSource",
    source_hint: "AI前沿",
    source_weight: 1,
    score: 4.2,
    category: "AI前沿",
    chinese_title: "中文标题",
    summary_zh: "这是中文摘要。",
    ...overrides,
  };
}

function testRender(): void {
  console.log("=== 测试 renderer ===");

  const markdown = render(
    [
      makeArticle({ score: 4.8, chinese_title: "精选一", category: "AI前沿" }),
      makeArticle({ score: 4.5, chinese_title: "精选二", category: "开发与工程" }),
      makeArticle({ score: 4.2, chinese_title: "精选三", category: "大厂动态" }),
      makeArticle({ score: 3.8, chinese_title: "普通文章", category: "产品与行业" }),
    ],
    3.5,
    3,
    "2026-05-30",
  );

  assert(markdown.includes("# 📰 每日科技资讯 · 2026-05-30"), "应包含日报标题");
  assert(markdown.includes("评分阈值 **3.5** 分"), "应包含阈值");
  assert(markdown.includes("## 💎 今日精选"), "应包含今日精选板块");
  assert(markdown.includes("### 1. 精选一"), "今日精选应有编号");
  assert(markdown.includes("## 🤖 AI 前沿"), "应渲染 AI 前沿板块");
  assert(markdown.includes("## 🛠️ 开发与工程"), "应渲染开发与工程板块");
  assert(markdown.includes("*由 news-skill 自动生成 · 2026-05-30*"), "应包含页脚");

  const emptyCategoryMarkdown = render(
    [makeArticle({ category: "AI前沿", chinese_title: "唯一文章" })],
    3.0,
    3,
    "2026-05-30",
  );
  assert(
    !emptyCategoryMarkdown.includes("## 🛠️ 开发与工程"),
    "空板块应跳过",
  );

  console.log("renderer 通过");
}

function main(): void {
  testRender();
  console.log("\nrenderer 验证通过！");
}

main();
