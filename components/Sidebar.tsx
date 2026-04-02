"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { dashboardNavItems } from "@/lib/dashboard-navigation";
import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type SidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

export default function SideBar({
  mobileOpen = false,
  onClose,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = React.useMemo(() => createClient(), []);

  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState("Team member");
  const [displayRole, setDisplayRole] = React.useState("employee");

  React.useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) return;

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("avatar_path, first_name, last_name, role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (cancelled) return;

        const name = [profile?.first_name, profile?.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();

        if (name) {
          setDisplayName(name);
        }

        setDisplayRole(profile?.role || "employee");

        if (profile?.avatar_path) {
          const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(profile.avatar_path);
          setAvatarUrl(urlData.publicUrl);
        } else {
          setAvatarUrl(null);
        }
      } catch (error: unknown) {
        console.error(error);
        const message =
          error instanceof Error ? error.message : "Failed to load profile.";
        toast.error(message);
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const isAdmin = React.useMemo(
    () => displayRole.trim().toLowerCase() === "admin",
    [displayRole]
  );

  const navItems = React.useMemo(
    () => dashboardNavItems.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin]
  );

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message);
      return;
    }

    onClose?.();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-[var(--surface-scrim)] backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[292px] max-w-[calc(100vw-1rem)] flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar/96 px-4 py-4 backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3 px-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={onClose}
          >
            <X className="size-4" />
            <span className="sr-only">Close navigation</span>
          </Button>
        </div>

        <div className="app-surface-strong rounded-[24px] border p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Control center
          </p>
          <p className="mt-3 text-base font-semibold tracking-tight text-foreground">
            Workforce attendance with cleaner daily oversight.
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Keep attendance, leave, and account settings aligned from one calm
            workspace.
          </p>
        </div>

        <Separator className="my-4" />

        <ScrollArea className="flex-1">
          <nav className="space-y-2 pr-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  onClick={() => onClose?.()}
                  className={cn(
                    "group flex w-full min-w-0 items-start gap-3 rounded-2xl border px-3.5 py-3.5 text-left whitespace-normal transition-[background-color,border-color,box-shadow,color]",
                    isActive
                      ? "app-surface-strong text-foreground hover:bg-[var(--surface-panel-strong)]"
                      : "border-transparent bg-transparent text-muted-foreground hover:border-[color:var(--surface-border-strong)] hover:bg-[var(--surface-overlay)] hover:text-foreground hover:shadow-[var(--shadow-field)]"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 self-start items-center justify-center rounded-2xl border app-icon-surface",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "text-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>

                  <span className="min-w-0 flex-1 whitespace-normal break-words">
                    <span className="block whitespace-normal break-words text-sm font-semibold leading-5">
                      {item.label}
                    </span>
                    <span className="mt-1 block whitespace-normal break-words text-xs leading-5 text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="app-surface-strong mt-0.5 rounded-[24px] border px-3 py-3.5 pb-0.5">
          <div className="flex items-center gap-3 px-1 pb-3">
            <Avatar className="app-icon-surface size-11 border">
              <AvatarImage src={avatarUrl ?? undefined} alt="Profile avatar" />
              <AvatarFallback className="text-sm font-semibold text-foreground">
                {displayName?.[0]?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {displayName}
              </p>
              <Badge variant={isAdmin ? "success" : "secondary"} className="w-fit">
                {isAdmin ? "Administrator" : displayRole}
              </Badge>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="w-full justify-start"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>

          <p className="mt-2 px-1 text-[11px] text-muted-foreground">
            Timewise v0.1
          </p>
        </div>
      </aside>
    </>
  );
}
