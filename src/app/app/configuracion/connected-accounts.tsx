"use client";

import { Check, Link2, Unlink } from "lucide-react";
import { useActionState } from "react";

import {
  linkGoogleIdentity,
  linkLinkedInIdentity,
  unlinkIdentity,
  type UnlinkActionState,
} from "@/app/app/configuracion/actions";

const initialState: UnlinkActionState = { status: "idle", message: "" };

type ProviderRow = {
  provider: "email" | "google" | "linkedin_oidc";
  label: string;
  description: string;
  linkAction?: () => Promise<void>;
};

const rows: ProviderRow[] = [
  {
    provider: "email",
    label: "Email y contrasena",
    description: "Ingresas con tu correo y una contrasena.",
  },
  {
    provider: "google",
    label: "Google",
    description: "Ingresa con un clic usando tu cuenta de Google.",
    linkAction: linkGoogleIdentity,
  },
  {
    provider: "linkedin_oidc",
    label: "LinkedIn",
    description: "Ingresa con un clic usando tu cuenta de LinkedIn.",
    linkAction: linkLinkedInIdentity,
  },
];

export function ConnectedAccounts({
  connectedProviders,
  canUnlink,
}: {
  connectedProviders: string[];
  canUnlink: boolean;
}) {
  const [state, formAction] = useActionState(unlinkIdentity, initialState);

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const connected = connectedProviders.includes(row.provider);
        return (
          <div
            className="flex items-center justify-between gap-4 rounded-xl border border-brand-border/60 bg-brand-surface-soft p-4"
            key={row.provider}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-brand-navy-950">
                  {row.label}
                </span>
                {connected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-mint-300/40 px-2 py-0.5 text-xs font-semibold text-brand-navy-950">
                    <Check className="size-3" aria-hidden="true" />
                    Conectada
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm leading-6 text-brand-slate-600">
                {row.description}
              </p>
            </div>

            {connected ? (
              row.provider !== "email" && canUnlink ? (
                <form action={formAction}>
                  <input name="provider" type="hidden" value={row.provider} />
                  <button
                    className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
                    type="submit"
                  >
                    <Unlink className="size-4" aria-hidden="true" />
                    Desconectar
                  </button>
                </form>
              ) : null
            ) : row.linkAction ? (
              <form action={row.linkAction}>
                <button
                  className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl bg-brand-navy-950 px-3 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
                  type="submit"
                >
                  <Link2 className="size-4" aria-hidden="true" />
                  Conectar
                </button>
              </form>
            ) : null}
          </div>
        );
      })}

      {state.message ? (
        <p
          className={
            state.status === "success"
              ? "rounded-xl bg-brand-mint-300/30 px-3.5 py-2.5 text-sm font-semibold text-brand-navy-950"
              : "rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          }
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
