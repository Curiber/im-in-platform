"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";

import {
  type FormState,
  initialFormState,
} from "@/app/admin/_components/form-state";

// Envuelve un <form> con `useActionState` para mostrar errores de la action
// dentro del formulario, manteniendo los campos como children server-rendered.
// La action redirige en exito; ante validacion/permisos retorna { error }.
export function ActionForm({
  action,
  className,
  children,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  className?: string;
  children: ReactNode;
}) {
  const [state, formAction] = useActionState(action, initialFormState);

  return (
    <form action={formAction} className={className}>
      {children}
      {state.error ? (
        <p
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
