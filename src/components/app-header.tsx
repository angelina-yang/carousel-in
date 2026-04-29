"use client";

interface Props {
  hasApiKey: boolean;
  onOpenSettings: () => void;
}

export function AppHeader({ hasApiKey, onOpenSettings }: Props) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "var(--accent)" }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="13" height="17" rx="2" />
            <rect x="8" y="6" width="13" height="17" rx="2" />
          </svg>
        </div>
        <div className="min-w-0">
          <h1
            className="text-lg font-bold leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Carousel;IN
          </h1>
          <p
            className="text-xs hidden sm:block"
            style={{ color: "var(--text-muted)" }}
          >
            LinkedIn post → swipeable carousel
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="https://buymeacoffee.com/angelinayang"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg transition-colors hover:text-yellow-400"
          style={{
            color: "var(--text-secondary)",
            border: "1px solid var(--border-secondary)",
          }}
          title="Buy me a coffee"
          aria-label="Buy me a coffee"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 21h18v-2H2v2zM20 8h-2V5h2v3zm0-5H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm-4 10c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V5h10v8zm4-5h-2V5h2v3z" />
          </svg>
        </a>
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 rounded-lg transition-colors hover:opacity-80"
          style={{
            color: hasApiKey ? "var(--text-secondary)" : undefined,
            border: "1px solid var(--border-secondary)",
          }}
          title={hasApiKey ? "Settings" : "Add your Anthropic API key to get started"}
          aria-label="Settings"
        >
          {!hasApiKey ? (
            <span className="text-yellow-400 animate-pulse inline-flex">
              <GearIcon />
            </span>
          ) : (
            <GearIcon />
          )}
        </button>
      </div>
    </header>
  );
}

function GearIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
