import path from "node:path";
import { readFile } from "node:fs/promises";
import type { CliArgs } from "../types";

const DEFAULT_MODEL = "google/gemini-3.1-flash-image-preview";

type OpenRouterImageEntry = {
  image_url?: string | { url?: string | null } | null;
  imageUrl?: string | { url?: string | null } | null;
};

type OpenRouterMessagePart = {
  type?: string;
  text?: string;
  image_url?: string | { url?: string | null } | null;
  imageUrl?: string | { url?: string | null } | null;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      images?: OpenRouterImageEntry[];
      content?: string | OpenRouterMessagePart[];
    };
  }>;
};

export function getDefaultModel(): string {
  return process.env.OPENROUTER_IMAGE_MODEL || DEFAULT_MODEL;
}

function getApiKey(): string | null {
  return process.env.OPENROUTER_API_KEY || null;
}

function getBaseUrl(): string {
  const base = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  return base.replace(/\/+$/g, "");
}

function getHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const referer = process.env.OPENROUTER_HTTP_REFERER?.trim();
  if (referer) {
    headers["HTTP-Referer"] = referer;
  }

  const title = process.env.OPENROUTER_TITLE?.trim();
  if (title) {
    headers["X-OpenRouter-Title"] = title;
    headers["X-Title"] = title;
  }

  return headers;
}

function parsePixelSize(value: string): { width: number; height: number } | null {
  const match = value.match(/^(\d+)\s*[xX]\s*(\d+)$/);
  if (!match) return null;

  const width = parseInt(match[1]!, 10);
  const height = parseInt(match[2]!, 10);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function inferAspectRatio(size: string | null): string | null {
  if (!size) return null;
  const parsed = parsePixelSize(size);
  if (!parsed) return null;

  const divisor = gcd(parsed.width, parsed.height);
  return `${parsed.width / divisor}:${parsed.height / divisor}`;
}

function inferImageSize(size: string | null): "1K" | "2K" | "4K" | null {
  if (!size) return null;
  const parsed = parsePixelSize(size);
  if (!parsed) return null;

  const longestEdge = Math.max(parsed.width, parsed.height);
  if (longestEdge <= 1024) return "1K";
  if (longestEdge <= 2048) return "2K";
  return "4K";
}

function getImageSize(args: CliArgs): "1K" | "2K" | "4K" {
  if (args.imageSize) return args.imageSize as "1K" | "2K" | "4K";

  const inferredFromSize = inferImageSize(args.size);
  if (inferredFromSize) return inferredFromSize;

  return args.quality === "normal" ? "1K" : "2K";
}

function getAspectRatio(args: CliArgs): string | null {
  return args.aspectRatio || inferAspectRatio(args.size);
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/png";
}

async function readImageAsDataUrl(filePath: string): Promise<string> {
  const bytes = await readFile(filePath);
  return `data:${getMimeType(filePath)};base64,${bytes.toString("base64")}`;
}

function buildContent(prompt: string, referenceImages: string[]): Array<Record<string, unknown>> {
  const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];

  for (const imageUrl of referenceImages) {
    content.push({
      type: "image_url",
      image_url: { url: imageUrl },
    });
  }

  return content;
}

function extractImageUrl(entry: OpenRouterImageEntry | OpenRouterMessagePart): string | null {
  const value = entry.image_url ?? entry.imageUrl;
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.url ?? null;
}

function decodeDataUrl(value: string): Uint8Array | null {
  const match = value.match(/^data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return Uint8Array.from(Buffer.from(match[1]!, "base64"));
}

async function downloadImage(value: string): Promise<Uint8Array> {
  const inline = decodeDataUrl(value);
  if (inline) return inline;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    const response = await fetch(value);
    if (!response.ok) {
      throw new Error(`Failed to download OpenRouter image: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  return Uint8Array.from(Buffer.from(value, "base64"));
}

async function extractImageFromResponse(result: OpenRouterResponse): Promise<Uint8Array> {
  const message = result.choices?.[0]?.message;

  for (const image of message?.images ?? []) {
    const imageUrl = extractImageUrl(image);
    if (imageUrl) return downloadImage(imageUrl);
  }

  if (Array.isArray(message?.content)) {
    for (const item of message.content) {
      const imageUrl = extractImageUrl(item);
      if (imageUrl) return downloadImage(imageUrl);

      if (item.type === "text" && item.text) {
        const inline = decodeDataUrl(item.text);
        if (inline) return inline;
      }
    }
  } else if (typeof message?.content === "string") {
    const inline = decodeDataUrl(message.content);
    if (inline) return inline;
  }

  throw new Error("No image in OpenRouter response");
}

export async function generateImage(
  prompt: string,
  model: string,
  args: CliArgs
): Promise<Uint8Array> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required. Get one at https://openrouter.ai/settings/keys");
  }

  const referenceImages: string[] = [];
  for (const refPath of args.referenceImages) {
    referenceImages.push(await readImageAsDataUrl(refPath));
  }

  const imageGenerationOptions: Record<string, string> = {
    size: getImageSize(args),
  };

  const aspectRatio = getAspectRatio(args);
  if (aspectRatio) {
    imageGenerationOptions.aspect_ratio = aspectRatio;
  }

  const body = {
    model,
    messages: [
      {
        role: "user",
        content: buildContent(prompt, referenceImages),
      },
    ],
    modalities: ["image", "text"],
    max_tokens: 256,
    imageGenerationOptions,
    providerPreferences: {
      require_parameters: true,
    },
  };

  console.log(`Generating image with OpenRouter (${model})...`, imageGenerationOptions);

  const response = await fetch(`${getBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: getHeaders(apiKey),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as OpenRouterResponse;
  return extractImageFromResponse(result);
}
