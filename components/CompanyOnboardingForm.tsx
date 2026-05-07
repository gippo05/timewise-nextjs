"use client";

import * as React from "react";
import { useActionState } from "react";
import { Building2, CheckCircle2, Copy, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  onboardCompanyAction,
  type CompanyOnboardingState,
} from "@/app/owner/onboarding/actions";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CompanyOnboardingState = {
  ok: false,
};

export default function CompanyOnboardingForm() {
  const [state, formAction, isPending] = useActionState(
    onboardCompanyAction,
    initialState
  );
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      toast.success("Company workspace created.");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  async function copyPassword() {
    if (!state.generatedPassword) return;

    try {
      await navigator.clipboard.writeText(state.generatedPassword);
      toast.success("Temporary password copied.");
    } catch {
      toast.error("Unable to copy the password.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <Card>
        <CardHeader className="space-y-4 border-b border-[color:var(--surface-border-strong)] pb-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" />
                <CardTitle>New company workspace</CardTitle>
              </div>
              <CardDescription>
                Create the tenant record, manager profile, and admin membership in one controlled flow.
              </CardDescription>
            </div>
            <Badge variant="secondary">Platform only</Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form ref={formRef} action={formAction} className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="ownerKey">Owner key</Label>
                <Input
                  id="ownerKey"
                  name="ownerKey"
                  type="password"
                  placeholder="Configured owner onboarding key"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  placeholder="Acme Operations Inc."
                  autoComplete="organization"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="managerFullName">Manager full name</Label>
                <Input
                  id="managerFullName"
                  name="managerFullName"
                  placeholder="Jordan Reyes"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="managerEmail">Manager email</Label>
                <Input
                  id="managerEmail"
                  name="managerEmail"
                  type="email"
                  placeholder="manager@company.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="temporaryPassword">Temporary password</Label>
                <Input
                  id="temporaryPassword"
                  name="temporaryPassword"
                  type="text"
                  placeholder="Leave blank to generate one"
                  autoComplete="new-password"
                />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Managers are created as confirmed admin users. Share the temporary password through a trusted channel.
                </p>
              </div>
            </div>

            {state.error ? (
              <Alert variant="destructive">
                <AlertTitle>Onboarding failed</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            {state.ok ? (
              <Alert>
                <CheckCircle2 className="size-4" />
                <AlertTitle>Workspace created</AlertTitle>
                <AlertDescription>
                  {state.companyName} is ready. {state.managerName} has admin access through{" "}
                  {state.managerEmail}.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Company context is derived server-side and written with service-role access.
              </p>
              <Button type="submit" disabled={isPending}>
                <ShieldCheck className="size-4" />
                {isPending ? "Creating..." : "Create company"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-muted-foreground" />
              <CardTitle>Credential handoff</CardTitle>
            </div>
            <CardDescription>
              Generated passwords are shown once after a successful submission.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state.generatedPassword ? (
              <div className="app-surface-subtle rounded-[20px] border px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Temporary password
                </p>
                <p className="mt-2 break-all font-mono text-sm font-semibold text-foreground">
                  {state.generatedPassword}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={copyPassword}
                >
                  <Copy className="size-4" />
                  Copy
                </Button>
              </div>
            ) : (
              <div className="app-surface-subtle rounded-[20px] border border-dashed px-4 py-8 text-center">
                <Mail className="mx-auto size-5 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  No credential generated yet
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Submit the form with the password field blank to create one automatically.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Write path</CardTitle>
            <CardDescription>
              The action writes only the records needed for a company manager account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {["auth.users", "companies", "profiles", "company_memberships"].map(
                (label) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-2xl border bg-[var(--surface-panel-strong)] px-4 py-3"
                  >
                    <span className="font-medium text-foreground">{label}</span>
                    <Badge variant="outline">server</Badge>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
