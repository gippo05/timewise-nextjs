import DashboardShell from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShellWithAuth>{children}</ShellWithAuth>;
}

async function ShellWithAuth({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } =
    user
      ? await supabase
          .from("profiles")
          .select("first_name, last_name, role, avatar_path")
          .eq("id", user.id)
          .maybeSingle()
      : { data: null };

  return (
    <DashboardShell profile={profile}>
      {children}
    </DashboardShell>
  );
}
