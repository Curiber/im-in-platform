import type { SupabaseClient } from "@supabase/supabase-js";

// Dado el contenido de una carpeta, devuelve las rutas completas de los
// archivos que deben borrarse (todos menos el que se quiere conservar).
// Funcion pura para poder testear la regla de seleccion.
export function selectStaleFilePaths(
  folder: string,
  fileNames: string[],
  keepFileName: string,
): string[] {
  return fileNames
    .filter((name) => name !== keepFileName)
    .map((name) => `${folder}/${name}`);
}

// Borra del bucket los archivos previos de una carpeta, conservando el recien
// subido. Best-effort: si listar o borrar falla, no lanza (la limpieza de
// huerfanos no debe romper una subida exitosa).
export async function removeStaleFiles(
  client: SupabaseClient,
  bucket: string,
  folder: string,
  keepFileName: string,
): Promise<void> {
  const { data, error } = await client.storage.from(bucket).list(folder);

  if (error || !data) {
    return;
  }

  const stalePaths = selectStaleFilePaths(
    folder,
    data.map((item) => item.name),
    keepFileName,
  );

  if (stalePaths.length === 0) {
    return;
  }

  await client.storage.from(bucket).remove(stalePaths);
}
