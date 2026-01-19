"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="flex min-h-screen items-center justify-center px-4 bg-linear-to-b from-white via-white to-indigo-300">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Forgot password?</CardTitle>
        </CardHeader>

        <CardContent>
          {sent ? (
            <p className="text-sm text-muted-foreground">
              If an account exists for that email, you’ll receive a reset link shortly.
            </p>
          ) : (

            
            <form onSubmit={onSubmit} className="space-y-4">
              <p>Enter your Email Address:</p>
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Button className="w-full bg-indigo-400 hover:bg-indigo-300" disabled={loading} type="submit" >
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
