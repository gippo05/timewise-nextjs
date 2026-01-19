"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  if (status === "idle") return null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-linear-to-b from-white to-indigo-300">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
        </CardHeader>

        <CardContent>
          {status === "done" ? (
            <p className="text-sm text-muted-foreground">{message}</p>
          ) : status === "error" ? (
            <p className="text-sm text-destructive">{message}</p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />

              {message && (
                <p className="text-sm text-muted-foreground">{message}</p>
              )}

              <Button className="w-full bg-indigo-400 hover:bg-indigo-300" type="submit">
                Update password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
