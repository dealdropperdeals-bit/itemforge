"use client";

import { useState } from "react";

type Props = {
  packCode: string;
  label: string;
};

export function CreditPackButton({ packCode, label }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/billing/credit-packs/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ packCode }),
      });

      const payload = (await response.json()) as {
        error?: string;
        links?: Array<{ rel: string; href: string }>;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to start credit pack checkout.");
      }

      const approvalLink = payload.links?.find((link) => link.rel === "approve")?.href;

      if (!approvalLink) {
        throw new Error("Missing approval link from PayPal.");
      }

      window.location.href = approvalLink;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Credit pack checkout failed.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="secondary-action w-full justify-center"
      >
        {loading ? "Redirecting to PayPal..." : label}
      </button>
      {error ? <p className="text-sm text-[var(--accent)]">{error}</p> : null}
    </div>
  );
}
