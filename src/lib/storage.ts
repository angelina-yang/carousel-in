import { DEFAULT_ACCENT, type Brand, type LeanAngle, type Slide } from "./types";

const KEY = {
  schemaVersion: "carouselin:schemaVersion",
  registered: "carouselin:registered",
  apiKey: "carouselin:apiKey",
  brand: "carouselin:brand",
  lastPost: "carouselin:lastPost",
  lastSlides: "carouselin:lastSlides",
  leanAngle: "carouselin:leanAngle",
  sessionCost: "carouselin:sessionCost",
  theme: "carouselin:theme",
} as const;

export const SCHEMA_VERSION = 1;

export type Theme = "dark" | "light";

export interface RegisteredIdentity {
  name: string;
  email: string;
  newsletterOptIn: boolean;
  timestamp: number;
}

function safeGet(key: string): string | null {
  try {
    return typeof window !== "undefined"
      ? window.localStorage.getItem(key)
      : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // localStorage can throw (quota, disabled) — drop silently.
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key);
    }
  } catch {
    // noop
  }
}

function readJSON<T>(key: string): T | null {
  const raw = safeGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  safeSet(key, JSON.stringify(value));
}

export function readIdentity(): RegisteredIdentity | null {
  return readJSON<RegisteredIdentity>(KEY.registered);
}

export function writeIdentity(identity: RegisteredIdentity): void {
  writeJSON(KEY.registered, identity);
  safeSet(KEY.schemaVersion, String(SCHEMA_VERSION));
}

export function readApiKey(): string | null {
  return safeGet(KEY.apiKey);
}

export function writeApiKey(key: string): void {
  safeSet(KEY.apiKey, key.trim());
}

export function clearApiKey(): void {
  safeRemove(KEY.apiKey);
}

export function readTheme(): Theme {
  return (safeGet(KEY.theme) as Theme | null) ?? "dark";
}

export function writeTheme(theme: Theme): void {
  safeSet(KEY.theme, theme);
}

const DEFAULT_BRAND: Brand = {
  displayName: "",
  handle: "",
  url: "",
  accentColor: DEFAULT_ACCENT,
  logoDataUrl: null,
  heroImageDataUrl: null,
};

export function readBrand(): Brand {
  const stored = readJSON<Partial<Brand>>(KEY.brand);
  if (!stored) return DEFAULT_BRAND;
  return {
    displayName: typeof stored.displayName === "string" ? stored.displayName : "",
    handle: typeof stored.handle === "string" ? stored.handle : "",
    url: typeof stored.url === "string" ? stored.url : "",
    accentColor:
      typeof stored.accentColor === "string" && /^#[0-9a-f]{6}$/i.test(stored.accentColor)
        ? stored.accentColor
        : DEFAULT_ACCENT,
    logoDataUrl:
      typeof stored.logoDataUrl === "string" && stored.logoDataUrl.startsWith("data:image/")
        ? stored.logoDataUrl
        : null,
    heroImageDataUrl:
      typeof stored.heroImageDataUrl === "string" && stored.heroImageDataUrl.startsWith("data:image/")
        ? stored.heroImageDataUrl
        : null,
  };
}

export function writeBrand(brand: Brand): void {
  writeJSON(KEY.brand, brand);
}

export function readLastPost(): string {
  return safeGet(KEY.lastPost) ?? "";
}

export function writeLastPost(text: string): void {
  safeSet(KEY.lastPost, text);
}

export function readLastSlides(): Slide[] | null {
  return readJSON<Slide[]>(KEY.lastSlides);
}

export function writeLastSlides(slides: Slide[]): void {
  writeJSON(KEY.lastSlides, slides);
}

export function readLeanAngle(): LeanAngle {
  return (safeGet(KEY.leanAngle) as LeanAngle | null) ?? "decide";
}

export function writeLeanAngle(angle: LeanAngle): void {
  safeSet(KEY.leanAngle, angle);
}

export function readSessionCost(): number {
  const raw = safeGet(KEY.sessionCost);
  const n = raw === null ? 0 : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function writeSessionCost(cost: number): void {
  safeSet(KEY.sessionCost, String(cost));
}
