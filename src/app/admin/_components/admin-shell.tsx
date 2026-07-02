import type { ReactNode } from "react";

import { AdminSidebar } from "@/app/admin/_components/admin-sidebar";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ShellMembership = {
  role: string;
  organizations: { name: string; suspended_at: string | null } | null;
};

export async function AdminShell({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const platformAdmin = isPlatformAdmin(user);
  let orgName: string | null = null;
  let role: string | null = null;
  let suspended = false;

  if (user) {
    const { data: membership } = await supabase
      .from("organization_users")
      .select("role, organizations(name, suspended_at)")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<ShellMembership>();

    orgName = membership?.organizations?.name ?? null;
    role = membership?.role ?? null;
    suspended = Boolean(membership?.organizations?.suspended_at);
  }

  return (
    <div className="flex min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <AdminSidebar
        orgName={orgName}
        platformAdmin={platformAdmin}
        role={role}
      />
      <div className="min-w-0 flex-1">
        {suspended ? (
          <p className="border-b border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900">
            Tu organizacion esta suspendida: el panel es de solo lectura y las
            paginas publicas de tus eventos estan bloqueadas. Contacta al equipo
            de I&apos;m IN.
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
