import { notFound, redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ExportRegistration = {
  email: string;
  full_name_snapshot: string;
  phone_snapshot: string | null;
  company_snapshot: string | null;
  role_snapshot: string | null;
  industry_snapshot: string | null;
  interests: string[];
  networking_opt_in: boolean;
  public_profile_enabled: boolean;
  status: string;
  registered_at: string;
  checked_in_at: string | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", eventId)
    .single<{ id: string; name: string }>();

  if (!event) {
    notFound();
  }

  const { data: registrations } = await supabase
    .from("event_registrations")
    .select(
      "email, full_name_snapshot, phone_snapshot, company_snapshot, role_snapshot, industry_snapshot, interests, networking_opt_in, public_profile_enabled, status, registered_at, checked_in_at",
    )
    .eq("event_id", event.id)
    .order("registered_at", { ascending: true })
    .returns<ExportRegistration[]>();

  const csv = toCsv(registrations ?? []);
  const filename = slugify(event.name) || "inscritos";

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

function toCsv(rows: ExportRegistration[]) {
  const headers = [
    "nombre",
    "email",
    "telefono",
    "cargo",
    "empresa",
    "area",
    "intereses",
    "networking",
    "perfil_publico",
    "estado",
    "registrado_en",
    "check_in_en",
  ];

  return [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.full_name_snapshot,
        row.email,
        row.phone_snapshot,
        row.role_snapshot,
        row.company_snapshot,
        row.industry_snapshot,
        row.interests.join(" | "),
        row.networking_opt_in ? "si" : "no",
        row.public_profile_enabled ? "si" : "no",
        row.status,
        row.registered_at,
        row.checked_in_at,
      ]
        .map(escapeCsv)
        .join(","),
    ),
  ].join("\n");
}

function escapeCsv(value: string | null | undefined) {
  const normalized = value ?? "";

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }

  return normalized;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
