// Portada por defecto (stock con licencia) cuando un evento no tiene una propia.
// Reemplazar por un asset propio antes de publicar.
export const DEFAULT_EVENT_COVER =
  "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1920&q=80";

export function resolveEventCover(coverImageUrl: string | null | undefined) {
  return coverImageUrl || DEFAULT_EVENT_COVER;
}
