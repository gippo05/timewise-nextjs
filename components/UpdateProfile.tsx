"use client";

import { useMemo, useState } from "react";
import { UserRound } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type Profile = { first_name: string | null; last_name: string | null } | null;

export default function UpdateProfile({
  userId,
  profile,
}: {
  userId: string;
  profile: Profile;
}) {
  const supabase = createClient();

  const initialFirst = profile?.first_name ?? "";
  const initialLast = profile?.last_name ?? "";

  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [isLoading, setIsLoading] = useState(false);

  const isDirty = useMemo(
    () =>
      firstName.trim() !== initialFirst.trim() ||
      lastName.trim() !== initialLast.trim(),
    [firstName, lastName, initialFirst, initialLast]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isDirty) {
      toast.message("Nothing to update.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName.trim(), last_name: lastName.trim() })
      .eq("id", userId);

    setIsLoading(false);

    if (error) {
      toast.error("Update failed", { description: error.message });
      return;
    }

    toast.success("Profile updated", {
      description: "Your display name has been saved.",
    });
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-xl">Profile details</CardTitle>
          <CardDescription>
            Update the name that appears across the Timewise workspace.
          </CardDescription>
        </div>

        <div className="flex size-10 items-center justify-center rounded-2xl border border-border bg-secondary text-foreground">
          <UserRound className="size-4" />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/35 px-4 py-3 text-sm text-muted-foreground">
            Keep your name consistent here so leave approvals and attendance logs stay easy to recognize.
          </div>

          <Button type="submit" disabled={!isDirty || isLoading} className="w-full">
            {isLoading ? "Saving..." : isDirty ? "Save changes" : "Saved"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
