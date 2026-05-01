"use client";

import { useEffect, useState } from "react";
import { WelcomeModal } from "./welcome-modal";
import { SettingsModal } from "./settings-modal";
import { SlideGallery } from "./slide-gallery";
import { AppHeader } from "./app-header";
import { Footer } from "./footer";
import {
  readApiKey,
  readBrand,
  readIdentity,
  readLastPost,
  readLastSlides,
  readLeanAngle,
  readSessionCost,
  readTheme,
  writeBrand,
  writeIdentity,
  writeLastPost,
  writeLastSlides,
  writeLeanAngle,
  writeSessionCost,
  writeTheme,
  type RegisteredIdentity,
  type Theme,
} from "@/lib/storage";
import { DEFAULT_ACCENT, type Brand, type LeanAngle, type Slide } from "@/lib/types";

const ANGLES: { id: LeanAngle; label: string }[] = [
  { id: "decide", label: "Decide for me" },
  { id: "tension", label: "Tension" },
  { id: "framework", label: "Framework" },
  { id: "story", label: "Story" },
  { id: "contrarian", label: "Contrarian" },
];

const MAX_POST_CHARS = 3000;

export function Workspace() {
  const [identity, setIdentity] = useState<RegisteredIdentity | null | undefined>(
    undefined
  );
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [brand, setBrand] = useState<Brand>({
    displayName: "",
    handle: "",
    url: "",
    accentColor: DEFAULT_ACCENT,
    logoDataUrl: null,
    heroImageDataUrl: null,
  });
  const [post, setPost] = useState("");
  const [angle, setAngle] = useState<LeanAngle>("decide");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sessionCost, setSessionCost] = useState(0);
  const [lastCost, setLastCost] = useState<number | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [verificationKey, setVerificationKey] = useState<string | null>(null);
  const [generationPost, setGenerationPost] = useState("");
  const [generationAngle, setGenerationAngle] = useState<LeanAngle>("decide");

  useEffect(() => {
    setIdentity(readIdentity());
    setApiKey(readApiKey());
    setBrand(readBrand());
    setPost(readLastPost());
    setAngle(readLeanAngle());
    const savedSlides = readLastSlides();
    if (savedSlides) setSlides(savedSlides);
    setSessionCost(readSessionCost());
    const savedTheme = readTheme();
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
    document.documentElement.classList.toggle("light", savedTheme === "light");
  }, []);

  const handleToggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    writeTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.classList.toggle("light", next === "light");
  };

  const handleRegistered = (name: string, email: string) => {
    const record: RegisteredIdentity = {
      name,
      email,
      newsletterOptIn: false,
      timestamp: Date.now(),
    };
    writeIdentity(record);
    setIdentity(record);
  };

  const handlePostChange = (text: string) => {
    setPost(text);
    writeLastPost(text);
  };

  const handleAngleChange = (a: LeanAngle) => {
    setAngle(a);
    writeLeanAngle(a);
  };

  const canGenerate =
    Boolean(apiKey) && post.trim().length >= 50 && !generating;

  const handleGenerate = async () => {
    if (!apiKey) {
      setSettingsOpen(true);
      return;
    }
    if (!canGenerate) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-claude-api-key": apiKey,
        },
        body: JSON.stringify({
          post: post.trim(),
          brand: { displayName: brand.displayName, handle: brand.handle },
          angle,
          model: "polished",
        }),
      });
      const data = (await res.json()) as {
        slides?: Slide[];
        usage?: { estimatedCostUsd: number };
        error?: string;
      };
      if (!res.ok || !data.slides) {
        throw new Error(data.error || `Draft failed (${res.status})`);
      }
      setSlides(data.slides);
      writeLastSlides(data.slides);
      // Snapshot the post + angle that produced these slides so the QA pass
      // can ground its regens in the same source material the user submitted.
      setGenerationPost(post.trim());
      setGenerationAngle(angle);
      // Trigger one verification pass for this fresh batch.
      setVerificationKey(`gen-${Date.now()}`);
      if (data.usage?.estimatedCostUsd) {
        const next = sessionCost + data.usage.estimatedCostUsd;
        setSessionCost(next);
        writeSessionCost(next);
        setLastCost(data.usage.estimatedCostUsd);
      }
      // Hook image is per-carousel: clear after a successful generation so
      // the next carousel doesn't auto-inherit it. Logo/byline/color stay.
      if (brand.heroImageDataUrl) {
        const cleared = { ...brand, heroImageDataUrl: null };
        setBrand(cleared);
        writeBrand(cleared);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft failed");
    } finally {
      setGenerating(false);
    }
  };

  if (identity === undefined) return null;

  return (
    <>
      <WelcomeModal isOpen={identity === null} onComplete={handleRegistered} />

      {identity && (
        <div className="flex flex-col gap-6">
          <AppHeader
            hasApiKey={Boolean(apiKey)}
            theme={theme}
            onOpenSettings={() => setSettingsOpen(true)}
            onToggleTheme={handleToggleTheme}
          />

          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Paste a LinkedIn post. Get back a swipeable carousel that looks
            like a magazine.
          </p>

          <section className="flex flex-col gap-2">
            <label
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              Your post
            </label>
            <textarea
              value={post}
              onChange={(e) => handlePostChange(e.target.value)}
              placeholder="Paste the LinkedIn post you want to turn into a carousel..."
              rows={10}
              maxLength={MAX_POST_CHARS}
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-1 resize-y"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-secondary)",
                color: "var(--text-primary)",
                fontFamily: "inherit",
                lineHeight: 1.5,
              }}
            />
            <div
              className="flex items-center justify-between text-xs"
              style={{ color: "var(--text-faint)" }}
            >
              <span>
                {post.length < 50
                  ? `${50 - post.length} more chars to enable Generate`
                  : "Ready to generate"}
              </span>
              <span>
                {post.length} / {MAX_POST_CHARS}
              </span>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <label
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              Lean angle (hook)
            </label>
            <div className="flex flex-wrap gap-2">
              {ANGLES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handleAngleChange(a.id)}
                  className="text-xs px-3 py-1.5 rounded-full"
                  style={{
                    border: `1px solid ${
                      angle === a.id ? "var(--accent)" : "var(--border-secondary)"
                    }`,
                    background:
                      angle === a.id ? "var(--accent-surface)" : "transparent",
                    color:
                      angle === a.id ? "var(--accent)" : "var(--text-muted)",
                    fontWeight: angle === a.id ? 600 : 400,
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
              The number of slides is decided automatically based on the post.
            </p>
          </section>

          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={!apiKey ? false : !canGenerate}
            className="rounded-lg px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            {generating
              ? "Drafting carousel..."
              : apiKey
                ? "Generate carousel"
                : "Add API key to generate"}
          </button>

          {error && (
            <p
              className="rounded border px-4 py-3 text-sm"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                borderColor: "rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
              }}
            >
              {error}
            </p>
          )}

          {slides.length > 0 && (
            <section className="pt-4">
              <SlideGallery
                slides={slides}
                brand={brand}
                apiKey={apiKey}
                post={generationPost || post.trim()}
                angle={generationAngle}
                verificationKey={verificationKey}
                onSlidesUpdate={(next) => {
                  setSlides(next);
                  writeLastSlides(next);
                }}
                onCostUpdate={(delta) => {
                  setSessionCost((prev) => {
                    const updated = prev + delta;
                    writeSessionCost(updated);
                    return updated;
                  });
                  setLastCost((prev) => (prev ?? 0) + delta);
                }}
                onVerificationDone={() => {
                  setVerificationKey(null);
                }}
              />
            </section>
          )}

          <Footer sessionCost={sessionCost} lastCost={lastCost} />

          <SettingsModal
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            onApiKeyChange={setApiKey}
            onBrandChange={setBrand}
          />
        </div>
      )}
    </>
  );
}
