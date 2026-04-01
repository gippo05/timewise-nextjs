"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck, Clock3, Settings2 } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

type MoreActionsProps = {
  userRole: string;
};

export default function MoreActions({ userRole }: MoreActionsProps) {
  const isAdmin = userRole.toLowerCase() === "admin";

  const actions = [
    {
      href: "/dashboard/request-leave",
      label: "Request leave",
      description: "Submit time off and track your approval status.",
      icon: ClipboardCheck,
    },
    ...(isAdmin
      ? [
          {
            href: "/dashboard/attendance-table",
            label: "Review attendance logs",
            description: "Open the full workforce attendance table.",
            icon: Clock3,
          },
          {
            href: "/dashboard/request-leave/admin",
            label: "Process leave approvals",
            description: "Approve or reject incoming employee requests.",
            icon: ClipboardCheck,
          },
        ]
      : []),
    {
      href: "/dashboard/settings",
      label: "Update settings",
      description: "Manage profile details, avatar, and security.",
      icon: Settings2,
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">Quick actions</CardTitle>
        <CardDescription>
          Jump into the workflows you are most likely to need during the day.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-3">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "group flex items-start gap-3 rounded-2xl border border-border bg-secondary/45 px-4 py-4 transition-colors hover:bg-secondary"
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-white text-foreground">
                <Icon className="size-4" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  {action.label}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                  {action.description}
                </span>
              </span>

              <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
