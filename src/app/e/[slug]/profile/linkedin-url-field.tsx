"use client";

import { useMemo, useState } from "react";

export function LinkedInUrlField({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const validationMessage = useMemo(() => getLinkedInUrlError(value), [value]);

  return (
    <div>
      <input
        aria-describedby="linkedin-url-help"
        aria-invalid={Boolean(validationMessage)}
        autoComplete="url"
        className="h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500 aria-[invalid=true]:border-red-400"
        inputMode="url"
        name="linkedinUrl"
        onChange={(event) => setValue(event.target.value)}
        onInvalid={(event) => {
          event.currentTarget.setCustomValidity(
            getLinkedInUrlError(event.currentTarget.value) ?? "",
          );
        }}
        onInput={(event) => {
          event.currentTarget.setCustomValidity(
            getLinkedInUrlError(event.currentTarget.value) ?? "",
          );
        }}
        placeholder="https://linkedin.com/in/..."
        pattern="(https?://)?(www\.)?linkedin\.com/.+"
        type="text"
        value={value}
      />
      <p
        className={
          validationMessage
            ? "mt-2 text-sm text-red-700"
            : "mt-2 text-xs text-brand-slate-600"
        }
        id="linkedin-url-help"
      >
        {validationMessage ?? "Puedes pegar linkedin.com/in/... o la URL completa."}
      </p>
    </div>
  );
}

function getLinkedInUrlError(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (host !== "linkedin.com") {
      return "Ingresa una URL de LinkedIn valida.";
    }

    return null;
  } catch {
    return "Ingresa una URL valida, por ejemplo linkedin.com/in/tu-perfil.";
  }
}
