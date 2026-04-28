import type { ReactNode } from "react";

interface RenderHeadlineArgs {
  text: string;
  accentWords: string[];
  strikethroughWords: string[];
  accentColor: string;
}

export function renderHeadline({
  text,
  accentWords,
  strikethroughWords,
  accentColor,
}: RenderHeadlineArgs): ReactNode {
  const accentSet = new Set(accentWords.map((w) => w.toLowerCase()));
  const strikeSet = new Set(strikethroughWords.map((w) => w.toLowerCase()));

  const tokens = text.split(/(\s+)/);
  return tokens.map((tok, i) => {
    if (/^\s+$/.test(tok)) return tok;
    const stripped = tok.replace(/[^\p{L}\p{N}'-]/gu, "").toLowerCase();
    const isAccent = stripped.length > 0 && accentSet.has(stripped);
    const isStrike = stripped.length > 0 && strikeSet.has(stripped);

    if (isStrike) {
      return (
        <span
          key={i}
          style={{
            position: "relative",
            display: "inline-block",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          {tok}
          <span
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "55%",
              height: "5px",
              background: accentColor,
              transform: "rotate(-3deg)",
              borderRadius: "2px",
            }}
          />
        </span>
      );
    }
    if (isAccent) {
      return (
        <span
          key={i}
          style={{
            color: accentColor,
            fontStyle: "italic",
          }}
        >
          {tok}
        </span>
      );
    }
    return <span key={i}>{tok}</span>;
  });
}
