// Estado compartido para formularios admin con `useActionState`. Vive fuera del
// archivo "use server" (que solo puede exportar funciones async) para poder
// exportar tambien el tipo y el estado inicial.

export type FormState = { error: string | null };

export const initialFormState: FormState = { error: null };
