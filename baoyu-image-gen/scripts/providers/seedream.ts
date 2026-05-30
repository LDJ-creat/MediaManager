import type { CliArgs } from "../types";

export function getDefaultModel(): string {
  return process.env.SEEDREAM_IMAGE_MODEL || "doubao-seedream-5-0-260128";
}

function getApiKey(): string | null {
  return process.env.ARK_API_KEY || null;
}

function getBaseUrl(): string {
  return process.env.SEEDREAM_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
}

/**
 * Convert aspect ratio to Seedream size format
 * Seedream API accepts: "2k" (default), "3k", or WIDTHxHEIGHT format
 * Note: API uses lowercase "2k"/"3k", not "2K"/"3K"
 */
function getSeedreamSize(ar: string | null, quality: CliArgs["quality"], imageSize?: string | null): string {
  // If explicit size is provided
  if (imageSize) {
    const upper = imageSize.toUpperCase();
    if (upper === "2K" || upper === "3K") {
      return upper.toLowerCase(); // API expects "2k" or "3k"
    }
    // For widthxheight format, pass through as-is
    if (imageSize.includes("x")) {
      return imageSize;
    }
  }

  // Default to 2k (smallest option supported by API)
  return "2k";
}

type SeedreamImageResponse = {
  model: string;
  created: number;
  data: Array<{
    url: string;
    size: string;
  }>;
  usage: {
    generated_images: number;
    output_tokens: number;
    total_tokens: number;
  };
};

export async function generateImage(
  prompt: string,
  model: string,
  args: CliArgs
): Promise<Uint8Array> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "ARK_API_KEY is required. " +
        "Get your API key from https://console.volcengine.com/ark"
    );
  }

  const baseUrl = getBaseUrl();
  const size = getSeedreamSize(args.aspectRatio, args.quality, args.imageSize);

  console.error(`Calling Seedream API (${model}) with size: ${size}`);

  const requestBody = {
    model,
    prompt,
    size,
    output_format: "png",
    watermark: false,
  };

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Seedream API error (${response.status}): ${err}`);
  }

  const result = (await response.json()) as SeedreamImageResponse;

  if (!result.data || result.data.length === 0) {
    throw new Error("No image data in Seedream response");
  }

  const imageUrl = result.data[0].url;
  if (!imageUrl) {
    throw new Error("No image URL in Seedream response");
  }

  // Download image from URL
  console.error(`Downloading image from ${imageUrl}...`);
  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) {
    throw new Error(`Failed to download image from ${imageUrl}`);
  }

  const buffer = await imgResponse.arrayBuffer();
  return new Uint8Array(buffer);
}
