import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { FileText } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
};

export default function EmptyState({
  title,
  description,
  icon: Icon = FileText,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed border-border/90 bg-white/85", className)}>
      <CardContent className="flex flex-col items-start gap-5 px-6 py-8 sm:px-8">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-secondary text-foreground">
          <Icon className="size-5" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
