import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
};

export default function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("gap-0", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-0">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>

        {Icon ? (
          <div className="app-icon-surface flex size-10 items-center justify-center rounded-2xl border text-foreground">
            <Icon className="size-4" />
          </div>
        ) : null}
      </CardHeader>

      {description ? (
        <CardContent className="pt-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}
