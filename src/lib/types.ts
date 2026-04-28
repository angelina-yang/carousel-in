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
}

export type LeanAngle = "decide" | "tension" | "framework" | "story" | "contrarian";
