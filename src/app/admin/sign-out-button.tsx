export function SignOutButton() {
  return (
    <form action="/auth/sign-out" method="post">
      <button
        className="rounded-md border border-[#d9d5cb] px-3 py-2 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
        type="submit"
      >
        Salir
      </button>
    </form>
  );
}
