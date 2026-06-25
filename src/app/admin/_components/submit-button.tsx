"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

// Boton de submit que se deshabilita mientras la action esta en curso.
// Debe renderizarse dentro del <form> cuyo estado observa.
export function SubmitButton({
  children,
  disabled,
  ...rest
}: ComponentProps<"button">) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending || disabled} {...rest}>
      {children}
    </button>
  );
}
