export function SignOutButton() {
  return (
    <form action="/auth/sign-out" method="post">
      <button
        className="rounded-md border border-brand-border px-3 py-2 text-sm font-semibold text-brand-navy-950 hover:bg-brand-surface-soft"
        type="submit"
      >
        Salir
      </button>
    </form>
  );
}
