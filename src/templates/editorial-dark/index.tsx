import type { Brand, Slide } from "@/lib/types";
import { renderHeadline } from "./render-headline";

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1350;

const BG = "#0d0918";
const TEXT = "#ffffff";
const MUTED = "rgba(255,255,255,0.55)";
const HAIRLINE = "rgba(255,255,255,0.18)";

const SERIF =
  'var(--font-fraunces), "Iowan Old Style", Georgia, serif';
const SANS =
  'var(--font-inter), -apple-system, "Helvetica Neue", Arial, sans-serif';

interface SlideProps {
  slide: Slide;
  index: number;
  total: number;
  brand: Brand;
}

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(183,148,246,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function EditorialDarkSlide({ slide, index, total, brand }: SlideProps) {
  const accent = brand.accentColor || "#b794f6";
  const isHookWithImage = slide.role === "hook" && Boolean(brand.heroImageDataUrl);

  const containerStyle: React.CSSProperties = {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    background: BG,
    color: TEXT,
    position: "relative",
    overflow: "hidden",
    fontFamily: SANS,
    boxSizing: "border-box",
  };

  return (
    <div style={containerStyle}>
      {isHookWithImage && (
        <HeroImageLayer src={brand.heroImageDataUrl as string} />
      )}
      <BrandBar brand={brand} accent={accent} />
      <div
        data-fit-box="true"
        style={{
          position: "absolute",
          inset: "180px 90px 160px 90px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        <div data-fit-content="true">
          <SlideContent slide={slide} brand={brand} accent={accent} />
        </div>
      </div>
      <FooterBar index={index} total={total} brand={brand} role={slide.role} />
      {!isHookWithImage && <Glow accent={accent} />}
      {brand.logoDataUrl && <LogoCorner src={brand.logoDataUrl} />}
    </div>
  );
}

function HeroImageLayer({ src }: { src: string }) {
  return (
    <>
      <img
        src={src}
        alt=""
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(13,9,24,0.55) 0%, rgba(13,9,24,0.78) 55%, rgba(13,9,24,0.95) 100%)",
          zIndex: 1,
        }}
      />
    </>
  );
}

function LogoCorner({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      style={{
        position: "absolute",
        top: 70,
        right: 90,
        height: 56,
        width: "auto",
        maxWidth: 200,
        objectFit: "contain",
        zIndex: 3,
        opacity: 0.9,
      }}
    />
  );
}

