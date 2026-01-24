"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "@radix-ui/react-label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { toast } from "sonner";

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

  useEffect(() => {
    setFirstName(initialFirst);
    setLastName(initialLast);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.first_name, profile?.last_name]);

  const isDirty = useMemo(
    () => firstName.trim() !== initialFirst.trim() || lastName.trim() !== initialLast.trim(),
    [firstName, lastName, initialFirst, initialLast]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isDirty) {
      toast.message("Nothing to update");
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

    toast.success("Profile updated", { description: "Your name has been saved." });
  };

  return (
    <Card className="w-full max-w-md rounded-2xl border-black/10 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold tracking-tight">Profile</CardTitle>
        <CardDescription className="text-sm text-black/60">
          Update how your name appears in the app.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm text-black/80">
              First name
            </Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-sm text-black/80">
              Last name
            </Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
            />
          </div>

          <Button
            type="submit"
            disabled={!isDirty || isLoading}
            className="w-full h-11 rounded-xl"
          >
            {isLoading ? "Saving..." : isDirty ? "Save changes" : "Saved"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
