"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  EditorialDarkSlide,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
} from "@/templates/editorial-dark";
import type { Brand, Slide } from "@/lib/types";

interface SlideGalleryProps {
  slides: Slide[];
  brand: Brand;
}

const PREVIEW_WIDTH = 360;
const PREVIEW_SCALE = PREVIEW_WIDTH / SLIDE_WIDTH;
const PREVIEW_HEIGHT = SLIDE_HEIGHT * PREVIEW_SCALE;

const FIT_SCALES = [1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7];

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

export function SlideGallery({ slides, brand }: SlideGalleryProps) {
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {slides.length} slide{slides.length === 1 ? "" : "s"}
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
              width: PREVIEW_WIDTH,
              height: PREVIEW_HEIGHT,
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid var(--border-primary)",
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
          </div>
        ))}
      </div>

      {/* Hidden full-size slides for capture */}
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
            key={i}
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
