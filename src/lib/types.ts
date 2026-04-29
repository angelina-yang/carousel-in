export type SlideRole =
  | "hook"
  | "setup"
  | "body"
  | "body-stat"
  | "body-quote"
  | "list"
  | "takeaway"
  | "cta"
  | "outro";

export interface Slide {
  role: SlideRole;
  headline: string;
  body: string | null;
  accentWords: string[];
  strikethroughWords: string[];
  footnote: string | null;
  listItems: string[];
}

export interface Brand {
  displayName: string;
  handle: string;
  url: string;
  accentColor: string;
  logoDataUrl: string | null;
  heroImageDataUrl: string | null;
}

export const DEFAULT_ACCENT = "#b794f6";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB pre-encode

export type LeanAngle = "decide" | "tension" | "framework" | "story" | "contrarian";
