import assert from "node:assert/strict";
import { test } from "node:test";
import { padDisplay, visibleWidth } from "../src/ui.js";

test("visibleWidth counts CJK as double width", () => {
  assert.equal(visibleWidth("工作区"), 6);
  assert.equal(visibleWidth("Skills"), 6);
  assert.equal(visibleWidth("API"), 3);
});

test("padDisplay aligns labels to fixed width", () => {
  assert.equal(visibleWidth(padDisplay("凭证", 10)), 10);
  assert.equal(visibleWidth(padDisplay("Skills", 10)), 10);
  assert.equal(padDisplay("API", 10).endsWith("       "), true);
});
