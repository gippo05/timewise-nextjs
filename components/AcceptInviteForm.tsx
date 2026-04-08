"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { acceptInviteAction } from "@/app/invite/[token]/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  token: string;
  email: string;
  companyName: string;
  expiresAt: string;
};

export default function AcceptInviteForm({
  token,
  email,
  companyName,
  expiresAt,
}: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const result = await acceptInviteAction({
        token,
        email,
        fullName,
        password: password || undefined,
      });

      if (!result.ok) {
        setError(result.error ?? "Unable to accept invite.");
        return;
      }

      setSuccess(
        result.alreadyMember
          ? "Invite confirmed. Your account is already part of this company."
          : "Invite accepted. You can sign in now."
      );

      window.setTimeout(() => {
        router.push("/auth/login");
      }, 1200);
    });
  }

  return (
    <div className="app-surface-strong rounded-[28px] border p-6 shadow-[var(--shadow-soft)]">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Company invitation
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Join {companyName}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This invite is for <span className="font-semibold text-foreground">{email}</span> and
          expires on {new Date(expiresAt).toLocaleString()}.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" type="email" value={email} disabled />
        </div>

        <div className="space-y-2">
          <Label htmlFor="full-name">Full name</Label>
          <Input
            id="full-name"
            placeholder="Jane Doe"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Set password for new account"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            If this email already has an account, password can be left blank.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Invite error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {success ? (
          <Alert>
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Processing..." : "Accept invite"}
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/auth/login">Back to sign in</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
