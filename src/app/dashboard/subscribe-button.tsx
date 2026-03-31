"use client";

import { useState } from "react";

type Props = {
  planCode: string;
  label: string;
};

export function SubscribeButton({ planCode, label }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planCode }),
      });

      const payload = (await response.json()) as {
        error?: string;
        links?: Array<{ rel: string; href: string }>;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to start subscription.");
      }

      const approvalLink = payload.links?.find((link) => link.rel === "approve")?.href;

      if (!approvalLink) {
        throw new Error("Missing approval link from PayPal.");
      }

      window.location.href = approvalLink;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Subscription failed.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="primary-action w-full justify-center"
      >
        {loading ? "Redirecting to PayPal..." : label}
      </button>
      {error ? <p className="text-sm text-[var(--accent)]">{error}</p> : null}
    </div>
  );
}
