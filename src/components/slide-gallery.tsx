"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  EditorialDarkSlide,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
} from "@/templates/editorial-dark";
import type { Brand, LeanAngle, Slide } from "@/lib/types";

interface SlideGalleryProps {
  slides: Slide[];
  brand: Brand;
  apiKey: string | null;
  post: string;
  angle: LeanAngle;
  verificationKey: string | null;
  onSlidesUpdate: (slides: Slide[]) => void;
  onCostUpdate: (deltaUsd: number) => void;
  onVerificationDone?: () => void;
}

const PREVIEW_WIDTH = 360;
const PREVIEW_SCALE = PREVIEW_WIDTH / SLIDE_WIDTH;
const PREVIEW_HEIGHT = SLIDE_HEIGHT * PREVIEW_SCALE;

const FIT_SCALES = [1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7];
const MAX_REGEN_ATTEMPTS = 2;

function fitSlideToBox(slideEl: HTMLDivElement): void {
  const fitBox = slideEl.querySelector<HTMLDivElement>('[data-fit-box="true"]');
  const fitContent = slideEl.querySelector<HTMLDivElement>(
    '[data-fit-content="true"]',
  );
  if (!fitBox || !fitContent) return;

  const originals = new Map<HTMLElement, number>();
  fitContent.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const fs = el.style.fontSize;
    if (!fs) return;
    const num = parseFloat(fs);
    if (Number.isFinite(num)) originals.set(el, num);
  });
  if (originals.size === 0) return;

  for (const scale of FIT_SCALES) {
    originals.forEach((origPx, el) => {
      el.style.fontSize = `${origPx * scale}px`;
    });
    const fitsHeight = fitContent.offsetHeight <= fitBox.clientHeight;
    const fitsWidth = fitContent.scrollWidth <= fitBox.clientWidth;
    if (fitsHeight && fitsWidth) return;
  }
}

async function captureSlidePng(el: HTMLDivElement): Promise<string> {
  fitSlideToBox(el);
  return toPng(el, {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    pixelRatio: 1,
    cacheBust: false,
    skipFonts: true,
    fontEmbedCSS: "",
  });
}

function waitForRender(): Promise<void> {
  // Two RAFs to ensure React commit + browser paint, plus a tiny safety delay.
  return new Promise((resolve) => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setTimeout(resolve, 50)),
    );
  });
}

interface QaResponse {
  pass?: boolean;
  reason?: string;
  usage?: { estimatedCostUsd?: number };
  error?: string;
}

interface RegenResponse {
  slide?: Slide;
  usage?: { estimatedCostUsd?: number };
  error?: string;
}

