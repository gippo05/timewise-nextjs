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

export default function RegisterPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const router = useRouter();

  const passwordsMatch = password === confirmPassword;
  const canSubmit =
    email.trim().length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    passwordsMatch &&
    !isLoading;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) throw error;

      router.push("/auth/login");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error has occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-black/10 text-black flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-black/10 shadow-sm rounded-2xl">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="relative h-40 w-full">
              <Image src={logo} alt="TimeWISE" fill className="object-contain" priority />
            </div>
          </div>

          <CardTitle className="text-2xl font-semibold tracking-tight">
            Create account
          </CardTitle>
          <CardDescription className="text-black/60">
            Set up your account to start tracking attendance and work activity.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Separator />

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-black/80">First name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Juan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="h-11 rounded-xl border-black/15 focus-visible:ring-black/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-black/80">Last name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Dela Cruz"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="h-11 rounded-xl border-black/15 focus-visible:ring-black/20"
                />
              </div>
            </div>

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
              <Label htmlFor="password" className="text-black/80">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="h-11 rounded-xl border-black/15 focus-visible:ring-black/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-black/80">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="h-11 rounded-xl border-black/15 focus-visible:ring-black/20"
              />
              {!passwordsMatch && confirmPassword.length > 0 && (
                <p className="text-sm text-red-600">Passwords do not match.</p>
              )}
            </div>

            {error && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertTitle>Registration failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-11 rounded-xl bg-black text-white hover:bg-black/90 disabled:opacity-50"
            >
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="text-sm text-black/60">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-black hover:underline underline-offset-4 font-medium"
            >
              Sign in
            </Link>
            .
          </div>

          <p className="text-xs text-black/40 leading-relaxed">
            By signing up, you agree to the company policies and guidelines.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