function Glow({ accent }: { accent: string }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse 80% 60% at 50% 30%, ${hexToRgba(accent, 0.18)}, transparent 65%)`,
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}

function BrandBar({ brand, accent }: { brand: Brand; accent: string }) {
  const text =
    brand.handle ||
    brand.displayName ||
    "TWOSETAI · HEROES BEHIND AI";
  return (
    <div
      style={{
        position: "absolute",
        top: 80,
        left: 90,
        right: 90,
        fontSize: 18,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: accent,
        fontWeight: 600,
        fontFamily: SANS,
        zIndex: 3,
      }}
    >
      {text}
    </div>
  );
}

function FooterBar({
  index,
  total,
  brand,
  role,
}: {
  index: number;
  total: number;
  brand: Brand;
  role: Slide["role"];
}) {
  const showByline = role !== "outro" && (brand.displayName || brand.handle);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 70,
        left: 90,
        right: 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: SANS,
        zIndex: 3,
      }}
    >
      <div
        style={{
          fontSize: 18,
          color: MUTED,
          fontStyle: "italic",
          fontFamily: SERIF,
        }}
      >
        {showByline ? `${brand.displayName}${brand.handle ? ` · ${brand.handle}` : ""}` : ""}
      </div>
      <div style={{ fontSize: 16, color: MUTED, letterSpacing: "0.15em" }}>
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </div>
    </div>
  );
}

function HairlineRule() {
  return (
    <div
      style={{
        height: 1,
        background: HAIRLINE,
        margin: "24px 0",
      }}
    />
  );
}

function SlideContent({
  slide,
  brand,
  accent,
}: {
  slide: Slide;
  brand: Brand;
  accent: string;
}) {
  const headlineStyle: React.CSSProperties = {
    fontFamily: SERIF,
    fontWeight: 700,
    color: TEXT,
    lineHeight: 1.05,
    letterSpacing: "-0.01em",
  };

  const bodyStyle: React.CSSProperties = {
    fontFamily: SANS,
    fontSize: 28,
    lineHeight: 1.5,
    color: "rgba(255,255,255,0.78)",
    fontWeight: 400,
  };

  switch (slide.role) {
    case "hook":
    case "setup": {
      const size = slide.role === "hook" ? 88 : 72;
      return (
        <div>
          <div style={{ ...headlineStyle, fontSize: size }}>
            {renderHeadline({
              text: slide.headline,
              accentWords: slide.accentWords,
              strikethroughWords: slide.strikethroughWords,
              accentColor: accent,
            })}
          </div>
          {slide.body && (
            <div style={{ ...bodyStyle, marginTop: 32 }}>{slide.body}</div>
          )}
        </div>
      );
    }
    case "body": {
      return (
        <div>
          <div style={{ ...headlineStyle, fontSize: 72 }}>
            {renderHeadline({
              text: slide.headline,
              accentWords: slide.accentWords,
              strikethroughWords: slide.strikethroughWords,
              accentColor: accent,
            })}
          </div>
          {slide.body && (
            <div style={{ ...bodyStyle, marginTop: 32 }}>{slide.body}</div>
          )}
        </div>
      );
    }
    case "body-stat": {
      // Defensive sizing: prompt asks for ~12 chars, but if Claude returns
      // a longer phrase, scale down so it doesn't overflow the slide.
      const len = slide.headline.length;
      const statFontSize = len <= 8 ? 220 : len <= 14 ? 160 : len <= 24 ? 110 : 84;
      return (
        <div>
          <div
            style={{
              ...headlineStyle,
              fontSize: statFontSize,
              color: accent,
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {slide.headline}
          </div>
          {slide.body && (
            <div style={{ ...bodyStyle, marginTop: 28, fontSize: 32 }}>
              {slide.body}
            </div>
          )}
          {slide.footnote && (
            <div
              style={{
                fontFamily: SANS,
                fontSize: 16,
                color: MUTED,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginTop: 28,
              }}
            >
              {slide.footnote}
            </div>
          )}
        </div>
      );
    }
    case "body-quote": {
      return (
        <div>
          <HairlineRule />
          <div
            style={{
              ...headlineStyle,
              fontSize: 64,
              fontStyle: "italic",
              fontWeight: 500,
            }}
          >
            &ldquo;{slide.headline.replace(/^["“]|["”]$/g, "")}&rdquo;
          </div>
          <HairlineRule />
          {slide.footnote && (
            <div
              style={{
                fontFamily: SANS,
                fontSize: 22,
                color: MUTED,
                marginTop: 16,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              — {slide.footnote}
            </div>
          )}
        </div>
      );
    }
    case "list": {
      const items = slide.listItems.length > 0 ? slide.listItems : [];
      return (
        <div>
          <div style={{ ...headlineStyle, fontSize: 64, marginBottom: 36 }}>
            {renderHeadline({
              text: slide.headline,
              accentWords: slide.accentWords,
              strikethroughWords: slide.strikethroughWords,
              accentColor: accent,
            })}
          </div>
          <ol
            style={{
              padding: 0,
              margin: 0,
              listStyle: "none",
            }}
          >
            {items.map((item, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 24,
                  padding: "20px 0",
                  borderTop: i === 0 ? `1px solid ${HAIRLINE}` : "none",
                  borderBottom: `1px solid ${HAIRLINE}`,
                }}
              >
                <span
                  style={{
                    fontFamily:
                      'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                    color: accent,
                    fontSize: 28,
                    fontWeight: 500,
                    minWidth: 56,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  style={{
                    fontFamily: SANS,
                    fontSize: 30,
                    color: TEXT,
                    fontWeight: 500,
                    lineHeight: 1.35,
                  }}
                >
                  {item}
                </span>
              </li>
            ))}
          </ol>
        </div>
      );
    }
    case "takeaway": {
      return (
        <div>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 18,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: accent,
              fontWeight: 600,
              marginBottom: 28,
            }}
          >
            The takeaway
          </div>
          <div style={{ ...headlineStyle, fontSize: 92, fontWeight: 700 }}>
            {renderHeadline({
              text: slide.headline,
              accentWords: slide.accentWords,
              strikethroughWords: slide.strikethroughWords,
              accentColor: accent,
            })}
          </div>
          {slide.body && (
            <div style={{ ...bodyStyle, marginTop: 32, fontSize: 30 }}>
              {slide.body}
            </div>
          )}
        </div>
      );
    }
    case "cta": {
      return (
        <div>
          <div style={{ ...headlineStyle, fontSize: 80, fontWeight: 600 }}>
            {renderHeadline({
              text: slide.headline,
              accentWords: slide.accentWords,
              strikethroughWords: slide.strikethroughWords,
              accentColor: accent,
            })}
          </div>
          {slide.body && (
            <div style={{ ...bodyStyle, marginTop: 32 }}>{slide.body}</div>
          )}
          <div
            style={{
              marginTop: 48,
              display: "inline-block",
              padding: "20px 36px",
              border: `2px solid ${accent}`,
              borderRadius: 999,
              color: accent,
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: 22,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {slide.footnote || "Save · Share"}
          </div>
          {brand.url && (
            <div
              style={{
                marginTop: 36,
                fontFamily: SANS,
                fontSize: 22,
                color: TEXT,
                fontWeight: 500,
                letterSpacing: "0.02em",
              }}
            >
              {brand.url}
            </div>
          )}
        </div>
      );
    }
    case "outro": {
      const display = brand.displayName || "TwoSetAI";
      const handle = brand.handle || "Heroes Behind AI";
      return (
        <div>
          <div style={{ ...headlineStyle, fontSize: 72, fontWeight: 600 }}>
            {slide.headline}
          </div>
          <HairlineRule />
          <div
            style={{
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: 36,
              color: TEXT,
              marginTop: 12,
            }}
          >
            {display}
          </div>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 22,
              color: MUTED,
              marginTop: 8,
              letterSpacing: "0.04em",
            }}
          >
            {handle}
          </div>
          {brand.url && (
            <div
              style={{
                fontFamily: SANS,
                fontSize: 20,
                color: TEXT,
                marginTop: 14,
                fontWeight: 500,
              }}
            >
              {brand.url}
            </div>
          )}
          <div
            style={{
              fontFamily: SANS,
              fontSize: 20,
              color: accent,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginTop: 56,
            }}
          >
            Follow for more →
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
