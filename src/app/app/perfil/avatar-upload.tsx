"use client";

import { Camera } from "lucide-react";
import { useActionState } from "react";

import {
  type AvatarActionState,
  uploadAvatar,
} from "@/app/app/perfil/actions";

const initialState: AvatarActionState = { status: "idle", message: "" };

export function AvatarUpload() {
  const [state, formAction, isPending] = useActionState(
    uploadAvatar,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft">
          <Camera className="size-4 text-brand-cyan-500" aria-hidden="true" />
          Cambiar foto
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            name="avatar"
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            type="file"
          />
        </label>
        {isPending ? (
          <span className="text-xs text-brand-slate-600">Subiendo...</span>
        ) : null}
      </div>
      {state.message ? (
        <span
          className={
            state.status === "success"
              ? "text-xs font-semibold text-brand-cyan-500"
              : "text-xs font-semibold text-red-700"
          }
        >
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