export function SlideGallery({
  slides,
  brand,
  apiKey,
  post,
  angle,
  verificationKey,
  onSlidesUpdate,
  onCostUpdate,
  onVerificationDone,
}: SlideGalleryProps) {
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const slidesRef = useRef<Slide[]>(slides);
  slidesRef.current = slides;

  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [verifying, setVerifying] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    msg: string;
  } | null>(null);
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());

  const lastVerifiedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!verificationKey || verificationKey === lastVerifiedKey.current) return;
    if (!apiKey) {
      // Without an API key we can't run QA — skip silently.
      lastVerifiedKey.current = verificationKey;
      onVerificationDone?.();
      return;
    }
    lastVerifiedKey.current = verificationKey;

    let cancelled = false;
    setVerifying(true);
    setFailedIndices(new Set());

    const run = async () => {
      try {
        await document.fonts.ready;
        await waitForRender();

        const total = slidesRef.current.length;
        const newFailed = new Set<number>();

        for (let i = 0; i < total; i++) {
          if (cancelled) return;

          let passed = false;
          const previousAttempts: Slide[] = [];
          let lastReason = "";

          for (let attempt = 0; attempt <= MAX_REGEN_ATTEMPTS; attempt++) {
            if (cancelled) return;

            setProgress({
              current: i + 1,
              total,
              msg:
                attempt === 0
                  ? `Reviewing slide ${i + 1} of ${total}…`
                  : `Refining slide ${i + 1} (attempt ${attempt + 1})…`,
            });

            // Wait for React to render the (possibly just-regenerated) slide.
            await waitForRender();

            const el = slideRefs.current[i];
            if (!el) {
              // Ref missing — bail this slide.
              break;
            }

            let pngDataUrl: string;
            try {
              pngDataUrl = await captureSlidePng(el);
            } catch {
              // Capture failed — pass through, don't block.
              passed = true;
              break;
            }

            // Run QA
            let verdict: { pass: boolean; reason: string };
            try {
              const res = await fetch("/api/qa-slide", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-claude-api-key": apiKey,
                },
                body: JSON.stringify({
                  imageDataUrl: pngDataUrl,
                  slide: slidesRef.current[i],
                  slideIndex: i,
                  totalSlides: total,
                }),
              });
              const data = (await res.json()) as QaResponse;
              if (!res.ok) {
                // QA endpoint failed — assume pass to avoid blocking the user.
                passed = true;
                break;
              }
              if (data.usage?.estimatedCostUsd) {
                onCostUpdate(data.usage.estimatedCostUsd);
              }
              verdict = {
                pass: data.pass === true,
                reason: data.reason || "",
              };
            } catch {
              passed = true;
              break;
            }

            if (verdict.pass) {
              passed = true;
              break;
            }

            lastReason = verdict.reason;

            // Out of retries?
            if (attempt >= MAX_REGEN_ATTEMPTS) break;

            // Regen
            previousAttempts.push(slidesRef.current[i]);

            try {
              const res = await fetch("/api/regen-slide", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-claude-api-key": apiKey,
                },
                body: JSON.stringify({
                  post,
                  brand: { displayName: brand.displayName, handle: brand.handle },
                  angle,
                  slide: slidesRef.current[i],
                  slideIndex: i,
                  totalSlides: total,
                  failureReason: lastReason,
                  previousAttempts,
                }),
              });
              const data = (await res.json()) as RegenResponse;
              if (!res.ok || !data.slide) {
                // Regen failed — keep current slide, mark as failed-after-cap.
                break;
              }
              if (data.usage?.estimatedCostUsd) {
                onCostUpdate(data.usage.estimatedCostUsd);
              }
              const updated = [...slidesRef.current];
              updated[i] = data.slide;
              onSlidesUpdate(updated);
              // slidesRef will refresh on next render via the line at the top.
              // Wait for parent state propagation + re-render before next attempt.
              await waitForRender();
            } catch {
              break;
            }
          }

          if (!passed) newFailed.add(i);
        }

        if (!cancelled) {
          setFailedIndices(newFailed);
          setProgress(null);
          setVerifying(false);
          onVerificationDone?.();
        }
      } catch {
        if (!cancelled) {
          setProgress(null);
          setVerifying(false);
          onVerificationDone?.();
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verificationKey]);

  const handleDownloadPdf = async () => {
    setExporting(true);
    setError(null);
    try {
      await document.fonts.ready;
      const pngs: string[] = [];
      for (const el of slideRefs.current) {
        if (!el) continue;
        fitSlideToBox(el);
        const dataUrl = await toPng(el, {
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          pixelRatio: 1,
          cacheBust: false,
          skipFonts: true,
          fontEmbedCSS: "",
        });
        pngs.push(dataUrl);
      }
      if (pngs.length === 0) throw new Error("No slides to export.");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [SLIDE_WIDTH, SLIDE_HEIGHT],
        compress: true,
      });
      pngs.forEach((dataUrl, i) => {
        if (i > 0) pdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT], "portrait");
        pdf.addImage(dataUrl, "PNG", 0, 0, SLIDE_WIDTH, SLIDE_HEIGHT);
      });
      pdf.save(`carousel-${Date.now()}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  // Hidden capture container is always rendered (so refs are populated for
  // verification AND for download). The visible UI swaps between progress and
  // gallery based on `verifying`.
  return (
    <div className="flex flex-col gap-4">
      {verifying ? (
        <VerificationProgress progress={progress} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {slides.length} slide{slides.length === 1 ? "" : "s"}
              {failedIndices.size > 0 && (
                <span style={{ color: "#fbbf24", marginLeft: 8 }}>
                  · {failedIndices.size} may need a manual edit
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={exporting}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: "var(--accent)" }}
            >
              {exporting ? "Rendering..." : "Download PDF"}
            </button>
          </div>

          {error && (
            <p
              className="rounded border px-3 py-2 text-sm"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                borderColor: "rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
              }}
            >
              {error}
            </p>
          )}

          {/* Visible scaled previews */}
          <div className="grid gap-6" style={{ gridTemplateColumns: "1fr" }}>
            {slides.map((slide, i) => (
              <div
                key={i}
                style={{
                  position: "relative",
                  width: PREVIEW_WIDTH,
                  height: PREVIEW_HEIGHT,
                  borderRadius: 12,
                  overflow: "hidden",
                  border: failedIndices.has(i)
                    ? "1px solid rgba(251, 191, 36, 0.6)"
                    : "1px solid var(--border-primary)",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: SLIDE_WIDTH,
                    height: SLIDE_HEIGHT,
                    transform: `scale(${PREVIEW_SCALE})`,
                    transformOrigin: "top left",
                  }}
                >
                  <EditorialDarkSlide
                    slide={slide}
                    index={i}
                    total={slides.length}
                    brand={brand}
                  />
                </div>
                {failedIndices.has(i) && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      background: "rgba(251, 191, 36, 0.95)",
                      color: "#1a1a1a",
                      pointerEvents: "none",
                    }}
                  >
                    May need edit
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Hidden full-size slides for capture. Always mounted.
          Key includes role + headline so a regenerated slide gets a fresh
          DOM tree (no stale fontSize mutations from prior fit passes). */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: -99999,
          top: 0,
          width: SLIDE_WIDTH,
          pointerEvents: "none",
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={`${i}-${slide.role}-${slide.headline.slice(0, 40)}`}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT }}
          >
            <EditorialDarkSlide
              slide={slide}
              index={i}
              total={slides.length}
              brand={brand}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function VerificationProgress({
  progress,
}: {
  progress: { current: number; total: number; msg: string } | null;
}) {
  const pct = progress
    ? Math.round(((progress.current - 1) / Math.max(1, progress.total)) * 100)
    : 0;
  return (
    <div
      className="flex flex-col gap-3 rounded-lg p-6"
      style={{
        background: "var(--bg-input)",
        border: "1px solid var(--border-secondary)",
      }}
    >
      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Polishing your carousel
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {progress?.msg ?? "Reviewing slides…"}
      </p>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          overflow: "hidden",
          background: "var(--border-secondary)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "var(--accent)",
            transition: "width 200ms ease-out",
          }}
        />
      </div>
      <p className="text-xs" style={{ color: "var(--text-faint)" }}>
        Each slide gets reviewed and rewritten if it has layout issues.
        Up to {MAX_REGEN_ATTEMPTS} retries per slide.
      </p>
    </div>
  );
}
