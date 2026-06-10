"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyProfileLinkButton({ profileUrl }: { profileUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#b9ddd8] bg-white/90 px-4 text-sm font-semibold text-[#073b4c] shadow-sm hover:bg-white"
      onClick={copyLink}
      type="button"
    >
      {copied ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
      {copied ? "Link copiado" : "Copiar link"}
    </button>
  );
}
