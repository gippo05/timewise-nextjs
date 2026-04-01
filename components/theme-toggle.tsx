"use client";

import * as React from "react";
import { Check, LaptopMinimal, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: LaptopMinimal },
] as const;

type ThemeToggleProps = {
  align?: "start" | "center" | "end";
  className?: string;
};

export default function ThemeToggle({
  align = "end",
  className,
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = mounted ? theme ?? "system" : "system";
  const activeResolvedTheme = mounted ? resolvedTheme ?? "light" : "light";
  const ActiveIcon = activeResolvedTheme === "dark" ? Moon : Sun;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("rounded-full px-3.5", className)}
        >
          <ActiveIcon className="size-4" />
          Theme
        </Button>
      </PopoverTrigger>

      <PopoverContent align={align} className="w-52 p-2">
        <div className="space-y-1">
          <div className="px-2 py-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Appearance
            </p>
          </div>

          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isActive = activeTheme === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent/70"
                )}
              >
                <span className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-xl border border-border bg-card">
                    <Icon className="size-4" />
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium">{option.label}</span>
                    {option.value === "system" ? (
                      <Palette className="size-3.5 text-muted-foreground" />
                    ) : null}
                  </span>
                </span>

                {isActive ? <Check className="size-4 text-foreground" /> : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
