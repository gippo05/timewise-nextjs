"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

import { LayoutDashboard, Table2, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import main_logo from "@/public/TimeWISE logo.png";

type NavItem = {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export default function SideBar() {
  const router = useRouter();
  const pathname = usePathname();

  // ✅ create once, stable instance
  const supabase = React.useMemo(() => createClient(), []);

  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState<string>("User");
  const [displayRole, setDisplayRole] = React.useState<string>(" ");

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        const user = authData.user;
        if (!user) return;

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("avatar_path, first_name, last_name, role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (cancelled) return;

        const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
        if (name) setDisplayName(name);

        setDisplayRole(profile?.role || " ");

        if (profile?.avatar_path) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(profile.avatar_path);
          setAvatarUrl(urlData.publicUrl); // ✅ no cache-bust on load
        } else {
          setAvatarUrl(null);
        }
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? "Failed to load profile.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const navItems: NavItem[] = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/dashboard/attendance-table", label: "Attendance Table", icon: Table2 },
    { path: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <aside className={cn("w-64 h-screen sticky top-0 bg-white text-black border-r border-indigo-200 flex flex-col")}>
      <div className="px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="relative h-40 w-100">
            <Image src={main_logo} alt="TimeWISE" fill className="object-contain" priority />
          </div>
        </div>
        <p className="mt-3 text-xs text-black/50">Your attendance one-stop shop</p>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;

            return (
              <Button
                key={item.path}
                asChild
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 rounded-xl px-3 py-5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-400 text-white hover:bg-indigo-300 hover:text-white"
                    : "text-black/70 hover:bg-indigo-200 hover:text-black"
                )}
              >
                <Link href={item.path} prefetch>
                  <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-indigo-600")} />
                  <span>{item.label}</span>
                </Link>
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="px-3 pb-4">
        <Separator className="mb-3" />

        <div className="flex items-center gap-3 px-3 py-3 rounded-xl">
          <Avatar className="h-9 w-9 ring-1 ring-black/10">
            <AvatarImage src={avatarUrl ?? undefined} alt="Profile avatar" />
            <AvatarFallback className="text-xs">{displayName?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-black truncate">{displayName}</p>
            <p className="text-xs text-black/50 truncate">{displayRole}</p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={handleLogout}
          className={cn("w-full justify-start gap-3 rounded-xl px-3 py-5 text-sm font-semibold text-black/70 hover:bg-indigo-200 hover:text-black")}
        >
          <LogOut className="h-4 w-4 text-indigo-600" />
          Logout
        </Button>

        <div className="mt-3 px-2 text-[11px] text-black/40">v0.1 • Internal</div>
      </div>
    </aside>
  );
}
