import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";

import type { CliArgs } from "../types.ts";
import {
  buildRequestBody,
  generateImage,
  getDefaultModel,
  getResolution,
} from "./atlascloud.ts";

function makeArgs(overrides: Partial<CliArgs> = {}): CliArgs {
  return {
    prompt: null,
    promptFiles: [],
    imagePath: null,
    provider: "atlascloud",
    model: null,
    aspectRatio: null,
    size: null,
    quality: null,
    imageSize: null,
    referenceImages: [],
    n: 1,
    batchFile: null,
    jobs: null,
    json: false,
    help: false,
    ...overrides,
  };
}

function useEnv(t: TestContext, values: Record<string, string | null>): void {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of previous.entries()) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test("Atlas Cloud defaults and request body map baoyu options", (t) => {
  useEnv(t, { ATLASCLOUD_IMAGE_MODEL: null });
  const args = makeArgs({ aspectRatio: "16:9", quality: "2k" });

  assert.equal(getDefaultModel(), "google/nano-banana-2/text-to-image");
  assert.equal(getResolution(args), "2k");
  assert.deepEqual(buildRequestBody("A cat", getDefaultModel(), args), {
    model: "google/nano-banana-2/text-to-image",
    prompt: "A cat",
    resolution: "2k",
    output_format: "png",
    aspect_ratio: "16:9",
  });
});

test("Atlas Cloud completed response submits once and downloads the output", async (t) => {
  useEnv(t, { ATLASCLOUD_API_KEY: "test-key" });
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method: string }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method || "GET" });
    if (url.endsWith("/model/generateImage")) {
      return new Response(
        JSON.stringify({
          data: {
            id: "prediction-1",
            status: "completed",
            outputs: ["https://cdn.example.test/output.png"],
          },
        }),
        { status: 200 },
      );
    }
    return new Response(Uint8Array.from([137, 80, 78, 71]), { status: 200 });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const image = await generateImage(
    "A cat",
    "google/nano-banana-2/text-to-image",
    makeArgs(),
  );

  assert.deepEqual(Array.from(image), [137, 80, 78, 71]);
  assert.deepEqual(calls, [
    { url: "https://api.atlascloud.ai/api/v1/model/generateImage", method: "POST" },
    { url: "https://cdn.example.test/output.png", method: "GET" },
  ]);
});
