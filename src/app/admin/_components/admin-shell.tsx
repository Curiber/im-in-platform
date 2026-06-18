import type { ReactNode } from "react";

import { AdminSidebar } from "@/app/admin/_components/admin-sidebar";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ShellMembership = {
  role: string;
  organizations: { name: string } | null;
};

export async function AdminShell({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const platformAdmin = isPlatformAdmin(user);
  let orgName: string | null = null;
  let role: string | null = null;

  if (user) {
    const { data: membership } = await supabase
      .from("organization_users")
      .select("role, organizations(name)")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<ShellMembership>();

    orgName = membership?.organizations?.name ?? null;
    role = membership?.role ?? null;
  }

  return (
    <div className="flex min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <AdminSidebar
        orgName={orgName}
        platformAdmin={platformAdmin}
        role={role}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
