import Image from "next/image";

import logo from "@/public/TimeWISE logo.png";

type AuthShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const highlights = [
  "Track shifts, breaks, and punctuality in one calm workspace.",
  "Handle leave workflows without losing attendance visibility.",
  "Keep account recovery and sign-in flows clear on every screen size.",
];

export default function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[32px] border border-white/80 bg-white/90 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur xl:grid-cols-[1.08fr_0.92fr]">
        <div className="hidden border-r border-border bg-[#f7f9fc] p-10 xl:flex xl:flex-col xl:justify-between">
          <div className="space-y-12">
            <div className="space-y-5">
              <div className="inline-flex items-center rounded-full border border-border bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Timewise workspace
              </div>
              <div className="space-y-4">
                <div className="relative h-10 w-36">
                  <Image src={logo} alt="Timewise" fill className="object-contain object-left" priority />
                </div>
                <div className="space-y-3">
                  <h2 className="max-w-md text-4xl font-semibold tracking-tight text-foreground">
                    Attendance operations with a steadier enterprise feel.
                  </h2>
                  <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
                    A calmer workforce dashboard for daily attendance, leave planning, and account management.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white bg-white/90 px-4 py-4 text-sm leading-relaxed text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Built for reliable teams who need their workforce data to stay readable and actionable.
          </p>
        </div>

        <div className="flex items-center justify-center bg-white px-5 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-3 xl:hidden">
              <div className="relative h-9 w-32">
                <Image src={logo} alt="Timewise" fill className="object-contain object-left" priority />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            </div>

            <div className="hidden space-y-2 xl:block">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>

            {children}
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}
