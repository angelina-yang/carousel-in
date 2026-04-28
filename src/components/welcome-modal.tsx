"use client";

import { useState } from "react";
import { isValidEmail } from "@/lib/email-validation";

interface WelcomeModalProps {
  isOpen: boolean;
  onComplete: (name: string, email: string) => void;
}

export function WelcomeModal({ isOpen, onComplete }: WelcomeModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const emailOk = isValidEmail(email);
  const showEmailError = email.length > 0 && !emailOk;
  const canSubmit =
    name.trim() && emailOk && agreedToTerms && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          newsletter,
        }),
      });
    } catch {
      // Don't block registration if Substack fails
    }
    setSubmitting(false);
    onComplete(name.trim(), email.trim());
  };

  const inputStyle = {
    background: "var(--bg-input)",
    border: "1px solid var(--border-secondary)",
    color: "var(--text-primary)",
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "var(--bg-backdrop)" }} />
      <div
        className="relative rounded-2xl w-full max-w-md mx-4 p-6"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-secondary)",
        }}
      >
        <div className="text-center mb-6">
          {/* Logo: stacked cards = carousel */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--accent)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="13" height="17" rx="2" />
              <rect x="8" y="6" width="13" height="17" rx="2" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            Welcome to Carousel;IN
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Turn a LinkedIn post into a swipeable carousel that looks like a magazine.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1"
              style={{
                ...inputStyle,
                border: `1px solid ${showEmailError ? "#ef4444" : "var(--border-secondary)"}`,
              }}
            />
            {showEmailError && (
              <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                Please enter a valid email address.
              </p>
            )}
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded"
              style={{ accentColor: "var(--accent)" }}
            />
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Subscribe to the{" "}
              <a
                href="https://angelinayang.substack.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)" }}
              >
                TwoSetAI newsletter
              </a>{" "}
              -- new free AI tools, founder insights, and early access to what
              I&apos;m building
            </p>
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded"
              style={{ accentColor: "var(--accent)" }}
            />
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              I agree to the{" "}
              <a
                href="https://www.twosetai.com/lab/terms/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)" }}
              >
                TwoSetAI Lab Terms of Use
              </a>
              . This is a free, BYOK tool -- I bring my own API keys and pay my own usage costs.
            </p>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: "var(--text-faint)" }}>
            <span className="font-medium" style={{ color: "var(--text-secondary)" }}>🔑 Your keys, your data.</span>{" "}
            Everything stays with you, never on our server.
          </p>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-2.5 text-white font-medium rounded-lg transition-colors mt-2 disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            {submitting ? "Setting up..." : "Get Started"}
          </button>
        </form>
      </div>
    </div>
  );
}
