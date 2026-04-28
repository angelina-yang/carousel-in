"use client";

import { useEffect, useState } from "react";
import {
  clearApiKey,
  readApiKey,
  readBrand,
  writeApiKey,
  writeBrand,
} from "@/lib/storage";
import type { Brand } from "@/lib/types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeyChange: (key: string | null) => void;
  onBrandChange: (brand: Brand) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  onApiKeyChange,
  onBrandChange,
}: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setApiKey(readApiKey() ?? "");
    const brand = readBrand();
    setDisplayName(brand.displayName);
    setHandle(brand.handle);
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmedKey = apiKey.trim();
  const keyLooksValid =
    trimmedKey.length === 0 ||
    (trimmedKey.startsWith("sk-ant-") && trimmedKey.length > 20);

  const handleSave = () => {
    if (trimmedKey.length === 0) {
      clearApiKey();
      onApiKeyChange(null);
    } else if (keyLooksValid) {
      writeApiKey(trimmedKey);
      onApiKeyChange(trimmedKey);
    }
    const nextBrand: Brand = {
      displayName: displayName.trim().slice(0, 80),
      handle: handle.trim().slice(0, 80),
    };
    writeBrand(nextBrand);
    onBrandChange(nextBrand);
    onClose();
  };

  const inputStyle = {
    background: "var(--bg-input)",
    border: "1px solid var(--border-secondary)",
    color: "var(--text-primary)",
  };

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: "var(--bg-backdrop)" }}
        onClick={onClose}
      />
      <div
        className="relative rounded-2xl w-full max-w-md mx-4 p-6"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-secondary)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Anthropic API key
            </label>
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 font-mono"
                style={{
                  ...inputStyle,
                  border: `1px solid ${
                    !keyLooksValid ? "#ef4444" : "var(--border-secondary)"
                  }`,
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="text-xs px-2 rounded"
                style={{
                  border: "1px solid var(--border-secondary)",
                  color: "var(--text-muted)",
                }}
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <p
              className="text-xs mt-1.5 leading-relaxed"
              style={{ color: "var(--text-faint)" }}
            >
              Stored only in your browser. Get one at{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)" }}
              >
                console.anthropic.com
              </a>
              .
            </p>
            {!keyLooksValid && (
              <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                Anthropic keys start with sk-ant- and are longer than 20
                characters.
              </p>
            )}
          </div>

          <div className="pt-2 border-t" style={{ borderColor: "var(--border-primary)" }}>
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              Brand byline shown on the outro slide.
            </p>
            <div className="space-y-3">
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Angelina Yang"
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1"
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Handle / tagline
                </label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="TwoSetAI · Heroes Behind AI"
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!keyLooksValid}
            className="w-full py-2.5 text-white font-medium rounded-lg disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
