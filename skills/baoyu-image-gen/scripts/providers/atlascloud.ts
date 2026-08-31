import type { CliArgs } from "../types";

const DEFAULT_MODEL = "google/nano-banana-2/text-to-image";
const DEFAULT_BASE_URL = "https://api.atlascloud.ai/api/v1";
const MAX_POLL_MS = 10 * 60 * 1000;

type Prediction = {
  id?: string;
  status?: string;
  outputs?: string[];
  error?: unknown;
  message?: unknown;
};

type ApiResponse = Prediction & {
  data?: Prediction;
};

export function getDefaultModel(): string {
  return process.env.ATLASCLOUD_IMAGE_MODEL || DEFAULT_MODEL;
}

function getApiKey(): string | null {
  return process.env.ATLASCLOUD_API_KEY || null;
}

function getBaseUrl(): string {
  return (process.env.ATLASCLOUD_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/g, "");
}

function unwrapPrediction(response: ApiResponse): Prediction {
  return response.data && typeof response.data === "object"
    ? response.data
    : response;
}

export function getResolution(args: CliArgs): "1k" | "2k" | "4k" {
  if (args.imageSize) return args.imageSize.toLowerCase() as "1k" | "2k" | "4k";
  return args.quality === "2k" ? "2k" : "1k";
}

export function buildRequestBody(
  prompt: string,
  model: string,
  args: CliArgs,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    prompt,
    resolution: getResolution(args),
    output_format: "png",
  };
  if (args.aspectRatio) body.aspect_ratio = args.aspectRatio;
  return body;
}

async function readJsonResponse(response: Response, operation: string): Promise<ApiResponse> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Atlas Cloud ${operation} error (${response.status}): ${text}`);
  }
  try {
    return JSON.parse(text) as ApiResponse;
  } catch {
    throw new Error(`Atlas Cloud ${operation} returned invalid JSON`);
  }
}

function getErrorMessage(prediction: Prediction): string {
  const value = prediction.error ?? prediction.message ?? prediction.status ?? "unknown error";
  return typeof value === "string" ? value : JSON.stringify(value);
}

async function pollPrediction(
  predictionId: string,
  apiKey: string,
): Promise<Prediction> {
  const startedAt = Date.now();
  let delayMs = 3000;

  while (Date.now() - startedAt < MAX_POLL_MS) {
    const response = await fetch(
      `${getBaseUrl()}/model/prediction/${encodeURIComponent(predictionId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "media-manager/baoyu-image-gen",
        },
      },
    );
    const prediction = unwrapPrediction(await readJsonResponse(response, "poll"));
    const status = String(prediction.status || "").toLowerCase();
    if (status === "completed" || status === "succeeded") return prediction;
    if (status === "failed" || status === "canceled" || status === "cancelled") {
      throw new Error(`Atlas Cloud prediction ${status}: ${getErrorMessage(prediction)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    delayMs = Math.min(Math.ceil(delayMs * 1.5), 15000);
  }

  throw new Error(`Atlas Cloud prediction timed out after ${MAX_POLL_MS / 1000}s`);
}

async function downloadImage(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image from Atlas Cloud (${response.status})`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function generateImage(
  prompt: string,
  model: string,
  args: CliArgs,
): Promise<Uint8Array> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "ATLASCLOUD_API_KEY is required. Get one at https://www.atlascloud.ai/console/api-keys",
    );
  }
  if (args.referenceImages.length > 0) {
    throw new Error("Atlas Cloud text-to-image does not support reference images in this provider");
  }

  console.error(`Calling Atlas Cloud API (${model})...`);
  const response = await fetch(`${getBaseUrl()}/model/generateImage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "media-manager/baoyu-image-gen",
    },
    body: JSON.stringify(buildRequestBody(prompt, model, args)),
  });
  let prediction = unwrapPrediction(await readJsonResponse(response, "API"));
  const initialStatus = String(prediction.status || "").toLowerCase();

  if (initialStatus !== "completed" && initialStatus !== "succeeded") {
    if (!prediction.id) throw new Error("Atlas Cloud response did not include a prediction ID");
    prediction = await pollPrediction(prediction.id, apiKey);
  }

  const outputUrl = prediction.outputs?.[0];
  if (!outputUrl) throw new Error("Atlas Cloud prediction did not include an output URL");
  return downloadImage(outputUrl);
}
