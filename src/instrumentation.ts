import { assertProductionEnv } from "@/lib/env";

// Se ejecuta una vez al iniciar cada instancia del server, antes de atender
// requests. Falla el arranque en produccion si falta configuracion critica.
// Se excluye la fase de build (`next build`) para no exigir secretos en CI:
// el criterio del spec es que falle el *boot* (runtime), no el build.
export function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  assertProductionEnv();
}
