"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import logo from "@/public/TimeWISE logo.png";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error has occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-white via-white to-black/10 text-black flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-black/10 shadow-sm rounded-2xl">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-36">
              <Image src={logo} alt="TimeWISE" fill className="object-contain" priority />
            </div>
          </div>

          <CardTitle className="text-2xl font-semibold tracking-tight">
            Sign in
          </CardTitle>
          <CardDescription className="text-black/60">
            Use your email and password to access your dashboard.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Separator />

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-black/80">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="h-11 rounded-xl border-black/15 focus-visible:ring-black/20"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-black/80">Password</Label>
                <Link
                  href="#"
                  className="text-xs text-black/60 hover:text-black underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="h-11 rounded-xl border-black/15 focus-visible:ring-black/20"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertTitle>Login failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-black text-white hover:bg-black/90"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="text-sm text-black/60">
            New user?{" "}
            <Link
              href="/auth/register"
              className="text-black hover:underline underline-offset-4 font-medium"
            >
              Create an account
            </Link>
            .
          </div>

          <p className="text-xs text-black/40 leading-relaxed">
            By signing in, you agree to your company’s internal policies. Humans love policies.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
