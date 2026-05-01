// POST /api/regen-slide
// Regenerate a single slide that failed QA. Sonnet 4.6.
// Input: { post, brand, angle, slide, slideIndex, totalSlides, failureReason, previousAttempts }
// Header: x-claude-api-key
// Output: { slide, usage }

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { parseSlideResponse } from "@/lib/prompts";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { DEFAULT_ACCENT, type Brand, type LeanAngle, type Slide } from "@/lib/types";

export const maxDuration = 60;

const MAX_REGEN_PER_HOUR = 100;
const MODEL_REGEN = "claude-sonnet-4-6";
const COST_INPUT_PER_MTOK = 3.0;
const COST_OUTPUT_PER_MTOK = 15.0;
const MAX_POST_CHARS = 3000;
const MAX_BRAND_CHARS = 80;

const VALID_ANGLES: LeanAngle[] = [
  "decide",
  "tension",
  "framework",
  "story",
  "contrarian",
];

function parseBrand(raw: unknown): Brand {
  const empty: Brand = {
    displayName: "",
    handle: "",
    url: "",
    accentColor: DEFAULT_ACCENT,
    logoDataUrl: null,
    heroImageDataUrl: null,
  };
  if (!raw || typeof raw !== "object") return empty;
  const rec = raw as { displayName?: unknown; handle?: unknown };
  return {
    ...empty,
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

function buildRegenPrompt(args: {
  post: string;
  brand: Brand;
  angle: LeanAngle;
  slide: Slide;
  slideIndex: number;
  totalSlides: number;
  failureReason: string;
  previousAttempts: Slide[];
}): { system: string; user: string } {
  const {
    post,
    brand,
    angle,
    slide,
    slideIndex,
    totalSlides,
    failureReason,
    previousAttempts,
  } = args;

  const brandLine =
    brand.displayName || brand.handle
      ? `Brand byline: ${[brand.displayName, brand.handle].filter(Boolean).join(" · ")}`
      : "Brand byline: not set";

  const position =
    slideIndex === 0
      ? "the HOOK (slide 1, the attention-grabber)"
      : slideIndex === totalSlides - 1
        ? `the OUTRO (last slide, ${slideIndex + 1} of ${totalSlides})`
        : slideIndex === totalSlides - 2
          ? `the CTA (second-to-last, ${slideIndex + 1} of ${totalSlides})`
          : `slide ${slideIndex + 1} of ${totalSlides}`;

  const previousAttemptsBlock = previousAttempts
    .map(
      (att, i) =>
        `Attempt ${i + 1}:\n${JSON.stringify({ ...att, accentWords: att.accentWords, strikethroughWords: att.strikethroughWords }, null, 2)}`
    )
    .join("\n\n");

  const system = `You are an editorial designer fixing a single carousel slide that failed visual layout QA.

The previous attempt(s) for this slide rendered with a layout problem. Rewrite this ONE slide so it lays out cleanly.

POSITION
This is ${position} in a ${totalSlides}-slide carousel.

CURRENT ROLE
"${slide.role}"

WHY THE PREVIOUS ATTEMPT FAILED
${failureReason || "Layout overflow or text overlap."}

HOW TO FIX
- Make headlines SHORTER. Aim for fewer characters and avoid newlines (\\n) in any field.
- For "body-stat" role, the headline MUST be a single short stat (e.g. "73%", "8,300+", "$1.2M") of 12 chars or fewer. NEVER include arrows, comparisons, or newlines in a stat headline. If you need a comparison, change the role to "body" and put the full sentence in the headline.
- For "list" role, keep listItems to 3-4 entries, each under 70 chars.
- For "cta" role, keep footnote (the button text) to 2-3 short words like "Save · Share" or "Try it now". Never long phrases.
- Keep body under 140 chars when possible. Punchy, not paragraph.
- Preserve the slide's role unless the role itself is the problem (e.g. body-stat with a comparison should become "body").

OUTPUT FORMAT
Return a single JSON object, nothing else. No prose, no markdown fences. Schema:

{
  "slide": {
    "role": "<one of: hook, setup, body, body-stat, body-quote, list, takeaway, cta, outro>",
    "headline": "<10-100 chars, NO newlines>",
    "body": "<0-180 chars or null>",
    "accentWords": ["<word>", "..."],
    "strikethroughWords": ["<word>", "..."],
    "footnote": "<short caption or null>",
    "listItems": ["<item>", "..."]
  }
}

RULES
- accentWords and strikethroughWords MUST be exact words from the headline (case-insensitive match).
- For non-list slides, listItems MUST be [].
- For list slides, listItems has 3-4 entries; body can be null.
- Never invent facts not in the source post.

ANGLE
${angle === "decide" ? "Use whatever angle fits this slide best." : `Lean angle: ${angle}.`}

${brandLine}`;

  const user = `Source LinkedIn post (your facts must come from here):

<post>
${post}
</post>

Previous attempt(s) for this slide:

${previousAttemptsBlock}

Return only the JSON object with the rewritten slide.`;

  return { system, user };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (isRateLimited(`regen:${ip}`, MAX_REGEN_PER_HOUR, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many regenerations this hour. Please slow down." },
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
    post?: unknown;
    brand?: unknown;
    angle?: unknown;
    slide?: unknown;
    slideIndex?: unknown;
    totalSlides?: unknown;
    failureReason?: unknown;
    previousAttempts?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const post = typeof body.post === "string" ? body.post.trim() : "";
  if (post.length < 50 || post.length > MAX_POST_CHARS) {
    return NextResponse.json(
      { error: "Invalid post length." },
      { status: 400 }
    );
  }

  const brand = parseBrand(body.brand);
  const angle: LeanAngle =
    typeof body.angle === "string" && (VALID_ANGLES as string[]).includes(body.angle)
      ? (body.angle as LeanAngle)
      : "decide";

  const slide = body.slide as Slide | undefined;
  if (!slide || typeof slide !== "object" || typeof slide.role !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid slide spec." },
      { status: 400 }
    );
  }

  const slideIndex = typeof body.slideIndex === "number" ? body.slideIndex : 0;
  const totalSlides = typeof body.totalSlides === "number" ? body.totalSlides : 1;
  const failureReason =
    typeof body.failureReason === "string"
      ? body.failureReason.slice(0, 400)
      : "";
  const previousAttempts = Array.isArray(body.previousAttempts)
    ? (body.previousAttempts as Slide[]).slice(0, 3)
    : [slide];

  const { system, user } = buildRegenPrompt({
    post,
    brand,
    angle,
    slide,
    slideIndex,
    totalSlides,
    failureReason,
    previousAttempts,
  });

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL_REGEN,
      max_tokens: 800,
      system,
      messages: [{ role: "user", content: user }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from regen model");
    }

    // Wrap in a slides[] envelope so we can reuse parseSlideResponse.
    let parsed;
    try {
      const obj = JSON.parse(stripJsonFences(textBlock.text));
      const single = (obj as { slide?: unknown }).slide;
      const wrapped = JSON.stringify({ slides: single ? [single] : [obj] });
      parsed = parseSlideResponse(wrapped);
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? `Could not parse regen output: ${err.message}`
          : "Could not parse regen output."
      );
    }

    const newSlide = parsed.slides[0];
    if (!newSlide) throw new Error("Regen returned no valid slide.");

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const estimatedCostUsd =
      (inputTokens / 1_000_000) * COST_INPUT_PER_MTOK +
      (outputTokens / 1_000_000) * COST_OUTPUT_PER_MTOK;

    return NextResponse.json({
      slide: newSlide,
      usage: { inputTokens, outputTokens, estimatedCostUsd },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Slide regeneration failed";
    return NextResponse.json(
      { error: sanitizeProviderError(message) },
      { status: 502 }
    );
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
    return "Anthropic rate-limited the regen request.";
  }
  if (lower.includes("overloaded")) {
    return "Anthropic is temporarily overloaded.";
  }
  if (lower.includes("parse")) {
    return "Regen returned an unparseable response. Try again.";
  }
  return "Slide regeneration failed.";
}
