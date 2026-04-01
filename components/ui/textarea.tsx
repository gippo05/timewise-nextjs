import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground min-h-28 w-full rounded-xl border bg-[var(--surface-panel-strong)] px-3.5 py-3 text-sm shadow-[var(--shadow-field)] transition-[border-color,box-shadow,background-color,color] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-70",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/15",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
