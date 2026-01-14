"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import {
  LayoutDashboard,
  Table2,
  Settings,
  LogOut,
} from "lucide-react";

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

  const navItems: NavItem[] = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/dashboard/attendance-table", label: "Attendance Table", icon: Table2 },
    { path: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <aside
      className={cn(
        "w-64 h-screen sticky top-0",
        "bg-white text-black",
        "border-r border-black/10",
        "flex flex-col"
      )}
    >
      {/* Brand */}
      <div className="px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="relative h-40 w-100">
            <Image
              src={main_logo}
              alt="TimeWISE"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-black/50">
          Attendance
        </p>
      </div>

      <Separator />

      {/* Nav */}
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
                  "w-full justify-start gap-3 rounded-xl px-3 py-5",
                  "text-sm font-medium",
                  "transition-colors",
                  isActive
                    ? "bg-black text-white hover:bg-black/90 hover:text-white"
                    : "text-black/70 hover:bg-black/5 hover:text-black"
                )}
              >
                <Link href={item.path}>
                  <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-black/60")} />
                  <span>{item.label}</span>
                </Link>
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="px-3 pb-4">
        <Separator className="mb-3" />

        {/* Logout */}
        <Button
          type="button"
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start gap-3 rounded-xl px-3 py-5",
            "text-sm font-semibold",
            "text-black/70 hover:bg-black/5 hover:text-black"
          )}
        >
          <LogOut className="h-4 w-4 text-black/60" />
          Logout
        </Button>

        <div className="mt-3 px-2 text-[11px] text-black/40">
          v0.1 • Internal
        </div>
      </div>
    </aside>
  );
}
