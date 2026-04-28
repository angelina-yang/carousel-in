// POST /api/draft
// Input: { post, brand, slideCount, angle, model }
// Header: x-claude-api-key (BYOK — required, no server fallback per LAB_PRINCIPLES Rule 11)
// Output: { slides, usage: { inputTokens, outputTokens, estimatedCostUsd }, model }

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  buildSlideBreakdownPrompt,
  parseSlideResponse,
} from "@/lib/prompts";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import type { Brand, LeanAngle } from "@/lib/types";

export const maxDuration = 60;

const MAX_GENERATIONS_PER_HOUR = 20;
const MAX_POST_CHARS = 5000;
const MAX_BRAND_CHARS = 80;

const MODEL_QUICK = "claude-haiku-4-5-20251001";
const MODEL_POLISHED = "claude-sonnet-4-6";

const COST_PER_MTOK: Record<string, { input: number; output: number }> = {
  [MODEL_QUICK]: { input: 1.0, output: 5.0 },
  [MODEL_POLISHED]: { input: 3.0, output: 15.0 },
};

const VALID_ANGLES: LeanAngle[] = [
  "decide",
  "tension",
  "framework",
  "story",
  "contrarian",
];

function parseBrand(raw: unknown): Brand {
  if (!raw || typeof raw !== "object") return { displayName: "", handle: "" };
  const rec = raw as { displayName?: unknown; handle?: unknown };
  return {
    displayName:
      typeof rec.displayName === "string"
        ? rec.displayName.slice(0, MAX_BRAND_CHARS).trim()
        : "",
    handle:
      typeof rec.handle === "string"
        ? rec.handle.slice(0, MAX_BRAND_CHARS).trim()
        : "",
  };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (isRateLimited(`draft:${ip}`, MAX_GENERATIONS_PER_HOUR, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many generations this hour. Please slow down." },
      { status: 429 }
    );
  }

  const apiKey = req.headers.get("x-claude-api-key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API key required. Paste it in the settings panel." },
      { status: 401 }
    );
  }

  let body: {
    post?: unknown;
    brand?: unknown;
    angle?: unknown;
    model?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const post = typeof body.post === "string" ? body.post.trim() : "";
  if (post.length < 50) {
    return NextResponse.json(
      { error: "Post needs at least 50 characters." },
      { status: 400 }
    );
  }
  if (post.length > MAX_POST_CHARS) {
    return NextResponse.json(
      { error: `Post is too long. Max ${MAX_POST_CHARS} characters.` },
      { status: 400 }
    );
  }

  const brand = parseBrand(body.brand);
  const angle: LeanAngle =
    typeof body.angle === "string" && (VALID_ANGLES as string[]).includes(body.angle)
      ? (body.angle as LeanAngle)
      : "decide";
  const modelChoice = body.model === "quick" ? "quick" : "polished";
  const model = modelChoice === "quick" ? MODEL_QUICK : MODEL_POLISHED;

  const { system, user } = buildSlideBreakdownPrompt({
    post,
    brand,
    angle,
  });

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 3000,
      system,
      messages: [{ role: "user", content: user }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    let parsed;
    try {
      parsed = parseSlideResponse(textBlock.text);
    } catch (err) {
      // Retry once with stricter reminder if parse fails.
      const retry = await client.messages.create({
        model,
        max_tokens: 3000,
        system: `${system}\n\nIMPORTANT: Return ONLY a JSON object. No prose, no markdown fences.`,
        messages: [
          { role: "user", content: user },
          { role: "assistant", content: textBlock.text },
          {
            role: "user",
            content:
              "That output was not valid JSON. Reply with only the JSON object, no other text.",
          },
        ],
      });
      const retryText = retry.content.find((b) => b.type === "text");
      if (!retryText || retryText.type !== "text") {
        throw err instanceof Error ? err : new Error(String(err));
      }
      parsed = parseSlideResponse(retryText.text);
    }

    const rates = COST_PER_MTOK[model] ?? COST_PER_MTOK[MODEL_POLISHED];
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const estimatedCostUsd =
      (inputTokens / 1_000_000) * rates.input +
      (outputTokens / 1_000_000) * rates.output;

    return NextResponse.json({
      slides: parsed.slides,
      usage: { inputTokens, outputTokens, estimatedCostUsd },
      model,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Slide generation failed";
    return NextResponse.json(
      { error: sanitizeProviderError(message) },
      { status: 502 }
    );
  }
}

function sanitizeProviderError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("authentication") ||
    lower.includes("unauthorized") ||
    lower.includes("invalid x-api-key") ||
    lower.includes("invalid api key")
  ) {
    return "Your Anthropic API key was rejected. Double-check it in the settings panel.";
  }
  if (lower.includes("rate") && lower.includes("limit")) {
    return "Anthropic rate-limited your request. Wait a moment and try again.";
  }
  if (lower.includes("overloaded")) {
    return "Anthropic is temporarily overloaded. Try again in a few seconds.";
  }
  if (lower.includes("non-json") || lower.includes("no valid slides")) {
    return "Claude returned an unparseable response. Try regenerating, or try the Polished model.";
  }
  return "Slide generation failed. Try again.";
}
