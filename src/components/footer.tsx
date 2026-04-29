"use client";

import { SupportLinks } from "./support-links";

interface Props {
  sessionCost: number;
  lastCost: number | null;
}

export function Footer({ sessionCost, lastCost }: Props) {
  return (
    <footer
      className="px-1 py-4 flex items-center justify-between gap-3 flex-wrap pt-4"
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      <div
        className="text-xs leading-relaxed flex items-center gap-1.5 flex-wrap"
        style={{ color: "var(--text-muted)" }}
      >
        <span>Made with ☕ by</span>
        <a
          href="https://twosetai.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold transition-colors hover:underline"
          style={{ color: "var(--accent)" }}
        >
          TwoSetAI
        </a>
        <span style={{ color: "var(--text-faint)" }}>·</span>
        <span>
          Session: ${sessionCost.toFixed(4)}
          {lastCost !== null ? ` · last $${lastCost.toFixed(4)}` : ""}
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        <SupportLinks appName="Carousel;IN" />
        <span style={{ color: "var(--text-faint)" }}>·</span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Like this tool? ☕
        </span>
        <a
          href="https://buymeacoffee.com/angelinayang"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: "var(--accent-surface)",
            color: "var(--accent)",
            border: "1px solid var(--accent)",
          }}
        >
          Buy me a coffee
        </a>
      </div>
    </footer>
  );
}
