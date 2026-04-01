"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import AuthShell from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setSent(true);
    setLoading(false);

    setTimeout(() => {
      router.push("/auth/login");
    }, 1500);
  }

  return (
    <AuthShell
      title="Reset your password"
      description="Enter your work email and we will send a secure reset link."
      footer={
        <div className="text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/auth/login" className="font-semibold text-foreground">
            Back to sign in
          </Link>
        </div>
      }
    >
      <div className="rounded-[28px] border border-border bg-[#f8fafc] p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        {sent ? (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Reset email sent
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              If an account exists for that email, a reset link will arrive shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button className="w-full" disabled={loading} type="submit">
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
