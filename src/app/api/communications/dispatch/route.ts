import { NextResponse, type NextRequest } from "next/server";

import { processPendingCommunications } from "@/lib/communications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Procesador de respaldo del outbox de comunicaciones. Lo invoca un cron (ver
// vercel.json). Reclama y despacha lo que quedo `pending`/`sending` (crash del
// envio inmediato) o `failed` (reintentable). Cerrado por defecto: sin
// CRON_SECRET no procesa nada.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  // Vercel Cron envia `Authorization: Bearer <CRON_SECRET>` cuando CRON_SECRET
  // esta definido en el entorno.
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const adminClient = createSupabaseAdminClient();
  const result = await processPendingCommunications(adminClient, 25);

  return NextResponse.json(result);
}
