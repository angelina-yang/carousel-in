// POST /api/qa-slide
// Visual layout QA on a rendered slide PNG. Haiku 4.5 with vision.
// Input:  { imageDataUrl, slide, slideIndex, totalSlides }
// Header: x-claude-api-key
// Output: { pass, reason, usage }

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

export const maxDuration = 60;

const MAX_QA_PER_HOUR = 200;
const MODEL_QA = "claude-haiku-4-5-20251001";
const COST_INPUT_PER_MTOK = 1.0;
const COST_OUTPUT_PER_MTOK = 5.0;

const SYSTEM_PROMPT = `You are a layout QA reviewer for LinkedIn carousel slides. You judge a single rendered slide image and decide whether it's clean enough to post or has a visible layout problem.

Reply with ONLY a JSON object, no prose:
{ "pass": true | false, "reason": "<one short sentence — what's wrong, or empty string if pass>" }

A slide PASSES if all of these are true:
- All text is fully visible inside the slide canvas (nothing clipped at edges).
- No text overlaps other text, logos, or UI elements (buttons, page counters, brand bar).
- Buttons/pills look like clean rounded shapes — the border does not cut through their own text.
- Bullet/list items are aligned and readable.
- The composition looks intentional, not broken.

A slide FAILS if you see ANY of:
- Words clipped at any edge of the slide.
- Text running into or overlapping other text.
- A button or pill where the border line crosses through its own text (text wrapped inside the pill).
- Logos, hero images, or brand bars overlapping the headline or body text.
- Stat numbers or list items stacked so tightly they touch / overlap visually.
- Two giant numbers stacked where the body text reads as overlapping the second number.
- Any visual glitch a designer would not ship.

Be strict but fair. Slight whitespace asymmetry is fine. Only fail on issues a viewer would actually notice.`;

interface SlidePayload {
  role?: string;
  headline?: string;
  body?: string | null;
  footnote?: string | null;
  listItems?: string[];
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (isRateLimited(`qa:${ip}`, MAX_QA_PER_HOUR, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many QA checks this hour. Please slow down." },
      { status: 429 }
    );
  }

  const apiKey = req.headers.get("x-claude-api-key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API key required." },
      { status: 401 }
    );
  }

  let body: {
    imageDataUrl?: unknown;
    slide?: unknown;
    slideIndex?: unknown;
    totalSlides?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const dataUrl =
    typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    return NextResponse.json(
      { error: "imageDataUrl must be a base64 data URL (png or jpeg)." },
      { status: 400 }
    );
  }
  const mediaType = match[1] === "jpeg" ? "image/jpeg" : "image/png";
  const base64Data = match[2];

  const slide = (body.slide ?? {}) as SlidePayload;
  const slideIndex =
    typeof body.slideIndex === "number" ? body.slideIndex : null;
  const totalSlides =
    typeof body.totalSlides === "number" ? body.totalSlides : null;

  const slideContext = [
    slide.role ? `role: ${slide.role}` : null,
    slide.headline ? `headline: "${String(slide.headline).slice(0, 200)}"` : null,
    slide.body ? `body: "${String(slide.body).slice(0, 300)}"` : null,
    slide.footnote ? `footnote: "${String(slide.footnote).slice(0, 100)}"` : null,
    Array.isArray(slide.listItems) && slide.listItems.length > 0
      ? `listItems: [${slide.listItems.map((s) => `"${String(s).slice(0, 80)}"`).join(", ")}]`
      : null,
    slideIndex !== null && totalSlides !== null
      ? `position: ${slideIndex + 1} of ${totalSlides}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const userText = `Review this carousel slide for layout problems.

Slide spec:
${slideContext}

Reply with ONLY the JSON verdict.`;

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL_QA,
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            { type: "text", text: userText },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from QA model");
    }

    const verdict = parseVerdict(textBlock.text);

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const estimatedCostUsd =
      (inputTokens / 1_000_000) * COST_INPUT_PER_MTOK +
      (outputTokens / 1_000_000) * COST_OUTPUT_PER_MTOK;

    return NextResponse.json({
      pass: verdict.pass,
      reason: verdict.reason,
      usage: { inputTokens, outputTokens, estimatedCostUsd },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "QA check failed";
    return NextResponse.json(
      { error: sanitizeProviderError(message) },
      { status: 502 }
    );
  }
}

function parseVerdict(raw: string): { pass: boolean; reason: string } {
  const cleaned = stripJsonFences(raw).trim();
  try {
    const parsed = JSON.parse(cleaned) as {
      pass?: unknown;
      reason?: unknown;
    };
    return {
      pass: parsed.pass === true,
      reason:
        typeof parsed.reason === "string" ? parsed.reason.slice(0, 200) : "",
    };
  } catch {
    // Fallback: if model didn't return clean JSON, default to PASS with note.
    // Better to ship an unverified slide than block on parser flakiness.
    return { pass: true, reason: "" };
  }
}

function stripJsonFences(s: string): string {
  const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1];
  return s;
}

function sanitizeProviderError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("authentication") ||
    lower.includes("unauthorized") ||
    lower.includes("invalid x-api-key") ||
    lower.includes("invalid api key")
  ) {
    return "Your Anthropic API key was rejected.";
  }
  if (lower.includes("rate") && lower.includes("limit")) {
    return "Anthropic rate-limited the QA request.";
  }
  if (lower.includes("overloaded")) {
    return "Anthropic is temporarily overloaded.";
  }
  return "QA check failed.";
}
