"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, PanelLeft, Settings2 } from "lucide-react";

import { getDashboardPageMeta } from "@/lib/dashboard-navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/theme-toggle";

type TopBarProps = {
  onOpenSidebar: () => void;
};

export default function TopBar({ onOpenSidebar }: TopBarProps) {
  const pathname = usePathname();
  const pageMeta = React.useMemo(() => getDashboardPageMeta(pathname), [pathname]);
  const formattedDate = React.useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(new Date()),
    []
  );

  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--surface-border-strong)] bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="mt-0.5 lg:hidden"
            onClick={onOpenSidebar}
          >
            <PanelLeft className="size-4" />
            <span className="sr-only">Open navigation</span>
          </Button>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Timewise workspace
              </Badge>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:hidden">
                Workspace
              </p>
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {pageMeta.title}
              </h1>
              <p className="hidden max-w-2xl text-sm leading-relaxed text-muted-foreground md:block">
                {pageMeta.description}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-border bg-[var(--surface-panel-strong)] px-3 py-2 text-sm text-muted-foreground shadow-[var(--shadow-field)] sm:flex">
            <CalendarDays className="size-4" />
            <span>{formattedDate}</span>
          </div>

          <ThemeToggle />

          <Button asChild variant="outline" size="sm" className="rounded-full px-4">
            <Link href="/dashboard/settings">
              <Settings2 className="size-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
