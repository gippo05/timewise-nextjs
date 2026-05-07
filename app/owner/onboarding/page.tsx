import Image from "next/image";

import CompanyOnboardingForm from "@/components/CompanyOnboardingForm";
import ThemeToggle from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import logo from "@/public/TimeWISE logo.png";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function OwnerOnboardingPage() {
  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        <header className="app-surface-strong rounded-[28px] border px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative h-12 w-36 shrink-0 sm:h-14 sm:w-44">
                <Image
                  src={logo}
                  alt="Timewise"
                  fill
                  className="object-contain"
                  priority
                  sizes="176px"
                />
              </div>

              <div className="min-w-0 border-l border-border pl-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Owner utility
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  Company onboarding
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  Create a tenant workspace and assign its first manager as company admin.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Badge variant="secondary">Standalone</Badge>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <CompanyOnboardingForm />
      </div>
    </main>
  );
}
