// Dada la URL publica de un objeto de Storage, devuelve su ruta dentro del
// bucket (lo que espera `storage.from(bucket).remove([...])`), o null si la URL
// no corresponde a ese bucket. Funcion pura para poder testearla.
//
// Formato de URL publica de Supabase:
//   {base}/storage/v1/object/public/{bucket}/{path}
export function objectPathFromPublicUrl(
  publicUrl: string | null | undefined,
  bucket: string,
): string | null {
  if (!publicUrl) {
    return null;
  }

  const marker = `/object/public/${bucket}/`;
  const index = publicUrl.indexOf(marker);

  if (index === -1) {
    return null;
  }

  const rawPath = publicUrl.slice(index + marker.length).split(/[?#]/)[0];

  if (!rawPath) {
    return null;
  }

  return decodeURIComponent(rawPath);
}
