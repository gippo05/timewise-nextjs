"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function UpdatePassword({ userId }: { userId: string | null }) {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingEmail, setIsFetchingEmail] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadEmail() {
      try {
        if (!userId) {
          if (!cancelled) setEmail(null);
          return;
        }

        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("getUser error:", error);
          if (!cancelled) setEmail(null);
          return;
        }

        if (data?.user?.id !== userId) {
          if (!cancelled) setEmail(null);
          return;
        }

        if (!cancelled) setEmail(data.user.email ?? null);
      } finally {
        if (!cancelled) setIsFetchingEmail(false);
      }
    }

    void loadEmail();

    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  const mismatch = useMemo(() => {
    if (!newPassword || !confirmPassword) return false;
    return newPassword !== confirmPassword;
  }, [newPassword, confirmPassword]);

  const canSubmit = useMemo(
    () =>
      !isLoading &&
      !isFetchingEmail &&
      !!userId &&
      !!email &&
      currentPassword.length > 0 &&
      newPassword.length >= 8 &&
      confirmPassword.length > 0 &&
      !mismatch,
    [
      isLoading,
      isFetchingEmail,
      userId,
      email,
      currentPassword,
      newPassword,
      confirmPassword,
      mismatch,
    ]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    if (!email) {
      toast.error("No email found for this account.");
      return;
    }

    if (mismatch) {
      toast.error("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password too short", {
        description: "Use at least 8 characters.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (authError) {
        toast.error("Current password is incorrect");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error("Failed to update password", {
          description: updateError.message,
        });
        return;
      }

      toast.success("Password updated", {
        description: "Please log in again.",
      });

      await supabase.auth.signOut();

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      router.push("/auth/login");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-xl">Security</CardTitle>
          <CardDescription>
            Update your password and re-authenticate the account cleanly.
          </CardDescription>
        </div>

        <div className="flex size-10 items-center justify-center rounded-2xl border border-border bg-secondary text-foreground">
          <ShieldCheck className="size-4" />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {!userId ? (
          <p className="text-sm text-muted-foreground">
            You need to be logged in to change your password.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current password</Label>
              <Input
                id="current_password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                disabled={isLoading || isFetchingEmail}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">New password</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                disabled={isLoading || isFetchingEmail}
              />
              <p className="text-xs text-muted-foreground">
                Use at least 8 characters for a strong password.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm new password</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={isLoading || isFetchingEmail}
              />

              {mismatch ? (
                <p className="text-sm text-rose-600">Passwords do not match.</p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-border bg-secondary/35 px-4 py-3 text-sm text-muted-foreground">
              Password changes sign you out after the update, which keeps the account session secure across devices.
            </div>

            <Button type="submit" disabled={!canSubmit} className="w-full">
              {isLoading ? "Updating..." : "Update password"}
            </Button>

            {!isFetchingEmail && !email ? (
              <p className="text-sm text-rose-600">
                This account has no email address or the session is no longer valid. Please log in again.
              </p>
            ) : null}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
