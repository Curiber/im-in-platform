// Redirecciones internas seguras (Epic 48, review #38).
//
// Un `next` controlado por el usuario NO se puede validar por prefijo de
// string: `/%5Cevil.com`, `/\evil.com` o `//evil.com` pasan un chequeo
// `startsWith("/")` pero el parser WHATWG los resuelve a OTRO origen (open
// redirect). La unica validacion robusta es resolver el `next` contra el
// origen de la peticion y exigir que el origen resultante coincida; ademas se
// devuelve solo la ruta (pathname + query), descartando cualquier host colado.

export function safeRedirectPath(
  next: string | null | undefined,
  requestUrl: string,
  fallback: string,
): string {
  if (!next) {
    return fallback;
  }

  let base: URL;

  try {
    base = new URL(requestUrl);
  } catch {
    return fallback;
  }

  let resolved: URL;

  try {
    resolved = new URL(next, base);
  } catch {
    return fallback;
  }

  // Cualquier origen distinto al de la peticion (protocol-relative, backslash
  // que el parser normaliza a '/', esquema absoluto, etc.) se rechaza.
  if (resolved.origin !== base.origin) {
    return fallback;
  }

  return `${resolved.pathname}${resolved.search}`;
}
