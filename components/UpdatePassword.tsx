"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "@radix-ui/react-label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { toast } from "sonner";

type UserLike = {
  id: string;
  email: string | null;
};

export default function UpdatePassword({ user }: { user: UserLike }) {
  const supabase = createClient();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const mismatch = useMemo(() => {
    if (!newPassword || !confirmPassword) return false;
    return newPassword !== confirmPassword;
  }, [newPassword, confirmPassword]);

  const canSubmit = useMemo(() => {
    return (
      !isLoading &&
      !!user.email &&
      currentPassword.length > 0 &&
      newPassword.length >= 8 &&
      confirmPassword.length > 0 &&
      !mismatch
    );
  }, [isLoading, user.email, currentPassword, newPassword, confirmPassword, mismatch]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user.email) {
      toast.error("No email found for this user.");
      return;
    }

    if (mismatch) {
      toast.error("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password too short", { description: "Use at least 8 characters." });
      return;
    }

    setIsLoading(true);

    try {
      // 1) verify current password (silent re-auth)
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (authError) {
        toast.error("Current password is incorrect");
        return;
      }

      // 2) update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error("Failed to update password", { description: updateError.message });
        return;
      }

      toast.success("Password updated", { description: "Please log in again." });

      // 3) recommended: sign out after password change
      await supabase.auth.signOut();

      // optional: redirect to login page if you have one
      // router.push("/login");

      // clear fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md rounded-2xl border-black/10 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold tracking-tight">Security</CardTitle>
        <CardDescription className="text-sm text-black/60">
          Update your password. You’ll be signed out after changing it.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current_password" className="text-sm text-black/80">
              Current password
            </Label>
            <Input
              id="current_password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password" className="text-sm text-black/80">
              New password
            </Label>
            <Input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="text-xs text-black/50">At least 8 characters.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password" className="text-sm text-black/80">
              Confirm new password
            </Label>
            <Input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />

            {mismatch && (
              <p className="text-sm text-red-600">Passwords do not match.</p>
            )}
          </div>

          <Button type="submit" disabled={!canSubmit} className="w-full h-11 rounded-xl">
            {isLoading ? "Updating..." : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
