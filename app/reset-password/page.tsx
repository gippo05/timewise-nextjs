"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AuthShell from "@/components/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "ready" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStatus("ready");
      } else {
        setStatus("error");
        setMessage("This reset link is invalid or expired. Request a new one.");
      }
    });
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("done");
    setMessage("Password updated. You can log in now.");

    setTimeout(() => {
      router.push("/auth/login");
    }, 1500);
  }

  return (
    <AuthShell
      title="Create a new password"
      description="Finish account recovery by choosing a new secure password."
      footer={
        <div className="text-sm text-muted-foreground">
          Need another email?{" "}
          <Link href="/forgot-password" className="font-semibold text-foreground">
            Request a new reset link
          </Link>
        </div>
      }
    >
      <div className="rounded-[28px] border border-border bg-[#f8fafc] p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        {status === "idle" ? (
          <p className="text-sm text-muted-foreground">Checking your reset link...</p>
        ) : status === "done" ? (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Password updated
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
          </div>
        ) : status === "error" ? (
          <Alert variant="destructive">
            <AlertTitle>Reset unavailable</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            {message ? (
              <Alert variant="destructive">
                <AlertTitle>Update issue</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}

            <Button className="w-full" type="submit">
              Update password
            </Button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
