"use client";

import { useEffect, useRef, useState } from "react";
import {
  clearApiKey,
  readApiKey,
  readBrand,
  writeApiKey,
  writeBrand,
} from "@/lib/storage";
import { DEFAULT_ACCENT, MAX_IMAGE_BYTES, type Brand } from "@/lib/types";

const ACCENT_PRESETS = [
  { name: "Lavender", value: "#b794f6" },
  { name: "Sky", value: "#60a5fa" },
  { name: "Mint", value: "#34d399" },
  { name: "Amber", value: "#fbbf24" },
  { name: "Coral", value: "#f87171" },
  { name: "Magenta", value: "#e879f9" },
];

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const HERO_MAX_DIM = 2160;
const HERO_JPEG_QUALITY = 0.85;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function compressHeroImage(file: File): Promise<string> {
  // SVG: vector, no need to canvas-resize.
  if (file.type === "image/svg+xml") return readFileAsDataUrl(file);

  const sourceUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Couldn't decode that image."));
      img.src = sourceUrl;
    });

    const ratio = Math.min(1, HERO_MAX_DIM / Math.max(img.width, img.height));
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available.");
    ctx.drawImage(img, 0, 0, w, h);

    // JPEG: hero images sit behind a dark gradient on the hook slide,
    // so transparency loss is irrelevant and JPEG compresses photos far
    // better than PNG for the same visual quality.
    return canvas.toDataURL("image/jpeg", HERO_JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

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
  const [url, setUrl] = useState("");
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [heroImageDataUrl, setHeroImageDataUrl] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setApiKey(readApiKey() ?? "");
    const brand = readBrand();
    setDisplayName(brand.displayName);
    setHandle(brand.handle);
    setUrl(brand.url);
    setAccentColor(brand.accentColor);
    setLogoDataUrl(brand.logoDataUrl);
    setHeroImageDataUrl(brand.heroImageDataUrl);
    setImageError(null);
  }, [isOpen]);

  const handleImageUpload = async (
    file: File | undefined,
    setter: (url: string | null) => void,
    kind: "logo" | "hero"
  ) => {
    setImageError(null);
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Use PNG, JPG, WebP, or SVG.");
      return;
    }
    // Logo: keep as-is (transparency matters), enforce 2 MB cap.
    // Hero: silently resize+recompress so the user can drop in any size.
    if (kind === "logo" && file.size > MAX_IMAGE_BYTES) {
      setImageError("Logo is too big. Try one under 2 MB.");
      return;
    }
    try {
      const dataUrl =
        kind === "hero" ? await compressHeroImage(file) : await readFileAsDataUrl(file);
      setter(dataUrl);
    } catch {
      setImageError("Couldn't read that file. Try a different one.");
    }
  };

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
      url: url.trim().slice(0, 200),
      accentColor: /^#[0-9a-f]{6}$/i.test(accentColor) ? accentColor : DEFAULT_ACCENT,
      logoDataUrl,
      heroImageDataUrl,
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
              Brand details shown on the carousel.
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
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Your URL or handle (printed on the CTA slide)
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="twosetai.com  ·  linkedin.com/in/angelinayang"
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1"
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Accent color
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {ACCENT_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setAccentColor(p.value)}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                      style={{
                        background: p.value,
                        outline:
                          accentColor.toLowerCase() === p.value.toLowerCase()
                            ? "2px solid white"
                            : "2px solid transparent",
                        outlineOffset: 2,
                      }}
                      aria-label={p.name}
                      title={p.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer"
                    style={{ background: "transparent", border: "1px solid var(--border-secondary)" }}
                    title="Custom color"
                  />
                </div>
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Logo (optional, shown in slide corner)
                </label>
                <div className="flex items-center gap-3">
                  {logoDataUrl ? (
                    <img
                      src={logoDataUrl}
                      alt=""
                      className="w-12 h-12 rounded object-contain"
                      style={{ background: "var(--bg-input)", border: "1px solid var(--border-secondary)" }}
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded flex items-center justify-center text-xs"
                      style={{
                        background: "var(--bg-input)",
                        border: "1px dashed var(--border-secondary)",
                        color: "var(--text-faint)",
                      }}
                    >
                      none
                    </div>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept={ALLOWED_IMAGE_TYPES.join(",")}
                    onChange={(e) => handleImageUpload(e.target.files?.[0], setLogoDataUrl, "logo")}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="text-xs px-3 py-1.5 rounded"
                    style={{ border: "1px solid var(--border-secondary)", color: "var(--text-secondary)" }}
                  >
                    Upload
                  </button>
                  {logoDataUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoDataUrl(null)}
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Hook image (optional, becomes the background of slide 1; auto-resized)
                </label>
                <div className="flex items-center gap-3">
                  {heroImageDataUrl ? (
                    <img
                      src={heroImageDataUrl}
                      alt=""
                      className="w-16 h-12 rounded object-cover"
                      style={{ background: "var(--bg-input)", border: "1px solid var(--border-secondary)" }}
                    />
                  ) : (
                    <div
                      className="w-16 h-12 rounded flex items-center justify-center text-xs"
                      style={{
                        background: "var(--bg-input)",
                        border: "1px dashed var(--border-secondary)",
                        color: "var(--text-faint)",
                      }}
                    >
                      none
                    </div>
                  )}
                  <input
                    ref={heroInputRef}
                    type="file"
                    accept={ALLOWED_IMAGE_TYPES.join(",")}
                    onChange={(e) => handleImageUpload(e.target.files?.[0], setHeroImageDataUrl, "hero")}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => heroInputRef.current?.click()}
                    className="text-xs px-3 py-1.5 rounded"
                    style={{ border: "1px solid var(--border-secondary)", color: "var(--text-secondary)" }}
                  >
                    Upload
                  </button>
                  {heroImageDataUrl && (
                    <button
                      type="button"
                      onClick={() => setHeroImageDataUrl(null)}
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                {imageError && (
                  <p className="text-xs mt-1.5" style={{ color: "#ef4444" }}>
                    {imageError}
                  </p>
                )}
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
